import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  buildCareerSummaries,
  inflatePlayerLine,
  INITIAL_SEASON_ID,
  isMatchInSeason,
  type CareerSummary,
  type PlayerStatKey,
  type PlayerStatLine,
  type SeasonResult,
} from "./leagueSeasons";

export const TEAM_SEASON_SNAPSHOT_COLLECTION = "team_seasons";

export type TeamSeasonStatus = "active" | "archived";

export interface TeamSeason {
  id: string;
  title: string;
  status: TeamSeasonStatus;
  number: number;
  startedAt?: string;
  endedAt?: string;
  won?: number;
  lost?: number;
  tied?: number;
  pf?: number;
  pa?: number;
  diff?: number;
  standing?: string;
  gamesPlayed?: number;
}

export interface TeamSeasonSnapshot {
  teamId: string;
  seasonId: string;
  title: string;
  number: number;
  startedAt?: string;
  endedAt: string;
  won: number;
  lost: number;
  tied: number;
  pf: number;
  pa: number;
  diff: number;
  pts: number;
  gamesPlayed: number;
  standing?: string;
  isChampion?: boolean;
  playerStats: PlayerStatLine[];
  results: SeasonResult[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export function getTeamSeasons(team: { seasons?: unknown; seasonTitle?: string; currentSeasonId?: unknown } | null | undefined): TeamSeason[] {
  const raw = Array.isArray(team?.seasons) ? team!.seasons as AnyRecord[] : [];
  const seasons = raw
    .filter((season) => season && typeof season.id === "string" && season.id)
    .map((season, index) => ({
      id: String(season.id),
      title: typeof season.title === "string" && season.title ? season.title : `Season ${index + 1}`,
      status: (season.status === "archived" ? "archived" : "active") as TeamSeasonStatus,
      number: typeof season.number === "number" ? season.number : index + 1,
      startedAt: typeof season.startedAt === "string" ? season.startedAt : undefined,
      endedAt: typeof season.endedAt === "string" ? season.endedAt : undefined,
      won: typeof season.won === "number" ? season.won : undefined,
      lost: typeof season.lost === "number" ? season.lost : undefined,
      tied: typeof season.tied === "number" ? season.tied : undefined,
      pf: typeof season.pf === "number" ? season.pf : undefined,
      pa: typeof season.pa === "number" ? season.pa : undefined,
      diff: typeof season.diff === "number" ? season.diff : undefined,
      standing: typeof season.standing === "string" ? season.standing : undefined,
      gamesPlayed: typeof season.gamesPlayed === "number" ? season.gamesPlayed : undefined,
    } satisfies TeamSeason));

  if (seasons.length) {
    const currentId = typeof team?.currentSeasonId === "string" ? team.currentSeasonId : "";
    return seasons
      .map((season) => season.id === currentId && season.status === "active" && team?.seasonTitle
        ? { ...season, title: team.seasonTitle }
        : season)
      .sort((a, b) => a.number - b.number);
  }

  return [{
    id: INITIAL_SEASON_ID,
    title: team?.seasonTitle || "Season 1",
    status: "active",
    number: 1,
  }];
}

export function getCurrentTeamSeasonId(team: { seasons?: unknown; seasonTitle?: string; currentSeasonId?: unknown } | null | undefined): string {
  if (typeof team?.currentSeasonId === "string" && team.currentSeasonId) return team.currentSeasonId;
  const seasons = getTeamSeasons(team);
  return seasons.find((season) => season.status === "active")?.id || seasons[seasons.length - 1].id;
}

export function teamSeasonSnapshotDocId(teamId: string, seasonId: string): string {
  return `${teamId}__${seasonId}`;
}

export function buildTeamSeasonSnapshot({
  teamId,
  teamName,
  shortcode,
  season,
  players,
  matches,
  plays,
  endedAt = new Date().toISOString(),
  standing,
  isChampion,
}: {
  teamId: string;
  teamName: string;
  shortcode: string;
  season: TeamSeason;
  players: AnyRecord[];
  matches: AnyRecord[];
  plays: AnyRecord[];
  endedAt?: string;
  standing?: string;
  isChampion?: boolean;
}): TeamSeasonSnapshot {
  const seasonMatches = matches.filter((m) => isMatchInSeason(m, season.id) && (m.status === "completed" || m.status === "Final") && !m.isHidden);
  const matchIds = new Set(seasonMatches.map((m) => m.id));
  const seasonPlays = plays.filter((p) => matchIds.has(p.matchId) && !p.isHidden);

  let won = 0;
  let lost = 0;
  let tied = 0;
  let pf = 0;
  let pa = 0;

  const results: SeasonResult[] = seasonMatches.map((m) => {
    const isHome = m.homeTeamId === teamId;
    const isAway = m.awayTeamId === teamId;
    const teamScore = isHome ? (m.homeScore || 0) : (m.awayScore || 0);
    const oppScore = isHome ? (m.awayScore || 0) : (m.homeScore || 0);

    if (isHome || isAway) {
      pf += teamScore;
      pa += oppScore;
      if (teamScore > oppScore) won += 1;
      else if (teamScore < oppScore) lost += 1;
      else tied += 1;
    }

    return {
      id: m.id,
      date: m.date || "",
      homeTeamId: m.homeTeamId || "",
      awayTeamId: m.awayTeamId || "",
      homeTeamName: m.homeTeamName || "Home",
      awayTeamName: m.awayTeamName || "Away",
      homeScore: m.homeScore || 0,
      awayScore: m.awayScore || 0,
      isPlayoff: Boolean(m.isPlayoff),
      playoffRound: m.playoffRound,
    };
  });

  const playerStatsMap = new Map<string, PlayerStatLine>();
  for (const player of players) {
    playerStatsMap.set(player.id, {
      playerId: player.id,
      name: player.playerName || player.name || "Player",
      number: player.number || player.jerseyNumber || "",
      teamId,
      teamName,
      teamShortcode: shortcode,
      gamesPlayed: 0,
      passAtt: 0,
      passComp: 0,
      passTD: 0,
      passInt: 0,
      receptions: 0,
      recTD: 0,
      rushAtt: 0,
      rushTD: 0,
      flagPulls: 0,
      sacks: 0,
      int: 0,
      defTD: 0,
      convPass: 0,
      convRec: 0,
      pbu: 0,
      safeties: 0,
      ffl: 0,
      totalTDs: 0,
    });
  }

  // Count games played per player
  for (const match of seasonMatches) {
    const dnp = new Set(Array.isArray(match.didNotPlay) ? match.didNotPlay : []);
    for (const player of players) {
      const line = playerStatsMap.get(player.id);
      if (line && !dnp.has(line.name)) {
        line.gamesPlayed += 1;
      }
    }
  }

  // Count play stats
  for (const play of seasonPlays) {
    const applyStat = (playerName: string | undefined, stat: PlayerStatKey, amount = 1) => {
      if (!playerName) return;
      for (const line of playerStatsMap.values()) {
        if (line.name === playerName) {
          line[stat] = (line[stat] || 0) + amount;
          break;
        }
      }
    };

    if (play.passer) {
      applyStat(play.passer, "passAtt");
      if (play.result === "Complete" || play.result === "Touchdown") applyStat(play.passer, "passComp");
      if (play.isTouchdown || play.result === "Touchdown") {
        applyStat(play.passer, "passTD");
        applyStat(play.passer, "totalTDs");
      }
      if (play.result === "Interception") applyStat(play.passer, "passInt");
    }
    if (play.rusher) {
      applyStat(play.rusher, "rushAtt");
      if (play.isTouchdown || play.result === "Touchdown") {
        applyStat(play.rusher, "rushTD");
        applyStat(play.rusher, "totalTDs");
      }
    }
    if (play.receiver && (play.result === "Complete" || play.result === "Touchdown")) {
      applyStat(play.receiver, "receptions");
      if (play.isTouchdown || play.result === "Touchdown") {
        applyStat(play.receiver, "recTD");
        applyStat(play.receiver, "totalTDs");
      }
    }
    if (play.defender) {
      if (play.result === "Flag Pull" || play.isFlagPull) applyStat(play.defender, "flagPulls");
      if (play.result === "Sack" || play.isSack) applyStat(play.defender, "sacks");
      if (play.result === "Interception") applyStat(play.defender, "int");
      if (play.result === "Pass Breakup" || play.isPBU) applyStat(play.defender, "pbu");
    }
  }

  const diff = pf - pa;
  const pts = won * 2 + tied;
  const gamesPlayed = won + lost + tied;

  return {
    teamId,
    seasonId: season.id,
    title: season.title,
    number: season.number,
    startedAt: season.startedAt,
    endedAt,
    won,
    lost,
    tied,
    pf,
    pa,
    diff,
    pts,
    gamesPlayed,
    standing,
    isChampion,
    playerStats: Array.from(playerStatsMap.values()),
    results,
  };
}

const teamSeasonSnapshotCache = new Map<string, TeamSeasonSnapshot>();

export function clearTeamSeasonSnapshotCache(teamId?: string): void {
  if (!teamId) {
    teamSeasonSnapshotCache.clear();
    return;
  }
  for (const key of Array.from(teamSeasonSnapshotCache.keys())) {
    if (key.startsWith(`${teamId}:`)) {
      teamSeasonSnapshotCache.delete(key);
    }
  }
}

export async function loadTeamSeasonSnapshots(teamId: string, seasons: TeamSeason[]): Promise<TeamSeasonSnapshot[]> {
  const archived = seasons.filter((s) => s.status === "archived");
  if (!archived.length) return [];

  const snapshots: TeamSeasonSnapshot[] = [];
  await Promise.all(archived.map(async (season) => {
    const cacheKey = `${teamId}:${season.id}`;
    const cached = teamSeasonSnapshotCache.get(cacheKey);
    if (cached) {
      snapshots.push(cached);
      return;
    }

    try {
      const snapDoc = await getDoc(doc(db, TEAM_SEASON_SNAPSHOT_COLLECTION, teamSeasonSnapshotDocId(teamId, season.id)));
      if (snapDoc.exists()) {
        const data = snapDoc.data() as AnyRecord;
        const snap: TeamSeasonSnapshot = {
          teamId,
          seasonId: season.id,
          title: data.title || season.title,
          number: data.number ?? season.number,
          startedAt: data.startedAt,
          endedAt: data.endedAt || "",
          won: data.won ?? season.won ?? 0,
          lost: data.lost ?? season.lost ?? 0,
          tied: data.tied ?? season.tied ?? 0,
          pf: data.pf ?? season.pf ?? 0,
          pa: data.pa ?? season.pa ?? 0,
          diff: data.diff ?? season.diff ?? 0,
          pts: data.pts ?? ((data.won ?? 0) * 2 + (data.tied ?? 0)),
          gamesPlayed: data.gamesPlayed ?? ((data.won ?? 0) + (data.lost ?? 0) + (data.tied ?? 0)),
          standing: data.standing || season.standing,
          isChampion: Boolean(data.isChampion),
          playerStats: Array.isArray(data.playerStats) ? data.playerStats.map(inflatePlayerLine) : [],
          results: Array.isArray(data.results) ? data.results : [],
        };
        teamSeasonSnapshotCache.set(cacheKey, snap);
        snapshots.push(snap);
      } else if (season.won !== undefined) {
        // Fall back to lightweight inline season record if snapshot doc does not exist
        const snap: TeamSeasonSnapshot = {
          teamId,
          seasonId: season.id,
          title: season.title,
          number: season.number,
          startedAt: season.startedAt,
          endedAt: season.endedAt || "",
          won: season.won ?? 0,
          lost: season.lost ?? 0,
          tied: season.tied ?? 0,
          pf: season.pf ?? 0,
          pa: season.pa ?? 0,
          diff: season.diff ?? ((season.pf ?? 0) - (season.pa ?? 0)),
          pts: (season.won ?? 0) * 2 + (season.tied ?? 0),
          gamesPlayed: (season.won ?? 0) + (season.lost ?? 0) + (season.tied ?? 0),
          standing: season.standing,
          isChampion: season.standing?.toLowerCase().includes("champion"),
          playerStats: [],
          results: [],
        };
        teamSeasonSnapshotCache.set(cacheKey, snap);
        snapshots.push(snap);
      }
    } catch (err) {
      console.warn("Failed to load team snapshot for", season.id, err);
    }
  }));

  return snapshots.sort((a, b) => b.number - a.number);
}

export function buildTeamCareerSummaries(
  snapshots: TeamSeasonSnapshot[],
  livePlayerStats: PlayerStatLine[],
  currentSeasonTitle = "Current Season",
  currentSeasonNumber = 1,
  currentSeasonId = INITIAL_SEASON_ID,
): CareerSummary[] {
  return buildCareerSummaries([
    ...snapshots.map((s) => ({
      seasonId: s.seasonId,
      title: s.title,
      number: s.number,
      isCurrent: false,
      championTeamId: s.isChampion ? s.teamId : undefined,
      playerStats: s.playerStats,
    })),
    {
      seasonId: currentSeasonId,
      title: currentSeasonTitle,
      number: currentSeasonNumber,
      isCurrent: true,
      playerStats: livePlayerStats.filter((line) => line.gamesPlayed > 0 || line.totalTDs > 0 || line.flagPulls > 0 || line.passAtt > 0),
    },
  ]).filter((career) => career.seasons.length > 0);
}

