import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({ doc: vi.fn(), updateDoc: vi.fn(), serverTimestamp: vi.fn() }));

import {
  getGameDisplayState,
  heartbeatMillis,
  sandboxHeartbeatWriter,
  useLiveGameHeartbeat,
  LIVE_HEARTBEAT_INTERVAL_MS,
  LIVE_HEARTBEAT_STALE_MS,
} from "@/lib/gameLiveState";

const NOW = 1_800_000_000_000;

describe("getGameDisplayState", () => {
  it("marks completed games final regardless of heartbeat", () => {
    expect(getGameDisplayState({ status: "completed", liveHeartbeatAt: NOW }, NOW)).toBe("final");
    expect(getGameDisplayState({ status: "Final" }, NOW)).toBe("final");
  });

  it("treats pregame statuses as upcoming", () => {
    for (const status of ["scheduled", "upcoming", undefined, ""]) {
      expect(getGameDisplayState({ status, liveHeartbeatAt: NOW }, NOW)).toBe("upcoming");
    }
  });

  it("is live only while the scorekeeper heartbeat is fresh", () => {
    expect(getGameDisplayState({ status: "in_progress", liveHeartbeatAt: NOW - 5_000 }, NOW)).toBe("live");
    expect(getGameDisplayState({ status: "in_progress", liveHeartbeatAt: NOW - LIVE_HEARTBEAT_STALE_MS - 1 }, NOW)).toBe("paused");
  });

  it("is paused when a started game has no scorekeeper", () => {
    expect(getGameDisplayState({ status: "in_progress" }, NOW)).toBe("paused");
    expect(getGameDisplayState({ status: "in_progress", liveHeartbeatAt: null }, NOW)).toBe("paused");
  });

  it("accepts Firestore and serialized timestamps", () => {
    expect(getGameDisplayState({ status: "in_progress", liveHeartbeatAt: { toMillis: () => NOW } }, NOW)).toBe("live");
    expect(getGameDisplayState({ status: "in_progress", liveHeartbeatAt: { seconds: NOW / 1000 } }, NOW)).toBe("live");
    expect(heartbeatMillis({ _seconds: 10 })).toBe(10_000);
    expect(heartbeatMillis(new Date(NOW))).toBe(NOW);
    expect(heartbeatMillis("soon")).toBeNull();
  });

  it("treats seeded demo games as live until a real session takes over", () => {
    expect(getGameDisplayState({ status: "in_progress", simulatedScorekeeper: true }, NOW)).toBe("live");
    expect(getGameDisplayState({ status: "in_progress", simulatedScorekeeper: false }, NOW)).toBe("paused");
  });
});

describe("useLiveGameHeartbeat", () => {
  afterEach(() => vi.useRealTimers());

  it("beats while the manager is open and clears the heartbeat when it closes", () => {
    vi.useFakeTimers();
    const writer = vi.fn();
    const { rerender, unmount } = renderHook(({ active }) => useLiveGameHeartbeat("m1", active, writer), {
      initialProps: { active: true },
    });
    expect(writer).toHaveBeenCalledTimes(1);
    expect(writer.mock.calls[0][0]).toEqual(expect.any(Number));

    vi.advanceTimersByTime(LIVE_HEARTBEAT_INTERVAL_MS * 2);
    expect(writer).toHaveBeenCalledTimes(3);

    rerender({ active: false });
    expect(writer).toHaveBeenLastCalledWith(null);
    const calls = writer.mock.calls.length;
    vi.advanceTimersByTime(LIVE_HEARTBEAT_INTERVAL_MS * 3);
    expect(writer).toHaveBeenCalledTimes(calls);
    unmount();
  });

  it("does nothing before the game starts", () => {
    const writer = vi.fn();
    renderHook(() => useLiveGameHeartbeat("m1", false, writer));
    expect(writer).not.toHaveBeenCalled();
  });

  it("clears the heartbeat when the page is closed", () => {
    const writer = vi.fn();
    renderHook(() => useLiveGameHeartbeat("m1", true, writer));
    window.dispatchEvent(new Event("pagehide"));
    expect(writer).toHaveBeenLastCalledWith(null);
  });

  it("ends the simulated demo scorekeeper when a sandbox session writes", () => {
    const update = vi.fn();
    sandboxHeartbeatWriter(update)(null);
    expect(update).toHaveBeenCalledWith({ liveHeartbeatAt: null, simulatedScorekeeper: false });
  });
});
