import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { PLATFORM_ADMIN_EMAIL } from "@/lib/platformAdmin";
import { computePlatformHealth, healthNeedsAttention, type PlatformHealthReport } from "@/lib/platformHealth";
import { enqueueNotification } from "@/lib/notificationsServer";
import { renderNotificationEmail } from "@/lib/notificationEmail";
import type { EmailContent } from "@/lib/notificationTypes";

const DAY = 86_400_000;
const REPORTS = "platform_reports";
const REMINDERS = "platform_reminders";
/** Ignore repeat triggers so the job is safe to call from any scheduler, or even by accident. */
export const MIN_RUN_INTERVAL_MS = 20 * 60 * 60 * 1000;
const DIGEST_INTERVAL_MS = 6.5 * DAY;

function day(ms: number | null): string {
  return ms ? new Date(ms).toISOString().slice(0, 10) : "unknown";
}

export function digestEmail(report: PlatformHealthReport): EmailContent {
  const section = (title: string, items: string[], empty: string) => ({ title, items, empty });
  return {
    subject: `FlagOS weekly: ${healthNeedsAttention(report)} item(s) need attention`,
    title: "Your weekly FlagOS check-in",
    preheader: "Renewals, season wrap-ups and records that need a look.",
    paragraphs: [
      `${healthNeedsAttention(report)} item(s) need attention. Checked ${new Date(report.generatedAt).toUTCString()}.`,
      ...(report.truncated.length ? [`The scan reached its limits for ${report.truncated.join(", ")}. Some checks were skipped.`] : []),
    ],
    sections: [
      section("Renewals due or overdue", report.renewals.map((item) => `${item.name} (${item.kind}): ${item.overdue ? "overdue" : "due"} ${day(item.renewsAt)}`), "Nothing due in the next week."),
      section("Data integrity warnings", report.integrity.map((issue) => issue.message), "No problems found."),
      section("Seasons ending soon", report.rollover.map((item) => `${item.leagueName}: ${item.seasonTitle}, final game ${day(item.lastGameAt)}`), "No seasons ending in the next two weeks."),
      section("Stale or test records to review", report.stale.map((item) => `${item.name} (${item.kind}): ${item.reasons.join(", ")}`), "Nothing stale."),
      section("Unverified admin emails", report.unverifiedAdmins, "All admins verified."),
      section("New this week", report.newRecords.map((item) => `${item.name} (${item.kind.replace("_", " ")}) ${day(item.createdAt)}`), "No new leagues, teams, or free agents."),
    ],
    action: { label: "Open the admin portal", path: "/admin#health" },
  };
}

export function digestHtml(report: PlatformHealthReport): string {
  return renderNotificationEmail(digestEmail(report)).html;
}

export function rolloverEmail(item: PlatformHealthReport["rollover"][number]): EmailContent {
  const when = item.daysUntilEnd >= 0 ? `in ${item.daysUntilEnd} day${item.daysUntilEnd === 1 ? "" : "s"}` : "already";
  return {
    subject: `${item.leagueName.slice(0, 120).replace(/[\r\n]/g, " ")}: season wrap-up reminder`,
    title: "Your season is wrapping up",
    preheader: "Review the final games and prepare your next season.",
    paragraphs: [
      `The last scheduled game of ${item.seasonTitle} in ${item.leagueName} is ${when === "already" ? "already past" : when} (${day(item.lastGameAt)}).`,
      "After the final games, open League Settings, then Season & Archival. Review the end-of-season steps before preparing the next season. This reminder does not end the season or change your records.",
    ],
    action: { label: "Open your league", path: `/league/${encodeURIComponent(item.leagueId)}` },
  };
}

export interface PlatformJobResult {
  ran: boolean;
  reason?: string;
  attention?: number;
  digestQueued?: boolean;
  remindersQueued?: number;
}

/** Nightly health scan, weekly owner digest, and one-time season rollover reminders. */
export async function runPlatformHealthJob(now = Date.now(), { force = false } = {}): Promise<PlatformJobResult> {
  const latestRef = adminDb.doc(`${REPORTS}/latest`);
  const latest = await latestRef.get();
  const lastRunAt = Number(latest.get("generatedAt")) || 0;
  if (!force && now - lastRunAt < MIN_RUN_INTERVAL_MS) return { ran: false, reason: "Already ran recently." };

  const report = await computePlatformHealth(now);
  const lastDigestAt = Number(latest.get("digestQueuedAt") || latest.get("digestSentAt")) || 0;
  let digestQueued = false;
  if (now - lastDigestAt >= DIGEST_INTERVAL_MS && Math.floor(now / (7 * DAY)) !== Math.floor(lastDigestAt / (7 * DAY))) {
    const recipients = (process.env.PLATFORM_REPORT_EMAILS || PLATFORM_ADMIN_EMAIL).split(",").map((v) => v.trim()).filter(Boolean);
    await enqueueNotification(`health/${Math.floor(now / (7 * DAY))}`, "health_digest", recipients, digestEmail(report), now);
    digestQueued = true;
  }

  let remindersQueued = 0;
  for (const item of report.rollover) {
    if (!item.adminEmails.length) continue;
    const reminderRef = adminDb.doc(`${REMINDERS}/rollover_${item.leagueId}_${item.seasonId}`);
    if ((await reminderRef.get()).exists) continue;
    await enqueueNotification(`rollover/${item.leagueId}/${item.seasonId}`, "season_rollover", item.adminEmails, rolloverEmail(item), now);
    remindersQueued += 1;
    await reminderRef.set({ kind: "rollover", leagueId: item.leagueId, seasonId: item.seasonId, queuedFor: item.adminEmails, queuedAt: FieldValue.serverTimestamp() });
  }

  const stored = { report, generatedAt: now, digestQueuedAt: digestQueued ? now : lastDigestAt || null };
  await latestRef.set(stored);
  await adminDb.doc(`${REPORTS}/${new Date(now).toISOString().slice(0, 10)}`).set(stored);
  return { ran: true, attention: healthNeedsAttention(report), digestQueued, remindersQueued };
}
