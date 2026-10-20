"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  Shield,
  BookOpen,
  Trophy,
  Activity,
  Crosshair,
  Flame,
  Palette,
  Mail,
  ChevronRight,
  Crown,
  LogOut,
  Zap,
  Info,
  Calendar,
  Lock,
  Eye,
  Settings
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where, limit } from "firebase/firestore";
import { useAuth } from "@/lib/authContext";
import { useLeague } from "@/lib/leagueContext";
import { getTeamShortcode } from "@/components/TeamAssets";
import ThemeToggle from "@/components/ThemeToggle";

interface PlayerStats {
  gamesPlayed: number;
  totalTDs: number;
  passComp: number;
  passAtt: number;
  passTD: number;
  receptions: number;
  recTD: number;
  rushAtt: number;
  rushTD: number;
  flagPulls: number;
  sacks: number;
  int: number;
  pbu: number;
}

export default function PlayerProfilePage() {
  const {
    user,
    role,
    isPlayer,
    playerId: authPlayerId,
    playerTeamId: authTeamId,
    playerData: authPlayerData,
    logout,
    isLeagueAdmin,
    isTeamAdmin,
    setDevRole,
  } = useAuth();

  const {
    settings,
    openCustomizer,
    activeLeagueId,
  } = useLeague();

  const [activeTab, setActiveTab] = useState<"stats" | "settings" | "rules" | "account">("stats");
  const [loading, setLoading] = useState(true);

  // Profile data state
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(authPlayerId || "");
  const [selectedPlayer, setSelectedPlayer] = useState<any>(authPlayerData || null);
  const [playerTeam, setPlayerTeam] = useState<any>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    gamesPlayed: 0,
    totalTDs: 0,
    passComp: 0,
    passAtt: 0,
    passTD: 0,
    receptions: 0,
    recTD: 0,
    rushAtt: 0,
    rushTD: 0,
    flagPulls: 0,
    sacks: 0,
    int: 0,
    pbu: 0,
  });

  // Recent matches where player participated
  const [playerMatches, setPlayerMatches] = useState<any[]>([]);

  // List of all players across all teams (for admin/demo inspection switcher)
  const [allRosteredPlayers, setAllRosteredPlayers] = useState<any[]>([]);

  // Sync auth player if available
  useEffect(() => {
    if (authPlayerId && !selectedPlayerId) {
      setSelectedPlayerId(authPlayerId);
      setSelectedPlayer(authPlayerData);
    }
  }, [authPlayerId, authPlayerData, selectedPlayerId]);

  // Load all players, team, and stats
  useEffect(() => {
    const fetchProfileAndStats = async () => {
      setLoading(true);
      try {
        const [playersSnap, matchesSnap, playsSnap] = await Promise.all([
          getDocs(query(collection(db, "players"), where("leagueId", "==", activeLeagueId), limit(1920))),
          getDocs(query(
            collection(db, "matches"),
            where("leagueId", "==", activeLeagueId),
            where("isHidden", "!=", true),
            limit(512),
          )),
          getDocs(query(
            collection(db, "plays"),
            where("leagueId", "==", activeLeagueId),
            where("isHidden", "!=", true),
            limit(10_000),
          )),
        ]);

        const playersList = playersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setAllRosteredPlayers(playersList);

        // Determine which player to display
        let targetPlayer = selectedPlayer;
        if (!targetPlayer && selectedPlayerId) {
          targetPlayer = playersList.find((p) => p.id === selectedPlayerId);
        }
        if (!targetPlayer && authPlayerId) {
          targetPlayer = playersList.find((p) => p.id === authPlayerId);
        }
        // Fallback: if user is not a player yet, default to first rostered player for preview
        if (!targetPlayer && playersList.length > 0) {
          targetPlayer = playersList[0];
          setSelectedPlayerId(playersList[0].id);
        }

        setSelectedPlayer(targetPlayer);

        if (targetPlayer?.teamId) {
          const teamSnap = await getDoc(doc(db, "teams", targetPlayer.teamId));
          if (teamSnap.exists()) {
            setPlayerTeam({ id: teamSnap.id, ...(teamSnap.data() as any) });
          }
        }

        // Aggregate statistics for this player
        if (targetPlayer) {
          const pName = targetPlayer.playerName;
          const pTeamId = targetPlayer.teamId;

          const stats: PlayerStats = {
            gamesPlayed: 0,
            totalTDs: 0,
            passComp: 0,
            passAtt: 0,
            passTD: 0,
            receptions: 0,
            recTD: 0,
            rushAtt: 0,
            rushTD: 0,
            flagPulls: 0,
            sacks: 0,
            int: 0,
            pbu: 0,
          };

          const matches = matchesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          const plays = playsSnap.docs.map((d) => d.data() as any);

          // Games played & recent matches
          const playerRecentGames: any[] = [];
          matches.forEach((m) => {
            if ((m.status === "completed" || m.status === "Final") && (m.homeTeamId === pTeamId || m.awayTeamId === pTeamId)) {
              const dnp = m.didNotPlay || [];
              const playedInGame = !dnp.includes(pName);
              if (playedInGame) {
                stats.gamesPlayed += 1;
              }
              playerRecentGames.push({
                ...m,
                playedInGame,
              });
            }
          });
          setPlayerMatches(playerRecentGames);

          // Completed match IDs
          const completedMatchIds = new Set(
            matches
              .filter((m: any) => (m.status === "completed" || m.status === "Final") && !m.isHidden)
              .map((m: any) => m.id)
          );

          // Aggregate plays
          plays.forEach((play) => {
            if (!play.matchId || !completedMatchIds.has(play.matchId)) return;

            const isConversionPlay = Boolean(
              play.isConversion === true ||
              play.playType === "Conversion" ||
              (!play.isTouchdown && (
                (play.conversionAttempt !== undefined && play.conversionAttempt !== null) ||
                play.conversionSuccess === true
              ))
            );

            // Passing
            if (play.playType === "Pass" && play.qbPlayerId === pName && !isConversionPlay) {
              stats.passAtt += 1;
              if (play.passOutcome === "Complete") {
                stats.passComp += 1;
              }
              if (play.isTouchdown) {
                stats.passTD += 1;
                stats.totalTDs += 1;
              }
            }

            // Receiving
            if (play.playType === "Pass" && play.passOutcome === "Complete" && play.receiverPlayerId === pName && !isConversionPlay) {
              stats.receptions += 1;
              if (play.isTouchdown) {
                stats.recTD += 1;
                stats.totalTDs += 1;
              }
            }

            // Rushing
            if (play.playType === "Run" && play.runnerPlayerId === pName && !isConversionPlay) {
              stats.rushAtt += 1;
              if (play.isTouchdown) {
                stats.rushTD += 1;
                stats.totalTDs += 1;
              }
            }

            // Defense
            if (play.defenders && Array.isArray(play.defenders) && play.defenders.includes(pName)) {
              if (play.passOutcome === "Interception") {
                stats.int += 1;
                if (play.isPick6) {
                  stats.totalTDs += 1;
                }
              } else if (play.passOutcome === "PBU") {
                stats.pbu += 1;
              } else if (play.passOutcome === "Sack") {
                stats.sacks += 1;
                stats.flagPulls += 1;
              } else {
                stats.flagPulls += 1;
              }
            }

            if (play.passOutcome === "Interception" && play.flaggers && Array.isArray(play.flaggers) && play.flaggers.includes(pName)) {
              stats.flagPulls += 1;
            }
          });

          setPlayerStats(stats);
        }
      } catch (err) {
        console.error("Error loading profile stats:", err);
      }
      setLoading(false);
    };

    fetchProfileAndStats();
  }, [selectedPlayerId, authPlayerId, activeLeagueId]);

  // Handle switching player (for admins / preview)
  const handleSelectAnotherPlayer = (pId: string) => {
    setSelectedPlayerId(pId);
    const found = allRosteredPlayers.find((p) => p.id === pId);
    if (found) {
      setSelectedPlayer(found);
      // If dev / testing, also switch dev auth
      if (typeof window !== "undefined") {
        setDevRole("player", found.teamId, found.id);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const effectivePlayer = selectedPlayer || authPlayerData;
  const effectiveTeam = playerTeam;
  const playerName = effectivePlayer?.playerName || "Athlete Profile";
  const jerseyNumber = effectivePlayer?.number || effectivePlayer?.jerseyNumber || "00";
  const position = effectivePlayer?.position || "Flex / Skill";
  const secondaryPos = effectivePlayer?.secondaryPosition || "";
  const attachedEmails: string[] = effectivePlayer?.emails || (effectivePlayer?.email ? [effectivePlayer.email] : []);

  const effectiveTeamId = effectivePlayer?.teamId || authTeamId;
  const teamName = effectiveTeam?.name || "Team";
  const teamShortcode = effectiveTeam ? getTeamShortcode(effectiveTeam) : "TM";

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col relative">

      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-[40rem] h-[40rem] bg-cyan-950/20 rounded-full blur-[180px]"></div>
        <div className="absolute bottom-20 right-10 w-[35rem] h-[35rem] bg-blue-950/25 rounded-full blur-[180px]"></div>
      </div>

      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 md:p-8 space-y-8 relative z-10 flex-1">
        {/* ============================================================== */}
        {/* TOP DEMO / ROLE SWITCHER BANNER (IF ADMIN OR PREVIEWING)       */}
        {/* ============================================================== */}
        {(!isPlayer || isLeagueAdmin) && allRosteredPlayers.length > 0 && (
          <div className="bg-[#0B0F19] border border-cyan-500/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 block">
                  {isLeagueAdmin ? "Commissioner Athlete Inspector" : "Player Profile Preview"}
                </span>
                <p className="text-xs text-neutral-400">
                  Select any rostered player to view their individualized stats, linked emails, and personal settings.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <label className="text-xs font-mono text-neutral-400 whitespace-nowrap">Switch Player:</label>
              <select
                value={selectedPlayerId}
                onChange={(e) => handleSelectAnotherPlayer(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-black border border-white/15 text-xs text-white focus:border-cyan-400 outline-none"
              >
                {allRosteredPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.number || p.jerseyNumber || "0"} {p.playerName} ({p.position || "Athlete"})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 1. ATHLETE HERO BANNER                                         */}
        {/* ============================================================== */}
        <div className="relative bg-[#0B0F19] border border-white/10 rounded-3xl p-6 md:p-8 overflow-hidden shadow-2xl">
          {/* Subtle Jersey Number Watermark */}
          <div className="absolute -right-6 -bottom-10 text-[180px] font-black text-white/[0.03] select-none pointer-events-none leading-none">
            #{jerseyNumber}
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            {/* Left: Avatar & Identity Details */}
            <div className="flex items-start sm:items-center gap-5">
              {/* Jersey Badge Box */}
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-tr from-[var(--league-primary)] to-[var(--league-accent)] flex flex-col items-center justify-center text-white shadow-xl shadow-cyan-500/10 shrink-0 border border-white/20 p-2 text-center">
                <span className="text-[10px] font-mono uppercase font-black tracking-widest text-white/80">JERSEY</span>
                <span className="text-2xl md:text-3xl font-black tracking-tight leading-none">#{jerseyNumber}</span>
              </div>

              {/* Name, Team & Roles */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>Rostered Player</span>
                  </span>

                  {effectiveTeam && (
                    <Link
                      href={`/teams/${effectiveTeamId}`}
                      className="px-2.5 py-0.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white text-[11px] font-mono font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                    >
                      <Shield className="w-3 h-3 text-cyan-400" />
                      <span>{teamName}</span>
                    </Link>
                  )}

                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono font-bold uppercase">
                    {position} {secondaryPos ? `/ ${secondaryPos}` : ""}
                  </span>
                </div>

                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
                  {playerName}
                </h1>

                {/* Attached Email Addresses */}
                {attachedEmails.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-xs text-neutral-400 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Roster Email{attachedEmails.length > 1 ? "s" : ""}:</span>
                    </span>
                    {attachedEmails.map((em, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg bg-neutral-900 border border-white/10 text-xs font-mono text-cyan-300"
                      >
                        {em}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Key Action CTAs */}
            <div className="flex flex-wrap items-center gap-3">
              {effectiveTeamId && (!isLeagueAdmin || isTeamAdmin(effectiveTeamId)) && (
                <Link
                  href={`/teams/${effectiveTeamId}/playbook`}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Study Team Playbook</span>
                  <span className="px-1.5 py-0.2 rounded bg-black/20 text-[9px] font-mono">View Only</span>
                </Link>
              )}

              {effectiveTeamId && (
                <Link
                  href={`/teams/${effectiveTeamId}`}
                  className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/10 flex items-center gap-2"
                >
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span>Team Portal</span>
                </Link>
              )}

              <button
                type="button"
                onClick={openCustomizer}
                className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/10 flex items-center gap-2"
              >
                <Settings className="w-4 h-4 text-cyan-400" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. NAVIGATION TABS                                             */}
        {/* ============================================================== */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-4 overflow-x-auto">
          {[
            { id: "stats", label: "Player Statistics", icon: Activity },
            { id: "settings", label: "Appearance", icon: Palette },
            { id: "rules", label: "Official Rules (View Only)", icon: BookOpen },
            { id: "account", label: "Account & Linked Emails", icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  isActive
                    ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20 font-black"
                    : "bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ============================================================== */}
        {/* TAB 1: PLAYER STATISTICS                                       */}
        {/* ============================================================== */}
        {activeTab === "stats" && (
          <div className="space-y-8">
            {/* Top Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-[#0B0F19] border border-white/10 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] font-mono uppercase font-bold text-neutral-400">Games Played</span>
                <div className="text-2xl md:text-3xl font-black text-white">{playerStats.gamesPlayed}</div>
                <span className="text-[10px] text-neutral-500">Official matchups</span>
              </div>

              <div className="bg-[#0B0F19] border border-yellow-500/30 rounded-2xl p-4 space-y-1 shadow-lg shadow-yellow-500/5">
                <span className="text-[10px] font-mono uppercase font-bold text-yellow-400 flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  <span>Total Touchdowns</span>
                </span>
                <div className="text-2xl md:text-3xl font-black text-yellow-400">{playerStats.totalTDs}</div>
                <span className="text-[10px] text-neutral-400">Pass + Rec + Rush</span>
              </div>

              <div className="bg-[#0B0F19] border border-cyan-500/20 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] font-mono uppercase font-bold text-cyan-400 flex items-center gap-1">
                  <Crosshair className="w-3 h-3" />
                  <span>Passing TDs</span>
                </span>
                <div className="text-2xl md:text-3xl font-black text-cyan-300">{playerStats.passTD}</div>
                <span className="text-[10px] text-neutral-500">
                  {playerStats.passComp}/{playerStats.passAtt} Comp
                </span>
              </div>

              <div className="bg-[#0B0F19] border border-blue-500/20 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] font-mono uppercase font-bold text-blue-400 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  <span>Receptions</span>
                </span>
                <div className="text-2xl md:text-3xl font-black text-blue-300">{playerStats.receptions}</div>
                <span className="text-[10px] text-neutral-500">{playerStats.recTD} Receiving TDs</span>
              </div>

              <div className="bg-[#0B0F19] border border-emerald-500/20 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  <span>Rushing TDs</span>
                </span>
                <div className="text-2xl md:text-3xl font-black text-emerald-300">{playerStats.rushTD}</div>
                <span className="text-[10px] text-neutral-500">{playerStats.rushAtt} Carries</span>
              </div>

              <div className="bg-[#0B0F19] border border-purple-500/20 rounded-2xl p-4 space-y-1">
                <span className="text-[10px] font-mono uppercase font-bold text-purple-400 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  <span>Flags / Def</span>
                </span>
                <div className="text-2xl md:text-3xl font-black text-purple-300">{playerStats.flagPulls}</div>
                <span className="text-[10px] text-neutral-500">
                  {playerStats.int} INT • {playerStats.sacks} Sacks
                </span>
              </div>
            </div>

            {/* Categorized Statistical Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 1. PASSING PERFORMANCE */}
              <div className="bg-[#0B0F19] border border-white/10 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                    <Crosshair className="w-4 h-4" />
                    <span>Passing Performance</span>
                  </h3>
                  <span className="text-[10px] font-mono text-neutral-400">Quarterback</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-white/5 text-xs">
                    <span className="text-neutral-400">Pass Completions</span>
                    <span className="font-mono font-bold text-white">{playerStats.passComp}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5 text-xs">
                    <span className="text-neutral-400">Pass Attempts</span>
                    <span className="font-mono font-bold text-white">{playerStats.passAtt}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5 text-xs">
                    <span className="text-neutral-400">Completion Percentage</span>
                    <span className="font-mono font-bold text-cyan-400">
                      {playerStats.passAtt > 0
                        ? `${Math.round((playerStats.passComp / playerStats.passAtt) * 100)}%`
                        : "0%"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 text-xs">
                    <span className="text-neutral-400">Touchdown Passes</span>
                    <span className="font-mono font-bold text-yellow-400">{playerStats.passTD}</span>
                  </div>
                </div>
              </div>

              {/* 2. RECEIVING & RUSHING PERFORMANCE */}
              <div className="bg-[#0B0F19] border border-white/10 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-blue-400 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span>Receiving & Rushing</span>
                  </h3>
                  <span className="text-[10px] font-mono text-neutral-400">Playmaker</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-white/5 text-xs">
                    <span className="text-neutral-400">Total Receptions</span>
                    <span className="font-mono font-bold text-white">{playerStats.receptions}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5 text-xs">
                    <span className="text-neutral-400">Receiving Touchdowns</span>
                    <span className="font-mono font-bold text-yellow-400">{playerStats.recTD}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5 text-xs">
                    <span className="text-neutral-400">Rush Attempts</span>
                    <span className="font-mono font-bold text-white">{playerStats.rushAtt}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 text-xs">
                    <span className="text-neutral-400">Rushing Touchdowns</span>
                    <span className="font-mono font-bold text-emerald-400">{playerStats.rushTD}</span>
                  </div>
                </div>
              </div>

              {/* 3. DEFENSIVE METRICS */}
              <div className="bg-[#0B0F19] border border-white/10 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>Defensive Impact</span>
                  </h3>
                  <span className="text-[10px] font-mono text-neutral-400">Stop Unit</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-white/5 text-xs">
                    <span className="text-neutral-400">Flags (Tackles)</span>
                    <span className="font-mono font-bold text-white">{playerStats.flagPulls}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5 text-xs">
                    <span className="text-neutral-400">QB Sacks</span>
                    <span className="font-mono font-bold text-red-400">{playerStats.sacks}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5 text-xs">
                    <span className="text-neutral-400">Interceptions (INT)</span>
                    <span className="font-mono font-bold text-cyan-400">{playerStats.int}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 text-xs">
                    <span className="text-neutral-400">Pass Breakups (PBU)</span>
                    <span className="font-mono font-bold text-purple-400">{playerStats.pbu}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Playbook Quick Access Reminder for Rostered Player */}
            {effectiveTeamId && (!isLeagueAdmin || isTeamAdmin(effectiveTeamId)) && (
              <div className="bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-[#0B0F19] border border-cyan-500/30 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-5 shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-black uppercase text-white">
                      {teamName} Tactical Playbooks & Armband Cards
                    </h4>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      As a rostered player on {teamName}, you have view-only access to master formations, study route trees, and print your personal wristband cards.
                    </p>
                  </div>
                </div>

                <Link
                  href={`/teams/${effectiveTeamId}/playbook`}
                  className="px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider transition-all shrink-0 shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                >
                  <span>Open {teamName} Playbooks</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: DISPLAY APPEARANCE                                      */}
        {/* ============================================================== */}
        {activeTab === "settings" && (
          <div className="bg-[#0B0F19] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl max-w-4xl">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Palette className="w-5 h-5 text-cyan-400" />
                <h3 className="text-xl font-black uppercase tracking-tight text-white">
                  Display Appearance
                </h3>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Choose light or dark mode. League colors and branding are set by your league administrator.
              </p>
            </div>
            <div className="bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Appearance Mode
                </h4>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Choose light or dark mode for this device.
                </p>
              </div>
              <ThemeToggle variant="segmented" />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: OFFICIAL LEAGUE RULES (VIEW-ONLY SUMMARY)               */}
        {/* ============================================================== */}
        {activeTab === "rules" && (
          <div className="space-y-6">
            <div className="bg-[#0B0F19] border border-white/10 rounded-3xl p-6 md:p-8 space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <h3 className="text-xl font-black uppercase tracking-tight text-white">
                  Official League Rules (View-Only)
                </h3>
              </div>
              <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed">
                These rules are set and maintained by the League Commissioner. All match calculations, play designer field dimensions, rush cones, and roster requirements automatically adhere to these official policies.
              </p>
            </div>

            {/* 12 Rules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  label: "Players on Field",
                  value: `${settings?.rules?.playersOnField || 5} vs ${settings?.rules?.playersOnField || 5}`,
                  desc: "Active players per side on the gridiron at once.",
                },
                {
                  label: "Period Format",
                  value: `${settings?.rules?.periodsCount || 2} ${settings?.rules?.periodType === "halves" ? "Halves" : "Quarters"}`,
                  desc: `${settings?.rules?.periodDurationMinutes || 20} minutes per period running clock.`,
                },
                {
                  label: "Timeouts Per Game",
                  value: `${settings?.rules?.timeoutsPerTeam || 2} Timeouts`,
                  desc: `${settings?.rules?.timeoutDurationSeconds || 60} seconds duration per timeout.`,
                },
                {
                  label: "Set of Downs",
                  value: `${settings?.rules?.downsPerSeries || 4} Downs`,
                  desc: "Downs granted to advance across the midfield line to gain a first down.",
                },
                {
                  label: "Rush Line Distance",
                  value: `${settings?.rules?.rushLineDistance || 7} Yards`,
                  desc: "Distance behind the line of scrimmage the defensive rusher must align before snapping.",
                },
                {
                  label: "Roster Limits",
                  value: `Min ${settings?.rules?.minRosterSize || 5} • Max ${settings?.rules?.maxRosterSize || 30} Players`,
                  desc: "Team roster capacity requirements for active eligibility.",
                },
                {
                  label: "Play Clock",
                  value: `${settings?.rules?.playClockSeconds || 30} Seconds`,
                  desc: "Time allowed between snaps before a delay of game infraction.",
                },
                {
                  label: "Touchdown Value",
                  value: "6 Points",
                  desc: "Points awarded for crossing the goal line into the endzone.",
                },
                {
                  label: "Extra Point Tiers",
                  value: "1 Pt (5yd) / 2 Pt (10yd)",
                  desc: "Choices awarded following a touchdown score.",
                },
                {
                  label: "Safety Value",
                  value: "2 Points",
                  desc: "Awarded when flag is pulled in the offensive endzone.",
                },
                {
                  label: "Overtime Format",
                  value: "College Style Shootout",
                  desc: "Alternating possessions from the 5 or 10-yard line with no game ties.",
                },
                {
                  label: "Running Play Zone",
                  value: "No Run within 5 Yds of Endzone",
                  desc: "All plays inside the 5-yard line must be legal forward passes.",
                },
              ].map((rule, idx) => (
                <div
                  key={idx}
                  className="bg-[#0B0F19] border border-white/10 rounded-2xl p-5 space-y-2 hover:border-white/20 transition-all"
                >
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                    Rule #{idx + 1}
                  </span>
                  <h4 className="text-base font-black uppercase text-white">{rule.label}</h4>
                  <div className="text-lg font-black font-mono text-cyan-300">{rule.value}</div>
                  <p className="text-xs text-neutral-400 leading-relaxed">{rule.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: ACCOUNT & LINKED EMAILS                                 */}
        {/* ============================================================== */}
        {activeTab === "account" && (
          <div className="bg-[#0B0F19] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 max-w-3xl shadow-xl">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <User className="w-5 h-5 text-cyan-400" />
                <h3 className="text-xl font-black uppercase tracking-tight text-white">
                  Athlete Account & Credentials
                </h3>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Your player profile is linked to verified email addresses attached by team captains or league administrators. Logging into the application with any of these email accounts automatically assigns you the &quot;Player&quot; role.
              </p>
            </div>

            {/* Linked Emails Box */}
            <Link href="/account" className="inline-block text-sm font-bold text-cyan-400 hover:text-cyan-300">
              Manage verified account sign-in emails
            </Link>
            <div className="bg-black/50 border border-white/10 rounded-2xl p-5 space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300 block">
                Roster Contact Emails ({attachedEmails.length}):
              </span>

              {attachedEmails.length > 0 ? (
                <div className="space-y-2">
                  {attachedEmails.map((em, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-white/5"
                    >
                      <div className="flex items-center gap-2.5">
                        <Mail className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-mono font-bold text-white">{em}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-300 uppercase">
                        Registered Roster Contact
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-neutral-900 border border-white/5 text-xs text-neutral-400 italic">
                  No emails have been attached to this athlete doc yet. Team coaches or admins can attach player emails via the Team Roster page.
                </div>
              )}
            </div>

            {/* Current Active Session */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <span className="text-xs font-mono font-bold uppercase text-neutral-400 block">
                Current App Session:
              </span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Authenticated Role:</span>
                <span className="font-mono font-bold uppercase text-cyan-400">{role}</span>
              </div>
              {user?.email && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Signed-in Email:</span>
                  <span className="font-mono text-white">{user.email}</span>
                </div>
              )}
            </div>

            {/* Sign Out CTA */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-neutral-400">End active session on this device</span>
              <button
                type="button"
                onClick={logout}
                className="px-5 py-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}
      </main>

    </div>
  );
}
