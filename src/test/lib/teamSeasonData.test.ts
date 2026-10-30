import { describe, it, expect, vi } from "vitest";
import {
  loadTeamManagedMatches,
  loadTeamMatchPlays,
  loadTeamSeasonData,
} from "@/lib/teamSeasonData";
import { getDoc, getDocs } from "firebase/firestore";

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name) => ({ path: name })),
  doc: vi.fn((_db, name, id) => ({ path: `${name}/${id}` })),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => undefined })),
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

  it("scopes independent season data to the team's current season by default", async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        currentSeasonId: "season-2-x",
        seasons: [
          { id: "season-1", title: "Spring", status: "archived", number: 1 },
          { id: "season-2-x", title: "Fall", status: "active", number: 2 },
        ],
      }),
    } as any);
    vi.mocked(getDocs)
      .mockResolvedValueOnce({
        docs: [
          { id: "old", data: () => ({ managingTeamId: "team_indep" }) },
          { id: "legacy", data: () => ({ managingTeamId: "team_indep", seasonId: "season-1" }) },
          { id: "new", data: () => ({ managingTeamId: "team_indep", seasonId: "season-2-x" }) },
        ],
      } as any)
      .mockResolvedValueOnce({ docs: [{ id: "p-new", data: () => ({}) }] } as any);

    const seasonData = await loadTeamSeasonData("team_indep");
    expect(seasonData.matches.map((m) => m.id)).toEqual(["new"]);
    expect(seasonData.plays.map((p) => p.id)).toEqual(["p-new"]);
  });

  it("loads every season when seasonId is null", async () => {
    vi.mocked(getDocs)
      .mockResolvedValueOnce({
        docs: [
          { id: "old", data: () => ({ managingTeamId: "team_indep" }) },
          { id: "new", data: () => ({ managingTeamId: "team_indep", seasonId: "season-2-x" }) },
        ],
      } as any)
      .mockResolvedValueOnce({ docs: [] } as any)
      .mockResolvedValueOnce({ docs: [] } as any);

    const seasonData = await loadTeamSeasonData("team_indep", { seasonId: null });
    expect(seasonData.matches).toHaveLength(2);
    expect(getDoc).not.toHaveBeenCalled();
  });
});
