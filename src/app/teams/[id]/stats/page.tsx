"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Activity, Trophy, Crosshair, Shield, Flame } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where, limit } from "firebase/firestore";
import { useLeague } from "@/lib/leagueContext";
import {
  getSandboxTeams,
  getSandboxPlayers,
  getSandboxMatches,
  getSandboxPlays,
  subscribeDemoSandbox,
} from "@/lib/demoSandbox";
import {
  isYorkTeam,
  getYorkTeamData,
  getYorkTeamPlayers,
  getYorkTeamMatches,
  getYorkTeamPlays,
} from "@/lib/yorkTeamData";

export default function TeamStatLeadersPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const teamId = unwrappedParams.id;
  const isYork = isYorkTeam(teamId);
  const { settings, isDemoLeague } = useLeague();

  const [team, setTeam] = useState<any>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let tObj: any = null;
        let players: any[] = [];
        let matches: any[] = [];
        let plays: any[] = [];

        if (isYork) {
          tObj = { ...getYorkTeamData() };
          try {
            const [teamSnap, playersSnap] = await Promise.all([
              getDoc(doc(db, "teams", teamId)),
              getDocs(query(collection(db, "players"), where("teamId", "==", teamId), limit(30))),
            ]);
            if (teamSnap.exists()) tObj = { ...tObj, ...teamSnap.data() };
            if (!playersSnap.empty) {
              players = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
            }
          } catch {}
          if (players.length === 0) {
            players = getYorkTeamPlayers();
          }
          matches = getYorkTeamMatches();
          plays = getYorkTeamPlays();
        } else if (isDemoLeague) {
          tObj = getSandboxTeams().find((t) => t.id === teamId || (teamId === "team_apex" && t.id === "team_kc"));
          const effectiveTeamId = tObj?.id || teamId;
          players = getSandboxPlayers().filter((p) => p.teamId === effectiveTeamId);
          matches = getSandboxMatches();
          plays = getSandboxPlays();
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
          players = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          matches = matchesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          plays = playsSnap.docs.map((d) => d.data() as any);
        }

        if (tObj) setTeam(tObj);

        const statsMap: Record<string, any> = {};
        players.forEach((p: any) => {
          statsMap[p.playerName] = {
            name: p.playerName,
            number: p.number || p.jerseyNumber || "",
            gamesPlayed: 0,
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
            totalTDs: 0,
          };
        });

        // Games played
        const targetTeamId = tObj?.id || teamId;
        matches.forEach((m) => {
          if ((m.status === "completed" || m.status === "Final") && (m.homeTeamId === targetTeamId || m.awayTeamId === targetTeamId)) {
            const dnp = m.didNotPlay || [];
            players.forEach((p: any) => {
              if (statsMap[p.playerName] && !dnp.includes(p.playerName)) {
                statsMap[p.playerName].gamesPlayed += 1;
              }
            });
          }
        });

        // Completed matches set (only stats from completed games are tracked)
        const completedMatchIds = new Set(
          matches
            .filter((m: any) => (m.status === "completed" || m.status === "Final") && !m.isHidden)
            .map((m: any) => m.id)
        );

        // Plays aggregation (strictly for completed matches)
        plays.forEach((play) => {
          if (!play.matchId || !completedMatchIds.has(play.matchId)) return;
          const isEligible = (name: string) => name && statsMap[name];
          // Offensive stats only count on our possessions, defensive stats only on theirs.
          const possTeam = play.possessionTeamId;
          const weHaveBall = !possTeam || possTeam === targetTeamId || (isYork && isYorkTeam(possTeam));

          const isConversionPlay = Boolean(
            play.isConversion === true ||
            play.playType === "Conversion" ||
            (!play.isTouchdown && (
              (play.conversionAttempt !== undefined && play.conversionAttempt !== null) ||
              play.conversionSuccess === true
            ))
          );

          // Passing
          if (weHaveBall && play.playType === "Pass" && isEligible(play.qbPlayerId) && !isConversionPlay) {
            statsMap[play.qbPlayerId].passAtt += 1;
            if (play.passOutcome === "Complete") {
              statsMap[play.qbPlayerId].passComp += 1;
            }
            if (play.isTouchdown) {
              statsMap[play.qbPlayerId].passTD += 1;
              statsMap[play.qbPlayerId].totalTDs += 1;
            }
          }

          // Receiving
          if (weHaveBall && play.playType === "Pass" && play.passOutcome === "Complete" && isEligible(play.receiverPlayerId) && !isConversionPlay) {
            statsMap[play.receiverPlayerId].receptions += 1;
            if (play.isTouchdown) {
              statsMap[play.receiverPlayerId].recTD += 1;
              statsMap[play.receiverPlayerId].totalTDs += 1;
            }
          }

          // Rushing
          if (weHaveBall && play.playType === "Run" && isEligible(play.runnerPlayerId) && !isConversionPlay) {
            statsMap[play.runnerPlayerId].rushAtt += 1;
            if (play.isTouchdown) {
              statsMap[play.runnerPlayerId].rushTD += 1;
              statsMap[play.runnerPlayerId].totalTDs += 1;
            }
          }

          // Defense
          if ((!possTeam || !weHaveBall) && play.defenders && Array.isArray(play.defenders)) {
            play.defenders.forEach((defenderName: string) => {
              if (!isEligible(defenderName)) return;

              if (play.passOutcome === "Interception") {
                statsMap[defenderName].int += 1;
                if (play.isPick6 || play.result === "Pick 6" || play.result === "Pick 6 Touchdown") {
                  statsMap[defenderName].totalTDs += 1;
                }
              } else if (play.passOutcome === "PBU") {
                statsMap[defenderName].pbu += 1;
              } else if (play.passOutcome === "Sack") {
                statsMap[defenderName].sacks += 1;
                statsMap[defenderName].flagPulls += 1;
              } else {
                statsMap[defenderName].flagPulls += 1;
              }
            });
          }

          // Flaggers
          if ((!possTeam || !weHaveBall) && play.passOutcome === "Interception" && play.flaggers && Array.isArray(play.flaggers)) {
            play.flaggers.forEach((flaggerName: string) => {
              if (isEligible(flaggerName)) {
                statsMap[flaggerName].flagPulls += 1;
              }
            });
          }
        });

        setStats(Object.values(statsMap));
      } catch (e) {
        console.error("Error fetching team stats:", e);
      }
      setLoading(false);
    };

    fetchData();
    if (isDemoLeague) {
      const unsub = subscribeDemoSandbox(() => fetchData());
      return () => unsub();
    }
  }, [teamId, isDemoLeague]);

  const getTop3 = (key: string) => {
    const sorted = [...stats].sort((a, b) => (b[key] || 0) - (a[key] || 0)).filter((p) => (p[key] || 0) > 0);
    return sorted.slice(0, 3);
  };

  const statCategories = [
    { title: "Total Touchdowns", key: "totalTDs", icon: Trophy, color: "text-yellow-400" },
    { title: "Passing TDs", key: "passTD", icon: Crosshair, color: "text-cyan-400" },
    { title: "Completions", key: "passComp", icon: Crosshair, color: "text-sky-400" },
    { title: "Receptions", key: "receptions", icon: Activity, color: "text-blue-400" },
    { title: "Receiving TDs", key: "recTD", icon: Activity, color: "text-blue-400" },
    { title: "Rushing TDs", key: "rushTD", icon: Flame, color: "text-emerald-400" },
    { title: "Flags", key: "flagPulls", icon: Shield, color: "text-amber-400" },
    { title: "Sacks", key: "sacks", icon: Shield, color: "text-orange-500" },
    { title: "Interceptions", key: "int", icon: Shield, color: "text-purple-400" },
    { title: "Pass Breakups", key: "pbu", icon: Shield, color: "text-cyan-400" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090E] text-white flex flex-col justify-center items-center font-sans">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const teamName = team?.name || "Team";

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

        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold uppercase tracking-wider text-cyan-400">
            <Activity className="w-3.5 h-3.5" />
            <span>Leaderboards</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white">
            {teamName} <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Stat Leaders</span>
          </h1>
          <p className="text-lg text-neutral-400 font-light">Top Performers of {teamName}</p>
        </div>

        {/* 3-Column Bento Grid of Stat Leaders */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCategories.map((cat, idx) => {
            const top3 = getTop3(cat.key);

            return (
              <div
                key={idx}
                className="bg-neutral-900/70 border border-white/5 rounded-3xl p-6 flex flex-col hover:border-white/15 transition-all shadow-xl backdrop-blur-md"
              >
                <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                  <div className={`p-2 bg-white/5 rounded-xl ${cat.color}`}>
                    <cat.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-wider text-white">{cat.title}</h3>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                  {top3.length > 0 ? (
                    top3.map((player, rank) => (
                      <div key={player.name} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 text-center font-black ${rank === 0 ? "text-cyan-400 text-lg" : "text-neutral-500"
                              }`}
                          >
                            #{rank + 1}
                          </span>
                          <span className="font-bold text-neutral-300 group-hover:text-white transition-colors text-sm">
                            {player.name}{" "}
                            {player.number && <span className="text-neutral-600 font-normal ml-1">#{player.number}</span>}
                          </span>
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
            );
          })}
        </div>
      </div>

    </div>
  );
}
