import { describe, it, expect, vi } from "vitest";
import {
  loadTeamPlayers,
  loadMatchRosterPlayers,
  getMatchSubsByTeam,
  addMatchSub,
} from "@/lib/matchRoster";
import { getDocs } from "firebase/firestore";

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name) => ({ path: name })),
  query: vi.fn((coll, ...constraints) => ({ coll, constraints })),
  where: vi.fn((field, op, value) => ({ field, op, value })),
  limit: vi.fn((n) => ({ limit: n })),
  getDocs: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  db: {},
}));

describe("matchRoster", () => {
  it("loads team players for single team with and without leagueId", async () => {
    vi.mocked(getDocs).mockResolvedValue({
      docs: [
        { id: "p1", data: () => ({ name: "Player 1", teamId: "team_1" }) },
      ],
    } as any);

    const playersWithLeague = await loadTeamPlayers("team_1", "league_a", 25);
    expect(playersWithLeague).toHaveLength(1);
    expect(playersWithLeague[0].id).toBe("p1");

    const playersNoLeague = await loadTeamPlayers("team_1", null);
    expect(playersNoLeague).toHaveLength(1);
  });

  it("throws last error when all loadPlayersByTeamIds queries fail", async () => {
    vi.mocked(getDocs).mockRejectedValue(new Error("Permission denied"));

    await expect(loadTeamPlayers("team_fail", "league_fail")).rejects.toThrow("Permission denied");
  });

  it("loads match roster players with managingTeamId or home/away teams, ignoring opponent placeholders", async () => {
    vi.mocked(getDocs).mockResolvedValue({
      docs: [
        { id: "p_home", data: () => ({ name: "Home Athlete", teamId: "team_home" }) },
      ],
    } as any);

    // Managing team priority
    const managingResult = await loadMatchRosterPlayers({
      managingTeamId: "team_home",
      homeTeamId: "team_other",
      awayTeamId: "team_away",
    });
    expect(managingResult).toHaveLength(1);

    // Home and away teams, opponent placeholder filtered out
    const sideResult = await loadMatchRosterPlayers({
      homeTeamId: "team_home",
      awayTeamId: "opponent_custom",
    });
    expect(sideResult).toHaveLength(1);

    // No real teams returns empty array immediately without querying
    const emptyResult = await loadMatchRosterPlayers({
      homeTeamId: "opponent_1",
      awayTeamId: "opponent_2",
    });
    expect(emptyResult).toEqual([]);
  });

  it("handles match subs per team and legacy flat subs", () => {
    // Structured subs
    const structured = getMatchSubsByTeam({
      subsByTeam: {
        home: ["Sub Alice", "Sub Bob"],
        away: ["Sub Charlie"],
      },
    });
    expect(structured).toEqual({
      home: ["Sub Alice", "Sub Bob"],
      away: ["Sub Charlie"],
    });

    // Legacy subs
    const legacy = getMatchSubsByTeam({
      subs: ["Legacy Sub 1", "Legacy Sub 2"],
    });
    expect(legacy).toEqual({
      home: ["Legacy Sub 1", "Legacy Sub 2"],
      away: ["Legacy Sub 1", "Legacy Sub 2"],
    });

    // Null or undefined
    expect(getMatchSubsByTeam(null)).toEqual({ home: [], away: [] });
  });

  it("adds match subs to home and away sides without duplicates", () => {
    const current = { home: ["Alice"], away: ["Bob"] };
    const updatedHome = addMatchSub(current, "HOME", "Charlie");
    expect(updatedHome.subsByTeam.home).toEqual(["Alice", "Charlie"]);
    expect(updatedHome.subs).toContain("Charlie");

    const deduplicated = addMatchSub(updatedHome.subsByTeam, "HOME", "Alice");
    expect(deduplicated.subsByTeam.home).toEqual(["Alice", "Charlie"]);

    const updatedAway = addMatchSub(deduplicated.subsByTeam, "AWAY", "Dave");
    expect(updatedAway.subsByTeam.away).toEqual(["Bob", "Dave"]);
  });
});
