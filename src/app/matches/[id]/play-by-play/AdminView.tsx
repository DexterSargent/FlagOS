"use client";

import { useState, useEffect, use, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Zap, RotateCcw, Flag, Maximize, Minimize, Play, Pause, AlertCircle, Timer, Save, Plus, Minus, X, ChevronRight, ChevronDown, ChevronUp, Undo, AlertTriangle, Shield, Check } from "lucide-react";
import { db } from "@/lib/firebase";
import { createSecureRecord } from "@/lib/secureWrites";
import { collection, getDoc, getDocs, doc, serverTimestamp, updateDoc, deleteDoc, query, where, orderBy, limit } from "firebase/firestore";
import { useLeague } from "@/lib/leagueContext";
import { useAuth } from "@/lib/authContext";
import { simulateFullGame } from "@/lib/gameSimulator";
import { usePrivateLeagueAccess } from "@/lib/usePrivateLeagueAccess";
import PlayEntryWizard from "@/components/play-by-play/PlayEntryWizard";
import { getPlayerNumberMap, sortRosterWithNumbers, sortRosterByStatLeader, computePlayerStatCounts, getDefensiveStatCategory, getEligibleReceivers } from "@/lib/playerNumberHelper";
import { loadStatKeeperHistory } from "@/lib/statKeeperHistory";
import StatPlayerPicker from "@/components/play-by-play/StatPlayerPicker";
import {
  PENALTY_CATALOG,
  PenaltyDefinition,
  formatPenaltyStatement,
  formatPlaySentence,
} from "@/lib/playSentenceFormatter";
import {
  getSandboxMatches,
  getSandboxMatch,
  getSandboxPlayers,
  getSandboxPlays,
  addSandboxPlay,
  updateSandboxMatch,
  deleteSandboxPlay,
  deleteSandboxPlaysForMatch,
  subscribeDemoSandbox,
  isDemoMatch,
} from "@/lib/demoSandbox";
import { useMatchTeamColors } from "@/lib/useMatchTeamColors";
import { isDemoMatchId } from "@/lib/demoSandboxRuntime";
import WalkthroughTrigger from "@/components/walkthrough/WalkthroughTrigger";
import { STAT_KEEPER_WALKTHROUGH } from "@/lib/walkthroughData";

export default function PlayByPlayManager({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const matchId = unwrappedParams.id;
  const router = useRouter();
  const { settings, isDemoLeague, activeLeagueId } = useLeague();
  const { user, isPlatformAdmin } = useAuth();

  const [isEmbedded, setIsEmbedded] = useState(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("embed") === "true" || sp.get("demo") === "true";
    }
    return false;
  });

  const isDemo = isDemoMatchId(matchId) && (isDemoLeague || isEmbedded || isDemoMatch(matchId, activeLeagueId));

  const { isDenied, deniedElement } = usePrivateLeagueAccess({
    isPrivateOverride: matchId.startsWith("match_live_"),
  });



  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("embed") === "true" || sp.get("demo") === "true") setIsEmbedded(true);
    }
  }, []);

  const periodType = settings?.rules?.periodType || "halves";
  const periodsCount = settings?.rules?.periodsCount || 2;
  const periodDurationMinutes = settings?.rules?.periodDurationMinutes || 20;
  const timeoutsPerTeam = settings?.rules?.timeoutsPerTeam ?? 2;
  const timeoutDurationSeconds = settings?.rules?.timeoutDurationSeconds || 60;
  const timeoutsResetPerPeriod = settings?.rules?.timeoutsResetPerPeriod ?? true;
  const downsPerSeries = settings?.rules?.downsPerSeries || 4;
  const playClockSeconds = settings?.rules?.playClockSeconds || 30;
  const halftimeDurationSeconds = settings?.rules?.halftimeDurationSeconds || 300;

  const [loadingData, setLoadingData] = useState(true);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [matchStatus, setMatchStatus] = useState<string>("scheduled");
  const [matchData, setMatchData] = useState<any>(null);
  // Match Info
  const [homeTeamName, setHomeTeamName] = useState("HOME");
  const [awayTeamName, setAwayTeamName] = useState("AWAY");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const { home: homeTeamColors, away: awayTeamColors } = useMatchTeamColors(matchData, isDemo);

  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [subs, setSubs] = useState<string[]>([]);
  const [homePlayers, setHomePlayers] = useState<string[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<string[]>([]);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subModalTeam, setSubModalTeam] = useState<"HOME" | "AWAY" | null>(null);

  const playerNumberMap = useMemo(() => {
    return getPlayerNumberMap(allPlayers, homePlayers, awayPlayers);
  }, [allPlayers, homePlayers, awayPlayers]);

  const handleAddSub = async (subName: string, teamToAdd: "HOME" | "AWAY") => {
    if (subName && subName.trim()) {
      const name = subName.trim();
      const newSubs = [...subs, name];
      setSubs(newSubs);
      if (teamToAdd === "HOME") {
        setHomePlayers(prev => [...prev, name].sort());
      } else {
        setAwayPlayers(prev => [...prev, name].sort());
      }
      setIsSubModalOpen(false);
      if (isDemo) {
        updateSandboxMatch(matchId, { subs: newSubs });
      } else {
        await import('firebase/firestore').then(({ updateDoc, doc }) => updateDoc(doc(db, "matches", matchId), { subs: newSubs }));
      }
    }
  };


  // Game State
  const [currentDown, setCurrentDown] = useState(1);
  const [possession, setPossession] = useState("HOME");
  const [firstHalfStartPossession, setFirstHalfStartPossession] = useState<string>("");
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  // Timing State
  const [half, setHalf] = useState(1);
  const [gameClock, setGameClock] = useState(periodDurationMinutes * 60);
  const [isGameClockRunning, setIsGameClockRunning] = useState(false);
  const [homeTimeouts, setHomeTimeouts] = useState(timeoutsPerTeam);
  const [awayTimeouts, setAwayTimeouts] = useState(timeoutsPerTeam);

  // Timeout Modal State
  const [isTimeoutActive, setIsTimeoutActive] = useState(false);
  const [timeoutClock, setTimeoutClock] = useState(timeoutDurationSeconds);

  // Play Clock State
  const [isFirstPlayOfHalf, setIsFirstPlayOfHalf] = useState(true);
  const [isBallSpotted, setIsBallSpotted] = useState(false);
  const [playClock, setPlayClock] = useState(playClockSeconds);
  const [isPlayClockRunning, setIsPlayClockRunning] = useState(false);

  const [isScoreboardFullscreen, setIsScoreboardFullscreen] = useState(false);

  // Wizard State
  const [step, setStep] = useState<'PLAY_TYPE' | 'DETAILS' | 'CONVERSION' | 'HALFTIME' | 'GAME_OVER'>('PLAY_TYPE');
  const [halftimeClock, setHalftimeClock] = useState(halftimeDurationSeconds);
  const [playType, setPlayType] = useState<"Pass" | "Run" | "Penalty" | null>(null);
  const [outcome, setOutcome] = useState<"Complete" | "Incomplete_Menu" | "PBU" | "Missed" | "Interception" | "Sack" | "Gain" | "FFL" | null>(null);

  const [qbRunner, setQbRunner] = useState<string>("");
  const [receiver, setReceiver] = useState<string>("");
  const [defenders, setDefenders] = useState<string[]>([]);
  const [flaggers, setFlaggers] = useState<string[]>([]);

  // Vertically stacked collapsible wizard sections state
  const [isQbOpen, setIsQbOpen] = useState<boolean>(true);
  const [isReceiverOpen, setIsReceiverOpen] = useState<boolean>(false);
  const [isDefendersOpen, setIsDefendersOpen] = useState<boolean>(false);
  const [isOutcomeOpen, setIsOutcomeOpen] = useState(true);
  const [isConvPasserOpen, setIsConvPasserOpen] = useState<boolean>(true);
  const [isConvReceiverOpen, setIsConvReceiverOpen] = useState<boolean>(false);

  // QB Autofill Memory
  const [lastHomeQB, setLastHomeQB] = useState<string>("");
  const [lastAwayQB, setLastAwayQB] = useState<string>("");

  // Conversion State
  const [convPts, setConvPts] = useState<1 | 2 | null>(null);
  const [convIsGood, setConvIsGood] = useState<boolean | null>(null);
  const [convPasser, setConvPasser] = useState<string>("");
  const [convReceiver, setConvReceiver] = useState<string>("");

  // Game Over State
  const [didNotPlay, setDidNotPlay] = useState<string[]>([]);

  // OOB Result State
  const [isOobPrompt, setIsOobPrompt] = useState(false);

  // Play Result Memory for Conversion
  const [playResult, setPlayResult] = useState<string>("");

  // Live Play Statement & Play Log Drawer State
  const [lastLoggedPlayStatement, setLastLoggedPlayStatement] = useState<string>("");
  const [isPlayLogDrawerOpen, setIsPlayLogDrawerOpen] = useState(false);
  const [matchPlaysList, setMatchPlaysList] = useState<any[]>([]);
  const [historicalPlays, setHistoricalPlays] = useState<any[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const refreshPlays = useCallback(async () => {
    try {
      let pList: any[] = [];
      if (isDemo) {
        pList = getSandboxPlays(matchId);
      } else {
        const q = query(
          collection(db, "plays"),
          where("matchId", "==", matchId),
          orderBy("timestamp", "asc"),
          limit(500),
        );
        const snap = await getDocs(q);
        pList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      setMatchPlaysList(pList);
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
      }
    } catch (e) {
      console.error("Error refreshing plays in admin:", e);
    }
  }, [matchId, isDemo, homeTeamName, awayTeamName, homeTeamId, downsPerSeries]);

  const allPlaysForStats = useMemo(() => {
    return [...historicalPlays, ...matchPlaysList];
  }, [historicalPlays, matchPlaysList]);

  const playerStatCounts = useMemo(() => {
    return computePlayerStatCounts(allPlaysForStats, allPlayers);
  }, [allPlaysForStats, allPlayers]);

  const isUnstartedGame =
    matchStatus === "scheduled" ||
    (matchStatus !== "completed" && matchPlaysList.length === 0);

  const handleSimulateGame = async () => {
    if (!isPlatformAdmin) return;
    if (
      !window.confirm(
        `⚡ Simulate Full Game?\n\nThis will randomly generate a complete, realistic game of play-by-play (passes, runs, TDs, 1/2pt conversions, flags, PBUs, sacks) between ${homeTeamName} and ${awayTeamName}.\n\nAll events and scores will calculate into official team standings and player stat leaderboards.`
      )
    ) {
      return;
    }
    setIsSimulating(true);
    try {
      const res = await simulateFullGame(matchId, {
        leagueId: activeLeagueId,
        isDemo,
      });
      if (res.success) {
        setHomeScore(res.homeScore);
        setAwayScore(res.awayScore);
        setMatchStatus("completed");
        setGameClock(0);
        setHalf(2);
        setStep("GAME_OVER");
        await refreshPlays();
      } else {
        alert(res.error || "Failed to simulate game.");
      }
    } catch (err: any) {
      console.error("Simulation error:", err);
      alert(err.message || "Failed to simulate game.");
    } finally {
      setIsSimulating(false);
    }
  };

  const getOrdinal = (n: number) => {
    if (n === 1) return "1st";
    if (n === 2) return "2nd";
    if (n === 3) return "3rd";
    return `${n}th`;
  };

  const FootballIcon = ({ className, active, style }: { className?: string, active: boolean, style?: React.CSSProperties }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={`${className} ${active ? 'opacity-100 drop-shadow-[0_0_15px_currentColor]' : 'opacity-30 grayscale'} transition-all duration-500`}
      style={style}
    >
      <path
        d="M6 3c-5 12 7 24 19 19-5-12-7-24-19-19z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M13.5 10.5l-3 3M11 8l-3 3M16 13l-3 3"
        fill="none"
        stroke={active ? "#000" : "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  useEffect(() => {
    const loadMatchData = async () => {
      try {
        let mData: any = null;
        let allP: any[] = [];

        if (isDemo) {
          mData = getSandboxMatch(matchId);
          if (!mData) return;
          allP = getSandboxPlayers();
        } else {
          try {
            const matchDoc = await getDoc(doc(db, "matches", matchId));
            if (!matchDoc.exists()) {
              mData = getSandboxMatch(matchId);
              if (!mData) {
                setLoadingData(false);
                return;
              }
              allP = getSandboxPlayers();
            } else {
              mData = matchDoc.data() as any;
              const rosterTeamId = mData.managingTeamId || mData.homeTeamId || mData.awayTeamId;
              const playersSnap = rosterTeamId
                ? await getDocs(query(
                    collection(db, "players"),
                    where("teamId", "==", rosterTeamId),
                    limit(30),
                  ))
                : { docs: [] };
              allP = playersSnap.docs.map(d => d.data());
            }
          } catch (err) {
            console.warn("Unable to fetch live match from Firestore, falling back to local/sandbox:", err);
            mData = getSandboxMatch(matchId);
            if (!mData) {
              setLoadingData(false);
              return;
            }
            allP = getSandboxPlayers();
          }
        }

        if (!mData) {
          setLoadingData(false);
          return;
        }

        setMatchData(mData);
        setHomeTeamName(mData.homeTeamName || "HOME");
        setAwayTeamName(mData.awayTeamName || "AWAY");
        setHomeTeamId(mData.homeTeamId);
        setAwayTeamId(mData.awayTeamId);
        setMatchStatus(mData.status || "scheduled");


        // Automatically resume game if in progress without prompting
        if (mData.status === 'in_progress' && mData.matchState) {
          const s = mData.matchState;
          if (s.currentDown !== undefined) setCurrentDown(s.currentDown);
          if (s.possession) setPossession(s.possession);
          if (s.homeScore !== undefined) setHomeScore(s.homeScore);
          else if (typeof mData.homeScore === "number") setHomeScore(mData.homeScore);
          if (s.awayScore !== undefined) setAwayScore(s.awayScore);
          else if (typeof mData.awayScore === "number") setAwayScore(mData.awayScore);
          if (s.half !== undefined) setHalf(s.half);
          if (s.gameClock !== undefined) setGameClock(s.gameClock);
          if (s.homeTimeouts !== undefined) setHomeTimeouts(s.homeTimeouts);
          if (s.awayTimeouts !== undefined) setAwayTimeouts(s.awayTimeouts);
          if (s.firstHalfStartPossession) {
            setFirstHalfStartPossession(s.firstHalfStartPossession);
          } else {
            setFirstHalfStartPossession(mData.homeTeamName || "HOME");
          }
        } else {
          setPossession(mData.homeTeamName || "HOME");
          setFirstHalfStartPossession(mData.homeTeamName || "HOME");
          if (typeof mData.homeScore === "number") setHomeScore(mData.homeScore);
          if (typeof mData.awayScore === "number") setAwayScore(mData.awayScore);
        }

        const matchSubs = mData.subs || [];
        setSubs(matchSubs);

        // players loaded above
        setAllPlayers(allP);

        const homeP = allP.filter(p => p.teamId === mData.homeTeamId).map(p => p.playerName);
        const awayP = allP.filter(p => p.teamId === mData.awayTeamId).map(p => p.playerName);

        setHomePlayers([...homeP, ...matchSubs].sort());
        setAwayPlayers([...awayP, ...matchSubs].sort());

        // Load historical/season plays for stats leader ordering
        try {
          setHistoricalPlays(await loadStatKeeperHistory({ ...mData, id: matchId }, isDemo));
        } catch (error) {
          console.error("Unable to load historical plays:", error);
        }

        refreshPlays();
      } catch (e) {
        console.error(e);
      }
      setLoadingData(false);
    };
    loadMatchData();
    if (isDemo) {
      const unsub = subscribeDemoSandbox(() => refreshPlays());
      return () => unsub();
    }
  }, [matchId, isDemo, homeTeamName, awayTeamName, homeTeamId, downsPerSeries]);


  // Game Clock
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGameClockRunning && gameClock > 0) {
      interval = setInterval(() => setGameClock(c => Math.max(0, c - 1)), 1000);
    }
    return () => clearInterval(interval);
  }, [isGameClockRunning, gameClock]);

  // Play Clock (IFAF Rules: counts down independently of game clock on referee ready-for-play)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlayClockRunning && playClock > 0) {
      interval = setInterval(() => {
        setPlayClock((c) => {
          if (c <= 1) {
            setIsPlayClockRunning(false);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlayClockRunning, playClock]);

  // Timeout Clock
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimeoutActive && timeoutClock > 0) {
      interval = setInterval(() => setTimeoutClock(c => Math.max(0, c - 1)), 1000);
    } else if (isTimeoutActive && timeoutClock === 0) {
      setIsTimeoutActive(false);
      setPlayClock(playClockSeconds);
      setIsBallSpotted(false);
      setIsGameClockRunning(false);
      setIsFirstPlayOfHalf(true);
    }
    return () => clearInterval(interval);
  }, [isTimeoutActive, timeoutClock, playClockSeconds]);

  // Halftime Clock
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'HALFTIME' && halftimeClock > 0) {
      interval = setInterval(() => setHalftimeClock(c => Math.max(0, c - 1)), 1000);
    }
    return () => clearInterval(interval);
  }, [step, halftimeClock]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(Math.max(0, seconds) / 60);
    const s = Math.max(0, seconds) % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const clockIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startAdjustingClock = (amount: number) => {
    setGameClock(c => Math.max(0, c + amount));
    clockIntervalRef.current = setInterval(() => {
      setGameClock(c => Math.max(0, c + amount));
    }, 150);
  };

  const stopAdjustingClock = () => {
    if (clockIntervalRef.current) {
      clearInterval(clockIntervalRef.current);
      clockIntervalRef.current = null;
    }
  };

  // Automatically transition scheduled match to in_progress once gameplay actions start
  useEffect(() => {
    if (matchStatus === 'scheduled') {
      if (isGameClockRunning || homeScore > 0 || awayScore > 0 || half > 1 || currentDown > 1) {
        setMatchStatus('in_progress');
      }
    }
  }, [isGameClockRunning, homeScore, awayScore, half, currentDown, matchStatus]);

  // Autosave
  useEffect(() => {
    if (loadingData || isResetting || matchStatus === 'scheduled') return;
    const saveState = setTimeout(() => {
      if (isDemo) {
        updateSandboxMatch(matchId, {
          status: 'in_progress',
          homeScore,
          awayScore,
          matchState: {
            currentDown, possession, homeScore, awayScore, half, gameClock, homeTimeouts, awayTimeouts, firstHalfStartPossession
          }
        });
        return;
      }
      updateDoc(doc(db, "matches", matchId), {
        status: 'in_progress',
        homeScore,
        awayScore,
        matchState: {
          currentDown, possession, homeScore, awayScore, half, gameClock, homeTimeouts, awayTimeouts, firstHalfStartPossession
        }
      }).catch(console.error);
    }, 1000);
    return () => clearTimeout(saveState);
  }, [currentDown, possession, homeScore, awayScore, half, gameClock, homeTimeouts, awayTimeouts, firstHalfStartPossession, loadingData, isResetting, matchStatus, isDemo, matchId]);

  // Reset Game to Pre-Game State handler
  const handleResetGameToPreGame = async () => {
    setIsResetting(true);
    try {
      const defaultDuration = (settings?.rules?.periodDurationMinutes || 20) * 60;
      const defaultTimeouts = settings?.rules?.timeoutsPerTeam ?? 2;
      const defaultPlayClock = settings?.rules?.playClockSeconds || 30;

      if (isDemo) {
        deleteSandboxPlaysForMatch(matchId);
        updateSandboxMatch(matchId, {
          status: "scheduled",
          homeScore: 0,
          awayScore: 0,
          matchState: null,
          didNotPlay: [],
        });
        setMatchStatus('scheduled');
        setPossession(homeTeamName || "HOME");
        setFirstHalfStartPossession(homeTeamName || "HOME");
        setCurrentDown(1);
        setHomeScore(0);
        setAwayScore(0);
        setHalf(1);
        setGameClock(defaultDuration);
        setHomeTimeouts(defaultTimeouts);
        setAwayTimeouts(defaultTimeouts);
        setIsGameClockRunning(false);
        setIsPlayClockRunning(false);
        setPlayClock(defaultPlayClock);
        setIsBallSpotted(false);
        setStep('PLAY_TYPE');
        setOutcome(null);
        setPlayType(null);
        setQbRunner("");
        setReceiver("");
        setDefenders([]);
        setFlaggers([]);
        setDidNotPlay([]);
        setIsResetModalOpen(false);
        setIsResetting(false);
        return;
      }

      // 1. Purge all plays logged for this match from Firestore
      const playsQuery = query(
        collection(db, "plays"),
        where("matchId", "==", matchId),
        limit(500),
      );
      const playsSnap = await getDocs(playsQuery);
      const deletePromises = playsSnap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      // 2. Reset the match document to pre-game scheduled state
      await updateDoc(doc(db, "matches", matchId), {
        status: 'scheduled',
        homeScore: 0,
        awayScore: 0,
        matchState: null,
        didNotPlay: [],
        completedAt: null,
      });

      // 3. Reset all local state variables to pre-game defaults
      setMatchStatus('scheduled');
      setPossession(homeTeamName || "HOME");
      setFirstHalfStartPossession(homeTeamName || "HOME");
      setCurrentDown(1);
      setHomeScore(0);
      setAwayScore(0);
      setHalf(1);
      setGameClock(defaultDuration);
      setHomeTimeouts(defaultTimeouts);
      setAwayTimeouts(defaultTimeouts);
      setIsGameClockRunning(false);
      setIsPlayClockRunning(false);
      setPlayClock(defaultPlayClock);
      setIsBallSpotted(false);
      setStep('PLAY_TYPE');
      setOutcome(null);
      setPlayType(null);
      setQbRunner("");
      setReceiver("");
      setDefenders([]);
      setFlaggers([]);
      setDidNotPlay([]);

      setIsResetModalOpen(false);
    } catch (e) {
      console.error("Error resetting match to pre-game state:", e);
      alert("Failed to reset game session. Please check your connection and try again.");
    } finally {
      setIsResetting(false);
    }
  };

  const finalizeGame = async () => {
    try {
      if (isDemo) {
        updateSandboxMatch(matchId, {
          status: 'completed',
          homeScore,
          awayScore,
          didNotPlay,
          roster: {
            home: homePlayers,
            away: awayPlayers
          }
        });
        if (!isEmbedded) {
          router.push(`/matches/${matchId}`);
        } else {
          alert("Game Finalized! Roster & scores recorded to demo session.");
        }
        return;
      }
      await updateDoc(doc(db, "matches", matchId), {
        status: 'completed',
        homeScore,
        awayScore,
        completedAt: serverTimestamp(),
        didNotPlay,
        roster: {
          home: homePlayers,
          away: awayPlayers
        }
      });
      router.push(`/matches/${matchId}`);
    } catch (e) {
      console.error(e);
    }
  };

  const startNextPeriod = () => {
    const nextPeriod = half + 1;
    setHalf(nextPeriod);
    setGameClock(periodDurationMinutes * 60);
    if (timeoutsResetPerPeriod) {
      setHomeTimeouts(timeoutsPerTeam);
      setAwayTimeouts(timeoutsPerTeam);
    }
    // Midpoint switch of possession (Q2 -> Q3 for quarters, Half 1 -> Half 2 for halves)
    const isMidpoint = periodType === 'quarters' ? nextPeriod === 3 : nextPeriod === 2;
    if (isMidpoint) {
      setPossession(firstHalfStartPossession === homeTeamName ? awayTeamName : homeTeamName);
    }
    setCurrentDown(1);
    setStep('PLAY_TYPE');
    setIsBallSpotted(false);
    setIsFirstPlayOfHalf(true);
    setIsGameClockRunning(false);
    setIsPlayClockRunning(false);
  };
  const startSecondHalf = startNextPeriod;

  const callTimeout = (team: 'home' | 'away') => {
    if (team === 'home') setHomeTimeouts(t => Math.max(0, t - 1));
    else setAwayTimeouts(t => Math.max(0, t - 1));
    setIsGameClockRunning(false);
    setIsPlayClockRunning(false);
    setTimeoutClock(timeoutDurationSeconds);
    setIsTimeoutActive(true);
  };

  const handleResetPlayClock = () => {
    setPlayClock(playClockSeconds);
    setIsPlayClockRunning(false);
  };

  const handleSpotBall = () => {
    setIsBallSpotted(true);
    setPlayClock(playClockSeconds);
    setIsPlayClockRunning(true);
    // In IFAF, if outside 2 minutes and not starting the period, game clock continues running on ready for play
    if (gameClock > 120 && !isGameClockRunning && !isFirstPlayOfHalf) {
      setIsGameClockRunning(true);
    }
  };

  const resetPlay = () => {
    setIsPlayClockRunning(false);
    setPlayClock(playClockSeconds);
    setStep('PLAY_TYPE');
    setPlayType(null);
    setOutcome(null);
    setQbRunner("");
    setReceiver("");
    setDefenders([]);
    setFlaggers([]);
    setConvPts(null);
    setConvIsGood(null);
    setConvPasser("");
    setConvReceiver("");
    setIsOobPrompt(false);
    setPlayResult("");
    setIsQbOpen(true);
    setIsReceiverOpen(false);
    setIsDefendersOpen(false);
    setIsConvPasserOpen(true);
    setIsConvReceiverOpen(false);
  };

  const endPlay = () => {
    if (gameClock <= 0) {
      if (half < periodsCount) {
        setHalftimeClock(halftimeDurationSeconds);
        setStep('HALFTIME');
      } else {
        setStep('GAME_OVER');
      }
    } else {
      setIsBallSpotted(false);
      resetPlay();
    }
  };

  const handleUndoLastPlay = async () => {
    if (!confirm("Are you sure you want to undo the last play?")) return;
    try {
      if (isDemo) {
        const demoPlays = getSandboxPlays(matchId);
        if (demoPlays.length > 0) {
          const lastPlay: any = demoPlays[demoPlays.length - 1];

          // Revert state
          if (lastPlay.down !== undefined) setCurrentDown(lastPlay.down);
          const wasHomePossession = lastPlay.possessionTeamId === homeTeamId;
          setPossession(wasHomePossession ? (homeTeamName || "HOME") : (awayTeamName || "AWAY"));

          const pts = lastPlay.points ?? lastPlay.pointsScored ?? 0;
          if (pts > 0) {
            const didOffenseScore = lastPlay.isTouchdown || lastPlay.result === "Conversion Good" || (lastPlay.pointsScored && !lastPlay.isPick6 && !lastPlay.isSafety);
            const didDefenseScore = lastPlay.isPick6 || lastPlay.isSafety || lastPlay.result === "Defensive Conversion";

            if (didOffenseScore) {
              if (wasHomePossession) setHomeScore(s => Math.max(0, s - pts));
              else setAwayScore(s => Math.max(0, s - pts));
            } else if (didDefenseScore) {
              if (wasHomePossession) setAwayScore(s => Math.max(0, s - pts));
              else setHomeScore(s => Math.max(0, s - pts));
            }
          }

          deleteSandboxPlay(lastPlay.id);
          setStep("PLAY_TYPE");
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

        // Revert state
        setCurrentDown(lastPlay.down);
        const wasHomePossession = lastPlay.possessionTeamId === homeTeamId;
        setPossession(wasHomePossession ? (homeTeamName || "HOME") : (awayTeamName || "AWAY"));

        if (lastPlay.points > 0) {
          const didOffenseScore = lastPlay.isTouchdown || lastPlay.result === "Conversion Good";
          const didDefenseScore = lastPlay.isPick6 || lastPlay.isSafety || lastPlay.result === "Defensive Conversion";

          if (didOffenseScore) {
            if (wasHomePossession) setHomeScore(s => Math.max(0, s - lastPlay.points));
            else setAwayScore(s => Math.max(0, s - lastPlay.points));
          } else if (didDefenseScore) {
            if (wasHomePossession) setAwayScore(s => Math.max(0, s - lastPlay.points));
            else setHomeScore(s => Math.max(0, s - lastPlay.points));
          }
        }

        await deleteDoc(lastPlayDoc.ref);
        setStep("PLAY_TYPE");
        alert("Last play undone successfully.");
      } else {
        alert("No plays found to undo.");
      }
    } catch (e) {
      console.error("Error undoing play:", e);
      alert("Failed to undo play.");
    }
  };

  const handlePlayTypeSelect = (type: "Pass" | "Run") => {
    setIsOutcomeOpen(true);
    // IFAF Rule: Ball has been snapped, stop play clock immediately
    setIsPlayClockRunning(false);
    // If game clock was stopped (e.g. inside 2 minutes or start of half), start game clock on the snap
    if (!isGameClockRunning && gameClock > 0) {
      setIsGameClockRunning(true);
    }
    setPlayType(type);
    setOutcome(type === "Pass" ? "Complete" : "Gain");

    const teamQB = possession === homeTeamName ? lastHomeQB : lastAwayQB;
    const offRoster = getOffensiveRoster();
    const hasKnownQB = Boolean(type === "Pass" && teamQB && offRoster.includes(teamQB));

    if (hasKnownQB) {
      setQbRunner(teamQB);
      setIsQbOpen(false);
      setIsReceiverOpen(true);
    } else {
      setQbRunner("");
      setIsQbOpen(true);
      setIsReceiverOpen(false);
    }

    setReceiver("");
    setDefenders([]);
    setFlaggers([]);
    setIsOobPrompt(false);
    setIsDefendersOpen(false);
    setStep('DETAILS');
  };

  const handleSelectQbRunner = (player: string) => {
    setIsOutcomeOpen(false);
    setQbRunner(player);
    if (playType === "Pass") {
      if (possession === homeTeamName) setLastHomeQB(player);
      else setLastAwayQB(player);
    }
    if (receiver === player) setReceiver("");
    setIsQbOpen(false);
    if (playType === "Pass" && outcome === "Complete") {
      setIsReceiverOpen(true);
      setIsDefendersOpen(false);
    } else if (playType === "Run" && outcome === "Gain") {
      setIsDefendersOpen(false);
    } else {
      setIsDefendersOpen(true);
    }
  };

  const handleSelectReceiver = (player: string) => {
    setIsOutcomeOpen(false);
    setReceiver(player);
    setIsReceiverOpen(false);
    setIsDefendersOpen(false);
  };

  const handleDefenders = (player: string, max: number = 2) => {
    if (player === 'TEAM') {
      setDefenders(defenders.includes('TEAM') ? [] : ['TEAM']);
      return;
    }
    if (defenders.includes('TEAM')) {
      setDefenders([player]);
      return;
    }
    if (defenders.includes(player)) {
      setDefenders(defenders.filter(d => d !== player));
    } else {
      if (defenders.length < max) {
        setDefenders([...defenders, player]);
      } else if (max === 1) {
        setDefenders([player]);
      }
    }
  };

  const handleFlaggers = (player: string) => {
    if (player === 'TEAM') {
      setFlaggers(flaggers.includes('TEAM') ? [] : ['TEAM']);
      return;
    }
    if (flaggers.includes('TEAM')) {
      setFlaggers([player]);
      return;
    }
    if (flaggers.includes(player)) {
      setFlaggers(flaggers.filter(d => d !== player));
    } else {
      if (flaggers.length < 2) {
        setFlaggers([...flaggers, player]);
      }
    }
  };

  const hasOffenseSelected = () => {
    if (!qbRunner) return false;
    if (outcome === 'Complete' && !receiver) return false;
    return true;
  };

  const isPlayReadyToSave = () => {
    if (!qbRunner) return false;
    if (outcome === 'Complete' && !receiver) return false;
    if (outcome === 'Interception' && defenders.length !== 1) return false;
    if ((outcome === 'Sack' || outcome === 'FFL' || outcome === 'PBU') && defenders.length === 0) return false;
    if ((outcome === 'Complete' || outcome === 'Gain') && defenders.length === 0) return false;
    return true;
  };

  const buildPlayData = (result: string, extra?: any) => {
    return {
      matchId,
      possessionTeamId: possession === homeTeamName ? homeTeamId : awayTeamId,
      down: currentDown,
      playType,
      firstDown: result === 'First Down' || result === 'Touchdown',
      qbPlayerId: playType === 'Pass' ? qbRunner : null,
      runnerPlayerId: playType === 'Run' ? qbRunner : null,
      receiverPlayerId: receiver || null,
      defenders: defenders,
      flaggers: flaggers,
      passOutcome: outcome,
      isTouchdown: result === 'Touchdown',
      isPick6: result === 'Pick 6',
      isSafety: result === 'Safety',
      turnover: result === 'Turnover' || result === 'Pick 6' || (currentDown === downsPerSeries && result !== 'First Down' && result !== 'Repeat Down'),
      result: result,
      isThirdDownAttempt: currentDown === 3 && playType !== 'Penalty',
      isThirdDownConversion: currentDown === 3 && (result === 'First Down' || result === 'Touchdown' || extra?.firstDown),
      isFourthDownAttempt: currentDown === 4 && playType !== 'Penalty',
      isFourthDownConversion: currentDown === 4 && (result === 'First Down' || result === 'Touchdown' || extra?.firstDown),
      gameClock: gameClock,
      half: half,
      ...extra,
    };
  };

  const logPlayToFirestore = async (playData: any) => {
    if (isDemo) {
      addSandboxPlay({
        ...playData,
        matchId,
        timestamp: new Date().toISOString(),
      });
      refreshPlays();
      return;
    }
    try {
      await createSecureRecord("play", {
        ...playData,
        matchId,
      });
      refreshPlays();
      console.log("Play saved to Firestore!");
    } catch (e) {
      console.error("Error saving play:", e);
    }
  };

  const handleSavePlay = (result: "Touchdown" | "First Down" | "Short" | "Safety" | "Turnover" | "Next Down" | "Pick 6" | "Repeat Down" | "Loss of Down") => {
    setIsPlayClockRunning(false);
    setPlayResult(result);

    if (playType === 'Pass') {
      if (possession === homeTeamName) setLastHomeQB(qbRunner);
      else setLastAwayQB(qbRunner);
    }

    if (result === 'Touchdown') {
      if (possession === homeTeamName) setHomeScore(s => s + 6);
      else setAwayScore(s => s + 6);
      // IFAF: Game clock stops on score; start play clock for PAT conversion attempt
      setIsGameClockRunning(false);
      setPlayClock(playClockSeconds);
      setIsPlayClockRunning(true);
      const teamQB = possession === homeTeamName ? (lastHomeQB || qbRunner) : (lastAwayQB || qbRunner);
      if (teamQB) {
        setConvPasser(teamQB);
        setIsConvPasserOpen(false);
        setIsConvReceiverOpen(true);
      }
      setStep('CONVERSION');
      return;
    }

    if (result === 'Pick 6') {
      const newPoss = possession === homeTeamName ? awayTeamName : homeTeamName;
      if (newPoss === homeTeamName) setHomeScore(s => s + 6);
      else setAwayScore(s => s + 6);
      setPossession(newPoss);
      // IFAF: Game clock stops on score; start play clock for PAT conversion attempt
      setIsGameClockRunning(false);
      setPlayClock(playClockSeconds);
      setIsPlayClockRunning(true);
      const teamQB = newPoss === homeTeamName ? lastHomeQB : lastAwayQB;
      if (teamQB) {
        setConvPasser(teamQB);
        setIsConvPasserOpen(false);
        setIsConvReceiverOpen(true);
      }
      setStep('CONVERSION');
      return;
    }

    // Compute coherent statement and log the play
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

    if (result === 'Safety') {
      if (possession === homeTeamName) setAwayScore(s => s + 2);
      else setHomeScore(s => s + 2);
    }

    // Auto pause under 2 mins for incomplete or turnover
    if (gameClock <= 120 && (outcome === 'PBU' || outcome === 'Missed' || result === 'Turnover')) {
      setIsGameClockRunning(false);
    }
    if (gameClock <= 120 && isOobPrompt) {
      setIsGameClockRunning(false);
    }

    if (result === 'Safety' || outcome === 'Interception' || result === 'Turnover' || (currentDown === downsPerSeries && result !== 'First Down' && result !== 'Repeat Down')) {
      setPossession(possession === homeTeamName ? awayTeamName : homeTeamName);
      setCurrentDown(1);
    } else if (result === 'First Down') {
      setCurrentDown(1);
    } else if (result === 'Repeat Down') {
      // keep current down
    } else {
      if (currentDown < downsPerSeries) setCurrentDown(currentDown + 1);
    }

    endPlay();
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
    setIsPlayClockRunning(false);
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

    // Stop clock under 2 minutes for penalty enforcement
    if (gameClock <= 120) {
      setIsGameClockRunning(false);
    }

    // Down progression
    if (isFirstDown) {
      setCurrentDown(1);
    } else if (isLossOfDown) {
      if (currentDown >= downsPerSeries) {
        setPossession(possession === homeTeamName ? awayTeamName : homeTeamName);
        setCurrentDown(1);
      } else {
        setCurrentDown(currentDown + 1);
      }
    } else if (isRepeatDown) {
      // Keep same down
    } else if (enforcement === "declined") {
      if (currentDown >= downsPerSeries) {
        setPossession(possession === homeTeamName ? awayTeamName : homeTeamName);
        setCurrentDown(1);
      } else {
        setCurrentDown(currentDown + 1);
      }
    }

    endPlay();
  };

  const finalizeConversion = (conversionSuccess = convIsGood) => {
    if (conversionSuccess && convPts) {
      if (possession === homeTeamName) setHomeScore(s => s + convPts);
      else setAwayScore(s => s + convPts);
    }

    // Log Touchdown + PAT to Firestore
    const finalPlay: any = {
      ...buildPlayData(playResult),
      conversionAttempt: convPts,
      conversionSuccess,
      conversionPasser: convPasser,
      conversionReceiver: convReceiver,
      pointsScored: 6 + (conversionSuccess ? convPts! : 0)
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

    setPossession(possession === homeTeamName ? awayTeamName : homeTeamName);
    setCurrentDown(1);
    endPlay();
  };

  const getOffensiveRoster = () => {
    const roster = possession === homeTeamName ? homePlayers : awayPlayers;
    return [...roster, 'TEAM'];
  };

  const getDefensiveRoster = () => {
    const roster = possession === homeTeamName ? awayPlayers : homePlayers;
    return [...roster, 'TEAM'];
  };

  const possessionTeamColors = possession === homeTeamName ? homeTeamColors : awayTeamColors;

  if (isDenied) {
    return deniedElement;
  }

  if (loadingData) {
    return (
      <div className="h-[100dvh] bg-black text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="h-[100dvh] bg-black text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <Shield className="w-16 h-16 text-neutral-600 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Game Not Found</h2>
        <p className="text-neutral-400 text-sm mb-6 max-w-md">
          The requested game ({matchId}) could not be loaded from online records or local cache.
        </p>
        <Link
          href="/schedule"
          className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/10"
        >
          Return to Schedule
        </Link>
      </div>
    );
  }

  if (isScoreboardFullscreen) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col p-12 overflow-hidden">
        <button onClick={() => setIsScoreboardFullscreen(false)} className="absolute top-8 right-8 text-neutral-400 hover:text-white bg-white/10 p-4 rounded-full">
          <Minimize className="w-8 h-8" />
        </button>
        <div className="flex-1 flex flex-col justify-center gap-12">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold uppercase tracking-widest mb-4" style={{ color: possessionTeamColors.tertiary }}>
              {getOrdinal(half)} {periodType === 'quarters' ? 'Quarter' : 'Half'}
            </span>
            <span className="text-[12rem] font-black leading-none text-white tracking-tighter tabular-nums">{formatTime(gameClock)}</span>
          </div>
          <div className="flex justify-between items-center px-24">
            <div 
              className="flex flex-col items-center gap-6 p-8 rounded-3xl border shadow-2xl"
              style={{
                backgroundColor: homeTeamColors.secondary,
                borderColor: `${homeTeamColors.primary}40`,
              }}
            >
              <div className="flex items-center gap-6">
                <FootballIcon active={possession === (homeTeamName || "HOME")} className="w-12 h-12" style={{ color: homeTeamColors.primary }} />
                <span className="text-6xl font-black uppercase" style={{ color: homeTeamColors.primary }}>{homeTeamName}</span>
              </div>
              <span className="text-[15rem] font-black leading-none tabular-nums" style={{ color: homeTeamColors.primary }}>{homeScore}</span>
              <div className="flex gap-3">
                {Array.from({ length: timeoutsPerTeam }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full ${i < homeTimeouts ? '' : 'opacity-30'}`}
                    style={{ backgroundColor: homeTeamColors.primary, boxShadow: `0 0 15px ${homeTeamColors.primary}99` }}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center pt-24">
              <span className="text-4xl font-bold text-neutral-600 uppercase tracking-widest mb-8">Play Clock</span>
              <span className={`text-9xl font-black tabular-nums leading-none ${playClock <= 0 ? 'text-red-600 animate-pulse' : playClock <= 10 ? 'text-amber-500' : 'text-neutral-300'}`}>
                {playClock}
              </span>
            </div>
            <div 
              className="flex flex-col items-center gap-6 p-8 rounded-3xl border shadow-2xl"
              style={{
                backgroundColor: awayTeamColors.secondary,
                borderColor: `${awayTeamColors.primary}40`,
              }}
            >
              <div className="flex items-center gap-6">
                <span className="text-6xl font-black uppercase" style={{ color: awayTeamColors.primary }}>{awayTeamName}</span>
                <FootballIcon active={possession === (awayTeamName || "AWAY")} className="w-12 h-12" style={{ color: awayTeamColors.primary }} />
              </div>
              <span className="text-[15rem] font-black leading-none tabular-nums" style={{ color: awayTeamColors.primary }}>{awayScore}</span>
              <div className="flex gap-3">
                {Array.from({ length: timeoutsPerTeam }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full ${i < awayTimeouts ? '' : 'opacity-30'}`}
                    style={{ backgroundColor: awayTeamColors.primary, boxShadow: `0 0 15px ${awayTeamColors.primary}99` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-var(--role-switcher-height,0px))] w-full min-h-0 max-w-full bg-black text-white font-sans overflow-hidden flex flex-col relative pb-[env(safe-area-inset-bottom)]">

      {/* RESET GAME TO PRE-GAME MODAL */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#0B0F19] border-2 border-red-500/50 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 shadow-lg shadow-red-500/10">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <span className="px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
              Permanent & Irreversible Action
            </span>

            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-2">
              Reset Game to Pre-Game?
            </h2>

            <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
              Are you sure you want to completely reset this game? This will clear the live game session back to before kickoff.
            </p>

            <div className="w-full bg-red-950/20 border border-red-500/20 rounded-2xl p-4 text-left text-xs sm:text-sm text-neutral-300 space-y-2.5 mb-6">
              <div className="flex items-start gap-2">
                <span className="text-red-400 font-bold shrink-0 mt-0.5">•</span>
                <span><strong>All live stats and plays will be deleted:</strong> Every pass, run, touchdown, sack, flag, and interception recorded for this game will be permanently erased.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-400 font-bold shrink-0 mt-0.5">•</span>
                <span><strong>Scores reset to 0 – 0:</strong> Both team scores, timeouts, down &amp; distance, and game clock will return to pre-game starting values.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-400 font-bold shrink-0 mt-0.5">•</span>
                <span><strong>Reverts to Scheduled:</strong> Game status will be restored to &quot;Scheduled&quot; (Pre-Game).</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setIsResetModalOpen(false)}
                className="flex-1 py-3.5 px-5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-2xl border border-white/10 transition-colors"
              >
                Cancel / Keep Game
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleResetGameToPreGame}
                className="flex-1 py-3.5 px-5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
              >
                {isResetting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Permanently Reset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TIMEOUT MODAL */}
      {isTimeoutActive && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <Timer className="w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 text-white mb-4 sm:mb-8 animate-pulse" />
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black mb-4 sm:mb-12 uppercase tracking-widest text-neutral-300">Timeout</h2>
          <span className="text-6xl sm:text-9xl md:text-[12rem] font-black leading-none text-white tabular-nums mb-6 sm:mb-12">{timeoutClock}</span>
          <button
            onClick={() => setTimeoutClock(0)}
            className="py-3.5 sm:py-6 px-6 sm:px-12 bg-white/10 hover:bg-white/20 text-white font-bold text-sm sm:text-xl md:text-2xl rounded-full transition-colors"
          >
            END TIMEOUT EARLY
          </button>
        </div>
      )}

      {/* SUB MODAL */}
      {isSubModalOpen && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-8">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl sm:rounded-3xl md:rounded-[3rem] p-4 sm:p-8 max-w-xl w-full flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-4 sm:mb-6 shrink-0">
              <h2 className="text-xl sm:text-3xl font-black uppercase tracking-widest">Add Sub</h2>
              <button onClick={() => { setIsSubModalOpen(false); setSubModalTeam(null); }} className="text-neutral-500 hover:text-white p-2 bg-white/5 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            {!subModalTeam ? (
              <div className="flex flex-col gap-4">
                <h3 className="text-neutral-400 font-bold mb-2">Select team to add sub to:</h3>
                <button onClick={() => setSubModalTeam("HOME")} className="py-6 px-4 bg-neutral-950 border border-white/5 rounded-2xl text-2xl font-black hover:bg-neutral-800 transition-colors uppercase flex items-center justify-between">
                  {homeTeamName}
                  <ChevronRight className="w-6 h-6 text-neutral-600" />
                </button>
                <button onClick={() => setSubModalTeam("AWAY")} className="py-6 px-4 bg-neutral-950 border border-white/5 rounded-2xl text-2xl font-black hover:bg-neutral-800 transition-colors uppercase flex items-center justify-between">
                  {awayTeamName}
                  <ChevronRight className="w-6 h-6 text-neutral-600" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 overflow-hidden h-full">
                <button onClick={() => setSubModalTeam(null)} className="flex items-center text-amber-500 mb-2 hover:text-amber-400 w-fit shrink-0">
                  <ChevronLeft className="w-5 h-5 mr-1" /> Back
                </button>
                <h3 className="text-neutral-400 font-bold mb-2 shrink-0">Select player to join {subModalTeam === "HOME" ? homeTeamName : awayTeamName}:</h3>
                <div className="flex flex-col gap-2 overflow-y-auto pr-2 pb-4">
                  {allPlayers
                    .filter(p => {
                      const teamPlayers = subModalTeam === "HOME" ? homePlayers : awayPlayers;
                      return !teamPlayers.includes(p.playerName);
                    })
                    .sort((a, b) => a.playerName.localeCompare(b.playerName))
                    .map(p => {
                      const opposingTeamId = subModalTeam === "HOME" ? awayTeamId : homeTeamId;
                      const isOpponent = p.teamId === opposingTeamId;
                      const pNum = p.number || p.jerseyNumber || p.playerNumber;
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleAddSub(p.playerName, subModalTeam)}
                          className="py-4 px-4 bg-neutral-950 border border-white/5 rounded-2xl text-lg font-bold hover:bg-white/10 transition-colors text-left flex justify-between items-center"
                        >
                          <div className="flex items-center gap-2">
                            {pNum && (
                              <span className="px-2 py-0.5 rounded text-xs font-mono font-black bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                                #{String(pNum).replace(/^#/, "")}
                              </span>
                            )}
                            <span>{p.playerName} {isOpponent && <span className="text-amber-500 ml-1" title="Currently on opposing team">*</span>}</span>
                          </div>
                          <Plus className="w-5 h-5 text-neutral-600" />
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SINGLE-ROW SYNC SCOREBOARD & GAME CONTROLS */}
      <header data-tour="score-header" className="sticky bg-neutral-900 border-b border-cyan-500/30 px-1 py-1 sm:px-2 md:px-3 md:py-2 shrink-0 z-50 w-full overflow-hidden" style={{ top: "var(--role-switcher-height, 0px)" }}>
        <div className="flex flex-nowrap items-center justify-between gap-1 sm:gap-1.5 md:gap-3 w-full min-w-0">
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            {!isEmbedded && (
              <Link href={`/matches/${matchId}`} aria-label="Back to match" className="flex items-center text-neutral-400 hover:text-white bg-black p-1 md:p-2 rounded-md sm:rounded-lg border border-white/10">
                <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
              </Link>
            )}
            <button onClick={handleUndoLastPlay} aria-label="Undo last play" className="flex items-center text-white hover:text-amber-400 bg-white/10 p-1 md:p-2 rounded-md sm:rounded-lg border border-white/10 cursor-pointer" title="Undo Last Play">
              <Undo className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>

          <div 
            className="flex flex-col items-center flex-1 min-w-0 max-w-[7.5rem] px-1.5 py-0.5 rounded-xl border shadow-sm"
            style={{
              backgroundColor: homeTeamColors.secondary,
              borderColor: `${homeTeamColors.primary}40`,
            }}
          >
            <span className="flex items-center gap-0.5 text-[7px] sm:text-[9px] md:text-xs font-black uppercase truncate max-w-full" style={{ color: homeTeamColors.primary }}>
              {homeTeamName}
              <FootballIcon active={possession === homeTeamName} className="w-2 h-2 sm:w-3 sm:h-3 shrink-0" style={{ color: homeTeamColors.primary }} />
            </span>
            <span className="text-base sm:text-xl md:text-3xl font-black leading-none tabular-nums" style={{ color: homeTeamColors.primary }}>{homeScore}</span>
            <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5">
              <button
                disabled={homeTimeouts === 0}
                onClick={() => callTimeout("home")}
                className="px-1 py-0.5 rounded text-[7px] sm:text-[8px] md:text-[9px] font-bold disabled:opacity-30 disabled:line-through transition-colors"
                style={{ backgroundColor: `${homeTeamColors.primary}20`, color: homeTeamColors.primary }}
                title="Call home team timeout"
              >
                TO {homeTimeouts}
              </button>
              <div className="hidden min-[360px]:flex gap-0.5 items-center" aria-label={`${homeTimeouts} home timeouts remaining`}>
                {Array.from({ length: timeoutsPerTeam }).map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < homeTimeouts ? "" : "opacity-30"}`} style={{ backgroundColor: homeTeamColors.primary }} />
                ))}
              </div>
            </div>
          </div>

          {/* GAME CLOCK & DOWN ADJUSTER */}
          <div data-tour="game-clock-controls" className="flex flex-col items-center bg-black/40 px-1 sm:px-2 py-0.5 sm:py-1 rounded-lg sm:rounded-xl border border-white/10 shrink-0">
            {/* TOP: PERIOD & GAME CLOCK */}
            <div className="flex items-center gap-0.5 sm:gap-1.5">
              <span className="hidden sm:block text-[8px] md:text-[10px] font-bold uppercase text-neutral-500">{getOrdinal(half)} {periodType === "quarters" ? "Q" : "H"}</span>
              <button onPointerDown={() => startAdjustingClock(-10)} onPointerUp={stopAdjustingClock} onPointerLeave={stopAdjustingClock} className="hidden sm:block text-neutral-500 hover:text-white p-0.5" title="Remove 10 seconds">
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-sm sm:text-lg md:text-xl font-black tabular-nums text-white text-center leading-none">{formatTime(gameClock)}</span>
              <button onPointerDown={() => startAdjustingClock(10)} onPointerUp={stopAdjustingClock} onPointerLeave={stopAdjustingClock} className="hidden sm:block text-neutral-500 hover:text-white p-0.5" title="Add 10 seconds">
                <Plus className="w-3 h-3" />
              </button>
              <button onClick={() => setIsGameClockRunning(!isGameClockRunning)} aria-label={isGameClockRunning ? "Pause game clock" : "Start game clock"} className={`p-0.5 sm:p-1 rounded-full cursor-pointer shrink-0 ${isGameClockRunning ? "bg-red-500/20 text-red-500" : "bg-emerald-500/20 text-emerald-500"}`}>
                {isGameClockRunning ? <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" /> : <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />}
              </button>
            </div>

            {/* BOTTOM: UNDERNEATH THE CLOCK - COMPACT DOWN STEPPER */}
            <div data-tour="down-selector" className="flex items-center justify-center gap-1 mt-0.5 pt-0.5 border-t border-white/10 w-full" title="Current Down (Use - and + to adjust)">
              <button
                type="button"
                onClick={() => setCurrentDown((d) => Math.max(1, d - 1))}
                disabled={currentDown <= 1}
                aria-label="Decrease Down"
                title="Decrease Down"
                className="p-0.5 rounded text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </button>
              <span className="text-[10px] sm:text-xs font-black text-white px-0.5 sm:px-1 tabular-nums tracking-wide">
                {getOrdinal(currentDown)}
              </span>
              <button
                type="button"
                onClick={() => setCurrentDown((d) => Math.min(downsPerSeries, d + 1))}
                disabled={currentDown >= downsPerSeries}
                aria-label="Increase Down"
                title="Increase Down"
                className="p-0.5 rounded text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </button>
            </div>
          </div>

          {/* IFAF PLAY CLOCK CONTAINER WITH CONTROLS */}
          <div data-tour="play-clock-controls" className="flex items-center gap-1 bg-black/40 px-1.5 sm:px-2 py-1 rounded-lg sm:rounded-xl border border-white/10 shrink-0">
            <div className="flex flex-col items-center leading-none" title="IFAF Play Clock">
              <span className="text-[7px] md:text-[8px] uppercase tracking-wider text-neutral-500 font-bold">Play</span>
              <span className={`text-sm md:text-base font-black tabular-nums ${playClock <= 0 ? "text-red-500 animate-pulse" : playClock <= 5 ? "text-amber-400 animate-pulse" : "text-amber-500"
                }`}>
                {playClock}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsPlayClockRunning((prev) => !prev)}
              aria-label={isPlayClockRunning ? "Pause play clock" : "Start play clock"}
              title={isPlayClockRunning ? "Pause play clock" : "Start play clock"}
              className={`p-0.5 sm:p-1 rounded-full cursor-pointer shrink-0 transition-colors ${isPlayClockRunning ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-neutral-400 hover:text-white"
                }`}
            >
              {isPlayClockRunning ? (
                <Pause className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
              ) : (
                <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
              )}
            </button>

            <button
              type="button"
              onClick={handleResetPlayClock}
              aria-label="Reset play clock"
              title={`Reset play clock to ${playClockSeconds}s`}
              className="p-0.5 sm:p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0 transition-colors"
            >
              <RotateCcw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>
          </div>

          <div 
            className="flex flex-col items-center flex-1 min-w-0 max-w-[7.5rem] px-1.5 py-0.5 rounded-xl border shadow-sm"
            style={{
              backgroundColor: awayTeamColors.secondary,
              borderColor: `${awayTeamColors.primary}40`,
            }}
          >
            <span className="flex items-center gap-0.5 text-[7px] sm:text-[9px] md:text-xs font-black uppercase truncate max-w-full" style={{ color: awayTeamColors.primary }}>
              <FootballIcon active={possession === awayTeamName} className="w-2 h-2 sm:w-3 sm:h-3 shrink-0" style={{ color: awayTeamColors.primary }} />
              {awayTeamName}
            </span>
            <span className="text-base sm:text-xl md:text-3xl font-black leading-none tabular-nums" style={{ color: awayTeamColors.primary }}>{awayScore}</span>
            <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5">
              <button
                disabled={awayTimeouts === 0}
                onClick={() => callTimeout("away")}
                className="px-1 py-0.5 rounded text-[7px] sm:text-[8px] md:text-[9px] font-bold disabled:opacity-30 disabled:line-through transition-colors"
                style={{ backgroundColor: `${awayTeamColors.primary}20`, color: awayTeamColors.primary }}
                title="Call away team timeout"
              >
                TO {awayTimeouts}
              </button>
              <div className="hidden min-[360px]:flex gap-0.5 items-center" aria-label={`${awayTimeouts} away timeouts remaining`}>
                {Array.from({ length: timeoutsPerTeam }).map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < awayTimeouts ? "" : "opacity-30"}`} style={{ backgroundColor: awayTeamColors.primary }} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <WalkthroughTrigger walkthrough={STAT_KEEPER_WALKTHROUGH} variant="header" />
            <button onClick={() => setIsScoreboardFullscreen(true)} aria-label="Fullscreen scoreboard" className="bg-white/10 p-1 sm:p-1.5 md:p-2 rounded-md sm:rounded-lg hover:bg-white/20 text-neutral-300" title="Fullscreen Scoreboard">
              <Maximize className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            {isPlatformAdmin && isUnstartedGame && (
              <button onClick={handleSimulateGame} disabled={isSimulating} className="bg-amber-500/15 text-amber-300 border border-amber-500/40 rounded-lg p-1 disabled:opacity-50" title={isSimulating ? "Simulating game" : "Simulate full game"}>
                <Zap className={`w-3 h-3 sm:w-4 sm:h-4 ${isSimulating ? "animate-spin" : ""}`} />
              </button>
            )}
            <button onClick={() => setIsResetModalOpen(true)} aria-label="Reset game" className="bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-lg p-1" title="Reset Game to Pre-Game State">
              <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* LIVE PLAY-BY-PLAY STATEMENT BANNER */}
      <div className="bg-neutral-900/90 border-b border-white/10 px-4 py-2.5 flex items-center justify-between text-xs font-mono shadow-sm">
        <div className="flex items-center gap-2 overflow-hidden truncate">
          <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold uppercase tracking-wider text-[10px] shrink-0 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Live Statement
          </span>
          <span className="text-white truncate font-medium">
            {lastLoggedPlayStatement || "Game in progress • Select play type to begin tracking."}
          </span>
        </div>
        <button
          data-tour="play-log-btn"
          onClick={() => setIsPlayLogDrawerOpen(true)}
          className="text-cyan-400 hover:text-cyan-300 shrink-0 ml-3 text-[11px] font-bold flex items-center gap-1 cursor-pointer bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 transition-colors"
        >
          <span>Play Log ({matchPlaysList.length})</span>
        </button>
      </div>

      <main className="flex-1 min-h-0 p-1.5 sm:p-2 md:p-3 flex flex-col overflow-hidden relative">
        {/* SPOT BALL OVERLAY */}
        {!isBallSpotted && step !== 'CONVERSION' && step !== 'HALFTIME' && step !== 'GAME_OVER' && !isTimeoutActive && (
          <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-lg flex items-center justify-center p-2 sm:p-4 md:p-8 overflow-hidden">
            <div className="grid grid-cols-[1fr_1.4fr_1fr] sm:grid-cols-[1fr_1.5fr_1fr] w-full max-w-7xl items-center justify-items-center gap-x-2 gap-y-2 sm:gap-x-3 sm:gap-y-3 md:gap-4 min-h-0">

              {/* Top Row: Time and Half (Spans all 3 columns) */}
              <div className="col-span-3 flex flex-col items-center justify-center gap-0.5 sm:gap-1.5 w-full">
                <span className="text-[clamp(0.7rem,1.8vw,1.25rem)] font-bold uppercase tracking-widest text-neutral-300">
                  {getOrdinal(half)} {periodType === 'quarters' ? 'Quarter' : 'Half'}
                </span>
                <span className="text-[clamp(1.75rem,5vw,4rem)] font-black leading-none text-white tracking-tighter tabular-nums">
                  {formatTime(gameClock)}
                </span>
              </div>

              {/* Bottom Row - Column 1: Home Score (Left) */}
              <div 
                className="flex flex-col items-center justify-center min-w-0 w-full p-2 rounded-2xl border shadow-sm"
                style={{
                  backgroundColor: homeTeamColors.secondary,
                  borderColor: `${homeTeamColors.primary}40`,
                }}
              >
                <div className="flex items-center justify-center gap-1 sm:gap-2 min-w-0 max-w-full">
                  <FootballIcon
                    active={possession === (homeTeamName || "HOME")}
                    className="w-[clamp(0.875rem,2vw,1.75rem)] h-[clamp(0.875rem,2vw,1.75rem)] shrink-0"
                    style={{ color: homeTeamColors.primary }}
                  />
                  <span
                    className="text-[clamp(0.625rem,2vw,1.5rem)] font-black uppercase truncate"
                    style={{ color: homeTeamColors.primary }}
                  >
                    {homeTeamName}
                  </span>
                </div>
                <span
                  className="text-[clamp(1.5rem,6vw,5rem)] font-black leading-none tabular-nums my-0.5"
                  style={{ color: homeTeamColors.primary }}
                >
                  {homeScore}
                </span>
                <div className="flex gap-1 sm:gap-2 mt-1">
                  {Array.from({ length: timeoutsPerTeam }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-[clamp(0.4rem,1vw,0.75rem)] h-[clamp(0.4rem,1vw,0.75rem)] rounded-full ${i < homeTimeouts ? "" : "opacity-30"}`}
                      style={{ backgroundColor: homeTeamColors.primary }}
                    />
                  ))}
                </div>
              </div>

              {/* Bottom Row - Column 2: Ball Spotted Overlay (Center) */}
              <div className="flex flex-col items-center justify-center w-full min-w-0">
                {isFirstPlayOfHalf ? (
                  <div className="bg-neutral-900 border border-cyan-500/30 p-2 sm:p-3 md:p-5 rounded-xl sm:rounded-2xl flex flex-col items-center shadow-[0_0_100px_rgba(var(--league-primary-rgb),0.2)] w-full max-w-xl text-center min-h-0">
                    <AlertCircle className="w-[clamp(1.25rem,3vw,2.5rem)] h-[clamp(1.25rem,3vw,2.5rem)] text-emerald-500 mb-1 sm:mb-2 shrink-0" />
                    <h2 className="text-[clamp(0.65rem,1.8vw,1.25rem)] font-black mb-1 sm:mb-2 uppercase tracking-wide sm:tracking-widest leading-tight">
                      THE CLOCK WILL BEGIN ON THE SNAP
                    </h2>
                    <button
                      data-tour="spot-ball-btn"
                      onClick={() => {
                        setIsBallSpotted(true);
                        setIsFirstPlayOfHalf(false);
                        setIsGameClockRunning(true);
                        setIsPlayClockRunning(false);
                      }}
                      className="py-1.5 sm:py-2.5 md:py-3 px-3 sm:px-5 md:px-6 bg-white hover:bg-neutral-200 text-black font-black text-[clamp(0.6rem,1.5vw,1.125rem)] rounded-full shadow-2xl active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
                    >
                      CLICK WHEN SNAPPED
                    </button>
                    {isPlatformAdmin && isUnstartedGame && (
                      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/10 flex flex-col items-center w-full">
                        <button
                          onClick={handleSimulateGame}
                          disabled={isSimulating}
                          className="py-1.5 sm:py-2.5 px-3 sm:px-6 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 border border-amber-500/40 rounded-full font-black text-[clamp(0.55rem,1.1vw,0.75rem)] uppercase tracking-widest transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
                        >
                          <Zap className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 fill-amber-400 text-amber-400 ${isSimulating ? "animate-spin" : ""}`} />
                          <span className="truncate">{isSimulating ? "Simulating Game..." : "⚡ Simulate Full Game (Platform Admin)"}</span>
                        </button>
                        <p className="text-[clamp(0.5rem,1vw,0.7rem)] text-neutral-400 mt-1 sm:mt-1.5 font-mono hidden sm:block">
                          Generates 16–28 realistic plays, box score & player stats
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-neutral-900 border border-amber-500/30 p-2.5 sm:p-5 md:p-8 rounded-xl sm:rounded-2xl flex flex-col items-center shadow-[0_0_100px_rgba(245,158,11,0.1)] w-full max-w-xl text-center min-h-0">
                    <AlertCircle className="w-[clamp(1.25rem,3vw,2.5rem)] h-[clamp(1.25rem,3vw,2.5rem)] text-amber-500 mb-1 sm:mb-2 shrink-0" />
                    <h2 className="text-[clamp(0.75rem,2.2vw,1.875rem)] font-black mb-2 sm:mb-4 uppercase tracking-wide sm:tracking-widest leading-tight">
                      Awaiting Spot
                    </h2>
                    <button
                      data-tour="spot-ball-btn"
                      onClick={handleSpotBall}
                      className="py-1.5 sm:py-3 md:py-4 px-3 sm:px-6 md:px-8 bg-white hover:bg-neutral-200 text-black font-black text-[clamp(0.6rem,1.5vw,1.25rem)] rounded-full shadow-2xl active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
                    >
                      CLICK WHEN SPOTTED
                    </button>
                    {isPlatformAdmin && isUnstartedGame && (
                      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/10 flex flex-col items-center w-full">
                        <button
                          onClick={handleSimulateGame}
                          disabled={isSimulating}
                          className="py-1.5 sm:py-2.5 px-3 sm:px-6 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 border border-amber-500/40 rounded-full font-black text-[clamp(0.55rem,1.1vw,0.75rem)] uppercase tracking-widest transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
                        >
                          <Zap className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 fill-amber-400 text-amber-400 ${isSimulating ? "animate-spin" : ""}`} />
                          <span className="truncate">{isSimulating ? "Simulating Game..." : "⚡ Simulate Full Game (Platform Admin)"}</span>
                        </button>
                        <p className="text-[clamp(0.5rem,1vw,0.7rem)] text-neutral-400 mt-1 sm:mt-1.5 font-mono hidden sm:block">
                          Generates 16–28 realistic plays, box score & player stats
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Row - Column 3: Away Score (Right) */}
              <div 
                className="flex flex-col items-center justify-center min-w-0 w-full p-2 rounded-2xl border shadow-sm"
                style={{
                  backgroundColor: awayTeamColors.secondary,
                  borderColor: `${awayTeamColors.primary}40`,
                }}
              >
                <div className="flex items-center justify-center gap-1 sm:gap-2 min-w-0 max-w-full">
                  <span
                    className="text-[clamp(0.625rem,2vw,1.5rem)] font-black uppercase truncate"
                    style={{ color: awayTeamColors.primary }}
                  >
                    {awayTeamName}
                  </span>
                  <FootballIcon
                    active={possession === (awayTeamName || "AWAY")}
                    className="w-[clamp(0.875rem,2vw,1.75rem)] h-[clamp(0.875rem,2vw,1.75rem)] shrink-0"
                    style={{ color: awayTeamColors.primary }}
                  />
                </div>
                <span
                  className="text-[clamp(1.5rem,6vw,5rem)] font-black leading-none tabular-nums my-0.5"
                  style={{ color: awayTeamColors.primary }}
                >
                  {awayScore}
                </span>
                <div className="flex gap-1 sm:gap-2 mt-1">
                  {Array.from({ length: timeoutsPerTeam }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-[clamp(0.4rem,1vw,0.75rem)] h-[clamp(0.4rem,1vw,0.75rem)] rounded-full ${i < awayTimeouts ? "" : "opacity-30"}`}
                      style={{ backgroundColor: awayTeamColors.primary }}
                    />
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* PERIOD BREAK / HALFTIME OVERLAY */}
        {step === 'HALFTIME' && (
          <div className="absolute inset-0 z-40 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black mb-4 sm:mb-8 uppercase tracking-widest text-cyan-400">
              {half === Math.floor(periodsCount / 2) ? "Halftime" : periodType === 'quarters' ? `End of Quarter ${half}` : `End of Half ${half}`}
            </h2>
            <span className="text-5xl sm:text-8xl md:text-[12rem] font-black leading-none text-white tabular-nums mb-6 sm:mb-12">{formatTime(halftimeClock)}</span>
            {halftimeClock <= 0 ? (
              <button onClick={startNextPeriod} className="py-4 sm:py-6 px-8 sm:px-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg sm:text-3xl rounded-full transition-transform active:scale-95 shadow-[0_0_50px_rgba(16,185,129,0.3)] cursor-pointer">
                {periodType === 'quarters' ? `BEGIN QUARTER ${half + 1}` : "BEGIN SECOND HALF"}
              </button>
            ) : (
              <button onClick={startNextPeriod} className="py-3 sm:py-4 px-6 sm:px-8 bg-white/10 hover:bg-white/20 text-white font-bold text-sm sm:text-xl rounded-full transition-colors cursor-pointer">
                {periodType === 'quarters' ? `BEGIN QUARTER ${half + 1}` : "SKIP BREAK"}
              </button>
            )}
          </div>
        )}

        {/* GAME OVER OVERLAY */}
        {step === 'GAME_OVER' && (
          <div className="absolute inset-0 z-40 bg-black/95 backdrop-blur-xl flex flex-col items-center p-4 sm:p-8 overflow-y-auto">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black mb-4 sm:mb-8 uppercase tracking-widest text-emerald-500 mt-4 sm:mt-12">Game Over</h2>
            <div className="flex flex-col md:flex-row w-full max-w-4xl justify-between items-center mb-8 sm:mb-16 gap-4 sm:gap-8 md:gap-0">
              <div 
                className="flex flex-col items-center gap-2 sm:gap-4 px-8 py-5 rounded-3xl border shadow-xl"
                style={{ backgroundColor: homeTeamColors.secondary, borderColor: `${homeTeamColors.primary}40` }}
              >
                <span className="text-xl sm:text-3xl font-black uppercase" style={{ color: homeTeamColors.primary }}>{homeTeamName}</span>
                <span className="text-4xl sm:text-6xl md:text-[6rem] font-black leading-none" style={{ color: homeTeamColors.primary }}>{homeScore}</span>
              </div>
              <div className="text-neutral-500 font-bold text-lg sm:text-2xl tracking-widest">FINAL</div>
              <div 
                className="flex flex-col items-center gap-2 sm:gap-4 px-8 py-5 rounded-3xl border shadow-xl"
                style={{ backgroundColor: awayTeamColors.secondary, borderColor: `${awayTeamColors.primary}40` }}
              >
                <span className="text-xl sm:text-3xl font-black uppercase" style={{ color: awayTeamColors.primary }}>{awayTeamName}</span>
                <span className="text-4xl sm:text-6xl md:text-[6rem] font-black leading-none" style={{ color: awayTeamColors.primary }}>{awayScore}</span>
              </div>
            </div>

            <div className="w-full max-w-5xl bg-neutral-900 border border-white/10 rounded-3xl p-8 mb-12 flex flex-col items-center shadow-2xl">
              <h3 className="text-2xl font-black uppercase tracking-widest text-white mb-2">Did Not Participate</h3>
              <p className="text-neutral-400 mb-8 text-center max-w-2xl">Select any players who were absent or did not play in this game. This ensures they do not receive a "Game Played" stat for attendance purposes.</p>

              <div className="flex w-full gap-12">
                <div className="flex-1">
                  <h4 className="text-xl font-bold uppercase tracking-widest mb-4 border-b border-white/10 pb-2" style={{ color: homeTeamColors.tertiary }}>{homeTeamName}</h4>
                  <div className="flex flex-col gap-2 max-h-[30vh] overflow-y-auto pr-4 hide-scrollbar">
                    {homePlayers.map(p => (
                      <button
                        key={p}
                        onClick={() => setDidNotPlay(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                        className={`p-3 rounded-xl font-bold text-left transition-colors flex justify-between items-center ${didNotPlay.includes(p) ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50' : 'bg-black border border-white/5 text-neutral-300 hover:bg-white/5'}`}
                      >
                        <div className="flex items-center gap-2">
                          {playerNumberMap[p] && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-white/10 text-neutral-300">
                              #{playerNumberMap[p]}
                            </span>
                          )}
                          <span>{p}</span>
                        </div>
                        {didNotPlay.includes(p) && <span className="text-xs uppercase tracking-widest">Absent</span>}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold uppercase tracking-widest mb-4 border-b border-white/10 pb-2" style={{ color: awayTeamColors.tertiary }}>{awayTeamName}</h4>
                  <div className="flex flex-col gap-2 max-h-[30vh] overflow-y-auto pr-4 hide-scrollbar">
                    {awayPlayers.map(p => (
                      <button
                        key={p}
                        onClick={() => setDidNotPlay(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                        className={`p-3 rounded-xl font-bold text-left transition-colors flex justify-between items-center ${didNotPlay.includes(p) ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50' : 'bg-black border border-white/5 text-neutral-300 hover:bg-white/5'}`}
                      >
                        <div className="flex items-center gap-2">
                          {playerNumberMap[p] && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-white/10 text-neutral-300">
                              #{playerNumberMap[p]}
                            </span>
                          )}
                          <span>{p}</span>
                        </div>
                        {didNotPlay.includes(p) && <span className="text-xs uppercase tracking-widest">Absent</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button onClick={finalizeGame} className="py-6 px-12 bg-white hover:bg-neutral-200 text-black font-black text-3xl rounded-full transition-transform active:scale-95">
                FINALIZE GAME & SAVE STATS
              </button>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="py-4 px-8 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 font-bold text-xs uppercase tracking-wider rounded-full transition-all flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Reset to Pre-Game</span>
              </button>
            </div>
          </div>
        )}

        {/* WIZARD: PLAY TYPE */}
        {step === 'PLAY_TYPE' && (
          <div data-tour="play-type-selector" className="w-full flex-1 flex flex-col min-h-0">
            <PlayEntryWizard
              step="type"
              variant="sync"
              possession={possession}
              currentDown={currentDown}
              downsPerSeries={downsPerSeries}
              onDownChange={setCurrentDown}
              accentColor={possessionTeamColors.tertiary}
              onSelectType={(type) => {
                if (type === "Penalty") {
                  setPlayType("Penalty");
                  setStep("DETAILS");
                } else {
                  handlePlayTypeSelect(type);
                }
              }}
            />
          </div>
        )}

        {/* WIZARD: DETAILS */}
        {step === 'DETAILS' && (
          <div className="flex flex-col flex-1 min-h-0 gap-2 md:gap-3 max-w-7xl mx-auto w-full animate-in slide-in-from-right-8 duration-200">
            {playType === 'Penalty' ? (
              <PlayEntryWizard
                step="penalty"
                variant="sync"
                possessionTeamName={possession}
                defendingTeamName={possession === homeTeamName ? awayTeamName : homeTeamName}
                currentDown={currentDown}
                downsPerSeries={downsPerSeries}
                offenseRoster={getOffensiveRoster()}
                defenseRoster={getDefensiveRoster()}
                playerNumbers={playerNumberMap}
                accentColor={possessionTeamColors.tertiary}
                onCancel={() => { setStep('PLAY_TYPE'); setPlayType(null); setOutcome(null); }}
                onSavePenalty={handleSavePenalty}
              />
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 self-stretch mb-[-0.25rem] mt-[-0.25rem] z-10">
                  <button
                    onClick={() => { setStep('PLAY_TYPE'); setPlayType(null); setOutcome(null); }}
                    className="flex items-center gap-2 text-neutral-400 hover:text-white text-sm font-bold uppercase tracking-widest cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Play Type
                  </button>
                  <span className="text-[10px] sm:text-xs font-mono font-bold text-cyan-400 uppercase bg-black/40 px-2 py-0.5 rounded-lg border border-white/10">
                    {getOrdinal(currentDown)} Down
                  </span>
                </div>
                <div className="flex flex-col flex-1 min-h-0 gap-2.5 w-full">
                  {!isOutcomeOpen && outcome && (
                    <button type="button" aria-label={`Play Outcome: ${outcome}. Click to change`} onClick={() => setIsOutcomeOpen(true)}
                      className="min-h-10 shrink-0 rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-left text-xs font-bold text-white">
                      Play Outcome: {outcome === "Missed" ? "Incomplete" : outcome} · Change
                    </button>
                  )}
                  {isOutcomeOpen && <div className={`grid ${playType === 'Pass' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'} gap-1.5 p-1.5 md:p-2 bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-2xl shrink-0 relative z-10 w-full max-w-3xl mx-auto`}>
                  {playType === 'Pass' && ['Complete', 'Incomplete', 'Interception', 'Sack'].map((res) => {
                    const isActive = (res === 'Incomplete' && (outcome === 'Incomplete_Menu' || outcome === 'PBU' || outcome === 'Missed')) || outcome === res;
                    return (
                      <button
                        key={res} onClick={() => {
                          setIsOutcomeOpen(false);
                          setOutcome(res === 'Incomplete' ? 'Incomplete_Menu' : res as any);
                          setDefenders([]);
                          setFlaggers([]);
                          setReceiver("");
                          setIsOobPrompt(false);
                          if (!qbRunner) {
                            setIsQbOpen(true);
                            setIsReceiverOpen(false);
                            setIsDefendersOpen(false);
                          } else {
                            setIsQbOpen(false);
                            if (res === 'Complete') {
                              setIsReceiverOpen(true);
                              setIsDefendersOpen(false);
                            } else {
                              setIsReceiverOpen(false);
                              setIsDefendersOpen(true);
                            }
                          }
                        }}
                        className={`w-full min-h-10 px-2 py-2 text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-wider rounded-xl transition-all ${isActive ? 'bg-[#3CA505] text-black shadow-md' : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
                      >
                        {res}
                      </button>
                    );
                  })}
                  {playType === 'Run' && ['Gain', 'FFL'].map((res) => (
                    <button
                      key={res} onClick={() => { setIsOutcomeOpen(false); setOutcome(res as any); setDefenders([]); setFlaggers([]); setIsDefendersOpen(res === 'FFL'); setIsOobPrompt(false); }}
                      className={`w-full min-h-10 px-2 py-2 text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-wider rounded-xl transition-all ${outcome === res ? 'bg-[#3CA505] text-black shadow-md' : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                      {res === 'FFL' ? 'Flag For Loss (FFL)' : 'Positive / No Gain'}
                    </button>
                  ))}
                  </div>}
                  <div className="flex-1 min-h-0 flex flex-col gap-2.5 [@media(max-height:450px)]:gap-1 overflow-y-auto pr-1 w-full max-w-3xl mx-auto">
                    <div className={`flex flex-col gap-2.5 min-w-0 ${playType === 'Pass' && outcome === 'Complete' && qbRunner && receiver && !isQbOpen && !isReceiverOpen ? '[@media(max-height:450px)]:grid [@media(max-height:450px)]:grid-cols-2 [@media(max-height:450px)]:gap-1.5' : ''}`}>
                    {/* SECTION 1: QUARTERBACK / RUNNER */}
                      {qbRunner && !isQbOpen ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsQbOpen(true);
                            setIsReceiverOpen(false);
                          }}
                          className="w-full flex items-center justify-between p-3 sm:p-3.5 [@media(max-height:450px)]:p-1.5 bg-neutral-900 border border-white/10 hover:border-cyan-500/50 hover:bg-neutral-800/80 rounded-2xl transition-all shadow-md group text-left cursor-pointer"
                          aria-label={`${playType === 'Run' ? 'Runner' : 'Quarterback'}: ${qbRunner}. Click to change`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs uppercase tracking-widest font-bold text-neutral-400">
                              {playType === 'Run' ? 'Runner:' : 'Quarterback:'}
                            </span>
                            <span className="text-sm sm:text-base font-black text-white truncate flex items-center gap-2">
                              {playerNumberMap[qbRunner] && (
                                <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-black bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                                  #{playerNumberMap[qbRunner]}
                                </span>
                              )}
                              <span>{qbRunner}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 group-hover:text-cyan-400 shrink-0">
                            <span className="hidden sm:inline">Change</span>
                            <ChevronDown className="w-4 h-4 text-cyan-400 transition-transform group-hover:translate-y-0.5" />
                          </div>
                        </button>
                      ) : (
                        <div className="bg-neutral-900 rounded-2xl p-3 sm:p-3.5 border border-white/10 flex flex-col shadow-lg">
                          <div className="flex items-center justify-between mb-2 [@media(max-height:450px)]:mb-1">
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-neutral-400 font-bold uppercase tracking-widest">
                                {playType === 'Run' ? 'Select Runner' : 'Select Quarterback'}
                              </label>
                              {!qbRunner && <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse" />}
                            </div>
                            {qbRunner && (
                              <button
                                type="button"
                                onClick={() => setIsQbOpen(false)}
                                className="flex items-center gap-1 text-xs font-bold text-neutral-400 hover:text-white cursor-pointer"
                              >
                                <span>Collapse</span>
                                <ChevronUp className="w-4 h-4 text-cyan-400" />
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 [@media(max-height:450px)]:grid-cols-4 gap-1.5 sm:gap-2 max-h-40 sm:max-h-52 overflow-y-auto pr-1 hide-scrollbar">
                            {sortRosterByStatLeader(
                              getOffensiveRoster(),
                              playerNumberMap,
                              playType === 'Run' ? playerStatCounts.rushing : playerStatCounts.passing
                            ).map((p) => {
                              const isSelected = qbRunner === p;
                              const pNum = playerNumberMap[p];
                              const statCount = playType === 'Run' ? playerStatCounts.rushing[p] : playerStatCounts.passing[p];
                              return (
                                <button
                                  key={p}
                                  type="button"
                                  aria-label={p}
                                  onClick={() => handleSelectQbRunner(p)}
                                  className={`p-2 sm:p-2.5 rounded-xl font-bold text-left text-xs sm:text-sm transition-all flex items-center justify-between gap-1.5 cursor-pointer ${isSelected
                                    ? 'bg-cyan-500 text-white shadow-md'
                                    : 'bg-black border border-white/5 text-neutral-300 hover:bg-white/10 hover:border-white/20'
                                    }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {pNum && (
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-mono font-black shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                                        }`}>
                                        #{pNum}
                                      </span>
                                    )}
                                    <span className="truncate">{p}</span>
                                    {statCount !== undefined && statCount > 0 && (
                                      <span className={`text-[10px] font-mono font-bold shrink-0 ${isSelected ? 'text-white/80' : 'text-cyan-400/80'}`}>
                                        ({statCount} {playType === 'Run' ? 'rush' : 'att'})
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

                      {/* SECTION 2: RECEIVER (for Pass & Complete) */}
                      {playType === 'Pass' && outcome === 'Complete' && qbRunner && (
                        receiver && !isReceiverOpen ? (
                          <button
                            type="button"
                            onClick={() => {
                              setIsReceiverOpen(true);
                              setIsQbOpen(false);
                            }}
                            className="w-full flex items-center justify-between p-3 sm:p-3.5 [@media(max-height:450px)]:p-1.5 bg-neutral-900 border border-white/10 hover:border-cyan-500/50 hover:bg-neutral-800/80 rounded-2xl transition-all shadow-md group text-left cursor-pointer"
                            aria-label={`Receiver: ${receiver}. Click to change`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs uppercase tracking-widest font-bold text-neutral-400">
                                Receiver:
                              </span>
                              <span className="text-sm sm:text-base font-black text-white truncate flex items-center gap-2">
                                {playerNumberMap[receiver] && (
                                  <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-black bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                                    #{playerNumberMap[receiver]}
                                  </span>
                                )}
                                <span>{receiver}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 group-hover:text-cyan-400 shrink-0">
                              <span className="hidden sm:inline">Change</span>
                              <ChevronDown className="w-4 h-4 text-cyan-400 transition-transform group-hover:translate-y-0.5" />
                            </div>
                          </button>
                        ) : (
                          <div className="bg-neutral-900 rounded-2xl p-3 sm:p-3.5 border border-white/10 flex flex-col shadow-lg animate-in fade-in">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-neutral-400 font-bold uppercase tracking-widest">
                                  Select Receiver
                                </label>
                                {!receiver && <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse" />}
                              </div>
                              {receiver && (
                                <button
                                  type="button"
                                  onClick={() => setIsReceiverOpen(false)}
                                  className="flex items-center gap-1 text-xs font-bold text-neutral-400 hover:text-white cursor-pointer"
                                >
                                  <span>Collapse</span>
                                  <ChevronUp className="w-4 h-4 text-cyan-400" />
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 [@media(max-height:450px)]:grid-cols-4 gap-1.5 sm:gap-2 max-h-40 sm:max-h-52 overflow-y-auto pr-1 hide-scrollbar">
                              {sortRosterByStatLeader(
                                getEligibleReceivers(getOffensiveRoster(), qbRunner),
                                playerNumberMap,
                                playerStatCounts.receiving
                              ).map((p) => {
                                const isSelected = receiver === p;
                                const pNum = playerNumberMap[p];
                                const recCount = playerStatCounts.receiving[p];
                                return (
                                  <button
                                    key={p}
                                    type="button"
                                    aria-label={p}
                                    onClick={() => handleSelectReceiver(p)}
                                    className={`p-2 sm:p-2.5 rounded-xl font-bold text-left text-xs sm:text-sm transition-all flex items-center justify-between gap-1.5 cursor-pointer ${isSelected
                                      ? 'bg-cyan-500 text-white shadow-md'
                                      : 'bg-black border border-white/5 text-neutral-300 hover:bg-white/10 hover:border-white/20'
                                      }`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {pNum && (
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-mono font-black shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                                          }`}>
                                          #{pNum}
                                        </span>
                                      )}
                                      <span className="truncate">{p}</span>
                                      {recCount !== undefined && recCount > 0 && (
                                        <span className={`hidden sm:inline text-[10px] font-mono font-bold shrink-0 ${isSelected ? 'text-white/80' : 'text-cyan-400/80'}`}>
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
                        )
                      )}

                      {/* SECTION 3: INCOMPLETE SUB-MENU (PBU vs Missed Throw) */}
                    </div>
                      {outcome === 'Incomplete_Menu' && (
                        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 animate-in zoom-in-95">
                          <button
                            type="button"
                            onClick={() => {
                              setOutcome('PBU');
                              setIsDefendersOpen(true);
                            }}
                            className="flex-1 py-4 sm:py-5 px-4 bg-neutral-900 border-2 border-white/10 hover:border-blue-500 rounded-2xl text-base sm:text-lg font-black transition-all shadow-xl cursor-pointer"
                          >
                            PASS BREAK UP
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOutcome('Missed');
                            }}
                            className="flex-1 py-4 sm:py-5 px-4 bg-neutral-900 border-2 border-white/10 hover:border-amber-500 rounded-2xl text-base sm:text-lg font-black transition-all shadow-xl cursor-pointer"
                          >
                            MISSED THROW
                          </button>
                        </div>
                      )}

                      {/* SECTION 4: PASS BREAK UP DEFENDER */}
                      {outcome === 'PBU' && qbRunner && (
                        defenders.length === 1 && !isDefendersOpen ? (
                          <button
                            type="button"
                            onClick={() => setIsDefendersOpen(true)}
                            className="w-full flex items-center justify-between p-3 sm:p-3.5 bg-neutral-900 border border-white/10 hover:border-blue-500/50 hover:bg-neutral-800/80 rounded-2xl transition-all shadow-md group text-left cursor-pointer"
                            aria-label={`Pass Break Up: ${defenders[0]}. Click to change`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs uppercase tracking-widest font-bold text-neutral-400">
                                Pass Break Up:
                              </span>
                              <span className="text-sm sm:text-base font-black text-blue-400 truncate flex items-center gap-2">
                                {playerNumberMap[defenders[0]] && (
                                  <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-black bg-blue-500/20 text-blue-400 border border-blue-500/40">
                                    #{playerNumberMap[defenders[0]]}
                                  </span>
                                )}
                                <span>{defenders[0]}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 group-hover:text-blue-400 shrink-0">
                              <span className="hidden sm:inline">Change</span>
                              <ChevronDown className="w-4 h-4 text-blue-400 transition-transform group-hover:translate-y-0.5" />
                            </div>
                          </button>
                        ) : (
                          <div className="bg-neutral-900 rounded-2xl p-3 sm:p-3.5 border border-white/10 flex flex-col shadow-lg animate-in fade-in">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs text-neutral-400 font-bold uppercase tracking-widest">
                                Select Defender (Pass Break Up)
                              </label>
                              {defenders.length === 1 && (
                                <button
                                  type="button"
                                  onClick={() => setIsDefendersOpen(false)}
                                  className="flex items-center gap-1 text-xs font-bold text-neutral-400 hover:text-white cursor-pointer"
                                >
                                  <span>Collapse</span>
                                  <ChevronUp className="w-4 h-4 text-blue-400" />
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 [@media(max-height:450px)]:grid-cols-4 gap-1.5 sm:gap-2 max-h-40 sm:max-h-52 overflow-y-auto pr-1 hide-scrollbar">
                              {sortRosterByStatLeader(getDefensiveRoster(), playerNumberMap, playerStatCounts.pbus).map((p) => {
                                const isSelected = defenders.includes(p);
                                const pNum = playerNumberMap[p];
                                const pbuCount = playerStatCounts.pbus[p];
                                return (
                                  <button
                                    key={p}
                                    type="button"
                                    aria-label={p}
                                    onClick={() => {
                                      handleDefenders(p, 1);
                                      setIsDefendersOpen(false);
                                    }}
                                    className={`p-2 sm:p-2.5 rounded-xl font-bold text-left text-xs sm:text-sm transition-all flex items-center justify-between gap-1.5 cursor-pointer ${isSelected
                                      ? 'bg-blue-600 text-white shadow-md'
                                      : 'bg-black border border-white/5 text-neutral-300 hover:bg-white/10 hover:border-white/20'
                                      }`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {pNum && (
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-mono font-black shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                          }`}>
                                          #{pNum}
                                        </span>
                                      )}
                                      <span className="truncate">{p}</span>
                                      {pbuCount !== undefined && pbuCount > 0 && (
                                        <span className={`text-[10px] font-mono font-bold shrink-0 ${isSelected ? 'text-white/80' : 'text-blue-400/80'}`}>
                                          ({pbuCount} PBU)
                                        </span>
                                      )}
                                    </div>
                                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )
                      )}

                      {/* SECTION 5: INTERCEPTOR (DEFENSE) */}
                      {outcome === 'Interception' && qbRunner && (
                        defenders.length === 1 && !isDefendersOpen ? (
                          <button
                            type="button"
                            onClick={() => setIsDefendersOpen(true)}
                            className="w-full flex items-center justify-between p-3 sm:p-3.5 bg-neutral-900 border border-white/10 hover:border-amber-500/50 hover:bg-neutral-800/80 rounded-2xl transition-all shadow-md group text-left cursor-pointer"
                            aria-label={`Interceptor: ${defenders[0]}. Click to change`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs uppercase tracking-widest font-bold text-neutral-400">
                                Interceptor:
                              </span>
                              <span className="text-sm sm:text-base font-black text-amber-400 truncate flex items-center gap-2">
                                {playerNumberMap[defenders[0]] && (
                                  <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-black bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                    #{playerNumberMap[defenders[0]]}
                                  </span>
                                )}
                                <span>{defenders[0]}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 group-hover:text-amber-400 shrink-0">
                              <span className="hidden sm:inline">Change</span>
                              <ChevronDown className="w-4 h-4 text-amber-400 transition-transform group-hover:translate-y-0.5" />
                            </div>
                          </button>
                        ) : (
                          <div className="bg-neutral-900 rounded-2xl p-3 sm:p-3.5 border border-white/10 flex flex-col shadow-lg animate-in fade-in">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs text-neutral-400 font-bold uppercase tracking-widest">
                                Select Interceptor (Defense)
                              </label>
                              {defenders.length === 1 && (
                                <button
                                  type="button"
                                  onClick={() => setIsDefendersOpen(false)}
                                  className="flex items-center gap-1 text-xs font-bold text-neutral-400 hover:text-white cursor-pointer"
                                >
                                  <span>Collapse</span>
                                  <ChevronUp className="w-4 h-4 text-amber-400" />
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 [@media(max-height:450px)]:grid-cols-4 gap-1.5 sm:gap-2 max-h-40 sm:max-h-52 overflow-y-auto pr-1 hide-scrollbar">
                              {sortRosterByStatLeader(getDefensiveRoster(), playerNumberMap, playerStatCounts.interceptions).map((p) => {
                                const isSelected = defenders.includes(p);
                                const pNum = playerNumberMap[p];
                                const intCount = playerStatCounts.interceptions[p];
                                return (
                                  <button
                                    key={p}
                                    type="button"
                                    aria-label={p}
                                    onClick={() => {
                                      handleDefenders(p, 1);
                                      setIsDefendersOpen(false);
                                    }}
                                    className={`p-2 sm:p-2.5 rounded-xl font-bold text-left text-xs sm:text-sm transition-all flex items-center justify-between gap-1.5 cursor-pointer ${isSelected
                                      ? 'bg-amber-500 text-black font-black shadow-md'
                                      : 'bg-black border border-white/5 text-neutral-300 hover:bg-white/10 hover:border-white/20'
                                      }`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {pNum && (
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-mono font-black shrink-0 ${isSelected ? 'bg-black/20 text-black' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                          }`}>
                                          #{pNum}
                                        </span>
                                      )}
                                      <span className="truncate">{p}</span>
                                      {intCount !== undefined && intCount > 0 && (
                                        <span className={`text-[10px] font-mono font-bold shrink-0 ${isSelected ? 'text-black/80' : 'text-amber-400/80'}`}>
                                          ({intCount} INT)
                                        </span>
                                      )}
                                    </div>
                                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )
                      )}

                      {/* SECTION 6: INTERCEPTION FLAGGERS (OFFENSE ACTING AS DEFENSE) */}
                      {outcome === 'Interception' && defenders.length === 1 && (
                        <div className="bg-neutral-900 rounded-2xl p-3 sm:p-3.5 border border-white/10 flex flex-col shadow-lg animate-in fade-in">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs text-neutral-400 font-bold uppercase tracking-widest">
                              Flagger(s) (Offense) - Optional
                            </label>
                            {flaggers.length > 0 && (
                              <span className="text-xs font-bold text-cyan-400">
                                Selected: {flaggers.map(p => playerNumberMap[p] ? `#${playerNumberMap[p]} ${p}` : p).join(" & ")}
                              </span>
                            )}
                          </div>
                          <StatPlayerPicker
                            key={defenders.join(",")}
                            collapsible
                            label="Flagger(s) on Interception Return"
                            roster={getOffensiveRoster()}
                            playerNumbers={playerNumberMap}
                            counts={playerStatCounts.flags}
                            countLabel="flags"
                            selected={flaggers}
                            onSelect={handleFlaggers}
                          />
                        </div>
                      )}

                      {/* SECTION 7: DEFENSE FLAGGERS (COMPLETE, GAIN, SACK, FFL) */}
                      {hasOffenseSelected() && (outcome === 'Complete' || outcome === 'Gain' || outcome === 'Sack' || outcome === 'FFL') && (
                        !isDefendersOpen ? (
                          defenders.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setIsDefendersOpen(true)}
                              aria-label={`${outcome === "Sack" || outcome === "FFL" ? "Sacker(s)" : "Flagger(s)"}: ${defenders.join(', ')}. Click to change`}
                              className="w-full flex items-center justify-between gap-2 p-2 sm:p-3 bg-neutral-900 border border-white/10 hover:border-amber-500/40 rounded-xl sm:rounded-2xl transition-all text-left"
                            >
                              <span className="min-w-0 truncate text-xs sm:text-sm font-bold text-white">
                                {outcome === "Sack" || outcome === "FFL" ? "Sacker(s)" : "Flagger(s)"}: {defenders.map((p) => playerNumberMap[p] ? `#${playerNumberMap[p]} ${p}` : p).join(" & ")}
                              </span>
                              <span className="flex items-center gap-1 text-xs font-bold text-neutral-400 shrink-0">
                                Change <ChevronDown className="w-4 h-4 text-amber-400" />
                              </span>
                            </button>
                          ) : (
                            <div className="flex items-center justify-between gap-2 p-2 sm:p-3 [@media(max-height:450px)]:py-1.5 bg-neutral-900 border border-white/10 rounded-xl sm:rounded-2xl">
                              <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-wider text-white">Flagger(s)</p>
                                <p className="text-[10px] sm:text-xs text-neutral-400">Optional — leave empty for no flag.</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setIsDefendersOpen(true)}
                                className="px-3 py-2 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold whitespace-nowrap hover:bg-amber-500/25"
                              >
                                Add flagger
                              </button>
                            </div>
                          )
                        ) : (
                          <div className="bg-neutral-900 rounded-2xl p-2 sm:p-3.5 border border-white/10 flex flex-col shadow-lg animate-in fade-in">
                            <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                              <label className="text-xs text-neutral-400 font-bold uppercase tracking-widest">
                                {outcome === 'Sack' || outcome === 'FFL' ? 'Sacked By / Flag' : 'Flagger(s)'}
                              </label>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] sm:text-xs font-bold text-amber-400">
                                  {defenders.length === 0
                                    ? 'Select up to 2'
                                    : `Selected (${defenders.length}/2): ${defenders.map(p => playerNumberMap[p] ? `#${playerNumberMap[p]} ${p}` : p).join(" & ")}`}
                                </span>
                                {(outcome === 'Complete' || outcome === 'Gain') && (
                                  <button
                                    type="button"
                                    onClick={() => setIsDefendersOpen(false)}
                                    className="flex items-center gap-1 text-xs font-bold text-neutral-400 hover:text-white cursor-pointer"
                                  >
                                    Done <ChevronUp className="w-4 h-4 text-amber-400" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 [@media(max-height:450px)]:grid-cols-4 gap-1.5 sm:gap-2 max-h-40 sm:max-h-52 overflow-y-auto pr-1 hide-scrollbar">
                              {(() => {
                                const isSack = outcome === 'Sack' || outcome === 'FFL';
                                const activeCounts = playerStatCounts[getDefensiveStatCategory(outcome)];
                                return sortRosterByStatLeader(getDefensiveRoster(), playerNumberMap, activeCounts).map((p) => {
                                  const isSelected = defenders.includes(p);
                                  const pNum = playerNumberMap[p];
                                  const countVal = activeCounts[p];
                                  return (
                                    <button
                                      key={p}
                                      type="button"
                                      aria-label={p}
                                      onClick={() => {
                                        handleDefenders(p, 2);
                                        setIsDefendersOpen(false);
                                      }}
                                      className={`p-2 sm:p-2.5 rounded-xl font-bold text-left text-xs sm:text-sm transition-all flex items-center justify-between gap-1.5 cursor-pointer ${isSelected
                                        ? 'bg-amber-500 text-black font-black shadow-md'
                                        : 'bg-black border border-white/5 text-neutral-300 hover:bg-white/10 hover:border-white/20'
                                        }`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        {pNum && (
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-mono font-black shrink-0 ${isSelected ? 'bg-black/20 text-black' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                            }`}>
                                            #{pNum}
                                          </span>
                                        )}
                                        <span className="truncate">{p}</span>
                                        {countVal !== undefined && countVal > 0 && (
                                          <span className={`text-[10px] font-mono font-bold shrink-0 ${isSelected ? 'text-black/80' : 'text-amber-400/80'}`}>
                                            ({countVal} {isSack ? 'sack' : 'flags'})
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
                        )
                      )}
                  </div>
                    {/* SECTION 8: RESULTS & OUTCOMES ROW */}
                    {outcome !== 'Incomplete_Menu' &&
                      (isOobPrompt || (hasOffenseSelected() && (
                        outcome === 'Complete' || outcome === 'Gain' || isPlayReadyToSave()
                      ))) && (
                      <div role="group" aria-label="Save play result" className="shrink-0 pt-2 pb-1 w-full">
                        {/* OOB Prompt Logic */}
                        {isOobPrompt && (
                          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 animate-in slide-in-from-bottom-2">
                            <button onClick={() => handleSavePlay('First Down')} className="py-3 sm:py-4 md:py-5 rounded-2xl md:rounded-3xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-base md:text-lg shadow-lg cursor-pointer">OOB - FIRST DOWN</button>
                            <button onClick={() => handleSavePlay('Short')} className="py-3 sm:py-4 md:py-5 rounded-2xl md:rounded-3xl bg-neutral-800 text-white font-black text-xs sm:text-base md:text-lg border border-white/10 hover:bg-neutral-700 cursor-pointer">OOB - SHORT</button>
                          </div>
                        )}

                        {/* Normal Results */}
                        {!isOobPrompt && (
                          <>
                            {/* Immediate Touchdown & OOB for Complete/Gain */}
                            {hasOffenseSelected() && (outcome === 'Complete' || outcome === 'Gain') && defenders.length === 0 && (
                              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 animate-in fade-in">
                                <button onClick={() => handleSavePlay('Touchdown')} className="py-3 sm:py-4 md:py-5 [@media(max-height:450px)]:py-2 rounded-2xl md:rounded-3xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-base md:text-lg shadow-lg cursor-pointer">TOUCHDOWN</button>
                                <button onClick={() => setIsOobPrompt(true)} className="py-3 sm:py-4 md:py-5 [@media(max-height:450px)]:py-2 rounded-2xl md:rounded-3xl bg-neutral-800 text-neutral-300 font-bold text-xs sm:text-base md:text-lg border border-white/10 hover:text-white hover:bg-neutral-700 cursor-pointer">OUT OF BOUNDS</button>
                              </div>
                            )}

                            {/* Normal Complete/Gain with Flagger */}
                            {isPlayReadyToSave() && (outcome === 'Complete' || outcome === 'Gain') && defenders.length > 0 && (
                              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 animate-in slide-in-from-bottom-2">
                                <button onClick={() => handleSavePlay('First Down')} className="py-3 sm:py-4 md:py-5 rounded-2xl md:rounded-3xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-base md:text-lg shadow-lg cursor-pointer">FIRST DOWN</button>
                                <button onClick={() => handleSavePlay('Short')} className="py-3 sm:py-4 md:py-5 rounded-2xl md:rounded-3xl bg-neutral-800 text-white font-black text-xs sm:text-base md:text-lg border border-white/10 hover:bg-neutral-700 cursor-pointer">SHORT OF LINE</button>
                              </div>
                            )}

                            {/* Interception Results */}
                            {hasOffenseSelected() && outcome === 'Interception' && defenders.length === 1 && (
                              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 animate-in slide-in-from-bottom-2">
                                {flaggers.length === 0 ? (
                                  <>
                                    <button onClick={() => handleSavePlay('Pick 6')} className="py-3 sm:py-4 md:py-5 rounded-2xl md:rounded-3xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-base md:text-lg shadow-lg cursor-pointer">PICK 6</button>
                                    <button onClick={() => handleSavePlay('Turnover')} className="py-3 sm:py-4 md:py-5 rounded-2xl md:rounded-3xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs sm:text-base md:text-lg border border-white/10 cursor-pointer">OOB / DOWNED</button>
                                  </>
                                ) : (
                                  <button onClick={() => handleSavePlay('Turnover')} className="col-span-2 py-3 sm:py-4 md:py-5 rounded-2xl md:rounded-3xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs sm:text-base md:text-lg cursor-pointer">FLAGGED (Save Turnover)</button>
                                )}
                              </div>
                            )}

                            {/* Other Outcomes (PBU, Missed, Sack, FFL) */}
                            <div className={`transition-all duration-300 ${hasOffenseSelected() && (outcome === 'PBU' || outcome === 'Missed' || outcome === 'Sack' || outcome === 'FFL') && isPlayReadyToSave() ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none hidden'}`}>
                              {(outcome === 'PBU' || outcome === 'Missed') && (
                                <button onClick={() => handleSavePlay('Next Down')} className="w-full py-3 sm:py-4 rounded-2xl md:rounded-3xl bg-neutral-800 text-white font-black text-xs sm:text-base md:text-lg border border-white/10 hover:bg-neutral-700 cursor-pointer">SAVE & NEXT DOWN</button>
                              )}
                              {(outcome === 'Sack' || outcome === 'FFL') && (
                                <div className="grid grid-cols-2 gap-2 md:gap-3">
                                  <button onClick={() => handleSavePlay('Short')} className="py-3 sm:py-4 rounded-2xl md:rounded-3xl bg-neutral-800 text-white font-black text-xs sm:text-base md:text-lg border border-white/10 hover:bg-neutral-700 cursor-pointer">Loss Of Yards</button>
                                  <button onClick={() => handleSavePlay('Safety')} className="py-3 sm:py-4 rounded-2xl md:rounded-3xl bg-red-600 hover:bg-red-500 text-white font-black text-xs sm:text-base md:text-lg shadow-lg cursor-pointer">Safety</button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                </div>
              </>
            )}
          </div>
        )}

        {/* WIZARD: CONVERSION */}
        {step === 'CONVERSION' && (
          <PlayEntryWizard
            step="conversion"
            variant="sync"
            points={convPts}
            isGood={convIsGood}
            onPointsChange={setConvPts}
            onResultChange={(isGood) => {
              setConvIsGood(isGood);
              if (!isGood) finalizeConversion(isGood);
            }}
            showResultButtons={convIsGood === null}
            accentColor={possessionTeamColors.tertiary}
            footer={convPts && convIsGood && (
              <button onClick={() => finalizeConversion()} disabled={!convPasser}
                className="w-full min-h-11 py-3 px-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-sm disabled:opacity-40">
                SAVE CONVERSION STATS
              </button>
            )}
          >

            {convPts && convIsGood && (
              <div className="shrink-0 flex flex-col gap-2 animate-in slide-in-from-right-4">
                <div className="hidden sm:flex justify-between items-center bg-neutral-900 border border-white/10 px-4 py-2 rounded-xl shrink-0">
                  <span className="text-sm font-bold uppercase">Success: {convPts} Point(s)</span>
                  <span className="text-xs text-neutral-400">Select players to award stats</span>
                </div>

                <div className="flex flex-col gap-2 max-w-3xl mx-auto w-full">
                  {/* PASSER / RUNNER */}
                  {convPasser && !isConvPasserOpen ? (
                    <button
                      type="button"
                      onClick={() => { setIsConvPasserOpen(true); setIsConvReceiverOpen(false); }}
                      className="w-full min-w-0 flex items-center justify-between gap-2 p-2 sm:p-3.5 bg-neutral-900 border border-white/10 hover:border-cyan-500/40 rounded-2xl transition-all shadow-md group text-left"
                      aria-label={`Passer / Runner: ${convPasser}. Click to change`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center min-w-0 gap-1 sm:gap-2.5">
                        <span className="text-xs uppercase tracking-widest font-bold text-neutral-400">Passer / Runner:</span>
                        <span className="text-sm font-black text-white flex items-center gap-2 min-w-0">
                          {playerNumberMap[convPasser] && (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-black bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                              #{playerNumberMap[convPasser]}
                            </span>
                          )}
                          <span className="truncate">{convPasser}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 group-hover:text-cyan-400 shrink-0">
                        <span className="hidden sm:inline">Change</span>
                        <ChevronDown className="w-5 h-5 text-cyan-400 transition-transform group-hover:translate-y-0.5" />
                      </div>
                    </button>
                  ) : (
                    <div className="bg-neutral-900 rounded-2xl p-3.5 sm:p-4 border border-white/5 flex flex-col shadow-lg">
                      <div className="flex items-center justify-between mb-2.5">
                        <label className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Select Passer / Runner</label>
                        {convPasser && (
                          <button
                            type="button"
                            onClick={() => setIsConvPasserOpen(false)}
                            className="text-xs font-bold text-neutral-400 hover:text-white flex items-center gap-1"
                          >
                            <span>Collapse</span>
                            <ChevronUp className="w-4 h-4 text-cyan-400" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1 hide-scrollbar">
                        {sortRosterByStatLeader(getOffensiveRoster(), playerNumberMap, playerStatCounts.passing).map(p => {
                          const isSelected = convPasser === p;
                          const pNum = playerNumberMap[p];
                          const passCount = playerStatCounts.passing[p];
                          return (
                            <button
                              key={p}
                              type="button"
                              aria-label={p}
                              onClick={() => {
                                setConvPasser(p);
                                if (possession === homeTeamName) setLastHomeQB(p);
                                else setLastAwayQB(p);
                                if (convReceiver === p) setConvReceiver("");
                                setIsConvPasserOpen(false);
                                setIsConvReceiverOpen(true);
                              }}
                              className={`p-2.5 rounded-xl text-sm font-bold text-left transition-all flex items-center justify-between gap-1.5 ${isSelected
                                ? 'bg-cyan-500 text-white shadow-md'
                                : 'bg-black border border-white/5 text-neutral-300 hover:bg-white/10 hover:border-white/20'
                                }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {pNum && (
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-mono font-black shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                                    }`}>
                                    #{pNum}
                                  </span>
                                )}
                                <span className="truncate">{p}</span>
                                {passCount !== undefined && passCount > 0 && (
                                  <span className={`text-[10px] font-mono font-bold shrink-0 ${isSelected ? 'text-white/80' : 'text-cyan-400/80'}`}>
                                    ({passCount} att)
                                  </span>
                                )}
                              </div>
                              {isSelected && <Check className="w-4 h-4 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* RECEIVER (OPTIONAL) */}
                  {!isConvReceiverOpen ? (
                    <button
                      type="button"
                      onClick={() => { setIsConvReceiverOpen(true); setIsConvPasserOpen(false); }}
                      className="w-full min-w-0 flex items-center justify-between gap-2 p-2 sm:p-3.5 bg-neutral-900 border border-white/10 hover:border-cyan-500/40 rounded-2xl transition-all shadow-md group text-left"
                      aria-label={`Receiver: ${convReceiver}. Click to change`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center min-w-0 gap-1 sm:gap-2.5">
                        <span className="text-xs uppercase tracking-widest font-bold text-neutral-400">Receiver:</span>
                        <span className="text-sm font-black text-white flex items-center gap-2 min-w-0">
                          {playerNumberMap[convReceiver] && (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-black bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                              #{playerNumberMap[convReceiver]}
                            </span>
                          )}
                          <span className="truncate">{convReceiver || "Optional - tap to add"}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 group-hover:text-cyan-400 shrink-0">
                        <span className="hidden sm:inline">Change</span>
                        <ChevronDown className="w-5 h-5 text-cyan-400 transition-transform group-hover:translate-y-0.5" />
                      </div>
                    </button>
                  ) : (
                    <div className="bg-neutral-900 rounded-2xl p-3.5 sm:p-4 border border-white/5 flex flex-col shadow-lg">
                      <div className="flex items-center justify-between mb-2.5">
                        <label className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Select Receiver (Optional)</label>
                        {convReceiver && (
                          <button
                            type="button"
                            onClick={() => setIsConvReceiverOpen(false)}
                            className="text-xs font-bold text-neutral-400 hover:text-white flex items-center gap-1"
                          >
                            <span>Collapse</span>
                            <ChevronUp className="w-4 h-4 text-cyan-400" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1 hide-scrollbar">
                        {sortRosterByStatLeader(
                          getEligibleReceivers(getOffensiveRoster(), convPasser),
                          playerNumberMap,
                          playerStatCounts.receiving
                        ).map(p => {
                          const isSelected = convReceiver === p;
                          const pNum = playerNumberMap[p];
                          const recCount = playerStatCounts.receiving[p];
                          return (
                            <button
                              key={p}
                              type="button"
                              aria-label={p}
                              onClick={() => {
                                const next = convReceiver === p ? '' : p;
                                setConvReceiver(next);
                                if (next) setIsConvReceiverOpen(false);
                              }}
                              className={`p-2.5 rounded-xl text-sm font-bold text-left transition-all flex items-center justify-between gap-1.5 ${isSelected
                                ? 'bg-cyan-500 text-white shadow-md'
                                : 'bg-black border border-white/5 text-neutral-300 hover:bg-white/10 hover:border-white/20'
                                }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {pNum && (
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-mono font-black shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                                    }`}>
                                    #{pNum}
                                  </span>
                                )}
                                <span className="truncate">{p}</span>
                                {recCount !== undefined && recCount > 0 && (
                                  <span className={`hidden sm:inline text-[10px] font-mono font-bold shrink-0 ${isSelected ? 'text-white/80' : 'text-cyan-400/80'}`}>
                                    ({recCount} rec)
                                  </span>
                                )}
                              </div>
                              {isSelected && <Check className="w-4 h-4 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </PlayEntryWizard>
        )}
      </main>

      {/* PLAY LOG DRAWER MODAL */}
      {isPlayLogDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in">
          <div className="bg-neutral-950 border-l border-white/10 w-full max-w-lg h-full p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-black uppercase text-white">Live Game Play Log</h3>
              </div>
              <button
                onClick={() => setIsPlayLogDrawerOpen(false)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2.5">
              {matchPlaysList.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-sm italic">
                  No plays logged yet.
                </div>
              ) : (
                matchPlaysList.map((p, idx) => {
                  const sentence = formatPlaySentence(p, {
                    homeTeamName,
                    awayTeamName,
                    homeTeamId,
                    downsPerSeries,
                  });
                  const isPenalty = p.playType === "Penalty";

                  return (
                    <div
                      key={p.id || idx}
                      className={`p-3.5 rounded-2xl border transition-all ${isPenalty
                        ? "bg-amber-950/20 border-amber-500/30"
                        : "bg-neutral-900 border-white/5"
                        }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mb-1">
                        <span className="font-bold text-cyan-400">
                          {p.half === 2 ? "2nd Half" : "1st Half"} • {getOrdinal(p.down || 1)} Down
                        </span>
                        <span>{p.gameClock !== undefined && p.gameClock !== null ? formatTime(p.gameClock) : ""}</span>
                      </div>
                      <p className="text-xs font-bold text-white leading-relaxed">{sentence}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
