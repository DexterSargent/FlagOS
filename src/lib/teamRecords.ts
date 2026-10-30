import type { TeamSeason, TeamSeasonSnapshot } from "./teamSeasons";
import type { PlayerStatLine } from "./leagueSeasons";

export interface TeamRecordItem {
  id: string;
  category: string;
  recordType: "game" | "season" | "career";
  holder: string;
  value: number;
  formattedValue: string;
  context?: string;
  date?: string;
  isTeamRecord?: boolean;
  statGroup: "passing" | "receiving" | "rushing" | "scoring" | "defense" | "team";
}

export interface TeamFranchiseRecords {
  gameRecords: TeamRecordItem[];
  seasonRecords: TeamRecordItem[];
  careerRecords: TeamRecordItem[];
}

export interface CalculateTeamRecordsParams {
  teamId: string;
  teamName: string;
  teamAliases?: string[];
  seasons: TeamSeason[];
  snapshots: TeamSeasonSnapshot[];
  livePlayerStats?: Array<Partial<PlayerStatLine> & { name: string }>;
  liveRecord?: { won: number; lost: number; tied: number; pf: number; pa: number };
  matches?: Array<{
    id?: string;
    homeTeamId?: string;
    awayTeamId?: string;
    homeTeamName?: string;
    awayTeamName?: string;
    homeScore?: number | null;
    awayScore?: number | null;
    date?: string;
    status?: string;
  }>;
  plays?: Array<{
    matchId?: string;
    possessionTeamId?: string;
    possTeamId?: string;
    playType?: string;
    type?: string;
    passOutcome?: string;
    rushOutcome?: string;
    touchdown?: boolean;
    isTouchdown?: boolean;
    points?: number;
    pointsScored?: number;
    passer?: string;
    qbPlayerId?: string;
    receiver?: string;
    receiverPlayerId?: string;
    rusher?: string;
    runnerPlayerId?: string;
    defenders?: string[];
    flaggers?: string[];
    isPick6?: boolean;
    result?: string;
  }>;
}

/**
 * Calculates extensive single-game, single-season, and all-time career franchise records
 * covering passing, receiving, rushing, scoring, and defense for both individual players and the team.
 */
export function calculateTeamRecords({
  teamId,
  teamName,
  teamAliases = [],
  seasons,
  snapshots,
  livePlayerStats = [],
  liveRecord,
  matches = [],
  plays = [],
}: CalculateTeamRecordsParams): TeamFranchiseRecords {
  const gameRecords: TeamRecordItem[] = [];
  const seasonRecords: TeamRecordItem[] = [];
  const careerRecords: TeamRecordItem[] = [];

  // Match lookup map
  const matchMap = new Map<string, typeof matches[0]>();
  for (const m of matches) {
    if (m.id) matchMap.set(m.id, m);
  }

  const formatMatchContext = (matchId: string) => {
    const m = matchMap.get(matchId);
    if (!m) return undefined;
    const isHome = m.homeTeamId === teamId;
    const opp = isHome ? (m.awayTeamName || "Opponent") : (m.homeTeamName || "Opponent");
    return `vs ${opp}${m.date ? ` (${m.date})` : ""}`;
  };

  // ==========================================
  // 1. SINGLE GAME RECORDS (TEAM & PLAYER)
  // ==========================================

  // --- Team Single Game Records ---
  let maxGameScore = 0;
  let maxGameScoreContext = "";
  let maxVictoryMargin = 0;
  let maxVictoryMarginContext = "";
  let lowestPointsAllowed = Infinity;
  let lowestPointsAllowedContext = "";

  // Check live matches for Team Single-Game Records
  for (const m of matches) {
    const isHome = m.homeTeamId === teamId;
    const isAway = m.awayTeamId === teamId;
    if (!isHome && !isAway) continue;

    const teamScore = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
    const oppScore = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
    const oppName = isHome ? (m.awayTeamName || "Opponent") : (m.homeTeamName || "Opponent");
    const dateStr = m.date ? ` (${m.date})` : "";

    if (teamScore > maxGameScore) {
      maxGameScore = teamScore;
      maxGameScoreContext = `vs ${oppName}${dateStr}`;
    }

    const margin = teamScore - oppScore;
    if (margin > maxVictoryMargin && margin > 0) {
      maxVictoryMargin = margin;
      maxVictoryMarginContext = `${teamScore}-${oppScore} vs ${oppName}${dateStr}`;
    }

    if (oppScore < lowestPointsAllowed && (m.status === "completed" || m.status === "Final" || (m.homeScore !== null && m.awayScore !== null))) {
      lowestPointsAllowed = oppScore;
      lowestPointsAllowedContext = `${teamScore}-${oppScore} vs ${oppName}${dateStr}`;
    }
  }

  // Also check archived snapshot results for team game records
  for (const snap of snapshots) {
    for (const res of snap.results || []) {
      const isHome = res.homeTeamId === teamId;
      const isAway = res.awayTeamId === teamId;
      if (!isHome && !isAway) continue;

      const teamScore = isHome ? res.homeScore : res.awayScore;
      const oppScore = isHome ? res.awayScore : res.homeScore;
      const oppName = isHome ? (res.awayTeamName || "Opponent") : (res.homeTeamName || "Opponent");
      const dateStr = res.date ? ` (${res.date})` : ` (${snap.title})`;

      if (teamScore > maxGameScore) {
        maxGameScore = teamScore;
        maxGameScoreContext = `vs ${oppName}${dateStr}`;
      }

      const margin = teamScore - oppScore;
      if (margin > maxVictoryMargin && margin > 0) {
        maxVictoryMargin = margin;
        maxVictoryMarginContext = `${teamScore}-${oppScore} vs ${oppName}${dateStr}`;
      }

      if (oppScore < lowestPointsAllowed) {
        lowestPointsAllowed = oppScore;
        lowestPointsAllowedContext = `${teamScore}-${oppScore} vs ${oppName}${dateStr}`;
      }
    }
  }

  if (maxGameScore > 0) {
    gameRecords.push({
      id: "game_highest_score",
      category: "Points Scored in a Game",
      recordType: "game",
      holder: teamName,
      value: maxGameScore,
      formattedValue: `${maxGameScore} pts`,
      context: maxGameScoreContext,
      isTeamRecord: true,
      statGroup: "team",
    });
  }

  if (maxVictoryMargin > 0) {
    gameRecords.push({
      id: "game_largest_margin",
      category: "Largest Margin of Victory",
      recordType: "game",
      holder: teamName,
      value: maxVictoryMargin,
      formattedValue: `+${maxVictoryMargin} pts`,
      context: maxVictoryMarginContext,
      isTeamRecord: true,
      statGroup: "team",
    });
  }

  if (lowestPointsAllowed !== Infinity && lowestPointsAllowed >= 0) {
    gameRecords.push({
      id: "game_fewest_pts_allowed",
      category: lowestPointsAllowed === 0 ? "Defensive Shutout" : "Fewest Points Allowed",
      recordType: "game",
      holder: teamName,
      value: lowestPointsAllowed,
      formattedValue: lowestPointsAllowed === 0 ? "0 pts (Shutout)" : `${lowestPointsAllowed} pts allowed`,
      context: lowestPointsAllowedContext,
      isTeamRecord: true,
      statGroup: "defense",
    });
  }

  // --- Play-by-Play Based Single Game Records (Team & Player) ---
  if (plays.length > 0) {
    type GamePlayerStats = {
      name: string;
      matchId: string;
      passTD: number;
      passComp: number;
      passAtt: number;
      recTD: number;
      receptions: number;
      rushTD: number;
      rushAtt: number;
      totalTD: number;
      sacks: number;
      int: number;
      pbu: number;
      defTD: number;
      flagPulls: number;
    };

    type GameTeamStats = {
      matchId: string;
      totalTDs: number;
      passTDs: number;
      rushTDs: number;
      sacks: number;
      interceptions: number;
      pbus: number;
      flagPulls: number;
      turnoversForced: number;
    };

    const gamePlayerMap = new Map<string, GamePlayerStats>();
    const gameTeamMap = new Map<string, GameTeamStats>();

    const getTeamEntry = (matchId: string): GameTeamStats => {
      let entry = gameTeamMap.get(matchId);
      if (!entry) {
        entry = {
          matchId,
          totalTDs: 0,
          passTDs: 0,
          rushTDs: 0,
          sacks: 0,
          interceptions: 0,
          pbus: 0,
          flagPulls: 0,
          turnoversForced: 0,
        };
        gameTeamMap.set(matchId, entry);
      }
      return entry;
    };

    const getPlayerEntry = (name: string, matchId: string): GamePlayerStats => {
      const key = `${matchId}_${name}`;
      let entry = gamePlayerMap.get(key);
      if (!entry) {
        entry = {
          name,
          matchId,
          passTD: 0,
          passComp: 0,
          passAtt: 0,
          recTD: 0,
          receptions: 0,
          rushTD: 0,
          rushAtt: 0,
          totalTD: 0,
          sacks: 0,
          int: 0,
          pbu: 0,
          defTD: 0,
          flagPulls: 0,
        };
        gamePlayerMap.set(key, entry);
      }
      return entry;
    };

    const teamIdNorm = (teamId || "").toLowerCase().trim();
    const teamNameNorm = (teamName || "").toLowerCase().trim();
    const aliasSet = new Set(
      [teamIdNorm, teamNameNorm, ...(teamAliases || []).map((a) => a.toLowerCase().trim())].filter(Boolean)
    );
    const rosterNames = new Set(
      livePlayerStats.map((p) => (p.name || "").toLowerCase().trim()).filter(Boolean)
    );

    const isTeamMember = (name?: string) => {
      if (!name) return false;
      if (rosterNames.size === 0) return true;
      return rosterNames.has(name.toLowerCase().trim());
    };

    const isTargetTeamPossession = (poss?: string) => {
      if (!poss) return false;
      const n = poss.toLowerCase().trim();
      return aliasSet.has(n);
    };

    for (const p of plays) {
      const matchId = p.matchId || "";
      const isTD = Boolean(
        p.touchdown === true ||
        p.isTouchdown === true ||
        p.passOutcome === "Touchdown" ||
        p.rushOutcome === "Touchdown" ||
        p.points === 6 ||
        p.pointsScored === 6 ||
        (p.result && /(touchdown|\btd\b)/i.test(p.result) && !/touchback|safety/i.test(p.result))
      );

      const possTeam = p.possessionTeamId || p.possTeamId;
      const qbName = p.qbPlayerId || p.passer;
      const recName = p.receiverPlayerId || p.receiver;
      const rushName = p.runnerPlayerId || p.rusher;

      // Determine possession: by team ID / alias, or fallback to whether offensive player is on roster
      const isOurPossession = possTeam
        ? isTargetTeamPossession(possTeam)
        : (Boolean(qbName && isTeamMember(qbName)) ||
           Boolean(recName && isTeamMember(recName)) ||
           Boolean(rushName && isTeamMember(rushName)));

      // Determine defense: if possTeam is another team, or if our roster players are defenders/flaggers
      const onDefense = possTeam
        ? !isTargetTeamPossession(possTeam)
        : ((Array.isArray(p.defenders) && p.defenders.some((d) => isTeamMember(d))) ||
           (Array.isArray(p.flaggers) && p.flaggers.some((f) => isTeamMember(f))));

      const teamStats = getTeamEntry(matchId);

      // Quarterback / Passing
      if (qbName && (isOurPossession || isTeamMember(qbName))) {
        const e = getPlayerEntry(qbName, matchId);
        if (p.playType === "Pass" || p.type === "Pass" || p.passOutcome) {
          e.passAtt += 1;
        }
        if (p.passOutcome === "Complete") {
          e.passComp += 1;
        }
        if (isTD) {
          e.passTD += 1;
          e.totalTD += 1;
          teamStats.passTDs += 1;
          teamStats.totalTDs += 1;
        }
      }

      // Receiver / Catching
      if (recName && (isOurPossession || isTeamMember(recName))) {
        const e = getPlayerEntry(recName, matchId);
        if (p.passOutcome === "Complete") {
          e.receptions += 1;
        }
        if (isTD) {
          e.recTD += 1;
          e.totalTD += 1;
        }
      }

      // Rusher / Running
      if (rushName && (isOurPossession || isTeamMember(rushName))) {
        const e = getPlayerEntry(rushName, matchId);
        if (p.playType === "Run" || p.type === "Run" || p.rushOutcome) {
          e.rushAtt += 1;
        }
        if (isTD) {
          e.rushTD += 1;
          e.totalTD += 1;
          teamStats.rushTDs += 1;
          teamStats.totalTDs += 1;
        }
      }

      // Defense: Sacks
      if ((onDefense || (Array.isArray(p.defenders) && p.defenders.some(isTeamMember))) && (p.passOutcome === "Sack" || p.type === "Sack") && Array.isArray(p.defenders)) {
        for (const def of p.defenders) {
          if (def && (onDefense || isTeamMember(def))) {
            const e = getPlayerEntry(def, matchId);
            e.sacks += 1;
            e.flagPulls += 1;
            teamStats.sacks += 1;
            teamStats.flagPulls += 1;
          }
        }
      }

      // Defense: Interceptions
      if ((onDefense || (Array.isArray(p.defenders) && p.defenders.some(isTeamMember))) && (p.passOutcome === "Interception" || p.type === "Interception") && Array.isArray(p.defenders)) {
        for (const def of p.defenders) {
          if (def && (onDefense || isTeamMember(def))) {
            const e = getPlayerEntry(def, matchId);
            e.int += 1;
            teamStats.interceptions += 1;
            teamStats.turnoversForced += 1;
            if (p.isPick6 || p.result === "Pick 6" || p.result === "Pick 6 Touchdown") {
              e.defTD += 1;
              e.totalTD += 1;
              teamStats.totalTDs += 1;
            }
          }
        }
      }

      // Defense: Pass Breakups (PBUs)
      if ((onDefense || (Array.isArray(p.defenders) && p.defenders.some(isTeamMember))) && (p.passOutcome === "PBU" || p.type === "PBU") && Array.isArray(p.defenders)) {
        for (const def of p.defenders) {
          if (def && (onDefense || isTeamMember(def))) {
            const e = getPlayerEntry(def, matchId);
            e.pbu += 1;
            teamStats.pbus += 1;
          }
        }
      }

      // Defense: Flag Pulls
      if ((onDefense || (Array.isArray(p.flaggers) && p.flaggers.some(isTeamMember))) && Array.isArray(p.flaggers)) {
        for (const f of p.flaggers) {
          if (f && (onDefense || isTeamMember(f))) {
            const e = getPlayerEntry(f, matchId);
            e.flagPulls += 1;
            teamStats.flagPulls += 1;
          }
        }
      }
    }

    // --- Team Single Game Leader Records ---
    let bestTeamTDs = { val: 0, matchId: "" };
    let bestTeamPassTDs = { val: 0, matchId: "" };
    let bestTeamRushTDs = { val: 0, matchId: "" };
    let bestTeamSacks = { val: 0, matchId: "" };
    let bestTeamINTs = { val: 0, matchId: "" };
    let bestTeamPBUs = { val: 0, matchId: "" };
    let bestTeamPulls = { val: 0, matchId: "" };
    let bestTeamTurnovers = { val: 0, matchId: "" };

    for (const ts of gameTeamMap.values()) {
      if (ts.totalTDs > bestTeamTDs.val) bestTeamTDs = { val: ts.totalTDs, matchId: ts.matchId };
      if (ts.passTDs > bestTeamPassTDs.val) bestTeamPassTDs = { val: ts.passTDs, matchId: ts.matchId };
      if (ts.rushTDs > bestTeamRushTDs.val) bestTeamRushTDs = { val: ts.rushTDs, matchId: ts.matchId };
      if (ts.sacks > bestTeamSacks.val) bestTeamSacks = { val: ts.sacks, matchId: ts.matchId };
      if (ts.interceptions > bestTeamINTs.val) bestTeamINTs = { val: ts.interceptions, matchId: ts.matchId };
      if (ts.pbus > bestTeamPBUs.val) bestTeamPBUs = { val: ts.pbus, matchId: ts.matchId };
      if (ts.flagPulls > bestTeamPulls.val) bestTeamPulls = { val: ts.flagPulls, matchId: ts.matchId };
      if (ts.turnoversForced > bestTeamTurnovers.val) bestTeamTurnovers = { val: ts.turnoversForced, matchId: ts.matchId };
    }

    if (bestTeamTDs.val > 0) {
      gameRecords.push({
        id: "game_team_total_tds",
        category: "Most Team Touchdowns in a Game",
        recordType: "game",
        holder: teamName,
        value: bestTeamTDs.val,
        formattedValue: `${bestTeamTDs.val} TDs`,
        context: formatMatchContext(bestTeamTDs.matchId),
        isTeamRecord: true,
        statGroup: "team",
      });
    }

    if (bestTeamPassTDs.val > 0) {
      gameRecords.push({
        id: "game_team_pass_tds",
        category: "Most Team Passing TDs in a Game",
        recordType: "game",
        holder: teamName,
        value: bestTeamPassTDs.val,
        formattedValue: `${bestTeamPassTDs.val} Pass TDs`,
        context: formatMatchContext(bestTeamPassTDs.matchId),
        isTeamRecord: true,
        statGroup: "passing",
      });
    }

    if (bestTeamRushTDs.val > 0) {
      gameRecords.push({
        id: "game_team_rush_tds",
        category: "Most Team Rushing TDs in a Game",
        recordType: "game",
        holder: teamName,
        value: bestTeamRushTDs.val,
        formattedValue: `${bestTeamRushTDs.val} Rush TDs`,
        context: formatMatchContext(bestTeamRushTDs.matchId),
        isTeamRecord: true,
        statGroup: "rushing",
      });
    }

    if (bestTeamSacks.val > 0) {
      gameRecords.push({
        id: "game_team_sacks",
        category: "Most Team Sacks in a Game",
        recordType: "game",
        holder: teamName,
        value: bestTeamSacks.val,
        formattedValue: `${bestTeamSacks.val} Sacks`,
        context: formatMatchContext(bestTeamSacks.matchId),
        isTeamRecord: true,
        statGroup: "defense",
      });
    }

    if (bestTeamINTs.val > 0) {
      gameRecords.push({
        id: "game_team_ints",
        category: "Most Team Interceptions in a Game",
        recordType: "game",
        holder: teamName,
        value: bestTeamINTs.val,
        formattedValue: `${bestTeamINTs.val} INT`,
        context: formatMatchContext(bestTeamINTs.matchId),
        isTeamRecord: true,
        statGroup: "defense",
      });
    }

    if (bestTeamTurnovers.val > 0) {
      gameRecords.push({
        id: "game_team_turnovers",
        category: "Most Turnovers Forced in a Game",
        recordType: "game",
        holder: teamName,
        value: bestTeamTurnovers.val,
        formattedValue: `${bestTeamTurnovers.val} Turnovers`,
        context: formatMatchContext(bestTeamTurnovers.matchId),
        isTeamRecord: true,
        statGroup: "defense",
      });
    }

    // --- Individual Single Game Leader Records ---
    let bestPassTD = { name: "", val: 0, matchId: "" };
    let bestPassComp = { name: "", val: 0, matchId: "" };
    let bestPassAtt = { name: "", val: 0, matchId: "" };
    let bestRecTD = { name: "", val: 0, matchId: "" };
    let bestReceptions = { name: "", val: 0, matchId: "" };
    let bestRushTD = { name: "", val: 0, matchId: "" };
    let bestRushAtt = { name: "", val: 0, matchId: "" };
    let bestTotalTD = { name: "", val: 0, matchId: "" };
    let bestSacks = { name: "", val: 0, matchId: "" };
    let bestInt = { name: "", val: 0, matchId: "" };
    let bestPbu = { name: "", val: 0, matchId: "" };
    let bestDefTD = { name: "", val: 0, matchId: "" };
    let bestFlagPulls = { name: "", val: 0, matchId: "" };

    for (const stats of gamePlayerMap.values()) {
      if (stats.passTD > bestPassTD.val) bestPassTD = { name: stats.name, val: stats.passTD, matchId: stats.matchId };
      if (stats.passComp > bestPassComp.val) bestPassComp = { name: stats.name, val: stats.passComp, matchId: stats.matchId };
      if (stats.passAtt > bestPassAtt.val) bestPassAtt = { name: stats.name, val: stats.passAtt, matchId: stats.matchId };
      if (stats.recTD > bestRecTD.val) bestRecTD = { name: stats.name, val: stats.recTD, matchId: stats.matchId };
      if (stats.receptions > bestReceptions.val) bestReceptions = { name: stats.name, val: stats.receptions, matchId: stats.matchId };
      if (stats.rushTD > bestRushTD.val) bestRushTD = { name: stats.name, val: stats.rushTD, matchId: stats.matchId };
      if (stats.rushAtt > bestRushAtt.val) bestRushAtt = { name: stats.name, val: stats.rushAtt, matchId: stats.matchId };
      if (stats.totalTD > bestTotalTD.val) bestTotalTD = { name: stats.name, val: stats.totalTD, matchId: stats.matchId };
      if (stats.sacks > bestSacks.val) bestSacks = { name: stats.name, val: stats.sacks, matchId: stats.matchId };
      if (stats.int > bestInt.val) bestInt = { name: stats.name, val: stats.int, matchId: stats.matchId };
      if (stats.pbu > bestPbu.val) bestPbu = { name: stats.name, val: stats.pbu, matchId: stats.matchId };
      if (stats.defTD > bestDefTD.val) bestDefTD = { name: stats.name, val: stats.defTD, matchId: stats.matchId };
      if (stats.flagPulls > bestFlagPulls.val) bestFlagPulls = { name: stats.name, val: stats.flagPulls, matchId: stats.matchId };
    }

    if (bestPassTD.val > 0) {
      gameRecords.push({
        id: "game_pass_td",
        category: "Most Passing TDs in a Game",
        recordType: "game",
        holder: bestPassTD.name,
        value: bestPassTD.val,
        formattedValue: `${bestPassTD.val} Pass TD`,
        context: formatMatchContext(bestPassTD.matchId),
        statGroup: "passing",
      });
    }

    if (bestPassComp.val > 0) {
      gameRecords.push({
        id: "game_pass_comp",
        category: "Most Pass Completions in a Game",
        recordType: "game",
        holder: bestPassComp.name,
        value: bestPassComp.val,
        formattedValue: `${bestPassComp.val} Comp`,
        context: formatMatchContext(bestPassComp.matchId),
        statGroup: "passing",
      });
    }

    if (bestRecTD.val > 0) {
      gameRecords.push({
        id: "game_rec_td",
        category: "Most Receiving TDs in a Game",
        recordType: "game",
        holder: bestRecTD.name,
        value: bestRecTD.val,
        formattedValue: `${bestRecTD.val} Rec TD`,
        context: formatMatchContext(bestRecTD.matchId),
        statGroup: "receiving",
      });
    }

    if (bestReceptions.val > 0) {
      gameRecords.push({
        id: "game_receptions",
        category: "Most Receptions in a Game",
        recordType: "game",
        holder: bestReceptions.name,
        value: bestReceptions.val,
        formattedValue: `${bestReceptions.val} Catches`,
        context: formatMatchContext(bestReceptions.matchId),
        statGroup: "receiving",
      });
    }

    if (bestRushTD.val > 0) {
      gameRecords.push({
        id: "game_rush_td",
        category: "Most Rushing TDs in a Game",
        recordType: "game",
        holder: bestRushTD.name,
        value: bestRushTD.val,
        formattedValue: `${bestRushTD.val} Rush TD`,
        context: formatMatchContext(bestRushTD.matchId),
        statGroup: "rushing",
      });
    }

    if (bestTotalTD.val > 0) {
      gameRecords.push({
        id: "game_total_td",
        category: "Most Total TDs in a Game",
        recordType: "game",
        holder: bestTotalTD.name,
        value: bestTotalTD.val,
        formattedValue: `${bestTotalTD.val} Total TD`,
        context: formatMatchContext(bestTotalTD.matchId),
        statGroup: "scoring",
      });
    }

    if (bestSacks.val > 0) {
      gameRecords.push({
        id: "game_sacks",
        category: "Most Sacks in a Game",
        recordType: "game",
        holder: bestSacks.name,
        value: bestSacks.val,
        formattedValue: `${bestSacks.val} Sacks`,
        context: formatMatchContext(bestSacks.matchId),
        statGroup: "defense",
      });
    }

    if (bestInt.val > 0) {
      gameRecords.push({
        id: "game_int",
        category: "Most Interceptions in a Game",
        recordType: "game",
        holder: bestInt.name,
        value: bestInt.val,
        formattedValue: `${bestInt.val} INT`,
        context: formatMatchContext(bestInt.matchId),
        statGroup: "defense",
      });
    }

    if (bestPbu.val > 0) {
      gameRecords.push({
        id: "game_pbu",
        category: "Most Pass Breakups in a Game",
        recordType: "game",
        holder: bestPbu.name,
        value: bestPbu.val,
        formattedValue: `${bestPbu.val} PBU`,
        context: formatMatchContext(bestPbu.matchId),
        statGroup: "defense",
      });
    }

    if (bestDefTD.val > 0) {
      gameRecords.push({
        id: "game_def_td",
        category: "Most Pick-6s / Defensive TDs in a Game",
        recordType: "game",
        holder: bestDefTD.name,
        value: bestDefTD.val,
        formattedValue: `${bestDefTD.val} Def TD`,
        context: formatMatchContext(bestDefTD.matchId),
        statGroup: "defense",
      });
    }

    if (bestFlagPulls.val > 0) {
      gameRecords.push({
        id: "game_flag_pulls",
        category: "Most Flag Pulls in a Game",
        recordType: "game",
        holder: bestFlagPulls.name,
        value: bestFlagPulls.val,
        formattedValue: `${bestFlagPulls.val} Pulls`,
        context: formatMatchContext(bestFlagPulls.matchId),
        statGroup: "defense",
      });
    }
  }

  // ==========================================
  // 2. SINGLE SEASON RECORDS (TEAM & PLAYER)
  // ==========================================
  type SeasonAggregate = {
    title: string;
    teamPF: number;
    teamPA: number;
    teamWon: number;
    teamLost: number;
    teamTied: number;
    players: Array<Partial<PlayerStatLine> & { name: string }>;
  };

  const allSeasonAggregates: SeasonAggregate[] = [];

  // Live season aggregate
  if (liveRecord || livePlayerStats.length > 0) {
    allSeasonAggregates.push({
      title: "Current Season",
      teamPF: liveRecord?.pf || 0,
      teamPA: liveRecord?.pa || 0,
      teamWon: liveRecord?.won || 0,
      teamLost: liveRecord?.lost || 0,
      teamTied: liveRecord?.tied || 0,
      players: livePlayerStats,
    });
  }

  // Archived season snapshots
  for (const snap of snapshots) {
    allSeasonAggregates.push({
      title: snap.title,
      teamPF: snap.pf || 0,
      teamPA: snap.pa || 0,
      teamWon: snap.won || 0,
      teamLost: snap.lost || 0,
      teamTied: snap.tied || 0,
      players: snap.playerStats || [],
    });
  }

  // --- Team Single Season Records ---
  let mostSeasonWins = { val: 0, title: "" };
  let mostSeasonPoints = { val: 0, title: "" };
  let bestPointDiff = { val: -Infinity, title: "" };
  let fewestSeasonPA = { val: Infinity, title: "" };

  for (const sa of allSeasonAggregates) {
    if (sa.teamWon > mostSeasonWins.val) mostSeasonWins = { val: sa.teamWon, title: sa.title };
    if (sa.teamPF > mostSeasonPoints.val) mostSeasonPoints = { val: sa.teamPF, title: sa.title };
    const diff = sa.teamPF - sa.teamPA;
    if (diff > bestPointDiff.val && (sa.teamWon > 0 || sa.teamLost > 0)) bestPointDiff = { val: diff, title: sa.title };
    if (sa.teamPA < fewestSeasonPA.val && (sa.teamWon > 0 || sa.teamLost > 0)) fewestSeasonPA = { val: sa.teamPA, title: sa.title };
  }

  if (mostSeasonWins.val > 0) {
    seasonRecords.push({
      id: "season_most_wins",
      category: "Most Wins in a Season",
      recordType: "season",
      holder: teamName,
      value: mostSeasonWins.val,
      formattedValue: `${mostSeasonWins.val} Wins`,
      context: mostSeasonWins.title,
      isTeamRecord: true,
      statGroup: "team",
    });
  }

  if (mostSeasonPoints.val > 0) {
    seasonRecords.push({
      id: "season_most_points",
      category: "Most Points Scored in a Season",
      recordType: "season",
      holder: teamName,
      value: mostSeasonPoints.val,
      formattedValue: `${mostSeasonPoints.val} pts`,
      context: mostSeasonPoints.title,
      isTeamRecord: true,
      statGroup: "team",
    });
  }

  if (bestPointDiff.val !== -Infinity && bestPointDiff.val > 0) {
    seasonRecords.push({
      id: "season_best_point_diff",
      category: "Best Season Point Differential",
      recordType: "season",
      holder: teamName,
      value: bestPointDiff.val,
      formattedValue: `+${bestPointDiff.val} pts`,
      context: bestPointDiff.title,
      isTeamRecord: true,
      statGroup: "team",
    });
  }

  // --- Player Single Season Records ---
  let bestSeasonPassTD = { name: "", val: 0, title: "" };
  let bestSeasonPassComp = { name: "", val: 0, title: "" };
  let bestSeasonRecTD = { name: "", val: 0, title: "" };
  let bestSeasonReceptions = { name: "", val: 0, title: "" };
  let bestSeasonRushTD = { name: "", val: 0, title: "" };
  let bestSeasonTotalTD = { name: "", val: 0, title: "" };
  let bestSeasonSacks = { name: "", val: 0, title: "" };
  let bestSeasonInt = { name: "", val: 0, title: "" };
  let bestSeasonPbu = { name: "", val: 0, title: "" };
  let bestSeasonDefTD = { name: "", val: 0, title: "" };
  let bestSeasonFlagPulls = { name: "", val: 0, title: "" };

  for (const sa of allSeasonAggregates) {
    for (const p of sa.players) {
      const pName = p.name;
      if (!pName) continue;
      const passTD = p.passTD || 0;
      const passComp = p.passComp || 0;
      const recTD = p.recTD || 0;
      const receptions = p.receptions || 0;
      const rushTD = p.rushTD || 0;
      const totalTD = p.totalTDs || 0;
      const sacks = p.sacks || 0;
      const int = p.int || 0;
      const pbu = p.pbu || 0;
      const defTD = p.defTD || 0;
      const pulls = p.flagPulls || 0;

      if (passTD > bestSeasonPassTD.val) bestSeasonPassTD = { name: pName, val: passTD, title: sa.title };
      if (passComp > bestSeasonPassComp.val) bestSeasonPassComp = { name: pName, val: passComp, title: sa.title };
      if (recTD > bestSeasonRecTD.val) bestSeasonRecTD = { name: pName, val: recTD, title: sa.title };
      if (receptions > bestSeasonReceptions.val) bestSeasonReceptions = { name: pName, val: receptions, title: sa.title };
      if (rushTD > bestSeasonRushTD.val) bestSeasonRushTD = { name: pName, val: rushTD, title: sa.title };
      if (totalTD > bestSeasonTotalTD.val) bestSeasonTotalTD = { name: pName, val: totalTD, title: sa.title };
      if (sacks > bestSeasonSacks.val) bestSeasonSacks = { name: pName, val: sacks, title: sa.title };
      if (int > bestSeasonInt.val) bestSeasonInt = { name: pName, val: int, title: sa.title };
      if (pbu > bestSeasonPbu.val) bestSeasonPbu = { name: pName, val: pbu, title: sa.title };
      if (defTD > bestSeasonDefTD.val) bestSeasonDefTD = { name: pName, val: defTD, title: sa.title };
      if (pulls > bestSeasonFlagPulls.val) bestSeasonFlagPulls = { name: pName, val: pulls, title: sa.title };
    }
  }

  if (bestSeasonPassTD.val > 0) {
    seasonRecords.push({
      id: "season_pass_td",
      category: "Most Passing TDs in a Season",
      recordType: "season",
      holder: bestSeasonPassTD.name,
      value: bestSeasonPassTD.val,
      formattedValue: `${bestSeasonPassTD.val} Pass TD`,
      context: bestSeasonPassTD.title,
      statGroup: "passing",
    });
  }

  if (bestSeasonPassComp.val > 0) {
    seasonRecords.push({
      id: "season_pass_comp",
      category: "Most Pass Completions in a Season",
      recordType: "season",
      holder: bestSeasonPassComp.name,
      value: bestSeasonPassComp.val,
      formattedValue: `${bestSeasonPassComp.val} Comp`,
      context: bestSeasonPassComp.title,
      statGroup: "passing",
    });
  }

  if (bestSeasonRecTD.val > 0) {
    seasonRecords.push({
      id: "season_rec_td",
      category: "Most Receiving TDs in a Season",
      recordType: "season",
      holder: bestSeasonRecTD.name,
      value: bestSeasonRecTD.val,
      formattedValue: `${bestSeasonRecTD.val} Rec TD`,
      context: bestSeasonRecTD.title,
      statGroup: "receiving",
    });
  }

  if (bestSeasonReceptions.val > 0) {
    seasonRecords.push({
      id: "season_receptions",
      category: "Most Receptions in a Season",
      recordType: "season",
      holder: bestSeasonReceptions.name,
      value: bestSeasonReceptions.val,
      formattedValue: `${bestSeasonReceptions.val} Catches`,
      context: bestSeasonReceptions.title,
      statGroup: "receiving",
    });
  }

  if (bestSeasonRushTD.val > 0) {
    seasonRecords.push({
      id: "season_rush_td",
      category: "Most Rushing TDs in a Season",
      recordType: "season",
      holder: bestSeasonRushTD.name,
      value: bestSeasonRushTD.val,
      formattedValue: `${bestSeasonRushTD.val} Rush TD`,
      context: bestSeasonRushTD.title,
      statGroup: "rushing",
    });
  }

  if (bestSeasonTotalTD.val > 0) {
    seasonRecords.push({
      id: "season_total_td",
      category: "Most Total TDs in a Season",
      recordType: "season",
      holder: bestSeasonTotalTD.name,
      value: bestSeasonTotalTD.val,
      formattedValue: `${bestSeasonTotalTD.val} Total TD`,
      context: bestSeasonTotalTD.title,
      statGroup: "scoring",
    });
  }

  if (bestSeasonSacks.val > 0) {
    seasonRecords.push({
      id: "season_sacks",
      category: "Most Sacks in a Season",
      recordType: "season",
      holder: bestSeasonSacks.name,
      value: bestSeasonSacks.val,
      formattedValue: `${bestSeasonSacks.val} Sacks`,
      context: bestSeasonSacks.title,
      statGroup: "defense",
    });
  }

  if (bestSeasonInt.val > 0) {
    seasonRecords.push({
      id: "season_int",
      category: "Most Interceptions in a Season",
      recordType: "season",
      holder: bestSeasonInt.name,
      value: bestSeasonInt.val,
      formattedValue: `${bestSeasonInt.val} INT`,
      context: bestSeasonInt.title,
      statGroup: "defense",
    });
  }

  if (bestSeasonPbu.val > 0) {
    seasonRecords.push({
      id: "season_pbu",
      category: "Most Pass Breakups in a Season",
      recordType: "season",
      holder: bestSeasonPbu.name,
      value: bestSeasonPbu.val,
      formattedValue: `${bestSeasonPbu.val} PBU`,
      context: bestSeasonPbu.title,
      statGroup: "defense",
    });
  }

  if (bestSeasonDefTD.val > 0) {
    seasonRecords.push({
      id: "season_def_td",
      category: "Most Defensive TDs in a Season",
      recordType: "season",
      holder: bestSeasonDefTD.name,
      value: bestSeasonDefTD.val,
      formattedValue: `${bestSeasonDefTD.val} Def TD`,
      context: bestSeasonDefTD.title,
      statGroup: "defense",
    });
  }

  if (bestSeasonFlagPulls.val > 0) {
    seasonRecords.push({
      id: "season_flag_pulls",
      category: "Most Flag Pulls in a Season",
      recordType: "season",
      holder: bestSeasonFlagPulls.name,
      value: bestSeasonFlagPulls.val,
      formattedValue: `${bestSeasonFlagPulls.val} Pulls`,
      context: bestSeasonFlagPulls.title,
      statGroup: "defense",
    });
  }

  // ==========================================
  // 3. ALL-TIME CAREER RECORDS (TEAM & PLAYER)
  // ==========================================

  // --- Team Career Records ---
  let totalTeamWins = 0;
  let totalTeamPF = 0;
  let totalSeasonsTracked = 0;

  for (const sa of allSeasonAggregates) {
    totalTeamWins += sa.teamWon;
    totalTeamPF += sa.teamPF;
    totalSeasonsTracked += 1;
  }

  if (totalTeamWins > 0) {
    careerRecords.push({
      id: "career_team_wins",
      category: "All-Time Franchise Wins",
      recordType: "career",
      holder: teamName,
      value: totalTeamWins,
      formattedValue: `${totalTeamWins} Wins`,
      context: `Across ${totalSeasonsTracked} season${totalSeasonsTracked === 1 ? "" : "s"}`,
      isTeamRecord: true,
      statGroup: "team",
    });
  }

  if (totalTeamPF > 0) {
    careerRecords.push({
      id: "career_team_points",
      category: "All-Time Franchise Points",
      recordType: "career",
      holder: teamName,
      value: totalTeamPF,
      formattedValue: `${totalTeamPF} pts`,
      context: `Across ${totalSeasonsTracked} season${totalSeasonsTracked === 1 ? "" : "s"}`,
      isTeamRecord: true,
      statGroup: "team",
    });
  }

  // --- Player Career Cumulative Sums ---
  const careerTotals = new Map<
    string,
    {
      name: string;
      seasons: Set<string>;
      gamesPlayed: number;
      passTD: number;
      passComp: number;
      recTD: number;
      receptions: number;
      rushTD: number;
      totalTD: number;
      sacks: number;
      int: number;
      pbu: number;
      defTD: number;
      flagPulls: number;
    }
  >();

  const getCareerEntry = (name: string) => {
    let entry = careerTotals.get(name);
    if (!entry) {
      entry = {
        name,
        seasons: new Set<string>(),
        gamesPlayed: 0,
        passTD: 0,
        passComp: 0,
        recTD: 0,
        receptions: 0,
        rushTD: 0,
        totalTD: 0,
        sacks: 0,
        int: 0,
        pbu: 0,
        defTD: 0,
        flagPulls: 0,
      };
      careerTotals.set(name, entry);
    }
    return entry;
  };

  for (const sa of allSeasonAggregates) {
    for (const p of sa.players) {
      if (!p.name) continue;
      const c = getCareerEntry(p.name);
      c.seasons.add(sa.title);
      c.gamesPlayed += p.gamesPlayed || 0;
      c.passTD += p.passTD || 0;
      c.passComp += p.passComp || 0;
      c.recTD += p.recTD || 0;
      c.receptions += p.receptions || 0;
      c.rushTD += p.rushTD || 0;
      c.totalTD += p.totalTDs || 0;
      c.sacks += p.sacks || 0;
      c.int += p.int || 0;
      c.pbu += p.pbu || 0;
      c.defTD += p.defTD || 0;
      c.flagPulls += p.flagPulls || 0;
    }
  }

  let careerPassTD = { name: "", val: 0, count: 0 };
  let careerPassComp = { name: "", val: 0, count: 0 };
  let careerRecTD = { name: "", val: 0, count: 0 };
  let careerReceptions = { name: "", val: 0, count: 0 };
  let careerRushTD = { name: "", val: 0, count: 0 };
  let careerTotalTD = { name: "", val: 0, count: 0 };
  let careerSacks = { name: "", val: 0, count: 0 };
  let careerInt = { name: "", val: 0, count: 0 };
  let careerPbu = { name: "", val: 0, count: 0 };
  let careerDefTD = { name: "", val: 0, count: 0 };
  let careerFlagPulls = { name: "", val: 0, count: 0 };
  let careerGames = { name: "", val: 0, count: 0 };

  for (const c of careerTotals.values()) {
    const sCount = c.seasons.size;
    if (c.passTD > careerPassTD.val) careerPassTD = { name: c.name, val: c.passTD, count: sCount };
    if (c.passComp > careerPassComp.val) careerPassComp = { name: c.name, val: c.passComp, count: sCount };
    if (c.recTD > careerRecTD.val) careerRecTD = { name: c.name, val: c.recTD, count: sCount };
    if (c.receptions > careerReceptions.val) careerReceptions = { name: c.name, val: c.receptions, count: sCount };
    if (c.rushTD > careerRushTD.val) careerRushTD = { name: c.name, val: c.rushTD, count: sCount };
    if (c.totalTD > careerTotalTD.val) careerTotalTD = { name: c.name, val: c.totalTD, count: sCount };
    if (c.sacks > careerSacks.val) careerSacks = { name: c.name, val: c.sacks, count: sCount };
    if (c.int > careerInt.val) careerInt = { name: c.name, val: c.int, count: sCount };
    if (c.pbu > careerPbu.val) careerPbu = { name: c.name, val: c.pbu, count: sCount };
    if (c.defTD > careerDefTD.val) careerDefTD = { name: c.name, val: c.defTD, count: sCount };
    if (c.flagPulls > careerFlagPulls.val) careerFlagPulls = { name: c.name, val: c.flagPulls, count: sCount };
    if (c.gamesPlayed > careerGames.val) careerGames = { name: c.name, val: c.gamesPlayed, count: sCount };
  }

  const seasonSuffix = (count: number) => `${count} season${count === 1 ? "" : "s"}`;

  if (careerPassTD.val > 0) {
    careerRecords.push({
      id: "career_pass_td",
      category: "All-Time Passing Touchdowns",
      recordType: "career",
      holder: careerPassTD.name,
      value: careerPassTD.val,
      formattedValue: `${careerPassTD.val} Pass TD`,
      context: seasonSuffix(careerPassTD.count),
      statGroup: "passing",
    });
  }

  if (careerPassComp.val > 0) {
    careerRecords.push({
      id: "career_pass_comp",
      category: "All-Time Pass Completions",
      recordType: "career",
      holder: careerPassComp.name,
      value: careerPassComp.val,
      formattedValue: `${careerPassComp.val} Comp`,
      context: seasonSuffix(careerPassComp.count),
      statGroup: "passing",
    });
  }

  if (careerRecTD.val > 0) {
    careerRecords.push({
      id: "career_rec_td",
      category: "All-Time Receiving Touchdowns",
      recordType: "career",
      holder: careerRecTD.name,
      value: careerRecTD.val,
      formattedValue: `${careerRecTD.val} Rec TD`,
      context: seasonSuffix(careerRecTD.count),
      statGroup: "receiving",
    });
  }

  if (careerReceptions.val > 0) {
    careerRecords.push({
      id: "career_receptions",
      category: "All-Time Career Receptions",
      recordType: "career",
      holder: careerReceptions.name,
      value: careerReceptions.val,
      formattedValue: `${careerReceptions.val} Catches`,
      context: seasonSuffix(careerReceptions.count),
      statGroup: "receiving",
    });
  }

  if (careerRushTD.val > 0) {
    careerRecords.push({
      id: "career_rush_td",
      category: "All-Time Rushing Touchdowns",
      recordType: "career",
      holder: careerRushTD.name,
      value: careerRushTD.val,
      formattedValue: `${careerRushTD.val} Rush TD`,
      context: seasonSuffix(careerRushTD.count),
      statGroup: "rushing",
    });
  }

  if (careerTotalTD.val > 0) {
    careerRecords.push({
      id: "career_total_td",
      category: "All-Time Total Touchdowns",
      recordType: "career",
      holder: careerTotalTD.name,
      value: careerTotalTD.val,
      formattedValue: `${careerTotalTD.val} Total TD`,
      context: seasonSuffix(careerTotalTD.count),
      statGroup: "scoring",
    });
  }

  if (careerSacks.val > 0) {
    careerRecords.push({
      id: "career_sacks",
      category: "All-Time Franchise Sacks",
      recordType: "career",
      holder: careerSacks.name,
      value: careerSacks.val,
      formattedValue: `${careerSacks.val} Sacks`,
      context: seasonSuffix(careerSacks.count),
      statGroup: "defense",
    });
  }

  if (careerInt.val > 0) {
    careerRecords.push({
      id: "career_int",
      category: "All-Time Franchise Interceptions",
      recordType: "career",
      holder: careerInt.name,
      value: careerInt.val,
      formattedValue: `${careerInt.val} INT`,
      context: seasonSuffix(careerInt.count),
      statGroup: "defense",
    });
  }

  if (careerPbu.val > 0) {
    careerRecords.push({
      id: "career_pbu",
      category: "All-Time Pass Breakups",
      recordType: "career",
      holder: careerPbu.name,
      value: careerPbu.val,
      formattedValue: `${careerPbu.val} PBU`,
      context: seasonSuffix(careerPbu.count),
      statGroup: "defense",
    });
  }

  if (careerDefTD.val > 0) {
    careerRecords.push({
      id: "career_def_td",
      category: "All-Time Defensive Touchdowns",
      recordType: "career",
      holder: careerDefTD.name,
      value: careerDefTD.val,
      formattedValue: `${careerDefTD.val} Def TD`,
      context: seasonSuffix(careerDefTD.count),
      statGroup: "defense",
    });
  }

  if (careerFlagPulls.val > 0) {
    careerRecords.push({
      id: "career_flag_pulls",
      category: "All-Time Career Flag Pulls",
      recordType: "career",
      holder: careerFlagPulls.name,
      value: careerFlagPulls.val,
      formattedValue: `${careerFlagPulls.val} Pulls`,
      context: seasonSuffix(careerFlagPulls.count),
      statGroup: "defense",
    });
  }

  if (careerGames.val > 0) {
    careerRecords.push({
      id: "career_games_played",
      category: "Most Career Games Played",
      recordType: "career",
      holder: careerGames.name,
      value: careerGames.val,
      formattedValue: `${careerGames.val} Games`,
      context: seasonSuffix(careerGames.count),
      statGroup: "scoring",
    });
  }

  return {
    gameRecords,
    seasonRecords,
    careerRecords,
  };
}
