import { DecodedIdToken } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { readLimitedRequestBody, RequestBodyTooLargeError } from "@/lib/limitedRequestBody";
import { accountEmailKey } from "@/lib/accountEmailKey";
import { getDepthFormations } from "@/lib/depthChart";

export const runtime = "nodejs";

type PrivateAction = "lookup" | "team" | "league" | "admin_overview" | "depth_chart";

const PLATFORM_ADMIN_EMAIL = "dextersargent@gmail.com";
const MAX_REQUEST_BYTES = 8_000;
const MAX_READ_UNITS_PER_MINUTE = 2_000;
const ACTION_READ_UNITS: Record<PrivateAction, number> = {
  lookup: 250,
  team: 70,
  league: 3,
  admin_overview: 1_200,
  depth_chart: 350,
};

class RequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function fail(message: string, status = 400): never {
  throw new RequestError(message, status);
}

function normalizedEmail(token: DecodedIdToken): string {
  return typeof token.email === "string" ? token.email.trim().toLowerCase() : "";
}

function isPlatformAdmin(token: DecodedIdToken): boolean {
  return normalizedEmail(token) === PLATFORM_ADMIN_EMAIL;
}

function isLeagueAdmin(data: FirebaseFirestore.DocumentData, token: DecodedIdToken): boolean {
  const email = normalizedEmail(token);
  return isPlatformAdmin(token) ||
    data.ownerUid === token.uid ||
    (Array.isArray(data.adminEmails) && data.adminEmails.includes(email)) ||
    (Array.isArray(data.subscriptionAdminEmails) && data.subscriptionAdminEmails.includes(email));
}

function isTeamAdmin(data: FirebaseFirestore.DocumentData, token: DecodedIdToken): boolean {
  const email = normalizedEmail(token);
  return isPlatformAdmin(token) ||
    (Array.isArray(data.adminEmails) && data.adminEmails.includes(email)) ||
    data.coachEmail === email ||
    data.adminEmail === email ||
    data.email === email;
}

function parsePayload(value: unknown): { action: PrivateAction; data: Record<string, unknown> } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("Invalid request.");
  }
  const payload = value as Record<string, unknown>;
  const action = payload.action;
  // Filterless actions accept an omitted data object for client compatibility.
  const data = payload.data === undefined && (action === "lookup" || action === "admin_overview")
    ? {}
    : payload.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    fail("Request data is required.");
  }
  if (!["lookup", "team", "league", "admin_overview", "depth_chart"].includes(String(action))) {
    fail("Unsupported private-data request.");
  }
  return { action: action as PrivateAction, data: data as Record<string, unknown> };
}

async function enforceReadLimit(uid: string, action: PrivateAction): Promise<void> {
  const ref = adminDb.doc(`user_private_read_limits/${uid}`);
  await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const now = Date.now();
    const start = Number(snapshot.get("minuteStart") || 0);
    const units = now - start < 60_000 && snapshot.exists
      ? Number(snapshot.get("minuteUnits") || 0)
      : 0;
    const requestUnits = ACTION_READ_UNITS[action];
    if (units + requestUnits > MAX_READ_UNITS_PER_MINUTE) {
      fail("Private-data request limit reached. Please wait.", 429);
    }
    transaction.set(ref, {
      minuteStart: now - start >= 60_000 ? now : start,
      minuteUnits: units + requestUnits,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

async function lookupByEmail(token: DecodedIdToken) {
  const email = normalizedEmail(token);
  if (!email) return { teams: [], players: [] };
  const [
    teamByAdmins, teamByCoach, teamByAdmin, teamByEmail,
    playersByEmail, playersByEmails,
    legacyTeamByAdmins, legacyTeamByCoach, legacyTeamByAdmin, legacyTeamByEmail,
    legacyPlayersByEmail, legacyPlayersByEmails,
  ] = await Promise.all([
      adminDb.collection("team_private").where("adminEmails", "array-contains", email).limit(10).get(),
      adminDb.collection("team_private").where("coachEmail", "==", email).limit(10).get(),
      adminDb.collection("team_private").where("adminEmail", "==", email).limit(10).get(),
      adminDb.collection("team_private").where("email", "==", email).limit(10).get(),
      adminDb.collection("player_private").where("email", "==", email).limit(10).get(),
      adminDb.collection("player_private").where("emails", "array-contains", email).limit(10).get(),
      adminDb.collection("teams").where("adminEmails", "array-contains", email).limit(10).get(),
      adminDb.collection("teams").where("coachEmail", "==", email).limit(10).get(),
      adminDb.collection("teams").where("adminEmail", "==", email).limit(10).get(),
      adminDb.collection("teams").where("email", "==", email).limit(10).get(),
      adminDb.collection("players").where("email", "==", email).limit(10).get(),
      adminDb.collection("players").where("emails", "array-contains", email).limit(10).get(),
  ]);
  const teamPrivate = new Map(
    [...teamByAdmins.docs, ...teamByCoach.docs, ...teamByAdmin.docs, ...teamByEmail.docs]
      .map((snapshot) => [snapshot.id, snapshot.data()] as const),
  );
  const legacyTeams = new Map(
    [...legacyTeamByAdmins.docs, ...legacyTeamByCoach.docs, ...legacyTeamByAdmin.docs, ...legacyTeamByEmail.docs]
      .map((snapshot) => [snapshot.id, snapshot.data()] as const),
  );
  const playerPrivate = new Map(
    [...playersByEmail.docs, ...playersByEmails.docs]
      .map((snapshot) => [snapshot.id, snapshot.data()] as const),
  );
  const legacyPlayers = new Map(
    [...legacyPlayersByEmail.docs, ...legacyPlayersByEmails.docs]
      .map((snapshot) => [snapshot.id, snapshot.data()] as const),
  );
  for (const [id, data] of legacyTeams) {
    if (!teamPrivate.has(id)) teamPrivate.set(id, data);
  }
  for (const [id, data] of legacyPlayers) {
    if (!playerPrivate.has(id)) playerPrivate.set(id, data);
  }
  const [teamDocs, playerDocs] = await Promise.all([
    teamPrivate.size
      ? adminDb.getAll(...[...teamPrivate.keys()].map((id) => adminDb.doc(`teams/${id}`)))
      : [],
    playerPrivate.size
      ? adminDb.getAll(...[...playerPrivate.keys()].map((id) => adminDb.doc(`players/${id}`)))
      : [],
  ]);

  const teams = teamDocs
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => ({ id: snapshot.id, name: snapshot.get("name") || snapshot.get("teamName") || "" }));
  return {
    teams,
    players: playerDocs
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => {
        const privateData = playerPrivate.get(snapshot.id) || {};
        return {
          id: snapshot.id,
          ...snapshot.data(),
          teamId: snapshot.get("teamId"),
          email: privateData.email || "",
          emails: Array.isArray(privateData.emails) ? privateData.emails : [],
        };
      }),
  };
}

async function getDepthChart(teamId: string, token: DecodedIdToken) {
  if (!/^[^/]{1,128}$/.test(teamId)) fail("A valid team ID is required.");
  const [team, privateTeam, depth, playbook] = await Promise.all([
    adminDb.doc(`teams/${teamId}`).get(),
    adminDb.doc(`team_private/${teamId}`).get(),
    adminDb.doc(`team_depth_charts/${teamId}`).get(),
    adminDb.doc(`teams/${teamId}/meta/playbook`).get(),
  ]);
  if (!team.exists) fail("The team was not found.", 404);
  const canEdit = isTeamAdmin(team.data() || {}, token) || isTeamAdmin(privateTeam.data() || {}, token);
  const state = depth.data() || { charts: [], visibleToPlayers: false };
  if (!canEdit) {
    if (state.visibleToPlayers !== true) return { charts: [], visibleToPlayers: false, formations: [], canEdit: false };
    const membership = await lookupByEmail(token);
    if (!membership.players.some((player) => player.teamId === teamId)) fail("Only rostered team players can view published depth charts.", 403);
  }
  return {
    charts: state.charts || [],
    visibleToPlayers: state.visibleToPlayers === true,
    formations: getDepthFormations(playbook.data()?.playbooks || []),
    canEdit,
  };
}

async function getTeamPrivate(teamId: string, token: DecodedIdToken) {
  if (!teamId || teamId.length > 128) fail("A valid team ID is required.");
  const teamRef = adminDb.doc(`teams/${teamId}`);
  const teamPrivateRef = adminDb.doc(`team_private/${teamId}`);
  const [team, privateTeam] = await Promise.all([teamRef.get(), teamPrivateRef.get()]);
  if (!team.exists) fail("The team was not found.", 404);
  const publicData = team.data() || {};
  const privateData = privateTeam.data() || {};
  const leagueId = typeof publicData.leagueId === "string" ? publicData.leagueId : "";
  const leaguePrivate = leagueId ? await adminDb.doc(`league_private/${leagueId}`).get() : null;
  const leaguePublic = leagueId ? await adminDb.doc(`leagues/${leagueId}`).get() : null;
  if (!isPlatformAdmin(token) &&
    !isTeamAdmin(privateData, token) &&
    !isTeamAdmin(publicData, token) &&
    !(leaguePrivate?.exists && isLeagueAdmin(leaguePrivate.data() || {}, token)) &&
    !(leaguePublic?.exists && isLeagueAdmin(leaguePublic.data() || {}, token))) {
    fail("You do not have permission to access this team's private data.", 403);
  }
  const [players, legacyPlayers] = await Promise.all([
    adminDb.collection("player_private")
    .where("teamId", "==", teamId)
    .limit(31)
    .get(),
    adminDb.collection("players")
      .where("teamId", "==", teamId)
      .limit(31)
      .get(),
  ]);
  const playerPrivate = new Map(
    [...players.docs, ...legacyPlayers.docs]
      .map((snapshot) => [snapshot.id, snapshot.data()] as const),
  );
  if (playerPrivate.size > 30) fail("The team roster exceeds the supported limit.", 409);
  const storedAdminEmails = privateData.adminEmails || publicData.adminEmails || [];
  const adminEmails: string[] = [...new Set<string>(Array.isArray(storedAdminEmails) ? storedAdminEmails : [])];
  const adminAccountIds: Record<string, string> = {};
  if (adminEmails.length) {
    const connections = await adminDb.getAll(...adminEmails.map((email) =>
      adminDb.doc(`account_email_addresses/${accountEmailKey(email)}`)));
    connections.forEach((connection, index) => {
      if (connection.exists && typeof connection.get("accountUid") === "string") {
        adminAccountIds[adminEmails[index]] = connection.get("accountUid");
      }
    });
  }
  return {
    team: {
      adminEmails,
      adminAccountIds,
      coachEmail: privateData.coachEmail || publicData.coachEmail || "",
      adminEmail: privateData.adminEmail || publicData.adminEmail || "",
      email: privateData.email || publicData.email || "",
    },
    players: Object.fromEntries([...playerPrivate].map(([playerId, data]) => {
      return [playerId, {
        email: data.email || "",
        emails: Array.isArray(data.emails) ? data.emails : [],
      }];
    })),
  };
}

async function getLeaguePrivate(leagueId: string, token: DecodedIdToken) {
  if (!leagueId || leagueId.length > 128) fail("A valid league ID is required.");
  const [privateLeague, publicLeague] = await Promise.all([
    adminDb.doc(`league_private/${leagueId}`).get(),
    adminDb.doc(`leagues/${leagueId}`).get(),
  ]);
  if (!publicLeague.exists) fail("The league was not found.", 404);
  const privateData = privateLeague.data() || {};
  const publicData = publicLeague.data() || {};
  if (!isPlatformAdmin(token) &&
    !isLeagueAdmin(privateData, token) &&
    !isLeagueAdmin(publicData, token)) {
    fail("You do not have permission to access this league's private data.", 403);
  }
  return {
    adminEmails: privateData.adminEmails || publicData.adminEmails || [],
    subscriptionAdminEmails: privateData.subscriptionAdminEmails ||
      publicData.subscription?.adminEmails || [],
    contactEmail: privateData.contactEmail || publicData.contactEmail || "",
  };
}

async function getAdminOverview(token: DecodedIdToken) {
  if (!isPlatformAdmin(token)) fail("Platform administrator access is required.", 403);
  const empty = { docs: [] as FirebaseFirestore.QueryDocumentSnapshot[] };
  const settled = await Promise.allSettled([
    adminDb.collection("league_private").limit(100).get(),
    adminDb.collection("team_private").limit(300).get(),
    adminDb.collection("leagues").limit(100).get(),
    adminDb.collection("teams").limit(300).get(),
  ]);
  settled.forEach((entry, index) => {
    if (entry.status === "rejected") console.error(`Admin overview query ${index} failed:`, entry.reason);
  });
  // Public collections are required; private collections degrade gracefully.
  if (settled[2].status === "rejected") throw settled[2].reason;
  if (settled[3].status === "rejected") throw settled[3].reason;
  const leagues = settled[0].status === "fulfilled" ? settled[0].value : empty;
  const teams = settled[1].status === "fulfilled" ? settled[1].value : empty;
  const publicLeagues = settled[2].value;
  const publicTeams = settled[3].value;
  const leagueData = new Map(leagues.docs.map((snapshot) => [snapshot.id, snapshot.data()]));
  for (const snapshot of publicLeagues.docs) {
    if (leagueData.has(snapshot.id)) continue;
    const data = snapshot.data();
    leagueData.set(snapshot.id, {
      leagueId: snapshot.id,
      ownerUid: data.ownerUid || "",
      adminEmails: data.adminEmails || [],
      subscriptionAdminEmails: data.subscription?.adminEmails || [],
      contactEmail: data.contactEmail || "",
    });
  }
  const teamData = new Map(teams.docs.map((snapshot) => [snapshot.id, snapshot.data()]));
  for (const snapshot of publicTeams.docs) {
    if (teamData.has(snapshot.id)) continue;
    const data = snapshot.data();
    teamData.set(snapshot.id, {
      teamId: snapshot.id,
      leagueId: data.leagueId || "",
      adminEmails: data.adminEmails || [],
      coachEmail: data.coachEmail || "",
      adminEmail: data.adminEmail || "",
      email: data.email || "",
    });
  }
  return {
    leagues: Object.fromEntries(leagueData),
    teams: Object.fromEntries(teamData),
    records: {
      leagues: publicLeagues.docs.map((snapshot) => ({ ...snapshot.data(), id: snapshot.id })),
      teams: publicTeams.docs.map((snapshot) => ({ ...snapshot.data(), id: snapshot.id })),
    },
  };
}

export async function POST(request: Request) {
  try {
    const rawBody = await readLimitedRequestBody(request, MAX_REQUEST_BYTES);
    const authorization = request.headers.get("authorization") || "";
    const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!idToken) return Response.json({ error: "Authentication is required." }, { status: 401 });
    let token: DecodedIdToken;
    try {
      token = await adminAuth.verifyIdToken(idToken, true);
    } catch (authError) {
      console.error("ID token verification failed:", authError);
      return Response.json({ error: "Your session could not be verified. Sign in again." }, { status: 401 });
    }
    if (token.email_verified !== true) {
      return Response.json({ error: "Verify your email before accessing private data." }, { status: 403 });
    }
    const { action, data } = parsePayload(JSON.parse(rawBody) as unknown);
    try {
      // The platform admin's own overview/refresh must never be throttled by the per-user budget.
      if (!isPlatformAdmin(token)) await enforceReadLimit(token.uid, action);
    } catch (limitError) {
      if (limitError instanceof RequestError || !isPlatformAdmin(token)) throw limitError;
      console.error("Read-limit bookkeeping failed for platform admin:", limitError);
    }
    let result: unknown;
    if (action === "lookup") {
      if (Object.keys(data).length) fail("Lookup does not accept caller-supplied filters.");
      result = await lookupByEmail(token);
    } else if (action === "team") {
      result = await getTeamPrivate(String(data.teamId || ""), token);
    } else if (action === "league") {
      result = await getLeaguePrivate(String(data.leagueId || ""), token);
    } else if (action === "depth_chart") {
      result = await getDepthChart(String(data.teamId || ""), token);
    } else {
      if (Object.keys(data).length) fail("The admin overview does not accept caller-supplied filters.");
      result = await getAdminOverview(token);
    }
    return Response.json({ data: result }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json({ error: "Request exceeds the maximum allowed size." }, { status: 413 });
    }
    if (error instanceof RequestError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    console.error("Private-data request failed:", error);
    return Response.json({ error: "Unable to load private data." }, { status: 500 });
  }
}
