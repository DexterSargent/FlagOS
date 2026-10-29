"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Archive,
  AlertTriangle,
  Users,
  X,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  Shield,
} from "lucide-react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createSecureRecord } from "@/lib/secureWrites";
import type { TeamSeason } from "@/lib/teamSeasons";

interface PlayerOption {
  id: string;
  name: string;
  number?: string;
}

interface TeamSeasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
  teamSeasonArchived: boolean;
  seasons: TeamSeason[];
  currentSeasonId: string;
  onSeasonStarted: (newSeasonId: string, title: string) => void;
  onArchiveToggled: () => Promise<void>;
  archivingSeason: boolean;
}

export function TeamSeasonModal({
  isOpen,
  onClose,
  teamId,
  teamName,
  teamSeasonArchived,
  seasons,
  currentSeasonId,
  onSeasonStarted,
  onArchiveToggled,
  archivingSeason,
}: TeamSeasonModalProps) {
  const [mode, setMode] = useState<"overview" | "new_season">("overview");
  const [newSeasonTitle, setNewSeasonTitle] = useState("");
  const [rosterSelectionMode, setRosterSelectionMode] = useState<"keep_all" | "select_players" | "new_roster">("keep_all");
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const currentSeason = seasons.find((s) => s.id === currentSeasonId) || seasons[seasons.length - 1];

  // Load players when modal opens
  useEffect(() => {
    if (!isOpen) {
      setMode("overview");
      setErrorMsg("");
      return;
    }

    setNewSeasonTitle(`Season ${seasons.length + 1}`);

    let cancelled = false;
    async function fetchRoster() {
      setLoadingPlayers(true);
      try {
        const snap = await getDocs(
          query(collection(db, "players"), where("teamId", "==", teamId), limit(100))
        );
        if (!cancelled) {
          const list: PlayerOption[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: String(data.playerName || data.name || "Player"),
              number: data.number || data.jerseyNumber || "",
            };
          });
          setPlayers(list);
          setSelectedPlayerIds(list.map((p) => p.id));
        }
      } catch (err) {
        console.warn("Could not load players for team season modal:", err);
      } finally {
        if (!cancelled) setLoadingPlayers(false);
      }
    }

    void fetchRoster();
    return () => {
      cancelled = true;
    };
  }, [isOpen, teamId, seasons.length]);

  if (!isOpen) return null;

  const togglePlayerSelected = (playerId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const selectAll = () => setSelectedPlayerIds(players.map((p) => p.id));
  const deselectAll = () => setSelectedPlayerIds([]);

  const handleStartSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newSeasonTitle.trim();
    if (!title) {
      setErrorMsg("Please provide a name for the new season.");
      return;
    }
    if (rosterSelectionMode === "select_players" && selectedPlayerIds.length === 0) {
      setErrorMsg("Select at least one returning player, or choose 'Start Fresh With New Roster'.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      const result = await createSecureRecord("start_team_season", {
        teamId,
        title,
        rosterSelectionMode,
        retainedPlayerIds: rosterSelectionMode === "select_players" ? selectedPlayerIds : undefined,
      });
      onSeasonStarted(result || "", title);
      onClose();
    } catch (err: any) {
      console.error("Failed to start team season:", err);
      setErrorMsg(err.message || "Could not start new season. Please retry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 p-6 text-white shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight">Season Management</h3>
              <p className="text-xs text-neutral-400">{teamName} Continuity</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Current Season Info Card */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-neutral-300">
              {currentSeason?.title || "Current Season"}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              teamSeasonArchived
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
            }`}>
              {teamSeasonArchived ? "Archived (Read-Only)" : "Active Season"}
            </span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {teamSeasonArchived
              ? "This season is archived. Game stats and roster are finalized. You can start the next season below."
              : "Active regulation games are recording stats. When the season is complete, you can conclude it or start next season."}
          </p>
        </div>

        {mode === "overview" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Toggle Archive */}
              <button
                type="button"
                disabled={archivingSeason}
                onClick={async () => {
                  try {
                    await onArchiveToggled();
                    onClose();
                  } catch {
                    // Handled upstream
                  }
                }}
                className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-purple-400 text-left transition-all cursor-pointer group shadow-xs space-y-1"
              >
                <div className="flex items-center gap-2 text-xs font-black uppercase text-white group-hover:text-purple-300">
                  <Archive className="w-4 h-4 text-purple-400" />
                  <span>{teamSeasonArchived ? "Reopen Season" : "Conclude Season"}</span>
                </div>
                <div className="text-[11px] text-neutral-400 leading-relaxed">
                  {teamSeasonArchived
                    ? "Reactivates this season so you can record further games or edit the roster."
                    : "Finalizes this season and makes all games and rosters read-only."}
                </div>
              </button>

              {/* Option 2: Start Next Season */}
              <button
                type="button"
                onClick={() => setMode("new_season")}
                className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 hover:border-cyan-400 text-left transition-all cursor-pointer group shadow-xs space-y-1"
              >
                <div className="flex items-center gap-2 text-xs font-black uppercase text-cyan-300 group-hover:text-cyan-200">
                  <RefreshCw className="w-4 h-4 text-cyan-400" />
                  <span>Start Next Season</span>
                </div>
                <div className="text-[11px] text-neutral-400 leading-relaxed">
                  Archives this season&apos;s stats to Team History and rolls over the team into a brand new season.
                </div>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleStartSeason} className="space-y-4">
            {/* New Season Title */}
            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">New season name</span>
              <input
                type="text"
                value={newSeasonTitle}
                maxLength={80}
                onChange={(e) => setNewSeasonTitle(e.target.value)}
                placeholder="e.g. Fall 2026, Season 2"
                className="w-full rounded-xl bg-black/60 border border-white/20 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </label>

            {/* Roster Continuity Options */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-white">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Roster Continuity for New Season</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Do you want to carry over the same players or start fresh for the upcoming season?
              </p>

              <div className="space-y-2 pt-1">
                {/* Keep All */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    rosterSelectionMode === "keep_all"
                      ? "bg-cyan-500/10 border-cyan-500 text-white ring-1 ring-cyan-500/30"
                      : "bg-black/30 border-white/10 hover:border-white/20 text-neutral-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="rosterSelectionMode"
                    value="keep_all"
                    checked={rosterSelectionMode === "keep_all"}
                    onChange={() => setRosterSelectionMode("keep_all")}
                    className="mt-0.5 text-cyan-600 focus:ring-cyan-500"
                  />
                  <div>
                    <div className="text-xs font-black uppercase">Keep Entire Roster (Recommended)</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      All {players.length} current players roll over to the new season.
                    </div>
                  </div>
                </label>

                {/* Select Returning Players */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    rosterSelectionMode === "select_players"
                      ? "bg-cyan-500/10 border-cyan-500 text-white ring-1 ring-cyan-500/30"
                      : "bg-black/30 border-white/10 hover:border-white/20 text-neutral-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="rosterSelectionMode"
                    value="select_players"
                    checked={rosterSelectionMode === "select_players"}
                    onChange={() => setRosterSelectionMode("select_players")}
                    className="mt-0.5 text-cyan-600 focus:ring-cyan-500"
                  />
                  <div className="flex-1">
                    <div className="text-xs font-black uppercase">Select Returning Players</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      Choose which players are returning. Unselected players are removed from the active roster.
                    </div>
                  </div>
                </label>

                {/* Checklist if Select Returning Players */}
                {rosterSelectionMode === "select_players" && (
                  <div className="ml-6 p-3 rounded-xl bg-black/60 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-white/5 text-[11px]">
                      <span className="font-bold text-neutral-300">
                        Returning ({selectedPlayerIds.length} of {players.length})
                      </span>
                      <div className="flex gap-2 text-[10px]">
                        <button type="button" onClick={selectAll} className="text-cyan-400 hover:underline font-bold">
                          Select All
                        </button>
                        <span className="text-neutral-600">|</span>
                        <button type="button" onClick={deselectAll} className="text-neutral-400 hover:underline">
                          Clear
                        </button>
                      </div>
                    </div>

                    {loadingPlayers ? (
                      <p className="text-[11px] text-neutral-400 py-1">Loading roster...</p>
                    ) : players.length === 0 ? (
                      <p className="text-[11px] text-neutral-400 py-1">No players currently on roster.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                        {players.map((p) => {
                          const isChecked = selectedPlayerIds.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer ${
                                isChecked
                                  ? "bg-cyan-500/10 border-cyan-500/40 text-white font-medium"
                                  : "bg-white/[0.02] border-white/5 text-neutral-400"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => togglePlayerSelected(p.id)}
                                className="rounded text-cyan-600 focus:ring-cyan-500"
                              />
                              <span className="truncate">{p.name}</span>
                              {p.number && (
                                <span className="text-[10px] text-neutral-500 font-mono ml-auto">
                                  #{p.number}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Start Fresh With New Roster */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    rosterSelectionMode === "new_roster"
                      ? "bg-cyan-500/10 border-cyan-500 text-white ring-1 ring-cyan-500/30"
                      : "bg-black/30 border-white/10 hover:border-white/20 text-neutral-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="rosterSelectionMode"
                    value="new_roster"
                    checked={rosterSelectionMode === "new_roster"}
                    onChange={() => setRosterSelectionMode("new_roster")}
                    className="mt-0.5 text-cyan-600 focus:ring-cyan-500"
                  />
                  <div>
                    <div className="text-xs font-black uppercase">Start Fresh With New Roster</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      Clears the active roster for new signups. Past players retain their historical career stats.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg"
              >
                {submitting ? "Starting Season..." : "Start Season"}
              </button>
              <button
                type="button"
                onClick={() => setMode("overview")}
                className="px-4 py-2.5 rounded-xl border border-white/20 text-xs font-bold text-neutral-300 hover:text-white cursor-pointer"
              >
                Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default TeamSeasonModal;
