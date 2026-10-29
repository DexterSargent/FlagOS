"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLeague } from "@/lib/leagueContext";
import { useAuth } from "@/lib/authContext";
import { loadTeamRecord } from "@/lib/teamRecord";

const leagueArchivedCache = new Map<string, boolean>();
const leagueArchivedPending = new Map<string, Promise<boolean>>();

export function loadLeagueArchived(leagueId: string): Promise<boolean> {
  if (leagueArchivedCache.has(leagueId)) {
    return Promise.resolve(leagueArchivedCache.get(leagueId)!);
  }
  const inflight = leagueArchivedPending.get(leagueId);
  if (inflight) return inflight;
  const promise = getDoc(doc(db, "leagues", leagueId))
    .then((snap) => {
      const data = snap.data();
      const archived = Boolean(data && (data.isArchived === true || data.seasonStatus === "archived"));
      leagueArchivedCache.set(leagueId, archived);
      return archived;
    })
    .catch(() => false)
    .finally(() => {
      leagueArchivedPending.delete(leagueId);
    });
  leagueArchivedPending.set(leagueId, promise);
  return promise;
}

export function invalidateLeagueArchivedCache(leagueId?: string): void {
  if (!leagueId) {
    leagueArchivedCache.clear();
  } else {
    leagueArchivedCache.delete(leagueId);
  }
}

/**
 * Whether the given league is archived (read-only). Uses the active league context when
 * possible and otherwise reads the league document, so team and match pages can hide
 * write controls that the server would reject.
 */
export function useLeagueArchived(leagueId: string | null | undefined): boolean {
  const { activeLeagueId, isLeagueArchived } = useLeague();
  const { user } = useAuth();
  const isActive = !!leagueId && leagueId === activeLeagueId;
  const [fetched, setFetched] = useState<{ id: string; archived: boolean } | null>(() => {
    if (leagueId && leagueArchivedCache.has(leagueId)) {
      return { id: leagueId, archived: leagueArchivedCache.get(leagueId)! };
    }
    return null;
  });

  useEffect(() => {
    if (!leagueId || isActive || !user) return;
    let cancelled = false;
    loadLeagueArchived(leagueId)
      .then((archived) => {
        if (!cancelled) {
          setFetched({ id: leagueId, archived });
        }
      })
      .catch(() => {
        if (!cancelled) setFetched({ id: leagueId, archived: false });
      });
    return () => { cancelled = true; };
  }, [leagueId, isActive, user]);

  if (!leagueId) return false;
  if (isActive) return isLeagueArchived;
  return fetched?.id === leagueId ? fetched.archived : false;
}

/** Independent teams archive their own season on the team document. */
export function isTeamSeasonArchived(team: { isArchived?: unknown; seasonStatus?: unknown; [key: string]: any } | null | undefined): boolean {
  return Boolean(team && (team.isArchived === true || team.seasonStatus === "archived"));
}

/** Reads a team's archived-season flag, for pages that only know the team ID (e.g. match pages). */
export function useTeamSeasonArchived(teamId: string | null | undefined): boolean {
  const { user } = useAuth();
  const [fetched, setFetched] = useState<{ id: string; archived: boolean } | null>(null);

  useEffect(() => {
    if (!teamId || !user) return;
    let cancelled = false;
    loadTeamRecord(teamId)
      .then((team) => {
        if (!cancelled) setFetched({ id: teamId, archived: isTeamSeasonArchived(team) });
      })
      .catch(() => {
        if (!cancelled) setFetched({ id: teamId, archived: false });
      });
    return () => { cancelled = true; };
  }, [teamId, user]);

  return !teamId ? false : fetched?.id === teamId ? fetched.archived : false;
}
