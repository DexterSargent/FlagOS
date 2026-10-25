import { compareStandingRows, isPlayoffMatch } from "@/lib/standingsCore";

/** Matches and plays created before seasons existed implicitly belong to the first season. */
export const INITIAL_SEASON_ID = "season-1";
export const SEASON_SNAPSHOT_COLLECTION = "league_seasons";

export type LeagueSeasonStatus = "active" | "archived";

export interface LeagueSeason {
  id: string;
  title: string;
  status: LeagueSeasonStatus;
  number: number;
  startedAt?: string;
  endedAt?: string;
  championTeamId?: string;
  championTeamName?: string;
}

export interface SeasonStandingRow {
  id: string;
  name: string;
  shortcode: string;
  rank: number;
  played: number;
  won: number;
  lost: number;
  tied: number;
  pf: number;
  pa: number;
  diff: number;
  pts: number;
}

export const PLAYER_STAT_KEYS = [
  "gamesPlayed", "passAtt", "passComp", "passTD", "passInt", "receptions", "recTD", "rushAtt", "rushTD",
  "flagPulls", "sacks", "int", "defTD", "convPass", "convRec", "pbu", "safeties", "ffl", "totalTDs",
] as const;
export type PlayerStatKey = typeof PLAYER_STAT_KEYS[number];

export type PlayerStatLine = {
  playerId: string;
  name: string;
  number: string;
  teamId: string;
  teamName: string;
  teamShortcode: string;
} & Record<PlayerStatKey, number>;

export interface SeasonResult {
  id: string;
  date: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  isPlayoff: boolean;
  playoffRound?: string;
}

export interface SeasonSnapshot {
  leagueId: string;
  seasonId: string;
  title: string;
  number: number;
  startedAt?: string;
  endedAt: string;
  championTeamId?: string;
  championTeamName?: string;
  standings: SeasonStandingRow[];
  playerStats: PlayerStatLine[];
  results: SeasonResult[];
}

type AnyRecord = Record<string, any>;

function shortcodeFor(team: AnyRecord | undefined): string {
  if (!team) return "";
  if (typeof team.shortcode === "string" && team.shortcode) return team.shortcode;
  const name = String(team.name || team.teamName || "");
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 4).toUpperCase();
}

function isCompleted(match: AnyRecord): boolean {
  return (match.status === "completed" || match.status === "Final") && !match.isHidden;
}

export function getLeagueSeasons(settings: { seasons?: unknown; seasonTitle?: string; currentSeasonId?: unknown } | null | undefined): LeagueSeason[] {
  const raw = Array.isArray(settings?.seasons) ? settings!.seasons as AnyRecord[] : [];
  const seasons = raw
    .filter((season) => season && typeof season.id === "string" && season.id)
    .map((season, index) => ({
      id: String(season.id),
      title: typeof season.title === "string" && season.title ? season.title : `Season ${index + 1}`,
      status: season.status === "archived" ? "archived" : "active",
      number: typeof season.number === "number" ? season.number : index + 1,
      startedAt: typeof season.startedAt === "string" ? season.startedAt : undefined,
      endedAt: typeof season.endedAt === "string" ? season.endedAt : undefined,
      championTeamId: typeof season.championTeamId === "string" ? season.championTeamId : undefined,
      championTeamName: typeof season.championTeamName === "string" ? season.championTeamName : undefined,
    } satisfies LeagueSeason));
  if (seasons.length) {
    // The live season's name is edited through seasonTitle in league settings.
    const currentId = typeof settings?.currentSeasonId === "string" ? settings.currentSeasonId : "";
    return seasons
      .map((season) => season.id === currentId && season.status === "active" && settings?.seasonTitle
        ? { ...season, title: settings.seasonTitle }
        : season)
      .sort((a, b) => a.number - b.number);
  }
  return [{
    id: INITIAL_SEASON_ID,
    title: settings?.seasonTitle || "Season 1",
    status: "active",
    number: 1,
  }];
}

export function getCurrentSeasonId(settings: { seasons?: unknown; seasonTitle?: string; currentSeasonId?: unknown } | null | undefined): string {
  if (typeof settings?.currentSeasonId === "string" && settings.currentSeasonId) return settings.currentSeasonId;
  const seasons = getLeagueSeasons(settings);
  return seasons.find((season) => season.status === "active")?.id || seasons[seasons.length - 1].id;
}

export function matchSeasonId(match: AnyRecord | null | undefined): string {
  return typeof match?.seasonId === "string" && match.seasonId ? match.seasonId : INITIAL_SEASON_ID;
}

export function isMatchInSeason(match: AnyRecord, seasonId: string): boolean {
  return matchSeasonId(match) === seasonId;
}

/** Season IDs are globally unique (except the legacy first season) so they can scope queries and quotas. */
export function createSeasonId(number: number, random: string = Math.random().toString(36).slice(2, 8)): string {
  return `season-${number}-${random.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 8) || "x"}`;
}

/** Standings and per-player stat lines for one season's teams, players, matches and plays. */
export function computeLeagueSeasonStats({ teams, players, matches, plays }: {
  teams: AnyRecord[];
  players: AnyRecord[];
  matches: AnyRecord[];
  plays: AnyRecord[];
}): { standings: SeasonStandingRow[]; playerStats: PlayerStatLine[] } {
  const teamsMap: Record<string, SeasonStandingRow> = {};
  teams.forEach((team) => {
    teamsMap[team.id] = {
      id: team.id,
      name: team.name || team.teamName || "Team",
      shortcode: shortcodeFor(team),
      rank: 0, played: 0, won: 0, lost: 0, tied: 0, pf: 0, pa: 0, diff: 0, pts: 0,
    };
  });

  const statsMap: Record<string, PlayerStatLine> = {};
  players.forEach((player) => {
    const name = String(player.playerName || player.name || "");
    if (!name || statsMap[name]) return;
    const line = {
      playerId: String(player.id || ""),
      name,
      number: String(player.number ?? player.jerseyNumber ?? ""),
      teamId: String(player.teamId || ""),
      teamName: teamsMap[player.teamId]?.name || "Unknown",
      teamShortcode: teamsMap[player.teamId]?.shortcode || "",
    } as PlayerStatLine;
    PLAYER_STAT_KEYS.forEach((key) => { line[key] = 0; });
    statsMap[name] = line;
  });

  const playersByTeam = new Map<string, AnyRecord[]>();
  players.forEach((player) => {
    if (!player.teamId) return;
    const list = playersByTeam.get(player.teamId);
    if (list) list.push(player);
    else playersByTeam.set(player.teamId, [player]);
  });

  matches.forEach((match) => {
    if (match.status !== "completed" || typeof match.homeScore !== "number" ||
      typeof match.awayScore !== "number" || match.isHidden) return;
    const home = teamsMap[match.homeTeamId];
    const away = teamsMap[match.awayTeamId];
    if (!home || !away || match.isPreseason || isPlayoffMatch(match)) return;
    home.played += 1;
    away.played += 1;
    home.pf += match.homeScore;
    home.pa += match.awayScore;
    away.pf += match.awayScore;
    away.pa += match.homeScore;
    if (match.homeScore > match.awayScore) {
      home.won += 1; home.pts += 2; away.lost += 1;
    } else if (match.homeScore < match.awayScore) {
      away.won += 1; away.pts += 2; home.lost += 1;
    } else {
      home.tied += 1; home.pts += 1; away.tied += 1; away.pts += 1;
    }
    const didNotPlay = new Set(match.didNotPlay || []);
    const names: string[] = match.roster?.home && match.roster?.away
      ? [...match.roster.home, ...match.roster.away]
      : [...(playersByTeam.get(match.homeTeamId) || []), ...(playersByTeam.get(match.awayTeamId) || [])]
        .map((player) => player.playerName);
    names.forEach((name) => {
      if (statsMap[name] && !didNotPlay.has(name)) statsMap[name].gamesPlayed += 1;
    });
  });

  const standings = Object.values(teamsMap).map((team) => ({ ...team, diff: team.pf - team.pa }));
  [...standings]
    .sort((a, b) => compareStandingRows(
      { winPct: a.played ? (a.won + 0.5 * a.tied) / a.played : 0, diff: a.diff, pointsFor: a.pf, pointsAgainst: a.pa, name: a.name },
      { winPct: b.played ? (b.won + 0.5 * b.tied) / b.played : 0, diff: b.diff, pointsFor: b.pf, pointsAgainst: b.pa, name: b.name },
    ))
    .forEach((team, index) => { team.rank = index + 1; });

  const completedMatchIds = new Set(matches.filter(isCompleted).map((match) => match.id));
  const eligible = (name: unknown): name is string => typeof name === "string" && !!name && !!statsMap[name];

  plays.forEach((play) => {
    if (!play.matchId || !completedMatchIds.has(play.matchId)) return;
    const isConversion = Boolean(
      play.isConversion === true ||
      play.playType === "Conversion" ||
      (!play.isTouchdown && (
        (play.conversionAttempt !== undefined && play.conversionAttempt !== null) ||
        play.conversionSuccess === true
      )),
    );

    if (play.playType === "Pass" && eligible(play.qbPlayerId) && !isConversion) {
      const qb = statsMap[play.qbPlayerId];
      qb.passAtt += 1;
      if (play.passOutcome === "Complete") qb.passComp += 1;
      else if (play.passOutcome === "Interception") qb.passInt += 1;
      if (play.isTouchdown) qb.passTD += 1;
    }
    if (play.playType === "Pass" && play.passOutcome === "Complete" && eligible(play.receiverPlayerId) && !isConversion) {
      const receiver = statsMap[play.receiverPlayerId];
      receiver.receptions += 1;
      if (play.isTouchdown) { receiver.recTD += 1; receiver.totalTDs += 1; }
    }
    if (play.playType === "Run" && eligible(play.runnerPlayerId) && !isConversion) {
      const runner = statsMap[play.runnerPlayerId];
      runner.rushAtt += 1;
      if (play.isTouchdown) { runner.rushTD += 1; runner.totalTDs += 1; }
    }

    if (isConversion) {
      if (play.conversionSuccess || play.passOutcome === "Complete" || (play.points && play.points > 0)) {
        const passer = play.conversionPasser || play.qbPlayerId;
        const receiver = play.conversionReceiver || play.receiverPlayerId;
        const runner = play.conversionRunner || play.runnerPlayerId;
        if (play.playType === "Pass") {
          if (eligible(passer)) statsMap[passer].convPass += 1;
          if (eligible(receiver)) statsMap[receiver].convRec += 1;
        } else if (play.playType === "Run") {
          if (eligible(runner)) statsMap[runner].convRec += 1;
        }
      }
    } else if (play.conversionSuccess) {
      if (eligible(play.conversionPasser)) statsMap[play.conversionPasser].convPass += 1;
      if (eligible(play.conversionReceiver)) statsMap[play.conversionReceiver].convRec += 1;
      if (eligible(play.conversionRunner)) statsMap[play.conversionRunner].convRec += 1;
    }

    if (Array.isArray(play.defenders)) {
      play.defenders.forEach((name: unknown) => {
        if (!eligible(name)) return;
        const defender = statsMap[name];
        if (play.passOutcome === "Interception") {
          defender.int += 1;
          if (play.isPick6) { defender.defTD += 1; defender.totalTDs += 1; }
        } else if (play.passOutcome === "PBU") {
          defender.pbu += 1;
        } else if (play.passOutcome === "Sack") {
          defender.sacks += 1;
          defender.flagPulls += 1;
          if (play.isSafety) defender.safeties += 1;
        } else if (play.passOutcome === "FFL") {
          defender.ffl += 1;
          defender.flagPulls += 1;
          if (play.isSafety) defender.safeties += 1;
        } else {
          defender.flagPulls += 1;
          if (play.isSafety) defender.safeties += 1;
        }
      });
    }
    if (play.passOutcome === "Interception" && Array.isArray(play.flaggers)) {
      play.flaggers.forEach((name: unknown) => {
        if (eligible(name)) statsMap[name].flagPulls += 1;
      });
    }
  });

  return { standings, playerStats: Object.values(statsMap) };
}

/** Winner of the final completed playoff game; falls back to the regular-season leader. */
export function determineSeasonChampion(
  matches: AnyRecord[],
  standings: SeasonStandingRow[],
): { teamId: string; teamName: string } | null {
  const playoffFinals = matches
    .filter((match) => isPlayoffMatch(match) && isCompleted(match) &&
      typeof match.homeScore === "number" && typeof match.awayScore === "number" &&
      match.homeScore !== match.awayScore && match.homeTeamId && match.awayTeamId)
    .sort((a, b) =>
      (Number(a.matchdayIndex) || 0) - (Number(b.matchdayIndex) || 0) ||
      String(a.date || "").localeCompare(String(b.date || "")) ||
      (Number(a.order) || 0) - (Number(b.order) || 0));
  const final = playoffFinals[playoffFinals.length - 1];
  if (final) {
    const homeWon = final.homeScore > final.awayScore;
    return {
      teamId: homeWon ? final.homeTeamId : final.awayTeamId,
      teamName: (homeWon ? final.homeTeamName : final.awayTeamName) ||
        standings.find((row) => row.id === (homeWon ? final.homeTeamId : final.awayTeamId))?.name || "Champion",
    };
  }
  const leader = [...standings].sort((a, b) => a.rank - b.rank)[0];
  return leader && leader.played > 0 ? { teamId: leader.id, teamName: leader.name } : null;
}

export function buildSeasonResults(matches: AnyRecord[], teamNames: Record<string, string>): SeasonResult[] {
  return matches
    .filter((match) => isCompleted(match) && typeof match.homeScore === "number" && typeof match.awayScore === "number")
    .map((match) => ({
      id: String(match.id),
      date: String(match.date || ""),
      homeTeamId: String(match.homeTeamId || ""),
      awayTeamId: String(match.awayTeamId || ""),
      homeTeamName: String(match.homeTeamName || teamNames[match.homeTeamId] || "Home"),
      awayTeamName: String(match.awayTeamName || teamNames[match.awayTeamId] || "Away"),
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      isPlayoff: isPlayoffMatch(match),
      ...(match.playoffRound ? { playoffRound: String(match.playoffRound) } : {}),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function hasPlayerStats(line: Pick<PlayerStatLine, PlayerStatKey>): boolean {
  return PLAYER_STAT_KEYS.some((key) => (line[key] || 0) > 0);
}

export interface CareerSeasonLine {
  seasonId: string;
  seasonTitle: string;
  number: number;
  isCurrent: boolean;
  line: PlayerStatLine;
  championTeamId?: string;
}

export interface CareerSummary {
  key: string;
  playerId: string;
  name: string;
  seasons: CareerSeasonLine[];
  totals: Record<PlayerStatKey, number>;
  championships: number;
}

export function playerCareerKey(line: Pick<PlayerStatLine, "playerId" | "name">): string {
  return line.playerId ? `id:${line.playerId}` : `name:${line.name.trim().toLowerCase()}`;
}

/**
 * Aggregates player lines across archived season snapshots plus an optional live season.
 * Players are matched by player ID, falling back to name for lines without one.
 */
export function buildCareerSummaries(
  seasons: Array<{ seasonId: string; title: string; number: number; isCurrent: boolean; championTeamId?: string; playerStats: PlayerStatLine[] }>,
): CareerSummary[] {
  const careers = new Map<string, CareerSummary>();
  const nameToKey = new Map<string, string>();
  [...seasons].sort((a, b) => a.number - b.number).forEach((season) => {
    season.playerStats.forEach((line) => {
      const nameKey = line.name.trim().toLowerCase();
      let key = playerCareerKey(line);
      if (!line.playerId && nameToKey.has(nameKey)) key = nameToKey.get(nameKey)!;
      if (line.playerId) nameToKey.set(nameKey, key);
      let career = careers.get(key);
      if (!career) {
        const totals = {} as Record<PlayerStatKey, number>;
        PLAYER_STAT_KEYS.forEach((stat) => { totals[stat] = 0; });
        career = { key, playerId: line.playerId, name: line.name, seasons: [], totals, championships: 0 };
        careers.set(key, career);
      }
      career.name = line.name || career.name;
      career.seasons.push({
        seasonId: season.seasonId,
        seasonTitle: season.title,
        number: season.number,
        isCurrent: season.isCurrent,
        line,
        championTeamId: season.championTeamId,
      });
      PLAYER_STAT_KEYS.forEach((stat) => { career!.totals[stat] += line[stat] || 0; });
      if (season.championTeamId && season.championTeamId === line.teamId) career.championships += 1;
    });
  });
  return [...careers.values()];
}

/** Drops zero counters so archived snapshots stay compact; {@link inflatePlayerLine} restores them. */
export function compactPlayerLine(line: PlayerStatLine): AnyRecord {
  const compact: AnyRecord = {
    playerId: line.playerId, name: line.name, number: line.number,
    teamId: line.teamId, teamName: line.teamName, teamShortcode: line.teamShortcode,
  };
  PLAYER_STAT_KEYS.forEach((key) => { if (line[key]) compact[key] = line[key]; });
  return compact;
}

export function inflatePlayerLine(raw: AnyRecord): PlayerStatLine {
  const line = {
    playerId: String(raw.playerId || ""),
    name: String(raw.name || ""),
    number: String(raw.number ?? ""),
    teamId: String(raw.teamId || ""),
    teamName: String(raw.teamName || ""),
    teamShortcode: String(raw.teamShortcode || ""),
  } as PlayerStatLine;
  PLAYER_STAT_KEYS.forEach((key) => { line[key] = typeof raw[key] === "number" ? raw[key] : 0; });
  return line;
}

export function seasonSnapshotDocId(leagueId: string, seasonId: string): string {
  return `${leagueId}__${seasonId}`;
}

/** Freezes a season's standings, stat lines, results and champion into an archive document. */
export function buildSeasonSnapshot({ leagueId, season, teams, players, matches, plays, endedAt }: {
  leagueId: string;
  season: Pick<LeagueSeason, "id" | "title" | "number" | "startedAt">;
  teams: AnyRecord[];
  players: AnyRecord[];
  matches: AnyRecord[];
  plays: AnyRecord[];
  endedAt: string;
}): SeasonSnapshot {
  const seasonMatches = matches.filter((match) => !match.isHidden && isMatchInSeason(match, season.id));
  const matchIds = new Set(seasonMatches.map((match) => String(match.id)));
  const seasonPlays = plays.filter((play) => !play.isHidden && matchIds.has(String(play.matchId)));
  const { standings, playerStats } = computeLeagueSeasonStats({ teams, players, matches: seasonMatches, plays: seasonPlays });
  const champion = determineSeasonChampion(seasonMatches, standings);
  const teamNames = Object.fromEntries(teams.map((team) => [String(team.id), String(team.name || "Team")]));
  return {
    leagueId,
    seasonId: season.id,
    title: season.title,
    number: season.number,
    ...(season.startedAt ? { startedAt: season.startedAt } : {}),
    endedAt,
    ...(champion ? { championTeamId: champion.teamId, championTeamName: champion.teamName } : {}),
    standings,
    playerStats: playerStats.filter(hasPlayerStats).map((line) => compactPlayerLine(line) as PlayerStatLine),
    results: buildSeasonResults(seasonMatches, teamNames),
  };
}

/** Reads an archived snapshot document back into typed, fully populated stat lines. */
export function parseSeasonSnapshot(raw: AnyRecord | undefined | null): SeasonSnapshot | null {
  if (!raw || typeof raw.seasonId !== "string" || typeof raw.leagueId !== "string") return null;
  return {
    leagueId: raw.leagueId,
    seasonId: raw.seasonId,
    title: String(raw.title || "Season"),
    number: Number(raw.number) || 1,
    startedAt: typeof raw.startedAt === "string" ? raw.startedAt : undefined,
    endedAt: String(raw.endedAt || ""),
    championTeamId: typeof raw.championTeamId === "string" ? raw.championTeamId : undefined,
    championTeamName: typeof raw.championTeamName === "string" ? raw.championTeamName : undefined,
    standings: Array.isArray(raw.standings) ? raw.standings as SeasonStandingRow[] : [],
    playerStats: Array.isArray(raw.playerStats) ? raw.playerStats.map(inflatePlayerLine) : [],
    results: Array.isArray(raw.results) ? raw.results as SeasonResult[] : [],
  };
}
