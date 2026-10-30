"use client";

import React, { useState, useMemo } from "react";
import {
  Award,
  Zap,
  Calendar,
  Trophy,
  Target,
  Flame,
  Shield,
  Users,
  User,
  Filter,
} from "lucide-react";
import type { TeamFranchiseRecords, TeamRecordItem } from "@/lib/teamRecords";

interface TeamRecordsSectionProps {
  records: TeamFranchiseRecords;
  teamName: string;
}

type RecordCategoryFilter = "all" | "player" | "team";

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

export function TeamRecordsSection({ records, teamName }: TeamRecordsSectionProps) {
  const [activeTab, setActiveTab] = useState<"game" | "season" | "career">("game");
  const [categoryFilter, setCategoryFilter] = useState<RecordCategoryFilter>("all");

  const currentTimelineRecords: TeamRecordItem[] = useMemo(() => {
    return activeTab === "game"
      ? records.gameRecords
      : activeTab === "season"
      ? records.seasonRecords
      : records.careerRecords;
  }, [activeTab, records]);

  const filteredRecords: TeamRecordItem[] = useMemo(() => {
    return currentTimelineRecords.filter((rec) => {
      if (categoryFilter === "player") return !rec.isTeamRecord;
      if (categoryFilter === "team") return Boolean(rec.isTeamRecord);
      return true;
    });
  }, [currentTimelineRecords, categoryFilter]);

  const playerCount = useMemo(
    () => currentTimelineRecords.filter((r) => !r.isTeamRecord).length,
    [currentTimelineRecords]
  );
  const teamCount = useMemo(
    () => currentTimelineRecords.filter((r) => r.isTeamRecord).length,
    [currentTimelineRecords]
  );

  const totalCount =
    records.gameRecords.length + records.seasonRecords.length + records.careerRecords.length;

  if (totalCount === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-neutral-900/40 px-6 py-10 text-center">
        <Trophy className="mx-auto mb-2.5 h-8 w-8 text-slate-400 dark:text-neutral-500" />
        <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
          No Franchise Records Yet
        </h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
          Single game, season, and career records will be automatically tracked as games are played.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Primary Timeline Subtabs & Secondary Scope Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200 dark:border-white/10">
        {/* Timeline Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab("game")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "game"
                ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-white/10"
                : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Single Game</span>
            <span className="text-[10px] opacity-70">({records.gameRecords.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("season")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "season"
                ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-white/10"
                : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-cyan-500" />
            <span>Single Season</span>
            <span className="text-[10px] opacity-70">({records.seasonRecords.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("career")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "career"
                ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-white/10"
                : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-emerald-500" />
            <span>All-Time Career</span>
            <span className="text-[10px] opacity-70">({records.careerRecords.length})</span>
          </button>
        </div>

        {/* Scope Filter: All | Individual | Team */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
              categoryFilter === "all"
                ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-white/10"
                : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Filter className="w-3 h-3 text-slate-500" />
            <span>All ({currentTimelineRecords.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("player")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
              categoryFilter === "player"
                ? "bg-white dark:bg-neutral-800 text-cyan-600 dark:text-cyan-400 shadow-xs border border-slate-200 dark:border-white/10"
                : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <User className="w-3 h-3 text-cyan-500" />
            <span>Individual ({playerCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("team")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
              categoryFilter === "team"
                ? "bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-400 shadow-xs border border-slate-200 dark:border-white/10"
                : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Users className="w-3 h-3 text-amber-500" />
            <span>Team ({teamCount})</span>
          </button>
        </div>
      </div>

      {/* Records Cards Grid */}
      {filteredRecords.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-slate-50 dark:bg-neutral-900/30 border border-slate-200 dark:border-white/10 text-xs text-slate-500 dark:text-neutral-400">
          No {categoryFilter === "player" ? "individual player" : categoryFilter === "team" ? "team" : ""} records recorded for this timeline yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredRecords.map((rec) => {
            const IconComponent = STAT_GROUP_ICONS[rec.statGroup] || Trophy;
            const groupColor = STAT_GROUP_COLORS[rec.statGroup] || STAT_GROUP_COLORS.team;

            return (
              <div
                key={rec.id}
                className="group p-4 rounded-2xl bg-white dark:bg-neutral-900/70 border border-slate-200 dark:border-white/10 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/20 transition-all hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${groupColor}`}>
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 dark:text-neutral-400 truncate">
                        {rec.category}
                      </span>
                    </div>

                    {rec.isTeamRecord ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 shrink-0">
                        Team
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 shrink-0">
                        Player
                      </span>
                    )}
                  </div>

                  {/* Record Holder & Massive Stat Value */}
                  <div className="mt-3 flex items-baseline justify-between gap-3">
                    <span className="text-base font-black text-slate-900 dark:text-white truncate">
                      {rec.holder}
                    </span>
                    <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white shrink-0 font-mono">
                      {rec.formattedValue}
                    </span>
                  </div>
                </div>

                {/* Match Context / Opponent / Date */}
                {rec.context && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-neutral-400">
                    <span className="truncate">{rec.context}</span>
                    <span className="text-[10px] font-mono opacity-60 uppercase shrink-0">
                      Record
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TeamRecordsSection;
