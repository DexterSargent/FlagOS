"use client";

import { useEffect, useRef } from "react";

/**
 * Counts a seconds value down from wall-clock time rather than by summing interval ticks, so the
 * clock stays accurate when timers are throttled (background tabs, locked phones, slow renders).
 * Any outside change to `value` (reset, manual adjustment) re-anchors the countdown.
 */
export function useWallClockCountdown(
  value: number,
  setValue: (next: number) => void,
  running: boolean,
  onZero?: () => void,
) {
  const anchorRef = useRef({ value, at: Date.now() });
  const emittedRef = useRef(value);
  const setValueRef = useRef(setValue);
  const onZeroRef = useRef(onZero);
  useEffect(() => {
    setValueRef.current = setValue;
    onZeroRef.current = onZero;
  });

  // Re-anchor as soon as the value changes from outside (reset, manual adjustment, reload).
  useEffect(() => {
    if (value === emittedRef.current) return;
    emittedRef.current = value;
    anchorRef.current = { value, at: Date.now() };
  }, [value]);

  useEffect(() => {
    if (!running) return;
    anchorRef.current = { value: emittedRef.current, at: Date.now() };

    const tick = () => {
      const { value: base, at } = anchorRef.current;
      const next = Math.max(0, base - Math.floor((Date.now() - at) / 1000));
      if (next === emittedRef.current) return;
      emittedRef.current = next;
      setValueRef.current(next);
      if (next === 0) onZeroRef.current?.();
    };

    const timer = setInterval(tick, 200);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [running]);
}

/** Viewers project a running game clock forward from the scorekeeper's last saved snapshot. */
export function projectGameClock(
  state: { gameClock?: number | null; gameClockRunning?: boolean; gameClockSavedAt?: number | null } | null | undefined,
  now: number,
  maxProjectionMs = 60_000,
): number | null {
  if (state?.gameClock == null) return null;
  const base = Number(state.gameClock);
  if (!state.gameClockRunning || !state.gameClockSavedAt) return base;
  const elapsed = Math.min(Math.max(0, now - state.gameClockSavedAt), maxProjectionMs);
  return Math.max(0, base - Math.floor(elapsed / 1000));
}
