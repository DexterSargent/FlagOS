import { describe, it, expect } from "vitest";
import { isPrimaryTeamAdmin, getTeamAdminEmails, isDexterUser } from "@/lib/teamAdminRbac";

describe("Team Admin RBAC & Primary Admin Deletion Rights", () => {
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
});
