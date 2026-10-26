import {
  collection, doc, getDoc, getDocs, limit, onSnapshot, query, where,
  type DocumentData, type FirestoreError, type QueryConstraint, type QuerySnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { getCurrentSeasonId, INITIAL_SEASON_ID } from "./leagueSeasons";

type CacheEntry<T> = {
  promise: Promise<T>;
  expiresAt: number;
};

const leagueCache = new Map<string, CacheEntry<unknown>>();
let hasAttachedListeners = false;

function ensureListenersAttached() {
  if (hasAttachedListeners || typeof window === "undefined") return;
  hasAttachedListeners = true;
  window.addEventListener("storage", () => invalidateLeagueData());
  window.addEventListener("flagos-public-data-changed", () => invalidateLeagueData());
}

/**
 * Invalidate cached league requests.
 * If leagueId is specified, only entries matching that leagueId are evicted.
 * If omitted, all league cache entries are evicted.
 */
export function invalidateLeagueData(leagueId?: string): void {
  if (!leagueId) {
    leagueCache.clear();
    return;
  }
  for (const key of Array.from(leagueCache.keys())) {
    if (key.split(":")[1] === leagueId) {
      leagueCache.delete(key);
    }
  }
}

/**
 * Dispatch a notification across the app that public data has changed.
 * Evicts local caches and notifies other tabs via storage/custom events.
 */
export function notifyDataChanged(leagueId?: string): void {
  invalidateLeagueData(leagueId);
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("flagos-public-data-changed", { detail: { leagueId } }));
    } catch {}
  }
}

/**
 * Core caching wrapper for league queries.
 * Deduplicates concurrent requests and caches resolved data for ttlMs (default: 60s).
 */
export function cachedLeagueRequest<T>(
  key: string,
  load: () => Promise<T>,
  ttlMs = 60_000
): Promise<T> {
  ensureListenersAttached();

  const existing = leagueCache.get(key);
  if (existing && existing.expiresAt > Date.now()) {
    return existing.promise as Promise<T>;
  }

  const entry: CacheEntry<T> = {
    promise: Promise.resolve() as unknown as Promise<T>,
    expiresAt: Infinity,
  };

  entry.promise = load().then(
    (value) => {
      entry.expiresAt = Date.now() + ttlMs;
      return value;
    },
    (error: unknown) => {
      if (leagueCache.get(key) === (entry as CacheEntry<unknown>)) {
        leagueCache.delete(key);
      }
      throw error;
    }
  );

  leagueCache.set(key, entry as CacheEntry<unknown>);
  return entry.promise;
}

export async function getCachedLeagueTeams(leagueId: string): Promise<any[]> {
  return cachedLeagueRequest(`teams:${leagueId}`, async () => {
    const snap = await getDocs(
      query(collection(db, "teams"), where("leagueId", "==", leagueId), limit(64))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });
}

export async function getCachedLeaguePlayers(leagueId: string): Promise<any[]> {
  return cachedLeagueRequest(`players:${leagueId}`, async () => {
    const snap = await getDocs(
      query(collection(db, "players"), where("leagueId", "==", leagueId), limit(1920))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });
}

/** The league's live season, read from the league document (falls back to the first season). */
export async function getCachedLeagueSeasonId(leagueId: string): Promise<string> {
  return cachedLeagueRequest(`season:${leagueId}`, async () => {
    try {
      const snap = await getDoc(doc(db, "leagues", leagueId));
      return getCurrentSeasonId(snap.exists() ? snap.data() : null);
    } catch {
      return INITIAL_SEASON_ID;
    }
  });
}

/**
 * Query filter for one season's games and plays. First-season records predate season IDs,
 * and while the first season is live every record belongs to it, so it needs no filter.
 */
export function seasonConstraints(seasonId: string): QueryConstraint[] {
  return seasonId && seasonId !== INITIAL_SEASON_ID ? [where("seasonId", "==", seasonId)] : [];
}

/** Live listener for a league's visible current-season games. Returns an unsubscribe function. */
export function subscribeLeagueSeasonMatches(
  leagueId: string,
  onData: (snap: QuerySnapshot<DocumentData>) => void,
  onError: (error: FirestoreError) => void,
  seasonId?: string,
): () => void {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;
  Promise.resolve(seasonId || getCachedLeagueSeasonId(leagueId)).then((season) => {
    if (cancelled) return;
    unsubscribe = onSnapshot(query(
      collection(db, "matches"),
      where("leagueId", "==", leagueId),
      ...seasonConstraints(season),
      where("isHidden", "!=", true),
      limit(512),
    ), onData, onError);
  });
  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

/** Every current-season game document (including hidden ones) for schedule replacement. */
export async function getLeagueSeasonMatchDocs(leagueId: string) {
  const season = await getCachedLeagueSeasonId(leagueId);
  const snap = await getDocs(query(
    collection(db, "matches"),
    where("leagueId", "==", leagueId),
    ...seasonConstraints(season),
    limit(512),
  ));
  return snap.docs;
}

/** Current-season games for a league (pass seasonId to skip the league lookup). */
export async function getCachedLeagueMatches(leagueId: string, seasonId?: string): Promise<any[]> {
  const season = seasonId || await getCachedLeagueSeasonId(leagueId);
  return cachedLeagueRequest(`matches:${leagueId}:${season}`, async () => {
    const snap = await getDocs(
      query(
        collection(db, "matches"),
        where("leagueId", "==", leagueId),
        ...seasonConstraints(season),
        where("isHidden", "!=", true),
        limit(512)
      )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });
}

/** Current-season plays for a league (pass seasonId to skip the league lookup). */
export async function getCachedLeaguePlays(leagueId: string, seasonId?: string): Promise<any[]> {
  const season = seasonId || await getCachedLeagueSeasonId(leagueId);
  return cachedLeagueRequest(`plays:${leagueId}:${season}`, async () => {
    const snap = await getDocs(
      query(
        collection(db, "plays"),
        where("leagueId", "==", leagueId),
        ...seasonConstraints(season),
        where("isHidden", "!=", true),
        limit(10_000)
      )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });
}

export async function getCachedLeaguesDirectory(): Promise<{ leagues: any[]; teamsCountMap: Record<string, number> }> {
  return cachedLeagueRequest("directory:leagues", async () => {
    const leaguesSnap = await getDocs(query(collection(db, "leagues"), limit(100)));
    const teamsCountMap: Record<string, number> = {};
    let countsAreAuthoritative = false;
    try {
      const response = await fetch("/api/public/league-team-counts");
      if (!response.ok) throw new Error(`Team counts unavailable (${response.status})`);
      const body = await response.json() as { counts?: Record<string, number> };
      Object.assign(teamsCountMap, body.counts || {});
      countsAreAuthoritative = true;
    } catch {
      // Fall back to the teams this account can list directly.
      try {
      const teamsSnap = await getDocs(query(collection(db, "teams"), limit(300)));
      if (teamsSnap && Array.isArray(teamsSnap.docs)) {
        teamsSnap.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const lid = data.leagueId;
          if (lid) {
            teamsCountMap[lid] = (teamsCountMap[lid] || 0) + 1;
          }
        });
      }
      } catch {
        // ignore team count query errors in mocked/offline modes
      }
    }

    const leagues = leaguesSnap.docs
      .map((docSnap) => {
        const data = docSnap.data() as Record<string, any>;
        return {
          id: docSnap.id,
          ...data,
          teamCount: countsAreAuthoritative ? teamsCountMap[docSnap.id] ?? 0 :
            teamsCountMap[docSnap.id] ??
            data.teamCount ??
            data.subscription?.teamCount ??
            0,
        };
      })
      .filter((l: Record<string, any>) => l.visibility !== "private" && l.id !== "league_private_live");

    return { leagues, teamsCountMap };
  }, 60_000);
}
