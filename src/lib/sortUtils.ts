/**
 * Shared sorting utilities for natural numeric ordering.
 * Ensures "Team 1", "Team 2", ..., "Team 10", "Team 11" are ordered numerically
 * rather than strictly lexicographically ("Team 1", "Team 11", "Team 2").
 */

/**
 * Natural comparison between two strings containing numbers.
 */
export function compareNatural(a?: string | null, b?: string | null): number {
  return (a ?? "").localeCompare(b ?? "", undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Natural comparison between objects with a `name` property (e.g. teams, leagues).
 */
export function compareByName<T extends { name?: string | null }>(a: T, b: T): number {
  return compareNatural(a.name, b.name);
}

