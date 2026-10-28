"use client";
import FlagOSLoader from "@/components/FlagOSLoader";

import { useState, useEffect } from "react";
import Link from "next/link";
import { shortPlayerName } from "@/lib/shortPlayerName";
import {
  ChevronLeft,
  Activity,
  Trophy,
  Users,
  Crosshair,
  Shield,
  Flag,
  Footprints,
  Goal,
  Hand,
  Zap,
  CheckCircle2,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  Table as TableIcon,
  History,
  Crown,
  Archive,
} from "lucide-react";
import {
  getCachedLeagueTeams,
  getCachedLeaguePlayers,
  getCachedLeagueMatches,
  getCachedLeaguePlays,
} from "@/lib/leagueDataCache";
import { getTeamShortcode, isRealTeam } from "@/components/TeamAssets";
import { useLeague } from "@/lib/leagueContext";
import { usePageGuide } from "@/lib/pageGuide";
import { STATS_WALKTHROUGH } from "@/lib/walkthroughs/league";
import { computeLeagueSeasonStats, type PlayerStatLine } from "@/lib/leagueSeasons";
import { useLeagueSeasonHistory } from "@/lib/useLeagueSeasonHistory";
import { isDemoExplicitlyRequested } from "@/lib/demoSandboxRuntime";
import NoLeagueSelected from "@/components/league/NoLeagueSelected";
import SeasonHistoryPanel from "@/components/league/SeasonHistoryPanel";
import { renderFlagOS } from "@/components/FlagOSText";
import { usePrivateLeagueAccess } from "@/lib/usePrivateLeagueAccess";
import {
  getSandboxTeams,
  getSandboxPlayers,
  getSandboxMatches,
  getSandboxPlays,
  subscribeDemoSandbox,
} from "@/lib/demoSandbox";

export default function StatsAndStandings() {
  usePageGuide(STATS_WALKTHROUGH);
  const {
    settings, isDemoLeague, activeLeagueId, portalLeagueId,
    seasons, currentSeasonId, viewingSeasonId, setViewingSeasonId, isViewingArchivedSeason,
  } = useLeague();
  // The demo league is only shown when it was explicitly entered (demo button/URL or the
  // in-memory demo portal). A bare "/stats" visit has no league to show. The real context
  // always provides portalLeagueId (null when no portal is being browsed).
  const demoRequested = isDemoExplicitlyRequested(portalLeagueId);
  const leagueParam = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("league")
    : null;
  const noLeagueSelected = portalLeagueId === null && !demoRequested && !leagueParam;
  // The server cannot read the query string, so the picker only renders after mount; until then
  // the page shows its usual loading state, keeping server and first client render identical.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { isDenied, deniedElement } = usePrivateLeagueAccess();
  const [activeTab, setActiveTab] = useState<"team" | "individual" | "history">("team");
  const [indivViewMode, setIndivViewMode] = useState<"leaders" | "table">("leaders");
  const [individualTab, setIndividualTab] = useState<"passing" | "receiving" | "defense">("passing");

  const [sortTeam, setSortTeam] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "rank", direction: "asc" });
  const [sortIndiv, setSortIndiv] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "", direction: "desc" });

  const [standings, setStandings] = useState<any[]>([]);
  const [individualStats, setIndividualStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const hasArchivedSeasons = !isDemoLeague && seasons.some((season) => season.status === "archived");
  const seasonHistory = useLeagueSeasonHistory(activeLeagueId, hasArchivedSeasons);
  const archivedSnapshot = isViewingArchivedSeason
    ? seasonHistory.snapshots.find((snapshot) => snapshot.seasonId === viewingSeasonId) || null
    : null;
  const viewingSeason = seasons.find((season) => season.id === viewingSeasonId);
  const displayStandings: any[] = archivedSnapshot ? archivedSnapshot.standings : standings;
  const teamCodeById = new Map<string, string>(displayStandings.filter((r: any) => r?.id && r?.shortcode).map((r: any) => [r.id, r.shortcode]));
  const displayPlayerStats: any[] = archivedSnapshot ? archivedSnapshot.playerStats : individualStats;



  useEffect(() => {
    if (noLeagueSelected) {
      setStandings([]);
      setIndividualStats([]);
      setLoading(false);
      return;
    }
    const fetchAllData = async () => {
      try {
        let teams: any[];
        let players: any[];
        let matches: any[];
        let plays: any[];

        const isEffectiveDemo =
          isDemoLeague ||
          (typeof window !== "undefined" &&
            (new URLSearchParams(window.location.search).get("embed") === "true" ||
              new URLSearchParams(window.location.search).get("demo") === "true"));

        if (isEffectiveDemo) {
          teams = getSandboxTeams().filter(isRealTeam);
          players = getSandboxPlayers();
          matches = getSandboxMatches().filter(
            (m: any) => m.homeTeamId !== "team_free_agents" && m.awayTeamId !== "team_free_agents"
          );
          plays = getSandboxPlays();
        } else {
          try {
            const [rawTeams, rawPlayers, rawMatches, rawPlays] = await Promise.all([
              getCachedLeagueTeams(activeLeagueId),
              getCachedLeaguePlayers(activeLeagueId),
              getCachedLeagueMatches(activeLeagueId, currentSeasonId),
              getCachedLeaguePlays(activeLeagueId, currentSeasonId),
            ]);

            teams = rawTeams
              .filter((t) => isRealTeam(t) && (!t.leagueId || t.leagueId === activeLeagueId));
            players = rawPlayers
              .filter((p) => !p.leagueId || p.leagueId === activeLeagueId || teams.some((t) => t.id === p.teamId));
            matches = rawMatches
              .filter((m) => !m.leagueId || m.leagueId === activeLeagueId);
            plays = rawPlays;
          } catch (err) {
            // Never substitute demo data for a real league; show it empty instead.
            console.warn("Unable to load league stats:", err);
            teams = [];
            players = [];
            matches = [];
            plays = [];
          }
        }

        const { standings: computedStandings, playerStats } = computeLeagueSeasonStats({ teams, players, matches, plays });
        setStandings(computedStandings);
        setIndividualStats(playerStats);
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
      setLoading(false);
    };

    fetchAllData();
    if (isDemoLeague) {
      const unsub = subscribeDemoSandbox(() => fetchAllData());
      return () => unsub();
    }
  }, [isDemoLeague, activeLeagueId, currentSeasonId, noLeagueSelected]);

  // Helper for Top 3 in any category
  const getTop3 = (key: string) => {
    const sorted = [...displayPlayerStats].sort((a, b) => (b[key] || 0) - (a[key] || 0)).filter((p) => (p[key] || 0) > 0);
    return sorted.slice(0, 3);
  };

  const statCategories = [
    { title: "Total Touchdowns", key: "totalTDs", subtab: "receiving" as const, group: "Scoring", icon: Trophy, color: "text-yellow-400" },
    { title: "Passing TDs", key: "passTD", subtab: "passing" as const, icon: Goal, color: "text-cyan-400" },
    { title: "Completions", key: "passComp", subtab: "passing" as const, icon: CheckCircle2, color: "text-sky-400" },
    { title: "Receptions", key: "receptions", subtab: "receiving" as const, icon: Hand, color: "text-blue-400" },
    { title: "Receiving TDs", key: "recTD", subtab: "receiving" as const, icon: Goal, color: "text-blue-400" },
    { title: "Rushing TDs", key: "rushTD", subtab: "receiving" as const, group: "Rushing", icon: Footprints, color: "text-emerald-400" },
    { title: "Flags", key: "flagPulls", subtab: "defense" as const, icon: Flag, color: "text-amber-400" },
    { title: "Sacks", key: "sacks", subtab: "defense" as const, icon: Zap, color: "text-orange-500" },
    { title: "Interceptions", key: "int", subtab: "defense" as const, icon: Crosshair, color: "text-purple-400" },
    { title: "Pass Breakups", key: "pbu", subtab: "defense" as const, icon: Shield, color: "text-cyan-400" },
  ];

  // Handler for clicking "View Full Stats" on any stat leaders section
  const handleOpenFullStats = (subtab: "passing" | "receiving" | "defense", sortKey: string) => {
    setIndividualTab(subtab);
    setSortIndiv({ key: sortKey, direction: "desc" });
    setIndivViewMode("table");
  };

  const getSortedStandings = () => {
    return [...displayStandings].sort((a, b) => {
      const valA = a[sortTeam.key];
      const valB = b[sortTeam.key];
      if (valA < valB) return sortTeam.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortTeam.direction === "asc" ? 1 : -1;
      return sortTeam.direction === "asc" ? (b as any).rank - (a as any).rank : (a as any).rank - (b as any).rank;
    });
  };

  const getSortedIndividualStats = () => {
    let sorted = [...displayPlayerStats];

    let key = sortIndiv.key;
    if (!key) {
      if (individualTab === "passing") key = "passTD";
      else if (individualTab === "receiving") key = "receptions";
      else key = "flagPulls";
    }

    sorted.sort((a, b) => {
      if (key === "compPct") {
        const pctA = a.passAtt > 0 ? a.passComp / a.passAtt : 0;
        const pctB = b.passAtt > 0 ? b.passComp / b.passAtt : 0;
        return sortIndiv.direction === "asc" ? pctA - pctB : pctB - pctA;
      }

      const valA = a[key] ?? 0;
      const valB = b[key] ?? 0;
      if (valA < valB) return sortIndiv.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortIndiv.direction === "asc" ? 1 : -1;
      return 0;
    });

    if (individualTab === "passing") {
      sorted = sorted.filter((p) => p.passAtt > 0);
    } else if (individualTab === "receiving") {
      sorted = sorted.filter((p) => p.receptions > 0 || p.rushAtt > 0);
    } else {
      sorted = sorted.filter((p) => p.flagPulls > 0 || p.int > 0 || p.pbu > 0 || p.safeties > 0);
    }
    return sorted;
  };

  const sortedStandings = getSortedStandings();
  const sortedIndividualStats = getSortedIndividualStats();

  const handleSortTeam = (key: string) => {
    setSortTeam((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  const handleSortIndiv = (key: string) => {
    setSortIndiv((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  const ThTeam = ({ label, sortKey, className = "" }: { label: string; sortKey: string; className?: string }) => (
    <th className={`py-3 px-2 sm:py-4 sm:px-6 cursor-pointer hover:bg-white/5 transition-colors ${className}`} onClick={() => handleSortTeam(sortKey)}>
      <div className="flex items-center justify-center gap-1">
        {label}
        {sortTeam.key === sortKey && (sortTeam.direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      </div>
    </th>
  );

  const ThIndiv = ({ label, sortKey, className = "" }: { label: string; sortKey: string; className?: string }) => {
    const isCurrent =
      sortIndiv.key === sortKey ||
      (!sortIndiv.key &&
        ((individualTab === "passing" && sortKey === "passTD") ||
          (individualTab === "receiving" && sortKey === "receptions") ||
          (individualTab === "defense" && sortKey === "flagPulls")));

    return (
      <th className={`py-3 px-2 sm:py-4 sm:px-6 cursor-pointer hover:bg-white/5 transition-colors ${className}`} onClick={() => handleSortIndiv(sortKey)}>
        <div className="flex items-center justify-center gap-1">
          {label}
          {isCurrent && (sortIndiv.direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
        </div>
      </th>
    );
  };

  if (isDenied) {
    return deniedElement;
  }

  if (mounted && noLeagueSelected) {
    return <NoLeagueSelected pagePath="/stats" noun="Standings and stats" />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col justify-center items-center font-sans">
        <FlagOSLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans selection:bg-blue-500/30 selection:text-blue-200 flex flex-col justify-between">

      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-cyan-900/5 dark:bg-cyan-900/15 rounded-full blur-[160px]"></div>
        <div className="absolute bottom-10 left-10 w-[35rem] h-[35rem] bg-blue-900/5 dark:bg-blue-900/10 rounded-full blur-[170px]"></div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10 w-full px-4 sm:px-6 py-6 sm:py-8 flex-1">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-widest">
                {(viewingSeason?.title || settings.seasonTitle || "Active Season")} {isViewingArchivedSeason ? "Final" : "Leaderboards"}
              </span>
              <span className="text-[var(--text-muted)] text-xs">•</span>
              <span className="text-[11px] font-mono text-[var(--text-muted)] dark:text-neutral-400">
                Official Rules: {settings.rulebookTitle || "IFAF 5v5 Flag Football Rules"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase tracking-tight flex items-center gap-3">
              <Activity className="w-8 h-8 md:w-10 md:h-10 shrink-0 text-amber-500 dark:text-amber-400" />
              <span>{renderFlagOS(settings.leagueName)} Standings & Stats</span>
            </h1>
            <p className="text-[var(--text-muted)] dark:text-neutral-400 text-xs md:text-sm mt-1 max-w-xl">
              Team standings and player stats for the season.
            </p>
          </div>
          {seasons.length > 1 && (
            <label data-tour="stats-season" className="flex flex-col gap-1 w-full md:w-auto">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Season</span>
              <select
                value={viewingSeasonId}
                onChange={(event) => setViewingSeasonId(event.target.value)}
                className="w-full md:w-60 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                {[...seasons].sort((a, b) => b.number - a.number).map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.title}{season.id === currentSeasonId ? " (current)" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {isViewingArchivedSeason && (
          <div role="status" className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Archive className="w-5 h-5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="min-w-0 text-sm">
                <p className="font-bold text-amber-900 dark:text-amber-200">
                  Viewing {viewingSeason?.title || "a past season"} (final)
                </p>
                <p className="text-amber-800/80 dark:text-amber-200/70">
                  {seasonHistory.loading
                    ? "Loading archived results..."
                    : archivedSnapshot?.championTeamName
                      ? <span className="inline-flex items-center gap-1"><Crown className="w-3.5 h-3.5" /> Champion: <strong>{archivedSnapshot.championTeamName}</strong></span>
                      : seasonHistory.error || (!archivedSnapshot ? "This season's archive could not be found." : "No champion was recorded for this season.")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewingSeasonId(currentSeasonId)}
              className="shrink-0 rounded-xl bg-amber-600 hover:bg-amber-700 text-[#fff] px-4 py-2 text-sm font-bold transition-colors"
            >
              Back to current season
            </button>
          </div>
        )}

        {/* Main Tab Switcher */}
        <div data-tour="stats-tabs" className="flex p-1.5 bg-slate-100 dark:bg-neutral-900/80 rounded-2xl w-full max-w-md mx-auto backdrop-blur-md border border-slate-200 dark:border-white/10">
          <button
            onClick={() => setActiveTab("team")}
            className={`flex-1 flex items-center justify-center gap-2 min-w-0 py-3 px-2 sm:px-6 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "team" ? "bg-emerald-700 text-[#fff] shadow-lg shadow-emerald-500/20" : "text-[var(--text-muted)] dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Trophy className="w-4 h-4" /> Team Standings
          </button>
          <button
            onClick={() => setActiveTab("individual")}
            className={`flex-1 flex items-center justify-center gap-2 min-w-0 py-3 px-2 sm:px-6 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "individual" ? "bg-blue-700 text-[#fff] shadow-lg shadow-blue-500/20" : "text-[var(--text-muted)] dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" /> Individual Stats
          </button>
          {hasArchivedSeasons && (
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 flex items-center justify-center gap-2 min-w-0 py-3 px-2 sm:px-6 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === "history" ? "bg-cyan-700 text-[#fff] shadow-lg shadow-cyan-500/20" : "text-[var(--text-muted)] dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <History className="w-4 h-4" /> History
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* TEAM STANDINGS VIEW */}
          {activeTab === "team" && (
            <div data-tour="stats-standings" className="bg-neutral-900/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl mt-4">
              <div className="bg-neutral-900/80 px-4 sm:px-8 py-5 sm:py-6 border-b border-white/5 flex items-center gap-3">
                <Trophy className="w-6 h-6 text-amber-400" />
                <h2 className="text-2xl font-black uppercase tracking-tight">Team Standings</h2>
              </div>

              <p className="px-4 py-2 text-xs text-[var(--text-muted)] sm:hidden">Swipe the table to see more stats.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[520px] sm:min-w-[700px]">
                  <thead>
                    <tr className="bg-black/50 text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider">
                      <th className="py-3 px-2 sm:py-4 sm:px-6">Rank</th>
                      <th className="sticky left-0 z-10 bg-neutral-900 py-3 px-2 sm:py-4 sm:px-6 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSortTeam("name")}>
                        <div className="flex items-center gap-1">
                          Team {sortTeam.key === "name" && (sortTeam.direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <ThTeam label="Played" sortKey="played" />
                      <ThTeam label="W" sortKey="won" className="text-emerald-500" />
                      <ThTeam label="L" sortKey="lost" className="text-red-500" />
                      <ThTeam label="T" sortKey="tied" />
                      <ThTeam label="PF" sortKey="pf" />
                      <ThTeam label="PA" sortKey="pa" />
                      <ThTeam label="DIFF" sortKey="diff" />
                      <ThTeam label="PTS" sortKey="pts" className="text-white" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sortedStandings.map((row, index) => (
                      <tr key={row.id} className="hover:bg-white/5 transition-colors group">
                        <td className="py-3 px-2 sm:py-4 sm:px-6">
                          <span
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                              (row as any).rank === 1
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                                : "text-neutral-400 bg-white/5"
                            }`}
                          >
                            {(row as any).rank || index + 1}
                          </span>
                        </td>
                        <td className="sticky left-0 z-10 bg-neutral-900 py-3 px-2 sm:py-4 sm:px-6 font-bold text-base sm:text-lg" title={row.name}>
                          <Link href={`/teams/${row.id}`} className="hover:text-cyan-400 transition-colors flex items-center gap-2">
                            <span className={`whitespace-nowrap ${row.shortcode ? "hidden sm:inline" : "max-w-[7rem] truncate sm:max-w-none"}`}>{row.name}</span>
                            <span className="text-xs text-[var(--text-muted)] font-mono px-1.5 py-0.5 bg-white/5 rounded border border-white/5">{row.shortcode}</span>
                          </Link>
                        </td>
                        <td className="py-3 px-2 sm:py-4 sm:px-6 text-center text-neutral-400">{row.played}</td>
                        <td className="py-3 px-2 sm:py-4 sm:px-6 text-center font-bold text-emerald-400">{row.won}</td>
                        <td className="py-3 px-2 sm:py-4 sm:px-6 text-center font-bold text-red-400">{row.lost}</td>
                        <td className="py-3 px-2 sm:py-4 sm:px-6 text-center text-[var(--text-muted)]">{row.tied}</td>
                        <td className="py-3 px-2 sm:py-4 sm:px-6 text-center text-neutral-300">{row.pf}</td>
                        <td className="py-3 px-2 sm:py-4 sm:px-6 text-center text-neutral-300">{row.pa}</td>
                        <td className="py-3 px-2 sm:py-4 sm:px-6 text-center">
                          <span
                            className={`px-2 py-1 rounded-md text-xs font-bold ${
                              row.diff > 0 ? "bg-emerald-500/10 text-emerald-400" : row.diff < 0 ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300" : "text-[var(--text-muted)]"
                            }`}
                          >
                            {row.diff > 0 ? "+" : ""}
                            {row.diff}
                          </span>
                        </td>
                        <td className="py-3 px-2 sm:py-4 sm:px-6 text-center font-black text-xl text-white">{row.pts}</td>
                      </tr>
                    ))}
                    {displayStandings.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-[var(--text-muted)]">
                          No completed matches found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INDIVIDUAL STATS VIEW */}
          {activeTab === "individual" && (
            <div data-tour="stats-individual" className="space-y-6">
              {/* Individual Header & Mode Toggle */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-900/60 border border-white/5 rounded-2xl p-4 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-400">
                    {indivViewMode === "leaders" ? <Trophy className="w-5 h-5" /> : <TableIcon className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">
                      {indivViewMode === "leaders" ? "League Stat Leaders" : "Comprehensive Player Leaderboard"}
                    </h2>
                    <p className="text-xs text-neutral-400">
                      {indivViewMode === "leaders"
                        ? "Top 3 performers in each key category. Click 'View Full Stats' to inspect all players."
                        : "Sortable individual statistics across all games."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto">
                  <div className="flex p-1 bg-black/60 rounded-xl border border-white/10 w-full sm:w-auto">
                    <button
                      onClick={() => setIndivViewMode("leaders")}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        indivViewMode === "leaders" ? "bg-cyan-600 text-white shadow" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" /> Leaders
                    </button>
                    <button
                      onClick={() => setIndivViewMode("table")}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        indivViewMode === "table" ? "bg-cyan-600 text-white shadow" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <TableIcon className="w-3.5 h-3.5" /> Full Table
                    </button>
                  </div>
                </div>
              </div>

              {/* MODE 1: STAT LEADERS CARDS (Category Leaders with "View Full Stats" button) */}
              {indivViewMode === "leaders" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {statCategories.map((cat, idx) => {
                    const top3 = getTop3(cat.key);

                    return (
                      <div
                        key={idx}
                        className="bg-neutral-900/70 border border-white/5 rounded-3xl p-6 flex flex-col justify-between hover:border-white/15 hover:bg-neutral-900 transition-all shadow-xl group backdrop-blur-md"
                      >
                        <div>
                          {/* Card Header */}
                          <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                            <div className={`p-2 bg-white/5 rounded-xl ${cat.color} group-hover:scale-110 transition-transform`}>
                              <cat.icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-lg font-black uppercase tracking-wider text-white">{cat.title}</h3>
                              <span className="text-[11px] text-[var(--text-muted)] font-medium capitalize">{("group" in cat && cat.group) || cat.subtab} Category</span>
                            </div>
                          </div>

                          {/* Top 3 List */}
                          <div className="flex flex-col gap-4 mb-6">
                            {top3.length > 0 ? (
                              top3.map((player, rank) => (
                                <div key={player.name} className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={`w-6 text-center font-black ${
                                        rank === 0 ? "text-amber-400 text-lg" : rank === 1 ? "text-neutral-300" : "text-[var(--text-muted)]"
                                      }`}
                                    >
                                      #{rank + 1}
                                    </span>
                                    <div>
                                      <div className="font-bold text-neutral-200 group-hover:text-white transition-colors text-sm">
                                        {player.name}
                                        {player.number && <span className="text-[var(--text-muted)] font-normal ml-1.5">#{player.number}</span>}
                                      </div>
                                      <div className="text-[11px] text-neutral-400 font-medium flex items-center gap-1.5">
                                        <span className="px-1.5 py-0.2 bg-white/5 rounded text-[10px] text-neutral-400 font-mono border border-white/5">
                                          {player.teamShortcode}
                                        </span>
                                        <span>{player.teamName}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <span className={`font-black text-2xl tabular-nums ${rank === 0 ? "text-white" : "text-neutral-400"}`}>
                                    {player[cat.key]}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="text-[var(--text-muted)] font-medium text-xs text-center py-6">No recorded stats yet</div>
                            )}
                          </div>
                        </div>

                        {/* View Full Stats Button */}
                        <button
                          onClick={() => handleOpenFullStats(cat.subtab, cat.key)}
                          data-guide-name="View Full Stats"
                          className="w-full mt-2 py-3 px-4 rounded-xl bg-white/5 hover:bg-cyan-600 text-neutral-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 border border-white/10 hover:border-cyan-500 group-hover:shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.25)]"
                        >
                          <span>View Full {cat.title} Stats</span>
                          <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* MODE 2: FULL INDIVIDUAL STATS TABLE */}
              {indivViewMode === "table" && (
                <div className="bg-neutral-900/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl">
                  {/* Table Control Header */}
                  <div className="bg-neutral-900 px-6 py-5 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIndivViewMode("leaders")}
                        className="inline-flex items-center text-xs font-bold text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back to Stat Leaders
                      </button>
                      <div className="h-4 w-[1px] bg-white/10 hidden sm:block"></div>
                      <span className="text-sm font-semibold text-neutral-300 capitalize">
                        Viewing <span className="text-white font-bold">{individualTab}</span> leaderboards
                      </span>
                    </div>

                    {/* Sub-Tabs for Stats Categories */}
                    <div className="flex overflow-x-auto max-w-full bg-black rounded-xl border border-white/10 p-1 shrink-0 scrollbar-none">
                      <button
                        onClick={() => {
                          setIndividualTab("passing");
                          setSortIndiv({ key: "passTD", direction: "desc" });
                        }}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                          individualTab === "passing" ? "bg-cyan-600 text-white shadow" : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        Passing
                      </button>
                      <button
                        onClick={() => {
                          setIndividualTab("receiving");
                          setSortIndiv({ key: "receptions", direction: "desc" });
                        }}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                          individualTab === "receiving" ? "bg-cyan-600 text-white shadow" : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        Receiving / Rushing
                      </button>
                      <button
                        onClick={() => {
                          setIndividualTab("defense");
                          setSortIndiv({ key: "flagPulls", direction: "desc" });
                        }}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                          individualTab === "defense" ? "bg-cyan-600 text-white shadow" : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        Defense
                      </button>
                    </div>
                  </div>

                  {/* Table */}
                  <p className="px-4 py-2 text-xs text-[var(--text-muted)] sm:hidden">Swipe the table to see more stats.</p>
              <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px] sm:min-w-[850px]">
                      <thead>
                        {individualTab === "passing" && (
                          <tr className="bg-black/50 text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider">
                            <th className="py-3 px-2 sm:py-4 sm:px-6">Rank</th>
                            <th className="sticky left-0 z-10 bg-neutral-900 py-3 px-2 sm:py-4 sm:px-6 cursor-pointer hover:bg-white/5" onClick={() => handleSortIndiv("name")}>
                              <div className="flex items-center gap-1">
                                Player{" "}
                                {sortIndiv.key === "name" &&
                                  (sortIndiv.direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                              </div>
                            </th>
                            <th className="py-3 px-2 sm:py-4 sm:px-6 cursor-pointer hover:bg-white/5" onClick={() => handleSortIndiv("teamName")}>
                              <div className="flex items-center gap-1">
                                Team{" "}
                                {sortIndiv.key === "teamName" &&
                                  (sortIndiv.direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                              </div>
                            </th>
                            <ThIndiv label="GP" sortKey="gamesPlayed" className="text-neutral-300" />
                            <ThIndiv label="Comp/Att (%)" sortKey="compPct" className="text-blue-400" />
                            <ThIndiv label="Pass TD" sortKey="passTD" className="text-emerald-400" />
                            <ThIndiv label="INT" sortKey="passInt" className="text-red-400" />
                            <ThIndiv label="PAT Conv" sortKey="convPass" className="text-purple-400" />
                          </tr>
                        )}
                        {individualTab === "receiving" && (
                          <tr className="bg-black/50 text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider">
                            <th className="py-3 px-2 sm:py-4 sm:px-6">Rank</th>
                            <th className="sticky left-0 z-10 bg-neutral-900 py-3 px-2 sm:py-4 sm:px-6 cursor-pointer hover:bg-white/5" onClick={() => handleSortIndiv("name")}>
                              <div className="flex items-center gap-1">
                                Player{" "}
                                {sortIndiv.key === "name" &&
                                  (sortIndiv.direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                              </div>
                            </th>
                            <th className="py-3 px-2 sm:py-4 sm:px-6 cursor-pointer hover:bg-white/5" onClick={() => handleSortIndiv("teamName")}>
                              <div className="flex items-center gap-1">
                                Team{" "}
                                {sortIndiv.key === "teamName" &&
                                  (sortIndiv.direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                              </div>
                            </th>
                            <ThIndiv label="GP" sortKey="gamesPlayed" className="text-neutral-300" />
                            <ThIndiv label="Receptions" sortKey="receptions" className="text-blue-400" />
                            <ThIndiv label="Rec TD" sortKey="recTD" className="text-emerald-400" />
                            <ThIndiv label="Rush Att" sortKey="rushAtt" className="text-amber-400" />
                            <ThIndiv label="Rush TD" sortKey="rushTD" className="text-emerald-400" />
                            <ThIndiv label="PAT Conv" sortKey="convRec" className="text-purple-400" />
                          </tr>
                        )}
                        {individualTab === "defense" && (
                          <tr className="bg-black/50 text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider">
                            <th className="py-3 px-2 sm:py-4 sm:px-6">Rank</th>
                            <th className="sticky left-0 z-10 bg-neutral-900 py-3 px-2 sm:py-4 sm:px-6 cursor-pointer hover:bg-white/5" onClick={() => handleSortIndiv("name")}>
                              <div className="flex items-center gap-1">
                                Player{" "}
                                {sortIndiv.key === "name" &&
                                  (sortIndiv.direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                              </div>
                            </th>
                            <th className="py-3 px-2 sm:py-4 sm:px-6 cursor-pointer hover:bg-white/5" onClick={() => handleSortIndiv("teamName")}>
                              <div className="flex items-center gap-1">
                                Team{" "}
                                {sortIndiv.key === "teamName" &&
                                  (sortIndiv.direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                              </div>
                            </th>
                            <ThIndiv label="GP" sortKey="gamesPlayed" className="text-neutral-300" />
                            <ThIndiv label="Flags" sortKey="flagPulls" className="text-amber-400" />
                            <ThIndiv label="INT" sortKey="int" className="text-blue-400" />
                            <ThIndiv label="Def TD" sortKey="defTD" className="text-emerald-400" />
                            <ThIndiv label="Sacks" sortKey="sacks" className="text-red-400" />
                            <ThIndiv label="FFL" sortKey="ffl" className="text-orange-400" />
                            <ThIndiv label="PBU" sortKey="pbu" className="text-neutral-400" />
                            <ThIndiv label="Safeties" sortKey="safeties" className="text-red-600" />
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {sortedIndividualStats.map((row, index) => (
                          <tr key={row.name} className="hover:bg-white/5 transition-colors group">
                            <td className="py-3 px-2 sm:py-4 sm:px-6">
                              <span
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                  index === 0
                                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                    : "text-neutral-400 bg-white/5"
                                }`}
                              >
                                {index + 1}
                              </span>
                            </td>
                            <td className="sticky left-0 z-10 bg-neutral-900 py-3 px-2 sm:py-4 sm:px-6 font-bold text-sm sm:text-base whitespace-nowrap" title={row.name}>
                              <span className="sm:hidden">{shortPlayerName(row.name)}</span>
                              <span className="hidden sm:inline">{row.name}</span>
                              {row.number && <span className="text-[var(--text-muted)] text-xs font-normal ml-2">#{row.number}</span>}
                            </td>
                            <td className="py-3 px-2 sm:py-4 sm:px-6 text-neutral-300 text-sm whitespace-nowrap" title={row.teamName}>
                              <Link href={`/teams/${row.teamId}`} className="hover:text-cyan-400 transition-colors">
                                {teamCodeById.get(row.teamId) ? (
                                  <>
                                    <span className="sm:hidden font-mono">{teamCodeById.get(row.teamId)}</span>
                                    <span className="hidden sm:inline">{row.teamName}</span>
                                  </>
                                ) : row.teamName}
                              </Link>
                            </td>
                            <td className="py-3 px-2 sm:py-4 sm:px-6 text-center text-neutral-300 font-medium">{row.gamesPlayed}</td>

                            {individualTab === "passing" && (
                              <>
                                <td className="py-3 px-2 sm:py-4 sm:px-6 text-center font-medium text-blue-200 whitespace-nowrap">
                                  {row.passComp}/{row.passAtt} ({row.passAtt > 0 ? Math.round((row.passComp / row.passAtt) * 100) : 0}%)
                                </td>
                                <td className="py-3 px-2 sm:py-4 sm:px-6 text-center font-black text-emerald-400 text-lg">{row.passTD}</td>
                                <td className="py-3 px-2 sm:py-4 sm:px-6 text-center font-medium text-red-400">{row.passInt}</td>
                                <td className="py-3 px-2 sm:py-4 sm:px-6 text-center font-medium text-purple-400">{row.convPass}</td>
                              </>
                            )}

                            {individualTab === "receiving" && (
                              <>
                                <td className="py-3 px-2 sm:py-4 sm:px-6 text-center font-black text-blue-400 text-lg">{row.receptions}</td>
                                <td className="py-3 px-2 sm:py-4 sm:px-6 text-center font-bold text-emerald-400">{row.recTD}</td>
                                <td className="py-3 px-2 sm:py-4 sm:px-6 text-center font-medium text-amber-400">{row.rushAtt}</td>
                                <td className="py-3 px-2 sm:py-4 sm:px-6 text-center font-medium text-emerald-400">{row.rushTD}</td>
                                <td className="py-3 px-2 sm:py-4 sm:px-6 text-center font-medium text-purple-400">{row.convRec}</td>
                              </>
                            )}

                            {individualTab === "defense" && (
                              <>
                                <td className="py-3 px-2 sm:py-4 sm:px-6 text-center font-black text-amber-400 text-lg">{row.flagPulls}</td>
                                <td className="py-3 px-2 sm:py-4 sm:px-6 text-center font-bold text-blue-400">{row.int}</td>
                                <td className="py-3 px-2 sm:py-4 sm:px-6 text-center font-bold text-emerald-400">{row.defTD}</td>
                                <td className="py-3 px-2 sm:py-4 sm:px-6 text-center font-medium text-red-400">{row.sacks}</td>
                                <td className="py-3 px-2 sm:py-4 sm:px-6 text-center font-medium text-orange-400">{row.ffl}</td>
                                <td className="py-3 px-2 sm:py-4 sm:px-6 text-center font-medium text-neutral-400">{row.pbu}</td>
                                <td className="py-3 px-2 sm:py-4 sm:px-6 text-center font-medium text-red-600">{row.safeties}</td>
                              </>
                            )}
                          </tr>
                        ))}
                        {sortedIndividualStats.length === 0 && (
                          <tr>
                            <td colSpan={10} className="py-12 text-center text-[var(--text-muted)]">
                              No players found with stats in this category yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && hasArchivedSeasons && (
            <SeasonHistoryPanel
              seasons={seasons}
              snapshots={seasonHistory.snapshots}
              currentSeasonId={currentSeasonId}
              livePlayerStats={individualStats as PlayerStatLine[]}
              loading={seasonHistory.loading}
              error={seasonHistory.error}
              onViewSeason={(seasonId) => {
                setViewingSeasonId(seasonId);
                setActiveTab("team");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}
        </div>
      </div>

    </div>
  );
}
