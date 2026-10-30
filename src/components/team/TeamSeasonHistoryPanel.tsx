"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Crown,
  History,
  Calendar,
  Eye,
} from "lucide-react";
import type { TeamSeason, TeamSeasonSnapshot } from "@/lib/teamSeasons";
import type { PlayerStatLine } from "@/lib/leagueSeasons";

interface TeamSeasonHistoryPanelProps {
  teamName: string;
  teamId: string;
  seasons: TeamSeason[];
  snapshots: TeamSeasonSnapshot[];
  currentSeasonId: string;
  liveRecord?: { won: number; lost: number; tied: number; pf: number; pa: number };
  livePlayerStats?: PlayerStatLine[];
  onSelectSeason?: (seasonId: string) => void;
}

export function TeamSeasonHistoryPanel({
  teamName,
  teamId,
  seasons,
  snapshots,
  currentSeasonId,
  liveRecord,
  onSelectSeason,
}: TeamSeasonHistoryPanelProps) {
  const [expandedSeasonId, setExpandedSeasonId] = useState<string | null>(null);

  // Map snapshots by season ID
  const snapshotBySeason = useMemo(() => {
    const map = new Map<string, TeamSeasonSnapshot>();
    for (const snap of snapshots) {
      map.set(snap.seasonId, snap);
    }
    return map;
  }, [snapshots]);

  // Compute all-time franchise totals across all archived snapshots + active season
  const allTimeRecord = useMemo(() => {
    let won = liveRecord?.won || 0;
    let lost = liveRecord?.lost || 0;
    let tied = liveRecord?.tied || 0;
    let pf = liveRecord?.pf || 0;
    let pa = liveRecord?.pa || 0;
    let championships = 0;

    for (const snap of snapshots) {
      won += snap.won || 0;
      lost += snap.lost || 0;
      tied += snap.tied || 0;
      pf += snap.pf || 0;
      pa += snap.pa || 0;
      if (snap.isChampion) championships += 1;
    }

    const totalGames = won + lost + tied;
    const winPct = totalGames > 0 ? (((won + tied * 0.5) / totalGames) * 100).toFixed(1) : "0.0";
    const diff = pf - pa;

    return { won, lost, tied, pf, pa, diff, totalGames, winPct, championships };
  }, [snapshots, liveRecord]);

  // Sort seasons with latest season first
  const sortedSeasons = useMemo(() => {
    return [...seasons].sort((a, b) => b.number - a.number);
  }, [seasons]);

  const toggleExpand = (id: string) => {
    setExpandedSeasonId((prev) => (prev === id ? null : id));
  };

  // STRICT REQUIREMENT: Do NOT show Season History for teams in their first season!
  if (seasons.length <= 1 && snapshots.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Subtle All-Time Overview Bar */}
      <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-neutral-900/40 border border-slate-200/80 dark:border-white/5 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-200/50 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-neutral-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                {teamName} Franchise History
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                {seasons.length} seasons recorded
              </p>
            </div>
          </div>

          {allTimeRecord.championships > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
              <Crown className="w-3.5 h-3.5 fill-amber-400" />
              <span>{allTimeRecord.championships}x Champion</span>
            </div>
          )}
        </div>

        {/* Minimal metrics row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center sm:text-left">
          <div className="p-2.5 rounded-xl bg-white/70 dark:bg-black/20 border border-slate-200/60 dark:border-white/5">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-neutral-500">Record</span>
            <div className="text-sm font-black font-mono text-slate-900 dark:text-white">
              {allTimeRecord.won}-{allTimeRecord.lost}{allTimeRecord.tied > 0 ? `-${allTimeRecord.tied}` : ""}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/70 dark:bg-black/20 border border-slate-200/60 dark:border-white/5">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-neutral-500">Win Pct</span>
            <div className="text-sm font-black font-mono text-slate-900 dark:text-white">
              {allTimeRecord.winPct}%
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/70 dark:bg-black/20 border border-slate-200/60 dark:border-white/5">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-neutral-500">Total PF</span>
            <div className="text-sm font-black font-mono text-slate-900 dark:text-white">
              {allTimeRecord.pf} pts
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/70 dark:bg-black/20 border border-slate-200/60 dark:border-white/5">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-neutral-500">Diff</span>
            <div className={`text-sm font-black font-mono ${
              allTimeRecord.diff > 0 ? "text-emerald-600 dark:text-emerald-400" : allTimeRecord.diff < 0 ? "text-rose-500" : "text-slate-900 dark:text-white"
            }`}>
              {allTimeRecord.diff > 0 ? `+${allTimeRecord.diff}` : allTimeRecord.diff}
            </div>
          </div>
        </div>
      </div>

      {/* Season-by-Season Minimal Rows */}
      <div className="space-y-2">
        {sortedSeasons.map((season) => {
          const isCurrent = season.id === currentSeasonId;
          const snapshot = snapshotBySeason.get(season.id);
          const isExpanded = expandedSeasonId === season.id;

          const won = isCurrent ? (liveRecord?.won || 0) : (snapshot?.won ?? season.won ?? 0);
          const lost = isCurrent ? (liveRecord?.lost || 0) : (snapshot?.lost ?? season.lost ?? 0);
          const tied = isCurrent ? (liveRecord?.tied || 0) : (snapshot?.tied ?? season.tied ?? 0);
          const pf = isCurrent ? (liveRecord?.pf || 0) : (snapshot?.pf ?? season.pf ?? 0);
          const pa = isCurrent ? (liveRecord?.pa || 0) : (snapshot?.pa ?? season.pa ?? 0);
          const diff = pf - pa;
          const isChampion = snapshot?.isChampion || season.standing?.toLowerCase().includes("champion");

          return (
            <div
              key={season.id}
              className={`rounded-xl border transition-all ${
                isCurrent
                  ? "bg-slate-50/50 dark:bg-neutral-900/30 border-slate-300 dark:border-white/10"
                  : "bg-white/60 dark:bg-neutral-900/20 border-slate-200/60 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10"
              }`}
            >
              {/* Header row */}
              <div
                onClick={() => toggleExpand(season.id)}
                className="p-3 flex items-center justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isChampion
                      ? "bg-amber-500/15 text-amber-500 border border-amber-500/20"
                      : isCurrent
                      ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                      : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-neutral-400 border border-slate-200 dark:border-white/5"
                  }`}>
                    {isChampion ? <Crown className="w-3.5 h-3.5 fill-amber-400" /> : <Calendar className="w-3.5 h-3.5" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {season.title}
                      </span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono">
                      {won}-{lost}{tied > 0 ? `-${tied}` : ""} · PF {pf} / PA {pa} ({diff > 0 ? `+${diff}` : diff})
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onSelectSeason && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSeason(season.id);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-neutral-300 transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3 text-cyan-500" />
                      <span>Explore</span>
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Toggle details"
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Collapsed content */}
              {isExpanded && (
                <div className="p-3 pt-0 border-t border-slate-100 dark:border-white/5 space-y-2">
                  {snapshot && snapshot.results.length > 0 ? (
                    <div className="space-y-1.5 pt-2 max-h-48 overflow-y-auto pr-1">
                      {snapshot.results.map((res) => {
                        const isHome = res.homeTeamId === teamId;
                        const teamScore = isHome ? res.homeScore : res.awayScore;
                        const oppScore = isHome ? res.awayScore : res.homeScore;
                        const oppName = isHome ? res.awayTeamName : res.homeTeamName;
                        const wonGame = (teamScore ?? 0) > (oppScore ?? 0);
                        const lostGame = (teamScore ?? 0) < (oppScore ?? 0);

                        return (
                          <div
                            key={res.id}
                            className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 text-[11px]"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-4 h-4 rounded flex items-center justify-center font-bold text-[9px] ${
                                wonGame
                                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                  : lostGame
                                  ? "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                                  : "bg-slate-200 dark:bg-neutral-700 text-slate-700 dark:text-neutral-300"
                              }`}>
                                {wonGame ? "W" : lostGame ? "L" : "T"}
                              </span>
                              <span className="font-medium text-slate-800 dark:text-neutral-200">
                                vs {oppName}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-slate-600 dark:text-neutral-300">
                              {teamScore} - {oppScore}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : isCurrent ? (
                    <div className="pt-2 text-xs text-slate-500 dark:text-neutral-400">
                      Season in progress. View current games on the Schedule tab.
                    </div>
                  ) : (
                    <div className="pt-2 text-xs text-slate-500 dark:text-neutral-400">
                      Season finalized. Record: {won}W - {lost}L.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TeamSeasonHistoryPanel;
