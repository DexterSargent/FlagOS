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
 * Runs player queries side by side and merges the results. The league-scoped shape is what
 * league members and league admins can read; the team-only shape covers team admins and older
 * player docs saved without a leagueId. Throws only when every query is rejected.
 */
async function loadPlayersByTeamIds(teamIds: string[], leagueId: string | undefined, max: number): Promise<any[]> {
  const teamFilter = teamIds.length === 1 ? where("teamId", "==", teamIds[0]) : where("teamId", "in", teamIds);
  const queries = [getDocs(query(collection(db, "players"), teamFilter, limit(max)))];
  if (typeof leagueId === "string" && leagueId) {
    queries.push(getDocs(query(collection(db, "players"), where("leagueId", "==", leagueId), teamFilter, limit(max))));
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
  if (results.every((r) => r.status === "rejected")) throw lastError;
  return [...byId.values()];
}

/** Loads one team's roster in a way every viewer who can see the team is allowed to read. */
export function loadTeamPlayers(teamId: string, leagueId?: string | null, max = 30): Promise<any[]> {
  return loadPlayersByTeamIds([teamId], leagueId || undefined, max);
}

/** Loads the players for both sides of a match. */
export async function loadMatchRosterPlayers(match: MatchRosterSource): Promise<any[]> {
  // Team-managed games only track the managing team; its coach may not be able to read the opponent.
  const teamIds = isRealTeamId(match.managingTeamId)
    ? [match.managingTeamId]
    : [...new Set([match.homeTeamId, match.awayTeamId].filter(isRealTeamId))];
  if (teamIds.length === 0) return [];
  return loadPlayersByTeamIds(teamIds, match.leagueId, 120);
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
