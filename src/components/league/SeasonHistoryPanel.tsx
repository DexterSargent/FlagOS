"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Crown, History, Medal, Search, Trophy } from "lucide-react";
import {
  buildCareerSummaries,
  type CareerSummary,
  type LeagueSeason,
  type PlayerStatKey,
  type PlayerStatLine,
  type SeasonSnapshot,
} from "@/lib/leagueSeasons";

const LEADER_CATEGORIES: Array<{ key: PlayerStatKey; label: string }> = [
  { key: "totalTDs", label: "Touchdowns" },
  { key: "passTD", label: "Passing TDs" },
  { key: "receptions", label: "Receptions" },
  { key: "flagPulls", label: "Flag pulls" },
  { key: "int", label: "Interceptions" },
];

const CAREER_COLUMNS: Array<{ key: PlayerStatKey; label: string; title: string }> = [
  { key: "gamesPlayed", label: "GP", title: "Games played" },
  { key: "totalTDs", label: "TD", title: "Total touchdowns" },
  { key: "passTD", label: "Pass TD", title: "Passing touchdowns" },
  { key: "receptions", label: "Rec", title: "Receptions" },
  { key: "rushTD", label: "Rush TD", title: "Rushing touchdowns" },
  { key: "flagPulls", label: "Flags", title: "Flag pulls" },
  { key: "int", label: "INT", title: "Interceptions" },
];

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export default function SeasonHistoryPanel({
  seasons,
  snapshots,
  currentSeasonId,
  livePlayerStats,
  loading,
  error,
  onViewSeason,
}: {
  seasons: LeagueSeason[];
  snapshots: SeasonSnapshot[];
  currentSeasonId: string;
  livePlayerStats: PlayerStatLine[];
  loading: boolean;
  error: string;
  onViewSeason: (seasonId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const careers = useMemo<CareerSummary[]>(() => {
    const current = seasons.find((season) => season.id === currentSeasonId);
    return buildCareerSummaries([
      ...snapshots.map((snapshot) => ({
        seasonId: snapshot.seasonId,
        title: snapshot.title,
        number: snapshot.number,
        isCurrent: false,
        championTeamId: snapshot.championTeamId,
        playerStats: snapshot.playerStats,
      })),
      {
        seasonId: currentSeasonId,
        title: current?.title || "Current season",
        number: current?.number || snapshots.length + 1,
        isCurrent: true,
        playerStats: livePlayerStats.filter((line) => line.gamesPlayed > 0 || line.totalTDs > 0 || line.flagPulls > 0 || line.passAtt > 0),
      },
    ]).filter((career) => career.seasons.length > 0);
  }, [snapshots, seasons, currentSeasonId, livePlayerStats]);

  const sortedCareers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return careers
      .filter((career) => !term || career.name.toLowerCase().includes(term))
      .sort((a, b) => b.totals.totalTDs - a.totals.totalTDs || b.totals.gamesPlayed - a.totals.gamesPlayed || a.name.localeCompare(b.name));
  }, [careers, search]);

  const orderedSeasons = [...seasons].sort((a, b) => b.number - a.number);
  const snapshotById = new Map(snapshots.map((snapshot) => [snapshot.seasonId, snapshot]));
  const titles = careers.filter((career) => career.championships > 0).length;

  return (
    <div data-tour="stats-history" className="space-y-6 mt-4">
      {error && (
        <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</p>
      )}

      <section data-tour="stats-history-seasons" className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-neutral-900/60 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <History className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight">Seasons</h2>
          <span className="ml-auto text-xs text-[var(--text-muted)]">{seasons.length} {seasons.length === 1 ? "season" : "seasons"}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orderedSeasons.map((season) => {
            const isLive = season.id === currentSeasonId;
            const snapshot = snapshotById.get(season.id);
            const champion = season.championTeamName || snapshot?.championTeamName;
            const dates = [formatDate(season.startedAt || snapshot?.startedAt), formatDate(season.endedAt || snapshot?.endedAt)].filter(Boolean).join(" - ");
            return (
              <div key={season.id} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Season {season.number}</p>
                    <p className="font-black text-base truncate" title={season.title}>{season.title}</p>
                    {dates && <p className="text-xs text-[var(--text-muted)]">{dates}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                    isLive
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                      : "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-neutral-300 border border-slate-300 dark:border-white/10"
                  }`}>
                    {isLive ? "Live" : "Final"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm min-h-[1.5rem]">
                  {champion ? (
                    <>
                      <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="font-bold truncate">{champion}</span>
                      <span className="text-xs text-[var(--text-muted)]">Champion</span>
                    </>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">{isLive ? "Season in progress" : "No champion recorded"}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onViewSeason(season.id)}
                  className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-white/15 px-3 py-2 text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  {isLive ? "View live standings" : "View final standings & stats"}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section data-tour="stats-history-leaders" className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-neutral-900/60 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Medal className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight">All-time leaders</h2>
        </div>
        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading past seasons...</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {LEADER_CATEGORIES.map((category) => {
              const leaders = [...careers]
                .filter((career) => career.totals[category.key] > 0)
                .sort((a, b) => b.totals[category.key] - a.totals[category.key])
                .slice(0, 3);
              return (
                <div key={category.key} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">{category.label}</p>
                  {leaders.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">No stats yet</p>
                  ) : (
                    <ol className="space-y-1.5">
                      {leaders.map((career, index) => (
                        <li key={career.key} className="flex items-center gap-2 text-sm">
                          <span className="w-4 text-xs font-bold text-[var(--text-muted)]">{index + 1}</span>
                          <span className="truncate flex-1 font-semibold">{career.name}</span>
                          <span className="font-black tabular-nums">{career.totals[category.key]}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section data-tour="stats-history-careers" className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-neutral-900/60 overflow-hidden">
        <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight">Career stats</h2>
          </div>
          <label className="sm:ml-auto relative block w-full sm:w-64">
            <span className="sr-only">Search players</span>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search players"
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/40 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </label>
        </div>
        <p className="px-4 pb-2 text-xs text-[var(--text-muted)] sm:hidden">Swipe the table to see more stats. Tap a player for each season.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-slate-100 dark:bg-black/40 text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                <th className="text-left py-3 px-4">Player</th>
                <th className="py-3 px-2 text-center" title="Seasons played">Seasons</th>
                {CAREER_COLUMNS.map((column) => (
                  <th key={column.key} className="py-3 px-2 text-center" title={column.title}>{column.label}</th>
                ))}
                <th className="py-3 px-2 text-center" title="Championships">Titles</th>
              </tr>
            </thead>
            <tbody>
              {sortedCareers.map((career) => {
                const isOpen = expanded === career.key;
                return (
                  <Fragment key={career.key}>
                    <tr className="border-t border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                      <td className="py-2.5 px-4">
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : career.key)}
                          aria-expanded={isOpen}
                          className="flex items-center gap-1.5 font-bold text-left"
                        >
                          {isOpen ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                          <span className="truncate max-w-[12rem]">{career.name}</span>
                        </button>
                      </td>
                      <td className="py-2.5 px-2 text-center tabular-nums">{career.seasons.length}</td>
                      {CAREER_COLUMNS.map((column) => (
                        <td key={column.key} className="py-2.5 px-2 text-center tabular-nums">{career.totals[column.key]}</td>
                      ))}
                      <td className="py-2.5 px-2 text-center">
                        {career.championships > 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                            <Crown className="w-3.5 h-3.5" />{career.championships}
                          </span>
                        ) : <span className="text-[var(--text-muted)]">-</span>}
                      </td>
                    </tr>
                    {isOpen && [...career.seasons].sort((a, b) => b.number - a.number).map((entry) => (
                      <tr key={`${career.key}-${entry.seasonId}`} className="bg-slate-50 dark:bg-black/20 text-xs">
                        <td className="py-2 pl-10 pr-4">
                          <span className="font-semibold">{entry.seasonTitle}</span>
                          <span className="text-[var(--text-muted)]"> - {entry.line.teamName}{entry.isCurrent ? " (live)" : ""}</span>
                        </td>
                        <td className="py-2 px-2 text-center text-[var(--text-muted)]">-</td>
                        {CAREER_COLUMNS.map((column) => (
                          <td key={column.key} className="py-2 px-2 text-center tabular-nums">{entry.line[column.key] || 0}</td>
                        ))}
                        <td className="py-2 px-2 text-center">
                          {entry.championTeamId && entry.championTeamId === entry.line.teamId
                            ? <Crown className="w-3.5 h-3.5 inline text-amber-500" aria-label="Champion" />
                            : ""}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
              {sortedCareers.length === 0 && (
                <tr>
                  <td colSpan={CAREER_COLUMNS.length + 3} className="py-10 text-center text-[var(--text-muted)]">
                    {search ? "No players match that search." : "Career stats appear once games are played."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {titles > 0 && (
          <p className="px-4 sm:px-6 py-3 text-xs text-[var(--text-muted)] border-t border-slate-200 dark:border-white/5">
            Titles count seasons where the player was on the champion&apos;s roster.
          </p>
        )}
      </section>
    </div>
  );
}
