import "server-only";

import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { toMillis } from "@/lib/adminMetrics";
import { getCurrentSeasonId, getLeagueSeasons, matchSeasonId } from "@/lib/leagueSeasons";

const DAY = 86_400_000;
const LIMITS = { leagues: 1_000, teams: 5_000, players: 20_000, matches: 10_000, plays: 25_000, users: 5_000 };
export const STALE_AFTER_DAYS = 30;
export const RENEWAL_WINDOW_DAYS = 7;
export const ROLLOVER_WINDOW_DAYS = 14;
const DEMO_LEAGUE_IDS = new Set(["default", "demo"]);
const TEST_NAME = /\b(qa|test|testing|demo|sample|sandbox|dummy|temp)\b/i;

export type HealthTargetKind = "league" | "team" | "player" | "match" | "play" | "user";

export interface HealthIssue {
  code: "team_missing_league" | "player_missing_team" | "match_missing_league" | "match_missing_team" | "play_missing_match" | "league_over_cap";
  message: string;
  targetId: string;
  targetKind: HealthTargetKind;
  leagueId?: string;
}

export interface RenewalItem {
  id: string;
  kind: "league" | "team";
  name: string;
  renewsAt: number;
  overdue: boolean;
  adminEmails: string[];
}

export interface NewRecord {
  id: string;
  kind: "league" | "team" | "free_agent";
  name: string;
  createdAt: number | null;
}

export interface StaleCandidate {
  id: string;
  kind: "league" | "team";
  name: string;
  reasons: string[];
  createdAt: number | null;
  lastActivityAt: number | null;
}

export interface RolloverCandidate {
  leagueId: string;
  leagueName: string;
  seasonId: string;
  seasonTitle: string;
  lastGameAt: number;
  daysUntilEnd: number;
  adminEmails: string[];
}

export interface PlatformHealthReport {
  generatedAt: number;
  integrity: HealthIssue[];
  renewals: RenewalItem[];
  newRecords: NewRecord[];
  unverifiedAdmins: string[];
  stale: StaleCandidate[];
  rollover: RolloverCandidate[];
  scanned: Record<"leagues" | "teams" | "players" | "matches" | "plays", number>;
  truncated: string[];
}

type Raw = Record<string, unknown>;

function lowerEmails(...values: unknown[]): string[] {
  const out = new Set<string>();
  for (const value of values) {
    const list = Array.isArray(value) ? value : [value];
    for (const item of list) if (typeof item === "string" && item.includes("@")) out.add(item.trim().toLowerCase());
  }
  return [...out];
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function subscriptionOf(record: Raw): Raw {
  return record.subscription && typeof record.subscription === "object" ? (record.subscription as Raw) : {};
}

function bump(map: Map<string, number>, key: string, at: number | null) {
  if (!key || at === null) return;
  if ((map.get(key) ?? 0) < at) map.set(key, at);
}

/** Read-only scan of platform data. It reports problems; it never changes or deletes anything. */
export async function computePlatformHealth(now = Date.now()): Promise<PlatformHealthReport> {
  const [leagues, leaguePrivate, teams, teamPrivate, players, matches, plays, freeAgents] = await Promise.all([
    adminDb.collection("leagues").limit(LIMITS.leagues).get(),
    adminDb.collection("league_private").select("adminEmails", "contactEmail", "subscriptionAdminEmails").limit(LIMITS.leagues).get(),
    adminDb.collection("teams").select("name", "leagueId", "subscription", "createdAt", "updatedAt", "isArchived").limit(LIMITS.teams).get(),
    adminDb.collection("team_private").select("adminEmails").limit(LIMITS.teams).get(),
    adminDb.collection("players").select("teamId", "leagueId", "playerName").limit(LIMITS.players).get(),
    adminDb.collection("matches")
      .select("leagueId", "homeTeamId", "awayTeamId", "managingTeamId", "seasonId", "date", "status", "isHidden", "updatedAt", "createdAt")
      .limit(LIMITS.matches).get(),
    adminDb.collection("plays").select("matchId", "leagueId").limit(LIMITS.plays).get(),
    adminDb.collection("free_agent_interest").where("createdAt", ">=", new Date(now - 7 * DAY)).limit(200).get(),
  ]);

  const truncated: string[] = [];
  const checkLimit = (label: keyof typeof LIMITS, size: number) => size >= LIMITS[label] && truncated.push(label);
  checkLimit("leagues", leagues.size);
  checkLimit("teams", teams.size);
  checkLimit("players", players.size);
  checkLimit("matches", matches.size);
  checkLimit("plays", plays.size);

  const leagueIds = new Set(leagues.docs.map((doc) => doc.id));
  const teamIds = new Set(teams.docs.map((doc) => doc.id));
  const matchIds = new Set(matches.docs.map((doc) => doc.id));
  const leagueAdmins = new Map(leaguePrivate.docs.map((doc) => {
    const data = doc.data();
    return [doc.id, lowerEmails(data.adminEmails, data.contactEmail, data.subscriptionAdminEmails)];
  }));
  const teamAdmins = new Map(teamPrivate.docs.map((doc) => [doc.id, lowerEmails(doc.data().adminEmails)]));
  const isDemo = (leagueId: string) => DEMO_LEAGUE_IDS.has(leagueId);

  const integrity: HealthIssue[] = [];
  const teamsPerLeague = new Map<string, number>();
  const lastActivity = new Map<string, number>();
  for (const doc of teams.docs) {
    const data = doc.data();
    const leagueId = str(data.leagueId).trim();
    bump(lastActivity, doc.id, toMillis(data.updatedAt) ?? toMillis(data.createdAt));
    if (!leagueId || isDemo(leagueId)) continue;
    teamsPerLeague.set(leagueId, (teamsPerLeague.get(leagueId) ?? 0) + 1);
    if (!leagueIds.has(leagueId) && !truncated.includes("leagues")) {
      integrity.push({ code: "team_missing_league", message: `Team "${str(data.name) || doc.id}" points to missing league ${leagueId}.`, targetId: doc.id, targetKind: "team", leagueId });
    }
  }
  if (!truncated.includes("teams")) {
    for (const doc of players.docs) {
      const data = doc.data();
      const teamId = str(data.teamId);
      if (!teamId || teamIds.has(teamId) || isDemo(str(data.leagueId))) continue;
      integrity.push({ code: "player_missing_team", message: `Player "${str(data.playerName) || doc.id}" is on missing team ${teamId}.`, targetId: doc.id, targetKind: "player", leagueId: str(data.leagueId) || undefined });
    }
  }

  const lastGameBySeason = new Map<string, number>();
  for (const doc of matches.docs) {
    const data = doc.data();
    const leagueId = str(data.leagueId);
    if (isDemo(leagueId)) continue;
    const activity = toMillis(data.updatedAt) ?? toMillis(data.createdAt) ?? toMillis(data.date);
    bump(lastActivity, leagueId, activity);
    bump(lastActivity, str(data.managingTeamId), activity);
    bump(lastActivity, str(data.homeTeamId), activity);
    bump(lastActivity, str(data.awayTeamId), activity);
    if (leagueId && !leagueIds.has(leagueId) && !truncated.includes("leagues")) {
      integrity.push({ code: "match_missing_league", message: `Game ${doc.id} points to missing league ${leagueId}.`, targetId: doc.id, targetKind: "match", leagueId });
    }
    if (!truncated.includes("teams")) {
      const missing = [str(data.homeTeamId), str(data.awayTeamId)].filter((id) => id && !teamIds.has(id));
      // Independent teams may schedule free-text opponents, so only league games must reference real teams.
      if (leagueId && missing.length) {
        integrity.push({ code: "match_missing_team", message: `Game ${doc.id} references missing team ${missing.join(", ")}.`, targetId: doc.id, targetKind: "match", leagueId });
      }
    }
    const date = toMillis(data.date);
    if (leagueId && date !== null && !data.isHidden) {
      const key = `${leagueId}|${matchSeasonId(data)}`;
      if ((lastGameBySeason.get(key) ?? 0) < date) lastGameBySeason.set(key, date);
    }
  }
  if (!truncated.includes("matches")) {
    const orphanedPlays = new Map<string, number>();
    for (const doc of plays.docs) {
      const data = doc.data();
      const matchId = str(data.matchId);
      if (!matchId || matchIds.has(matchId) || isDemo(str(data.leagueId))) continue;
      orphanedPlays.set(matchId, (orphanedPlays.get(matchId) ?? 0) + 1);
    }
    orphanedPlays.forEach((count, matchId) => {
      integrity.push({ code: "play_missing_match", message: `${count} play${count === 1 ? "" : "s"} belong to missing game ${matchId}.`, targetId: matchId, targetKind: "play" });
    });
  }

  const renewals: RenewalItem[] = [];
  const newRecords: NewRecord[] = [];
  const stale: StaleCandidate[] = [];
  const rollover: RolloverCandidate[] = [];
  const adminEmails = new Set<string>();
  const weekAgo = now - 7 * DAY;

  const considerCustomer = (id: string, kind: "league" | "team", data: Raw, admins: string[]) => {
    const name = str(data.name) || str(data.leagueName) || str(data.teamName) || id;
    const subscription = subscriptionOf(data);
    const status = str(subscription.status).toLowerCase();
    const archived = data.isArchived === true || status === "archived" || status === "canceled" || status === "cancelled";
    const createdAt = toMillis(data.createdAt);
    admins.forEach((email) => adminEmails.add(email));
    if (createdAt !== null && createdAt >= weekAgo) newRecords.push({ id, kind, name, createdAt });
    const renewsAt = toMillis(subscription.renewsAt);
    if (!archived && subscription.paymentMethod === "paid" && renewsAt !== null && renewsAt <= now + RENEWAL_WINDOW_DAYS * DAY) {
      renewals.push({ id, kind, name, renewsAt, overdue: renewsAt < now || status === "past_due", adminEmails: admins });
    }
    const lastAt = Math.max(lastActivity.get(id) ?? 0, toMillis(data.updatedAt) ?? 0, createdAt ?? 0) || null;
    const idle = lastAt === null || lastAt < now - STALE_AFTER_DAYS * DAY;
    const reasons: string[] = [];
    if (TEST_NAME.test(name)) reasons.push("Test-style name");
    if (status === "trial") reasons.push("Trial plan");
    if (archived) reasons.push("Archived or canceled");
    if (idle && reasons.length) {
      reasons.push(`No activity for ${STALE_AFTER_DAYS}+ days`);
      stale.push({ id, kind, name, reasons, createdAt, lastActivityAt: lastAt });
    }
    return { name, archived };
  };

  for (const doc of leagues.docs) {
    if (isDemo(doc.id)) continue;
    const data = doc.data();
    const admins = leagueAdmins.get(doc.id) ?? lowerEmails(data.adminEmails, data.contactEmail);
    const { name, archived } = considerCustomer(doc.id, "league", data, admins);
    const cap = Number(subscriptionOf(data).teamCount) || 8;
    const count = teamsPerLeague.get(doc.id) ?? 0;
    if (count > cap) {
      integrity.push({ code: "league_over_cap", message: `League "${name}" has ${count} teams but its plan covers ${cap}.`, targetId: doc.id, targetKind: "league", leagueId: doc.id });
    }
    if (archived) continue;
    const seasonId = getCurrentSeasonId(data);
    const season = getLeagueSeasons(data).find((entry) => entry.id === seasonId);
    const lastGameAt = lastGameBySeason.get(`${doc.id}|${seasonId}`);
    if (season?.status === "active" && lastGameAt !== undefined) {
      const daysUntilEnd = Math.ceil((lastGameAt - now) / DAY);
      // Remind from two weeks before the final scheduled game until a week after it.
      if (daysUntilEnd <= ROLLOVER_WINDOW_DAYS && daysUntilEnd >= -7) {
        rollover.push({ leagueId: doc.id, leagueName: name, seasonId, seasonTitle: season.title, lastGameAt, daysUntilEnd, adminEmails: admins });
      }
    }
  }
  for (const doc of teams.docs) {
    const data = doc.data();
    if (str(data.leagueId).trim()) {
      const createdAt = toMillis(data.createdAt);
      if (!isDemo(str(data.leagueId)) && createdAt !== null && createdAt >= weekAgo) {
        newRecords.push({ id: doc.id, kind: "team", name: str(data.name) || doc.id, createdAt });
      }
      continue;
    }
    considerCustomer(doc.id, "team", data, teamAdmins.get(doc.id) ?? []);
  }
  for (const doc of freeAgents.docs) {
    const data = doc.data();
    newRecords.push({ id: doc.id, kind: "free_agent", name: str(data.name) || str(data.fullName) || "Free agent", createdAt: toMillis(data.createdAt) });
  }

  const unverifiedAdmins: string[] = [];
  let pageToken: string | undefined;
  let seen = 0;
  do {
    const page = await adminAuth.listUsers(1000, pageToken);
    for (const user of page.users) {
      const email = (user.email || "").toLowerCase();
      if (email && adminEmails.has(email) && !user.emailVerified) unverifiedAdmins.push(email);
    }
    seen += page.users.length;
    pageToken = page.pageToken;
  } while (pageToken && seen < LIMITS.users);

  renewals.sort((a, b) => a.renewsAt - b.renewsAt);
  newRecords.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  stale.sort((a, b) => (a.lastActivityAt ?? 0) - (b.lastActivityAt ?? 0));
  rollover.sort((a, b) => a.daysUntilEnd - b.daysUntilEnd);
  return {
    generatedAt: now,
    integrity,
    renewals,
    newRecords,
    unverifiedAdmins: unverifiedAdmins.sort(),
    stale,
    rollover,
    scanned: { leagues: leagues.size, teams: teams.size, players: players.size, matches: matches.size, plays: plays.size },
    truncated,
  };
}

export function healthNeedsAttention(report: PlatformHealthReport): number {
  return report.integrity.length + report.renewals.length + report.unverifiedAdmins.length + report.stale.length + report.rollover.length;
}
