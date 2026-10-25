import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { getPlayScoreDelta } from "@/lib/playScoring";
import { addMatchSub, getMatchSubsByTeam } from "@/lib/matchRoster";
import { projectGameClock, useWallClockCountdown } from "@/lib/wallClock";

describe("stat keeper scoring helpers", () => {
  it("credits touchdowns and conversions to the offense", () => {
    expect(getPlayScoreDelta({ possessionTeamId: "home", isTouchdown: true, pointsScored: 8 }, "home")).toEqual({ home: 8, away: 0 });
    expect(getPlayScoreDelta({ possessionTeamId: "away", isTouchdown: true }, "home")).toEqual({ home: 0, away: 6 });
  });

  it("credits pick-6 and safety points to the defence", () => {
    expect(getPlayScoreDelta({ possessionTeamId: "away", isPick6: true, pointsScored: 7 }, "home")).toEqual({ home: 7, away: 0 });
    expect(getPlayScoreDelta({ possessionTeamId: "home", isSafety: true }, "home")).toEqual({ home: 0, away: 2 });
    expect(getPlayScoreDelta({ possessionTeamId: "home", result: "Next Down" }, "home")).toEqual({ home: 0, away: 0 });
  });
});

describe("match subs", () => {
  it("keeps subs on the team they were added to", () => {
    const first = addMatchSub({ home: [], away: [] }, "HOME", "Sam");
    const second = addMatchSub(first.subsByTeam, "AWAY", "Lee");
    expect(second.subsByTeam).toEqual({ home: ["Sam"], away: ["Lee"] });
    expect(second.subs).toEqual(["Sam", "Lee"]);
    expect(getMatchSubsByTeam(second)).toEqual({ home: ["Sam"], away: ["Lee"] });
  });

  it("falls back to the legacy flat list for both sides", () => {
    expect(getMatchSubsByTeam({ subs: ["Old"] })).toEqual({ home: ["Old"], away: ["Old"] });
  });
});

describe("projectGameClock", () => {
  it("runs the saved clock forward only while running", () => {
    expect(projectGameClock({ gameClock: 300, gameClockRunning: true, gameClockSavedAt: 1_000 }, 8_500)).toBe(293);
    expect(projectGameClock({ gameClock: 300, gameClockRunning: false, gameClockSavedAt: 1_000 }, 8_500)).toBe(300);
    expect(projectGameClock({ gameClock: 5, gameClockRunning: true, gameClockSavedAt: 0 }, 1_000)).toBe(5);
    expect(projectGameClock({ gameClock: 5, gameClockRunning: true, gameClockSavedAt: 1 }, 30_000)).toBe(0);
  });

  it("caps projection when the scorekeeper goes quiet", () => {
    expect(projectGameClock({ gameClock: 600, gameClockRunning: true, gameClockSavedAt: 1 }, 1 + 10 * 60_000)).toBe(540);
  });
});

describe("useWallClockCountdown", () => {
  it("catches up after throttled timers and stops at zero", () => {
    vi.useFakeTimers();
    const onZero = vi.fn();
    const { result } = renderHook(() => {
      const [value, setValue] = useState(10);
      useWallClockCountdown(value, setValue, true, onZero);
      return { value, setValue };
    });
    // Simulate a locked phone: wall time jumps 4s while only one timer fires.
    act(() => {
      vi.setSystemTime(Date.now() + 4_000);
      vi.advanceTimersByTime(200);
    });
    expect(result.current.value).toBe(6);
    act(() => result.current.setValue(25));
    act(() => { vi.advanceTimersByTime(2_000); });
    expect(result.current.value).toBe(23);
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(result.current.value).toBe(0);
    expect(onZero).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
