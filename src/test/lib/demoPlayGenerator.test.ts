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

    it("handles odd edge-case scores with safeties or field goals", () => {
      const drives2 = decomposeScore(2);
      expect(drives2.reduce((acc, d) => acc + d.points, 0)).toBe(2);

      const drives5 = decomposeScore(5);
      expect(drives5.reduce((acc, d) => acc + d.points, 0)).toBe(5);

      const drives9 = decomposeScore(9);
      expect(drives9.reduce((acc, d) => acc + d.points, 0)).toBe(9);
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
        if (p.possessionTeamId === completedMatch.homeTeamId) {
          homePoints += pts;
        } else if (p.possessionTeamId === completedMatch.awayTeamId) {
          awayPoints += pts;
        }
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
