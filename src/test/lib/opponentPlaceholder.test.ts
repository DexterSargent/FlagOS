import { describe, it, expect } from "vitest";
import {
  OPPONENT_QB_PLACEHOLDER,
  displayPlayerName,
  isOpponentPlaceholder,
  isTrackablePlayer,
  opponentQuarterbackLabel,
  replacePlaceholderInText,
  toPossessive,
} from "@/lib/opponentPlaceholder";
import { formatPlaySentence } from "@/lib/playSentenceFormatter";
import { computePlayerStatCounts } from "@/lib/playerNumberHelper";

describe("opponentPlaceholder", () => {
  it("detects placeholder names case-insensitively and rejects non-strings", () => {
    expect(isOpponentPlaceholder("Unknown QB")).toBe(true);
    expect(isOpponentPlaceholder("  unknown qb ")).toBe(true);
    expect(isOpponentPlaceholder("Alexxandria Olivier")).toBe(false);
    expect(isOpponentPlaceholder(undefined)).toBe(false);
    expect(isOpponentPlaceholder(42)).toBe(false);
  });

  it("builds possessive team labels", () => {
    expect(toPossessive("Canadore Panthers")).toBe("Canadore Panthers'");
    expect(toPossessive("Ottawa Gee-Gee")).toBe("Ottawa Gee-Gee's");
    expect(toPossessive("")).toBe("Opponent's");
    expect(toPossessive(null)).toBe("Opponent's");
    expect(opponentQuarterbackLabel("Waterloo Warriors")).toBe("Waterloo Warriors' Quarterback");
  });

  it("resolves display names safely", () => {
    expect(displayPlayerName(OPPONENT_QB_PLACEHOLDER, "Western Mustangs")).toBe("Western Mustangs' Quarterback");
    expect(displayPlayerName(OPPONENT_QB_PLACEHOLDER)).toBe("Opponent's Quarterback");
    expect(displayPlayerName("  Tehya Castro ", "Western Mustangs")).toBe("Tehya Castro");
    expect(displayPlayerName(null)).toBe("");
    expect(displayPlayerName({})).toBe("");
  });

  it("replaces placeholders embedded in stored statements", () => {
    expect(replacePlaceholderInText("Unknown QB pass incomplete", "Waterloo Warriors")).toBe(
      "Waterloo Warriors' Quarterback pass incomplete"
    );
    expect(replacePlaceholderInText(undefined)).toBe("");
  });

  it("excludes placeholders from trackable players", () => {
    expect(isTrackablePlayer("Unknown QB")).toBe(false);
    expect(isTrackablePlayer("")).toBe(false);
    expect(isTrackablePlayer("Alexxandria Olivier")).toBe(true);
  });

  it("labels the opponent passer in play sentences and keeps our flaggers", () => {
    const sentence = formatPlaySentence(
      {
        playType: "Pass",
        passOutcome: "Interception",
        qbPlayerId: OPPONENT_QB_PLACEHOLDER,
        possessionTeamId: "opponent_waterloo",
        defenders: ["Alexxandria Olivier"],
      } as any,
      { homeTeamName: "York Lions", awayTeamName: "Waterloo Warriors", homeTeamId: "york_lions", downsPerSeries: 4 }
    );
    expect(sentence).toContain("Waterloo Warriors' Quarterback");
    expect(sentence).not.toContain("Unknown QB");
    expect(sentence).toContain("Alexxandria Olivier");
  });

  it("does not crash on malformed plays", () => {
    expect(() => formatPlaySentence(null as any)).not.toThrow();
    expect(() => formatPlaySentence(undefined as any, { homeTeamName: "York Lions" } as any)).not.toThrow();
  });

  it("never counts the placeholder in player stat counts", () => {
    const counts = computePlayerStatCounts([
      { playType: "Pass", qbPlayerId: OPPONENT_QB_PLACEHOLDER, passOutcome: "Incomplete" },
      { playType: "Pass", qbPlayerId: "Alexxandria Olivier", passOutcome: "Incomplete" },
    ]);
    expect(counts.passing[OPPONENT_QB_PLACEHOLDER]).toBeUndefined();
    expect(counts.passing["Alexxandria Olivier"]).toBe(1);
  });
});
