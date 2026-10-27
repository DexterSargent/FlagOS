import { describe, it, expect } from "vitest";
import {
  calculateTeamComprehensiveStats,
  DEFAULT_VISIBLE_TEAM_STATS,
  TEAM_STAT_DEFINITIONS,
} from "@/lib/teamStatsCalculator";

describe("Team Comprehensive Stats Engine & Customization", () => {
  it("strictly defines default visible stats as record, points for (pf), and points allowed (pa)", () => {
    expect(DEFAULT_VISIBLE_TEAM_STATS).toEqual(["record", "pf", "pa"]);
    expect(DEFAULT_VISIBLE_TEAM_STATS).not.toContain("ppg");
    expect(DEFAULT_VISIBLE_TEAM_STATS).not.toContain("dppg");
    expect(DEFAULT_VISIBLE_TEAM_STATS).not.toContain("thirdDownPct");
    expect(DEFAULT_VISIBLE_TEAM_STATS).not.toContain("fourthDownPct");
    expect(DEFAULT_VISIBLE_TEAM_STATS).not.toContain("patTotalPct");
  });

  it("registers comprehensive catalog of team stat definitions with valid formatters", () => {
    expect(TEAM_STAT_DEFINITIONS.length).toBeGreaterThanOrEqual(25);

    const ids = TEAM_STAT_DEFINITIONS.map((d) => d.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    // Verify key requested stats exist in registry
    expect(ids).toContain("record");
    expect(ids).toContain("pf");
    expect(ids).toContain("pa");
    expect(ids).toContain("diff");
    expect(ids).toContain("ppg");
    expect(ids).toContain("dppg");
    expect(ids).toContain("thirdDownPct");
    expect(ids).toContain("fourthDownPct");
    expect(ids).toContain("pat1Pct");
    expect(ids).toContain("pat2Pct");
    expect(ids).toContain("patTotalPct");
    expect(ids).toContain("flags");
    expect(ids).toContain("sacks");
    expect(ids).toContain("interceptions");
    expect(ids).toContain("turnoverDiff");
  });

  it("calculates record, scoring, ppg, and dppg accurately across completed matches", () => {
    const matches = [
      {
        id: "m1",
        homeTeamId: "team_alpha",
        awayTeamId: "team_beta",
        homeScore: 28,
        awayScore: 14,
        status: "completed",
      },
      {
        id: "m2",
        homeTeamId: "team_gamma",
        awayTeamId: "team_alpha",
        homeScore: 21,
        awayScore: 35,
        status: "Final",
      },
      {
        id: "m3",
        homeTeamId: "team_alpha",
        awayTeamId: "team_delta",
        homeScore: 14,
        awayScore: 14,
        status: "completed",
      },
    ];

    const stats = calculateTeamComprehensiveStats("team_alpha", matches, []);

    expect(stats.gp).toBe(3);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(0);
    expect(stats.ties).toBe(1);
    expect(stats.recordFormatted).toBe("2-0-1");
    expect(stats.pf).toBe(77); // 28 + 35 + 14
    expect(stats.pa).toBe(49); // 14 + 21 + 14
    expect(stats.diff).toBe(28);
    expect(stats.diffFormatted).toBe("+28");
    expect(stats.ppgFormatted).toBe((77 / 3).toFixed(1));
    expect(stats.dppgFormatted).toBe((49 / 3).toFixed(1));
  });

  it("calculates 3rd and 4th down conversion rates, PATs, offensive and defensive metrics from plays", () => {
    const matches = [
      {
        id: "m1",
        homeTeamId: "team_alpha",
        awayTeamId: "team_beta",
        homeScore: 21,
        awayScore: 7,
        status: "completed",
      },
    ];

    const plays = [
      // 3rd down 1: converted via First Down
      {
        matchId: "m1",
        possessionTeamId: "team_alpha",
        down: 3,
        playType: "Pass",
        passOutcome: "Complete",
        firstDown: true,
        result: "First Down",
      },
      // 3rd down 2: converted via Touchdown
      {
        matchId: "m1",
        possessionTeamId: "team_alpha",
        down: 3,
        playType: "Pass",
        passOutcome: "Complete",
        isTouchdown: true,
        result: "Touchdown",
        conversionAttempt: 1,
        conversionSuccess: true,
      },
      // 3rd down 3: failed
      {
        matchId: "m1",
        possessionTeamId: "team_alpha",
        down: 3,
        playType: "Pass",
        passOutcome: "Incomplete",
        firstDown: false,
        result: "Next Down",
      },
      // 4th down 1: converted via Run
      {
        matchId: "m1",
        possessionTeamId: "team_alpha",
        down: 4,
        playType: "Run",
        firstDown: true,
        result: "First Down",
      },
      // 4th down 2: failed (turnover on downs)
      {
        matchId: "m1",
        possessionTeamId: "team_alpha",
        down: 4,
        playType: "Pass",
        passOutcome: "Incomplete",
        firstDown: false,
        result: "Turnover",
      },
      // 2-point PAT attempt: failed
      {
        matchId: "m1",
        possessionTeamId: "team_alpha",
        isTouchdown: true,
        result: "Touchdown",
        conversionAttempt: 2,
        conversionSuccess: false,
      },
      // Defensive plays when opponent team_beta has possession
      {
        matchId: "m1",
        possessionTeamId: "team_beta",
        down: 3,
        playType: "Pass",
        passOutcome: "Incomplete",
        firstDown: false,
        result: "Next Down",
        flaggers: ["Player A"],
      },
      {
        matchId: "m1",
        possessionTeamId: "team_beta",
        down: 4,
        playType: "Pass",
        passOutcome: "Interception",
        firstDown: false,
        result: "Turnover",
        flaggers: ["Player B", "Player C"],
      },
      {
        matchId: "m1",
        possessionTeamId: "team_beta",
        down: 2,
        playType: "Pass",
        passOutcome: "Sack",
        result: "Sack",
      },
    ];

    const stats = calculateTeamComprehensiveStats("team_alpha", matches, plays);

    // 3rd Down: 2 made out of 3 attempts = 66.7%
    expect(stats.thirdDownAttempts).toBe(3);
    expect(stats.thirdDownConversions).toBe(2);
    expect(stats.thirdDownFormatted).toBe("66.7% (2/3)");

    // 4th Down: 1 made out of 2 attempts = 50.0%
    expect(stats.fourthDownAttempts).toBe(2);
    expect(stats.fourthDownConversions).toBe(1);
    expect(stats.fourthDownFormatted).toBe("50.0% (1/2)");

    // PATs:
    // 1-PT: 1 att, 1 good (100.0%)
    expect(stats.pat1Attempts).toBe(1);
    expect(stats.pat1Conversions).toBe(1);
    expect(stats.pat1Formatted).toBe("100.0% (1/1)");
    // 2-PT: 1 att, 0 good (0.0%)
    expect(stats.pat2Attempts).toBe(1);
    expect(stats.pat2Conversions).toBe(0);
    expect(stats.pat2Formatted).toBe("0.0% (0/1)");
    // Total PATs: 1/2 = 50.0%
    expect(stats.patTotalAttempts).toBe(2);
    expect(stats.patTotalConversions).toBe(1);
    expect(stats.patTotalFormatted).toBe("50.0% (1/2)");

    // Defense:
    // Flags pulled: 1 from first beta play + 2 from second beta play = 3
    expect(stats.flags).toBe(3);
    // Sacks: 1
    expect(stats.sacks).toBe(1);
    // Interceptions made: 1
    expect(stats.interceptions).toBe(1);
    // Opponent 3rd down stopped: 1 of 1 (100.0%)
    expect(stats.defThirdDownStops).toBe(1);
    expect(stats.defThirdDownStopFormatted).toBe("100.0% (1/1)");
    // Opponent 4th down stopped: 1 of 1 (100.0%)
    expect(stats.defFourthDownStops).toBe(1);
    expect(stats.defFourthDownStopFormatted).toBe("100.0% (1/1)");

    // Turnover Differential:
    // The fourth-down interception counts once; a failed fourth down is not a giveaway.
    expect(stats.takeaways).toBe(1);
    expect(stats.giveaways).toBe(0);
    expect(stats.turnoverDiff).toBe(1);
    expect(stats.turnoverDiffFormatted).toBe("+1");
  });

  it.each([3, 4])("keeps failed %ith downs separate from takeaways and giveaways", (down) => {
    const match = { id: "m", status: "completed", homeTeamId: "home", awayTeamId: "away" };
    const plays = [
      { matchId: "m", possessionTeamId: "home", down, playType: "Pass", passOutcome: "Incomplete", turnover: true },
      { matchId: "m", possessionTeamId: "home", down, playType: "Run", result: "Short", turnover: true },
      { matchId: "m", possessionTeamId: "home", down, playType: "Pass", passOutcome: "Interception", result: "Turnover" },
      { matchId: "m", possessionTeamId: "home", down, playType: "Pass", result: "Pick 6 Touchdown" },
    ];
    const offense = calculateTeamComprehensiveStats("home", [match], plays);
    const defense = calculateTeamComprehensiveStats("away", [match], plays);
    expect(offense.giveaways).toBe(2);
    expect(defense.takeaways).toBe(2);
    expect(offense.turnoverDiff).toBe(-2);
    expect(defense.turnoverDiff).toBe(2);
    expect(down === 3 ? offense.thirdDownFormatted : offense.fourthDownFormatted).toBe("0.0% (0/4)");
    expect(down === 3 ? defense.defThirdDownStopFormatted : defense.defFourthDownStopFormatted).toBe("100.0% (4/4)");
  });

  it.each([3, 4])("calculates %ith down conversions from valid attempts for both teams", (down) => {
    const match = { id: "m", status: "completed", homeTeamId: "home", awayTeamId: "away" };
    const base = { matchId: "m", possessionTeamId: "home", down, playType: "Pass" };
    const plays = [
      { ...base, firstDown: true },
      { ...base, result: "Touchdown", conversionAttempt: 1, conversionSuccess: true },
      { ...base, passOutcome: "Incomplete" },
      { ...base, passOutcome: "Interception", firstDown: true, isThirdDownConversion: true, isFourthDownConversion: true },
      { ...base, isPick6: true, isTouchdown: true },
      { ...base, down: String(down), result: "First Down" },
      { ...base, result: "Repeat Down" },
      { ...base, playType: "Penalty", result: "First Down" },
      { ...base, isConversion: true, conversionAttempt: 2, conversionSuccess: true },
      { ...base, playType: "Conversion", conversionAttempt: 1 },
      { ...base, isHidden: true, result: "First Down" },
    ];
    const offense = calculateTeamComprehensiveStats("home", [match], plays);
    const defense = calculateTeamComprehensiveStats("away", [match], plays);
    expect(down === 3 ? offense.thirdDownAttempts : offense.fourthDownAttempts).toBe(6);
    expect(down === 3 ? offense.thirdDownConversions : offense.fourthDownConversions).toBe(3);
    expect(down === 3 ? offense.thirdDownPct : offense.fourthDownPct).toBe(50);
    expect(down === 3 ? offense.thirdDownFormatted : offense.fourthDownFormatted).toBe("50.0% (3/6)");
    expect(down === 3 ? defense.defThirdDownStopFormatted : defense.defFourthDownStopFormatted).toBe("50.0% (3/6)");
  });

  it("uses zero rather than NaN for down rates without attempts", () => {
    const stats = calculateTeamComprehensiveStats("home");
    expect(stats.thirdDownPct).toBe(0);
    expect(stats.fourthDownPct).toBe(0);
    expect(stats.thirdDownFormatted).toBe("0.0% (0/0)");
    expect(stats.fourthDownFormatted).toBe("0.0% (0/0)");
  });
});
