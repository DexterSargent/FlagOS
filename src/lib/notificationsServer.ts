import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { WriteBatch } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { isValidPublicEmail } from "@/lib/leaguePublicProfile";
import { renderNotificationEmail } from "@/lib/notificationEmail";
import type { EmailContent, NotificationKind, NotificationSnapshot, NotificationStatus } from "@/lib/notificationTypes";

const OUTBOX = "notification_outbox";
const SUPPRESSIONS = "notification_suppressions";
const LEASE_MS = 2 * 60_000;
const MAX_ATTEMPTS = 6;
// Resend forgets idempotency keys after 24 hours. Never blindly retry beyond that window.
export const SAFE_RETRY_WINDOW_MS = 23 * 60 * 60_000;
const RETRY_DELAYS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 3 * 60 * 60_000];
const STATUSES: NotificationStatus[] = ["queued", "sending", "accepted", "delivered", "failed", "bounced", "complained", "suppressed"];

interface StoredNotification {
  kind: NotificationKind;
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
  status: NotificationStatus;
  attempts: number;
  createdAt: number;
  updatedAt: number;
  nextAttemptAt: number | null;
  firstAttemptAt: number | null;
  leaseToken: string | null;
  providerId: string | null;
  lastError: string | null;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function notificationConfiguration() {
  const from = process.env.NOTIFICATION_FROM_EMAIL?.trim() || process.env.REPORT_FROM_EMAIL?.trim() || "FlagOS <notifications@flagos.ca>";
  const replyTo = process.env.NOTIFICATION_REPLY_TO?.trim() || "dextersargent@flagos.ca";
  const issues: string[] = [];
  if (process.env.NOTIFICATION_EMAIL_ENABLED !== "true") issues.push("Email sending is switched off.");
  if (!process.env.RESEND_API_KEY?.trim()) issues.push("RESEND_API_KEY is not configured.");
  if (!process.env.RESEND_WEBHOOK_SECRET?.trim()) issues.push("RESEND_WEBHOOK_SECRET is not configured.");
  if (!process.env.CRON_SECRET?.trim()) issues.push("CRON_SECRET is not configured.");
  const sender = /^(?:[^<>\r\n]+ <)?([^<>\s]+@flagos\.ca)>?$/.exec(from);
  if (!sender || !isValidPublicEmail(sender[1])) issues.push("The sender must be a verified @flagos.ca address.");
  if (!isValidPublicEmail(replyTo)) issues.push("The reply-to email is invalid.");
  return { enabled: issues.length === 0, configurationIssues: issues, from, replyTo };
}

function notificationRecords(eventKey: string, kind: NotificationKind, recipients: string[], content: EmailContent, now: number) {
  if (!eventKey.trim() || eventKey.length > 500) throw new Error("Notification event key is invalid.");
  const emails = [...new Set(recipients.map((email) => email.trim().toLowerCase()))];
  if (!emails.length || emails.length > 50 || emails.some((email) => !isValidPublicEmail(email))) {
    throw new Error("Notification recipients are invalid.");
  }
  const { html, text } = renderNotificationEmail(content);
  if (Buffer.byteLength(html) + Buffer.byteLength(text) > 400_000) throw new Error("Notification content is too large.");
  const { from, replyTo } = notificationConfiguration();
  return emails.map((to) => ({
    ref: adminDb.collection(OUTBOX).doc(hash(`${kind}\0${eventKey}\0${to}`)),
    data: {
      kind, to, from, replyTo, subject: content.subject, html, text, status: "queued",
      attempts: 0, createdAt: now, updatedAt: now, nextAttemptAt: now, firstAttemptAt: null,
      leaseToken: null, providerId: null, lastError: null,
    } satisfies StoredNotification,
  }));
}

/** Use with the business event's batch so neither the event nor its email can be lost independently. */
export function addNotificationsToBatch(batch: WriteBatch, eventKey: string, kind: NotificationKind, recipients: string[], content: EmailContent, now = Date.now()) {
  const records = notificationRecords(eventKey, kind, recipients, content, now);
  for (const record of records) batch.create(record.ref, record.data);
  return records.map(({ ref }) => ref.id);
}

export async function enqueueNotification(eventKey: string, kind: NotificationKind, recipients: string[], content: EmailContent, now = Date.now()) {
  const records = notificationRecords(eventKey, kind, recipients, content, now);
  await adminDb.runTransaction(async (transaction) => {
    const snapshots = await transaction.getAll(...records.map(({ ref }) => ref));
    records.forEach(({ ref, data }, index) => {
      if (!snapshots[index].exists) transaction.create(ref, data);
    });
  });
  return records.map(({ ref }) => ref.id);
}

export async function processNotificationQueue(limit = 20) {
  const configuration = notificationConfiguration();
  if (!configuration.enabled) throw new Error(configuration.configurationIssues.join(" "));
  const pending = await adminDb.collection(OUTBOX).where("nextAttemptAt", "<=", Date.now()).orderBy("nextAttemptAt").limit(limit).get();
  const result = { processed: 0, accepted: 0, retried: 0, failed: 0, suppressed: 0 };
  for (const snapshot of pending.docs) {
    const leaseToken = randomUUID();
    const claimed = await adminDb.runTransaction(async (transaction) => {
      const current = await transaction.get(snapshot.ref);
      if (!current.exists) return null;
      const data = current.data() as StoredNotification;
      const now = Date.now();
      if (!["queued", "sending"].includes(data.status) || data.nextAttemptAt === null || data.nextAttemptAt > now) return null;
      const suppression = await transaction.get(adminDb.collection(SUPPRESSIONS).doc(hash(data.to)));
      if (suppression.exists) {
        transaction.update(snapshot.ref, { status: "suppressed", nextAttemptAt: null, updatedAt: now, lastError: "Recipient suppressed after a bounce or complaint." });
        return "suppressed";
      }
      if (data.attempts >= MAX_ATTEMPTS || (data.firstAttemptAt !== null && now - data.firstAttemptAt >= SAFE_RETRY_WINDOW_MS)) {
        transaction.update(snapshot.ref, { status: "failed", nextAttemptAt: null, updatedAt: now, lastError: "Retry window ended. Check the provider before creating a replacement email." });
        return "failed";
      }
      transaction.update(snapshot.ref, { status: "sending", leaseToken, attempts: data.attempts + 1, firstAttemptAt: data.firstAttemptAt ?? now, nextAttemptAt: now + LEASE_MS, updatedAt: now });
      return { ...data, attempts: data.attempts + 1 };
    });
    if (!claimed) continue;
    result.processed++;
    if (typeof claimed === "string") {
      result[claimed]++;
      continue;
    }
    let providerId: string | null = null;
    let retryable = true;
    let errorMessage = "Email provider request failed or timed out.";
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`, "Content-Type": "application/json", "Idempotency-Key": `flagos/${snapshot.id}` },
        body: JSON.stringify({
          from: claimed.from, to: [claimed.to], reply_to: claimed.replyTo, subject: claimed.subject, html: claimed.html, text: claimed.text,
          tags: [{ name: "notification_id", value: snapshot.id }, { name: "kind", value: claimed.kind }],
        }),
      });
      if (response.ok) {
        const payload: unknown = await response.json();
        if (payload && typeof payload === "object" && "id" in payload && typeof payload.id === "string" && payload.id) providerId = payload.id;
        else errorMessage = "Email provider returned no message ID; delivery is uncertain.";
      } else {
        retryable = response.status === 429 || response.status >= 500;
        errorMessage = `Email provider returned HTTP ${response.status}.`;
      }
    } catch (error) {
      console.error("Notification transport failed:", snapshot.id, error instanceof Error ? error.name : "Unknown error");
    }
    const outcome = await adminDb.runTransaction(async (transaction) => {
      const current = await transaction.get(snapshot.ref);
      const data = current.data() as StoredNotification;
      // A delivery webhook may arrive before the send response is recorded.
      if (data.leaseToken !== leaseToken || data.status !== "sending") return null;
      const now = Date.now();
      const retry = !providerId && retryable && data.attempts < MAX_ATTEMPTS && now - (data.firstAttemptAt ?? now) < SAFE_RETRY_WINDOW_MS;
      transaction.update(snapshot.ref, {
        status: providerId ? "accepted" : retry ? "queued" : "failed",
        providerId, leaseToken: null, updatedAt: now,
        nextAttemptAt: retry ? now + RETRY_DELAYS[data.attempts - 1] : null,
        lastError: providerId ? null : errorMessage,
      });
      return providerId ? "accepted" : retry ? "retried" : "failed";
    });
    if (outcome) result[outcome]++;
    if (!providerId) console.error("Notification delivery issue:", snapshot.id, errorMessage);
    // The default Resend account rate limit is two requests per second.
    await new Promise((resolve) => setTimeout(resolve, 550));
  }
  return result;
}

export async function recordNotificationEvent(payload: unknown) {
  if (!payload || typeof payload !== "object") throw new Error("Invalid email event.");
  const event = payload as { type?: unknown; created_at?: unknown; data?: { email_id?: unknown; tags?: { notification_id?: unknown } } };
  const states: Record<string, NotificationStatus> = { "email.delivered": "delivered", "email.bounced": "bounced", "email.complained": "complained", "email.failed": "failed" };
  const status = typeof event.type === "string" ? states[event.type] : undefined;
  if (!status) return { ignored: true };
  const id = event.data?.tags?.notification_id;
  const providerId = event.data?.email_id;
  const occurredAt = typeof event.created_at === "string" ? Date.parse(event.created_at) : NaN;
  if (typeof id !== "string" || !/^[a-f0-9]{64}$/.test(id)) return { ignored: true };
  if (typeof providerId !== "string" || !providerId || !Number.isFinite(occurredAt)) throw new Error("Invalid email event.");
  return adminDb.runTransaction(async (transaction) => {
    const ref = adminDb.collection(OUTBOX).doc(id);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return { ignored: true };
    const data = snapshot.data() as StoredNotification & { eventAt?: number };
    if (data.providerId && data.providerId !== providerId) throw new Error("Email event does not match its notification.");
    // Complaints and permanent bounces must never be undone by a late delivery event.
    const ranks: Partial<Record<NotificationStatus, number>> = { failed: 1, delivered: 2, bounced: 3, complained: 4 };
    if ((ranks[data.status] || 0) >= (ranks[status] || 0)) return { ignored: true };
    transaction.update(ref, { status, providerId, eventAt: occurredAt, updatedAt: Date.now(), nextAttemptAt: null, leaseToken: null, lastError: status === "delivered" ? null : `Provider reported ${status}.` });
    if (status === "bounced" || status === "complained") {
      transaction.set(adminDb.collection(SUPPRESSIONS).doc(hash(data.to)), { reason: status, createdAt: Date.now(), notificationId: id });
    }
    return { ignored: false };
  });
}

export async function loadNotificationSnapshot(): Promise<NotificationSnapshot> {
  const [recent, counts] = await Promise.all([
    adminDb.collection(OUTBOX).orderBy("createdAt", "desc").limit(50).get(),
    Promise.all(STATUSES.map((status) => adminDb.collection(OUTBOX).where("status", "==", status).count().get())),
  ]);
  return {
    ...notificationConfiguration(),
    counts: Object.fromEntries(STATUSES.map((status, index) => [status, counts[index].data().count])) as Record<NotificationStatus, number>,
    recent: recent.docs.map((snapshot) => {
      const data = snapshot.data() as StoredNotification;
      return { id: snapshot.id, kind: data.kind, to: data.to, subject: data.subject, status: data.status, attempts: data.attempts, createdAt: data.createdAt, updatedAt: data.updatedAt, lastError: data.lastError };
    }),
  };
}
