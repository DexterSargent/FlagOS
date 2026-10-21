import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDocs } from "firebase/firestore";
import { loadYorkMatches, loadYorkMatchPlays, loadYorkSeasonData } from "@/lib/yorkSeasonData";
import { invalidatePublicTeamData } from "@/lib/publicTeamCache";

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name) => name),
  query: vi.fn((...args) => args),
  where: vi.fn((...args) => args),
  limit: vi.fn((value) => value),
  getDocs: vi.fn(),
}));

const snapshot = (records: Array<Record<string, unknown> & { id: string }>) => ({
  docs: records.map((record) => ({ id: record.id, data: () => record })),
}) as Awaited<ReturnType<typeof getDocs>>;

const match = { id: "shared-game", homeTeamId: "york_lions", date: "2026-10-18" };

describe("York scoped public data loading", () => {
  beforeEach(() => {
    vi.mocked(getDocs).mockReset();
    invalidatePublicTeamData();
  });

  function mockMatches() {
    vi.mocked(getDocs)
      .mockResolvedValueOnce(snapshot([match]))
      .mockResolvedValueOnce(snapshot([]))
      .mockResolvedValueOnce(snapshot([]));
  }

  it("loads schedule matches without requesting any plays or fixtures", async () => {
    mockMatches();
    expect(await loadYorkMatches()).toEqual([match]);
    expect(getDocs).toHaveBeenCalledTimes(3);
    for (const [request] of vi.mocked(getDocs).mock.calls) {
      expect(request).toContain("matches");
      expect(request).not.toContain("plays");
    }
  });

  it("deduplicates concurrent and recently completed requests", async () => {
    mockMatches();
    const [first, second] = await Promise.all([loadYorkMatches(), loadYorkMatches()]);
    expect(first).toEqual(second);
    await loadYorkMatches();
    expect(getDocs).toHaveBeenCalledTimes(3);
  });

  it("revalidates after a successful mutation or returning to the tab", async () => {
    mockMatches();
    await loadYorkMatches();
    window.dispatchEvent(new Event("flagos-york-data-changed"));
    mockMatches();
    await loadYorkMatches();
    expect(getDocs).toHaveBeenCalledTimes(6);
    window.dispatchEvent(new Event("focus"));
    mockMatches();
    await loadYorkMatches();
    expect(getDocs).toHaveBeenCalledTimes(9);
  });

  it("does not resurrect hidden, deleted or local fixture records", async () => {
    vi.mocked(getDocs).mockResolvedValue(snapshot([]));
    expect(await loadYorkSeasonData()).toEqual({ matches: [], plays: [] });
    expect(getDocs).toHaveBeenCalledTimes(3);
  });

  it("excludes hidden and removed matches even when returned by another ownership query", async () => {
    vi.mocked(getDocs)
      .mockResolvedValueOnce(snapshot([match, { id: "match_york_western" }]))
      .mockResolvedValueOnce(snapshot([{ ...match, isHidden: true }]))
      .mockResolvedValueOnce(snapshot([]));
    expect(await loadYorkMatches()).toEqual([]);
  });

  it("only downloads the requested game's plays", async () => {
    mockMatches();
    const play = { id: "corrected-play", matchId: match.id };
    vi.mocked(getDocs).mockResolvedValueOnce(snapshot([play]));
    expect(await loadYorkMatchPlays(match.id)).toEqual([play]);
    expect(vi.mocked(getDocs).mock.calls[3][0]).toContainEqual(["matchId", "==", match.id]);
  });

  it("rejects a game outside York ownership before querying plays", async () => {
    mockMatches();
    await expect(loadYorkMatchPlays("another-team-game")).rejects.toThrow("not an active York match");
    expect(getDocs).toHaveBeenCalledTimes(3);
  });

  it("surfaces errors and retries failed requests rather than caching a false empty season", async () => {
    vi.mocked(getDocs).mockRejectedValue(new Error("Offline"));
    await expect(loadYorkMatches()).rejects.toThrow("Offline");
    vi.mocked(getDocs).mockReset();
    mockMatches();
    expect(await loadYorkMatches()).toEqual([match]);
  });
});
