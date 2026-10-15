import { describe, it, expect } from "vitest";
import { getSandboxPlays, SEED_DEMO_PLAYERS, SEED_DEMO_MATCHES } from "../../lib/demoSandbox";

describe("Receptions and Conversions Statistics Separation", () => {
  it("ensures conversion plays do not increment regular scrimmage receptions", () => {
    const plays = getSandboxPlays();
    const completedMatches = new Set(SEED_DEMO_MATCHES.filter((m) => m.status === "completed").map((m) => m.id));

    const statsMap: Record<string, { receptions: number; convRec: number }> = {};
    SEED_DEMO_PLAYERS.forEach((p) => {
      statsMap[p.playerName] = { receptions: 0, convRec: 0 };
    });

    plays.forEach((play) => {
      if (!play.matchId || !completedMatches.has(play.matchId)) return;
      const isConversionPlay = Boolean(
        play.isConversion || (!play.isTouchdown && (play.conversionSuccess !== undefined || play.conversionAttempt !== undefined))
      );

      // Scrimmage receptions (conversions excluded)
      if (play.playType === "Pass" && play.passOutcome === "Complete" && !isConversionPlay) {
        if (play.receiverPlayerId && statsMap[play.receiverPlayerId]) {
          statsMap[play.receiverPlayerId].receptions += 1;
        }
      }

      // PAT Conversions
      if (isConversionPlay) {
        if (play.conversionSuccess || play.passOutcome === "Complete" || (play.points && play.points > 0)) {
          const receiver = play.conversionReceiver || play.receiverPlayerId;
          if (receiver && statsMap[receiver]) {
            statsMap[receiver].convRec += 1;
          }
        }
      } else if (play.conversionSuccess && play.conversionReceiver) {
        if (statsMap[play.conversionReceiver]) {
          statsMap[play.conversionReceiver].convRec += 1;
        }
      }
    });

    // Verify players have distinct receptions and conversions
    const playersWithBoth = Object.values(statsMap).filter((s) => s.receptions > 0 && s.convRec > 0);
    expect(playersWithBoth.length).toBeGreaterThan(10);

    // Assert that not all players have identical receptions and conversions (receptions != convRec for the vast majority)
    const playersWithUnequal = playersWithBoth.filter((s) => s.receptions !== s.convRec);
    expect(playersWithUnequal.length).toBeGreaterThan(playersWithBoth.length * 0.8);
  });
});
