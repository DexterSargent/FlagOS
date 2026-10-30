"use client";

import React, { useEffect, useId, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { addSandboxPlayer } from "@/lib/demoSandbox";
import { createSecureRecord } from "@/lib/secureWrites";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";
import { usePageGuide } from "@/lib/pageGuide";
import { QUICK_ADD_PLAYER_WALKTHROUGH } from "@/lib/walkthroughs/league";
import FormNotice, { type FormNoticeState } from "@/components/ui/FormNotice";

const POSITIONS = ["QB", "WR", "RB", "C", "DB", "RUSH", "LB", "ATH"];

export interface QuickAddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  managedTeam: any;
  activeLeagueId: string;
  isEffectiveDemo: boolean;
  onPlayerAdded: (player: any) => void;
}

export function QuickAddPlayerModal({
  isOpen,
  onClose,
  managedTeam,
  activeLeagueId,
  isEffectiveDemo,
  onPlayerAdded,
}: QuickAddPlayerModalProps) {
  usePageGuide(isOpen ? QUICK_ADD_PLAYER_WALKTHROUGH : null, 1);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");
  const [newPlayerPositions, setNewPlayerPositions] = useState<string[]>([]);
  const [newPlayerExperience, setNewPlayerExperience] = useState("Rookie");
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [notice, setNotice] = useState<FormNoticeState | null>(null);
  const fieldId = useId();

  useEffect(() => {
    if (!isOpen) return;
    setNotice(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !addingPlayer) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, addingPlayer, onClose]);

  if (!isOpen || !managedTeam) return null;

  const togglePosition = (pos: string) => {
    if (newPlayerPositions.includes(pos)) {
      setNewPlayerPositions(newPlayerPositions.filter((p) => p !== pos));
    } else {
      setNewPlayerPositions([...newPlayerPositions, pos]);
    }
  };

  const handleQuickAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managedTeam) return;
    setNotice(null);
    if (!newPlayerName.trim()) {
      setNotice({ tone: "error", message: "Enter the athlete's full name." });
      return;
    }

    const num = parseInt(newPlayerNumber, 10);
    if (isNaN(num) || num < 0 || num > 99) {
      setNotice({ tone: "error", message: "Jersey number must be a whole number between 0 and 99." });
      return;
    }

    setAddingPlayer(true);
    try {
      if (isEffectiveDemo) {
        const newP = addSandboxPlayer({
          playerName: newPlayerName.trim(),
          number: num.toString(),
          teamId: managedTeam.id,
          positions: newPlayerPositions.length > 0 ? newPlayerPositions : ["ATH"],
          position: newPlayerPositions[0] || "ATH",
          experience: newPlayerExperience || "Rookie",
        });

        onPlayerAdded(newP);
        setNewPlayerName("");
        setNewPlayerNumber("");
        setNewPlayerPositions([]);
        setNewPlayerExperience("Rookie");
        onClose();
        setAddingPlayer(false);
        return;
      }

      const playerId = await createSecureRecord("player", {
        playerName: newPlayerName.trim(),
        number: num.toString(),
        teamId: managedTeam.id,
        leagueId: activeLeagueId,
        positions: newPlayerPositions.length > 0 ? newPlayerPositions : ["ATH"],
        isQB: newPlayerPositions.includes("QB"),
        experience: newPlayerExperience || "Rookie",
        createdAt: new Date().toISOString(),
      });

      onPlayerAdded({
        id: playerId,
        playerName: newPlayerName.trim(),
        number: num.toString(),
        teamId: managedTeam.id,
        positions: newPlayerPositions.length > 0 ? newPlayerPositions : ["ATH"],
        isQB: newPlayerPositions.includes("QB"),
        experience: newPlayerExperience || "Rookie",
      });

      setNewPlayerName("");
      setNewPlayerNumber("");
      setNewPlayerPositions([]);
      setNewPlayerExperience("Rookie");
      onClose();
    } catch (err) {
      console.error("Error creating player:", err);
      setNotice({ tone: "error", message: "The player could not be added. Check your connection and try again." });
    }
    setAddingPlayer(false);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${fieldId}-title`}
        className="bg-white dark:bg-[#0D121F] border border-slate-200 dark:border-cyan-500/40 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative text-slate-900 dark:text-white"
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-line">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
            <h3 id={`${fieldId}-title`} className="text-lg font-black uppercase">Add Player to Roster</h3>
          </div>
          <div className="flex items-center gap-2">
            <PageGuideButton />
            <button
            onClick={onClose}
            aria-label="Close"
            className="text-neutral-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white p-1 rounded-lg hover:bg-surface-muted cursor-pointer"
          >
            <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form data-tour="quick-add-player-fields" onSubmit={handleQuickAddPlayer} noValidate className="space-y-4">
          <FormNotice notice={notice} onDismiss={() => setNotice(null)} />
          <div>
            <span className="text-[11px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider block mb-1.5">
              Team
            </span>
            <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-black/50 border border-line text-xs font-bold">
              {managedTeam.name}
            </div>
          </div>

          <div>
            <label htmlFor={`${fieldId}-name`} className="text-[11px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider block mb-1.5">
              Athlete Full Name *
            </label>
            <input
              id={`${fieldId}-name`}
              type="text"
              required
              maxLength={80}
              autoComplete="off"
              autoFocus
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="e.g. Marcus Williams"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-line focus:border-cyan-500 text-xs outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor={`${fieldId}-number`} className="text-[11px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider block mb-1.5">
              Jersey Number (0-99) *
            </label>
            <input
              id={`${fieldId}-number`}
              type="number"
              inputMode="numeric"
              min="0"
              max="99"
              step="1"
              required
              value={newPlayerNumber}
              onChange={(e) => setNewPlayerNumber(e.target.value)}
              placeholder="e.g. 7"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-line focus:border-cyan-500 text-xs outline-none transition-colors"
            />
          </div>

          <div>
            <span id={`${fieldId}-positions`} className="text-[11px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider block mb-1.5">
              Positions (Select all that apply)
            </span>
            <div role="group" aria-labelledby={`${fieldId}-positions`} className="flex flex-wrap gap-1.5">
              {POSITIONS.map((pos) => {
                const isSelected = newPlayerPositions.includes(pos);
                return (
                  <button
                    key={pos}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => togglePosition(pos)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                        : "bg-slate-100 text-neutral-600 dark:bg-black/50 dark:text-neutral-400 border border-line hover:border-slate-400 dark:hover:border-white/20"
                    }`}
                  >
                    {pos}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor={`${fieldId}-experience`} className="text-[11px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider block mb-1.5">
              Experience Level
            </label>
            <select
              id={`${fieldId}-experience`}
              value={newPlayerExperience}
              onChange={(e) => setNewPlayerExperience(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-line focus:border-cyan-500 text-xs outline-none transition-colors cursor-pointer"
            >
              <option value="Rookie" className="bg-white text-slate-900 dark:bg-neutral-900 dark:text-white">Rookie (First Season)</option>
              <option value="1-2 Years" className="bg-white text-slate-900 dark:bg-neutral-900 dark:text-white">1-2 Years Experience</option>
              <option value="Veteran" className="bg-white text-slate-900 dark:bg-neutral-900 dark:text-white">Veteran (3+ Seasons)</option>
              <option value="All-Star" className="bg-white text-slate-900 dark:bg-neutral-900 dark:text-white">All-Star Tier</option>
            </select>
          </div>

          <div data-tour="quick-add-player-actions" className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={addingPlayer}
              className="px-4 py-2.5 rounded-xl bg-surface-muted hover:bg-slate-200 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-400 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addingPlayer}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)] disabled:opacity-50 cursor-pointer"
            >
              {addingPlayer ? "Adding…" : "Add Player"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default QuickAddPlayerModal;
