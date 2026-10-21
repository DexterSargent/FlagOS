import { render } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import MiniPlayDiagram from "@/components/playbook/MiniPlayDiagram";
import { createDefaultPlaybooks, type Playbook } from "@/lib/playbookTypes";
import {
  createYorkDefensivePlaybook,
  includeYorkDefensivePlaybook,
  YORK_DEFENSIVE_PLAYBOOK_ID,
} from "@/lib/yorkDefensivePlaybook";

vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({ settings: { rules: { rushLineDistance: 7 } } }),
}));

const NAMES = [
  "2-2-1 Cover 2 Copy", "2-2-1 Cover 1 MATCH", "2-2-1 Bracket",
  "York D Cover 2", "York D Cover 1", "York D Engage 8", "York D Cover 0 (Strong)",
  "York D Buzz Slide", "York D Cover 0 (Weak)", "York D Bunch ADJUSTMENT",
  "York D Cover 2 hype", "York D Robber", "York D Play 17", "York D Engage 4",
  "York D Cover 2 Go", "York D Strong Half 2 Go", "York D Weak Half 2 Go",
  "York D Weak Cobra 2 Go", "York D Double Cobra 2 Go",
];
const PAGES = [3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

function play(name: string) {
  const result = createYorkDefensivePlaybook().plays.find((entry) => entry.name === name);
  if (!result) throw new Error(`Missing play: ${name}`);
  return result;
}

describe("York defensive PDF import", () => {
  it("includes all 19 original titles and source pages in their two groups", () => {
    const book = createYorkDefensivePlaybook();
    expect(book.id).toBe(YORK_DEFENSIVE_PLAYBOOK_ID);
    expect(book.plays.map((entry) => entry.name)).toEqual(NAMES);
    expect(new Set(book.plays.map((entry) => entry.id)).size).toBe(19);
    expect(book.formations.map((formation) => formation.name)).toEqual(["2-2-1", "York D"]);
    expect(book.plays.filter((entry) => entry.formation === "2-2-1")).toHaveLength(3);
    expect(book.plays.filter((entry) => entry.formation === "York D")).toHaveLength(16);
    book.plays.forEach((entry, index) => {
      expect(entry.notes).toContain(`page ${PAGES[index]}, play ${index + 1}.`);
      expect(entry.type).toBe("defense");
      expect(entry.teamId).toBe("york_lions");
    });
  });

  it("creates editable 5v5 diagrams with valid coordinates and assignment references", () => {
    for (const entry of createYorkDefensivePlaybook().plays) {
      if (!entry.zones) throw new Error(`Missing zones array: ${entry.name}`);
      expect(entry.players.filter((player) => player.side === "offense")).toHaveLength(5);
      expect(entry.players.filter((player) => player.side === "defense")).toHaveLength(5);
      expect(new Set(entry.players.map((player) => player.id)).size).toBe(10);
      expect(new Set(entry.zones.map((zone) => zone.id)).size).toBe(entry.zones.length);
      for (const player of entry.players) {
        for (const point of [player, ...(player.route ?? [])]) {
          expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
          expect(point.x).toBeGreaterThanOrEqual(0);
          expect(point.x).toBeLessThanOrEqual(100);
          expect(point.y).toBeGreaterThanOrEqual(0);
          expect(point.y).toBeLessThanOrEqual(100);
        }
        if (player.manTargetId) {
          expect(player.coverageType).toBe("man");
          expect(entry.players.find((target) => target.id === player.manTargetId)?.side).toBe("offense");
        }
        if (player.zoneId) {
          expect(player.coverageType).toBe("zone");
          expect(entry.zones.some((zone) => zone.id === player.zoneId)).toBe(true);
        }
      }
      for (const zone of entry.zones) {
        expect(zone.x).toBeGreaterThanOrEqual(0);
        expect(zone.x).toBeLessThanOrEqual(100);
        expect(zone.y).toBeGreaterThanOrEqual(0);
        expect(zone.y).toBeLessThanOrEqual(100);
        expect(Number.isFinite(zone.rx) && Number.isFinite(zone.ry)).toBe(true);
        expect(zone.rx).toBeGreaterThan(0);
        expect(zone.ry).toBeGreaterThan(0);
        expect(entry.players.filter((player) => player.zoneId === zone.id)).toHaveLength(1);
      }
    }
  });

  it("reflects source depth but preserves left/right and the match coaching notes", () => {
    const match = play("2-2-1 Cover 1 MATCH");
    const left = match.players.find((player) => player.id === "cl")!;
    const right = match.players.find((player) => player.id === "cr")!;
    const safety = match.players.find((player) => player.id === "fs")!;
    expect(left.x).toBeLessThan(right.x);
    expect(safety.y).toBeLessThan(left.y);
    expect(left.y).toBeLessThan(match.losY);
    expect(match.players.find((player) => player.id === "qb")!.y).toBeGreaterThan(match.losY);
    expect(left.notes).toContain("Do not chase in-breaking");
    expect(safety.notes).toContain("seams/posts");
    expect(match.zones?.filter((zone) => zone.shape === "rectangle")).toHaveLength(2);
  });

  it.each([
    ["York D Cover 1", { cl: "z", cr: "x", sh: "y", wh: "c" }, []],
    ["York D Cover 0 (Strong)", { cl: "z", cr: "x", wh: "c", fs: "y" }, ["sh"]],
    ["York D Cover 0 (Weak)", { cl: "z", cr: "x", sh: "c", fs: "y" }, ["wh"]],
    ["York D Buzz Slide", { cr: "x", sh: "z", wh: "y", fs: "c" }, []],
  ] as const)("preserves explicit matchups and rushers in %s", (name, assignments, rushers) => {
    const entry = play(name);
    expect(Object.fromEntries(entry.players.filter((player) => player.coverageType === "man")
      .map((player) => [player.id, player.manTargetId]))).toEqual(assignments);
    expect(entry.players.filter((player) => player.coverageType === "rush").map((player) => player.id)).toEqual(rushers);
  });

  it("distinguishes Engage 8's double rush from Engage 4's underneath drop", () => {
    const double = play("York D Engage 8");
    const single = play("York D Engage 4");
    expect(double.players.filter((player) => player.coverageType === "rush").map((player) => player.id)).toEqual(["sh", "wh"]);
    expect(single.players.filter((player) => player.coverageType === "rush").map((player) => player.id)).toEqual(["wh"]);
    expect(single.players.find((player) => player.id === "sh")?.coverageType).toBe("zone");
  });

  it("preserves the bunch alignment and does not invent Play 17's missing assignments", () => {
    const bunch = play("York D Bunch ADJUSTMENT");
    for (const id of ["z", "y", "x"]) {
      expect(bunch.players.find((player) => player.id === id)!.x).toBeLessThan(35);
    }
    expect(bunch.players.find((player) => player.id === "sh")?.manTargetId).toBe("x");
    const incomplete = play("York D Play 17");
    expect(incomplete.players.filter((player) => player.coverageType === "man").map((player) => [player.id, player.manTargetId]))
      .toEqual([["fs", "y"]]);
    for (const id of ["cl", "cr", "wh"]) {
      expect(incomplete.players.find((player) => player.id === id)?.coverageType).toBeUndefined();
    }
    expect(incomplete.players.find((player) => player.id === "y")?.route).toHaveLength(3);
    expect(incomplete.notes).toContain("incomplete assignments");
  });

  it("renders every diagram with the actual app thumbnail component", () => {
    for (const entry of createYorkDefensivePlaybook().plays) {
      const rendered = render(createElement(MiniPlayDiagram, { play: entry, showOpposingSide: true }));
      expect(rendered.container.querySelector("svg")).not.toBeNull();
      expect(rendered.container.innerHTML).not.toMatch(/NaN|Infinity/);
      expect(rendered.container.querySelectorAll('[stroke="#EC4899"]')).toHaveLength(
        entry.players.filter((player) => player.coverageType === "man").length,
      );
      rendered.unmount();
    }
  });

  it("appends without changing existing coach content and preserves repeat-import edits", () => {
    const saved = createDefaultPlaybooks("york_lions", 5);
    const before = structuredClone(saved);
    const appended = includeYorkDefensivePlaybook(saved);
    expect(saved).toEqual(before);
    expect(appended.slice(0, saved.length)).toEqual(before);
    expect(appended.slice(0, saved.length).every((book, index) => book === saved[index])).toBe(true);
    appended.at(-1)!.plays[0].name = "Coach edit";
    expect(includeYorkDefensivePlaybook(appended)).toBe(appended);
    expect(appended.at(-1)!.plays[0].name).toBe("Coach edit");
  });

  it("rejects other teams and refuses to overwrite a full set of books", () => {
    expect(() => createYorkDefensivePlaybook("demo-team")).toThrow("belongs to York");
    expect(() => includeYorkDefensivePlaybook(createDefaultPlaybooks("demo-team", 5))).toThrow("Only York");
    const base = createDefaultPlaybooks("york_lions", 5)[0];
    const full: Playbook[] = Array.from({ length: 5 }, (_, index) => ({ ...base, id: `coach-${index}` }));
    expect(() => includeYorkDefensivePlaybook(full)).toThrow("five playbooks");
    expect(full).toHaveLength(5);
  });
});
