import { describe, expect, it } from "vitest";
import { createDefaultPlaybooks } from "@/lib/playbookTypes";
import {
  createYorkOffensivePlaybook,
  includeYorkOffensivePlaybook,
  YORK_OFFENSIVE_PLAYBOOK_ID,
  YORK_OFFENSIVE_CATEGORIES,
} from "@/lib/yorkOffensivePlaybook";

const EXPECTED_PLAY_NAMES = [
  "Captains",
  "Hawaii",
  "Cowboy",
  "Levels",
  "Smash",
  "Spider",
  "Z ISO",
  "Y wheel",
  "Pairs",
  "Maui",
  "Trailmix",
  "X option",
  "Xbox",
  "Chocolate",
  "Stripes",
  "Corn",
  "Divide",
  "Thieves",
  "Wrap",
  "Diamonds",
  "Flood",
  "Takeoff",
  "Taps",
  "Jello",
  "Jerry",
  "Cali",
  "Snag",
  "Coin Toss",
  "X Factor",
  "Sheridan",
  "Jailbreak",
  "Hot Potato",
  "Penny Pincher",
  "Run it back",
  "King",
  "007",
  "Basketball",
  "Itsy Bitsy",
];

describe("York Lions offensive playbook", () => {
  it("includes all 38 named plays as editable 5v5 diagrams", () => {
    const playbook = createYorkOffensivePlaybook("york_lions");

    expect(playbook.id).toBe(YORK_OFFENSIVE_PLAYBOOK_ID);
    expect(playbook.plays).toHaveLength(38);
    expect(playbook.plays.map((play) => play.name)).toEqual(EXPECTED_PLAY_NAMES);
    expect(playbook.formations.map((formation) => formation.name)).toEqual(YORK_OFFENSIVE_CATEGORIES);
    expect(Object.fromEntries(YORK_OFFENSIVE_CATEGORIES.map((category) => [
      category, playbook.plays.filter((play) => play.formation === category).length,
    ]))).toEqual({
      Run: 3,
      Pass: 27,
      RPO: 4,
      "Extra Point/Short Yardage": 2,
      Uncategorized: 2,
    });
    expect(playbook.plays.every((play) => YORK_OFFENSIVE_CATEGORIES.some(
      (category) => category === play.formation,
    ))).toBe(true);

    for (const play of playbook.plays) {
      const offense = play.players.filter((player) => player.side === "offense");
      const defense = play.players.filter((player) => player.side === "defense");
      expect(offense).toHaveLength(5);
      expect(defense).toHaveLength(5);
      expect(offense.filter((player) => player.route?.length).length).toBeGreaterThanOrEqual(3);

      for (const player of play.players) {
        expect(player.x).toBeGreaterThanOrEqual(0);
        expect(player.x).toBeLessThanOrEqual(100);
        expect(player.y).toBeGreaterThanOrEqual(0);
        expect(player.y).toBeLessThanOrEqual(100);
        for (const point of player.route ?? []) {
          expect(point.x).toBeGreaterThanOrEqual(0);
          expect(point.x).toBeLessThanOrEqual(100);
          expect(point.y).toBeGreaterThanOrEqual(0);
          expect(point.y).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("replaces only the generated default offense when there are no saved playbooks", () => {
    const defaults = createDefaultPlaybooks("york_lions", 5);
    const defense = defaults.find((book) => book.type === "defense");
    const withYork = includeYorkOffensivePlaybook(defaults, "york_lions", true);

    expect(withYork.find((book) => book.type === "offense")?.id).toBe(YORK_OFFENSIVE_PLAYBOOK_ID);
    expect(withYork.find((book) => book.type === "defense")).toBe(defense);
  });

  it("preserves saved playbooks and appends York's book when there is capacity", () => {
    const saved = createDefaultPlaybooks("york_lions", 5);
    const withYork = includeYorkOffensivePlaybook(saved, "york_lions", false);

    expect(withYork).toHaveLength(saved.length + 1);
    expect(withYork.slice(0, saved.length)).toEqual(saved);
    expect(withYork.at(-1)?.id).toBe(YORK_OFFENSIVE_PLAYBOOK_ID);
  });

  it("does not overwrite saved playbooks when the team is already at capacity", () => {
    const defaults = createDefaultPlaybooks("york_lions", 5);
    const saved = Array.from({ length: 5 }, (_, index) => ({
      ...defaults[0],
      id: `custom-${index}`,
      title: `Custom ${index}`,
    }));

    expect(includeYorkOffensivePlaybook(saved, "york_lions", false)).toBe(saved);
  });

  it("upgrades the legacy folder without changing routes, notes, or user-assigned categories", () => {
    const original = createYorkOffensivePlaybook("york_lions");
    const legacy = {
      ...original,
      seedCategoryVersion: undefined,
      formations: [
        { id: "york-lions-offense", name: "York Lions Offense", side: "offense" as const },
        { id: "custom", name: "Custom Install", side: "offense" as const },
      ],
      plays: original.plays.map((play, index) => ({
        ...play,
        formation: index === 0 ? "Custom Install" : "York Lions Offense",
        notes: "Coach's saved edit",
      })),
    };
    const [migrated] = includeYorkOffensivePlaybook([legacy], "york_lions", false);

    expect(migrated.formations.map((formation) => formation.name)).toEqual([
      "Custom Install", ...YORK_OFFENSIVE_CATEGORIES,
    ]);
    expect(migrated.plays[0]).toBe(legacy.plays[0]);
    for (let index = 1; index < migrated.plays.length; index++) {
      expect(migrated.plays[index]).toEqual({ ...legacy.plays[index], formation: original.plays[index].formation });
      expect(migrated.plays[index].players).toBe(legacy.plays[index].players);
    }
    const [unchanged] = includeYorkOffensivePlaybook([migrated], "york_lions", false);
    expect(unchanged).toBe(migrated);
  });

  it("categorizes previously unassigned imports once and preserves later coach corrections", () => {
    const original = createYorkOffensivePlaybook("york_lions");
    const legacy = {
      ...original,
      seedCategoryVersion: undefined,
      plays: original.plays.map((play) => ({ ...play, formation: "Uncategorized" })),
    };
    const [migrated] = includeYorkOffensivePlaybook([legacy], "york_lions", false);
    expect(migrated.plays.map((play) => play.formation)).toEqual(
      original.plays.map((play) => play.formation),
    );
    const corrected = {
      ...migrated,
      plays: migrated.plays.map((play) => ({ ...play, formation: "Uncategorized" })),
    };
    expect(includeYorkOffensivePlaybook([corrected], "york_lions", false)[0]).toBe(corrected);
  });

  it("does not categorize duplicated, renamed, or custom plays as source imports", () => {
    const original = createYorkOffensivePlaybook("york_lions");
    const saved = {
      ...original,
      seedCategoryVersion: undefined,
      plays: [
        { ...original.plays[0], name: "Coach's special", formation: "Uncategorized" },
        { ...original.plays[1], id: "custom-copy", formation: "Uncategorized" },
        { ...original.plays[2], formation: "Run" },
      ],
    };
    const [migrated] = includeYorkOffensivePlaybook([saved], "york_lions", false);
    expect(migrated.plays).toEqual(saved.plays);
    expect(migrated.plays.every((play, index) => play === saved.plays[index])).toBe(true);
  });
});
