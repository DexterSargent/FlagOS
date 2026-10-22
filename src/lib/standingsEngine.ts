import { isRealTeam, getTeamShortcode } from "@/components/TeamAssets";
import {
  PlayoffFormat,
  getNearestSimplePlayoffBracket,
  getDefaultPlayoffFormat,
  resolveLeaguePlayoffFormat,
} from "./leagueContext";

export {
  getNearestSimplePlayoffBracket,
  getDefaultPlayoffFormat,
  resolveLeaguePlayoffFormat,
};

export type ClinchStatus =
  | "clinched_bye"
  | "clinched_playoffs"
  | "in_hunt"
  | "on_bubble"
  | "eliminated";

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
  clinchStatus?: ClinchStatus;
  clinchLabel?: string;
}

export interface BracketSource {
  matchId: string;
  result: "winner" | "loser";
}

interface BracketSlot {
  team: TeamStanding | null;
  label: string;
  source?: BracketSource;
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
  liveHeartbeatAt?: unknown;
  awayScore?: number;
  winnerTeamId?: string;
  bracketType?: "winners" | "losers" | "finals";
  homeSource?: BracketSource;
  awaySource?: BracketSource;
}

export interface BracketRound {
  name: string;
  roundIndex: number;
  matches: BracketMatchNode[];
  bracketType?: "winners" | "losers" | "finals";
}

export interface StandingSortRow {
  winPct: number;
  diff: number;
  pointsFor: number;
  pointsAgainst: number;
  name: string;
}

/**
 * Single standings tiebreak order used by every standings view and playoff seeding:
 * win %, point differential, points for, fewest points against, then team name.
 */
export function compareStandingRows(a: StandingSortRow, b: StandingSortRow): number {
  if (b.winPct !== a.winPct) return b.winPct - a.winPct;
  if (b.diff !== a.diff) return b.diff - a.diff;
  if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
  if (a.pointsAgainst !== b.pointsAgainst) return a.pointsAgainst - b.pointsAgainst;
  return (a.name || "").localeCompare(b.name || "");
}

/**
 * Calculates current seasonal standings based on completed regular season games.
 */
export function calculateStandings(
  teams: any[],
  matches: any[],
  playoffTeamsCount?: number
): TeamStanding[] {
  const eligibleTeams = teams.filter(isRealTeam);
  const targetPlayoffCount =
    typeof playoffTeamsCount === "number" && playoffTeamsCount > 0
      ? playoffTeamsCount
      : getNearestSimplePlayoffBracket(eligibleTeams.length);
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

  // Standard Football Standings Sort Hierarchy (shared with /stats via compareStandingRows)
  standingsList.sort((a, b) => compareStandingRows(
    { winPct: a.winPct, diff: a.diff, pointsFor: a.pointsFor, pointsAgainst: a.pointsAgainst, name: a.teamName },
    { winPct: b.winPct, diff: b.diff, pointsFor: b.pointsFor, pointsAgainst: b.pointsAgainst, name: b.teamName },
  ));

  // -------------------------------------------------------------------------
  // Mathematical Clinching & Elimination Logic
  // -------------------------------------------------------------------------
  const regSeasonMatches = matches.filter(
    (m) =>
      !m.isPreseason &&
      !m.isPlayoff &&
      !m.week?.toString().toLowerCase().includes("playoff")
  );

  const totalScheduledByTeam: Record<string, number> = {};
  regSeasonMatches.forEach((m) => {
    if (m.homeTeamId) totalScheduledByTeam[m.homeTeamId] = (totalScheduledByTeam[m.homeTeamId] || 0) + 1;
    if (m.awayTeamId) totalScheduledByTeam[m.awayTeamId] = (totalScheduledByTeam[m.awayTeamId] || 0) + 1;
  });

  const maxSeasonGames = Math.max(
    ...Object.values(totalScheduledByTeam),
    ...standingsList.map((t) => t.gamesPlayed),
    1
  );

  const getRemainingGames = (teamId: string, played: number) => {
    const scheduled = totalScheduledByTeam[teamId] || maxSeasonGames;
    return Math.max(0, scheduled - played);
  };

  const isSeasonOver =
    regSeasonMatches.length > 0 &&
    regSeasonMatches.every((m) => m.status === "completed" || m.status === "Final");

  // Maximum potential wins achievable by any team currently outside playoff threshold
  const maxPossibleWinsOutside =
    standingsList.length > targetPlayoffCount
      ? Math.max(
          ...standingsList
            .slice(targetPlayoffCount)
            .map((t) => t.wins + getRemainingGames(t.teamId, t.gamesPlayed))
        )
      : -1;

  // Maximum potential wins of any team behind #1
  const maxPossibleWinsBehindFirst =
    standingsList.length > 1
      ? Math.max(
          ...standingsList
            .slice(1)
            .map((t) => t.wins + getRemainingGames(t.teamId, t.gamesPlayed))
        )
      : -1;

  // Current wins of the team currently in the last qualifying playoff spot
  const cutoffTeamWins =
    targetPlayoffCount > 0 && standingsList.length >= targetPlayoffCount
      ? standingsList[targetPlayoffCount - 1].wins
      : 0;

  const bubbleThreshold = Math.min(targetPlayoffCount + 4, standingsList.length);

  return standingsList.map((item, idx) => {
    const rank = idx + 1;
    const remaining = getRemainingGames(item.teamId, item.gamesPlayed);
    const maxWins = item.wins + remaining;

    let clinchStatus: ClinchStatus = "in_hunt";
    let clinchLabel = "In Playoff Position";
    let playoffStatus: "clinched_bye" | "in_spot" | "on_bubble" | "outside" = "outside";

    if (isSeasonOver) {
      if (rank === 1) {
        clinchStatus = "clinched_bye";
        clinchLabel = "Clinched #1 Seed (Bye)";
        playoffStatus = "clinched_bye";
      } else if (rank <= targetPlayoffCount) {
        clinchStatus = "clinched_playoffs";
        clinchLabel = "Clinched Playoff Spot";
        playoffStatus = "in_spot";
      } else {
        clinchStatus = "eliminated";
        clinchLabel = "Mathematically Eliminated";
        playoffStatus = "outside";
      }
    } else {
      // In-season live calculation
      if (rank === 1 && item.wins > maxPossibleWinsBehindFirst && item.gamesPlayed > 0) {
        clinchStatus = "clinched_bye";
        clinchLabel = "Clinched #1 Seed (Bye)";
        playoffStatus = "clinched_bye";
      } else if (rank <= targetPlayoffCount && item.wins > maxPossibleWinsOutside && item.gamesPlayed > 0) {
        clinchStatus = "clinched_playoffs";
        clinchLabel = "Clinched Playoff Spot";
        playoffStatus = "in_spot";
      } else if (rank > targetPlayoffCount && maxWins < cutoffTeamWins && item.gamesPlayed > 0) {
        clinchStatus = "eliminated";
        clinchLabel = "Mathematically Eliminated";
        playoffStatus = "outside";
      } else if (rank <= targetPlayoffCount) {
        clinchStatus = "in_hunt";
        clinchLabel = "In Playoff Position";
        playoffStatus = "in_spot";
      } else if (rank <= bubbleThreshold) {
        clinchStatus = "on_bubble";
        clinchLabel = "On the Bubble";
        playoffStatus = "on_bubble";
      } else {
        clinchStatus = "in_hunt";
        clinchLabel = "In the Hunt";
        playoffStatus = "outside";
      }
    }

    return {
      ...item,
      rank,
      playoffSeed: rank <= targetPlayoffCount ? rank : undefined,
      playoffStatus,
      clinchStatus,
      clinchLabel,
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

export function isPlayoffMatch(m: any): boolean {
  return Boolean(m?.isPlayoff || m?.week?.toString().toLowerCase().includes("playoff"));
}

function isStartedMatch(m: any): boolean {
  return m?.status === "in_progress" || m?.status === "completed" || m?.status === "Final";
}

function getCompletedWinnerId(m: any): string | undefined {
  if (!m || (m.status !== "completed" && m.status !== "Final")) return undefined;
  const home = Number(m.homeScore ?? 0);
  const away = Number(m.awayScore ?? 0);
  if (home === away) return undefined;
  return (home > away ? m.homeTeamId : m.awayTeamId) || undefined;
}

export function getPlayoffBracketSize(teamsCount: number): number {
  let size = 2;
  while (size < teamsCount) size *= 2;
  return size;
}

/** Standard tournament seed order, e.g. size 8 -> [1, 8, 4, 5, 2, 7, 3, 6]. */
export function getPlayoffSeedOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const nextSize = order.length * 2;
    order = order.flatMap((seed) => [seed, nextSize + 1 - seed]);
  }
  return order;
}

export function getPlayoffRoundName(roundIdx: number, totalRounds: number, teamsCount: number): string {
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
}

/** Playoff games of one round, in bracket order (bracketSlot, then legacy `order`). */
function getPlayoffRoundDocs(playoffMatches: any[], roundName: string): any[] {
  const slotOf = (m: any) =>
    typeof m.bracketSlot === "number" ? m.bracketSlot : typeof m.order === "number" ? m.order : 0;
  return playoffMatches
    .filter((m) => m.playoffRound === roundName)
    .sort((a, b) => slotOf(a) - slotOf(b));
}

export interface PlayoffFixtureTemplate {
  playoffRound: string;
  roundIndex: number;
  bracketSlot: number;
  homeTeamName: string;
  awayTeamName: string;
}

/**
 * Empty single-elimination fixtures for a playoff field. Teams stay TBD until the regular
 * season ends; {@link computePlayoffMatchupUpdates} then seeds and advances them.
 */
export function buildPlayoffFixtureTemplates(teamsCount: number): PlayoffFixtureTemplate[] {
  const count = Math.max(2, Math.floor(teamsCount));
  const size = getPlayoffBracketSize(count);
  const totalRounds = Math.round(Math.log2(size));
  const seeds = getPlayoffSeedOrder(size);
  const fixtures: PlayoffFixtureTemplate[] = [];
  let slotLabels: string[] = [];
  const round0Name = getPlayoffRoundName(0, totalRounds, count);
  let realMatchIdx = 0;
  for (let i = 0; i < size / 2; i++) {
    const seedA = seeds[2 * i];
    const seedB = seeds[2 * i + 1];
    if (seedB > count) {
      slotLabels.push(`#${seedA} Seed`);
      continue;
    }
    fixtures.push({
      playoffRound: round0Name,
      roundIndex: 0,
      bracketSlot: realMatchIdx,
      homeTeamName: `#${seedA} Seed`,
      awayTeamName: `#${seedB} Seed`,
    });
    realMatchIdx += 1;
    slotLabels.push(`Winner ${round0Name} ${realMatchIdx}`);
  }
  for (let r = 1; r < totalRounds; r++) {
    const roundName = getPlayoffRoundName(r, totalRounds, count);
    const next: string[] = [];
    for (let m = 0; m < slotLabels.length / 2; m++) {
      fixtures.push({
        playoffRound: roundName,
        roundIndex: r,
        bracketSlot: m,
        homeTeamName: slotLabels[2 * m],
        awayTeamName: slotLabels[2 * m + 1],
      });
      next.push(`Winner ${roundName} ${m + 1}`);
    }
    slotLabels = next;
  }
  return fixtures;
}

export interface PlayoffMatchupUpdate {
  matchId: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
}

/**
 * Once every regular-season game is final, returns the playoff games whose stored teams
 * differ from the bracket (seeded from standings, winners advanced). Games that have
 * started or were set manually by an admin are never touched.
 */
export function computePlayoffMatchupUpdates(
  standings: TeamStanding[],
  format: PlayoffFormat,
  matches: any[] = []
): PlayoffMatchupUpdate[] {
  if (format?.structure === "double_elimination") return [];
  const regular = matches.filter((m) => !isPlayoffMatch(m) && !m.isPreseason);
  if (regular.length === 0 || !regular.every((m) => m.status === "completed" || m.status === "Final")) {
    return [];
  }
  const updates: PlayoffMatchupUpdate[] = [];
  for (const round of generatePlayoffBracket(standings, format, matches)) {
    for (const node of round.matches) {
      const stored = node.actualMatchId ? matches.find((m) => m.id === node.actualMatchId) : null;
      if (!stored || isStartedMatch(stored) || stored.manualMatchup) continue;
      const next: PlayoffMatchupUpdate = {
        matchId: stored.id,
        homeTeamId: node.homeTeam?.teamId || "",
        homeTeamName: node.homeTeam?.teamName || node.homeSeedLabel,
        awayTeamId: node.awayTeam?.teamId || "",
        awayTeamName: node.awayTeam?.teamName || node.awaySeedLabel,
      };
      if ((stored.homeTeamId || "") !== next.homeTeamId || (stored.awayTeamId || "") !== next.awayTeamId ||
        stored.homeTeamName !== next.homeTeamName || stored.awayTeamName !== next.awayTeamName) {
        updates.push(next);
      }
    }
  }
  return updates;
}

/** The champion's team ID once the final game of the bracket is complete. */
export function getPlayoffChampionId(rounds: BracketRound[]): string | undefined {
  const finalRound = rounds.filter((round) => round.bracketType !== "losers").at(-1);
  if (!finalRound || finalRound.matches.length !== 1) return undefined;
  return finalRound.matches[0].winnerTeamId;
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
  const defaultCount = getNearestSimplePlayoffBracket(standings.length);
  const effectiveFormatCount =
    format?.teamsCount && (format.teamsCount !== 14 || standings.length === 32)
      ? format.teamsCount
      : defaultCount;
  const teamsCount = Math.max(2, Math.min(standings.length, effectiveFormatCount));
  const playoffMatches = matches.filter(isPlayoffMatch);

  const getTeamBySeed = (seedNum: number): TeamStanding | null =>
    standings.find((s) => s.rank === seedNum) || null;
  const getTeamById = (teamId: unknown): TeamStanding | null =>
    typeof teamId === "string" && teamId ? standings.find((s) => s.teamId === teamId) || null : null;

  const P = getPlayoffBracketSize(teamsCount);
  const totalRoundsCount = Math.round(Math.log2(P));
  const seedsOrder = getPlayoffSeedOrder(P);

  interface RoundSlotInfo {
    team: TeamStanding | null;
    label: string;
    isBye?: boolean;
    source?: BracketSource;
  }

  // A stored game's own teams win once it has started or an admin set them by hand;
  // otherwise the bracket position (seed or advancing winner) decides who plays.
  const buildNode = (
    id: string,
    roundName: string,
    roundIndex: number,
    matchIndex: number,
    home: RoundSlotInfo,
    away: RoundSlotInfo,
    actualM: any,
  ): BracketMatchNode => {
    const useStoredTeams = Boolean(actualM && (isStartedMatch(actualM) || actualM.manualMatchup));
    const homeTeam = useStoredTeams ? getTeamById(actualM.homeTeamId) || home.team : home.team;
    const awayTeam = useStoredTeams ? getTeamById(actualM.awayTeamId) || away.team : away.team;
    const seedLabel = (slot: RoundSlotInfo, team: TeamStanding | null) =>
      team ? `#${team.rank} Seed${slot.isBye && team === slot.team ? " (Bye)" : ""}` : slot.label;
    return {
      id,
      roundName,
      roundIndex,
      matchIndex,
      homeTeam,
      awayTeam,
      homeSource: home.source,
      awaySource: away.source,
      homeSeedLabel: seedLabel(home, homeTeam),
      awaySeedLabel: seedLabel(away, awayTeam),
      actualMatchId: actualM?.id,
      date: actualM?.date,
      time: actualM?.time,
      location: actualM?.location,
      status: actualM ? (actualM.status === "Final" ? "completed" : actualM.status) : "projected",
      liveHeartbeatAt: actualM?.liveHeartbeatAt,
      homeScore: actualM?.homeScore,
      awayScore: actualM?.awayScore,
      winnerTeamId: getCompletedWinnerId(actualM),
    };
  };

  const winnerSlot = (node: BracketMatchNode, fallbackLabel: string): RoundSlotInfo => {
    const winner = getTeamById(node.winnerTeamId);
    return {
      team: winner,
      label: winner ? winner.teamName : fallbackLabel,
      source: { matchId: node.id, result: "winner" },
    };
  };

  const rounds: BracketRound[] = [];
  let previousRoundSlots: RoundSlotInfo[] = [];
  const round0Name = getPlayoffRoundName(0, totalRoundsCount, teamsCount);
  const round0Docs = getPlayoffRoundDocs(playoffMatches, round0Name);
  const round0Matches: BracketMatchNode[] = [];

  for (let i = 0; i < P / 2; i++) {
    const seedA = seedsOrder[2 * i];
    const seedB = seedsOrder[2 * i + 1];
    if (seedB > teamsCount) {
      previousRoundSlots.push({ team: getTeamBySeed(seedA), label: `#${seedA} Seed (Bye)`, isBye: true });
      continue;
    }
    const matchIdx = round0Matches.length;
    const node = buildNode(
      totalRoundsCount === 1 ? "bracket_champ_1" : `bracket_r0_${matchIdx}`,
      round0Name,
      0,
      matchIdx,
      { team: getTeamBySeed(seedA), label: `#${seedA} Seed` },
      { team: getTeamBySeed(seedB), label: `#${seedB} Seed` },
      round0Docs[matchIdx],
    );
    round0Matches.push(node);
    previousRoundSlots.push(winnerSlot(node, `Winner ${round0Name} ${matchIdx + 1}`));
  }

  if (round0Matches.length > 0) {
    rounds.push({ name: round0Name, roundIndex: 0, matches: round0Matches });
  }

  for (let r = 1; r < totalRoundsCount; r++) {
    const roundName = getPlayoffRoundName(r, totalRoundsCount, teamsCount);
    const roundDocs = getPlayoffRoundDocs(playoffMatches, roundName);
    const roundMatches: BracketMatchNode[] = [];
    const nextSlots: RoundSlotInfo[] = [];

    for (let m = 0; m < previousRoundSlots.length / 2; m++) {
      const node = buildNode(
        `bracket_r${r}_${m}`,
        roundName,
        r,
        m,
        previousRoundSlots[2 * m],
        previousRoundSlots[2 * m + 1],
        roundDocs[m],
      );
      roundMatches.push(node);
      nextSlots.push(winnerSlot(node, `Winner ${roundName} ${m + 1}`));
    }

    rounds.push({ name: roundName, roundIndex: r, matches: roundMatches });
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
  const defaultCount = getNearestSimplePlayoffBracket(standings.length);
  const effectiveFormatCount =
    format?.teamsCount && (format.teamsCount !== 14 || standings.length === 32)
      ? format.teamsCount
      : defaultCount;
  const teamsCount = Math.max(2, Math.min(standings.length, effectiveFormatCount));
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
  const droppedLosersPerRound: BracketSlot[][] = [];

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
    source?: BracketSource;
  }

  let previousUpperSlots: RoundSlotInfo[] = [];

  // Round 0 of Upper
  const round0Name = getUpperRoundName(0, W);
  const round0Matches: BracketMatchNode[] = [];
  const round0DroppedLosers: BracketSlot[] = [];
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
        liveHeartbeatAt: actualM?.liveHeartbeatAt,
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
        source: { matchId: node.id, result: "winner" },
        winnerTeamId: winnerId,
        loserTeam: losingTeamObj,
        loserLabel: losingTeamObj ? losingTeamObj.teamName : `Loser ${round0Name} M${mIdx + 1}`,
      });

      round0DroppedLosers.push({
        source: { matchId: node.id, result: "loser" },
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
    const currentDropped: BracketSlot[] = [];
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
        homeSource: slotHome.source,
        awaySource: slotAway.source,
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
        liveHeartbeatAt: actualM?.liveHeartbeatAt,
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
        source: { matchId: node.id, result: "winner" },
        winnerTeamId: winnerId,
        loserTeam: losingTeamObj,
        loserLabel: losingTeamObj ? losingTeamObj.teamName : `Loser ${roundName} M${m + 1}`,
      });

      currentDropped.push({
        source: { matchId: node.id, result: "loser" },
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
  let currentLosersPool: BracketSlot[] = [...droppedLosersPerRound[0]];
  let losersRoundIdx = 0;

  for (let step = 1; step < W; step++) {
    // Phase A: Survivors match (halving the current pool if needed)
    if (currentLosersPool.length >= 2) {
      const lrName =
        losersRoundIdx === totalLosersRounds - 1
          ? "Elimination Final"
          : `Elimination Round ${losersRoundIdx + 1}`;
      const lrMatches: BracketMatchNode[] = [];
      const nextSurvivorPool: BracketSlot[] = [];
      const numMatches = Math.floor(currentLosersPool.length / 2);

      for (let m = 0; m < numMatches; m++) {
        const slotA = currentLosersPool[2 * m];
        const slotB = currentLosersPool[2 * m + 1];

        const node: BracketMatchNode = {
          id: `bracket_lb_r${losersRoundIdx}_${m}`,
          homeSource: slotA.source,
          awaySource: slotB.source,
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
          source: { matchId: node.id, result: "winner" },
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
      const nextSurvivorPool: BracketSlot[] = [];
      const numPairings = Math.max(currentLosersPool.length, droppingFromUpper.length);

      for (let m = 0; m < numPairings; m++) {
        const survivor = currentLosersPool[m] || { team: null, label: `Elimination Survivor ${m + 1}` };
        const dropper = droppingFromUpper[m] || { team: null, label: `Upper Drop ${m + 1}` };

        const node: BracketMatchNode = {
          id: `bracket_lb_r${losersRoundIdx}_${m}`,
          homeSource: dropper.source,
          awaySource: survivor.source,
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
          source: { matchId: node.id, result: "winner" },
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
    homeSource: upperChampionSlot.source,
    awaySource: eliminationChampionSlot.source,
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
    homeSource: { matchId: "bracket_gf_1", result: "winner" },
    awaySource: { matchId: "bracket_gf_1", result: "loser" },
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
