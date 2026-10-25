import { createHash } from "node:crypto";
import { FieldValue, Query, Transaction } from "firebase-admin/firestore";
import { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { readLimitedRequestBody, RequestBodyTooLargeError } from "@/lib/limitedRequestBody";
import { accountEmailKey } from "@/lib/accountEmailKey";
import { validateDepthCharts } from "@/lib/depthChart";
import { PLATFORM_ADMIN_EMAIL, isPlatformAdminEmail } from "@/lib/platformAdmin";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 300_000;
const MAX_ARRAY_ITEMS = 100;
const MAX_OBJECT_FIELDS = 80;
const MAX_STRING_LENGTH = 2_000;
const MAX_LOGO_LENGTH = 350_000;
const PER_MINUTE_WRITE_LIMIT = 120;
const PER_HOUR_WRITE_LIMIT = 500;
const LEAGUE_UPDATE_FIELDS = new Set([
  "leagueName", "shortcode", "tagline", "seasonTitle", "logoUrl", "icon", "primaryColor", "accentColor",
  "secondaryColor", "tertiaryColor", "themePreset", "defaultLocation", "rulebookTitle", "rulebookUrl",
  "announcement", "seasonStatus", "isArchived", "archivedAt", "visibility", "rules", "playoffFormat",
  "subscription", "teamCount", "contactEmail", "adminEmails",
  "registrationFeePerTeam", "individualFee", "amenities",
]);

type Entity =
  | "league"
  | "team"
  | "player"
  | "assign_player"
  | "team_private_update"
  | "player_private_update"
  | "player_update"
  | "league_private_update"
  | "league_update"
  | "match_update"
  | "delete_player"
  | "delete_team"
  | "delete_league"
  | "match"
  | "play"
  | "play_batch"
  | "red_play"
  | "playbook"
  | "depth_chart";
type Scope = { kind: string; id: string; collection: string; field: string; limit: number };

const ENTITY_LIMITS = {
  league: { collection: "leagues", field: "ownerUid", limit: 10 },
  team: { collection: "teams", field: "leagueId", limit: 64 },
  allTeams: { collection: "teams", field: "*", limit: 256 },
  rosterPlayer: { collection: "players", field: "teamId", limit: 30 },
  freeAgent: { collection: "players", field: "teamId", limit: 500 },
  match: { collection: "matches", field: "leagueId", limit: 512 },
  play: { collection: "plays", field: "matchId", limit: 500 },
  red_play: { collection: "red_plays", field: "matchId", limit: 500 },
  playLeague: { collection: "plays", field: "leagueId", limit: 50_000 },
  redPlayLeague: { collection: "red_plays", field: "leagueId", limit: 10_000 },
} as const;

// Season data in an archived league is read-only; league-level admin/reactivation and
// platform cleanup (deletes) remain available.
const ARCHIVE_GUARDED_ENTITIES = new Set<Entity>([
  "team", "player", "assign_player", "team_private_update", "player_private_update", "player_update",
  "match_update", "delete_player", "match", "play", "play_batch", "red_play",
]);

// Independent teams archive their own season on the team document; roster and game data
// for that team then become read-only until the season is reopened.
const TEAM_ARCHIVE_GUARDED_ENTITIES = new Set<Entity>([
  "player", "player_update", "delete_player", "match", "play", "play_batch",
]);

function isArchivedLeagueData(data: FirebaseFirestore.DocumentData | undefined): boolean {
  return !!data && (data.isArchived === true || data.seasonStatus === "archived");
}

class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function fail(message: string, status = 400): never {
  throw new RequestError(message, status);
}

function validateValue(value: unknown, field: string, depth = 0, maxDepth = 8): void {
  if (depth > maxDepth) fail("Payload nesting is too deep.");
  if (typeof value === "string") {
    const maxLength = field === "logoUrl" ? MAX_LOGO_LENGTH : MAX_STRING_LENGTH;
    if (value.length > maxLength) fail(`${field} is too long.`);
    return;
  }
  if (value === null || typeof value === "boolean" || typeof value === "number") return;
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS) fail(`${field} contains too many items.`);
    value.forEach((item) => validateValue(item, field, depth + 1, maxDepth));
    return;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length > MAX_OBJECT_FIELDS) fail(`${field} contains too many fields.`);
    for (const [key, nestedValue] of entries) validateValue(nestedValue, key, depth + 1, maxDepth);
    return;
  }
  fail(`${field} contains an unsupported value.`);
}

function validatePayload(data: unknown, maxDepth = 8): asserts data is Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    fail("A record payload is required.");
  }
  validateValue(data, "record", 0, maxDepth);
  if (Buffer.byteLength(JSON.stringify(data), "utf8") > MAX_REQUEST_BYTES) {
    fail("Payload exceeds the maximum allowed size.");
  }
}

function validatePlaybooks(playbooks: unknown[]): void {
  if (playbooks.length > 5) fail("A team may save at most five playbooks.");
  for (const bookValue of playbooks) {
    if (!bookValue || typeof bookValue !== "object" || Array.isArray(bookValue)) {
      fail("Invalid playbook data.");
    }
    const book = bookValue as Record<string, unknown>;
    if (!Array.isArray(book.formations) || book.formations.length > 32 ||
      !Array.isArray(book.plays) || book.plays.length > 100) {
      fail("A playbook may contain at most 32 formations and 100 plays.");
    }
    for (const formationValue of book.formations) {
      if (!formationValue || typeof formationValue !== "object" || Array.isArray(formationValue)) {
        fail("Invalid formation data.");
      }
      const formation = formationValue as Record<string, unknown>;
      if (Array.isArray(formation.players) && formation.players.length > 16) {
        fail("A formation may contain at most 16 players.");
      }
    }
    for (const playValue of book.plays) {
      if (!playValue || typeof playValue !== "object" || Array.isArray(playValue)) {
        fail("Invalid play diagram.");
      }
      const play = playValue as Record<string, unknown>;
      if (!Array.isArray(play.players) || play.players.length > 16 ||
        (Array.isArray(play.zones) && play.zones.length > 12) ||
        (Array.isArray(play.questions) && play.questions.length > 20)) {
        fail("A play diagram exceeds its player, zone, or question limit.");
      }
      for (const playerValue of play.players) {
        if (!playerValue || typeof playerValue !== "object" || Array.isArray(playerValue)) {
          fail("Invalid player route data.");
        }
        const player = playerValue as Record<string, unknown>;
        if ((Array.isArray(player.route) && player.route.length > 50) ||
            (Array.isArray(player.motionPath) && player.motionPath.length > 50)) {
          fail("A player route may contain at most 50 points.");
        }
      }
    }
  }
}

function normalizeEmail(email: string | undefined): string {
  return (email || "").trim().toLowerCase();
}

function validEmail(value: unknown): value is string {
  return typeof value === "string" &&
    value.length <= 254 &&
    /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value);
}

function normalizedEmails(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((email) => normalizeEmail(email as string))
    : [];
}

function isDocumentId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

function isPlatformAdmin(token: DecodedIdToken): boolean {
  return isPlatformAdminEmail(token.email);
}

function isLeagueAdminData(data: FirebaseFirestore.DocumentData, token: DecodedIdToken): boolean {
  const email = normalizeEmail(token.email);
  return isPlatformAdmin(token) ||
    data.ownerUid === token.uid ||
    (Array.isArray(data.adminEmails) &&
      data.adminEmails.map((value: unknown) => String(value).trim().toLowerCase()).includes(email)) ||
    (Array.isArray(data.subscriptionAdminEmails) &&
      data.subscriptionAdminEmails.map((value: unknown) => String(value).trim().toLowerCase()).includes(email));
}

function isTeamAdminData(data: FirebaseFirestore.DocumentData, token: DecodedIdToken): boolean {
  const email = normalizeEmail(token.email);
  return isPlatformAdmin(token) ||
    (Array.isArray(data.adminEmails) && data.adminEmails.map((value: unknown) => String(value).toLowerCase()).includes(email)) ||
    (typeof data.coachEmail === "string" && data.coachEmail.toLowerCase() === email) ||
    (typeof data.adminEmail === "string" && data.adminEmail.toLowerCase() === email);
}

async function isLeagueAdmin(
  transaction: Transaction,
  leagueId: string,
  token: DecodedIdToken,
): Promise<boolean> {
  const privateLeague = await transaction.get(adminDb.doc(`league_private/${leagueId}`));
  if (privateLeague.exists && isLeagueAdminData(privateLeague.data() || {}, token)) return true;
  const league = await transaction.get(adminDb.doc(`leagues/${leagueId}`));
  return league.exists && isLeagueAdminData(league.data() || {}, token);
}

async function isTeamAdmin(
  transaction: Transaction,
  teamId: string,
  token: DecodedIdToken,
): Promise<{ allowed: boolean; leagueId: string; exists: boolean; standalone: boolean }> {
  const team = await transaction.get(adminDb.doc(`teams/${teamId}`));
  const data = team.data();
  const privateTeam = await transaction.get(adminDb.doc(`team_private/${teamId}`));
  const privateData = privateTeam.data() || {};
  return {
    allowed: (!!data && isTeamAdminData(data, token)) || isTeamAdminData(privateData, token),
    leagueId: typeof data?.leagueId === "string" ? data.leagueId : "",
    exists: team.exists,
    standalone: data?.isStandalone === true,
  };
}

// The primary admin (head coach) is adminEmails[0], falling back to coachEmail.
// Addresses linked to the same account share that role.
async function isPrimaryTeamAdmin(
  transaction: Transaction,
  teamId: string,
  token: DecodedIdToken,
): Promise<boolean> {
  const [privateTeam, publicTeam] = await Promise.all([
    transaction.get(adminDb.doc(`team_private/${teamId}`)),
    transaction.get(adminDb.doc(`teams/${teamId}`)),
  ]);
  const teamData = privateTeam.data() || publicTeam.data() || {};
  const primaryEmail = Array.isArray(teamData.adminEmails) && teamData.adminEmails[0]
    ? normalizeEmail(String(teamData.adminEmails[0]))
    : normalizeEmail(typeof teamData.coachEmail === "string" ? teamData.coachEmail : "");
  const email = normalizeEmail(token.email);
  if (!primaryEmail || !email) return false;
  if (primaryEmail === email) return true;
  const [primaryLink, userLink] = await Promise.all([
    transaction.get(adminDb.doc(`account_email_addresses/${accountEmailKey(primaryEmail)}`)),
    transaction.get(adminDb.doc(`account_email_addresses/${accountEmailKey(email)}`)),
  ]);
  const primaryUid = primaryLink.get("accountUid");
  return typeof primaryUid === "string" && primaryUid === userLink.get("accountUid");
}

async function authorizeWrite(
  transaction: Transaction,
  entity: Entity,
  data: Record<string, unknown>,
  token: DecodedIdToken,
): Promise<void> {
  if (entity === "league") {
    if (!isPlatformAdmin(token)) fail("Only the FlagOS platform administrator can create leagues.", 403);
    if (data.ownerUid !== token.uid ||
      typeof token.email !== "string" ||
      !Array.isArray(data.adminEmails) ||
      !data.adminEmails.map((value) => String(value).toLowerCase()).includes(normalizeEmail(token.email))) {
      fail("A league must be created by its verified owner.", 403);
    }
    return;
  }

  if (entity === "team") {
    if (!isPlatformAdmin(token)) fail("Only the FlagOS platform administrator can create teams.", 403);
    if (data.leagueId === "") {
      data.isStandalone = true;
      return;
    }
    if (!isDocumentId(data.leagueId)) fail("A valid league ID is required.");
    const league = await transaction.get(adminDb.doc(`leagues/${data.leagueId}`));
    if (!league.exists) fail("The league was not found.", 404);
    delete data.isStandalone;
    return;
  }

  if (entity === "match") {
    if (entity === "match" && isDocumentId(data.managingTeamId)) {
      const manager = await isTeamAdmin(transaction, data.managingTeamId, token);
      if (data.isStandalone === true || data.isIndependent === true || manager.standalone) {
        if (!manager.exists) fail("The managing team was not found.", 404);
        if (!manager.allowed &&
          !(manager.leagueId && await isLeagueAdmin(transaction, manager.leagueId, token))) {
          fail("You do not have permission to create this team's independent match.", 403);
        }
        if (!isDocumentId(data.homeTeamId) || !isDocumentId(data.awayTeamId) ||
          data.homeTeamId === data.awayTeamId ||
          ![data.homeTeamId, data.awayTeamId].includes(data.managingTeamId)) {
          fail("The managing team must participate in the independent match.");
        }
        for (const side of ["home", "away"]) {
          const teamId = String(data[`${side}TeamId`]);
          if (teamId === data.managingTeamId) continue;
          if (teamId.startsWith("opponent_")) {
            const name = data[`${side}TeamName`];
            if (typeof name !== "string" || !name.trim() || name.length > 100) {
              fail("An external opponent name is required.");
            }
          } else {
            const opponent = await isTeamAdmin(transaction, teamId, token);
            if (!opponent.exists || opponent.leagueId !== manager.leagueId) {
              fail("Registered opponents must belong to the managing team's league.");
            }
          }
        }
        data.leagueId = manager.leagueId;
        data.isStandalone = true;
        return;
      }
    }
    const leagueId = data.leagueId;
    if (!isDocumentId(leagueId)) fail("A valid league ID is required.");
    for (const field of ["homeTeamId", "awayTeamId", "managingTeamId"]) {
      const teamId = data[field];
      if (teamId !== undefined && teamId !== "" && !isDocumentId(teamId)) {
        fail("Match team IDs are invalid.");
      }
    }
    const teamIds = [data.homeTeamId, data.awayTeamId, data.managingTeamId]
      .filter((value): value is string => typeof value === "string" && value.length > 0);
    const leagueAdmin = await isLeagueAdmin(transaction, leagueId, token);
    let teamAdmin = false;
    for (const teamId of new Set(teamIds)) {
      const team = await isTeamAdmin(transaction, teamId, token);
      if (!team.exists || team.leagueId !== leagueId) {
        fail("Every match team must belong to the selected league.", 400);
      }
      teamAdmin = teamAdmin || team.allowed;
    }
    if (leagueAdmin || teamAdmin) return;
    fail("You do not have permission to create this record.", 403);
  }

  if (entity === "player") {
    const teamId = data.teamId;
    const email = normalizeEmail(token.email);
    if (typeof teamId !== "string" || (teamId !== "" && !isDocumentId(teamId))) {
      fail("A valid team ID is required.");
    }
    if (!teamId) {
      if (!email || normalizeEmail(data.email as string | undefined) !== email) {
        fail("Free-agent registration must use the verified account email.", 403);
      }
      if (!isDocumentId(data.leagueId)) fail("A valid league ID is required.");
      const league = await transaction.get(adminDb.doc(`leagues/${data.leagueId}`));
      if (!league.exists || league.data()?.visibility !== "public" ||
        league.data()?.rules?.enableFreeAgents === false) {
        fail("This league is not accepting free-agent registrations.", 403);
      }
      return;
    }
    const team = await isTeamAdmin(transaction, teamId, token);
    if (!team.allowed && !(team.leagueId && await isLeagueAdmin(transaction, team.leagueId, token))) {
      fail("You do not have permission to add players to this team.", 403);
    }
    if (!team.exists || (typeof data.leagueId === "string" && data.leagueId !== team.leagueId)) {
      fail("The player team does not belong to the selected league.", 400);
    }
    data.leagueId = team.leagueId;
    return;
  }

  if (entity === "assign_player") {
    return;
  }

  if (entity === "team_private_update") {
    const teamId = data.teamId;
    if (typeof teamId !== "string" || !teamId) fail("A team ID is required.");
    const team = await isTeamAdmin(transaction, teamId, token);
    if (!team.allowed && !(team.leagueId && await isLeagueAdmin(transaction, team.leagueId, token))) {
      fail("You do not have permission to manage this team's private details.", 403);
    }
    data.leagueId = team.leagueId;
    return;
  }

  if (entity === "player_private_update") {
    const playerId = data.playerId;
    if (!isDocumentId(playerId)) fail("A valid player ID is required.");
    const player = await transaction.get(adminDb.doc(`players/${playerId}`));
    const playerData = player.data();
    if (!playerData) fail("The player was not found.", 404);
    const teamId = typeof playerData.teamId === "string" ? playerData.teamId : "";
    const team = teamId ? await isTeamAdmin(transaction, teamId, token) : { allowed: false, leagueId: "" };
    const leagueId = typeof playerData.leagueId === "string" ? playerData.leagueId : team.leagueId;
    if (!team.allowed && !(leagueId && await isLeagueAdmin(transaction, leagueId, token))) {
      fail("You do not have permission to manage this player's private details.", 403);
    }
    data.teamId = teamId;
    data.leagueId = leagueId || "";
    return;
  }

  if (entity === "player_update") {
    const playerId = data.playerId;
    if (!isDocumentId(playerId)) fail("A valid player ID is required.");
    const player = await transaction.get(adminDb.doc(`players/${playerId}`));
    const playerData = player.data();
    if (!playerData) fail("The player was not found.", 404);
    const teamId = typeof playerData.teamId === "string" ? playerData.teamId : "";
    const team = teamId ? await isTeamAdmin(transaction, teamId, token) : { allowed: false, leagueId: "" };
    const leagueId = typeof playerData.leagueId === "string" ? playerData.leagueId : team.leagueId;
    if (!team.allowed && !(leagueId && await isLeagueAdmin(transaction, leagueId, token))) {
      fail("You do not have permission to update this player.", 403);
    }
    data.teamId = teamId;
    data.leagueId = leagueId || "";
    return;
  }

  if (entity === "delete_player") {
    const playerId = data.playerId;
    if (!isDocumentId(playerId)) fail("A valid player ID is required.");
    const player = await transaction.get(adminDb.doc(`players/${playerId}`));
    const playerData = player.data();
    if (!playerData) fail("The player was not found.", 404);
    const teamId = typeof playerData.teamId === "string" ? playerData.teamId : "";
    const team = teamId ? await isTeamAdmin(transaction, teamId, token) : { allowed: false, leagueId: "" };
    const leagueId = typeof playerData.leagueId === "string" ? playerData.leagueId : team.leagueId;
    const leagueAdmin = leagueId && await isLeagueAdmin(transaction, leagueId, token);
    const isPrimary = !!teamId && await isPrimaryTeamAdmin(transaction, teamId, token);
    if (!isPlatformAdmin(token) && !leagueAdmin && (!team.allowed || !isPrimary)) {
      fail("You do not have permission to delete this player.", 403);
    }
    data.teamId = teamId;
    data.leagueId = leagueId || "";
    return;
  }

  if (entity === "delete_team") {
    const teamId = data.teamId;
    if (!isDocumentId(teamId)) fail("A valid team ID is required.");
    const team = await transaction.get(adminDb.doc(`teams/${teamId}`));
    const teamData = team.data();
    if (!teamData) fail("The team was not found.", 404);
    if (data.purge !== undefined && (typeof data.purge !== "boolean" || !isPlatformAdmin(token))) {
      fail("Only the platform administrator can permanently purge a team.", 403);
    }
    if (isPlatformAdmin(token)) return;
    if (typeof teamData.leagueId !== "string" ||
      !(await isLeagueAdmin(transaction, teamData.leagueId, token))) {
      fail("Only the league administrator can delete this team.", 403);
    }
    return;
  }

  if (entity === "delete_league") {
    if (!isPlatformAdmin(token) || !isDocumentId(data.leagueId)) {
      fail("Only the platform administrator can delete a league.", 403);
    }
    return;
  }

  if (entity === "league_private_update" || entity === "league_update") {
    const leagueId = data.leagueId;
    if (!isDocumentId(leagueId) || !(await isLeagueAdmin(transaction, leagueId, token))) {
      fail("You do not have permission to manage this league's private details.", 403);
    }
    if (entity === "league_update" && !(await transaction.get(adminDb.doc(`leagues/${leagueId}`))).exists) {
      fail("The league was not found.", 404);
    }
    return;
  }

  if (entity === "match_update") {
    if (!isDocumentId(data.matchId)) fail("A valid match ID is required.");
    const match = await transaction.get(adminDb.doc(`matches/${String(data.matchId)}`));
    const matchData = match.data();
    if (!matchData) fail("The match was not found.", 404);
    const leagueId = typeof matchData.leagueId === "string" ? matchData.leagueId : "";
    if (!leagueId || !(await isLeagueAdmin(transaction, leagueId, token))) {
      fail("Only the league administrator can change this matchup.", 403);
    }
    if (matchData.status === "completed" || matchData.status === "Final" || matchData.status === "in_progress") {
      fail("Teams cannot be changed once a game has started.", 409);
    }
    for (const key of ["homeTeamId", "awayTeamId"]) {
      const teamId = data[key];
      if (teamId === "") continue;
      if (!isDocumentId(teamId)) fail(`${key} is invalid.`);
      const team = await transaction.get(adminDb.doc(`teams/${String(teamId)}`));
      if (team.get("leagueId") !== leagueId) fail("Both teams must belong to this league.", 400);
    }
    data.leagueId = leagueId;
    return;
  }

  if (entity === "play" || entity === "play_batch" || entity === "red_play") {
    const matchId = data.matchId;
    if (!isDocumentId(matchId)) fail("A valid match ID is required.");
    const match = await transaction.get(adminDb.doc(`matches/${matchId}`));
    const matchData = match.data();
    if (!matchData) fail("The match was not found.", 404);
    data.leagueId = typeof matchData.leagueId === "string" ? matchData.leagueId : "";
    data.managingTeamId = typeof matchData.managingTeamId === "string"
      ? matchData.managingTeamId
      : typeof matchData.homeTeamId === "string" ? matchData.homeTeamId : "";
    data.isHidden = matchData.isHidden === true;
    if (typeof matchData.leagueId === "string" && matchData.leagueId &&
      await isLeagueAdmin(transaction, matchData.leagueId, token)) return;
    const teamIds = [matchData.homeTeamId, matchData.awayTeamId, matchData.managingTeamId]
      .filter((value): value is string => typeof value === "string" && value.length > 0);
    for (const teamId of new Set(teamIds)) {
      if ((await isTeamAdmin(transaction, teamId, token)).allowed) return;
    }
    fail("You do not have permission to record events for this match.", 403);
  }

  if (entity === "depth_chart") {
    if (!isDocumentId(data.teamId)) fail("A valid team ID is required.");
    const team = await isTeamAdmin(transaction, data.teamId, token);
    if (!team.allowed) fail("Only this team's coaches can manage depth charts.", 403);
    const roster = await transaction.get(adminDb.collection("players").where("teamId", "==", data.teamId).limit(31));
    const playerIds = new Set(roster.docs.map((player) => player.id));
    for (const chart of (data.charts as import("@/lib/depthChart").DepthChart[])) {
      for (const assigned of Object.values(chart.assignments)) {
        if (assigned.some((id) => !playerIds.has(id))) fail("Depth charts may only contain current team players.");
      }
    }
    return;
  }

  if (entity === "playbook") {
    const teamId = data.teamId;
    if (!isDocumentId(teamId)) fail("A valid team ID is required.");
    const team = await isTeamAdmin(transaction, teamId, token);
    const leagueAdmin = !!team.leagueId && await isLeagueAdmin(transaction, team.leagueId, token);
    if (!team.allowed && !leagueAdmin) {
      fail("You do not have permission to update this playbook.", 403);
    }
    if (!isPlatformAdmin(token) && !leagueAdmin && !(await isPrimaryTeamAdmin(transaction, teamId, token))) {
      const current = await transaction.get(adminDb.doc(`teams/${teamId}/meta/playbook`));
      const books = current.data()?.playbooks;
      const nextBooks = data.playbooks as Record<string, unknown>[];
      if (Array.isArray(books) && books.some((book) =>
        !nextBooks.some((next) => next.id === book.id))) {
        fail("Only the head coach can delete a playbook.", 403);
      }
    }
    return;
  }
}

function resolveScopes(entity: Entity, data: Record<string, unknown>, token: DecodedIdToken): Scope[] {
  if (entity === "playbook" || entity === "depth_chart" || entity.endsWith("_private_update") ||
    entity === "player_update" || entity.startsWith("delete_")) return [];
  if (entity === "league") {
    return [{
      kind: entity,
      id: token.uid,
      ...ENTITY_LIMITS.league,
    }];
  }
  if (entity === "team") {
    const scopes: Scope[] = [{ kind: "team-global", id: "all", ...ENTITY_LIMITS.allTeams }];
    if (data.leagueId) scopes.push({ kind: "team-league", id: String(data.leagueId), ...ENTITY_LIMITS.team });
    return scopes;
  }
  if (entity === "player" && data.teamId === "") {
    return [{
      kind: "free-agents",
      id: "",
      collection: ENTITY_LIMITS.freeAgent.collection,
      field: ENTITY_LIMITS.freeAgent.field,
      limit: ENTITY_LIMITS.freeAgent.limit,
    }];
  }
  if (entity === "assign_player") {
    return [{
      kind: "rosterPlayer",
      id: String(data.teamId),
      ...ENTITY_LIMITS.rosterPlayer,
    }];
  }
  if (entity === "player") {
    return [{
      kind: entity,
      id: String(data.teamId),
      collection: ENTITY_LIMITS.rosterPlayer.collection,
      field: ENTITY_LIMITS.rosterPlayer.field,
      limit: ENTITY_LIMITS.rosterPlayer.limit,
    }];
  }
  if (entity === "match") {
    if (data.isStandalone === true) {
      return [{
        kind: "match-team", id: String(data.managingTeamId),
        collection: "matches", field: "managingTeamId", limit: ENTITY_LIMITS.match.limit,
      }];
    }
    return [{
      kind: entity,
      id: String(data.leagueId),
      ...ENTITY_LIMITS[entity],
    }];
  }
  if (entity === "play_batch") {
    return [{
      kind: "play",
      id: String(data.matchId),
      ...ENTITY_LIMITS.play,
    }];
  }
  if (entity === "play") {
    return [
      { kind: entity, id: String(data.matchId), ...ENTITY_LIMITS.play },
      data.leagueId
        ? { kind: "play-league", id: String(data.leagueId), ...ENTITY_LIMITS.playLeague }
        : { kind: "play-team", id: String(data.managingTeamId), ...ENTITY_LIMITS.playLeague, field: "managingTeamId" },
    ];
  }
  if (entity === "red_play") {
    return [
      { kind: entity, id: String(data.matchId), ...ENTITY_LIMITS.red_play },
      data.leagueId
        ? { kind: "red-play-league", id: String(data.leagueId), ...ENTITY_LIMITS.redPlayLeague }
        : { kind: "red-play-team", id: String(data.managingTeamId), ...ENTITY_LIMITS.redPlayLeague, field: "managingTeamId" },
    ];
  }
  return [];
}

function getRecordCollection(entity: Entity): string {
  switch (entity) {
    case "playbook":
    case "depth_chart":
    case "team_private_update":
    case "player_private_update":
    case "league_private_update":
    case "league_update":
    case "match_update":
    case "player_update":
    case "delete_player":
    case "delete_team":
    case "delete_league":
      return "";
    case "assign_player":
    case "player":
      return "players";
    case "play_batch":
      return "plays";
    case "league":
    case "team":
    case "match":
    case "play":
    case "red_play":
      return ENTITY_LIMITS[entity].collection;
  }
}

function getCounterId(scope: Scope): string {
  const suffix = createHash("sha256").update(`${scope.kind}:${scope.id}`).digest("hex").slice(0, 32);
  return `${scope.kind}_${suffix}`;
}

function getCountQuery(scope: Scope): Query {
  const collection = adminDb.collection(scope.collection);
  return (scope.field === "*" ? collection : collection.where(scope.field, "==", scope.id))
    .limit(scope.limit);
}

function buildRecord(entity: Entity, data: Record<string, unknown>): Record<string, unknown> {
  const record = { ...data };
  // Firestore assigns the document ID; a client-supplied id would shadow it on read.
  delete record.id;
  if (entity === "league") {
    delete record.adminEmails;
    delete record.contactEmail;
    if (record.subscription && typeof record.subscription === "object" && !Array.isArray(record.subscription)) {
      const subscription = { ...(record.subscription as Record<string, unknown>) };
      delete subscription.adminEmails;
      record.subscription = subscription;
    }
  }
  if (entity === "team") {
    delete record.adminEmails;
    delete record.coachEmail;
    delete record.adminEmail;
    delete record.email;
  }
  if (entity === "player") {
    delete record.email;
    delete record.emails;
  }
  if (entity === "play") record.timestamp = FieldValue.serverTimestamp();
  if (entity === "match" && typeof record.isHidden !== "boolean") record.isHidden = false;
  if (entity !== "playbook") record.createdAt = FieldValue.serverTimestamp();
  return record;
}

const AUDITED_ENTITIES = new Set<Entity>(["league", "team", "league_update", "delete_team", "delete_league"]);

/** Best-effort record of platform-owner changes for the admin console activity log. */
async function recordPlatformAudit(
  token: DecodedIdToken,
  entity: Entity,
  data: Record<string, unknown>,
  targetId: string,
): Promise<void> {
  const name = String(data.leagueName || data.name || data.teamName || targetId).slice(0, 120);
  const summaries: Partial<Record<Entity, string>> = {
    league: `Created league ${name}`,
    team: `Created ${data.leagueId ? "league" : "independent"} team ${name}`,
    league_update: `Updated league ${name}${data.subscription ? " (incl. subscription)" : ""}`,
    delete_team: `Deleted team ${targetId}${data.purge === true ? " and purged its data" : ""}`,
    delete_league: `Deleted league ${targetId}`,
  };
  try {
    await adminDb.collection("platform_audit").add({
      action: entity,
      summary: summaries[entity] || entity,
      actorEmail: String(token.email || "").toLowerCase(),
      actorUid: token.uid,
      targetId,
      targetKind: entity.includes("team") ? "team" : "league",
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.warn("Platform audit write skipped:", error);
  }
}

/**
 * Removes everything owned by a deleted team: roster, private contact data, depth charts,
 * playbooks, and the team's own (standalone) games with their plays. League games are kept.
 */
async function purgeTeamData(teamId: string): Promise<void> {
  const refs: FirebaseFirestore.DocumentReference[] = [adminDb.doc(`team_depth_charts/${teamId}`)];
  const [players, meta, matches] = await Promise.all([
    adminDb.collection("players").where("teamId", "==", teamId).get(),
    adminDb.collection(`teams/${teamId}/meta`).get(),
    adminDb.collection("matches").where("managingTeamId", "==", teamId).get(),
  ]);
  for (const player of players.docs) refs.push(player.ref, adminDb.doc(`player_private/${player.id}`));
  refs.push(...meta.docs.map((entry) => entry.ref));
  const ownMatches = matches.docs.filter((match) => match.get("isStandalone") === true || !match.get("leagueId"));
  for (const match of ownMatches) {
    refs.push(match.ref);
    const [plays, redPlays] = await Promise.all([
      adminDb.collection("plays").where("matchId", "==", match.id).get(),
      adminDb.collection("red_plays").where("matchId", "==", match.id).get(),
    ]);
    refs.push(...plays.docs.map((play) => play.ref), ...redPlays.docs.map((play) => play.ref));
  }
  for (let index = 0; index < refs.length; index += 400) {
    const batch = adminDb.batch();
    for (const ref of refs.slice(index, index + 400)) batch.delete(ref);
    await batch.commit();
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await readLimitedRequestBody(request, MAX_REQUEST_BYTES);
    const authorization = request.headers.get("authorization") || "";
    const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!idToken) return Response.json({ error: "Authentication is required." }, { status: 401 });
    const token = await adminAuth.verifyIdToken(idToken, true);
    if (token.email_verified !== true) {
      return Response.json({ error: "Verify your email before creating data." }, { status: 403 });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      fail("Request body must be valid JSON.");
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) fail("Invalid request.");
    const { entity, data } = body as { entity?: unknown; data?: unknown };
    if (![
      "league", "team", "player", "assign_player", "team_private_update", "player_private_update",
      "league_private_update", "league_update", "match_update", "player_update", "match", "play", "play_batch", "red_play", "playbook",
      "delete_player", "delete_team", "delete_league", "depth_chart",
    ].includes(String(entity))) {
      fail("Unsupported record type.");
    }
    // Playbook route and motion coordinates are nine levels below the record.
    validatePayload(data, entity === "playbook" ? 9 : 8);
    const requestedEntity = entity as Entity;
    if (requestedEntity === "depth_chart" &&
      (Object.keys(data).some((key) => !["teamId", "charts", "visibleToPlayers"].includes(key)) || !validateDepthCharts(data))) {
      fail("Depth chart data is invalid or exceeds its limits.");
    }
    if (requestedEntity === "playbook") {
      if (!Array.isArray(data.playbooks)) fail("Playbooks must be a list.");
      validatePlaybooks(data.playbooks);
      if (Object.keys(data).some((key) => !["playbooks", "updatedAt", "teamId"].includes(key))) {
        fail("Invalid playbook fields.");
      }
    }
    if (requestedEntity === "team_private_update" &&
      (Object.keys(data).some((key) => !["teamId", "adminEmails", "coachEmail", "adminEmail"].includes(key)) ||
        typeof data.teamId !== "string" ||
        !Array.isArray(data.adminEmails) || data.adminEmails.length > 10 ||
        !data.adminEmails.every(validEmail) ||
        (data.coachEmail !== undefined && data.coachEmail !== "" && !validEmail(data.coachEmail)) ||
        (data.adminEmail !== undefined && data.adminEmail !== "" && !validEmail(data.adminEmail)))) {
      fail("Team administrator data is invalid or exceeds its limits.");
    }
    if (requestedEntity === "player_private_update" &&
      (Object.keys(data).some((key) => !["playerId", "email", "emails"].includes(key)) ||
        typeof data.playerId !== "string" ||
        (data.email !== undefined && data.email !== "" && !validEmail(data.email)) ||
        (data.emails !== undefined &&
          (!Array.isArray(data.emails) || data.emails.length > 10 ||
            !data.emails.every(validEmail))))) {
      fail("Player contact data is invalid or exceeds its limits.");
    }
    if (requestedEntity === "player_update") {
      const allowedFields = [
        "playerId", "playerName", "number", "position", "positions", "experience",
        "email", "emails", "isQuarterback",
      ];
      if (Object.keys(data).some((key) => !allowedFields.includes(key)) ||
        typeof data.playerId !== "string" ||
        typeof data.playerName !== "string" || data.playerName.length < 1 || data.playerName.length > 100 ||
        (data.number !== undefined && (typeof data.number !== "string" || data.number.length > 4)) ||
        (data.position !== undefined && (typeof data.position !== "string" || data.position.length > 20)) ||
        (data.positions !== undefined &&
          (!Array.isArray(data.positions) || data.positions.length > 10 ||
            !data.positions.every((position) => typeof position === "string" && position.length <= 20))) ||
        (data.experience !== undefined && (typeof data.experience !== "string" || data.experience.length > 1000)) ||
        (data.email !== undefined && data.email !== "" && !validEmail(data.email)) ||
        (data.emails !== undefined &&
          (!Array.isArray(data.emails) || data.emails.length > 10 || !data.emails.every(validEmail))) ||
        (data.isQuarterback !== undefined && typeof data.isQuarterback !== "boolean")) {
        fail("Player data is invalid or exceeds its limits.");
      }
    }
    if (requestedEntity === "league_private_update" &&
      (Object.keys(data).some((key) => !["leagueId", "adminEmails", "contactEmail"].includes(key)) ||
        typeof data.leagueId !== "string" ||
        (data.adminEmails !== undefined &&
          (!Array.isArray(data.adminEmails) || data.adminEmails.length > 10 ||
            !data.adminEmails.every(validEmail))) ||
        (data.contactEmail !== undefined && data.contactEmail !== "" && !validEmail(data.contactEmail)))) {
      fail("League contact data is invalid or exceeds its limits.");
    }
    if (requestedEntity === "league_update") {
      const unknownKey = Object.keys(data).find((key) => key !== "leagueId" && !LEAGUE_UPDATE_FIELDS.has(key));
      if (unknownKey) fail(`League field "${unknownKey}" cannot be updated.`);
      const stringLimits: Record<string, number> = {
        leagueName: 100, shortcode: 12, tagline: 240, seasonTitle: 100, logoUrl: MAX_LOGO_LENGTH, icon: 100,
        themePreset: 50, defaultLocation: 200, rulebookTitle: 200, rulebookUrl: 2048, announcement: 2000,
        archivedAt: 64,
      };
      for (const [key, max] of Object.entries(stringLimits)) {
        if (data[key] !== undefined && (typeof data[key] !== "string" || (data[key] as string).length > max)) {
          fail(`League field "${key}" is invalid.`);
        }
      }
      for (const key of ["primaryColor", "accentColor", "secondaryColor", "tertiaryColor"]) {
        if (data[key] !== undefined && (typeof data[key] !== "string" || !/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(data[key] as string))) {
          fail(`League color "${key}" is invalid.`);
        }
      }
      if ((data.visibility !== undefined && !["public", "private"].includes(String(data.visibility))) ||
        (data.seasonStatus !== undefined && !["active", "completed", "archived"].includes(String(data.seasonStatus))) ||
        (data.isArchived !== undefined && typeof data.isArchived !== "boolean") ||
        (data.teamCount !== undefined && (typeof data.teamCount !== "number" || data.teamCount < 0 || data.teamCount > 64)) ||
        (data.registrationFeePerTeam !== undefined && data.registrationFeePerTeam !== null &&
          (typeof data.registrationFeePerTeam !== "number" || data.registrationFeePerTeam < 0 || data.registrationFeePerTeam > 100_000)) ||
        (data.individualFee !== undefined && data.individualFee !== null &&
          (typeof data.individualFee !== "number" || data.individualFee < 0 || data.individualFee > 100_000)) ||
        (data.amenities !== undefined && data.amenities !== null &&
          (!Array.isArray(data.amenities) || data.amenities.length > 30 ||
            !data.amenities.every((item) => typeof item === "string" && item.length <= 100))) ||
        (data.adminEmails !== undefined &&
          (!Array.isArray(data.adminEmails) || data.adminEmails.length > 10 || !data.adminEmails.every(validEmail))) ||
        (data.contactEmail !== undefined && data.contactEmail !== "" && !validEmail(data.contactEmail))) {
        fail("League settings are invalid or exceed their limits.");
      }
      for (const key of ["rules", "playoffFormat", "subscription"]) {
        const value = data[key];
        if (value !== undefined && (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length > 40)) {
          fail(`League field "${key}" is invalid.`);
        }
      }
      if (data.leagueName !== undefined && !(data.leagueName as string).trim()) fail("A league name is required.");
    }
    if (requestedEntity === "match_update" &&
      (Object.keys(data).some((key) =>
        !["matchId", "homeTeamId", "awayTeamId", "homeTeamName", "awayTeamName", "manualMatchup"].includes(key)) ||
        typeof data.homeTeamId !== "string" || typeof data.awayTeamId !== "string" ||
        (data.homeTeamId !== "" && data.homeTeamId === data.awayTeamId) ||
        (data.homeTeamName !== undefined && (typeof data.homeTeamName !== "string" || data.homeTeamName.length > 100)) ||
        (data.awayTeamName !== undefined && (typeof data.awayTeamName !== "string" || data.awayTeamName.length > 100)) ||
        (data.manualMatchup !== undefined && typeof data.manualMatchup !== "boolean"))) {
      fail("Matchup data is invalid.");
    }
    if (requestedEntity === "league" &&
      (typeof data.leagueName !== "string" || typeof data.shortcode !== "string")) {
      fail("A league name and shortcode are required.");
    }
    if (requestedEntity === "league") {
      const leagueName = data.leagueName;
      const shortcode = data.shortcode;
      if (typeof leagueName !== "string" || leagueName.length < 1 || leagueName.length > 100 ||
        typeof shortcode !== "string" || shortcode.length < 1 || shortcode.length > 12 ||
        typeof data.tagline !== "string" || data.tagline.length > 240 ||
        typeof data.seasonTitle !== "string" || data.seasonTitle.length > 100 ||
        typeof data.primaryColor !== "string" || !/^#[0-9a-f]{6}$/i.test(data.primaryColor) ||
        typeof data.accentColor !== "string" || !/^#[0-9a-f]{6}$/i.test(data.accentColor) ||
        !["public", "private"].includes(String(data.visibility)) ||
        !Array.isArray(data.adminEmails) || data.adminEmails.length > 10 ||
        !data.adminEmails.every(validEmail) ||
        !data.rules || typeof data.rules !== "object" || Array.isArray(data.rules) ||
        Object.keys(data.rules).length > 30) {
        fail("League settings are invalid or exceed their limits.");
      }
      if (data.contactEmail !== undefined && data.contactEmail !== "" && !validEmail(data.contactEmail)) {
        fail("Contact email is invalid.");
      }
      if (data.subscription && typeof data.subscription === "object" && !Array.isArray(data.subscription)) {
        const subscription = data.subscription as Record<string, unknown>;
        if (subscription.adminEmails !== undefined &&
          (!Array.isArray(subscription.adminEmails) || subscription.adminEmails.length > 10 ||
            !subscription.adminEmails.every(validEmail))) {
          fail("Subscription administrator data is invalid.");
        }
      }
    }
    if (requestedEntity === "team") {
      if (typeof data.name !== "string" || data.name.length < 1 || data.name.length > 80 ||
        (data.adminEmails !== undefined &&
          (!Array.isArray(data.adminEmails) || data.adminEmails.length > 10 ||
            !data.adminEmails.every(validEmail)))) {
        fail("Team data is invalid or exceeds its limits.");
      }
      for (const emailField of ["coachEmail", "adminEmail"]) {
        const value = data[emailField];
        if (value !== undefined && value !== "" && !validEmail(value)) {
          fail(`${emailField} is invalid.`);
        }
      }
      if (typeof data.leagueId !== "string" ||
        (data.shortcode !== undefined && (typeof data.shortcode !== "string" || data.shortcode.length > 6)) ||
        (data.visibility !== undefined && !["public", "private"].includes(String(data.visibility))) ||
        (data.primaryColor !== undefined &&
          (typeof data.primaryColor !== "string" || !/^#[0-9a-f]{6}$/i.test(data.primaryColor))) ||
        (data.isStandalone !== undefined && typeof data.isStandalone !== "boolean") ||
        (data.subscription !== undefined &&
          (!data.subscription || typeof data.subscription !== "object" || Array.isArray(data.subscription)))) {
        fail("Team settings are invalid or exceed their limits.");
      }
    }
    if (requestedEntity === "player" && (typeof data.playerName !== "string" || typeof data.teamId !== "string")) {
      fail("A player name and team ID are required.");
    }
    if (requestedEntity === "player" &&
      (typeof data.playerName !== "string" || data.playerName.length < 1 || data.playerName.length > 100 ||
        (data.email !== undefined && data.email !== "" && !validEmail(data.email)) ||
        (data.emails !== undefined &&
          (!Array.isArray(data.emails) || data.emails.length > 10 ||
            !data.emails.every(validEmail))) ||
        (data.positions !== undefined && (!Array.isArray(data.positions) || data.positions.length < 1 ||
          data.positions.length > 10 || !data.positions.every((position) => typeof position === "string" && position.trim().length > 0 && position.length <= 20))) ||
        (typeof data.number === "string" && data.number.length > 4))) {
      fail("Player data is invalid or exceeds its limits.");
    }
    if (requestedEntity === "player" && data.teamId === "" && !validEmail(data.email)) {
      fail("A valid email is required for free-agent registration.");
    }
    if (requestedEntity === "assign_player" &&
      (typeof data.playerId !== "string" || typeof data.teamId !== "string" || !data.teamId)) {
      fail("A player ID and destination team are required.");
    }
    if (requestedEntity === "match" && data.leagueId !== undefined && typeof data.leagueId !== "string") {
      fail("A league ID must be a string.");
    }
    if (requestedEntity === "match" &&
      ((typeof data.homeTeamName === "string" && data.homeTeamName.length > 100) ||
        (typeof data.awayTeamName === "string" && data.awayTeamName.length > 100) ||
        (typeof data.location === "string" && data.location.length > 200) ||
        (Array.isArray(data.subs) && data.subs.length > 100))) {
      fail("Match data exceeds its limits.");
    }
    if ((requestedEntity === "play" || requestedEntity === "play_batch" || requestedEntity === "red_play") &&
      typeof data.matchId !== "string") {
      fail("A match ID is required.");
    }
    const batch = requestedEntity === "play_batch" ? data.plays : null;
    if (requestedEntity === "play_batch" &&
      (!Array.isArray(batch) || batch.length === 0 || batch.length > MAX_ARRAY_ITEMS ||
        batch.some((play) => !play || typeof play !== "object" || Array.isArray(play)))) {
      fail("A play batch must contain between one and 100 play records.");
    }
    const writeUnits = requestedEntity === "play_batch" ? (batch as unknown[]).length : 1;

    let createdId = "";

    await adminDb.runTransaction(async (transaction) => {
      let assignmentRef: FirebaseFirestore.DocumentReference | null = null;
      let leagueTeams: FirebaseFirestore.QueryDocumentSnapshot[] = [];
      if (requestedEntity === "assign_player") {
        if (!isDocumentId(data.playerId) || !isDocumentId(data.teamId)) {
          fail("Player and destination team IDs are invalid.");
        }
        assignmentRef = adminDb.doc(`players/${String(data.playerId)}`);
        const player = await transaction.get(assignmentRef);
        const playerData = player.data();
        if (!playerData) fail("The player was not found.", 404);
        const team = await transaction.get(adminDb.doc(`teams/${String(data.teamId)}`));
        const teamData = team.data();
        if (!teamData) fail("The destination team was not found.", 404);
        const playerLeagueId = typeof playerData.leagueId === "string"
          ? playerData.leagueId
          : teamData.leagueId;
        if (!playerLeagueId || !(await isLeagueAdmin(transaction, String(playerLeagueId), token))) {
          fail("Only the league administrator can assign this player.", 403);
        }
        if (typeof playerData.teamId === "string" && playerData.teamId) {
          const sourceTeam = await transaction.get(adminDb.doc(`teams/${playerData.teamId}`));
          if (sourceTeam.data()?.leagueId !== playerLeagueId) {
            fail("The player and destination team must belong to the same league.", 400);
          }
        }
        if (!playerLeagueId || teamData.leagueId !== playerLeagueId) {
          fail("The player and destination team must belong to the same league.", 400);
        }
        data.leagueId = playerLeagueId;
      } else {
        await authorizeWrite(transaction, requestedEntity, data, token);
        if (requestedEntity === "delete_league") {
          const teams = await transaction.get(
            adminDb.collection("teams").where("leagueId", "==", data.leagueId).limit(65),
          );
          if (teams.size > 64) fail("The league exceeds the supported team limit.", 409);
          leagueTeams = teams.docs;
        }
      }
      if (ARCHIVE_GUARDED_ENTITIES.has(requestedEntity) &&
        typeof data.leagueId === "string" && isDocumentId(data.leagueId)) {
        const league = await transaction.get(adminDb.doc(`leagues/${data.leagueId}`));
        if (isArchivedLeagueData(league.data())) {
          fail("This league is archived and read-only. Reactivate it to make changes.", 409);
        }
      }
      const archiveTeamId = typeof data.managingTeamId === "string" && data.managingTeamId
        ? data.managingTeamId
        : data.teamId;
      if (TEAM_ARCHIVE_GUARDED_ENTITIES.has(requestedEntity) && !data.leagueId &&
        typeof archiveTeamId === "string" && isDocumentId(archiveTeamId)) {
        const team = await transaction.get(adminDb.doc(`teams/${archiveTeamId}`));
        if (isArchivedLeagueData(team.data())) {
          fail("This team's season is archived and read-only. Reopen the season to make changes.", 409);
        }
      }
      const scopes = resolveScopes(requestedEntity, data, token);
      const now = Date.now();
      const rateRef = adminDb.doc(`user_write_limits/${token.uid}`);
      const scopeRefs = scopes.map((scope) =>
        adminDb.doc(`write_counters/${getCounterId(scope)}`)
      );
      const refs = [rateRef, ...scopeRefs];
      const snapshots = await transaction.getAll(...refs);
      const rateSnapshot = snapshots[0];
      const rate = rateSnapshot.data() || {};
      const minuteStart = typeof rate.minuteStart === "number" ? rate.minuteStart : 0;
      const hourStart = typeof rate.hourStart === "number" ? rate.hourStart : 0;
      const minuteCount = now - minuteStart < 60_000 ? Number(rate.minuteCount || 0) : 0;
      const hourCount = now - hourStart < 3_600_000 ? Number(rate.hourCount || 0) : 0;
      if (!isPlatformAdmin(token) &&
        (minuteCount + writeUnits > PER_MINUTE_WRITE_LIMIT || hourCount + writeUnits > PER_HOUR_WRITE_LIMIT)) {
        fail("Write rate limit reached. Please wait before trying again.", 429);
      }

      const quotaUpdates: Array<{ ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown> }> = [];
      for (let index = 0; index < scopes.length; index += 1) {
        const scope = scopes[index];
        const scopeSnapshot = snapshots[index + 1];
        let createdCount = Number(scopeSnapshot.get("createdCount") || 0);
        if (!scopeSnapshot.exists) {
          const existingRecords = await transaction.get(getCountQuery(scope));
          createdCount = existingRecords.size;
        }
        if (createdCount + writeUnits > scope.limit) {
          fail(`This ${scope.kind} limit of ${scope.limit} has been reached.`, 409);
        }
        quotaUpdates.push({
          ref: scopeRefs[index],
          data: {
            createdCount: createdCount + writeUnits,
            limit: scope.limit,
            updatedAt: FieldValue.serverTimestamp(),
          },
        });
      }

      const updatedRate = {
        minuteStart: now - minuteStart >= 60_000 ? now : minuteStart,
        minuteCount: minuteCount + writeUnits,
        hourStart: now - hourStart >= 3_600_000 ? now : hourStart,
        hourCount: hourCount + writeUnits,
        updatedAt: FieldValue.serverTimestamp(),
      };
      for (const quota of quotaUpdates) transaction.set(quota.ref, quota.data);
      transaction.set(rateRef, updatedRate);

      if (requestedEntity === "depth_chart") {
        const ref = adminDb.doc(`team_depth_charts/${String(data.teamId)}`);
        transaction.set(ref, { charts: data.charts, visibleToPlayers: data.visibleToPlayers, updatedAt: FieldValue.serverTimestamp() });
        createdId = ref.id;
      } else if (requestedEntity === "playbook") {
        const teamId = String(data.teamId);
        const playbookRef = adminDb.doc(`teams/${teamId}/meta/playbook`);
        transaction.set(playbookRef, {
          playbooks: data.playbooks,
          updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date(now).toISOString(),
        });
        createdId = playbookRef.id;
      } else if (requestedEntity === "play_batch") {
        const recordsRef = adminDb.collection("plays");
        for (const play of batch as Record<string, unknown>[]) {
          const recordRef = recordsRef.doc();
          transaction.create(recordRef, {
            ...play,
            matchId: data.matchId,
            leagueId: data.leagueId,
            isHidden: data.isHidden === true,
            managingTeamId: data.managingTeamId,
            timestamp: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
          });
        }
        createdId = `batch_${writeUnits}`;
      } else if (requestedEntity === "assign_player" && assignmentRef) {
        transaction.update(assignmentRef, {
          teamId: data.teamId,
          status: "Active",
          leagueId: data.leagueId,
        });
        transaction.set(adminDb.doc(`player_private/${String(data.playerId)}`), {
          teamId: data.teamId,
          leagueId: data.leagueId,
        }, { merge: true });
        createdId = String(data.playerId);
      } else if (requestedEntity === "team_private_update") {
        const teamId = String(data.teamId);
        transaction.set(adminDb.doc(`team_private/${teamId}`), {
          teamId,
          leagueId: data.leagueId,
          adminEmails: normalizedEmails(data.adminEmails),
          ...(data.coachEmail !== undefined ? { coachEmail: normalizeEmail(data.coachEmail as string) } : {}),
          ...(data.adminEmail !== undefined ? { adminEmail: normalizeEmail(data.adminEmail as string) } : {}),
        }, { merge: true });
        createdId = teamId;
      } else if (requestedEntity === "player_private_update") {
        const playerId = String(data.playerId);
        transaction.set(adminDb.doc(`player_private/${playerId}`), {
          playerId,
          teamId: data.teamId || "",
          leagueId: data.leagueId || "",
          ...(data.email !== undefined ? { email: normalizeEmail(data.email as string) } : {}),
          ...(data.emails !== undefined ? { emails: normalizedEmails(data.emails) } : {}),
        }, { merge: true });
        createdId = playerId;
      } else if (requestedEntity === "player_update") {
        const playerId = String(data.playerId);
        const publicFields = { ...data };
        delete publicFields.playerId;
        delete publicFields.email;
        delete publicFields.emails;
        delete publicFields.teamId;
        delete publicFields.leagueId;
        transaction.update(adminDb.doc(`players/${playerId}`), publicFields);
        transaction.set(adminDb.doc(`player_private/${playerId}`), {
          playerId,
          teamId: data.teamId || "",
          leagueId: data.leagueId || "",
          ...(data.email !== undefined ? { email: normalizeEmail(data.email as string) } : {}),
          ...(data.emails !== undefined ? { emails: normalizedEmails(data.emails) } : {}),
        }, { merge: true });
        createdId = playerId;
      } else if (requestedEntity === "league_private_update") {
        const leagueId = String(data.leagueId);
        transaction.set(adminDb.doc(`league_private/${leagueId}`), {
          leagueId,
          ...(data.adminEmails !== undefined ? { adminEmails: normalizedEmails(data.adminEmails) } : {}),
          ...(data.contactEmail !== undefined ? { contactEmail: normalizeEmail(data.contactEmail as string) } : {}),
        }, { merge: true });
        createdId = leagueId;
      } else if (requestedEntity === "league_update") {
        const leagueId = String(data.leagueId);
        const leagueRef = adminDb.doc(`leagues/${leagueId}`);
        const publicFields: Record<string, unknown> = { ...data };
        delete publicFields.leagueId;
        delete publicFields.adminEmails;
        delete publicFields.contactEmail;
        if (publicFields.subscription) {
          const subscription = { ...(publicFields.subscription as Record<string, unknown>) };
          delete subscription.adminEmails;
          publicFields.subscription = subscription;
        }
        if (publicFields.shortcode) publicFields.shortcode = String(publicFields.shortcode).toUpperCase();
        transaction.set(leagueRef, { ...publicFields, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        if (data.adminEmails !== undefined || data.contactEmail !== undefined) {
          transaction.set(adminDb.doc(`league_private/${leagueId}`), {
            leagueId,
            ...(data.adminEmails !== undefined ? { adminEmails: normalizedEmails(data.adminEmails) } : {}),
            ...(data.contactEmail !== undefined ? { contactEmail: normalizeEmail(data.contactEmail as string) } : {}),
          }, { merge: true });
        }
        createdId = leagueId;
      } else if (requestedEntity === "match_update") {
        const matchId = String(data.matchId);
        const update: Record<string, unknown> = {
          homeTeamId: data.homeTeamId,
          awayTeamId: data.awayTeamId,
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (data.homeTeamName !== undefined) update.homeTeamName = data.homeTeamName;
        if (data.awayTeamName !== undefined) update.awayTeamName = data.awayTeamName;
        if (data.manualMatchup !== undefined) update.manualMatchup = data.manualMatchup;
        transaction.update(adminDb.doc(`matches/${matchId}`), update);
        createdId = matchId;
      } else if (requestedEntity === "delete_player") {
        const playerId = String(data.playerId);
        transaction.delete(adminDb.doc(`players/${playerId}`));
        transaction.delete(adminDb.doc(`player_private/${playerId}`));
        createdId = playerId;
      } else if (requestedEntity === "delete_team") {
        const teamId = String(data.teamId);
        transaction.delete(adminDb.doc(`teams/${teamId}`));
        transaction.delete(adminDb.doc(`team_private/${teamId}`));
        createdId = teamId;
      } else if (requestedEntity === "delete_league") {
        const leagueId = String(data.leagueId);
        for (const team of leagueTeams) {
          transaction.update(team.ref, { leagueId: "" });
          transaction.set(adminDb.doc(`team_private/${team.id}`), { leagueId: "" }, { merge: true });
        }
        transaction.delete(adminDb.doc(`leagues/${leagueId}`));
        transaction.delete(adminDb.doc(`league_private/${leagueId}`));
        createdId = leagueId;
      } else {
        const recordCollection = getRecordCollection(requestedEntity);
        const recordRef = adminDb.collection(recordCollection).doc();
        const record = buildRecord(requestedEntity, data);
        transaction.create(recordRef, record);
        if (requestedEntity === "league") {
          transaction.create(adminDb.doc(`league_private/${recordRef.id}`), {
            leagueId: recordRef.id,
            ownerUid: data.ownerUid,
            adminEmails: normalizedEmails(data.adminEmails),
            subscriptionAdminEmails: Array.isArray((data.subscription as Record<string, unknown> | undefined)?.adminEmails)
              ? normalizedEmails((data.subscription as Record<string, unknown>).adminEmails)
              : [],
            ...(data.contactEmail !== undefined ? { contactEmail: normalizeEmail(data.contactEmail as string) } : {}),
          });
        } else if (requestedEntity === "team") {
          transaction.create(adminDb.doc(`team_private/${recordRef.id}`), {
            teamId: recordRef.id,
            leagueId: data.leagueId,
            adminEmails: normalizedEmails(data.adminEmails),
            ...(typeof data.coachEmail === "string" ? { coachEmail: normalizeEmail(data.coachEmail) } : {}),
            ...(typeof data.adminEmail === "string" ? { adminEmail: normalizeEmail(data.adminEmail) } : {}),
            ...(typeof data.email === "string" ? { email: normalizeEmail(data.email) } : {}),
          });
        } else if (requestedEntity === "player") {
          transaction.create(adminDb.doc(`player_private/${recordRef.id}`), {
            playerId: recordRef.id,
            teamId: data.teamId,
            leagueId: data.leagueId || "",
            email: normalizeEmail(data.email as string | undefined),
            emails: normalizedEmails(data.emails),
          });
        }
        createdId = recordRef.id;
      }
    });

    if (requestedEntity === "delete_team" && data.purge === true) {
      await purgeTeamData(String(data.teamId));
    }

    if (isPlatformAdmin(token) && AUDITED_ENTITIES.has(requestedEntity)) {
      await recordPlatformAudit(token, requestedEntity, data, createdId);
    }

    return Response.json({ id: createdId }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json({ error: "Payload exceeds the maximum allowed size." }, { status: 413 });
    }
    if (error instanceof RequestError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("Secure write failed:", error);
    return Response.json({ error: "Unable to save this record." }, { status: 500 });
  }
}
