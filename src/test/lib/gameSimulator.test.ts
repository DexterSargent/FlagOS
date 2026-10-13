import { describe, it, expect, beforeEach } from "vitest";
import { simulateFullGame } from "@/lib/gameSimulator";
import {
  getSandboxMatches,
  getSandboxPlays,
  getSandboxMatch,
  resetDemoSession,
  updateSandboxMatch,
} from "@/lib/demoSandbox";

describe("Platform Admin Game Simulator Engine", () => {
  beforeEach(() => {
    resetDemoSession();
  });

  it("simulates a full game for an unstarted match and writes realistic play-by-play", async () => {
    // Find or create an unstarted match in sandbox
    const matches = getSandboxMatches();
    const scheduledMatch = matches.find((m) => m.status === "scheduled" || m.status === "upcoming") || matches[0];
    
    // Set to scheduled
    updateSandboxMatch(scheduledMatch.id, {
      status: "scheduled",
      homeScore: 0,
      awayScore: 0,
    });

    const result = await simulateFullGame(scheduledMatch.id, {
      isDemo: true,
    });

    expect(result.success).toBe(true);
    expect(result.matchId).toBe(scheduledMatch.id);
    expect(result.homeScore).toBeGreaterThanOrEqual(6);
    expect(result.awayScore).toBeGreaterThanOrEqual(6);
    expect(result.homeScore).not.toBe(result.awayScore); // No ties in flag football
    expect(result.playsCount).toBeGreaterThanOrEqual(16);

    // Verify updated match in sandbox
    const updatedMatch = getSandboxMatch(scheduledMatch.id);
    expect(updatedMatch).toBeDefined();
    expect(updatedMatch?.status).toBe("completed");
    expect(updatedMatch?.homeScore).toBe(result.homeScore);
    expect(updatedMatch?.awayScore).toBe(result.awayScore);

    // Verify plays were recorded
    const plays = getSandboxPlays(scheduledMatch.id);
    expect(plays.length).toBe(result.playsCount);

    // Verify plays have player attribution for stats calculation
    const passingPlays = plays.filter((p) => p.playType === "Pass" && p.qbPlayerId);
    expect(passingPlays.length).toBeGreaterThan(0);

    const touchdowns = plays.filter((p) => p.isTouchdown === true);
    expect(touchdowns.length).toBeGreaterThanOrEqual(2);

    const defensivePlays = plays.filter((p) => (p.defenders && p.defenders.length > 0) || (p.flaggers && p.flaggers.length > 0));
    expect(defensivePlays.length).toBeGreaterThan(0);

    // Verify clock and halves
    const half1Plays = plays.filter((p) => p.half === 1);
    const half2Plays = plays.filter((p) => p.half === 2);
    expect(half1Plays.length).toBeGreaterThan(0);
    expect(half2Plays.length).toBeGreaterThan(0);
  });

  it("calculates exact scores with forcedScore option", async () => {
    const matches = getSandboxMatches();
    const matchId = matches[0].id;

    const result = await simulateFullGame(matchId, {
      isDemo: true,
      forcedHomeScore: 28,
      forcedAwayScore: 21,
    });

    expect(result.success).toBe(true);
    expect(result.homeScore).toBe(28);
    expect(result.awayScore).toBe(21);

    const updatedMatch = getSandboxMatch(matchId);
    expect(updatedMatch?.homeScore).toBe(28);
    expect(updatedMatch?.awayScore).toBe(21);
    expect(updatedMatch?.status).toBe("completed");
  });

  it("returns error gracefully for non-existent match", async () => {
    const result = await simulateFullGame("non_existent_match_xyz", {
      isDemo: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });
});
