import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "./firebase";
import type { DemoMatch, DemoPlay } from "./demoSeedData";
import {
  getYorkTeamMatches,
  getYorkTeamPlays,
  YORK_TEAM_ALIASES,
  REMOVED_YORK_MATCH_IDS,
} from "./yorkTeamData";

export async function loadYorkSeasonData(): Promise<{ matches: DemoMatch[]; plays: DemoPlay[] }> {
  const matches = new Map(getYorkTeamMatches().map((match) => [match.id, match]));
  const plays = new Map(getYorkTeamPlays().map((play) => [play.id, play]));
  try {
    const snapshots = await Promise.all(
      ["homeTeamId", "awayTeamId", "managingTeamId"].map((field) =>
        getDocs(query(collection(db, "matches"), where(field, "in", YORK_TEAM_ALIASES), where("isHidden", "==", false), limit(512))),
      ),
    );
    // A successful shared read is authoritative; fixtures are an offline fallback.
    matches.clear();
    const hidden = new Set(REMOVED_YORK_MATCH_IDS);
    for (const snapshot of snapshots) {
      for (const record of snapshot.docs) {
        const data = record.data();
        if (data.isHidden) hidden.add(record.id);
        else matches.set(record.id, { ...matches.get(record.id), ...data, id: record.id } as DemoMatch);
      }
    }
    hidden.forEach((id) => matches.delete(id));
    const matchIds = Array.from(matches.keys());
    for (let offset = 0; offset < matchIds.length; offset += 10) {
      const snapshot = await getDocs(query(
        collection(db, "plays"),
        where("matchId", "in", matchIds.slice(offset, offset + 10)),
        where("isHidden", "==", false),
        limit(10_000),
      ));
      for (const record of snapshot.docs) {
        const data = record.data();
        if (data.isHidden) plays.delete(record.id);
        else plays.set(record.id, { ...data, id: record.id } as DemoPlay);
      }
    }
  } catch (error) {
    console.warn("Unable to load shared York season data; showing seed and device-local records:", error);
  }
  return {
    matches: Array.from(matches.values()),
    plays: Array.from(plays.values()).filter((play) => matches.has(play.matchId)),
  };
}
