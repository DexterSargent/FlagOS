"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, Shield, MapPin, Zap, RotateCcw, BookOpen, ArrowUp } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, where, orderBy, limit } from "firebase/firestore";
import { useAuth } from "@/lib/authContext";
import { useLeague } from "@/lib/leagueContext";
import { renderFlagOS } from "@/components/FlagOSText";
import { usePrivateLeagueAccess } from "@/lib/usePrivateLeagueAccess";
import { formatPlaySentence as formatPlaySentenceEngine } from "@/lib/playSentenceFormatter";
import { resolvePeriodFormat } from "@/lib/periodFormat";
import {
  getSandboxMatches,
  getSandboxMatch,
  getSandboxPlayers,
  getSandboxPlays,
  updateSandboxMatch,
  deleteSandboxPlaysForMatch,
  subscribeDemoSandbox,
  isDemoMatch as checkIsDemoMatch,
} from "@/lib/demoSandbox";
import { isDemoMatchId } from "@/lib/demoSandboxRuntime";
import { isTrackablePlayer } from "@/lib/opponentPlaceholder";
import { useMatchTeamColors } from "@/lib/useMatchTeamColors";
import { getReadableTextColor, getTeamBadgeStyle } from "@/lib/teamColors";
import GameTeamStats from "@/components/match/GameTeamStats";
import { FootballGlossaryModal, GlossaryDefinitionBar, type GlossaryKey } from "@/components/match/FootballGlossary";
import { shortPlayerName } from "@/lib/shortPlayerName";
import SiteControls from "@/components/SiteControls";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";
import PoweredByFooter from "@/components/PoweredByFooter";
import { useTheme } from "@/lib/themeContext";
import { GAME_STATE_LABEL, getGameDisplayState, useNow, type GameDisplayState } from "@/lib/gameLiveState";
import { usePageGuide } from "@/lib/pageGuide";
import { projectGameClock } from "@/lib/wallClock";
import { LIVE_VIEWER_WALKTHROUGH } from "@/lib/walkthroughs/league";

const GAME_STATE_BADGE: Record<GameDisplayState, string> = {
  live: "bg-red-500/10 border-red-500/30 text-red-400",
  paused: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  upcoming: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
  final: "bg-white/5 border-white/10 text-neutral-300",
};
const GAME_STATE_DOT: Record<GameDisplayState, string> = {
  live: "bg-red-400 animate-pulse",
  paused: "bg-amber-400",
  upcoming: "bg-cyan-400",
  final: "bg-neutral-400",
};

export default function ViewerView({ params }: { params: Promise<{ id: string }> }) {
  usePageGuide(LIVE_VIEWER_WALKTHROUGH);
  const unwrappedParams = use(params);
  const matchId = unwrappedParams.id;
  const { settings, isDemoLeague, activeLeagueId } = useLeague();
  const { user, isLeagueAdmin, managedTeamId, playerTeamId } = useAuth();

  const [isEmbedded, setIsEmbedded] = useState(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("embed") === "true" || sp.get("demo") === "true";
    }
    return false;
  });

  const isDemoMatch = isDemoMatchId(matchId) && (isDemoLeague || isEmbedded || checkIsDemoMatch(matchId, activeLeagueId));

  const { isDenied, deniedElement } = usePrivateLeagueAccess({
    isPrivateOverride: matchId.startsWith("match_live_"),
  });



  const [matchData, setMatchData] = useState<any>(null);
  const now = useNow();
  const { home: homeColors, away: awayColors } = useMatchTeamColors(matchData, isDemoMatch);
  const { resolvedTheme } = useTheme();
  const [isLightDom, setIsLightDom] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const update = () => setIsLightDom(document.documentElement.classList.contains("light"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  const isLight = resolvedTheme === "light" || isLightDom;
  const homeText = getReadableTextColor(homeColors.secondary, homeColors.primary);
  const awayText = getReadableTextColor(awayColors.secondary, awayColors.primary);
  const homeAccent = getReadableTextColor(isLight ? "#FFFFFF" : "#0A0A0A", homeColors.primary);
  const [plays, setPlays] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'play-by-play' | 'box-score' | 'team-stats'>('play-by-play');
  const [boxScoreTab, setBoxScoreTab] = useState<'home' | 'away'>('home');
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [glossaryHighlight, setGlossaryHighlight] = useState<GlossaryKey | null>(null);
  const [activeTerm, setActiveTerm] = useState<GlossaryKey | null>(null);
  const [showAllStats, setShowAllStats] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const feedScrollRef = useRef<HTMLDivElement>(null);
  const openGlossary = (key: GlossaryKey | null = null) => {
    setGlossaryHighlight(key);
    setGlossaryOpen(true);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("embed") === "true") setIsEmbedded(true);
      const tabParam = sp.get("tab");
      if (tabParam === "box-score" || tabParam === "play-by-play" || tabParam === "team-stats") {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Pre-select team tab for box score if user is affiliated with home or away team
  useEffect(() => {
    if (!matchData) return;
    const userTeam = managedTeamId || playerTeamId;
    if (userTeam && userTeam === matchData.awayTeamId) {
      setBoxScoreTab('away');
    } else if (userTeam && userTeam === matchData.homeTeamId) {
      setBoxScoreTab('home');
    }
  }, [matchData, managedTeamId, playerTeamId]);

  useEffect(() => {
    if (isDemoMatch) {
      setPlayers(getSandboxPlayers());
      const unsub = subscribeDemoSandbox(() => setPlayers(getSandboxPlayers()));
      return () => unsub();
    }
    if (!matchData) return;
    const teamIds = [matchData.homeTeamId, matchData.awayTeamId]
      .filter((id): id is string => typeof id === "string" && !!id && !id.startsWith("opponent_"));
    if (!teamIds.length) {
      setPlayers([]);
      return;
    }
    const q = query(
      collection(db, "players"),
      where("teamId", "in", teamIds),
      limit(60),
    );
    const unsub = onSnapshot(q, (snap) => {
      setPlayers(snap.docs.map((d) => d.data()));
    }, (err) => {
      console.warn("ViewerView players snapshot warning:", err);
      setPlayers([]);
    });
    return () => unsub();
  }, [isDemoMatch, matchData]);

  const calculateBoxScore = () => {
    const statsMap: Record<string, any> = {};
    const initPlayer = (name: string) => {
      if (!statsMap[name]) {
        statsMap[name] = {
          name,
          inferredTeam: null,
          passAtt: 0, passComp: 0, passTD: 0, passInt: 0, passFD: 0,
          receptions: 0, recTD: 0, recFD: 0,
          rushAtt: 0, rushTD: 0, rushFD: 0,
          convPass: 0, convRec: 0, convRush: 0,
          flagPulls: 0, sacks: 0, ffl: 0, int: 0, defTD: 0, pbu: 0, safeties: 0,
        };
      }
    };

    plays.forEach(play => {
      const offTeam = play.possessionTeamId;
      const defTeam = offTeam === matchData?.homeTeamId ? matchData?.awayTeamId : matchData?.homeTeamId;

      const isConversionPlay = Boolean(
        play.isConversion === true ||
        play.playType === "Conversion" ||
        (!play.isTouchdown && !play.isPick6 && play.result !== "Pick 6" && (
          (play.conversionAttempt !== undefined && play.conversionAttempt !== null) ||
          play.conversionSuccess === true
        ))
      );

      // Passing
      if (play.playType === 'Pass' && (play.qbPlayerId || play.passer) && !isConversionPlay) {
        const qb = play.qbPlayerId || play.passer;
        initPlayer(qb);
        statsMap[qb].inferredTeam = offTeam;
        statsMap[qb].passAtt += 1;
        if (play.passOutcome === 'Complete') statsMap[qb].passComp += 1;
        if (play.isTouchdown || play.result === 'Touchdown') statsMap[qb].passTD += 1;
        if (play.firstDown || play.result === 'First Down' || play.isTouchdown || play.result === 'Touchdown') statsMap[qb].passFD += 1;
        if (play.passOutcome === 'Interception') statsMap[qb].passInt += 1;
      }
      // Receiving
      if (play.playType === 'Pass' && play.passOutcome === 'Complete' && (play.receiverPlayerId || play.receiver) && !isConversionPlay) {
        const rec = play.receiverPlayerId || play.receiver;
        initPlayer(rec);
        statsMap[rec].inferredTeam = offTeam;
        statsMap[rec].receptions += 1;
        if (play.isTouchdown || play.result === 'Touchdown') statsMap[rec].recTD += 1;
        if (play.firstDown || play.result === 'First Down' || play.isTouchdown || play.result === 'Touchdown') statsMap[rec].recFD += 1;
      }
      // Rushing
      if (play.playType === 'Run' && (play.runnerPlayerId || play.ballCarrierPlayerId) && !isConversionPlay) {
        const runner = play.runnerPlayerId || play.ballCarrierPlayerId;
        initPlayer(runner);
        statsMap[runner].inferredTeam = offTeam;
        statsMap[runner].rushAtt += 1;
        if (play.isTouchdown || play.result === 'Touchdown') statsMap[runner].rushTD += 1;
        if (play.firstDown || play.result === 'First Down' || play.isTouchdown || play.result === 'Touchdown') statsMap[runner].rushFD += 1;
      }
      // Conversions
      if (isConversionPlay) {
        if (play.conversionSuccess || play.passOutcome === 'Complete' || (play.points && play.points > 0)) {
          const passer = play.conversionPasser || play.qbPlayerId || play.passer;
          const receiver = play.conversionReceiver || play.receiverPlayerId || play.receiver;
          const runner = play.conversionRunner || play.runnerPlayerId || play.ballCarrierPlayerId;
          if (play.playType === 'Pass') {
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
          } else if (play.playType === 'Run') {
            if (runner) {
              initPlayer(runner);
              statsMap[runner].inferredTeam = offTeam;
              statsMap[runner].convRush += 1;
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
          statsMap[play.conversionRunner].convRush += 1;
        }
      }
      // Defense
      if (play.defenders && Array.isArray(play.defenders)) {
        play.defenders.forEach((defenderName: string) => {
          initPlayer(defenderName);
          statsMap[defenderName].inferredTeam = defTeam;
          if (play.passOutcome === 'Interception') {
            statsMap[defenderName].int += 1;
            if (play.isPick6 || play.result === 'Pick 6') statsMap[defenderName].defTD += 1;
          } else if (play.passOutcome === 'PBU' || (play.playType === 'Pass' && play.passOutcome === 'Incomplete')) {
            statsMap[defenderName].pbu += 1;
          } else if (play.passOutcome === 'Sack') {
            statsMap[defenderName].sacks += 1;
            statsMap[defenderName].flagPulls += 1;
            if (play.isSafety || play.result === 'Safety') statsMap[defenderName].safeties += 1;
          } else if (play.passOutcome === 'FFL') {
            statsMap[defenderName].ffl += 1;
            statsMap[defenderName].flagPulls += 1;
            if (play.isSafety || play.result === 'Safety') statsMap[defenderName].safeties += 1;
          } else {
            statsMap[defenderName].flagPulls += 1;
          }
        });
      }
      if (play.flaggers && Array.isArray(play.flaggers)) {
        play.flaggers.forEach((flaggerName: string) => {
          initPlayer(flaggerName);
          const flaggerTeam = play.passOutcome === 'Interception' ? offTeam : defTeam;
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
        if (play.isPick6 || play.result === 'Pick 6') statsMap[play.interceptorPlayerId].defTD += 1;
      }
    });

    const targetTeamId = boxScoreTab === 'home' ? matchData?.homeTeamId : matchData?.awayTeamId;

    // Pre-populate roster players so every active player appears in the box score
    players.filter(p => p.teamId === targetTeamId).forEach(p => {
      initPlayer(p.playerName);
      statsMap[p.playerName].inferredTeam = targetTeamId;
    });

    const allStats = Object.values(statsMap).filter((s) => isTrackablePlayer(s.name));
    const filtered = allStats.filter(s => {
      // If we inferred a team from their plays, use that. Otherwise, try to fall back to the player's DB team.
      if (s.inferredTeam) {
        return s.inferredTeam === targetTeamId;
      }
      const p = players.find(player => player.playerName === s.name);
      if (!p) return true;
      return p.teamId === targetTeamId;
    });

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
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

  const getOrdinal = (n: number) => {
    if (n === 1) return "1st";
    if (n === 2) return "2nd";
    if (n === 3) return "3rd";
    return `${n}th`;
  };

  const downsPerSeries = settings?.rules?.downsPerSeries || 4;

  const formatPlaySentence = (play: any) => {
    const ctxMatch: any = matchData;
    return formatPlaySentenceEngine(play, {
      homeTeamName: ctxMatch?.homeTeamName,
      awayTeamName: ctxMatch?.awayTeamName,
      homeTeamId: ctxMatch?.homeTeamId,
      downsPerSeries,
    });
  };

  useEffect(() => {
    if (isDemoMatch) {
      const loadMatch = () => {
        const m = getSandboxMatch(matchId);
        if (m) setMatchData(m);
      };
      loadMatch();
      const unsub = subscribeDemoSandbox(() => loadMatch());
      return () => unsub();
    }
    const unsub = onSnapshot(doc(db, "matches", matchId), (docSnap) => {
      if (docSnap.exists()) {
        setMatchData({ ...docSnap.data(), id: docSnap.id });
      }
    }, (err) => {
      console.warn("ViewerView match snapshot warning:", err);
      const m = getSandboxMatch(matchId);
      if (m) setMatchData(m);
    });
    return () => unsub();
  }, [matchId, isDemoMatch]);

  useEffect(() => {
    if (isDemoMatch) {
      const loadDemoPlays = () => {
        const pList = getSandboxPlays(matchId);
        pList.sort((a: any, b: any) => {
          const tA = new Date(a.timestamp || 0).getTime();
          const tB = new Date(b.timestamp || 0).getTime();
          return tB - tA;
        });
        setPlays(pList);
      };
      loadDemoPlays();
      const unsub = subscribeDemoSandbox(() => loadDemoPlays());
      return () => unsub();
    }
    const q = query(
      collection(db, "plays"),
      where("matchId", "==", matchId),
      where("isHidden", "==", false),
      limit(500),
    );
    const unsub = onSnapshot(q, (snap) => {
      const p = snap.docs.map(d => d.data());
      p.sort((a, b) => {
        const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        if (tB !== tA) return tB - tA;
        const halfDiff = Number(b.half || 0) - Number(a.half || 0);
        if (halfDiff !== 0) return halfDiff;
        return Number(a.gameClock ?? 0) - Number(b.gameClock ?? 0);
      });
      setPlays(p);
    }, (err) => {
      console.warn("ViewerView plays snapshot warning:", err);
      setPlays(getSandboxPlays(matchId));
    });
    return () => unsub();
  }, [matchId, isDemoMatch]);

  if (isDenied) {
    return deniedElement;
  }

  const effectiveMatchData = matchData;

  if (!effectiveMatchData) {
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

  const s = effectiveMatchData.matchState || {
    homeScore: effectiveMatchData.homeScore || 0,
    awayScore: effectiveMatchData.awayScore || 0,
    half: 1,
    gameClock: 1200,
    currentDown: 1,
    possession: effectiveMatchData.homeTeamName || "HOME",
    homeTimeouts: 1,
    awayTimeouts: 1,
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(Math.max(0, seconds) / 60);
    const sec = Math.max(0, seconds) % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };
  const viewerGameState = getGameDisplayState(effectiveMatchData, now);
  const usesLiveClock = !effectiveMatchData.isAsyncStatKeeping && !effectiveMatchData.isIndependent;
  const periodLabel = `${getOrdinal(s.half)} ${!usesLiveClock ? "Half" : resolvePeriodFormat(settings.rules, s).periodType === "quarters" ? "Quarter" : "Half"}`;
  const isDemoFrozen = isDemoMatch && effectiveMatchData.status === "in_progress";
  const badgeState: GameDisplayState = isDemoFrozen ? "paused" : viewerGameState;
  const badgeLabel = isDemoFrozen ? "Sample" : GAME_STATE_LABEL[viewerGameState];
  const homeName = effectiveMatchData.homeTeamName || "HOME";
  const awayName = effectiveMatchData.awayTeamName || "AWAY";
  const possessionName = s.possession === homeName || s.possession === awayName ? s.possession : null;
  const timeoutsText = (n: number) => `${n} timeout${n === 1 ? "" : "s"} left`;

  type StatCol = { key: GlossaryKey; label: string; core?: boolean; value: (r: any) => string | number };
  const OFFENSE_COLS: StatCol[] = [
    { key: "cAtt", label: "C/ATT", core: true, value: (r) => `${r.passComp}/${r.passAtt}` },
    { key: "cmpPct", label: "CMP%", value: (r) => (r.passAtt ? `${Math.round((r.passComp / r.passAtt) * 100)}%` : "?") },
    { key: "passTd", label: "PASS TD", core: true, value: (r) => r.passTD },
    { key: "intThrown", label: "INT", value: (r) => r.passInt },
    { key: "firstDown", label: "PASS 1D", value: (r) => r.passFD },
    { key: "rec", label: "REC", core: true, value: (r) => r.receptions },
    { key: "td", label: "REC TD", value: (r) => r.recTD },
    { key: "firstDown", label: "REC 1D", value: (r) => r.recFD },
    { key: "rush", label: "RUSH", core: true, value: (r) => r.rushAtt },
    { key: "td", label: "RUSH TD", value: (r) => r.rushTD },
    { key: "firstDown", label: "RUSH 1D", value: (r) => r.rushFD },
    { key: "patPass", label: "PAT PASS", value: (r) => r.convPass },
    { key: "patRec", label: "PAT REC", value: (r) => r.convRec },
    { key: "patRush", label: "PAT RUSH", value: (r) => r.convRush },
    { key: "totalTd", label: "TOT TD", core: true, value: (r) => r.recTD + r.rushTD + r.defTD },
  ];
  const DEFENSE_COLS: StatCol[] = [
    { key: "flagPull", label: "FLAGS", core: true, value: (r) => r.flagPulls },
    { key: "sack", label: "SACKS", core: true, value: (r) => r.sacks },
    { key: "defInt", label: "INT", core: true, value: (r) => r.int },
    { key: "pbu", label: "PBU", core: true, value: (r) => r.pbu },
    { key: "ffl", label: "FFL", value: (r) => r.ffl },
    { key: "defTd", label: "DEF TD", core: true, value: (r) => r.defTD },
    { key: "saf", label: "SAF", value: (r) => r.safeties },
  ];
  const boxRows = activeTab === "box-score" ? calculateBoxScore() : [];
  const hasOffense = (r: any) => r.passAtt || r.receptions || r.rushAtt || r.convPass || r.convRec || r.convRush || r.recTD || r.rushTD;
  const hasDefense = (r: any) => r.flagPulls || r.sacks || r.int || r.pbu || r.ffl || r.defTD || r.safeties;
  const offenseRows = boxRows.filter(hasOffense);
  const defenseRows = boxRows.filter(hasDefense);
  const idleRows = boxRows.filter((r) => !hasOffense(r) && !hasDefense(r));
  const renderStatTable = (title: string, cols: StatCol[], rows: any[]) => (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] dark:text-neutral-400">{title}</h3>
      <div className="overflow-x-auto scrollbar-thin -mx-3 sm:mx-0">
        <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/10 text-[var(--text-muted)] dark:text-neutral-400 font-bold uppercase tracking-wider text-[11px]">
              <th className="sticky left-0 z-10 bg-white dark:bg-neutral-900 pb-3 pl-3 sm:pl-0 pr-3">Player</th>
              {cols.map((c) => (
                <th key={c.label} className={`pb-3 px-2 sm:px-3 text-center ${!c.core && !showAllStats ? "hidden sm:table-cell" : ""}`}>
                  <button type="button" onClick={() => setActiveTerm(c.key)} className="uppercase underline decoration-dotted underline-offset-4 hover:text-cyan-500" title={`What is ${c.label}?`}>
                    {c.label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((stat: any) => (
              <tr key={stat.name} className="group">
                <td className="sticky left-0 z-10 max-w-[7.5rem] sm:max-w-none truncate bg-white dark:bg-neutral-900 group-hover:bg-slate-50 dark:group-hover:bg-neutral-800 py-2.5 pl-3 sm:pl-0 pr-3 font-bold text-slate-900 dark:text-white" title={stat.name}>
                  <span className="sm:hidden">{shortPlayerName(stat.name)}</span>
                  <span className="hidden sm:inline">{stat.name}</span>
                </td>
                {cols.map((c) => (
                  <td key={c.label} className={`py-2.5 px-2 sm:px-3 text-center tabular-nums text-slate-700 dark:text-neutral-300 font-medium group-hover:bg-slate-50 dark:group-hover:bg-white/5 ${!c.core && !showAllStats ? "hidden sm:table-cell" : ""}`}>
                    {c.value(stat)}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={cols.length + 1} className="py-6 text-center text-slate-400 dark:text-neutral-600 font-bold">No {title.toLowerCase()} stats yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <div className="h-[calc(100dvh-var(--role-switcher-height,0px)-var(--pbp-banner-height,0px))] bg-black text-white font-sans flex flex-col">
      <header data-tour="viewer-header" className="sticky top-0 z-30 bg-neutral-900/90 backdrop-blur-md border-b border-white/10 p-2 sm:p-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {!isEmbedded && (
            <Link href={`/matches/${matchId}`} className="flex items-center text-neutral-400 hover:text-white transition-colors bg-black p-2.5 rounded-2xl border border-white/10">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          )}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-transparent overflow-hidden p-0.5 shrink-0"
            >
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.leagueName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <Shield className="w-4 h-4 fill-white/20 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black uppercase tracking-wider text-sm text-white">{renderFlagOS(settings.leagueName)}</span>
                {settings.shortcode && (
                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-cyan-300 font-bold">
                    {settings.shortcode}
                  </span>
                )}
                <span className="text-[10px] text-[var(--text-muted)] font-bold hidden sm:inline">• Live Scoreboard</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
                <span>{settings.seasonTitle || "2026 Season"}</span>
                {effectiveMatchData?.week && <span>• {effectiveMatchData.week}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-neutral-400">
          {isDemoMatch && isLeagueAdmin && (
            <div data-guide="viewer-demo-controls" className="flex items-center gap-2 mr-2">
              <button
                onClick={() => {
                  updateSandboxMatch(matchId, { status: "in_progress" });
                  window.location.reload();
                }}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold border border-cyan-500/40 transition-colors flex items-center gap-1.5 shadow-sm"
                title="Open live play-by-play tracker in demo sandbox"
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open Live Manager</span>
              </button>
              <button
                onClick={() => {
                  if (!confirm("Reset this demo match to pre-game state (0-0 score, all plays cleared)?")) return;
                  deleteSandboxPlaysForMatch(matchId);
                  updateSandboxMatch(matchId, {
                    status: "scheduled",
                    homeScore: 0,
                    awayScore: 0,
                    matchState: null,
                    didNotPlay: [],
                  });
                  window.location.reload();
                }}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-bold border border-white/10 transition-colors flex items-center gap-1.5"
                title="Reset demo match and purge sandbox plays"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset Match</span>
              </button>
            </div>
          )}
          <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-bold text-[10px] uppercase ${GAME_STATE_BADGE[badgeState]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${GAME_STATE_DOT[badgeState]}`}></span>
            {badgeLabel}
          </span>
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-neutral-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
            <MapPin className="w-3 h-3 text-cyan-400" />
            <span>{effectiveMatchData.location || settings.defaultLocation}</span>
          </span>
          {isEmbedded ? <PageGuideButton /> : <SiteControls />}
        </div>
      </header>

      {isDemoFrozen && (
        <div data-tour="viewer-demo-frozen" className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-[11px] sm:text-xs font-semibold text-amber-100">
          <span className="font-black uppercase tracking-wider text-amber-300">Sample game · frozen</span>{" "}
          at {periodLabel}{s.gameClock != null && usesLiveClock ? ` ${formatTime(s.gameClock)}` : ""}. It does not advance on its own; in a real league this page updates as the scorekeeper logs each play.
        </div>
      )}
      <div data-tour="viewer-scoreboard" className="bg-neutral-950 p-2 sm:p-3 md:p-4 border-b border-white/10 shrink-0">
        <div className="max-w-4xl mx-auto flex flex-row items-center justify-between gap-1 sm:gap-2 md:gap-0">
          <div data-testid="home-scoreboard" className="flex flex-col items-center gap-1 md:gap-4 w-1/3 rounded-2xl border p-2" style={{ backgroundColor: homeColors.secondary, borderColor: `${homeColors.primary}40`, color: homeText }}>
            <div className="flex flex-col md:flex-row items-center gap-1 md:gap-4 text-center">
              <FootballIcon active={s.possession === (effectiveMatchData.homeTeamName || "HOME")} className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
              <span className="text-[11px] sm:text-sm md:text-lg font-black uppercase leading-tight line-clamp-2">{effectiveMatchData.homeTeamName || "HOME"}</span>
            </div>
            <span className="text-2xl sm:text-3xl md:text-5xl font-black leading-none">{s.homeScore}</span>
            {!effectiveMatchData.isAsyncStatKeeping && !effectiveMatchData.isIndependent && (
              <div className="flex gap-1 md:gap-2">
                {Array.from({ length: settings.rules?.timeoutsPerTeam ?? 2 }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-2.5 md:h-2.5 rounded-full" style={{ backgroundColor: i < (s.homeTimeouts ?? 0) ? homeText : "#262626" }}></div>
                ))}
              </div>
            )}
            {usesLiveClock && effectiveMatchData.status !== "completed" && (
              <span className="text-[10px] sm:text-xs font-bold opacity-80 leading-none">{timeoutsText(s.homeTimeouts ?? 0)}</span>
            )}
          </div>

          <div className="flex flex-col items-center gap-0.5 sm:gap-1 md:gap-2 w-1/3">
            <span className="text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: homeAccent }}>
              {effectiveMatchData.status === "completed" ? "Final" : periodLabel}
            </span>
            {s.gameClock != null && !effectiveMatchData.isAsyncStatKeeping && !effectiveMatchData.isIndependent ? (
              <LiveGameClock state={viewerGameState === "live" ? s : { ...s, gameClockRunning: false }} className="text-xl sm:text-2xl md:text-4xl font-black leading-none text-white tracking-tighter tabular-nums" />
            ) : (
              <span className="text-base sm:text-xl md:text-3xl font-black leading-none text-emerald-400 uppercase tracking-widest">
                {effectiveMatchData.status === "completed" ? "Game Complete" : s.half === 2 ? "2nd Half" : "1st Half"}
              </span>
            )}
            {effectiveMatchData.status !== "completed" && (
              <button type="button" onClick={() => openGlossary("down")} title="What is a down?" className="mt-0.5 sm:mt-1 md:mt-2 bg-black border border-white/10 rounded-full px-2 py-0.5 sm:px-3 sm:py-1 md:px-4 md:py-1 flex gap-2 sm:gap-4 text-[10px] sm:text-xs md:text-sm font-bold hover:border-cyan-400/50">
                <span className="text-[var(--text-muted)] whitespace-nowrap underline decoration-dotted underline-offset-2">{getOrdinal(s.currentDown)} Down</span>
              </button>
            )}
          </div>

          <div data-testid="away-scoreboard" className="flex flex-col items-center gap-1 md:gap-4 w-1/3 rounded-2xl border p-2" style={{ backgroundColor: awayColors.secondary, borderColor: `${awayColors.primary}40`, color: awayText }}>
            <div className="flex flex-col md:flex-row items-center gap-1 md:gap-4 text-center">
              <span className="text-[11px] sm:text-sm md:text-lg font-black uppercase leading-tight line-clamp-2 order-2 md:order-1">{effectiveMatchData.awayTeamName || "AWAY"}</span>
              <FootballIcon active={s.possession === (effectiveMatchData.awayTeamName || "AWAY")} className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 order-1 md:order-2" />
            </div>
            <span className="text-2xl sm:text-3xl md:text-5xl font-black leading-none">{s.awayScore}</span>
            {!effectiveMatchData.isAsyncStatKeeping && !effectiveMatchData.isIndependent && (
              <div className="flex gap-1 md:gap-2">
                {Array.from({ length: settings.rules?.timeoutsPerTeam ?? 2 }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-2.5 md:h-2.5 rounded-full" style={{ backgroundColor: i < (s.awayTimeouts ?? 0) ? awayText : "#262626" }}></div>
                ))}
              </div>
            )}
            {usesLiveClock && effectiveMatchData.status !== "completed" && (
              <span className="text-[10px] sm:text-xs font-bold opacity-80 leading-none">{timeoutsText(s.awayTimeouts ?? 0)}</span>
            )}
          </div>
        </div>
        <div data-tour="viewer-possession" className="max-w-4xl mx-auto mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] sm:text-xs font-bold text-neutral-300">
          <span className={`sm:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase ${GAME_STATE_BADGE[badgeState]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${GAME_STATE_DOT[badgeState]}`}></span>
            {badgeLabel}
          </span>
          {effectiveMatchData.status !== "completed" && possessionName && (
            <span className="inline-flex items-center gap-1.5">
              <FootballIcon active className="w-3.5 h-3.5" />
              {possessionName} has the ball
            </span>
          )}
        </div>
      </div>

      <div data-tour="viewer-tabs" className="bg-neutral-900 border-b border-white/10 shrink-0">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={() => setActiveTab('play-by-play')}
            style={activeTab === "play-by-play" ? { color: homeAccent, borderColor: homeAccent } : undefined}
            className={`flex-1 py-3 sm:py-4 font-bold tracking-widest uppercase text-xs sm:text-sm transition-colors ${activeTab === 'play-by-play' ? 'border-b-2' : 'text-[var(--text-muted)] hover:text-white'}`}
          >
            Play-by-Play
          </button>
          <button
            onClick={() => setActiveTab('box-score')}
            style={activeTab === "box-score" ? { color: homeAccent, borderColor: homeAccent } : undefined}
            className={`flex-1 py-3 sm:py-4 font-bold tracking-widest uppercase text-xs sm:text-sm transition-colors ${activeTab === 'box-score' ? 'border-b-2' : 'text-[var(--text-muted)] hover:text-white'}`}
          >
            Live Box Score
          </button>
          <button
            onClick={() => setActiveTab('team-stats')}
            style={activeTab === "team-stats" ? { color: homeAccent, borderColor: homeAccent } : undefined}
            className={`flex-1 py-3 sm:py-4 font-bold tracking-widest uppercase text-xs sm:text-sm transition-colors ${activeTab === 'team-stats' ? 'border-b-2' : 'text-[var(--text-muted)] hover:text-white'}`}
          >
            Team Stats
          </button>
          <button
            type="button"
            data-tour="viewer-terms"
            onClick={() => openGlossary(null)}
            aria-label="Flag football terms"
            title="New to flag football? Tap for terms"
            className="shrink-0 px-3 sm:px-4 flex items-center gap-1.5 text-[var(--text-muted)] hover:text-white font-bold uppercase tracking-widest text-[10px] sm:text-xs"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Terms</span>
          </button>
        </div>
      </div>

      <div
        ref={feedScrollRef}
        onScroll={(e) => setShowJumpToLatest(e.currentTarget.scrollTop > 400)}
        className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 bg-black"
      >
        <div className="max-w-4xl mx-auto flex flex-col gap-3 sm:gap-4">
          {activeTab === 'play-by-play' && (
            <>
              {plays.length === 0 && (
                <div className="text-neutral-600 text-center font-bold">No plays logged yet.</div>
              )}
              {plays.map((play, idx) => (
                <div
                  key={idx}
                  data-tour={idx === 0 ? "viewer-latest-play" : undefined}
                  className={`bg-neutral-900 border p-4 sm:p-6 rounded-2xl flex flex-col gap-2 shadow-lg ${idx === 0 ? "border-cyan-400/50 ring-1 ring-cyan-400/30" : "border-white/5"}`}
                >
                  {idx === 0 && (
                    <span className="self-start rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-cyan-300">Latest play</span>
                  )}
                  <div className="flex justify-between items-center text-xs sm:text-sm font-bold tracking-widest text-[var(--text-muted)] uppercase">
                    <span>
                      {[
                        play.half
                          ? !effectiveMatchData.isAsyncStatKeeping && !effectiveMatchData.isIndependent &&
                            (settings.rules?.periodType === "quarters" || play.half > 2)
                            ? `Q${play.half}`
                            : play.half === 2
                            ? "2nd Half"
                            : "1st Half"
                          : null,
                        !play.isAsyncStatKeeping && play.gameClock != null ? formatTime(play.gameClock) : null,
                        `${play.possessionTeamId === effectiveMatchData.homeTeamId ? effectiveMatchData.homeTeamName : effectiveMatchData.awayTeamName}${
                          play.down ? ` - ${getOrdinal(play.down)} Down` : ""
                        }`,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </span>
                    <span className="shrink-0 pl-2">{(play.points || play.pointsScored) > 0 ? `+${play.points || play.pointsScored} PTS` : ''}</span>
                  </div>
                  <p className="text-base sm:text-xl text-white font-medium whitespace-pre-wrap">
                    {formatPlaySentence(play)}
                  </p>
                </div>
              ))}
            </>
          )}

          {activeTab === 'box-score' && (
            <div className="flex flex-col gap-4">
              {/* Team Selector Tabs for Box Score */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBoxScoreTab('home')}
                  style={boxScoreTab === "home" ? getTeamBadgeStyle({ primaryColor: homeColors.primary, secondaryColor: homeColors.secondary }) : undefined}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                    boxScoreTab === 'home'
                      ? 'shadow-sm'
                      : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                  }`}
                >
                  {effectiveMatchData.homeTeamName || "Home Team"}
                </button>
                <button
                  onClick={() => setBoxScoreTab('away')}
                  style={boxScoreTab === "away" ? getTeamBadgeStyle({ primaryColor: awayColors.primary, secondaryColor: awayColors.secondary }) : undefined}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                    boxScoreTab === 'away'
                      ? 'shadow-sm'
                      : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                  }`}
                >
                  {effectiveMatchData.awayTeamName || "Away Team"}
                </button>
              </div>

              <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/5 rounded-2xl p-3 sm:p-6 shadow-md flex flex-col gap-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400">Tap a column name to see what it means.</p>
                  <button
                    type="button"
                    onClick={() => setShowAllStats((v) => !v)}
                    className="sm:hidden rounded-lg border border-slate-200 dark:border-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-neutral-200"
                  >
                    {showAllStats ? "Fewer stats" : "More stats"}
                  </button>
                </div>
                <GlossaryDefinitionBar termKey={activeTerm} onClose={() => setActiveTerm(null)} />
                {renderStatTable("Offense", OFFENSE_COLS, offenseRows)}
                {renderStatTable("Defense", DEFENSE_COLS, defenseRows)}
                {idleRows.length > 0 && (
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                    <span className="font-bold">No stats yet:</span> {idleRows.map((r) => r.name).join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'team-stats' && (
            <GameTeamStats matchData={effectiveMatchData} plays={plays} isDemo={isDemoMatch} />
          )}
        </div>
      </div>
      {activeTab === "play-by-play" && showJumpToLatest && (
        <button
          type="button"
          onClick={() => feedScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-5 right-4 z-40 inline-flex items-center gap-1.5 rounded-full bg-cyan-500 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-black shadow-xl hover:bg-cyan-400"
        >
          <ArrowUp className="w-4 h-4" /> Jump to latest
        </button>
      )}
      <FootballGlossaryModal open={glossaryOpen} onClose={() => setGlossaryOpen(false)} highlight={glossaryHighlight} />
      {!isEmbedded && <PoweredByFooter compact />}
    </div>
  );
}

function formatClock(seconds: number) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const sec = Math.max(0, seconds) % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/** Ticks locally between scorekeeper saves so the clock keeps moving for viewers. */
function LiveGameClock({ state, className }: { state: { gameClock?: number | null; gameClockRunning?: boolean; gameClockSavedAt?: number | null }; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  const running = !!state.gameClockRunning;
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [running, state.gameClockSavedAt]);
  return <span className={className}>{formatClock(projectGameClock(state, now) ?? 0)}</span>;
}
