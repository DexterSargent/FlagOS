import { describe, expect, it } from "vitest";
import type { User } from "firebase/auth";
import { portalHomePath, scopeAuthToPortal, useAuth } from "@/lib/authContext";

type Auth = ReturnType<typeof useAuth>;

const leaguePlayer = { id: "p-league", teamId: "lions", leagueId: "york", playerName: "League Me" };
const teamPlayer = { id: "p-indie", teamId: "indie", playerName: "Indie Me" };

function account(overrides: Partial<Auth> = {}): Auth {
  return {
    user: { uid: "u1" } as User,
    userProfile: {
      uid: "u1",
      email: "me@example.com",
      role: "player",
      managedTeamIds: ["coached"],
      playerRecords: [leaguePlayer, teamPlayer],
    },
    role: "player",
    isAuthorized: true,
    isPlatformAdmin: false,
    isAdmin: false,
    isLeagueAdmin: false,
    isTeamAdmin: (id?: string) => id === "coached",
    isPlayer: true,
    playerId: "p-league",
    playerTeamId: "lions",
    playerData: leaguePlayer,
    managedTeamId: "lions",
    canRegisterAsPlayer: false,
    simulatedIdentity: false,
    ...overrides,
  } as Auth;
}

describe("scopeAuthToPortal", () => {
  it("is the player on the portal's own roster only", () => {
    const scoped = scopeAuthToPortal(account(), ["indie"]);
    expect(scoped).toMatchObject({ role: "player", isPlayer: true, playerId: "p-indie", playerTeamId: "indie", isAuthorized: true });
  });

  it("has no team or player identity outside every portal", () => {
    const scoped = scopeAuthToPortal(account(), []);
    expect(scoped).toMatchObject({
      role: "user", isPlayer: false, playerId: null, playerTeamId: null, managedTeamId: null, playerData: null, isAuthorized: false,
    });
  });

  it("is a coach only in the portal of the team they coach", () => {
    const scoped = scopeAuthToPortal(account(), ["coached", "other"]);
    expect(scoped).toMatchObject({ role: "team_admin", isPlayer: false, managedTeamId: "coached", isAuthorized: true });
    expect(scoped.isTeamAdmin()).toBe(true);
    expect(scopeAuthToPortal(account(), ["lions"]).isTeamAdmin()).toBe(false);
  });

  it("leaves simulated demo identities untouched", () => {
    const base = account({ simulatedIdentity: true });
    expect(scopeAuthToPortal(base, [])).toBe(base);
  });
});

describe("portalHomePath", () => {
  it("opens the only portal directly", () => {
    expect(portalHomePath([], [{ teamId: "indie" }])).toBe("/teams/indie");
    expect(portalHomePath([{ id: "coached" }], [{ teamId: "coached" }])).toBe("/teams/coached");
  });

  it("sends accounts with several portals to the account hub, and none to home", () => {
    expect(portalHomePath([{ id: "a" }], [{ teamId: "b" }])).toBe("/account");
    expect(portalHomePath([], [{ teamId: "team_free_agents" }])).toBe("/");
  });
});
