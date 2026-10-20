import { describe, expect, it } from "vitest";
import { getDepthFormations, getPlayerPositions, validateDepthCharts } from "@/lib/depthChart";
import { createDefaultPlaybooks } from "@/lib/playbookTypes";

describe("depth chart definitions", () => {
  it("preserves multiple positions and reads legacy single-position players", () => {
    expect(getPlayerPositions({ positions: ["QB", "WR", "QB"], position: "QB" })).toEqual(["QB", "WR"]);
    expect(getPlayerPositions({ position: "DB" })).toEqual(["DB"]);
    expect(getPlayerPositions({})).toEqual(["ATH"]);
  });
  it("uses default positions when no playbook exists", () => {
    const formations = getDepthFormations();
    expect(formations.map((formation) => formation.key)).toEqual(["default:offense", "default:defense"]);
    expect(formations[0].slots.map((slot) => slot.id)).toEqual(["QB", "WR", "RB", "C"]);
  });
  it("derives separate slots from real formation nodes, including repeated position labels", () => {
    const books = createDefaultPlaybooks("team", 5);
    const formation = books[0].formations[0];
    formation.players = [
      { id: "left", label: "WR", role: "Receiver", x: 10, y: 60, side: "offense" },
      { id: "right", label: "WR", role: "Receiver", x: 90, y: 60, side: "offense" },
    ];
    const derived = getDepthFormations(books);
    expect(derived[0].slots).toEqual([{ id: "left", label: "WR" }, { id: "right", label: "WR" }]);
    expect(derived[0].key).toBe(`${books[0].id}:${formation.id}`);
    expect(derived.every((item) => !item.key.startsWith("default:"))).toBe(true);
  });
  it("validates bounded saved charts and rejects duplicates and malformed assignments", () => {
    const chart = { id: "chart", name: "Starters", formationKey: "default:offense", assignments: { QB: ["p1", "p2"] } };
    expect(validateDepthCharts({ charts: [chart], visibleToPlayers: false })).toBe(true);
    expect(validateDepthCharts({ charts: [chart, chart], visibleToPlayers: false })).toBe(false);
    expect(validateDepthCharts({ charts: [{ ...chart, assignments: { QB: ["p1", "p1"] } }], visibleToPlayers: true })).toBe(false);
    expect(validateDepthCharts({ charts: [chart], visibleToPlayers: "true" })).toBe(false);
  });
});
