import { describe, expect, it } from "vitest";
import { describeAddTeamCost, leagueMonthlyTotal } from "@/lib/leaguePlanCost";
import type { LeagueSubscriptionInfo } from "@/lib/leagueContext";

const paid: LeagueSubscriptionInfo = {
  plan: "league",
  status: "active",
  baseMonthlyFee: 40,
  perTeamMonthlyFee: 20,
  teamCount: 8,
  totalMonthlyFee: 200,
  billingCycle: "monthly",
  paymentMethod: "paid",
};

describe("leaguePlanCost", () => {
  it("prices a league as the base fee plus $20 per seat", () => {
    expect(leagueMonthlyTotal(paid, 8)).toBe(200);
    expect(leagueMonthlyTotal(null, 2)).toBe(80);
  });

  it("is free when a paid plan still has an open slot", () => {
    const cost = describeAddTeamCost({ subscription: paid, teamsInUse: 5 });
    expect(cost.needsSeat).toBe(false);
    expect(cost.free).toBe(true);
    expect(cost.openSeats).toBe(3);
    expect(cost.label).toBe("Add Team (slot available)");
    expect(cost.newMonthlyTotal).toBe(200);
  });

  it("adds a $20 seat with an immediate prorated charge when every slot is used", () => {
    const cost = describeAddTeamCost({ subscription: paid, teamsInUse: 8, verb: "Create Team" });
    expect(cost.needsSeat).toBe(true);
    expect(cost.free).toBe(false);
    expect(cost.label).toBe("Create Team (+$20/mo)");
    expect(cost.newMonthlyTotal).toBe(220);
    expect(cost.detail).toMatch(/prorated charge is billed now, then \$220\/mo/);
  });

  it("never charges complimentary or demo leagues", () => {
    const comp = describeAddTeamCost({ subscription: { ...paid, paymentMethod: "complimentary" }, teamsInUse: 8 });
    expect(comp.needsSeat).toBe(true);
    expect(comp.free).toBe(true);
    expect(comp.label).toBe("Add Team (Complimentary)");

    const demo = describeAddTeamCost({ subscription: paid, teamsInUse: 8, isDemo: true });
    expect(demo.free).toBe(true);
    expect(demo.detail).toMatch(/Nothing is saved or charged/);
  });
});
