"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ChevronLeft, Shield, MapPin, Zap, RotateCcw } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, where, orderBy, limit } from "firebase/firestore";
import { useAuth } from "@/lib/authContext";
import { useLeague } from "@/lib/leagueContext";
import { renderFlagOS } from "@/components/FlagOSText";
import { usePrivateLeagueAccess } from "@/lib/usePrivateLeagueAccess";
import { formatPlaySentence as formatPlaySentenceEngine } from "@/lib/playSentenceFormatter";
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
import { useTheme } from "@/lib/themeContext";

export default function ViewerView({ params }: { params: Promise<{ id: string }> }) {
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
          convPass: 0, convRec: 0,
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
      // Defense
      if (play.defenders && Array.isArray(play.defenders)) {
        play.defenders.forEach((defenderName: string) => {
          initPlayer(defenderName);
          statsMap[defenderName].inferredTeam = defTeam;
          if (play.passOutcome === 'Interception') {
            statsMap[defenderName].int += 1;
            if (play.isPick6 || play.result === 'Pick 6') statsMap[defenderName].defTD += 1;
          } else if (play.passOutcome === 'PBU') {
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
        setMatchData(docSnap.data());
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
        return tB - tA;
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

  return (
    <div className="h-[100dvh] bg-black text-white font-sans flex flex-col">
      <header className="sticky top-0 z-30 bg-neutral-900/90 backdrop-blur-md border-b border-white/10 p-2 sm:p-3 flex items-center justify-between shrink-0">
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
                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-cyan-300 font-bold">
                    {settings.shortcode}
                  </span>
                )}
                <span className="text-[10px] text-neutral-500 font-bold hidden sm:inline">• Live Scoreboard</span>
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
            <div className="flex items-center gap-2 mr-2">
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
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE BROADCAST
          </span>
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-neutral-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
            <MapPin className="w-3 h-3 text-cyan-400" />
            <span>{effectiveMatchData.location || settings.defaultLocation}</span>
          </span>
        </div>
      </header>

      <div className="bg-neutral-950 p-2 sm:p-3 md:p-4 border-b border-white/10 shrink-0">
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
          </div>

          <div className="flex flex-col items-center gap-0.5 sm:gap-1 md:gap-2 w-1/3">
            <span className="text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: homeAccent }}>
              {effectiveMatchData.status === "completed" ? "Final" :
                `${getOrdinal(s.half)} ${effectiveMatchData.isAsyncStatKeeping || effectiveMatchData.isIndependent ? "Half" : settings.rules?.periodType === "quarters" ? "Quarter" : "Half"}`}
            </span>
            {s.gameClock != null && !effectiveMatchData.isAsyncStatKeeping && !effectiveMatchData.isIndependent ? (
              <span className="text-xl sm:text-2xl md:text-4xl font-black leading-none text-white tracking-tighter tabular-nums">{formatTime(s.gameClock)}</span>
            ) : (
              <span className="text-base sm:text-xl md:text-3xl font-black leading-none text-emerald-400 uppercase tracking-widest">
                {effectiveMatchData.status === "completed" ? "Game Complete" : s.half === 2 ? "2nd Half" : "1st Half"}
              </span>
            )}
            {effectiveMatchData.status !== "completed" && <div className="mt-0.5 sm:mt-1 md:mt-2 bg-black border border-white/10 rounded-full px-2 py-0.5 sm:px-3 sm:py-1 md:px-4 md:py-1 flex gap-2 sm:gap-4 text-[10px] sm:text-xs md:text-sm font-bold">
              <span className="text-neutral-500 whitespace-nowrap">{getOrdinal(s.currentDown)} Down</span>
            </div>}
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
          </div>
        </div>
      </div>

      <div className="bg-neutral-900 border-b border-white/10 shrink-0">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={() => setActiveTab('play-by-play')}
            style={activeTab === "play-by-play" ? { color: homeAccent, borderColor: homeAccent } : undefined}
            className={`flex-1 py-3 sm:py-4 font-bold tracking-widest uppercase text-xs sm:text-sm transition-colors ${activeTab === 'play-by-play' ? 'border-b-2' : 'text-neutral-500 hover:text-white'}`}
          >
            Play-by-Play
          </button>
          <button
            onClick={() => setActiveTab('box-score')}
            style={activeTab === "box-score" ? { color: homeAccent, borderColor: homeAccent } : undefined}
            className={`flex-1 py-3 sm:py-4 font-bold tracking-widest uppercase text-xs sm:text-sm transition-colors ${activeTab === 'box-score' ? 'border-b-2' : 'text-neutral-500 hover:text-white'}`}
          >
            Live Box Score
          </button>
          <button
            onClick={() => setActiveTab('team-stats')}
            style={activeTab === "team-stats" ? { color: homeAccent, borderColor: homeAccent } : undefined}
            className={`flex-1 py-3 sm:py-4 font-bold tracking-widest uppercase text-xs sm:text-sm transition-colors ${activeTab === 'team-stats' ? 'border-b-2' : 'text-neutral-500 hover:text-white'}`}
          >
            Team Stats
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 bg-black">
        <div className="max-w-4xl mx-auto flex flex-col gap-3 sm:gap-4">
          {activeTab === 'play-by-play' && (
            <>
              {plays.length === 0 && (
                <div className="text-neutral-600 text-center font-bold">No plays logged yet.</div>
              )}
              {plays.map((play, idx) => (
                <div key={idx} className="bg-neutral-900 border border-white/5 p-4 sm:p-6 rounded-2xl flex flex-col gap-2 shadow-lg">
                  <div className="flex justify-between items-center text-xs sm:text-sm font-bold tracking-widest text-neutral-500 uppercase">
                    <span>
                      {[
                        play.half
                          ? settings.rules?.periodType === "quarters" || play.half > 2
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
                    <span>{(play.points || play.pointsScored) > 0 ? `+${play.points || play.pointsScored} PTS` : ''}</span>
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

              <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-white/5 rounded-2xl p-3 sm:p-6 shadow-md overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-neutral-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="pb-4 pr-4">Player</th>
                      <th className="pb-4 px-3 text-center">C/ATT</th>
                      <th className="pb-4 px-3 text-center">PASS TD</th>
                      <th className="pb-4 px-3 text-center">PASS FD</th>
                      <th className="pb-4 px-3 text-center">INT</th>
                      <th className="pb-4 px-3 text-center">REC</th>
                      <th className="pb-4 px-3 text-center">REC TD</th>
                      <th className="pb-4 px-3 text-center">REC FD</th>
                      <th className="pb-4 px-3 text-center">RUSH</th>
                      <th className="pb-4 px-3 text-center">RUSH TD</th>
                      <th className="pb-4 px-3 text-center">RUSH FD</th>
                      <th className="pb-4 px-3 text-center">PAT PASS</th>
                      <th className="pb-4 px-3 text-center">PAT REC</th>
                      <th className="pb-4 px-3 text-center">FLAGS</th>
                      <th className="pb-4 px-3 text-center">FFL</th>
                      <th className="pb-4 px-3 text-center">SACKS</th>
                      <th className="pb-4 px-3 text-center">PBU</th>
                      <th className="pb-4 px-3 text-center">DEF INT</th>
                      <th className="pb-4 px-3 text-center">DEF TD</th>
                      <th className="pb-4 pl-3 text-center">SAF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {calculateBoxScore().map((stat: any, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3 pr-4 font-bold text-slate-900 dark:text-white">{stat.name}</td>
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-neutral-300 font-medium">{stat.passComp}/{stat.passAtt}</td>
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-neutral-300 font-medium">{stat.passTD}</td>
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-neutral-300 font-medium">{stat.passFD}</td>
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-neutral-300 font-medium">{stat.passInt}</td>
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-neutral-300 font-medium">{stat.receptions}</td>
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-neutral-300 font-medium">{stat.recTD}</td>
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-neutral-300 font-medium">{stat.recFD}</td>
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-neutral-300 font-medium">{stat.rushAtt}</td>
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-neutral-300 font-medium">{stat.rushTD}</td>
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-neutral-300 font-medium">{stat.rushFD}</td>
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-neutral-300 font-medium">{stat.convPass}</td>
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-neutral-300 font-medium">{stat.convRec}</td>
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-neutral-300 font-medium">{stat.flagPulls}</td>
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-neutral-300 font-medium">{stat.ffl}</td>
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-neutral-300 font-medium">{stat.sacks}</td>
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-neutral-300 font-medium">{stat.pbu}</td>
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-neutral-300 font-medium">{stat.int}</td>
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-neutral-300 font-medium">{stat.defTD}</td>
                        <td className="py-3 pl-3 text-center text-slate-700 dark:text-neutral-300 font-medium">{stat.safeties}</td>
                      </tr>
                    ))}
                    {calculateBoxScore().length === 0 && (
                      <tr>
                        <td colSpan={20} className="py-8 text-center text-slate-400 dark:text-neutral-600 font-bold">No stats logged yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'team-stats' && (
            <GameTeamStats matchData={effectiveMatchData} plays={plays} isDemo={isDemoMatch} />
          )}
        </div>
      </div>
    </div>
  );
}
