import { describe, it, expect, beforeEach } from "vitest";
import {
  getSandboxMatches,
  getSandboxMatch,
  getSandboxTeams,
  getSandboxPlayers,
  getSandboxPlays,
  addSandboxPlay,
  deleteSandboxPlay,
  updateSandboxMatch,
  saveSandboxScheduleBackup,
  restoreSandboxScheduleBackup,
  getSandboxScheduleBackup,
} from "@/lib/demoSandbox";

describe("demoSandbox", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe("Matches & Deduplication", () => {
    it("deduplicates matches by ID and matchup key", () => {
      const matches = getSandboxMatches();
      const seenIds = new Set<string>();
      const seenKeys = new Set<string>();

      for (const m of matches) {
        expect(seenIds.has(m.id)).toBe(false);
        seenIds.add(m.id);

        const key = `${m.week}_${m.homeTeamId}_${m.awayTeamId}`;
        expect(seenKeys.has(key)).toBe(false);
        seenKeys.add(key);
      }
    });

    it("filters out legacy alias IDs (match_demo_1, match_demo_3)", () => {
      const matches = getSandboxMatches();
      const ids = matches.map((m) => m.id);
      expect(ids).not.toContain("match_demo_1");
      expect(ids).not.toContain("match_demo_3");
    });

    it("contains exactly 2 live games in Week 16", () => {
      const matches = getSandboxMatches();
      const liveMatches = matches.filter(
        (m) => m.status === "in_progress"
      );

      expect(liveMatches.length).toBe(2);
      const liveIds = liveMatches.map((m) => m.id);
      expect(liveIds).toContain("match_w16_11");
      expect(liveIds).toContain("match_w16_12");
    });

    it("seamlessly resolves canonical and alias match IDs", () => {
      const matchPit = getSandboxMatch("match_w16_11");
      expect(matchPit).toBeDefined();
      expect(matchPit?.id).toBe("match_w16_11");

      const matchAlias1 = getSandboxMatch("match_demo_1");
      expect(matchAlias1).toBeDefined();
      expect(matchAlias1?.id).toBe("match_w16_11");

      const matchAlias3 = getSandboxMatch("match_demo_3");
      expect(matchAlias3).toBeDefined();
      expect(matchAlias3?.id).toBe("match_w16_12");

      const nonExistent = getSandboxMatch("match_fake_9999");
      expect(nonExistent).toBeUndefined();
    });

    it("updates match state and status", () => {
      updateSandboxMatch("match_w16_11", {
        status: "in_progress",
        homeScore: 21,
        awayScore: 14,
      });

      const retrieved = getSandboxMatch("match_w16_11");
      expect(retrieved).toBeDefined();
      expect(retrieved?.homeScore).toBe(21);
      expect(retrieved?.awayScore).toBe(14);
    });
  });

  describe("Teams & Free Agents Exclusion", () => {
    it("returns competitive franchises and strictly excludes team_free_agents", () => {
      const teams = getSandboxTeams();
      expect(teams.length).toBe(32);
      const teamIds = teams.map((t) => t.id);
      expect(teamIds).not.toContain("team_free_agents");

      const names = teams.map((t) => t.name.toLowerCase());
      expect(names).not.toContain("free agent");
      expect(names).not.toContain("free agents");
    });
  });

  describe("Plays CRUD & Stats Tracking", () => {
    it("returns plays across the season and filters by matchId", () => {
      const allPlays = getSandboxPlays();
      expect(allPlays.length).toBeGreaterThan(5000);

      const w1Plays = getSandboxPlays("match_w1_1");
      expect(w1Plays.length).toBeGreaterThan(0);
      w1Plays.forEach((p) => {
        expect(p.matchId).toBe("match_w1_1");
      });
    });

    it("resolves alias match IDs when querying plays", () => {
      const canonicalPlays = getSandboxPlays("match_w16_11");
      const aliasPlays = getSandboxPlays("match_demo_1");
      expect(canonicalPlays.length).toBe(aliasPlays.length);
      expect(canonicalPlays.length).toBeGreaterThan(0);
    });

    it("adds and deletes a sandbox play", () => {
      const newPlay = addSandboxPlay({
        matchId: "match_w16_11",
        possessionTeamId: "team_pit",
        playType: "Pass",
        down: 1,
        qbPlayerId: "Russell Wilson",
        receiverPlayerId: "George Pickens",
        passOutcome: "Complete",
        points: 6,
        isTouchdown: true,
      });

      expect(newPlay.id).toBeDefined();

      const playsAfterAdd = getSandboxPlays("match_w16_11");
      expect(playsAfterAdd.some((p) => p.id === newPlay.id)).toBe(true);

      deleteSandboxPlay(newPlay.id);
      const playsAfterDelete = getSandboxPlays("match_w16_11");
      expect(playsAfterDelete.some((p) => p.id === newPlay.id)).toBe(false);
    });
  });

  describe("Schedule Backup & Restore", () => {
    it("saves and restores schedule snapshots", () => {
      const matches = getSandboxMatches();
      const backup = saveSandboxScheduleBackup(matches);
      expect(backup).toBeDefined();
      expect(backup?.matches.length).toBe(matches.length);

      const retrievedBackup = getSandboxScheduleBackup();
      expect(retrievedBackup).toBeDefined();
      expect(retrievedBackup?.savedAt).toBe(backup?.savedAt);

      const restored = restoreSandboxScheduleBackup();
      expect(restored).toBe(true);
      expect(getSandboxMatches().length).toBe(matches.length);
    });
  });
});
