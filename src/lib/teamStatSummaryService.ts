import { createHash } from "node:crypto";
import type { DocumentData, Firestore, Query, QueryDocumentSnapshot, Transaction } from "firebase-admin/firestore";
import {
  combineGameSummaries,
  isCompletedMatch,
  isGameStatSummary,
  isTeamGame,
  summarizeGame,
  TEAM_SEASON_SUMMARY_SCHEMA_VERSION,
  type GameStatSummary,
  type PlayerSeasonStats,
  type TeamIdentity,
} from "./teamSeasonAggregation";
import type { TeamComprehensiveStats } from "./teamStatsCalculator";
import { isYorkTeam, YORK_TEAM_ALIASES, YORK_TEAM_ID } from "./yorkStaff";

/**
 * Server-side, correction-aware team season summaries.
 *
 * Every request re-derives which games count from the live, publicly visible
 * match records and fingerprints each game from document IDs + update times of
 * the match and ALL of its plays (hidden ones included). A persisted per-game
 * summary is reused only when its fingerprint matches exactly; otherwise the
 * game is rebuilt from its active plays. All reads happen inside one read-only
 * transaction, so the fingerprint and the rebuilt summary describe the same
 * consistent snapshot. There is no TTL: correctness never depends on time.
 */

export const GAME_SUMMARY_COLLECTION = "team_stat_game_summaries";
export const MAX_SUMMARY_GAMES = 64;
export const MAX_PLAYS_PER_GAME = 1_000;
export const MAX_ROSTER_PLAYERS = 500;
const MAX_ATTEMPTS = 3;
// Field masks: only what labels and the rules' PII/visibility checks need. PII values are
// read solely to exclude documents the rules would hide; they are never returned.
const PLAYER_LABEL_FIELDS = ["playerName", "number", "teamId", "leagueId", "email", "emails"];
const TEAM_PII_FIELDS = ["adminEmails", "coachEmail", "adminEmail", "email"];

/** Public roster label: the same name/number a public client could read from players docs. */
export interface PublicRosterEntry {
  name: string;
  number: string | null;
}

export interface PublicTeamSeasonSummary {
  teamId: string;
  schemaVersion: number;
  generatedAt: string;
  completedGames: number;
  teamStats: TeamComprehensiveStats;
  playerStats: Record<string, PlayerSeasonStats>;
  didNotPlayCounts: Record<string, number>;
  /** Public roster labels (name + jersey number only), sorted by name. */
  roster: PublicRosterEntry[];
  games: { matchId: string }[];
  cache: { hits: number; misses: number };
}

export class TeamSummaryError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** Which records a summary may read; mirrors the Firestore rules that make them readable. */
export interface SummaryTeamScope extends TeamIdentity {
  /** Exact IDs stored in match homeTeamId/awayTeamId (max 30). */
  matchTeamIds: string[];
  /** League-scoped teams only count matches and plays of this (public) league. */
  leagueId?: string;
  /** Whether the caller must be signed in, as the rules require for public-league data. */
  requiresSignIn: boolean;
}

export const YORK_PUBLIC_SCOPE: SummaryTeamScope = {
  teamId: YORK_TEAM_ID,
  teamName: "York Lions Women's Flag Football",
  aliases: [...YORK_TEAM_ALIASES, "York Lions", "York Lions Women's Flag Football"],
  matchTeamIds: [...YORK_TEAM_ALIASES],
  requiresSignIn: false,
};

const TEAM_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Resolves the summary scope for a team, or null when its stats are not publicly readable.
 * York is public by rule; other teams qualify only when their league document has
 * visibility "public" (the rules' isPublicLeague), which also requires a signed-in caller.
 */
export async function resolveSummaryTeamScope(db: Firestore, teamId: string): Promise<SummaryTeamScope | null> {
  if (isYorkTeam(teamId)) return YORK_PUBLIC_SCOPE;
  if (!TEAM_ID_PATTERN.test(teamId)) return null;
  const team = await db.collection("teams").doc(teamId).get();
  const leagueId = team.exists ? team.get("leagueId") : undefined;
  if (typeof leagueId !== "string" || !TEAM_ID_PATTERN.test(leagueId)) return null;
  const league = await db.collection("leagues").doc(leagueId).get();
  if (!league.exists || league.get("visibility") !== "public") return null;
  const name = team.get("name") || team.get("teamName");
  const shortcode = team.get("shortcode");
  return {
    teamId,
    teamName: typeof name === "string" ? name : undefined,
    aliases: typeof shortcode === "string" && shortcode ? [shortcode] : [],
    matchTeamIds: [teamId],
    leagueId,
    requiresSignIn: true,
  };
}

type TimestampLike = { seconds: number; nanoseconds: number } | undefined | null;

function timeKey(time: TimestampLike): string | null {
  if (!time || !Number.isFinite(time.seconds) || !Number.isFinite(time.nanoseconds)) return null;
  return `${time.seconds}.${String(time.nanoseconds).padStart(9, "0")}`;
}

/** Fingerprint of a game's source documents. Returns null when update times are unavailable (never cacheable). */
export function computeGameFingerprint(
  identity: TeamIdentity & { leagueId?: string },
  match: { id: string; updateTime: TimestampLike },
  plays: { id: string; updateTime: TimestampLike }[],
): string | null {
  const matchTime = timeKey(match.updateTime);
  if (!matchTime) return null;
  const playKeys: string[] = [];
  for (const play of plays) {
    const key = timeKey(play.updateTime);
    if (!key) return null;
    playKeys.push(`${play.id}@${key}`);
  }
  playKeys.sort();
  return createHash("sha256").update(JSON.stringify({
    v: TEAM_SEASON_SUMMARY_SCHEMA_VERSION,
    team: [identity.teamId, [...(identity.aliases || [])].sort(), identity.teamName || "", identity.leagueId || ""],
    match: `${match.id}@${matchTime}`,
    plays: playKeys,
  })).digest("hex");
}

export function gameSummaryDocId(identity: TeamIdentity, matchId: string): string {
  return `${identity.teamId}__${matchId}`;
}

interface GameResult {
  matchId: string;
  fingerprint: string | null;
  summary: GameStatSummary;
  cached: boolean;
}

class ConcurrentChangeError extends Error {}

function playsForMatch(db: Firestore, matchId: string): Query<DocumentData> {
  return db.collection("plays").where("matchId", "==", matchId).limit(MAX_PLAYS_PER_GAME + 1);
}

function assertPlayLimit(size: number, matchId: string) {
  if (size > MAX_PLAYS_PER_GAME) {
    throw new TeamSummaryError(`Match ${matchId} exceeds the supported play count for summaries.`, 503);
  }
}

async function readCachedSummaries(db: Firestore, identity: SummaryTeamScope, matchIds: string[]) {
  const cached = new Map<string, { fingerprint: string; summary: GameStatSummary }>();
  if (!matchIds.length) return cached;
  try {
    const docs = await db.getAll(...matchIds.map((id) => db.collection(GAME_SUMMARY_COLLECTION).doc(gameSummaryDocId(identity, id))));
    docs.forEach((doc, index) => {
      const data = doc.exists ? doc.data() : undefined;
      if (data &&
        data.teamId === identity.teamId &&
        data.matchId === matchIds[index] &&
        typeof data.fingerprint === "string" &&
        isGameStatSummary(data.summary) &&
        data.summary.matchId === matchIds[index]) {
        cached.set(matchIds[index], { fingerprint: data.fingerprint, summary: data.summary });
      }
    });
  } catch (error) {
    // The cache is an optimization only; a failed read degrades to a full rebuild.
    console.warn("Team stat summary cache read failed; rebuilding from plays:", error);
  }
  return cached;
}

/**
 * Reads projected roster labels under the same conditions as the players rules:
 * York players need a York team doc that is public and PII-free (isPublicYorkPlayer);
 * league players need the team's public league (isPublicLeague). Player docs with
 * email fields are excluded (hasNoPlayerPii).
 */
async function readPublicRoster(db: Firestore, identity: SummaryTeamScope, transaction: Transaction): Promise<PublicRosterEntry[]> {
  let teamIds = [identity.teamId];
  if (!identity.leagueId) {
    const refs = identity.matchTeamIds.slice(0, 30).map((id) => db.collection("teams").doc(id));
    if (!refs.length) return [];
    const teams = await transaction.getAll(...refs, { fieldMask: ["visibility", ...TEAM_PII_FIELDS] });
    teamIds = teams
      .filter((team) => team.exists && team.get("visibility") === "public" && TEAM_PII_FIELDS.every((field) => team.get(field) === undefined))
      .map((team) => team.id);
    if (!teamIds.length) return [];
  }
  let query: Query<DocumentData> = db.collection("players");
  query = teamIds.length === 1 ? query.where("teamId", "==", teamIds[0]) : query.where("teamId", "in", teamIds);
  if (identity.leagueId) query = query.where("leagueId", "==", identity.leagueId);
  const snapshot = await transaction.get(query.select(...PLAYER_LABEL_FIELDS).limit(MAX_ROSTER_PLAYERS));
  const byName = new Map<string, PublicRosterEntry>();
  for (const doc of [...snapshot.docs].sort((a, b) => a.id.localeCompare(b.id))) {
    if (doc.get("email") !== undefined || doc.get("emails") !== undefined) continue;
    if (identity.leagueId && doc.get("leagueId") !== identity.leagueId) continue;
    const name = doc.get("playerName");
    if (typeof name !== "string" || !name || name !== name.trim() || name.length > 100) continue;
    const rawNumber = doc.get("number");
    const number = typeof rawNumber === "string" && rawNumber.trim() && rawNumber.length <= 4 ? rawNumber.trim() : null;
    const existing = byName.get(name);
    if (!existing) byName.set(name, { name, number });
    else if (!existing.number && number) existing.number = number;
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

interface SeasonSnapshot {
  games: GameResult[];
  roster: PublicRosterEntry[];
}

async function readSeasonSnapshot(db: Firestore, identity: SummaryTeamScope, transaction: Transaction): Promise<SeasonSnapshot> {
  const [games, roster] = await Promise.all([
    readSeasonGames(db, identity, transaction),
    readPublicRoster(db, identity, transaction),
  ]);
  return { games, roster };
}

async function readSeasonGames(db: Firestore, identity: SummaryTeamScope, transaction: Transaction): Promise<GameResult[]> {
  const ids = identity.matchTeamIds.slice(0, 30);
  if (!ids.length) return [];
  // Mirrors the public match rules and existing client queries: isHidden must be explicitly false.
  const matchSnapshots = await Promise.all(["homeTeamId", "awayTeamId"].map((field) => {
    let query: Query<DocumentData> = db.collection("matches");
    if (identity.leagueId) query = query.where("leagueId", "==", identity.leagueId);
    query = ids.length === 1 ? query.where(field, "==", ids[0]) : query.where(field, "in", ids);
    return transaction.get(query.where("isHidden", "==", false).limit(MAX_SUMMARY_GAMES * 4));
  }));
  const matches = new Map<string, QueryDocumentSnapshot<DocumentData>>();
  for (const snapshot of matchSnapshots) {
    if (snapshot.size >= MAX_SUMMARY_GAMES * 4) throw new TeamSummaryError("The team has too many matches to summarize.", 503);
    for (const doc of snapshot.docs) matches.set(doc.id, doc);
  }
  const games = [...matches.values()]
    .filter((doc) => {
      const data: DocumentData = { ...doc.data(), id: doc.id };
      return data.isHidden === false &&
        (!identity.leagueId || data.leagueId === identity.leagueId) &&
        isCompletedMatch(data) && isTeamGame(identity, data);
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  if (games.length > MAX_SUMMARY_GAMES) throw new TeamSummaryError("The team has too many games to summarize.", 503);

  // Metadata-only reads: IDs and update times of every play, including hidden ones,
  // so hiding, unhiding, editing, adding or deleting any play changes the fingerprint.
  const metadata = await Promise.all(games.map((game) => transaction.get(playsForMatch(db, game.id).select())));
  const fingerprints = games.map((game, index) => {
    assertPlayLimit(metadata[index].size, game.id);
    return computeGameFingerprint(
      identity,
      { id: game.id, updateTime: game.updateTime },
      metadata[index].docs.map((doc) => ({ id: doc.id, updateTime: doc.updateTime })),
    );
  });
  const cached = await readCachedSummaries(db, identity, games.map((game) => game.id));

  return Promise.all(games.map(async (game, index): Promise<GameResult> => {
    const fingerprint = fingerprints[index];
    const hit = cached.get(game.id);
    if (fingerprint && hit && hit.fingerprint === fingerprint) {
      return { matchId: game.id, fingerprint, summary: hit.summary, cached: true };
    }
    const plays = await transaction.get(playsForMatch(db, game.id));
    assertPlayLimit(plays.size, game.id);
    const rebuiltFingerprint = computeGameFingerprint(
      identity,
      { id: game.id, updateTime: game.updateTime },
      plays.docs.map((doc) => ({ id: doc.id, updateTime: doc.updateTime })),
    );
    if (rebuiltFingerprint !== fingerprint) throw new ConcurrentChangeError(`Match ${game.id} changed during the summary read.`);
    const summary = summarizeGame(
      identity,
      { ...game.data(), id: game.id },
      plays.docs
        // Mirrors the public play rules: only explicitly visible plays (of the public league) count.
        .filter((doc) => doc.get("isHidden") === false && (!identity.leagueId || doc.get("leagueId") === identity.leagueId))
        .map((doc) => ({ ...doc.data(), id: doc.id })),
    );
    return { matchId: game.id, fingerprint, summary, cached: false };
  }));
}

async function persistSummaries(db: Firestore, identity: SummaryTeamScope, results: GameResult[]) {
  const misses = results.filter((result) => !result.cached && result.fingerprint);
  if (!misses.length) return;
  try {
    const batch = db.batch();
    const computedAt = new Date().toISOString();
    for (const result of misses) {
      // Content always matches its fingerprint, so a racing writer can never make a stale entry look fresh.
      batch.set(db.collection(GAME_SUMMARY_COLLECTION).doc(gameSummaryDocId(identity, result.matchId)), {
        schemaVersion: TEAM_SEASON_SUMMARY_SCHEMA_VERSION,
        teamId: identity.teamId,
        matchId: result.matchId,
        fingerprint: result.fingerprint,
        summary: result.summary,
        computedAt,
      });
    }
    await batch.commit();
  } catch (error) {
    console.warn("Team stat summary cache write failed; serving computed summary:", error);
  }
}

export async function buildPublicTeamSeasonSummary(db: Firestore, identity: SummaryTeamScope): Promise<PublicTeamSeasonSummary> {
  let snapshot: SeasonSnapshot | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS && !snapshot; attempt += 1) {
    try {
      snapshot = await db.runTransaction(
        (transaction) => readSeasonSnapshot(db, identity, transaction),
        { readOnly: true },
      );
    } catch (error) {
      if (!(error instanceof ConcurrentChangeError)) throw error;
      if (attempt === MAX_ATTEMPTS) {
        throw new TeamSummaryError("Stats are being updated right now. Please try again.", 503);
      }
    }
  }
  const results = snapshot!.games;
  await persistSummaries(db, identity, results);
  const aggregate = combineGameSummaries(results.map((result) => result.summary));
  const hits = results.filter((result) => result.cached).length;
  return {
    teamId: identity.teamId,
    schemaVersion: TEAM_SEASON_SUMMARY_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    completedGames: aggregate.completedGames,
    teamStats: aggregate.teamStats,
    playerStats: aggregate.playerStats,
    didNotPlayCounts: aggregate.didNotPlayCounts,
    roster: snapshot!.roster,
    games: results.map((result) => ({ matchId: result.matchId })),
    cache: { hits, misses: results.length - hits },
  };
}
