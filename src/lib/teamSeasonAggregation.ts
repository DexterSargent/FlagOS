import {
  calculateTeamComprehensiveStats,
  emptyTeamCountingStats,
  finalizeTeamComprehensiveStats,
  TEAM_COUNTING_STAT_KEYS,
  toTeamCountingStats,
  type TeamComprehensiveStats,
  type TeamCountingStats,
} from "./teamStatsCalculator";

/**
 * Pure, environment-neutral team/player season aggregation shared by the server
 * summary service and client code. Season totals are always rebuilt by summing
 * additive per-game counts; rates and display strings are derived afterwards.
 */

/** Bump whenever per-game aggregation semantics change so persisted game summaries are rebuilt. */
export const TEAM_SEASON_SUMMARY_SCHEMA_VERSION = 3;

export const PLAYER_COUNTING_STAT_KEYS = [
  "passAtt", "passComp", "passTD", "passInt",
  "receptions", "recTD",
  "rushAtt", "rushTD",
  "flagPulls", "sacks", "int", "defTD", "pbu",
  "totalTDs",
] as const;

export type PlayerCountingStatKey = (typeof PLAYER_COUNTING_STAT_KEYS)[number];
export type PlayerCountingStats = Record<PlayerCountingStatKey, number>;
export interface PlayerSeasonStats extends PlayerCountingStats {
  gamesPlayed: number;
}

export interface TeamIdentity {
  teamId: string;
  teamName?: string;
  /** Additional IDs/names that refer to the team in match and play records (case-insensitive). */
  aliases?: string[];
}

/** Persistable per-game summary: additive counts only, keyed by public player names. */
export interface GameStatSummary {
  schemaVersion: number;
  matchId: string;
  teamCounts: TeamCountingStats;
  playerCounts: Record<string, PlayerCountingStats>;
  didNotPlay: string[];
}

export interface TeamSeasonAggregate {
  completedGames: number;
  teamStats: TeamComprehensiveStats;
  /** Every player name that recorded a stat or a DNP; roster players absent here played every completed game with zero stats. */
  playerStats: Record<string, PlayerSeasonStats>;
  didNotPlayCounts: Record<string, number>;
}

type AnyRecord = Record<string, unknown>;

const MAX_NAME_LENGTH = 120;

export function emptyPlayerCountingStats(): PlayerCountingStats {
  return Object.fromEntries(PLAYER_COUNTING_STAT_KEYS.map((key) => [key, 0])) as PlayerCountingStats;
}

export function emptyPlayerSeasonStats(gamesPlayed = 0): PlayerSeasonStats {
  return { gamesPlayed, ...emptyPlayerCountingStats() };
}

export function createTeamMatcher(identity: TeamIdentity): (idOrName: unknown) => boolean {
  const names = new Set(
    [identity.teamName, ...(identity.aliases || [])]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .map((value) => value.toLowerCase()),
  );
  return (idOrName: unknown) =>
    typeof idOrName === "string" &&
    idOrName.length > 0 &&
    (idOrName === identity.teamId || names.has(idOrName.toLowerCase()));
}

export function isCompletedMatch(match: AnyRecord | null | undefined): boolean {
  return Boolean(match) && (match!.status === "completed" || match!.status === "Final") && match!.isHidden !== true;
}

export function isTeamGame(identity: TeamIdentity, match: AnyRecord | null | undefined): boolean {
  const isTeam = createTeamMatcher(identity);
  return Boolean(match) && (isTeam(match!.homeTeamId) || isTeam(match!.awayTeamId));
}

export function isActivePlay(play: AnyRecord | null | undefined): boolean {
  return Boolean(play) && play!.isHidden !== true;
}

function playerName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name && name.length <= MAX_NAME_LENGTH && name === value ? name : null;
}

function isConversionPlay(play: AnyRecord): boolean {
  return Boolean(
    play.isConversion === true ||
    play.playType === "Conversion" ||
    (!play.isTouchdown && !play.isPick6 && play.result !== "Pick 6" && (
      (play.conversionAttempt !== undefined && play.conversionAttempt !== null) ||
      play.conversionSuccess === true
    )),
  );
}

function isPickSix(play: AnyRecord): boolean {
  return Boolean(play.isPick6 || play.result === "Pick 6" || play.result === "Pick 6 Touchdown");
}

/**
 * Builds the persisted summary for one completed, visible game of the team.
 * Plays from other matches and hidden plays are ignored.
 */
export function summarizeGame(identity: TeamIdentity, match: AnyRecord, plays: AnyRecord[]): GameStatSummary {
  const matchId = typeof match?.id === "string" ? match.id : "";
  if (!matchId) throw new Error("A match ID is required to summarize a game.");
  if (!isCompletedMatch(match) || !isTeamGame(identity, match)) {
    throw new Error(`Match ${matchId} is not a completed, visible game for ${identity.teamId}.`);
  }
  const gamePlays = plays.filter((play) => isActivePlay(play) && play.matchId === matchId);
  const teamCounts = toTeamCountingStats(calculateTeamComprehensiveStats(
    identity.teamId,
    [match],
    gamePlays,
    { teamName: identity.teamName, teamAliases: identity.aliases },
  ));

  const isTeam = createTeamMatcher(identity);
  const players = new Map<string, PlayerCountingStats>();
  const credit = (rawName: unknown, key: PlayerCountingStatKey) => {
    const name = playerName(rawName);
    if (!name) return;
    let stats = players.get(name);
    if (!stats) {
      stats = emptyPlayerCountingStats();
      players.set(name, stats);
    }
    stats[key] += 1;
  };

  for (const play of gamePlays) {
    // Offensive stats only count on the team's possessions, defensive stats only on the opponent's.
    const possessionTeam = play.possessionTeamId;
    const weHaveBall = !possessionTeam || isTeam(possessionTeam);
    const onDefense = !possessionTeam || !weHaveBall;
    const conversion = isConversionPlay(play);

    if (weHaveBall && !conversion && play.playType === "Pass") {
      credit(play.qbPlayerId, "passAtt");
      if (play.passOutcome === "Complete") credit(play.qbPlayerId, "passComp");
      else if (play.passOutcome === "Interception") credit(play.qbPlayerId, "passInt");
      if (play.isTouchdown) credit(play.qbPlayerId, "passTD");
      if (play.passOutcome === "Complete") {
        credit(play.receiverPlayerId, "receptions");
        if (play.isTouchdown) {
          credit(play.receiverPlayerId, "recTD");
          credit(play.receiverPlayerId, "totalTDs");
        }
      }
    }

    if (weHaveBall && !conversion && play.playType === "Run") {
      credit(play.runnerPlayerId, "rushAtt");
      if (play.isTouchdown) {
        credit(play.runnerPlayerId, "rushTD");
        credit(play.runnerPlayerId, "totalTDs");
      }
    }

    if (onDefense && Array.isArray(play.defenders)) {
      for (const defender of new Set(play.defenders)) {
        if (play.passOutcome === "Interception") {
          credit(defender, "int");
          if (isPickSix(play)) {
            credit(defender, "defTD");
            credit(defender, "totalTDs");
          }
        } else if (play.passOutcome === "PBU") {
          credit(defender, "pbu");
        } else if (play.passOutcome === "Sack") {
          credit(defender, "sacks");
          credit(defender, "flagPulls");
        } else {
          credit(defender, "flagPulls");
        }
      }
    }

    if (onDefense && play.passOutcome === "Interception" && Array.isArray(play.flaggers)) {
      for (const flagger of new Set(play.flaggers)) credit(flagger, "flagPulls");
    }
  }

  const didNotPlay = Array.isArray(match.didNotPlay)
    ? [...new Set(match.didNotPlay.map(playerName).filter((name: string | null): name is string => Boolean(name)))] as string[]
    : [];

  return {
    schemaVersion: TEAM_SEASON_SUMMARY_SCHEMA_VERSION,
    matchId,
    teamCounts,
    playerCounts: Object.fromEntries([...players].sort(([a], [b]) => a.localeCompare(b))),
    didNotPlay: didNotPlay.sort((a, b) => a.localeCompare(b)),
  };
}

/** Combines per-game summaries (one per completed game) into season totals. */
export function combineGameSummaries(summaries: GameStatSummary[]): TeamSeasonAggregate {
  const seen = new Set<string>();
  const teamCounts = emptyTeamCountingStats();
  const playerCounts = new Map<string, PlayerCountingStats>();
  const didNotPlayCounts = new Map<string, number>();

  for (const summary of summaries) {
    if (seen.has(summary.matchId)) throw new Error(`Duplicate game summary for match ${summary.matchId}.`);
    seen.add(summary.matchId);
    for (const key of TEAM_COUNTING_STAT_KEYS) teamCounts[key] += summary.teamCounts[key];
    for (const [name, counts] of Object.entries(summary.playerCounts)) {
      let total = playerCounts.get(name);
      if (!total) {
        total = emptyPlayerCountingStats();
        playerCounts.set(name, total);
      }
      for (const key of PLAYER_COUNTING_STAT_KEYS) total[key] += counts[key];
    }
    for (const name of new Set(summary.didNotPlay)) {
      didNotPlayCounts.set(name, (didNotPlayCounts.get(name) || 0) + 1);
    }
  }

  const completedGames = summaries.length;
  const names = [...new Set([...playerCounts.keys(), ...didNotPlayCounts.keys()])].sort((a, b) => a.localeCompare(b));
  return {
    completedGames,
    teamStats: finalizeTeamComprehensiveStats(teamCounts),
    playerStats: Object.fromEntries(names.map((name) => [name, {
      gamesPlayed: completedGames - (didNotPlayCounts.get(name) || 0),
      ...(playerCounts.get(name) || emptyPlayerCountingStats()),
    }])),
    didNotPlayCounts: Object.fromEntries([...didNotPlayCounts].sort(([a], [b]) => a.localeCompare(b))),
  };
}

/** Summarizes a full season from in-memory records (completed, visible team games only). */
export function summarizeTeamSeason(identity: TeamIdentity, matches: AnyRecord[], plays: AnyRecord[]): TeamSeasonAggregate {
  const playsByMatch = new Map<string, AnyRecord[]>();
  for (const play of plays) {
    if (typeof play?.matchId !== "string") continue;
    const list = playsByMatch.get(play.matchId) || [];
    list.push(play);
    playsByMatch.set(play.matchId, list);
  }
  const games = new Map<string, AnyRecord>();
  for (const match of matches) {
    if (typeof match?.id === "string" && isCompletedMatch(match) && isTeamGame(identity, match)) games.set(match.id, match);
  }
  return combineGameSummaries([...games.entries()].map(([id, match]) =>
    summarizeGame(identity, match, playsByMatch.get(id) || [])));
}

/** Season stats for a roster player, including players who never appear in a play. */
export function getPlayerSeasonStats(
  aggregate: Pick<TeamSeasonAggregate, "completedGames" | "playerStats" | "didNotPlayCounts">,
  name: string,
): PlayerSeasonStats {
  if (Object.prototype.hasOwnProperty.call(aggregate.playerStats, name)) return aggregate.playerStats[name];
  const missed = Object.prototype.hasOwnProperty.call(aggregate.didNotPlayCounts, name) ? aggregate.didNotPlayCounts[name] : 0;
  return emptyPlayerSeasonStats(Math.max(0, aggregate.completedGames - missed));
}

/** Validates an untrusted (persisted or fetched) game summary. */
export function isGameStatSummary(value: unknown): value is GameStatSummary {
  const record = (item: unknown): item is Record<string, unknown> =>
    item !== null && typeof item === "object" && !Array.isArray(item);
  if (!record(value)) return false;
  const summary = value;
  const { teamCounts, playerCounts } = summary;
  const count = (n: unknown) => typeof n === "number" && Number.isFinite(n);
  return summary.schemaVersion === TEAM_SEASON_SUMMARY_SCHEMA_VERSION &&
    typeof summary.matchId === "string" && summary.matchId.length > 0 &&
    record(teamCounts) &&
    TEAM_COUNTING_STAT_KEYS.every((key) => count(teamCounts[key])) &&
    record(playerCounts) &&
    Object.values(playerCounts).every((counts) =>
      record(counts) &&
      PLAYER_COUNTING_STAT_KEYS.every((key) => count(counts[key]))) &&
    Array.isArray(summary.didNotPlay) && summary.didNotPlay.every((name: unknown) => typeof name === "string");
}