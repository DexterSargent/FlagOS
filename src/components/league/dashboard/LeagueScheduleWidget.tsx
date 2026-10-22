"use client";

import React from "react";
import Link from "next/link";
import {
  Radio,
  CalendarDays,
  ArrowRight,
  Clock,
  MapPin,
  PlayCircle,
  ChevronRight,
} from "lucide-react";
import { TeamLogo } from "@/components/TeamAssets";
import { useLeague } from "@/lib/leagueContext";
import { getGameDisplayState, isFinalGameStatus, isStartedGameStatus, useNow } from "@/lib/gameLiveState";

export interface LeagueScheduleWidgetProps {
  games: any[];
  liveCount: number;
  teams: any[];
  standingsMap: Record<string, any>;
  isLeagueAdmin?: boolean;
  isEmbedded?: boolean;
  isDemo?: boolean;
}

export function LeagueScheduleWidget({
  games,
  liveCount,
  teams,
  standingsMap,
  isLeagueAdmin,
  isEmbedded,
  isDemo,
}: LeagueScheduleWidgetProps) {
  const { settings } = useLeague();
  const periodPrefix = settings.rules?.periodType === "quarters" ? "Q" : "H";
  const formatClock = (seconds: number) => {
    const m = Math.floor(Math.max(0, seconds) / 60);
    const s = Math.max(0, seconds) % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const now = useNow();
  const isLive = (m: any) => isStartedGameStatus(m.status) && !isFinalGameStatus(m.status);

  return (
    <section className="bg-surface-raised border border-line rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-line-subtle">
        <div>
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-red-500 animate-pulse" />
            <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white">
              Live & Upcoming Games
            </h2>
            {liveCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span>{liveCount} Live Now</span>
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time live scores, active match clocks, and next scheduled games across the league.
          </p>
        </div>

        <Link
          href="/schedule"
          className="px-4 py-2 bg-surface-muted hover:bg-white/10 text-neutral-200 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl border border-line transition-colors flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <CalendarDays className="w-3.5 h-3.5 text-cyan-400" />
          <span>View Full Schedule</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {games.length === 0 ? (
        <div className="p-8 text-center text-neutral-500 text-xs italic bg-black/40 rounded-2xl border border-line-subtle flex flex-col items-center justify-center gap-3">
          <CalendarDays className="w-8 h-8 text-neutral-600" />
          <p>No live or upcoming games scheduled at the moment.</p>
          <Link
            href="/schedule"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all"
          >
            Check Schedule Calendar
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {games.map((m) => {
            const hTeam = teams.find((t) => t.id === m.homeTeamId);
            const aTeam = teams.find((t) => t.id === m.awayTeamId);
            const live = isLive(m);
            const paused = live && getGameDisplayState(m, now) === "paused";
            const hScore = m.homeScore ?? m.matchState?.homeScore ?? 0;
            const aScore = m.awayScore ?? m.matchState?.awayScore ?? 0;

            const hRecord = standingsMap[m.homeTeamId]
              ? `${standingsMap[m.homeTeamId].w}-${standingsMap[m.homeTeamId].l}`
              : "0-0";
            const aRecord = standingsMap[m.awayTeamId]
              ? `${standingsMap[m.awayTeamId].w}-${standingsMap[m.awayTeamId].l}`
              : "0-0";

            return (
              <div
                key={m.id}
                className={`p-5 rounded-2xl transition-all flex flex-col justify-between relative overflow-hidden group ${paused
                  ? "bg-black/60 border-2 border-amber-500/40 hover:border-amber-400/70"
                  : live
                  ? "bg-gradient-to-br from-[#1C0B0E]/95 via-[#0D101A] to-[#07090E] border-2 border-red-500/50 shadow-[0_0_25px_rgba(239,68,68,0.2)] hover:border-red-400"
                  : "bg-black/60 border border-line hover:border-cyan-500/40"
                  }`}
              >
                {/* Live Accent Glow */}
                {live && !paused && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none"></div>
                )}

                <div>
                  {/* Card Status & Timing Header */}
                  <div className="flex items-center justify-between text-[11px] mb-3 pb-2.5 border-b border-line-subtle">
                    {paused ? (
                      <div className="flex items-center gap-2">
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
                        <span className="font-black uppercase tracking-wider text-amber-400 text-[11px]">
                          PAUSED
                        </span>
                        <span className="text-neutral-400 font-mono text-[10px]">
                          {m.matchState?.half
                            ? m.isAsyncStatKeeping || m.isIndependent
                              ? `H${m.matchState.half}`
                              : `${periodPrefix}${m.matchState.half}`
                            : m.week || "In Progress"}
                        </span>
                      </div>
                    ) : live ? (
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                        <span className="font-black uppercase tracking-wider text-red-500 animate-pulse text-[11px]">
                          LIVE
                        </span>
                        <span className="text-neutral-400 font-mono text-[10px]">
                          {m.matchState?.half
                            ? m.isAsyncStatKeeping || m.isIndependent
                              ? `H${m.matchState.half}`
                              : `${periodPrefix}${m.matchState.half}`
                            : m.week || "In Progress"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 font-mono text-neutral-400">
                        <span className="font-bold text-white uppercase">{m.week || "Gameday"}</span>
                      </div>
                    )}

                    {/* Clock or Time */}
                    {live ? (
                      <span className={`px-2 py-0.5 rounded-lg font-mono text-xs font-black tracking-wider flex items-center gap-1 ${paused ? "bg-amber-500/10 border border-amber-500/30 text-amber-300" : "bg-red-500/20 border border-red-500/30 text-red-300"}`}>
                        <Clock className={`w-3 h-3 shrink-0 ${paused ? "text-amber-400" : "text-red-400"}`} />
                        <span>{formatClock(m.matchState?.gameClock ?? 1200)}</span>
                      </span>
                    ) : (
                      <span className="text-cyan-400 font-semibold font-mono text-xs">
                        {m.time || "Scheduled"}
                      </span>
                    )}
                  </div>

                  {/* Teams & Scores */}
                  <div className="space-y-2 mb-3">
                    {/* Home Team */}
                    <div
                      className={`flex items-center justify-between p-2 rounded-xl border transition-colors ${live
                        ? "bg-black/50 border-line-subtle"
                        : "bg-surface-muted border-line-subtle hover:bg-white/10"
                        }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-black/60 border border-line p-1 flex items-center justify-center shrink-0">
                          <TeamLogo
                            teamName={m.homeTeamName}
                            logoUrl={hTeam?.logoUrl}
                            icon={hTeam?.icon}
                            className="w-full h-full object-contain"
                            isDemo={isDemo}
                            primaryColor={hTeam?.primaryColor || hTeam?.color}
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-sm text-white truncate block">
                            {m.homeTeamName}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            HOME {!live && `• ${hRecord}`}
                          </span>
                        </div>
                      </div>
                      {live ? (
                        <span className={`text-2xl font-black font-mono tabular-nums pl-2 shrink-0 ${hScore >= aScore ? "text-white" : "text-neutral-500"}`}>
                          {hScore}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-neutral-500 uppercase">HOME</span>
                      )}
                    </div>

                    {/* Away Team */}
                    <div
                      className={`flex items-center justify-between p-2 rounded-xl border transition-colors ${live
                        ? "bg-black/50 border-line-subtle"
                        : "bg-surface-muted border-line-subtle hover:bg-white/10"
                        }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-black/60 border border-line p-1 flex items-center justify-center shrink-0">
                          <TeamLogo
                            teamName={m.awayTeamName}
                            logoUrl={aTeam?.logoUrl}
                            icon={aTeam?.icon}
                            className="w-full h-full object-contain"
                            isDemo={isDemo}
                            primaryColor={aTeam?.primaryColor || aTeam?.color}
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-sm text-white truncate block">
                            {m.awayTeamName}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            AWAY {!live && `• ${aRecord}`}
                          </span>
                        </div>
                      </div>
                      {live ? (
                        <span className={`text-2xl font-black font-mono tabular-nums pl-2 shrink-0 ${aScore >= hScore ? "text-white" : "text-neutral-500"}`}>
                          {aScore}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-neutral-500 uppercase">AWAY</span>
                      )}
                    </div>
                  </div>

                  {/* Situational indicator for Live Games */}
                  {live && m.matchState && (
                    <div className="text-[10px] text-neutral-400 font-mono flex items-center justify-between mb-3 px-1 py-1 rounded bg-black/30 border border-line-subtle">
                      <span>
                        Ball:{" "}
                        <strong className="text-cyan-400">
                          {m.matchState.possession || m.homeTeamName}
                        </strong>
                      </span>
                      {m.matchState.currentDown && (
                        <span>
                          Down: <strong className="text-amber-400">{m.matchState.currentDown}</strong>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Venue and Date */}
                  <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 mb-3 px-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <span className="truncate">{m.location || "Field 1"}</span>
                    <span>•</span>
                    <span className="truncate">{m.date}</span>
                  </div>
                </div>

                {/* Action CTA */}
                <div className="pt-2.5 border-t border-line-subtle">
                  {live ? (
                    <Link
                      href={isEmbedded ? `/matches/${m.id}/play-by-play?embed=true&demo=true` : `/matches/${m.id}/play-by-play`}
                      className={`w-full py-2.5 px-3 text-white text-xs font-bold uppercase tracking-wider rounded-xl text-center transition-all flex items-center justify-center gap-2 ${paused ? "bg-amber-600/80 hover:bg-amber-500" : "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-950/50"}`}
                    >
                      <PlayCircle className={`w-4 h-4 ${paused ? "" : "animate-pulse"}`} />
                      <span>{isLeagueAdmin ? (paused ? "Resume Scorekeeper" : "Manage Scorekeeper") : paused ? "View Play-by-Play" : "Watch Live Play-by-Play"}</span>
                    </Link>
                  ) : isEmbedded ? (
                    <div className="w-full py-2.5 px-3 bg-surface-muted text-neutral-400 text-xs font-bold rounded-xl border border-line text-center flex items-center justify-center gap-1.5 cursor-default">
                      <span>Game Scheduled</span>
                    </div>
                  ) : (
                    <Link
                      href={isLeagueAdmin ? `/matches/${m.id}/play-by-play` : `/matches/${m.id}`}
                      className="w-full py-2.5 px-3 bg-surface-muted hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold rounded-xl border border-line text-center transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>{isLeagueAdmin ? "Launch Scorekeeper" : "Game Preview & Details"}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default LeagueScheduleWidget;
