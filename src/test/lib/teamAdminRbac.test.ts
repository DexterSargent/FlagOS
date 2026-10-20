import { describe, it, expect } from "vitest";
import { isPrimaryTeamAdmin, getTeamAdminEmails, getTeamAdminAccounts, isDexterUser } from "@/lib/teamAdminRbac";

describe("Team Admin RBAC & Primary Admin Deletion Rights", () => {
  it("presents the seven York addresses as three named coaching accounts", () => {
    const accounts = getTeamAdminAccounts({ id: "york_lions" });
    expect(accounts.map((account) => account.name)).toEqual(["Dexter Sargent", "Theo Brown", "Justin Fawcett"]);
    expect(accounts.map((account) => account.emails.length)).toEqual([2, 3, 2]);
    expect(accounts.filter((account) => account.primary).map((account) => account.name)).toEqual(["Dexter Sargent"]);
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

  it("ensures York Lions has Dexter Sargent as the primary admin by default", () => {
    const yorkTeam = {
      id: "york_lions",
      adminEmails: ["dextersargent@gmail.com", "theo@york.ca"],
    };

    expect(isPrimaryTeamAdmin("dextersargent@gmail.com", yorkTeam)).toBe(true);
    // Secondary coach on York (e.g. Theo) has management access but not primary deletion rights
    expect(isPrimaryTeamAdmin("theo@york.ca", yorkTeam)).toBe(false);
  });

  it("normalizes and prepends Dexter for York Lions if missing from adminEmails", () => {
    const yorkTeamWithoutDexter = {
      id: "york_lions",
      adminEmails: ["theo@york.ca"],
    };

    const adminList = getTeamAdminEmails(yorkTeamWithoutDexter);
    expect(adminList[0]).toBe("dextersargent@gmail.com");
    expect(adminList).toContain("theo@york.ca");
  });

  it("correctly extracts team admin emails for standard teams", () => {
    const standardTeam = {
      id: "team_hawks",
      adminEmails: ["coach1@hawks.com", "coach2@hawks.com"],
    };

    const adminList = getTeamAdminEmails(standardTeam);
    expect(adminList).toEqual(["coach1@hawks.com", "coach2@hawks.com"]);
  });

  it("grants Dexter's York address head-coach rights without platform-owner rights", () => {
    const team = { id: "york_lions", adminEmails: ["dextersargent@gmail.com"] };
    expect(isPrimaryTeamAdmin("DEXTERS4@MY.YORKU.CA", team)).toBe(true);
    expect(isDexterUser("dexters4@my.yorku.ca")).toBe(false);
    expect(isPrimaryTeamAdmin("tbrown99@my.yorku.ca", team)).toBe(false);
    expect(isPrimaryTeamAdmin("fawcett1@my.yorku.ca", team)).toBe(false);
    expect(isPrimaryTeamAdmin("dexters4@my.yorku.ca", { id: "team_other" })).toBe(false);
  });
});
