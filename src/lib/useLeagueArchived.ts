"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLeague } from "@/lib/leagueContext";
import { useAuth } from "@/lib/authContext";

/**
 * Whether the given league is archived (read-only). Uses the active league context when
 * possible and otherwise reads the league document, so team and match pages can hide
 * write controls that the server would reject.
 */
export function useLeagueArchived(leagueId: string | null | undefined): boolean {
  const { activeLeagueId, isLeagueArchived } = useLeague();
  const { user } = useAuth();
  const isActive = !!leagueId && leagueId === activeLeagueId;
  const [fetched, setFetched] = useState<{ id: string; archived: boolean } | null>(null);

  useEffect(() => {
    if (!leagueId || isActive || !user) return;
    let cancelled = false;
    getDoc(doc(db, "leagues", leagueId))
      .then((snap) => {
        if (cancelled) return;
        const data = snap.data();
        setFetched({
          id: leagueId,
          archived: Boolean(data && (data.isArchived === true || data.seasonStatus === "archived")),
        });
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
export function isTeamSeasonArchived(team: { isArchived?: unknown; seasonStatus?: unknown } | null | undefined): boolean {
  return Boolean(team && (team.isArchived === true || team.seasonStatus === "archived"));
}

/** Reads a team's archived-season flag, for pages that only know the team ID (e.g. match pages). */
export function useTeamSeasonArchived(teamId: string | null | undefined): boolean {
  const { user } = useAuth();
  const [fetched, setFetched] = useState<{ id: string; archived: boolean } | null>(null);

  useEffect(() => {
    if (!teamId || !user) return;
    let cancelled = false;
    getDoc(doc(db, "teams", teamId))
      .then((snap) => {
        if (!cancelled) setFetched({ id: teamId, archived: isTeamSeasonArchived(snap.data()) });
      })
      .catch(() => {
        if (!cancelled) setFetched({ id: teamId, archived: false });
      });
    return () => { cancelled = true; };
  }, [teamId, user]);

  return !!teamId && fetched?.id === teamId ? fetched.archived : false;
}
