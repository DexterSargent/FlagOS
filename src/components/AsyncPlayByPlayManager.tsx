"use client";
import FlagOSLoader from "@/components/FlagOSLoader";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";
import { usePageGuide } from "@/lib/pageGuide";
import { ASYNC_STAT_KEEPER_WALKTHROUGH, ASYNC_ADD_PLAYER_WALKTHROUGH } from "@/lib/walkthroughData";

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
import { getPlayScoreDelta } from "@/lib/playScoring";
import { addMatchSub, getMatchSubsByTeam, loadMatchRosterPlayers, type MatchSubsByTeam } from "@/lib/matchRoster";
import { useAuth } from "@/lib/authContext";
import { TeamLogo } from "@/components/TeamAssets";
import FitTeamName from "@/components/FitTeamName";
import PlayEntryWizard from "@/components/play-by-play/PlayEntryWizard";
import { getPlayerNumberMap, sortRosterWithNumbers, sortRosterByStatLeader, computePlayerStatCounts, getDefensiveStatCategory, getDefensiveStatLabel, getEligibleReceivers } from "@/lib/playerNumberHelper";
import { loadStatKeeperHistory } from "@/lib/statKeeperHistory";
import { describePlaysError, fetchMatchPlays, matchPlayConstraints, sortPlaysChronologically } from "@/lib/matchPlaysQuery";
import StatPlayerPicker from "@/components/play-by-play/StatPlayerPicker";
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
import { isDemoMatchId } from "@/lib/demoSandboxRuntime";
import {
  OPPONENT_QB_PLACEHOLDER,
  OPPONENT_RUNNER_PLACEHOLDER,
  displayPlayerName,
  isOpponentPlaceholder,
  isTrackablePlayer,
} from "@/lib/opponentPlaceholder";
import GameTeamStats from "@/components/match/GameTeamStats";
import SiteControls from "@/components/SiteControls";
import PoweredByFooter from "@/components/PoweredByFooter";
import { sandboxHeartbeatWriter, useLiveGameHeartbeat } from "@/lib/gameLiveState";

interface AsyncPlayByPlayManagerProps {
  matchId: string;
  backUrl?: string;
  /** Temporary scorer access granted by a league admin for this game. */
  hasScorerGrant?: boolean;
}

type PlayOutcome = "Complete" | "Incomplete" | "PBU" | "Interception" | "Sack" | "Gain" | "Loss" | "FFL";
type PlayResult = "Touchdown" | "First Down" | "Short" | "Safety" | "Turnover" | "Next Down" | "Pick 6" | "Repeat Down";

export default function AsyncPlayByPlayManager({ matchId, backUrl, hasScorerGrant = false }: AsyncPlayByPlayManagerProps) {
  const router = useRouter();
  const { settings, isDemoLeague } = useLeague();
  const { user, canManageTeam, isLeagueAdmin, loading: authLoading } = useAuth();
  // Persisted team games are real data and must never route through the demo sandbox.
  const isDemo = isDemoMatchId(matchId) && (isDemoLeague || matchId?.startsWith("match_demo_"));
  usePageGuide(ASYNC_STAT_KEEPER_WALKTHROUGH, 1);
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
  const managingTeamId = matchData?.managingTeamId || matchData?.homeTeamId;
  const canEdit = !authLoading && (
    hasScorerGrant || !!canManageTeam?.(managingTeamId) || ((isDemo || !!matchData?.leagueId) && isLeagueAdmin)
  );
  const canTrackPlays = canEdit && matchStatus !== "completed";
  useLiveGameHeartbeat(
    matchId,
    canEdit && !loadingData && matchStatus === "in_progress",
    isDemo ? sandboxHeartbeatWriter((data) => updateSandboxMatch(matchId, data)) : undefined,
  );

  // Match Information
  const [homeTeamName, setHomeTeamName] = useState("HOME");
  const [awayTeamName, setAwayTeamName] = useState("AWAY");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const { home: homeTeamColors, away: awayTeamColors, homeShortcode, awayShortcode } = useMatchTeamColors(matchData, isDemo);

  // Players & Subs
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [subs, setSubs] = useState<MatchSubsByTeam>({ home: [], away: [] });
  const [homePlayers, setHomePlayers] = useState<string[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<string[]>([]);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  usePageGuide(isSubModalOpen ? ASYNC_ADD_PLAYER_WALKTHROUGH : null, 2);
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
  const [outcome, setOutcome] = useState<PlayOutcome | null>(null);
  const [isOobPrompt, setIsOobPrompt] = useState(false);

  const [qbRunner, setQbRunner] = useState<string>("");
  const [receiver, setReceiver] = useState<string>("");
  const [openSection, setOpenSection] = useState<"qb" | "receiver" | "defenders" | "flaggers" | null>("qb");
  const [isOutcomeOpen, setIsOutcomeOpen] = useState(true);
  const [conversionSection, setConversionSection] = useState<"passer" | "receiver" | null>("passer");
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
  // The touchdown is saved as soon as it's entered; the PAT then replaces that pending play.
  const pendingTdRef = useRef<{ play: Record<string, any>; id: Promise<string | null> } | null>(null);
  const resolvedPendingIds = useRef<Set<string>>(new Set());
  const conversionsInFlight = useRef(0);

  // View tabs
  const [activeTab, setActiveTab] = useState<"tracker" | "play-by-play" | "box-score" | "team-stats">("tracker");
  const playEntryRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (playEntryRef.current) playEntryRef.current.scrollTop = 0;
  }, [step, activeTab]);
  useEffect(() => {
    if (matchStatus === "completed") setActiveTab("play-by-play");
    else if (!canEdit) setActiveTab("box-score");
  }, [canEdit, matchStatus]);
  const [boxScoreTab, setBoxScoreTab] = useState<"home">("home");
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
              mData = { ...matchDoc.data(), id: matchDoc.id };
            }
          } catch (e) {
            console.warn("Could not load match from remote Firestore:", e);
          }

          if (!mData) {
            mData = getSandboxMatches().find((m: any) => m.id === matchId);
          }

          if (!mData) {
            console.warn("Match not found:", matchId);
            if (!isCancelled) setLoadingData(false);
            return;
          }

          try {
            allP = await loadMatchRosterPlayers(mData);
          } catch (e) {
            console.warn("Could not load players from Firestore:", e);
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

        const matchSubs = getMatchSubsByTeam(mData);
        setSubs(matchSubs);

        setAllPlayers(allP);

        const homeP = allP.filter((p: any) => p.teamId === mData.homeTeamId).map((p: any) => p.playerName || p.name);
        const awayP = allP.filter((p: any) => p.teamId === mData.awayTeamId).map((p: any) => p.playerName || p.name);

        const homeRosterFromDoc = Array.isArray(mData.roster?.home) ? mData.roster.home : (mData.homeRoster || []);
        const awayRosterFromDoc = Array.isArray(mData.roster?.away) ? mData.roster.away : (mData.awayRoster || []);

        setHomePlayers(Array.from(new Set([...homeP, ...homeRosterFromDoc, ...matchSubs.home])).sort());
        setAwayPlayers(Array.from(new Set([...awayP, ...awayRosterFromDoc, ...matchSubs.away])).sort());

        // Load historical/season plays for stats leader ordering
        try {
          setHistoricalPlays(await loadStatKeeperHistory({ ...mData, id: matchId }, isDemo));
        } catch (error) {
          console.error("Unable to load historical plays:", error);
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
      let failure: unknown = null;
      if (isDemo) {
        pList = getSandboxPlays(matchId);
      } else {
        if (!matchData) return;
        try {
          pList = await fetchMatchPlays(matchId, matchData);
        } catch (e) {
          console.warn("Could not query Firestore plays:", e);
          failure = e;
        }
      }
      setPlaysError(failure ? describePlaysError(failure, !!user) : null);
      setPlays(pList);
      if (pList.length > 0) {
        const last = pList[pList.length - 1];
        if (canEdit && last.conversionPending === true && last.id && !resolvedPendingIds.current.has(last.id) && conversionsInFlight.current === 0 && step === "IDLE") {
          const { id: pendingId, timestamp: _ts, createdAt: _created, ref: _ref, ...pendingPlay } = last;
          pendingTdRef.current = { play: pendingPlay, id: Promise.resolve(pendingId) };
          setPlayResult(last.result || (last.isPick6 ? "Pick 6" : "Touchdown"));
          setSaveNotice({ kind: "warning", message: "PAT pending: choose the conversion result for the last touchdown." });
          setStep("CONVERSION");
        }
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
    return computePlayerStatCounts(allPlaysForStats, allPlayers);
  }, [allPlaysForStats, allPlayers]);

  const liveMatchData = useMemo(() => {
    if (!matchData) return matchData;
    return {
      ...matchData,
      status: matchStatus,
      homeScore,
      awayScore,
      matchState: {
        ...matchData.matchState,
        homeScore,
        awayScore,
        half,
        currentDown,
        possession,
      },
    };
  }, [matchData, matchStatus, homeScore, awayScore, half, currentDown, possession]);

  useEffect(() => {
    loadPlays();
  }, [matchId, step, homeScore, awayScore, matchData]);

  // Autosave game state
  useEffect(() => {
    if (!canEdit || loadingData || matchStatus === "completed" || matchStatus !== "in_progress" && step === "IDLE" && homeScore === 0 && awayScore === 0 && half === 1 && currentDown === 1) return;
    const saveState = setTimeout(() => {
      const updatedMatchState = {
        status: (matchStatus === "completed" ? "completed" : "in_progress") as "completed" | "in_progress",
        homeScore,
        awayScore,
        isAsyncStatKeeping: true,
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

      const { id: _matchId, liveHeartbeatAt: _heartbeat, ...matchFields } = matchData || {};
      Promise.resolve(setDoc(doc(db, "matches", matchId), { ...matchFields, isHidden: false, ...updatedMatchState }, { merge: true })).catch((err) => {
        console.warn("Could not save match state to Firestore, saving locally:", err);
        setSaveNotice({ kind: "warning", message: "Game state could not be synced. Changes are on this device only." });
      });
    }, 800);
    return () => clearTimeout(saveState);
  }, [currentDown, possession, homeScore, awayScore, half, firstHalfStartPossession, loadingData, matchStatus, isDemo, matchData, canEdit]);

  const handleAddSub = async (subName: string, teamToAdd: "HOME" | "AWAY") => {
    if (!subName.trim()) return;
    const name = subName.trim();
    const update = addMatchSub(subs, teamToAdd, name);
    setSubs(update.subsByTeam);
    if (teamToAdd === "HOME") {
      setHomePlayers((prev) => Array.from(new Set([...prev, name])).sort());
    } else {
      setAwayPlayers((prev) => Array.from(new Set([...prev, name])).sort());
    }
    setNewSubInput("");
    setIsSubModalOpen(false);
    if (isDemo) {
      updateSandboxMatch(matchId, update);
      return;
    }
    try {
      await setDoc(doc(db, "matches", matchId), update, { merge: true });
    } catch (e) {
      console.warn("Error saving sub to match Firestore, saving locally:", e);
    }
  };

  // ACTION: "Start Play" Button
  const handleStartPlay = () => {
    if (matchStatus !== "in_progress" && matchStatus !== "completed") {
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
      const { id: _matchId, liveHeartbeatAt: _heartbeat, ...matchFields } = matchData || {};
      await setDoc(doc(db, "matches", matchId), {
        ...matchFields,
        isHidden: false,
        ...finalUpdate,
        liveHeartbeatAt: null,
        completedAt: serverTimestamp(),
      }, { merge: true });
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
    pendingTdRef.current = null;
    setStep("IDLE");
    setPlayType(null);
    setOutcome(null);
    setIsOobPrompt(false);
    setIsOutcomeOpen(true);
    setConversionSection("passer");
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

  const offensePlayers = possession === homeTeamName ? homePlayers : awayPlayers;
  const defensePlayers = possession === homeTeamName ? awayPlayers : homePlayers;
  const hasBothRosters = homePlayers.length > 0 && awayPlayers.length > 0;
  const showDefensiveActions = outcome !== "Incomplete" &&
    (defensePlayers.length > 0 || (outcome === "Interception" && offensePlayers.length > 0));
  const hasOffenseSelected = !!qbRunner && (
    outcome !== "Complete" || !!receiver || offensePlayers.length === 0
  );
  const resultOptions: { result: PlayResult | "Out of Bounds"; label: string }[] = [];
  if (hasOffenseSelected && outcome) {
    if (outcome === "Complete" || outcome === "Gain") {
      if (isOobPrompt || defenders.length > 0 || defensePlayers.length === 0) {
        if (!isOobPrompt && defenders.length === 0) resultOptions.push({ result: "Touchdown", label: "TOUCHDOWN (+6)" });
        resultOptions.push(
          { result: "First Down", label: isOobPrompt ? "OOB - FIRST DOWN" : "FIRST DOWN" },
          { result: "Short", label: isOobPrompt ? "OOB - SHORT" : "SHORT OF LINE" },
        );
      } else {
        resultOptions.push(
          { result: "Touchdown", label: "TOUCHDOWN (+6)" },
          { result: "Out of Bounds", label: "OUT OF BOUNDS" },
        );
      }
    } else if (outcome === "Interception") {
      if (defenders.length === 1 || defensePlayers.length === 0) {
        if (flaggers.length === 0) resultOptions.push({ result: "Pick 6", label: "PICK 6 (+6)" });
        resultOptions.push({ result: "Turnover", label: flaggers.length > 0 ? "FLAGGED (Save Turnover)" : "OOB / DOWNED (Save Turnover)" });
      }
    } else if (outcome === "Incomplete" || outcome === "PBU") {
      if (outcome === "Incomplete" || defenders.length > 0 || defensePlayers.length === 0) {
        resultOptions.push({ result: "Next Down", label: "SAVE & NEXT DOWN" });
      }
    } else if (outcome === "Loss" || defenders.length > 0 || defensePlayers.length === 0) {
      resultOptions.push(
        { result: "Short", label: "LOSS OF YARDS" },
        { result: "Safety", label: "SAFETY (+2 DEF)" },
      );
    }
  }

  const handlePlayTypeSelect = (type: "Pass" | "Run" | "Penalty") => {
    setPlayType(type);
    // The opponent has no roster in a team stat tracker; auto-fill their passer / runner so our
    // defenders/flaggers are still credited without inventing opponent player stats.
    const offenseIsUnrostered = (possession === homeTeamName ? homePlayers : awayPlayers).length === 0;
    // League games (no managing team) track both sides, so neither side is treated as the opponent.
    const trackedTeamId = matchData?.managingTeamId;
    const managingTeamName = trackedTeamId === homeTeamId ? homeTeamName : (trackedTeamId === awayTeamId ? awayTeamName : "");
    const isTeamOnDefense = offenseIsUnrostered || (!!managingTeamName && possession !== managingTeamName);

    if (type === "Pass") {
      const lastQb = isTeamOnDefense
        ? OPPONENT_QB_PLACEHOLDER
        : possession === homeTeamName ? lastHomeQB : lastAwayQB;
      setOutcome("Complete");
      setQbRunner(lastQb);
      setOpenSection(lastQb ? (isTeamOnDefense ? "defenders" : "receiver") : "qb");
    } else if (type === "Run") {
      setOutcome("Gain");
      if (isTeamOnDefense) {
        setQbRunner(OPPONENT_RUNNER_PLACEHOLDER);
        setOpenSection("defenders");
      } else {
        setQbRunner("");
        setOpenSection("qb");
      }
    } else {
      setOutcome(null);
    }
    setStep("DETAILS");
  };

  const selectOutcome = (id: PlayOutcome) => {
    setDefenders([]);
    setFlaggers([]);
    setIsOobPrompt(false);
    if (id !== "Complete") setReceiver("");
    setOutcome(id);
    setIsOutcomeOpen(false);
    if (!qbRunner) setOpenSection("qb");
    else setOpenSection(playType === "Pass" && id === "Complete" && offensePlayers.length > 0 ? "receiver" : "defenders");
  };

  const handleDefenders = (player: string) => {
    setIsOobPrompt(false);
    setOpenSection(outcome === "Interception" && offensePlayers.length > 0 ? "flaggers" : null);
    setIsOutcomeOpen(false);
    if (outcome === "PBU" || outcome === "Interception") {
      setDefenders(defenders.includes(player) ? [] : [player]);
      return;
    }
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
      possessionTeamId: (result === "Pick 6" ? possession !== homeTeamName : possession === homeTeamName) ? homeTeamId : awayTeamId,
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
        (currentDown === downsPerSeries && result !== "First Down" && result !== "Touchdown" && result !== "Repeat Down"),
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

  const logPlayToFirestore = async (playData: any): Promise<string | null> => {
    if (!canEdit) return null;
    if (isDemo) {
      const { replacesPlayId, ...demoPlay } = playData;
      if (replacesPlayId) deleteSandboxPlay(replacesPlayId);
      const saved = addSandboxPlay({
        ...demoPlay,
        matchId,
        timestamp: new Date().toISOString(),
      });
      loadPlays();
      return saved.id;
    }
    let savedId: string | null = null;
    try {
      savedId = await createSecureRecord("play", {
        ...playData,
        matchId,
      });
      setSaveNotice(null);
    } catch (e) {
      console.warn("Error logging play to Firestore:", e);
      setSaveNotice({ kind: "error", message: "This play could not be saved. Check your connection and log it again." });
    }
    loadPlays();
    return savedId;
  };

  const saveTouchdownPending = (result: PlayResult) => {
    const rawPlay: Record<string, any> = buildPlayData(result, { conversionPending: true, pointsScored: 6 });
    // Possession hasn't flipped yet for a Pick 6, so record the original offense explicitly.
    rawPlay.possessionTeamId = possession === homeTeamName ? homeTeamId : awayTeamId;
    rawPlay.playStatement = `${formatPlaySentence(rawPlay, { homeTeamName, awayTeamName, homeTeamId, downsPerSeries })} (PAT pending)`;
    setLastLoggedPlayStatement(rawPlay.playStatement);
    pendingTdRef.current = { play: rawPlay, id: logPlayToFirestore(rawPlay) };
    return rawPlay;
  };

  const handleSavePlay = (result: PlayResult) => {
    if (!resultOptions.some((option) => option.result === result)) {
      setSaveNotice({ kind: "error", message: "Select the required players and a valid result for this play outcome." });
      return;
    }
    setPlayResult(result);

    if (playType === "Pass") {
      if (possession === homeTeamName) setLastHomeQB(qbRunner);
      else setLastAwayQB(qbRunner);
    }

    if (result === "Touchdown") {
      saveTouchdownPending(result);
      if (possession === homeTeamName) setHomeScore((s) => s + 6);
      else setAwayScore((s) => s + 6);
      setStep("CONVERSION");
      return;
    }

    if (result === "Pick 6") {
      saveTouchdownPending(result);
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

    const pending = pendingTdRef.current;
    pendingTdRef.current = null;
    const basePlay = pending ? { ...pending.play } : buildPlayData(playResult);
    delete basePlay.playStatement;
    const finalPlay: any = {
      ...basePlay,
      conversionPending: false,
      conversionAttempt: convPts,
      conversionSuccess: convIsGood,
      conversionPasser: convIsGood ? convPasser : "",
      conversionReceiver: convIsGood ? convReceiver : "",
      pointsScored: 6 + (convIsGood ? convPts! : 0),
    };
    const statement = formatPlaySentence(finalPlay, {
      homeTeamName,
      awayTeamName,
      homeTeamId,
      downsPerSeries,
    });
    finalPlay.playStatement = statement;
    if (pending) {
      conversionsInFlight.current += 1;
      void pending.id.then((pendingId) => {
        if (pendingId) resolvedPendingIds.current.add(pendingId);
        return logPlayToFirestore(pendingId ? { ...finalPlay, replacesPlayId: pendingId } : finalPlay);
      }).finally(() => {
        conversionsInFlight.current -= 1;
      });
    } else {
      logPlayToFirestore(finalPlay);
    }
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

          const delta = getPlayScoreDelta(lastPlay as any, homeTeamId);
          if (delta.home) setHomeScore((s) => Math.max(0, s - delta.home));
          if (delta.away) setAwayScore((s) => Math.max(0, s - delta.away));
          if (lastPlay.half) setHalf(lastPlay.half);

          deleteSandboxPlay(lastPlay.id);
          resetPlayForm();
          loadPlays();
          alert("Last play undone successfully.");
        } else {
          alert("No plays found to undo.");
        }
        return;
      }

      const snap = await getDocs(query(collection(db, "plays"), ...matchPlayConstraints(matchId, matchData || {}, { visibleOnly: false })));
      const ordered = sortPlaysChronologically(snap.docs.map((record) => ({ ref: record.ref, ...record.data() })));
      if (ordered.length > 0) {
        const lastPlay: any = ordered[ordered.length - 1];
        const lastPlayDoc = { ref: lastPlay.ref };

        setCurrentDown(lastPlay.down || 1);
        const wasHomePossession = lastPlay.possessionTeamId === homeTeamId;
        setPossession(wasHomePossession ? homeTeamName : awayTeamName);

        const delta = getPlayScoreDelta(lastPlay as any, homeTeamId);
        if (delta.home) setHomeScore((s) => Math.max(0, s - delta.home));
        if (delta.away) setAwayScore((s) => Math.max(0, s - delta.away));
        if (lastPlay.half) setHalf(lastPlay.half);

        await deleteDoc(lastPlayDoc.ref);
        resetPlayForm();
        loadPlays();
        alert("Last play undone successfully.");
      } else {
        alert("No plays found to undo.");
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
          rushFD: 0,
          convPass: 0,
          convRec: 0,
          flagPulls: 0,
          sacks: 0,
          ffl: 0,
          int: 0,
          defTD: 0,
          pbu: 0,
          safeties: 0,
        };
      }
    };

    plays.forEach((play) => {
      const offTeam = play.possessionTeamId;
      const defTeam = offTeam === homeTeamId ? awayTeamId : homeTeamId;

      const isConversionPlay = Boolean(
        play.isConversion === true ||
        play.playType === "Conversion" ||
        (!play.isTouchdown && !play.isPick6 && play.result !== "Pick 6" && (
          (play.conversionAttempt !== undefined && play.conversionAttempt !== null) ||
          play.conversionSuccess === true
        ))
      );

      if (play.playType === "Pass" && (play.qbPlayerId || play.passer) && !isConversionPlay) {
        const qb = play.qbPlayerId || play.passer;
        initPlayer(qb);
        statsMap[qb].inferredTeam = offTeam;
        statsMap[qb].passAtt += 1;
        if (play.passOutcome === "Complete") statsMap[qb].passComp += 1;
        if (play.isTouchdown || play.result === "Touchdown") statsMap[qb].passTD += 1;
        if (play.firstDown || play.result === "First Down" || play.isTouchdown || play.result === "Touchdown") statsMap[qb].passFD += 1;
        if (play.passOutcome === "Interception") statsMap[qb].passInt += 1;
      }

      if (play.playType === "Pass" && play.passOutcome === "Complete" && (play.receiverPlayerId || play.receiver) && !isConversionPlay) {
        const rec = play.receiverPlayerId || play.receiver;
        initPlayer(rec);
        statsMap[rec].inferredTeam = offTeam;
        statsMap[rec].receptions += 1;
        if (play.isTouchdown || play.result === "Touchdown") statsMap[rec].recTD += 1;
        if (play.firstDown || play.result === "First Down" || play.isTouchdown || play.result === "Touchdown") statsMap[rec].recFD += 1;
      }

      if (play.playType === "Run" && (play.runnerPlayerId || play.ballCarrierPlayerId) && !isConversionPlay) {
        const runner = play.runnerPlayerId || play.ballCarrierPlayerId;
        initPlayer(runner);
        statsMap[runner].inferredTeam = offTeam;
        statsMap[runner].rushAtt += 1;
        if (play.isTouchdown || play.result === "Touchdown") statsMap[runner].rushTD += 1;
        if (play.firstDown || play.result === "First Down" || play.isTouchdown || play.result === "Touchdown") statsMap[runner].rushFD += 1;
      }

      if (isConversionPlay) {
        if (play.conversionSuccess || play.passOutcome === "Complete" || (play.points && play.points > 0)) {
          const passer = play.conversionPasser || play.qbPlayerId || play.passer;
          const receiver = play.conversionReceiver || play.receiverPlayerId || play.receiver;
          const runner = play.conversionRunner || play.runnerPlayerId || play.ballCarrierPlayerId;
          if (play.playType === "Pass") {
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
          } else if (play.playType === "Run") {
            if (runner) {
              initPlayer(runner);
              statsMap[runner].inferredTeam = offTeam;
              statsMap[runner].convRec += 1;
            }
          } else {
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
        if (play.conversionRunner) {
          initPlayer(play.conversionRunner);
          statsMap[play.conversionRunner].inferredTeam = offTeam;
          statsMap[play.conversionRunner].convRec += 1;
        }
      }

      if (play.defenders && Array.isArray(play.defenders)) {
        play.defenders.forEach((dName: string) => {
          initPlayer(dName);
          statsMap[dName].inferredTeam = defTeam;
          if (play.passOutcome === "Interception") {
            statsMap[dName].int += 1;
            if (play.isPick6 || play.result === "Pick 6") statsMap[dName].defTD += 1;
          } else if (play.passOutcome === "PBU") {
            statsMap[dName].pbu += 1;
          } else if (play.passOutcome === "Sack") {
            statsMap[dName].sacks += 1;
            statsMap[dName].flagPulls += 1;
            if (play.isSafety || play.result === "Safety") statsMap[dName].safeties += 1;
          } else if (play.passOutcome === "FFL") {
            statsMap[dName].ffl += 1;
            statsMap[dName].flagPulls += 1;
            if (play.isSafety || play.result === "Safety") statsMap[dName].safeties += 1;
          } else {
            statsMap[dName].flagPulls += 1;
          }
        });
      }
      if (play.flaggers && Array.isArray(play.flaggers)) {
        play.flaggers.forEach((flaggerName: string) => {
          initPlayer(flaggerName);
          const flaggerTeam = play.passOutcome === "Interception" ? offTeam : defTeam;
          statsMap[flaggerName].inferredTeam = flaggerTeam;
          statsMap[flaggerName].flagPulls += 1;
        });
      }
      if (play.defFlagPullPlayerId) {
        initPlayer(play.defFlagPullPlayerId);
        statsMap[play.defFlagPullPlayerId].inferredTeam = defTeam;
        statsMap[play.defFlagPullPlayerId].flagPulls += 1;
      }
      if (play.interceptorPlayerId) {
        initPlayer(play.interceptorPlayerId);
        statsMap[play.interceptorPlayerId].inferredTeam = defTeam;
        statsMap[play.interceptorPlayerId].int += 1;
        if (play.isPick6 || play.result === "Pick 6") statsMap[play.interceptorPlayerId].defTD += 1;
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

  const homeTeamPalette = homeTeamColors;
  const awayTeamPalette = awayTeamColors;
  const homeTeamText = getReadableTextColor(homeTeamPalette.secondary, homeTeamPalette.primary);
  const awayTeamText = getReadableTextColor(awayTeamPalette.secondary, awayTeamPalette.primary);
  const possessionTeamPalette = possession === homeTeamName ? homeTeamPalette : awayTeamPalette;

  if (loadingData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">
        <FlagOSLoader />
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
    <div className="h-[calc(100dvh-var(--role-switcher-height,0px)-var(--pbp-banner-height,0px))] min-h-0 min-w-0 bg-black text-white font-sans selection:bg-emerald-500/30 selection:text-emerald-200 flex flex-col relative overflow-hidden pb-[env(safe-area-inset-bottom)]">
      {/* Top Banner & Navigation */}
      <header data-tour="async-navigation" className="border-b border-white/10 bg-neutral-950/90 backdrop-blur-xl px-2 md:px-5 py-2 md:py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0 z-30">
        <div className="flex min-w-0 items-center gap-2">
          {!isEmbedded && (
            <Link
              href={backUrl || `/matches/${matchId}`}
              className="flex items-center gap-1.5 text-neutral-400 hover:text-white text-xs font-bold bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="sm:hidden">Exit</span>
              <span className="hidden sm:inline">Exit Stat Keeper</span>
            </Link>
          )}
          <div className="hidden lg:flex min-w-0 items-center gap-2">
            <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Stat Keeper · No Clock</span>
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">
              • {homeTeamName} vs {awayTeamName}
            </span>
          </div>
        </div>

        {/* View mode tabs */}
        <div className="flex min-w-0 items-center gap-0.5 bg-black/60 p-1 rounded-xl border border-white/10 text-[10px] sm:text-xs font-bold">
          {canTrackPlays && <button
            onClick={() => setActiveTab("tracker")}
            className={`px-2 sm:px-3 py-2 rounded-lg transition-all ${
              activeTab === "tracker" ? "bg-emerald-500 text-black font-black" : "text-neutral-400 hover:text-white"
            }`}
          >
            Stat Keeper
          </button>}
          <button
            onClick={() => setActiveTab("play-by-play")}
            className={`px-2 sm:px-3 py-2 rounded-lg transition-all ${
              activeTab === "play-by-play" ? "bg-emerald-500 text-black font-black" : "text-neutral-400 hover:text-white"
            }`}
          >
            Play Log ({plays.length})
          </button>
          <button
            onClick={() => setActiveTab("box-score")}
            className={`px-2 sm:px-3 py-2 rounded-lg transition-all ${
              activeTab === "box-score" ? "bg-emerald-500 text-black font-black" : "text-neutral-400 hover:text-white"
            }`}
          >
            Box Score
          </button>
          <button
            onClick={() => setActiveTab("team-stats")}
            className={`px-2 sm:px-3 py-2 rounded-lg transition-all ${
              activeTab === "team-stats" ? "bg-emerald-500 text-black font-black" : "text-neutral-400 hover:text-white"
            }`}
          >
            Team Stats
          </button>
        </div>
        {!isEmbedded && <SiteControls />}
      </header>

      {/* CLOCKLESS SCOREBOARD HEADER (TIMERS & TIMEOUTS REMOVED) */}
      <div data-tour="async-scoreboard" className="bg-gradient-to-b from-neutral-950 to-neutral-900 border-b border-white/10 p-2.5 md:p-3 relative shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* HOME TEAM */}
          <div data-testid="home-scoreboard"
            className="flex flex-col items-center gap-1 flex-1 min-w-0 px-2 md:px-3 py-1.5 rounded-2xl border shadow-sm"
            style={{
              backgroundColor: homeTeamPalette.secondary,
              borderColor: `${homeTeamPalette.primary}40`,
            }}
          >
            <div className="flex items-center justify-center gap-1 min-w-0 w-full">
              <TeamLogo
                teamName={homeTeamName}
                className="hidden sm:block w-5 h-5 md:w-6 md:h-6 shrink-0"
                isDemo={isDemo}
                primaryColor={homeTeamText}
              />
              <FitTeamName name={homeTeamName} shortcode={homeShortcode} className="text-[10px] sm:text-xs md:text-base font-black uppercase tracking-wide" style={{ color: homeTeamText }} />
              {possession === homeTeamName && (
                <span className="w-2 h-2 shrink-0 rounded-full animate-pulse" style={{ backgroundColor: homeTeamPalette.primary }} title="Possession" />
              )}
            </div>
            <span className="text-3xl md:text-5xl font-black tabular-nums tracking-tighter" style={{ color: homeTeamText }}>
              {homeScore}
            </span>
          </div>

          {/* PERIOD BADGE (FIRST HALF / SECOND HALF ONLY - NO TIMERS) */}
          <div className="flex flex-col items-center justify-center gap-0.5 px-2 md:px-5 py-1.5 rounded-xl bg-black/60 border border-white/10 shadow-inner shrink-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">
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
            <div className="flex items-center justify-center gap-1 min-w-0 w-full">
              {possession === awayTeamName && (
                <span className="w-2 h-2 shrink-0 rounded-full animate-pulse" style={{ backgroundColor: awayTeamPalette.primary }} title="Possession" />
              )}
              <FitTeamName name={awayTeamName} shortcode={awayShortcode} className="text-[10px] sm:text-xs md:text-base font-black uppercase tracking-wide" style={{ color: awayTeamText }} />
              <TeamLogo
                teamName={awayTeamName}
                className="hidden sm:block w-5 h-5 md:w-6 md:h-6 shrink-0"
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
      <div className="flex flex-col flex-1 min-h-0 min-w-0 w-full p-2 md:p-3 overflow-hidden">
        {(saveNotice || playsError) && (
          <div data-tour="async-notices" className="mb-2 space-y-1 shrink-0">
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
        {canTrackPlays && activeTab === "tracker" && (
          <div data-tour="async-entry" ref={playEntryRef} role="region" aria-label="Play entry" tabIndex={0} className={`flex flex-col flex-1 min-h-0 min-w-0 gap-2 ${step === "IDLE" || step === "GAME_OVER" ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>
            {/* MASTER PERIOD & ACTION CONTROLS */}
            <div data-tour="async-controls" className={`${step === "IDLE" ? "flex" : "hidden"} flex-wrap items-center justify-between gap-2 p-2 md:p-3 rounded-xl bg-neutral-900/60 border border-white/10 shrink-0`}>
              <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] sm:flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-neutral-300 w-full">
                <span>Possession:</span>
                <button
                  onClick={() => setPossession(homeTeamName)}
                  title={homeTeamName}
                  className={`min-w-0 truncate px-2 py-2 rounded-lg border text-[10px] sm:text-xs font-bold transition-all ${
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
                  title={awayTeamName}
                  className={`min-w-0 truncate px-2 py-2 rounded-lg border text-[10px] sm:text-xs font-bold transition-all ${
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
                      className={`min-w-[44px] min-h-[40px] px-3 py-2 rounded-lg text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
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
              <div className="flex flex-wrap items-center gap-1.5">
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
              <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-2.5 sm:p-5 md:p-8 text-center flex flex-col gap-2 sm:gap-3 shrink-0 shadow-2xl backdrop-blur-xl">
                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
                    {half === 1 ? "First Half" : "Second Half"} • {getOrdinal(currentDown)} Down
                  </span>
                  <h2 className="text-base sm:text-2xl md:text-3xl leading-tight break-words font-black uppercase text-white">
                    {possession} on Offense
                  </h2>
                  <p className="hidden sm:block text-neutral-400 text-sm max-w-md mx-auto">
                    Press the button below when ready to track the next play. Timing and timeouts are disabled.
                  </p>
                </div>

                <button
                  data-tour="async-start"
                  onClick={handleStartPlay}
                  className="w-full max-w-md min-h-12 py-3 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm sm:text-lg uppercase tracking-wide transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 mx-auto shrink-0"
                >
                  <Play className="w-5 h-5 fill-current shrink-0" />
                  <span>START NEXT PLAY</span>
                </button>
                {lastLoggedPlayStatement && (
                  <div className="max-w-md mx-auto p-4 rounded-2xl bg-black/60 border border-amber-500/30 text-left space-y-1.5 shadow-md">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                      <Sparkles className="w-3 h-3" />
                      <span>Last Play</span>
                    </div>
                    <p className="text-xs font-bold text-neutral-200 font-sans leading-snug">
                      {lastLoggedPlayStatement}
                    </p>
                  </div>
                )}

              </div>
            )}

            {/* STEP: PLAY_TYPE -> Choose Pass, Run, or Penalty */}
            {step === "PLAY_TYPE" && (
              <div data-tour="async-type" className="contents"><PlayEntryWizard
                step="type"
                variant="async"
                possession={possession}
                currentDown={currentDown}
                downsPerSeries={downsPerSeries}
                onDownChange={setCurrentDown}
                accentColor={possessionTeamPalette.tertiary}
                onSelectType={handlePlayTypeSelect}
                onCancel={() => setStep("IDLE")}
              /></div>
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
              <div className="flex flex-col flex-1 min-h-0 bg-neutral-900 border border-white/10 rounded-2xl p-2 md:p-4 gap-2 shadow-2xl overflow-hidden">
                <div className="md:col-span-2 flex items-center justify-between border-b border-white/10 pb-2 shrink-0">
                  <div>
                    <h3 className="text-base sm:text-xl font-black uppercase text-white">
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

                <div data-tour="async-players" className="flex-1 min-h-0 overflow-y-auto overscroll-contain grid grid-cols-1 md:grid-cols-2 content-start gap-2">
                {!isOutcomeOpen && outcome && (
                  <SectionSummary className="md:col-span-2" label="Play Outcome" value={outcome} filled onOpen={() => setIsOutcomeOpen(true)} />
                )}
                {isOutcomeOpen && <div data-tour="async-outcome" className="md:col-span-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                    Play Outcome
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {playType === "Pass" ? (
                      <>
                        {([
                          { id: "Complete", label: "Complete" },
                          { id: "Incomplete", label: "Incomplete" },
                          { id: "PBU", label: "Pass Breakup (PBU)" },
                          { id: "Interception", label: "Interception" },
                          { id: "Sack", label: "Sack" },
                          { id: "FFL", label: "Flag For Loss (FFL)" },
                        ] satisfies { id: PlayOutcome; label: string }[]).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => selectOutcome(opt.id)}
                            aria-pressed={outcome === opt.id}
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
                        {([
                          { id: "Gain", label: "Positive Gain" },
                          { id: "Loss", label: "Loss of Yards" },
                          { id: "FFL", label: "Flag For Loss (FFL)" },
                        ] satisfies { id: PlayOutcome; label: string }[]).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => selectOutcome(opt.id)}
                            aria-pressed={outcome === opt.id}
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
                </div>}

                {/* Quarterback / Runner Selection */}
                {openSection !== "qb" && (
                  <SectionSummary
                    label={playType === "Pass" ? "Quarterback" : "Ball Carrier"}
                    value={qbRunner ? `${playerNumberMap[qbRunner] ? `#${playerNumberMap[qbRunner]} ` : ""}${displayPlayerName(qbRunner, possession)}` : "Select player"}
                    filled={!!qbRunner}
                    onOpen={() => setOpenSection("qb")}
                  />
                )}
                <div hidden={openSection !== "qb"} className={`min-w-0 ${openSection === "qb" ? "" : "hidden"}`}>
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
                      ? [playType === "Run" ? OPPONENT_RUNNER_PLACEHOLDER : OPPONENT_QB_PLACEHOLDER]
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
                          aria-pressed={isSelected}
                          onClick={() => {
                            setQbRunner(p);
                            setIsOutcomeOpen(false);
                            if (receiver === p) setReceiver("");
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
                            <span className="min-w-0 break-words leading-tight text-left">{label}</span>
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
                {playType === "Pass" && outcome === "Complete" && offensePlayers.length > 0 && openSection !== "receiver" && (
                  <SectionSummary
                    label="Receiver"
                    value={receiver ? `${playerNumberMap[receiver] ? `#${playerNumberMap[receiver]} ` : ""}${receiver}` : "Select receiver"}
                    filled={!!receiver}
                    onOpen={() => setOpenSection("receiver")}
                  />
                )}
                {playType === "Pass" && outcome === "Complete" && offensePlayers.length > 0 && (
                  <div hidden={openSection !== "receiver"} className={`min-w-0 ${openSection === "receiver" ? "" : "hidden"}`}>
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
                        getEligibleReceivers(offensePlayers, qbRunner),
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
                            aria-pressed={isSelected}
                            onClick={() => {
                              setReceiver(p);
                              setIsOutcomeOpen(false);
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
                              <span className="min-w-0 break-words leading-tight text-left">{p}</span>
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
                {showDefensiveActions && (
                  <div className="md:col-span-2 space-y-2 min-w-0">
                    {defensePlayers.length > 0 && (
                      <StatPlayerPicker
                        collapsible
                        expanded={openSection === "defenders"}
                        onExpandedChange={(expanded) => setOpenSection(expanded ? "defenders" : outcome === "Interception" && offensePlayers.length > 0 ? "flaggers" : null)}
                        label={outcome === "PBU" ? "Pass Breakup" : outcome === "Interception" ? "Interceptor(s)" : outcome === "Sack" || outcome === "FFL" ? "Sacker(s)" : "Flagger(s)"}
                        roster={hasBothRosters ? [...defensePlayers, "TEAM"] : defensePlayers}
                        playerNumbers={playerNumberMap}
                        counts={playerStatCounts[getDefensiveStatCategory(outcome)]}
                        countLabel={getDefensiveStatLabel(getDefensiveStatCategory(outcome))}
                        selected={defenders}
                        onSelect={handleDefenders}
                      />
                    )}
                    {outcome === "Interception" && offensePlayers.length > 0 && (
                        <StatPlayerPicker
                          collapsible
                          expanded={openSection === "flaggers" || (defensePlayers.length === 0 && openSection === "defenders")}
                          onExpandedChange={(expanded) => setOpenSection(expanded ? "flaggers" : null)}
                          label="Flagger(s) on Interception Return"
                          roster={offensePlayers}
                          playerNumbers={playerNumberMap}
                          counts={playerStatCounts.flags}
                          countLabel="flags"
                          selected={flaggers}
                          onSelect={(player) => setFlaggers((current) => current.includes(player) ? current.filter((name) => name !== player) : [...current, player])}
                        />
                    )}
                  </div>
                )}
                </div>

                <div data-tour="async-save" role="group" aria-label="Save play result" className="shrink-0 border-t border-white/10 pt-2 space-y-1 bg-neutral-900 pb-1">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                    Save Play Result
                  </span>
                  {resultOptions.length === 0 && (
                    <p className="text-xs text-neutral-400">Select the required offensive and defensive players to save this outcome.</p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {resultOptions.map(({ result, label }) => (
                      <button
                        key={result}
                        type="button"
                        onClick={() => result === "Out of Bounds" ? setIsOobPrompt(true) : handleSavePlay(result)}
                        className={`min-h-11 py-3 px-2 rounded-xl border font-black text-xs uppercase tracking-wide transition-colors cursor-pointer ${
                          result === "Touchdown" || result === "Pick 6"
                            ? "bg-emerald-500 hover:bg-emerald-400 border-emerald-400 text-black"
                            : result === "Safety" || result === "Turnover"
                            ? "bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300"
                            : "bg-neutral-800 hover:bg-neutral-700 border-white/10 text-white"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP: CONVERSION (PAT 1PT or 2PT) */}
            {step === "CONVERSION" && (
              <div data-tour="async-conversion" className="contents"><PlayEntryWizard
                step="conversion"
                variant="async"
                points={convPts}
                isGood={convIsGood}
                onPointsChange={setConvPts}
                onResultChange={setConvIsGood}
                accentColor={possessionTeamPalette.tertiary}
                footer={convPts && (
                  <button
                    onClick={finalizeConversion}
                    disabled={convIsGood === null}
                    className="w-full min-h-11 py-2.5 px-2 rounded-xl bg-white hover:bg-neutral-200 disabled:opacity-40 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer"
                  >
                    Confirm Conversion & Flip Possession
                  </button>
                )}
              >
                {convPts && convIsGood && (
                  <div className="space-y-2">
                    <StatPlayerPicker
                      collapsible
                      expanded={conversionSection === "passer"}
                      onExpandedChange={(expanded) => setConversionSection(expanded ? "passer" : "receiver")}
                      label="Conversion Passer / Runner"
                      roster={offensePlayers}
                      playerNumbers={playerNumberMap}
                      counts={playerStatCounts.passing}
                      countLabel="att"
                      selected={convPasser ? [convPasser] : []}
                      onSelect={(player) => {
                        setConvPasser(convPasser === player ? "" : player);
                        if (convReceiver === player) setConvReceiver("");
                      }}
                    />
                    <StatPlayerPicker
                      collapsible
                      expanded={conversionSection === "receiver"}
                      onExpandedChange={(expanded) => setConversionSection(expanded ? "receiver" : null)}
                      label="Conversion Receiver"
                      roster={getEligibleReceivers(offensePlayers, convPasser)}
                      playerNumbers={playerNumberMap}
                      counts={playerStatCounts.receiving}
                      countLabel="rec"
                      selected={convReceiver ? [convReceiver] : []}
                      onSelect={(player) => setConvReceiver(convReceiver === player ? "" : player)}
                    />
                  </div>
                )}
              </PlayEntryWizard></div>
            )}

            {/* STEP: GAME_OVER MODAL */}
            {step === "GAME_OVER" && (
              <div data-tour="async-finalize" className="shrink-0 md:shrink md:flex-1 md:min-h-0 bg-neutral-900 border border-red-500/40 rounded-2xl p-3 md:p-5 flex flex-col gap-3 shadow-2xl text-center md:overflow-y-auto">
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black uppercase text-white">Finalize Game</h3>
                  <p className="text-neutral-400 text-xs max-w-sm mx-auto">
                    Are you ready to mark this game as completed? Final score will be recorded as:
                  </p>
                  <div className="text-lg sm:text-3xl break-words font-black text-white font-mono py-2">
                    {homeTeamName} {homeScore} - {awayScore} {awayTeamName}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 justify-center">
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
          <div data-tour="async-log" role="region" aria-label="Game play log" tabIndex={0} className="flex-1 min-h-0 space-y-4 overflow-y-auto overscroll-contain pr-1 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base sm:text-xl font-black uppercase text-white">Game Play Log</h3>
              <span className="text-xs text-neutral-400 font-mono">
                {plays.length} Total Plays
              </span>
            </div>

            {plays.length === 0 ? (
              <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-8 text-center text-neutral-500 text-sm italic">
                No plays recorded yet.{canTrackPlays && ' Press "START PLAY" on the Stat Keeper tab to log plays.'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {plays.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="bg-neutral-900/80 border border-white/5 rounded-2xl p-3 sm:p-4 flex items-start justify-between gap-2 sm:gap-4 shadow-sm"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
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

                      <p className="text-sm break-words font-bold text-white leading-relaxed">
                        {formatPlaySentence(p, {
                          homeTeamName,
                          awayTeamName,
                          homeTeamId,
                          downsPerSeries,
                        })}
                      </p>
                    </div>

                    <div className="text-right shrink-0 max-w-[30%] break-words">
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
          <div data-tour="async-box-score" role="region" aria-label="Player box score" tabIndex={0} className="flex-1 min-h-0 space-y-4 overflow-y-auto overscroll-contain pr-1 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
              <h3 className="text-base text-center sm:text-xl font-black uppercase text-white">Box Score</h3>
            </div>
            <div className="bg-neutral-900 border border-white/10 rounded-2xl p-4 overflow-x-auto shadow-xl scrollbar-thin">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-white/10 text-neutral-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="pb-3 pr-4">Athlete</th>
                    <th className="pb-3 px-3 text-center">C / ATT</th>
                    <th className="pb-3 px-3 text-center">PASS TD</th>
                    <th className="pb-3 px-3 text-center">PASS FD</th>
                    <th className="pb-3 px-3 text-center">INT</th>
                    <th className="pb-3 px-3 text-center">REC</th>
                    <th className="pb-3 px-3 text-center">REC TD</th>
                    <th className="pb-3 px-3 text-center">REC FD</th>
                    <th className="pb-3 px-3 text-center">RUSH</th>
                    <th className="pb-3 px-3 text-center">RUSH TD</th>
                    <th className="pb-3 px-3 text-center">RUSH FD</th>
                    <th className="pb-3 px-3 text-center">PAT PASS</th>
                    <th className="pb-3 px-3 text-center">PAT REC</th>
                    <th className="pb-3 px-3 text-center">FLAGS</th>
                    <th className="pb-3 px-3 text-center">FFL</th>
                    <th className="pb-3 px-3 text-center">SACKS</th>
                    <th className="pb-3 px-3 text-center">PBU</th>
                    <th className="pb-3 px-3 text-center">DEF INT</th>
                    <th className="pb-3 px-3 text-center">DEF TD</th>
                    <th className="pb-3 pl-3 text-center">SAF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {calculateBoxScore().map((stat: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 pr-4 font-bold text-white">{stat.name}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300 font-medium">
                        {stat.passComp}/{stat.passAtt}
                      </td>
                      <td className="py-2.5 px-3 text-center text-neutral-300 font-medium">{stat.passTD}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300 font-medium">{stat.passFD}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300 font-medium">{stat.passInt}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300 font-medium">{stat.receptions}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300 font-medium">{stat.recTD}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300 font-medium">{stat.recFD}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300 font-medium">{stat.rushAtt}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300 font-medium">{stat.rushTD}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300 font-medium">{stat.rushFD}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300 font-medium">{stat.convPass}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300 font-medium">{stat.convRec}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300 font-medium">{stat.flagPulls}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300 font-medium">{stat.ffl}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300 font-medium">{stat.sacks}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300 font-medium">{stat.pbu}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300 font-medium">{stat.int}</td>
                      <td className="py-2.5 px-3 text-center text-neutral-300 font-medium">{stat.defTD}</td>
                      <td className="py-2.5 pl-3 text-center text-neutral-300 font-medium">{stat.safeties}</td>
                    </tr>
                  ))}
                  {calculateBoxScore().length === 0 && (
                    <tr>
                      <td colSpan={20} className="py-8 text-center text-neutral-500 italic">
                        No player statistics recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: TEAM STATS */}
        {activeTab === "team-stats" && (
          <div data-tour="async-team-stats" className="contents"><GameTeamStats matchData={liveMatchData} plays={plays} isDemo={isDemo} /></div>
        )}
      </div>

      {/* ADD SUB / CUSTOM PLAYER MODAL */}
      {isSubModalOpen && (
        <div data-tour="async-add-player" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-950 border border-white/20 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsSubModalOpen(false)}
              className="absolute top-5 right-5 text-neutral-400 hover:text-white p-1 rounded-full hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <PageGuideButton className="mb-2" />
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
      {!isEmbedded && <PoweredByFooter compact />}
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
      <span className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
        <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-400">{label}:</span>
        <span className={`text-xs font-black text-right break-words min-w-0 ${filled ? "text-white" : "text-neutral-400 font-semibold"}`}>{value}</span>
      </span>
      <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 shrink-0">
        <span className="hidden sm:inline">Change</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </span>
    </button>
  );
}