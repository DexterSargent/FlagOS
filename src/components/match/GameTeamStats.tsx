"use client";

import { useMemo, useState } from "react";
import {
  calculateTeamComprehensiveStats,
  GAME_TEAM_STAT_DEFINITIONS,
  TeamStatDefinition,
  StatCategory,
} from "@/lib/teamStatsCalculator";
import { useMatchTeamColors } from "@/lib/useMatchTeamColors";
import { getAccentOnDark, getReadableTextColor } from "@/lib/teamColors";
import { TeamLogo } from "@/components/TeamAssets";

export interface GameTeamStatsProps {
  matchData: any;
  plays: any[];
  isDemo?: boolean;
}

// Single-game categories; "record" only carries points for/against/differential here.
const CATEGORY_TABS: { id: "all" | StatCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "record", label: "Scoring" },
  { id: "offense", label: "Offense" },
  { id: "downs", label: "Downs" },
  { id: "defense", label: "Defense" },
  { id: "pats", label: "PATs" },
  { id: "discipline", label: "Discipline" },
];

const CATEGORY_ORDER: StatCategory[] = ["record", "offense", "downs", "defense", "pats", "discipline"];
const CATEGORY_TITLES: Record<StatCategory, string> = {
  record: "Scoring",
  offense: "Offense",
  downs: "Downs & Situational",
  defense: "Defense",
  pats: "PAT Efficiency",
  discipline: "Turnovers & Discipline",
};

function parseNumericValue(val: string | number): number | null {
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  const match = String(val).match(/[+-]?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

export default function GameTeamStats({ matchData, plays, isDemo = false }: GameTeamStatsProps) {
  const [selectedView, setSelectedView] = useState<"comparison" | "home" | "away">("comparison");
  const [selectedCategory, setSelectedCategory] = useState<"all" | StatCategory>("all");

  const homeTeamId = matchData?.homeTeamId || "home";
  const awayTeamId = matchData?.awayTeamId || "away";
  const homeTeamName = matchData?.homeTeamName || "Home Team";
  const awayTeamName = matchData?.awayTeamName || "Away Team";

  const { home: homeColors, away: awayColors } = useMatchTeamColors(matchData, isDemo);
  const homeText = getReadableTextColor(homeColors.secondary, homeColors.primary);
  const awayText = getReadableTextColor(awayColors.secondary, awayColors.primary);
  const homeAccent = getAccentOnDark(homeColors);
  const awayAccent = getAccentOnDark(awayColors);

  const homeScore = matchData?.matchState?.homeScore ?? matchData?.homeScore ?? 0;
  const awayScore = matchData?.matchState?.awayScore ?? matchData?.awayScore ?? 0;
  const isFinal = matchData?.status === "completed" || matchData?.status === "Final";

  const scopedMatch = useMemo(
    () => ({
      ...matchData,
      id: matchData?.id || "current_game",
      status: "completed",
      homeScore,
      awayScore,
      homeTeamId,
      awayTeamId,
      homeTeamName,
      awayTeamName,
    }),
    [matchData, homeScore, awayScore, homeTeamId, awayTeamId, homeTeamName, awayTeamName]
  );

  const homeStats = useMemo(
    () =>
      calculateTeamComprehensiveStats(homeTeamId, [scopedMatch], plays, {
        teamName: homeTeamName,
        teamAliases: [homeTeamId, homeTeamName, "home", "HOME"].filter(Boolean),
      }),
    [homeTeamId, scopedMatch, plays, homeTeamName]
  );

  const awayStats = useMemo(
    () =>
      calculateTeamComprehensiveStats(awayTeamId, [scopedMatch], plays, {
        teamName: awayTeamName,
        teamAliases: [awayTeamId, awayTeamName, "away", "AWAY"].filter(Boolean),
      }),
    [awayTeamId, scopedMatch, plays, awayTeamName]
  );

  const filteredDefs = useMemo(() => {
    if (selectedCategory === "all") return GAME_TEAM_STAT_DEFINITIONS;
    return GAME_TEAM_STAT_DEFINITIONS.filter((d) => d.category === selectedCategory);
  }, [selectedCategory]);

  const groupedDefs = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        label: CATEGORY_TITLES[category],
        defs: filteredDefs.filter((d) => d.category === category),
      })).filter((group) => group.defs.length > 0),
    [filteredDefs]
  );

  const isHomeLeading = (def: TeamStatDefinition): boolean | null => {
    const hVal = parseNumericValue(def.getValue(homeStats));
    const aVal = parseNumericValue(def.getValue(awayStats));
    if (hVal === null || aVal === null || hVal === aVal) return null;
    return def.lowerIsBetter ? hVal < aVal : hVal > aVal;
  };

  const homeWon = homeScore > awayScore;
  const awayWon = awayScore > homeScore;

  const viewOptions = [
    { id: "comparison" as const, label: "Compare", accent: "#FFFFFF" },
    { id: "home" as const, label: homeTeamName, accent: homeAccent },
    { id: "away" as const, label: awayTeamName, accent: awayAccent },
  ];

  return (
    <div
      role="region"
      aria-label="Individual game team stats"
      data-testid="game-team-stats"
      className="flex-1 min-h-0 space-y-3 sm:space-y-4 overflow-y-auto overscroll-contain pb-6 scrollbar-thin text-white"
    >
      {/* Scoreboard */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 shadow-xl">
        <div className="flex h-1" aria-hidden="true">
          <div className="flex-1" style={{ backgroundColor: homeAccent }} />
          <div className="flex-1" style={{ backgroundColor: awayAccent }} />
        </div>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          aria-hidden="true"
          style={{ background: `linear-gradient(90deg, ${homeAccent} 0%, transparent 45%, transparent 55%, ${awayAccent} 100%)` }}
        />
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4 px-3 py-3 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <TeamLogo teamName={homeTeamName} className="h-8 w-8 sm:h-11 sm:w-11 shrink-0" isDemo={isDemo} primaryColor={homeText} />
            <div className="min-w-0">
              <span className="block text-[10px] sm:text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Home</span>
              <span className="block truncate text-xs sm:text-base font-black" title={homeTeamName}>{homeTeamName}</span>
            </div>
          </div>
          <div className="flex flex-col items-center px-1">
            <div className="flex items-center gap-1.5 sm:gap-3 font-mono font-black tabular-nums text-2xl sm:text-4xl leading-none">
              <span className={awayWon ? "text-[var(--text-muted)]" : "text-white"}>{homeScore}</span>
              <span className="text-neutral-600 text-lg sm:text-2xl">&ndash;</span>
              <span className={homeWon ? "text-[var(--text-muted)]" : "text-white"}>{awayScore}</span>
            </div>
            <span className="mt-1 whitespace-nowrap text-[10px] sm:text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
              {isFinal ? "Final" : "Live"} &middot; {plays.length} plays
            </span>
          </div>
          <div className="flex min-w-0 flex-row-reverse items-center gap-2 sm:gap-3 text-right">
            <TeamLogo teamName={awayTeamName} className="h-8 w-8 sm:h-11 sm:w-11 shrink-0" isDemo={isDemo} primaryColor={awayText} />
            <div className="min-w-0">
              <span className="block text-[10px] sm:text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Away</span>
              <span className="block truncate text-xs sm:text-base font-black" title={awayTeamName}>{awayTeamName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* View selector & category filters */}
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-neutral-900/90 p-1" role="tablist" aria-label="Team stats view">
          {viewOptions.map((option) => {
            const active = selectedView === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`team-stats-view-${option.id}`}
                onClick={() => setSelectedView(option.id)}
                title={option.label}
                className={`min-w-0 truncate rounded-lg px-2 py-1.5 text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                  active ? "bg-white/10 text-white shadow-inner" : "text-neutral-400 hover:text-white"
                }`}
                style={active ? { boxShadow: `inset 0 -2px 0 ${option.accent}` } : undefined}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {CATEGORY_TABS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              data-testid={`category-filter-${cat.id}`}
              aria-pressed={selectedCategory === cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? "border-white/30 bg-white text-black"
                  : "border-white/10 bg-neutral-900 text-neutral-400 hover:border-white/20 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Head-to-head comparison */}
      {selectedView === "comparison" && (
        <div className="space-y-3">
          {groupedDefs.map((group) => (
            <section
              key={group.category}
              aria-label={group.label}
              className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/80 shadow-lg"
            >
              <div className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2 sm:px-4">
                <span className="truncate text-[11px] font-mono font-bold uppercase tracking-widest text-white/80" title={homeTeamName}>
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: homeAccent }} />
                  <span className="hidden sm:inline">{homeTeamName}</span>
                </span>
                <h3 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white">{group.label}</h3>
                <span className="truncate text-right text-[11px] font-mono font-bold uppercase tracking-widest text-white/80" title={awayTeamName}>
                  <span className="hidden sm:inline">{awayTeamName}</span>
                  <span className="ml-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: awayAccent }} />
                </span>
              </div>

              <div className="divide-y divide-white/5">
                {group.defs.map((def) => {
                  const hVal = def.getValue(homeStats);
                  const aVal = def.getValue(awayStats);
                  const lead = isHomeLeading(def);
                  const hNum = Math.max(0, parseNumericValue(hVal) ?? 0);
                  const aNum = Math.max(0, parseNumericValue(aVal) ?? 0);
                  const scale = Math.max(hNum, aNum) || 1;

                  return (
                    <div
                      key={def.id}
                      data-testid={`comparison-row-${def.id}`}
                      className="px-3 py-2.5 sm:px-4 sm:py-3"
                      title={def.description}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span
                          className={`w-16 sm:w-24 shrink-0 font-mono tabular-nums text-sm sm:text-base ${
                            lead === true ? "font-black text-white" : lead === false ? "font-semibold text-[var(--text-muted)]" : "font-bold text-neutral-200"
                          }`}
                        >
                          {hVal}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-center text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-neutral-400">
                          {def.label}
                        </span>
                        <span
                          className={`w-16 sm:w-24 shrink-0 text-right font-mono tabular-nums text-sm sm:text-base ${
                            lead === false ? "font-black text-white" : lead === true ? "font-semibold text-[var(--text-muted)]" : "font-bold text-neutral-200"
                          }`}
                        >
                          {aVal}
                        </span>
                      </div>
                      <div className="mt-1.5 flex gap-1" aria-hidden="true">
                        <div className="flex h-1.5 flex-1 justify-end overflow-hidden rounded-l-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-l-full transition-all duration-500"
                            style={{ width: `${(hNum / scale) * 100}%`, backgroundColor: homeAccent, opacity: lead === false ? 0.4 : 1 }}
                          />
                        </div>
                        <div className="flex h-1.5 flex-1 overflow-hidden rounded-r-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-r-full transition-all duration-500"
                            style={{ width: `${(aNum / scale) * 100}%`, backgroundColor: awayAccent, opacity: lead === true ? 0.4 : 1 }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Single-team breakdown */}
      {(selectedView === "home" || selectedView === "away") && (() => {
        const isHome = selectedView === "home";
        const teamName = isHome ? homeTeamName : awayTeamName;
        const targetStats = isHome ? homeStats : awayStats;
        const accent = isHome ? homeAccent : awayAccent;

        return (
          <div className="space-y-3">
            {groupedDefs.map((group) => (
              <section key={group.category} aria-label={`${teamName} ${group.label}`} className="space-y-2">
                <h3 className="flex items-center gap-2 px-1 text-[11px] font-black uppercase tracking-widest text-neutral-400">
                  <span className="h-3 w-1 rounded-full" style={{ backgroundColor: accent }} />
                  {group.label}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                  {group.defs.map((def) => (
                    <div
                      key={def.id}
                      data-testid={`stat-card-${def.id}`}
                      title={def.description}
                      className="relative overflow-hidden rounded-xl border border-white/10 bg-neutral-900/90 p-3 shadow-md"
                    >
                      <div className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: accent }} aria-hidden="true" />
                      <div className="font-mono text-xl sm:text-2xl font-black tabular-nums tracking-tight text-white">
                        {def.getValue(targetStats)}
                      </div>
                      <div className="mt-0.5 text-[11px] font-semibold leading-tight text-neutral-400">{def.label}</div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
