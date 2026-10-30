import { describe, expect, it } from "vitest";
import { compareByName, compareNatural } from "@/lib/sortUtils";

describe("sortUtils natural sorting", () => {
  it("sorts team names naturally with numbers (1, 2, 10, 11, etc.)", () => {
    const raw = ["Team 1", "Team 11", "Team 12", "Team 13", "Team 2", "Team 3", "Team 10"];
    const sorted = [...raw].sort(compareNatural);

    expect(sorted).toEqual([
      "Team 1",
      "Team 2",
      "Team 3",
      "Team 10",
      "Team 11",
      "Team 12",
      "Team 13",
    ]);
  });

  it("sorts objects by name using compareByName", () => {
    const teams = [
      { id: "11", name: "Team 11" },
      { id: "1", name: "Team 1" },
      { id: "2", name: "Team 2" },
      { id: "10", name: "Team 10" },
    ];

    const sorted = [...teams].sort(compareByName);

    expect(sorted.map((t) => t.name)).toEqual([
      "Team 1",
      "Team 2",
      "Team 10",
      "Team 11",
    ]);
  });

  it("handles empty or nullish names gracefully", () => {
    expect(compareNatural(null, "Team 1")).toBeLessThan(0);
    expect(compareNatural("Team 1", null)).toBeGreaterThan(0);
    expect(compareNatural("", "")).toBe(0);
  });
});

