"use client";

import type { MouseEvent, ReactNode } from "react";
import { Check, Plus, Star, X, Zap } from "lucide-react";
import { ROUTE_PRESETS_CATALOG, type CustomRoutePreset, type PlayerNode } from "@/lib/playbookTypes";

export interface RouteCatalogDrawerProps {
  selectedPlayer: PlayerNode;
  readOnly: boolean;
  isDemo: boolean;
  customPresets: CustomRoutePreset[];
  playerSwitcher?: ReactNode;
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
  onClose,
  onApplyPreset,
  onApplyCustomPreset,
  onDeleteCustomPreset,
  onSaveCurrentRoute,
}: RouteCatalogDrawerProps) {
  return (
      <div
        data-testid="route-presets-catalog"
        className="mt-2.5 bg-[#0A0E17] border border-cyan-500/40 rounded-2xl p-3 shadow-2xl space-y-2.5 max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-[70] max-sm:mt-0 max-sm:max-h-[42dvh] max-sm:overflow-y-auto max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] [@media(max-height:450px)]:fixed [@media(max-height:450px)]:inset-y-0 [@media(max-height:450px)]:right-0 [@media(max-height:450px)]:left-auto [@media(max-height:450px)]:bottom-0 [@media(max-height:450px)]:z-[70] [@media(max-height:450px)]:mt-0 [@media(max-height:450px)]:w-[42%] [@media(max-height:450px)]:max-h-none [@media(max-height:450px)]:overflow-y-auto [@media(max-height:450px)]:rounded-none [@media(max-height:450px)]:border-y-0 [@media(max-height:450px)]:border-r-0"
      >
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-black uppercase tracking-wider text-white">Route Tree & Team Presets Catalog</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
            title="Close catalog"
            aria-label="Close route catalog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {playerSwitcher}

        <p className="text-[10px] text-neutral-400 font-mono">
          Tap a route to apply it to {selectedPlayer.label}. Set the depth with the rail beside the field.
        </p>

        {/* Custom Team Presets Section */}
        {customPresets.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
              <Star className="w-3 h-3 fill-current text-amber-400" />
              <span>Custom Team Presets ({customPresets.length}):</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {customPresets.map((cp) => {
                const isCurrent = selectedPlayer.quickRouteName === cp.name;
                return (
                  <div key={cp.id} className="relative group">
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => onApplyCustomPreset(cp)}
                      className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between gap-1.5 cursor-pointer ${
                        isCurrent
                          ? "bg-emerald-500 text-black border-emerald-400 shadow-md font-extrabold"
                          : "bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/50 hover:text-white border-emerald-500/30"
                      }`}
                    >
                      <span className="min-w-0 break-words">{cp.name}</span>
                      {isCurrent && <Check className="w-3 h-3 text-black shrink-0" />}
                    </button>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={(e) => onDeleteCustomPreset(cp.id, cp.name, e)}
                        className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600/80 hover:bg-red-500 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title={`Delete preset ${cp.name}`}
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
          <div className="text-[10px] font-bold text-neutral-400 flex flex-wrap items-center justify-between gap-1">
            <span>Standard Route Tree ({ROUTE_PRESETS_CATALOG.length})</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {ROUTE_PRESETS_CATALOG.map((rp) => {
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
                      ? "bg-cyan-500 text-black border-cyan-400 shadow-md font-extrabold"
                      : "bg-black/60 text-neutral-200 hover:bg-neutral-800 hover:text-white border-white/10"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-bold break-words leading-snug">{rp.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase ${
                          isCurrent ? "bg-black/20 text-black" : "bg-white/10 text-neutral-400"
                        }`}
                      >
                        {rp.category}
                      </span>
                    </div>
                    <div
                      className={`text-[11px] leading-snug mt-1 line-clamp-2 ${
                        isCurrent ? "text-black/80 font-medium" : "text-neutral-400 font-normal"
                      }`}
                    >
                      {rp.description}
                    </div>
                  </div>
                  {isCurrent && <Check className="w-4 h-4 text-black shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom add preset shortcut inside menu */}
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span className="text-neutral-400 font-mono text-[10px]">
            {isDemo ? "⚡ Demo Mode: Presets are session-only" : `Capacity: ${customPresets.length}/20 custom presets`}
          </span>
          <button
            type="button"
            onClick={onSaveCurrentRoute}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save Current Route as Preset</span>
          </button>
        </div>
      </div>
  );
}
