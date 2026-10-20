"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronDown,  RotateCcw,
  Maximize,
  Minimize,
  Play,
  Save,
  Plus,
  X,
  ChevronRight,
  Undo,
  Trophy,
  Activity,
  Calendar,
  Sparkles,
  Check,
  Shield,
  Clock,
  Flag,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { createSecureRecord } from "@/lib/secureWrites";
import {
  collection,
  getDoc,
  getDocs,
  doc,
  serverTimestamp,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { useLeague } from "@/lib/leagueContext";
import { useAuth } from "@/lib/authContext";
import { TeamLogo } from "@/components/TeamAssets";
import PlayEntryWizard from "@/components/play-by-play/PlayEntryWizard";
import { getPlayerNumberMap, sortRosterWithNumbers, sortRosterByStatLeader, computePlayerStatCounts } from "@/lib/playerNumberHelper";
import {
  PENALTY_CATALOG,
  PenaltyDefinition,
  formatPenaltyStatement,
  formatPlaySentence,
} from "@/lib/playSentenceFormatter";
import {
  getSandboxMatches,
  getSandboxPlayers,
  getSandboxPlays,
  addSandboxPlay,
  updateSandboxMatch,
  deleteSandboxPlay,
  subscribeDemoSandbox,
} from "@/lib/demoSandbox";
import { getReadableTextColor } from "@/lib/teamColors";
import { useMatchTeamColors } from "@/lib/useMatchTeamColors";
import {
  getYorkMatch,
  getYorkTeamPlayers,
  getYorkTeamPlaysForMatch,
  saveYorkPlay,
  deleteYorkPlay,
  saveYorkCustomMatch,
  isYorkTeam,
  isYorkMatch,
  YORK_TEAM_ID,
} from "@/lib/yorkTeamData";
import {
  OPPONENT_QB_PLACEHOLDER,
  displayPlayerName,
  isOpponentPlaceholder,
  isTrackablePlayer,
} from "@/lib/opponentPlaceholder";

interface AsyncPlayByPlayManagerProps {
  matchId: string;
  backUrl?: string;
}

export default function AsyncPlayByPlayManager({ matchId, backUrl }: AsyncPlayByPlayManagerProps) {
  const router = useRouter();
  const { settings, isDemoLeague } = useLeague();
  const { canManageTeam, isLeagueAdmin, loading: authLoading } = useAuth();
  // York games are real team data and must never route through the demo sandbox.
  const isDemo = !isYorkMatch(matchId) && (isDemoLeague || matchId?.startsWith("match_demo_"));
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("embed") === "true") setIsEmbedded(true);
    }
  }, []);

  const downsPerSeries = settings?.rules?.downsPerSeries || 4;

  const [loadingData, setLoadingData] = useState(true);
  const [matchStatus, setMatchStatus] = useState<string>("scheduled");
  const [matchData, setMatchData] = useState<any>(null);
  const managingTeamId = matchData?.managingTeamId ||
    (isYorkMatch(matchId) ? YORK_TEAM_ID : matchData?.homeTeamId);
  const canEdit = !authLoading && (
    !!canManageTeam?.(managingTeamId) || (!isYorkMatch(matchId) && isLeagueAdmin)
  );

  // Match Information
  const [homeTeamName, setHomeTeamName] = useState("HOME");
  const [awayTeamName, setAwayTeamName] = useState("AWAY");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const { home: homeTeamColors, away: awayTeamColors } = useMatchTeamColors(matchData, isDemo);

  // Players & Subs
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [subs, setSubs] = useState<string[]>([]);
  const [homePlayers, setHomePlayers] = useState<string[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<string[]>([]);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subModalTeam, setSubModalTeam] = useState<"HOME" | "AWAY" | null>(null);
  const [newSubInput, setNewSubInput] = useState("");

  const playerNumberMap = useMemo(() => {
    return getPlayerNumberMap(allPlayers, homePlayers, awayPlayers);
  }, [allPlayers, homePlayers, awayPlayers]);

  // Game State (Zero clocks, zero timeouts)
  const [half, setHalf] = useState<1 | 2>(1); // 1 = First Half, 2 = Second Half
  const [currentDown, setCurrentDown] = useState(1);
  const [possession, setPossession] = useState("HOME");
  const [firstHalfStartPossession, setFirstHalfStartPossession] = useState<string>("");
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  // Active Play Wizard State
  // 'IDLE' = Waiting to start play (with prominent "START PLAY" button)
  // 'PLAY_TYPE' = Pass / Run / Penalty selection
  // 'DETAILS' = Select outcome, offense, defense
  // 'CONVERSION' = 1PT / 2PT PAT
  // 'GAME_OVER' = Match Final Confirmation
  const [step, setStep] = useState<"IDLE" | "PLAY_TYPE" | "DETAILS" | "CONVERSION" | "GAME_OVER">("IDLE");
  const [playType, setPlayType] = useState<"Pass" | "Run" | "Penalty" | null>(null);
  const [outcome, setOutcome] = useState<"Complete" | "Incomplete" | "PBU" | "Interception" | "Sack" | "Gain" | "Loss" | "FFL" | null>(null);

  const [qbRunner, setQbRunner] = useState<string>("");
  const [receiver, setReceiver] = useState<string>("");
  const [openSection, setOpenSection] = useState<"qb" | "receiver" | "defenders" | null>("qb");
  const [defenders, setDefenders] = useState<string[]>([]);
  const [flaggers, setFlaggers] = useState<string[]>([]);

  // QB Autofill Memory
  const [lastHomeQB, setLastHomeQB] = useState<string>("");
  const [lastAwayQB, setLastAwayQB] = useState<string>("");

  // Conversion State
  const [convPts, setConvPts] = useState<1 | 2 | null>(null);
  const [convIsGood, setConvIsGood] = useState<boolean | null>(null);
  const [convPasser, setConvPasser] = useState<string>("");
  const [convReceiver, setConvReceiver] = useState<string>("");
  const [playResult, setPlayResult] = useState<string>("");

  // View tabs
  const [activeTab, setActiveTab] = useState<"tracker" | "play-by-play" | "box-score">("tracker");
  useEffect(() => {
    if (!canEdit) setActiveTab("box-score");
  }, [canEdit]);
  const [boxScoreTab, setBoxScoreTab] = useState<"home" | "away">("home");
  const [plays, setPlays] = useState<any[]>([]);
  const [historicalPlays, setHistoricalPlays] = useState<any[]>([]);
  const [lastLoggedPlayStatement, setLastLoggedPlayStatement] = useState<string>("");

  // Error handling
  const [loadError, setLoadError] = useState<string | null>(null);
  const [playsError, setPlaysError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<{ kind: "warning" | "error"; message: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Load Match Data & Plays
  useEffect(() => {
    let isCancelled = false;
    const loadMatchData = async () => {
      setLoadError(null);
      try {
        let mData: any = null;
        let allP: any[] = [];

        if (isDemo) {
          mData = getSandboxMatches().find((m: any) => m.id === matchId);
          if (!mData) {
            setLoadingData(false);
            return;
          }
          allP = getSandboxPlayers();
        } else {
          try {
            const matchDoc = await getDoc(doc(db, "matches", matchId));
            if (matchDoc.exists()) {
              mData = { id: matchDoc.id, ...matchDoc.data() };
            }
          } catch (e) {
            console.warn("Could not load match from remote Firestore:", e);
          }

          if (!mData) {
            const yMatch = getYorkMatch(matchId);
            if (yMatch) {
              mData = { ...yMatch };
            }
          }

          if (!mData) {
            mData = getSandboxMatches().find((m: any) => m.id === matchId);
          }

          if (!mData && typeof window !== "undefined") {
            try {
              const raw = localStorage.getItem("flagos_york_matches");
              if (raw) {
                const list = JSON.parse(raw);
                const found = list.find((m: any) => m.id === matchId);
                if (found) mData = { ...found };
              }
            } catch {}
          }

          if (!mData) {
            console.warn("Match not found:", matchId);
            if (!isCancelled) setLoadingData(false);
            return;
          }

          try {
            const rosterTeamId = mData.managingTeamId || mData.homeTeamId || mData.awayTeamId;
            if (rosterTeamId) {
              const playersSnap = await getDocs(query(
                collection(db, "players"),
                where("teamId", "in", [rosterTeamId]),
                limit(60),
              ));
              allP = playersSnap.docs.map((d) => d.data());
            }
          } catch (e) {
            console.warn("Could not load players from Firestore:", e);
          }

          if (
            mData.homeTeamId === YORK_TEAM_ID ||
            mData.awayTeamId === YORK_TEAM_ID ||
            isYorkTeam(mData.homeTeamId) ||
            isYorkTeam(mData.awayTeamId) ||
            isYorkTeam(mData.managingTeamId) ||
            matchId.startsWith("match_york_")
          ) {
            const yPlayers = getYorkTeamPlayers();
            const existingNames = new Set(allP.map((p: any) => p.playerName || p.name));
            for (const yp of yPlayers) {
              if (!existingNames.has(yp.playerName)) {
                allP.push(yp);
              }
            }
          }
        }

        if (isCancelled) return;
        setMatchData(mData);

        const hName = mData.homeTeamName || "HOME";
        const aName = mData.awayTeamName || "AWAY";
        setHomeTeamName(hName);
        setAwayTeamName(aName);
        setHomeTeamId(mData.homeTeamId || "home_id");
        setAwayTeamId(mData.awayTeamId || "away_id");
        setMatchStatus(mData.status || "scheduled");

        if (mData.status === "in_progress" && mData.matchState) {
          const s = mData.matchState;
          if (s.currentDown !== undefined) setCurrentDown(s.currentDown);
          if (s.possession) setPossession(s.possession);
          if (s.homeScore !== undefined) setHomeScore(s.homeScore);
          else if (typeof mData.homeScore === "number") setHomeScore(mData.homeScore);
          if (s.awayScore !== undefined) setAwayScore(s.awayScore);
          else if (typeof mData.awayScore === "number") setAwayScore(mData.awayScore);
          if (s.half !== undefined) setHalf(s.half as 1 | 2);
          if (s.firstHalfStartPossession) setFirstHalfStartPossession(s.firstHalfStartPossession);
          else setFirstHalfStartPossession(hName);
        } else {
          setPossession(hName);
          setFirstHalfStartPossession(hName);
          if (typeof mData.homeScore === "number") setHomeScore(mData.homeScore);
          if (typeof mData.awayScore === "number") setAwayScore(mData.awayScore);
        }

        const matchSubs = mData.subs || [];
        setSubs(matchSubs);

        setAllPlayers(allP);

        const homeP = allP.filter((p: any) => p.teamId === mData.homeTeamId).map((p: any) => p.playerName || p.name);
        const awayP = allP.filter((p: any) => p.teamId === mData.awayTeamId).map((p: any) => p.playerName || p.name);

        const homeRosterFromDoc = Array.isArray(mData.roster?.home) ? mData.roster.home : (mData.homeRoster || []);
        const awayRosterFromDoc = Array.isArray(mData.roster?.away) ? mData.roster.away : (mData.awayRoster || []);

        setHomePlayers(Array.from(new Set([...homeP, ...homeRosterFromDoc, ...matchSubs])).sort());
        setAwayPlayers(Array.from(new Set([...awayP, ...awayRosterFromDoc, ...matchSubs])).sort());

        // Load historical/season plays for stats leader ordering
        if (isDemo) {
          setHistoricalPlays(getSandboxPlays().filter((p: any) => p.matchId !== matchId));
        } else {
          try {
            if (mData.leagueId) {
              const q = query(
                collection(db, "plays"),
                where("leagueId", "==", mData.leagueId),
                where("isHidden", "!=", true),
                limit(300),
              );
              const snap = await getDocs(q);
              setHistoricalPlays(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any)).filter((p: any) => p.matchId !== matchId));
            }
          } catch (error) {
            console.error("Unable to load historical plays:", error);
          }
        }
      } catch (e) {
        console.error("Error loading match data for async stat keeper:", e);
        if (!isCancelled) {
          setLoadError(
            e instanceof Error && e.message
              ? `We couldn't load this game: ${e.message}`
              : "We couldn't load this game. Check your connection and try again."
          );
        }
      } finally {
        if (!isCancelled) setLoadingData(false);
      }
    };

    loadMatchData();
    return () => {
      isCancelled = true;
    };
  }, [matchId, isDemo, reloadKey]);

  // Fetch plays feed
  const loadPlays = async () => {
    try {
      let pList: any[] = [];
      let firestoreFailed = false;
      if (isDemo) {
        pList = getSandboxPlays(matchId);
      } else {
        try {
          const q = query(collection(db, "plays"), where("matchId", "==", matchId), where("isHidden", "==", false), orderBy("timestamp", "asc"), limit(500));
          const snap = await getDocs(q);
          pList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch (e) {
          console.warn("Could not query Firestore plays:", e);
          firestoreFailed = true;
        }

        if (isYorkMatch(matchId)) {
          const merged = new Map(getYorkTeamPlaysForMatch(matchId).map((play) => [play.id, play]));
          for (const play of pList) {
            if (play.isHidden) merged.delete(play.id);
            else merged.set(play.id, play);
          }
          pList = Array.from(merged.values()).sort((a, b) =>
            String(a.timestamp || "").localeCompare(String(b.timestamp || "")),
          );
        } else if (pList.length === 0) {
          const yorkPlays = getYorkTeamPlaysForMatch(matchId);
          if (yorkPlays && yorkPlays.length > 0) {
            pList = yorkPlays;
          }
        }
      }
      setPlaysError(
        firestoreFailed && pList.length === 0 && !isYorkMatch(matchId)
          ? "Couldn't reach the server to load plays. Showing nothing until the connection is restored."
          : null
      );
      setPlays(pList);
      if (pList.length > 0) {
        const last = pList[pList.length - 1];
        setLastLoggedPlayStatement(
          formatPlaySentence(last, {
            homeTeamName,
            awayTeamName,
            homeTeamId,
            downsPerSeries,
          })
        );

        // Restore last known QB for each team if previously logged in this match
        const homePassPlays = pList.filter(
          (p) => p.possessionTeamId === homeTeamId && p.playType === "Pass" && (p.qbPlayerId || p.passer)
        );
        const awayPassPlays = pList.filter(
          (p) => p.possessionTeamId === awayTeamId && p.playType === "Pass" && (p.qbPlayerId || p.passer)
        );
        if (homePassPlays.length > 0) {
          const lastH = homePassPlays[homePassPlays.length - 1].qbPlayerId || homePassPlays[homePassPlays.length - 1].passer;
          if (lastH) setLastHomeQB((prev) => prev || lastH);
        }
        if (awayPassPlays.length > 0) {
          const lastA = awayPassPlays[awayPassPlays.length - 1].qbPlayerId || awayPassPlays[awayPassPlays.length - 1].passer;
          if (lastA) setLastAwayQB((prev) => prev || lastA);
        }
      } else {
        setLastLoggedPlayStatement("");
      }
    } catch (e) {
      console.error("Error loading plays:", e);
      setPlaysError("Something went wrong loading the play log. Try refreshing.");
    }
  };

  const allPlaysForStats = useMemo(() => {
    return [...historicalPlays, ...plays];
  }, [historicalPlays, plays]);

  const playerStatCounts = useMemo(() => {
    return computePlayerStatCounts(allPlaysForStats);
  }, [allPlaysForStats]);

  useEffect(() => {
    loadPlays();
  }, [matchId, step, homeScore, awayScore]);

  // Autosave game state
  useEffect(() => {
    if (!canEdit || loadingData || matchStatus === "completed" || matchStatus === "scheduled" && step === "IDLE" && homeScore === 0 && awayScore === 0 && half === 1 && currentDown === 1) return;
    const saveState = setTimeout(() => {
      const updatedMatchState = {
        status: (matchStatus === "completed" ? "completed" : "in_progress") as "completed" | "in_progress",
        homeScore,
        awayScore,
        matchState: {
          currentDown,
          possession,
          homeScore,
          awayScore,
          half,
          firstHalfStartPossession,
          isAsyncStatKeeping: true,
        },
      };

      if (isDemo) {
        updateSandboxMatch(matchId, updatedMatchState);
        return;
      }

      const { id: _matchId, ...matchFields } = matchData || {};
      Promise.resolve(setDoc(doc(db, "matches", matchId), { ...matchFields, isHidden: false, ...updatedMatchState }, { merge: true })).catch((err) => {
        console.warn("Could not save match state to Firestore, saving locally:", err);
        setSaveNotice({ kind: "warning", message: "Game state could not be synced. Changes are on this device only." });
      });
      if (matchData) {
        saveYorkCustomMatch({
          ...matchData,
          ...updatedMatchState,
        });
      }
    }, 800);
    return () => clearTimeout(saveState);
  }, [currentDown, possession, homeScore, awayScore, half, firstHalfStartPossession, loadingData, matchStatus, isDemo, matchData, canEdit]);

  const handleAddSub = async (subName: string, teamToAdd: "HOME" | "AWAY") => {
    if (!subName.trim()) return;
    const name = subName.trim();
    const newSubs = Array.from(new Set([...subs, name]));
    setSubs(newSubs);
    if (teamToAdd === "HOME") {
      setHomePlayers((prev) => Array.from(new Set([...prev, name])).sort());
    } else {
      setAwayPlayers((prev) => Array.from(new Set([...prev, name])).sort());
    }
    setNewSubInput("");
    setIsSubModalOpen(false);
    if (isDemo) {
      updateSandboxMatch(matchId, { subs: newSubs });
      return;
    }
    try {
      await setDoc(doc(db, "matches", matchId), { subs: newSubs }, { merge: true });
    } catch (e) {
      console.warn("Error saving sub to match Firestore, saving locally:", e);
    }
    if (matchData) {
      saveYorkCustomMatch({
        ...matchData,
        subs: newSubs,
      });
    }
  };

  // ACTION: "Start Play" Button
  const handleStartPlay = () => {
    if (matchStatus === "scheduled") {
      setMatchStatus("in_progress");
    }
    setStep("PLAY_TYPE");
  };

  // ACTION: "Halftime" Button
  const handleHalftime = () => {
    if (half === 2) {
      alert("The match is already in the Second Half.");
      return;
    }
    if (!confirm("Transition to SECOND HALF? This will flip possession and reset to 1st Down.")) return;
    setHalf(2);
    setCurrentDown(1);
    // Flip possession from whoever started 1st half
    const nextPoss = firstHalfStartPossession === homeTeamName ? awayTeamName : homeTeamName;
    setPossession(nextPoss);
    setStep("IDLE");
  };

  // ACTION: "Game Over" Button
  const handleGameOver = () => {
    setStep("GAME_OVER");
  };

  const finalizeGame = async () => {
    if (!canEdit) return;
    const finalUpdate = {
      status: "completed" as const,
      homeScore,
      awayScore,
      completedAt: new Date().toISOString(),
      roster: {
        home: homePlayers,
        away: awayPlayers,
      },
    };

    try {
      if (isDemo) {
        updateSandboxMatch(matchId, finalUpdate);
        setMatchStatus("completed");
        setActiveTab("play-by-play");
        setStep("IDLE");
        alert("Game finalized successfully!");
        return;
      }
      const { id: _matchId, ...matchFields } = matchData || {};
      await setDoc(doc(db, "matches", matchId), {
        ...matchFields,
        isHidden: false,
        ...finalUpdate,
        completedAt: serverTimestamp(),
      }, { merge: true });
      if (matchData) {
        saveYorkCustomMatch({
          ...matchData,
          ...finalUpdate,
        });
      }
      setMatchStatus("completed");
      setActiveTab("play-by-play");
      setStep("IDLE");
      alert("Game finalized successfully!");
    } catch (e) {
      console.error("Error finalizing match:", e);
      alert("Failed to finalize game.");
    }
  };

  const resetPlayForm = () => {
    setStep("IDLE");
    setPlayType(null);
    setOutcome(null);
    setQbRunner("");
    setReceiver("");
    setOpenSection("qb");
    setDefenders([]);
    setFlaggers([]);
    setConvPts(null);
    setConvIsGood(null);
    setConvPasser("");
    setConvReceiver("");
    setPlayResult("");
  };

  const handlePlayTypeSelect = (type: "Pass" | "Run" | "Penalty") => {
    setPlayType(type);
    // The opponent has no roster in a team stat tracker; auto-fill their passer so our
    // defenders/flaggers are still credited without inventing opponent player stats.
    const offenseIsUnrostered = (possession === homeTeamName ? homePlayers : awayPlayers).length === 0;
    if (type === "Pass") {
      const lastQb = offenseIsUnrostered
        ? OPPONENT_QB_PLACEHOLDER
        : possession === homeTeamName ? lastHomeQB : lastAwayQB;
      setOutcome("Complete");
      setQbRunner(lastQb);
      setOpenSection(lastQb ? (offenseIsUnrostered ? "defenders" : "receiver") : "qb");
    } else if (type === "Run") {
      setOutcome("Gain");
      setQbRunner("");
      setOpenSection("qb");
    } else {
      setOutcome(null);
    }
    setStep("DETAILS");
  };

  const selectOutcome = (id: string) => {
    setOutcome(id as any);
    if (!qbRunner) setOpenSection("qb");
    else setOpenSection(playType === "Pass" && id === "Complete" ? "receiver" : "defenders");
  };

  const handleDefenders = (player: string) => {
    if (player === "TEAM") {
      setDefenders(defenders.includes("TEAM") ? [] : ["TEAM"]);
      return;
    }
    if (defenders.includes("TEAM")) {
      setDefenders([player]);
      return;
    }
    if (defenders.includes(player)) {
      setDefenders(defenders.filter((d) => d !== player));
    } else {
      setDefenders([...defenders, player]);
    }
  };

  const buildPlayData = (result: string, extra?: any) => {
    return {
      matchId,
      possessionTeamId: possession === homeTeamName ? homeTeamId : awayTeamId,
      down: currentDown,
      playType,
      firstDown: result === "First Down" || result === "Touchdown",
      qbPlayerId: playType === "Pass" ? qbRunner : null,
      runnerPlayerId: playType === "Run" ? qbRunner : null,
      receiverPlayerId: receiver || null,
      defenders,
      flaggers,
      passOutcome: outcome,
      isTouchdown: result === "Touchdown",
      isPick6: result === "Pick 6",
      isSafety: result === "Safety",
      turnover:
        result === "Turnover" ||
        result === "Pick 6" ||
        (currentDown === downsPerSeries && result !== "First Down" && result !== "Repeat Down"),
      result,
      isThirdDownAttempt: currentDown === 3 && playType !== "Penalty",
      isThirdDownConversion: currentDown === 3 && (result === "First Down" || result === "Touchdown" || extra?.firstDown),
      isFourthDownAttempt: currentDown === 4 && playType !== "Penalty",
      isFourthDownConversion: currentDown === 4 && (result === "First Down" || result === "Touchdown" || extra?.firstDown),
      half,
      gameClock: null, // Strictly clockless
      isAsyncStatKeeping: true,
      ...extra,
    };
  };

  const logPlayToFirestore = async (playData: any) => {
    if (!canEdit) return;
    if (isDemo) {
      addSandboxPlay({
        ...playData,
        matchId,
        timestamp: new Date().toISOString(),
      });
      loadPlays();
      return;
    }
    const fullPlay = {
      ...playData,
      matchId,
      timestamp: new Date().toISOString(),
    };
    try {
      await createSecureRecord("play", {
        ...playData,
        matchId,
      });
      setSaveNotice(null);
    } catch (e) {
      console.warn("Error logging play to Firestore, saving locally:", e);
      const savedLocally = saveYorkPlay(matchId, {
        ...fullPlay,
        id: `play_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      });
      setSaveNotice(
        savedLocally
          ? { kind: "warning", message: "Couldn't reach the server — this play was saved on this device only." }
          : { kind: "error", message: "This play could not be saved. Check your connection and log it again." }
      );
    }
    loadPlays();
  };

  const handleSavePlay = (result: "Touchdown" | "First Down" | "Short" | "Safety" | "Turnover" | "Next Down" | "Pick 6" | "Repeat Down") => {
    setPlayResult(result);

    if (playType === "Pass") {
      if (possession === homeTeamName) setLastHomeQB(qbRunner);
      else setLastAwayQB(qbRunner);
    }

    if (result === "Touchdown") {
      if (possession === homeTeamName) setHomeScore((s) => s + 6);
      else setAwayScore((s) => s + 6);
      setStep("CONVERSION");
      return;
    }

    if (result === "Pick 6") {
      const newPoss = possession === homeTeamName ? awayTeamName : homeTeamName;
      if (newPoss === homeTeamName) setHomeScore((s) => s + 6);
      else setAwayScore((s) => s + 6);
      setPossession(newPoss);
      setStep("CONVERSION");
      return;
    }

    const rawPlay = buildPlayData(result);
    const statement = formatPlaySentence(rawPlay, {
      homeTeamName,
      awayTeamName,
      homeTeamId,
      downsPerSeries,
    });
    const finalPlay = { ...rawPlay, playStatement: statement };
    logPlayToFirestore(finalPlay);
    setLastLoggedPlayStatement(statement);

    if (result === "Safety") {
      if (possession === homeTeamName) setAwayScore((s) => s + 2);
      else setHomeScore((s) => s + 2);
    }

    // Turnover / Downs
    if (
      result === "Safety" ||
      outcome === "Interception" ||
      result === "Turnover" ||
      (currentDown === downsPerSeries && result !== "First Down" && result !== "Repeat Down")
    ) {
      setPossession(possession === homeTeamName ? awayTeamName : homeTeamName);
      setCurrentDown(1);
    } else if (result === "First Down") {
      setCurrentDown(1);
    } else if (result === "Repeat Down") {
      // keep same down
    } else {
      if (currentDown < downsPerSeries) setCurrentDown((d) => d + 1);
    }

    resetPlayForm();
  };

  const handleSavePenalty = (penaltyData: {
    side: "offense" | "defense";
    penalizedTeamName: string;
    penaltyDef: PenaltyDefinition;
    yards: number;
    enforcement: "accepted" | "declined" | "offset";
    downResult: "automatic_first_down" | "repeat_down" | "loss_of_down" | "play_stands";
    player?: string;
    statement: string;
  }) => {
    const { side, penalizedTeamName, penaltyDef, yards, enforcement, downResult, player, statement } = penaltyData;

    const isFirstDown = downResult === "automatic_first_down";
    const isLossOfDown = downResult === "loss_of_down";
    const isRepeatDown = downResult === "repeat_down";

    const resultString = isFirstDown
      ? "First Down"
      : isLossOfDown
      ? "Loss of Down"
      : isRepeatDown
      ? "Repeat Down"
      : "Next Down";

    const playData = buildPlayData(resultString, {
      playType: "Penalty",
      firstDown: isFirstDown,
      turnover: isLossOfDown && currentDown >= downsPerSeries,
      penaltyTeam: side,
      penaltyTeamName: penalizedTeamName,
      penaltyType: penaltyDef.name,
      penaltyYards: yards,
      penaltyEnforcement: enforcement,
      penaltyDownResult: downResult,
      penaltyPlayer: player,
      playStatement: statement,
    });

    logPlayToFirestore(playData);
    setLastLoggedPlayStatement(statement);

    // Down progression
    if (isFirstDown) {
      setCurrentDown(1);
    } else if (isLossOfDown) {
      if (currentDown >= downsPerSeries) {
        setPossession(possession === homeTeamName ? awayTeamName : homeTeamName);
        setCurrentDown(1);
      } else {
        setCurrentDown((d) => d + 1);
      }
    } else if (isRepeatDown) {
      // Keep same down
    } else if (enforcement === "declined") {
      if (currentDown >= downsPerSeries) {
        setPossession(possession === homeTeamName ? awayTeamName : homeTeamName);
        setCurrentDown(1);
      } else {
        setCurrentDown((d) => d + 1);
      }
    }

    resetPlayForm();
  };

  const finalizeConversion = () => {
    if (convIsGood && convPts) {
      if (possession === homeTeamName) setHomeScore((s) => s + convPts);
      else setAwayScore((s) => s + convPts);
    }

    const finalPlay: any = {
      ...buildPlayData(playResult),
      conversionAttempt: convPts,
      conversionSuccess: convIsGood,
      conversionPasser: convPasser,
      conversionReceiver: convReceiver,
      pointsScored: 6 + (convIsGood ? convPts! : 0),
    };
    const statement = formatPlaySentence(finalPlay, {
      homeTeamName,
      awayTeamName,
      homeTeamId,
      downsPerSeries,
    });
    finalPlay.playStatement = statement;
    logPlayToFirestore(finalPlay);
    setLastLoggedPlayStatement(statement);

    // Turnover possession to defense after conversion
    setPossession(possession === homeTeamName ? awayTeamName : homeTeamName);
    setCurrentDown(1);
    resetPlayForm();
  };

  const handleUndoLastPlay = async () => {
    if (!confirm("Are you sure you want to undo the last logged play?")) return;
    try {
      if (isDemo) {
        const demoPlays = getSandboxPlays(matchId);
        if (demoPlays.length > 0) {
          const lastPlay: any = demoPlays[demoPlays.length - 1];
          setCurrentDown(lastPlay.down || 1);
          const wasHomePossession = lastPlay.possessionTeamId === homeTeamId;
          setPossession(wasHomePossession ? homeTeamName : awayTeamName);

          const pts = lastPlay.pointsScored || (lastPlay.isTouchdown ? 6 : 0) || (lastPlay.points || 0);
          if (pts > 0) {
            if (wasHomePossession) setHomeScore((s) => Math.max(0, s - pts));
            else setAwayScore((s) => Math.max(0, s - pts));
          }

          deleteSandboxPlay(lastPlay.id);
          resetPlayForm();
          loadPlays();
          alert("Last play undone successfully.");
        } else {
          alert("No plays found to undo.");
        }
        return;
      }

      const q = query(
        collection(db, "plays"),
        where("matchId", "==", matchId),
        orderBy("timestamp", "desc"),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const lastPlayDoc = snap.docs[0];
        const lastPlay = lastPlayDoc.data();

        setCurrentDown(lastPlay.down || 1);
        const wasHomePossession = lastPlay.possessionTeamId === homeTeamId;
        setPossession(wasHomePossession ? homeTeamName : awayTeamName);

        const pts = lastPlay.pointsScored || (lastPlay.isTouchdown ? 6 : 0) || 0;
        if (pts > 0) {
          if (wasHomePossession) setHomeScore((s) => Math.max(0, s - pts));
          else setAwayScore((s) => Math.max(0, s - pts));
        }

        await deleteDoc(lastPlayDoc.ref);
        resetPlayForm();
        loadPlays();
        alert("Last play undone successfully.");
      } else {
        const localPlays = getYorkTeamPlaysForMatch(matchId);
        if (localPlays.length > 0) {
          const lastPlay = localPlays[localPlays.length - 1];
          deleteYorkPlay(matchId, lastPlay.id);
          resetPlayForm();
          loadPlays();
          alert("Last play undone successfully.");
        } else {
          alert("No plays found to undo.");
        }
      }
    } catch (e) {
      console.error("Error undoing play:", e);
      alert("Failed to undo play.");
    }
  };

  const getOrdinal = (n: number) => {
    if (n === 1) return "1st";
    if (n === 2) return "2nd";
    if (n === 3) return "3rd";
    return `${n}th`;
  };

  // Box Score Calculations
  const calculateBoxScore = () => {
    const statsMap: Record<string, any> = {};
    const initPlayer = (name: string) => {
      if (!statsMap[name]) {
        statsMap[name] = {
          name,
          inferredTeam: null,
          passAtt: 0,
          passComp: 0,
          passTD: 0,
          passInt: 0,
          passFD: 0,
          receptions: 0,
          recTD: 0,
          recFD: 0,
          rushAtt: 0,
          rushTD: 0,
          convPass: 0,
          convRec: 0,
          flagPulls: 0,
          sacks: 0,
          ffl: 0,
          int: 0,
          defTD: 0,
          pbu: 0,
        };
      }
    };

    plays.forEach((play) => {
      const offTeam = play.possessionTeamId;
      const defTeam = offTeam === homeTeamId ? awayTeamId : homeTeamId;

      const isConversionPlay = Boolean(
        play.isConversion === true ||
        play.playType === "Conversion" ||
        (!play.isTouchdown && (
          (play.conversionAttempt !== undefined && play.conversionAttempt !== null) ||
          play.conversionSuccess === true
        ))
      );

      if (play.playType === "Pass" && play.qbPlayerId && !isConversionPlay) {
        initPlayer(play.qbPlayerId);
        statsMap[play.qbPlayerId].inferredTeam = offTeam;
        statsMap[play.qbPlayerId].passAtt += 1;
        if (play.passOutcome === "Complete") statsMap[play.qbPlayerId].passComp += 1;
        if (play.isTouchdown) statsMap[play.qbPlayerId].passTD += 1;
        if (play.firstDown) statsMap[play.qbPlayerId].passFD += 1;
        if (play.passOutcome === "Interception") statsMap[play.qbPlayerId].passInt += 1;
      }

      if (play.playType === "Pass" && play.passOutcome === "Complete" && play.receiverPlayerId && !isConversionPlay) {
        initPlayer(play.receiverPlayerId);
        statsMap[play.receiverPlayerId].inferredTeam = offTeam;
        statsMap[play.receiverPlayerId].receptions += 1;
        if (play.isTouchdown) statsMap[play.receiverPlayerId].recTD += 1;
        if (play.firstDown) statsMap[play.receiverPlayerId].recFD += 1;
      }

      if (play.playType === "Run" && play.runnerPlayerId && !isConversionPlay) {
        initPlayer(play.runnerPlayerId);
        statsMap[play.runnerPlayerId].inferredTeam = offTeam;
        statsMap[play.runnerPlayerId].rushAtt += 1;
        if (play.isTouchdown) statsMap[play.runnerPlayerId].rushTD += 1;
      }

      if (isConversionPlay) {
        if (play.conversionSuccess || play.passOutcome === "Complete" || (play.points && play.points > 0)) {
          const passer = play.conversionPasser || play.qbPlayerId;
          const receiver = play.conversionReceiver || play.receiverPlayerId;
          if (passer) {
            initPlayer(passer);
            statsMap[passer].inferredTeam = offTeam;
            statsMap[passer].convPass += 1;
          }
          if (receiver) {
            initPlayer(receiver);
            statsMap[receiver].inferredTeam = offTeam;
            statsMap[receiver].convRec += 1;
          }
        }
      } else if (play.conversionSuccess) {
        if (play.conversionPasser) {
          initPlayer(play.conversionPasser);
          statsMap[play.conversionPasser].inferredTeam = offTeam;
          statsMap[play.conversionPasser].convPass += 1;
        }
        if (play.conversionReceiver) {
          initPlayer(play.conversionReceiver);
          statsMap[play.conversionReceiver].inferredTeam = offTeam;
          statsMap[play.conversionReceiver].convRec += 1;
        }
      }

      if (play.defenders && Array.isArray(play.defenders)) {
        play.defenders.forEach((dName: string) => {
          initPlayer(dName);
          statsMap[dName].inferredTeam = defTeam;
          if (play.passOutcome === "Interception") {
            statsMap[dName].int += 1;
            if (play.isPick6) statsMap[dName].defTD += 1;
          } else if (play.passOutcome === "PBU") {
            statsMap[dName].pbu += 1;
          } else if (play.passOutcome === "Sack") {
            statsMap[dName].sacks += 1;
            statsMap[dName].flagPulls += 1;
          } else {
            statsMap[dName].flagPulls += 1;
          }
        });
      }
    });

    const targetTeamId = boxScoreTab === "home" ? homeTeamId : awayTeamId;
    const ownRoster = new Set(boxScoreTab === "home" ? homePlayers : awayPlayers);
    const otherRoster = new Set(boxScoreTab === "home" ? awayPlayers : homePlayers);
    return Object.values(statsMap).filter((stat: any) => {
      // Opponent placeholders (e.g. "Unknown QB") are never individual stat lines.
      if (!isTrackablePlayer(stat.name)) return false;
      // Roster membership wins over play-inferred team (guards against mis-tagged plays).
      if (ownRoster.has(stat.name) && !otherRoster.has(stat.name)) return true;
      if (otherRoster.has(stat.name) && !ownRoster.has(stat.name)) return false;
      return stat.inferredTeam === targetTeamId;
    });
  };

  const offensePlayers = possession === homeTeamName ? homePlayers : awayPlayers;
  const defensePlayers = possession === homeTeamName ? awayPlayers : homePlayers;
  const homeTeamPalette = homeTeamColors;
  const awayTeamPalette = awayTeamColors;
  const homeTeamText = getReadableTextColor(homeTeamPalette.secondary, homeTeamPalette.primary);
  const awayTeamText = getReadableTextColor(awayTeamPalette.secondary, awayTeamPalette.primary);
  const possessionTeamPalette = possession === homeTeamName ? homeTeamPalette : awayTeamPalette;

  if (loadingData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (loadError && !matchData) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans p-6 text-center" role="alert">
        <Shield className="w-16 h-16 text-red-500/70 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Couldn&apos;t Load Game</h2>
        <p className="text-neutral-400 text-sm mb-6 max-w-md">{loadError}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setLoadingData(true);
              setReloadKey((k) => k + 1);
            }}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all"
          >
            Retry
          </button>
          <Link
            href={backUrl || "/schedule"}
            className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/10"
          >
            Return to Schedule
          </Link>
        </div>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans p-6 text-center">
        <Shield className="w-16 h-16 text-neutral-600 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Game Not Found</h2>
        <p className="text-neutral-400 text-sm mb-6 max-w-md">
          The requested game could not be loaded from online records or local cache.
        </p>
        <Link
          href={backUrl || "/schedule"}
          className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/10"
        >
          Return to Schedule
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-var(--role-switcher-height,0px))] min-h-0 bg-black text-white font-sans selection:bg-emerald-500/30 selection:text-emerald-200 flex flex-col relative overflow-hidden">
      {/* Top Banner & Navigation */}
      <header className="border-b border-white/10 bg-neutral-950/90 backdrop-blur-xl px-3 md:px-5 py-2 md:py-2.5 flex items-center justify-between shrink-0 sticky z-30" style={{ top: "var(--role-switcher-height, 0px)" }}>
        <div className="flex items-center gap-3">
          {!isEmbedded && (
            <Link
              href={backUrl || `/matches/${matchId}`}
              className="flex items-center gap-1.5 text-neutral-400 hover:text-white text-xs font-bold bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Exit Stat Keeper</span>
            </Link>
          )}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Clockless Async Stat Keeper</span>
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">
              • {homeTeamName} vs {awayTeamName}
            </span>
          </div>
        </div>

        {/* View mode tabs */}
        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 text-xs font-bold">
          {canEdit && <button
            onClick={() => setActiveTab("tracker")}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === "tracker" ? "bg-emerald-500 text-black font-black" : "text-neutral-400 hover:text-white"
            }`}
          >
            Stat Keeper
          </button>}
          <button
            onClick={() => setActiveTab("play-by-play")}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === "play-by-play" ? "bg-emerald-500 text-black font-black" : "text-neutral-400 hover:text-white"
            }`}
          >
            Play Log ({plays.length})
          </button>
          <button
            onClick={() => setActiveTab("box-score")}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === "box-score" ? "bg-emerald-500 text-black font-black" : "text-neutral-400 hover:text-white"
            }`}
          >
            Box Score
          </button>
        </div>
      </header>

      {/* CLOCKLESS SCOREBOARD HEADER (TIMERS & TIMEOUTS REMOVED) */}
      <div className="bg-gradient-to-b from-neutral-950 to-neutral-900 border-b border-white/10 p-2.5 md:p-3 relative shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* HOME TEAM */}
          <div data-testid="home-scoreboard"
            className="flex flex-col items-center gap-1 flex-1 min-w-0 px-2 md:px-3 py-1.5 rounded-2xl border shadow-sm"
            style={{
              backgroundColor: homeTeamPalette.secondary,
              borderColor: `${homeTeamPalette.primary}40`,
            }}
          >
            <div className="flex items-center gap-2">
              <TeamLogo
                teamName={homeTeamName}
                className="w-5 h-5 md:w-6 md:h-6"
                isDemo={isDemo}
                primaryColor={homeTeamText}
              />
              <span className="text-xs md:text-base font-black uppercase tracking-wide truncate max-w-[140px] md:max-w-none" style={{ color: homeTeamText }}>
                {homeTeamName}
              </span>
              {possession === homeTeamName && (
                <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: homeTeamPalette.primary }} title="Possession" />
              )}
            </div>
            <span className="text-3xl md:text-5xl font-black tabular-nums tracking-tighter" style={{ color: homeTeamText }}>
              {homeScore}
            </span>
          </div>

          {/* PERIOD BADGE (FIRST HALF / SECOND HALF ONLY - NO TIMERS) */}
          <div className="flex flex-col items-center justify-center gap-0.5 px-2 md:px-5 py-1.5 rounded-xl bg-black/60 border border-white/10 shadow-inner shrink-0">
            <span className="text-[8px] md:text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">
              {matchStatus === "completed" ? "Game Complete" : "Current Period"}
            </span>
            <span className="text-sm md:text-lg font-black tracking-wider uppercase text-white">
              {matchStatus === "completed" ? "Final" : half === 1 ? "First Half" : "Second Half"}
            </span>
            {matchStatus !== "completed" && (
              <span className="text-xs md:text-sm font-black tracking-wider uppercase text-emerald-300 mt-0.5">
                {getOrdinal(currentDown)} Down
              </span>
            )}
          </div>

          {/* AWAY TEAM */}
          <div data-testid="away-scoreboard"
            className="flex flex-col items-center gap-1 flex-1 min-w-0 px-2 md:px-3 py-1.5 rounded-2xl border shadow-sm"
            style={{
              backgroundColor: awayTeamPalette.secondary,
              borderColor: `${awayTeamPalette.primary}40`,
            }}
          >
            <div className="flex items-center gap-2">
              {possession === awayTeamName && (
                <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: awayTeamPalette.primary }} title="Possession" />
              )}
              <span className="text-xs md:text-base font-black uppercase tracking-wide truncate max-w-[140px] md:max-w-none" style={{ color: awayTeamText }}>
                {awayTeamName}
              </span>
              <TeamLogo
                teamName={awayTeamName}
                className="w-5 h-5 md:w-6 md:h-6"
                isDemo={isDemo}
                primaryColor={awayTeamText}
              />
            </div>
            <span className="text-3xl md:text-5xl font-black tabular-nums tracking-tighter" style={{ color: awayTeamText }}>
              {awayScore}
            </span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex flex-col flex-1 min-h-0 w-full p-2 md:p-3 overflow-visible md:overflow-hidden">
        {(saveNotice || playsError) && (
          <div className="mb-2 space-y-1 shrink-0">
            {saveNotice && (
              <div
                role="alert"
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs font-bold ${
                  saveNotice.kind === "error"
                    ? "bg-red-500/10 border-red-500/40 text-red-300"
                    : "bg-amber-500/10 border-amber-500/40 text-amber-200"
                }`}
              >
                <span>{saveNotice.message}</span>
                <button type="button" aria-label="Dismiss" onClick={() => setSaveNotice(null)} className="shrink-0 opacity-70 hover:opacity-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {playsError && (
              <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs font-bold bg-red-500/10 border-red-500/40 text-red-300">
                <span>{playsError}</span>
                <button type="button" onClick={() => loadPlays()} className="shrink-0 underline">
                  Retry
                </button>
              </div>
            )}
          </div>
        )}
        {/* TAB 1: INTERACTIVE STAT KEEPER */}
        {canEdit && activeTab === "tracker" && (
          <div className="flex flex-col flex-1 min-h-0 space-y-2">
            {/* MASTER PERIOD & ACTION CONTROLS */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 md:p-3 rounded-xl bg-neutral-900/60 border border-white/10 shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
                <span>Possession:</span>
                <button
                  onClick={() => setPossession(homeTeamName)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                    possession === homeTeamName
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : "bg-white/5 border-white/10 text-neutral-400"
                  }`}
                  style={possession === homeTeamName ? { borderColor: homeTeamPalette.tertiary, color: homeTeamPalette.tertiary } : undefined}
                >
                  {homeTeamName}
                </button>
                <button
                  onClick={() => setPossession(awayTeamName)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                    possession === awayTeamName
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : "bg-white/5 border-white/10 text-neutral-400"
                  }`}
                  style={possession === awayTeamName ? { borderColor: awayTeamPalette.tertiary, color: awayTeamPalette.tertiary } : undefined}
                >
                  {awayTeamName}
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
                <span>Down:</span>
                <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-xl border border-white/10">
                  {Array.from({ length: downsPerSeries }, (_, i) => i + 1).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setCurrentDown(d)}
                      aria-label={`${getOrdinal(d)} Down`}
                      title={`Set to ${getOrdinal(d)} Down`}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        currentDown === d
                          ? "bg-white text-black shadow-md font-black"
                          : "text-neutral-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {getOrdinal(d)}<span className="hidden sm:inline"> Down</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ACTION BUTTONS: Halftime, Game Over, Undo, Add Sub */}
              <div className="flex items-center gap-2">
                {half === 1 && (
                  <button
                    onClick={handleHalftime}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 transition-colors"
                  >
                    Halftime (2nd Half)
                  </button>
                )}

                <button
                  onClick={handleGameOver}
                  className="px-3.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold border border-red-500/40 transition-colors"
                >
                  Game Over
                </button>

                <button
                  onClick={handleUndoLastPlay}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-bold border border-white/10 transition-colors flex items-center gap-1"
                  title="Undo Last Play"
                >
                  <Undo className="w-3.5 h-3.5" />
                  <span>Undo</span>
                </button>

                <button
                  onClick={() => {
                    setSubModalTeam("HOME");
                    setIsSubModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-bold border border-white/10 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Player</span>
                </button>
              </div>
            </div>

            {/* STEP: IDLE -> THE USER-REQUESTED "START PLAY" BUTTON */}
            {step === "IDLE" && (
              <div className="bg-neutral-900/80 border border-white/10 rounded-3xl p-10 md:p-14 text-center space-y-6 shadow-2xl backdrop-blur-xl">
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
                    {half === 1 ? "First Half" : "Second Half"} • {getOrdinal(currentDown)} Down
                  </span>
                  <h2 className="text-3xl md:text-4xl font-black uppercase text-white">
                    {possession} on Offense
                  </h2>
                  <p className="text-neutral-400 text-sm max-w-md mx-auto">
                    Press the button below when ready to track the next play. Timing and timeouts are disabled.
                  </p>
                </div>

                {lastLoggedPlayStatement && (
                  <div className="max-w-md mx-auto p-4 rounded-2xl bg-black/60 border border-amber-500/30 text-left space-y-1.5 shadow-md">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                      <Sparkles className="w-3 h-3" />
                      <span>Last Play Statement:</span>
                    </div>
                    <p className="text-xs font-bold text-neutral-200 font-sans leading-snug">
                      {lastLoggedPlayStatement}
                    </p>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={handleStartPlay}
                    className="w-full max-w-md py-5 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-lg uppercase tracking-wider transition-all shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:scale-102 active:scale-98 cursor-pointer flex items-center justify-center gap-3 mx-auto"
                  >
                    <Play className="w-6 h-6 fill-current" />
                    <span>START NEXT PLAY</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP: PLAY_TYPE -> Choose Pass, Run, or Penalty */}
            {step === "PLAY_TYPE" && (
              <PlayEntryWizard
                step="type"
                variant="async"
                possession={possession}
                currentDown={currentDown}
                downsPerSeries={downsPerSeries}
                onDownChange={setCurrentDown}
                accentColor={possessionTeamPalette.tertiary}
                onSelectType={handlePlayTypeSelect}
                onCancel={() => setStep("IDLE")}
              />
            )}

            {/* STEP: DETAILS -> Penalty Wizard Step OR Pass/Run Details */}
            {step === "DETAILS" && playType === "Penalty" && (
              <PlayEntryWizard
                step="penalty"
                variant="async"
                possessionTeamName={possession}
                defendingTeamName={possession === homeTeamName ? awayTeamName : homeTeamName}
                currentDown={currentDown}
                downsPerSeries={downsPerSeries}
                offenseRoster={offensePlayers}
                defenseRoster={defensePlayers}
                playerNumbers={playerNumberMap}
                accentColor={possessionTeamPalette.tertiary}
                onCancel={resetPlayForm}
                onSavePenalty={handleSavePenalty}
              />
            )}

            {step === "DETAILS" && playType !== "Penalty" && (
              <div className="flex-1 min-h-0 bg-neutral-900 border border-white/10 rounded-2xl p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 content-start gap-2 md:gap-3 shadow-2xl overflow-y-auto md:overflow-hidden">
                <div className="md:col-span-2 flex items-center justify-between border-b border-white/10 pb-2 shrink-0">
                  <div>
                    <h3 className="text-xl font-black uppercase text-white">
                      {playType} Play Details
                    </h3>
                    <p className="text-xs text-neutral-400">
                      {possession} • {getOrdinal(currentDown)} Down
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={resetPlayForm}
                      aria-label="Cancel play"
                      className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Outcome Toggle */}
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                    Play Outcome
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {playType === "Pass" ? (
                      <>
                        {[
                          { id: "Complete", label: "Complete" },
                          { id: "Incomplete", label: "Incomplete" },
                          { id: "PBU", label: "Pass Breakup (PBU)" },
                          { id: "Interception", label: "Interception" },
                          { id: "Sack", label: "Sack" },
                          { id: "FFL", label: "Flag Guarding / FFL" },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => selectOutcome(opt.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                              outcome === opt.id
                                ? "bg-emerald-500 text-black border-emerald-500 font-black"
                                : "bg-neutral-800 border-white/10 text-neutral-300 hover:border-white/20"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </>
                    ) : (
                      <>
                        {[
                          { id: "Gain", label: "Positive Gain" },
                          { id: "Loss", label: "Loss of Yards" },
                          { id: "FFL", label: "Flag Guarding / FFL" },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => selectOutcome(opt.id)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                              outcome === opt.id
                                ? "bg-cyan-500 text-black border-cyan-500 font-black"
                                : "bg-neutral-800 border-white/10 text-neutral-300 hover:border-white/20"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Quarterback / Runner Selection */}
                {openSection !== "qb" && (
                  <SectionSummary
                    label={playType === "Pass" ? "Quarterback" : "Ball Carrier"}
                    value={qbRunner ? `${playerNumberMap[qbRunner] ? `#${playerNumberMap[qbRunner]} ` : ""}${displayPlayerName(qbRunner, possession)}` : "Select player"}
                    filled={!!qbRunner}
                    onOpen={() => setOpenSection("qb")}
                  />
                )}
                <div className={`min-w-0 ${openSection === "qb" ? "" : "hidden"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      {playType === "Pass" ? "Quarterback" : "Ball Carrier"}
                    </label>
                    {qbRunner && (
                      <span className="text-[10px] font-bold text-cyan-400">
                        Selected: {playerNumberMap[qbRunner] ? `#${playerNumberMap[qbRunner]} ` : ""}{displayPlayerName(qbRunner, possession)}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 xl:grid-cols-3 gap-1 max-h-36 md:max-h-40 [@media(max-height:450px)]:max-h-24 overflow-y-auto">
                    {(offensePlayers.length === 0
                      ? [OPPONENT_QB_PLACEHOLDER]
                      : sortRosterByStatLeader(
                          offensePlayers,
                          playerNumberMap,
                          playType === "Run" ? playerStatCounts.rushing : playerStatCounts.passing
                        )
                    ).map((p) => {
                      const pNum = playerNumberMap[p];
                      const isSelected = qbRunner === p;
                      const isPlaceholder = isOpponentPlaceholder(p);
                      const label = displayPlayerName(p, possession);
                      const statCount = isPlaceholder
                        ? undefined
                        : playType === "Run" ? playerStatCounts.rushing[p] : playerStatCounts.passing[p];
                      return (
                        <button
                          key={p}
                          type="button"
                          aria-label={label}
                          onClick={() => {
                            setQbRunner(p);
                            setOpenSection(playType === "Pass" && outcome === "Complete" ? "receiver" : "defenders");
                            if (playType === "Pass") {
                              if (possession === homeTeamName) setLastHomeQB(p);
                              else setLastAwayQB(p);
                            }
                          }}
                          className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all border flex items-center justify-between gap-1.5 ${
                            isSelected
                              ? "bg-white text-black font-black border-white shadow-sm"
                              : "bg-neutral-800 border-white/10 text-neutral-300 hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {pNum && (
                              <span className={`px-1 py-0.2 rounded font-mono font-bold text-[10px] shrink-0 ${
                                isSelected ? "bg-black/15 text-black" : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                              }`}>
                                #{pNum}
                              </span>
                            )}
                            <span className="truncate">{label}</span>
                            {statCount !== undefined && statCount > 0 && (
                              <span className={`text-[10px] font-mono font-bold shrink-0 ${isSelected ? "text-black/80" : "text-cyan-400/80"}`}>
                                ({statCount} {playType === "Run" ? "rush" : "att"})
                              </span>
                            )}
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Receiver Selection (for Complete pass) */}
                {playType === "Pass" && outcome === "Complete" && openSection !== "receiver" && (
                  <SectionSummary
                    label="Receiver"
                    value={receiver ? `${playerNumberMap[receiver] ? `#${playerNumberMap[receiver]} ` : ""}${receiver}` : "Select receiver"}
                    filled={!!receiver}
                    onOpen={() => setOpenSection("receiver")}
                  />
                )}
                {playType === "Pass" && outcome === "Complete" && (
                  <div className={`min-w-0 ${openSection === "receiver" ? "" : "hidden"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                        Target Receiver
                      </label>
                      {receiver && (
                        <span className="text-[10px] font-bold text-emerald-400">
                          Selected: {playerNumberMap[receiver] ? `#${playerNumberMap[receiver]} ` : ""}{receiver}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-1 max-h-36 md:max-h-40 [@media(max-height:450px)]:max-h-24 overflow-y-auto">
                      {sortRosterByStatLeader(
                        offensePlayers,
                        playerNumberMap,
                        playerStatCounts.receiving
                      ).map((p) => {
                        const pNum = playerNumberMap[p];
                        const isSelected = receiver === p;
                        const recCount = playerStatCounts.receiving[p];
                        return (
                          <button
                            key={p}
                            type="button"
                            aria-label={p}
                            onClick={() => {
                              setReceiver(p);
                              setOpenSection("defenders");
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-between gap-1.5 ${
                              isSelected
                                ? "bg-emerald-400 text-black font-black border-emerald-400 shadow-sm"
                                : "bg-neutral-800 border-white/10 text-neutral-300 hover:border-white/20"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              {pNum && (
                                <span className={`px-1 py-0.2 rounded font-mono font-bold text-[10px] shrink-0 ${
                                  isSelected ? "bg-black/15 text-black" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                }`}>
                                  #{pNum}
                                </span>
                              )}
                              <span className="truncate">{p}</span>
                              {recCount !== undefined && recCount > 0 && (
                                <span className={`text-[10px] font-mono font-bold shrink-0 ${isSelected ? "text-black/80" : "text-emerald-400/80"}`}>
                                  ({recCount} rec)
                                </span>
                              )}
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Defenders / Flags */}
                {openSection !== "defenders" && (
                  <SectionSummary
                    className="md:col-span-2"
                    label="Flagger(s)"
                    value={defenders.length > 0 ? defenders.map(d => playerNumberMap[d] ? `#${playerNumberMap[d]} ${d}` : d).join(" & ") : "Optional – tap to add"}
                    filled={defenders.length > 0}
                    onOpen={() => setOpenSection("defenders")}
                  />
                )}
                <div className={`md:col-span-2 ${openSection === "defenders" ? "" : "hidden"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Defenders Involved / Flag
                    </label>
                    <button
                      type="button"
                      onClick={() => setOpenSection(null)}
                      className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider"
                    >
                      Done
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1 max-h-36 md:max-h-40 [@media(max-height:450px)]:max-h-24 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => handleDefenders("TEAM")}
                      className={`px-2 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        defenders.includes("TEAM")
                          ? "bg-amber-400 text-black font-black border-amber-400"
                          : "bg-neutral-800 border-white/10 text-neutral-300"
                      }`}
                    >
                      Team Defense
                    </button>
                    {(() => {
                      const isSack = outcome === "Sack" || outcome === "FFL";
                      const defCounts = isSack ? playerStatCounts.sacks : playerStatCounts.flags;
                      return sortRosterByStatLeader(defensePlayers, playerNumberMap, defCounts).map((p) => {
                        const pNum = playerNumberMap[p];
                        const isSelected = defenders.includes(p);
                        const countVal = defCounts[p];
                        return (
                          <button
                            key={p}
                            type="button"
                            aria-label={p}
                            onClick={() => handleDefenders(p)}
                            className={`px-2 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-between gap-1.5 ${
                              isSelected
                                ? "bg-red-500 text-white font-black border-red-500 shadow-sm"
                                : "bg-neutral-800 border-white/10 text-neutral-300 hover:border-white/20"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              {pNum && (
                                <span className={`px-1 py-0.2 rounded font-mono font-bold text-[10px] shrink-0 ${
                                  isSelected ? "bg-white/20 text-white" : "bg-red-500/20 text-red-300 border border-red-500/30"
                                }`}>
                                  #{pNum}
                                </span>
                              )}
                              <span className="truncate">{p}</span>
                              {countVal !== undefined && countVal > 0 && (
                                <span className={`text-[10px] font-mono font-bold shrink-0 ${isSelected ? "text-white/80" : "text-red-300/80"}`}>
                                  ({countVal} {isSack ? "sack" : "flags"})
                                </span>
                              )}
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* ACTION RESULTS BUTTONS (STICKY IN-FRAME) */}
                <div className="md:col-span-2 border-t border-white/10 pt-2 space-y-1 bg-neutral-900/95 backdrop-blur-md pb-1">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                    Save Play Result
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                    <button
                      onClick={() => handleSavePlay("Touchdown")}
                      className="py-2 px-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-black font-black text-[10px] uppercase tracking-wider shadow-lg transition-all cursor-pointer"
                    >
                      TOUCHDOWN (+6)
                    </button>
                    <button
                      onClick={() => handleSavePlay("First Down")}
                      className="py-2 px-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                    >
                      FIRST DOWN
                    </button>
                    <button
                      onClick={() => handleSavePlay("Next Down")}
                      className="py-2 px-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-white/10 text-white font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                    >
                      NEXT DOWN
                    </button>
                    {outcome === "Interception" && (
                      <button
                        onClick={() => handleSavePlay("Pick 6")}
                        className="py-2 px-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase tracking-wider shadow-lg transition-all cursor-pointer"
                      >
                        PICK 6 (+6)
                      </button>
                    )}
                    <button
                      onClick={() => handleSavePlay("Turnover")}
                      className="py-2 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                    >
                      TURNOVER
                    </button>
                    <button
                      onClick={() => handleSavePlay("Safety")}
                      className="py-2 px-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                    >
                      SAFETY (+2 DEF)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP: CONVERSION (PAT 1PT or 2PT) */}
            {step === "CONVERSION" && (
              <PlayEntryWizard
                step="conversion"
                variant="async"
                points={convPts}
                isGood={convIsGood}
                onPointsChange={setConvPts}
                onResultChange={setConvIsGood}
                accentColor={possessionTeamPalette.tertiary}
              >
                {convPts && (
                  <div className="space-y-2 pt-1">
                    <button
                      onClick={finalizeConversion}
                      disabled={convIsGood === null}
                      className="w-full py-2.5 rounded-xl bg-white hover:bg-neutral-200 disabled:opacity-40 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer"
                    >
                      Confirm Conversion & Flip Possession
                    </button>
                  </div>
                )}
              </PlayEntryWizard>
            )}

            {/* STEP: GAME_OVER MODAL */}
            {step === "GAME_OVER" && (
              <div className="flex-1 min-h-0 bg-neutral-900 border border-red-500/40 rounded-2xl p-3 md:p-5 flex flex-col justify-center gap-3 shadow-2xl text-center overflow-y-auto md:overflow-hidden">
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black uppercase text-white">Finalize Game</h3>
                  <p className="text-neutral-400 text-xs max-w-sm mx-auto">
                    Are you ready to mark this game as completed? Final score will be recorded as:
                  </p>
                  <div className="text-3xl font-black text-white font-mono py-2">
                    {homeTeamName} {homeScore} - {awayScore} {awayTeamName}
                  </div>
                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setStep("IDLE")}
                    className="py-3 px-6 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    Resume Game
                  </button>
                  <button
                    onClick={finalizeGame}
                    className="py-3 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg"
                  >
                    Confirm Final Score
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PLAY-BY-PLAY FEED (ZERO TIMESTAMPS OTHER THAN FIRST HALF / SECOND HALF) */}
        {activeTab === "play-by-play" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase text-white">Game Play Log</h3>
              <span className="text-xs text-neutral-400 font-mono">
                {plays.length} Total Plays (Asynchronous)
              </span>
            </div>

            {plays.length === 0 ? (
              <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-8 text-center text-neutral-500 text-sm italic">
                No plays recorded yet. Press "START PLAY" on the Stat Keeper tab to log plays.
              </div>
            ) : (
              <div className="space-y-2.5">
                {plays.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="bg-neutral-900/80 border border-white/5 rounded-2xl p-4 flex items-start justify-between gap-4 shadow-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {/* ONLY FIRST HALF / SECOND HALF MARKER - NO TIMESTAMPS */}
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase">
                          {p.half === 2 ? "Second Half" : "First Half"}
                        </span>
                        <span className="text-neutral-400 font-mono text-xs">
                          {getOrdinal(p.down || 1)} Down
                        </span>
                        <span className="text-xs font-bold text-white">
                          • {p.possessionTeamId === homeTeamId ? homeTeamName : awayTeamName}
                        </span>
                      </div>

                      <p className="text-sm font-bold text-white leading-relaxed">
                        {formatPlaySentence(p, {
                          homeTeamName,
                          awayTeamName,
                          homeTeamId,
                          downsPerSeries,
                        })}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-emerald-400">
                        {p.result || "Play"}
                      </span>
                      {p.pointsScored > 0 && (
                        <div className="text-[11px] font-mono text-emerald-300 font-bold">
                          +{p.pointsScored} PTS
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BOX SCORE */}
        {activeTab === "box-score" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase text-white">Player Box Score</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setBoxScoreTab("home")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                    boxScoreTab === "home"
                      ? "bg-emerald-500 text-black border-emerald-500 font-black"
                      : "bg-neutral-800 text-neutral-300 border-white/10"
                  }`}
                >
                  {homeTeamName}
                </button>
                <button
                  onClick={() => setBoxScoreTab("away")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                    boxScoreTab === "away"
                      ? "bg-emerald-500 text-black border-emerald-500 font-black"
                      : "bg-neutral-800 text-neutral-300 border-white/10"
                  }`}
                >
                  {awayTeamName}
                </button>
              </div>
            </div>

            <div className="bg-neutral-900 border border-white/10 rounded-2xl p-4 overflow-x-auto shadow-xl">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-white/10 text-neutral-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 pr-4">Athlete</th>
                    <th className="pb-3 px-3 text-center">C / ATT</th>
                    <th className="pb-3 px-3 text-center">PASS TD</th>
                    <th className="pb-3 px-3 text-center">INT</th>
                    <th className="pb-3 px-3 text-center">REC</th>
                    <th className="pb-3 px-3 text-center">REC TD</th>
                    <th className="pb-3 px-3 text-center">RUSH</th>
                    <th className="pb-3 px-3 text-center">RUSH TD</th>
                    <th className="pb-3 px-3 text-center">FLAGS</th>
                    <th className="pb-3 px-3 text-center">SACKS</th>
                    <th className="pb-3 px-3 text-center">DEF INT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {calculateBoxScore().map((stat: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 pr-4 font-bold text-white">{stat.name}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300">
                        {stat.passComp}/{stat.passAtt}
                      </td>
                      <td className="py-2.5 px-3 text-center text-neutral-300">{stat.passTD}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300">{stat.passInt}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300">{stat.receptions}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300">{stat.recTD}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300">{stat.rushAtt}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300">{stat.rushTD}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300">{stat.flagPulls}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300">{stat.sacks}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300">{stat.int}</td>
                    </tr>
                  ))}
                  {calculateBoxScore().length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-neutral-500 italic">
                        No player statistics recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ADD SUB / CUSTOM PLAYER MODAL */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-950 border border-white/20 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsSubModalOpen(false)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-white p-1 rounded-full hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black uppercase text-white mb-1">Add Player / Sub</h3>
            <p className="text-xs text-neutral-400 mb-4">Add a roster player name for stat tracking</p>

            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSubModalTeam("HOME")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${
                    subModalTeam === "HOME"
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : "bg-neutral-900 border-white/10 text-neutral-400"
                  }`}
                >
                  {homeTeamName}
                </button>
                <button
                  type="button"
                  onClick={() => setSubModalTeam("AWAY")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${
                    subModalTeam === "AWAY"
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : "bg-neutral-900 border-white/10 text-neutral-400"
                  }`}
                >
                  {awayTeamName}
                </button>
              </div>

              <input
                type="text"
                placeholder="Player Name (e.g. John Doe)"
                value={newSubInput}
                onChange={(e) => setNewSubInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs outline-none focus:border-emerald-500"
              />

              <button
                onClick={() => handleAddSub(newSubInput, subModalTeam || "HOME")}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Add Player to Roster
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionSummary({
  label,
  value,
  filled,
  onOpen,
  className = "",
}: {
  label: string;
  value: string;
  filled: boolean;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${label}: ${value}. Click to change`}
      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-white/10 bg-neutral-800 hover:border-cyan-500/50 text-left transition-all cursor-pointer ${className}`}
    >
      <span className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 shrink-0">{label}:</span>
        <span className={`text-xs font-black truncate ${filled ? "text-white" : "text-neutral-400 font-semibold"}`}>{value}</span>
      </span>
      <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 shrink-0">
        Change
        <ChevronDown className="w-3.5 h-3.5" />
      </span>
    </button>
  );
}