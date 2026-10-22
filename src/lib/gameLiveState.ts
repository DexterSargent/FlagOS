"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";

/**
 * Game display states:
 * - live: started and a scorekeeper currently has the play-by-play manager open
 * - paused: started, but nobody is in the manager (it was exited or the device went idle)
 * - upcoming: pregame
 * - final: completed
 */
export type GameDisplayState = "live" | "paused" | "upcoming" | "final";

export const LIVE_HEARTBEAT_FIELD = "liveHeartbeatAt";
export const LIVE_HEARTBEAT_INTERVAL_MS = 20_000;
/** A few missed beats (slow network, backgrounded tab) before a game reads as paused. */
export const LIVE_HEARTBEAT_STALE_MS = 75_000;

export const GAME_STATE_LABEL: Record<GameDisplayState, string> = {
  live: "Live now",
  paused: "Paused",
  upcoming: "Upcoming",
  final: "Final",
};

type GameLike = { status?: unknown; liveHeartbeatAt?: unknown; simulatedScorekeeper?: unknown } | null | undefined;

/** Accepts Firestore Timestamps, serialized timestamps, Dates and epoch milliseconds. */
export function heartbeatMillis(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object") {
    const record = value as { toMillis?: () => number; seconds?: unknown; _seconds?: unknown; nanoseconds?: unknown };
    if (typeof record.toMillis === "function") return record.toMillis();
    const seconds = typeof record.seconds === "number" ? record.seconds : typeof record._seconds === "number" ? record._seconds : null;
    if (seconds !== null) return seconds * 1000;
  }
  return null;
}

export function isFinalGameStatus(status: unknown): boolean {
  return typeof status === "string" && (status === "completed" || status.toLowerCase() === "final");
}

export function isStartedGameStatus(status: unknown): boolean {
  return status === "in_progress" || status === "live";
}

export function getGameDisplayState(game: GameLike, now: number = Date.now()): GameDisplayState {
  const status = game?.status;
  if (isFinalGameStatus(status)) return "final";
  if (!isStartedGameStatus(status)) return "upcoming";
  // Demo-only: seeded showcase games behave as if a scorekeeper is active.
  if (game?.simulatedScorekeeper === true) return "live";
  const beat = heartbeatMillis(game?.liveHeartbeatAt);
  // Small allowance for a scorekeeper clock running slightly ahead of the viewer's.
  return beat !== null && now - beat < LIVE_HEARTBEAT_STALE_MS && beat - now < LIVE_HEARTBEAT_STALE_MS ? "live" : "paused";
}

/** Re-renders periodically so live games fall back to paused once the manager stops beating. */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

type HeartbeatWriter = (value: number | null) => Promise<unknown> | void;

/** Demo sandbox games keep the heartbeat in session storage; any real session ends the simulated scorekeeper. */
export function sandboxHeartbeatWriter(update: (data: Record<string, unknown>) => void): HeartbeatWriter {
  return (value) => update({ liveHeartbeatAt: value, simulatedScorekeeper: false });
}

function firestoreWriter(matchId: string): HeartbeatWriter {
  return (value) =>
    updateDoc(doc(db, "matches", matchId), { [LIVE_HEARTBEAT_FIELD]: value === null ? null : serverTimestamp() });
}

/**
 * Marks a started game as live while the play-by-play manager is open, and paused when it closes.
 * Pass a custom writer for sandboxed demo games.
 */
export function useLiveGameHeartbeat(matchId: string, active: boolean, writer?: HeartbeatWriter) {
  useEffect(() => {
    if (!matchId || !active) return;
    const write = writer || firestoreWriter(matchId);
    const send = (value: number | null) => {
      try {
        Promise.resolve(write(value)).catch((error: unknown) => console.warn("Live game heartbeat failed:", error));
      } catch (error) {
        console.warn("Live game heartbeat failed:", error);
      }
    };
    const beat = () => send(Date.now());
    const onVisibility = () => {
      if (document.visibilityState === "visible") beat();
    };
    const onPageHide = () => send(null);

    beat();
    const timer = setInterval(() => {
      if (document.visibilityState !== "hidden") beat();
    }, LIVE_HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      send(null);
    };
    // The writer is recreated by callers each render; the match and active flag define the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, active]);
}
