"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  User,
  UserPlus,
  Users,
  Edit2,
  Trash2,
  Check,
  X,
  Activity,
  Star,
  Shield,
  Trophy,
  ArrowRight,
  Mail,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { createSecureRecord, requestPrivateData } from "@/lib/secureWrites";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit
} from "firebase/firestore";
import { useAuth } from "@/lib/authContext";
import { TeamLogo, getTeamShortcode, isRealTeam } from "@/components/TeamAssets";
import { useLeague } from "@/lib/leagueContext";
import {
  getSandboxTeams,
  getSandboxPlayers,
  getSandboxMatches,
  getSandboxPlays,
  addSandboxPlayer,
  updateSandboxPlayer,
  deleteSandboxPlayer,
  subscribeDemoSandbox,
} from "@/lib/demoSandbox";
import {
  isYorkTeam,
  getYorkTeamData,
  getYorkTeamPlayers,
  getYorkTeamMatches,
  getYorkTeamPlays,
  YORK_TEAM_ID,
} from "@/lib/yorkTeamData";
import { isPrimaryTeamAdmin, isDexterUser } from "@/lib/teamAdminRbac";
import { loadYorkSeasonData } from "@/lib/yorkSeasonData";
import TeamDepthCharts from "@/components/TeamDepthCharts";
import { getFormationPositions, getPlayerPositions, type DepthFormation } from "@/lib/depthChart";

export default function TeamRosterPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const teamId = isYorkTeam(unwrappedParams.id) ? YORK_TEAM_ID : unwrappedParams.id;

  const { canManageTeam, isLeagueAdmin, isTeamAdmin, user } = useAuth();
  const { settings, isDemoLeague } = useLeague();
  const [team, setTeam] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [plays, setPlays] = useState<any[]>([]);
  const [playerStats, setPlayerStats] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"roster" | "depth_chart">("roster");
  const [showStats, setShowStats] = useState(false);
  const [depthFormations, setDepthFormations] = useState<DepthFormation[]>([]);
  const positionOptions = getFormationPositions(depthFormations);

  // Player Detail Modal
  const [selectedPlayerForStats, setSelectedPlayerForStats] = useState<any | null>(null);

  // Admin Controls (Team Admin & League Admin)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");
  const [newPlayerEmails, setNewPlayerEmails] = useState("");
  const [newPlayerPositions, setNewPlayerPositions] = useState<string[]>(["ATH"]);
  const [newPlayerExperience, setNewPlayerExperience] = useState("");
  const [addingPlayer, setAddingPlayer] = useState(false);

  // Edit Player State
  const [editingPlayer, setEditingPlayer] = useState<any | null>(null);
  const [editPlayerName, setEditPlayerName] = useState("");
  const [editPlayerNumber, setEditPlayerNumber] = useState("");
  const [editPlayerEmails, setEditPlayerEmails] = useState("");
  const [editPlayerPositions, setEditPlayerPositions] = useState<string[]>(["ATH"]);
  const [savingPlayer, setSavingPlayer] = useState(false);

  const fetchData = async () => {
    try {
      let tObj: any = null;
      let pList: any[] = [];
      let mList: any[] = [];
      let playList: any[] = [];

      if (isYorkTeam(teamId)) {
        tObj = { ...getYorkTeamData() };
        let hasSharedRoster = false;
        try {
          const [teamSnap, playersSnap] = await Promise.all([
            getDoc(doc(db, "teams", teamId)),
            getDocs(query(collection(db, "players"), where("teamId", "==", teamId), limit(30))),
          ]);
          if (teamSnap.exists()) tObj = { ...tObj, ...teamSnap.data() };
          hasSharedRoster = teamSnap.exists();
          pList = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          if (isTeamOrLeagueAdmin) {
            const privateData = await requestPrivateData<{
              team: Record<string, unknown>;
              players: Record<string, { email?: string; emails?: string[] }>;
            }>("team", { teamId });
            tObj = { ...tObj, ...privateData.team };
            pList = pList.map((player) => ({
              ...player,
              ...(privateData.players[player.id] || {}),
            }));
          }
        } catch (e) {
          console.warn("Using offline/seed York Lions roster data:", e);
        }
        if (pList.length === 0 && !hasSharedRoster) {
          pList = getYorkTeamPlayers();
        }
        const season = await loadYorkSeasonData();
        mList = season.matches;
        playList = season.plays;
      } else if (isDemoLeague) {
        tObj = getSandboxTeams().find((t) => t.id === teamId || (teamId === "team_apex" && t.id === "team_kc"));
        const effectiveTeamId = tObj?.id || teamId;
        pList = getSandboxPlayers().filter((p) => p.teamId === effectiveTeamId);
        mList = getSandboxMatches();
        playList = getSandboxPlays();
      } else {
        const teamSnap = await getDoc(doc(db, "teams", teamId));
        if (teamSnap.exists()) tObj = { id: teamSnap.id, ...teamSnap.data() };
        const leagueId = typeof tObj?.leagueId === "string" ? tObj.leagueId : "";
        const [playersSnap, matchesSnap, playsSnap] = await Promise.all([
          getDocs(query(collection(db, "players"), where("teamId", "==", teamId), limit(30))),
          getDocs(query(
            collection(db, "matches"),
            where("leagueId", "==", leagueId),
            where("isHidden", "!=", true),
            limit(512),
          )),
          getDocs(query(
            collection(db, "plays"),
            where("leagueId", "==", leagueId),
            where("isHidden", "!=", true),
            limit(10_000),
          )),
        ]);
        pList = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (isTeamOrLeagueAdmin) {
          const privateData = await requestPrivateData<{
            team: Record<string, unknown>;
            players: Record<string, { email?: string; emails?: string[] }>;
          }>("team", { teamId });
          tObj = { ...tObj, ...privateData.team };
          pList = pList.map((player) => ({
            ...player,
            ...(privateData.players[player.id] || {}),
          }));
        }
        mList = matchesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        playList = playsSnap.docs.map((d) => d.data() as any);
      }

      if (tObj && isRealTeam(tObj)) {
        setTeam(tObj);
      } else {
        setTeam(null);
      }
      pList.sort((a: any, b: any) => a.playerName.localeCompare(b.playerName));
      setPlayers(pList);
      setMatches(mList);
      setPlays(playList);

      // Compute Individual Player Stats for this team's players
      const statsMap: Record<string, any> = {};
      pList.forEach((p: any) => {
        statsMap[p.playerName] = {
          gamesPlayed: 0,
          passAtt: 0,
          passComp: 0,
          passTD: 0,
          passInt: 0,
          receptions: 0,
          recTD: 0,
          rushAtt: 0,
          rushTD: 0,
          flagPulls: 0,
          sacks: 0,
          int: 0,
          defTD: 0,
          pbu: 0,
          totalTDs: 0,
        };
      });

      // Matches games played
      mList.forEach((m) => {
        if ((m.status === "completed" || m.status === "Final") && (m.homeTeamId === teamId || m.awayTeamId === teamId)) {
          const dnp = m.didNotPlay || [];
          pList.forEach((p: any) => {
            if (statsMap[p.playerName] && !dnp.includes(p.playerName)) {
              statsMap[p.playerName].gamesPlayed += 1;
            }
          });
        }
      });

      // Completed matches set (only stats from completed games are tracked)
      const completedMatchIds = new Set(
        mList
          .filter((m: any) => (m.status === "completed" || m.status === "Final") && !m.isHidden)
          .map((m: any) => m.id)
      );

      // Plays calculation (strictly for completed matches)
      playList.forEach((play: any) => {
        if (!play.matchId || !completedMatchIds.has(play.matchId)) return;
        const isEligible = (name: string) => name && statsMap[name];

        const isConversionPlay = Boolean(
          play.isConversion === true ||
          play.playType === "Conversion" ||
          (!play.isTouchdown && (
            (play.conversionAttempt !== undefined && play.conversionAttempt !== null) ||
            play.conversionSuccess === true
          ))
        );

        if (play.playType === "Pass" && isEligible(play.qbPlayerId) && !isConversionPlay) {
          statsMap[play.qbPlayerId].passAtt += 1;
          if (play.passOutcome === "Complete") statsMap[play.qbPlayerId].passComp += 1;
          if (play.isTouchdown) {
            statsMap[play.qbPlayerId].passTD += 1;
            statsMap[play.qbPlayerId].totalTDs += 1;
          }
        }

        if (play.playType === "Pass" && play.passOutcome === "Complete" && isEligible(play.receiverPlayerId) && !isConversionPlay) {
          statsMap[play.receiverPlayerId].receptions += 1;
          if (play.isTouchdown) {
            statsMap[play.receiverPlayerId].recTD += 1;
            statsMap[play.receiverPlayerId].totalTDs += 1;
          }
        }

        if (play.playType === "Run" && isEligible(play.runnerPlayerId) && !isConversionPlay) {
          statsMap[play.runnerPlayerId].rushAtt += 1;
          if (play.isTouchdown) {
            statsMap[play.runnerPlayerId].rushTD += 1;
            statsMap[play.runnerPlayerId].totalTDs += 1;
          }
        }

        if (play.defenders && Array.isArray(play.defenders)) {
          play.defenders.forEach((defName: string) => {
            if (!isEligible(defName)) return;
            if (play.passOutcome === "Interception") {
              statsMap[defName].int += 1;
              if (play.isPick6) {
                statsMap[defName].defTD += 1;
                statsMap[defName].totalTDs += 1;
              }
            } else if (play.passOutcome === "PBU") {
              statsMap[defName].pbu += 1;
            } else if (play.passOutcome === "Sack") {
              statsMap[defName].sacks += 1;
              statsMap[defName].flagPulls += 1;
            } else {
              statsMap[defName].flagPulls += 1;
            }
          });
        }

        if (play.passOutcome === "Interception" && play.flaggers && Array.isArray(play.flaggers)) {
          play.flaggers.forEach((flagger: string) => {
            if (isEligible(flagger)) {
              statsMap[flagger].flagPulls += 1;
            }
          });
        }
      });

      setPlayerStats(statsMap);
    } catch (e) {
      console.error("Error fetching roster data:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    if (isDemoLeague && !isYorkTeam(teamId)) {
      const unsub = subscribeDemoSandbox(() => fetchData());
      return () => unsub();
    }
  }, [teamId, isDemoLeague]);

  const minRosterSize = settings.rules?.minRosterSize || 5;
  const maxRosterSize = 30; // Hard cap of 30 players for all teams
  const isRosterFull = players.length >= maxRosterSize;
  const isRosterUnderMin = players.length < minRosterSize;

  // Handler: Add Player
  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    if (players.length >= maxRosterSize) {
      alert(`Cannot add player: Team is at the hard cap limit of ${maxRosterSize} players permitted across all teams.`);
      return;
    }

    setAddingPlayer(true);
    try {
      const parsedEmails = newPlayerEmails
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      if (isDemoLeague && !isYorkTeam(teamId)) {
        const newPlayerObj = addSandboxPlayer({
          playerName: newPlayerName.trim(),
          teamId: teamId,
          number: newPlayerNumber.trim(),
          position: newPlayerPositions[0],
          positions: newPlayerPositions,
          experience: newPlayerExperience.trim(),
          email: parsedEmails[0] || "",
        });
        setPlayers((prev) => [...prev, newPlayerObj].sort((a: any, b: any) => a.playerName.localeCompare(b.playerName)));
        setNewPlayerName("");
        setNewPlayerNumber("");
        setNewPlayerEmails("");
        setNewPlayerPositions(["ATH"]);
        setNewPlayerExperience("");
        setIsAddModalOpen(false);
        setAddingPlayer(false);
        return;
      }

      const docId = await createSecureRecord("player", {
          playerName: newPlayerName.trim(),
          teamId: teamId,
          number: newPlayerNumber.trim(),
          position: newPlayerPositions[0],
          positions: newPlayerPositions,
          experience: newPlayerExperience.trim(),
          emails: parsedEmails,
          email: parsedEmails[0] || "",
          createdAt: new Date().toISOString(),
      });

      const newPlayerObj = {
        id: docId,
        playerName: newPlayerName.trim(),
        teamId: teamId,
        number: newPlayerNumber.trim(),
        position: newPlayerPositions[0],
        positions: newPlayerPositions,
        experience: newPlayerExperience.trim(),
        emails: parsedEmails,
        email: parsedEmails[0] || "",
      };

      setPlayers((prev) => [...prev, newPlayerObj].sort((a, b) => a.playerName.localeCompare(b.playerName)));
      setNewPlayerName("");
      setNewPlayerNumber("");
      setNewPlayerEmails("");
      setNewPlayerPositions(["ATH"]);
      setNewPlayerExperience("");
      setIsAddModalOpen(false);
    } catch (e) {
      console.error("Error adding player:", e);
      alert("Failed to add player.");
    }
    setAddingPlayer(false);
  };

  // Handler: Open Edit Player Modal
  const handleOpenEditPlayer = (p: any) => {
    setEditingPlayer(p);
    setEditPlayerName(p.playerName || "");
    setEditPlayerNumber(p.number || p.jerseyNumber || "");
    const existingEmails = Array.isArray(p.emails)
      ? p.emails.join(", ")
      : p.email
      ? String(p.email)
      : "";
    setEditPlayerEmails(existingEmails);
    setEditPlayerPositions(getPlayerPositions(p));
  };

  // Handler: Save Edit Player
  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer || !editPlayerName.trim()) return;

    setSavingPlayer(true);
    try {
      const parsedEmails = editPlayerEmails
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      const updatedFields = {
        playerName: editPlayerName.trim(),
        number: editPlayerNumber.trim(),
        position: editPlayerPositions[0],
        positions: editPlayerPositions,
        emails: parsedEmails,
        email: parsedEmails[0] || "",
      };

      if (isDemoLeague && !isYorkTeam(teamId)) {
        updateSandboxPlayer(editingPlayer.id, updatedFields);
        setPlayers((prev) =>
          prev.map((p) => (p.id === editingPlayer.id ? { ...p, ...updatedFields } : p))
        );
        setEditingPlayer(null);
        setSavingPlayer(false);
        return;
      }

      await createSecureRecord("player_update", {
        playerId: editingPlayer.id,
        ...updatedFields,
      });

      setPlayers((prev) =>
        prev.map((p) => (p.id === editingPlayer.id ? { ...p, ...updatedFields } : p))
      );
      setEditingPlayer(null);
    } catch (e) {
      console.error("Error updating player:", e);
      alert("Failed to update player.");
    }
    setSavingPlayer(false);
  };

  const isDexter = isDexterUser(user?.email);
  const canDeletePlayer = isPrimaryTeamAdmin(user?.email, team, isDexter);

  // Handler: Delete Player
  const handleDeletePlayer = async (playerId: string, playerName: string) => {
    if (!canDeletePlayer) {
      alert("Permission Denied: Only the primary team admin (head coach) can delete players from the roster.");
      return;
    }
    if (!confirm(`Are you sure you want to remove "${playerName}" from the roster?`)) return;

    try {
      if (isDemoLeague && !isYorkTeam(teamId)) {
        deleteSandboxPlayer(playerId);
        setPlayers((prev) => prev.filter((p) => p.id !== playerId));
        if (selectedPlayerForStats?.id === playerId) {
          setSelectedPlayerForStats(null);
        }
        return;
      }
      await createSecureRecord("delete_player", { playerId });
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
      if (selectedPlayerForStats?.id === playerId) {
        setSelectedPlayerForStats(null);
      }
    } catch (e) {
      console.error("Error deleting player:", e);
      alert("Failed to delete player.");
    }
  };

  const isTeamOrLeagueAdmin = isLeagueAdmin || canManageTeam(teamId) || (typeof isTeamAdmin === "function" && isTeamAdmin(teamId));
  const hasEditAccess = isTeamOrLeagueAdmin;
  const teamName = team?.name || "Team";

  // Calculate Team Overview Stats
  const teamMatches = matches.filter(
    (m) => (m.status === "completed" || m.status === "Final") && (m.homeTeamId === teamId || m.awayTeamId === teamId)
  );

  let wins = 0;
  let losses = 0;
  let ties = 0;
  let pf = 0;
  let pa = 0;

  teamMatches.forEach((m) => {
    const isHome = m.homeTeamId === teamId;
    const scored = isHome ? m.homeScore || 0 : m.awayScore || 0;
    const allowed = isHome ? m.awayScore || 0 : m.homeScore || 0;
    pf += scored;
    pa += allowed;
    if (scored > allowed) wins++;
    else if (scored < allowed) losses++;
    else ties++;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090E] text-white flex flex-col justify-center items-center font-sans">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!loading && (!team || !isRealTeam(team))) {
    return (
      <div className="min-h-screen bg-[#07090E] text-white flex flex-col justify-center items-center font-sans p-6 text-center">
        <h2 className="text-3xl font-black mb-4">Team Not Found</h2>
        <p className="text-neutral-400 mb-6 max-w-md">
          The requested franchise does not exist. Free agents are an unassigned draft pool, not a franchise.
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

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200 relative flex flex-col">

      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[35rem] h-[35rem] bg-cyan-600 rounded-full mix-blend-screen filter blur-[150px] opacity-15"></div>
      </div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10 flex-1 w-full p-6 md:p-12">
        {/* Navigation */}
        <Link
          href={`/teams/${teamId}`}
          className="inline-flex items-center text-neutral-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md text-sm font-semibold"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to {teamName} Portal
        </Link>

        {/* Header & Add Player Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-cyan-400">
                <Users className="w-4 h-4" />
                <span>Official Roster</span>
              </div>
              <span className="text-white/20">•</span>
              <span className="text-xs font-mono font-bold text-neutral-400">
                {`${players.length}/${maxRosterSize} Players (Min: ${minRosterSize})`}
              </span>
              {isRosterUnderMin ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  ⚠️ Needs {minRosterSize - players.length} more to meet min ({minRosterSize})
                </span>
              ) : isRosterFull ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  🔒 At Maximum Capacity ({maxRosterSize})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  ✓ Compliant
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">
              {teamName} <span className="text-neutral-500 font-normal">Team</span>
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              Active players, jersey numbers, and individual performance stats.
            </p>
          </div>

          {/* Add Player (Team Admin & League Admin) */}
          {hasEditAccess && (
            <button
              onClick={() => {
                if (isRosterFull) {
                  alert(`Cannot add player: Maximum roster capacity (${maxRosterSize} players) reached under league rules.`);
                  return;
                }
                setIsAddModalOpen(true);
              }}
              disabled={isRosterFull}
              title={isRosterFull ? `Roster at max capacity (${maxRosterSize} players)` : "Add Player"}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all self-start md:self-auto ${
                isRosterFull
                  ? "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/5 opacity-60"
                  : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)] hover:-translate-y-0.5"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>{isRosterFull ? `Roster Full (${maxRosterSize})` : "Add Player"}</span>
            </button>
          )}
        </div>

        {/* Team Overview Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
            <span className="text-xs uppercase font-bold text-neutral-500 tracking-wider">Record</span>
            <div className="text-2xl font-black text-white mt-1">
              {wins}-{losses}{ties > 0 ? `-${ties}` : ""}
            </div>
          </div>
          <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
            <span className="text-xs uppercase font-bold text-neutral-500 tracking-wider">Games Played</span>
            <div className="text-2xl font-black text-white mt-1">{teamMatches.length}</div>
          </div>
          <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
            <span className="text-xs uppercase font-bold text-neutral-500 tracking-wider">Points Scored</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">{pf}</div>
          </div>
          <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
            <span className="text-xs uppercase font-bold text-neutral-500 tracking-wider">Points Allowed</span>
            <div className="text-2xl font-black text-red-400 mt-1">{pa}</div>
          </div>
        </div>

        {/* Players List Table */}
        <div className="bg-neutral-900/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl">
          <div className="bg-neutral-900 px-6 py-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <User className="w-5 h-5 text-neutral-400" />
              <h3 className="font-bold text-lg text-white">
                {activeTab === "roster"
                  ? `Roster (${players.length}/${maxRosterSize} Max • Min: ${minRosterSize})`
                  : `${teamName} Official Depth Chart`}
              </h3>
            </div>

            {/* View Switcher: Roster Table vs Depth Chart */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 text-xs font-bold self-start sm:self-auto">
              <button
                onClick={() => setActiveTab("roster")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === "roster"
                    ? "bg-cyan-500 text-black font-black shadow-md"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Roster Table
              </button>
              <button
                onClick={() => setActiveTab("depth_chart")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === "depth_chart"
                    ? "bg-emerald-500 text-black font-black shadow-md"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Depth Chart
              </button>
              <button
                type="button"
                onClick={() => setShowStats(!showStats)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  showStats
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
                title={showStats ? "Hide player stats" : "Show player stats"}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>{showStats ? "Hide Stats" : "Show Stats"}</span>
              </button>
            </div>
          </div>

          {activeTab === "roster" ? (
            <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-black/50 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6 w-16">#</th>
                  <th className="py-4 px-6">Player Name</th>
                  <th className="py-4 px-6">Position</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  {showStats && (
                    <>
                      <th className="py-4 px-6 text-center">GP</th>
                      <th className="py-4 px-6 text-center">Pass TD</th>
                      <th className="py-4 px-6 text-center">Rec TD</th>
                      <th className="py-4 px-6 text-center">Flags</th>
                      <th className="py-4 px-6 text-center">INT</th>
                    </>
                  )}
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {players.map((p) => {
                  const s = playerStats[p.playerName] || { gamesPlayed: 0, passTD: 0, recTD: 0, flagPulls: 0, int: 0 };
                  const jerseyNumber = p.number || p.jerseyNumber || "-";
                  const positions = Array.isArray(p.positions) && p.positions.length > 0
                    ? p.positions
                    : p.position ? [p.position] : ["ATH"];

                  return (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                      {/* Jersey Number */}
                      <td className="py-4 px-6 font-mono text-sm font-bold text-neutral-400">
                        {jerseyNumber !== "-" ? `#${jerseyNumber}` : "-"}
                      </td>

                      {/* Player Name (Click to pull up stats modal) */}
                      <td className="py-4 px-6">
                        <button
                          type="button"
                          onClick={() => setSelectedPlayerForStats(p)}
                          className="font-bold text-base text-white hover:text-cyan-400 transition-colors flex items-center gap-2 text-left cursor-pointer group/player"
                          title={`Click to view stats for ${p.playerName}`}
                        >
                          <span className="group-hover/player:underline underline-offset-4 decoration-cyan-400/60">{p.playerName}</span>
                          <span className="text-[10px] text-cyan-400/80 group-hover/player:text-cyan-300 flex items-center gap-1 font-mono font-normal">
                            <Activity className="w-3 h-3" />
                            <span>Stats</span>
                          </span>
                        </button>
                        {isTeamOrLeagueAdmin && ((p.emails && p.emails.length > 0) || p.email) && (
                          <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span className="truncate max-w-[240px]">
                              {p.emails ? p.emails.join(", ") : p.email}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Position */}
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1">
                          {positions.map((pos: string) => (
                            <span
                              key={pos}
                              className="px-2 py-0.5 rounded bg-white/10 text-neutral-300 font-mono text-[10px] font-bold"
                            >
                              {pos}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 text-center">
                        <span
                          className="px-2.5 py-1 rounded-full font-mono text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        >
                          Active
                        </span>
                      </td>

                      {/* Stats columns - only rendered if user toggles showStats */}
                      {showStats && (
                        <>
                          <td className="py-4 px-6 text-center text-sm font-medium text-neutral-300">
                            {s.gamesPlayed}
                          </td>
                          <td className="py-4 px-6 text-center text-sm font-bold text-emerald-400">
                            {s.passTD}
                          </td>
                          <td className="py-4 px-6 text-center text-sm font-bold text-blue-400">
                            {s.recTD}
                          </td>
                          <td className="py-4 px-6 text-center text-sm font-bold text-amber-400">
                            {s.flagPulls}
                          </td>
                          <td className="py-4 px-6 text-center text-sm font-bold text-purple-400">
                            {s.int}
                          </td>
                        </>
                      )}

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* View Stats Button */}
                          <button
                            onClick={() => setSelectedPlayerForStats(p)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                            title="View Player Stats"
                          >
                            <Activity className="w-4 h-4" />
                          </button>

                          {/* Team Admin / League Admin Edit & Remove Controls */}
                          {hasEditAccess && (
                            <>
                              <button
                                onClick={() => handleOpenEditPlayer(p)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-blue-500/20 text-neutral-400 hover:text-blue-400 transition-colors"
                                title="Edit Player Details"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {canDeletePlayer && (
                                <button
                                  onClick={() => handleDeletePlayer(p.id, p.playerName)}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors"
                                  title="Remove Player from Team"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {players.length === 0 && (
                  <tr>
                    <td colSpan={showStats ? 10 : 5} className="py-12 text-center text-neutral-500 italic text-sm">
                      No players found on this roster yet. Use the "Add Player" button above to add team members.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : null}
        <div hidden={activeTab !== "depth_chart"}>
          <TeamDepthCharts teamId={teamId} players={players} canManage={!!canManageTeam(teamId)} signedIn={!!user}
            isDemo={isDemoLeague && !isYorkTeam(teamId)} showStats={showStats} playerStats={playerStats} onFormations={setDepthFormations} />
        </div>
      </div>
      </div>

      {/* Add Player Modal (Team Admin & League Admin) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-6 right-6 text-neutral-400 hover:text-white p-2 rounded-full hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Add Player to Roster</h2>
                <p className="text-xs text-neutral-400">Add player details for {teamName}.</p>
              </div>
            </div>

            <form onSubmit={handleAddPlayer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Player Name *
                </label>
                <input
                  type="text"
                  required
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-400"
                  placeholder="e.g. Maya Jenkinson"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Jersey Number
                </label>
                <input
                  type="text"
                  value={newPlayerNumber}
                  onChange={(e) => setNewPlayerNumber(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-400"
                  placeholder="e.g. 7"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5 flex items-center justify-between">
                  <span>Attached Player Email(s)</span>
                  <span className="text-[10px] text-neutral-500 font-mono">1 or more, comma-separated</span>
                </label>
                <input
                  type="text"
                  value={newPlayerEmails}
                  onChange={(e) => setNewPlayerEmails(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-cyan-400 font-mono"
                  placeholder="athlete@domain.com, backup@email.com"
                />
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  When logging in with this email, the user logs in as this player with profile stats and view-only playbook access.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Positions (select all that apply)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {positionOptions.map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      aria-pressed={newPlayerPositions.includes(pos)}
                      disabled={!newPlayerPositions.includes(pos) && newPlayerPositions.length >= 10}
                      onClick={() => setNewPlayerPositions((current) => current.includes(pos) ? (current.length > 1 ? current.filter((item) => item !== pos) : current) : current.length < 10 ? [...current, pos] : current)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        newPlayerPositions.includes(pos)
                          ? "bg-cyan-500 text-black border-cyan-400 font-black"
                          : "bg-black/60 text-neutral-400 border-white/10 hover:text-white"
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingPlayer}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)] disabled:opacity-50"
                >
                  {addingPlayer ? "Adding..." : "Add Player"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Player Modal (Team Admin & League Admin) */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative">
            <button
              onClick={() => setEditingPlayer(null)}
              className="absolute top-6 right-6 text-neutral-400 hover:text-white p-2 rounded-full hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                <Edit2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Edit Player Details</h2>
                <p className="text-xs text-neutral-400">Update player name, jersey number, linked emails, and QB status.</p>
              </div>
            </div>

            <form onSubmit={handleSavePlayer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Player Name *
                </label>
                <input
                  type="text"
                  required
                  value={editPlayerName}
                  onChange={(e) => setEditPlayerName(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Jersey Number
                </label>
                <input
                  type="text"
                  value={editPlayerNumber}
                  onChange={(e) => setEditPlayerNumber(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5 flex items-center justify-between">
                  <span>Attached Player Email(s)</span>
                  <span className="text-[10px] text-neutral-500 font-mono">1 or more, comma-separated</span>
                </label>
                <input
                  type="text"
                  value={editPlayerEmails}
                  onChange={(e) => setEditPlayerEmails(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-blue-500 font-mono"
                  placeholder="athlete@domain.com, backup@email.com"
                />
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  When logging in with this email, the user logs in as this player with profile stats and view-only playbook access.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Positions (select all that apply)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[...new Set([...positionOptions, ...editPlayerPositions])].map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      aria-pressed={editPlayerPositions.includes(pos)}
                      disabled={!editPlayerPositions.includes(pos) && editPlayerPositions.length >= 10}
                      onClick={() => setEditPlayerPositions((current) => current.includes(pos) ? (current.length > 1 ? current.filter((item) => item !== pos) : current) : current.length < 10 ? [...current, pos] : current)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        editPlayerPositions.includes(pos)
                          ? "bg-blue-600 text-white border-blue-500 font-black"
                          : "bg-black/60 text-neutral-400 border-white/10 hover:text-white"
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlayer}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {savingPlayer ? "Saving..." : "Save Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Individual Player Stats Modal */}
      {selectedPlayerForStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative">
            <button
              onClick={() => setSelectedPlayerForStats(null)}
              className="absolute top-6 right-6 text-neutral-400 hover:text-white p-2 rounded-full hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-black text-xl">
                {selectedPlayerForStats.number ? `#${selectedPlayerForStats.number}` : <User className="w-6 h-6" />}
              </div>
              <div>
                <h2 className="text-2xl font-black">{selectedPlayerForStats.playerName}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs text-neutral-400">{teamName}</span>
                  {(selectedPlayerForStats.position || (selectedPlayerForStats.positions && selectedPlayerForStats.positions[0])) && (
                    <span className="px-2 py-0.5 rounded bg-white/10 text-neutral-300 font-mono text-[10px] font-bold">
                      {selectedPlayerForStats.position || selectedPlayerForStats.positions[0]}
                    </span>
                  )}
                  {isTeamOrLeagueAdmin && ((selectedPlayerForStats.emails && selectedPlayerForStats.emails.length > 0) || selectedPlayerForStats.email) && (
                    <span className="text-[11px] text-cyan-300 font-mono flex items-center gap-1">
                      • <Mail className="w-3 h-3 text-cyan-400" />
                      <span>{selectedPlayerForStats.emails ? selectedPlayerForStats.emails.join(", ") : selectedPlayerForStats.email}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Breakdown */}
            {(() => {
              const s = playerStats[selectedPlayerForStats.playerName] || {};
              return (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-neutral-950 p-3.5 rounded-xl border border-white/5">
                    <span className="text-xs text-neutral-500 block">Games Played</span>
                    <span className="text-xl font-black text-white">{s.gamesPlayed || 0}</span>
                  </div>
                  <div className="bg-neutral-950 p-3.5 rounded-xl border border-white/5">
                    <span className="text-xs text-neutral-500 block">Total Touchdowns</span>
                    <span className="text-xl font-black text-yellow-400">{s.totalTDs || 0}</span>
                  </div>
                  <div className="bg-neutral-950 p-3.5 rounded-xl border border-white/5">
                    <span className="text-xs text-neutral-500 block">Passing (Comp/Att)</span>
                    <span className="text-xl font-black text-blue-400">{s.passComp || 0} / {s.passAtt || 0}</span>
                  </div>
                  <div className="bg-neutral-950 p-3.5 rounded-xl border border-white/5">
                    <span className="text-xs text-neutral-500 block">Passing TDs</span>
                    <span className="text-xl font-black text-emerald-400">{s.passTD || 0}</span>
                  </div>
                  <div className="bg-neutral-950 p-3.5 rounded-xl border border-white/5">
                    <span className="text-xs text-neutral-500 block">Receptions / TDs</span>
                    <span className="text-xl font-black text-blue-400">{s.receptions || 0} / {s.recTD || 0} TD</span>
                  </div>
                  <div className="bg-neutral-950 p-3.5 rounded-xl border border-white/5">
                    <span className="text-xs text-neutral-500 block">Flags / Sacks</span>
                    <span className="text-xl font-black text-amber-400">{s.flagPulls || 0} / {s.sacks || 0}</span>
                  </div>
                  <div className="bg-neutral-950 p-3.5 rounded-xl border border-white/5 col-span-2">
                    <span className="text-xs text-neutral-500 block">Interceptions / Pass Breakups</span>
                    <span className="text-xl font-black text-purple-400">{s.int || 0} INT / {s.pbu || 0} PBU</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}
