"use client";

import { auth } from "@/lib/firebase";
import { invalidatePublicTeamData } from "@/lib/publicTeamCache";

export type SecureEntity =
  | "start_season"
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

export async function authenticatedPost<T>(
  path: string,
  body: Record<string, unknown>,
  errorFallback: string,
): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before continuing.");
  const idToken = await user.getIdToken();
  const response = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as { id?: string; data?: T; error?: string };
  if (!response.ok) throw new Error(result.error || errorFallback);
  return result as T;
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
  return result.id;
}

export async function requestPrivateData<T>(
  action: string,
  data: Record<string, unknown> = {},
): Promise<T> {
  const result = await authenticatedPost<{ data?: T }>(
    "/api/security/private",
    { action, data },
    "Unable to load private data.",
  );
  if (result.data === undefined) throw new Error("The private-data request returned no data.");
  return result.data;
}
