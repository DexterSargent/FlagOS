/** Temporary, game-specific scorer access shared by the client and the server. */

export const SCORER_GRANTS_COLLECTION = "scorer_grants";
export const SCORER_INVITES_COLLECTION = "scorer_invites";
export const SCORER_LINK_HOURS = [2, 6, 12, 24, 48] as const;
export const DEFAULT_SCORER_LINK_HOURS = 6;
export const MAX_SCORER_LINK_HOURS = 72;

export function scorerGrantDocId(matchId: string, uid: string): string {
  return `${matchId}__${uid}`;
}

export function scorerLinkPath(matchId: string, token: string): string {
  return `/matches/${encodeURIComponent(matchId)}/play-by-play?scorer=${encodeURIComponent(token)}`;
}

type TimestampLike = { toMillis?: () => number; seconds?: number } | Date | number | null | undefined;

export function timestampMillis(value: TimestampLike): number {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  return 0;
}

export function isGrantActive(grant: { expiresAt?: TimestampLike; revoked?: unknown } | null | undefined, now = Date.now()): boolean {
  return !!grant && grant.revoked !== true && timestampMillis(grant.expiresAt) > now;
}

/**
 * Who may record a game. League games belong to the league's admins (or a temporary scorer
 * they invited); games run by an independent team belong to that team's coaches.
 */
export function canRecordMatch(
  match: { leagueId?: string; isStandalone?: boolean; isIndependent?: boolean; managingTeamId?: string } | null | undefined,
  access: { isDemo?: boolean; isLeagueAdmin: boolean; canManageTeam?: (teamId: string) => boolean; hasScorerGrant?: boolean },
): boolean {
  if (!match) return false;
  if (access.hasScorerGrant) return true;
  const isTeamManagedGame = !access.isDemo && !!match.managingTeamId &&
    (!match.leagueId || match.isStandalone === true || match.isIndependent === true);
  if (isTeamManagedGame) return !!access.canManageTeam?.(match.managingTeamId!);
  return access.isLeagueAdmin || (!!match.isIndependent && !!match.managingTeamId && !!access.canManageTeam?.(match.managingTeamId));
}
