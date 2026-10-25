"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { cachedLeagueRequest } from "./leagueDataCache";
import { parseSeasonSnapshot, SEASON_SNAPSHOT_COLLECTION, type SeasonSnapshot } from "./leagueSeasons";

export function getCachedSeasonSnapshots(leagueId: string): Promise<SeasonSnapshot[]> {
  return cachedLeagueRequest(`history:${leagueId}`, async () => {
    const snap = await getDocs(query(
      collection(db, SEASON_SNAPSHOT_COLLECTION),
      where("leagueId", "==", leagueId),
      limit(50),
    ));
    return snap.docs
      .map((record) => parseSeasonSnapshot(record.data()))
      .filter((snapshot): snapshot is SeasonSnapshot => !!snapshot)
      .sort((a, b) => a.number - b.number);
  });
}

/** Archived season snapshots for a league, oldest first. Skipped while the league has no past seasons. */
export function useLeagueSeasonHistory(leagueId: string, hasArchivedSeasons: boolean) {
  const [state, setState] = useState<{ key: string; snapshots: SeasonSnapshot[]; error: string }>({
    key: "", snapshots: [], error: "",
  });
  const key = hasArchivedSeasons && leagueId ? leagueId : "";

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    getCachedSeasonSnapshots(key).then(
      (snapshots) => { if (!cancelled) setState({ key, snapshots, error: "" }); },
      (error: unknown) => {
        console.warn("Could not load season history:", error);
        if (!cancelled) setState({ key, snapshots: [], error: "Past seasons could not be loaded." });
      },
    );
    return () => { cancelled = true; };
  }, [key]);

  if (!key) return { snapshots: [] as SeasonSnapshot[], loading: false, error: "" };
  return {
    snapshots: state.key === key ? state.snapshots : [],
    loading: state.key !== key,
    error: state.key === key ? state.error : "",
  };
}
