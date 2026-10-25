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

function LeaderCard({ label, name, team, value, unit, tone }: {
  label: string; name: string; team?: string; value: number; unit: string; tone: string;
}) {
  // A fresh season has no leaders yet; don't crown whoever sorts first with 0.
  const hasLeader = name !== "-" && value > 0;
  return (
    <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">{label}</span>
      <div className={`text-base sm:text-lg font-black mt-1 leading-tight line-clamp-2 break-words ${hasLeader ? "text-white" : "text-neutral-400"}`}>
        {hasLeader ? name : "No stats yet"}
      </div>
      <div className={`flex items-center justify-between text-xs mt-2 font-bold ${tone}`}>
        <span className="text-neutral-400 font-normal truncate">{hasLeader ? team || "Team" : "\u2014"}</span>
        <span className="text-base">{hasLeader ? value : 0} {unit}</span>
      </div>
    </div>
  );
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
      data-tour="league-leaders-section"
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
          <LeaderCard label="Passing TDs" name={topPasser.name} team={topPasser.team} value={topPasser.passTD} unit="TDs" tone="text-cyan-400" />
          <LeaderCard label="Receiving TDs" name={topReceiver.name} team={topReceiver.team} value={topReceiver.recTD} unit="TDs" tone="text-blue-400" />
          <LeaderCard label="Total Touchdowns" name={topScorer.name} team={topScorer.team} value={topScorer.totalTD} unit="TDs" tone="text-yellow-400" />
          <LeaderCard label="Flags (Def)" name={topFlagger.name} team={topFlagger.team} value={topFlagger.flagPulls} unit="Flags" tone="text-emerald-400" />
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
