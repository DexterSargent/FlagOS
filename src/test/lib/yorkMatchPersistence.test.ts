import { describe, it, expect, beforeEach } from "vitest";
import {
  YORK_CUSTOM_MATCHES_KEY,
  YORK_CUSTOM_PLAYS_KEY_PREFIX,
  getYorkCustomMatches,
  saveYorkCustomMatch,
  deleteYorkCustomMatch,
  getYorkTeamMatches,
  getYorkMatch,
  isYorkMatch,
  saveYorkPlay,
  deleteYorkPlay,
  getYorkTeamPlaysForMatch,
  YORK_LIONS_MATCHES,
} from "@/lib/yorkTeamData";

describe("York Custom Match & Play Persistence Engine", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns base York matches when no custom matches exist", () => {
    const matches = getYorkTeamMatches();
    expect(matches.length).toBe(YORK_LIONS_MATCHES.length);
    expect(getYorkCustomMatches()).toEqual([]);
  });

  it("saves, retrieves, and updates custom York matches", () => {
    const customGame = {
      id: "match_york_custom_1",
      week: "Exhibition 1",
      homeTeamName: "York Lions Women's Flag Football",
      awayTeamName: "Toronto Varsity Blues",
      homeTeamId: "york_lions",
      awayTeamId: "opponent_uoft",
      date: "2026-10-25",
      time: "14:00",
      location: "Alumni Field",
      status: "scheduled" as const,
      homeScore: 0,
      awayScore: 0,
      matchdayIndex: 1,
      isIndependent: true,
      isAsyncStatKeeping: true,
      managingTeamId: "york_lions",
    };

    saveYorkCustomMatch(customGame);

    const customList = getYorkCustomMatches();
    expect(customList.length).toBe(1);
    expect(customList[0].id).toBe("match_york_custom_1");

    // Check getYorkMatch
    const retrieved = getYorkMatch("match_york_custom_1");
    expect(retrieved).toBeDefined();
    expect(retrieved?.awayTeamName).toBe("Toronto Varsity Blues");

    // Check getYorkTeamMatches contains the custom match
    const allMatches = getYorkTeamMatches();
    expect(allMatches.some((m) => m.id === "match_york_custom_1")).toBe(true);

    // Update match score and status
    saveYorkCustomMatch({
      ...customGame,
      status: "completed",
      homeScore: 28,
      awayScore: 14,
    });

    const updated = getYorkMatch("match_york_custom_1");
    expect(updated?.status).toBe("completed");
    expect(updated?.homeScore).toBe(28);
    expect(updated?.awayScore).toBe(14);
  });

  it("deletes a custom York match correctly", () => {
    const customGame = {
      id: "match_york_delete_test",
      week: "Exhibition",
      homeTeamName: "York Lions",
      awayTeamName: "Opponent",
      homeTeamId: "york_lions",
      awayTeamId: "opp",
      date: "2026-10-25",
      time: "14:00",
      location: "Field 1",
      matchdayIndex: 1,
      status: "scheduled" as const,
      homeScore: 0,
      awayScore: 0,
    };

    saveYorkCustomMatch(customGame);
    expect(getYorkMatch("match_york_delete_test")).toBeDefined();

    deleteYorkCustomMatch("match_york_delete_test");
    expect(getYorkMatch("match_york_delete_test")).toBeUndefined();
  });

  it("identifies York matches accurately with isYorkMatch", () => {
    expect(isYorkMatch("match_york_mcmaster")).toBe(true);
    expect(isYorkMatch("match_york_waterloo")).toBe(true);
    expect(isYorkMatch("match_york_new_created_123")).toBe(true);
    expect(isYorkMatch("match_live_random_game")).toBe(false);
  });

  it("persists and manages offline plays for York matches", () => {
    const matchId = "match_york_custom_plays";
    const play1 = {
      id: "play_1",
      matchId,
      down: 1,
      playType: "Pass",
      passOutcome: "Complete",
      passer: "Sonia Cabral",
      receiver: "Tizana Sutharsan",
      pointsScored: 6,
      isTouchdown: true,
      timestamp: "2026-10-19T12:00:00Z",
    };

    saveYorkPlay(matchId, play1 as any);

    const plays = getYorkTeamPlaysForMatch(matchId);
    expect(plays.length).toBe(1);
    expect(plays[0].id).toBe("play_1");
    expect(plays[0].passer).toBe("Sonia Cabral");

    deleteYorkPlay(matchId, "play_1");
    expect(getYorkTeamPlaysForMatch(matchId).length).toBe(0);
  });
});
