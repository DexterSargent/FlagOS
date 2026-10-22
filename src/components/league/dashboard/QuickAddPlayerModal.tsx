"use client";

import React, { useState } from "react";
import { UserPlus, X } from "lucide-react";
import { addSandboxPlayer } from "@/lib/demoSandbox";
import { createSecureRecord } from "@/lib/secureWrites";

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
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");
  const [newPlayerPositions, setNewPlayerPositions] = useState<string[]>([]);
  const [newPlayerExperience, setNewPlayerExperience] = useState("Rookie");
  const [addingPlayer, setAddingPlayer] = useState(false);

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
    if (!managedTeam || !newPlayerName.trim()) return;

    const num = parseInt(newPlayerNumber);
    if (isNaN(num) || num < 0 || num > 99) {
      alert("Jersey number must be a valid number between 0 and 99.");
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
        playerNumber: num.toString(),
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
        playerNumber: num.toString(),
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
      alert("Failed to add player. Please try again.");
    }
    setAddingPlayer(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0D121F] border border-cyan-500/40 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-line">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-black uppercase text-white">Add Player to Roster</h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-surface-muted cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleQuickAddPlayer} className="space-y-4">
          <div>
            <label className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block mb-1.5">
              Team
            </label>
            <div className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-line text-white text-xs font-bold">
              {managedTeam.name}
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block mb-1.5">
              Athlete Full Name *
            </label>
            <input
              type="text"
              required
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="e.g. Marcus Williams"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-line focus:border-cyan-500 text-white text-xs outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block mb-1.5">
              Jersey Number (0-99) *
            </label>
            <input
              type="number"
              min="0"
              max="99"
              required
              value={newPlayerNumber}
              onChange={(e) => setNewPlayerNumber(e.target.value)}
              placeholder="e.g. 7"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-line focus:border-cyan-500 text-white text-xs outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block mb-1.5">
              Positions (Select all that apply)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {POSITIONS.map((pos) => {
                const isSelected = newPlayerPositions.includes(pos);
                return (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => togglePosition(pos)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                        : "bg-black/50 text-neutral-400 border border-line hover:border-white/20"
                    }`}
                  >
                    {pos}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block mb-1.5">
              Experience Level
            </label>
            <select
              value={newPlayerExperience}
              onChange={(e) => setNewPlayerExperience(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-line focus:border-cyan-500 text-white text-xs outline-none transition-colors cursor-pointer"
            >
              <option value="Rookie" className="bg-neutral-900 text-white">Rookie (First Season)</option>
              <option value="1-2 Years" className="bg-neutral-900 text-white">1-2 Years Experience</option>
              <option value="Veteran" className="bg-neutral-900 text-white">Veteran (3+ Seasons)</option>
              <option value="All-Star" className="bg-neutral-900 text-white">All-Star Tier</option>
            </select>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-surface-muted hover:bg-white/10 text-neutral-400 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addingPlayer}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)] disabled:opacity-50 cursor-pointer"
            >
              {addingPlayer ? "Signing..." : "Sign Athlete"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default QuickAddPlayerModal;
