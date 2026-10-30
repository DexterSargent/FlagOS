import {
  buildCareerSummaries,
  buildSeasonResults,
  computeGameLeaders,
  type GameLeaderBoard,
  type GameLeaderKey,
  type PlayerStatKey,
  type PlayerStatLine,
  type SeasonResult,
} from "./leagueSeasons";

export type RecordType = "game" | "season" | "career";
export type RecordHolderKind = "player" | "team";
export type RecordStatGroup = "passing" | "receiving" | "rushing" | "scoring" | "defense" | "team";

export interface RecordEntry {
  id: string;
  rank: number;
  holder: string;
  holderId: string;
  number?: string;
  teamId?: string;
  teamName?: string;
  teamShortcode?: string;
  value: number;
  formattedValue: string;
  /** Opponent / date for game records, season title for season records, span for career records. */
  context: string;
  seasonId?: string;
  seasonTitle?: string;
  matchId?: string;
  /** True when the mark was set in the season still in progress. */
  isCurrentSeason?: boolean;
}

export interface RecordCategory {
  id: string;
  title: string;
  recordType: RecordType;
  holderKind: RecordHolderKind;
  statGroup: RecordStatGroup;
  lowerIsBetter?: boolean;
  entries: RecordEntry[];
}

export interface RecordBook {
  game: RecordCategory[];
  season: RecordCategory[];
  career: RecordCategory[];
}

export interface RecordStandingRow {
  id: string;
  name: string;
  shortcode?: string;
  played?: number;
  won: number;
  lost: number;
  tied: number;
  pf: number;
  pa: number;
}

/** One season's worth of data, either an archived snapshot or the live season. */
export interface RecordSeasonInput {
  seasonId: string;
  title: string;
  number: number;
  isCurrent: boolean;
  championTeamId?: string;
  standings: RecordStandingRow[];
  playerStats: PlayerStatLine[];
  results: SeasonResult[];
  gameLeaders?: GameLeaderBoard;
}

export interface BuildRecordBookOptions {
  /** League books rank every team; team books only rank `teamId`'s games, seasons and players. */
  scope: "league" | "team";
  teamId?: string;
  /** Max entries kept per category. Game categories are also bounded by snapshot storage. */
  limit?: number;
}

export const DEFAULT_RECORD_LIMIT = 50;

type PlayerCategoryDef = { key: PlayerStatKey; title: string; statGroup: RecordStatGroup };

const PLAYER_GAME_CATEGORIES: Array<PlayerCategoryDef & { key: GameLeaderKey }> = [
  { key: "passTD", title: "Passing TDs", statGroup: "passing" },
  { key: "passComp", title: "Completions", statGroup: "passing" },
  { key: "passAtt", title: "Pass Attempts", statGroup: "passing" },
  { key: "receptions", title: "Receptions", statGroup: "receiving" },
  { key: "recTD", title: "Receiving TDs", statGroup: "receiving" },
  { key: "rushAtt", title: "Rush Attempts", statGroup: "rushing" },
  { key: "rushTD", title: "Rushing TDs", statGroup: "rushing" },
  { key: "totalTDs", title: "Total TDs", statGroup: "scoring" },
  { key: "flagPulls", title: "Flag Pulls", statGroup: "defense" },
  { key: "sacks", title: "Sacks", statGroup: "defense" },
  { key: "int", title: "Interceptions", statGroup: "defense" },
  { key: "pbu", title: "Pass Breakups", statGroup: "defense" },
  { key: "defTD", title: "Defensive TDs", statGroup: "defense" },
];

const PLAYER_TOTAL_CATEGORIES: PlayerCategoryDef[] = [
  { key: "passTD", title: "Passing TDs", statGroup: "passing" },
  { key: "passComp", title: "Completions", statGroup: "passing" },
  { key: "passAtt", title: "Pass Attempts", statGroup: "passing" },
  { key: "convPass", title: "Conversion Passes", statGroup: "passing" },
  { key: "receptions", title: "Receptions", statGroup: "receiving" },
  { key: "recTD", title: "Receiving TDs", statGroup: "receiving" },
  { key: "convRec", title: "Conversions Scored", statGroup: "receiving" },
  { key: "rushAtt", title: "Rush Attempts", statGroup: "rushing" },
  { key: "rushTD", title: "Rushing TDs", statGroup: "rushing" },
  { key: "totalTDs", title: "Total TDs", statGroup: "scoring" },
  { key: "flagPulls", title: "Flag Pulls", statGroup: "defense" },
  { key: "sacks", title: "Sacks", statGroup: "defense" },
  { key: "int", title: "Interceptions", statGroup: "defense" },
  { key: "pbu", title: "Pass Breakups", statGroup: "defense" },
  { key: "defTD", title: "Defensive TDs", statGroup: "defense" },
  { key: "safeties", title: "Safeties", statGroup: "defense" },
  { key: "gamesPlayed", title: "Games Played", statGroup: "scoring" },
];

export const GAME_LEADER_TITLES: Record<GameLeaderKey, string> = Object.fromEntries(
  PLAYER_GAME_CATEGORIES.map((category) => [category.key, category.title]),
) as Record<GameLeaderKey, string>;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatRecordDate(raw: string | undefined): string {
  if (!raw) return "";
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${MONTHS[Number(month) - 1] || month} ${Number(day)}, ${year}`;
  }
  return raw;
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function formatPct(value: number): string {
  return value.toFixed(3).replace(/^0/, "");
}

/** Standard competition ranking: ties share a rank and the next rank is skipped. */
function rankEntries(entries: RecordEntry[], lowerIsBetter: boolean, limit: number): RecordEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (a.value !== b.value) return lowerIsBetter ? a.value - b.value : b.value - a.value;
    if (Boolean(a.isCurrentSeason) !== Boolean(b.isCurrentSeason)) return a.isCurrentSeason ? 1 : -1;
    return a.holder.localeCompare(b.holder);
  });
  let lastValue: number | undefined;
  let lastRank = 0;
  return sorted.slice(0, limit).map((entry, index) => {
    if (entry.value !== lastValue) {
      lastValue = entry.value;
      lastRank = index + 1;
    }
    return { ...entry, rank: lastRank };
  });
}

function category(
  def: Omit<RecordCategory, "entries">,
  entries: RecordEntry[],
  limit: number,
): RecordCategory | null {
  const ranked = rankEntries(entries, Boolean(def.lowerIsBetter), limit);
  return ranked.length ? { ...def, entries: ranked } : null;
}

function seasonSpan(seasons: Array<{ title: string; number: number }>): string {
  if (!seasons.length) return "";
  const sorted = [...seasons].sort((a, b) => a.number - b.number);
  const first = sorted[0].title;
  const last = sorted[sorted.length - 1].title;
  return sorted.length === 1 ? first : `${first} – ${last} (${sorted.length} seasons)`;
}

function teamPerspective(result: SeasonResult, teamId: string) {
  const isHome = result.homeTeamId === teamId;
  const isAway = result.awayTeamId === teamId;
  if (!isHome && !isAway) return null;
  return {
    id: teamId,
    name: isHome ? result.homeTeamName : result.awayTeamName,
    opponent: isHome ? result.awayTeamName : result.homeTeamName,
    scored: isHome ? result.homeScore : result.awayScore,
    allowed: isHome ? result.awayScore : result.homeScore,
  };
}

function gameContext(opponent: string, date: string, seasonTitle: string): string {
  const when = formatRecordDate(date);
  return [`vs ${opponent || "Opponent"}`, when, seasonTitle].filter(Boolean).join(" · ");
}

export function buildRecordBook(seasons: RecordSeasonInput[], options: BuildRecordBookOptions): RecordBook {
  const limit = options.limit ?? DEFAULT_RECORD_LIMIT;
  const scopedTeamId = options.scope === "team" ? options.teamId || "" : "";
  const inScope = (teamId: string | undefined) => !scopedTeamId || teamId === scopedTeamId;
  const ordered = seasons
    .map((input) => ({
      ...input,
      standings: input.standings || [],
      playerStats: input.playerStats || [],
      results: input.results || [],
    }))
    .sort((a, b) => a.number - b.number);

  const game: RecordCategory[] = [];
  const season: RecordCategory[] = [];
  const career: RecordCategory[] = [];

  // --- Team single-game records ---
  const teamGameEntries = {
    points: [] as RecordEntry[],
    margin: [] as RecordEntry[],
    fewestAllowed: [] as RecordEntry[],
    combined: [] as RecordEntry[],
  };
  ordered.forEach((input) => {
    input.results.forEach((result) => {
      const teamIds = scopedTeamId ? [scopedTeamId] : [result.homeTeamId, result.awayTeamId];
      teamIds.forEach((teamId) => {
        const view = teamPerspective(result, teamId);
        if (!view) return;
        const base = {
          holder: view.name,
          holderId: view.id,
          teamId: view.id,
          teamName: view.name,
          context: gameContext(view.opponent, result.date, input.title),
          seasonId: input.seasonId,
          seasonTitle: input.title,
          matchId: result.id,
          isCurrentSeason: input.isCurrent,
          rank: 0,
        };
        const key = `${result.id}:${teamId}`;
        teamGameEntries.points.push({ ...base, id: `pts:${key}`, value: view.scored, formattedValue: String(view.scored) });
        const margin = view.scored - view.allowed;
        if (margin > 0) {
          teamGameEntries.margin.push({ ...base, id: `margin:${key}`, value: margin, formattedValue: formatSigned(margin) });
        }
        teamGameEntries.fewestAllowed.push({ ...base, id: `allowed:${key}`, value: view.allowed, formattedValue: String(view.allowed) });
        if (!scopedTeamId && teamId === result.homeTeamId) {
          const combined = result.homeScore + result.awayScore;
          teamGameEntries.combined.push({
            ...base,
            id: `combined:${result.id}`,
            holder: `${result.homeTeamName} vs ${result.awayTeamName}`,
            holderId: result.id,
            context: [`${result.homeScore}–${result.awayScore}`, formatRecordDate(result.date), input.title].filter(Boolean).join(" · "),
            value: combined,
            formattedValue: String(combined),
          });
        }
      });
    });
  });
  const teamGame: Array<[RecordEntry[], Omit<RecordCategory, "entries">]> = [
    [teamGameEntries.points, { id: "team-game-points", title: "Most Points in a Game", recordType: "game", holderKind: "team", statGroup: "team" }],
    [teamGameEntries.margin, { id: "team-game-margin", title: "Largest Margin of Victory", recordType: "game", holderKind: "team", statGroup: "team" }],
    [teamGameEntries.fewestAllowed, { id: "team-game-fewest-allowed", title: "Fewest Points Allowed in a Game", recordType: "game", holderKind: "team", statGroup: "team", lowerIsBetter: true }],
    [teamGameEntries.combined, { id: "team-game-combined", title: "Highest-Scoring Game", recordType: "game", holderKind: "team", statGroup: "team" }],
  ];
  teamGame.forEach(([entries, def]) => {
    const built = category(def, entries, limit);
    if (built) game.push(built);
  });

  // --- Player single-game records ---
  PLAYER_GAME_CATEGORIES.forEach((def) => {
    const entries: RecordEntry[] = [];
    ordered.forEach((input) => {
      (input.gameLeaders?.[def.key] || []).forEach((leader) => {
        if (!inScope(leader.teamId)) return;
        entries.push({
          id: `${def.key}:${leader.matchId}:${leader.playerId || leader.name}`,
          rank: 0,
          holder: leader.name,
          holderId: leader.playerId || leader.name,
          number: leader.number,
          teamId: leader.teamId,
          teamName: leader.teamName,
          teamShortcode: leader.teamShortcode,
          value: leader.value,
          formattedValue: String(leader.value),
          context: gameContext(leader.opponentName, leader.date, input.title),
          seasonId: input.seasonId,
          seasonTitle: input.title,
          matchId: leader.matchId,
          isCurrentSeason: input.isCurrent,
        });
      });
    });
    const built = category({ id: `player-game-${def.key}`, title: def.title, recordType: "game", holderKind: "player", statGroup: def.statGroup }, entries, limit);
    if (built) game.push(built);
  });

  // --- Team single-season records ---
  const teamSeasonEntries = { wins: [] as RecordEntry[], pf: [] as RecordEntry[], pa: [] as RecordEntry[], diff: [] as RecordEntry[], winPct: [] as RecordEntry[] };
  ordered.forEach((input) => {
    input.standings.forEach((row) => {
      if (!inScope(row.id)) return;
      const played = row.played ?? row.won + row.lost + row.tied;
      if (!played) return;
      const base = {
        rank: 0,
        holder: row.name,
        holderId: row.id,
        teamId: row.id,
        teamName: row.name,
        teamShortcode: row.shortcode,
        context: `${input.title} · ${row.won}-${row.lost}${row.tied ? `-${row.tied}` : ""}`,
        seasonId: input.seasonId,
        seasonTitle: input.title,
        isCurrentSeason: input.isCurrent,
      };
      const key = `${input.seasonId}:${row.id}`;
      teamSeasonEntries.wins.push({ ...base, id: `wins:${key}`, value: row.won, formattedValue: String(row.won) });
      teamSeasonEntries.pf.push({ ...base, id: `pf:${key}`, value: row.pf, formattedValue: String(row.pf) });
      const diff = row.pf - row.pa;
      teamSeasonEntries.diff.push({ ...base, id: `diff:${key}`, value: diff, formattedValue: formatSigned(diff) });
      const winPct = (row.won + 0.5 * row.tied) / played;
      teamSeasonEntries.winPct.push({ ...base, id: `pct:${key}`, value: winPct, formattedValue: formatPct(winPct) });
      // A season still in progress can't hold a "fewest allowed" mark; it only gets harder to keep.
      if (!input.isCurrent) {
        teamSeasonEntries.pa.push({ ...base, id: `pa:${key}`, value: row.pa, formattedValue: String(row.pa) });
      }
    });
  });
  const teamSeason: Array<[RecordEntry[], Omit<RecordCategory, "entries">]> = [
    [teamSeasonEntries.wins, { id: "team-season-wins", title: "Most Wins in a Season", recordType: "season", holderKind: "team", statGroup: "team" }],
    [teamSeasonEntries.winPct, { id: "team-season-win-pct", title: "Best Win Percentage", recordType: "season", holderKind: "team", statGroup: "team" }],
    [teamSeasonEntries.pf, { id: "team-season-pf", title: "Most Points in a Season", recordType: "season", holderKind: "team", statGroup: "team" }],
    [teamSeasonEntries.pa, { id: "team-season-pa", title: "Fewest Points Allowed in a Season", recordType: "season", holderKind: "team", statGroup: "team", lowerIsBetter: true }],
    [teamSeasonEntries.diff, { id: "team-season-diff", title: "Best Point Differential", recordType: "season", holderKind: "team", statGroup: "team" }],
  ];
  teamSeason.forEach(([entries, def]) => {
    const built = category(def, entries, limit);
    if (built) season.push(built);
  });

  // --- Player single-season records ---
  PLAYER_TOTAL_CATEGORIES.forEach((def) => {
    const entries: RecordEntry[] = [];
    ordered.forEach((input) => {
      input.playerStats.forEach((line) => {
        if (!inScope(line.teamId)) return;
        const value = line[def.key] || 0;
        if (value <= 0) return;
        entries.push({
          id: `${def.key}:${input.seasonId}:${line.playerId || line.name}`,
          rank: 0,
          holder: line.name,
          holderId: line.playerId || line.name,
          number: line.number,
          teamId: line.teamId,
          teamName: line.teamName,
          teamShortcode: line.teamShortcode,
          value,
          formattedValue: String(value),
          context: input.title,
          seasonId: input.seasonId,
          seasonTitle: input.title,
          isCurrentSeason: input.isCurrent,
        });
      });
    });
    const built = category({ id: `player-season-${def.key}`, title: def.title, recordType: "season", holderKind: "player", statGroup: def.statGroup }, entries, limit);
    if (built) season.push(built);
  });

  // --- Team all-time records (league scope only; a single team's totals aren't a leaderboard) ---
  if (!scopedTeamId) {
    const totals = new Map<string, { name: string; shortcode?: string; won: number; lost: number; tied: number; pf: number; pa: number; seasons: Array<{ title: string; number: number }>; titles: number }>();
    ordered.forEach((input) => {
      input.standings.forEach((row) => {
        const played = row.played ?? row.won + row.lost + row.tied;
        if (!played) return;
        const total = totals.get(row.id) || { name: row.name, shortcode: row.shortcode, won: 0, lost: 0, tied: 0, pf: 0, pa: 0, seasons: [], titles: 0 };
        total.name = row.name || total.name;
        total.won += row.won; total.lost += row.lost; total.tied += row.tied; total.pf += row.pf; total.pa += row.pa;
        total.seasons.push({ title: input.title, number: input.number });
        if (input.championTeamId && input.championTeamId === row.id) total.titles += 1;
        totals.set(row.id, total);
      });
    });
    const wins: RecordEntry[] = [];
    const points: RecordEntry[] = [];
    const titles: RecordEntry[] = [];
    const winPct: RecordEntry[] = [];
    totals.forEach((total, teamId) => {
      const played = total.won + total.lost + total.tied;
      const base = {
        rank: 0, holder: total.name, holderId: teamId, teamId, teamName: total.name, teamShortcode: total.shortcode,
        context: `${seasonSpan(total.seasons)} · ${total.won}-${total.lost}${total.tied ? `-${total.tied}` : ""}`,
      };
      wins.push({ ...base, id: `wins:${teamId}`, value: total.won, formattedValue: String(total.won) });
      points.push({ ...base, id: `pf:${teamId}`, value: total.pf, formattedValue: String(total.pf) });
      const pct = (total.won + 0.5 * total.tied) / played;
      winPct.push({ ...base, id: `pct:${teamId}`, value: pct, formattedValue: formatPct(pct) });
      if (total.titles > 0) titles.push({ ...base, id: `titles:${teamId}`, value: total.titles, formattedValue: String(total.titles) });
    });
    [
      category({ id: "team-career-titles", title: "Championships", recordType: "career", holderKind: "team", statGroup: "team" }, titles, limit),
      category({ id: "team-career-wins", title: "All-Time Wins", recordType: "career", holderKind: "team", statGroup: "team" }, wins, limit),
      category({ id: "team-career-win-pct", title: "All-Time Win Percentage", recordType: "career", holderKind: "team", statGroup: "team" }, winPct, limit),
      category({ id: "team-career-pf", title: "All-Time Points Scored", recordType: "career", holderKind: "team", statGroup: "team" }, points, limit),
    ].forEach((built) => { if (built) career.push(built); });
  }

  // --- Player career records ---
  const careers = buildCareerSummaries(ordered.map((input) => ({
    seasonId: input.seasonId,
    title: input.title,
    number: input.number,
    isCurrent: input.isCurrent,
    championTeamId: input.championTeamId,
    playerStats: input.playerStats.filter((line) => inScope(line.teamId)),
  })));
  PLAYER_TOTAL_CATEGORIES.forEach((def) => {
    const entries: RecordEntry[] = careers.flatMap((summary) => {
      const value = summary.totals[def.key] || 0;
      if (value <= 0) return [];
      const latest = summary.seasons[summary.seasons.length - 1];
      return [{
        id: `${def.key}:${summary.key}`,
        rank: 0,
        holder: summary.name,
        holderId: summary.playerId || summary.name,
        number: latest?.line.number,
        teamId: latest?.line.teamId,
        teamName: latest?.line.teamName,
        teamShortcode: latest?.line.teamShortcode,
        value,
        formattedValue: String(value),
        context: seasonSpan(summary.seasons.map((entry) => ({ title: entry.seasonTitle, number: entry.number }))),
        isCurrentSeason: summary.seasons.some((entry) => entry.isCurrent),
      }];
    });
    const built = category({ id: `player-career-${def.key}`, title: def.title, recordType: "career", holderKind: "player", statGroup: def.statGroup }, entries, limit);
    if (built) career.push(built);
  });

  return { game, season, career };
}

/**
 * Builds the live-season input for {@link buildRecordBook} from raw matches and plays, so the season
 * in progress is ranked alongside archived snapshots using the exact same math.
 */
export function buildLiveRecordSeasonInput({ seasonId, title, number, standings, playerStats, matches, plays, teamNames, rosterTeamId, championTeamId }: {
  seasonId: string;
  title: string;
  number: number;
  standings: RecordStandingRow[];
  playerStats: PlayerStatLine[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  matches: Array<Record<string, any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plays: Array<Record<string, any>>;
  teamNames?: Record<string, string>;
  rosterTeamId?: string;
  championTeamId?: string;
}): RecordSeasonInput {
  const visibleMatches = matches.filter((match) => !match.isHidden);
  const visiblePlays = plays.filter((play) => !play.isHidden);
  return {
    seasonId,
    title,
    number,
    isCurrent: true,
    championTeamId,
    standings,
    playerStats,
    results: buildSeasonResults(visibleMatches, teamNames || {}),
    gameLeaders: computeGameLeaders({ playerStats, matches: visibleMatches, plays: visiblePlays, rosterTeamId }),
  };
}
