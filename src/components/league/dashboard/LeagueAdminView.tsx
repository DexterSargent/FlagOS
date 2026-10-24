"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Crown,
  Lock,
  Copy,
  Check,
  Settings,
  Plus,
  Users,
  ChevronRight,
} from "lucide-react";
import { LeagueScheduleWidget } from "./LeagueScheduleWidget";
import { LeagueStandingsWidget } from "./LeagueStandingsWidget";
import { LeagueLeadersWidget } from "./LeagueLeadersWidget";
import { LeagueTeamsGrid } from "./LeagueTeamsGrid";
import WalkthroughTrigger from "@/components/walkthrough/WalkthroughTrigger";
import { LEAGUE_DIRECTORY_WALKTHROUGH } from "@/lib/walkthroughData";
import { useLeague } from "@/lib/leagueContext";

export interface LeagueAdminViewProps {
  teams: any[];
  matches: any[];
  players: any[];
  completedMatches: any[];
  standingsMap: Record<string, any>;
  sortedStandings: any[];
  liveMatches: any[];
  liveAndUpcomingGames: any[];
  topPasser: any;
  topReceiver: any;
  topScorer: any;
  topFlagger: any;
  subscription: any;
  settings: any;
  activeLeagueId: string;
  isEffectiveDemo: boolean;
  openCustomizer: () => void;
}

export function LeagueAdminView({
  teams,
  matches,
  players,
  completedMatches,
  standingsMap,
  sortedStandings,
  liveMatches,
  liveAndUpcomingGames,
  topPasser,
  topReceiver,
  topScorer,
  topFlagger,
  subscription,
  settings,
  activeLeagueId,
  isEffectiveDemo,
  openCustomizer,
}: LeagueAdminViewProps) {
  const [copiedLeagueLink, setCopiedLeagueLink] = useState(false);
  const { isLeagueArchived } = useLeague();

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 flex-1 w-full max-w-full space-y-5 sm:space-y-8">
      {/* League Command Center Hero Banner */}
      <div className="bg-surface-raised border border-line rounded-3xl p-4 sm:p-6 md:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 pb-4 sm:pb-6 border-b border-line">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-300 uppercase tracking-widest">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                League Commissioner Hub
              </span>
              <span className="hidden sm:inline text-neutral-500 text-xs">•</span>
              <span className="hidden sm:inline text-[11px] font-mono text-neutral-400 uppercase">
                Full Administrative Access
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase tracking-tight text-white">
              League Command Center
            </h1>
            <p className="text-neutral-400 text-xs md:text-sm mt-1 max-w-2xl">
              Centralized command console for match games, live scorekeeping, team registry, rule enforcement, and league branding.
            </p>
            {settings?.visibility === "private" && (
              <div className="mt-3 inline-flex flex-wrap items-center gap-2.5 p-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-amber-200 text-[11px]">
                  <strong>Private League:</strong> Hidden from directory. Accessible only via direct URL.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      const url = `${window.location.origin}/league/${activeLeagueId}`;
                      navigator.clipboard?.writeText(url);
                      setCopiedLeagueLink(true);
                      setTimeout(() => setCopiedLeagueLink(false), 2000);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-bold text-[10px] uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {copiedLeagueLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLeagueLink ? "Copied Direct Link!" : "Copy Direct URL"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Fast Operations Toolbar */}
          <div data-tour="league-admin-actions" className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 shrink-0 lg:max-w-[48%] [&_button]:min-h-11 [&_a]:min-h-11 [&_button]:justify-center [&_a]:justify-center">
            <WalkthroughTrigger walkthrough={LEAGUE_DIRECTORY_WALKTHROUGH} variant="header" />
            <button
              onClick={openCustomizer}
              className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-black dark:text-amber-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border border-amber-500/40 shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>League Settings</span>
            </button>

            {!isLeagueArchived && (
            <Link
              href="/schedule"
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)] flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Game</span>
            </Link>
            )}

            <Link
              href="/teams"
              className="px-4 py-2.5 bg-surface-muted hover:bg-white/10 text-neutral-200 text-xs font-bold uppercase tracking-wider rounded-xl border border-line transition-colors flex items-center gap-2"
            >
              <Users className="w-4 h-4 text-cyan-400" />
              <span>{isLeagueArchived ? "View Teams" : "Manage Teams"}</span>
            </Link>
          </div>
        </div>

        {/* League Executive KPI Strip */}
        <div data-tour="league-kpis" className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 pt-4 sm:pt-6 [&>div]:min-w-0 [&>div]:p-3 sm:[&>div]:p-4">
          <div className="bg-black/50 border border-line-subtle rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">Teams &amp; Slots</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                {isEffectiveDemo ? "Sandbox" : isLeagueArchived ? "Archived" : `$${subscription?.totalMonthlyFee || 160}/mo`}
              </span>
            </div>
            <div className="text-3xl font-black text-white mt-1 tabular-nums">
              {teams.length} <span className="text-sm font-normal text-neutral-400">{isEffectiveDemo ? "Demo Teams" : `/ ${subscription?.teamCount || 8} Paid`}</span>
            </div>
            <button
              type="button"
              onClick={openCustomizer}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors mt-1 flex items-center gap-1 cursor-pointer"
            >
              <span>{isEffectiveDemo ? "Demo Settings" : "Manage Teams & Slots"}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-black/50 border border-line-subtle rounded-2xl">
            <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">Season Schedule Progress</span>
            <div className="text-xl sm:text-3xl font-black text-white mt-1 tabular-nums whitespace-nowrap">
              {completedMatches.length} / {matches.length}
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${matches.length > 0 ? (completedMatches.length / matches.length) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </div>

          <div className="bg-black/50 border border-line-subtle rounded-2xl">
            <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">Total Roster Athletes</span>
            <div className="text-3xl font-black text-white mt-1 tabular-nums">{players.length}</div>
            <span className="text-[11px] text-emerald-400 mt-1 block">Active Competitors</span>
          </div>

          <div className="bg-black/50 border border-line-subtle rounded-2xl">
            <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">League Scoring Leader</span>
            <div className="text-base sm:text-2xl font-black text-white mt-1 break-words">
              {topScorer?.name !== "-" ? topScorer?.name : "No stats recorded"}
            </div>
            <span className="text-[11px] text-cyan-400 mt-1 block font-mono">
              {topScorer?.totalTD || 0} Total TDs ({topScorer?.team || "No team"})
            </span>
          </div>
        </div>
      </div>

      {/* Section: Live & Upcoming Games */}
      <div data-tour="league-schedule-tab">
        <LeagueScheduleWidget
          games={liveAndUpcomingGames}
          liveCount={liveMatches.length}
          teams={teams}
          standingsMap={standingsMap}
          isLeagueAdmin={true}
          isDemo={isEffectiveDemo}
        />
      </div>

      {/* Section: 2-Column Standings & League Superstars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <LeagueStandingsWidget
          sortedStandings={sortedStandings}
          teams={teams}
          isEffectiveDemo={isEffectiveDemo}
        />
        <LeagueLeadersWidget
          topPasser={topPasser}
          topReceiver={topReceiver}
          topScorer={topScorer}
          topFlagger={topFlagger}
        />
      </div>

      {/* Section: Team Operations Registry */}
      <div data-tour="league-teams-grid">
        <LeagueTeamsGrid
          teams={teams}
          players={players}
          standingsMap={standingsMap}
          isEffectiveDemo={isEffectiveDemo}
          isAdminView={true}
        />
      </div>
    </div>
  );
}

export default LeagueAdminView;
