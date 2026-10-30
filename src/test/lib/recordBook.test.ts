import { describe, expect, it } from "vitest";
import { emptyPlayerStatLine, type PlayerStatLine } from "@/lib/leagueSeasons";
import { buildLiveRecordSeasonInput, buildRecordBook, type RecordSeasonInput } from "@/lib/recordBook";

function line(name: string, teamId: string, stats: Partial<Record<keyof PlayerStatLine, number>>, playerId = name.toLowerCase().replace(/\s/g, "-")): PlayerStatLine {
  const base = emptyPlayerStatLine({ playerId, name, number: "1", teamId, teamName: teamId.toUpperCase(), teamShortcode: teamId.slice(0, 3).toUpperCase() });
  return { ...base, ...stats } as PlayerStatLine;
}

const seasonOne: RecordSeasonInput = {
  seasonId: "season-1",
  title: "Spring 2025",
  number: 1,
  isCurrent: false,
  championTeamId: "apex",
  standings: [
    { id: "apex", name: "APEX", won: 8, lost: 2, tied: 0, pf: 240, pa: 120 },
    { id: "rivals", name: "RIVALS", won: 2, lost: 8, tied: 0, pf: 120, pa: 240 },
  ],
  playerStats: [
    line("Marcus Jones", "apex", { passTD: 20, totalTDs: 2, gamesPlayed: 10 }),
    line("Devin White", "apex", { receptions: 30, recTD: 12, totalTDs: 12, gamesPlayed: 10 }),
    line("Rival QB", "rivals", { passTD: 9, gamesPlayed: 10 }),
  ],
  results: [
    { id: "m1", date: "2025-03-01", homeTeamId: "apex", awayTeamId: "rivals", homeTeamName: "APEX", awayTeamName: "RIVALS", homeScore: 42, awayScore: 6, isPlayoff: false },
    { id: "m2", date: "2025-03-08", homeTeamId: "rivals", awayTeamId: "apex", homeTeamName: "RIVALS", awayTeamName: "APEX", homeScore: 20, awayScore: 21, isPlayoff: false },
  ],
  gameLeaders: {
    passTD: [
      { playerId: "marcus-jones", name: "Marcus Jones", number: "1", teamId: "apex", teamName: "APEX", teamShortcode: "APE", matchId: "m1", date: "2025-03-01", opponentName: "RIVALS", value: 6 },
      { playerId: "rival-qb", name: "Rival QB", number: "1", teamId: "rivals", teamName: "RIVALS", teamShortcode: "RIV", matchId: "m2", date: "2025-03-08", opponentName: "APEX", value: 3 },
    ],
  },
};

const seasonTwo: RecordSeasonInput = {
  seasonId: "season-2",
  title: "Fall 2025",
  number: 2,
  isCurrent: true,
  standings: [
    { id: "apex", name: "APEX", won: 3, lost: 0, tied: 0, pf: 90, pa: 10 },
    { id: "rivals", name: "RIVALS", won: 0, lost: 3, tied: 0, pf: 10, pa: 90 },
  ],
  playerStats: [
    line("Marcus Jones", "apex", { passTD: 7, gamesPlayed: 3 }),
    line("Rival QB", "rivals", { passTD: 1, gamesPlayed: 3 }),
  ],
  results: [
    { id: "m3", date: "2025-09-01", homeTeamId: "apex", awayTeamId: "rivals", homeTeamName: "APEX", awayTeamName: "RIVALS", homeScore: 35, awayScore: 0, isPlayoff: false },
  ],
  gameLeaders: {
    passTD: [
      { playerId: "marcus-jones", name: "Marcus Jones", number: "1", teamId: "apex", teamName: "APEX", teamShortcode: "APE", matchId: "m3", date: "2025-09-01", opponentName: "RIVALS", value: 6 },
    ],
  },
};

function find(book: ReturnType<typeof buildRecordBook>, type: "game" | "season" | "career", id: string) {
  const found = book[type].find((category) => category.id === id);
  if (!found) throw new Error(`Missing category ${id}`);
  return found;
}

describe("buildRecordBook (league scope)", () => {
  const book = buildRecordBook([seasonTwo, seasonOne], { scope: "league" });

  it("ranks player single-game marks across seasons with shared ranks for ties", () => {
    const passTD = find(book, "game", "player-game-passTD");
    expect(passTD.entries.map((entry) => [entry.rank, entry.holder, entry.value, entry.seasonTitle])).toEqual([
      [1, "Marcus Jones", 6, "Spring 2025"],
      [1, "Marcus Jones", 6, "Fall 2025"],
      [3, "Rival QB", 3, "Spring 2025"],
    ]);
    expect(passTD.entries[0].context).toBe("vs RIVALS · Mar 1, 2025 · Spring 2025");
    expect(passTD.entries[1].isCurrentSeason).toBe(true);
  });

  it("produces team single-game records from both perspectives of every result", () => {
    const points = find(book, "game", "team-game-points");
    expect(points.entries[0]).toMatchObject({ rank: 1, holder: "APEX", value: 42, matchId: "m1" });
    expect(points.entries.map((entry) => entry.value)).toEqual([42, 35, 21, 20, 6, 0]);

    const margin = find(book, "game", "team-game-margin");
    expect(margin.entries.map((entry) => entry.formattedValue)).toEqual(["+36", "+35", "+1"]);

    const fewest = find(book, "game", "team-game-fewest-allowed");
    expect(fewest.lowerIsBetter).toBe(true);
    expect(fewest.entries[0]).toMatchObject({ holder: "APEX", value: 0, matchId: "m3" });

    const combined = find(book, "game", "team-game-combined");
    expect(combined.entries[0]).toMatchObject({ holder: "APEX vs RIVALS", value: 48 });
  });

  it("builds season and career leaderboards for players and teams", () => {
    const seasonPassTD = find(book, "season", "player-season-passTD");
    expect(seasonPassTD.entries.slice(0, 3).map((entry) => [entry.holder, entry.value, entry.context])).toEqual([
      ["Marcus Jones", 20, "Spring 2025"],
      ["Rival QB", 9, "Spring 2025"],
      ["Marcus Jones", 7, "Fall 2025"],
    ]);

    const wins = find(book, "season", "team-season-wins");
    expect(wins.entries[0]).toMatchObject({ holder: "APEX", value: 8, context: "Spring 2025 · 8-2" });

    // The in-progress season cannot hold the "fewest allowed" season mark.
    const fewestSeason = find(book, "season", "team-season-pa");
    expect(fewestSeason.entries.every((entry) => entry.seasonId === "season-1")).toBe(true);

    const careerPassTD = find(book, "career", "player-career-passTD");
    expect(careerPassTD.entries[0]).toMatchObject({ holder: "Marcus Jones", value: 27, context: "Spring 2025 – Fall 2025 (2 seasons)" });

    const allTimeWins = find(book, "career", "team-career-wins");
    expect(allTimeWins.entries[0]).toMatchObject({ holder: "APEX", value: 11 });
    expect(find(book, "career", "team-career-titles").entries).toEqual([
      expect.objectContaining({ holder: "APEX", value: 1 }),
    ]);
  });

  it("omits categories with no qualifying marks", () => {
    expect(book.game.find((category) => category.id === "player-game-sacks")).toBeUndefined();
  });
});

describe("buildRecordBook (team scope)", () => {
  const book = buildRecordBook([seasonOne, seasonTwo], { scope: "team", teamId: "apex" });

  it("only ranks the scoped team's games, players and seasons", () => {
    const points = find(book, "game", "team-game-points");
    expect(points.entries.every((entry) => entry.holder === "APEX")).toBe(true);
    expect(points.entries.map((entry) => entry.value)).toEqual([42, 35, 21]);

    const passTD = find(book, "game", "player-game-passTD");
    expect(passTD.entries.every((entry) => entry.holder === "Marcus Jones")).toBe(true);

    expect(find(book, "season", "team-season-wins").entries.map((entry) => entry.seasonTitle)).toEqual(["Spring 2025", "Fall 2025"]);
    expect(book.game.find((category) => category.id === "team-game-combined")).toBeUndefined();
    expect(book.career.find((category) => category.id === "team-career-wins")).toBeUndefined();
    expect(find(book, "career", "player-career-receptions").entries[0]).toMatchObject({ holder: "Devin White", value: 30 });
  });

  it("respects the per-category limit", () => {
    const limited = buildRecordBook([seasonOne, seasonTwo], { scope: "team", teamId: "apex", limit: 1 });
    expect(find(limited, "game", "team-game-points").entries).toHaveLength(1);
  });
});

describe("buildLiveRecordSeasonInput", () => {
  it("derives results and single-game leaders from raw matches and plays", () => {
    const playerStats = [line("Marcus Jones", "apex", { passTD: 2 }), line("Devin White", "apex", { recTD: 2 })];
    const input = buildLiveRecordSeasonInput({
      seasonId: "season-3",
      title: "Live",
      number: 3,
      standings: [],
      playerStats,
      matches: [
        { id: "live-1", status: "completed", date: "2026-01-10", homeTeamId: "apex", awayTeamId: "rivals", homeScore: 14, awayScore: 7 },
        { id: "live-2", status: "scheduled", homeTeamId: "apex", awayTeamId: "rivals" },
      ],
      plays: [
        { matchId: "live-1", playType: "Pass", qbPlayerId: "Marcus Jones", receiverPlayerId: "Devin White", passOutcome: "Complete", isTouchdown: true },
        { matchId: "live-1", playType: "Pass", qbPlayerId: "Marcus Jones", receiverPlayerId: "Devin White", passOutcome: "Complete", isTouchdown: true },
        { matchId: "live-2", playType: "Pass", qbPlayerId: "Marcus Jones", receiverPlayerId: "Devin White", passOutcome: "Complete", isTouchdown: true },
      ],
      teamNames: { apex: "APEX", rivals: "RIVALS" },
    });

    expect(input.isCurrent).toBe(true);
    expect(input.results).toEqual([expect.objectContaining({ id: "live-1", homeTeamName: "APEX", awayTeamName: "RIVALS" })]);
    expect(input.gameLeaders?.passTD?.[0]).toMatchObject({ name: "Marcus Jones", value: 2, opponentName: "Opponent" });
    expect(input.gameLeaders?.recTD?.[0]).toMatchObject({ name: "Devin White", value: 2 });
  });
});
