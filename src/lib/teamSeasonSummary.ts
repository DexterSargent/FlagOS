import {
  getPlayerSeasonStats,
  PLAYER_COUNTING_STAT_KEYS,
  type PlayerSeasonStats,
} from "./teamSeasonAggregation";
import { TEAM_COUNTING_STAT_KEYS, type TeamComprehensiveStats } from "./teamStatsCalculator";
import { cachedPublicTeamRequest } from "./publicTeamCache";
import { auth } from "./firebase";

export type { PlayerSeasonStats } from "./teamSeasonAggregation";

/** Public roster label (name + jersey number only). */
export interface TeamRosterLabel {
  name: string;
  number: string | null;
}

/** Response contract of GET /api/public/teams/{teamId}/stat-summary. */
export interface TeamSeasonSummary {
  /** Team ID the summary was built for. */
  teamId: string;
  schemaVersion: number;
  generatedAt: string;
  /** Completed, visible games included in every total. */
  completedGames: number;
  teamStats: TeamComprehensiveStats;
  /** Keyed by player name, exactly as plays reference players. Use getPlayerSeasonStats for roster players without entries. */
  playerStats: Record<string, PlayerSeasonStats>;
  didNotPlayCounts: Record<string, number>;
  /** Public roster labels sorted by name; empty when the team's roster is not public. */
  roster: TeamRosterLabel[];
  games: { matchId: string }[];
  cache: { hits: number; misses: number };
}

export class TeamSeasonSummaryError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "TeamSeasonSummaryError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isCount = (value: unknown) => typeof value === "number" && Number.isFinite(value);

function isTeamSeasonSummary(value: unknown): value is TeamSeasonSummary {
  if (!isRecord(value)) return false;
  const { teamStats, playerStats, didNotPlayCounts } = value;
  return typeof value.teamId === "string" &&
    isCount(value.completedGames) &&
    isRecord(teamStats) &&
    TEAM_COUNTING_STAT_KEYS.every((key) => isCount(teamStats[key])) &&
    typeof teamStats.recordFormatted === "string" &&
    isRecord(playerStats) &&
    Object.values(playerStats).every((stats) =>
      isRecord(stats) && isCount(stats.gamesPlayed) && PLAYER_COUNTING_STAT_KEYS.every((key) => isCount(stats[key]))) &&
    isRecord(didNotPlayCounts) &&
    Object.values(didNotPlayCounts).every(isCount) &&
    Array.isArray(value.roster) &&
    value.roster.every((entry: unknown) => isRecord(entry) && typeof entry.name === "string" &&
      (entry.number === null || typeof entry.number === "string")) &&
    Array.isArray(value.games) &&
    isRecord(value.cache);
}

async function fetchTeamSeasonSummary(teamId: string): Promise<TeamSeasonSummary> {
  const headers: Record<string, string> = { accept: "application/json" };
  // League teams are only readable by signed-in users (public leagues), as in the Firestore rules.
  const user = auth.currentUser;
  if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
  let response: Response;
  try {
    response = await fetch(`/api/public/teams/${encodeURIComponent(teamId)}/stat-summary`, {
      method: "GET",
      cache: "no-store",
      headers,
    });
  } catch {
    throw new TeamSeasonSummaryError("Unable to reach the stats service.", 0);
  }
  const body = await response.json().catch(() => null) as { data?: unknown; error?: unknown } | null;
  if (!response.ok) {
    throw new TeamSeasonSummaryError(
      typeof body?.error === "string" ? body.error : "Unable to load team stats.",
      response.status,
    );
  }
  if (!isTeamSeasonSummary(body?.data)) {
    throw new TeamSeasonSummaryError("The stats service returned an invalid response.", 502);
  }
  return body.data;
}

/**
 * Loads correction-aware public season stats for a team.
 * Responses are shared through the public team cache (cleared on focus, storage and
 * flagos-*-data-changed events); pass { fresh: true } to bypass it, e.g. right after a stat edit.
 * Public independent teams are open to everyone; league teams require a signed-in user and a league whose visibility is public.
 * Throws TeamSeasonSummaryError (status 0 for network failures, 401 when sign-in is required,
 * 404 when the team's stats are not public, 429/503 when busy).
 */
export function loadTeamSeasonSummary(teamId: string, options?: { fresh?: boolean }): Promise<TeamSeasonSummary> {
  if (options?.fresh) return fetchTeamSeasonSummary(teamId);
  // Responses can depend on the signed-in account, so they are cached per uid: a response
  // fetched while signed in is never served after sign-out or to a different account.
  const viewer = auth.currentUser?.uid || "anonymous";
  return cachedPublicTeamRequest(`team-season-summary:${viewer}:${teamId}`, () => fetchTeamSeasonSummary(teamId));
}

/**
 * Stats for each roster name (defaults to summary.roster), including players who never appear
 * in a play: they get zero stats and gamesPlayed = completedGames minus their DNP games.
 */
export function buildRosterPlayerStats(
  summary: TeamSeasonSummary,
  playerNames: string[] = summary.roster.map((entry) => entry.name),
): Record<string, PlayerSeasonStats> {
  return Object.fromEntries(playerNames.map((name) => [name, getPlayerSeasonStats(summary, name)]));
}

export { getPlayerSeasonStats };

/** Public jersey number for a player name, or null. */
export function getPlayerNumber(summary: Pick<TeamSeasonSummary, "roster">, name: string): string | null {
  return summary.roster.find((entry) => entry.name === name)?.number ?? null;
}

/** Display label such as "#12 Jane Doe", falling back to the name when no public number exists. */
export function formatPlayerLabel(summary: Pick<TeamSeasonSummary, "roster">, name: string): string {
  const number = getPlayerNumber(summary, name);
  return number ? `#${number} ${name}` : name;
}
