import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "./firebase";

type MatchRosterSource = {
  leagueId?: string;
  managingTeamId?: string;
  homeTeamId?: string;
  awayTeamId?: string;
};

const isRealTeamId = (id: unknown): id is string =>
  typeof id === "string" && !!id && !id.startsWith("opponent_");

/**
 * Loads the players for both sides of a match. Two shapes of the same query run together:
 * one scoped to the league (provable for league admins under the security rules) and one by
 * team only (team admins, and older player docs saved without a leagueId). Results are merged.
 */
export async function loadMatchRosterPlayers(match: MatchRosterSource): Promise<any[]> {
  // Team-managed games only track the managing team; its coach may not be able to read the opponent.
  const teamIds = isRealTeamId(match.managingTeamId)
    ? [match.managingTeamId]
    : [...new Set([match.homeTeamId, match.awayTeamId].filter(isRealTeamId))];
  if (teamIds.length === 0) return [];
  const queries = [
    getDocs(query(collection(db, "players"), where("teamId", "in", teamIds), limit(120))),
  ];
  if (typeof match.leagueId === "string" && match.leagueId) {
    queries.push(getDocs(query(
      collection(db, "players"),
      where("leagueId", "==", match.leagueId),
      where("teamId", "in", teamIds),
      limit(120),
    )));
  }
  const results = await Promise.allSettled(queries);
  const byId = new Map<string, any>();
  let lastError: unknown = null;
  for (const result of results) {
    if (result.status === "rejected") {
      lastError = result.reason;
      continue;
    }
    result.value.docs.forEach((d) => byId.set(d.id, { ...d.data(), id: d.id }));
  }
  if (byId.size === 0 && lastError && results.every((r) => r.status === "rejected")) throw lastError;
  return [...byId.values()];
}

export type MatchSubsByTeam = { home: string[]; away: string[] };

/** Subs per side. Older games stored one flat `subs` list, so those subs stay available to both sides. */
export function getMatchSubsByTeam(match: { subs?: unknown; subsByTeam?: unknown } | null | undefined): MatchSubsByTeam {
  const byTeam = match?.subsByTeam as Partial<MatchSubsByTeam> | undefined;
  const clean = (list: unknown) => (Array.isArray(list) ? list.filter((n): n is string => typeof n === "string" && !!n) : []);
  if (byTeam && (Array.isArray(byTeam.home) || Array.isArray(byTeam.away))) {
    return { home: clean(byTeam.home), away: clean(byTeam.away) };
  }
  const legacy = clean(match?.subs);
  return { home: legacy, away: legacy };
}

export function addMatchSub(current: MatchSubsByTeam, side: "HOME" | "AWAY", name: string) {
  const key = side === "HOME" ? "home" : "away";
  const subsByTeam: MatchSubsByTeam = {
    ...current,
    [key]: Array.from(new Set([...current[key], name])),
  };
  return { subsByTeam, subs: Array.from(new Set([...subsByTeam.home, ...subsByTeam.away])) };
}
