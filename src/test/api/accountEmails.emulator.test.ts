import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const enabled = process.env.FLAGOS_TEST_EMULATORS === "true";
const password = "Connected-emails-emulator-only-123!";
const ids: string[] = [];
let app: App;
let primaryToken: string;
let secondaryToken: string;
let accountUid: string;
let secondaryUid: string;

async function signIn(email: string) {
  const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-only", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  expect(response.status).toBe(200);
  return (await response.json()).idToken as string;
}

async function api(token: string, action: string, data: Record<string, unknown> = {}) {
  const response = await fetch("http://localhost:3000/api/account/emails", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...data }),
  });
  return { status: response.status, body: await response.json() };
}

describe.skipIf(!enabled)("connected emails against isolated Firebase emulators", () => {
  beforeAll(async () => {
    if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" ||
        process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099") throw new Error("Account linking tests require the isolated loopback emulators.");
    app = initializeApp({ projectId: "demo-flagos-local" }, `account-emails-${Date.now()}`);
    for (const label of ["primary", "secondary"]) {
      const user = await getAuth(app).createUser({ email: `email-link-${label}-${Date.now()}@example.com`, password, emailVerified: true });
      ids.push(user.uid);
      const token = await signIn(user.email!);
      if (label === "primary") { primaryToken = token; accountUid = user.uid; }
      else { secondaryToken = token; secondaryUid = user.uid; }
    }
  });

  afterAll(async () => {
    if (!app) return;
    const db = getFirestore(app);
    const accounts = await Promise.all(ids.map((uid) => db.doc(`account_email_connections/${uid}`).get()));
    for (const account of accounts) {
      for (const entry of account.get("emails") || []) {
        const { accountEmailKey } = await import("@/lib/accountEmailKey");
        await db.doc(`account_email_addresses/${accountEmailKey(entry.email)}`).delete();
      }
    }
    for (const uid of ids) {
      await Promise.all([
        db.doc(`account_email_connections/${uid}`).delete(),
        db.doc(`account_email_members/${uid}`).delete(),
        db.doc(`account_email_limits/${uid}`).delete(),
        getAuth(app).deleteUser(uid),
      ]);
    }
    await deleteApp(app);
  });

  it("connects two verified emails and signs the second email into the same primary UID", async () => {
    const connected = await api(primaryToken, "connect", { proofToken: secondaryToken });
    expect(connected.status, connected.body.error).toBe(200);
    const listed = await api(primaryToken, "list");
    expect(listed.body.data.emails).toHaveLength(2);
    const resolved = await api(secondaryToken, "resolve");
    expect(resolved.status, resolved.body.error).toBe(200);
    const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=emulator-only", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: resolved.body.data.customToken, returnSecureToken: true }),
    });
    expect(response.status).toBe(200);
    const session = await response.json();
    expect((await getAuth(app).verifyIdToken(session.idToken)).uid).toBe(accountUid);
    const settings = await api(session.idToken, "list");
    expect(settings.status, settings.body.error).toBe(200);
    expect(settings.body.data.accountUid).toBe(accountUid);
    expect(settings.body.data.emails.map((entry: { uid: string }) => entry.uid)).toContain(secondaryUid);
  });

  it("prevents direct client reads or writes of account connection records", async () => {
    const url = `http://127.0.0.1:8080/v1/projects/demo-flagos-local/databases/(default)/documents/account_email_members/${secondaryUid}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${primaryToken}` } });
    expect(response.status).toBe(403);
    const write = await fetch(url, {
      method: "PATCH", headers: { Authorization: `Bearer ${primaryToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: { accountUid: { stringValue: "forged-primary" } } }),
    });
    expect(write.status).toBe(403);
  });

  it("disconnects an alias without deleting either underlying Auth account", async () => {
    const disconnected = await api(primaryToken, "disconnect", { uid: secondaryUid });
    expect(disconnected.status, disconnected.body.error).toBe(200);
    const result = await api(secondaryToken, "resolve");
    expect(result.body.data.customToken).toBeNull();
    expect((await getAuth(app).getUser(accountUid)).uid).toBe(accountUid);
    expect((await getAuth(app).getUser(secondaryUid)).uid).toBe(secondaryUid);
  });
});
