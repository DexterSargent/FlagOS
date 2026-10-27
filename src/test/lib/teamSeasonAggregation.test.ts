import { describe, expect, it } from "vitest";
import {
  combineGameSummaries,
  getPlayerSeasonStats,
  isGameStatSummary,
  summarizeGame,
  summarizeTeamSeason,
  TEAM_SEASON_SUMMARY_SCHEMA_VERSION,
  type TeamIdentity,
} from "@/lib/teamSeasonAggregation";
import { calculateTeamComprehensiveStats } from "@/lib/teamStatsCalculator";

const york: TeamIdentity = {
  teamId: "york_lions",
  teamName: "York Lions Women's Flag Football",
  aliases: ["york_lions", "team_york", "york", "yuwffl_lions", "york_wffl", "York Lions"],
};

const matches = [
  { id: "m1", status: "completed", homeTeamId: "york_lions", awayTeamId: "opp_a", homeScore: 21, awayScore: 7, didNotPlay: ["Dana"] },
  { id: "m2", status: "Final", homeTeamId: "opp_b", awayTeamId: "york_wffl", homeScore: 14, awayScore: 6, didNotPlay: ["Dana", "Dana"] },
  { id: "m3", status: "scheduled", homeTeamId: "york_lions", awayTeamId: "opp_c" },
  { id: "m4", status: "completed", homeTeamId: "york_lions", awayTeamId: "opp_d", homeScore: 50, awayScore: 0, isHidden: true },
];

const plays = [
  { id: "p1", matchId: "m1", possessionTeamId: "york_lions", down: 3, playType: "Pass", qbPlayerId: "Quinn", receiverPlayerId: "Riley", passOutcome: "Complete", isTouchdown: true },
  { id: "p2", matchId: "m1", possessionTeamId: "york_lions", playType: "Pass", qbPlayerId: "Quinn", receiverPlayerId: "Riley", passOutcome: "Complete", isConversion: true, conversionAttempt: 1, conversionSuccess: true },
  { id: "p3", matchId: "m1", possessionTeamId: "opp_a", down: 4, playType: "Pass", qbPlayerId: "Opp QB", passOutcome: "Interception", defenders: ["Dana"], flaggers: ["Sky"], isPick6: true },
  { id: "p4", matchId: "m1", possessionTeamId: "york_lions", down: 2, playType: "Pass", qbPlayerId: "Quinn", passOutcome: "Interception", defenders: ["Opp DB"] },
  { id: "p5", matchId: "m1", possessionTeamId: "york_lions", down: 3, playType: "Run", runnerPlayerId: "Riley", isTouchdown: false, isHidden: true },
  { id: "p6", matchId: "m2", possessionTeamId: "York Lions", down: 3, playType: "Run", runnerPlayerId: "Riley", firstDown: false },
  { id: "p7", matchId: "m2", possessionTeamId: "opp_b", down: 1, playType: "Run", defenders: ["Sky"], firstDown: true },
  { id: "p8", matchId: "m3", possessionTeamId: "york_lions", playType: "Pass", qbPlayerId: "Quinn", passOutcome: "Complete", isTouchdown: true },
  { id: "p9", matchId: "m4", possessionTeamId: "york_lions", playType: "Pass", qbPlayerId: "Quinn", passOutcome: "Complete", isTouchdown: true },
];

describe("team season summaries", () => {
  it("matches the whole-season calculator when combining per-game counts", () => {
    const aggregate = summarizeTeamSeason(york, matches, plays);
    const visiblePlays = plays.filter((play) => !play.isHidden);
    const expected = calculateTeamComprehensiveStats("york_lions", matches, visiblePlays, {
      teamName: york.teamName,
      teamAliases: york.aliases,
    });
    expect(aggregate.teamStats).toEqual(expected);
    expect(aggregate.completedGames).toBe(2);
    expect(aggregate.teamStats.recordFormatted).toBe("1-1-0");
  });

  it("derives rates from summed counts instead of averaging per-game percentages", () => {
    const aggregate = summarizeTeamSeason(york, matches, plays);
    // m1: 1/1 third downs, m2: 0/1 ? 50%, never the mean of per-game rates weighted wrongly.
    expect(aggregate.teamStats.thirdDownAttempts).toBe(2);
    expect(aggregate.teamStats.thirdDownConversions).toBe(1);
    expect(aggregate.teamStats.thirdDownFormatted).toBe("50.0% (1/2)");
    expect(aggregate.teamStats.ppg).toBe(13.5);
  });

  it("weights third/fourth down rates by attempts across games and excludes failed downs from turnovers", () => {
    const identity = { teamId: "home" };
    const games = ["a", "b"].map((id) => ({
      id, status: "completed", homeTeamId: "home", awayTeamId: "away",
    }));
    const gamePlays = [3, 4].flatMap((down) => [
      { matchId: "a", possessionTeamId: "home", down, playType: "Run", firstDown: true },
      ...Array.from({ length: 3 }, () => ({
        matchId: "b", possessionTeamId: "home", down, playType: "Pass", passOutcome: "Incomplete", turnover: true,
      })),
    ]);
    const stats = summarizeTeamSeason(identity, games, gamePlays).teamStats;
    expect(stats.thirdDownFormatted).toBe("25.0% (1/4)");
    expect(stats.fourthDownFormatted).toBe("25.0% (1/4)");
    expect(stats.giveaways).toBe(0);
    const opponent = summarizeTeamSeason({ teamId: "away" }, games, gamePlays).teamStats;
    expect(opponent.defThirdDownStopFormatted).toBe("75.0% (3/4)");
    expect(opponent.defFourthDownStopFormatted).toBe("75.0% (3/4)");
    expect(opponent.takeaways).toBe(0);
  });

  it("keeps roster/stats page player semantics including passInt, defTD and conversions", () => {
    const aggregate = summarizeTeamSeason(york, matches, plays);
    expect(aggregate.playerStats.Quinn).toMatchObject({ passAtt: 2, passComp: 1, passTD: 1, passInt: 1, totalTDs: 0, gamesPlayed: 2 });
    expect(aggregate.playerStats.Riley).toMatchObject({ receptions: 1, recTD: 1, rushAtt: 1, rushTD: 0, totalTDs: 1 });
    expect(aggregate.playerStats.Dana).toMatchObject({ int: 1, defTD: 1, totalTDs: 1, gamesPlayed: 0 });
    expect(aggregate.playerStats.Sky).toMatchObject({ flagPulls: 2 });
    // Opponent possession offense and our-possession defenders never credit stats.
    expect(aggregate.playerStats["Opp QB"]).toBeUndefined();
    expect(aggregate.playerStats["Opp DB"]).toBeUndefined();
  });

  it("excludes hidden plays, hidden matches and incomplete games", () => {
    const aggregate = summarizeTeamSeason(york, matches, plays);
    expect(aggregate.playerStats.Riley.rushAtt).toBe(1);
    expect(aggregate.playerStats.Quinn.passTD).toBe(1);
    expect(aggregate.teamStats.pf).toBe(27);
  });

  it("reflects edits and removals because season totals are rebuilt from game summaries", () => {
    const before = summarizeTeamSeason(york, matches, plays);
    const edited = plays.map((play) => play.id === "p1" ? { ...play, passOutcome: "Incomplete", isTouchdown: false } : play);
    const after = summarizeTeamSeason(york, matches, edited.filter((play) => play.id !== "p3"));
    expect(before.playerStats.Quinn.passTD).toBe(1);
    expect(after.playerStats.Quinn.passTD).toBe(0);
    expect(after.playerStats.Riley.receptions).toBe(0);
    expect(after.playerStats.Dana.int).toBe(0);
    expect(after.teamStats.interceptions).toBe(0);
  });

  it("gives roster players without plays games played minus DNPs", () => {
    const aggregate = summarizeTeamSeason(york, matches, plays);
    expect(getPlayerSeasonStats(aggregate, "Bench Player")).toMatchObject({ gamesPlayed: 2, passAtt: 0 });
    expect(getPlayerSeasonStats(aggregate, "Dana").gamesPlayed).toBe(0);
    expect(aggregate.didNotPlayCounts).toEqual({ Dana: 2 });
  });

  it("validates persisted summaries and rejects duplicates and invalid games", () => {
    const summary = summarizeGame(york, matches[0], plays);
    expect(isGameStatSummary(JSON.parse(JSON.stringify(summary)))).toBe(true);
    expect(isGameStatSummary({ ...summary, schemaVersion: 0 })).toBe(false);
    expect(isGameStatSummary({ ...summary, schemaVersion: TEAM_SEASON_SUMMARY_SCHEMA_VERSION - 1 })).toBe(false);
    expect(isGameStatSummary({ ...summary, teamCounts: { ...summary.teamCounts, pf: "21" } })).toBe(false);
    expect(() => combineGameSummaries([summary, summary])).toThrow(/Duplicate/);
    expect(() => summarizeGame(york, matches[2], plays)).toThrow();
    expect(() => summarizeGame(york, matches[3], plays)).toThrow();
  });
});
