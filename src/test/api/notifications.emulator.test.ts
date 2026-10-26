import { createHash, randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { initializeApp, deleteApp } from "firebase/app";
import { connectFirestoreEmulator, doc, getDoc, getFirestore, terminate } from "firebase/firestore";
import type { adminDb as Database } from "@/lib/firebaseAdmin";
import type * as Service from "@/lib/notificationsServer";

const enabled = process.env.FLAGOS_TEST_EMULATORS === "true";
describe.skipIf(!enabled)("notification outbox on isolated Firestore", () => {
  let db: typeof Database;
  let service: typeof Service;
  const ids = new Set<string>();
  const recipient = `notification-${randomUUID()}@example.invalid`;

  beforeAll(async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_FIREBASE_EMULATORS", "true");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "demo-flagos-local");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099");
    vi.stubEnv("NOTIFICATION_EMAIL_ENABLED", "true");
    vi.stubEnv("RESEND_API_KEY", "emulator-only-not-a-key");
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "emulator-only-not-a-secret");
    vi.stubEnv("CRON_SECRET", "emulator-only");
    db = (await import("@/lib/firebaseAdmin")).adminDb;
    service = await import("@/lib/notificationsServer");
    // Never process another developer's pending messages in a shared emulator.
    expect((await db.collection("notification_outbox").where("nextAttemptAt", "<=", Date.now()).get()).empty).toBe(true);
  });
  afterEach(async () => {
    vi.unstubAllGlobals();
    if (db) {
      await Promise.all([...ids].map((id) => db.collection("notification_outbox").doc(id).delete()));
      ids.clear();
      await db.collection("notification_suppressions").doc(createHash("sha256").update(recipient).digest("hex")).delete();
    }
  });
  afterAll(() => { vi.unstubAllEnvs(); });

  const content = { subject: "Emulator test", title: "Test", preheader: "Local only", paragraphs: ["No real provider request is allowed."], action: { label: "Open", path: "/admin" } };
  async function enqueue(event: string) {
    const created = await service.enqueueNotification(event, "service_test", [recipient], content);
    created.forEach((id) => ids.add(id));
    return created[0];
  }

  it("deduplicates concurrent producers and lets only one worker claim an email", async () => {
    const key = randomUUID();
    const [first, second] = await Promise.all([enqueue(key), enqueue(key)]);
    expect(first).toBe(second);
    const transport = vi.fn(async () => Response.json({ id: "emulator-provider" }));
    vi.stubGlobal("fetch", transport);
    await Promise.all([service.processNotificationQueue(), service.processNotificationQueue()]);
    expect(transport).toHaveBeenCalledOnce();
    expect((await db.collection("notification_outbox").doc(first).get()).get("status")).toBe("accepted");
  });

  it("commits the business event and its email together, with all-or-nothing duplicate protection", async () => {
    const eventId = `notification-test-${randomUUID()}`;
    const eventRef = db.collection("free_agent_interest").doc(eventId);
    const first = db.batch();
    first.create(eventRef, { name: "Local-only notification test" });
    const created = service.addNotificationsToBatch(first, eventId, "free_agent_interest", [recipient], content);
    created.forEach((id) => ids.add(id));
    try {
      await first.commit();
      expect((await eventRef.get()).exists).toBe(true);
      const second = db.batch();
      second.update(eventRef, { name: "Must not be committed" });
      service.addNotificationsToBatch(second, eventId, "free_agent_interest", [recipient], content);
      await expect(second.commit()).rejects.toThrow();
      expect((await eventRef.get()).get("name")).toBe("Local-only notification test");
    } finally {
      await eventRef.delete();
    }
  });

  it("records a bounce and suppresses the next email using real transactions", async () => {
    const id = await enqueue(randomUUID());
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ id: "emulator-provider" })));
    await service.processNotificationQueue();
    await service.recordNotificationEvent({ type: "email.bounced", created_at: new Date().toISOString(), data: { email_id: "emulator-provider", tags: { notification_id: id } } });
    await enqueue(randomUUID());
    expect(await service.processNotificationQueue()).toMatchObject({ suppressed: 1 });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("denies direct client reads of outbox bodies and suppression records", async () => {
    const id = await enqueue(randomUUID());
    const app = initializeApp({ projectId: "demo-flagos-local", apiKey: "emulator-only" }, randomUUID());
    const client = getFirestore(app);
    connectFirestoreEmulator(client, "127.0.0.1", 8080);
    try {
      await expect(getDoc(doc(client, "notification_outbox", id))).rejects.toMatchObject({ code: "permission-denied" });
      await expect(getDoc(doc(client, "notification_suppressions", "test"))).rejects.toMatchObject({ code: "permission-denied" });
    } finally {
      await terminate(client);
      await deleteApp(app);
    }
  });
});
