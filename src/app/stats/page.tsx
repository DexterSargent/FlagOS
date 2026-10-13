"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Activity,
  Trophy,
  Users,
  Crosshair,
  Shield,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  Table as TableIcon,
  Flame
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { getTeamShortcode, isRealTeam } from "@/components/TeamAssets";
import { useLeague } from "@/lib/leagueContext";
import LeagueHeader from "@/components/LeagueHeader";
import LeagueFooter from "@/components/LeagueFooter";
import { renderFlagOS } from "@/components/FlagOSText";
import {
  getSandboxTeams,
  getSandboxPlayers,
  getSandboxMatches,
  getSandboxPlays,
  subscribeDemoSandbox,
} from "@/lib/demoSandbox";

export default function StatsAndStandings() {
  const { settings, isDemoLeague } = useLeague();
  const [activeTab, setActiveTab] = useState<"team" | "individual">("team");
  const [indivViewMode, setIndivViewMode] = useState<"leaders" | "table">("leaders");
  const [individualTab, setIndividualTab] = useState<"passing" | "receiving" | "defense">("passing");

  const [sortTeam, setSortTeam] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "pts", direction: "desc" });
  const [sortIndiv, setSortIndiv] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "", direction: "desc" });

  const [standings, setStandings] = useState<any[]>([]);
  const [individualStats, setIndividualStats] = useState<any[]>([]);
  const [teamsData, setTeamsData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        let teams: any[];
        let players: any[];
        let matches: any[];
        let plays: any[];

        if (isDemoLeague) {
          teams = getSandboxTeams().filter(isRealTeam);
          players = getSandboxPlayers();
          matches = getSandboxMatches().filter(
            (m: any) => m.homeTeamId !== "team_free_agents" && m.awayTeamId !== "team_free_agents"
          );
          plays = getSandboxPlays();
        } else {
          const [teamsSnap, playersSnap, matchesSnap, playsSnap] = await Promise.all([
            getDocs(collection(db, "teams")),
            getDocs(collection(db, "players")),
            getDocs(collection(db, "matches")),
            getDocs(collection(db, "plays")),
          ]);

          teams = teamsSnap.docs
            .map((d) => ({ id: d.id, ...(d.data() as any) }))
            .filter(isRealTeam);
          players = playersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          matches = matchesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          plays = playsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        }

        // === TEAM STANDINGS ===
        const teamsMap: Record<string, any> = {};
        teams.forEach((t) => {
          teamsMap[t.id] = {
            id: t.id,
            name: t.name,
            shortcode: t.shortcode || getTeamShortcode(t),
            played: 0,
            won: 0,
            lost: 0,
            tied: 0,
            pf: 0,
            pa: 0,
            diff: 0,
            pts: 0,
          };
        });
        setTeamsData(teamsMap);

        // === INDIVIDUAL STATS ===
        const statsMap: Record<string, any> = {};
        players.forEach((p) => {
          statsMap[p.playerName] = {
            name: p.playerName,
            number: p.number || p.jerseyNumber || "",
            teamId: p.teamId,
            teamName: teamsMap[p.teamId]?.name || "Unknown",
            teamShortcode: teamsMap[p.teamId]?.shortcode || getTeamShortcode(null, teamsMap[p.teamId]?.name),
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
            convPass: 0,
            convRec: 0,
            pbu: 0,
            safeties: 0,
            ffl: 0,
            totalTDs: 0,
          };
        });

        // Matches calculation
        matches.forEach((m) => {
          if (m.status === "completed" && typeof m.homeScore === "number" && typeof m.awayScore === "number" && !m.isHidden) {
            const h = teamsMap[m.homeTeamId];
            const a = teamsMap[m.awayTeamId];
            if (h && a) {
              if (!m.isPreseason) {
                h.played += 1;
                a.played += 1;
                h.pf += m.homeScore;
                h.pa += m.awayScore;
                a.pf += m.awayScore;
                a.pa += m.homeScore;

                if (m.homeScore > m.awayScore) {
                  h.won += 1;
                  h.pts += 2;
                  a.lost += 1;
                } else if (m.homeScore < m.awayScore) {
                  a.won += 1;
                  a.pts += 2;
                  h.lost += 1;
                } else {
                  h.tied += 1;
                  h.pts += 1;
                  a.tied += 1;
                  a.pts += 1;
                }

                const dnp = m.didNotPlay || [];
                let matchPlayerNames: string[] = [];
                if (m.roster && m.roster.home && m.roster.away) {
                  matchPlayerNames = [...m.roster.home, ...m.roster.away];
                } else {
                  const homeP = players.filter((p) => p.teamId === m.homeTeamId);
                  const awayP = players.filter((p) => p.teamId === m.awayTeamId);
                  matchPlayerNames = [...homeP, ...awayP].map((p) => p.playerName);
                }

                matchPlayerNames.forEach((playerName) => {
                  if (statsMap[playerName] && !dnp.includes(playerName)) {
                    statsMap[playerName].gamesPlayed += 1;
                  }
                });
              }
            }
          }
        });

        const computedStandings = Object.values(teamsMap)
          .filter(isRealTeam)
          .map((t) => {
            t.diff = t.pf - t.pa;
            return t;
          });

        const sortedForRank = [...computedStandings].sort((a, b) => {
          if (a.pts !== b.pts) return b.pts - a.pts;

          const h2hMatches = matches.filter(
            (m) =>
              m.status === "completed" &&
              ((m.homeTeamId === a.id && m.awayTeamId === b.id) || (m.homeTeamId === b.id && m.awayTeamId === a.id))
          );

          if (h2hMatches.length > 0) {
            let aWins = 0;
            let bWins = 0;
            h2hMatches.forEach((m) => {
              const aIsHome = m.homeTeamId === a.id;
              const aScore = aIsHome ? m.homeScore : m.awayScore;
              const bScore = aIsHome ? m.awayScore : m.homeScore;
              if (aScore > bScore) aWins++;
              else if (bScore > aScore) bWins++;
            });
            if (aWins !== bWins) return bWins - aWins;
          }
          return b.diff - a.diff;
        });

        sortedForRank.forEach((team, idx) => {
          const originalTeam = computedStandings.find((t) => t.id === team.id);
          if (originalTeam) (originalTeam as any).rank = idx + 1;
        });

        // Completed matches set (only stats from completed games are tracked)
        const completedMatchIds = new Set(
          matches
            .filter((m) => (m.status === "completed" || m.status === "Final") && !m.isHidden)
            .map((m) => m.id)
        );

        // Plays aggregation (strictly for completed matches)
        plays.forEach((play) => {
          if (!play.matchId || !completedMatchIds.has(play.matchId)) return;
          const isEligible = (name: string) => name && statsMap[name];

          // Passing
          if (play.playType === "Pass" && isEligible(play.qbPlayerId)) {
            statsMap[play.qbPlayerId].passAtt += 1;
            if (play.passOutcome === "Complete") {
              statsMap[play.qbPlayerId].passComp += 1;
            } else if (play.passOutcome === "Interception") {
              statsMap[play.qbPlayerId].passInt += 1;
            }

            if (play.isTouchdown) {
              statsMap[play.qbPlayerId].passTD += 1;
              statsMap[play.qbPlayerId].totalTDs += 1;
            }
            if (play.isConversion) {
              statsMap[play.qbPlayerId].convPass += 1;
            }
          }

          // Receiving
          if (play.playType === "Pass" && play.passOutcome === "Complete" && isEligible(play.receiverPlayerId)) {
            statsMap[play.receiverPlayerId].receptions += 1;
            if (play.isTouchdown) {
              statsMap[play.receiverPlayerId].recTD += 1;
              statsMap[play.receiverPlayerId].totalTDs += 1;
            }
            if (play.isConversion) {
              statsMap[play.receiverPlayerId].convRec += 1;
            }
          }

          // Rushing
          if (play.playType === "Run" && isEligible(play.runnerPlayerId)) {
            statsMap[play.runnerPlayerId].rushAtt += 1;
            if (play.isTouchdown) {
              statsMap[play.runnerPlayerId].rushTD += 1;
              statsMap[play.runnerPlayerId].totalTDs += 1;
            }
            if (play.isConversion) {
              statsMap[play.runnerPlayerId].convRec += 1;
            }
          }

          // Defense
          if (play.defenders && Array.isArray(play.defenders)) {
            play.defenders.forEach((defenderName: string) => {
              if (!isEligible(defenderName)) return;

              if (play.passOutcome === "Interception") {
                statsMap[defenderName].int += 1;
                if (play.isPick6) {
                  statsMap[defenderName].defTD += 1;
                  statsMap[defenderName].totalTDs += 1;
                }
              } else if (play.passOutcome === "PBU") {
                statsMap[defenderName].pbu += 1;
              } else if (play.passOutcome === "Sack") {
                statsMap[defenderName].sacks += 1;
                statsMap[defenderName].flagPulls += 1;
                if (play.isSafety) statsMap[defenderName].safeties += 1;
              } else if (play.passOutcome === "FFL") {
                statsMap[defenderName].ffl += 1;
                statsMap[defenderName].flagPulls += 1;
                if (play.isSafety) statsMap[defenderName].safeties += 1;
              } else {
                statsMap[defenderName].flagPulls += 1;
                if (play.isSafety) statsMap[defenderName].safeties += 1;
              }
            });
          }

          // Interception Flaggers
          if (play.passOutcome === "Interception" && play.flaggers && Array.isArray(play.flaggers)) {
            play.flaggers.forEach((flaggerName: string) => {
              if (isEligible(flaggerName)) {
                statsMap[flaggerName].flagPulls += 1;
              }
            });
          }
        });

        setStandings(computedStandings);
        setIndividualStats(Object.values(statsMap));
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
  }, [isDemoLeague]);

  // Helper for Top 3 in any category
  const getTop3 = (key: string) => {
    const sorted = [...individualStats].sort((a, b) => (b[key] || 0) - (a[key] || 0)).filter((p) => (p[key] || 0) > 0);
    return sorted.slice(0, 3);
  };

  const statCategories = [
    { title: "Total Touchdowns", key: "totalTDs", subtab: "receiving" as const, icon: Trophy, color: "text-yellow-400" },
    { title: "Passing TDs", key: "passTD", subtab: "passing" as const, icon: Crosshair, color: "text-cyan-400" },
    { title: "Completions", key: "passComp", subtab: "passing" as const, icon: Crosshair, color: "text-sky-400" },
    { title: "Receptions", key: "receptions", subtab: "receiving" as const, icon: Activity, color: "text-blue-400" },
    { title: "Receiving TDs", key: "recTD", subtab: "receiving" as const, icon: Activity, color: "text-blue-400" },
    { title: "Rushing TDs", key: "rushTD", subtab: "receiving" as const, icon: Flame, color: "text-emerald-400" },
    { title: "Flag Pulls", key: "flagPulls", subtab: "defense" as const, icon: Shield, color: "text-amber-400" },
    { title: "Sacks", key: "sacks", subtab: "defense" as const, icon: Shield, color: "text-orange-500" },
    { title: "Interceptions", key: "int", subtab: "defense" as const, icon: Shield, color: "text-purple-400" },
    { title: "Pass Breakups", key: "pbu", subtab: "defense" as const, icon: Shield, color: "text-cyan-400" },
  ];

  // Handler for clicking "View Full Stats" on any stat leaders section
  const handleOpenFullStats = (subtab: "passing" | "receiving" | "defense", sortKey: string) => {
    setIndividualTab(subtab);
    setSortIndiv({ key: sortKey, direction: "desc" });
    setIndivViewMode("table");
  };

  const getSortedStandings = () => {
    return [...standings].sort((a, b) => {
      const valA = a[sortTeam.key];
      const valB = b[sortTeam.key];
      if (valA < valB) return sortTeam.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortTeam.direction === "asc" ? 1 : -1;
      return sortTeam.direction === "asc" ? (b as any).rank - (a as any).rank : (a as any).rank - (b as any).rank;
    });
  };

  const getSortedIndividualStats = () => {
    let sorted = [...individualStats];

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
    <th className={`py-4 px-6 cursor-pointer hover:bg-white/5 transition-colors ${className}`} onClick={() => handleSortTeam(sortKey)}>
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
      <th className={`py-4 px-6 cursor-pointer hover:bg-white/5 transition-colors ${className}`} onClick={() => handleSortIndiv(sortKey)}>
        <div className="flex items-center justify-center gap-1">
          {label}
          {isCurrent && (sortIndiv.direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
        </div>
      </th>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090E] text-white flex flex-col justify-between font-sans">
        <LeagueHeader activePage="stats" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <LeagueFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090E] text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col justify-between">
      <LeagueHeader activePage="stats" />

      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-cyan-900/15 rounded-full blur-[160px]"></div>
        <div className="absolute bottom-10 left-10 w-[35rem] h-[35rem] bg-blue-900/10 rounded-full blur-[170px]"></div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10 w-full px-6 py-8 flex-1">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-bold text-cyan-300 uppercase tracking-widest">
                {settings.seasonTitle || "Active Season"} Leaderboards
              </span>
              <span className="text-neutral-500 text-xs">•</span>
              <span className="text-[11px] font-mono text-neutral-400">
                Official Rules: {settings.rulebookTitle || "7v7 Non-Contact Rules"}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight flex items-center gap-3">
              <Activity className="w-8 h-8 md:w-10 md:h-10 text-cyan-400" />
              <span>{renderFlagOS(settings.leagueName)} Standings & Stats</span>
            </h1>
            <p className="text-neutral-400 text-xs md:text-sm mt-1 max-w-xl">
              Official team rankings, division tiebreakers, and individual statistical leaderboards.
            </p>
          </div>
        </div>

        {/* Main Tab Switcher */}
        <div className="flex p-1.5 bg-neutral-900/80 rounded-2xl w-full max-w-md mx-auto backdrop-blur-md border border-white/10">
          <button
            onClick={() => setActiveTab("team")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold transition-all ${
              activeTab === "team" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Trophy className="w-4 h-4" /> Team Standings
          </button>
          <button
            onClick={() => setActiveTab("individual")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold transition-all ${
              activeTab === "individual" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" /> Individual Stats
          </button>
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* TEAM STANDINGS VIEW */}
          {activeTab === "team" && (
            <div className="bg-neutral-900/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl mt-4">
              <div className="bg-neutral-900/80 px-8 py-6 border-b border-white/5 flex items-center gap-3">
                <Trophy className="w-6 h-6 text-amber-400" />
                <h2 className="text-2xl font-black uppercase tracking-tight">Team Standings</h2>
              </div>

              <div className="overflow-x-auto hide-scrollbar">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-black/50 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-4 px-6">Rank</th>
                      <th className="py-4 px-6 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSortTeam("name")}>
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
                        <td className="py-4 px-6">
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
                        <td className="py-4 px-6 font-bold text-lg">
                          <Link href={`/teams/${row.id}`} className="hover:text-cyan-400 transition-colors flex items-center gap-2">
                            <span>{row.name}</span>
                            <span className="text-xs text-neutral-500 font-mono px-1.5 py-0.5 bg-white/5 rounded border border-white/5">{row.shortcode}</span>
                          </Link>
                        </td>
                        <td className="py-4 px-6 text-center text-neutral-400">{row.played}</td>
                        <td className="py-4 px-6 text-center font-bold text-emerald-400">{row.won}</td>
                        <td className="py-4 px-6 text-center font-bold text-red-400">{row.lost}</td>
                        <td className="py-4 px-6 text-center text-neutral-500">{row.tied}</td>
                        <td className="py-4 px-6 text-center text-neutral-300">{row.pf}</td>
                        <td className="py-4 px-6 text-center text-neutral-300">{row.pa}</td>
                        <td className="py-4 px-6 text-center">
                          <span
                            className={`px-2 py-1 rounded-md text-xs font-bold ${
                              row.diff > 0 ? "bg-emerald-500/10 text-emerald-400" : row.diff < 0 ? "bg-red-500/10 text-red-400" : "text-neutral-500"
                            }`}
                          >
                            {row.diff > 0 ? "+" : ""}
                            {row.diff}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center font-black text-xl text-white">{row.pts}</td>
                      </tr>
                    ))}
                    {standings.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-neutral-500">
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
            <div className="space-y-6">
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
                        indivViewMode === "leaders" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" /> Leaders
                    </button>
                    <button
                      onClick={() => setIndivViewMode("table")}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        indivViewMode === "table" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow" : "text-neutral-400 hover:text-white"
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
                              <span className="text-[11px] text-neutral-500 font-medium capitalize">{cat.subtab} Category</span>
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
                                        rank === 0 ? "text-amber-400 text-lg" : rank === 1 ? "text-neutral-300" : "text-neutral-500"
                                      }`}
                                    >
                                      #{rank + 1}
                                    </span>
                                    <div>
                                      <div className="font-bold text-neutral-200 group-hover:text-white transition-colors text-sm">
                                        {player.name}
                                        {player.number && <span className="text-neutral-500 font-normal ml-1.5">#{player.number}</span>}
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
                              <div className="text-neutral-500 font-medium text-xs text-center py-6">No recorded stats yet</div>
                            )}
                          </div>
                        </div>

                        {/* View Full Stats Button */}
                        <button
                          onClick={() => handleOpenFullStats(cat.subtab, cat.key)}
                          className="w-full mt-2 py-3 px-4 rounded-xl bg-white/5 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-blue-600 text-neutral-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 border border-white/10 hover:border-cyan-500 group-hover:shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.25)]"
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
                    <div className="flex bg-black rounded-xl border border-white/10 p-1">
                      <button
                        onClick={() => {
                          setIndividualTab("passing");
                          setSortIndiv({ key: "passTD", direction: "desc" });
                        }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                          individualTab === "passing" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow" : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        Passing
                      </button>
                      <button
                        onClick={() => {
                          setIndividualTab("receiving");
                          setSortIndiv({ key: "receptions", direction: "desc" });
                        }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                          individualTab === "receiving" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow" : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        Receiving / Rushing
                      </button>
                      <button
                        onClick={() => {
                          setIndividualTab("defense");
                          setSortIndiv({ key: "flagPulls", direction: "desc" });
                        }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                          individualTab === "defense" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow" : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        Defense
                      </button>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto hide-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead>
                        {individualTab === "passing" && (
                          <tr className="bg-black/50 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                            <th className="py-4 px-6">Rank</th>
                            <th className="py-4 px-6 cursor-pointer hover:bg-white/5" onClick={() => handleSortIndiv("name")}>
                              <div className="flex items-center gap-1">
                                Player{" "}
                                {sortIndiv.key === "name" &&
                                  (sortIndiv.direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                              </div>
                            </th>
                            <th className="py-4 px-6 cursor-pointer hover:bg-white/5" onClick={() => handleSortIndiv("teamName")}>
                              <div className="flex items-center gap-1">
                                Team{" "}
                                {sortIndiv.key === "teamName" &&
                                  (sortIndiv.direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                              </div>
                            </th>
                            <ThIndiv label="GP" sortKey="gamesPlayed" className="text-neutral-300" />
                            <ThIndiv label="Comp" sortKey="passComp" className="text-blue-400" />
                            <ThIndiv label="Comp %" sortKey="compPct" />
                            <ThIndiv label="Pass TD" sortKey="passTD" className="text-emerald-400" />
                            <ThIndiv label="INT" sortKey="passInt" className="text-red-400" />
                            <ThIndiv label="PAT Conv" sortKey="convPass" className="text-purple-400" />
                          </tr>
                        )}
                        {individualTab === "receiving" && (
                          <tr className="bg-black/50 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                            <th className="py-4 px-6">Rank</th>
                            <th className="py-4 px-6 cursor-pointer hover:bg-white/5" onClick={() => handleSortIndiv("name")}>
                              <div className="flex items-center gap-1">
                                Player{" "}
                                {sortIndiv.key === "name" &&
                                  (sortIndiv.direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                              </div>
                            </th>
                            <th className="py-4 px-6 cursor-pointer hover:bg-white/5" onClick={() => handleSortIndiv("teamName")}>
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
                          <tr className="bg-black/50 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                            <th className="py-4 px-6">Rank</th>
                            <th className="py-4 px-6 cursor-pointer hover:bg-white/5" onClick={() => handleSortIndiv("name")}>
                              <div className="flex items-center gap-1">
                                Player{" "}
                                {sortIndiv.key === "name" &&
                                  (sortIndiv.direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                              </div>
                            </th>
                            <th className="py-4 px-6 cursor-pointer hover:bg-white/5" onClick={() => handleSortIndiv("teamName")}>
                              <div className="flex items-center gap-1">
                                Team{" "}
                                {sortIndiv.key === "teamName" &&
                                  (sortIndiv.direction === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                              </div>
                            </th>
                            <ThIndiv label="GP" sortKey="gamesPlayed" className="text-neutral-300" />
                            <ThIndiv label="Flag Pulls" sortKey="flagPulls" className="text-amber-400" />
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
                            <td className="py-4 px-6">
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
                            <td className="py-4 px-6 font-bold text-base">
                              {row.name}
                              {row.number && <span className="text-neutral-500 text-xs font-normal ml-2">#{row.number}</span>}
                            </td>
                            <td className="py-4 px-6 text-neutral-300 text-sm">
                              <Link href={`/teams/${row.teamId}`} className="hover:text-cyan-400 transition-colors">
                                {row.teamName}
                              </Link>
                            </td>
                            <td className="py-4 px-6 text-center text-neutral-300 font-medium">{row.gamesPlayed}</td>

                            {individualTab === "passing" && (
                              <>
                                <td className="py-4 px-6 text-center font-medium text-blue-200">
                                  {row.passComp} / {row.passAtt}
                                </td>
                                <td className="py-4 px-6 text-center font-medium text-neutral-300">
                                  {row.passAtt > 0 ? Math.round((row.passComp / row.passAtt) * 100) : 0}%
                                </td>
                                <td className="py-4 px-6 text-center font-black text-emerald-400 text-lg">{row.passTD}</td>
                                <td className="py-4 px-6 text-center font-medium text-red-400">{row.passInt}</td>
                                <td className="py-4 px-6 text-center font-medium text-purple-400">{row.convPass}</td>
                              </>
                            )}

                            {individualTab === "receiving" && (
                              <>
                                <td className="py-4 px-6 text-center font-black text-blue-400 text-lg">{row.receptions}</td>
                                <td className="py-4 px-6 text-center font-bold text-emerald-400">{row.recTD}</td>
                                <td className="py-4 px-6 text-center font-medium text-amber-400">{row.rushAtt}</td>
                                <td className="py-4 px-6 text-center font-medium text-emerald-400">{row.rushTD}</td>
                                <td className="py-4 px-6 text-center font-medium text-purple-400">{row.convRec}</td>
                              </>
                            )}

                            {individualTab === "defense" && (
                              <>
                                <td className="py-4 px-6 text-center font-black text-amber-400 text-lg">{row.flagPulls}</td>
                                <td className="py-4 px-6 text-center font-bold text-blue-400">{row.int}</td>
                                <td className="py-4 px-6 text-center font-bold text-emerald-400">{row.defTD}</td>
                                <td className="py-4 px-6 text-center font-medium text-red-400">{row.sacks}</td>
                                <td className="py-4 px-6 text-center font-medium text-orange-400">{row.ffl}</td>
                                <td className="py-4 px-6 text-center font-medium text-neutral-400">{row.pbu}</td>
                                <td className="py-4 px-6 text-center font-medium text-red-600">{row.safeties}</td>
                              </>
                            )}
                          </tr>
                        ))}
                        {sortedIndividualStats.length === 0 && (
                          <tr>
                            <td colSpan={10} className="py-12 text-center text-neutral-500">
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
        </div>
      </div>

      {/* Branded League Footer */}
      <LeagueFooter />
    </div>
  );
}
