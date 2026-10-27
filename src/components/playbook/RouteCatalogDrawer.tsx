"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { Check, Plus, Star, X, Zap } from "lucide-react";
import {
  ROUTE_PRESETS_CATALOG,
  ROUTE_SORT_OPTIONS,
  isRouteInDepthCategory,
  type CustomRoutePreset,
  type PlayerNode,
  type RouteSortOption,
} from "@/lib/playbookTypes";
import styles from "./PlayCanvas.module.css";

export interface RouteCatalogDrawerProps {
  selectedPlayer: PlayerNode;
  readOnly: boolean;
  isDemo: boolean;
  customPresets: CustomRoutePreset[];
  playerSwitcher?: ReactNode;
  routeSort?: RouteSortOption;
  onRouteSortChange?: (sort: RouteSortOption) => void;
  onClose: () => void;
  onApplyPreset: (presetName: string) => void;
  onApplyCustomPreset: (preset: CustomRoutePreset) => void;
  onDeleteCustomPreset: (presetId: string, presetName: string, e: MouseEvent) => void;
  onSaveCurrentRoute: () => void;
}

export default function RouteCatalogDrawer({
  selectedPlayer,
  readOnly,
  isDemo,
  customPresets,
  playerSwitcher,
  routeSort: routeSortProp,
  onRouteSortChange,
  onClose,
  onApplyPreset,
  onApplyCustomPreset,
  onDeleteCustomPreset,
  onSaveCurrentRoute,
}: RouteCatalogDrawerProps) {
  const [showFullDescriptions, setShowFullDescriptions] = useState(false);
  const [internalSort, setInternalSort] = useState<RouteSortOption>("all");
  const activeSort = routeSortProp ?? internalSort;

  const handleSortChange = (next: RouteSortOption) => {
    setInternalSort(next);
    onRouteSortChange?.(next);
  };

  const filteredCatalog = ROUTE_PRESETS_CATALOG.filter((rp) =>
    isRouteInDepthCategory(rp, activeSort)
  );

  const filteredCustomPresets = customPresets.filter((cp) => {
    if (activeSort === "all") return true;
    let depth = 5;
    if (cp.offsets && cp.offsets.length > 0) {
      depth = Math.max(...cp.offsets.map((o) => Math.abs(o.dy)));
    }
    if (activeSort === "short") return depth <= 6;
    if (activeSort === "intermediate") return depth > 6 && depth <= 14;
    if (activeSort === "deep") return depth > 14;
    return true;
  });

  return (
      <div
        data-tour="route-catalog"
        data-testid="route-presets-catalog"
        className={`${styles.picker} bg-white dark:bg-[#0A0E17] border border-neutral-200 dark:border-cyan-500/40 shadow-2xl`}
      >
        <div className={`${styles.pickerHeader} border-b border-neutral-200 dark:border-white/10`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">Route Tree & Presets</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Close catalog"
            aria-label="Close route catalog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {playerSwitcher}
        </div>

        <div className={`${styles.pickerBody} space-y-3`}>
        <p className={`${styles.pickerIntro} text-[11px] text-neutral-600 dark:text-neutral-400 font-mono`}>
          Tap a route to apply it to <strong className="text-neutral-900 dark:text-white">{selectedPlayer.label}</strong>. Adjust route depth with the rail beside the field.
        </p>

        {/* Route Sorting / Depth Options (All Routes, Short, Intermediate, Deep) */}
        <div className="space-y-1.5" data-testid="route-sort-controls">
          <div className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
            <span className="uppercase tracking-wider">Route Depth:</span>
            <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-300">
              {activeSort === "all"
                ? `All (${ROUTE_PRESETS_CATALOG.length})`
                : `${filteredCatalog.length} route${filteredCatalog.length === 1 ? "" : "s"}`}
            </span>
          </div>
          <div
            role="group"
            aria-label="Filter and sort routes by depth"
            className="grid grid-cols-4 gap-1 p-1 bg-neutral-100 dark:bg-black/50 rounded-xl border border-neutral-200 dark:border-white/10"
          >
            {ROUTE_SORT_OPTIONS.map((opt) => {
              const isSelected = activeSort === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`route-sort-${opt.id}`}
                  aria-pressed={isSelected}
                  onClick={() => handleSortChange(opt.id)}
                  className={`py-1.5 px-1 sm:px-2 rounded-lg text-[10.5px] sm:text-xs font-bold transition-all text-center cursor-pointer select-none border ${
                    isSelected
                      ? "bg-cyan-500 text-black border-cyan-400 font-extrabold shadow-sm"
                      : "bg-transparent text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white hover:bg-neutral-200/70 dark:hover:bg-white/10 border-transparent"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Team Presets Section */}
        {filteredCustomPresets.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 tracking-wider flex items-center gap-1">
              <Star className="w-3 h-3 fill-current text-amber-500 dark:text-amber-400" />
              <span>Custom Team Presets ({filteredCustomPresets.length}):</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {filteredCustomPresets.map((cp) => {
                const isCurrent = selectedPlayer.quickRouteName === cp.name;
                return (
                  <div key={cp.id} className="relative group">
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => onApplyCustomPreset(cp)}
                      className={`w-full pl-2.5 pr-12 py-2 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between gap-1.5 cursor-pointer ${
                        isCurrent
                          ? "bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-950 dark:text-emerald-200 border-2 border-emerald-500 dark:border-emerald-400 shadow-md font-extrabold"
                          : "bg-neutral-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 border-neutral-200 dark:border-emerald-500/30"
                      }`}
                    >
                      <span className="min-w-0 break-words">{cp.name}</span>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[3]" />}
                    </button>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={(e) => onDeleteCustomPreset(cp.id, cp.name, e)}
                        className="absolute top-1 right-1 w-10 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center text-xs opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer shadow"
                        title={`Delete preset ${cp.name}`}
                        aria-label={`Delete preset ${cp.name}`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Standard Catalog Route Tree */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 flex flex-wrap items-center justify-between gap-1">
            <span>
              {activeSort === "all"
                ? `Standard Route Tree (${filteredCatalog.length})`
                : `${activeSort.charAt(0).toUpperCase() + activeSort.slice(1)} Routes (${filteredCatalog.length})`}
            </span>
            <button
              type="button"
              onClick={() => setShowFullDescriptions((v) => !v)}
              aria-expanded={showFullDescriptions}
              data-testid="route-descriptions-toggle"
              className="px-2 py-1 min-h-8 rounded-lg text-[10px] font-bold text-cyan-700 dark:text-cyan-300 hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer"
            >
              {showFullDescriptions ? "Shorter descriptions" : "Full descriptions"}
            </button>
          </div>
          {filteredCatalog.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {filteredCatalog.map((rp) => {
              const isCurrent =
                selectedPlayer.quickRouteName === rp.name ||
                selectedPlayer.quickRouteName === rp.shortName;
              return (
                <button
                  key={rp.name}
                  type="button"
                  disabled={readOnly}
                  onClick={() => onApplyPreset(rp.name)}
                  data-testid={`catalog-route-${rp.shortName.toLowerCase()}`}
                  title={rp.description}
                  className={`p-2 sm:p-2.5 rounded-xl text-xs font-bold text-left transition-all border flex items-start justify-between gap-2 cursor-pointer ${
                    isCurrent
                      ? "bg-cyan-500/15 dark:bg-cyan-500/20 text-neutral-900 dark:text-white border-2 border-cyan-500 dark:border-cyan-400 shadow-md font-extrabold ring-1 ring-cyan-500/20"
                      : "bg-neutral-50 dark:bg-black/60 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white border-neutral-200 dark:border-white/10"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`break-words leading-snug ${isCurrent ? "font-extrabold text-cyan-950 dark:text-cyan-200" : "font-bold text-neutral-900 dark:text-white"}`}>
                        {rp.name}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-bold ${
                          isCurrent
                            ? "bg-cyan-500/20 text-cyan-900 dark:text-cyan-200 border border-cyan-500/30"
                            : "bg-neutral-200 dark:bg-white/10 text-neutral-600 dark:text-neutral-400"
                        }`}
                      >
                        {rp.category}
                      </span>
                    </div>
                    <div
                      className={`text-[11px] leading-snug mt-1 ${showFullDescriptions ? "" : "line-clamp-2"} ${
                        isCurrent
                          ? "text-neutral-700 dark:text-neutral-300 font-medium"
                          : "text-neutral-500 dark:text-neutral-400 font-normal"
                      }`}
                    >
                      {rp.description}
                    </div>
                  </div>
                  {isCurrent && <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5 stroke-[3]" />}
                </button>
              );
            })}
          </div>
          ) : (
            <div className="text-center py-6 px-4 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-black/30 border border-dashed border-neutral-300 dark:border-white/10 rounded-xl">
              No routes found in this depth category.
            </div>
          )}
        </div>

        {/* Bottom add preset shortcut inside menu */}
        <div className="pt-2 border-t border-neutral-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span className="text-neutral-500 dark:text-neutral-400 font-mono text-[10px]">
            {isDemo ? "⚡ Demo Mode: Presets are session-only" : `Capacity: ${customPresets.length}/20 custom presets`}
          </span>
          <button
            type="button"
            onClick={onSaveCurrentRoute}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save Current Route as Preset</span>
          </button>
        </div>
        </div>
      </div>
  );
}
