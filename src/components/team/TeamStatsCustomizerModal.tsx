"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Check,
  RotateCcw,
  Sliders,
  Eye,
  Info,
  Shield,
  Trophy,
  Activity,
  Flame,
  Zap,
  Target,
} from "lucide-react";
import {
  TEAM_STAT_DEFINITIONS,
  DEFAULT_VISIBLE_TEAM_STATS,
  TeamComprehensiveStats,
  StatCategory,
} from "@/lib/teamStatsCalculator";

interface TeamStatsCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (visibleStatIds: string[]) => Promise<void> | void;
  initialVisibleStats?: string[];
  teamStats: TeamComprehensiveStats;
  teamName: string;
  primaryColor?: string;
  secondaryColor?: string;
}

const CATEGORY_ICONS: Record<StatCategory, React.ReactNode> = {
  record: <Trophy className="w-4 h-4 text-amber-400" />,
  downs: <Target className="w-4 h-4 text-cyan-400" />,
  pats: <Zap className="w-4 h-4 text-yellow-400" />,
  offense: <Flame className="w-4 h-4 text-red-400" />,
  defense: <Shield className="w-4 h-4 text-emerald-400" />,
  discipline: <Activity className="w-4 h-4 text-indigo-400" />,
};

const CATEGORIES: { id: StatCategory; label: string; description: string }[] = [
  {
    id: "record",
    label: "Record & Scoring Overview",
    description: "Core franchise outcomes, point totals, differentials, and averages.",
  },
  {
    id: "downs",
    label: "Situational & Downs Efficiency",
    description: "3rd/4th down conversion rates, total 1st downs, and defensive stop rates.",
  },
  {
    id: "pats",
    label: "PAT Conversion Efficiency",
    description: "Extra point execution on 1-point and 2-point conversions.",
  },
  {
    id: "offense",
    label: "Offensive Scoring & Execution",
    description: "Passing/rushing touchdown breakdowns and pass completion volume.",
  },
  {
    id: "defense",
    label: "Defensive Playmaking",
    description: "Flags pulled, sacks, interceptions, pass breakups, and safeties.",
  },
  {
    id: "discipline",
    label: "Turnover Margin & Discipline",
    description: "Turnover differential (takeaways vs giveaways) and penalty yardage.",
  },
];

export default function TeamStatsCustomizerModal({
  isOpen,
  onClose,
  onSave,
  initialVisibleStats = DEFAULT_VISIBLE_TEAM_STATS,
  teamStats,
  teamName,
  primaryColor = "#06B6D4",
  secondaryColor = "#E2E8F0",
}: TeamStatsCustomizerModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialVisibleStats);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  useEffect(() => {
    setSelectedIds(initialVisibleStats && initialVisibleStats.length > 0 ? initialVisibleStats : DEFAULT_VISIBLE_TEAM_STATS);
  }, [initialVisibleStats, isOpen]);

  // Lock background scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleStat = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleResetToDefault = () => {
    setSelectedIds([...DEFAULT_VISIBLE_TEAM_STATS]);
  };

  const handleSelectAll = () => {
    setSelectedIds(TEAM_STAT_DEFINITIONS.map((def) => def.id));
  };

  const handleClearAll = () => {
    setSelectedIds([]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selectedIds);
      onClose();
    } catch (e) {
      console.error("Failed to save custom stats display:", e);
    } finally {
      setSaving(false);
    }
  };

  const displayedDefinitions =
    filterCategory === "all"
      ? TEAM_STAT_DEFINITIONS
      : TEAM_STAT_DEFINITIONS.filter((def) => def.category === filterCategory);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-stats-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-[#0c0d12] border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white"
        style={{
          boxShadow: `0 0 50px ${primaryColor}20`,
        }}
      >
        {/* Sticky Header */}
        <div className="p-5 md:p-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-neutral-950/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm"
              style={{ backgroundColor: secondaryColor, borderColor: `${primaryColor}40` }}
            >
              <Sliders className="w-5 h-5" style={{ color: primaryColor }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="custom-stats-title" className="text-lg md:text-xl font-black uppercase tracking-wide">
                  Customize Team Stats Display
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-neutral-300 border border-white/10 uppercase">
                  {teamName}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Choose which stats appear on the team portal. Hidden stats remain safely calculated in the background.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close customizer"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar: Presets & Filters */}
        <div className="px-5 py-3 border-b border-white/10 bg-white/[0.02] flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Quick Presets */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/15 text-white transition-colors border border-white/10"
              title="Reset to default (Record, Points For, and Points Allowed only)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset to Default (Record, PF, PA)</span>
            </button>
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors border border-white/10"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-red-400 transition-colors border border-white/10"
            >
              Clear All
            </button>
          </div>

          {/* Selected Count Indicator */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-neutral-400">Selected:</span>
            <span className="px-2 py-0.5 rounded-full font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {selectedIds.length} / {TEAM_STAT_DEFINITIONS.length}
            </span>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="px-5 py-2.5 border-b border-white/5 bg-neutral-950/40 flex items-center gap-2 overflow-x-auto text-xs shrink-0 no-scrollbar">
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-3 py-1 rounded-full font-bold transition-all whitespace-nowrap ${
              filterCategory === "all"
                ? "bg-white text-black"
                : "bg-white/5 text-neutral-400 hover:text-white border border-white/10"
            }`}
          >
            All Categories ({TEAM_STAT_DEFINITIONS.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = TEAM_STAT_DEFINITIONS.filter((d) => d.category === cat.id).length;
            const selectedCount = TEAM_STAT_DEFINITIONS.filter(
              (d) => d.category === cat.id && selectedIds.includes(d.id)
            ).length;
            return (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold transition-all whitespace-nowrap ${
                  filterCategory === cat.id
                    ? "bg-white text-black"
                    : "bg-white/5 text-neutral-400 hover:text-white border border-white/10"
                }`}
              >
                <span>{cat.label}</span>
                <span className="text-[10px] opacity-70">
                  ({selectedCount}/{count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Stats List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          {CATEGORIES.filter((c) => filterCategory === "all" || filterCategory === c.id).map(
            (cat) => {
              const defsInCat = TEAM_STAT_DEFINITIONS.filter((d) => d.category === cat.id);
              if (defsInCat.length === 0) return null;

              return (
                <div key={cat.id} className="space-y-3">
                  <div className="flex items-center gap-2">
                    {CATEGORY_ICONS[cat.id]}
                    <h3 className="text-sm font-black uppercase tracking-wider text-neutral-200">
                      {cat.label}
                    </h3>
                    <span className="text-xs text-neutral-500 font-light">• {cat.description}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {defsInCat.map((def) => {
                      const isSelected = selectedIds.includes(def.id);
                      const isDefault = DEFAULT_VISIBLE_TEAM_STATS.includes(def.id);
                      const value = def.getValue(teamStats);

                      return (
                        <div
                          key={def.id}
                          onClick={() => toggleStat(def.id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                            isSelected
                              ? "bg-white/10 border-cyan-500/50 shadow-lg shadow-cyan-950/20"
                              : "bg-white/[0.02] border-white/5 hover:border-white/15 opacity-70 hover:opacity-100"
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Toggle Switch */}
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border transition-all ${
                                isSelected
                                  ? "bg-cyan-500 border-cyan-400 text-black font-black"
                                  : "border-white/20 bg-neutral-900"
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white tracking-tight">
                                  {def.label}
                                </span>
                                {isDefault && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                                {def.description}
                              </p>
                            </div>
                          </div>

                          {/* Live Preview Value */}
                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono font-black text-cyan-300">
                              {value}
                            </span>
                            <div className="text-[9px] font-mono text-neutral-500 uppercase">
                              {def.shortLabel}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
          )}
        </div>

        {/* Sticky Footer with Save / Cancel */}
        <div className="p-4 md:p-5 border-t border-white/10 bg-neutral-950/90 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="text-xs text-neutral-400 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-cyan-400" />
            <span>
              {selectedIds.length === 0
                ? "No stats selected (portal stats banner will be hidden)"
                : `${selectedIds.length} stats will be displayed on the team portal`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors border border-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-extrabold uppercase tracking-wider transition-all shadow-lg shadow-cyan-950/50 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Custom Stats</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
