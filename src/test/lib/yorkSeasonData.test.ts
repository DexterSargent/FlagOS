import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDocs } from "firebase/firestore";
import { loadYorkSeasonData } from "@/lib/yorkSeasonData";
import { YORK_LIONS_MATCHES, YORK_LIONS_PLAYS, saveYorkPlay } from "@/lib/yorkTeamData";

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name) => name),
  query: vi.fn((...args) => args),
  where: vi.fn((...args) => args),
  limit: vi.fn((value) => value),
  getDocs: vi.fn(),
}));

const snapshot = (records: Array<{ id: string }>) => ({
  docs: records.map((record) => ({ id: record.id, data: () => record })),
});

describe("York shared season data", () => {
  beforeEach(() => {
    vi.mocked(getDocs).mockReset();
  });

  it("merges shared matches and plays with seed and local records across fresh sessions", async () => {
    const match = { ...YORK_LIONS_MATCHES[0], id: "shared-independent-game", homeScore: 6 };
    const play = { ...YORK_LIONS_PLAYS[0], id: "shared-touchdown", matchId: match.id, isTouchdown: true };
    const local = { ...YORK_LIONS_PLAYS[0], id: "offline-touchdown" };
    saveYorkPlay(local.matchId, local);
    vi.mocked(getDocs)
      .mockResolvedValueOnce(snapshot([...YORK_LIONS_MATCHES, match]) as Awaited<ReturnType<typeof getDocs>>)
      .mockResolvedValueOnce(snapshot([]) as Awaited<ReturnType<typeof getDocs>>)
      .mockResolvedValueOnce(snapshot([]) as Awaited<ReturnType<typeof getDocs>>)
      .mockResolvedValueOnce(snapshot([play]) as Awaited<ReturnType<typeof getDocs>>);
    const season = await loadYorkSeasonData();
    expect(season.matches.find((record) => record.id === match.id)?.homeScore).toBe(6);
    expect(season.plays.some((record) => record.id === play.id)).toBe(true);
    expect(season.plays.some((record) => record.id === local.id)).toBe(true);
    expect(season.plays.some((record) => record.id === YORK_LIONS_PLAYS[0].id)).toBe(true);
  });

  it("excludes remotely hidden seed matches and their plays", async () => {
    const hidden = YORK_LIONS_MATCHES[0];
    vi.mocked(getDocs).mockResolvedValue(snapshot([]) as Awaited<ReturnType<typeof getDocs>>);
    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [{ id: hidden.id, data: () => ({ ...hidden, isHidden: true }) }],
    } as Awaited<ReturnType<typeof getDocs>>);
    const season = await loadYorkSeasonData();
    expect(season.matches.some((record) => record.id === hidden.id)).toBe(false);
    expect(season.plays.some((record) => record.matchId === hidden.id)).toBe(false);
  });
});
