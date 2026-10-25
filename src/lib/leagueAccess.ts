export const LEAGUE_ACCESS_GRANTED_EVENT = "flagos-league-access-granted";

/**
 * The server opens private leagues to their players and coaches while resolving the account.
 * Reads attempted before that grant were denied, so listeners are told which leagues just opened.
 */
export function announceLeagueAccess(result: unknown): void {
  if (typeof window === "undefined" || !result || typeof result !== "object") return;
  const granted = (result as { grantedLeagueIds?: unknown }).grantedLeagueIds;
  if (!Array.isArray(granted)) return;
  const leagueIds = granted.filter((id): id is string => typeof id === "string" && id !== "");
  if (!leagueIds.length) return;
  window.dispatchEvent(new CustomEvent(LEAGUE_ACCESS_GRANTED_EVENT, { detail: { leagueIds } }));
}
