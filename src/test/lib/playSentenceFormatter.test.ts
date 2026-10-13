import { describe, it, expect } from "vitest";
import {
  formatPlaySentence,
  formatPenaltyStatement,
  PENALTY_CATALOG,
} from "@/lib/playSentenceFormatter";

describe("playSentenceFormatter", () => {
  const matchContext = {
    homeTeamName: "Kansas City",
    awayTeamName: "San Francisco",
    homeTeamId: "team_kc",
    downsPerSeries: 4,
  };

  describe("Passing Plays", () => {
    it("formats a regular complete pass with flag pull", () => {
      const play = {
        playType: "Pass" as const,
        passOutcome: "Complete",
        qbPlayerId: "Patrick Mahomes",
        receiverPlayerId: "Travis Kelce",
        defenders: ["Fred Warner"],
        down: 1,
        firstDown: false,
        isTouchdown: false,
      };

      const sentence = formatPlaySentence(play, matchContext);
      expect(sentence).toBe("Patrick Mahomes pass complete to Travis Kelce (Flagged by Fred Warner)");
    });

    it("formats a complete pass that gains a first down", () => {
      const play = {
        playType: "Pass" as const,
        passOutcome: "Complete",
        qbPlayerId: "Patrick Mahomes",
        receiverPlayerId: "Rashee Rice",
        defenders: ["Charvarius Ward"],
        down: 2,
        firstDown: true,
        isTouchdown: false,
      };

      const sentence = formatPlaySentence(play, matchContext);
      expect(sentence).toBe("Patrick Mahomes pass complete to Rashee Rice for a FIRST DOWN (Flagged by Charvarius Ward)");
    });

    it("formats a touchdown pass", () => {
      const play = {
        playType: "Pass" as const,
        passOutcome: "Complete",
        qbPlayerId: "Patrick Mahomes",
        receiverPlayerId: "Xavier Worthy",
        down: 3,
        firstDown: true,
        isTouchdown: true,
      };

      const sentence = formatPlaySentence(play, matchContext);
      expect(sentence).toBe("Patrick Mahomes pass complete to Xavier Worthy for a TOUCHDOWN!");
    });

    it("formats an interception", () => {
      const play = {
        playType: "Pass" as const,
        passOutcome: "Interception",
        qbPlayerId: "Patrick Mahomes",
        defenders: ["Talanoa Hufanga"],
        down: 2,
        firstDown: false,
        isTouchdown: false,
      };

      const sentence = formatPlaySentence(play, matchContext);
      expect(sentence).toBe("Patrick Mahomes pass INTERCEPTED by Talanoa Hufanga");
    });

    it("formats a pick 6 (interception returned for touchdown)", () => {
      const play = {
        playType: "Pass" as const,
        passOutcome: "Interception",
        qbPlayerId: "Patrick Mahomes",
        defenders: ["Fred Warner"],
        isPick6: true,
        down: 3,
      };

      const sentence = formatPlaySentence(play, matchContext);
      expect(sentence).toBe("Patrick Mahomes pass INTERCEPTED by Fred Warner for a PICK 6 TOUCHDOWN!");
    });

    it("formats a sack and a safety on sack", () => {
      const playSack = {
        playType: "Pass" as const,
        passOutcome: "Sack",
        qbPlayerId: "Patrick Mahomes",
        defenders: ["Nick Bosa"],
        down: 1,
      };
      expect(formatPlaySentence(playSack, matchContext)).toBe("Patrick Mahomes sacked by Nick Bosa for a loss");

      const playSafety = {
        playType: "Pass" as const,
        passOutcome: "Sack",
        qbPlayerId: "Patrick Mahomes",
        defenders: ["Nick Bosa"],
        isSafety: true,
        down: 3,
      };
      expect(formatPlaySentence(playSafety, matchContext)).toBe("Patrick Mahomes sacked in the end zone by Nick Bosa for a SAFETY!");
    });

    it("formats a pass break up (PBU) and missed throw", () => {
      const pbu = {
        playType: "Pass" as const,
        passOutcome: "PBU",
        qbPlayerId: "Patrick Mahomes",
        defenders: ["Deommodore Lenoir"],
        down: 2,
      };
      expect(formatPlaySentence(pbu, matchContext)).toBe("Patrick Mahomes pass incomplete, broken up by Deommodore Lenoir");

      const missed = {
        playType: "Pass" as const,
        passOutcome: "Missed",
        qbPlayerId: "Patrick Mahomes",
        down: 2,
      };
      expect(formatPlaySentence(missed, matchContext)).toBe("Patrick Mahomes pass incomplete (missed target)");
    });

    it("appends turnover on downs on 4th down failure", () => {
      const fourthDownIncomplete = {
        playType: "Pass" as const,
        passOutcome: "Missed",
        qbPlayerId: "Patrick Mahomes",
        down: 4,
        firstDown: false,
      };
      expect(formatPlaySentence(fourthDownIncomplete, matchContext)).toContain("Turnover on Downs");
    });
  });

  describe("Rushing Plays", () => {
    it("formats a positive run with flag pull", () => {
      const play = {
        playType: "Run" as const,
        runnerPlayerId: "Isiah Pacheco",
        defenders: ["Dre Greenlaw"],
        down: 1,
        firstDown: false,
      };

      const sentence = formatPlaySentence(play, matchContext);
      expect(sentence).toBe("Isiah Pacheco rush for positive gain (Flagged by Dre Greenlaw)");
    });

    it("formats a rushing touchdown", () => {
      const play = {
        playType: "Run" as const,
        runnerPlayerId: "Isiah Pacheco",
        isTouchdown: true,
        down: 2,
      };

      const sentence = formatPlaySentence(play, matchContext);
      expect(sentence).toBe("Isiah Pacheco rush for a TOUCHDOWN!");
    });

    it("formats a flag for loss (FFL)", () => {
      const play = {
        playType: "Run" as const,
        passOutcome: "FFL",
        runnerPlayerId: "Isiah Pacheco",
        defenders: ["Nick Bosa"],
        down: 2,
      };

      const sentence = formatPlaySentence(play, matchContext);
      expect(sentence).toBe("Isiah Pacheco flagged for a loss by Nick Bosa");
    });
  });

  describe("Conversion Statements", () => {
    it("formats successful conversion attached to scoring play", () => {
      const playWithConv = {
        playType: "Pass" as const,
        passOutcome: "Complete",
        isTouchdown: true,
        qbPlayerId: "Patrick Mahomes",
        receiverPlayerId: "Travis Kelce",
        conversionAttempt: true,
        conversionSuccess: true,
        conversionPoints: 2,
        conversionPasser: "Patrick Mahomes",
        conversionReceiver: "Rashee Rice",
      };

      const sentence = formatPlaySentence(playWithConv, matchContext);
      expect(sentence).toContain("TOUCHDOWN!");
      expect(sentence).toContain("2-PT CONVERSION GOOD: Patrick Mahomes pass to Rashee Rice");
    });
  });

  describe("Penalty Statements", () => {
    it("formats accepted defensive penalty with yardage and down result", () => {
      const stmt = formatPenaltyStatement({
        teamName: "San Francisco",
        side: "defense",
        penaltyName: "Offsides / Encroachment",
        yards: 5,
        enforcement: "accepted",
        downResult: "repeat_down",
        currentDown: 1,
        downsPerSeries: 4,
        playerName: "Nick Bosa",
      });

      expect(stmt).toBe("PENALTY: San Francisco (Defense), Nick Bosa - Offsides / Encroachment (5 yards) • Result: Replay 1st Down.");
    });

    it("formats automatic first down on defensive pass interference", () => {
      const stmt = formatPenaltyStatement({
        teamName: "San Francisco",
        side: "defense",
        penaltyName: "Defensive Pass Interference",
        yards: 10,
        enforcement: "accepted",
        downResult: "automatic_first_down",
        currentDown: 3,
        downsPerSeries: 4,
      });

      expect(stmt).toBe("PENALTY: San Francisco (Defense) - Defensive Pass Interference (10 yards) • Result: Automatic First Down.");
    });

    it("formats declined penalty", () => {
      const stmt = formatPenaltyStatement({
        teamName: "San Francisco",
        side: "defense",
        penaltyName: "Illegal Contact",
        yards: 5,
        enforcement: "declined",
        downResult: "play_stands",
        currentDown: 2,
        downsPerSeries: 4,
      });

      expect(stmt).toBe("PENALTY: San Francisco (Defense) - Illegal Contact (5 yards) [DECLINED] • Result of play stands.");
    });
  });
});
