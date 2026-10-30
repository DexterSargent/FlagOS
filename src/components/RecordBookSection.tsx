"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Award,
  Calendar,
  Filter,
  Flame,
  Shield,
  Target,
  Trophy,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import type { RecordBook, RecordCategory, RecordEntry, RecordHolderKind, RecordType } from "@/lib/recordBook";

interface RecordBookSectionProps {
  book: RecordBook;
  /** Label for the empty state and dialog subtitle, e.g. a league or team name. */
  scopeLabel: string;
  /** Team books hide the holder's team column because every holder shares it. */
  showHolderTeam?: boolean;
  /** When true, the "set this season" badge is shown for marks from the in-progress season. */
  highlightCurrentSeason?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

type HolderFilter = "all" | RecordHolderKind;

export const RECORD_TOP_N = 3;

const STAT_GROUP_ICONS = {
  passing: Target,
  receiving: Flame,
  rushing: Zap,
  scoring: Award,
  defense: Shield,
  team: Trophy,
};

const STAT_GROUP_COLORS = {
  passing: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  receiving: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
  rushing: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  scoring: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
  defense: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  team: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
};

const RECORD_TYPE_META: Record<RecordType, { label: string; icon: typeof Zap; iconClass: string }> = {
  game: { label: "Single Game", icon: Zap, iconClass: "text-amber-500" },
  season: { label: "Single Season", icon: Calendar, iconClass: "text-cyan-500" },
  career: { label: "All-Time", icon: Trophy, iconClass: "text-emerald-500" },
};

const RANK_STYLES: Record<number, string> = {
  1: "bg-amber-400/20 text-amber-700 dark:text-amber-300 border-amber-400/40",
  2: "bg-slate-300/30 text-slate-700 dark:text-slate-200 border-slate-400/40",
  3: "bg-orange-400/15 text-orange-700 dark:text-orange-300 border-orange-400/30",
};

const pillBase = "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer";
const pillActive = "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-white/10";
const pillIdle = "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white";

function RankBadge({ rank }: { rank: number }) {
  const style = RANK_STYLES[rank] || "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-neutral-400 border-slate-200 dark:border-white/10";
  return (
    <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-black font-mono ${style}`}>
      {rank}
    </span>
  );
}

function EntryRow({ entry, showHolderTeam, highlightCurrentSeason, compact }: {
  entry: RecordEntry;
  showHolderTeam: boolean;
  highlightCurrentSeason: boolean;
  compact: boolean;
}) {
  const teamLabel = showHolderTeam && entry.teamName && entry.teamName !== entry.holder
    ? entry.teamShortcode || entry.teamName
    : "";
  return (
    <li className={`flex items-center gap-2.5 ${compact ? "py-1.5" : "py-2.5 border-b border-slate-100 dark:border-white/5 last:border-b-0"}`}>
      <RankBadge rank={entry.rank} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate text-sm font-bold text-slate-900 dark:text-white">{entry.holder}</span>
          {entry.number && entry.holderId !== entry.teamId && (
            <span className="text-[10px] font-mono text-slate-400 dark:text-neutral-500 shrink-0">#{entry.number}</span>
          )}
          {teamLabel && (
            <span className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 shrink-0">{teamLabel}</span>
          )}
          {highlightCurrentSeason && entry.isCurrentSeason && (
            <span className="shrink-0 rounded px-1 py-px text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              Live
            </span>
          )}
        </div>
        {entry.context && (
          <div className="truncate text-[11px] text-slate-500 dark:text-neutral-400">{entry.context}</div>
        )}
      </div>
      <span className="shrink-0 font-mono text-base font-black tracking-tight text-slate-900 dark:text-white">{entry.formattedValue}</span>
    </li>
  );
}

function LeaderboardDialog({ category, scopeLabel, showHolderTeam, highlightCurrentSeason, onClose }: {
  category: RecordCategory;
  scopeLabel: string;
  showHolderTeam: boolean;
  highlightCurrentSeason: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const Icon = STAT_GROUP_ICONS[category.statGroup] || Trophy;
  const typeMeta = RECORD_TYPE_META[category.recordType];
  const titleId = `record-leaderboard-${category.id}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 top-[var(--role-switcher-height,0px)] z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[calc(100dvh-var(--role-switcher-height,0px)-2rem)] flex flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-white/15 bg-white dark:bg-neutral-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 p-4 sm:p-5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${STAT_GROUP_COLORS[category.statGroup]}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 id={titleId} className="truncate text-base font-black uppercase tracking-wide text-slate-900 dark:text-white">
                {category.title}
              </h3>
              <p className="truncate text-[11px] text-slate-500 dark:text-neutral-400">
                {typeMeta.label} · {category.holderKind === "team" ? "Team" : "Player"} record · {scopeLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close leaderboard"
            className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-2 text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ol className="overflow-y-auto px-4 sm:px-5 py-1">
          {category.entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} showHolderTeam={showHolderTeam} highlightCurrentSeason={highlightCurrentSeason} compact={false} />
          ))}
        </ol>
        <div className="border-t border-slate-200 dark:border-white/10 px-4 sm:px-5 py-2.5 text-[11px] text-slate-500 dark:text-neutral-400 shrink-0">
          Showing {category.entries.length} {category.entries.length === 1 ? "mark" : "marks"}
          {category.lowerIsBetter ? " · lower is better" : ""}
        </div>
      </div>
    </div>
  );
}

function RecordCard({ category, scopeLabel, showHolderTeam, highlightCurrentSeason, onViewAll }: {
  category: RecordCategory;
  scopeLabel: string;
  showHolderTeam: boolean;
  highlightCurrentSeason: boolean;
  onViewAll: (category: RecordCategory) => void;
}) {
  const Icon = STAT_GROUP_ICONS[category.statGroup] || Trophy;
  const top = category.entries.slice(0, RECORD_TOP_N);
  return (
    <div
      data-testid={`record-card-${category.id}`}
      className="flex flex-col rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-neutral-900/70 p-4 shadow-xs transition-all hover:border-slate-300 dark:hover:border-white/20 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${STAT_GROUP_COLORS[category.statGroup]}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
            {category.title}
          </span>
        </div>
        {category.holderKind === "team" ? (
          <span className="shrink-0 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            Team
          </span>
        ) : (
          <span className="shrink-0 rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
            Player
          </span>
        )}
      </div>

      <ol className="mt-2 flex-1">
        {top.map((entry) => (
          <EntryRow key={entry.id} entry={entry} showHolderTeam={showHolderTeam} highlightCurrentSeason={highlightCurrentSeason} compact />
        ))}
      </ol>

      <button
        type="button"
        onClick={() => onViewAll(category)}
        aria-label={`View full leaderboard for ${category.title} (${scopeLabel})`}
        className="mt-3 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-300 transition-colors hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
      >
        View full leaderboard{category.entries.length > RECORD_TOP_N ? ` (${category.entries.length})` : ""}
      </button>
    </div>
  );
}

export function RecordBookSection({
  book,
  scopeLabel,
  showHolderTeam = false,
  highlightCurrentSeason = true,
  emptyTitle = "No Records Yet",
  emptyDescription = "Single game, season, and all-time records are tracked automatically as games are completed.",
}: RecordBookSectionProps) {
  const [activeType, setActiveType] = useState<RecordType>("game");
  const [holderFilter, setHolderFilter] = useState<HolderFilter>("all");
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  // Resolve by id so a live data refresh re-renders the open leaderboard with fresh entries.
  const openCategory = useMemo(
    () => (openCategoryId ? [...book.game, ...book.season, ...book.career].find((category) => category.id === openCategoryId) || null : null),
    [book, openCategoryId],
  );

  const categories = book[activeType];
  const filtered = useMemo(
    () => categories.filter((category) => holderFilter === "all" || category.holderKind === holderFilter),
    [categories, holderFilter],
  );
  const playerCount = categories.filter((category) => category.holderKind === "player").length;
  const teamCount = categories.length - playerCount;
  const total = book.game.length + book.season.length + book.career.length;

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-neutral-900/40 px-6 py-10 text-center">
        <Trophy className="mx-auto mb-2.5 h-8 w-8 text-slate-400 dark:text-neutral-500" />
        <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">{emptyTitle}</h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-white/10 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Record timeline" className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-1">
          {(Object.keys(RECORD_TYPE_META) as RecordType[]).map((type) => {
            const meta = RECORD_TYPE_META[type];
            const TypeIcon = meta.icon;
            return (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={activeType === type}
                onClick={() => setActiveType(type)}
                className={`${pillBase} ${activeType === type ? pillActive : pillIdle}`}
              >
                <TypeIcon className={`h-3.5 w-3.5 ${meta.iconClass}`} />
                <span>{meta.label}</span>
                <span className="text-[10px] opacity-70">({book[type].length})</span>
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-1 self-start rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-1 sm:self-auto">
          <button type="button" onClick={() => setHolderFilter("all")} aria-pressed={holderFilter === "all"} className={`${pillBase} px-2.5 py-1 text-[11px] ${holderFilter === "all" ? pillActive : pillIdle}`}>
            <Filter className="h-3 w-3 text-slate-500" />
            <span>All ({categories.length})</span>
          </button>
          <button type="button" onClick={() => setHolderFilter("player")} aria-pressed={holderFilter === "player"} className={`${pillBase} px-2.5 py-1 text-[11px] ${holderFilter === "player" ? `${pillActive} text-cyan-600 dark:text-cyan-400` : pillIdle}`}>
            <User className="h-3 w-3 text-cyan-500" />
            <span>Individual ({playerCount})</span>
          </button>
          <button type="button" onClick={() => setHolderFilter("team")} aria-pressed={holderFilter === "team"} className={`${pillBase} px-2.5 py-1 text-[11px] ${holderFilter === "team" ? `${pillActive} text-amber-600 dark:text-amber-400` : pillIdle}`}>
            <Users className="h-3 w-3 text-amber-500" />
            <span>Team ({teamCount})</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-neutral-900/30 p-10 text-center text-xs text-slate-500 dark:text-neutral-400">
          No {holderFilter === "player" ? "individual" : holderFilter === "team" ? "team" : ""} records for this timeline yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((category) => (
            <RecordCard
              key={category.id}
              category={category}
              scopeLabel={scopeLabel}
              showHolderTeam={showHolderTeam}
              highlightCurrentSeason={highlightCurrentSeason}
              onViewAll={(category) => setOpenCategoryId(category.id)}
            />
          ))}
        </div>
      )}

      {openCategory && (
        <LeaderboardDialog
          category={openCategory}
          scopeLabel={scopeLabel}
          showHolderTeam={showHolderTeam}
          highlightCurrentSeason={highlightCurrentSeason}
          onClose={() => setOpenCategoryId(null)}
        />
      )}
    </div>
  );
}

export default RecordBookSection;
