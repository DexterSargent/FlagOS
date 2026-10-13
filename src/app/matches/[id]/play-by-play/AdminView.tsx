"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Zap, RotateCcw, Flag, Maximize, Minimize, Play, Pause, AlertCircle, Timer, Save, Plus, Minus, X, ChevronRight, Undo, AlertTriangle, Shield, Check } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDoc, getDocs, doc, serverTimestamp, updateDoc, deleteDoc, query, where, orderBy, limit } from "firebase/firestore";
import { useLeague } from "@/lib/leagueContext";
import PenaltyWizardStep from "@/components/play-by-play/PenaltyWizardStep";
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

export default function PlayByPlayManager({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const matchId = unwrappedParams.id;
  const router = useRouter();
  const { settings, isDemoLeague } = useLeague();

  const [isEmbedded, setIsEmbedded] = useState(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("embed") === "true" || sp.get("demo") === "true";
    }
    return false;
  });

  const isDemo = isDemoLeague || isEmbedded || isDemoMatch(matchId);

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
  // Match Info
  const [homeTeamName, setHomeTeamName] = useState("HOME");
  const [awayTeamName, setAwayTeamName] = useState("AWAY");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");

  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [subs, setSubs] = useState<string[]>([]);
  const [homePlayers, setHomePlayers] = useState<string[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<string[]>([]);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subModalTeam, setSubModalTeam] = useState<"HOME" | "AWAY" | null>(null);

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

  const getOrdinal = (n: number) => {
    if (n === 1) return "1st";
    if (n === 2) return "2nd";
    if (n === 3) return "3rd";
    return `${n}th`;
  };

  const FootballIcon = ({ className, active }: { className?: string, active: boolean }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={`${className} ${active ? 'opacity-100 drop-shadow-[0_0_15px_currentColor]' : 'opacity-30 grayscale'} transition-all duration-500`}
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
              if (!mData) return;
              allP = getSandboxPlayers();
            } else {
              mData = matchDoc.data() as any;
              const playersSnap = await getDocs(collection(db, "players"));
              allP = playersSnap.docs.map(d => d.data());
            }
          } catch (err) {
            console.warn("Unable to fetch live match from Firestore, falling back to sandbox:", err);
            mData = getSandboxMatch(matchId);
            if (!mData) return;
            allP = getSandboxPlayers();
          }
        }

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

  const refreshPlays = async () => {
    try {
      let pList: any[] = [];
      if (isDemo) {
        pList = getSandboxPlays(matchId);
      } else {
        const q = query(
          collection(db, "plays"),
          where("matchId", "==", matchId),
          orderBy("timestamp", "asc")
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
      }
    } catch (e) {
      console.error("Error refreshing plays in admin:", e);
    }
  };

  // Game Clock
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGameClockRunning && gameClock > 0) {
      interval = setInterval(() => setGameClock(c => Math.max(0, c - 1)), 1000);
    }
    return () => clearInterval(interval);
  }, [isGameClockRunning, gameClock]);

  // Play Clock
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlayClockRunning && isGameClockRunning) {
      interval = setInterval(() => setPlayClock(c => Math.max(0, c - 1)), 1000);
    }
    return () => clearInterval(interval);
  }, [isPlayClockRunning, isGameClockRunning]);

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
      const playsQuery = query(collection(db, "plays"), where("matchId", "==", matchId));
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

  const handleSpotBall = () => {
    setIsBallSpotted(true);
    setPlayClock(playClockSeconds);
    setIsPlayClockRunning(true);
    if (gameClock > 120 && !isGameClockRunning) setIsGameClockRunning(true);
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
    setPlayType(type);
    setOutcome(type === "Pass" ? "Complete" : "Gain");
    if (type === "Pass") {
      setQbRunner(possession === homeTeamName ? lastHomeQB : lastAwayQB);
    } else {
      setQbRunner("");
    }
    setStep('DETAILS');
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
      await addDoc(collection(db, "plays"), {
        ...playData,
        timestamp: serverTimestamp()
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
      setStep('CONVERSION');
      return;
    }

    if (result === 'Pick 6') {
      const newPoss = possession === homeTeamName ? awayTeamName : homeTeamName;
      if (newPoss === homeTeamName) setHomeScore(s => s + 6);
      else setAwayScore(s => s + 6);
      setPossession(newPoss);
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

  const finalizeConversion = () => {
    if (convIsGood && convPts) {
      if (possession === homeTeamName) setHomeScore(s => s + convPts);
      else setAwayScore(s => s + convPts);
    }

    // Log Touchdown + PAT to Firestore
    const finalPlay: any = {
      ...buildPlayData(playResult),
      conversionAttempt: convPts,
      conversionSuccess: convIsGood,
      conversionPasser: convPasser,
      conversionReceiver: convReceiver,
      pointsScored: 6 + (convIsGood ? convPts! : 0)
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

  if (loadingData) {
    return (
      <div className="h-[100dvh] bg-black text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
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
            <span className="text-3xl font-bold uppercase tracking-widest text-cyan-400 mb-4">
              {getOrdinal(half)} {periodType === 'quarters' ? 'Quarter' : 'Half'}
            </span>
            <span className="text-[12rem] font-black leading-none text-white tracking-tighter tabular-nums">{formatTime(gameClock)}</span>
          </div>
          <div className="flex justify-between items-center px-24">
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-6">
                <FootballIcon active={possession === (homeTeamName || "HOME")} className={`w-12 h-12 ${possession === (homeTeamName || "HOME") ? 'text-cyan-400' : 'text-neutral-500'}`} />
                <span className="text-6xl font-black text-white uppercase">{homeTeamName}</span>
              </div>
              <span className="text-[15rem] font-black text-cyan-400 leading-none">{homeScore}</span>
              <div className="flex gap-3">
                {Array.from({ length: timeoutsPerTeam }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full ${i < homeTimeouts ? 'bg-cyan-400 shadow-[0_0_15px_rgba(var(--league-primary-rgb),0.6)]' : 'bg-neutral-800'}`}
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
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-6">
                <span className="text-6xl font-black text-white uppercase">{awayTeamName}</span>
                <FootballIcon active={possession === (awayTeamName || "AWAY")} className={`w-12 h-12 ${possession === (awayTeamName || "AWAY") ? 'text-blue-500' : 'text-neutral-500'}`} />
              </div>
              <span className="text-[15rem] font-black text-blue-500 leading-none">{awayScore}</span>
              <div className="flex gap-3">
                {Array.from({ length: timeoutsPerTeam }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full ${i < awayTimeouts ? 'bg-blue-500 shadow-[0_0_15px_rgba(var(--league-accent-rgb),0.6)]' : 'bg-neutral-800'}`}
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
    <div className="min-h-[100dvh] md:h-[100dvh] md:min-h-0 bg-black text-white font-sans overflow-x-hidden md:overflow-hidden flex flex-col relative">

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
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleAddSub(p.playerName, subModalTeam)}
                          className="py-4 px-4 bg-neutral-950 border border-white/5 rounded-2xl text-lg font-bold hover:bg-white/10 transition-colors text-left flex justify-between items-center"
                        >
                          <span>{p.playerName} {isOpponent && <span className="text-amber-500 ml-1" title="Currently on opposing team">*</span>}</span>
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

      {/* HEADER */}
      <header className="bg-neutral-900 border-b border-cyan-500/30 p-2 md:p-3 flex flex-col md:flex-row items-center justify-between shrink-0 z-50 gap-2 md:gap-0">
        <div className="flex items-center justify-between md:justify-start gap-4 w-full md:w-1/4">
          <div className="flex items-center gap-4">
            {!isEmbedded && (
              <Link href={`/matches/${matchId}`} className="flex items-center text-neutral-400 hover:text-white transition-colors bg-black p-3 rounded-2xl border border-white/10">
                <ChevronLeft className="w-6 h-6" />
              </Link>
            )}
            <button onClick={resetPlay} className="flex items-center text-white bg-[#9b9b9b] p-3 rounded-2xl border border-white/10" title="Reset Current Play">
              <RotateCcw className="w-6 h-6" />
            </button>
            <button onClick={handleUndoLastPlay} className="flex items-center text-white hover:text-amber-500 bg-[#9b9b9b] p-3 rounded-2xl border border-white/10" title="Undo Last Play">
              <Undo className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-row items-center justify-center gap-2 md:gap-6 w-full md:w-auto mt-2 md:mt-0">
          <div className="flex flex-row items-center justify-end gap-1 md:gap-2 w-1/4">
            <button
              disabled={homeTimeouts === 0}
              onClick={() => callTimeout('home')}
              className="px-2 py-1 bg-[#9b9b9b] border border-white/10 rounded-lg text-[10px] font-bold disabled:opacity-30 disabled:line-through hover:bg-white/10 shrink-0"
            >
              TO ({homeTimeouts})
            </button>
            <div className="flex gap-1 items-center mr-0.5">
              {Array.from({ length: timeoutsPerTeam }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${i < homeTimeouts ? 'bg-cyan-400' : 'bg-neutral-800'}`}
                />
              ))}
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase truncate w-full text-right">{homeTeamName}</span>
              <span className="text-2xl md:text-3xl font-black text-cyan-400 leading-none">{homeScore}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 bg-[#9b9b9b] px-2 md:px-4 py-1 md:py-2 rounded-3xl border border-white/10 group">
            <button
              onPointerDown={() => startAdjustingClock(-10)}
              onPointerUp={stopAdjustingClock}
              onPointerLeave={stopAdjustingClock}
              className="p-1 md:p-2 text-neutral-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 select-none hidden md:block"
              title="Remove Time"
            >
              <Minus className="w-5 h-5 pointer-events-none" />
            </button>
            <span className="text-2xl md:text-3xl font-black tabular-nums text-white w-16 md:w-24 text-center">{formatTime(gameClock)}</span>
            <button
              onPointerDown={() => startAdjustingClock(10)}
              onPointerUp={stopAdjustingClock}
              onPointerLeave={stopAdjustingClock}
              className="p-1 md:p-2 text-neutral-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 select-none hidden md:block"
              title="Add Time"
            >
              <Plus className="w-5 h-5 pointer-events-none" />
            </button>
            <button onClick={() => setIsGameClockRunning(!isGameClockRunning)} className={`p-2 md:p-3 ml-1 md:ml-2 rounded-full ${isGameClockRunning ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
              {isGameClockRunning ? <Pause className="w-4 h-4 md:w-5 md:h-5 fill-current" /> : <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />}
            </button>
          </div>
          <div className="flex flex-row items-center justify-start gap-1 md:gap-2 w-1/4">
            <div className="flex flex-col items-start">
              <span className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase truncate w-full text-left">{awayTeamName}</span>
              <span className="text-2xl md:text-3xl font-black text-blue-500 leading-none">{awayScore}</span>
            </div>
            <div className="flex gap-1 items-center ml-0.5">
              {Array.from({ length: timeoutsPerTeam }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${i < awayTimeouts ? 'bg-blue-500' : 'bg-neutral-800'}`}
                />
              ))}
            </div>
            <button
              disabled={awayTimeouts === 0}
              onClick={() => callTimeout('away')}
              className="px-2 py-1 bg-[#9b9b9b] border border-white/10 rounded-lg text-[10px] font-bold disabled:opacity-30 disabled:line-through hover:bg-white/10 shrink-0"
            >
              TO ({awayTimeouts})
            </button>
          </div>
          <button onClick={() => setIsScoreboardFullscreen(true)} className="ml-1 md:ml-4 bg-white/10 p-2 md:p-3 rounded-xl hover:bg-white/20 text-neutral-300 hidden sm:block" title="Fullscreen Scoreboard">
            <Maximize className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            onClick={() => setIsResetModalOpen(true)}
            className="ml-2 md:ml-3 px-3 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 border border-red-500/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
            title="Reset Game to Pre-Game State"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Game</span>
          </button>
        </div>
      </header>

      {/* GAME STATE BAR */}
      <div className="bg-neutral-950 border-b border-white/10 p-1.5 md:p-2 flex flex-row items-center justify-between shrink-0 gap-2 overflow-x-auto">
        <div className="flex items-center gap-2 md:gap-6 px-2 md:px-8 w-auto">
          <div className="flex flex-col">
            <span className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase tracking-widest leading-none">Period</span>
            <span className="text-sm md:text-base font-black text-cyan-400 mt-1 uppercase whitespace-nowrap">
              {getOrdinal(half)} {periodType === 'quarters' ? 'Qtr' : 'Half'}
            </span>
          </div>
          <div className="h-6 md:h-8 w-px bg-white/10 shrink-0"></div>
          <div className="flex flex-col">
            <span className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase tracking-widest leading-none">Offense</span>
            <span className={`text-lg md:text-2xl font-black leading-tight ${possession === homeTeamName ? 'text-cyan-400' : 'text-blue-500'}`}>{possession}</span>
          </div>
          <div className="h-6 md:h-8 w-px bg-white/10 shrink-0"></div>
          <div className="flex flex-col">
            <span className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1 leading-none">Down</span>
            <div className="flex gap-1 md:gap-2">
              {Array.from({ length: downsPerSeries }, (_, i) => i + 1).map(d => (
                <button
                  key={d}
                  onClick={() => setCurrentDown(d)}
                  className={`w-7 h-7 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black text-xs md:text-lg transition-all shrink-0 ${currentDown === d ? 'bg-white text-black' : 'bg-neutral-900 border border-white/10 text-neutral-500 hover:text-white hover:border-white/30'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 px-2 md:px-8 shrink-0">
          <span className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase tracking-widest leading-none hidden sm:block">Play Clock</span>
          <span className={`text-2xl md:text-3xl font-black tabular-nums leading-none ${playClock <= 0 ? 'text-red-500 animate-pulse' : 'text-amber-500'}`}>{playClock}</span>
        </div>
      </div>

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
          onClick={() => setIsPlayLogDrawerOpen(true)}
          className="text-cyan-400 hover:text-cyan-300 shrink-0 ml-3 text-[11px] font-bold flex items-center gap-1 cursor-pointer bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 transition-colors"
        >
          <span>Play Log ({matchPlaysList.length})</span>
        </button>
      </div>

      <main className="flex-1 min-h-0 p-2 md:p-3 flex flex-col overflow-visible md:overflow-hidden relative">

        {/* SPOT BALL OVERLAY */}
        {!isBallSpotted && step !== 'CONVERSION' && step !== 'HALFTIME' && step !== 'GAME_OVER' && !isTimeoutActive && (
          <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
            <div className="flex flex-col md:flex-row w-full max-w-7xl justify-between items-center px-4 sm:px-12 gap-8 md:gap-12 py-12 md:py-0">

              {/* Home Score (Left) */}
              <div className="hidden md:flex flex-col items-center gap-4 shrink-0">
                <div className="flex items-center gap-4">
                  <FootballIcon active={possession === (homeTeamName || "HOME")} className={`w-10 h-10 ${possession === (homeTeamName || "HOME") ? 'text-cyan-400' : 'text-neutral-500'}`} />
                  <span className="text-4xl font-black text-white uppercase">{homeTeamName}</span>
                </div>
                <span className="text-[8rem] font-black text-cyan-400 leading-none">{homeScore}</span>
                <div className="flex gap-2 mt-2">
                  {Array.from({ length: timeoutsPerTeam }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-5 h-5 rounded-full ${i < homeTimeouts ? 'bg-cyan-400 shadow-[0_0_10px_rgba(var(--league-primary-rgb),0.5)]' : 'bg-neutral-800'}`}
                    />
                  ))}
                </div>
              </div>

              {/* Center Column (Time + Alert) */}
              <div className="flex flex-col items-center justify-center gap-8">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xl font-bold uppercase tracking-widest text-cyan-400">
                    {getOrdinal(half)} {periodType === 'quarters' ? 'Quarter' : 'Half'}
                  </span>
                  <span className="text-[5rem] font-black leading-none text-white tracking-tighter tabular-nums">{formatTime(gameClock)}</span>
                </div>

                {isFirstPlayOfHalf ? (
                  <div className="bg-neutral-900 border border-cyan-500/30 p-6 sm:p-10 md:p-12 rounded-3xl sm:rounded-[3rem] flex flex-col items-center shadow-[0_0_100px_rgba(var(--league-primary-rgb),0.2)] max-w-xl text-center">
                    <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-emerald-500 mb-4 sm:mb-6" />
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-4 sm:mb-6 uppercase tracking-widest leading-tight">THE CLOCK WILL BEGIN ON THE SNAP</h2>
                    <button
                      onClick={() => { handleSpotBall(); setIsFirstPlayOfHalf(false); }}
                      className="py-4 sm:py-6 px-6 sm:px-10 bg-white hover:bg-neutral-200 text-black font-black text-base sm:text-xl md:text-2xl rounded-full shadow-2xl active:scale-95 transition-transform"
                    >
                      CLICK WHEN SNAPPED
                    </button>
                  </div>
                ) : (
                  <div className="bg-neutral-900 border border-amber-500/30 p-6 sm:p-10 md:p-12 rounded-3xl sm:rounded-[3rem] flex flex-col items-center shadow-[0_0_100px_rgba(245,158,11,0.1)] max-w-xl text-center">
                    <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-amber-500 mb-4 sm:mb-6" />
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-4 sm:mb-6 uppercase tracking-widest">Awaiting Spot</h2>
                    <button
                      onClick={handleSpotBall}
                      className="py-4 sm:py-6 px-6 sm:px-10 bg-white hover:bg-neutral-200 text-black font-black text-base sm:text-xl md:text-2xl rounded-full shadow-2xl active:scale-95 transition-transform"
                    >
                      CLICK WHEN SPOTTED
                    </button>
                  </div>
                )}
              </div>

              {/* Away Score (Right) */}
              <div className="hidden md:flex flex-col items-center gap-4 shrink-0">
                <div className="flex items-center gap-4">
                  <span className="text-4xl font-black text-white uppercase">{awayTeamName}</span>
                  <FootballIcon active={possession === (awayTeamName || "AWAY")} className={`w-10 h-10 ${possession === (awayTeamName || "AWAY") ? 'text-blue-500' : 'text-neutral-500'}`} />
                </div>
                <span className="text-[8rem] font-black text-blue-500 leading-none">{awayScore}</span>
                <div className="flex gap-2 mt-2">
                  {Array.from({ length: timeoutsPerTeam }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-5 h-5 rounded-full ${i < awayTimeouts ? 'bg-blue-500 shadow-[0_0_10px_rgba(var(--league-accent-rgb),0.5)]' : 'bg-neutral-800'}`}
                    />
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* PERIOD BREAK / HALFTIME OVERLAY */}
        {step === 'HALFTIME' && (
          <div className="absolute inset-0 z-40 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-8">
            <h2 className="text-5xl font-black mb-8 uppercase tracking-widest text-cyan-400">
              {half === Math.floor(periodsCount / 2) ? "Halftime" : periodType === 'quarters' ? `End of Quarter ${half}` : `End of Half ${half}`}
            </h2>
            <span className="text-[12rem] font-black leading-none text-white tabular-nums mb-12">{formatTime(halftimeClock)}</span>
            {halftimeClock <= 0 ? (
              <button onClick={startNextPeriod} className="py-6 px-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-3xl rounded-full transition-transform active:scale-95 shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                {periodType === 'quarters' ? `BEGIN QUARTER ${half + 1}` : "BEGIN SECOND HALF"}
              </button>
            ) : (
              <button onClick={startNextPeriod} className="py-4 px-8 bg-white/10 hover:bg-white/20 text-white font-bold text-xl rounded-full transition-colors">
                {periodType === 'quarters' ? `BEGIN QUARTER ${half + 1}` : "SKIP BREAK"}
              </button>
            )}
          </div>
        )}

        {/* GAME OVER OVERLAY */}
        {step === 'GAME_OVER' && (
          <div className="absolute inset-0 z-40 bg-black/95 backdrop-blur-xl flex flex-col items-center p-8 overflow-y-auto">
            <h2 className="text-5xl font-black mb-8 uppercase tracking-widest text-emerald-500 mt-12">Game Over</h2>
            <div className="flex flex-col md:flex-row w-full max-w-4xl justify-between items-center mb-16 gap-8 md:gap-0">
              <div className="flex flex-col items-center gap-4">
                <span className="text-3xl font-black text-white uppercase">{homeTeamName}</span>
                <span className="text-[6rem] font-black text-cyan-400 leading-none">{homeScore}</span>
              </div>
              <div className="text-neutral-500 font-bold text-2xl tracking-widest">FINAL</div>
              <div className="flex flex-col items-center gap-4">
                <span className="text-3xl font-black text-white uppercase">{awayTeamName}</span>
                <span className="text-[6rem] font-black text-blue-500 leading-none">{awayScore}</span>
              </div>
            </div>

            <div className="w-full max-w-5xl bg-neutral-900 border border-white/10 rounded-3xl p-8 mb-12 flex flex-col items-center shadow-2xl">
              <h3 className="text-2xl font-black uppercase tracking-widest text-white mb-2">Did Not Participate</h3>
              <p className="text-neutral-400 mb-8 text-center max-w-2xl">Select any players who were absent or did not play in this game. This ensures they do not receive a "Game Played" stat for attendance purposes.</p>
              
              <div className="flex w-full gap-12">
                <div className="flex-1">
                  <h4 className="text-xl font-bold uppercase tracking-widest text-cyan-400 mb-4 border-b border-white/10 pb-2">{homeTeamName}</h4>
                  <div className="flex flex-col gap-2 max-h-[30vh] overflow-y-auto pr-4 hide-scrollbar">
                    {homePlayers.map(p => (
                      <button 
                        key={p} 
                        onClick={() => setDidNotPlay(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                        className={`p-3 rounded-xl font-bold text-left transition-colors flex justify-between items-center ${didNotPlay.includes(p) ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50' : 'bg-black border border-white/5 text-neutral-300 hover:bg-white/5'}`}
                      >
                        {p}
                        {didNotPlay.includes(p) && <span className="text-xs uppercase tracking-widest">Absent</span>}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold uppercase tracking-widest text-blue-500 mb-4 border-b border-white/10 pb-2">{awayTeamName}</h4>
                  <div className="flex flex-col gap-2 max-h-[30vh] overflow-y-auto pr-4 hide-scrollbar">
                    {awayPlayers.map(p => (
                      <button 
                        key={p} 
                        onClick={() => setDidNotPlay(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                        className={`p-3 rounded-xl font-bold text-left transition-colors flex justify-between items-center ${didNotPlay.includes(p) ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50' : 'bg-black border border-white/5 text-neutral-300 hover:bg-white/5'}`}
                      >
                        {p}
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
          <div className="flex flex-col md:grid md:grid-cols-3 gap-2 md:gap-4 flex-1 min-h-0 max-w-6xl mx-auto w-full overflow-visible pb-2 md:pb-0">
            <button onClick={() => handlePlayTypeSelect("Pass")} className="min-h-24 md:min-h-0 bg-neutral-900 border-2 border-white/5 hover:border-blue-500 hover:bg-blue-900/20 rounded-2xl md:rounded-3xl p-3 md:p-5 flex flex-row md:flex-col items-center justify-start md:justify-center gap-3 md:gap-4 transition-all group shadow-xl shrink-0">
              <span className="text-4xl md:text-6xl group-hover:scale-110 transition-transform">🏈</span>
              <span className="font-black text-xl md:text-3xl">PASS</span>
            </button>
            <button onClick={() => handlePlayTypeSelect("Run")} className="min-h-24 md:min-h-0 bg-neutral-900 border-2 border-white/5 hover:border-emerald-500 hover:bg-emerald-900/20 rounded-2xl md:rounded-3xl p-3 md:p-5 flex flex-row md:flex-col items-center justify-start md:justify-center gap-3 md:gap-4 transition-all group shadow-xl shrink-0">
              <span className="text-4xl md:text-6xl group-hover:scale-110 transition-transform">🏃‍♀️</span>
              <span className="font-black text-xl md:text-3xl">RUN</span>
            </button>
            <button onClick={() => { setPlayType("Penalty"); setStep('DETAILS'); }} className="min-h-24 md:min-h-0 bg-neutral-900 border-2 border-white/5 hover:border-amber-500 hover:bg-amber-900/20 rounded-2xl md:rounded-3xl p-3 md:p-5 flex flex-row md:flex-col items-center justify-start md:justify-center gap-3 md:gap-4 transition-all group shadow-xl shrink-0">
              <span className="text-4xl md:text-6xl group-hover:scale-110 transition-transform">🚩</span>
              <span className="font-black text-xl md:text-3xl">PENALTY</span>
            </button>
          </div>
        )}

        {/* WIZARD: DETAILS */}
        {step === 'DETAILS' && (
          <div className="flex flex-col flex-1 min-h-0 gap-2 md:gap-3 max-w-7xl mx-auto w-full animate-in slide-in-from-right-8 duration-200">
            {playType === 'Penalty' ? (
              <PenaltyWizardStep
                possessionTeamName={possession}
                defendingTeamName={possession === homeTeamName ? awayTeamName : homeTeamName}
                currentDown={currentDown}
                downsPerSeries={downsPerSeries}
                offenseRoster={getOffensiveRoster()}
                defenseRoster={getDefensiveRoster()}
                onCancel={() => { setStep('PLAY_TYPE'); setPlayType(null); setOutcome(null); }}
                onSavePenalty={handleSavePenalty}
              />
            ) : (
              <>
                <button
                  onClick={() => { setStep('PLAY_TYPE'); setPlayType(null); setOutcome(null); }}
                  className="self-start flex items-center gap-2 text-neutral-400 hover:text-white text-sm font-bold uppercase tracking-widest mb-[-0.5rem] mt-[-0.5rem] z-10"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to Play Type
                </button>
                <div className="grid grid-cols-2 md:flex gap-1.5 p-1.5 md:p-2 bg-neutral-900 border border-white/10 rounded-2xl shrink-0 relative z-10 w-full">
                  {playType === 'Pass' && ['Complete', 'Incomplete', 'Interception', 'Sack'].map((res) => {
                    const isActive = (res === 'Incomplete' && (outcome === 'Incomplete_Menu' || outcome === 'PBU' || outcome === 'Missed')) || outcome === res;
                    return (
                      <button
                        key={res} onClick={() => {
                          setOutcome(res === 'Incomplete' ? 'Incomplete_Menu' : res as any);
                          setDefenders([]);
                          setFlaggers([]);
                          setReceiver("");
                          setIsOobPrompt(false);
                        }}
                        className={`flex-1 py-2 md:py-2.5 text-[11px] md:text-sm font-bold uppercase tracking-wider rounded-xl transition-all ${isActive ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}
                      >
                        {res}
                      </button>
                    );
                  })}
                  {playType === 'Run' && ['Gain', 'FFL'].map((res) => (
                    <button
                      key={res} onClick={() => { setOutcome(res as any); setDefenders([]); setFlaggers([]); setIsOobPrompt(false); }}
                      className={`flex-1 py-2 md:py-2.5 text-[11px] md:text-sm font-bold uppercase tracking-wider rounded-xl transition-all ${outcome === res ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}
                    >
                      {res === 'FFL' ? 'Flag For Loss (FFL)' : 'Positive / No Gain'}
                    </button>
                  ))}
                </div>

                {outcome === 'Incomplete_Menu' ? (
                  <div className="md:col-span-2 flex-1 min-h-0 flex flex-col md:flex-row items-stretch justify-center gap-2 md:gap-4 animate-in zoom-in-95 overflow-visible">
                    <button onClick={() => setOutcome('PBU')} className="flex-1 py-5 md:py-8 px-4 md:px-8 bg-neutral-900 border-2 border-white/10 hover:border-blue-500 rounded-2xl md:rounded-3xl text-xl md:text-2xl font-black transition-all shadow-xl shrink-0 min-h-24 md:min-h-0">
                      PASS BREAK UP
                    </button>
                    <button onClick={() => setOutcome('Missed')} className="flex-1 py-5 md:py-8 px-4 md:px-8 bg-neutral-900 border-2 border-white/10 hover:border-amber-500 rounded-2xl md:rounded-3xl text-xl md:text-2xl font-black transition-all shadow-xl shrink-0 min-h-24 md:min-h-0">
                      MISSED THROW
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-2 md:gap-3 overflow-visible">
                    {/* COL 1: Offense (QB) */}
                    <div className="flex-1 bg-neutral-900 rounded-2xl p-3 md:p-4 border border-white/5 flex flex-col shadow-lg relative min-h-40 md:min-h-0 shrink-0">
                      {!qbRunner && <div className="absolute top-4 right-4 w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>}
                      <label className="text-xs text-neutral-400 font-bold uppercase tracking-widest mb-2">
                        {playType === 'Run' ? 'Runner' : 'Quarterback'}
                      </label>
                      <div className="grid grid-cols-2 xl:grid-cols-1 content-start gap-1.5 overflow-y-auto hide-scrollbar flex-1 min-h-0">
                        {getOffensiveRoster().map(p => (
                          <button key={p} onClick={() => { setQbRunner(p); if (receiver === p) setReceiver(""); }} className={`p-2 rounded-xl font-bold text-left text-sm transition-all shrink-0 ${qbRunner === p ? 'bg-cyan-500 text-white' : 'bg-black border border-white/5 text-neutral-400'}`}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* COL 2: Offense (Receiver) */}
                    {outcome === 'Complete' && (
                      <div className="flex-1 bg-neutral-900 rounded-2xl p-3 md:p-4 border border-white/5 flex flex-col shadow-lg relative animate-in fade-in min-h-40 md:min-h-0 shrink-0">
                        {!receiver && outcome === 'Complete' && <div className="absolute top-4 right-4 w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>}
                        <label className="text-xs text-neutral-400 font-bold uppercase tracking-widest mb-2">Receiver</label>
                        <div className="grid grid-cols-2 xl:grid-cols-1 content-start gap-1.5 overflow-y-auto hide-scrollbar flex-1 min-h-0">
                          {getOffensiveRoster().filter(p => p !== qbRunner || p === 'TEAM').map(p => (
                            <button key={p} onClick={() => setReceiver(p)} className={`p-2 rounded-xl font-bold text-left text-sm transition-all shrink-0 ${receiver === p ? 'bg-cyan-500 text-white' : 'bg-black border border-white/5 text-neutral-400'}`}>
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* COL 3: Defense */}
                    {(outcome === 'Complete' || outcome === 'Gain' || outcome === 'Sack' || outcome === 'FFL' || outcome === 'PBU' || outcome === 'Interception') && (
                      <div className="flex-1 bg-neutral-900 rounded-2xl p-3 md:p-4 border border-white/5 flex flex-col shadow-lg relative animate-in fade-in min-h-40 md:min-h-0 shrink-0">
                        {defenders.length === 0 && <div className="absolute top-4 right-4 w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>}
                        <label className="text-xs text-neutral-400 font-bold uppercase tracking-widest mb-1 flex justify-between">
                          {outcome === 'Interception' ? 'Interceptor' : outcome === 'PBU' ? 'Pass Break Up' : 'Flagger(s)'}
                        </label>
                        {outcome !== 'Interception' && outcome !== 'PBU' && (
                          <span className="text-xs text-amber-500/80 mb-4">Select up to 2</span>
                        )}
                        <div className="grid grid-cols-2 xl:grid-cols-1 content-start gap-1.5 overflow-y-auto hide-scrollbar flex-1 min-h-0 mt-1">
                          {getDefensiveRoster().map(p => (
                            <button
                              key={p}
                              onClick={() => handleDefenders(p, (outcome === 'Interception' || outcome === 'PBU') ? 1 : 2)}
                              className={`p-2 rounded-xl font-bold text-left text-sm transition-all shrink-0 ${defenders.includes(p) ? 'bg-amber-500 text-black' : 'bg-black border border-white/5 text-neutral-400'}`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* COL 4: Interception Flaggers (Offense acting as Defense) */}
                    {outcome === 'Interception' && (
                      <div className="flex-1 bg-neutral-900 rounded-2xl p-3 md:p-4 border border-white/5 flex flex-col shadow-lg relative animate-in fade-in min-h-40 md:min-h-0 shrink-0">
                        <label className="text-neutral-400 font-bold uppercase tracking-widest mb-2 flex justify-between">
                          Flagger(s) (Offense)
                        </label>
                        <span className="text-xs text-amber-500/80 mb-4">Select up to 2 (Optional)</span>
                        <div className="flex flex-col gap-2 overflow-y-auto hide-scrollbar flex-1 mt-2">
                          {getOffensiveRoster().map(p => (
                            <button
                              key={p}
                              onClick={() => handleFlaggers(p)}
                              className={`p-4 rounded-2xl font-bold text-left text-lg transition-all shrink-0 ${flaggers.includes(p) ? 'bg-cyan-500 text-white' : 'bg-black border border-white/5 text-neutral-400'}` }
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* RESULTS ROW */}
                {outcome !== 'Incomplete_Menu' && (
                  <div className="shrink-0 pt-2 min-h-[90px]">

                    {/* OOB Prompt Logic */}
                    {isOobPrompt && (
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 animate-in slide-in-from-bottom-2">
                        <button onClick={() => handleSavePlay('First Down')} className="py-3.5 sm:py-5 md:py-6 rounded-2xl md:rounded-3xl bg-blue-600 text-white font-black text-sm sm:text-base md:text-xl">OOB - FIRST DOWN</button>
                        <button onClick={() => handleSavePlay('Short')} className="py-3.5 sm:py-5 md:py-6 rounded-2xl md:rounded-3xl bg-neutral-800 text-white font-black text-sm sm:text-base md:text-xl border border-white/10">OOB - SHORT</button>
                      </div>
                    )}

                    {/* Normal Results */}
                    {!isOobPrompt && (
                      <>
                        {/* Immediate Touchdown & OOB for Complete/Gain */}
                        {hasOffenseSelected() && (outcome === 'Complete' || outcome === 'Gain') && defenders.length === 0 && (
                          <div className="grid grid-cols-2 gap-3 sm:gap-4 animate-in fade-in">
                            <button onClick={() => handleSavePlay('Touchdown')} className="py-3.5 sm:py-5 md:py-6 rounded-2xl md:rounded-3xl bg-emerald-600 text-white font-black text-sm sm:text-base md:text-xl">TOUCHDOWN</button>
                            <button onClick={() => setIsOobPrompt(true)} className="py-3.5 sm:py-5 md:py-6 rounded-2xl md:rounded-3xl bg-neutral-800 text-neutral-300 font-bold text-sm sm:text-base md:text-xl border border-white/10 hover:text-white">OUT OF BOUNDS</button>
                          </div>
                        )}

                        {/* Normal Complete/Gain with Flagger */}
                        {isPlayReadyToSave() && (outcome === 'Complete' || outcome === 'Gain') && defenders.length > 0 && (
                          <div className="grid grid-cols-2 gap-3 sm:gap-4 animate-in slide-in-from-bottom-2">
                            <button onClick={() => handleSavePlay('First Down')} className="py-3.5 sm:py-5 md:py-6 rounded-2xl md:rounded-3xl bg-blue-600 text-white font-black text-sm sm:text-base md:text-xl">FIRST DOWN</button>
                            <button onClick={() => handleSavePlay('Short')} className="py-3.5 sm:py-5 md:py-6 rounded-2xl md:rounded-3xl bg-neutral-800 text-white font-black text-sm sm:text-base md:text-xl border border-white/10">SHORT OF LINE</button>
                          </div>
                        )}

                        {/* Interception Results */}
                        {hasOffenseSelected() && outcome === 'Interception' && defenders.length === 1 && (
                          <div className="grid grid-cols-2 gap-3 sm:gap-4 animate-in slide-in-from-bottom-2">
                            {flaggers.length === 0 ? (
                              <>
                                <button onClick={() => handleSavePlay('Pick 6')} className="py-3.5 sm:py-5 md:py-6 rounded-2xl md:rounded-3xl bg-emerald-600 text-white font-black text-sm sm:text-base md:text-xl">PICK 6</button>
                                <button onClick={() => handleSavePlay('Turnover')} className="py-3.5 sm:py-5 md:py-6 rounded-2xl md:rounded-3xl bg-amber-600 text-white font-black text-sm sm:text-base md:text-xl border border-white/10">OOB / DOWNED</button>
                              </>
                            ) : (
                              <button onClick={() => handleSavePlay('Turnover')} className="col-span-2 py-3.5 sm:py-5 md:py-6 rounded-2xl md:rounded-3xl bg-amber-600 text-white font-black text-sm sm:text-base md:text-xl">FLAGGED (Save Turnover)</button>
                            )}
                          </div>
                        )}

                        {/* Other Outcomes (PBU, Missed, Sack, FFL) */}
                        <div className={`transition-all duration-300 ${hasOffenseSelected() && (outcome === 'PBU' || outcome === 'Missed' || outcome === 'Sack' || outcome === 'FFL') && isPlayReadyToSave() ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none hidden'}`}>
                          {(outcome === 'PBU' || outcome === 'Missed') && (
                            <button onClick={() => handleSavePlay('Next Down')} className="w-full py-3 md:py-4 rounded-xl md:rounded-3xl bg-neutral-800 text-white font-black text-sm md:text-xl border border-white/10">SAVE & NEXT DOWN</button>
                          )}
                          {(outcome === 'Sack' || outcome === 'FFL') && (
                            <div className="grid grid-cols-2 gap-2 md:gap-4">
                              <button onClick={() => handleSavePlay('Short')} className="py-3 md:py-4 rounded-xl md:rounded-3xl bg-neutral-800 text-white font-black text-sm md:text-xl border border-white/10">Loss Of Yards</button>
                              <button onClick={() => handleSavePlay('Safety')} className="py-3 md:py-4 rounded-xl md:rounded-3xl bg-red-600 text-white font-black text-sm md:text-xl">Safety</button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* WIZARD: CONVERSION */}
        {step === 'CONVERSION' && (
          <div className="flex flex-col flex-1 min-h-0 gap-2 md:gap-3 max-w-7xl mx-auto w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-base md:text-xl font-black text-emerald-400 flex items-center justify-center gap-2 bg-emerald-950/30 py-2 md:py-3 rounded-2xl border border-emerald-500/30 shrink-0">
              <Flag className="w-5 h-5" /> POINT AFTER ATTEMPT
            </h3>

            {!convPts && (
              <div className="flex-1 min-h-0 flex items-center justify-center gap-3 md:gap-6">
                <button onClick={() => setConvPts(1)} className="w-36 h-36 md:w-52 md:h-52 max-h-full bg-neutral-900 border border-white/10 hover:border-emerald-500 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center gap-2 group">
                  <span className="text-5xl md:text-7xl font-black text-white group-hover:text-emerald-400">1</span>
                  <span className="text-sm md:text-lg font-bold uppercase tracking-widest text-neutral-500">From 5 Yd</span>
                </button>
                <button onClick={() => setConvPts(2)} className="w-36 h-36 md:w-52 md:h-52 max-h-full bg-neutral-900 border border-white/10 hover:border-emerald-500 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center gap-2 group">
                  <span className="text-5xl md:text-7xl font-black text-white group-hover:text-emerald-400">2</span>
                  <span className="text-sm md:text-lg font-bold uppercase tracking-widest text-neutral-500">From 10 Yd</span>
                </button>
              </div>
            )}

            {convPts && convIsGood === null && (
              <div className="flex-1 min-h-0 flex items-center justify-center gap-3 md:gap-6 animate-in slide-in-from-right-4">
                <button onClick={() => setConvIsGood(true)} className="flex-1 max-w-sm py-8 md:py-12 bg-emerald-600 rounded-2xl md:rounded-3xl font-black text-3xl md:text-4xl text-white">GOOD</button>
                <button onClick={() => { setConvIsGood(false); finalizeConversion(); }} className="flex-1 max-w-sm py-8 md:py-12 bg-neutral-800 rounded-2xl md:rounded-3xl font-black text-3xl md:text-4xl text-white border border-white/10">NO GOOD</button>
              </div>
            )}

            {convPts && convIsGood && (
              <div className="flex-1 min-h-0 flex flex-col gap-2 animate-in slide-in-from-right-4">
                <div className="flex justify-between items-center bg-neutral-900 border border-white/10 px-4 py-2 rounded-xl shrink-0">
                  <span className="text-sm font-bold uppercase">Success: {convPts} Point(s)</span>
                  <span className="text-xs text-neutral-400">Select players to award stats</span>
                </div>

                <div className="flex-1 min-h-0 grid grid-cols-2 gap-2">
                  <div className="bg-neutral-900 rounded-2xl p-3 border border-white/5 flex flex-col shadow-lg relative min-h-0">
                    {!convPasser && <div className="absolute top-4 right-4 w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>}
                    <label className="text-xs text-neutral-400 font-bold uppercase tracking-widest mb-2">Passer / Runner</label>
                    <div className="flex flex-col gap-1 overflow-y-auto flex-1 min-h-0 hide-scrollbar">
                      {getOffensiveRoster().map(p => (
                        <button key={p} onClick={() => { setConvPasser(p); if (convReceiver === p) setConvReceiver(""); }} className={`p-2 rounded-lg text-sm font-bold text-left transition-all ${convPasser === p ? 'bg-cyan-500 text-white' : 'bg-black border border-white/5 text-neutral-400'}`}>{p}</button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-neutral-900 rounded-2xl p-3 border border-white/5 flex flex-col shadow-lg min-h-0">
                    <label className="text-xs text-neutral-400 font-bold uppercase tracking-widest mb-2">Receiver (Optional)</label>
                    <div className="flex flex-col gap-1 overflow-y-auto flex-1 min-h-0 hide-scrollbar">
                      {getOffensiveRoster().filter(p => p !== convPasser || p === 'TEAM').map(p => (
                        <button key={p} onClick={() => setConvReceiver(convReceiver === p ? '' : p)} className={`p-2 rounded-lg text-sm font-bold text-left transition-all ${convReceiver === p ? 'bg-cyan-500 text-white' : 'bg-black border border-white/5 text-neutral-400'}`}>{p}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={`transition-all duration-300 ${convPasser ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                  <button onClick={finalizeConversion} className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-base transition-all shadow-[0_0_25px_rgba(var(--league-primary-rgb),0.3)]">
                    SAVE CONVERSION STATS
                  </button>
                </div>
              </div>
            )}
          </div>
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
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isPenalty
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
