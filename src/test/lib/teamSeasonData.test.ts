import { describe, it, expect, vi } from "vitest";
import {
  loadTeamManagedMatches,
  loadTeamMatchPlays,
  loadTeamSeasonData,
} from "@/lib/teamSeasonData";
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

vi.mock("@/lib/publicTeamCache", () => ({
  cachedPublicTeamRequest: vi.fn((_key, fetcher) => fetcher()),
}));

describe("teamSeasonData", () => {
  it("loads team managed matches and team match plays", async () => {
    vi.mocked(getDocs)
      .mockResolvedValueOnce({
        docs: [
          { id: "match_10", data: () => ({ name: "Game 10", managingTeamId: "team_indep" }) },
        ],
      } as any)
      .mockResolvedValueOnce({
        docs: [
          { id: "play_10_1", data: () => ({ name: "Play 1", matchId: "match_10" }) },
        ],
      } as any);

    const matches = await loadTeamManagedMatches("team_indep");
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe("match_10");

    const plays = await loadTeamMatchPlays("match_10", "team_indep");
    expect(plays).toHaveLength(1);
    expect(plays[0].id).toBe("play_10_1");
  });

  it("loads complete team season data combining matches and plays", async () => {
    vi.mocked(getDocs)
      .mockResolvedValueOnce({
        docs: [
          { id: "m1", data: () => ({ name: "Match 1" }) },
          { id: "m2", data: () => ({ name: "Match 2" }) },
        ],
      } as any)
      .mockResolvedValueOnce({
        docs: [{ id: "p1", data: () => ({ name: "Play 1" }) }],
      } as any)
      .mockResolvedValueOnce({
        docs: [{ id: "p2", data: () => ({ name: "Play 2" }) }],
      } as any);

    const seasonData = await loadTeamSeasonData("team_indep");
    expect(seasonData.matches).toHaveLength(2);
    expect(seasonData.plays).toHaveLength(2);
    expect(seasonData.plays.map((p) => p.id)).toEqual(["p1", "p2"]);
  });
});
