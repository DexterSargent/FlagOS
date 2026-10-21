import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDocs, where } from "firebase/firestore";
import { loadStatKeeperHistory } from "@/lib/statKeeperHistory";
import { loadTeamSeasonData } from "@/lib/teamSeasonData";

vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(), query: vi.fn(), where: vi.fn(), limit: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
}));
vi.mock("@/lib/demoSandbox", () => ({
  getSandboxPlays: () => [{ id: "current", matchId: "demo" }, { id: "past", matchId: "older" }],
}));
vi.mock("@/lib/teamSeasonData", () => ({
  loadTeamSeasonData: vi.fn().mockResolvedValue({
    plays: [{ id: "current", matchId: "independent" }, { id: "past", matchId: "previous" }],
  }),
}));

describe("shared stat keeper history", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads an independent team's season even without a league ID and excludes current plays", async () => {
    expect(await loadStatKeeperHistory({ id: "independent", homeTeamId: "falcons", managingTeamId: "falcons" }, false)).toEqual([
      { id: "past", matchId: "previous" },
    ]);
    expect(loadTeamSeasonData).toHaveBeenCalledWith("falcons");
    expect(getDocs).not.toHaveBeenCalled();
  });

  it("loads demo history without querying production", async () => {
    expect(await loadStatKeeperHistory({ id: "demo" }, true)).toEqual([{ id: "past", matchId: "older" }]);
    expect(getDocs).not.toHaveBeenCalled();
  });

  it("queries explicitly visible league plays", async () => {
    await loadStatKeeperHistory({ id: "ordinary", leagueId: "league" }, false);
    expect(where).toHaveBeenCalledWith("isHidden", "==", false);
    expect(where).toHaveBeenCalledWith("leagueId", "==", "league");
  });
});
