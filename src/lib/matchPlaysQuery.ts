import { collection, getDocs, limit, onSnapshot, query, where, type QueryConstraint, type DocumentData } from "firebase/firestore";
import { db } from "./firebase";

export type MatchPlayScope = {
  leagueId?: string | null;
  managingTeamId?: string | null;
  homeTeamId?: string | null;
  isHidden?: boolean | null;
};

/**
 * Firestore rules can only allow a list query when they can prove access from the
 * query's own filters, so each plays query is scoped to the game's league (or the
 * independent team that runs it) in addition to the match.
 */
export function matchPlayConstraints(matchId: string, match: MatchPlayScope, options: { visibleOnly?: boolean } = {}): QueryConstraint[] {
  const constraints: QueryConstraint[] = [where("matchId", "==", matchId)];
  const leagueId = typeof match.leagueId === "string" ? match.leagueId : "";
  if (leagueId) {
    constraints.push(where("leagueId", "==", leagueId));
  } else {
    const teamId = match.managingTeamId || match.homeTeamId || "";
    if (teamId) constraints.push(where("managingTeamId", "==", teamId));
  }
  const visibleOnly = options.visibleOnly ?? match.isHidden !== true;
  if (visibleOnly) constraints.push(where("isHidden", "==", false));
  constraints.push(limit(500));
  return constraints;
}

export function sortPlaysChronologically<T extends DocumentData>(plays: T[]): T[] {
  return [...plays].sort((a, b) => playMillis(a) - playMillis(b));
}

function playMillis(play: DocumentData): number {
  const ts = play.timestamp;
  if (ts && typeof ts.toMillis === "function") return ts.toMillis();
  if (ts && typeof ts.seconds === "number") return ts.seconds * 1000;
  const parsed = ts ? new Date(ts).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function fetchMatchPlays(matchId: string, match: MatchPlayScope, options: { visibleOnly?: boolean } = {}) {
  const snapshot = await getDocs(query(collection(db, "plays"), ...matchPlayConstraints(matchId, match, options)));
  return sortPlaysChronologically(snapshot.docs.map((record) => ({ ...record.data(), id: record.id } as DocumentData & { id: string })));
}

export function subscribeMatchPlays(
  matchId: string,
  match: MatchPlayScope,
  onPlays: (plays: (DocumentData & { id: string })[]) => void,
  onError: (error: Error) => void,
  options: { visibleOnly?: boolean } = {},
) {
  return onSnapshot(
    query(collection(db, "plays"), ...matchPlayConstraints(matchId, match, options)),
    (snapshot) => onPlays(snapshot.docs.map((record) => ({ ...record.data(), id: record.id }))),
    onError,
  );
}

export function describePlaysError(error: unknown, signedIn: boolean): string {
  const code = (error as { code?: string } | null)?.code || "";
  if (code === "permission-denied") {
    return signedIn
      ? "You don't have access to this game's plays."
      : "Sign in to see this game's plays.";
  }
  return "Couldn't load plays. Check your connection and try again.";
}
