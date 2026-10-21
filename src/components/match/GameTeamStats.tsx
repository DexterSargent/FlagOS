"use client";

import { useMemo, useState } from "react";
import {
  calculateTeamComprehensiveStats,
  TEAM_STAT_DEFINITIONS,
  TeamStatDefinition,
  StatCategory,
} from "@/lib/teamStatsCalculator";
import { useMatchTeamColors } from "@/lib/useMatchTeamColors";
import { getReadableTextColor, getTeamBadgeStyle } from "@/lib/teamColors";
import { TeamLogo } from "@/components/TeamAssets";
import { Shield, Zap, TrendingUp, Award, Activity, Flag } from "lucide-react";

export interface GameTeamStatsProps {
  matchData: any;
  plays: any[];
  isDemo?: boolean;
}

const CATEGORY_TABS: { id: "all" | StatCategory; label: string }[] = [
  { id: "all", label: "All Stats" },
  { id: "downs", label: "Downs & Situational" },
  { id: "offense", label: "Offense" },
  { id: "defense", label: "Defense" },
  { id: "discipline", label: "Discipline & Margins" },
  { id: "pats", label: "PAT Efficiency" },
  { id: "record", label: "Scoring & Record" },
];

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

  // Live or completed score resolution
  const homeScore = matchData?.matchState?.homeScore ?? matchData?.homeScore ?? 0;
  const awayScore = matchData?.matchState?.awayScore ?? matchData?.awayScore ?? 0;

  // Single game object scoped for comprehensive calculator
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

  // Calculate comprehensive stats for both squads for this individual game
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

  // Filter stat definitions according to category selector
  const filteredDefs = useMemo(() => {
    if (selectedCategory === "all") return TEAM_STAT_DEFINITIONS;
    return TEAM_STAT_DEFINITIONS.filter((d) => d.category === selectedCategory);
  }, [selectedCategory]);

  // Group definitions by category for structured comparison
  const groupedDefs = useMemo(() => {
    const groups: { category: StatCategory; label: string; defs: TeamStatDefinition[] }[] = [];
    const categories: StatCategory[] = ["downs", "offense", "defense", "discipline", "pats", "record"];

    categories.forEach((cat) => {
      const defs = filteredDefs.filter((d) => d.category === cat);
      if (defs.length > 0) {
        groups.push({
          category: cat,
          label: defs[0].categoryLabel,
          defs,
        });
      }
    });
    return groups;
  }, [filteredDefs]);

  // Numeric extraction helper for comparison highlight
  const parseNumericValue = (val: string | number): number | null => {
    if (typeof val === "number") return val;
    const match = String(val).match(/([+-]?\d+(\.\d+)?)/);
    return match ? parseFloat(match[0]) : null;
  };

  const isHomeLeading = (def: TeamStatDefinition): boolean | null => {
    const hVal = parseNumericValue(def.getValue(homeStats));
    const aVal = parseNumericValue(def.getValue(awayStats));
    if (hVal === null || aVal === null || hVal === aVal) return null;

    // Lower is better for points allowed, penalties, and giveaways
    if (def.id === "pa" || def.id === "dppg" || def.id === "penalties" || def.id === "penaltyYards" || def.id === "giveaways") {
      return hVal < aVal;
    }
    return hVal > aVal;
  };

  return (
    <div
      role="region"
      aria-label="Individual game team stats"
      data-testid="game-team-stats"
      className="flex-1 min-h-0 space-y-4 overflow-y-auto overscroll-contain pb-6 scrollbar-thin text-white"
    >
      {/* MATCH SUMMARY SCOREBOARD BANNER */}
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-3 sm:p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          {/* Home Team */}
          <div
            className="flex items-center gap-3 flex-1 min-w-0 p-2 sm:p-2.5 rounded-xl border border-white/5 transition-all"
            style={{ backgroundColor: `${homeColors.secondary}20`, borderColor: `${homeColors.primary}40` }}
          >
            <TeamLogo teamName={homeTeamName} className="w-8 h-8 sm:w-10 sm:h-10 shrink-0" isDemo={isDemo} primaryColor={homeText} />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block truncate">Home Team</span>
              <span className="text-sm sm:text-base font-black truncate block text-white">{homeTeamName}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white px-2">
              {homeScore}
            </div>
          </div>

          <div className="text-xs font-mono font-black uppercase text-neutral-500 px-1 shrink-0">VS</div>

          {/* Away Team */}
          <div
            className="flex items-center gap-3 flex-1 min-w-0 p-2 sm:p-2.5 rounded-xl border border-white/5 transition-all flex-row-reverse sm:flex-row"
            style={{ backgroundColor: `${awayColors.secondary}20`, borderColor: `${awayColors.primary}40` }}
          >
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white px-2">
              {awayScore}
            </div>
            <div className="min-w-0 flex-1 text-right sm:text-left">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block truncate">Away Team</span>
              <span className="text-sm sm:text-base font-black truncate block text-white">{awayTeamName}</span>
            </div>
            <TeamLogo teamName={awayTeamName} className="w-8 h-8 sm:w-10 sm:h-10 shrink-0" isDemo={isDemo} primaryColor={awayText} />
          </div>
        </div>
      </div>

      {/* VIEW SELECTOR & CATEGORY FILTERS */}
      <div className="flex flex-col gap-2.5">
        {/* Main View Mode Selector (Comparison vs Home Breakdown vs Away Breakdown) */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-neutral-900/90 border border-white/10 rounded-xl">
            <button
              type="button"
              data-testid="team-stats-view-comparison"
              onClick={() => setSelectedView("comparison")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedView === "comparison"
                  ? "bg-emerald-500 text-black shadow-md font-black"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Head-to-Head Comparison
            </button>
            <button
              type="button"
              data-testid="team-stats-view-home"
              onClick={() => setSelectedView("home")}
              style={selectedView === "home" ? getTeamBadgeStyle({ primaryColor: homeColors.primary, secondaryColor: homeColors.secondary }) : undefined}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                selectedView === "home"
                  ? "shadow-md"
                  : "bg-transparent border-transparent text-neutral-400 hover:text-white"
              }`}
            >
              {homeTeamName}
            </button>
            <button
              type="button"
              data-testid="team-stats-view-away"
              onClick={() => setSelectedView("away")}
              style={selectedView === "away" ? getTeamBadgeStyle({ primaryColor: awayColors.primary, secondaryColor: awayColors.secondary }) : undefined}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                selectedView === "away"
                  ? "shadow-md"
                  : "bg-transparent border-transparent text-neutral-400 hover:text-white"
              }`}
            >
              {awayTeamName}
            </button>
          </div>

          <div className="text-[11px] font-mono text-neutral-400">
            {plays.length} Total Plays Logged
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {CATEGORY_TABS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              data-testid={`category-filter-${cat.id}`}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all border cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-white/20 text-white border-white/30"
                  : "bg-neutral-900 border-white/5 text-neutral-400 hover:text-white hover:border-white/10"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: HEAD-TO-HEAD COMPARISON VIEW                                      */}
      {/* ========================================================================= */}
      {selectedView === "comparison" && (
        <div className="space-y-4">
          {groupedDefs.map((group) => (
            <div
              key={group.category}
              className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden shadow-lg"
            >
              {/* Category Header */}
              <div className="bg-neutral-800/60 px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-neutral-300">
                  {group.label}
                </span>
                <span className="text-[10px] font-mono text-neutral-500 uppercase">
                  {group.defs.length} Metrics
                </span>
              </div>

              {/* Table of Metrics */}
              <div className="divide-y divide-white/5">
                {group.defs.map((def) => {
                  const hVal = def.getValue(homeStats);
                  const aVal = def.getValue(awayStats);
                  const lead = isHomeLeading(def);

                  return (
                    <div
                      key={def.id}
                      data-testid={`comparison-row-${def.id}`}
                      className="p-3 sm:p-3.5 flex items-center justify-between gap-2 sm:gap-4 hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Home Value */}
                      <div className="w-24 sm:w-32 shrink-0 text-left">
                        <span
                          className={`text-sm sm:text-base font-mono font-black ${
                            lead === true
                              ? "text-emerald-400 drop-shadow-sm font-extrabold"
                              : lead === false
                              ? "text-neutral-400 font-semibold"
                              : "text-white"
                          }`}
                        >
                          {hVal}
                        </span>
                      </div>

                      {/* Metric Name & Description */}
                      <div className="flex-1 min-w-0 text-center px-1">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
                            {def.label}
                          </span>
                          <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-white/5 text-neutral-400">
                            {def.shortLabel}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-400 line-clamp-1 hidden sm:block mt-0.5">
                          {def.description}
                        </span>
                      </div>

                      {/* Away Value */}
                      <div className="w-24 sm:w-32 shrink-0 text-right">
                        <span
                          className={`text-sm sm:text-base font-mono font-black ${
                            lead === false
                              ? "text-emerald-400 drop-shadow-sm font-extrabold"
                              : lead === true
                              ? "text-neutral-400 font-semibold"
                              : "text-white"
                          }`}
                        >
                          {aVal}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2 & 3: TEAM STAT CARDS GRID (MATCHING TEAM DASHBOARD EXACTLY)        */}
      {/* ========================================================================= */}
      {(selectedView === "home" || selectedView === "away") && (
        <div className="space-y-4">
          {(() => {
            const isHome = selectedView === "home";
            const teamName = isHome ? homeTeamName : awayTeamName;
            const targetStats = isHome ? homeStats : awayStats;
            const targetColors = isHome ? homeColors : awayColors;

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-neutral-900 border border-white/10">
                  <div className="flex items-center gap-2">
                    <TeamLogo teamName={teamName} className="w-6 h-6 shrink-0" isDemo={isDemo} />
                    <span className="text-sm font-bold text-white">{teamName} Game Breakdown</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
                    {filteredDefs.length} Stats
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {filteredDefs.map((def) => {
                    const value = def.getValue(targetStats);

                    return (
                      <div
                        key={def.id}
                        data-testid={`stat-card-${def.id}`}
                        className="p-3.5 rounded-2xl bg-neutral-900/90 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between group/card relative overflow-hidden shadow-md"
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-neutral-400 truncate">
                            {def.shortLabel}
                          </span>
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-white/5 text-neutral-400">
                            {def.category}
                          </span>
                        </div>
                        <div className="my-1">
                          <div className="text-lg sm:text-xl font-black font-mono tracking-tight text-white group-hover/card:text-cyan-300 transition-colors">
                            {value}
                          </div>
                        </div>
                        <div className="text-[11px] text-neutral-400 font-medium line-clamp-1" title={def.description}>
                          {def.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
