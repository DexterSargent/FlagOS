import { isRealTeam, getTeamShortcode } from "@/components/TeamAssets";
import { PlayoffFormat } from "./leagueContext";

export interface TeamStanding {
  teamId: string;
  teamName: string;
  color?: string;
  shortcode?: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  streak: string;
  rank: number;
  playoffSeed?: number;
  playoffStatus: "clinched_bye" | "in_spot" | "on_bubble" | "outside";
}

export interface BracketMatchNode {
  id: string;
  roundName: string;
  roundIndex: number;
  matchIndex: number;
  homeTeam: TeamStanding | null;
  awayTeam: TeamStanding | null;
  homeSeedLabel: string;
  awaySeedLabel: string;
  actualMatchId?: string;
  date?: string;
  time?: string;
  location?: string;
  status: "projected" | "scheduled" | "in_progress" | "completed";
  homeScore?: number;
  awayScore?: number;
  winnerTeamId?: string;
  bracketType?: "winners" | "losers" | "finals";
}

export interface BracketRound {
  name: string;
  roundIndex: number;
  matches: BracketMatchNode[];
  bracketType?: "winners" | "losers" | "finals";
}

/**
 * Calculates current seasonal standings based on completed regular season games.
 */
export function calculateStandings(
  teams: any[],
  matches: any[],
  playoffTeamsCount: number = 8
): TeamStanding[] {
  const eligibleTeams = teams.filter(isRealTeam);
  const teamMap: Record<string, TeamStanding> = {};

  eligibleTeams.forEach((t) => {
    teamMap[t.id] = {
      teamId: t.id,
      teamName: t.name,
      color: t.color || "#06b6d4",
      shortcode: t.shortcode || getTeamShortcode(t),
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      winPct: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      diff: 0,
      streak: "-",
      rank: 0,
      playoffStatus: "outside",
    };
  });

  // Track match outcomes by team for streak calculation
  const teamResults: Record<string, Array<"W" | "L" | "T">> = {};
  eligibleTeams.forEach((t) => {
    teamResults[t.id] = [];
  });

  // Filter completed regular-season games
  const completedRegSeason = matches
    .filter(
      (m) =>
        (m.status === "completed" || m.status === "Final") &&
        !m.isPreseason &&
        !m.isPlayoff &&
        !m.week?.toString().toLowerCase().includes("playoff")
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  completedRegSeason.forEach((m) => {
    const homeId = m.homeTeamId;
    const awayId = m.awayTeamId;
    const homeScore = Number(m.homeScore ?? 0);
    const awayScore = Number(m.awayScore ?? 0);

    if (teamMap[homeId]) {
      teamMap[homeId].gamesPlayed += 1;
      teamMap[homeId].pointsFor += homeScore;
      teamMap[homeId].pointsAgainst += awayScore;
      if (homeScore > awayScore) {
        teamMap[homeId].wins += 1;
        teamResults[homeId]?.push("W");
      } else if (homeScore < awayScore) {
        teamMap[homeId].losses += 1;
        teamResults[homeId]?.push("L");
      } else {
        teamMap[homeId].ties += 1;
        teamResults[homeId]?.push("T");
      }
    }

    if (teamMap[awayId]) {
      teamMap[awayId].gamesPlayed += 1;
      teamMap[awayId].pointsFor += awayScore;
      teamMap[awayId].pointsAgainst += homeScore;
      if (awayScore > homeScore) {
        teamMap[awayId].wins += 1;
        teamResults[awayId]?.push("W");
      } else if (awayScore < homeScore) {
        teamMap[awayId].losses += 1;
        teamResults[awayId]?.push("L");
      } else {
        teamMap[awayId].ties += 1;
        teamResults[awayId]?.push("T");
      }
    }
  });

  // Calculate Win % and Streaks
  const standingsList: TeamStanding[] = Object.values(teamMap).map((item) => {
    const total = item.gamesPlayed;
    const winPct = total > 0 ? (item.wins + 0.5 * item.ties) / total : 0;
    const diff = item.pointsFor - item.pointsAgainst;

    // Streak
    const results = teamResults[item.teamId] || [];
    let streakStr = "-";
    if (results.length > 0) {
      const last = results[results.length - 1];
      let count = 0;
      for (let i = results.length - 1; i >= 0; i--) {
        if (results[i] === last) count++;
        else break;
      }
      streakStr = `${last}${count}`;
    }

    return {
      ...item,
      winPct,
      diff,
      streak: streakStr,
    };
  });

  // Standard Football Standings Sort Hierarchy
  standingsList.sort((a, b) => {
    // 1. Win Percentage
    if (b.winPct !== a.winPct) return b.winPct - a.winPct;
    // 2. Point Differential
    if (b.diff !== a.diff) return b.diff - a.diff;
    // 3. Points Scored (PF)
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
    // 4. Points Allowed (fewer is better)
    if (a.pointsAgainst !== b.pointsAgainst) return a.pointsAgainst - b.pointsAgainst;
    // 5. Team Name
    return a.teamName.localeCompare(b.teamName);
  });

  // Assign Ranks and Playoff Seed Badges
  const bubbleThreshold = Math.min(playoffTeamsCount + 4, standingsList.length);
  return standingsList.map((item, idx) => {
    const rank = idx + 1;
    let playoffStatus: "clinched_bye" | "in_spot" | "on_bubble" | "outside" = "outside";

    if (rank <= playoffTeamsCount) {
      playoffStatus = "in_spot";
    } else if (rank <= bubbleThreshold) {
      playoffStatus = "on_bubble";
    }

    return {
      ...item,
      rank,
      playoffSeed: rank <= playoffTeamsCount ? rank : undefined,
      playoffStatus,
    };
  });
}

/**
 * Checks whether the playoff tournament has actively begun.
 */
export function isPlayoffActive(matches: any[]): boolean {
  if (!matches || matches.length === 0) return false;

  // 1. Has any playoff match started or completed?
  const playoffMatches = matches.filter(
    (m) => m.isPlayoff || m.week?.toString().toLowerCase().includes("playoff")
  );
  if (playoffMatches.length > 0) {
    const hasStarted = playoffMatches.some(
      (m) => m.status === "in_progress" || m.status === "completed" || m.status === "Final"
    );
    if (hasStarted) return true;
  }

  // 2. Are all regular season matches completed?
  const regMatches = matches.filter(
    (m) => !m.isPreseason && !m.isPlayoff && !m.week?.toString().toLowerCase().includes("playoff")
  );
  if (regMatches.length > 0 && regMatches.every((m) => m.status === "completed" || m.status === "Final")) {
    return true;
  }

  return false;
}

/**
 * Generates an interactive tournament bracket structured according to the playoff format,
 * supporting ANY team count from 2 up to total teams,
 * with top seeds awarded byes when the team count is not a power of 2.
 * Crucially: DOES NOT predict future match outcomes, only showing where teams fall.
 */
export function generatePlayoffBracket(
  standings: TeamStanding[],
  format: PlayoffFormat,
  matches: any[] = []
): BracketRound[] {
  if (format?.structure === "double_elimination") {
    return generateDoubleEliminationBracket(standings, format, matches);
  }

  // Clamped between 2 and standings.length
  const teamsCount = Math.max(2, Math.min(standings.length, format?.teamsCount || 8));
  const playoffMatches = matches.filter(
    (m) => m.isPlayoff || m.week?.toString().toLowerCase().includes("playoff")
  );

  const getTeamBySeed = (seedNum: number): TeamStanding | null => {
    return standings.find((s) => s.rank === seedNum) || null;
  };

  // Find power of 2: P = 2^k where P >= teamsCount
  let P = 2;
  while (P < teamsCount) {
    P *= 2;
  }
  const totalRoundsCount = Math.round(Math.log2(P)); // e.g. 1 for 2, 2 for 4, 3 for 8, 4 for 16, 5 for 32

  // Generate standard tournament seeds order for size P
  // (e.g. P=8 -> [1, 8, 4, 5, 2, 7, 3, 6])
  let seedsOrder = [1, 2];
  while (seedsOrder.length < P) {
    const nextSize = seedsOrder.length * 2;
    const nextList: number[] = [];
    for (const s of seedsOrder) {
      nextList.push(s);
      nextList.push(nextSize + 1 - s);
    }
    seedsOrder = nextList;
  }

  const getRoundName = (roundIdx: number, totalRounds: number) => {
    const roundsFromEnd = totalRounds - 1 - roundIdx;
    if (teamsCount === 14 || teamsCount === 12) {
      if (roundsFromEnd === 0) return "League Championship";
      if (roundsFromEnd === 1) return "Conference Championships";
      if (roundsFromEnd === 2) return "Divisional Round";
      if (roundsFromEnd === 3) return "Wild Card Round";
    }
    if (roundsFromEnd === 0) return "Championship";
    if (roundsFromEnd === 1) return "Semifinals";
    if (roundsFromEnd === 2) return "Quarterfinals";
    if (roundsFromEnd === 3) return "Round of 16";
    if (roundsFromEnd === 4) return "Round of 32";
    if (roundsFromEnd === 5) return "Round of 64";
    return `Round ${roundIdx + 1}`;
  };

  // Special case: P = 2 (Championship only for 2 teams)
  if (P === 2) {
    const s1 = getTeamBySeed(1);
    const s2 = getTeamBySeed(2);
    const m = playoffMatches.find(
      (match) => match.playoffRound === "Championship" || match.order === 0
    );
    const champMatch: BracketMatchNode = {
      id: "bracket_champ_1",
      roundName: "Championship",
      roundIndex: 0,
      matchIndex: 0,
      homeTeam: s1,
      awayTeam: s2,
      homeSeedLabel: "#1 Seed",
      awaySeedLabel: "#2 Seed",
      actualMatchId: m?.id,
      date: m?.date,
      time: m?.time,
      location: m?.location,
      status: m ? (m.status as any) : "projected",
      homeScore: m?.homeScore,
      awayScore: m?.awayScore,
      winnerTeamId:
        m?.status === "completed"
          ? (m.homeScore ?? 0) > (m.awayScore ?? 0)
            ? m.homeTeamId
            : m.awayTeamId
          : undefined,
    };
    return [{ name: "Championship", roundIndex: 0, matches: [champMatch] }];
  }

  // General P >= 4:
  interface RoundSlotInfo {
    team: TeamStanding | null;
    label: string;
    isBye?: boolean;
    winnerTeamId?: string;
  }

  let previousRoundSlots: RoundSlotInfo[] = [];
  const rounds: BracketRound[] = [];
  const numPairs = P / 2;
  const round0Name = getRoundName(0, totalRoundsCount);
  const round0Matches: BracketMatchNode[] = [];

  // Round 0
  for (let i = 0; i < numPairs; i++) {
    const seedA = seedsOrder[2 * i];
    const seedB = seedsOrder[2 * i + 1];

    if (seedB > teamsCount) {
      // seedA has a first round bye!
      const teamA = getTeamBySeed(seedA);
      previousRoundSlots.push({
        team: teamA,
        label: `#${seedA} Seed (Bye)`,
        isBye: true,
        winnerTeamId: teamA?.teamId,
      });
    } else {
      // Real match in Round 0
      const teamA = getTeamBySeed(seedA);
      const teamB = getTeamBySeed(seedB);
      const matchIdx = round0Matches.length;

      const actualM = playoffMatches.find(
        (m) =>
          (m.playoffRound === round0Name || (!m.playoffRound && m.order === matchIdx)) &&
          (!m.homeTeamId || m.homeTeamId === teamA?.teamId || m.awayTeamId === teamA?.teamId)
      );

      const isCompleted = actualM?.status === "completed";
      const winnerId = isCompleted
        ? (actualM.homeScore ?? 0) > (actualM.awayScore ?? 0)
          ? actualM.homeTeamId
          : actualM.awayTeamId
        : undefined;

      const node: BracketMatchNode = {
        id: `bracket_r0_${matchIdx}`,
        roundName: round0Name,
        roundIndex: 0,
        matchIndex: matchIdx,
        homeTeam: teamA,
        awayTeam: teamB,
        homeSeedLabel: `#${seedA} Seed`,
        awaySeedLabel: `#${seedB} Seed`,
        actualMatchId: actualM?.id,
        date: actualM?.date,
        time: actualM?.time,
        location: actualM?.location,
        status: actualM ? (actualM.status as any) : "projected",
        homeScore: actualM?.homeScore,
        awayScore: actualM?.awayScore,
        winnerTeamId: winnerId,
      };

      round0Matches.push(node);

      const winningTeamObj = winnerId ? standings.find((s) => s.teamId === winnerId) || null : null;
      previousRoundSlots.push({
        // NO PREDICTIONS: if game not played yet, team is strictly null!
        team: winningTeamObj,
        label: winningTeamObj ? winningTeamObj.teamName : `Winner Match ${matchIdx + 1}`,
        winnerTeamId: winnerId,
      });
    }
  }

  if (round0Matches.length > 0) {
    rounds.push({
      name: round0Name,
      roundIndex: 0,
      matches: round0Matches,
    });
  }

  // Build subsequent rounds (1 to totalRoundsCount - 1)
  for (let r = 1; r < totalRoundsCount; r++) {
    const roundName = getRoundName(r, totalRoundsCount);
    const roundMatches: BracketMatchNode[] = [];
    const nextSlots: RoundSlotInfo[] = [];
    const matchesInThisRound = previousRoundSlots.length / 2;

    for (let m = 0; m < matchesInThisRound; m++) {
      const slotHome = previousRoundSlots[2 * m];
      const slotAway = previousRoundSlots[2 * m + 1];

      const actualM = playoffMatches.find(
        (pm) =>
          pm.playoffRound === roundName &&
          (pm.order === m ||
            (slotHome.team && pm.homeTeamId === slotHome.team.teamId) ||
            (slotAway.team && pm.awayTeamId === slotAway.team.teamId))
      );

      const isCompleted = actualM?.status === "completed";
      const winnerId = isCompleted
        ? (actualM.homeScore ?? 0) > (actualM.awayScore ?? 0)
          ? actualM.homeTeamId
          : actualM.awayTeamId
        : undefined;

      const node: BracketMatchNode = {
        id: `bracket_r${r}_${m}`,
        roundName,
        roundIndex: r,
        matchIndex: m,
        // STRICTLY NO PREDICTIONS: only filled if team had a BYE or finished match!
        homeTeam: slotHome.team,
        awayTeam: slotAway.team,
        homeSeedLabel: slotHome.team
          ? `#${slotHome.team.rank} Seed${slotHome.isBye ? " (Bye)" : ""}`
          : slotHome.label,
        awaySeedLabel: slotAway.team
          ? `#${slotAway.team.rank} Seed${slotAway.isBye ? " (Bye)" : ""}`
          : slotAway.label,
        actualMatchId: actualM?.id,
        date: actualM?.date,
        time: actualM?.time,
        location: actualM?.location,
        status: actualM ? (actualM.status as any) : "projected",
        homeScore: actualM?.homeScore,
        awayScore: actualM?.awayScore,
        winnerTeamId: winnerId,
      };

      roundMatches.push(node);

      const winningTeamObj = winnerId ? standings.find((s) => s.teamId === winnerId) || null : null;
      nextSlots.push({
        team: winningTeamObj,
        label: winningTeamObj ? winningTeamObj.teamName : `Winner ${roundName} ${m + 1}`,
        winnerTeamId: winnerId,
      });
    }

    rounds.push({
      name: roundName,
      roundIndex: r,
      matches: roundMatches,
    });

    previousRoundSlots = nextSlots;
  }

  return rounds;
}

/**
 * Generates an interactive double elimination tournament bracket:
 * - Winners Bracket (Upper Bracket): Standard seeded single-elimination path.
 * - Losers Bracket (Elimination Bracket): 2nd-chance path for teams that take 1 loss.
 * - Grand Championship: Deciding match between Upper Champion and Lower Champion (+ If Necessary reset match).
 */
export function generateDoubleEliminationBracket(
  standings: TeamStanding[],
  format: PlayoffFormat,
  matches: any[] = []
): BracketRound[] {
  const teamsCount = Math.max(2, Math.min(standings.length, format?.teamsCount || 8));
  const playoffMatches = matches.filter(
    (m) => m.isPlayoff || m.week?.toString().toLowerCase().includes("playoff")
  );

  const getTeamBySeed = (seedNum: number): TeamStanding | null => {
    return standings.find((s) => s.rank === seedNum) || null;
  };

  let P = 2;
  while (P < teamsCount) P *= 2;
  const W = Math.round(Math.log2(P)); // Number of winners rounds

  // Seeds order for P
  let seedsOrder = [1, 2];
  while (seedsOrder.length < P) {
    const nextSize = seedsOrder.length * 2;
    const nextList: number[] = [];
    for (const s of seedsOrder) {
      nextList.push(s);
      nextList.push(nextSize + 1 - s);
    }
    seedsOrder = nextList;
  }

  const getUpperRoundName = (roundIdx: number, totalRounds: number) => {
    const fromEnd = totalRounds - 1 - roundIdx;
    if (fromEnd === 0) return "Upper Bracket Final";
    if (fromEnd === 1) return "Upper Semifinals";
    if (fromEnd === 2) return teamsCount >= 12 ? "Upper Divisional" : "Upper Quarterfinals";
    if (fromEnd === 3) return teamsCount >= 12 ? "Upper Wild Card" : "Upper Round 1";
    return `Upper Round ${roundIdx + 1}`;
  };

  const rounds: BracketRound[] = [];
  const droppedLosersPerRound: Array<Array<{ team: TeamStanding | null; label: string }>> = [];

  // ==========================================
  // 1. WINNERS BRACKET (UPPER BRACKET)
  // ==========================================
  interface RoundSlotInfo {
    team: TeamStanding | null;
    label: string;
    isBye?: boolean;
    winnerTeamId?: string;
    loserTeam?: TeamStanding | null;
    loserLabel?: string;
  }

  let previousUpperSlots: RoundSlotInfo[] = [];

  // Round 0 of Upper
  const round0Name = getUpperRoundName(0, W);
  const round0Matches: BracketMatchNode[] = [];
  const round0DroppedLosers: Array<{ team: TeamStanding | null; label: string }> = [];
  const numPairs = P / 2;

  for (let i = 0; i < numPairs; i++) {
    const seedA = seedsOrder[2 * i];
    const seedB = seedsOrder[2 * i + 1];

    if (seedB > teamsCount) {
      // Bye in opening round
      const teamA = getTeamBySeed(seedA);
      previousUpperSlots.push({
        team: teamA,
        label: `#${seedA} Seed (Bye)`,
        isBye: true,
        winnerTeamId: teamA?.teamId,
      });
    } else {
      const teamA = getTeamBySeed(seedA);
      const teamB = getTeamBySeed(seedB);
      const mIdx = round0Matches.length;

      const actualM = playoffMatches.find(
        (m) =>
          m.playoffRound?.toLowerCase().includes("upper") ||
          (!m.playoffRound && m.order === mIdx)
      );

      const isCompleted = actualM?.status === "completed";
      const winnerId = isCompleted
        ? (actualM.homeScore ?? 0) > (actualM.awayScore ?? 0)
          ? actualM.homeTeamId
          : actualM.awayTeamId
        : undefined;
      const loserId = isCompleted
        ? (actualM.homeScore ?? 0) > (actualM.awayScore ?? 0)
          ? actualM.awayTeamId
          : actualM.homeTeamId
        : undefined;

      const node: BracketMatchNode = {
        id: `bracket_ub_r0_${mIdx}`,
        roundName: round0Name,
        roundIndex: 0,
        matchIndex: mIdx,
        homeTeam: teamA,
        awayTeam: teamB,
        homeSeedLabel: `#${seedA} Seed`,
        awaySeedLabel: `#${seedB} Seed`,
        actualMatchId: actualM?.id,
        date: actualM?.date,
        time: actualM?.time,
        location: actualM?.location,
        status: actualM ? (actualM.status as any) : "projected",
        homeScore: actualM?.homeScore,
        awayScore: actualM?.awayScore,
        winnerTeamId: winnerId,
        bracketType: "winners",
      };
      round0Matches.push(node);

      const winningTeamObj = winnerId ? standings.find((s) => s.teamId === winnerId) || null : null;
      const losingTeamObj = loserId ? standings.find((s) => s.teamId === loserId) || null : null;

      previousUpperSlots.push({
        team: winningTeamObj,
        label: winningTeamObj ? winningTeamObj.teamName : `Winner ${round0Name} M${mIdx + 1}`,
        winnerTeamId: winnerId,
        loserTeam: losingTeamObj,
        loserLabel: losingTeamObj ? losingTeamObj.teamName : `Loser ${round0Name} M${mIdx + 1}`,
      });

      round0DroppedLosers.push({
        team: losingTeamObj,
        label: losingTeamObj ? losingTeamObj.teamName : `Loser ${round0Name} M${mIdx + 1}`,
      });
    }
  }

  if (round0Matches.length > 0) {
    rounds.push({
      name: round0Name,
      roundIndex: 0,
      matches: round0Matches,
      bracketType: "winners",
    });
  }
  droppedLosersPerRound.push(round0DroppedLosers);

  // Subsequent Upper Rounds (1 to W - 1)
  for (let r = 1; r < W; r++) {
    const roundName = getUpperRoundName(r, W);
    const roundMatches: BracketMatchNode[] = [];
    const nextSlots: RoundSlotInfo[] = [];
    const currentDropped: Array<{ team: TeamStanding | null; label: string }> = [];
    const matchesInRound = previousUpperSlots.length / 2;

    for (let m = 0; m < matchesInRound; m++) {
      const slotHome = previousUpperSlots[2 * m];
      const slotAway = previousUpperSlots[2 * m + 1];

      const actualM = playoffMatches.find(
        (pm) =>
          pm.playoffRound === roundName &&
          (pm.order === m ||
            (slotHome.team && pm.homeTeamId === slotHome.team.teamId) ||
            (slotAway.team && pm.awayTeamId === slotAway.team.teamId))
      );

      const isCompleted = actualM?.status === "completed";
      const winnerId = isCompleted
        ? (actualM.homeScore ?? 0) > (actualM.awayScore ?? 0)
          ? actualM.homeTeamId
          : actualM.awayTeamId
        : undefined;
      const loserId = isCompleted
        ? (actualM.homeScore ?? 0) > (actualM.awayScore ?? 0)
          ? actualM.awayTeamId
          : actualM.homeTeamId
        : undefined;

      const node: BracketMatchNode = {
        id: `bracket_ub_r${r}_${m}`,
        roundName,
        roundIndex: r,
        matchIndex: m,
        homeTeam: slotHome.team,
        awayTeam: slotAway.team,
        homeSeedLabel: slotHome.team
          ? `#${slotHome.team.rank} Seed${slotHome.isBye ? " (Bye)" : ""}`
          : slotHome.label,
        awaySeedLabel: slotAway.team
          ? `#${slotAway.team.rank} Seed${slotAway.isBye ? " (Bye)" : ""}`
          : slotAway.label,
        actualMatchId: actualM?.id,
        date: actualM?.date,
        time: actualM?.time,
        location: actualM?.location,
        status: actualM ? (actualM.status as any) : "projected",
        homeScore: actualM?.homeScore,
        awayScore: actualM?.awayScore,
        winnerTeamId: winnerId,
        bracketType: "winners",
      };
      roundMatches.push(node);

      const winningTeamObj = winnerId ? standings.find((s) => s.teamId === winnerId) || null : null;
      const losingTeamObj = loserId ? standings.find((s) => s.teamId === loserId) || null : null;

      nextSlots.push({
        team: winningTeamObj,
        label: winningTeamObj ? winningTeamObj.teamName : `Winner ${roundName} M${m + 1}`,
        winnerTeamId: winnerId,
        loserTeam: losingTeamObj,
        loserLabel: losingTeamObj ? losingTeamObj.teamName : `Loser ${roundName} M${m + 1}`,
      });

      currentDropped.push({
        team: losingTeamObj,
        label: losingTeamObj ? losingTeamObj.teamName : `Loser ${roundName} M${m + 1}`,
      });
    }

    rounds.push({
      name: roundName,
      roundIndex: r,
      matches: roundMatches,
      bracketType: "winners",
    });
    droppedLosersPerRound.push(currentDropped);
    previousUpperSlots = nextSlots;
  }

  // Upper Bracket Champion
  const upperChampionSlot = previousUpperSlots[0];

  // ==========================================
  // 2. LOSERS BRACKET (ELIMINATION BRACKET)
  // ==========================================
  const totalLosersRounds = Math.max(1, 2 * (W - 1));
  let currentLosersPool: Array<{ team: TeamStanding | null; label: string }> = [...droppedLosersPerRound[0]];
  let losersRoundIdx = 0;

  for (let step = 1; step < W; step++) {
    // Phase A: Survivors match (halving the current pool if needed)
    if (currentLosersPool.length >= 2) {
      const lrName =
        losersRoundIdx === totalLosersRounds - 1
          ? "Elimination Final"
          : `Elimination Round ${losersRoundIdx + 1}`;
      const lrMatches: BracketMatchNode[] = [];
      const nextSurvivorPool: Array<{ team: TeamStanding | null; label: string }> = [];
      const numMatches = Math.floor(currentLosersPool.length / 2);

      for (let m = 0; m < numMatches; m++) {
        const slotA = currentLosersPool[2 * m];
        const slotB = currentLosersPool[2 * m + 1];

        const node: BracketMatchNode = {
          id: `bracket_lb_r${losersRoundIdx}_${m}`,
          roundName: lrName,
          roundIndex: losersRoundIdx,
          matchIndex: m,
          homeTeam: slotA.team,
          awayTeam: slotB.team,
          homeSeedLabel: slotA.team ? `#${slotA.team.rank} ${slotA.team.teamName}` : slotA.label,
          awaySeedLabel: slotB.team ? `#${slotB.team.rank} ${slotB.team.teamName}` : slotB.label,
          status: "projected",
          bracketType: "losers",
        };
        lrMatches.push(node);
        nextSurvivorPool.push({
          team: null,
          label: `Winner ${lrName} M${m + 1}`,
        });
      }

      rounds.push({
        name: lrName,
        roundIndex: losersRoundIdx,
        matches: lrMatches,
        bracketType: "losers",
      });
      currentLosersPool = nextSurvivorPool;
      losersRoundIdx++;
    }

    // Phase B: Feed from Upper Round `step` losers
    const droppingFromUpper = droppedLosersPerRound[step] || [];
    if (droppingFromUpper.length > 0) {
      const lrName =
        losersRoundIdx === totalLosersRounds - 1
          ? "Elimination Final"
          : `Elimination Round ${losersRoundIdx + 1}`;
      const lrMatches: BracketMatchNode[] = [];
      const nextSurvivorPool: Array<{ team: TeamStanding | null; label: string }> = [];
      const numPairings = Math.max(currentLosersPool.length, droppingFromUpper.length);

      for (let m = 0; m < numPairings; m++) {
        const survivor = currentLosersPool[m] || { team: null, label: `Elimination Survivor ${m + 1}` };
        const dropper = droppingFromUpper[m] || { team: null, label: `Upper Drop ${m + 1}` };

        const node: BracketMatchNode = {
          id: `bracket_lb_r${losersRoundIdx}_${m}`,
          roundName: lrName,
          roundIndex: losersRoundIdx,
          matchIndex: m,
          homeTeam: dropper.team,
          awayTeam: survivor.team,
          homeSeedLabel: dropper.team ? `#${dropper.team.rank} ${dropper.team.teamName}` : dropper.label,
          awaySeedLabel: survivor.team ? `#${survivor.team.rank} ${survivor.team.teamName}` : survivor.label,
          status: "projected",
          bracketType: "losers",
        };
        lrMatches.push(node);
        nextSurvivorPool.push({
          team: null,
          label: `Winner ${lrName} M${m + 1}`,
        });
      }

      rounds.push({
        name: lrName,
        roundIndex: losersRoundIdx,
        matches: lrMatches,
        bracketType: "losers",
      });
      currentLosersPool = nextSurvivorPool;
      losersRoundIdx++;
    }
  }

  // Elimination Bracket Champion
  const eliminationChampionSlot = currentLosersPool[0] || {
    team: null,
    label: "Elimination Bracket Champion",
  };

  // ==========================================
  // 3. GRAND FINALS
  // ==========================================
  const grandFinalMatch: BracketMatchNode = {
    id: "bracket_gf_1",
    roundName: "Grand Championship",
    roundIndex: 0,
    matchIndex: 0,
    homeTeam: upperChampionSlot.team,
    awayTeam: eliminationChampionSlot.team,
    homeSeedLabel: upperChampionSlot.team
      ? `#${upperChampionSlot.team.rank} ${upperChampionSlot.team.teamName} (Upper Champion)`
      : upperChampionSlot.label,
    awaySeedLabel: eliminationChampionSlot.team
      ? `#${eliminationChampionSlot.team.rank} ${eliminationChampionSlot.team.teamName} (Lower Champion)`
      : eliminationChampionSlot.label,
    status: "projected",
    bracketType: "finals",
  };

  const grandFinalReset: BracketMatchNode = {
    id: "bracket_gf_reset",
    roundName: "Grand Championship Reset (If Necessary)",
    roundIndex: 0,
    matchIndex: 1,
    homeTeam: upperChampionSlot.team,
    awayTeam: eliminationChampionSlot.team,
    homeSeedLabel: upperChampionSlot.team
      ? `#${upperChampionSlot.team.rank} ${upperChampionSlot.team.teamName}`
      : "Upper Bracket Champion",
    awaySeedLabel: eliminationChampionSlot.team
      ? `#${eliminationChampionSlot.team.rank} ${eliminationChampionSlot.team.teamName}`
      : "Elimination Bracket Champion",
    status: "projected",
    bracketType: "finals",
  };

  rounds.push({
    name: "Grand Championship",
    roundIndex: 0,
    matches: [grandFinalMatch, grandFinalReset],
    bracketType: "finals",
  });

  return rounds;
}
