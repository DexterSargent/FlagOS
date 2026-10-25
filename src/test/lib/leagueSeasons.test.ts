import { describe, expect, it } from "vitest";
import {
  buildCareerSummaries,
  buildSeasonSnapshot,
  computeLeagueSeasonStats,
  createSeasonId,
  determineSeasonChampion,
  getCurrentSeasonId,
  getLeagueSeasons,
  INITIAL_SEASON_ID,
  isMatchInSeason,
  parseSeasonSnapshot,
  seasonSnapshotDocId,
} from "@/lib/leagueSeasons";

const teams = [
  { id: "t1", name: "Red Hawks" },
  { id: "t2", name: "Blue Jays", shortcode: "BJ" },
];
const players = [
  { id: "p1", playerName: "Alex", teamId: "t1", number: 7 },
  { id: "p2", playerName: "Blake", teamId: "t1", number: 11 },
  { id: "p3", playerName: "Casey", teamId: "t2", number: 3 },
];

function match(id: string, homeScore: number, awayScore: number, extra: Record<string, unknown> = {}) {
  return { id, homeTeamId: "t1", awayTeamId: "t2", homeScore, awayScore, status: "completed", ...extra };
}

describe("getLeagueSeasons", () => {
  it("falls back to a single first season for legacy leagues", () => {
    expect(getLeagueSeasons({ seasonTitle: "Fall 2026" })).toEqual([
      { id: INITIAL_SEASON_ID, title: "Fall 2026", status: "active", number: 1 },
    ]);
    expect(getCurrentSeasonId({})).toBe(INITIAL_SEASON_ID);
  });

  it("sorts stored seasons and names the live season from seasonTitle", () => {
    const seasons = getLeagueSeasons({
      currentSeasonId: "season-2-abc",
      seasonTitle: "Spring 2027 (renamed)",
      seasons: [
        { id: "season-2-abc", title: "Spring 2027", status: "active", number: 2 },
        { id: "season-1", title: "Fall 2026", status: "archived", number: 1, championTeamName: "Red Hawks" },
        { title: "missing id" },
      ],
    });
    expect(seasons.map((season) => season.id)).toEqual(["season-1", "season-2-abc"]);
    expect(seasons[0]).toMatchObject({ status: "archived", championTeamName: "Red Hawks", title: "Fall 2026" });
    expect(seasons[1].title).toBe("Spring 2027 (renamed)");
  });
});

describe("season ids", () => {
  it("creates unique, query-safe ids and treats legacy matches as season one", () => {
    expect(createSeasonId(3, "A_b9!")).toBe("season-3-ab9");
    expect(createSeasonId(2, "")).toBe("season-2-x");
    expect(isMatchInSeason({}, INITIAL_SEASON_ID)).toBe(true);
    expect(isMatchInSeason({ seasonId: "season-2-x" }, INITIAL_SEASON_ID)).toBe(false);
    expect(seasonSnapshotDocId("league1", "season-1")).toBe("league1__season-1");
  });
});

describe("computeLeagueSeasonStats", () => {
  it("builds standings and player lines from completed regular-season games only", () => {
    const matches = [
      match("m1", 21, 14),
      match("m2", 7, 7),
      match("m3", 0, 30, { status: "scheduled" }),
      match("m4", 6, 28, { isPlayoff: true }),
    ];
    const plays = [
      { matchId: "m1", playType: "Pass", qbPlayerId: "Alex", receiverPlayerId: "Blake", passOutcome: "Complete", isTouchdown: true },
      { matchId: "m1", playType: "Run", runnerPlayerId: "Casey", isTouchdown: false },
      { matchId: "m3", playType: "Run", runnerPlayerId: "Casey", isTouchdown: true },
    ];
    const { standings, playerStats } = computeLeagueSeasonStats({ teams, players, matches, plays });
    const hawks = standings.find((row) => row.id === "t1")!;
    expect(hawks).toMatchObject({ played: 2, won: 1, tied: 1, pts: 3, pf: 28, pa: 21, diff: 7, rank: 1, shortcode: "RH" });
    const alex = playerStats.find((line) => line.name === "Alex")!;
    const blake = playerStats.find((line) => line.name === "Blake")!;
    const casey = playerStats.find((line) => line.name === "Casey")!;
    expect(alex).toMatchObject({ playerId: "p1", passAtt: 1, passComp: 1, passTD: 1, gamesPlayed: 2 });
    expect(blake).toMatchObject({ receptions: 1, recTD: 1, totalTDs: 1 });
    expect(casey).toMatchObject({ rushAtt: 1, rushTD: 0 });
  });
});

describe("determineSeasonChampion", () => {
  it("uses the last playoff game and falls back to the standings leader", () => {
    const standings = computeLeagueSeasonStats({ teams, players, matches: [match("m1", 21, 14)], plays: [] }).standings;
    expect(determineSeasonChampion([
      match("semi", 14, 7, { isPlayoff: true, matchdayIndex: 5 }),
      match("final", 6, 28, { week: "Playoffs - Final", matchdayIndex: 6 }),
    ], standings)).toEqual({ teamId: "t2", teamName: "Blue Jays" });
    expect(determineSeasonChampion([match("m1", 21, 14)], standings)).toEqual({ teamId: "t1", teamName: "Red Hawks" });
    expect(determineSeasonChampion([], computeLeagueSeasonStats({ teams, players, matches: [], plays: [] }).standings)).toBeNull();
  });
});

describe("season snapshots", () => {
  const snapshot = buildSeasonSnapshot({
    leagueId: "league1",
    season: { id: INITIAL_SEASON_ID, title: "Fall 2026", number: 1, startedAt: "2026-09-01T00:00:00.000Z" },
    teams,
    players,
    matches: [
      match("m1", 21, 14),
      match("old", 50, 0, { seasonId: "season-0-other" }),
      match("hidden", 50, 0, { isHidden: true }),
    ],
    plays: [
      { matchId: "m1", playType: "Pass", qbPlayerId: "Alex", receiverPlayerId: "Blake", passOutcome: "Complete", isTouchdown: true },
      { matchId: "old", playType: "Run", runnerPlayerId: "Casey", isTouchdown: true },
    ],
    endedAt: "2026-12-01T00:00:00.000Z",
  });

  it("only includes the season's own games and stores compact lines", () => {
    expect(snapshot.championTeamId).toBe("t1");
    expect(snapshot.results.map((result) => result.id)).toEqual(["m1"]);
    expect(snapshot.standings.find((row) => row.id === "t1")?.pf).toBe(21);
    const alex = snapshot.playerStats.find((line) => line.name === "Alex") as unknown as Record<string, unknown>;
    expect(alex.passTD).toBe(1);
    expect(alex).not.toHaveProperty("receptions");
    expect(snapshot.playerStats.find((line) => line.name === "Casey")?.rushTD ?? 0).toBe(0);
  });

  it("round-trips through Firestore-shaped data", () => {
    const parsed = parseSeasonSnapshot(JSON.parse(JSON.stringify(snapshot)))!;
    expect(parsed.title).toBe("Fall 2026");
    const alex = parsed.playerStats.find((line) => line.name === "Alex")!;
    expect(alex.receptions).toBe(0);
    expect(alex.passTD).toBe(1);
    expect(parseSeasonSnapshot({ title: "bad" })).toBeNull();
  });
});

describe("buildCareerSummaries", () => {
  it("merges seasons by player id, falls back to name, and counts titles", () => {
    const line = (playerId: string, name: string, teamId: string, totalTDs: number) => ({
      playerId, name, number: "", teamId, teamName: teamId, teamShortcode: "",
      gamesPlayed: 1, passAtt: 0, passComp: 0, passTD: 0, passInt: 0, receptions: 0, recTD: 0, rushAtt: 0, rushTD: 0,
      flagPulls: 0, sacks: 0, int: 0, defTD: 0, convPass: 0, convRec: 0, pbu: 0, safeties: 0, ffl: 0, totalTDs,
    });
    const careers = buildCareerSummaries([
      { seasonId: "s2", title: "Season 2", number: 2, isCurrent: true, playerStats: [line("p1", "Alex", "t2", 3), line("", "Casey", "t2", 1)] },
      { seasonId: "s1", title: "Season 1", number: 1, isCurrent: false, championTeamId: "t1", playerStats: [line("p1", "Alex", "t1", 2), line("", "Casey", "t2", 4)] },
    ]);
    const alex = careers.find((career) => career.playerId === "p1")!;
    expect(alex.totals.totalTDs).toBe(5);
    expect(alex.totals.gamesPlayed).toBe(2);
    expect(alex.championships).toBe(1);
    expect(alex.seasons.map((season) => season.seasonId)).toEqual(["s1", "s2"]);
    const casey = careers.find((career) => career.name === "Casey")!;
    expect(casey.totals.totalTDs).toBe(5);
    expect(casey.championships).toBe(0);
  });
});
