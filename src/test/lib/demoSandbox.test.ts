import { describe, it, expect, beforeEach } from "vitest";
import {
  getSandboxMatches,
  getSandboxMatch,
  getSandboxSettings,
  getSandboxTeams,
  getSandboxPlayers,
  getSandboxPlays,
  addSandboxPlay,
  deleteSandboxPlay,
  updateSandboxMatch,
  saveSandboxScheduleBackup,
  restoreSandboxScheduleBackup,
  getSandboxScheduleBackup,
  clearSandboxMatches,
  setSandboxMatches,
  resetDemoSession,
} from "@/lib/demoSandbox";
import {
  YORK_LIONS_MATCHES,
  YORK_LIONS_PLAYS,
  YORK_LIONS_PLAYERS,
  YORK_LIONS_TEAM,
} from "@/lib/yorkTeamData";

describe("demoSandbox", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("migrates the previous default green accent to the FlagOS blue accent", () => {
    sessionStorage.setItem("flagos_demo_initialized_2026_nfl_v3", "true");
    sessionStorage.setItem(
      "flagos_demo_settings",
      JSON.stringify({
        primaryColor: "#3ca505",
        accentColor: "#22c55e",
        themePreset: "gridiron-green",
      })
    );

    const settings = getSandboxSettings();

    expect(settings.primaryColor).toBe("#3ca505");
    expect(settings.accentColor).toBe("#3b82f6");
    expect(JSON.parse(sessionStorage.getItem("flagos_demo_settings") || "{}").accentColor).toBe("#3b82f6");
  });

  it("preserves custom demo league colors", () => {
    sessionStorage.setItem("flagos_demo_initialized_2026_nfl_v3", "true");
    sessionStorage.setItem(
      "flagos_demo_settings",
      JSON.stringify({
        primaryColor: "#ef4444",
        accentColor: "#8b5cf6",
        themePreset: "custom",
      })
    );

    const settings = getSandboxSettings();

    expect(settings.primaryColor).toBe("#ef4444");
    expect(settings.accentColor).toBe("#8b5cf6");
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

    it("keeps standalone York data out of demo league collections, including saved sessions", () => {
      sessionStorage.setItem("flagos_demo_initialized_2026_nfl_v3", "true");
      sessionStorage.setItem("flagos_demo_team_branding_v2", "1");
      sessionStorage.setItem("flagos_demo_teams", JSON.stringify([YORK_LIONS_TEAM]));
      sessionStorage.setItem("flagos_demo_players", JSON.stringify(YORK_LIONS_PLAYERS));
      sessionStorage.setItem("flagos_demo_matches", JSON.stringify(YORK_LIONS_MATCHES));
      sessionStorage.setItem("flagos_demo_plays", JSON.stringify(YORK_LIONS_PLAYS));

      expect(getSandboxTeams().some((team) => team.id === YORK_LIONS_TEAM.id)).toBe(false);
      expect(getSandboxPlayers().some((player) => player.teamId === YORK_LIONS_TEAM.id)).toBe(false);
      expect(getSandboxMatches().some((match) =>
        match.id.startsWith("match_york_") ||
        match.homeTeamId === YORK_LIONS_TEAM.id ||
        match.awayTeamId === YORK_LIONS_TEAM.id
      )).toBe(false);
      expect(getSandboxPlays().some((play) => play.matchId.startsWith("match_york_"))).toBe(false);
    });

    it("uses NFL primary colors and numbered names for shared NFL cities", () => {
      const teams = getSandboxTeams();
      const teamsById = new Map(teams.map((team) => [team.id, team]));
      const expectedColors: Record<string, string> = {
        team_buf: "#00338D", team_mia: "#008E97", team_ne: "#002244", team_nye: "#125740",
        team_bal: "#241773", team_cin: "#FB4F14", team_cle: "#311D00", team_pit: "#FFB612",
        team_hou: "#03202F", team_ind: "#002C5F", team_jax: "#006778", team_ten: "#4B92DB",
        team_kc: "#E31837", team_den: "#FB4F14", team_lv: "#A5ACAF", team_lac: "#0080C6",
        team_dal: "#003594", team_phi: "#004C54", team_nyg: "#0B2265", team_was: "#5A1414",
        team_chi: "#0B162A", team_det: "#0076B6", team_gb: "#203731", team_min: "#4F2683",
        team_atl: "#A71930", team_car: "#0085CA", team_no: "#D3BC8D", team_tb: "#D50A0A",
        team_ari: "#97233F", team_lar: "#003594", team_sf: "#AA0000", team_sea: "#002244",
      };

      expect(Object.entries(expectedColors).every(([id, color]) => teamsById.get(id)?.color === color)).toBe(true);
      expect(teams.every((team) =>
        [team.primaryColor, team.secondaryColor, team.tertiaryColor].every((color) => /^#[0-9A-Fa-f]{6}$/.test(color || ""))
      )).toBe(true);
      expect(teamsById.get("team_nye")?.name).toBe("New York 1");
      expect(teamsById.get("team_nyg")?.name).toBe("New York 2");
      expect(teamsById.get("team_lac")?.name).toBe("Los Angeles 1");
      expect(teamsById.get("team_lar")?.name).toBe("Los Angeles 2");
    });

    it("uses current city team names in seeded matchups", () => {
      const match = getSandboxMatches().find((item) => item.homeTeamId === "team_nye");
      expect(match?.homeTeamName).toBe("New York 1");
    });

    it("updates existing demo sessions to canonical NFL colors without dropping team data", () => {
      sessionStorage.setItem("flagos_demo_initialized_2026_nfl_v3", "true");
      sessionStorage.setItem("flagos_demo_team_branding_v1", "1");
      sessionStorage.setItem(
        "flagos_demo_teams",
        JSON.stringify([{ id: "team_nye", name: "New York East", shortcode: "NYE", color: "#123456", customFlag: true }])
      );

      const [team] = getSandboxTeams();

      expect(team).toMatchObject({
        id: "team_nye",
        name: "New York 1",
        shortcode: "NY1",
        color: "#125740",
        primaryColor: "#125740",
        secondaryColor: "#FFFFFF",
        tertiaryColor: "#000000",
        customFlag: true,
      });
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

  describe("Schedule Clearing, Generation, and Reset Session", () => {
    it("clearing schedule leaves 0 matches and does not revert to seed on subsequent reads", () => {
      expect(getSandboxMatches().length).toBeGreaterThan(0);
      clearSandboxMatches();
      expect(getSandboxMatches().length).toBe(0);
      // Verify subsequent read does not trigger aggressive re-seed
      expect(getSandboxMatches().length).toBe(0);
    });

    it("persists a newly generated custom schedule with fewer than 250 matches", () => {
      const customMatches: any[] = [
        { id: "gen_match_1", week: "Week 1", homeTeamId: "team_kc", awayTeamId: "team_bal", date: "2026-10-15", time: "10:00 AM", status: "scheduled", homeScore: 0, awayScore: 0 },
        { id: "gen_match_2", week: "Week 1", homeTeamId: "team_det", awayTeamId: "team_sf", date: "2026-10-15", time: "11:30 AM", status: "scheduled", homeScore: 0, awayScore: 0 },
      ];
      setSandboxMatches(customMatches);
      const retrieved = getSandboxMatches();
      expect(retrieved.length).toBe(2);
      expect(retrieved[0].id).toBe("gen_match_1");
    });

    it("resetDemoSession cleanly restores original seed data", () => {
      clearSandboxMatches();
      expect(getSandboxMatches().length).toBe(0);

      resetDemoSession();
      const restored = getSandboxMatches();
      expect(restored.length).toBe(272);
      expect(getSandboxTeams().length).toBe(32);
    });
  });
});
