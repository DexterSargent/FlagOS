import { describe, it, expect } from "vitest";
import {
  getPlayerNumberMap,
  sortRosterWithNumbers,
  formatPlayerDisplay,
  computePlayerStatCounts,
} from "@/lib/playerNumberHelper";

describe("playerNumberHelper", () => {
  it("extracts jersey numbers from explicit player objects", () => {
    const players = [
      { id: "p1", playerName: "Patrick Mahomes", number: "15" },
      { id: "p2", playerName: "Travis Kelce", jerseyNumber: "87" },
      { id: "p3", playerName: "Trent McDuffie", playerNumber: "#23" },
    ];
    const map = getPlayerNumberMap(players, ["Patrick Mahomes", "Travis Kelce"], ["Trent McDuffie"]);

    expect(map["Patrick Mahomes"]).toBe("15");
    expect(map["Travis Kelce"]).toBe("87");
    expect(map["Trent McDuffie"]).toBe("23");
  });

  it("extracts inline numbers from roster name strings like '#4 Rashee Rice'", () => {
    const map = getPlayerNumberMap([], ["#4 Rashee Rice", "10 Isiah Pacheco"], []);

    expect(map["#4 Rashee Rice"]).toBe("4");
    expect(map["10 Isiah Pacheco"]).toBe("10");
  });

  it("automatically generates clean fallback numbers when players have no numbers assigned", () => {
    const players = [
      { id: "p1", playerName: "Marcus Vance" },
      { id: "p2", playerName: "Leo Sterling" },
    ];
    const map = getPlayerNumberMap(players, ["Marcus Vance", "Leo Sterling"], ["David Kim"]);

    expect(map["Marcus Vance"]).toBeDefined();
    expect(map["Leo Sterling"]).toBeDefined();
    expect(map["David Kim"]).toBeDefined();

    // Verify all numbers are unique and positive integers
    const numbers = [map["Marcus Vance"], map["Leo Sterling"], map["David Kim"]];
    const uniqueNumbers = new Set(numbers);
    expect(uniqueNumbers.size).toBe(3);
    numbers.forEach((num) => {
      expect(parseInt(num, 10)).toBeGreaterThan(0);
    });
  });

  it("avoids colliding auto-generated numbers with existing explicit numbers", () => {
    const players = [
      { id: "p1", playerName: "Player One", number: "1" },
      { id: "p2", playerName: "Player Two", number: "2" },
      { id: "p3", playerName: "Player Three" }, // no number
    ];
    const map = getPlayerNumberMap(players, ["Player One", "Player Two", "Player Three"]);

    expect(map["Player One"]).toBe("1");
    expect(map["Player Two"]).toBe("2");
    expect(map["Player Three"]).toBe("3");
  });

  it("sorts players numerically by jersey number and puts TEAM at the end", () => {
    const roster = ["Travis Kelce", "Patrick Mahomes", "TEAM", "Rashee Rice", "Xavier Worthy"];
    const numberMap = {
      "Patrick Mahomes": "15",
      "Travis Kelce": "87",
      "Rashee Rice": "4",
      "Xavier Worthy": "1",
    };

    const sorted = sortRosterWithNumbers(roster, numberMap);

    expect(sorted).toEqual([
      "Xavier Worthy", // #1
      "Rashee Rice",   // #4
      "Patrick Mahomes", // #15
      "Travis Kelce",  // #87
      "TEAM",
    ]);
  });

  it("formats player display label with #number prefix", () => {
    const numberMap = { "Patrick Mahomes": "15" };
    expect(formatPlayerDisplay("Patrick Mahomes", numberMap)).toBe("#15 Patrick Mahomes");
    expect(formatPlayerDisplay("TEAM", numberMap)).toBe("TEAM");
    expect(formatPlayerDisplay("Unknown Player", numberMap)).toBe("Unknown Player");
  });

  it("sorts players by stat leader category descending, falling back to jersey number for ties", () => {
    const roster = ["Travis Kelce", "Patrick Mahomes", "Carson Wentz", "TEAM", "Rashee Rice"];
    const numberMap = {
      "Carson Wentz": "11",
      "Patrick Mahomes": "15",
      "Rashee Rice": "4",
      "Travis Kelce": "87",
    };
    // Patrick Mahomes thrown 25 passes, Carson Wentz 3 passes, others 0
    const passCounts = {
      "Patrick Mahomes": 25,
      "Carson Wentz": 3,
    };

    const sorted = sortRosterWithNumbers(roster, numberMap, passCounts);

    expect(sorted).toEqual([
      "Patrick Mahomes", // 25 passes (leader #1)
      "Carson Wentz",    // 3 passes (#2)
      "Rashee Rice",     // 0 passes (#4 jersey)
      "Travis Kelce",    // 0 passes (#87 jersey)
      "TEAM",            // TEAM always last
    ]);
  });

  it("computes player stat counts accurately from plays", () => {
    const mockPlays = [
      { playType: "Pass", qbPlayerId: "Patrick Mahomes", passOutcome: "Complete", receiverPlayerId: "Travis Kelce", defenders: ["Trent McDuffie"] },
      { playType: "Pass", qbPlayerId: "Patrick Mahomes", passOutcome: "PBU", defenders: ["L'Jarius Sneed"] },
      { playType: "Pass", qbPlayerId: "Patrick Mahomes", passOutcome: "Interception", defenders: ["Sauce Gardner"], flaggers: ["Travis Kelce"] },
      { playType: "Pass", qbPlayerId: "Patrick Mahomes", passOutcome: "Sack", defenders: ["Chris Jones"] },
      { playType: "Run", runnerPlayerId: "Isiah Pacheco", defenders: ["Nick Bolton"] },
    ];

    const counts = computePlayerStatCounts(mockPlays);

    expect(counts.passing["Patrick Mahomes"]).toBe(4);
    expect(counts.receiving["Travis Kelce"]).toBe(1);
    expect(counts.rushing["Isiah Pacheco"]).toBe(1);
    expect(counts.interceptions["Sauce Gardner"]).toBe(1);
    expect(counts.pbus["L'Jarius Sneed"]).toBe(1);
    expect(counts.sacks["Chris Jones"]).toBe(1);
    // Flag pulls include Trent McDuffie (complete tackle), Chris Jones (sack tackle), Nick Bolton (run tackle), Travis Kelce (flagger on INT)
    expect(counts.flags["Trent McDuffie"]).toBe(1);
    expect(counts.flags["Chris Jones"]).toBe(1);
    expect(counts.flags["Nick Bolton"]).toBe(1);
    expect(counts.flags["Travis Kelce"]).toBe(1);
  });
});
