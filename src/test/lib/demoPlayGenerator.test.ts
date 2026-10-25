import { describe, it, expect } from "vitest";
import {
  decomposeScore,
  generatePlaysForMatch,
  getGeneratedSeasonPlays,
} from "@/lib/demoPlayGenerator";
import { SEED_DEMO_MATCHES, SEED_DEMO_PLAYERS } from "@/lib/demoSeedData";

describe("demoPlayGenerator", () => {
  describe("decomposeScore", () => {
    it("decomposes 0 points to an empty array", () => {
      expect(decomposeScore(0)).toEqual([]);
      expect(decomposeScore(-5)).toEqual([]);
    });

    it("accurately decomposes various flag football scores so drive points sum exactly to target", () => {
      const testScores = [6, 7, 8, 12, 13, 14, 15, 20, 21, 24, 27, 28, 31, 35, 42];
      for (const targetScore of testScores) {
        const drives = decomposeScore(targetScore);
        const sum = drives.reduce((acc, d) => acc + (d.totalPoints || d.points), 0);
        expect(sum).toBe(targetScore);
        expect(drives.length).toBeGreaterThan(0);
      }
    });

    it("never uses field goals and only produces valid flag football drives", () => {
      for (let score = 2; score <= 60; score++) {
        if (score === 3 || score === 5) continue;
        const drives = decomposeScore(score);
        expect(drives.reduce((acc, d) => acc + d.totalPoints, 0)).toBe(score);
        for (const drive of drives) {
          expect(["pass_td", "rush_td", "safety"]).toContain(drive.type);
          expect([2, 6, 7, 8]).toContain(drive.totalPoints);
        }
      }
    });
  });

  describe("generatePlaysForMatch", () => {
    it("returns empty array for non-completed games", () => {
      const scheduledMatch = SEED_DEMO_MATCHES.find((m) => m.status === "scheduled")!;
      expect(generatePlaysForMatch(scheduledMatch)).toEqual([]);
    });

    it("generates coherent drive sequences matching final scores for a completed match", () => {
      const completedMatch = SEED_DEMO_MATCHES.find(
        (m) => m.status === "completed" && (m.homeScore ?? 0) > 0 && (m.awayScore ?? 0) > 0
      )!;
      const plays = generatePlaysForMatch(completedMatch);

      expect(plays.length).toBeGreaterThan(10);

      // Verify home and away points from scoring plays sum up to final score
      let homePoints = 0;
      let awayPoints = 0;

      for (const p of plays) {
        const pts = p.points || 0;
        // Safeties are scored by the defense, not the team in possession.
        const scoringTeam = p.isSafety
          ? (p.possessionTeamId === completedMatch.homeTeamId ? completedMatch.awayTeamId : completedMatch.homeTeamId)
          : p.possessionTeamId;
        if (scoringTeam === completedMatch.homeTeamId) homePoints += pts;
        else if (scoringTeam === completedMatch.awayTeamId) awayPoints += pts;
      }

      expect(homePoints).toBe(completedMatch.homeScore);
      expect(awayPoints).toBe(completedMatch.awayScore);
    });

    it("links real rostered players to plays", () => {
      const match = SEED_DEMO_MATCHES.find((m) => m.id === "match_w1_1")!;
      const plays = generatePlaysForMatch(match);

      const homePlayers = SEED_DEMO_PLAYERS.filter((p) => p.teamId === match.homeTeamId).map(
        (p) => p.playerName
      );
      const awayPlayers = SEED_DEMO_PLAYERS.filter((p) => p.teamId === match.awayTeamId).map(
        (p) => p.playerName
      );

      // Verify that QBs and receivers on offensive plays belong to the respective teams
      plays.forEach((play) => {
        if (play.possessionTeamId === match.homeTeamId && play.qbPlayerId) {
          expect(homePlayers).toContain(play.qbPlayerId);
        } else if (play.possessionTeamId === match.awayTeamId && play.qbPlayerId) {
          expect(awayPlayers).toContain(play.qbPlayerId);
        }
      });
    });
  });

  it("keeps players added during a demo session out of past games", () => {
    const match = SEED_DEMO_MATCHES.find((m) => m.status === "completed" && (m.homeScore ?? 0) > 0)!;
    const newcomer = { ...SEED_DEMO_PLAYERS.find((p) => p.teamId === match.homeTeamId)!, id: "player_demo_new", playerName: "Brand New Player" };
    const plays = generatePlaysForMatch(match, [newcomer, ...SEED_DEMO_PLAYERS]);
    expect(JSON.stringify(plays)).not.toContain("Brand New Player");
  });

  it("produces exact final scores for every completed seed game", () => {
    for (const match of SEED_DEMO_MATCHES.filter((m) => m.status === "completed")) {
      let home = 0;
      let away = 0;
      for (const p of generatePlaysForMatch(match)) {
        expect(p.result ?? "").not.toMatch(/field goal/i);
        const scorer = p.isSafety ? (p.possessionTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId) : p.possessionTeamId;
        if (scorer === match.homeTeamId) home += p.points || 0;
        else away += p.points || 0;
      }
      expect([home, away]).toEqual([match.homeScore ?? 0, match.awayScore ?? 0]);
    }
  });

  describe("getGeneratedSeasonPlays", () => {
    it("generates plays for all 250 completed regular season matches across Weeks 1-16", () => {
      const seasonPlays = getGeneratedSeasonPlays();
      expect(seasonPlays.length).toBeGreaterThan(5000);

      const completedMatchIds = new Set(
        SEED_DEMO_MATCHES.filter((m) => m.status === "completed").map((m) => m.id)
      );

      const matchIdsWithPlays = new Set(seasonPlays.map((p) => p.matchId));
      for (const id of completedMatchIds) {
        expect(matchIdsWithPlays.has(id)).toBe(true);
      }
    });

    it("caches generated season plays and returns the exact same memoized array on subsequent calls", () => {
      const call1 = getGeneratedSeasonPlays();
      const call2 = getGeneratedSeasonPlays();
      expect(call1).toBe(call2);
    });
  });
});
