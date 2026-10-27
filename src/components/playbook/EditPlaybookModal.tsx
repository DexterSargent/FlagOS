"use client";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";
import { usePageGuide } from "@/lib/pageGuide";
import { EDIT_PLAYBOOK_WALKTHROUGH } from "@/lib/walkthroughData";

import React, { useState, useEffect } from "react";
import { PlaySide, Playbook } from "@/lib/playbookTypes";
import { useLeague } from "@/lib/leagueContext";
import { X, Zap, Shield, Check, AlertCircle, Edit3, Users } from "lucide-react";

interface EditPlaybookModalProps {
  isOpen: boolean;
  onClose: () => void;
  playbook: Playbook | null;
  onSave: (updatedPlaybook: Playbook) => void;
}

export default function EditPlaybookModal({
  isOpen,
  onClose,
  playbook,
  onSave,
}: EditPlaybookModalProps) {
  const { settings } = useLeague();
  const leagueRulePlayers = settings?.rules?.playersOnField || 5;

  const [title, setTitle] = useState("");
  const [type, setType] = useState<PlaySide>("offense");
  const [playersOnField, setPlayersOnField] = useState<number>(leagueRulePlayers);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Sync state whenever modal opens or active playbook changes
  useEffect(() => {
    if (isOpen && playbook) {
      setTitle(playbook.title || "");
      setType(playbook.type || "offense");
      setPlayersOnField(playbook.playersOnField || leagueRulePlayers);
      setDescription(playbook.description || "");
      setError(null);
    }
  }, [isOpen, playbook, leagueRulePlayers]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  usePageGuide(isOpen ? EDIT_PLAYBOOK_WALKTHROUGH : null, 2);
  if (!isOpen || !playbook) return null;

  const formationsCount = playbook.formations?.length || 0;
  const playsCount = playbook.plays?.length || 0;
  const isTypeChanged = type !== playbook.type;
  const isSquadChanged = playersOnField !== (playbook.playersOnField || leagueRulePlayers);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a title for your playbook.");
      return;
    }

    const updated: Playbook = {
      ...playbook,
      title: title.trim(),
      type,
      playersOnField,
      description: description.trim(),
      updatedAt: new Date().toISOString(),
    };

    onSave(updated);
    setError(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-playbook-title"
      className="fixed inset-0 top-[var(--role-switcher-height,0px)] z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <div className="max-h-[calc(100dvh-var(--role-switcher-height,0px)-2rem)] overflow-y-auto bg-[#0B0F19] border border-white/10 rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl relative text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                <Edit3 className="w-3 h-3" />
                <span>Edit Playbook</span>
              </span>
              <span className="text-xs font-mono text-neutral-400">
                {formationsCount} {formationsCount === 1 ? "Formation" : "Formations"} • {playsCount} {playsCount === 1 ? "Play" : "Plays"}
              </span>
            </div>
            <PageGuideButton />
            <h2 id="edit-playbook-title" className="text-xl font-black uppercase text-white mt-1">
              Edit Playbook Details
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit playbook modal"
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form data-tour="edit-playbook-fields" onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div
              role="alert"
              className="bg-red-500/15 border border-red-500/40 rounded-2xl p-3 text-xs text-red-300 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Playbook Title */}
          <div>
            <label
              htmlFor="edit-playbook-title-input"
              className="text-xs uppercase font-bold text-neutral-300 tracking-wider block mb-1.5"
            >
              Playbook Title <span className="text-red-400">*</span>
            </label>
            <input
              id="edit-playbook-title-input"
              data-testid="edit-playbook-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 5v5 Spread Offense, Air Raid Attack"
              className="w-full px-4 py-3 rounded-2xl bg-black/50 border border-white/10 focus:border-cyan-400 text-white text-sm outline-none transition-colors"
            />
          </div>

          {/* 2. Unit Selection: Offensive or Defensive Playbook */}
          <div>
            <label className="text-xs uppercase font-bold text-neutral-300 tracking-wider block mb-2">
              Playbook Unit
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                data-testid="edit-playbook-unit-offense"
                onClick={() => setType("offense")}
                className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                  type === "offense"
                    ? "bg-cyan-500/15 border-cyan-400 text-white shadow-lg shadow-cyan-500/10"
                    : "bg-black/40 border-white/10 text-neutral-400 hover:border-white/20 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  {type === "offense" && <Check className="w-4 h-4 text-cyan-400" />}
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase text-white">Offensive Playbook</h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Passing concepts, routes, and motions
                  </p>
                </div>
              </button>

              <button
                type="button"
                data-testid="edit-playbook-unit-defense"
                onClick={() => setType("defense")}
                className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                  type === "defense"
                    ? "bg-purple-500/15 border-purple-400 text-white shadow-lg shadow-purple-500/10"
                    : "bg-black/40 border-white/10 text-neutral-400 hover:border-white/20 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  {type === "defense" && <Check className="w-4 h-4 text-purple-400" />}
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase text-white">Defensive Playbook</h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Zone coverages, man locks, and blitzes
                  </p>
                </div>
              </button>
            </div>
            {isTypeChanged && (formationsCount > 0 || playsCount > 0) && (
              <p className="text-[11px] text-amber-300/90 mt-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5">
                Note: Changing unit to {type === "offense" ? "Offense" : "Defense"} will update this playbook&apos;s category. Existing formations and plays will remain saved.
              </p>
            )}
          </div>

          {/* 3. Squad Format / Players Per Side */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>Squad Format (Players Per Side)</span>
              </label>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                League Rule: {leagueRulePlayers}v{leagueRulePlayers}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[4, 5, 6, 7, 8].map((count) => {
                const isSelected = playersOnField === count;
                const isLeagueDefault = count === leagueRulePlayers;
                return (
                  <button
                    key={count}
                    type="button"
                    data-testid={`edit-playbook-squad-${count}`}
                    onClick={() => setPlayersOnField(count)}
                    className={`relative pt-3 pb-2.5 px-1 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      isSelected
                        ? type === "offense"
                          ? "bg-cyan-500/20 border-cyan-400 text-white shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/50"
                          : "bg-purple-500/20 border-purple-400 text-white shadow-lg shadow-purple-500/10 ring-1 ring-purple-400/50"
                        : "bg-black/40 border-white/10 text-neutral-400 hover:border-white/20 hover:text-neutral-200"
                    }`}
                  >
                    {isLeagueDefault && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-cyan-500 text-black text-[8px] font-mono font-black tracking-tight uppercase shadow whitespace-nowrap">
                        RULE
                      </span>
                    )}
                    <span className="text-sm font-black font-mono">
                      {count}v{count}
                    </span>
                    <span className="text-[10px] text-neutral-400 leading-none">
                      {count} Players
                    </span>
                  </button>
                );
              })}
            </div>
            {isSquadChanged && (
              <p className="text-[11px] text-cyan-300/90 mt-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-2">
                Squad size updated to {playersOnField}v{playersOnField}. Future new formations will be tailored for {playersOnField} players.
              </p>
            )}
          </div>

          {/* 4. Description / Philosophy */}
          <div>
            <label
              htmlFor="edit-playbook-description-input"
              className="text-xs uppercase font-bold text-neutral-400 tracking-wider block mb-1.5"
            >
              Description / Philosophy (Optional)
            </label>
            <textarea
              id="edit-playbook-description-input"
              data-testid="edit-playbook-description-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Fast-paced quick passing attack focusing on open grass and boundary leverage..."
              className="w-full px-4 py-2.5 rounded-2xl bg-black/50 border border-white/10 focus:border-cyan-400 text-white text-xs outline-none resize-none leading-relaxed transition-colors"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              data-testid="edit-playbook-cancel-button"
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              data-tour="edit-playbook-save" type="submit"
              data-testid="edit-playbook-save-button"
              className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 cursor-pointer ${
                type === "offense"
                  ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/20"
                  : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20"
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
