"use client";
import { usePageGuide } from "@/lib/pageGuide";
import { SAVE_ROUTE_PRESET_WALKTHROUGH, POSITION_NOTES_WALKTHROUGH, PLAY_NOTES_WALKTHROUGH } from "@/lib/walkthroughData";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";

import { Bookmark, FileText, MessageSquare, X } from "lucide-react";
import type { PlayerNode } from "@/lib/playbookTypes";

interface SaveRoutePresetDialogProps {
  customPresetCount: number;
  waypointCount: number;
  isDemo: boolean;
  presetName: string;
  onPresetNameChange: (name: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function SaveRoutePresetDialog({
  customPresetCount,
  waypointCount,
  isDemo,
  presetName,
  onPresetNameChange,
  onSave,
  onClose,
}: SaveRoutePresetDialogProps) {
  usePageGuide(SAVE_ROUTE_PRESET_WALKTHROUGH, 2);
  return (
      <div className="fixed inset-0 top-[var(--role-switcher-height,0px)] z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div data-tour="save-route-preset-fields" className="bg-[#0B0F19] border border-emerald-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Bookmark className="w-4 h-4" />
              </div>
              <div>
                <PageGuideButton />
                <h3 className="text-sm font-black uppercase text-white">Save Route Preset</h3>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {customPresetCount}/20 custom presets for this team
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] uppercase font-bold text-neutral-300 block mb-1">
                Preset Name
              </label>
              <input
                type="text"
                autoFocus
                value={presetName}
                onChange={(e) => onPresetNameChange(e.target.value)}
                placeholder="e.g. Post-Corner, Wheel-Fade, Sluggo..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSave();
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-emerald-500 text-white text-xs outline-none"
              />
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-[11px] text-neutral-300 space-y-1">
              <div className="flex items-center justify-between font-mono">
                <span className="text-neutral-400">Waypoints:</span>
                <span className="text-emerald-400 font-bold">{waypointCount} cuts/points</span>
              </div>
              {isDemo ? (
                <p className="text-[10px] text-amber-300/90 leading-relaxed pt-1 font-semibold">
                  ⚡ Demo League Mode: This preset is stored in session memory and will not be saved to the database. Refreshing the tab will clear it.
                </p>
              ) : (
                <p className="text-[10px] text-neutral-400 leading-relaxed pt-1">
                  Once saved, this route preset is saved to this team and will be available for all plays so any receiver can run it.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!presetName.trim()}
              onClick={onSave}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
            >
              Save to Team ({customPresetCount}/20)
            </button>
          </div>
        </div>
      </div>
  );
}

interface PositionNotesDialogProps {
  playName: string;
  players: PlayerNode[];
  readOnly: boolean;
  onUpdatePlayerNotes: (playerId: string, notes: string) => void;
  onClose: () => void;
}

export function PositionNotesDialog({
  playName,
  players,
  readOnly,
  onUpdatePlayerNotes,
  onClose,
}: PositionNotesDialogProps) {
  usePageGuide(POSITION_NOTES_WALKTHROUGH, 2);
  return (
      <div className="fixed inset-0 top-[var(--role-switcher-height,0px)] z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div data-tour="position-notes-fields" className="bg-[#0B0F19] border border-cyan-500/40 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[calc(100dvh-var(--role-switcher-height,0px)-2rem)] flex flex-col">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <PageGuideButton />
                <h3 className="text-base font-black uppercase text-white tracking-wide">
                  {playName} • Position Notes & Read Progression
                </h3>
                <span className="text-[10px] text-neutral-400 font-mono">
                  Install instructions & coaching notes for each position on field
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            {players.map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2 hover:border-cyan-500/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/40 font-mono font-black text-cyan-300 text-xs flex items-center justify-center">
                      {p.label}
                    </span>
                    <span className="text-xs font-bold text-white">{p.role}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-neutral-400">
                    Assignment:{" "}
                    <strong className="text-cyan-400">
                      {p.quickRouteName ||
                        (p.route && p.route.length > 0
                          ? "Custom Drawn Route"
                          : p.coverageType?.toUpperCase() || "Default Alignment")}
                    </strong>
                  </span>
                </div>

                <textarea
                  rows={2}
                  disabled={readOnly}
                  value={p.notes || ""}
                  onChange={(e) => onUpdatePlayerNotes(p.id, e.target.value)}
                  placeholder={`e.g. Read free safety: if shading outside, break 2 steps inside. Checkdown option.`}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-cyan-500 text-white text-xs outline-none resize-none leading-relaxed"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-white/10 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20"
            >
              Done
            </button>
          </div>
        </div>
      </div>
  );
}

interface PlayNotesDialogProps {
  notes: string;
  readOnly: boolean;
  onNotesChange: (notes: string) => void;
  onClose: () => void;
}

export function PlayNotesDialog({ notes, readOnly, onNotesChange, onClose }: PlayNotesDialogProps) {
  usePageGuide(PLAY_NOTES_WALKTHROUGH, 2);
  return (
      <div className="fixed inset-0 top-[var(--role-switcher-height,0px)] z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div data-tour="play-notes-fields" className="bg-[#0B0F19] border border-white/20 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <PageGuideButton />
                <h3 className="text-sm font-black uppercase text-white">Coach Playbook Scheme Notes</h3>
                <span className="text-[10px] text-neutral-400 font-mono">
                  High-level concept, QB progression & situational rules
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <textarea
            rows={5}
            disabled={readOnly}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="e.g. Read safety rotation: if Cover 2, look to split the safeties with X. Checkdown to RB on 3rd step. Use in 3rd & long or 2-minute drill."
            className="w-full p-3.5 rounded-2xl bg-black/60 border border-white/10 focus:border-cyan-500 text-white text-xs outline-none resize-none leading-relaxed"
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20"
            >
              Save Notes
            </button>
          </div>
        </div>
      </div>
  );
}
