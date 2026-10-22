import { describe, expect, it } from "vitest";
import {
  buildPlayoffFixtureTemplates,
  computePlayoffMatchupUpdates,
  generatePlayoffBracket,
  getPlayoffChampionId,
  getPlayoffSeedOrder,
  type TeamStanding,
} from "@/lib/standingsEngine";
import type { PlayoffFormat } from "@/lib/leagueContext";

const standing = (rank: number): TeamStanding => ({
  teamId: `t${rank}`,
  teamName: `Team ${rank}`,
  gamesPlayed: 3,
  wins: 4 - rank,
  losses: rank - 1,
  ties: 0,
  winPct: 0,
  pointsFor: 0,
  pointsAgainst: 0,
  diff: 0,
  streak: "",
  rank,
  playoffStatus: "in_spot",
});

const format = { structure: "single_elimination", teamsCount: 4 } as unknown as PlayoffFormat;

describe("playoff fixture templates", () => {
  it("uses standard seed order", () => {
    expect(getPlayoffSeedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it("builds a 4-team bracket with TBD semifinals feeding a championship", () => {
    const fixtures = buildPlayoffFixtureTemplates(4);
    expect(fixtures.map((f) => [f.playoffRound, f.homeTeamName, f.awayTeamName])).toEqual([
      ["Semifinals", "#1 Seed", "#4 Seed"],
      ["Semifinals", "#2 Seed", "#3 Seed"],
      ["Championship", "Winner Semifinals 1", "Winner Semifinals 2"],
    ]);
  });

  it("gives top seeds byes for non power-of-two fields", () => {
    const fixtures = buildPlayoffFixtureTemplates(6);
    expect(fixtures.filter((f) => f.roundIndex === 0)).toHaveLength(2);
    expect(fixtures.filter((f) => f.roundIndex === 1)).toHaveLength(2);
    expect(fixtures.at(-1)?.playoffRound).toBe("Championship");
    expect(fixtures.find((f) => f.roundIndex === 1)?.homeTeamName).toBe("#1 Seed");
  });
});

describe("computePlayoffMatchupUpdates", () => {
  const standings = [1, 2, 3, 4].map(standing);
  const regular = [{ id: "r1", status: "completed", homeTeamId: "t1", awayTeamId: "t2", week: 1 }];
  const playoffs = buildPlayoffFixtureTemplates(4).map((f, i) => ({
    id: `p${i}`,
    isPlayoff: true,
    status: "scheduled",
    homeTeamId: "",
    awayTeamId: "",
    ...f,
  }));

  it("waits for the regular season to finish", () => {
    const pending = [{ ...regular[0], status: "scheduled" }, ...playoffs];
    expect(computePlayoffMatchupUpdates(standings, format, pending)).toEqual([]);
  });

  it("seeds first-round games from standings", () => {
    const updates = computePlayoffMatchupUpdates(standings, format, [...regular, ...playoffs]);
    expect(updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ matchId: "p0", homeTeamId: "t1", awayTeamId: "t4" }),
        expect.objectContaining({ matchId: "p1", homeTeamId: "t2", awayTeamId: "t3" }),
      ])
    );
    expect(updates.find((u) => u.matchId === "p2")).toBeUndefined();
  });

  it("advances winners and crowns a champion", () => {
    const seeded = [
      ...regular,
      { ...playoffs[0], homeTeamId: "t1", awayTeamId: "t4", homeTeamName: "Team 1", awayTeamName: "Team 4", status: "completed", homeScore: 20, awayScore: 6 },
      { ...playoffs[1], homeTeamId: "t2", awayTeamId: "t3", homeTeamName: "Team 2", awayTeamName: "Team 3", status: "completed", homeScore: 7, awayScore: 14 },
      playoffs[2],
    ];
    const updates = computePlayoffMatchupUpdates(standings, format, seeded);
    expect(updates).toEqual([
      expect.objectContaining({ matchId: "p2", homeTeamId: "t1", awayTeamId: "t3" }),
    ]);

    const finished = seeded.map((m) =>
      m.id === "p2"
        ? { ...m, homeTeamId: "t1", awayTeamId: "t3", status: "completed", homeScore: 3, awayScore: 10 }
        : m
    );
    expect(getPlayoffChampionId(generatePlayoffBracket(standings, format, finished))).toBe("t3");
  });

  it("never overrides manual matchups", () => {
    const manual = playoffs.map((m) => ({ ...m, manualMatchup: true }));
    expect(computePlayoffMatchupUpdates(standings, format, [...regular, ...manual])).toEqual([]);
  });
});
