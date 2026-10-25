import { describe, expect, it } from "vitest";
import {
  computeKpis,
  entriesInPeriod,
  monthlySeries,
  periodRange,
  profitAndLoss,
  toBillingRecords,
  toCsv,
  toMillis,
  upcomingRenewals,
  type LedgerEntry,
} from "@/lib/adminMetrics";

const leagues = [
  { id: "l1", leagueName: "Paid League", createdAt: { _seconds: Date.UTC(2026, 0, 10) / 1000 }, subscription: { status: "active", paymentMethod: "paid", baseMonthlyFee: 40, perTeamMonthlyFee: 20, teamCount: 4, totalMonthlyFee: 120, renewsAt: "2026-05-20T00:00:00Z" } },
  { id: "l2", name: "Comp League", subscription: { status: "active", baseMonthlyFee: 40, perTeamMonthlyFee: 20, teamCount: 2 } },
  { id: "l3", name: "Old League", isArchived: true, subscription: { status: "active", paymentMethod: "paid", totalMonthlyFee: 80 } },
];
const teams = [
  { id: "t1", name: "Solo", leagueId: "", subscription: { status: "active", paymentMethod: "paid", monthlyFee: 40 } },
  { id: "t2", name: "Member", leagueId: "l1" },
  { id: "t3", name: "Trial Team", subscription: { status: "trial" } },
];

describe("admin metrics", () => {
  it("treats leagues and independent teams as customers and defaults unbilled plans to complimentary", () => {
    const records = toBillingRecords(leagues, teams);
    expect(records.map((record) => record.id)).toEqual(["l1", "l2", "l3", "t1", "t3"]);
    expect(records.find((record) => record.id === "l2")).toMatchObject({ paymentMethod: "complimentary", monthlyFee: 80 });
    expect(records.find((record) => record.id === "l3")?.status).toBe("archived");
    expect(records.find((record) => record.id === "t3")).toMatchObject({ status: "trial", monthlyFee: 40 });
    expect(records[0].createdAt).toBe(Date.UTC(2026, 0, 10));
  });

  it("computes billed vs list MRR, ARR, and customer counts", () => {
    const kpis = computeKpis(toBillingRecords(leagues, teams));
    expect(kpis).toMatchObject({
      billedMrr: 160,
      listMrr: 240,
      complimentaryMrr: 80,
      arr: 1920,
      activeCustomers: 3,
      paidCustomers: 2,
      complimentaryCustomers: 1,
      trialCustomers: 1,
      churnedCustomers: 1,
      arpa: 80,
    });
  });

  it("builds profit and loss with refunds reducing revenue", () => {
    const entries: LedgerEntry[] = [
      { id: "1", type: "income", amount: 120, date: "2026-05-01", category: "Subscription", description: "" },
      { id: "2", type: "income", amount: 20, date: "2026-05-02", category: "Refund", description: "" },
      { id: "3", type: "expense", amount: 30.25, date: "2026-05-03", category: "Software & tools", description: "" },
    ];
    expect(profitAndLoss(entries)).toMatchObject({ income: 120, refunds: 20, netRevenue: 100, expenses: 30.25, profit: 69.75, margin: 0.6975 });
  });

  it("filters ledger entries by reporting period", () => {
    const now = new Date(2026, 4, 15);
    expect(periodRange("last_month", now)).toEqual({ start: "2026-04-01", end: "2026-04-30" });
    expect(periodRange("ytd", now)).toEqual({ start: "2026-01-01", end: "2026-05-15" });
    const entries = ["2025-12-31", "2026-04-30", "2026-05-01"].map((date, index) => ({ id: String(index), type: "income" as const, amount: 1, date, category: "Subscription", description: "" }));
    expect(entriesInPeriod(entries, "this_month", now).map((entry) => entry.date)).toEqual(["2026-05-01"]);
    expect(entriesInPeriod(entries, "last_year", now).map((entry) => entry.date)).toEqual(["2025-12-31"]);
  });

  it("produces a trailing monthly series", () => {
    const records = toBillingRecords(leagues, teams);
    const entries: LedgerEntry[] = [{ id: "1", type: "income", amount: 120, date: "2026-05-04", category: "Subscription", description: "" }];
    const series = monthlySeries(records, entries, 6, new Date(2026, 4, 15));
    expect(series).toHaveLength(6);
    expect(series[5]).toMatchObject({ key: "2026-05", revenue: 120, expenses: 0 });
    expect(series[0].key).toBe("2025-12");
    // The paid league was created in January; records without dates count from the start.
    expect(series[0].totalCustomers).toBe(4);
    expect(series[1]).toMatchObject({ key: "2026-01", newCustomers: 1, totalCustomers: 5 });
  });

  it("lists renewals due within the window", () => {
    const records = toBillingRecords(leagues, teams);
    const due = upcomingRenewals(records, 30, Date.parse("2026-05-01T00:00:00Z"));
    expect(due.map((record) => record.id)).toEqual(["l1"]);
  });

  it("escapes CSV cells and neutralizes formulas", () => {
    expect(toCsv(["a", "b"], [["=SUM(A1)", 'x, "y"'], [-5, "ok"]])).toBe('a,b\r\n\'=SUM(A1),"x, ""y"""\r\n-5,ok');
  });

  it("parses timestamp shapes", () => {
    expect(toMillis("2026-01-01T00:00:00Z")).toBe(Date.UTC(2026, 0, 1));
    expect(toMillis({ seconds: 10 })).toBe(10_000);
    expect(toMillis({ toMillis: () => 5 })).toBe(5);
    expect(toMillis(undefined)).toBeNull();
  });
});
