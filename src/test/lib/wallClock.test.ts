import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { projectGameClock, useWallClockCountdown } from "@/lib/wallClock";

describe("wallClock", () => {
  describe("projectGameClock", () => {
    it("returns null when state or gameClock is nullish", () => {
      expect(projectGameClock(null, Date.now())).toBeNull();
      expect(projectGameClock({ gameClock: null }, Date.now())).toBeNull();
    });

    it("returns base clock when not running or no saved timestamp", () => {
      expect(projectGameClock({ gameClock: 600, gameClockRunning: false }, Date.now())).toBe(600);
      expect(projectGameClock({ gameClock: 600, gameClockRunning: true, gameClockSavedAt: null }, Date.now())).toBe(600);
    });

    it("projects countdown forward based on elapsed time up to maxProjectionMs", () => {
      const savedAt = 1000000;
      // 5 seconds later
      expect(
        projectGameClock(
          { gameClock: 600, gameClockRunning: true, gameClockSavedAt: savedAt },
          savedAt + 5000
        )
      ).toBe(595);

      // Clamp to max projection (e.g. 60s default)
      expect(
        projectGameClock(
          { gameClock: 600, gameClockRunning: true, gameClockSavedAt: savedAt },
          savedAt + 120000
        )
      ).toBe(540);
    });
  });

  describe("useWallClockCountdown", () => {
    it("counts down when running and calls onZero at 0", () => {
      vi.useFakeTimers();
      const setValue = vi.fn();
      const onZero = vi.fn();

      renderHook(
        ({ running, value }) => useWallClockCountdown(value, setValue, running, onZero),
        {
          initialProps: { running: true, value: 2 },
        }
      );

      // Advance by 1 second
      act(() => {
        vi.advanceTimersByTime(1100);
      });
      expect(setValue).toHaveBeenCalledWith(1);

      // Advance by another second to hit 0
      act(() => {
        vi.advanceTimersByTime(1100);
      });
      expect(setValue).toHaveBeenCalledWith(0);
      expect(onZero).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
