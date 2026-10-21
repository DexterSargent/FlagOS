"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export type TeamRecord = { id: string; [key: string]: any };

const STORAGE_PREFIX = "flagos_team_record_";
const MATCH_TEAM_PREFIX = "flagos_match_team_";
const records = new Map<string, TeamRecord | null>();
const pending = new Map<string, Promise<TeamRecord | null>>();

export { isDemoMatchId, isDemoTeamId, isStandaloneTeam } from "./demoSandboxRuntime";

function storageGet(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") localStorage.setItem(key, value);
  } catch {}
}

export function getCachedTeamRecord(teamId?: string | null): TeamRecord | null {
  if (!teamId) return null;
  if (records.has(teamId)) return records.get(teamId) || null;
  const stored = storageGet(STORAGE_PREFIX + teamId);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as TeamRecord;
    records.set(teamId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function rememberTeamRecord(team: TeamRecord): void {
  const merged = { ...(getCachedTeamRecord(team.id) || {}), ...team };
  records.set(team.id, merged);
  // Large logo data URLs are kept in memory only.
  const { logoUrl, ...persisted } = merged;
  void logoUrl;
  storageSet(STORAGE_PREFIX + team.id, JSON.stringify(persisted));
}

export function loadTeamRecord(teamId: string): Promise<TeamRecord | null> {
  const inflight = pending.get(teamId);
  if (inflight) return inflight;
  const request = getDoc(doc(db, "teams", teamId))
    .then((snapshot) => {
      if (!snapshot.exists()) return null;
      const team = { ...snapshot.data(), id: snapshot.id } as TeamRecord;
      rememberTeamRecord(team);
      return records.get(teamId) || team;
    })
    .finally(() => pending.delete(teamId));
  pending.set(teamId, request);
  return request;
}

export function getCachedMatchTeamId(matchId: string): string | null {
  return storageGet(MATCH_TEAM_PREFIX + matchId);
}

export async function loadMatchTeamId(matchId: string): Promise<string | null> {
  const snapshot = await getDoc(doc(db, "matches", matchId));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  const teamId = [data.managingTeamId, data.homeTeamId, data.awayTeamId]
    .find((value) => typeof value === "string" && value && !value.startsWith("opponent_")) as string | undefined;
  if (teamId) storageSet(MATCH_TEAM_PREFIX + matchId, teamId);
  return teamId || null;
}

/** Resolves a real team document, painting the last cached copy first. */
export function useTeamRecord(teamId?: string | null, enabled = true): { team: TeamRecord | null; resolved: boolean } {
  const [state, setState] = useState(() => ({
    teamId,
    team: enabled ? getCachedTeamRecord(teamId) : null,
    resolved: false,
  }));
  const current = state.teamId === teamId ? state : { teamId, team: enabled ? getCachedTeamRecord(teamId) : null, resolved: false };

  useEffect(() => {
    if (!enabled || !teamId) return;
    let cancelled = false;
    loadTeamRecord(teamId)
      .then((team) => {
        if (!cancelled) setState({ teamId, team, resolved: true });
      })
      .catch(() => {
        if (!cancelled) setState((prev) => ({ teamId, team: prev.teamId === teamId ? prev.team : null, resolved: true }));
      });
    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail && typeof detail === "object" && (!detail.id || detail.id === teamId)) {
        rememberTeamRecord({ ...detail, id: teamId });
        setState((prev) => prev.teamId === teamId
          ? { ...prev, team: { ...(prev.team || { id: teamId }), ...detail } }
          : prev);
      }
    };
    window.addEventListener("flagos_team_updated", handleUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("flagos_team_updated", handleUpdate);
    };
  }, [teamId, enabled]);

  return { team: current.team, resolved: current.resolved };
}
