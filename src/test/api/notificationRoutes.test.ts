import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { POST as deliver } from "@/app/api/cron/notifications/route";
import { POST as webhook } from "@/app/api/webhooks/resend/route";
import { POST as freeAgentInterest } from "@/app/api/public/free-agent-interest/route";
import { POST as business } from "@/app/api/admin/business/route";

const { processQueue, recordEvent, enqueue, addToBatch, loadSnapshot, configuration, verifyToken, batch, document } = vi.hoisted(() => ({
  processQueue: vi.fn(), recordEvent: vi.fn(), enqueue: vi.fn(), addToBatch: vi.fn(), loadSnapshot: vi.fn(), configuration: vi.fn(), verifyToken: vi.fn(),
  batch: { create: vi.fn(), commit: vi.fn() }, document: { id: "interest-1" },
}));
vi.mock("@/lib/notificationsServer", () => ({
  processNotificationQueue: processQueue, recordNotificationEvent: recordEvent, enqueueNotification: enqueue,
  addNotificationsToBatch: addToBatch, loadNotificationSnapshot: loadSnapshot, notificationConfiguration: configuration,
}));
vi.mock("@/lib/firebaseAdmin", () => ({
  adminAuth: { verifyIdToken: verifyToken },
  adminDb: { batch: () => batch, collection: () => ({ doc: () => document, add: vi.fn() }) },
}));
vi.mock("@/lib/platformHealth", () => ({ computePlatformHealth: vi.fn() }));
vi.mock("@/lib/publicRequestLimiter", () => ({ createPublicRequestLimiter: () => () => true, requestClientKey: () => "test" }));

const secret = `whsec_${Buffer.from("a-test-webhook-signing-secret").toString("base64")}`;
function signedRequest(body: string, { timestamp = Math.floor(Date.now() / 1000), signature = "" } = {}) {
  const id = "msg_notification_test";
  const computed = createHmac("sha256", Buffer.from(secret.slice(6), "base64")).update(`${id}.${timestamp}.${body}`).digest("base64");
  return new Request("https://flagos.ca/api/webhooks/resend", {
    method: "POST", body, headers: { "svix-id": id, "svix-timestamp": String(timestamp), "svix-signature": signature || `v1,${computed}` },
  });
}
function businessRequest(action: string, data = {}) {
  return new Request("https://flagos.ca/api/admin/business", { method: "POST", headers: { authorization: "Bearer admin-token" }, body: JSON.stringify({ action, data }) });
}

describe("notification delivery boundaries", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "cron-secret");
    vi.stubEnv("RESEND_WEBHOOK_SECRET", secret);
    processQueue.mockResolvedValue({ processed: 1, accepted: 1, retried: 0, failed: 0, suppressed: 0 });
    recordEvent.mockResolvedValue({ ignored: false });
    enqueue.mockResolvedValue(["message-1"]);
    loadSnapshot.mockResolvedValue({ enabled: true, recent: [] });
    configuration.mockReturnValue({ enabled: true, configurationIssues: [] });
    verifyToken.mockResolvedValue({ uid: "owner", email: "dextersargent@flagos.ca", email_verified: true });
    batch.commit.mockResolvedValue(undefined);
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it("fails closed when cron authentication is missing, wrong, or not configured", async () => {
    expect((await deliver(new Request("https://flagos.ca/api/cron/notifications", { method: "POST" }))).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "");
    expect((await deliver(new Request("https://flagos.ca/api/cron/notifications", { method: "POST" }))).status).toBe(503);
    expect(processQueue).not.toHaveBeenCalled();
  });

  it("processes only an authenticated scheduler request and surfaces permanent failures", async () => {
    const request = () => new Request("https://flagos.ca/api/cron/notifications", { method: "POST", headers: { authorization: "Bearer cron-secret" } });
    expect((await deliver(request())).status).toBe(200);
    processQueue.mockResolvedValue({ processed: 1, failed: 1 });
    expect((await deliver(request())).status).toBe(502);
  });

  it("verifies the exact raw webhook body with the provider signing algorithm", async () => {
    const body = JSON.stringify({ type: "email.delivered", data: { email_id: "provider-1" } });
    expect((await webhook(signedRequest(body))).status).toBe(200);
    expect(recordEvent).toHaveBeenCalledWith(JSON.parse(body));
  });

  it("rejects forged, stale and tampered webhook requests without changing delivery state", async () => {
    expect((await webhook(signedRequest("{}", { signature: "v1,forged" }))).status).toBe(400);
    expect((await webhook(signedRequest("{}", { timestamp: Math.floor(Date.now() / 1000) - 600 }))).status).toBe(400);
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it("returns retryable failure when recording an authenticated webhook fails", async () => {
    recordEvent.mockRejectedValueOnce(new Error("Database unavailable"));
    expect((await webhook(signedRequest("{}"))).status).toBe(500);
  });

  it("rejects a correctly signed non-JSON body before recording an event", async () => {
    expect((await webhook(signedRequest("not-json"))).status).toBe(400);
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it("rejects oversized webhook payloads", async () => {
    expect((await webhook(signedRequest("x".repeat(64_001)))).status).toBe(413);
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it("restricts all notification controls to verified platform administrators", async () => {
    verifyToken.mockResolvedValue({ uid: "coach", email: "coach@example.com", email_verified: true });
    for (const action of ["notifications", "notification_test", "notification_process"]) {
      expect((await business(businessRequest(action))).status).toBe(403);
    }
    verifyToken.mockResolvedValue({ uid: "owner", email: "dextersargent@flagos.ca", email_verified: false });
    expect((await business(businessRequest("notifications"))).status).toBe(403);
    expect(enqueue).not.toHaveBeenCalled();
    expect(processQueue).not.toHaveBeenCalled();
  });

  it("does not expose an arbitrary recipient or content API for test emails", async () => {
    expect((await business(businessRequest("notification_test", { to: "stranger@example.com" }))).status).toBe(400);
    expect((await business(businessRequest("notification_test"))).status).toBe(200);
    expect(enqueue).toHaveBeenCalledWith(expect.stringContaining("test/owner/"), "service_test", ["dextersargent@flagos.ca"], expect.objectContaining({ subject: "Your FlagOS email service test" }));
  });

  it("blocks manual sends when the provider is not configured", async () => {
    configuration.mockReturnValue({ enabled: false, configurationIssues: ["Email sending is switched off."] });
    expect((await business(businessRequest("notification_test"))).status).toBe(503);
    expect((await business(businessRequest("notification_process"))).status).toBe(503);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("saves free-agent interest and its admin alert atomically, without emailing the unverified submitter", async () => {
    const response = await freeAgentInterest(new Request("https://flagos.ca/api/public/free-agent-interest", {
      method: "POST", body: JSON.stringify({ name: "Player", email: "player@example.com", area: "Toronto", ageConfirmed: true }),
    }));
    expect(response.status).toBe(200);
    expect(batch.create).toHaveBeenCalledWith(document, expect.objectContaining({ email: "player@example.com", status: "new" }));
    expect(addToBatch).toHaveBeenCalledWith(batch, "free-agent/interest-1", "free_agent_interest", ["dextersargent@flagos.ca"], expect.objectContaining({ action: { label: "Review player interest", path: "/admin#free-agents" } }));
    expect(batch.commit).toHaveBeenCalledOnce();
  });

  it("reports a failed atomic submission instead of claiming success", async () => {
    batch.commit.mockRejectedValueOnce(new Error("Write failed"));
    const response = await freeAgentInterest(new Request("https://flagos.ca/api/public/free-agent-interest", {
      method: "POST", body: JSON.stringify({ name: "Player", email: "player@example.com", area: "Toronto", ageConfirmed: true }),
    }));
    expect(response.status).toBe(500);
  });
});
