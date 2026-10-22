"use client";

import { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, onSnapshot, query, where, limit } from "firebase/firestore";
import { getCachedLeagueTeams, getCachedLeaguePlayers, getCachedLeaguePlays } from "@/lib/leagueDataCache";
import { useAuth } from "@/lib/authContext";
import { useLeague } from "@/lib/leagueContext";
import { isRealTeam, getTeamShortcode } from "@/components/TeamAssets";
import { usePrivateLeagueAccess } from "@/lib/usePrivateLeagueAccess";
import { isPlayoffMatch } from "@/lib/standingsEngine";
import {
  getSandboxTeams,
  getSandboxPlayers,
  getSandboxMatches,
  getSandboxPlays,
  subscribeDemoSandbox,
} from "@/lib/demoSandbox";
import { getGameDisplayState, isFinalGameStatus, isStartedGameStatus, useNow } from "@/lib/gameLiveState";

const noopSubscribe = () => () => {};
const readEmbeddedFlag = () => {
  if (typeof window === "undefined") return false;
  const sp = new URLSearchParams(window.location.search);
  return sp.get("embed") === "true" || sp.get("demo") === "true";
};

export function useLeagueDashboardData(leagueIdParam?: string) {
  const { settings, activeLeagueId, switchLeague, isDemoLeague, subscription } = useLeague();

  const isEmbedded = useSyncExternalStore(
    noopSubscribe,
    readEmbeddedFlag,
    () => false
  );

  const isEffectiveDemo = isDemoLeague || isEmbedded || leagueIdParam === "default" || leagueIdParam === "demo";

  useEffect(() => {
    if (leagueIdParam && leagueIdParam !== activeLeagueId) {
      switchLeague(leagueIdParam);
    }
  }, [leagueIdParam, activeLeagueId, switchLeague]);

  const {
    user,
    role,
    isLeagueAdmin,
    isTeamAdmin,
    isPlayer,
    playerId,
    playerTeamId,
    playerData,
    canManageTeam,
    managedTeamId,
    canRegisterAsPlayer,
    setDevRole,
  } = useAuth();

  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [plays, setPlays] = useState<any[]>([]);
  const now = useNow();

  const { isDenied, deniedElement } = usePrivateLeagueAccess(leagueIdParam);

  useEffect(() => {
    if (isEffectiveDemo) {
      const loadDemoData = () => {
        const tList = getSandboxTeams().filter(isRealTeam);
        const pList = getSandboxPlayers();
        const plList = getSandboxPlays();
        const mList = getSandboxMatches()
          .filter((m: any) => !m.isHidden && m.homeTeamId !== "team_free_agents" && m.awayTeamId !== "team_free_agents");
        mList.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setTeams(tList);
        setPlayers(pList);
        setPlays(plList);
        setMatches(mList);
      };
      loadDemoData();
      const unsub = subscribeDemoSandbox(() => loadDemoData());
      return () => unsub();
    }

    try {
      const targetLeagueId = leagueIdParam || activeLeagueId;
      let isSubscribed = true;

      Promise.all([
        getCachedLeagueTeams(targetLeagueId),
        getCachedLeaguePlayers(targetLeagueId),
        getCachedLeaguePlays(targetLeagueId),
      ]).then(([rawTeams, rawPlayers, rawPlays]) => {
        if (!isSubscribed) return;
        const tList = rawTeams
          .filter((t) => isRealTeam(t) && (!t.leagueId || t.leagueId === targetLeagueId));
        const pList = rawPlayers
          .filter((p) => !p.leagueId || p.leagueId === targetLeagueId || tList.some((t) => t.id === p.teamId));
        setTeams(tList);
        setPlayers(pList);
        setPlays(rawPlays);
      }).catch((e) => {
        console.warn("Non-critical: permission or network error loading dashboard data:", e);
      });

      const unsubMatches = onSnapshot(query(
        collection(db, "matches"),
        where("leagueId", "==", targetLeagueId),
        where("isHidden", "!=", true),
        limit(512),
      ), (snap) => {
        const mList = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((m) => !m.isHidden && (!m.leagueId || m.leagueId === targetLeagueId));
        mList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setMatches(mList);
      }, (err) => {
        console.warn("Matches snapshot permission warning:", err);
      });

      return () => {
        isSubscribed = false;
        unsubMatches();
      };
    } catch (e) {
      console.warn("Non-critical: permission or network error loading dashboard data:", e);
    }
  }, [isEffectiveDemo, leagueIdParam, activeLeagueId]);

  // Compute Standings (strictly competitive teams only; free agents are not a team)
  const { standingsMap, completedMatches, sortedStandings } = useMemo(() => {
    const map: Record<
      string,
      { id: string; name: string; shortcode: string; w: number; l: number; t: number; pf: number; pa: number; pts: number }
    > = {};
    teams.filter(isRealTeam).forEach((t) => {
      map[t.id] = {
        id: t.id,
        name: t.name,
        shortcode: t.shortcode || getTeamShortcode(t),
        w: 0,
        l: 0,
        t: 0,
        pf: 0,
        pa: 0,
        pts: 0,
      };
    });

    const completed = matches.filter((m) => m.status === "completed" || m.status === "Final");
    completed.forEach((m) => {
      const h = map[m.homeTeamId];
      const a = map[m.awayTeamId];
      if (h && a && !m.isPreseason && !isPlayoffMatch(m)) {
        h.pf += m.homeScore || 0;
        h.pa += m.awayScore || 0;
        a.pf += m.awayScore || 0;
        a.pa += m.homeScore || 0;
        if ((m.homeScore || 0) > (m.awayScore || 0)) {
          h.w += 1;
          h.pts += 2;
          a.l += 1;
        } else if ((m.homeScore || 0) < (m.awayScore || 0)) {
          a.w += 1;
          a.pts += 2;
          h.l += 1;
        } else {
          h.t += 1;
          a.t += 1;
          h.pts += 1;
          a.pts += 1;
        }
      }
    });

    const sorted = Object.values(map)
      .filter(isRealTeam)
      .sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        const diffB = b.pf - b.pa;
        const diffA = a.pf - a.pa;
        if (diffB !== diffA) return diffB - diffA;
        return b.pf - a.pf;
      });

    return { standingsMap: map, completedMatches: completed, sortedStandings: sorted };
  }, [teams, matches]);

  // Compute Individual Stat Leaders for snapshot
  const { playerStats, completedMatchIds, topPasser, topReceiver, topFlagger, topScorer } = useMemo(() => {
    const stats: Record<
      string,
      { name: string; team: string; passTD: number; recTD: number; flagPulls: number; totalTD: number }
    > = {};
    const teamMap = new Map(teams.map((tm) => [tm.id, tm]));
    players.forEach((p) => {
      const t = teamMap.get(p.teamId);
      stats[p.playerName] = {
        name: p.playerName,
        team: t?.name || "",
        passTD: 0,
        recTD: 0,
        flagPulls: 0,
        totalTD: 0,
      };
    });

    const matchIds = new Set(
      matches
        .filter((m) => (m.status === "completed" || m.status === "Final") && !m.isHidden)
        .map((m) => m.id)
    );

    // Process plays from Firestore collection for completed games
    plays.forEach((play: any) => {
      if (!play.matchId || !matchIds.has(play.matchId)) return;

      if (play.isTouchdown || play.result === "Touchdown") {
        if (play.playType === "Pass") {
          const qb = play.qbPlayerId || play.passer;
          if (qb && stats[qb]) stats[qb].passTD += 1;
          const rec = play.receiverPlayerId || play.receiver;
          if (rec && stats[rec]) {
            stats[rec].recTD += 1;
            stats[rec].totalTD += 1;
          }
        } else if (play.playType === "Run") {
          const runner = play.runnerPlayerId || play.runner;
          if (runner && stats[runner]) stats[runner].totalTD += 1;
        }
      }

      if (play.isPick6 || play.result === "Pick 6") {
        if (play.defenders && Array.isArray(play.defenders) && play.defenders[0]) {
          const def = play.defenders[0];
          if (stats[def]) stats[def].totalTD += 1;
        }
      }

      // Same rules as /stats: INT and PBU aren't flag pulls; flaggers only count on interceptions.
      const outcome = play.passOutcome;
      if (play.defenders && Array.isArray(play.defenders) && outcome !== "Interception" && outcome !== "PBU") {
        play.defenders.forEach((d: string) => {
          if (stats[d]) stats[d].flagPulls += 1;
        });
      }
      if (outcome === "Interception" && play.flaggers && Array.isArray(play.flaggers)) {
        play.flaggers.forEach((flagger: string) => {
          if (stats[flagger]) stats[flagger].flagPulls += 1;
        });
      }
    });

    // Also support completed matches with embedded plays array
    const playsMatchIds = new Set(plays.map((p: any) => p.matchId));
    completedMatches.forEach((m) => {
      if (m.plays && Array.isArray(m.plays) && !playsMatchIds.has(m.id)) {
        m.plays.forEach((play: any) => {
          if (play.result === "Touchdown") {
            if (play.playType === "Pass") {
              if (play.passer && stats[play.passer]) stats[play.passer].passTD += 1;
              if (play.receiver && stats[play.receiver]) {
                stats[play.receiver].recTD += 1;
                stats[play.receiver].totalTD += 1;
              }
            } else if (play.playType === "Run") {
              if (play.runner && stats[play.runner]) stats[play.runner].totalTD += 1;
            }
          }
          if (play.flaggers && Array.isArray(play.flaggers)) {
            play.flaggers.forEach((flagger: string) => {
              if (stats[flagger]) stats[flagger].flagPulls += 1;
            });
          }
        });
      }
    });

    const allStatEntries = Object.values(stats);
    const passer = [...allStatEntries].sort((a, b) => b.passTD - a.passTD)[0] || { name: "-", passTD: 0, team: "" };
    const receiver = [...allStatEntries].sort((a, b) => b.recTD - a.recTD)[0] || { name: "-", recTD: 0, team: "" };
    const flagger = [...allStatEntries].sort((a, b) => b.flagPulls - a.flagPulls)[0] || { name: "-", flagPulls: 0, team: "" };
    const scorer = [...allStatEntries].sort((a, b) => b.totalTD - a.totalTD)[0] || { name: "-", totalTD: 0, team: "" };

    return {
      playerStats: stats,
      completedMatchIds: matchIds,
      topPasser: passer,
      topReceiver: receiver,
      topFlagger: flagger,
      topScorer: scorer,
    };
  }, [teams, players, matches, plays, completedMatches]);

  // Live & Upcoming Games Prioritization Logic
  // Started games (live or paused) are prioritized; only games with an active scorekeeper count as live.
  const isMatchLive = (m: any) => isStartedGameStatus(m.status) && !isFinalGameStatus(m.status);

  const getLiveTimeRemaining = (m: any) => {
    const periodDuration = (settings.rules?.periodDurationMinutes || 20) * 60;
    const periodsCount = settings.rules?.periodsCount || 2;
    const currentPeriod = m.matchState?.half || m.matchState?.period || 1;
    const gameClock =
      typeof m.matchState?.gameClock === "number" ? m.matchState.gameClock : periodDuration;
    const remainingPeriods = Math.max(0, periodsCount - currentPeriod);
    return gameClock + remainingPeriods * periodDuration;
  };

  // Strictly deduplicate active matches so duplicate live games never appear
  const seenNonCompIds = new Set<string>();
  const seenNonCompMatchups = new Set<string>();
  const activeNonCompletedMatches = matches.filter((m) => {
    if (m.status === "completed" || m.status === "Final" || m.isHidden) return false;
    if (m.id === "match_demo_1" || m.id === "match_demo_3") return false;
    const matchupKey = `${m.week || ""}_${m.homeTeamId || ""}_${m.awayTeamId || ""}`;
    if (seenNonCompIds.has(m.id) || seenNonCompMatchups.has(matchupKey)) return false;
    seenNonCompIds.add(m.id);
    seenNonCompMatchups.add(matchupKey);
    return true;
  });

  // Live games prioritized by LEAST time remaining first
  const startedMatches = activeNonCompletedMatches
    .filter(isMatchLive)
    .sort((a, b) => getLiveTimeRemaining(a) - getLiveTimeRemaining(b));
  const liveMatches = startedMatches.filter((m) => getGameDisplayState(m, now) === "live");

  // Upcoming games sorted chronologically
  const upcomingOnlyMatches = activeNonCompletedMatches
    .filter((m) => !isMatchLive(m))
    .sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
      const timeB = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
      if (!isNaN(timeA) && !isNaN(timeB)) return timeA - timeB;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

  // Combined next games (live games with least time remaining first, then upcoming games)
  const liveAndUpcomingGames = [...startedMatches, ...upcomingOnlyMatches].slice(0, 4);

  const upcomingMatches = activeNonCompletedMatches;

  // Team Admin Data Computation
  const managedTeam =
    teams.find((t) => t.id === managedTeamId) || (role === "team_admin" && teams.length > 0 ? teams[0] : null);
  const managedTeamStanding = managedTeam ? standingsMap[managedTeam.id] : null;
  const managedTeamStandingRank = managedTeam
    ? sortedStandings.findIndex((s) => s.id === managedTeam.id) + 1
    : 0;
  const managedTeamPlayers = managedTeam ? players.filter((p) => p.teamId === managedTeam.id) : [];
  const managedTeamMatches = managedTeam
    ? matches.filter((m) => m.homeTeamId === managedTeam.id || m.awayTeamId === managedTeam.id)
    : [];
  const managedTeamUpcoming = managedTeamMatches.filter(
    (m) => m.status !== "completed" && m.status !== "Final"
  )[0];

  // Opponent for Next Game
  const nextOpponentTeam = managedTeamUpcoming
    ? teams.find(
      (t) =>
        t.id ===
        (managedTeamUpcoming.homeTeamId === managedTeam?.id
          ? managedTeamUpcoming.awayTeamId
          : managedTeamUpcoming.homeTeamId)
    )
    : null;
  const nextOpponentName = managedTeamUpcoming
    ? managedTeamUpcoming.homeTeamId === managedTeam?.id
      ? managedTeamUpcoming.awayTeamName
      : managedTeamUpcoming.homeTeamName
    : "No game scheduled";

  // Team-Specific Stat Leaders
  const managedTeamPlayerNames = new Set(managedTeamPlayers.map((p) => p.playerName));
  const teamStatEntries = Object.values(playerStats).filter((ps) => managedTeamPlayerNames.has(ps.name));
  const teamTopPasser = [...teamStatEntries].sort((a, b) => b.passTD - a.passTD)[0] || { name: "-", passTD: 0 };
  const teamTopReceiver = [...teamStatEntries].sort((a, b) => b.recTD - a.recTD)[0] || { name: "-", recTD: 0 };
  const teamTopScorer = [...teamStatEntries].sort((a, b) => b.totalTD - a.totalTD)[0] || { name: "-", totalTD: 0 };
  const teamTopFlagger = [...teamStatEntries].sort((a, b) => b.flagPulls - a.flagPulls)[0] || { name: "-", flagPulls: 0 };
  const teamTopDefender = teamTopFlagger;

  // Athlete & Player View Data Computation
  const activePlayer =
    (playerId ? players.find((p) => p.id === playerId) : null) ||
    (playerData?.playerName ? players.find((p) => p.playerName === playerData.playerName) : null) ||
    ((isPlayer || role === "player") && players.length > 0 ? players[0] : null) ||
    playerData;

  const playerAssignedTeamId = activePlayer?.teamId || playerData?.teamId || playerTeamId;
  const myPlayerTeam = playerAssignedTeamId ? teams.find((t) => t.id === playerAssignedTeamId) : null;
  const myPlayerStanding = myPlayerTeam ? standingsMap[myPlayerTeam.id] : null;
  const myPlayerStandingRank = myPlayerTeam
    ? sortedStandings.findIndex((s) => s.id === myPlayerTeam.id) + 1
    : 0;

  const myPlayerTeammates = myPlayerTeam ? players.filter((p) => p.teamId === myPlayerTeam.id) : [];
  const myPlayerMatches = myPlayerTeam
    ? matches.filter((m) => m.homeTeamId === myPlayerTeam.id || m.awayTeamId === myPlayerTeam.id)
    : [];
  const myPlayerUpcomingMatch = myPlayerMatches.filter(
    (m) => m.status !== "completed" && m.status !== "Final"
  )[0];

  const myPlayerOpponentTeam = myPlayerUpcomingMatch
    ? teams.find(
      (t) =>
        t.id ===
        (myPlayerUpcomingMatch.homeTeamId === myPlayerTeam?.id
          ? myPlayerUpcomingMatch.awayTeamId
          : myPlayerUpcomingMatch.homeTeamId)
    )
    : null;
  const myPlayerOpponentName = myPlayerUpcomingMatch
    ? myPlayerUpcomingMatch.homeTeamId === myPlayerTeam?.id
      ? myPlayerUpcomingMatch.awayTeamName
      : myPlayerUpcomingMatch.homeTeamName
    : "No game scheduled";

  const pName = activePlayer?.playerName || playerData?.playerName || "";
  const pNumber =
    activePlayer?.playerNumber ||
    activePlayer?.number ||
    playerData?.number ||
    playerData?.playerNumber ||
    "00";
  const pPositions: string[] =
    Array.isArray(activePlayer?.positions) && activePlayer.positions.length > 0
      ? activePlayer.positions
      : activePlayer?.position
        ? [activePlayer.position]
        : Array.isArray(playerData?.positions) && playerData.positions.length > 0
          ? playerData.positions
          : ["ATH"];
  const pExperience = activePlayer?.experience || playerData?.experience || "Active Athlete";

  // Individual stats computed for this specific player
  const myStats = useMemo(() => {
    const stats = {
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

    if (!pName) return stats;

    // Games played
    myPlayerMatches.forEach((m) => {
      if (m.status === "completed" || m.status === "Final") {
        const dnp = m.didNotPlay || [];
        if (!dnp.includes(pName)) {
          stats.gamesPlayed += 1;
        }
      }
    });

    // Plays aggregated from collection
    plays.forEach((play: any) => {
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
      if (play.playType === "Pass" && (play.qbPlayerId === pName || play.passer === pName) && !isConversionPlay) {
        stats.passAtt += 1;
        if (play.passOutcome === "Complete" || play.result === "Complete" || play.result === "Touchdown") {
          stats.passComp += 1;
        }
        if (play.isTouchdown || play.result === "Touchdown") {
          stats.passTD += 1;
        }
      }

      // Receiving
      if (play.playType === "Pass" && (play.receiverPlayerId === pName || play.receiver === pName) && !isConversionPlay) {
        if (play.passOutcome === "Complete" || play.result === "Complete" || play.result === "Touchdown") {
          stats.receptions += 1;
        }
        if (play.isTouchdown || play.result === "Touchdown") {
          stats.recTD += 1;
          stats.totalTDs += 1;
        }
      }

      // Rushing
      if (play.playType === "Run" && (play.runnerPlayerId === pName || play.runner === pName) && !isConversionPlay) {
        stats.rushAtt += 1;
        if (play.isTouchdown || play.result === "Touchdown") {
          stats.rushTD += 1;
          stats.totalTDs += 1;
        }
      }

      // Pick 6
      if (play.isPick6 || play.result === "Pick 6") {
        if (play.defenders && Array.isArray(play.defenders) && play.defenders.includes(pName)) {
          stats.totalTDs += 1;
        }
      }

      // Defense
      if (play.defenders && Array.isArray(play.defenders) && play.defenders.includes(pName)) {
        if (play.passOutcome === "Interception") {
          stats.int += 1;
        } else if (play.passOutcome === "PBU") {
          stats.pbu += 1;
        } else if (play.passOutcome === "Sack") {
          stats.sacks += 1;
          stats.flagPulls += 1;
        } else {
          stats.flagPulls += 1;
        }
      }
      if (play.flaggers && Array.isArray(play.flaggers) && play.flaggers.includes(pName)) {
        stats.flagPulls += 1;
      }
    });

    // Embedded plays inside match objects
    const playsMatchIds = new Set(plays.map((p: any) => p.matchId));
    completedMatches.forEach((m) => {
      if (m.plays && Array.isArray(m.plays) && !playsMatchIds.has(m.id)) {
        m.plays.forEach((play: any) => {
          if (play.passer === pName && play.playType === "Pass") {
            stats.passAtt += 1;
            if (play.result === "Complete" || play.result === "Touchdown") stats.passComp += 1;
            if (play.result === "Touchdown") {
              stats.passTD += 1;
            }
          }
          if (play.receiver === pName && play.playType === "Pass") {
            if (play.result === "Complete" || play.result === "Touchdown") stats.receptions += 1;
            if (play.result === "Touchdown") {
              stats.recTD += 1;
              stats.totalTDs += 1;
            }
          }
          if (play.runner === pName && play.playType === "Run") {
            stats.rushAtt += 1;
            if (play.result === "Touchdown") {
              stats.rushTD += 1;
              stats.totalTDs += 1;
            }
          }
          if (play.flaggers && Array.isArray(play.flaggers) && play.flaggers.includes(pName)) {
            stats.flagPulls += 1;
          }
        });
      }
    });

    return stats;
  }, [pName, myPlayerMatches, plays, completedMatchIds, completedMatches]);

  // League Leader Accolades checks
  const isLeagueTopPasser = topPasser.name === pName && topPasser.passTD > 0;
  const isLeagueTopReceiver = topReceiver.name === pName && topReceiver.recTD > 0;
  const isLeagueTopScorer = topScorer.name === pName && topScorer.totalTD > 0;
  const isLeagueTopFlagger = topFlagger.name === pName && topFlagger.flagPulls > 0;

  // Strict view precedence: Player > Team Admin > League Admin > Spectator
  const isPlayerView = role === "player" || isPlayer;
  const isTeamAdminView = !isPlayerView && role === "team_admin";
  const isLeagueAdminView = !isPlayerView && !isTeamAdminView && (isLeagueAdmin || role === "league_admin");
  const isSpectatorView = !isPlayerView && !isTeamAdminView && !isLeagueAdminView;

  return {
    settings,
    activeLeagueId,
    subscription,
    isEffectiveDemo,
    isDenied,
    deniedElement,
    user,
    role,
    isLeagueAdmin,
    isTeamAdmin,
    isPlayer,
    playerId,
    playerTeamId,
    playerData,
    canManageTeam,
    managedTeamId,
    canRegisterAsPlayer,
    setDevRole,
    teams,
    matches,
    players,
    plays,
    setPlayers,
    standingsMap,
    completedMatches,
    sortedStandings,
    playerStats,
    completedMatchIds,
    topPasser,
    topReceiver,
    topFlagger,
    topScorer,
    liveMatches,
    upcomingOnlyMatches,
    liveAndUpcomingGames,
    upcomingMatches,
    isMatchLive,
    getLiveTimeRemaining,
    managedTeam,
    managedTeamStanding,
    managedTeamStandingRank,
    managedTeamPlayers,
    managedTeamMatches,
    managedTeamUpcoming,
    nextOpponentTeam,
    nextOpponentName,
    teamTopPasser,
    teamTopReceiver,
    teamTopScorer,
    teamTopFlagger,
    teamTopDefender,
    activePlayer,
    playerAssignedTeamId,
    myPlayerTeam,
    myPlayerStanding,
    myPlayerStandingRank,
    myPlayerTeammates,
    myPlayerMatches,
    myPlayerUpcomingMatch,
    myPlayerOpponentTeam,
    myPlayerOpponentName,
    pName,
    pNumber,
    pPositions,
    pExperience,
    myStats,
    isLeagueTopPasser,
    isLeagueTopReceiver,
    isLeagueTopScorer,
    isLeagueTopFlagger,
    isPlayerView,
    isTeamAdminView,
    isLeagueAdminView,
    isSpectatorView,
  };
}
