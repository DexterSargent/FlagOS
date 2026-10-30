import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { buildPublicTeamSeasonSummary, GAME_SUMMARY_COLLECTION, type SummaryTeamScope } from "@/lib/teamStatSummaryService";

const enabled = process.env.FLAGOS_TEST_EMULATORS === "true";
const teamId = `perf_summary_${Date.now()}`;
const gameId = `${teamId}_game`;
const playId = `${teamId}_play`;
const scope: SummaryTeamScope = { teamId, matchTeamIds: [teamId], requiresSignIn: false, seasonId: "season-1" };
let app: App;
let db: Firestore;

describe.skipIf(!enabled)("persisted stats against the isolated Firestore emulator", () => {
  beforeAll(async () => {
    if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080") {
      throw new Error("This test must never connect to production Firestore.");
    }
    app = initializeApp({ projectId: "demo-flagos-local" }, teamId);
    db = getFirestore(app);
    await db.doc(`matches/${gameId}`).set({
      homeTeamId: teamId, awayTeamId: "opponent", isHidden: false,
      status: "completed", homeScore: 7, awayScore: 0,
    });
    await db.doc(`plays/${playId}`).set({
      matchId: gameId, possessionTeamId: teamId, isHidden: false,
      playType: "Pass", passOutcome: "Complete", qbPlayerId: "Sonia",
      receiverPlayerId: "Catherine", isTouchdown: true,
      conversionAttempt: 1, conversionSuccess: true,
    });
  }, 30_000);

  afterAll(async () => {
    if (!app) return;
    await Promise.all([
      db.doc(`matches/${gameId}`).delete(),
      db.doc(`plays/${playId}`).delete(),
      db.collection("players").doc(`${teamId}_player`).delete(),
    ]);
    const summaries = await db.collection(GAME_SUMMARY_COLLECTION).where("teamId", "==", teamId).get();
    await Promise.all(summaries.docs.map((record) => record.ref.delete()));
    await deleteApp(app);
  });

  it("persists and reuses a game summary, then rebuilds after corrections, hiding and deletion", async () => {
    const first = await buildPublicTeamSeasonSummary(db, scope);
    expect(first.teamStats.passAttempts).toBe(1);
    expect(first.playerStats.Sonia.passTD).toBe(1);
    expect(first.teamStats.pat1Conversions).toBe(1);
    expect(first.cache.misses).toBe(1);

    const reused = await buildPublicTeamSeasonSummary(db, scope);
    expect(reused.cache.hits).toBe(1);

    await db.doc(`plays/${playId}`).update({ passOutcome: "Missed", isTouchdown: false, conversionAttempt: null, conversionSuccess: false });
    const corrected = await buildPublicTeamSeasonSummary(db, scope);
    expect(corrected.playerStats.Sonia.passTD).toBe(0);
    expect(corrected.playerStats.Sonia.passComp).toBe(0);
    expect(corrected.cache.misses).toBe(1);

    await db.doc(`plays/${playId}`).update({ isHidden: true });
    const hidden = await buildPublicTeamSeasonSummary(db, scope);
    expect(hidden.teamStats.passAttempts).toBe(0);

    await db.doc(`plays/${playId}`).delete();
    const deleted = await buildPublicTeamSeasonSummary(db, scope);
    expect(deleted.teamStats.passAttempts).toBe(0);
    expect(deleted.cache.misses).toBe(1);
  }, 30_000);
});
