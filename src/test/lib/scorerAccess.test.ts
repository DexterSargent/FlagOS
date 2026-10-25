import { describe, expect, it } from "vitest";
import { canRecordMatch, isGrantActive, scorerLinkPath } from "@/lib/scorerAccess";

const leagueGame = { leagueId: "league_1", managingTeamId: "team_a" };
const teamGame = { leagueId: "", managingTeamId: "team_a", isStandalone: true };
const coachOf = (teamId: string) => (id: string) => id === teamId;

describe("canRecordMatch", () => {
  it("keeps league games with the league admin, not the coaches playing", () => {
    expect(canRecordMatch(leagueGame, { isLeagueAdmin: true })).toBe(true);
    expect(canRecordMatch(leagueGame, { isLeagueAdmin: false, canManageTeam: coachOf("team_a") })).toBe(false);
  });

  it("lets an invited scorer record the game", () => {
    expect(canRecordMatch(leagueGame, { isLeagueAdmin: false, hasScorerGrant: true })).toBe(true);
  });

  it("lets coaches of an independent team record their own games", () => {
    expect(canRecordMatch(teamGame, { isLeagueAdmin: false, canManageTeam: coachOf("team_a") })).toBe(true);
    expect(canRecordMatch(teamGame, { isLeagueAdmin: true, canManageTeam: coachOf("team_b") })).toBe(false);
  });

  it("denies when there is no game", () => {
    expect(canRecordMatch(null, { isLeagueAdmin: true })).toBe(false);
  });
});

describe("scorer grants", () => {
  it("are active only before expiry and while not revoked", () => {
    const now = 1_000_000;
    expect(isGrantActive({ expiresAt: now + 1 }, now)).toBe(true);
    expect(isGrantActive({ expiresAt: now - 1 }, now)).toBe(false);
    expect(isGrantActive({ expiresAt: { toMillis: () => now + 5 } }, now)).toBe(true);
    expect(isGrantActive({ expiresAt: now + 1, revoked: true }, now)).toBe(false);
  });

  it("builds an encoded scorer link", () => {
    expect(scorerLinkPath("m_1", "abc-_9")).toBe("/matches/m_1/play-by-play?scorer=abc-_9");
  });
});
