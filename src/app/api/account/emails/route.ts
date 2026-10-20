import { DecodedIdToken } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { readLimitedRequestBody, RequestBodyTooLargeError } from "@/lib/limitedRequestBody";
import type { AccountEmail } from "@/lib/accountEmailTypes";
import { accountEmailKey } from "@/lib/accountEmailKey";

export const runtime = "nodejs";

class AccountError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function fail(message: string, status = 400): never {
  throw new AccountError(message, status);
}

async function verify(idToken: string, recent = false): Promise<DecodedIdToken> {
  let token: DecodedIdToken;
  try {
    token = await adminAuth.verifyIdToken(idToken, true);
  } catch {
    fail("Your session could not be verified. Sign in again.", 401);
  }
  if (!token.email || token.email_verified !== true) fail("Verify both email addresses before connecting them.", 403);
  if (recent && (typeof token.auth_time !== "number" || Date.now() / 1000 - token.auth_time > 300)) {
    fail("Sign in again to confirm ownership before changing connected emails.", 401);
  }
  const user = await adminAuth.getUser(token.uid);
  if (user.disabled || !user.emailVerified || user.email?.toLowerCase() !== token.email.toLowerCase()) {
    fail("This email or account has changed. Sign in again.", 401);
  }
  return token;
}

const member = (token: DecodedIdToken): AccountEmail => ({ uid: token.uid, email: token.email!.toLowerCase() });
const membershipRef = (uid: string) => adminDb.doc(`account_email_members/${uid}`);
const accountRef = (uid: string) => adminDb.doc(`account_email_connections/${uid}`);
const addressRef = (email: string) => adminDb.doc(`account_email_addresses/${accountEmailKey(email)}`);

export async function POST(request: Request) {
  try {
    const bearer = request.headers.get("authorization") || "";
    if (!bearer.startsWith("Bearer ")) fail("Sign in before continuing.", 401);
    const raw = await readLimitedRequestBody(request, 16_000);
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) fail("Invalid request.");
    const { action, proofToken, uid } = body as Record<string, unknown>;
    if (!["list", "resolve", "connect", "disconnect"].includes(String(action))) fail("Unsupported account action.");
    const token = await verify(bearer.slice(7), action !== "list");
    await adminDb.runTransaction(async (transaction) => {
      const ref = adminDb.doc(`account_email_limits/${token.uid}`);
      const snapshot = await transaction.get(ref);
      const previous = snapshot.data();
      const now = Date.now();
      const sameWindow = previous && now - previous.start < 60_000;
      const count = sameWindow ? previous.count : 0;
      if (count >= 30) fail("Too many account requests. Please wait a minute.", 429);
      transaction.set(ref, { start: sameWindow ? previous.start : now, count: count + 1 });
    });
    const mapping = await membershipRef(token.uid).get();
    const accountUid: string = mapping.get("accountUid") || token.uid;
    if (action === "resolve") {
      if (accountUid === token.uid) return Response.json({ data: { customToken: null } }, {
        headers: { "Cache-Control": "no-store" },
      });
      const account = await accountRef(accountUid).get();
      const emails: AccountEmail[] = account.get("emails") || [];
      if (!emails.some((entry) => entry.uid === token.uid && entry.email === token.email!.toLowerCase())) {
        fail("This email connection is no longer valid.", 409);
      }
      const primary = await adminAuth.getUser(accountUid);
      if (primary.disabled || !primary.emailVerified || !emails.some((entry) => entry.uid === primary.uid && entry.email === primary.email?.toLowerCase())) {
        fail("The connected account is unavailable. Contact its owner.", 409);
      }
      return Response.json({ data: { customToken: await adminAuth.createCustomToken(accountUid) } }, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (accountUid !== token.uid) fail("Sign in through FlagOS to manage the connected account.", 409);
    if (action === "list") {
      const account = await accountRef(accountUid).get();
      return Response.json({ data: { accountUid, emails: account.get("emails") || [member(token)] } }, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (action === "connect") {
      if (typeof proofToken !== "string") fail("Sign in to the additional email to prove ownership.");
      const proof = await verify(proofToken, true);
      if (proof.uid === token.uid || proof.email!.toLowerCase() === token.email!.toLowerCase()) fail("This email is already your account's primary email.", 409);
      await adminDb.runTransaction(async (transaction) => {
        const [primaryMapping, secondaryMapping, primary, secondary] = await transaction.getAll(
          membershipRef(token.uid), membershipRef(proof.uid), accountRef(token.uid), accountRef(proof.uid),
        );
        if ((primaryMapping.exists && primaryMapping.get("accountUid") !== token.uid) || secondaryMapping.exists || secondary.exists) {
          fail("That account already has email connections. Disconnect them before connecting it here.", 409);
        }
        const emails: AccountEmail[] = primary.get("emails") || [member(token)];
        if (emails.length >= 10) fail("An account may connect at most ten email addresses.");
        if (!emails.some((entry) => entry.uid === token.uid && entry.email === token.email!.toLowerCase())) {
          fail("The primary email changed. Contact support before changing connections.", 409);
        }
        transaction.set(accountRef(token.uid), { emails: [...emails, member(proof)], updatedAt: FieldValue.serverTimestamp() });
        transaction.set(membershipRef(token.uid), { accountUid: token.uid });
        transaction.set(membershipRef(proof.uid), { accountUid: token.uid });
        transaction.set(addressRef(token.email!), { accountUid: token.uid });
        transaction.set(addressRef(proof.email!), { accountUid: token.uid });
      });
    } else {
      if (typeof uid !== "string" || !uid || uid === token.uid) fail("Choose an additional email to disconnect.");
      await adminDb.runTransaction(async (transaction) => {
        const account = await transaction.get(accountRef(token.uid));
        const emails: AccountEmail[] = account.get("emails") || [];
        if (!emails.some((entry) => entry.uid === uid)) fail("This email is not connected to your account.", 404);
        const remaining = emails.filter((entry) => entry.uid !== uid);
        const removed = emails.find((entry) => entry.uid === uid)!;
        transaction.delete(membershipRef(uid));
        transaction.delete(addressRef(removed.email));
        if (remaining.length === 1) {
          transaction.delete(accountRef(token.uid));
          transaction.delete(membershipRef(token.uid));
          transaction.delete(addressRef(remaining[0].email));
        } else {
          transaction.set(accountRef(token.uid), { emails: remaining, updatedAt: FieldValue.serverTimestamp() });
        }
      });
      // Connected-email sessions run as the primary account; invalidate all of them on removal.
      await adminAuth.revokeRefreshTokens(token.uid);
    }
    return Response.json({ data: { success: true } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AccountError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
    if (error instanceof RequestBodyTooLargeError) return Response.json({ error: "Request exceeds the maximum allowed size." }, { status: 413 });
    console.error("Account email request failed:", error);
    return Response.json({ error: "Unable to update account emails. Reload account settings to check their current state." }, { status: 500 });
  }
}
