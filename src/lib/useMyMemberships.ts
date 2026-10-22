"use client";

import { useCallback, useEffect, useState } from "react";
import { requestPrivateData } from "@/lib/secureWrites";

export type MembershipTeamRole = "coach" | "player";

export interface MembershipGame {
  id: string;
  date: string;
  time: string;
  status: string;
  location: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  /** Epoch ms of the scorekeeper's last heartbeat; see getGameDisplayState for live vs paused. */
  liveHeartbeatAt?: number | null;
}

export interface TeamMembership {
  id: string;
  name: string;
  shortcode: string;
  leagueId: string;
  logoUrl: string;
  primaryColor: string;
  roles: MembershipTeamRole[];
  player: { id: string; name: string; number: string } | null;
  nextGame: MembershipGame | null;
  lastGame: MembershipGame | null;
}

export interface LeagueMembership {
  id: string;
  name: string;
  shortcode: string;
  seasonTitle: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  visibility: "public" | "private";
  isCommissioner: boolean;
  teams: TeamMembership[];
}

export interface Memberships {
  leagues: LeagueMembership[];
  independentTeams: TeamMembership[];
}

export const MEMBERSHIP_CACHE_PREFIX = "flagos_memberships_";

function readCache(uid: string): Memberships | null {
  try {
    const raw = localStorage.getItem(MEMBERSHIP_CACHE_PREFIX + uid);
    const parsed = raw ? (JSON.parse(raw) as Memberships) : null;
    return parsed && Array.isArray(parsed.leagues) && Array.isArray(parsed.independentTeams) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Server-verified leagues and teams for the signed-in account. Paints the last result for this
 * account immediately and revalidates in the background.
 */
export function useMyMemberships(uid: string | null | undefined) {
  const [state, setState] = useState<{ uid: string | null; data: Memberships | null; error: string; refreshing: boolean }>(
    { uid: null, data: null, error: "", refreshing: false },
  );
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    const cached = readCache(uid);
    setState((prev) => ({
      uid,
      data: cached || (prev.uid === uid ? prev.data : null),
      error: "",
      refreshing: true,
    }));
    requestPrivateData<Memberships>("memberships")
      .then((data) => {
        if (cancelled) return;
        try {
          localStorage.setItem(MEMBERSHIP_CACHE_PREFIX + uid, JSON.stringify(data));
        } catch {}
        setState({ uid, data, error: "", refreshing: false });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          refreshing: false,
          error: error instanceof Error ? error.message : "Unable to load your leagues and teams.",
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [uid, reloadKey]);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);
  const current = uid && state.uid === uid ? state : null;
  return {
    data: current?.data ?? null,
    loading: Boolean(uid) && !current?.data && !current?.error,
    refreshing: Boolean(current?.refreshing),
    error: current?.error ?? "",
    retry,
  };
}
