"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Calendar, Clock, MapPin, Trophy, History, PlayCircle, Shield, Plus, X, Sparkles, Timer } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, onSnapshot, query, where, addDoc } from "firebase/firestore";
import { TeamLogo, getTeamShortcode, isRealTeam } from "@/components/TeamAssets";
import { useLeague } from "@/lib/leagueContext";
import { useAuth } from "@/lib/authContext";
import {
  getSandboxTeams,
  getSandboxMatches,
  addSandboxMatch,
  subscribeDemoSandbox,
} from "@/lib/demoSandbox";
import LeagueHeader from "@/components/LeagueHeader";
import LeagueFooter from "@/components/LeagueFooter";

export default function TeamSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const teamId = unwrappedParams.id;
  const { settings, isDemoLeague } = useLeague();

  const { canManageTeam, isLeagueAdmin } = useAuth();
  const [team, setTeam] = useState<any>(null);
  const [allTeams, setAllTeams] = useState<Record<string, any>>({});
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Match Scheduling Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [opponentName, setOpponentName] = useState("");
  const [isHostHome, setIsHostHome] = useState(true);
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [matchTime, setMatchTime] = useState("14:00");
  const [matchLocation, setMatchLocation] = useState(settings?.defaultLocation || "Turf Field 1");
  const [isScheduling, setIsScheduling] = useState(false);

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponentName.trim()) return;
        setIsScheduling(true);
    try {
      const oppId = `opponent_${Date.now()}`;
      const newMatchDoc = {
        homeTeamName: isHostHome ? (team?.name || "Team") : opponentName.trim(),
        awayTeamName: isHostHome ? opponentName.trim() : (team?.name || "Team"),
        homeTeamId: isHostHome ? teamId : oppId,
        awayTeamId: isHostHome ? oppId : teamId,
        homeScore: 0,
        awayScore: 0,
        date: matchDate,
        time: matchTime,
        location: matchLocation || "Field 1",
        week: "Exhibition",
        status: "scheduled" as const,
        isIndependent: true,
        isAsyncStatKeeping: true,
        managingTeamId: teamId,
        matchdayIndex: 1,
      };

      if (isDemoLeague) {
        addSandboxMatch(newMatchDoc);
        setOpponentName("");
        setIsScheduleModalOpen(false);
        setIsScheduling(false);
        return;
      }

      await addDoc(collection(db, "matches"), newMatchDoc);
      setOpponentName("");
      setIsScheduleModalOpen(false);
    } catch (err) {
      console.error("Failed to schedule match:", err);
      alert("Failed to schedule match. Please try again.");
    } finally {
      setIsScheduling(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (isDemoLeague) {
        const loadDemo = () => {
          const tObj = getSandboxTeams().find((t) => t.id === teamId);
          if (tObj && isRealTeam(tObj)) setTeam(tObj);
          else setTeam(null);
          const tMap: Record<string, any> = {};
          getSandboxTeams().filter(isRealTeam).forEach((t) => { tMap[t.id] = t; });
          setAllTeams(tMap);
          const mList = getSandboxMatches().filter(
            (m: any) => !m.isHidden && (m.homeTeamId === teamId || m.awayTeamId === teamId)
          );
          mList.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setMatches(mList);
          setLoading(false);
        };
        loadDemo();
        const unsub = subscribeDemoSandbox(() => loadDemo());
        return () => unsub();
      }

      try {
        const [teamSnap, allTeamsSnap] = await Promise.all([
          getDoc(doc(db, "teams", teamId)),
          getDocs(collection(db, "teams")),
        ]);

        if (teamSnap.exists()) {
          const tData = { id: teamSnap.id, ...teamSnap.data() };
          if (isRealTeam(tData)) setTeam(tData);
          else setTeam(null);
        }

        const teamsMap: Record<string, any> = {};
        allTeamsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter(isRealTeam)
          .forEach((t) => {
            teamsMap[t.id] = t;
          });
        setAllTeams(teamsMap);

        // Fetch matches involving this team
        const unsub = onSnapshot(collection(db, "matches"), (snap) => {
          const mList = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as any) }))
            .filter((m) => !m.isHidden && (m.homeTeamId === teamId || m.awayTeamId === teamId));

          mList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setMatches(mList);
          setLoading(false);
        });

        return () => unsub();
      } catch (e) {
        console.error("Error fetching team schedule:", e);
        setLoading(false);
      }
    };

    fetchData();
  }, [teamId, isDemoLeague]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!team || !isRealTeam(team)) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans p-6 text-center">
        <h2 className="text-3xl font-black mb-4">Team Not Found</h2>
        <p className="text-neutral-400 mb-6 max-w-md">
          The requested franchise does not exist. Free agents are an unassigned draft pool, not a schedulable team.
        </p>
        <Link
          href="/teams"
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)]"
        >
          Back to Teams
        </Link>
      </div>
    );
  }

  const pastMatches = matches.filter((m) => m.status === "completed" || m.status === "Final");
  const upcomingMatches = matches.filter((m) => m.status !== "completed" && m.status !== "Final");

  const teamName = team?.name || "Team";
  const hasManagementAccess = canManageTeam(teamId) || isLeagueAdmin;

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-hidden flex flex-col">
      {/* Branded League Navigation Bar */}
      <LeagueHeader activePage="teams" />

      {/* Dynamic Background */}
      <div className="absolute top-0 right-0 w-[35rem] h-[35rem] bg-cyan-600 rounded-full mix-blend-screen filter blur-[150px] opacity-15 pointer-events-none"></div>

      <div className="max-w-5xl mx-auto space-y-8 relative z-10 flex-1 w-full p-6 md:p-12">
        {/* Navigation */}
        <Link
          href={`/teams/${teamId}`}
          className="inline-flex items-center text-neutral-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md text-sm font-semibold"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to {teamName} Portal
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-400 mb-2">
              <Calendar className="w-4 h-4" />
              <span>Official Schedule</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">
              {teamName} <span className="text-neutral-500 font-normal">Schedule</span>
            </h1>
            <p className="text-neutral-400 text-sm mt-1">Upcoming matchups, box scores, and live game tracking.</p>
          </div>

          {/* Schedule Match Button for Team Admins */}
          {hasManagementAccess && (
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Match (Named Opponent)</span>
            </button>
          )}
        </div>

        {/* Schedule Grid: Upcoming & Past */}
        <div className="grid grid-cols-1 gap-8">
          {/* Upcoming Matches */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-lg font-black uppercase tracking-wider text-emerald-400">
              <Clock className="w-5 h-5" />
              <span>Upcoming Matches</span>
            </div>

            {upcomingMatches.length === 0 ? (
              <div className="bg-neutral-900/40 border border-white/5 rounded-2xl p-8 text-center text-neutral-500 italic text-sm">
                No upcoming games scheduled.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingMatches.map((m) => {
                  const isHome = m.homeTeamId === teamId;
                  const opponentId = isHome ? m.awayTeamId : m.homeTeamId;
                  const opponentName = allTeams[opponentId]?.name || (isHome ? m.awayTeamName : m.homeTeamName) || "Opponent";
                  const isAsyncMatch = !!(m.isAsyncStatKeeping || m.isIndependent);
                  const statKeeperUrl = isAsyncMatch
                    ? `/teams/${teamId}/matches/${m.id}/stat-keeper`
                    : `/matches/${m.id}/play-by-play`;

                  return (
                    <div
                      key={m.id}
                      className="bg-neutral-900/70 border border-white/5 rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between hover:border-white/15 transition-all group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-neutral-400 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                              {m.week || "Matchday"}
                            </span>
                            {isAsyncMatch && (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Clockless Async
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                            {m.status === "in_progress" ? "● LIVE NOW" : "Scheduled"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between my-4">
                          <div className="flex items-center gap-3">
                            <TeamLogo teamName={teamName} className="w-8 h-8" />
                            <span className="font-bold text-base">{teamName}</span>
                          </div>
                          <span className="text-xs font-black text-neutral-500 uppercase">VS</span>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-base text-neutral-300">{opponentName}</span>
                            <TeamLogo teamName={opponentName} className="w-8 h-8" />
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-3 border-t border-white/5 text-xs text-neutral-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                            <span>{new Date(m.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                          </div>
                          {m.time && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-neutral-500" />
                              <span>{m.time}</span>
                            </div>
                          )}
                          {m.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                              <span className="truncate">{m.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-white/5">
                        <Link
                          href={statKeeperUrl}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm border ${
                            isAsyncMatch
                              ? "bg-emerald-500/10 hover:bg-emerald-500 text-emerald-300 hover:text-black border-emerald-500/30 hover:border-emerald-500"
                              : "bg-white/5 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-blue-600 text-neutral-300 hover:text-white border-white/10 hover:border-cyan-500"
                          }`}
                        >
                          <PlayCircle className="w-4 h-4" />
                          <span>{isAsyncMatch ? "Open Async Stat Keeper (Clockless)" : "Track Game / Play-by-Play"}</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past Matches */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2.5 text-lg font-black uppercase tracking-wider text-blue-400">
              <History className="w-5 h-5" />
              <span>Past Results & Box Scores</span>
            </div>

            {pastMatches.length === 0 ? (
              <div className="bg-neutral-900/40 border border-white/5 rounded-2xl p-8 text-center text-neutral-500 italic text-sm">
                No completed games recorded yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastMatches.map((m) => {
                  const isHome = m.homeTeamId === teamId;
                  const opponentId = isHome ? m.awayTeamId : m.homeTeamId;
                  const opponentName = allTeams[opponentId]?.name || (isHome ? m.awayTeamName : m.homeTeamName) || "Opponent";
                  const scored = isHome ? m.homeScore : m.awayScore;
                  const allowed = isHome ? m.awayScore : m.homeScore;
                  const isWin = scored > allowed;
                  const isLoss = scored < allowed;
                  const isAsyncMatch = !!(m.isAsyncStatKeeping || m.isIndependent);
                  const matchUrl = isAsyncMatch ? `/teams/${teamId}/matches/${m.id}/stat-keeper` : `/matches/${m.id}`;

                  return (
                    <Link
                      key={m.id}
                      href={matchUrl}
                      className="bg-neutral-900/70 border border-white/5 rounded-3xl p-6 backdrop-blur-md shadow-xl flex items-center justify-between hover:bg-neutral-900 hover:border-white/15 transition-all group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 font-mono">
                            {new Date(m.date).toLocaleDateString()}
                          </span>
                          {isAsyncMatch && (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              Async
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-base text-white group-hover:text-cyan-400 transition-colors">
                          vs {opponentName}
                        </div>
                        <div className="text-xs text-neutral-400">Box Score & Plays →</div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-2xl font-black tabular-nums tracking-tight">
                            {scored} - {allowed}
                          </span>
                        </div>
                        <span
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
                            isWin
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : isLoss
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
                              : "bg-neutral-500/20 text-neutral-300 border border-neutral-500/30"
                          }`}
                        >
                          {isWin ? "W" : isLoss ? "L" : "T"}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SCHEDULE MATCH MODAL */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-950 border border-emerald-500/40 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative">
            <button
              onClick={() => setIsScheduleModalOpen(false)}
              className="absolute top-6 right-6 text-neutral-400 hover:text-white p-2 rounded-full hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400 border border-emerald-500/30">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase text-white">Schedule Exhibition Match</h3>
                <p className="text-xs text-neutral-400">Independent match against a custom named opponent</p>
              </div>
            </div>

            <form onSubmit={handleCreateMatch} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">Opponent Team Name</label>
                <input
                  type="text"
                  required
                  value={opponentName}
                  onChange={(e) => setOpponentName(e.target.value)}
                  placeholder="e.g. Gotham Rogues, Eastside Blitz"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-sm outline-none focus:border-emerald-400 font-semibold"
                />
              </div>

              {/* Home or Away Selection */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">Host Designation</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsHostHome(true)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      isHostHome
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-neutral-900 border-white/10 text-neutral-400"
                    }`}
                  >
                    Home Team ({teamName})
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsHostHome(false)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      !isHostHome
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-neutral-900 border-white/10 text-neutral-400"
                    }`}
                  >
                    Away / Visiting Team
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-sm outline-none focus:border-emerald-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">Time</label>
                  <input
                    type="time"
                    required
                    value={matchTime}
                    onChange={(e) => setMatchTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-sm outline-none focus:border-emerald-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">Field / Venue Location</label>
                <input
                  type="text"
                  value={matchLocation}
                  onChange={(e) => setMatchLocation(e.target.value)}
                  placeholder="e.g. Field 2 Turf"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-sm outline-none focus:border-emerald-400"
                />
              </div>

              {/* Mode information callout */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3.5 text-xs text-neutral-300 space-y-1">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5" />
                  <span>Asynchronous Clockless Stat Keeping</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  All timing, play clocks, and timeout features are automatically disabled. Stat keeping is tracked simply by First Half and Second Half with Start Play and Halftime controls.
                </p>
              </div>

              <button
                type="submit"
                disabled={isScheduling}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <span>{isScheduling ? "Scheduling..." : "Confirm & Schedule Match"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Branded League Footer */}
      <LeagueFooter />
    </div>
  );
}
