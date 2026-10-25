import { createHash, randomBytes } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { readLimitedRequestBody, RequestBodyTooLargeError } from "@/lib/limitedRequestBody";
import { isPlatformAdminEmail } from "@/lib/platformAdmin";
import { listHasAccountEmail, loadAccountEmails } from "@/lib/accountEmailsServer";
import {
  DEFAULT_SCORER_LINK_HOURS, MAX_SCORER_LINK_HOURS, SCORER_GRANTS_COLLECTION, SCORER_INVITES_COLLECTION,
  SCORER_LEAGUE_ACCESS_COLLECTION, scorerGrantDocId, scorerLeagueAccessDocId, scorerLinkPath, timestampMillis,
} from "@/lib/scorerAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2_000;
const MAX_ACTIVE_LINKS_PER_GAME = 10;
const noStore = { "Cache-Control": "no-store" };

class RequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function fail(message: string, status = 400): never {
  throw new RequestError(message, status);
}

function isDocumentId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function loadLeagueGame(matchId: unknown) {
  if (!isDocumentId(matchId)) fail("A valid game ID is required.");
  const match = await adminDb.doc(`matches/${matchId}`).get();
  const data = match.data();
  if (!data) fail("The game was not found.", 404);
  const leagueId = typeof data.leagueId === "string" ? data.leagueId : "";
  if (!leagueId || data.isStandalone === true || data.isIndependent === true) {
    fail("Scorer links are only available for league games.");
  }
  return { matchId, leagueId, data };
}

async function assertLeagueAdmin(leagueId: string, token: DecodedIdToken): Promise<void> {
  if (isPlatformAdminEmail(token.email)) return;
  const [privateLeague, league] = await adminDb.getAll(
    adminDb.doc(`league_private/${leagueId}`),
    adminDb.doc(`leagues/${leagueId}`),
  );
  const allowed = [privateLeague.data(), league.data()].some((data) => !!data && (
    data.ownerUid === token.uid ||
    listHasAccountEmail(token, data.adminEmails) ||
    listHasAccountEmail(token, data.subscriptionAdminEmails)
  ));
  if (!allowed) fail("Only a league admin can manage scorer links.", 403);
}

async function createLink(token: DecodedIdToken, body: Record<string, unknown>) {
  const { matchId, leagueId, data } = await loadLeagueGame(body.matchId);
  await assertLeagueAdmin(leagueId, token);
  if (data.status === "completed") fail("This game is already final.");
  const hours = body.hours === undefined ? DEFAULT_SCORER_LINK_HOURS : Number(body.hours);
  if (!Number.isInteger(hours) || hours < 1 || hours > MAX_SCORER_LINK_HOURS) {
    fail(`Choose between 1 and ${MAX_SCORER_LINK_HOURS} hours.`);
  }
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 60) : "";
  const active = await adminDb.collection(SCORER_INVITES_COLLECTION)
    .where("matchId", "==", matchId).where("revoked", "==", false).limit(50).get();
  const now = Date.now();
  if (active.docs.filter((doc) => timestampMillis(doc.get("expiresAt")) > now).length >= MAX_ACTIVE_LINKS_PER_GAME) {
    fail("This game already has the maximum number of active scorer links. Revoke some first.", 409);
  }
  const secret = randomBytes(24).toString("base64url");
  const expiresAt = Timestamp.fromMillis(now + hours * 3_600_000);
  await adminDb.doc(`${SCORER_INVITES_COLLECTION}/${hashToken(secret)}`).create({
    matchId, leagueId, label, expiresAt, revoked: false, redeemedByUid: "",
    createdByUid: token.uid, createdAt: FieldValue.serverTimestamp(),
  });
  return { path: scorerLinkPath(matchId, secret), expiresAt: expiresAt.toMillis(), label };
}

async function redeemLink(token: DecodedIdToken, body: Record<string, unknown>) {
  const secret = typeof body.token === "string" ? body.token : "";
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(secret)) fail("This scorer link is not valid.", 404);
  const inviteRef = adminDb.doc(`${SCORER_INVITES_COLLECTION}/${hashToken(secret)}`);
  return adminDb.runTransaction(async (transaction) => {
    const invite = await transaction.get(inviteRef);
    const data = invite.data();
    if (!data) fail("This scorer link is not valid.", 404);
    const leagueAccessRef = adminDb.doc(`${SCORER_LEAGUE_ACCESS_COLLECTION}/${scorerLeagueAccessDocId(data.leagueId, token.uid)}`);
    const leagueAccess = await transaction.get(leagueAccessRef);
    if (data.matchId !== body.matchId) fail("This scorer link is for a different game.");
    if (data.revoked === true) fail("This scorer link was revoked by the league admin.", 410);
    if (timestampMillis(data.expiresAt) <= Date.now()) fail("This scorer link has expired. Ask the league admin for a new one.", 410);
    // Each link belongs to the first account that opens it.
    if (data.redeemedByUid && data.redeemedByUid !== token.uid) {
      fail("This scorer link has already been used by someone else. Ask the league admin for your own link.", 403);
    }
    transaction.update(inviteRef, {
      redeemedByUid: token.uid,
      redeemedByEmail: token.email || "",
      redeemedAt: data.redeemedAt || FieldValue.serverTimestamp(),
    });
    transaction.set(adminDb.doc(`${SCORER_GRANTS_COLLECTION}/${scorerGrantDocId(data.matchId, token.uid)}`), {
      matchId: data.matchId,
      leagueId: data.leagueId,
      uid: token.uid,
      inviteId: invite.id,
      expiresAt: data.expiresAt,
      grantedAt: FieldValue.serverTimestamp(),
    });
    // Lets the scorer read the league's teams and rosters (private leagues included) for as long as
    // their longest grant in that league lasts.
    if (timestampMillis(leagueAccess.get("expiresAt")) < timestampMillis(data.expiresAt)) {
      transaction.set(leagueAccessRef, { leagueId: data.leagueId, uid: token.uid, expiresAt: data.expiresAt });
    }
    return { matchId: data.matchId, expiresAt: timestampMillis(data.expiresAt) };
  });
}

/** Shrinks (or removes) a scorer's league read access to match the grants they still hold there. */
async function refreshScorerLeagueAccess(leagueId: string, uid: string) {
  const remaining = await adminDb.collection(SCORER_GRANTS_COLLECTION)
    .where("uid", "==", uid).where("leagueId", "==", leagueId).limit(100).get();
  const latest = remaining.docs.reduce((max, doc) => Math.max(max, timestampMillis(doc.get("expiresAt"))), 0);
  const ref = adminDb.doc(`${SCORER_LEAGUE_ACCESS_COLLECTION}/${scorerLeagueAccessDocId(leagueId, uid)}`);
  if (latest > Date.now()) {
    await ref.set({ leagueId, uid, expiresAt: Timestamp.fromMillis(latest) });
  } else {
    await ref.delete();
  }
}

async function listLinks(token: DecodedIdToken, body: Record<string, unknown>) {
  const { matchId, leagueId } = await loadLeagueGame(body.matchId);
  await assertLeagueAdmin(leagueId, token);
  const invites = await adminDb.collection(SCORER_INVITES_COLLECTION)
    .where("matchId", "==", matchId).where("revoked", "==", false).limit(50).get();
  const now = Date.now();
  return {
    links: invites.docs
      .filter((doc) => timestampMillis(doc.get("expiresAt")) > now)
      .map((doc) => ({
        id: doc.id.slice(0, 16),
        label: doc.get("label") || "",
        expiresAt: timestampMillis(doc.get("expiresAt")),
        redeemedByEmail: doc.get("redeemedByEmail") || "",
      }))
      .sort((a, b) => a.expiresAt - b.expiresAt),
  };
}

async function revokeLinks(token: DecodedIdToken, body: Record<string, unknown>) {
  const { matchId, leagueId } = await loadLeagueGame(body.matchId);
  await assertLeagueAdmin(leagueId, token);
  const linkId = typeof body.linkId === "string" ? body.linkId : "";
  if (linkId && !/^[a-f0-9]{16}$/.test(linkId)) fail("Invalid link.");
  const [invites, grants] = await Promise.all([
    adminDb.collection(SCORER_INVITES_COLLECTION).where("matchId", "==", matchId).where("revoked", "==", false).limit(100).get(),
    adminDb.collection(SCORER_GRANTS_COLLECTION).where("matchId", "==", matchId).limit(100).get(),
  ]);
  const targets = invites.docs.filter((doc) => !linkId || doc.id.startsWith(linkId));
  const targetIds = new Set(targets.map((doc) => doc.id));
  const batch = adminDb.batch();
  targets.forEach((doc) => batch.update(doc.ref, { revoked: true, revokedAt: FieldValue.serverTimestamp() }));
  grants.docs
    .filter((doc) => !linkId || targetIds.has(doc.get("inviteId")))
    .forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  const revokedGrantIds = new Set(grants.docs
    .filter((doc) => !linkId || targetIds.has(doc.get("inviteId")))
    .map((doc) => doc.id));
  const affectedUids = new Set(grants.docs.filter((doc) => revokedGrantIds.has(doc.id)).map((doc) => String(doc.get("uid") || "")));
  await Promise.all([...affectedUids].filter(Boolean).map((uid) => refreshScorerLeagueAccess(leagueId, uid)));
  return { revoked: targets.length };
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!idToken) fail("Sign in to continue.", 401);
    const token = await adminAuth.verifyIdToken(idToken, true);
    if (token.email_verified !== true) fail("Verify your email before continuing.", 403);
    await loadAccountEmails(token);

    let body: unknown;
    try {
      body = JSON.parse(await readLimitedRequestBody(request, MAX_BODY_BYTES));
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) fail("Request is too large.", 413);
      fail("Request body must be valid JSON.");
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) fail("Invalid request.");
    const data = body as Record<string, unknown>;
    const action = data.action;
    const result =
      action === "create" ? await createLink(token, data) :
      action === "redeem" ? await redeemLink(token, data) :
      action === "list" ? await listLinks(token, data) :
      action === "revoke" ? await revokeLinks(token, data) :
      fail("Unsupported action.");
    return Response.json({ data: result }, { headers: noStore });
  } catch (error) {
    if (error instanceof RequestError) {
      return Response.json({ error: error.message }, { status: error.status, headers: noStore });
    }
    console.error("Scorer access request failed:", error);
    return Response.json({ error: "Scorer access is unavailable right now." }, { status: 500, headers: noStore });
  }
}
