import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { digestEmail, digestHtml, rolloverEmail, runPlatformHealthJob } from "@/lib/platformJobs";
import type { PlatformHealthReport } from "@/lib/platformHealth";

const { records, enqueue, compute } = vi.hoisted(() => ({
  records: new Map<string, Record<string, unknown>>(), enqueue: vi.fn(), compute: vi.fn(),
}));
vi.mock("@/lib/firebaseAdmin", () => ({
  adminDb: { doc: (path: string) => ({
    get: async () => ({ exists: records.has(path), get: (field: string) => records.get(path)?.[field] }),
    set: async (data: Record<string, unknown>) => { records.set(path, data); },
  }) },
}));
vi.mock("@/lib/notificationsServer", () => ({ enqueueNotification: enqueue }));
vi.mock("@/lib/platformHealth", () => ({ computePlatformHealth: compute, healthNeedsAttention: (report: PlatformHealthReport) => report.integrity.length }));
const now = Date.parse("2026-10-26T12:00:00Z");
const report: PlatformHealthReport = {
  generatedAt: now, integrity: [], renewals: [], newRecords: [], unverifiedAdmins: [], stale: [], truncated: [],
  scanned: { leagues: 1, teams: 2, players: 10, matches: 1, plays: 0 },
  rollover: [{ leagueId: "league-1", leagueName: "North & South", seasonId: "2026", seasonTitle: "Fall", lastGameAt: now, daysUntilEnd: 0, adminEmails: ["coach@example.com"] }],
};

describe("operational email producers", () => {
  beforeEach(() => { records.clear(); compute.mockResolvedValue(report); enqueue.mockResolvedValue(["message"]); });
  afterEach(() => { vi.unstubAllEnvs(); });

  it("queues the digest and season reminder without claiming delivery", async () => {
    expect(await runPlatformHealthJob(now)).toMatchObject({ ran: true, digestQueued: true, remindersQueued: 1 });
    expect(enqueue).toHaveBeenCalledWith(expect.stringMatching(/^health\//), "health_digest", expect.any(Array), expect.any(Object), now);
    expect(enqueue).toHaveBeenCalledWith("rollover/league-1/2026", "season_rollover", ["coach@example.com"], expect.any(Object), now);
    expect(records.get("platform_reminders/rollover_league-1_2026")).toHaveProperty("queuedAt");
    expect(records.get("platform_reminders/rollover_league-1_2026")).not.toHaveProperty("sentAt");
  });

  it("respects previous sent markers during migration", async () => {
    records.set("platform_reports/latest", { generatedAt: now - 86_400_000, digestSentAt: now - 86_400_000 });
    records.set("platform_reminders/rollover_league-1_2026", { sentAt: now - 86_400_000 });
    expect(await runPlatformHealthJob(now)).toMatchObject({ digestQueued: false, remindersQueued: 0 });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("does not treat the same weekly bucket as a newly queued digest", async () => {
    const week = Math.floor(now / (7 * 86_400_000)) * 7 * 86_400_000;
    const later = week + 6.75 * 86_400_000;
    records.set("platform_reports/latest", { generatedAt: week, digestQueuedAt: week });
    records.set("platform_reminders/rollover_league-1_2026", { queuedAt: week });
    expect(await runPlatformHealthJob(later)).toMatchObject({ digestQueued: false });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("does not mark a reminder queued when the outbox write fails", async () => {
    records.set("platform_reports/latest", { digestQueuedAt: now - 86_400_000 });
    enqueue.mockRejectedValueOnce(new Error("Queue unavailable"));
    await expect(runPlatformHealthJob(now)).rejects.toThrow("Queue unavailable");
    expect(records.has("platform_reminders/rollover_league-1_2026")).toBe(false);
  });

  it("renders safe branded content and describes the actual season controls", () => {
    expect(digestEmail(report).action.path).toBe("/admin#health");
    expect(digestHtml(report)).toContain("North &amp; South");
    expect(rolloverEmail(report.rollover[0]).paragraphs.join(" ")).toContain("Season & Archival");
    expect(rolloverEmail(report.rollover[0]).paragraphs.join(" ")).toContain("does not end the season");
  });
});
