import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { PLATFORM_ADMIN_EMAIL } from "@/lib/platformAdmin";
import { computePlatformHealth, healthNeedsAttention, type PlatformHealthReport } from "@/lib/platformHealth";

const DAY = 86_400_000;
const SITE_URL = "https://flagos.ca";
const REPORTS = "platform_reports";
const REMINDERS = "platform_reminders";
/** Ignore repeat triggers so the job is safe to call from any scheduler, or even by accident. */
export const MIN_RUN_INTERVAL_MS = 20 * 60 * 60 * 1000;
const DIGEST_INTERVAL_MS = 6.5 * DAY;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string);
}

function day(ms: number | null): string {
  return ms ? new Date(ms).toISOString().slice(0, 10) : "unknown";
}

/** Sends through Resend when RESEND_API_KEY is configured; otherwise the report is only stored. */
export async function sendEmail(to: string[], subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey || to.length === 0) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.REPORT_FROM_EMAIL?.trim() || "FlagOS <reports@flagos.ca>", to, subject, html }),
  });
  if (!response.ok) {
    console.error("Report email failed:", response.status, await response.text().catch(() => ""));
    return false;
  }
  return true;
}

function section(title: string, rows: string[], empty: string): string {
  const body = rows.length ? `<ul>${rows.map((row) => `<li>${row}</li>`).join("")}</ul>` : `<p style="color:#555">${empty}</p>`;
  return `<h3 style="margin:18px 0 6px">${escapeHtml(title)} (${rows.length})</h3>${body}`;
}

export function digestHtml(report: PlatformHealthReport): string {
  const e = escapeHtml;
  return [
    `<h2 style="margin:0">FlagOS weekly check-in</h2>`,
    `<p>${healthNeedsAttention(report)} item(s) need attention. Generated ${new Date(report.generatedAt).toUTCString()}.</p>`,
    section("Renewals due or overdue", report.renewals.map((item) =>
      `${e(item.name)} (${item.kind}): ${item.overdue ? "<b>overdue</b>" : "due"} ${day(item.renewsAt)}`), "Nothing due in the next week."),
    section("Data integrity warnings", report.integrity.map((issue) => e(issue.message)), "No problems found."),
    section("Seasons ending soon", report.rollover.map((item) =>
      `${e(item.leagueName)}: ${e(item.seasonTitle)} final game ${day(item.lastGameAt)}`), "No seasons ending in the next two weeks."),
    section("Stale or test records to review", report.stale.map((item) =>
      `${e(item.name)} (${item.kind}): ${e(item.reasons.join(", "))}`), "Nothing stale."),
    section("Unverified admin emails", report.unverifiedAdmins.map(e), "All admins verified."),
    section("New this week", report.newRecords.map((item) =>
      `${e(item.name)} (${item.kind.replace("_", " ")}) ${day(item.createdAt)}`), "No new leagues, teams, or free agents."),
    report.truncated.length ? `<p style="color:#92400e">Scan hit its limits for: ${e(report.truncated.join(", "))}. Some checks were skipped.</p>` : "",
    `<p><a href="${SITE_URL}/admin">Open the business console</a></p>`,
  ].join("");
}

function rolloverHtml(item: PlatformHealthReport["rollover"][number]): string {
  const e = escapeHtml;
  const when = item.daysUntilEnd >= 0 ? `in ${item.daysUntilEnd} day${item.daysUntilEnd === 1 ? "" : "s"}` : "already";
  return [
    `<p>Hi,</p>`,
    `<p>The last scheduled game of <b>${e(item.seasonTitle)}</b> in <b>${e(item.leagueName)}</b> is ${when === "already" ? "already past" : when} (${day(item.lastGameAt)}).</p>`,
    `<p>When the season wraps up, open your league, choose <b>League Settings</b>, then <b>Start New Season</b>. Standings and stats are archived automatically and teams carry over.</p>`,
    `<p><a href="${SITE_URL}/league/${encodeURIComponent(item.leagueId)}">Open ${e(item.leagueName)}</a></p>`,
    `<p style="color:#555">FlagOS</p>`,
  ].join("");
}

export interface PlatformJobResult {
  ran: boolean;
  reason?: string;
  attention?: number;
  digestSent?: boolean;
  remindersSent?: number;
}

/** Nightly health scan, weekly owner digest, and one-time season rollover reminders. */
export async function runPlatformHealthJob(now = Date.now(), { force = false } = {}): Promise<PlatformJobResult> {
  const latestRef = adminDb.doc(`${REPORTS}/latest`);
  const latest = await latestRef.get();
  const lastRunAt = Number(latest.get("generatedAt")) || 0;
  if (!force && now - lastRunAt < MIN_RUN_INTERVAL_MS) return { ran: false, reason: "Already ran recently." };

  const report = await computePlatformHealth(now);
  const lastDigestAt = Number(latest.get("digestSentAt")) || 0;
  let digestSent = false;
  if (now - lastDigestAt >= DIGEST_INTERVAL_MS) {
    const recipients = (process.env.PLATFORM_REPORT_EMAILS || PLATFORM_ADMIN_EMAIL).split(",").map((v) => v.trim()).filter(Boolean);
    digestSent = await sendEmail(recipients, `FlagOS weekly: ${healthNeedsAttention(report)} item(s) need attention`, digestHtml(report));
  }

  let remindersSent = 0;
  for (const item of report.rollover) {
    if (!item.adminEmails.length) continue;
    const reminderRef = adminDb.doc(`${REMINDERS}/rollover_${item.leagueId}_${item.seasonId}`);
    if ((await reminderRef.get()).exists) continue;
    if (await sendEmail(item.adminEmails, `${item.leagueName}: season wrap-up reminder`, rolloverHtml(item))) {
      remindersSent += 1;
      await reminderRef.set({ kind: "rollover", leagueId: item.leagueId, seasonId: item.seasonId, sentTo: item.adminEmails, sentAt: FieldValue.serverTimestamp() });
    }
  }

  const stored = { report, generatedAt: now, digestSentAt: digestSent ? now : lastDigestAt || null };
  await latestRef.set(stored);
  await adminDb.doc(`${REPORTS}/${new Date(now).toISOString().slice(0, 10)}`).set(stored);
  return { ran: true, attention: healthNeedsAttention(report), digestSent, remindersSent };
}
