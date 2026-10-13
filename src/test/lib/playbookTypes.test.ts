import { describe, it, expect } from "vitest";
import {
  ensureSquadMatchup,
  ensure5v5Matchup,
  createDefaultPlaybooks,
  migrateRawPlaysToPlaybooks,
  createPlayInFormation,
  DEFAULT_LOS_Y,
} from "@/lib/playbookTypes";

describe("playbookTypes", () => {
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
});
