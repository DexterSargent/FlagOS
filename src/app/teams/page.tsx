"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Users, Shield, Plus, Check, X, ArrowRightLeft, Calendar, Trophy, Activity, History, Trash2, UserPlus, Search, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/lib/authContext";
import { useLeague } from "@/lib/leagueContext";
import { renderFlagOS } from "@/components/FlagOSText";
import { isRealTeam, TeamLogo, getTeamShortcode } from "@/components/TeamAssets";
import { usePrivateLeagueAccess } from "@/lib/usePrivateLeagueAccess";
import {
  getSandboxTeams,
  addSandboxTeam,
  updateSandboxTeam,
  deleteSandboxTeam,
  getSandboxPlayers,
  addSandboxPlayer,
  updateSandboxPlayer,
  deleteSandboxPlayer,
  getSandboxMatches,
  getSandboxPlays,
  subscribeDemoSandbox,
} from "@/lib/demoSandbox";
import { YORK_TEAM_ID, YORK_LIONS_TEAM, YORK_LIONS_PLAYERS, isYorkTeam } from "@/lib/yorkTeamData";

interface Team {
  id: string;
  name: string;
}

interface Player {
  id: string;
  teamId: string;
  playerName: string;
  experience?: string;
  positions?: string[];
  position?: string;
  preferredTeammateNames?: string[];
  status?: string;
  number?: string;
  emails?: string[];
  email?: string;
  joinedAt?: string;
}

const getShorthand = (name: string) => {
  if (name.includes("Team")) return name.replace("Team ", "T");
  if (name === "Free Agent") return "FA";
  return name.substring(0, 3).toUpperCase();
};

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<any[]>([]);
  const [plays, setPlays] = useState<any[]>([]);
  const { isAdmin, isLeagueAdmin, canManageTeam, canRegisterAsPlayer } = useAuth();
  const { settings, isDemoLeague, activeLeagueId } = useLeague();
  const { isDenied, deniedElement } = usePrivateLeagueAccess();

  // Admin States
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerPosition, setNewPlayerPosition] = useState("ATH");
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editTeamId, setEditTeamId] = useState("");

  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [editTeamNameValue, setEditTeamNameValue] = useState("");

  // Free Agent Draft Pool States
  const [freeAgentSearch, setFreeAgentSearch] = useState("");
  const [freeAgentPositionFilter, setFreeAgentPositionFilter] = useState("ALL");
  const [selectedAssignTeamId, setSelectedAssignTeamId] = useState<Record<string, string>>({});
  const [assignSuccessId, setAssignSuccessId] = useState<string | null>(null);

  // Modal State
  const [selectedPlayerForStats, setSelectedPlayerForStats] = useState<Player | null>(null);

  const isEffectiveDemo =
    isDemoLeague ||
    (typeof window !== "undefined" &&
      (new URLSearchParams(window.location.search).get("embed") === "true" ||
        new URLSearchParams(window.location.search).get("demo") === "true"));

  const fetchData = async () => {
    setLoading(true);
    if (isEffectiveDemo) {
      const baseTeams = (getSandboxTeams() as unknown as Team[]).filter(isRealTeam);
      const t = baseTeams.some(team => team.id === YORK_TEAM_ID || isYorkTeam(team.id))
        ? baseTeams
        : [...baseTeams, { ...YORK_LIONS_TEAM, id: YORK_TEAM_ID } as unknown as Team];
      t.sort((a, b) => a.name.localeCompare(b.name));
      const p = getSandboxPlayers() as unknown as Player[];
      const m = getSandboxMatches();
      const pl = getSandboxPlays();
      setTeams(t);
      setPlayers(p);
      setMatches(m);
      setPlays(pl);
      setLoading(false);
      return;
    }
    try {
      const teamsSnap = await getDocs(collection(db, "teams"));
      const tData = teamsSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Team))
        .filter(t => isRealTeam(t) && (!((t as any).leagueId) || (t as any).leagueId === activeLeagueId));
      if (!tData.some(t => t.id === YORK_TEAM_ID || isYorkTeam(t.id))) {
        tData.push({
          ...YORK_LIONS_TEAM,
          id: YORK_TEAM_ID,
        } as unknown as Team);
      }
      tData.sort((a, b) => a.name.localeCompare(b.name));
      setTeams(tData);

      const playersSnap = await getDocs(collection(db, "players"));
      const pData = playersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Player));
      setPlayers(pData);

      const matchesSnap = await getDocs(collection(db, "matches"));
      const mData = matchesSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(m => !m.isHidden && (!m.leagueId || m.leagueId === activeLeagueId));
      setMatches(mData);

      const playsSnap = await getDocs(collection(db, "plays"));
      const playData = playsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPlays(playData);
    } catch (e) {
      console.warn("Unable to fetch live teams data, falling back to sandbox:", e);
      const baseTeams = (getSandboxTeams() as unknown as Team[]).filter(isRealTeam);
      const t = baseTeams.some(team => team.id === YORK_TEAM_ID || isYorkTeam(team.id))
        ? baseTeams
        : [...baseTeams, { ...YORK_LIONS_TEAM, id: YORK_TEAM_ID } as unknown as Team];
      t.sort((a, b) => a.name.localeCompare(b.name));
      const p = getSandboxPlayers() as unknown as Player[];
      const m = getSandboxMatches();
      const pl = getSandboxPlays();
      setTeams(t);
      setPlayers(p);
      setMatches(m);
      setPlays(pl);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    if (isEffectiveDemo) {
      const unsub = subscribeDemoSandbox(() => {
        setTeams((getSandboxTeams() as unknown as Team[]).filter(isRealTeam));
        setPlayers(getSandboxPlayers() as unknown as Player[]);
        setMatches(getSandboxMatches());
        setPlays(getSandboxPlays());
      });
      return () => unsub();
    }
  }, [isEffectiveDemo]);

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim() || !activeTeamId) return;
    const maxRoster = 30; // Hard cap of 30 players for all teams
    const currentCount = players.filter(p => p.teamId === activeTeamId).length;
    if (currentCount >= maxRoster) {
      alert(`Cannot add player: Team has reached the hard cap roster limit of ${maxRoster} players.`);
      return;
    }
    if (isDemoLeague) {
      const created = addSandboxPlayer({
        playerName: newPlayerName.trim(),
        teamId: activeTeamId,
        position: newPlayerPosition,
        positions: [newPlayerPosition],
        status: "Active",
      });
      setPlayers([...players, created as unknown as Player]);
      setNewPlayerName("");
      setNewPlayerPosition("ATH");
      setIsAddingPlayer(false);
      return;
    }
    try {
      const docRef = await addDoc(collection(db, "players"), {
        playerName: newPlayerName.trim(),
        teamId: activeTeamId,
        position: newPlayerPosition,
        positions: [newPlayerPosition],
        status: "Active"
      });
      setPlayers([...players, {
        id: docRef.id,
        playerName: newPlayerName.trim(),
        teamId: activeTeamId,
        position: newPlayerPosition,
        positions: [newPlayerPosition],
        status: "Active"
      }]);
      setNewPlayerName("");
      setNewPlayerPosition("ATH");
      setIsAddingPlayer(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdatePlayerTeam = async (playerId: string) => {
    if (!editTeamId) return;
    if (isDemoLeague) {
      updateSandboxPlayer(playerId, { teamId: editTeamId, status: "Active" });
      setPlayers(players.map(p => p.id === playerId ? { ...p, teamId: editTeamId, status: "Active" } : p));
      setEditingPlayerId(null);
      return;
    }
    try {
      await updateDoc(doc(db, "players", playerId), {
        teamId: editTeamId,
        status: "Active"
      });
      setPlayers(players.map(p => p.id === playerId ? { ...p, teamId: editTeamId, status: "Active" } : p));
      setEditingPlayerId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignFreeAgent = async (playerId: string, targetTeamId: string) => {
    if (!isLeagueAdmin) {
      alert("Only league administrators can assign players to a franchise.");
      return;
    }
    if (!targetTeamId) return;
    const targetTeam = teams.find((t) => t.id === targetTeamId);
    if (!targetTeam) return;

    const maxRoster = 30; // Hard cap of 30 players for all teams
    const teamCount = players.filter((p) => p.teamId === targetTeamId).length;
    if (teamCount >= maxRoster) {
      alert(`Cannot assign: ${targetTeam.name} has already reached the hard cap roster size of ${maxRoster} players.`);
      return;
    }

    if (isDemoLeague) {
      updateSandboxPlayer(playerId, { teamId: targetTeamId, status: "Active" });
      setPlayers((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, teamId: targetTeamId, status: "Active" } : p))
      );
      setAssignSuccessId(playerId);
      setTimeout(() => setAssignSuccessId(null), 3000);
      if (selectedPlayerForStats && selectedPlayerForStats.id === playerId) {
        setSelectedPlayerForStats({
          ...selectedPlayerForStats,
          teamId: targetTeamId,
          status: "Active",
        });
      }
      return;
    }

    try {
      await updateDoc(doc(db, "players", playerId), {
        teamId: targetTeamId,
        status: "Active",
      });
      setPlayers((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, teamId: targetTeamId, status: "Active" } : p))
      );
      setAssignSuccessId(playerId);
      setTimeout(() => setAssignSuccessId(null), 3000);
      if (selectedPlayerForStats && selectedPlayerForStats.id === playerId) {
        setSelectedPlayerForStats({
          ...selectedPlayerForStats,
          teamId: targetTeamId,
          status: "Active",
        });
      }
    } catch (err) {
      console.error("Error assigning free agent:", err);
      alert("Failed to assign player to team.");
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!isLeagueAdmin) return;
    if (!confirm("Are you SURE you want to delete this player? This action cannot be undone.")) return;
    if (isDemoLeague) {
      deleteSandboxPlayer(playerId);
      setPlayers(players.filter(p => p.id !== playerId));
      setSelectedPlayerForStats(null);
      return;
    }
    try {
      await deleteDoc(doc(db, "players", playerId));
      setPlayers(players.filter(p => p.id !== playerId));
      setSelectedPlayerForStats(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddTeam = async () => {
    if (!newTeamName.trim() || !isLeagueAdmin) return;
    if (isDemoLeague) {
      const created = addSandboxTeam(newTeamName.trim());
      setTeams([...teams, created as unknown as Team].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTeamName("");
      setIsAddingTeam(false);
      return;
    }
    try {
      const docRef = await addDoc(collection(db, "teams"), {
        name: newTeamName.trim(),
        leagueId: activeLeagueId,
        createdAt: new Date().toISOString()
      });
      setTeams([...teams, { id: docRef.id, name: newTeamName.trim() }].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTeamName("");
      setIsAddingTeam(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTeam = async () => {
    if (!editTeamNameValue.trim() || !activeTeamId || !canManageTeam(activeTeamId)) return;
    if (isDemoLeague) {
      updateSandboxTeam(activeTeamId, editTeamNameValue.trim());
      setTeams(teams.map(t => t.id === activeTeamId ? { ...t, name: editTeamNameValue.trim() } : t).sort((a, b) => a.name.localeCompare(b.name)));
      setIsEditingTeamName(false);
      return;
    }
    try {
      await updateDoc(doc(db, "teams", activeTeamId), {
        name: editTeamNameValue.trim()
      });
      setTeams(teams.map(t => t.id === activeTeamId ? { ...t, name: editTeamNameValue.trim() } : t).sort((a, b) => a.name.localeCompare(b.name)));
      setIsEditingTeamName(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTeam = async () => {
    if (!isLeagueAdmin || !activeTeamId) return;
    const confirmDelete = window.confirm("Are you sure you want to delete this team? Players will NOT be deleted automatically.");
    if (!confirmDelete) return;
    if (isDemoLeague) {
      deleteSandboxTeam(activeTeamId);
      setTeams(teams.filter(t => t.id !== activeTeamId));
      setActiveTeamId(null);
      return;
    }
    try {
      await deleteDoc(doc(db, "teams", activeTeamId));
      setTeams(teams.filter(t => t.id !== activeTeamId));
      setActiveTeamId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const activeTeam = teams.find(t => t.id === activeTeamId);
  const teamPlayers = players
    .filter(p => p.teamId === activeTeamId)
    .sort((a, b) => a.playerName.localeCompare(b.playerName));

  const competitiveTeams = teams.filter(isRealTeam);
  const freeAgentPlayers = players.filter(
    (p) =>
      p.status === "Free Agent" ||
      !p.teamId ||
      p.teamId === "Free Agent" ||
      p.teamId === "team_free_agents" ||
      !teams.some((t) => t.id === p.teamId)
  );

  const filteredFreeAgents = freeAgentPlayers.filter((p) => {
    const matchesSearch =
      !freeAgentSearch.trim() ||
      p.playerName.toLowerCase().includes(freeAgentSearch.toLowerCase()) ||
      (p.experience && p.experience.toLowerCase().includes(freeAgentSearch.toLowerCase())) ||
      (p.positions && p.positions.some((pos) => pos.toLowerCase().includes(freeAgentSearch.toLowerCase()))) ||
      (p.position && p.position.toLowerCase().includes(freeAgentSearch.toLowerCase()));

    const matchesPosition =
      freeAgentPositionFilter === "ALL" ||
      (p.positions && p.positions.includes(freeAgentPositionFilter)) ||
      p.position === freeAgentPositionFilter;

    return matchesSearch && matchesPosition;
  });

  // Compute Stats
  let wins = 0;
  let losses = 0;
  let pf = 0;
  let pa = 0;

  const teamMatches = matches.filter(m => m.homeTeamId === activeTeamId || m.awayTeamId === activeTeamId);
  teamMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastMatches = teamMatches.filter(m => m.status === 'completed');
  const upcomingMatches = teamMatches.filter(m => m.status !== 'completed');

  const playerStats: Record<string, any> = {};
  teamPlayers.forEach(p => {
    playerStats[p.playerName] = {
      gamesPlayed: 0,
      passAtt: 0, passComp: 0, passTD: 0, passInt: 0,
      receptions: 0, recTD: 0,
      rushAtt: 0, rushTD: 0,
      flagPulls: 0, sacks: 0, int: 0, defTD: 0, pbu: 0
    };
  });

  pastMatches.forEach(m => {
    const isHome = m.homeTeamId === activeTeamId;
    const scored = isHome ? m.homeScore : m.awayScore;
    const allowed = isHome ? m.awayScore : m.homeScore;
    pf += scored || 0;
    pa += allowed || 0;
    if (scored > allowed) wins++;
    else if (scored < allowed) losses++;

    const dnp = m.didNotPlay || [];
    teamPlayers.forEach(p => {
      if (!dnp.includes(p.playerName)) {
        playerStats[p.playerName].gamesPlayed += 1;
      }
    });
  });

  const completedMatchIds = new Set(
    matches
      .filter((m: any) => (m.status === "completed" || m.status === "Final") && !m.isHidden)
      .map((m: any) => m.id)
  );

  plays.forEach(play => {
    if (!play.matchId || !completedMatchIds.has(play.matchId)) return;
    const m = matches.find(match => match.id === play.matchId);
    const dnp = m?.didNotPlay || [];
    const isEligible = (name: string) => name && !dnp.includes(name);

    const isConversionPlay = Boolean(
      play.isConversion === true ||
      play.playType === "Conversion" ||
      (!play.isTouchdown && (
        (play.conversionAttempt !== undefined && play.conversionAttempt !== null) ||
        play.conversionSuccess === true
      ))
    );

    // Passing
    if (play.playType === 'Pass' && isEligible(play.qbPlayerId) && playerStats[play.qbPlayerId] && !isConversionPlay) {
      playerStats[play.qbPlayerId].passAtt += 1;
      if (play.passOutcome === 'Complete') playerStats[play.qbPlayerId].passComp += 1;
      if (play.isTouchdown) playerStats[play.qbPlayerId].passTD += 1;
      if (play.passOutcome === 'Interception') playerStats[play.qbPlayerId].passInt += 1;
    }
    // Receiving
    if (play.playType === 'Pass' && play.passOutcome === 'Complete' && isEligible(play.receiverPlayerId) && playerStats[play.receiverPlayerId] && !isConversionPlay) {
      playerStats[play.receiverPlayerId].receptions += 1;
      if (play.isTouchdown) playerStats[play.receiverPlayerId].recTD += 1;
    }
    // Rushing
    if (play.playType === 'Run' && isEligible(play.runnerPlayerId) && playerStats[play.runnerPlayerId] && !isConversionPlay) {
      playerStats[play.runnerPlayerId].rushAtt += 1;
      if (play.isTouchdown) playerStats[play.runnerPlayerId].rushTD += 1;
    }
    // Defense
    if (play.defenders && Array.isArray(play.defenders)) {
      play.defenders.forEach((d: string) => {
        if (isEligible(d) && playerStats[d]) {
          playerStats[d].flagPulls += 1;
          if (play.passOutcome === 'Interception') {
            playerStats[d].int += 1;
            if (play.isPick6) playerStats[d].defTD += 1;
          } else if (play.passOutcome === 'PBU') {
            playerStats[d].pbu += 1;
          } else if (play.passOutcome === 'Sack') {
            playerStats[d].sacks += 1;
          }
        }
      });
    }
  });

  let topPasser = { name: "N/A", val: 0 };
  let topRec = { name: "N/A", val: 0 };
  let topFlags = { name: "N/A", val: 0 };
  let topInts = { name: "N/A", val: 0 };

  Object.entries(playerStats).forEach(([name, s]) => {
    if (s.passTD > topPasser.val) topPasser = { name, val: s.passTD };
    if (s.recTD > topRec.val) topRec = { name, val: s.recTD };
    if (s.flagPulls > topFlags.val) topFlags = { name, val: s.flagPulls };
    if (s.int > topInts.val) topInts = { name, val: s.int };
  });

  if (isDenied) {
    return deniedElement;
  }

  return (
    <div className="min-h-screen bg-[#07090E] text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col justify-between">

      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-cyan-900/15 rounded-full blur-[160px]"></div>
        <div className="absolute bottom-10 left-10 w-[35rem] h-[35rem] bg-blue-900/10 rounded-full blur-[170px]"></div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10 w-full px-6 py-8 flex-1">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            {!activeTeamId ? (
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-bold text-cyan-300 uppercase tracking-widest">
                  {settings.seasonTitle || "Active Season"} Franchises
                </span>
                <span className="text-neutral-500 text-xs">•</span>
                <span className="text-[11px] font-mono text-neutral-400">
                  {settings.tagline || "Official League Roster"}
                </span>
              </div>
            ) : (
              <button
                onClick={() => { setActiveTeamId(null); setIsAddingPlayer(false); setEditingPlayerId(null); }}
                className="inline-flex items-center text-neutral-400 hover:text-white transition-colors mb-4 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to All Teams
              </button>
            )}

            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight flex items-center gap-3">
              <Users className="w-8 h-8 md:w-10 md:h-10 text-cyan-400" />
              {activeTeam ? (
                isEditingTeamName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      className="bg-neutral-800 text-white rounded-lg px-3 py-1 text-2xl font-bold w-64 border border-white/10"
                      value={editTeamNameValue}
                      onChange={(e) => setEditTeamNameValue(e.target.value)}
                      autoFocus
                    />
                    <button onClick={handleUpdateTeam} className="p-2 bg-green-500/20 text-green-500 hover:bg-green-500/30 rounded-lg cursor-pointer">
                      <Check className="w-5 h-5" />
                    </button>
                    <button onClick={() => setIsEditingTeamName(false)} className="p-2 bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded-lg cursor-pointer">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <span className="flex items-center gap-3">
                    {activeTeam.name}
                    {canManageTeam(activeTeam.id) && (
                      <div className="flex gap-2">
                        <button onClick={() => { setEditTeamNameValue(activeTeam.name); setIsEditingTeamName(true); }} className="text-neutral-500 hover:text-white transition-colors text-xs font-normal px-2.5 py-1 bg-white/5 rounded-md cursor-pointer">Edit Name</button>
                        <button onClick={handleDeleteTeam} className="text-red-500/50 hover:text-red-500 transition-colors text-xs font-normal px-2.5 py-1 bg-red-500/10 rounded-md cursor-pointer">Delete Team</button>
                      </div>
                    )}
                  </span>
                )
              ) : (
                <span>{renderFlagOS(settings.leagueName)} Teams</span>
              )}
            </h1>
            <p className="text-neutral-400 text-xs md:text-sm mt-1 max-w-xl">
              {activeTeam
                ? "Franchise roster, player numbers, positions, and stat leaders."
                : `Official team registry competing in the ${settings.seasonTitle || "current season"}.`}
            </p>
          </div>

          {!activeTeamId && isLeagueAdmin && (
            <div className="mt-4 md:mt-0 flex gap-2">
              {isAddingTeam ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Team Name"
                    className="bg-neutral-800 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-cyan-400"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    autoFocus
                  />
                  <button onClick={handleAddTeam} className="p-2 bg-green-500/20 text-green-500 hover:bg-green-500/30 rounded-lg">
                    <Check className="w-5 h-5" />
                  </button>
                  <button onClick={() => setIsAddingTeam(false)} className="p-2 bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingTeam(true)}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-all duration-300 font-bold flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Create Team
                </button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : !activeTeamId ? (

          /* GRID VIEW */
          <div className="space-y-12 animate-in fade-in zoom-in-95 duration-300">
            {/* Featured Standalone Team Portal: York Lions */}
            <div className="bg-gradient-to-r from-red-950/40 via-neutral-900/60 to-black border border-red-500/30 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-red-600/20 text-red-300 text-xs font-mono font-bold border border-red-500/30">
                      Standalone Pro Team Portal
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-bold border border-emerald-500/30">
                      Complimentary (Free Lifetime)
                    </span>
                    <span className="text-neutral-500 text-xs">•</span>
                    <span className="text-xs text-neutral-300 font-semibold">Founder Varsity Club</span>
                  </div>

                  <div>
                    <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase">
                      York Lions Women&apos;s Flag Football
                    </h3>
                    <p className="text-xs md:text-sm text-neutral-300 max-w-2xl mt-1 leading-relaxed">
                      Official digital headquarters for the York Lions varsity club. Includes private depth chart, 12-player roster, up to 5 custom playbooks with pre-snap motion, and clockless scrimmage stat tracking.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400">
                    <div>
                      <span className="text-neutral-500">Coaches: </span>
                      <strong className="text-white">Dexter Harvey</strong> (Head Coach &amp; DC) &amp; <strong className="text-white">Theo</strong> (OC)
                    </div>
                    <div>
                      <span className="text-neutral-500">Roster: </span>
                      <strong className="text-white">12 Varsity Players</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500">Tier: </span>
                      <strong className="text-emerald-400">Pro Team Subscription ($0/mo)</strong>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0 w-full sm:w-auto">
                  <Link
                    href={`/teams/${YORK_TEAM_ID}`}
                    className="flex-1 sm:flex-initial px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-[1.02]"
                  >
                    <span>Open Team Portal</span>
                    <ArrowRightLeft className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/teams/${YORK_TEAM_ID}/playbook`}
                    className="flex-1 sm:flex-initial px-4 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all border border-white/10"
                  >
                    <span>Playbooks</span>
                  </Link>
                  <Link
                    href={`/teams/${YORK_TEAM_ID}/roster`}
                    className="flex-1 sm:flex-initial px-4 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all border border-white/10"
                  >
                    <span>Roster</span>
                  </Link>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold uppercase tracking-wide text-neutral-300 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <span>Official Franchises ({competitiveTeams.length})</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {competitiveTeams.map(team => {
                  const teamRosterCount = players.filter(p => p.teamId === team.id).length;

                  const teamMatches = matches.filter(m => m.homeTeamId === team.id || m.awayTeamId === team.id);
                  let w = 0; let l = 0; let t = 0;
                  teamMatches.filter(m => m.status === 'completed').forEach(m => {
                    const isHome = m.homeTeamId === team.id;
                    const scored = isHome ? m.homeScore : m.awayScore;
                    const allowed = isHome ? m.awayScore : m.homeScore;
                    if (scored > allowed) w++;
                    else if (scored < allowed) l++;
                    else t++;
                  });

                  const upcoming = teamMatches.filter(m => m.status !== 'completed').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
                  let upcomingStr = "None scheduled";
                  if (upcoming) {
                    const isHome = upcoming.homeTeamId === team.id;
                    const opponent = teams.find(tObj => tObj.id === (isHome ? upcoming.awayTeamId : upcoming.homeTeamId))?.name || "Unknown";
                    upcomingStr = `${new Date(upcoming.date).toLocaleDateString()} vs ${getShorthand(opponent)}`;
                  }

                  return (
                    <Link
                      key={team.id}
                      href={`/teams/${team.id}`}
                      className="group relative bg-neutral-900/50 backdrop-blur-md border border-white/5 hover:border-cyan-500/50 rounded-3xl p-6 transition-all duration-300 text-left overflow-hidden flex flex-col h-64 shadow-xl hover:-translate-y-1 hover:bg-neutral-900"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                      <div className="relative z-10 flex justify-between items-start w-full">
                        <div>
                          <h3 className="text-2xl font-black text-white group-hover:text-cyan-400 transition-colors">{team.name}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 bg-white/10 rounded-md text-xs font-mono font-bold tracking-widest text-neutral-300">
                              {getShorthand(team.name)}
                            </span>
                            <span className="text-neutral-400 text-xs font-medium">
                              {teamRosterCount}/30 Players
                            </span>
                            {teamRosterCount < (settings.rules?.minRosterSize || 5) && (
                              <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-300 rounded text-[9px] font-bold border border-amber-500/30">
                                Below Min
                              </span>
                            )}
                            {canManageTeam(team.id) && (
                              <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-md text-[10px] font-bold uppercase tracking-wider border border-cyan-500/30">
                                My Team
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center p-2 group-hover:scale-110 transition-transform shrink-0">
                          <TeamLogo
                            teamName={team.name}
                            logoUrl={(team as any).logoUrl}
                            icon={(team as any).icon || (isYorkTeam(team.id) ? "cat" : "shield")}
                            className="w-full h-full object-contain"
                            customColor={isYorkTeam(team.id) ? "text-red-400" : undefined}
                          />
                        </div>
                      </div>

                      <div className="relative z-10 mt-auto w-full pt-4 border-t border-white/5">
                        <div className="flex justify-between items-end mb-2">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest block mb-0.5">Record</span>
                            <span className="text-lg font-black text-white">{w}-{l}-{t}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest block mb-0.5">Next Match</span>
                            <span className="text-xs font-semibold text-neutral-300">{upcomingStr}</span>
                          </div>
                        </div>
                        <div className="text-[11px] font-bold text-cyan-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 mt-1">
                          <span>Enter Team Portal</span>
                          <span>→</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* FREE AGENT DRAFT POOL SECTION (Visible only to League Admins and Team Admins) */}
            {settings.rules?.enableFreeAgents !== false && isAdmin && (
              <div className="bg-[#0B0F19] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-bold text-cyan-300 uppercase tracking-widest">
                        Draft Pool
                      </span>
                      <span className="text-neutral-500 text-xs">•</span>
                      <span className="text-xs text-neutral-400 font-mono">
                        {freeAgentPlayers.length} Unassigned Athlete{freeAgentPlayers.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight flex items-center gap-2.5">
                      <UserPlus className="w-7 h-7 text-cyan-400" />
                      <span>Free Agent Player Pool</span>
                    </h2>
                    <p className="text-neutral-400 text-xs md:text-sm max-w-2xl">
                      Athletes awaiting assignment to an active franchise roster. Team admins can scout available talent; only league commissioners can assign athletes to a franchise.
                    </p>
                  </div>

                  {canRegisterAsPlayer && (
                    <div className="flex items-center gap-3">
                      <Link
                        href="/join"
                        className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Join As Free Agent</span>
                      </Link>
                    </div>
                  )}
                </div>

                {/* Filter and Search Bar */}
                <div className="relative z-10 py-5 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between border-b border-white/5">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search free agents by name, position, experience..."
                      value={freeAgentSearch}
                      onChange={(e) => setFreeAgentSearch(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Position Filter Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {["ALL", "QB", "WR", "RB", "C", "DB", "RUSH", "ATH"].map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setFreeAgentPositionFilter(pos)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition-all ${
                          freeAgentPositionFilter === pos
                            ? "bg-cyan-500 text-black font-black"
                            : "bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Free Agents Table */}
                <div className="relative z-10 mt-4 overflow-x-auto">
                  {filteredFreeAgents.length === 0 ? (
                    <div className="text-center py-16 px-4 space-y-3">
                      <Users className="w-10 h-10 text-neutral-600 mx-auto" />
                      <p className="text-neutral-400 font-semibold text-sm">
                        {freeAgentPlayers.length === 0
                          ? "No free agents currently waiting in the draft pool."
                          : "No free agents match your current filters."}
                      </p>
                      <p className="text-neutral-500 text-xs">
                        {freeAgentPlayers.length === 0
                          ? "Athletes who complete the registration form will appear here until assigned to an active franchise."
                          : "Try clearing your search query or position filter."}
                      </p>
                      {freeAgentPlayers.length === 0 && canRegisterAsPlayer && (
                        <Link
                          href="/join"
                          className="inline-flex items-center gap-1.5 px-4 py-2 mt-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Submit Join Form</span>
                        </Link>
                      )}
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          <th className="py-3 px-4">Player Name</th>
                          <th className="py-3 px-4">Position(s)</th>
                          <th className="py-3 px-4">Experience</th>
                          <th className="py-3 px-4">Preferred Teammates</th>
                          {isLeagueAdmin && (
                            <th className="py-3 px-4 text-right">Assign to Franchise</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs">
                        {filteredFreeAgents.map((player) => {
                          const displayPositions = player.positions && player.positions.length > 0
                            ? player.positions
                            : player.position ? [player.position] : ["ATH"];
                          const isAssigned = assignSuccessId === player.id;
                          const selectedTeam = selectedAssignTeamId[player.id] || "";

                          return (
                            <tr key={player.id} className="hover:bg-white/[0.03] transition-colors group">
                              <td className="py-3.5 px-4">
                                <button
                                  type="button"
                                  onClick={() => setSelectedPlayerForStats(player)}
                                  className="font-bold text-white hover:text-cyan-400 transition-colors text-left flex items-center gap-1.5"
                                >
                                  <span>{player.playerName}</span>
                                </button>
                                {player.email && (
                                  <span className="text-[10px] text-neutral-500 font-mono block">
                                    {player.email}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex flex-wrap gap-1">
                                  {displayPositions.map((pos) => (
                                    <span
                                      key={pos}
                                      className="px-2 py-0.5 rounded-md bg-white/10 text-neutral-300 font-mono text-[10px] font-bold"
                                    >
                                      {pos}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-neutral-300">
                                {player.experience || <span className="text-neutral-500 italic">Not stated</span>}
                              </td>
                              <td className="py-3.5 px-4">
                                {player.preferredTeammateNames && player.preferredTeammateNames.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 max-w-xs">
                                    {player.preferredTeammateNames.map((name, i) => (
                                      <span
                                        key={i}
                                        className="px-1.5 py-0.5 rounded bg-white/5 text-neutral-300 text-[10px]"
                                      >
                                        {name}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-neutral-600 text-[11px]">—</span>
                                )}
                              </td>
                              {isLeagueAdmin && (
                                <td className="py-3.5 px-4 text-right">
                                  {isAssigned ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-bold">
                                      <CheckCircle2 className="w-4 h-4" />
                                      <span>Assigned!</span>
                                    </span>
                                  ) : (
                                    <div className="flex items-center justify-end gap-2">
                                      <select
                                        value={selectedTeam}
                                        onChange={(e) =>
                                          setSelectedAssignTeamId({
                                            ...selectedAssignTeamId,
                                            [player.id]: e.target.value,
                                          })
                                        }
                                        className="bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-400 outline-none max-w-[150px]"
                                      >
                                        <option value="">Select Team...</option>
                                        {competitiveTeams.map((t) => {
                                          const count = players.filter((p) => p.teamId === t.id).length;
                                          return (
                                            <option key={t.id} value={t.id}>
                                              {t.name} ({count}/30)
                                            </option>
                                          );
                                        })}
                                      </select>
                                      <button
                                        type="button"
                                        disabled={!selectedTeam}
                                        onClick={() => handleAssignFreeAgent(player.id, selectedTeam)}
                                        className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-xs transition-all shadow-md"
                                      >
                                        Assign
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePlayer(player.id)}
                                        className="p-1.5 text-neutral-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Delete Free Agent"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>

        ) : (

          /* DETAILED VIEW */
          <div className="flex flex-col xl:flex-row gap-8 animate-in fade-in slide-in-from-bottom-8 duration-300">

            {/* Left Column: Roster */}
            <div className="w-full xl:w-1/3 flex flex-col gap-6">
              <div className="bg-neutral-900/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl">
                <div className="bg-neutral-900 px-6 py-5 border-b border-white/5 flex items-center justify-between sticky top-0 z-20">
                  <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-2xl font-bold">
                      Roster ({players.filter(p => p.teamId === activeTeam?.id).length}/30)
                    </h2>
                  </div>
                  {activeTeam && canManageTeam(activeTeam.id) && (
                    <button
                      onClick={() => setIsAddingPlayer(!isAddingPlayer)}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-neutral-300 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {isAddingPlayer && (
                  <div className="px-6 py-4 bg-neutral-950 border-b border-white/5 flex flex-col gap-3">
                    <input
                      type="text"
                      placeholder="New Player Name..."
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400"
                      autoFocus
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={newPlayerPosition}
                        onChange={(e) => setNewPlayerPosition(e.target.value)}
                        className="bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                      >
                        {["QB", "WR", "RB", "C", "DB", "RUSH", "LB", "ATH"].map((pos) => (
                          <option key={pos} value={pos}>
                            Position: {pos}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button onClick={handleAddPlayer} className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)]">
                      Save Player
                    </button>
                  </div>
                )}

                <div className="max-h-[600px] overflow-y-auto hide-scrollbar p-0">
                  <table className="w-full text-left border-collapse">
                    <tbody className="divide-y divide-white/5">
                      {teamPlayers.map(player => (
                        <tr key={player.id} className="hover:bg-white/5 transition-colors group">
                          <td
                            className="py-4 px-6 font-semibold text-lg cursor-pointer hover:text-cyan-400 transition-colors"
                            onClick={() => setSelectedPlayerForStats(player)}
                          >
                            {player.playerName}
                          </td>
                          <td className="py-4 px-6 text-right flex justify-end">
                            {activeTeam && canManageTeam(activeTeam.id) && (
                              editingPlayerId === player.id ? (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={editTeamId}
                                    onChange={(e) => setEditTeamId(e.target.value)}
                                    className="bg-black border border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none max-w-[100px]"
                                  >
                                    <option value="" disabled>Team...</option>
                                    {teams.map(t => (
                                      <option key={t.id} value={t.id}>{getShorthand(t.name)}</option>
                                    ))}
                                  </select>
                                  <button onClick={() => handleUpdatePlayerTeam(player.id)} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/40">
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => setEditingPlayerId(null)} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/40">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setEditingPlayerId(player.id); setEditTeamId(player.teamId); }}
                                  className="flex items-center gap-2 px-2 py-1.5 text-[10px] font-bold uppercase text-neutral-500 hover:text-white bg-black border border-white/5 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <ArrowRightLeft className="w-3 h-3" /> Swap
                                </button>
                              )
                            )}
                          </td>
                        </tr>
                      ))}
                      {teamPlayers.length === 0 && !isAddingPlayer && (
                        <tr>
                          <td colSpan={2} className="py-12 text-center text-neutral-500 italic text-sm">
                            No players found. Add one above.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Stats & Matches */}
            {activeTeam?.name !== 'Free Agent' && (
              <div className="w-full xl:w-2/3 flex flex-col gap-6">

                {/* Stat Tables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-neutral-900/50 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-6">
                      <Trophy className="w-5 h-5 text-amber-400" />
                      <h3 className="text-xl font-bold">Team Stats</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-neutral-400">Wins</span>
                        <span className="font-bold">{wins}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-neutral-400">Losses</span>
                        <span className="font-bold">{losses}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-neutral-400">Points Scored</span>
                        <span className="font-bold">{pf}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2">
                        <span className="text-neutral-400">Points Allowed</span>
                        <span className="font-bold">{pa}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-neutral-900/50 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-6">
                      <Activity className="w-5 h-5 text-cyan-400" />
                      <h3 className="text-xl font-bold">Top Performers</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-neutral-400">Passing TDs</span>
                        <span className="font-bold">{topPasser.val > 0 ? `${topPasser.name} (${topPasser.val})` : <span className="text-sm text-neutral-500 italic">No data yet</span>}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-neutral-400">Receiving TDs</span>
                        <span className="font-bold">{topRec.val > 0 ? `${topRec.name} (${topRec.val})` : <span className="text-sm text-neutral-500 italic">No data yet</span>}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-neutral-400">Flags</span>
                        <span className="font-bold">{topFlags.val > 0 ? `${topFlags.name} (${topFlags.val})` : <span className="text-sm text-neutral-500 italic">No data yet</span>}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2">
                        <span className="text-neutral-400">Interceptions</span>
                        <span className="font-bold">{topInts.val > 0 ? `${topInts.name} (${topInts.val})` : <span className="text-sm text-neutral-500 italic">No data yet</span>}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Matches (Past & Upcoming) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-neutral-900/50 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-6">
                      <History className="w-5 h-5 text-blue-400" />
                      <h3 className="text-xl font-bold">Past Results</h3>
                    </div>
                    {pastMatches.length === 0 ? (
                      <div className="flex items-center justify-center py-12 text-neutral-500 italic text-sm">
                        No past games found.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {pastMatches.map(m => {
                          const isHome = m.homeTeamId === activeTeamId;
                          const opponent = teams.find(t => t.id === (isHome ? m.awayTeamId : m.homeTeamId))?.name || "Unknown";
                          const scored = isHome ? m.homeScore : m.awayScore;
                          const allowed = isHome ? m.awayScore : m.homeScore;
                          const isWin = scored > allowed;
                          const isLoss = scored < allowed;
                          return (
                            <Link href={`/matches/${m.id}`} key={m.id} className="bg-neutral-950 border border-white/5 p-4 rounded-xl flex items-center justify-between hover:bg-white/5 transition-colors group">
                              <div>
                                <span className="text-xs text-neutral-500 uppercase font-bold tracking-widest">{new Date(m.date).toLocaleDateString()}</span>
                                <p className="font-bold text-white mt-1 group-hover:text-blue-400 transition-colors">vs {opponent}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-black">{scored} - {allowed}</span>
                                {isWin && <span className="bg-emerald-500/20 text-emerald-500 font-bold px-2 py-1 rounded text-xs">W</span>}
                                {isLoss && <span className="bg-red-500/20 text-red-500 font-bold px-2 py-1 rounded text-xs">L</span>}
                                {!isWin && !isLoss && <span className="bg-neutral-500/20 text-neutral-400 font-bold px-2 py-1 rounded text-xs">T</span>}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="bg-neutral-900/50 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-6">
                      <Calendar className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-xl font-bold">Upcoming Games</h3>
                    </div>
                    {upcomingMatches.length === 0 ? (
                      <div className="flex items-center justify-center py-12 text-neutral-500 italic text-sm">
                        No upcoming games scheduled.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {upcomingMatches.map(m => {
                          const isHome = m.homeTeamId === activeTeamId;
                          const opponent = teams.find(t => t.id === (isHome ? m.awayTeamId : m.homeTeamId))?.name || "Unknown";
                          const dateObj = new Date(m.date);
                          return (
                            <div key={m.id} className="bg-neutral-950 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                              <div>
                                <span className="text-xs text-neutral-500 uppercase font-bold tracking-widest">{dateObj.toLocaleDateString()}</span>
                                <p className="font-bold text-white mt-1">vs {opponent}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-bold text-emerald-400">{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <p className="text-xs text-neutral-500 uppercase font-bold tracking-widest mt-1">{m.location || 'TBA'}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

          </div>
        )}
      </div>

      {/* Player Stats Modal */}
      {selectedPlayerForStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedPlayerForStats(null)}></div>
          <div className="relative bg-neutral-900 border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            {activeTeam && canManageTeam(activeTeam.id) && (
              <button
                onClick={() => handleDeletePlayer(selectedPlayerForStats.id)}
                className="absolute top-4 left-4 p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full transition-colors"
                title="Delete Player"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setSelectedPlayerForStats(null)}
              className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 border border-cyan-500/30">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black">{selectedPlayerForStats.playerName}</h3>
                <p className="text-neutral-400 font-semibold">{activeTeam?.name}</p>
              </div>
            </div>

            {(selectedPlayerForStats.experience || selectedPlayerForStats.status === 'Free Agent' || selectedPlayerForStats.positions || selectedPlayerForStats.position) ? (
              <div className="space-y-4">
                <div className="bg-cyan-500/10 p-3 rounded-lg border border-cyan-500/20 mb-4 text-center">
                  <span className="text-cyan-400 font-bold text-sm uppercase tracking-wider">Player Profile & Registration</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-neutral-400">Position(s)</span>
                  <span className="font-bold text-right text-cyan-400">
                    {selectedPlayerForStats.positions?.join(", ") || selectedPlayerForStats.position || 'ATH'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-neutral-400">Experience</span>
                  <span className="font-bold text-right">{selectedPlayerForStats.experience || 'Not provided'}</span>
                </div>
                {(selectedPlayerForStats.email || (selectedPlayerForStats.emails && selectedPlayerForStats.emails.length > 0)) && (
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className="text-neutral-400">Email</span>
                    <span className="font-mono text-xs text-neutral-300 text-right">
                      {selectedPlayerForStats.email || selectedPlayerForStats.emails?.join(", ")}
                    </span>
                  </div>
                )}
                {selectedPlayerForStats.preferredTeammateNames && selectedPlayerForStats.preferredTeammateNames.length > 0 && (
                  <div className="flex flex-col border-b border-white/5 pb-3 gap-2">
                    <span className="text-neutral-400 text-sm">Preferred Teammates</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedPlayerForStats.preferredTeammateNames.map((name: string, i: number) => (
                        <span key={i} className="bg-white/10 px-2 py-1 rounded text-xs font-semibold">{name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto hide-scrollbar pr-2">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-neutral-400">Games Played</span>
                  <span className="font-bold">{playerStats[selectedPlayerForStats.playerName]?.gamesPlayed || 0}</span>
                </div>

                {/* Passing Stats */}
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-neutral-400">C/ATT</span>
                  <span className="font-bold">{playerStats[selectedPlayerForStats.playerName]?.passComp || 0}/{playerStats[selectedPlayerForStats.playerName]?.passAtt || 0}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-neutral-400">Passing TDs</span>
                  <span className="font-bold">{playerStats[selectedPlayerForStats.playerName]?.passTD || 0}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-neutral-400">INTs Thrown</span>
                  <span className="font-bold">{playerStats[selectedPlayerForStats.playerName]?.passInt || 0}</span>
                </div>

                {/* Receiving Stats */}
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-neutral-400">Receptions</span>
                  <span className="font-bold">{playerStats[selectedPlayerForStats.playerName]?.receptions || 0}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-neutral-400">Receiving TDs</span>
                  <span className="font-bold">{playerStats[selectedPlayerForStats.playerName]?.recTD || 0}</span>
                </div>

                {/* Rushing Stats */}
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-neutral-400">Rushes</span>
                  <span className="font-bold">{playerStats[selectedPlayerForStats.playerName]?.rushAtt || 0}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-neutral-400">Rushing TDs</span>
                  <span className="font-bold">{playerStats[selectedPlayerForStats.playerName]?.rushTD || 0}</span>
                </div>

                {/* Defensive Stats */}
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-neutral-400">Flags</span>
                  <span className="font-bold">{playerStats[selectedPlayerForStats.playerName]?.flagPulls || 0}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-neutral-400">Sacks</span>
                  <span className="font-bold">{playerStats[selectedPlayerForStats.playerName]?.sacks || 0}</span>
                </div>
                <div className="flex justify-between items-center pb-2">
                  <span className="text-neutral-400">Interceptions (Def)</span>
                  <span className="font-bold">{playerStats[selectedPlayerForStats.playerName]?.int || 0}</span>
                </div>
              </div>
            )}

            <p className="text-xs text-neutral-500 text-center mt-8 italic">Stats will update automatically after games.</p>
          </div>
        </div>
      )}

    </div>
  );
}
