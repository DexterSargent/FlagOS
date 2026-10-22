"use client";

import React, { useState, useEffect } from "react";
import {
  PlaySide,
  Playbook,
  MAX_PLAYBOOKS_PER_TEAM,
  DEFAULT_LOS_Y,
  FormationAlignment,
  ensureSquadMatchup,
  applyFormationToSquad
} from "@/lib/playbookTypes";
import { useLeague } from "@/lib/leagueContext";
import { X, Zap, Shield, Check, AlertCircle, Sparkles, Users } from "lucide-react";

interface CreatePlaybookModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  currentPlaybookCount: number;
  onCreate: (newPlaybook: Playbook) => void;
  defaultPlayersOnField?: number;
}

export default function CreatePlaybookModal({
  isOpen,
  onClose,
  teamId,
  currentPlaybookCount,
  onCreate,
  defaultPlayersOnField,
}: CreatePlaybookModalProps) {
  const { settings } = useLeague();
  const leagueRulePlayers = settings?.rules?.playersOnField || 5;

  const [title, setTitle] = useState("");
  const [type, setType] = useState<PlaySide>("offense");
  const [playersOnField, setPlayersOnField] = useState<number>(defaultPlayersOnField || leagueRulePlayers);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Sync default to league rules whenever modal opens or rules change
  useEffect(() => {
    if (isOpen) {
      setPlayersOnField(defaultPlayersOnField || settings?.rules?.playersOnField || 5);
      setError(null);
    }
  }, [isOpen, defaultPlayersOnField, settings?.rules?.playersOnField]);

  if (!isOpen) return null;

  const isAtLimit = currentPlaybookCount >= MAX_PLAYBOOKS_PER_TEAM;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAtLimit) {
      setError(`Teams can have up to ${MAX_PLAYBOOKS_PER_TEAM} playbooks.`);
      return;
    }
    if (!title.trim()) {
      setError("Please enter a title for your playbook.");
      return;
    }

    const squad = playersOnField || leagueRulePlayers;

    // Requirement: When creating a new playbook, there should not be any formations pre-loaded
    const newBook: Playbook = {
      id: `pb-${Date.now()}`,
      teamId,
      title: title.trim(),
      type,
      playersOnField: squad,
      description: description.trim(),
      formations: [], // Clean slate with 0 pre-loaded formations
      plays: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onCreate(newBook);
    setTitle("");
    setDescription("");
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0B0F19] border border-white/10 rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                New Playbook
              </span>
              <span className="text-xs font-mono text-neutral-400">
                {currentPlaybookCount}/{MAX_PLAYBOOKS_PER_TEAM} Created
              </span>
            </div>
            <h2 className="text-xl font-black uppercase text-white mt-1">Create a Playbook</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isAtLimit ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-red-300">Playbook Limit Reached</h4>
              <p className="text-xs text-neutral-300 mt-1">
                Your team already has {MAX_PLAYBOOKS_PER_TEAM} playbooks. Please delete an existing playbook before creating a new one.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/15 border border-red-500/40 rounded-2xl p-3 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Unit Selection: Offensive or Defensive Playbook */}
            <div>
              <label className="text-xs uppercase font-bold text-neutral-300 tracking-wider block mb-2">
                Playbook Unit
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType("offense")}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                    type === "offense"
                      ? "bg-cyan-500/15 border-cyan-400 text-white shadow-lg shadow-cyan-500/10"
                      : "bg-black/40 border-white/10 text-neutral-400 hover:border-white/20"
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
                  onClick={() => setType("defense")}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                    type === "defense"
                      ? "bg-purple-500/15 border-purple-400 text-white shadow-lg shadow-purple-500/10"
                      : "bg-black/40 border-white/10 text-neutral-400 hover:border-white/20"
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
            </div>

            {/* 2. Squad Format / Players Per Side (Defaults to League Rules) */}
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
                      onClick={() => setPlayersOnField(count)}
                      className={`relative pt-3 pb-2.5 px-1 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
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
              <p className="text-[11px] text-neutral-400 mt-2">
                {playersOnField === leagueRulePlayers
                  ? `Defaults to your league's ${leagueRulePlayers}v${leagueRulePlayers} rule. Formations will be automatically tailored for ${leagueRulePlayers} players.`
                  : `Custom squad size selected: ${playersOnField}v${playersOnField}. (Active league rule is ${leagueRulePlayers}v${leagueRulePlayers}).`}
              </p>
            </div>

            {/* 3. Playbook Title */}
            <div>
              <label className="text-xs uppercase font-bold text-neutral-300 tracking-wider block mb-1.5">
                Playbook Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  type === "offense"
                    ? `e.g. ${playersOnField}v${playersOnField} Spread Offense, Air Raid Attack`
                    : `e.g. ${playersOnField}v${playersOnField} Lockdown Defense, 2-Deep Zone`
                }
                className="w-full px-4 py-3 rounded-2xl bg-black/50 border border-white/10 focus:border-cyan-400 text-white text-sm outline-none"
              />
            </div>

            {/* 3. Optional Notes / Description */}
            <div>
              <label className="text-xs uppercase font-bold text-neutral-400 tracking-wider block mb-1.5">
                Description / Philosophy (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Fast-paced quick passing attack focusing on open grass..."
                className="w-full px-4 py-2.5 rounded-2xl bg-black/50 border border-white/10 focus:border-cyan-400 text-white text-xs outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Submit Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 ${
                  type === "offense"
                    ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/20"
                    : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Create Playbook</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
