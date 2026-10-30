"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import type { SeasonResult } from "@/lib/leagueSeasons";
import { formatRecordDate } from "@/lib/recordBook";

interface SeasonResultsListProps {
  results: SeasonResult[];
  /** Shows a W/L/T chip from this team's perspective. */
  perspectiveTeamId?: string;
  /** Match pages still exist for archived games, so results stay clickable when linking is wanted. */
  linkMatches?: boolean;
  emptyMessage?: string;
}

function outcomeFor(result: SeasonResult, teamId: string): { label: "W" | "L" | "T"; className: string } | null {
  const isHome = result.homeTeamId === teamId;
  const isAway = result.awayTeamId === teamId;
  if (!isHome && !isAway) return null;
  const scored = isHome ? result.homeScore : result.awayScore;
  const allowed = isHome ? result.awayScore : result.homeScore;
  if (scored > allowed) return { label: "W", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30" };
  if (scored < allowed) return { label: "L", className: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30" };
  return { label: "T", className: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30" };
}

/** Read-only list of completed games from an archived season snapshot. */
export default function SeasonResultsList({
  results,
  perspectiveTeamId,
  linkMatches = true,
  emptyMessage = "No completed games were recorded for this season.",
}: SeasonResultsListProps) {
  if (!results.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-neutral-900/40 px-6 py-10 text-center text-xs text-slate-500 dark:text-neutral-400">
        {emptyMessage}
      </div>
    );
  }

  const ordered = [...results].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <ol className="divide-y divide-slate-100 dark:divide-white/5 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-neutral-900/70">
      {ordered.map((result) => {
        const outcome = perspectiveTeamId ? outcomeFor(result, perspectiveTeamId) : null;
        const homeWon = result.homeScore > result.awayScore;
        const awayWon = result.awayScore > result.homeScore;
        const body = (
          <div className="flex items-center gap-3 px-4 py-3">
            {outcome && (
              <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${outcome.className}`}>
                {outcome.label}
              </span>
            )}
            <div className="min-w-0 flex-1 space-y-0.5 text-sm">
              <div className={`flex items-center justify-between gap-3 ${awayWon ? "font-black text-slate-900 dark:text-white" : "text-slate-600 dark:text-neutral-300"}`}>
                <span className="truncate">{result.awayTeamName}</span>
                <span className="font-mono tabular-nums">{result.awayScore}</span>
              </div>
              <div className={`flex items-center justify-between gap-3 ${homeWon ? "font-black text-slate-900 dark:text-white" : "text-slate-600 dark:text-neutral-300"}`}>
                <span className="truncate">@ {result.homeTeamName}</span>
                <span className="font-mono tabular-nums">{result.homeScore}</span>
              </div>
            </div>
            <div className="shrink-0 text-right text-[11px] text-slate-500 dark:text-neutral-400">
              <div>{formatRecordDate(result.date) || "—"}</div>
              {result.isPlayoff && (
                <div className="mt-0.5 inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-px text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  <Trophy className="h-3 w-3" />
                  {result.playoffRound || "Playoff"}
                </div>
              )}
            </div>
          </div>
        );
        return (
          <li key={result.id}>
            {linkMatches && result.id ? (
              <Link href={`/matches/${result.id}`} className="block transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
                {body}
              </Link>
            ) : body}
          </li>
        );
      })}
    </ol>
  );
}
