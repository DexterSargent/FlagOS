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
import { getYorkMatch, getYorkTeamPlaysForMatch } from "@/lib/yorkTeamData";

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

  const isDemoMatch = isDemoLeague || isEmbedded || checkIsDemoMatch(matchId, activeLeagueId);

  const { isDenied, deniedElement } = usePrivateLeagueAccess({
    isPrivateOverride: matchId.startsWith("match_live_"),
  });



  const [matchData, setMatchData] = useState<any>(null);
  const [plays, setPlays] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'play-by-play' | 'box-score'>('play-by-play');
  const [boxScoreTab, setBoxScoreTab] = useState<'home' | 'away'>('home');

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("embed") === "true") setIsEmbedded(true);
      const tabParam = sp.get("tab");
      if (tabParam === "box-score" || tabParam === "play-by-play") {
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
    const teamIds = [matchData.homeTeamId, matchData.awayTeamId].filter(Boolean);
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
          rushAtt: 0, rushTD: 0,
          convPass: 0, convRec: 0,
          flagPulls: 0, sacks: 0, ffl: 0, int: 0, defTD: 0, pbu: 0, safeties: 0,
        };
      }
    };

    plays.forEach(play => {
      const offTeam = play.possessionTeamId;
      const defTeam = offTeam === matchData?.homeTeamId ? matchData?.awayTeamId : matchData?.homeTeamId;

      // Passing
      const isConversionPlay = Boolean(
        play.isConversion === true ||
        play.playType === "Conversion" ||
        (!play.isTouchdown && (
          (play.conversionAttempt !== undefined && play.conversionAttempt !== null) ||
          play.conversionSuccess === true
        ))
      );

      // Passing
      if (play.playType === 'Pass' && play.qbPlayerId && !isConversionPlay) {
        initPlayer(play.qbPlayerId);
        statsMap[play.qbPlayerId].inferredTeam = offTeam;
        statsMap[play.qbPlayerId].passAtt += 1;
        if (play.passOutcome === 'Complete') statsMap[play.qbPlayerId].passComp += 1;
        if (play.isTouchdown) statsMap[play.qbPlayerId].passTD += 1;
        if (play.firstDown) statsMap[play.qbPlayerId].passFD += 1;
        if (play.passOutcome === 'Interception') statsMap[play.qbPlayerId].passInt += 1;
      }
      // Receiving
      if (play.playType === 'Pass' && play.passOutcome === 'Complete' && play.receiverPlayerId && !isConversionPlay) {
        initPlayer(play.receiverPlayerId);
        statsMap[play.receiverPlayerId].inferredTeam = offTeam;
        statsMap[play.receiverPlayerId].receptions += 1;
        if (play.isTouchdown) statsMap[play.receiverPlayerId].recTD += 1;
        if (play.firstDown) statsMap[play.receiverPlayerId].recFD += 1;
      }
      // Rushing
      if (play.playType === 'Run' && play.runnerPlayerId && !isConversionPlay) {
        initPlayer(play.runnerPlayerId);
        statsMap[play.runnerPlayerId].inferredTeam = offTeam;
        statsMap[play.runnerPlayerId].rushAtt += 1;
        if (play.isTouchdown) statsMap[play.runnerPlayerId].rushTD += 1;
      }
      // Conversions
      if (isConversionPlay) {
        if (play.conversionSuccess || play.passOutcome === 'Complete' || (play.points && play.points > 0)) {
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
      // Defense
      if (play.defenders && Array.isArray(play.defenders)) {
        play.defenders.forEach((defenderName: string) => {
          initPlayer(defenderName);
          statsMap[defenderName].inferredTeam = defTeam;
          if (play.passOutcome === 'Interception') {
            statsMap[defenderName].int += 1;
            if (play.isPick6) statsMap[defenderName].defTD += 1;
          } else if (play.passOutcome === 'PBU') {
            statsMap[defenderName].pbu += 1;
          } else if (play.passOutcome === 'Sack') {
            statsMap[defenderName].sacks += 1;
            statsMap[defenderName].flagPulls += 1;
            if (play.isSafety) statsMap[defenderName].safeties += 1;
          } else if (play.passOutcome === 'FFL') {
            statsMap[defenderName].ffl += 1;
            statsMap[defenderName].flagPulls += 1;
            if (play.isSafety) statsMap[defenderName].safeties += 1;
          } else {
            statsMap[defenderName].flagPulls += 1;
          }
        });
      }
    });

    const targetTeamId = boxScoreTab === 'home' ? matchData?.homeTeamId : matchData?.awayTeamId;

    // Pre-populate roster players so every active player appears in the box score
    players.filter(p => p.teamId === targetTeamId).forEach(p => {
      initPlayer(p.playerName);
      statsMap[p.playerName].inferredTeam = targetTeamId;
    });

    const allStats = Object.values(statsMap);
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
    return formatPlaySentenceEngine(play, {
      homeTeamName: matchData?.homeTeamName,
      awayTeamName: matchData?.awayTeamName,
      homeTeamId: matchData?.homeTeamId,
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
      } else {
        const ym = getYorkMatch(matchId);
        if (ym) setMatchData(ym);
      }
    }, (err) => {
      console.warn("ViewerView match snapshot warning:", err);
      const ym = getYorkMatch(matchId);
      if (ym) setMatchData(ym);
      else {
        const m = getSandboxMatch(matchId);
        if (m) setMatchData(m);
      }
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
      limit(500),
    );
    const unsub = onSnapshot(q, (snap) => {
      const p = snap.docs.map(d => d.data());
      if (p.length === 0) {
        const yp = getYorkTeamPlaysForMatch(matchId);
        if (yp.length > 0) {
          setPlays(yp);
          return;
        }
      }
      p.sort((a, b) => {
        const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return tB - tA;
      });
      setPlays(p);
    }, (err) => {
      console.warn("ViewerView plays snapshot warning:", err);
      const yp = getYorkTeamPlaysForMatch(matchId);
      if (yp.length > 0) {
        setPlays(yp);
      } else {
        const pList = getSandboxPlays(matchId);
        setPlays(pList);
      }
    });
    return () => unsub();
  }, [matchId, isDemoMatch]);

  if (isDenied) {
    return deniedElement;
  }

  const effectiveMatchData = matchData || getYorkMatch(matchId);

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

  const s = matchData.matchState || {
    homeScore: matchData.homeScore || 0,
    awayScore: matchData.awayScore || 0,
    half: 1,
    gameClock: 1200,
    currentDown: 1,
    possession: matchData.homeTeamName || "HOME",
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
                {matchData?.week && <span>• {matchData.week}</span>}
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
            <span>{matchData.location || settings.defaultLocation}</span>
          </span>
        </div>
      </header>

      <div className="bg-neutral-950 p-2 sm:p-3 md:p-4 border-b border-white/10 shrink-0">
        <div className="max-w-4xl mx-auto flex flex-row items-center justify-between gap-1 sm:gap-2 md:gap-0">
          <div className="flex flex-col items-center gap-1 md:gap-4 w-1/3">
            <div className="flex flex-col md:flex-row items-center gap-1 md:gap-4 text-center">
              <FootballIcon active={s.possession === (matchData.homeTeamName || "HOME")} className={`w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 ${s.possession === (matchData.homeTeamName || "HOME") ? 'text-cyan-400' : 'text-neutral-500'}`} />
              <span className="text-[11px] sm:text-sm md:text-lg font-black text-white uppercase leading-tight line-clamp-2">{matchData.homeTeamName || "HOME"}</span>
            </div>
            <span className="text-2xl sm:text-3xl md:text-5xl font-black text-cyan-400 leading-none">{s.homeScore}</span>
            {!matchData.isAsyncStatKeeping && !matchData.isIndependent && (
              <div className="flex gap-1 md:gap-2">
                {Array.from({ length: settings.rules?.timeoutsPerTeam ?? 2 }).map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-2.5 md:h-2.5 rounded-full ${i < (s.homeTimeouts ?? 0) ? 'bg-cyan-400' : 'bg-neutral-800'}`}></div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-0.5 sm:gap-1 md:gap-2 w-1/3">
            <span className="text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-widest text-cyan-400 whitespace-nowrap">
              {getOrdinal(s.half)} {settings.rules?.periodType === 'quarters' ? 'Quarter' : 'Half'}
            </span>
            {s.gameClock != null && !matchData.isAsyncStatKeeping && !matchData.isIndependent ? (
              <span className="text-xl sm:text-2xl md:text-4xl font-black leading-none text-white tracking-tighter tabular-nums">{formatTime(s.gameClock)}</span>
            ) : (
              <span className="text-base sm:text-xl md:text-3xl font-black leading-none text-emerald-400 uppercase tracking-widest">
                {s.half === 2 ? "2nd Half" : "1st Half"}
              </span>
            )}
            <div className="mt-0.5 sm:mt-1 md:mt-2 bg-black border border-white/10 rounded-full px-2 py-0.5 sm:px-3 sm:py-1 md:px-4 md:py-1 flex gap-2 sm:gap-4 text-[10px] sm:text-xs md:text-sm font-bold">
              <span className="text-neutral-500 whitespace-nowrap">{getOrdinal(s.currentDown)} Down</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 md:gap-4 w-1/3">
            <div className="flex flex-col md:flex-row items-center gap-1 md:gap-4 text-center">
              <span className="text-[11px] sm:text-sm md:text-lg font-black text-white uppercase leading-tight line-clamp-2 order-2 md:order-1">{matchData.awayTeamName || "AWAY"}</span>
              <FootballIcon active={s.possession === (matchData.awayTeamName || "AWAY")} className={`w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 order-1 md:order-2 ${s.possession === (matchData.awayTeamName || "AWAY") ? 'text-blue-500' : 'text-neutral-500'}`} />
            </div>
            <span className="text-2xl sm:text-3xl md:text-5xl font-black text-blue-500 leading-none">{s.awayScore}</span>
            {!matchData.isAsyncStatKeeping && !matchData.isIndependent && (
              <div className="flex gap-1 md:gap-2">
                {Array.from({ length: settings.rules?.timeoutsPerTeam ?? 2 }).map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-2.5 md:h-2.5 rounded-full ${i < (s.awayTimeouts ?? 0) ? 'bg-blue-500' : 'bg-neutral-800'}`}></div>
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
            className={`flex-1 py-3 sm:py-4 font-bold tracking-widest uppercase text-xs sm:text-sm transition-colors ${activeTab === 'play-by-play' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-neutral-500 hover:text-white'}`}
          >
            Play-by-Play
          </button>
          <button
            onClick={() => setActiveTab('box-score')}
            className={`flex-1 py-3 sm:py-4 font-bold tracking-widest uppercase text-xs sm:text-sm transition-colors ${activeTab === 'box-score' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-neutral-500 hover:text-white'}`}
          >
            Live Box Score
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
                      {play.half
                        ? settings.rules?.periodType === "quarters" || play.half > 2
                          ? `Q${play.half}`
                          : play.half === 2
                          ? "2nd Half"
                          : "1st Half"
                        : ""}
                      {!play.isAsyncStatKeeping && play.gameClock != null ? ` • ${formatTime(play.gameClock)}` : ""}
                      {" • "}
                      {play.possessionTeamId === matchData.homeTeamId ? matchData.homeTeamName : matchData.awayTeamName} - {getOrdinal(play.down)} Down
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
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                    boxScoreTab === 'home'
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm'
                      : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                  }`}
                >
                  {matchData.homeTeamName || "Home Team"}
                </button>
                <button
                  onClick={() => setBoxScoreTab('away')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                    boxScoreTab === 'away'
                      ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-sm'
                      : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                  }`}
                >
                  {matchData.awayTeamName || "Away Team"}
                </button>
              </div>

              <div className="bg-neutral-900 border border-white/5 rounded-2xl p-3 sm:p-6 shadow-lg overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-white/10 text-neutral-500 font-bold uppercase tracking-widest">
                      <th className="pb-4 pr-4">Player</th>
                      <th className="pb-4 px-4 text-center">C/ATT</th>
                      <th className="pb-4 px-4 text-center">PASS TD</th>
                      <th className="pb-4 px-4 text-center">PASS FD</th>
                      <th className="pb-4 px-4 text-center">INT</th>
                      <th className="pb-4 px-4 text-center">REC</th>
                      <th className="pb-4 px-4 text-center">REC TD</th>
                      <th className="pb-4 px-4 text-center">REC FD</th>
                      <th className="pb-4 px-4 text-center">RUSH</th>
                      <th className="pb-4 px-4 text-center">RUSH TD</th>
                      <th className="pb-4 px-4 text-center">FLAGS</th>
                      <th className="pb-4 px-4 text-center">FFL</th>
                      <th className="pb-4 px-4 text-center">SACKS</th>
                      <th className="pb-4 px-4 text-center">DEF INT</th>
                      <th className="pb-4 pl-4 text-center">DEF TD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {calculateBoxScore().map((stat: any, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 pr-4 font-bold text-white">{stat.name}</td>
                        <td className="py-3 px-4 text-center text-neutral-300">{stat.passComp}/{stat.passAtt}</td>
                        <td className="py-3 px-4 text-center text-neutral-300">{stat.passTD}</td>
                        <td className="py-3 px-4 text-center text-neutral-300">{stat.passFD}</td>
                        <td className="py-3 px-4 text-center text-neutral-300">{stat.passInt}</td>
                        <td className="py-3 px-4 text-center text-neutral-300">{stat.receptions}</td>
                        <td className="py-3 px-4 text-center text-neutral-300">{stat.recTD}</td>
                        <td className="py-3 px-4 text-center text-neutral-300">{stat.recFD}</td>
                        <td className="py-3 px-4 text-center text-neutral-300">{stat.rushAtt}</td>
                        <td className="py-3 px-4 text-center text-neutral-300">{stat.rushTD}</td>
                        <td className="py-3 px-4 text-center text-neutral-300">{stat.flagPulls}</td>
                        <td className="py-3 px-4 text-center text-neutral-300">{stat.ffl}</td>
                        <td className="py-3 px-4 text-center text-neutral-300">{stat.sacks}</td>
                        <td className="py-3 px-4 text-center text-neutral-300">{stat.int}</td>
                        <td className="py-3 pl-4 text-center text-neutral-300">{stat.defTD}</td>
                      </tr>
                    ))}
                    {calculateBoxScore().length === 0 && (
                      <tr>
                        <td colSpan={14} className="py-8 text-center text-neutral-600 font-bold">No stats logged yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
