import { describe, expect, it } from "vitest";
import { createDefaultPlaybooks } from "@/lib/playbookTypes";
import {
  createYorkOffensivePlaybook,
  includeYorkOffensivePlaybook,
  YORK_OFFENSIVE_PLAYBOOK_ID,
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
});
