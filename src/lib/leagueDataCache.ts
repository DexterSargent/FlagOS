import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "./firebase";

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
    if (key.startsWith(`${leagueId}:`)) {
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

export async function getCachedLeagueMatches(leagueId: string): Promise<any[]> {
  return cachedLeagueRequest(`matches:${leagueId}`, async () => {
    const snap = await getDocs(
      query(
        collection(db, "matches"),
        where("leagueId", "==", leagueId),
        where("isHidden", "!=", true),
        limit(512)
      )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });
}

export async function getCachedLeaguePlays(leagueId: string): Promise<any[]> {
  return cachedLeagueRequest(`plays:${leagueId}`, async () => {
    const snap = await getDocs(
      query(
        collection(db, "plays"),
        where("leagueId", "==", leagueId),
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

    const leagues = leaguesSnap.docs
      .map((docSnap) => {
        const data = docSnap.data() as Record<string, any>;
        return {
          id: docSnap.id,
          ...data,
          teamCount:
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
