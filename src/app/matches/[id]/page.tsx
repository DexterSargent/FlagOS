"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ShieldAlert, Clock, MapPin, Edit2, Trash2, X, Zap } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/lib/authContext";
import { useLeague } from "@/lib/leagueContext";
import { renderFlagOS } from "@/components/FlagOSText";
import { simulateFullGame } from "@/lib/gameSimulator";
import { usePrivateLeagueAccess } from "@/lib/usePrivateLeagueAccess";
import { getSandboxMatches, getSandboxMatch, updateSandboxMatch, deleteSandboxMatch, deleteSandboxPlaysForMatch, subscribeDemoSandbox } from "@/lib/demoSandbox";
import { getYorkMatch } from "@/lib/yorkTeamData";

export default function MatchDetails({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const matchId = unwrappedParams.id;
  const { settings, isDemoLeague, activeLeagueId } = useLeague();
  const { user, isLeagueAdmin, canManageTeam, isPlatformAdmin } = useAuth();

  const { isDenied, deniedElement } = usePrivateLeagueAccess({
    isPrivateOverride: matchId.startsWith("match_live_"),
  });



  const [matchData, setMatchData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulateGame = async () => {
    if (!isPlatformAdmin || !matchData) return;
    if (
      !window.confirm(
        `⚡ Simulate Full Game?\n\nThis will randomly generate a complete, realistic game of play-by-play (passes, runs, TDs, 1/2pt conversions, flags, PBUs, sacks) between ${matchData.homeTeamName} and ${matchData.awayTeamName}.\n\nAll events and scores will calculate into official team standings and player stat leaderboards.`
      )
    ) {
      return;
    }
    setIsSimulating(true);
    try {
      const res = await simulateFullGame(matchId, {
        leagueId: activeLeagueId,
        isDemo: isDemoLeague,
      });
      if (res.success) {
        setMatchData((prev: any) => ({
          ...prev,
          status: "completed",
          homeScore: res.homeScore,
          awayScore: res.awayScore,
        }));
      } else {
        alert(res.error || "Failed to simulate game.");
      }
    } catch (err: any) {
      console.error("Simulation error:", err);
      alert(err.message || "Failed to simulate game.");
    } finally {
      setIsSimulating(false);
    }
  };

  const openEditModal = () => {
    setEditForm({
      week: matchData.week || "",
      date: matchData.date || "",
      time: matchData.time || "",
      location: matchData.location || settings.defaultLocation || "Turf Field 1",
      homeTeamName: matchData.homeTeamName || "",
      awayTeamName: matchData.awayTeamName || "",
      homeScore: matchData.homeScore ?? 0,
      awayScore: matchData.awayScore ?? 0,
      status: matchData.status || "scheduled",
      isPreseason: matchData.isPreseason || false,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLeagueAdmin || !editForm) return;

    const updatedData = {
      ...matchData,
      ...editForm,
      matchdayIndex: parseInt(editForm.week?.replace(/\D/g, "") || "0", 10) || matchData.matchdayIndex || 1,
    };

    if (isDemoLeague) {
      updateSandboxMatch(matchId, updatedData);
      setMatchData(updatedData);
      setIsEditModalOpen(false);
      return;
    }

    try {
      await updateDoc(doc(db, "matches", matchId), updatedData);
      setMatchData(updatedData);
      setIsEditModalOpen(false);
    } catch (err) {
      console.error("Failed to update match:", err);
      alert("Failed to save changes. Please try again.");
    }
  };

  const handleDeleteMatch = async () => {
    if (!isLeagueAdmin) return;
    if (!window.confirm("Are you sure you want to permanently delete this event? This action will remove the match and all recorded plays.")) {
      return;
    }

    setIsDeleting(true);
    try {
      if (isDemoLeague) {
        deleteSandboxPlaysForMatch(matchId);
        deleteSandboxMatch(matchId);
        router.push("/schedule");
        return;
      }

      await deleteDoc(doc(db, "matches", matchId));
      router.push("/schedule");
    } catch (err) {
      console.error("Failed to delete match:", err);
      alert("Failed to delete match. Please check permissions.");
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const fetchMatch = async () => {
      if (isDemoLeague) {
        const m = getSandboxMatch(matchId) || getYorkMatch(matchId);
        if (m) setMatchData(m);
        setLoading(false);
        return;
      }
      try {
        const docSnap = await getDoc(doc(db, "matches", matchId));
        if (docSnap.exists()) {
          setMatchData(docSnap.data());
        } else {
          const ym = getYorkMatch(matchId);
          if (ym) setMatchData(ym);
        }
      } catch (error) {
        console.error("Error fetching match:", error);
        const ym = getYorkMatch(matchId);
        if (ym) setMatchData(ym);
      }
      setLoading(false);
    };
    fetchMatch();
    if (isDemoLeague) {
      const unsub = subscribeDemoSandbox(() => fetchMatch());
      return () => unsub();
    }
  }, [matchId, isDemoLeague]);

  if (isDenied) {
    return deniedElement;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Game Not Found</h2>
          <Link href="/schedule" className="text-cyan-400 hover:underline">Return to Schedule</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col">

      <div className="max-w-4xl mx-auto space-y-8 flex-1 w-full p-6 md:p-12">

        {/* Navigation */}
        <Link href="/schedule" className="inline-flex items-center text-neutral-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Schedule
        </Link>

        {/* Match Header */}
        <div className="bg-neutral-900 border border-white/5 rounded-3xl p-8 relative overflow-hidden">
          <div
            className="absolute top-0 left-0 w-full h-1"
            style={{
              background: `linear-gradient(90deg, var(--league-primary), var(--league-accent))`,
            }}
          ></div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-1">
                <span className="text-xs font-bold tracking-widest text-cyan-400 uppercase">
                  {renderFlagOS(settings.leagueName)} • Week {matchData.week}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-mono text-neutral-400">
                  {settings.seasonTitle || "2026 Season"}
                </span>
                {matchData.isPreseason && <span className="text-xs font-bold tracking-widest text-amber-500 uppercase bg-amber-500/10 px-2 py-0.5 rounded-md">Preseason</span>}
              </div>
              <h1 className="text-3xl md:text-4xl font-black mt-2 text-white">{matchData.homeTeamName} vs. {matchData.awayTeamName}</h1>
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-neutral-400">
                  <Clock className="w-4 h-4" />
                  <span>{matchData.date} • {matchData.time}</span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-500">
                  <MapPin className="w-4 h-4" />
                  <span>{matchData.location || settings.defaultLocation}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8 bg-black/50 px-8 py-4 rounded-2xl border border-white/5">
              <div className="text-center w-24">
                <span className="text-sm text-neutral-400 block mb-1 truncate">{matchData.homeTeamName}</span>
                <span className="text-4xl font-bold">{matchData.homeScore || 0}</span>
              </div>
              <span className="text-neutral-600 font-light text-2xl">-</span>
              <div className="text-center w-24">
                <span className="text-sm text-neutral-400 block mb-1 truncate">{matchData.awayTeamName}</span>
                <span className="text-4xl font-bold">{matchData.awayScore || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Controls */}
        {(isLeagueAdmin || isPlatformAdmin || (matchData?.managingTeamId && canManageTeam(matchData.managingTeamId)) || (matchData?.homeTeamId && canManageTeam(matchData.homeTeamId)) || (matchData?.awayTeamId && canManageTeam(matchData.awayTeamId))) && (
          <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-lg text-white">Game Administration</h3>
                <p className="text-sm text-neutral-400">
                  {matchData.isAsyncStatKeeping
                    ? "Asynchronous clockless game tracking with First & Second Half scoring."
                    : "Official live game tracking with game clock and play clock."}
                </p>
              </div>
            </div>
            <div className="flex gap-2.5 items-center flex-wrap">
              {isLeagueAdmin && (
                <>
                  <button
                    onClick={openEditModal}
                    className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-xl border border-white/10 transition-all flex items-center gap-1.5 text-xs cursor-pointer shadow-sm"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Event</span>
                  </button>

                  <button
                    onClick={handleDeleteMatch}
                    disabled={isDeleting}
                    className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-semibold rounded-xl border border-rose-500/20 transition-all flex items-center gap-1.5 text-xs cursor-pointer shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeleting ? "Deleting..." : "Delete Event"}</span>
                  </button>
                </>
              )}
              {isPlatformAdmin && matchData.status !== 'completed' && (
                <button
                  onClick={handleSimulateGame}
                  disabled={isSimulating}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 border border-amber-500/40 rounded-xl font-bold transition-all flex items-center gap-1.5 text-xs cursor-pointer shadow-sm disabled:opacity-50"
                  title="Platform Admin: Randomly Generate Full Game Play-by-Play & Score"
                >
                  <Zap className={`w-3.5 h-3.5 fill-amber-400 text-amber-400 ${isSimulating ? "animate-spin" : ""}`} />
                  <span>{isSimulating ? "Simulating Game..." : "⚡ Simulate Game"}</span>
                </button>
              )}
              {matchData.status !== 'completed' ? (
                <Link
                  href={`/matches/${matchId}/play-by-play`}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/30 transition-all active:scale-95 whitespace-nowrap text-xs"
                >
                  {matchData.isAsyncStatKeeping ? "Async Stat Keeper" : "Play-by-Play Manager"}
                </Link>
              ) : isDemoLeague && isLeagueAdmin ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      updateSandboxMatch(matchId, { status: "in_progress" });
                      window.location.href = `/matches/${matchId}/play-by-play`;
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/30 transition-all active:scale-95 whitespace-nowrap text-xs"
                  >
                    Reopen Play-by-Play
                  </button>
                  <button
                    onClick={() => {
                      if (!confirm("Reset this demo game to pre-game state (0-0 score, all plays cleared)?")) return;
                      deleteSandboxPlaysForMatch(matchId);
                      updateSandboxMatch(matchId, {
                        status: "scheduled",
                        homeScore: 0,
                        awayScore: 0,
                        matchState: null,
                        didNotPlay: [],
                      });
                      window.location.reload();
                    }}
                    className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xl border border-white/10 transition-all whitespace-nowrap text-xs"
                  >
                    Reset Game
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}

        <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 mt-4">
          <div>
            <h3 className="font-semibold text-lg text-white">
              {matchData.status === 'completed' ? 'Box Score & Play-by-Play' : 'Live Play-by-Play'}
            </h3>
            <p className="text-sm text-neutral-400">
              {matchData.status === 'completed' ? 'Review the full stats and history of this game.' : 'Follow the game action in real-time.'}
            </p>
          </div>
          <Link
            href={`/matches/${matchId}/play-by-play`}
            className="px-6 py-3 bg-white hover:bg-neutral-200 text-black font-semibold rounded-xl shadow-lg transition-all active:scale-95 whitespace-nowrap"
          >
            {matchData.status === 'completed' ? 'See Stats' : 'Watch Live'}
          </Link>
        </div>

      </div>

      {/* Edit Event Modal (League Admin Only) */}
      {isEditModalOpen && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Edit Game Details</h2>
                <p className="text-xs text-neutral-400 mt-0.5">League Admin Game Management</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Week / Round Label</label>
                <input
                  type="text"
                  required
                  value={editForm.week}
                  onChange={(e) => setEditForm({ ...editForm, week: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-cyan-400 text-white text-sm"
                  placeholder="e.g. 'Week 1', 'Championship'"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Home Team</label>
                  <input
                    type="text"
                    required
                    value={editForm.homeTeamName}
                    onChange={(e) => setEditForm({ ...editForm, homeTeamName: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-cyan-400 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Away Team</label>
                  <input
                    type="text"
                    required
                    value={editForm.awayTeamName}
                    onChange={(e) => setEditForm({ ...editForm, awayTeamName: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-cyan-400 text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Date</label>
                  <input
                    type="text"
                    required
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-cyan-400 text-white text-sm"
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Kickoff Time</label>
                  <input
                    type="text"
                    required
                    value={editForm.time}
                    onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-cyan-400 text-white text-sm"
                    placeholder="e.g. 10:00 AM"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Venue / Field</label>
                <input
                  type="text"
                  required
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-cyan-400 text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Home Score</label>
                  <input
                    type="number"
                    value={editForm.homeScore}
                    onChange={(e) => setEditForm({ ...editForm, homeScore: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-black border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-cyan-400 text-white font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Away Score</label>
                  <input
                    type="number"
                    value={editForm.awayScore}
                    onChange={(e) => setEditForm({ ...editForm, awayScore: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-black border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-cyan-400 text-white font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-cyan-400 text-white text-sm"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10 mt-2">
                <input
                  type="checkbox"
                  id="editPreseason"
                  checked={editForm.isPreseason}
                  onChange={(e) => setEditForm({ ...editForm, isPreseason: e.target.checked })}
                  className="w-5 h-5 accent-amber-500 rounded bg-black border-white/20"
                />
                <label htmlFor="editPreseason" className="text-white font-semibold text-sm cursor-pointer">
                  Mark as Preseason Game
                </label>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleDeleteMatch}
                  className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 font-semibold rounded-xl transition-all flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Event</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2.5 font-semibold text-neutral-400 hover:text-white text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/30 text-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
