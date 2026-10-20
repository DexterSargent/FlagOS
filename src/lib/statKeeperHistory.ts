import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { getSandboxPlays } from "./demoSandbox";
import { isYorkMatch, YORK_TEAM_ALIASES } from "./yorkTeamData";
import { loadYorkSeasonData } from "./yorkSeasonData";

export async function loadStatKeeperHistory(match: {
  id: string; leagueId?: string; homeTeamId?: string; awayTeamId?: string;
}, isDemo: boolean) {
  if (isDemo) return getSandboxPlays().filter((play) => play.matchId !== match.id);
  if (isYorkMatch(match.id) || YORK_TEAM_ALIASES.includes(match.homeTeamId || "") || YORK_TEAM_ALIASES.includes(match.awayTeamId || "")) {
    return (await loadYorkSeasonData()).plays.filter((play) => play.matchId !== match.id);
  }
  if (!match.leagueId) return [];
  const snapshot = await getDocs(query(
    collection(db, "plays"),
    where("leagueId", "==", match.leagueId),
    where("isHidden", "==", false),
    limit(300),
  ));
  return snapshot.docs.map((record) => ({ ...record.data(), id: record.id, matchId: record.data().matchId as string }))
    .filter((play) => play.matchId !== match.id);
}
