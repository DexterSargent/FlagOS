"use client";

import React from "react";
import { usePageGuide } from "@/lib/pageGuide";
import { SPECTATOR_DASHBOARD_WALKTHROUGH } from "@/lib/walkthroughs/league";
import Link from "next/link";
import { useLeague, leagueScheduleHref } from "@/lib/leagueContext";
import {
  CalendarDays,
  Trophy,
  UserPlus,
} from "lucide-react";
import { renderFlagOS } from "@/components/FlagOSText";
import { LeagueScheduleWidget } from "./LeagueScheduleWidget";
import { LeagueStandingsWidget } from "./LeagueStandingsWidget";
import { LeagueLeadersWidget } from "./LeagueLeadersWidget";
import { LeagueTeamsGrid } from "./LeagueTeamsGrid";

export interface SpectatorViewProps {
  settings: any;
  teams: any[];
  matches: any[];
  players: any[];
  upcomingMatches: any[];
  liveMatches: any[];
  liveAndUpcomingGames: any[];
  standingsMap: Record<string, any>;
  sortedStandings: any[];
  topPasser: any;
  topReceiver: any;
  topScorer: any;
  topFlagger: any;
  isEffectiveDemo: boolean;
  isEmbedded?: boolean;
  canRegisterAsPlayer?: boolean;
}

export function SpectatorView({
  settings,
  teams,
  matches,
  players,
  upcomingMatches,
  liveMatches,
  liveAndUpcomingGames,
  standingsMap,
  sortedStandings,
  topPasser,
  topReceiver,
  topScorer,
  topFlagger,
  isEffectiveDemo,
  isEmbedded,
  canRegisterAsPlayer,
}: SpectatorViewProps) {
  usePageGuide(SPECTATOR_DASHBOARD_WALKTHROUGH);
  const { activeLeagueId: scheduleLeagueId } = useLeague();
  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full max-w-full overflow-hidden space-y-8">
      {/* Fan & Spectator Hero Banner */}
      <div className="bg-gradient-to-r from-[#0C1222] via-[#0B0F19] to-[#0A101D] border border-line rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-line">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {settings?.seasonTitle || "Active Season"}
              </span>
              <span className="hidden sm:inline text-[var(--text-muted)] text-xs">•</span>
              <span className="hidden sm:inline text-[11px] font-mono text-neutral-400 uppercase">
                League Overview
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase tracking-tight text-white leading-tight">
              {renderFlagOS(settings?.leagueName)} Overview
            </h1>
            <p className="text-neutral-400 text-xs md:text-sm mt-1 max-w-2xl">
              {settings?.tagline ||
                "Follow live games, scores, standings, and player stats."}
            </p>
          </div>

          {/* Fan Quick Links */}
          {!isEmbedded && (
            <div data-tour="spectator-dashboard-links" className="flex flex-wrap items-center gap-3">
              <Link
                href={leagueScheduleHref(scheduleLeagueId)}
                className="px-5 py-2.5 bg-cyan-700 hover:bg-cyan-800 text-[#fff] text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)] flex items-center gap-2"
              >
                <CalendarDays className="w-4 h-4" />
                <span>Game Schedule</span>
              </Link>

              <Link
                href="/stats"
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider rounded-xl border border-white/15 transition-all flex items-center gap-2"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Standings & Stats</span>
              </Link>

              {canRegisterAsPlayer && settings?.rules?.enableFreeAgents !== false && (
                <Link
                  href="/join"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl border border-emerald-500/40 transition-colors flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Player Registration</span>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Spectator Snapshot Tiles */}
        <div data-tour="spectator-dashboard-snapshot" className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
          <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
            <span className="text-[11px] uppercase font-bold text-[var(--text-muted)] tracking-wider block">Active Teams</span>
            <div className="text-3xl font-black text-white mt-1 tabular-nums">{teams.length}</div>
            <span className="text-[11px] text-cyan-400 mt-1 block">This season</span>
          </div>

          <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
            <span className="text-[11px] uppercase font-bold text-[var(--text-muted)] tracking-wider block">Upcoming Games</span>
            <div className="text-3xl font-black text-white mt-1 tabular-nums">{upcomingMatches.length}</div>
            <span className="text-[11px] text-neutral-400 mt-1 block">On the schedule</span>
          </div>

          <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
            <span className="text-[11px] uppercase font-bold text-[var(--text-muted)] tracking-wider block">Scoring Leader</span>
            <div className="text-base sm:text-lg font-black text-white mt-1 leading-tight line-clamp-2 break-words">
              {topScorer?.name !== "-" ? topScorer?.name : "None yet"}
            </div>
            <span className="text-[11px] text-yellow-400 mt-1 block">{topScorer?.totalTD || 0} Touchdowns</span>
          </div>

          <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
            <span className="text-[11px] uppercase font-bold text-[var(--text-muted)] tracking-wider block">Passing Leader</span>
            <div className="text-base sm:text-lg font-black text-white mt-1 leading-tight line-clamp-2 break-words">
              {topPasser?.name !== "-" ? topPasser?.name : "None yet"}
            </div>
            <span className="text-[11px] text-cyan-400 mt-1 block">{topPasser?.passTD || 0} Pass TDs</span>
          </div>
        </div>
      </div>

      {/* Section: Live & Upcoming Games */}
      <div data-tour="dashboard-schedule"><LeagueScheduleWidget
        games={liveAndUpcomingGames}
        liveCount={liveMatches.length}
        teams={teams}
        standingsMap={standingsMap}
        isLeagueAdmin={false}
        isEmbedded={isEmbedded}
        isDemo={isEffectiveDemo}
      /></div>

      {/* 2-Column: Fan Standings & Stat Leaders */}
      <div data-tour="dashboard-standings" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <LeagueStandingsWidget
          sortedStandings={sortedStandings}
          teams={teams}
          isEffectiveDemo={isEffectiveDemo}
          limitCount={5}
        />
        <LeagueLeadersWidget
          topPasser={topPasser}
          topReceiver={topReceiver}
          topScorer={topScorer}
          topFlagger={topFlagger}
        />
      </div>

      {/* Team Showcase */}
      <LeagueTeamsGrid
        teams={teams}
        players={players}
        standingsMap={standingsMap}
        isEffectiveDemo={isEffectiveDemo}
        isEmbedded={isEmbedded}
        isAdminView={false}
      />

      {/* Player Registration CTA Banner */}
      {!isEmbedded && canRegisterAsPlayer && settings?.rules?.enableFreeAgents !== false && (
        <div className="bg-gradient-to-r from-emerald-950/40 via-[#0B0F19] to-cyan-950/40 border border-emerald-500/30 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Join the Competition</span>
            <h3 className="text-2xl font-black uppercase text-white mt-0.5">Want to play in the {renderFlagOS(settings?.leagueName)}?</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-xl">
              Register online as a free agent or join an active team roster to compete in official league matches.
            </p>
          </div>
          <Link
            href="/join"
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] shrink-0 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register as Player</span>
          </Link>
        </div>
      )}
    </div>
  );
}

export default SpectatorView;
