"use client";
import FlagOSLoader from "@/components/FlagOSLoader";

import { effectiveMaxRoster } from "@/lib/rosterLimits";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";

import { use, useEffect, useState, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
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
import { doc, getDoc } from "firebase/firestore";
import { loadTeamPlayers } from "@/lib/matchRoster";
import { getCachedLeagueMatches, getCachedLeaguePlays } from "@/lib/leagueDataCache";
import { useAuth } from "@/lib/authContext";
import { TeamLogo, getTeamShortcode, isRealTeam } from "@/components/TeamAssets";
import { useLeague } from "@/lib/leagueContext";
import { useLeagueArchived, isTeamSeasonArchived } from "@/lib/useLeagueArchived";
import { useDemoSandbox } from "@/lib/useDemoSandbox";
import DemoLoadError from "@/components/DemoLoadError";
import { loadTeamSeasonData } from "@/lib/teamSeasonData";
import { isPrimaryTeamAdmin, isDexterUser } from "@/lib/teamAdminRbac";
import { loadTeamSeasonSummary, buildRosterPlayerStats, TeamSeasonSummaryError } from "@/lib/teamSeasonSummary";
import type { TeamComprehensiveStats } from "@/lib/teamStatsCalculator";
import { getFormationPositions, getPlayerPositions, keepDepthChartPositions, type DepthFormation } from "@/lib/depthChart";
import { resolveTeamColorPalette, getReadableTextColor } from "@/lib/teamColors";
import { useTeamColors } from "@/lib/teamColorContext";
import TeamNavBar from "@/components/team/TeamNavBar";
import TeamPortalFooter from "@/components/team/TeamPortalFooter";
import { usePageGuide } from "@/lib/pageGuide";
import { TEAM_ROSTER_WALKTHROUGH, TEAM_ADD_PLAYER_WALKTHROUGH, TEAM_EDIT_PLAYER_WALKTHROUGH, TEAM_PLAYER_STATS_WALKTHROUGH } from "@/lib/walkthroughData";

const TeamDepthCharts = dynamic(() => import("@/components/TeamDepthCharts"), {
  loading: () => <p role="status">Loading depth charts...</p>,
});

function compareByJersey(a: any, b: any): number {
  const numA = parseInt(String(a.number ?? a.jerseyNumber ?? ""), 10);
  const numB = parseInt(String(b.number ?? b.jerseyNumber ?? ""), 10);
  const hasA = Number.isFinite(numA);
  const hasB = Number.isFinite(numB);
  if (hasA && hasB && numA !== numB) return numA - numB;
  if (hasA !== hasB) return hasA ? -1 : 1;
  return String(a.playerName || "").localeCompare(String(b.playerName || ""));
}

export default function TeamRosterPage({ params }: { params: Promise<{ id: string }> }) {
  usePageGuide(TEAM_ROSTER_WALKTHROUGH);
  const unwrappedParams = use(params);
  const teamId = unwrappedParams.id;

  const { canManageTeam, isLeagueAdmin, isTeamAdmin, user } = useAuth();
  const { settings, isDemoLeague } = useLeague();
  const { sandbox, error: demoError, retry: retryDemo } = useDemoSandbox(isDemoLeague);
  const { palette: contextPalette } = useTeamColors();
  const [team, setTeam] = useState<any>(null);
  const palette = resolveTeamColorPalette(team || contextPalette);
  const [players, setPlayers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [seasonTeamStats, setSeasonTeamStats] = useState<TeamComprehensiveStats | null>(null);
  const [playerStats, setPlayerStats] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [privateRosterReady, setPrivateRosterReady] = useState(false);
  const requestVersion = useRef(0);
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
  usePageGuide(isAddModalOpen ? TEAM_ADD_PLAYER_WALKTHROUGH : null, 2);
  usePageGuide(editingPlayer ? TEAM_EDIT_PLAYER_WALKTHROUGH : null, 2);
  usePageGuide(selectedPlayerForStats ? TEAM_PLAYER_STATS_WALKTHROUGH : null, 2);
  const isTeamOrLeagueAdmin = isLeagueAdmin || canManageTeam(teamId) || (typeof isTeamAdmin === "function" && isTeamAdmin(teamId));

  const fetchData = async () => {
    const version = ++requestVersion.current;
    try {
      let tObj: any = null;
      let pList: any[] = [];
      let mList: any[] = [];
      let playList: any[] = [];

      if (isDemoLeague) {
        if (!sandbox) return;
        setPrivateRosterReady(true);
        const { getSandboxTeams, getSandboxPlayers, getSandboxMatches, getSandboxPlays } = sandbox;
        tObj = getSandboxTeams().find((t) => t.id === teamId || (teamId === "team_apex" && t.id === "team_kc"));
        const effectiveTeamId = tObj?.id || teamId;
        pList = getSandboxPlayers().filter((p) => p.teamId === effectiveTeamId);
        mList = getSandboxMatches();
        playList = getSandboxPlays();
      } else {
        const teamSnap = await getDoc(doc(db, "teams", teamId));
        if (teamSnap.exists()) tObj = { ...teamSnap.data(), id: teamSnap.id };
        const leagueId = typeof tObj?.leagueId === "string" ? tObj.leagueId : "";
        pList = await loadTeamPlayers(teamId, leagueId);
        if (version !== requestVersion.current) return;
        setTeam(tObj && isRealTeam(tObj) ? tObj : null);
        setPlayers([...pList].sort(compareByJersey));
        setLoading(false);
        if (isTeamOrLeagueAdmin) {
          requestPrivateData<{
            team: Record<string, unknown>;
            players: Record<string, { email?: string; emails?: string[] }>;
          }>("team", { teamId }).then((privateData) => {
            if (version !== requestVersion.current) return;
            setTeam((current: Record<string, unknown>) => ({ ...current, ...privateData.team }));
            setPlayers((current) => current.map((player) => ({ ...player, ...(privateData.players[player.id] || {}) })));
            setPrivateRosterReady(true);
          }).catch((error: unknown) => {
            console.error("Unable to load private roster settings:", error);
            if (version === requestVersion.current) setLoadError("Coach roster settings could not be loaded. Refresh before editing.");
          });
        }
        setStatsLoading(true);
        try {
          const summary = await loadTeamSeasonSummary(teamId);
          if (version !== requestVersion.current) return;
          setSeasonTeamStats(summary.teamStats);
          setPlayerStats(buildRosterPlayerStats(summary, pList.map((player) => player.playerName)));
          setStatsLoading(false);
          return;
        } catch (error) {
          if (!(error instanceof TeamSeasonSummaryError) || error.status !== 404) throw error;
        }
        if (!leagueId) {
          const season = await loadTeamSeasonData(teamId);
          mList = season.matches;
          playList = season.plays;
        } else {
          const [rawMatches, rawPlays] = await Promise.all([
            getCachedLeagueMatches(leagueId),
            getCachedLeaguePlays(leagueId),
          ]);
          mList = rawMatches.filter((m) => !m.isHidden && (!m.leagueId || m.leagueId === leagueId));
          playList = rawPlays;
        }
      }

      if (version !== requestVersion.current) return;
      if (tObj && isRealTeam(tObj)) {
        setTeam(tObj);
      } else {
        setTeam(null);
      }
      pList.sort(compareByJersey);
      setPlayers(pList);
      setMatches(mList);

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
      if (version === requestVersion.current) setLoadError("The roster could not be loaded. Refresh to retry.");
    }
    if (version !== requestVersion.current) return;
    setLoading(false);
    setStatsLoading(false);
  };

  useEffect(() => {
    if (!selectedPlayerForStats && !isAddModalOpen && !editingPlayer) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedPlayerForStats(null);
        setIsAddModalOpen(false);
        setEditingPlayer(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPlayerForStats, isAddModalOpen, editingPlayer]);

  useEffect(() => {
    setPrivateRosterReady(false);
    setSeasonTeamStats(null);
    setLoadError("");
    fetchData();
    let unsubscribe: (() => void) | undefined;
    if (isDemoLeague && sandbox) {
      unsubscribe = sandbox.subscribeDemoSandbox(() => fetchData());
    }
    return () => { requestVersion.current++; unsubscribe?.(); };
  }, [teamId, isDemoLeague, isTeamOrLeagueAdmin, sandbox]);

  const minRosterSize = settings.rules?.minRosterSize || 5;
  const maxRosterSize = effectiveMaxRoster(settings.rules);
  const isRosterFull = players.length >= maxRosterSize;
  const isRosterUnderMin = players.length < minRosterSize;

  // Handler: Add Player
  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    if (players.length >= maxRosterSize) {
      alert(`Cannot add player: this team is at the league's roster limit of ${maxRosterSize} players.`);
      return;
    }

    setAddingPlayer(true);
    try {
      const parsedEmails = newPlayerEmails
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      if (isDemoLeague) {
        if (!sandbox) throw new Error("The demo is not loaded.");
        const newPlayerObj = sandbox.addSandboxPlayer({
          playerName: newPlayerName.trim(),
          teamId: teamId,
          number: newPlayerNumber.trim(),
          position: newPlayerPositions[0],
          positions: newPlayerPositions,
          experience: newPlayerExperience.trim(),
          email: parsedEmails[0] || "",
        });
        setPlayers((prev) => [...prev.filter((p) => p.id !== newPlayerObj.id), newPlayerObj].sort(compareByJersey));
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

      setPlayers((prev) => [...prev.filter((p) => p.id !== newPlayerObj.id), newPlayerObj].sort(compareByJersey));
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
    if (!privateRosterReady) {
      setLoadError("Coach roster settings must finish loading before players can be edited.");
      return;
    }
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
        depthChartPositions: keepDepthChartPositions(editingPlayer.depthChartPositions, editPlayerPositions),
        emails: parsedEmails,
        email: parsedEmails[0] || "",
      };

      if (isDemoLeague) {
        if (!sandbox) throw new Error("The demo is not loaded.");
        sandbox.updateSandboxPlayer(editingPlayer.id, updatedFields);
        setPlayers((prev) =>
          prev.map((p) => (p.id === editingPlayer.id ? { ...p, ...updatedFields } : p))
        );
        setEditingPlayer(null);
        setSavingPlayer(false);
        return;
      }

      const { depthChartPositions: _autoPositions, ...serverFields } = updatedFields;
      await createSecureRecord("player_update", {
        playerId: editingPlayer.id,
        ...serverFields,
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
  // Mirrors the server: the head coach, a league admin, or anyone managing the demo sandbox.
  const canDeletePlayer = isPrimaryTeamAdmin(user?.email, team, isDexter) || isLeagueAdmin || (isDemoLeague && isTeamOrLeagueAdmin);

  // Handler: Delete Player
  const handleDeletePlayer = async (playerId: string, playerName: string) => {
    if (!canDeletePlayer) {
      alert("Permission Denied: Only the primary team admin (head coach) can delete players from the roster.");
      return;
    }
    if (!confirm(`Are you sure you want to remove "${playerName}" from the roster?`)) return;

    try {
      if (isDemoLeague) {
        if (!sandbox) throw new Error("The demo is not loaded.");
        sandbox.deleteSandboxPlayer(playerId);
        setPlayers((prev) => prev.filter((p) => p.id !== playerId));
        if (editingPlayer?.id === playerId) setEditingPlayer(null);
        if (selectedPlayerForStats?.id === playerId) {
          setSelectedPlayerForStats(null);
        }
        return;
      }
      await createSecureRecord("delete_player", { playerId });
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
      if (editingPlayer?.id === playerId) setEditingPlayer(null);
      if (selectedPlayerForStats?.id === playerId) {
        setSelectedPlayerForStats(null);
      }
    } catch (e) {
      console.error("Error deleting player:", e);
      alert("Failed to delete player.");
    }
  };

  const isTeamLeagueArchived = useLeagueArchived(team?.leagueId) || isTeamSeasonArchived(team);
  const hasEditAccess = isTeamOrLeagueAdmin && !isTeamLeagueArchived;
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
  if (seasonTeamStats) {
    ({ wins, losses, ties, pf, pa } = seasonTeamStats);
  }

  if (demoError) return <DemoLoadError retry={retryDemo} />;
  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090E] text-white flex flex-col justify-center items-center font-sans">
        <FlagOSLoader />
      </div>
    );
  }

  if (!loading && (!team || !isRealTeam(team))) {
    return (
      <div className="min-h-screen bg-[#07090E] text-white flex flex-col justify-center items-center font-sans p-6 text-center">
        <h2 className="text-3xl font-black mb-4">Team Not Found</h2>
        <p className="text-neutral-400 mb-6 max-w-md">
          This team could not be found. It may have been removed.
        </p>
        <Link
          href="/teams"
          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500  font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)]"
          style={{ backgroundColor: palette.primary, color: getReadableTextColor(palette.primary, "#FFFFFF") }}
        >
          Back to Teams
        </Link>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 selection:text-[var(--team-ink)] relative flex flex-col">

      {/* Dynamic Background styled to team colors */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-15">
        <div 
          className="absolute -top-40 -left-40 w-[35rem] h-[35rem] rounded-full mix-blend-screen filter blur-[140px] opacity-25 animate-pulse"
          style={{ backgroundColor: palette.primary }}
        />
        <div 
          className="absolute top-40 -right-40 w-[35rem] h-[35rem] rounded-full mix-blend-screen filter blur-[140px] opacity-20 animate-pulse delay-1000"
          style={{ backgroundColor: palette.secondary !== "#FFFFFF" ? palette.secondary : palette.primary }}
        />
      </div>
      <TeamNavBar teamId={teamId} />

      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 relative z-10 flex-1 w-full px-4 py-6 sm:p-6 md:p-12">
        {loadError && <p role="alert" className="text-red-300">{loadError}</p>}
        {statsLoading && <p role="status" className="text-neutral-400">Loading season statistics...</p>}

        {/* Header & Add Player Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div 
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--team-ink)" }}
              >
                <Users className="w-4 h-4" />
                <span>Roster</span>
              </div>
              <span className="text-white/20">•</span>
              <span className="text-xs font-mono font-bold text-neutral-400">
                {`${players.length}/${maxRosterSize} Players (Min: ${minRosterSize})`}
              </span>
              {isRosterUnderMin ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Needs {minRosterSize - players.length} more players
                </span>
              ) : isRosterFull ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  Roster full
                </span>
              ) : null}
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight">
              {teamName} <span className="text-neutral-500 font-normal">Team</span>
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              Active players, jersey numbers, and individual performance stats.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
            {/* Add Player (Team Admin & League Admin) */}
            {hasEditAccess && (
              <button
                data-tour="add-player-btn"
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
                    : "hover:opacity-90 shadow-lg hover:-translate-y-0.5"
                }`}
                style={
                  !isRosterFull
                    ? {
                        backgroundColor: palette.primary,
                        color: getReadableTextColor(palette.primary, "#FFFFFF"),
                      }
                    : undefined
                }
              >
                <UserPlus className="w-4 h-4" />
                <span>{isRosterFull ? `Roster Full (${maxRosterSize})` : "Add Player"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Players List Table */}
        <div className="bg-neutral-900/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl">
          <div className="bg-neutral-900 px-4 sm:px-6 py-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <User className="w-5 h-5 text-neutral-400" />
              <h3 className="font-bold text-base sm:text-lg text-white">
                {activeTab === "roster"
                  ? `Roster (${players.length}/${maxRosterSize})`
                  : `${teamName} Official Depth Chart`}
              </h3>
            </div>

            {/* View Switcher: Roster Table vs Depth Chart */}
            <div data-tour="roster-tabs" className="flex flex-wrap items-center gap-1 sm:gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 text-xs font-bold self-start sm:self-auto max-w-full [&_button]:min-h-10">
              <button
                onClick={() => setActiveTab("roster")}
                className={`min-h-10 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "roster"
                    ? "font-black shadow-md"
                    : "text-neutral-400 hover:text-white"
                }`}
                style={
                  activeTab === "roster"
                    ? {
                        backgroundColor: palette.primary,
                        color: getReadableTextColor(palette.primary, "#000000"),
                      }
                    : undefined
                }
              >
                Roster Table
              </button>
              <button
                onClick={() => setActiveTab("depth_chart")}
                className={`min-h-10 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "depth_chart"
                    ? "font-black shadow-md"
                    : "text-neutral-400 hover:text-white"
                }`}
                style={
                  activeTab === "depth_chart"
                    ? {
                        backgroundColor: palette.secondary !== "#FFFFFF" ? palette.secondary : palette.tertiary,
                        color: getReadableTextColor(palette.secondary !== "#FFFFFF" ? palette.secondary : palette.tertiary, "#000000"),
                      }
                    : undefined
                }
              >
                Depth Chart
              </button>
            </div>
          </div>

          {activeTab === "roster" ? (
            <div data-tour="roster-list-table" className="overflow-x-auto">
            {showStats && <p className="sm:hidden px-3 py-2 text-xs text-neutral-400">Swipe across to see all player statistics.</p>}
            <table className={`w-full text-left border-collapse ${showStats ? "min-w-[700px]" : ""}`}>
              <thead>
                <tr className="bg-black/50 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3 sm:py-4 sm:px-6 w-16">#</th>
                  <th className="py-3 px-3 sm:py-4 sm:px-6">Player Name</th>
                  <th className="hidden sm:table-cell py-3 px-3 sm:py-4 sm:px-6">Position</th>
                  <th className="hidden sm:table-cell py-3 px-3 sm:py-4 sm:px-6 text-center">Status</th>
                  {showStats && (
                    <>
                      <th className="py-3 px-3 sm:py-4 sm:px-6 text-center">GP</th>
                      <th className="py-3 px-3 sm:py-4 sm:px-6 text-center">Pass TD</th>
                      <th className="py-3 px-3 sm:py-4 sm:px-6 text-center">Rec TD</th>
                      <th className="py-3 px-3 sm:py-4 sm:px-6 text-center">Flags</th>
                      <th className="py-3 px-3 sm:py-4 sm:px-6 text-center">INT</th>
                    </>
                  )}
                  <th className="py-3 px-3 sm:py-4 sm:px-6 text-right">Actions</th>
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
                      <td className="py-3 px-3 sm:py-4 sm:px-6 font-mono text-sm font-bold text-neutral-400">
                        {jerseyNumber !== "-" ? `#${jerseyNumber}` : "-"}
                      </td>

                      {/* Player Name (Click to pull up stats modal) */}
                      <td className="py-3 px-3 sm:py-4 sm:px-6">
                        <button
                          type="button"
                          onClick={() => setSelectedPlayerForStats(p)}
                          className="min-h-10 font-bold text-base text-white hover:text-[var(--team-ink)] transition-colors flex items-center gap-2 text-left cursor-pointer group/player"
                          title={`Click to view stats for ${p.playerName}`}
                        >
                          <span className="group-hover/player:underline underline-offset-4 decoration-cyan-400/60 break-words">{p.playerName}</span>
                          <span className="hidden sm:flex text-[10px] text-[var(--team-ink)] group-hover/player:text-[var(--team-ink)] items-center gap-1 font-mono font-normal">
                            <Activity className="w-3 h-3" />
                            <span>Stats</span>
                          </span>
                        </button>
                        <div className="sm:hidden flex flex-wrap gap-1 mt-1 text-[10px] font-mono text-neutral-400">
                          {positions.map((pos: string) => <span key={pos}>{pos}</span>)}
                        </div>
                        {isTeamOrLeagueAdmin && ((p.emails && p.emails.length > 0) || p.email) && (
                          <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3 text-[var(--team-ink)] shrink-0" />
                            <span className="truncate max-w-[120px] sm:max-w-[240px]">
                              {p.emails ? p.emails.join(", ") : p.email}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Position */}
                      <td className="hidden sm:table-cell py-3 px-3 sm:py-4 sm:px-6">
                        <div className="flex flex-wrap gap-1 min-w-[72px]">
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
                      <td className="hidden sm:table-cell py-3 px-3 sm:py-4 sm:px-6 text-center">
                        <span
                          className="px-2.5 py-1 rounded-full font-mono text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap"
                        >
                          Active
                        </span>
                      </td>

                      {/* Stats columns - only rendered if user toggles showStats */}
                      {showStats && (
                        <>
                          <td className="py-3 px-3 sm:py-4 sm:px-6 text-center text-sm font-medium text-neutral-300">
                            {s.gamesPlayed}
                          </td>
                          <td className="py-3 px-3 sm:py-4 sm:px-6 text-center text-sm font-bold text-emerald-400">
                            {s.passTD}
                          </td>
                          <td className="py-3 px-3 sm:py-4 sm:px-6 text-center text-sm font-bold text-blue-400">
                            {s.recTD}
                          </td>
                          <td className="py-3 px-3 sm:py-4 sm:px-6 text-center text-sm font-bold text-amber-400">
                            {s.flagPulls}
                          </td>
                          <td className="py-3 px-3 sm:py-4 sm:px-6 text-center text-sm font-bold text-purple-400">
                            {s.int}
                          </td>
                        </>
                      )}

                      {/* Actions */}
                      <td className="py-3 px-3 sm:py-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1 [&_button]:min-h-10 [&_button]:min-w-10">
                          {/* Team Admin / League Admin Edit & Remove Controls */}
                          {hasEditAccess && (
                            <>
                              <button
                                onClick={() => handleOpenEditPlayer(p)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-blue-500/20 text-neutral-400 hover:text-blue-400 transition-colors"
                                title="Edit Player Details"
                                aria-label={`Edit ${p.playerName}`}
                                disabled={!privateRosterReady}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {canDeletePlayer && (
                                <button
                                  onClick={() => handleDeletePlayer(p.id, p.playerName)}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors"
                                  title="Remove Player from Team"
                                  aria-label={`Remove ${p.playerName} from team`}
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
        <div data-tour="depth-chart-section" hidden={activeTab !== "depth_chart"}>
          <TeamDepthCharts teamId={teamId} players={players} canManage={!!canManageTeam(teamId)} signedIn={!!user}
            isDemo={isDemoLeague} showStats={showStats} playerStats={playerStats} onFormations={setDepthFormations}
            onPlayerPositions={(changes) => {
              if (isDemoLeague && sandbox) Object.entries(changes).forEach(([id, change]) => sandbox.updateSandboxPlayer(id, change));
              setPlayers((prev) => prev.map((p) => (changes[p.id] ? { ...p, ...changes[p.id] } : p)));
            }} />
        </div>
      </div>
      </div>
      <TeamPortalFooter section="Roster" />

      {/* Add Player Modal (Team Admin & League Admin) */}
      {isAddModalOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 top-[var(--role-switcher-height,0px)] z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl max-w-md w-full max-h-full overflow-y-auto p-6 md:p-8 shadow-2xl relative">
            <button
              aria-label="Close add player"
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-6 right-6 text-neutral-400 hover:text-white p-2 rounded-full hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-cyan-500/10 rounded-2xl text-[var(--team-ink)]">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <PageGuideButton className="mb-2" />
                <h2 className="text-xl font-black uppercase tracking-tight">Add Player to Roster</h2>
                <p className="text-xs text-neutral-400">Add player details for {teamName}.</p>
              </div>
            </div>

            <form data-tour="team-add-player-identity" onSubmit={handleAddPlayer} className="space-y-4">
              <div>
                <label htmlFor="add-player-name" className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Player Name *
                </label>
                <input
                  id="add-player-name"
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
                <label htmlFor="add-player-jersey" className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                  Jersey Number
                </label>
                <input
                  id="add-player-jersey"
                  type="text"
                  value={newPlayerNumber}
                  onChange={(e) => setNewPlayerNumber(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-400"
                  placeholder="e.g. 7"
                />
              </div>

              <div data-tour="team-add-player-access">
                <label htmlFor="add-player-emails" className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5 flex items-center justify-between">
                  <span>Player Emails</span>
                  <span className="text-[10px] text-neutral-400 normal-case tracking-normal">Optional · comma-separated</span>
                </label>
                <input
                  id="add-player-emails"
                  type="text"
                  value={newPlayerEmails}
                  onChange={(e) => setNewPlayerEmails(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-cyan-400 font-mono"
                  placeholder="athlete@domain.com, backup@email.com"
                />
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  Optional. Add the player's sign-in email to link their account to their stats and the team playbook. You can add it later.
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
                      className={`min-h-9 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        newPlayerPositions.includes(pos)
                          ? "bg-white/10 text-[var(--team-ink)] border-cyan-400 font-black"
                          : "bg-black/60 text-neutral-400 border-white/10 hover:text-white"
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <div data-tour="team-add-player-save" className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
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
                  className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500  text-xs font-bold transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)] disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: palette.primary, color: getReadableTextColor(palette.primary, "#FFFFFF") }}
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
        <div role="dialog" aria-modal="true" className="fixed inset-0 top-[var(--role-switcher-height,0px)] z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl max-w-md w-full max-h-full overflow-y-auto p-6 md:p-8 shadow-2xl relative">
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
                <PageGuideButton className="mb-2" />
                <h2 className="text-xl font-black uppercase tracking-tight">Edit Player Details</h2>
                <p className="text-xs text-neutral-400">Update player name, jersey number, linked emails, and QB status.</p>
              </div>
            </div>

            <form data-tour="team-edit-player-identity" onSubmit={handleSavePlayer} className="space-y-4">
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

              <div data-tour="team-edit-player-access">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5 flex items-center justify-between">
                  <span>Player Emails</span>
                  <span className="text-[10px] text-neutral-400 normal-case tracking-normal">Optional · comma-separated</span>
                </label>
                <input
                  type="text"
                  value={editPlayerEmails}
                  onChange={(e) => setEditPlayerEmails(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-blue-500 font-mono"
                  placeholder="athlete@domain.com, backup@email.com"
                />
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  Optional. Add the player's sign-in email to link their account to their stats and the team playbook. You can add it later.
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
                      className={`min-h-9 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
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

              <div data-tour="team-edit-player-remove" className="rounded-xl border border-white/10 bg-black/40 p-3 text-[11px] text-neutral-400 space-y-2">
                {canDeletePlayer ? (
                  <button
                    type="button"
                    onClick={() => handleDeletePlayer(editingPlayer.id, editingPlayer.playerName)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove from roster
                  </button>
                ) : null}
                <p>
                  {canDeletePlayer
                    ? "Removing a player deletes them from this team. Games they already played keep their recorded stats."
                    : "Only the head coach or a league admin can remove players. Ask them if this player has left the team."}
                </p>
              </div>

              <div data-tour="team-edit-player-save" className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
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
        <div role="dialog" aria-modal="true" aria-labelledby="player-stats-modal-title" className="fixed inset-0 top-[var(--role-switcher-height,0px)] z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setSelectedPlayerForStats(null)}
              aria-label="Close"
              className="absolute top-6 right-6 text-neutral-400 hover:text-white p-2 rounded-full hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-[var(--team-ink)] font-black text-xl">
                {selectedPlayerForStats.number ? `#${selectedPlayerForStats.number}` : <User className="w-6 h-6" />}
              </div>
              <div>
                <PageGuideButton className="mb-2" />
                <h2 id="player-stats-modal-title" className="text-2xl font-black">{selectedPlayerForStats.playerName}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs text-neutral-400">{teamName}</span>
                  {(selectedPlayerForStats.position || (selectedPlayerForStats.positions && selectedPlayerForStats.positions[0])) && (
                    <span className="px-2 py-0.5 rounded bg-white/10 text-neutral-300 font-mono text-[10px] font-bold">
                      {selectedPlayerForStats.position || selectedPlayerForStats.positions[0]}
                    </span>
                  )}
                  {isTeamOrLeagueAdmin && ((selectedPlayerForStats.emails && selectedPlayerForStats.emails.length > 0) || selectedPlayerForStats.email) && (
                    <span className="text-[11px] text-[var(--team-ink)] font-mono flex items-center gap-1">
                      • <Mail className="w-3 h-3 text-[var(--team-ink)]" />
                      <span>{selectedPlayerForStats.emails ? selectedPlayerForStats.emails.join(", ") : selectedPlayerForStats.email}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Breakdown: only categories the player has actually recorded appear. */}
            {(() => {
              const s = playerStats[selectedPlayerForStats.playerName] || {};
              const tiles: { label: string; value: React.ReactNode; color: string; span?: boolean }[] = [];
              const gp = s.gamesPlayed || 0;
              if (gp > 0) tiles.push({ label: "Games Played", value: gp, color: "text-white" });
              if ((s.totalTDs || 0) > 0) tiles.push({ label: "Total Touchdowns", value: s.totalTDs, color: "text-yellow-400" });
              if ((s.passAtt || 0) > 0) {
                const pct = Math.round(((s.passComp || 0) / s.passAtt) * 100);
                tiles.push({ label: "Passing", value: `${s.passComp || 0}/${s.passAtt} (${pct}%)`, color: "text-blue-400" });
              }
              if ((s.passTD || 0) > 0) tiles.push({ label: "Passing TDs", value: s.passTD, color: "text-emerald-400" });
              if ((s.passInt || 0) > 0) tiles.push({ label: "Interceptions Thrown", value: s.passInt, color: "text-red-400" });
              if ((s.receptions || 0) > 0) tiles.push({ label: "Receptions", value: s.receptions, color: "text-blue-400" });
              if ((s.recTD || 0) > 0) tiles.push({ label: "Receiving TDs", value: s.recTD, color: "text-emerald-400" });
              if ((s.rushAtt || 0) > 0) tiles.push({ label: "Rush Attempts", value: s.rushAtt, color: "text-amber-400" });
              if ((s.rushTD || 0) > 0) tiles.push({ label: "Rushing TDs", value: s.rushTD, color: "text-emerald-400" });
              if ((s.flagPulls || 0) > 0) tiles.push({ label: "Flag Pulls", value: s.flagPulls, color: "text-amber-400" });
              if ((s.sacks || 0) > 0) tiles.push({ label: "Sacks", value: s.sacks, color: "text-orange-400" });
              if ((s.int || 0) > 0) tiles.push({ label: "Interceptions", value: s.int, color: "text-purple-400" });
              if ((s.defTD || 0) > 0) tiles.push({ label: "Defensive TDs", value: s.defTD, color: "text-emerald-400" });
              if ((s.pbu || 0) > 0) tiles.push({ label: "Pass Breakups", value: s.pbu, color: "text-cyan-400" });

              if (tiles.length === 0) {
                return (
                  <p className="text-sm text-neutral-400 text-center py-6">
                    No stats recorded yet this season.
                  </p>
                );
              }
              return (
                <div data-tour="team-player-stats-totals" className="grid grid-cols-2 gap-3 text-sm">
                  {tiles.map((tile) => (
                    <div key={tile.label} className={`bg-neutral-950 p-3.5 rounded-xl border border-white/5 ${tile.span ? "col-span-2" : ""}`}>
                      <span className="text-xs text-neutral-500 block">{tile.label}</span>
                      <span className={`text-xl font-black ${tile.color}`}>{tile.value}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}
