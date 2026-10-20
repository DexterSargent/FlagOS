import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initializeApp, deleteApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { YORK_ADMIN_EMAILS, YORK_TEAM_ID } from "@/lib/yorkStaff";
import { YORK_LIONS_TEAM, YORK_LIONS_PLAYERS, YORK_LIONS_MATCHES, YORK_LIONS_PLAYS } from "@/lib/yorkTeamData";

const enabled = process.env.FLAGOS_TEST_EMULATORS === "true";
const baseUrl = "http://localhost:3000";
const projectId = "demo-flagos-local";
const password = "York-emulator-test-only-123!";
const tokens = new Map<string, string>();
const createdUsers: string[] = [];
const createdRecords: string[] = [];
let app: App;

async function api(email: string, path: "write" | "private", body: Record<string, unknown>) {
  const response = await fetch(`${baseUrl}/api/security/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokens.get(email)}` },
    body: JSON.stringify({ data: {}, ...body }),
  });
  return { status: response.status, body: await response.json() };
}

describe.skipIf(!enabled)("York full functionality against local Firebase emulators", () => {
  beforeAll(async () => {
    if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099") {
      throw new Error("York functionality tests require the isolated local emulators.");
    }
    app = initializeApp({ projectId }, `york-functionality-${Date.now()}`);
    const db = getFirestore(app);
    const batch = db.batch();
    const { adminEmails: _admins, coachEmail: _email, ...publicTeam } = YORK_LIONS_TEAM;
    batch.set(db.doc(`teams/${YORK_TEAM_ID}`), { ...publicTeam, leagueId: "", visibility: "public" });
    batch.set(db.doc(`team_private/${YORK_TEAM_ID}`), {
      leagueId: "", adminEmails: YORK_ADMIN_EMAILS, coachEmail: YORK_ADMIN_EMAILS[0],
    });
    for (const player of YORK_LIONS_PLAYERS) {
      const { email, emails, ...publicPlayer } = player;
      batch.set(db.doc(`players/${player.id}`), { ...publicPlayer, leagueId: "" });
      batch.set(db.doc(`player_private/${player.id}`), { teamId: YORK_TEAM_ID, email, emails, leagueId: "" });
    }
    for (const match of YORK_LIONS_MATCHES) batch.set(db.doc(`matches/${match.id}`), { ...match, leagueId: "", isHidden: false });
    for (const play of YORK_LIONS_PLAYS) batch.set(db.doc(`plays/${play.id}`), { ...play, leagueId: "", isHidden: false });
    await batch.commit();
    for (const [index, email] of [...YORK_ADMIN_EMAILS, "unrelated@example.com"].entries()) {
      const uid = `york_functionality_${index}`;
      await getAuth(app).createUser({ uid, email, password, emailVerified: true });
      createdUsers.push(uid);
      const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-only", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      });
      expect(response.status).toBe(200);
      const result = await response.json();
      tokens.set(email, result.idToken);
    }
  }, 30_000);

  afterAll(async () => {
    if (!app) return;
    await Promise.all(createdUsers.map((uid) => getAuth(app).deleteUser(uid)));
    await Promise.all(createdRecords.map((path) => getFirestore(app).doc(path).delete()));
    await deleteApp(app);
  });

  it.each(YORK_ADMIN_EMAILS)("recognizes %s as York coaching staff in the authenticated API", async (email) => {
    const result = await api(email, "private", { action: "lookup" });
    expect(result.status).toBe(200);
    expect(result.body.data.teams.some((team: { id: string }) => team.id === YORK_TEAM_ID)).toBe(true);
  });

  it("creates an independent game, logs a touchdown, finalizes it, and exposes the persisted result to another coach", async () => {
    const { id: _seedId, ...seedMatch } = YORK_LIONS_MATCHES[0];
    const created = await api("tbrown99@my.yorku.ca", "write", {
      entity: "match",
      data: {
        ...seedMatch, status: "scheduled", homeScore: 0, awayScore: 0,
        awayTeamId: "opponent_functionality_test", awayTeamName: "Functionality Test Opponent",
        managingTeamId: YORK_TEAM_ID, isIndependent: true, isAsyncStatKeeping: true, leagueId: "",
      },
    });
    const matchId = created.body.id as string;
    if (matchId) createdRecords.push(`matches/${matchId}`);
    expect(created.status, created.body.error).toBe(201);
    const { id: _playId, timestamp: _timestamp, ...seedPlay } = YORK_LIONS_PLAYS[0];
    const logged = await api("fawcett1@my.yorku.ca", "write", {
      entity: "play",
      data: { ...seedPlay, matchId, isTouchdown: true, pointsScored: 6, result: "Touchdown" },
    });
    if (logged.body.id) createdRecords.push(`plays/${logged.body.id}`);
    expect(logged.status, logged.body.error).toBe(201);
    const completed = await fetch(
      `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/matches/${matchId}?updateMask.fieldPaths=status&updateMask.fieldPaths=homeScore`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokens.get("dexters4@my.yorku.ca")}` },
        body: JSON.stringify({ fields: { status: { stringValue: "completed" }, homeScore: { integerValue: "6" } } }),
      },
    );
    expect(completed.status).toBe(200);
    const otherCoachRead = await fetch(
      `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/matches/${matchId}`,
      { headers: { Authorization: `Bearer ${tokens.get("justinfawcett93@gmail.com")}` } },
    );
    expect(otherCoachRead.status).toBe(200);
    const persisted = await otherCoachRead.json();
    expect(persisted.fields.status.stringValue).toBe("completed");
    expect(persisted.fields.homeScore.integerValue).toBe("6");
    const play = (await getFirestore(app).doc(`plays/${logged.body.id}`).get()).data();
    expect(play?.matchId).toBe(matchId);
    expect(play?.isTouchdown).toBe(true);
  });

  it("persists all three coach-selected colors for signed-out spectators", async () => {
    const teamPath = `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/teams/${YORK_TEAM_ID}`;
    const colors = { primaryColor: "#990000", secondaryColor: "#FFCC00", tertiaryColor: "#111111" };
    try {
      const updated = await fetch(`${teamPath}?${Object.keys(colors).map((key) => `updateMask.fieldPaths=${key}`).join("&")}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokens.get("tbrown99@my.yorku.ca")}` },
        body: JSON.stringify({ fields: Object.fromEntries(Object.entries(colors).map(([key, value]) => [key, { stringValue: value }])) }),
      });
      expect(updated.status).toBe(200);
      const spectator = await fetch(teamPath);
      expect(spectator.status).toBe(200);
      const shared = await spectator.json();
      for (const [key, color] of Object.entries(colors)) expect(shared.fields[key].stringValue).toBe(color);
    } finally {
      await getFirestore(app).doc(`teams/${YORK_TEAM_ID}`).update({
        primaryColor: YORK_LIONS_TEAM.primaryColor,
        secondaryColor: YORK_LIONS_TEAM.secondaryColor,
        tertiaryColor: YORK_LIONS_TEAM.tertiaryColor,
      });
    }
  });

  it("rejects unrelated users creating York independent games", async () => {
    const { id: _id, ...match } = YORK_LIONS_MATCHES[0];
    const result = await api("unrelated@example.com", "write", {
      entity: "match", data: { ...match, leagueId: "", managingTeamId: YORK_TEAM_ID, isIndependent: true },
    });
    expect(result.status).toBe(403);
  });
});
