"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Calendar as CalendarIcon, Clock, MapPin, Database, Plus, Edit2, X, GripVertical, Zap, Sparkles, Trophy } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/lib/authContext";
import { useLeague } from "@/lib/leagueContext";
import LeagueHeader from "@/components/LeagueHeader";
import LeagueFooter from "@/components/LeagueFooter";
import { renderFlagOS } from "@/components/FlagOSText";
import { isRealTeam } from "@/components/TeamAssets";
import {
  getSandboxTeams,
  getSandboxMatches,
  addSandboxMatch,
  updateSandboxMatch,
  subscribeDemoSandbox,
} from "@/lib/demoSandbox";

interface Match {
  id: string;
  week: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId?: string;
  awayTeamId?: string;
  date: string;
  time: string;
  location: string;
  status: string;
  homeScore?: number;
  awayScore?: number;
  matchdayIndex: number;
  isPreseason?: boolean;
  order?: number;
}

export default function Calendar() {
  const { isLeagueAdmin } = useAuth();
  const { settings, isDemoLeague } = useLeague();
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEmbedded, setIsEmbedded] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("embed") === "true") setIsEmbedded(true);
    }
  }, []);

  const canManageSchedule = isLeagueAdmin || isDemoLeague || isEmbedded;

  // Admin states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Partial<Match> | null>(null);

  // Automated Schedule Builder State
  const [isAutoScheduleOpen, setIsAutoScheduleOpen] = useState(false);
  const [autoWeeks, setAutoWeeks] = useState(6);
  const [autoIncludePlayoffs, setAutoIncludePlayoffs] = useState(true);
  const [generating, setGenerating] = useState(false);

  const sortMatches = (mData: Match[]) => {
    return [...mData].sort((a, b) => {
      if (typeof a.order === 'number' && typeof b.order === 'number') {
        return a.order - b.order;
      }
      if (typeof a.order === 'number') return -1;
      if (typeof b.order === 'number') return 1;

      if (a.matchdayIndex !== b.matchdayIndex) return a.matchdayIndex - b.matchdayIndex;
      return a.time.localeCompare(b.time);
    });
  };

  useEffect(() => {
    setLoading(true);

    if (isDemoLeague || isEmbedded) {
      const loadDemoData = () => {
        const tList = getSandboxTeams().filter(isRealTeam);
        setTeams(tList);
        const mList = (getSandboxMatches() as unknown as Match[]).filter(
          m => m.homeTeamId !== "team_free_agents" && m.awayTeamId !== "team_free_agents"
        );
        setMatches(sortMatches(mList));
        setLoading(false);
      };
      loadDemoData();
      const unsub = subscribeDemoSandbox(() => loadDemoData());
      return () => unsub();
    }

    // Fetch teams once (strictly real teams only; free agents are not a team)
    getDocs(collection(db, "teams")).then(teamsSnap => {
      setTeams(
        teamsSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(isRealTeam)
      );
    });

    // Listen to matches in real-time
    const unsub = onSnapshot(collection(db, "matches"), (snap) => {
      const mData = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Match))
        .filter(m => !(m as any).isHidden);

      setMatches(sortMatches(mData));
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => unsub();
  }, [isDemoLeague, isEmbedded]);

  const [draggedMatchId, setDraggedMatchId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, matchId: string) => {
    if (!canManageSchedule) return;
    setDraggedMatchId(matchId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetMatchId: string, isPreseasonGroup: boolean) => {
    e.preventDefault();
    if (!canManageSchedule || !draggedMatchId || draggedMatchId === targetMatchId) return;

    const groupMatches = matches.filter(m => !!m.isPreseason === isPreseasonGroup);
    const oldIndex = groupMatches.findIndex(m => m.id === draggedMatchId);
    const newIndex = groupMatches.findIndex(m => m.id === targetMatchId);

    if (oldIndex === -1 || newIndex === -1) return;

    const newGroupMatches = [...groupMatches];
    const [removed] = newGroupMatches.splice(oldIndex, 1);
    newGroupMatches.splice(newIndex, 0, removed);

    const updatedMatches = matches.map(m => {
      if (!!m.isPreseason === isPreseasonGroup) {
        const idx = newGroupMatches.findIndex(nm => nm.id === m.id);
        return { ...m, order: idx };
      }
      return m;
    });

    updatedMatches.sort((a, b) => {
      if (typeof a.order === 'number' && typeof b.order === 'number') return a.order - b.order;
      if (typeof a.order === 'number') return -1;
      if (typeof b.order === 'number') return 1;
      if (a.matchdayIndex !== b.matchdayIndex) return a.matchdayIndex - b.matchdayIndex;
      return a.time.localeCompare(b.time);
    });

    setMatches(updatedMatches);

    // Save to backend or demo sandbox
    if (isDemoLeague || isEmbedded) {
      for (const match of newGroupMatches) {
        const idx = newGroupMatches.indexOf(match);
        updateSandboxMatch(match.id, { order: idx });
      }
      setDraggedMatchId(null);
      return;
    }

    try {
      for (const match of newGroupMatches) {
        const idx = newGroupMatches.indexOf(match);
        updateDoc(doc(db, "matches", match.id), { order: idx });
      }
    } catch (err) {
      console.error("Failed to save match order", err);
    }
    setDraggedMatchId(null);
  };

  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;

    const homeT = teams.find(t => t.id === editingMatch.homeTeamId);
    const awayT = teams.find(t => t.id === editingMatch.awayTeamId);

    const matchDataToSave = {
      ...editingMatch,
      homeTeamName: homeT?.name || "",
      awayTeamName: awayT?.name || "",
      matchdayIndex: parseInt(editingMatch.week?.replace(/\D/g, '') || "0", 10),
      status: editingMatch.status || "upcoming"
    };

    if (isDemoLeague || isEmbedded) {
      if (editingMatch.id) {
        updateSandboxMatch(editingMatch.id, matchDataToSave as any);
      } else {
        addSandboxMatch(matchDataToSave as any);
      }
      setIsModalOpen(false);
      return;
    }

    try {
      if (editingMatch.id) {
        await updateDoc(doc(db, "matches", editingMatch.id), matchDataToSave);
      } else {
        await addDoc(collection(db, "matches"), matchDataToSave);
      }
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    const eligibleTeams = teams.filter(isRealTeam);
    if (eligibleTeams.length < 2) {
      alert("At least 2 teams are required to generate an automated schedule.");
      return;
    }
    setGenerating(true);
    const newMatches: any[] = [];
    const fields = [settings.defaultLocation || "Turf Field 1", "Stadium Field 2"];
    const times = ["9:00 AM", "10:15 AM", "11:30 AM", "12:45 PM"];

    // Generate round-robin pairings across the selected weeks
    for (let w = 1; w <= autoWeeks; w++) {
      const rotation = (w - 1) % (eligibleTeams.length - 1 || 1);
      const rotated = [
        eligibleTeams[0],
        ...eligibleTeams.slice(1 + rotation),
        ...eligibleTeams.slice(1, 1 + rotation),
      ];

      for (let i = 0; i < Math.floor(rotated.length / 2); i++) {
        const home = w % 2 === 0 ? rotated[rotated.length - 1 - i] : rotated[i];
        const away = w % 2 === 0 ? rotated[i] : rotated[rotated.length - 1 - i];

        newMatches.push({
          week: `${w}`,
          matchdayIndex: w,
          homeTeamId: home.id,
          homeTeamName: home.name,
          awayTeamId: away.id,
          awayTeamName: away.name,
          date: `Week ${w}`,
          time: times[i % times.length],
          location: fields[i % fields.length],
          status: "upcoming",
          isPreseason: false,
          order: i,
        });
      }
    }

    // Automated Playoff Bracket
    if (autoIncludePlayoffs && eligibleTeams.length >= 4) {
      newMatches.push({
        week: "Playoffs",
        matchdayIndex: autoWeeks + 1,
        homeTeamId: eligibleTeams[0].id,
        homeTeamName: `${eligibleTeams[0].name} (#1 Seed)`,
        awayTeamId: eligibleTeams[3].id,
        awayTeamName: `${eligibleTeams[3].name} (#4 Seed)`,
        date: "Playoffs Semifinal 1",
        time: "10:00 AM",
        location: fields[0],
        status: "upcoming",
        isPreseason: false,
        order: 0,
      });
      newMatches.push({
        week: "Playoffs",
        matchdayIndex: autoWeeks + 1,
        homeTeamId: eligibleTeams[1].id,
        homeTeamName: `${eligibleTeams[1].name} (#2 Seed)`,
        awayTeamId: eligibleTeams[2].id,
        awayTeamName: `${eligibleTeams[2].name} (#3 Seed)`,
        date: "Playoffs Semifinal 2",
        time: "11:15 AM",
        location: fields[0],
        status: "upcoming",
        isPreseason: false,
        order: 1,
      });
      newMatches.push({
        week: "Playoffs",
        matchdayIndex: autoWeeks + 2,
        homeTeamId: eligibleTeams[0].id,
        homeTeamName: "Winner Semifinal 1",
        awayTeamId: eligibleTeams[1].id,
        awayTeamName: "Winner Semifinal 2",
        date: "FlagOS League Championship",
        time: "1:00 PM",
        location: fields[1] || fields[0],
        status: "upcoming",
        isPreseason: false,
        order: 2,
      });
    }

    if (isDemoLeague || isEmbedded) {
      newMatches.forEach((m) => addSandboxMatch(m));
      setIsAutoScheduleOpen(false);
      setGenerating(false);
      return;
    }

    try {
      for (const m of newMatches) {
        await addDoc(collection(db, "matches"), m);
      }
    } catch (err) {
      console.error("Failed to auto-generate schedule:", err);
    }
    setIsAutoScheduleOpen(false);
    setGenerating(false);
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col justify-between">
      {!isEmbedded && <LeagueHeader activePage="schedule" />}

      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-cyan-900/15 rounded-full blur-[160px]"></div>
        <div className="absolute bottom-10 left-10 w-[35rem] h-[35rem] bg-blue-900/10 rounded-full blur-[170px]"></div>
      </div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10 w-full px-6 py-8 flex-1">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-bold text-cyan-300 uppercase tracking-widest">
                {settings.seasonTitle || "Active Season"} Fixtures
              </span>
              <span className="text-neutral-500 text-xs">•</span>
              <span className="text-[11px] font-mono text-neutral-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-cyan-400" />
                <span>Default Venue: {settings.defaultLocation || "Turf Field 1"}</span>
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight flex items-center gap-3">
              <CalendarIcon className="w-8 h-8 md:w-10 md:h-10 text-cyan-400" />
              <span>{renderFlagOS(settings.leagueName)} Calendar</span>
            </h1>
            <p className="text-neutral-400 text-xs md:text-sm mt-1 max-w-xl">
              Official schedule, kickoff times, field assignments, and verified final scores.
            </p>
          </div>
          {canManageSchedule && (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setIsAutoScheduleOpen(true)}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] shrink-0 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Auto-Generate Schedule</span>
              </button>
              <button
                onClick={() => {
                  setEditingMatch({
                    week: `Week ${(matches.length + 1)}`,
                    date: new Date().toISOString().split("T")[0],
                    time: "10:00 AM",
                    location: settings.defaultLocation || "Turf Field 1",
                    isPreseason: false,
                  });
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-white/10 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Match</span>
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-12">

            {/* Preseason Section */}
            {matches.filter(m => m.isPreseason).length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-6 text-amber-500 border-b border-amber-500/20 pb-2">Pre-season</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {matches.filter(m => m.isPreseason).map((match) => (
                    <div
                      key={match.id}
                      className={`relative group ${draggedMatchId === match.id ? 'opacity-50' : ''}`}
                      draggable={isLeagueAdmin}
                      onDragStart={(e) => handleDragStart(e, match.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, match.id, true)}
                    >
                      <Link
                        href={isEmbedded ? "#" : `/matches/${match.id}`}
                        onClick={(e) => {
                          if (isEmbedded) e.preventDefault();
                        }}
                        className={`block bg-neutral-900/50 border border-white/5 rounded-3xl p-6 hover:bg-neutral-900 transition-all duration-300 relative overflow-hidden border-amber-500/20 hover:border-amber-500/50 ${
                          isEmbedded ? "cursor-default" : ""
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity from-amber-500/5 to-transparent"></div>

                        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                          <div className="flex items-center gap-2">
                            {isLeagueAdmin && <GripVertical className="w-5 h-5 text-neutral-600 cursor-grab hover:text-white" />}
                            <span className="text-xs font-bold tracking-widest uppercase text-amber-500">
                              Week {match.week}
                            </span>
                          </div>
                          {match.status === "completed" ? (
                            <span className="text-xs font-semibold px-3 py-1 bg-neutral-800 text-neutral-300 rounded-full">Final</span>
                          ) : (
                            <span className="text-xs font-semibold px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/20">Upcoming</span>
                          )}
                        </div>

                        <div className="flex justify-between items-center px-4">
                          <div className="text-center w-[40%]">
                            <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">{match.homeTeamName}</h3>
                            {match.status === "completed" && <span className="text-3xl font-black block mt-2 text-neutral-200">{match.homeScore}</span>}
                          </div>

                          <div className="text-neutral-500 font-light text-sm italic w-[20%] text-center">
                            VS
                          </div>

                          <div className="text-center w-[40%]">
                            <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">{match.awayTeamName}</h3>
                            {match.status === "completed" && <span className="text-3xl font-black block mt-2 text-neutral-200">{match.awayScore}</span>}
                          </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-white/5 flex flex-col gap-2 text-sm text-neutral-400">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-neutral-500" />
                            {match.date} • {match.time}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-neutral-500" />
                            {match.location}
                          </div>
                        </div>
                      </Link>
                      {canManageSchedule && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setEditingMatch(match);
                            setIsModalOpen(true);
                          }}
                          className="absolute top-6 right-6 p-2 bg-neutral-900 border border-white/10 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors z-20"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Regular Season Section */}
            <div>
              <h2 className="text-2xl font-bold mb-6 text-white border-b border-white/10 pb-2">Regular Season</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {matches.filter(m => !m.isPreseason).map((match) => (
                  <div
                    key={match.id}
                    className={`relative group ${draggedMatchId === match.id ? 'opacity-50' : ''}`}
                    draggable={isLeagueAdmin}
                    onDragStart={(e) => handleDragStart(e, match.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, match.id, false)}
                  >
                    <Link
                      href={isEmbedded ? "#" : `/matches/${match.id}`}
                      onClick={(e) => {
                        if (isEmbedded) e.preventDefault();
                      }}
                      className={`block bg-neutral-900/50 border border-white/5 rounded-3xl p-6 hover:bg-neutral-900 transition-all duration-300 relative overflow-hidden hover:border-cyan-500/40 ${
                        isEmbedded ? "cursor-default" : ""
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity from-cyan-500/10 to-transparent"></div>

                      <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                        <div className="flex items-center gap-2">
                          {isLeagueAdmin && <GripVertical className="w-5 h-5 text-neutral-600 cursor-grab hover:text-white" />}
                          <span className="text-xs font-bold tracking-widest uppercase text-cyan-400">
                            {match.week === 'Playoffs' ? 'Playoffs' : `Week ${match.week}`}
                          </span>
                        </div>
                        {match.status === "completed" ? (
                          <span className="text-xs font-semibold px-3 py-1 bg-neutral-800 text-neutral-300 rounded-full">Final</span>
                        ) : (
                          <span className="text-xs font-semibold px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/20">Upcoming</span>
                        )}
                      </div>

                      <div className="flex justify-between items-center px-4">
                        <div className="text-center w-[40%]">
                          <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">{match.homeTeamName}</h3>
                          {match.status === "completed" && <span className="text-3xl font-black block mt-2 text-neutral-200">{match.homeScore}</span>}
                        </div>

                        <div className="text-neutral-500 font-light text-sm italic w-[20%] text-center">
                          VS
                        </div>

                        <div className="text-center w-[40%]">
                          <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">{match.awayTeamName}</h3>
                          {match.status === "completed" && <span className="text-3xl font-black block mt-2 text-neutral-200">{match.awayScore}</span>}
                        </div>
                      </div>

                      <div className="mt-8 pt-4 border-t border-white/5 flex flex-col gap-2 text-sm text-neutral-400">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-neutral-500" />
                          {match.date} • {match.time}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-neutral-500" />
                          {match.location}
                        </div>
                      </div>
                    </Link>
                    {isLeagueAdmin && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setEditingMatch(match);
                          setIsModalOpen(true);
                        }}
                        className="absolute top-6 right-6 p-2 bg-neutral-900 border border-white/10 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors z-20"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {matches.filter(m => !m.isPreseason).length === 0 && (
                  <div className="col-span-1 lg:col-span-2 py-24 text-center text-neutral-500 italic">
                    No regular season matches scheduled yet.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Admin Modal */}
      {isModalOpen && editingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{editingMatch.id ? "Edit Match" : "Create Match"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-neutral-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMatch} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-400 mb-1">Week Title</label>
                <input
                  type="text"
                  required
                  value={editingMatch.week || ""}
                  onChange={e => setEditingMatch({ ...editingMatch, week: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-cyan-400 text-white"
                  placeholder="e.g. 'Week 1'"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-400 mb-1">Home Team</label>
                  <select
                    required
                    value={editingMatch.homeTeamId || ""}
                    onChange={e => setEditingMatch({ ...editingMatch, homeTeamId: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-cyan-400 text-white"
                  >
                    <option value="" disabled>Select Home</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-400 mb-1">Away Team</label>
                  <select
                    required
                    value={editingMatch.awayTeamId || ""}
                    onChange={e => setEditingMatch({ ...editingMatch, awayTeamId: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-cyan-400 text-white"
                  >
                    <option value="" disabled>Select Away</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-400 mb-1">Date</label>
                  <input
                    type="text"
                    required
                    value={editingMatch.date || ""}
                    onChange={e => setEditingMatch({ ...editingMatch, date: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-cyan-400 text-white"
                    placeholder="e.g. 'Oct 15'"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-400 mb-1">Time</label>
                  <input
                    type="text"
                    required
                    value={editingMatch.time || ""}
                    onChange={e => setEditingMatch({ ...editingMatch, time: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-cyan-400 text-white"
                    placeholder="e.g. '8:30 PM'"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-400 mb-1">Location</label>
                <input
                  type="text"
                  required
                  value={editingMatch.location || ""}
                  onChange={e => setEditingMatch({ ...editingMatch, location: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-cyan-400 text-white"
                  placeholder="e.g. 'Field 1'"
                />
              </div>

              <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10 mt-2">
                <input
                  type="checkbox"
                  id="preseasonCheck"
                  checked={editingMatch.isPreseason || false}
                  onChange={e => setEditingMatch({ ...editingMatch, isPreseason: e.target.checked })}
                  className="w-5 h-5 accent-amber-500 rounded bg-black border-white/20"
                />
                <label htmlFor="preseasonCheck" className="text-white font-semibold cursor-pointer">
                  Mark as Preseason Game
                </label>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 font-semibold text-neutral-400 hover:text-white">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/30">
                  {editingMatch.id ? "Save Changes" : "Create Match"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Automated Season Schedule Generator Modal */}
      {isAutoScheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0B0F19] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase block">
                  Automated Scheduling Engine
                </span>
                <h3 className="text-2xl font-black text-white">Auto-Generate Season</h3>
              </div>
              <button
                onClick={() => setIsAutoScheduleOpen(false)}
                className="p-2 rounded-full bg-white/5 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateSeason} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-neutral-400 block mb-1">
                  Active Teams ({teams.length} Teams Available)
                </label>
                <div className="p-3 bg-black/60 rounded-xl border border-white/10 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {teams.map((t) => (
                    <span
                      key={t.id}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-xs font-mono font-bold"
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-neutral-400 block mb-1">
                    Regular Season Weeks
                  </label>
                  <select
                    value={autoWeeks}
                    onChange={(e) => setAutoWeeks(Number(e.target.value))}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-cyan-400 font-mono"
                  >
                    <option value={4}>4 Weeks</option>
                    <option value={6}>6 Weeks</option>
                    <option value={8}>8 Weeks</option>
                    <option value={10}>10 Weeks</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-neutral-400 block mb-1">
                    Playoff Bracket
                  </label>
                  <button
                    type="button"
                    onClick={() => setAutoIncludePlayoffs(!autoIncludePlayoffs)}
                    className={`w-full p-3 rounded-xl border text-xs font-mono font-bold transition-all text-center ${
                      autoIncludePlayoffs
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                        : "bg-black text-neutral-500 border-white/10"
                    }`}
                  >
                    {autoIncludePlayoffs ? "Top 4 Included ✓" : "No Playoffs"}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1 text-xs text-neutral-400">
                <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Balanced Scheduling Matrix</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Generates balanced home/away game slots, assigns kickoff times and fields automatically,
                  and creates playoff bracket fixtures based on seeding.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAutoScheduleOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {generating ? "Generating..." : "⚡ Generate Full Season"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Branded League Footer */}
      {!isEmbedded && <LeagueFooter />}
    </div>
  );
}
