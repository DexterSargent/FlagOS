"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Crown,
  History,
  Medal,
  Trophy,
  Calendar,
  Flame,
  Award,
} from "lucide-react";
import type { TeamSeason, TeamSeasonSnapshot } from "@/lib/teamSeasons";
import type { CareerSummary, PlayerStatLine } from "@/lib/leagueSeasons";

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
  livePlayerStats = [],
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
    const winPct = totalGames > 0 ? ((won + tied * 0.5) / totalGames * 100).toFixed(1) : "0.0";
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

  return (
    <div className="space-y-6">
      {/* Franchise All-Time Overview Card */}
      <div className="p-5 rounded-3xl bg-slate-50 dark:bg-neutral-900/80 border border-slate-200 dark:border-white/10 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                {teamName} Franchise History
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Career continuity across {seasons.length} {seasons.length === 1 ? "season" : "seasons"}
              </p>
            </div>
          </div>

          {allTimeRecord.championships > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-black uppercase tracking-wider">
              <Crown className="w-4 h-4 fill-amber-400" />
              <span>{allTimeRecord.championships}x Champion</span>
            </div>
          )}
        </div>

        {/* All-time record stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5">
            <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-neutral-500 tracking-wider">All-Time Record</div>
            <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {allTimeRecord.won} - {allTimeRecord.lost}
              {allTimeRecord.tied > 0 ? ` - ${allTimeRecord.tied}` : ""}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">{allTimeRecord.winPct}% win rate</div>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5">
            <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-neutral-500 tracking-wider">Games Played</div>
            <div className="text-lg font-black font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">
              {allTimeRecord.totalGames}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">Franchise appearances</div>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5">
            <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-neutral-500 tracking-wider">Points Scored</div>
            <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {allTimeRecord.pf}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">PF ({allTimeRecord.totalGames > 0 ? (allTimeRecord.pf / allTimeRecord.totalGames).toFixed(1) : 0} / game)</div>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/5">
            <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-neutral-500 tracking-wider">Point Differential</div>
            <div className={`text-lg font-black font-mono mt-0.5 ${
              allTimeRecord.diff > 0 ? "text-emerald-600 dark:text-emerald-400" : allTimeRecord.diff < 0 ? "text-red-500" : "text-slate-900 dark:text-white"
            }`}>
              {allTimeRecord.diff > 0 ? `+${allTimeRecord.diff}` : allTimeRecord.diff}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">{allTimeRecord.pa} PA allowed</div>
          </div>
        </div>
      </div>

      {/* Season by Season Cards */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Season-by-Season History
          </h4>
        </div>

        <div className="space-y-3">
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
                className={`rounded-2xl border transition-all ${
                  isCurrent
                    ? "bg-cyan-500/[0.04] border-cyan-500/30"
                    : "bg-white dark:bg-neutral-900/60 border-slate-200 dark:border-white/10"
                }`}
              >
                {/* Season Header Row */}
                <div
                  onClick={() => toggleExpand(season.id)}
                  className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isChampion
                        ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                        : isCurrent
                        ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30"
                        : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-neutral-400 border border-slate-200 dark:border-white/5"
                    }`}>
                      {isChampion ? <Crown className="w-4 h-4 fill-amber-400" /> : <Calendar className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black uppercase text-slate-900 dark:text-white">
                          {season.title}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                            Current Season
                          </span>
                        )}
                        {isChampion && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Trophy className="w-3 h-3 fill-amber-400" />
                            Champion
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-neutral-400 font-mono mt-0.5">
                        {won}W - {lost}L{tied > 0 ? ` - ${tied}T` : ""} | PF {pf} - PA {pa} ({diff > 0 ? `+${diff}` : diff})
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {onSelectSeason && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSeason(season.id);
                        }}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-white/5 hover:bg-cyan-500/10 text-slate-700 dark:text-neutral-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                      >
                        View Stats
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Expand season"
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details: Game Results & Top Performers */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-slate-100 dark:border-white/5 space-y-4 animate-in fade-in">
                    {/* Game Results */}
                    {snapshot && snapshot.results.length > 0 ? (
                      <div className="space-y-2 pt-3">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                          Game Results ({snapshot.results.length})
                        </div>
                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {snapshot.results.map((res) => {
                            const isHome = res.homeTeamId === teamId;
                            const teamScore = isHome ? res.homeScore : res.awayScore;
                            const oppScore = isHome ? res.awayScore : res.homeScore;
                            const oppName = isHome ? res.awayTeamName : res.homeTeamName;
                            const wonGame = teamScore > oppScore;
                            const lostGame = teamScore < oppScore;

                            return (
                              <div
                                key={res.id}
                                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-100 dark:border-white/5 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] ${
                                    wonGame
                                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                      : lostGame
                                      ? "bg-red-500/20 text-red-700 dark:text-red-300"
                                      : "bg-slate-200 dark:bg-neutral-700 text-slate-700 dark:text-neutral-300"
                                  }`}>
                                    {wonGame ? "W" : lostGame ? "L" : "T"}
                                  </span>
                                  <span className="font-semibold text-slate-900 dark:text-white">
                                    vs {oppName}
                                  </span>
                                  {res.isPlayoff && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                                      Playoff
                                    </span>
                                  )}
                                </div>
                                <div className="font-mono font-bold text-slate-700 dark:text-neutral-200">
                                  {teamScore} - {oppScore}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : isCurrent ? (
                      <div className="pt-3 text-xs text-slate-500 dark:text-neutral-400">
                        This season is currently in progress. Games are tracked on the Schedule page.
                      </div>
                    ) : (
                      <div className="pt-3 text-xs text-slate-500 dark:text-neutral-400">
                        Past season record archived ({won}W - {lost}L). Box scores were finalized.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TeamSeasonHistoryPanel;

