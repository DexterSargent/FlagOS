"use client";

import React from "react";
import Link from "next/link";
import { Trophy, ChevronRight, ArrowRight } from "lucide-react";
import { TeamLogo } from "@/components/TeamAssets";

export interface LeagueStandingsWidgetProps {
  sortedStandings: any[];
  teams: any[];
  isEffectiveDemo?: boolean;
  limitCount?: number;
  showFullTableLink?: boolean;
  className?: string;
}

export function LeagueStandingsWidget({
  sortedStandings,
  teams,
  isEffectiveDemo,
  limitCount = 6,
  showFullTableLink = true,
  className = "",
}: LeagueStandingsWidgetProps) {
  const displayRows = limitCount > 0 ? sortedStandings.slice(0, limitCount) : sortedStandings;

  return (
    <div
      data-tour="league-standings-section"
      className={`bg-surface-raised border border-line rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between ${className}`}
    >
      <div>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-line-subtle">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-base font-black uppercase tracking-wider text-white">Official Standings</h3>
          </div>
          {showFullTableLink && (
            <Link href="/stats" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
              <span>Full Table</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        <div className="overflow-x-auto hide-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[var(--text-muted)] border-b border-line-subtle font-mono uppercase">
                <th className="pb-2 w-8">#</th>
                <th className="pb-2">Team</th>
                <th className="pb-2 text-center">W</th>
                <th className="pb-2 text-center">L</th>
                <th className="pb-2 text-center hidden sm:table-cell">T</th>
                <th className="pb-2 text-center">Diff</th>
                <th className="pb-2 text-right">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayRows.map((row, idx) => {
                const teamObj = teams.find((t) => t.id === row.id);
                return (
                  <tr key={row.id} className="hover:bg-surface-muted transition-colors">
                    <td className="py-3 font-mono font-bold text-neutral-400">{idx + 1}</td>
                    <td className="py-3">
                      <Link
                        href={`/teams/${row.id}`}
                        className="font-bold text-white hover:text-cyan-400 transition-colors flex items-center gap-2.5"
                      >
                        <div className="w-6 h-6 rounded-lg bg-black/60 border border-line p-0.5 flex items-center justify-center shrink-0">
                          <TeamLogo
                            teamName={row.name}
                            logoUrl={teamObj?.logoUrl}
                            icon={teamObj?.icon}
                            className="w-full h-full object-contain"
                            isDemo={isEffectiveDemo}
                            primaryColor={teamObj?.primaryColor || teamObj?.color}
                          />
                        </div>
                        <span>{row.name}</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">({row.shortcode})</span>
                      </Link>
                    </td>
                    <td className="py-3 text-center font-bold text-emerald-400">{row.w}</td>
                    <td className="py-3 text-center text-red-400">{row.l}</td>
                    <td className="py-3 text-center text-neutral-400 hidden sm:table-cell">{row.t}</td>
                    <td className="py-3 text-center text-neutral-400 font-mono">
                      {row.pf - row.pa > 0 ? `+${row.pf - row.pa}` : row.pf - row.pa}
                    </td>
                    <td className="py-3 text-right font-black text-cyan-300 text-sm">{row.pts}</td>
                  </tr>
                );
              })}
              {displayRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-[var(--text-muted)] italic">
                    No standings recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showFullTableLink && (
        <div className="pt-4 mt-4 border-t border-line-subtle">
          <Link
            href="/stats"
            className="w-full py-2.5 px-4 bg-surface-muted hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold rounded-xl border border-line transition-colors flex items-center justify-center gap-2"
          >
            <span>View Full Standings & Calculations</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

export default LeagueStandingsWidget;
