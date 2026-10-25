"use client";

import React from "react";
import Link from "next/link";
import { Activity, ChevronRight, ArrowRight } from "lucide-react";

export interface LeagueLeadersWidgetProps {
  topPasser: { name: string; passTD: number; team?: string };
  topReceiver: { name: string; recTD: number; team?: string };
  topScorer: { name: string; totalTD: number; team?: string };
  topFlagger: { name: string; flagPulls: number; team?: string };
  showFullLeadersLink?: boolean;
  className?: string;
}

export function LeagueLeadersWidget({
  topPasser,
  topReceiver,
  topScorer,
  topFlagger,
  showFullLeadersLink = true,
  className = "",
}: LeagueLeadersWidgetProps) {
  return (
    <div
      data-tour="league-stats-tab"
      className={`bg-surface-raised border border-line rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between ${className}`}
    >
      <div>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-line-subtle">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-black uppercase tracking-wider text-white">League Stat Leaders</h3>
          </div>
          {showFullLeadersLink && (
            <Link href="/stats" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
              <span>10 Categories</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Passing TDs</span>
            <div className="text-base sm:text-lg font-black text-white mt-1 leading-tight line-clamp-2 break-words">
              {topPasser.name !== "-" ? topPasser.name : "No stats"}
            </div>
            <div className="flex items-center justify-between text-xs mt-2 text-cyan-400 font-bold">
              <span className="text-neutral-400 font-normal truncate">{topPasser.team || "Team"}</span>
              <span className="text-base">{topPasser.passTD} TDs</span>
            </div>
          </div>

          <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Receiving TDs</span>
            <div className="text-base sm:text-lg font-black text-white mt-1 leading-tight line-clamp-2 break-words">
              {topReceiver.name !== "-" ? topReceiver.name : "No stats"}
            </div>
            <div className="flex items-center justify-between text-xs mt-2 text-blue-400 font-bold">
              <span className="text-neutral-400 font-normal truncate">{topReceiver.team || "Team"}</span>
              <span className="text-base">{topReceiver.recTD} TDs</span>
            </div>
          </div>

          <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Total Touchdowns</span>
            <div className="text-base sm:text-lg font-black text-white mt-1 leading-tight line-clamp-2 break-words">
              {topScorer.name !== "-" ? topScorer.name : "No stats"}
            </div>
            <div className="flex items-center justify-between text-xs mt-2 text-yellow-400 font-bold">
              <span className="text-neutral-400 font-normal truncate">{topScorer.team || "Team"}</span>
              <span className="text-base">{topScorer.totalTD} TDs</span>
            </div>
          </div>

          <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Flags (Def)</span>
            <div className="text-base sm:text-lg font-black text-white mt-1 leading-tight line-clamp-2 break-words">
              {topFlagger.name !== "-" ? topFlagger.name : "No stats"}
            </div>
            <div className="flex items-center justify-between text-xs mt-2 text-emerald-400 font-bold">
              <span className="text-neutral-400 font-normal truncate">{topFlagger.team || "Team"}</span>
              <span className="text-base">{topFlagger.flagPulls} Flags</span>
            </div>
          </div>
        </div>
      </div>

      {showFullLeadersLink && (
        <div className="pt-4 mt-4 border-t border-line-subtle">
          <Link
            href="/stats"
            className="w-full py-2.5 px-4 bg-surface-muted hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold rounded-xl border border-line transition-colors flex items-center justify-center gap-2"
          >
            <span>View Full Stat Leaderboards</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

export default LeagueLeadersWidget;
