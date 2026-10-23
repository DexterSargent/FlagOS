import { describe, it, expect } from "vitest";
import {
  ensureSquadMatchup,
  ensure5v5Matchup,
  createDefaultPlaybooks,
  migrateRawPlaysToPlaybooks,
  createPlayInFormation,
  DEFAULT_LOS_Y,
  RUSH_LINE_DISTANCE,
  clampLegalPosition,
  checkLegalPosition,
  calculateShadedPosition,
} from "@/lib/playbookTypes";

describe("playbookTypes", () => {
  describe("defensive alignment rules", () => {
    it.each(["spy", "zone", "man"] as const)(
      "allows a former rusher assigned to %s to align like a coverage defender",
      (coverageType) => {
        const reassignedDefender = {
          id: "spy",
          label: "RUSH",
          role: "Pass Rusher",
          side: "defense" as const,
          x: 50,
          y: DEFAULT_LOS_Y - 2,
          coverageType,
        };

        expect(
          clampLegalPosition(reassignedDefender, { x: 50, y: DEFAULT_LOS_Y - 2 }, DEFAULT_LOS_Y).y
        ).toBe(DEFAULT_LOS_Y - 2);
        expect(checkLegalPosition(reassignedDefender, DEFAULT_LOS_Y)).toEqual({ isLegal: true });
      }
    );

    it("keeps legacy RUSH-labeled defenders behind the rush line", () => {
      const legacyRusher = {
        id: "legacy-rush",
        label: "RUSH",
        role: "Pass Rusher",
        side: "defense" as const,
        x: 50,
        y: DEFAULT_LOS_Y - 2,
      };

      expect(
        clampLegalPosition(legacyRusher, { x: 50, y: DEFAULT_LOS_Y - 2 }, DEFAULT_LOS_Y).y
      ).toBe(DEFAULT_LOS_Y - RUSH_LINE_DISTANCE);
      expect(checkLegalPosition(legacyRusher, DEFAULT_LOS_Y).isLegal).toBe(false);
    });
  });

  describe("ensureSquadMatchup", () => {
    it("creates exactly 5 offense and 5 defense players for 5v5 flag football", () => {
      const players = ensureSquadMatchup([], DEFAULT_LOS_Y, 5);
      const offense = players.filter((p) => p.side === "offense");
      const defense = players.filter((p) => p.side === "defense");

      expect(players.length).toBe(10);
      expect(offense.length).toBe(5);
      expect(defense.length).toBe(5);

      // Verify offense positions are on or behind line of scrimmage
      offense.forEach((p) => {
        expect(p.y).toBeGreaterThanOrEqual(DEFAULT_LOS_Y);
      });

      // Verify defense positions are in defensive territory (ahead of line of scrimmage)
      defense.forEach((p) => {
        expect(p.y).toBeLessThan(DEFAULT_LOS_Y);
      });
    });

    it("scales squad size to 7v7 and 8v8 cleanly", () => {
      const squad7 = ensureSquadMatchup([], DEFAULT_LOS_Y, 7);
      expect(squad7.filter((p) => p.side === "offense").length).toBe(7);
      expect(squad7.filter((p) => p.side === "defense").length).toBe(7);

      const squad8 = ensureSquadMatchup([], DEFAULT_LOS_Y, 8);
      expect(squad8.filter((p) => p.side === "offense").length).toBe(8);
      expect(squad8.filter((p) => p.side === "defense").length).toBe(8);
    });

    it("clips excess players when downscaled from 7v7 to 5v5", () => {
      const squad7 = ensureSquadMatchup([], DEFAULT_LOS_Y, 7);
      const downscaled = ensureSquadMatchup(squad7, DEFAULT_LOS_Y, 5);

      expect(downscaled.filter((p) => p.side === "offense").length).toBe(5);
      expect(downscaled.filter((p) => p.side === "defense").length).toBe(5);
    });

    it("ensure5v5Matchup serves as a reliable backward-compatible alias", () => {
      const result = ensure5v5Matchup([]);
      expect(result.length).toBe(10);
      expect(result.filter((p) => p.side === "offense").length).toBe(5);
      expect(result.filter((p) => p.side === "defense").length).toBe(5);
    });
  });

  describe("createDefaultPlaybooks", () => {
    it("returns two balanced playbooks: one offensive and one defensive", () => {
      const books = createDefaultPlaybooks("team_kc", 5);
      expect(books.length).toBe(2);

      const offBook = books.find((b) => b.type === "offense");
      const defBook = books.find((b) => b.type === "defense");

      expect(offBook).toBeDefined();
      expect(defBook).toBeDefined();

      expect(offBook?.teamId).toBe("team_kc");
      expect(defBook?.teamId).toBe("team_kc");

      expect(offBook?.formations.length).toBeGreaterThan(0);
      expect(defBook?.formations.length).toBeGreaterThan(0);

      expect(offBook?.plays.length).toBeGreaterThan(0);
      expect(defBook?.plays.length).toBeGreaterThan(0);
    });
  });

  describe("migrateRawPlaysToPlaybooks", () => {
    it("creates default playbooks when raw plays array is empty", () => {
      const migrated = migrateRawPlaysToPlaybooks([], "team_kc", 5);
      expect(migrated.length).toBe(2);
      expect(migrated[0].teamId).toBe("team_kc");
    });

    it("partitions custom plays into offensive and defensive playbooks", () => {
      const customPlays: any[] = [
        {
          id: "custom-1",
          name: "Deep Crossers",
          type: "offense",
          formation: "Spread 2x1",
          players: ensureSquadMatchup([], DEFAULT_LOS_Y, 5),
        },
        {
          id: "custom-2",
          name: "Cover 2 Bracket",
          type: "defense",
          formation: "Cover 2 Zone",
          players: ensureSquadMatchup([], DEFAULT_LOS_Y, 5),
        },
      ];

      const books = migrateRawPlaysToPlaybooks(customPlays, "team_kc", 5);
      expect(books.length).toBe(2);

      const offBook = books.find((b) => b.type === "offense");
      const defBook = books.find((b) => b.type === "defense");

      expect(offBook?.plays.some((p) => p.name === "Deep Crossers")).toBe(true);
      expect(defBook?.plays.some((p) => p.name === "Cover 2 Bracket")).toBe(true);
    });
  });

  describe("createPlayInFormation", () => {
    it("creates a new PlayDiagram with appropriate metadata and aligned players", () => {
      const books = createDefaultPlaybooks("team_kc", 5);
      const offBook = books.find((b) => b.type === "offense")!;
      const formation = offBook.formations[0];

      const newPlay = createPlayInFormation(offBook, formation, DEFAULT_LOS_Y, 5);

      expect(newPlay.id).toBeDefined();
      expect(newPlay.teamId).toBe("team_kc");
      expect(newPlay.type).toBe("offense");
      expect(newPlay.formation).toBe(formation.name);
      expect(newPlay.players.length).toBe(10);
    });
  });

  describe("calculateShadedPosition", () => {
    const losY = 60;
    const receiverLeft = { x: 20, y: 60 };
    const receiverRight = { x: 80, y: 60 };
    const receiverCenter = { x: 50, y: 60 };

    it("aligns head up directly across from the receiver", () => {
      const posLeft = calculateShadedPosition(receiverLeft, "head_up", { losY });
      expect(posLeft.x).toBe(20);
      expect(posLeft.y).toBe(56); // losY - 4

      const posRight = calculateShadedPosition(receiverRight, "head_up", { losY });
      expect(posRight.x).toBe(80);

      const posCenter = calculateShadedPosition(receiverCenter, "head_up", { losY });
      expect(posCenter.x).toBe(50);
    });

    it("aligns inside shade towards the center of the field", () => {
      // Left receiver (x < 50): inside shade shifts right towards 50
      const posLeft = calculateShadedPosition(receiverLeft, "inside", { losY, offset: 3 });
      expect(posLeft.x).toBe(23);

      // Right receiver (x > 50): inside shade shifts left towards 50
      const posRight = calculateShadedPosition(receiverRight, "inside", { losY, offset: 3 });
      expect(posRight.x).toBe(77);

      // Center receiver (x === 50): inside shade stays centered at 50
      const posCenter = calculateShadedPosition(receiverCenter, "inside", { losY, offset: 3 });
      expect(posCenter.x).toBe(50);
    });

    it("aligns outside shade towards the boundary sideline", () => {
      // Left receiver (x < 50): outside shade shifts left towards sideline
      const posLeft = calculateShadedPosition(receiverLeft, "outside", { losY, offset: 3 });
      expect(posLeft.x).toBe(17);

      // Right receiver (x > 50): outside shade shifts right towards sideline
      const posRight = calculateShadedPosition(receiverRight, "outside", { losY, offset: 3 });
      expect(posRight.x).toBe(83);

      // Center receiver (x === 50): outside shade shifts towards boundary
      const posCenter = calculateShadedPosition(receiverCenter, "outside", { losY, offset: 3 });
      expect(posCenter.x).toBe(53);
    });

    it("preserves custom defender cushion when defender is on the defensive side of LOS", () => {
      // Defender already set at cushion depth y: 52
      const pos = calculateShadedPosition(receiverLeft, "inside", { currentDefenderY: 52, losY, offset: 2.8 });
      expect(pos.x).toBe(22.8);
      expect(pos.y).toBe(52);
    });

    it("bounds defender within field sidelines (5% to 95%)", () => {
      const extremeLeftReceiver = { x: 6, y: 60 };
      const extremeRightReceiver = { x: 94, y: 60 };

      const posLeft = calculateShadedPosition(extremeLeftReceiver, "outside", { losY, offset: 3 });
      expect(posLeft.x).toBeGreaterThanOrEqual(5);

      const posRight = calculateShadedPosition(extremeRightReceiver, "outside", { losY, offset: 3 });
      expect(posRight.x).toBeLessThanOrEqual(95);
    });

    it("accepts numeric shorthand for currentDefenderY", () => {
      const pos = calculateShadedPosition(receiverRight, "head_up", 54, losY);
      expect(pos.x).toBe(80);
      expect(pos.y).toBe(54);
    });
  });
});
