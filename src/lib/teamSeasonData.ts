import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "./firebase";
import type { DemoMatch, DemoPlay } from "./demoSeedData";
import { cachedPublicTeamRequest } from "./publicTeamCache";

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

export function loadTeamSeasonData(teamId: string): Promise<{ matches: DemoMatch[]; plays: DemoPlay[] }> {
  return cachedPublicTeamRequest(`team-season-data:${teamId}`, async () => {
    const matches = await loadTeamManagedMatches(teamId);
    const plays = await Promise.all(matches.map((match) => loadTeamMatchPlays(match.id, teamId)));
    return { matches, plays: plays.flat() };
  });
}
