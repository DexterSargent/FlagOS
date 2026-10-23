import { describe, it, expect } from "vitest";
import { isPrimaryTeamAdmin, getTeamAdminEmails, getTeamAdminAccounts, isDexterUser } from "@/lib/teamAdminRbac";

describe("Team Admin RBAC & Primary Admin Deletion Rights", () => {
  it("builds coaching accounts from stored admin emails only", () => {
    const accounts = getTeamAdminAccounts({ id: "falcons", adminEmails: ["head@falcons.com", "assistant@falcons.com"] });
    expect(accounts.map((account) => account.name)).toEqual(["head@falcons.com", "assistant@falcons.com"]);
    expect(accounts.map((account) => account.primary)).toEqual([true, false]);
    expect(getTeamAdminAccounts({ id: "another-team" })).toEqual([]);
  });

  it("groups verified connected emails for other teams without merging unrelated coaches", () => {
    const accounts = getTeamAdminAccounts({
      id: "team_hawks", adminEmails: ["coach@hawks.com", "coach.personal@example.com", "assistant@hawks.com"],
      adminAccountIds: { "coach@hawks.com": "coach-uid", "coach.personal@example.com": "coach-uid" },
    });
    expect(accounts).toHaveLength(2);
    expect(accounts[0].emails).toEqual(["coach@hawks.com", "coach.personal@example.com"]);
    expect(accounts[0].primary).toBe(true);
    expect(accounts[1].primary).toBe(false);
  });

  it("identifies platform owner / Dexter emails", () => {
    expect(isDexterUser("dextersargent@flagos.ca")).toBe(true);
    expect(isDexterUser("DEXTERSARGENT@FLAGOS.CA")).toBe(true);
    expect(isDexterUser("dextersargent@gmail.com")).toBe(true);
    expect(isDexterUser("DEXTERSARGENT@GMAIL.COM")).toBe(true);
    expect(isDexterUser("dexter@yuwffl.ca")).toBe(true);
    expect(isDexterUser("assistant@coach.com")).toBe(false);
    expect(isDexterUser(null)).toBe(false);
  });

  it("designates the first admin email as the primary team admin with full deletion rights", () => {
    const team = {
      id: "team_toronto",
      adminEmails: ["headcoach@toronto.com", "assistant@toronto.com", "coordinator@toronto.com"],
      coachEmail: "headcoach@toronto.com",
    };

    // First admin (head coach) has primary admin rights
    expect(isPrimaryTeamAdmin("headcoach@toronto.com", team)).toBe(true);

    // Secondary admins do NOT have primary admin deletion rights
    expect(isPrimaryTeamAdmin("assistant@toronto.com", team)).toBe(false);
    expect(isPrimaryTeamAdmin("coordinator@toronto.com", team)).toBe(false);
    expect(isPrimaryTeamAdmin("random@person.com", team)).toBe(false);
  });

  it("always grants primary admin rights to Dexter across teams", () => {
    const team = {
      id: "team_random_customer",
      adminEmails: ["othercoach@customer.com"],
    };

    expect(isPrimaryTeamAdmin("dextersargent@gmail.com", team)).toBe(true);
    expect(isPrimaryTeamAdmin("dexter@yuwffl.ca", team)).toBe(true);
  });

  it("normalizes stored addresses without injecting extra admins", () => {
    expect(getTeamAdminEmails({ id: "falcons", adminEmails: [" COACH@FALCONS.COM "] })).toEqual(["coach@falcons.com"]);
    expect(getTeamAdminEmails({ id: "falcons" })).toEqual([]);
  });

  it("uses coachEmail only when there is no admin list", () => {
    expect(getTeamAdminEmails({ id: "falcons", coachEmail: " HEAD@FALCONS.COM " })).toEqual(["head@falcons.com"]);
    expect(isPrimaryTeamAdmin("HEAD@FALCONS.COM", { id: "falcons", coachEmail: "head@falcons.com" })).toBe(true);
    expect(isPrimaryTeamAdmin("head@falcons.com", { id: "falcons", coachEmail: "head@falcons.com", adminEmails: ["other@falcons.com"] })).toBe(false);
    expect(isPrimaryTeamAdmin("head@falcons.com", { id: "another-team" })).toBe(false);
  });
});
