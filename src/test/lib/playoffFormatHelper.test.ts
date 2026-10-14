import { describe, it, expect } from "vitest";
import {
  getNearestSimplePlayoffBracket,
  getDefaultPlayoffFormat,
  resolveLeaguePlayoffFormat,
} from "@/lib/leagueContext";
import { calculateStandings, generatePlayoffBracket } from "@/lib/standingsEngine";

describe("Playoff Format & Nearest Simple Bracket Calculation", () => {
  describe("getNearestSimplePlayoffBracket", () => {
    it("returns 4 for 5 teams (user requirement: 5 teams = 4 team playoff)", () => {
      expect(getNearestSimplePlayoffBracket(5)).toBe(4);
    });

    it("returns 16 for 22 teams (user requirement: 22 teams = 16 team playoff)", () => {
      expect(getNearestSimplePlayoffBracket(22)).toBe(16);
    });

    it("handles small team counts (2-3 teams -> 2 team championship)", () => {
      expect(getNearestSimplePlayoffBracket(2)).toBe(2);
      expect(getNearestSimplePlayoffBracket(3)).toBe(2);
    });

    it("handles exact powers of 2", () => {
      expect(getNearestSimplePlayoffBracket(4)).toBe(4);
      expect(getNearestSimplePlayoffBracket(8)).toBe(8);
      expect(getNearestSimplePlayoffBracket(16)).toBe(16);
      expect(getNearestSimplePlayoffBracket(32)).toBe(32);
    });

    it("calculates nearest lower power of 2 for intermediate values", () => {
      expect(getNearestSimplePlayoffBracket(6)).toBe(4);
      expect(getNearestSimplePlayoffBracket(7)).toBe(4);
      expect(getNearestSimplePlayoffBracket(10)).toBe(8);
      expect(getNearestSimplePlayoffBracket(12)).toBe(8);
      expect(getNearestSimplePlayoffBracket(14)).toBe(8);
      expect(getNearestSimplePlayoffBracket(15)).toBe(8);
      expect(getNearestSimplePlayoffBracket(20)).toBe(16);
      expect(getNearestSimplePlayoffBracket(24)).toBe(16);
      expect(getNearestSimplePlayoffBracket(30)).toBe(16);
    });

    it("handles edge cases gracefully (0 or 1 team -> fallback to 4 or 2)", () => {
      expect(getNearestSimplePlayoffBracket(0)).toBe(4);
      expect(getNearestSimplePlayoffBracket(1)).toBe(2);
    });
  });

  describe("getDefaultPlayoffFormat", () => {
    it("generates 4-team simple bracket format for 5 teams without byes", () => {
      const format = getDefaultPlayoffFormat(5);
      expect(format.teamsCount).toBe(4);
      expect(format.structure).toBe("single_elimination");
      expect(format.hasByes).toBe(false);
      expect(format.byesCount).toBe(0);
      expect(format.playoffWeeks).toBe(2); // log2(4) = 2 rounds (Semifinals, Championship)
    });

    it("generates 16-team simple bracket format for 22 teams without byes", () => {
      const format = getDefaultPlayoffFormat(22);
      expect(format.teamsCount).toBe(16);
      expect(format.structure).toBe("single_elimination");
      expect(format.hasByes).toBe(false);
      expect(format.byesCount).toBe(0);
      expect(format.playoffWeeks).toBe(4); // log2(16) = 4 rounds
    });

    it("preserves 14-team NFL playoff format with 2 byes for 32-team NFL demo league", () => {
      const format = getDefaultPlayoffFormat(32, true);
      expect(format.teamsCount).toBe(14);
      expect(format.hasByes).toBe(true);
      expect(format.byesCount).toBe(2);
      expect(format.playoffWeeks).toBe(4);
    });
  });

  describe("resolveLeaguePlayoffFormat", () => {
    it("replaces legacy NFL default (14 teams) on a 5-team league with 4-team simple bracket", () => {
      const legacyFormat = {
        teamsCount: 14,
        structure: "single_elimination" as const,
        hasByes: true,
        byesCount: 2,
        playoffWeeks: 4,
      };
      const resolved = resolveLeaguePlayoffFormat(legacyFormat, 5, false);
      expect(resolved.teamsCount).toBe(4);
      expect(resolved.hasByes).toBe(false);
      expect(resolved.byesCount).toBe(0);
    });

    it("replaces legacy NFL default (14 teams) on a 22-team league with 16-team simple bracket", () => {
      const legacyFormat = {
        teamsCount: 14,
        structure: "single_elimination" as const,
        hasByes: true,
        byesCount: 2,
        playoffWeeks: 4,
      };
      const resolved = resolveLeaguePlayoffFormat(legacyFormat, 22, false);
      expect(resolved.teamsCount).toBe(16);
      expect(resolved.hasByes).toBe(false);
      expect(resolved.byesCount).toBe(0);
    });

    it("preserves 14 teams for the 32-team NFL demo league", () => {
      const nflFormat = {
        teamsCount: 14,
        structure: "single_elimination" as const,
        hasByes: true,
        byesCount: 2,
        playoffWeeks: 4,
      };
      const resolved = resolveLeaguePlayoffFormat(nflFormat, 32, true);
      expect(resolved.teamsCount).toBe(14);
      expect(resolved.hasByes).toBe(true);
    });

    it("preserves user explicit choice if valid within league team count", () => {
      const customFormat = {
        teamsCount: 8,
        structure: "double_elimination" as const,
        hasByes: false,
        byesCount: 0,
        playoffWeeks: 5,
      };
      const resolved = resolveLeaguePlayoffFormat(customFormat, 22, false);
      expect(resolved.teamsCount).toBe(8);
      expect(resolved.structure).toBe("double_elimination");
    });
  });

  describe("standingsEngine integration", () => {
    it("calculateStandings defaults to 4 playoff teams when given 5 teams", () => {
      const teams = [
        { id: "t1", name: "Team 1" },
        { id: "t2", name: "Team 2" },
        { id: "t3", name: "Team 3" },
        { id: "t4", name: "Team 4" },
        { id: "t5", name: "Team 5" },
      ];
      const matches: any[] = [];
      const standings = calculateStandings(teams, matches);
      // Top 4 are in hunt / in playoff spot, 5th is outside
      const inSpotCount = standings.filter((s) => s.playoffStatus === "in_spot").length;
      expect(inSpotCount).toBe(4);
    });

    it("calculateStandings defaults to 16 playoff teams when given 22 teams", () => {
      const teams = Array.from({ length: 22 }, (_, i) => ({
        id: `team_${i + 1}`,
        name: `Team ${i + 1}`,
      }));
      const matches: any[] = [];
      const standings = calculateStandings(teams, matches);
      const inSpotCount = standings.filter((s) => s.playoffStatus === "in_spot").length;
      expect(inSpotCount).toBe(16);
    });

    it("generatePlayoffBracket defaults to 4-team bracket for 5 teams", () => {
      const teams = Array.from({ length: 5 }, (_, i) => ({
        id: `t_${i + 1}`,
        name: `Team ${i + 1}`,
      }));
      const standings = calculateStandings(teams, []);
      const bracket = generatePlayoffBracket(standings, {
        teamsCount: 14, // legacy setting
        structure: "single_elimination",
      });
      // 4-team bracket has 2 rounds: Semifinals and Championship
      expect(bracket.length).toBe(2);
      expect(bracket[0].matches.length).toBe(2); // 2 semifinal games (1v4, 2v3)
      expect(bracket[1].matches.length).toBe(1); // 1 championship game
    });
  });
});
