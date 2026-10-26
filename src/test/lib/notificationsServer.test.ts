import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enqueueNotification, loadNotificationSnapshot, notificationConfiguration, processNotificationQueue, recordNotificationEvent, SAFE_RETRY_WINDOW_MS } from "@/lib/notificationsServer";
import type { EmailContent } from "@/lib/notificationTypes";

const { store, runTransaction } = vi.hoisted(() => ({
  store: new Map<string, Record<string, unknown>>(),
  runTransaction: vi.fn(),
}));

vi.mock("@/lib/firebaseAdmin", () => {
  function ref(path: string) { return { path, id: path.split("/").at(-1)! }; }
  function snapshot(reference: ReturnType<typeof ref>) {
    return { id: reference.id, ref: reference, exists: store.has(reference.path), data: () => store.get(reference.path) };
  }
  return {
    adminDb: {
      runTransaction,
      collection: (name: string) => {
        let filter = (_row: Record<string, unknown>) => true;
        let field = "";
        let direction = "asc";
        let cap = Infinity;
        const query = {
          doc: (id: string) => ref(`${name}/${id}`),
          where: (key: string, operator: string, value: unknown) => {
            filter = (row) => operator === "==" ? row[key] === value : typeof row[key] === "number" && typeof value === "number" && row[key] <= value;
            return query;
          },
          orderBy: (key: string, order = "asc") => { field = key; direction = order; return query; },
          limit: (value: number) => { cap = value; return query; },
          count: () => ({ get: async () => ({ data: () => ({ count: [...store.entries()].filter(([path, row]) => path.startsWith(`${name}/`) && filter(row)).length }) }) }),
          get: async () => ({
            docs: [...store.entries()].filter(([path, row]) => path.startsWith(`${name}/`) && filter(row))
              .sort((a, b) => ((Number(a[1][field]) || 0) - (Number(b[1][field]) || 0)) * (direction === "asc" ? 1 : -1))
              .slice(0, cap).map(([path]) => snapshot(ref(path))),
          }),
        };
        return query;
      },
    },
  };
});

const content: EmailContent = { subject: "FlagOS test", title: "Test", preheader: "Test", paragraphs: ["A test message."], action: { label: "Open FlagOS", path: "/admin#health" } };
let now: number;

function queued() {
  return [...store.entries()].filter(([path]) => path.startsWith("notification_outbox/"));
}

function event(id: string, type: string, providerId = "provider-1") {
  return { type, created_at: new Date(now).toISOString(), data: { email_id: providerId, tags: { notification_id: id } } };
}

describe("durable notification delivery", () => {
  beforeEach(() => {
    store.clear();
    now = Date.parse("2026-10-26T12:00:00Z");
    vi.spyOn(Date, "now").mockImplementation(() => now);
    vi.stubEnv("NOTIFICATION_EMAIL_ENABLED", "true");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "test-webhook-secret");
    vi.stubEnv("CRON_SECRET", "test-cron");
    vi.stubEnv("NOTIFICATION_FROM_EMAIL", "FlagOS <notifications@flagos.ca>");
    vi.stubEnv("NOTIFICATION_REPLY_TO", "coach@flagos.ca");
    runTransaction.mockImplementation(async (callback) => callback({
      get: async (ref: { path: string }) => ({ exists: store.has(ref.path), data: () => store.get(ref.path) }),
      getAll: async (...refs: Array<{ path: string }>) => refs.map((ref) => ({ exists: store.has(ref.path), data: () => store.get(ref.path) })),
      create: (ref: { path: string }, data: Record<string, unknown>) => {
        if (store.has(ref.path)) throw new Error("Already exists");
        store.set(ref.path, { ...data });
      },
      update: (ref: { path: string }, data: Record<string, unknown>) => {
        if (!store.has(ref.path)) throw new Error("Missing document");
        store.set(ref.path, { ...store.get(ref.path), ...data });
      },
      set: (ref: { path: string }, data: Record<string, unknown>) => store.set(ref.path, { ...data }),
    }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ id: "provider-1" })));
  });

  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("requires explicit enablement, credentials, scheduler and verified-domain sender configuration", () => {
    expect(notificationConfiguration().enabled).toBe(true);
    vi.stubEnv("NOTIFICATION_EMAIL_ENABLED", "false");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "");
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("NOTIFICATION_FROM_EMAIL", "Person <sender@example.com>");
    expect(notificationConfiguration().configurationIssues).toHaveLength(5);
  });

  it("deduplicates events and recipients, preserves the original request, and hides other recipients", async () => {
    const ids = await enqueueNotification("same-event", "health_digest", ["One@example.com", "one@example.com", "two@example.com"], content, now);
    await enqueueNotification("same-event", "health_digest", ["one@example.com"], { ...content, title: "Changed" }, now);
    expect(queued()).toHaveLength(2);
    expect(ids).toHaveLength(2);
    expect(queued()[0][1].html).not.toContain("Changed");
    expect(queued()[0][1].to).toBe("one@example.com");
  });

  it("stores emails while sending is disabled, but refuses to pretend they were sent", async () => {
    vi.stubEnv("NOTIFICATION_EMAIL_ENABLED", "false");
    await enqueueNotification("queued-disabled", "service_test", ["one@example.com"], content, now);
    await expect(processNotificationQueue()).rejects.toThrow("switched off");
    expect(queued()[0][1].status).toBe("queued");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects an invalid recipient before any write", async () => {
    await expect(enqueueNotification("bad", "service_test", ["x@example.com\r\nBcc:x@y.com"], content)).rejects.toThrow("recipients");
    expect(store.size).toBe(0);
  });

  it("sends branded HTML and text with a stable idempotency key, and records acceptance rather than delivery", async () => {
    const [id] = await enqueueNotification("send", "service_test", ["one@example.com"], content, now);
    expect(await processNotificationQueue()).toMatchObject({ accepted: 1 });
    expect(queued()[0][1]).toMatchObject({ status: "accepted", providerId: "provider-1", attempts: 1, nextAttemptAt: null });
    const options = vi.mocked(fetch).mock.calls[0][1]!;
    expect(options.headers).toMatchObject({ "Idempotency-Key": `flagos/${id}` });
    expect(JSON.parse(String(options.body))).toMatchObject({ to: ["one@example.com"], reply_to: "coach@flagos.ca", text: expect.stringContaining("FlagOS"), tags: [{ name: "notification_id", value: id }, { name: "kind", value: "service_test" }] });
    await processNotificationQueue();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([429, 500, 503])("retries HTTP %s failures with the identical request", async (status) => {
    await enqueueNotification("retry", "service_test", ["one@example.com"], content, now);
    vi.mocked(fetch).mockResolvedValueOnce(new Response("failure", { status }));
    expect(await processNotificationQueue()).toMatchObject({ retried: 1 });
    expect(queued()[0][1].nextAttemptAt).toBe(now + 60_000);
    now += 60_001;
    await processNotificationQueue();
    const first = vi.mocked(fetch).mock.calls[0][1]!;
    const second = vi.mocked(fetch).mock.calls[1][1]!;
    expect(first.headers).toEqual(second.headers);
    expect(first.body).toEqual(second.body);
    expect(queued()[0][1].status).toBe("accepted");
  });

  it("retries network uncertainty but stops safely before the provider forgets its idempotency key", async () => {
    await enqueueNotification("uncertain", "service_test", ["one@example.com"], content, now);
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Network failed"));
    await processNotificationQueue();
    now += SAFE_RETRY_WINDOW_MS;
    expect(await processNotificationQueue()).toMatchObject({ failed: 1 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry permanent validation failures", async () => {
    await enqueueNotification("bad-provider-input", "service_test", ["one@example.com"], content, now);
    vi.mocked(fetch).mockResolvedValue(new Response("Invalid sender", { status: 422 }));
    expect(await processNotificationQueue()).toMatchObject({ failed: 1 });
    expect(queued()[0][1]).toMatchObject({ status: "failed", lastError: "Email provider returned HTTP 422.", nextAttemptAt: null });
  });

  it("stops automatic attempts after six transient failures", async () => {
    await enqueueNotification("max-attempts", "service_test", ["one@example.com"], content, now);
    vi.mocked(fetch).mockResolvedValue(new Response("Unavailable", { status: 503 }));
    for (let attempt = 1; attempt <= 6; attempt++) {
      await processNotificationQueue();
      const record = queued()[0][1];
      expect(record.attempts).toBe(attempt);
      if (attempt < 6) now = Number(record.nextAttemptAt);
    }
    expect(queued()[0][1]).toMatchObject({ status: "failed", nextAttemptAt: null });
    await processNotificationQueue();
    expect(fetch).toHaveBeenCalledTimes(6);
  });

  it("does not claim delivery when a successful response is missing its message ID", async () => {
    await enqueueNotification("missing-id", "service_test", ["one@example.com"], content, now);
    vi.mocked(fetch).mockResolvedValue(Response.json({}));
    expect(await processNotificationQueue()).toMatchObject({ accepted: 0, retried: 1 });
    expect(queued()[0][1].lastError).toContain("delivery is uncertain");
  });

  it("does not claim an active lease and recovers an expired worker lease", async () => {
    await enqueueNotification("lease", "service_test", ["one@example.com"], content, now);
    const [path, record] = queued()[0];
    store.set(path, { ...record, status: "sending", attempts: 1, firstAttemptAt: now, nextAttemptAt: now + 120_000, leaseToken: "old-worker" });
    expect(await processNotificationQueue()).toMatchObject({ processed: 0 });
    now += 120_001;
    expect(await processNotificationQueue()).toMatchObject({ accepted: 1 });
  });

  it("does not overwrite a delivery webhook that arrives before the send response", async () => {
    const [id] = await enqueueNotification("fast-webhook", "service_test", ["one@example.com"], content, now);
    vi.mocked(fetch).mockImplementationOnce(async () => {
      await recordNotificationEvent(event(id, "email.delivered"));
      return Response.json({ id: "provider-1" });
    });
    await processNotificationQueue();
    expect(queued()[0][1].status).toBe("delivered");
  });

  it.each(["email.bounced", "email.complained"])("suppresses future sends after %s and ignores duplicate/late delivery events", async (type) => {
    const [id] = await enqueueNotification("first", "service_test", ["one@example.com"], content, now);
    await processNotificationQueue();
    await recordNotificationEvent(event(id, type));
    expect(await recordNotificationEvent(event(id, type))).toEqual({ ignored: true });
    await recordNotificationEvent(event(id, "email.delivered"));
    expect(queued()[0][1].status).toBe(type.slice(6));
    await enqueueNotification("second", "service_test", ["one@example.com"], content, now);
    expect(await processNotificationQueue()).toMatchObject({ suppressed: 1 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("ignores events for other applications and rejects mismatched provider IDs", async () => {
    expect(await recordNotificationEvent({ type: "email.opened" })).toEqual({ ignored: true });
    expect(await recordNotificationEvent({ type: "email.delivered", data: {} })).toEqual({ ignored: true });
    const [id] = await enqueueNotification("mismatch", "service_test", ["one@example.com"], content, now);
    await processNotificationQueue();
    await expect(recordNotificationEvent(event(id, "email.delivered", "different-provider"))).rejects.toThrow("does not match");
  });

  it("returns only safe metadata and complete status counts to the admin UI", async () => {
    await enqueueNotification("status", "service_test", ["one@example.com"], content, now);
    const snapshot = await loadNotificationSnapshot();
    expect(snapshot.counts.queued).toBe(1);
    expect(snapshot.counts.failed).toBe(0);
    expect(snapshot.recent[0]).not.toHaveProperty("html");
    expect(snapshot.recent[0]).not.toHaveProperty("text");
    expect(snapshot).not.toHaveProperty("apiKey");
  });
});
