"use client";

import React, { useState, useEffect } from "react";
import { Trophy, X, Sparkles, Check, Shield } from "lucide-react";
import FieldHelpTooltip from "@/components/FieldHelpTooltip";
import { getNearestSimplePlayoffBracket } from "@/lib/leagueContext";

interface EditPlayoffFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalTeams: number;
  currentTeamsCount: number;
  currentStructure?: "single_elimination" | "double_elimination";
  onSave: (newTeamsCount: number, structure: "single_elimination" | "double_elimination") => Promise<void>;
}

export default function EditPlayoffFormatModal({
  isOpen,
  onClose,
  totalTeams,
  currentTeamsCount,
  currentStructure = "single_elimination",
  onSave,
}: EditPlayoffFormatModalProps) {
  const defaultCount = getNearestSimplePlayoffBracket(totalTeams);
  const [selectedCount, setSelectedCount] = useState<number>(() => {
    if (currentTeamsCount && (currentTeamsCount !== 14 || totalTeams === 32) && currentTeamsCount <= totalTeams) {
      return currentTeamsCount;
    }
    return defaultCount;
  });
  const [selectedStructure, setSelectedStructure] = useState<"single_elimination" | "double_elimination">(
    currentStructure
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (currentTeamsCount && (currentTeamsCount !== 14 || totalTeams === 32) && currentTeamsCount <= totalTeams) {
        setSelectedCount(currentTeamsCount);
      } else {
        setSelectedCount(getNearestSimplePlayoffBracket(totalTeams));
      }
      setSelectedStructure(currentStructure);
    }
  }, [isOpen, currentTeamsCount, totalTeams, currentStructure]);

  if (!isOpen) return null;

  const maxTeams = Math.max(2, totalTeams);
  const clampedCount = Math.min(maxTeams, Math.max(2, selectedCount));

  // Calculate bracket rounds and byes for preview
  let P = 2;
  while (P < clampedCount) {
    P *= 2;
  }
  const W = Math.round(Math.log2(P));
  const byesCount = P - clampedCount;
  const singleRoundsCount = W;
  const doubleRoundsCount = W + Math.max(1, 2 * (W - 1)) + 1; // Upper + Lower + Grand Finals

  const handleApply = async () => {
    setSaving(true);
    try {
      await onSave(clampedCount, selectedStructure);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const quickPresets = [2, 4, 6, 8, 12, 14, 16, 24, 32, 64, totalTeams]
    .filter((n, idx, arr) => n >= 2 && n <= totalTeams && arr.indexOf(n) === idx);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn">
      <div className="bg-[#0B0F19] border border-cyan-500/30 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                Live Tournament Configuration
              </span>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">
                Change Playoff Format
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <p className="text-xs text-neutral-300 leading-relaxed">
            Update how many franchises qualify and whether the tournament operates as <strong>Single Elimination</strong> or <strong>Double Elimination</strong> at any point in the season without affecting regular season scores.
          </p>

          {/* Elimination Structure Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Elimination System</span>
              <FieldHelpTooltip
                title="Tournament Structure"
                content="Choose Single Elimination (1 loss knockout) or Double Elimination (Winners and Losers bracket where teams must lose twice before being eliminated)."
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedStructure("single_elimination")}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedStructure === "single_elimination"
                    ? "bg-cyan-500/10 border-cyan-500/50 shadow-md shadow-cyan-500/10"
                    : "bg-black/40 border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-cyan-400" />
                    Single Elim
                  </span>
                  {selectedStructure === "single_elimination" && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  Traditional knockout path. One loss and a franchise is eliminated.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStructure("double_elimination")}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedStructure === "double_elimination"
                    ? "bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10"
                    : "bg-black/40 border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    Double Elim
                  </span>
                  {selectedStructure === "double_elimination" && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  Winners & Losers brackets. Teams require 2 defeats before elimination.
                </p>
              </button>
            </div>
          </div>

          {/* Teams Count Selector */}
          <div className="space-y-3 p-4 rounded-2xl bg-black/60 border border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Playoff Qualifiers</span>
                <FieldHelpTooltip
                  title="Playoff Seed Size"
                  content="The number of top regular season seeds that earn postseason tournament berths. Bye weeks are automatically granted to top seeds when field size is not a power of 2."
                />
              </label>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-cyan-400 font-mono">
                  {clampedCount}
                </span>
                <span className="text-xs font-mono text-neutral-500">
                  / {totalTeams} Teams
                </span>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={2}
              max={maxTeams}
              value={clampedCount}
              onChange={(e) => setSelectedCount(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-neutral-800 rounded-lg"
            />

            <div className="flex justify-between text-[10px] font-mono text-neutral-500">
              <span>2 Teams (Championship Only)</span>
              <span>All {totalTeams} Teams</span>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
              Quick Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {quickPresets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedCount(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                    clampedCount === p
                      ? "bg-cyan-500 text-black border-cyan-400 shadow-md"
                      : "bg-white/5 text-neutral-400 hover:text-white border-white/10"
                  }`}
                >
                  {p === totalTeams ? `All (${p})` : `${p} Teams${p === defaultCount ? " (Default)" : ""}`}
                </button>
              ))}
            </div>
          </div>

          {/* Live Bracket Structure Preview */}
          <div className={`p-4 rounded-2xl border space-y-2 text-xs ${
            selectedStructure === "double_elimination"
              ? "bg-amber-950/20 border-amber-500/30 text-amber-200"
              : "bg-cyan-950/20 border-cyan-500/30 text-cyan-200"
          }`}>
            <div className="flex items-center gap-2 font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Calculated Tournament Structure ({selectedStructure === "double_elimination" ? "Double Elimination" : "Single Elimination"})</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 text-[11px] font-mono">
              <div>
                <span className="text-neutral-500 block">Tournament Rounds:</span>
                <span className="text-white font-bold">
                  {selectedStructure === "double_elimination"
                    ? `${doubleRoundsCount} Total Rounds (${W} Upper, ${Math.max(1, 2 * (W - 1))} Lower, Finals)`
                    : `${singleRoundsCount} Knockout Rounds`}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">Upper Seed Byes:</span>
                <span className="text-emerald-400 font-bold">
                  {byesCount > 0 ? `Top ${byesCount} Seed${byesCount > 1 ? "s" : ""} Bye` : "None (All Play Round 1)"}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 pt-1 leading-relaxed">
              {selectedStructure === "double_elimination"
                ? `Franchises that lose their first match drop to the Elimination Bracket for a second-chance path to the Grand Championship.`
                : byesCount > 0
                ? `Seeds #1 through #${byesCount} are automatically placed in the second round, while the remaining seeds play opening knockout matchups.`
                : `All ${clampedCount} teams begin play in the opening round.`}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={saving}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving..." : "Apply Playoff Format"}
          </button>
        </div>
      </div>
    </div>
  );
}
