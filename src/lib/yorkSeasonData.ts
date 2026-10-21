import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "./firebase";
import type { DemoMatch, DemoPlay } from "./demoSeedData";
import { YORK_TEAM_ALIASES } from "./yorkStaff";
import { REMOVED_YORK_MATCH_IDS } from "./yorkMatchStorage";
import { cachedPublicTeamRequest } from "./publicTeamCache";

export function loadYorkMatches(): Promise<DemoMatch[]> {
  return cachedPublicTeamRequest("york:matches", async () => {
    const snapshots = await Promise.all(
      ["homeTeamId", "awayTeamId", "managingTeamId"].map((field) =>
        getDocs(query(collection(db, "matches"), where(field, "in", YORK_TEAM_ALIASES), where("isHidden", "==", false), limit(512))),
      ),
    );
    const matches = new Map<string, DemoMatch>();
    const hidden = new Set(REMOVED_YORK_MATCH_IDS);
    for (const snapshot of snapshots) {
      for (const record of snapshot.docs) {
        const data = record.data();
        if (data.isHidden) hidden.add(record.id);
        else matches.set(record.id, { ...data, id: record.id } as DemoMatch);
      }
    }
    hidden.forEach((id) => matches.delete(id));
    return Array.from(matches.values());
  });
}

export function loadYorkMatchPlays(matchId: string): Promise<DemoPlay[]> {
  return cachedPublicTeamRequest(`york:plays:${matchId}`, async () => {
    const matches = await loadYorkMatches();
    if (!matches.some((match) => match.id === matchId)) throw new Error("The requested game is not an active York match.");
    const snapshot = await getDocs(query(
      collection(db, "plays"),
      where("matchId", "==", matchId),
      where("isHidden", "==", false),
      limit(10_000),
    ));
    return snapshot.docs.map((record) => ({ ...record.data(), id: record.id } as DemoPlay));
  });
}

export async function loadYorkSeasonData(): Promise<{ matches: DemoMatch[]; plays: DemoPlay[] }> {
  const matches = await loadYorkMatches();
  const plays = await Promise.all(matches.map((match) => loadYorkMatchPlays(match.id)));
  return { matches, plays: plays.flat() };
}
