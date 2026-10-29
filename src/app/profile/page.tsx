"use client";
import FlagOSLoader from "@/components/FlagOSLoader";

import { usePageGuide } from "@/lib/pageGuide";
import { PROFILE_WALKTHROUGH } from "@/lib/walkthroughs/public";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
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
import {
  getCachedLeaguePlayers,
  getCachedLeagueMatches,
  getCachedLeaguePlays,
} from "@/lib/leagueDataCache";
import { useAuth } from "@/lib/authContext";
import { useLeague } from "@/lib/leagueContext";
import { useLeagueSeasonHistory } from "@/lib/useLeagueSeasonHistory";
import { useDemoSandbox } from "@/lib/useDemoSandbox";
import PlayerCareerCard from "@/components/league/PlayerCareerCard";
import { getTeamShortcode } from "@/components/TeamAssets";
import { loadTeamRecord } from "@/lib/teamRecord";
import ThemeToggle from "@/components/ThemeToggle";
import DemoNoticeStrip from "@/components/DemoNoticeStrip";
import { effectiveMaxRoster } from "@/lib/rosterLimits";
import { useMyMemberships } from "@/lib/useMyMemberships";
import { loadTeamPlayers } from "@/lib/matchRoster";
import { loadTeamSeasonData } from "@/lib/teamSeasonData";

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
  usePageGuide(PROFILE_WALKTHROUGH);
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
    isDemoLeague,
    seasons,
    currentSeasonId,
    portalLeagueId,
  } = useLeague();
  const { data: memberships, loading: membershipsLoading } = useMyMemberships(user?.uid);
  // Independent (league-free) team whose roster this profile shows, set by ?team= or by resolution below.
  const [teamProfileId, setTeamProfileId] = useState<string | null>(null);
  const teamMembership = teamProfileId
    ? memberships?.independentTeams.find((team) => team.id === teamProfileId) ?? null
    : null;
  const leagueMembership = teamProfileId ? null : memberships?.leagues.find((league) => league.id === activeLeagueId) ?? null;
  const ownPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    if (authPlayerId && !teamProfileId) ids.add(authPlayerId);
    leagueMembership?.teams.forEach((team) => { if (team.player?.id) ids.add(team.player.id); });
    if (teamMembership?.player?.id) ids.add(teamMembership.player.id);
    return ids;
  }, [authPlayerId, leagueMembership, teamMembership, teamProfileId]);
  const coachedTeamIds = useMemo(
    () => new Set([...(leagueMembership?.teams || []), ...(teamMembership ? [teamMembership] : [])]
      .filter((team) => team.roles.includes("coach")).map((team) => team.id)),
    [leagueMembership, teamMembership],
  );
  // Only commissioners and coaches may look at other players' profiles; everyone else sees their own.
  const canPreviewPlayers = teamProfileId
    ? coachedTeamIds.size > 0
    : isDemoLeague || isLeagueAdmin || !!leagueMembership?.isCommissioner || coachedTeamIds.size > 0;
  const ownPlayerKey = [...ownPlayerIds].sort().join(",");
  const coachedTeamKey = [...coachedTeamIds].sort().join(",");

  // The profile follows the portal being browsed: ?team= for an independent team, otherwise the league
  // portal (?league= or the one carried over in-session). With no portal, a signed-in visitor picks a
  // roster; nothing is guessed from memberships or remembered between visits.
  const [profileTarget, setProfileTarget] = useState<"pending" | "league" | "team" | "none">("pending");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(authPlayerId || "");
  const [requestedLeagueId, setRequestedLeagueId] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTeam = params.get("team");
    const requestedPlayer = params.get("player");
    if (requestedPlayer) setSelectedPlayerId(requestedPlayer);
    if (requestedTeam) {
      setTeamProfileId(requestedTeam);
      setProfileTarget("team");
      return;
    }
    setTeamProfileId(null);
    const requestedLeague = params.get("league");
    setRequestedLeagueId(requestedLeague);
    setProfileTarget(requestedLeague || portalLeagueId || !user ? "league" : "none");
  }, [user, portalLeagueId]);
  // A fresh ?league= load renders before the provider adopts it; don't load another league's roster meanwhile.
  const [leagueAwaitingExpired, setLeagueAwaitingExpired] = useState(false);
  useEffect(() => {
    if (requestedLeagueId && requestedLeagueId !== activeLeagueId) {
      setLeagueAwaitingExpired(false);
      const timer = setTimeout(() => setLeagueAwaitingExpired(true), 2500);
      return () => clearTimeout(timer);
    }
  }, [requestedLeagueId, activeLeagueId]);
  const awaitingLeague = !leagueAwaitingExpired && profileTarget === "league" && !!requestedLeagueId && requestedLeagueId !== activeLeagueId;
  const contextRoleLabel = isDemoLeague && !teamProfileId
    ? String(role).replace("_", " ")
    : [
        !teamProfileId && (leagueMembership?.isCommissioner || isLeagueAdmin) ? "Commissioner" : "",
        coachedTeamIds.size > 0 ? "Coach" : "",
        leagueMembership?.teams.some((team) => team.player) || teamMembership?.player ? "Player" : "",
      ].filter(Boolean).join(" & ") || "Spectator";
  const needsLeaguePick = !!user && profileTarget === "none";
  const { sandbox } = useDemoSandbox(isDemoLeague && !teamProfileId);
  const hasArchivedSeasons = !isDemoLeague && !teamProfileId && seasons.some((season) => season.status === "archived");
  const seasonHistory = useLeagueSeasonHistory(activeLeagueId, hasArchivedSeasons);

  const [activeTab, setActiveTab] = useState<"stats" | "settings" | "rules" | "account">("stats");
  const [loading, setLoading] = useState(true);

  // Profile data state
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
      if (profileTarget === "pending" || profileTarget === "none" || awaitingLeague) return;
      const teamMode = profileTarget === "team" && !!teamProfileId;
      // The demo league lives in the session sandbox, the same source the dashboard and roster use.
      if (!teamMode && isDemoLeague && !sandbox) return;
      setLoading(true);
      try {
        const [playersList, rawMatches, rawPlays] = teamMode
          ? await Promise.all([loadTeamPlayers(teamProfileId!), loadTeamSeasonData(teamProfileId!)])
            .then(([players, season]) => [players, season.matches as any[], season.plays as any[]])
          : isDemoLeague && sandbox
          ? [sandbox.getSandboxPlayers() as any[], sandbox.getSandboxMatches() as any[], sandbox.getSandboxPlays() as any[]]
          : await Promise.all([
            getCachedLeaguePlayers(activeLeagueId),
            getCachedLeagueMatches(activeLeagueId),
            getCachedLeaguePlays(activeLeagueId),
          ]);

        setAllRosteredPlayers(playersList);

        // Your own record in this league comes first; coaches may pick another player to preview.
        let targetPlayer = selectedPlayerId ? playersList.find((p) => p.id === selectedPlayerId) : undefined;
        if (targetPlayer && !canPreviewPlayers && !ownPlayerIds.has(targetPlayer.id)) targetPlayer = undefined;
        if (!targetPlayer) targetPlayer = playersList.find((p) => ownPlayerIds.has(p.id));
        if (!targetPlayer && canPreviewPlayers && playersList.length > 0) {
          targetPlayer = isDemoLeague && !teamMode
            ? playersList.find((p) => p.teamId === "team_kc") || playersList[0]
            : playersList.find((p) => coachedTeamIds.has(p.teamId)) || playersList[0];
        }

        setSelectedPlayer(targetPlayer ?? null);
        if (!targetPlayer) setPlayerTeam(null);

        if (targetPlayer?.teamId && !teamMode && isDemoLeague && sandbox) {
          setPlayerTeam(sandbox.getSandboxTeams().find((t: any) => t.id === targetPlayer.teamId) ?? null);
        } else if (targetPlayer?.teamId) {
          const teamData = await loadTeamRecord(targetPlayer.teamId);
          if (teamData) {
            setPlayerTeam(teamData);
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

          const matches = rawMatches;
          const plays = rawPlays;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayerId, authPlayerId, activeLeagueId, isDemoLeague, sandbox, ownPlayerKey, coachedTeamKey, canPreviewPlayers, profileTarget, teamProfileId, awaitingLeague]);

  // Handle switching player (for admins / preview)
  const handleSelectAnotherPlayer = (pId: string) => {
    setSelectedPlayerId(pId);
    const found = allRosteredPlayers.find((p) => p.id === pId);
    if (found) {
      setSelectedPlayer(found);
      if (isDemoLeague && !teamProfileId) setDevRole("player", found.teamId, found.id);
    }
  };

  const isDemoId = (id: string) => id === "default" || id === "demo";
  const rosterChoices = [
    ...(memberships?.leagues || []).filter((league) => !isDemoId(league.id)).flatMap((league) =>
      league.teams.filter((team) => team.player).map((team) => ({
        key: `${league.id}:${team.id}`,
        href: `/profile?league=${encodeURIComponent(league.id)}&player=${encodeURIComponent(team.player!.id)}`,
        label: `${team.name} · ${league.name}`,
      }))),
    ...(memberships?.independentTeams || []).filter((team) => team.player).map((team) => ({
      key: team.id,
      href: `/profile?team=${encodeURIComponent(team.id)}&player=${encodeURIComponent(team.player!.id)}`,
      label: team.name,
    })),
  ];
  const showNoProfile = needsLeaguePick || (!loading && !awaitingLeague && profileTarget !== "pending" && (!isDemoLeague || !!teamProfileId) && !selectedPlayer);
  const soleRosterHref = needsLeaguePick && !membershipsLoading && rosterChoices.length === 1 ? rosterChoices[0].href : null;
  useEffect(() => {
    if (soleRosterHref) window.location.replace(soleRosterHref);
  }, [soleRosterHref]);
  if (soleRosterHref) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">
        <FlagOSLoader />
      </div>
    );
  }
  if (!showNoProfile && (loading || awaitingLeague || (!!user && membershipsLoading) || (!!user && profileTarget === "pending"))) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">
        <FlagOSLoader />
      </div>
    );
  }

  if (showNoProfile) {
    const rosterName = teamProfileId ? teamMembership?.name || "this team" : settings.leagueName || "this league";
    return (
      <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#0B0F19] border border-white/10 rounded-3xl p-6 space-y-4 text-center">
          <User className="w-10 h-10 mx-auto text-cyan-400" aria-hidden />
          <h1 className="text-xl font-black">
            {needsLeaguePick ? (rosterChoices.length > 0 ? "Choose a profile" : "No player profile yet") : "No player profile here yet"}
          </h1>
          <p className="text-sm text-neutral-300">
            {needsLeaguePick
              ? rosterChoices.length > 0
                ? "Pick which roster's player profile to open."
                : "Your player profile appears once a coach adds you to a team roster. Join a league or ask your coach to add you."
              : `You're not on the ${rosterName} roster. Your stats appear here once a coach adds you to a team.`}
          </p>
          {rosterChoices.length > 0 && (
            <ul className="space-y-2">
              {rosterChoices.map((choice) => (
                <li key={choice.key}>
                  <a href={choice.href} className="block rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10">
                    {choice.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/" className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/10">Home</Link>
            <Link href="/leagues" className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/10">Find a league</Link>
          </div>
        </div>
      </div>
    );
  }


  const effectivePlayer = selectedPlayer || authPlayerData;
  const effectiveTeam = playerTeam;
  const playerName = effectivePlayer?.playerName || "Athlete Profile";
  const jerseyNumber = effectivePlayer?.number || effectivePlayer?.jerseyNumber || "00";
  const position = Array.isArray(effectivePlayer?.positions) && effectivePlayer.positions.length
    ? effectivePlayer.positions.join(" / ")
    : effectivePlayer?.position || "Flex / Skill";
  const secondaryPos = effectivePlayer?.positions?.includes(effectivePlayer?.secondaryPosition) ? "" : effectivePlayer?.secondaryPosition || "";
  const attachedEmails: string[] = effectivePlayer?.emails || (effectivePlayer?.email ? [effectivePlayer.email] : []);

  const effectiveTeamId = effectivePlayer?.teamId || authTeamId;
  const teamName = effectiveTeam?.name || "Team";
  const teamShortcode = effectiveTeam ? getTeamShortcode(effectiveTeam) : "TM";

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col relative">
      {isDemoLeague && !teamProfileId && <div className="relative z-10"><DemoNoticeStrip /></div>}

      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-[40rem] h-[40rem] bg-cyan-950/20 rounded-full blur-[180px]"></div>
        <div className="absolute bottom-20 right-10 w-[35rem] h-[35rem] bg-blue-950/25 rounded-full blur-[180px]"></div>
      </div>

      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 md:p-8 space-y-8 relative z-10 flex-1">
        <Link data-tour="profile-switch"
          href={effectiveTeamId ? `/teams/${effectiveTeamId}` : "/"}
          className="inline-flex items-center text-neutral-400 hover:text-white transition-colors bg-white/5 px-3.5 py-1.5 rounded-full border border-white/10 text-xs sm:text-sm font-semibold max-w-full"
        >
          <ChevronLeft className="w-4 h-4 mr-1 shrink-0" />
          <span className="truncate">{effectiveTeamId ? `Back to ${teamName}` : "Home"}</span>
        </Link>

        {/* ============================================================== */}
        {/* TOP DEMO / ROLE SWITCHER BANNER (IF ADMIN OR PREVIEWING)       */}
        {/* ============================================================== */}
        {canPreviewPlayers && allRosteredPlayers.length > 0 && (
          <div className="bg-[#0B0F19] border border-cyan-500/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 block">
                  {selectedPlayer && ownPlayerIds.has(selectedPlayer.id) ? "Your profile" : "Previewing another player"}
                </span>
                <p className="text-xs text-neutral-300">
                  {selectedPlayer && !ownPlayerIds.has(selectedPlayer.id)
                    ? `You're viewing ${selectedPlayer.playerName || "this player"}'s profile as a coach.`
                    : "As a coach you can preview any rostered player's profile."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <label htmlFor="profile-player-selector" className="text-xs font-mono text-neutral-300 whitespace-nowrap">Preview another player:</label>
              <select data-tour="profile-player-selector" id="profile-player-selector"
                value={selectedPlayer?.id || ""}
                onChange={(e) => handleSelectAnotherPlayer(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-black border border-white/15 text-xs text-white focus:border-cyan-400 outline-none"
              >
                {allRosteredPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.number || p.jerseyNumber || "0"} {p.playerName} ({p.positions?.length ? p.positions.join(" / ") : p.position || "Athlete"})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 1. ATHLETE HERO BANNER                                         */}
        {/* ============================================================== */}
        <div data-tour="profile-identity" className="relative bg-[#0B0F19] border border-white/10 rounded-3xl p-6 md:p-8 overflow-hidden shadow-2xl">
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
                  className="px-5 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Study Team Playbook</span>
                  <span className="px-1.5 py-0.5 rounded bg-black/25 text-white text-[10px] font-mono">View Only</span>
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

              {Boolean(activeLeagueId) && !teamProfileId && (
                <button
                  type="button"
                  onClick={openCustomizer}
                  className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/10 flex items-center gap-2"
                >
                  {isLeagueAdmin ? <Settings className="w-4 h-4 text-cyan-400" /> : <BookOpen className="w-4 h-4 text-cyan-400" />}
                  <span>{isLeagueAdmin ? "League Settings" : "League Rules"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. NAVIGATION TABS                                             */}
        {/* ============================================================== */}
        <div className="relative">
        <div data-tour="profile-tabs" className="flex items-center gap-2 border-b border-white/10 pb-4 overflow-x-auto pr-10 sm:pr-0">
          {[
            { id: "stats", label: "Player Statistics", icon: Activity },
            { id: "settings", label: "Appearance", icon: Palette },
            ...(teamProfileId ? [] : [{ id: "rules", label: "Official Rules (View Only)", icon: BookOpen }]),
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
        <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 bottom-4 flex w-12 items-center justify-end bg-gradient-to-l from-black to-transparent sm:hidden">
          <ChevronRight className="w-4 h-4 text-neutral-400" />
        </div>
        </div>
        <p className="-mt-6 text-[10px] text-neutral-500 sm:hidden">Swipe the tabs to see more, including Account &amp; Linked Emails.</p>

        {/* ============================================================== */}
        {/* TAB 1: PLAYER STATISTICS                                       */}
        {/* ============================================================== */}
        {activeTab === "stats" && (
          <div className="space-y-8">
            <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-300">
              {hasArchivedSeasons
                ? `${seasons.find((season) => season.id === currentSeasonId)?.title || "Current season"} stats`
                : "This season's stats"}
            </p>
            {/* Top Quick Stats Grid */}
            <div data-tour="profile-stats" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
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
            </div>

            {/* Categorized Statistical Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 1. PASSING PERFORMANCE */}
              <div data-tour="profile-passing" className="bg-[#0B0F19] border border-white/10 rounded-3xl p-6 space-y-4">
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
              <div data-tour="profile-receiving" className="bg-[#0B0F19] border border-white/10 rounded-3xl p-6 space-y-4">
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
              <div data-tour="profile-defense" className="bg-[#0B0F19] border border-white/10 rounded-3xl p-6 space-y-4">
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

            {hasArchivedSeasons && effectivePlayer && (
              <PlayerCareerCard
                player={{ id: effectivePlayer.id || selectedPlayerId, name: playerName, teamId: effectiveTeamId || "", teamName }}
                seasons={seasons}
                currentSeasonId={currentSeasonId}
                snapshots={seasonHistory.snapshots}
                liveStats={playerStats}
                loading={seasonHistory.loading}
                error={seasonHistory.error}
              />
            )}

            {/* Playbook Quick Access Reminder for Rostered Player */}
            {effectiveTeamId && (!isLeagueAdmin || isTeamAdmin(effectiveTeamId)) && (
              <div data-tour="profile-playbook" className="bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-[#0B0F19] border border-cyan-500/30 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-5 shadow-xl">
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
          <div data-tour="profile-appearance" className="bg-[#0B0F19] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl max-w-4xl">
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
          <div data-tour="profile-rules" className="space-y-6">
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
                  value: `Min ${settings?.rules?.minRosterSize || 5} • Max ${effectiveMaxRoster(settings?.rules)} Players`,
                  desc: "Team roster capacity requirements for active eligibility.",
                },
                {
                  label: "Play Clock",
                  value: `${settings?.rules?.playClockSeconds || 25} Seconds`,
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
          <div data-tour="profile-account" className="bg-[#0B0F19] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 max-w-3xl shadow-xl">
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
                <span className="text-neutral-400">Your role in {teamProfileId ? teamName : settings.leagueName || "this league"}:</span>
                <span className="font-mono font-bold uppercase text-cyan-400">{contextRoleLabel}</span>
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
      </div>

    </div>
  );
}
