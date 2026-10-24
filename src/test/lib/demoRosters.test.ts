import { beforeEach, describe, expect, it } from "vitest";
import snapshot from "@/lib/demoRosterSnapshot.json";
import { DEMO_ROSTER_SOURCE, SEED_DEMO_PLAYERS, SEED_DEMO_TEAMS, SEED_DEMO_PLAYS, SEED_DEMO_MATCHES } from "@/lib/demoSeedData";
import { getSandboxPlayers, getSandboxPlays, getSandboxRosterSource, resetDemoSession } from "@/lib/demoSandbox";
import { generatePlaysForMatch, getGeneratedSeasonPlays } from "@/lib/demoPlayGenerator";

beforeEach(() => sessionStorage.clear());

describe("current NFL demo roster integration", () => {
  it("seeds exactly nine active sourced players per team and keeps the fictional draft pool separate", () => {
    for (const team of SEED_DEMO_TEAMS) {
      const roster = SEED_DEMO_PLAYERS.filter((p) => p.teamId === team.id);
      expect(roster).toHaveLength(9);
      expect(roster.every((p) => p.sourceStatus === "ACT" && p.nflId && p.nflPosition)).toBe(true);
      expect(roster.filter((p) => p.position === "QB")).toHaveLength(1);
      expect(roster.filter((p) => p.position === "RB")).toHaveLength(1);
      expect(roster.filter((p) => p.position === "WR")).toHaveLength(2);
      expect(roster.filter((p) => p.positions?.includes("TE"))).toHaveLength(1);
    }
    expect(SEED_DEMO_PLAYERS.filter((p) => !p.teamId)).toHaveLength(3);
    expect(getSandboxRosterSource()).toEqual(DEMO_ROSTER_SOURCE);
    expect(DEMO_ROSTER_SOURCE.season).toBe(snapshot.season);
  });

  it("links every scripted live-game participant to their current team and keeps its score", () => {
    for (const play of SEED_DEMO_PLAYS) {
      const match = SEED_DEMO_MATCHES.find((m) => m.id === play.matchId)!;
      const opponents = match.homeTeamId === play.possessionTeamId ? match.awayTeamId : match.homeTeamId;
      const offense = SEED_DEMO_PLAYERS.filter((p) => p.teamId === play.possessionTeamId).map((p) => p.playerName);
      const defense = SEED_DEMO_PLAYERS.filter((p) => p.teamId === opponents).map((p) => p.playerName);
      for (const name of [play.qbPlayerId, play.receiverPlayerId, play.runnerPlayerId, play.conversionPasser, play.conversionReceiver].filter(Boolean)) {
        expect(offense).toContain(name);
      }
      for (const name of [...(play.flaggers || []), ...(play.defenders || [])]) expect(defense).toContain(name);
    }
    for (const match of SEED_DEMO_MATCHES.filter((m) => m.status === "in_progress")) {
      for (const teamId of [match.homeTeamId, match.awayTeamId]) {
        const points = SEED_DEMO_PLAYS.filter((p) => p.matchId === match.id && p.possessionTeamId === teamId).reduce((sum, p) => sum + (p.points || 0), 0);
        expect(points).toBe(teamId === match.homeTeamId ? match.homeScore : match.awayScore);
      }
    }
  });

  it("generates position-correct offense even when roster order changes", () => {
    const match = SEED_DEMO_MATCHES.find((m) => m.status === "completed")!;
    const roster = [...SEED_DEMO_PLAYERS].reverse();
    const plays = generatePlaysForMatch(match, roster);
    for (const play of plays) {
      const team = roster.filter((p) => p.teamId === play.possessionTeamId);
      if (play.qbPlayerId) expect(team.find((p) => p.playerName === play.qbPlayerId)?.positions).toContain("QB");
      if (play.runnerPlayerId) expect(team.find((p) => p.playerName === play.runnerPlayerId)?.positions).toContain("RB");
    }
  });

  it("keeps existing session identities, edits, plays and attribution until reset", () => {
    getSandboxPlayers();
    const before = getSandboxPlays();
    const stored = getSandboxPlayers().map((p) => p.position === "QB" ? { ...p, playerName: `Session ${p.teamId} QB` } : p);
    sessionStorage.setItem("flagos_demo_players", JSON.stringify(stored));
    sessionStorage.removeItem("flagos_demo_roster_source");
    expect(getSandboxPlayers()).toEqual(stored);
    expect(getSandboxRosterSource()).toBeNull();
    const plays = getSandboxPlays();
    const completed = plays.filter((p) => SEED_DEMO_MATCHES.find((m) => m.id === p.matchId)?.status === "completed");
    expect(completed.some((p) => p.qbPlayerId?.startsWith("Session "))).toBe(true);
    expect(completed.every((p) => !p.qbPlayerId || stored.some((player) => player.teamId === p.possessionTeamId && player.playerName === p.qbPlayerId))).toBe(true);
    expect(getGeneratedSeasonPlays(stored)).not.toEqual(getGeneratedSeasonPlays());
    expect(plays.reduce((sum, p) => sum + (p.points || 0), 0)).toBe(before.reduce((sum, p) => sum + (p.points || 0), 0));
    resetDemoSession();
    expect(getSandboxPlayers()).toEqual(SEED_DEMO_PLAYERS);
    expect(getSandboxRosterSource()).toEqual(DEMO_ROSTER_SOURCE);
  });
});
