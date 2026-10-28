import { describe, it, expect, vi } from "vitest";
import {
  matchPlayConstraints,
  sortPlaysChronologically,
  fetchMatchPlays,
  subscribeMatchPlays,
  describePlaysError,
} from "@/lib/matchPlaysQuery";
import { getDocs, onSnapshot } from "firebase/firestore";

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name) => ({ path: name })),
  query: vi.fn((coll, ...constraints) => ({ coll, constraints })),
  where: vi.fn((field, op, value) => ({ field, op, value })),
  limit: vi.fn((num) => ({ limit: num })),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  db: {},
}));

describe("matchPlaysQuery", () => {
  it("builds query constraints with leagueId and visibleOnly", () => {
    const constraints = matchPlayConstraints("match_1", {
      leagueId: "league_a",
      isHidden: false,
    });
    expect(constraints).toHaveLength(4); // matchId, leagueId, isHidden, limit
    expect(constraints[0]).toEqual({ field: "matchId", op: "==", value: "match_1" });
    expect(constraints[1]).toEqual({ field: "leagueId", op: "==", value: "league_a" });
    expect(constraints[2]).toEqual({ field: "isHidden", op: "==", value: false });
  });

  it("builds constraints with managingTeamId and homeTeamId fallback when no leagueId", () => {
    const constraintsManaging = matchPlayConstraints("match_2", {
      managingTeamId: "team_m",
      isHidden: false,
    });
    expect(constraintsManaging).toEqual([
      { field: "matchId", op: "==", value: "match_2" },
      { field: "managingTeamId", op: "==", value: "team_m" },
      { field: "isHidden", op: "==", value: false },
      { limit: 500 },
    ]);

    const constraintsHome = matchPlayConstraints("match_3", {
      homeTeamId: "team_h",
      isHidden: true,
    });
    expect(constraintsHome).toEqual([
      { field: "matchId", op: "==", value: "match_3" },
      { field: "managingTeamId", op: "==", value: "team_h" },
      { limit: 500 },
    ]);
  });

  it("sorts plays chronologically supporting multiple timestamp formats", () => {
    const plays = [
      { id: "p1", timestamp: { toMillis: () => 5000 } },
      { id: "p2", timestamp: { seconds: 1 } }, // 1000ms
      { id: "p3", timestamp: { toMillis: () => 3000 } }, // 3000ms
      { id: "p4", timestamp: null }, // 0ms
    ];

    const sorted = sortPlaysChronologically(plays);
    expect(sorted.map((p) => p.id)).toEqual(["p4", "p2", "p3", "p1"]);
  });

  it("fetches match plays and returns sorted documents", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [
        { id: "play_2", data: () => ({ name: "Play 2", timestamp: { seconds: 2 } }) },
        { id: "play_1", data: () => ({ name: "Play 1", timestamp: { seconds: 1 } }) },
      ],
    } as any);

    const result = await fetchMatchPlays("match_1", { leagueId: "league_1" });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("play_1");
    expect(result[1].id).toBe("play_2");
  });

  it("subscribes to match plays and invokes callbacks", () => {
    let snapshotCb: any;
    vi.mocked(onSnapshot).mockImplementationOnce((_q, onNext: any) => {
      snapshotCb = onNext;
      return () => {};
    });

    const onPlays = vi.fn();
    const onError = vi.fn();
    const unsub = subscribeMatchPlays("match_1", { leagueId: "l1" }, onPlays, onError);

    snapshotCb({
      docs: [{ id: "doc_1", data: () => ({ action: "pass" }) }],
    });

    expect(onPlays).toHaveBeenCalledWith([{ id: "doc_1", action: "pass" }]);
    expect(typeof unsub).toBe("function");
  });

  it("describes permission and network errors appropriately", () => {
    expect(describePlaysError({ code: "permission-denied" }, true)).toBe("You don't have access to this game's plays.");
    expect(describePlaysError({ code: "permission-denied" }, false)).toBe("Sign in to see this game's plays.");
    expect(describePlaysError(new Error("Network failed"), true)).toBe("Couldn't load plays. Check your connection and try again.");
  });
});
