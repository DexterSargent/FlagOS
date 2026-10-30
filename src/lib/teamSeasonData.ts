import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "./firebase";
import type { DemoMatch, DemoPlay } from "./demoSeedData";
import { isMatchInSeason } from "./leagueSeasons";
import { cachedPublicTeamRequest } from "./publicTeamCache";
import { getCurrentTeamSeasonId } from "./teamSeasons";

/**
 * Visible games managed by an independent (league-free) team. The query is constrained to
 * managingTeamId + isHidden == false so it satisfies the public team match rules.
 */
export function loadTeamManagedMatches(teamId: string): Promise<DemoMatch[]> {
  return cachedPublicTeamRequest(`team-matches:${teamId}`, async () => {
    const snapshot = await getDocs(query(
      collection(db, "matches"),
      where("managingTeamId", "==", teamId),
      where("isHidden", "==", false),
      limit(512),
    ));
    return snapshot.docs.map((record) => ({ ...record.data(), id: record.id } as DemoMatch));
  });
}

export function loadTeamMatchPlays(matchId: string, teamId: string): Promise<DemoPlay[]> {
  return cachedPublicTeamRequest(`team-plays:${matchId}`, async () => {
    const snapshot = await getDocs(query(
      collection(db, "plays"),
      where("matchId", "==", matchId),
      where("managingTeamId", "==", teamId),
      where("isHidden", "==", false),
      limit(10_000),
    ));
    return snapshot.docs.map((record) => ({ ...record.data(), id: record.id } as DemoPlay));
  });
}

/** The independent team's current season id, read from its public team record. */
export function loadTeamCurrentSeasonId(teamId: string): Promise<string> {
  return cachedPublicTeamRequest(`team-current-season:${teamId}`, async () => {
    const snapshot = await getDoc(doc(db, "teams", teamId));
    return getCurrentTeamSeasonId(snapshot.exists() ? snapshot.data() : undefined);
  });
}

/**
 * Matches and plays of one independent-team season (the current season unless `seasonId` is
 * given). Pass `seasonId: null` to load every season, e.g. for archive rebuilds.
 */
export function loadTeamSeasonData(
  teamId: string,
  options: { seasonId?: string | null } = {},
): Promise<{ matches: DemoMatch[]; plays: DemoPlay[] }> {
  const scope = options.seasonId === undefined ? "current" : options.seasonId ?? "all";
  return cachedPublicTeamRequest(`team-season-data:${teamId}:${scope}`, async () => {
    const seasonId = options.seasonId === undefined ? await loadTeamCurrentSeasonId(teamId) : options.seasonId;
    const allMatches = await loadTeamManagedMatches(teamId);
    const matches = seasonId ? allMatches.filter((match) => isMatchInSeason(match, seasonId)) : allMatches;
    const plays = await Promise.all(matches.map((match) => loadTeamMatchPlays(match.id, teamId)));
    return { matches, plays: plays.flat() };
  });
}
