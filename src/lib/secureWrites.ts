"use client";

import { auth } from "@/lib/firebase";
import { invalidatePublicTeamData } from "@/lib/publicTeamCache";

export type SecureEntity =
  | "start_season"
  | "start_team_season"
  | "league"
  | "team"
  | "player"
  | "assign_player"
  | "team_private_update"
  | "player_private_update"
  | "player_update"
  | "league_private_update"
  | "league_update"
  | "match_update"
  | "delete_player"
  | "delete_team"
  | "delete_league"
  | "match"
  | "play"
  | "play_batch"
  | "red_play"
  | "playbook"
  | "depth_chart";

export class RequestStatusError extends Error {
  constructor(message: string, readonly status: number, readonly retryAfterSeconds: number) {
    super(message);
  }
}

export const THROTTLE_EVENT = "flagos:throttled";
export type ThrottleEventDetail = { seconds: number };

const MAX_THROTTLE_RETRIES = 3;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function authenticatedPost<T>(
  path: string,
  body: Record<string, unknown>,
  errorFallback: string,
): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before continuing.");
  for (let attempt = 0; ; attempt += 1) {
    const idToken = await user.getIdToken();
    const response = await fetch(path, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const result = (await response.json().catch(() => ({}))) as { id?: string; data?: T; error?: string };
    if (response.ok) return result as T;
    const retryAfter = Math.min(60, Math.max(2, Number(response.headers.get("Retry-After")) || 5 * 2 ** attempt));
    // Reads that hit the per-minute limit are retried automatically; the app shows a countdown meanwhile.
    if (response.status === 429 && path.endsWith("/private") && attempt < MAX_THROTTLE_RETRIES) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent<ThrottleEventDetail>(THROTTLE_EVENT, { detail: { seconds: retryAfter } }));
      }
      await sleep(retryAfter * 1000);
      continue;
    }
    const message = response.status === 429
      ? `Too many requests right now. Please wait about ${retryAfter} seconds and try again.`
      : result.error || errorFallback;
    throw new RequestStatusError(message, response.status, retryAfter);
  }
}

export async function createSecureRecord<T extends Record<string, unknown>>(
  entity: SecureEntity,
  data: T,
): Promise<string> {
  const result = await authenticatedPost<{ id?: string }>(
    "/api/security/write",
    { entity, data },
    "Unable to save this record.",
  );
  if (!result.id) throw new Error("The secure write did not return a record ID.");
  invalidatePublicTeamData();
  clearPrivateDataCache();
  return result.id;
}

const PRIVATE_CACHE_TTL_MS = 30_000;
const CACHEABLE_PRIVATE_ACTIONS = new Set(["team", "depth_chart", "league"]);
const privateDataCache = new Map<string, { at: number; request: Promise<unknown> }>();

export function clearPrivateDataCache() {
  privateDataCache.clear();
}

export async function requestPrivateData<T>(
  action: string,
  data: Record<string, unknown> = {},
): Promise<T> {
  // Team pages ask for the same coach-only data as you move between tabs; share it for a short while.
  const cacheKey = CACHEABLE_PRIVATE_ACTIONS.has(action)
    ? `${auth.currentUser?.uid || ""}:${action}:${JSON.stringify(data)}`
    : "";
  const cached = cacheKey ? privateDataCache.get(cacheKey) : undefined;
  if (cached && Date.now() - cached.at < PRIVATE_CACHE_TTL_MS) return cached.request as Promise<T>;
  const request = authenticatedPost<{ data?: T }>(
    "/api/security/private",
    { action, data },
    "Unable to load private data.",
  ).then((result) => {
    if (result.data === undefined) throw new Error("The private-data request returned no data.");
    return result.data;
  });
  if (cacheKey) {
    privateDataCache.set(cacheKey, { at: Date.now(), request });
    request.catch(() => privateDataCache.delete(cacheKey));
  }
  return request;
}
