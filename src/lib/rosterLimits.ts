/** Roster hard cap: five players per on-field spot (5v5 → 25, 8v8 → 40). */
export const ROSTER_PLAYERS_PER_FIELD_SPOT = 5;
export const MIN_PLAYERS_ON_FIELD = 4;
export const MAX_PLAYERS_ON_FIELD = 8;
export const MAX_ROSTER_HARD_CAP = MAX_PLAYERS_ON_FIELD * ROSTER_PLAYERS_PER_FIELD_SPOT;

export function rosterHardCap(playersOnField?: number | null): number {
  const count = Math.round(Number(playersOnField) || 5);
  const clamped = Math.min(MAX_PLAYERS_ON_FIELD, Math.max(MIN_PLAYERS_ON_FIELD, count));
  return clamped * ROSTER_PLAYERS_PER_FIELD_SPOT;
}

/** The league's chosen maximum, never above the hard cap. */
export function effectiveMaxRoster(rules?: { playersOnField?: number; maxRosterSize?: number } | null): number {
  const cap = rosterHardCap(rules?.playersOnField);
  const chosen = Math.round(Number(rules?.maxRosterSize) || cap);
  return Math.min(cap, Math.max(1, chosen));
}
