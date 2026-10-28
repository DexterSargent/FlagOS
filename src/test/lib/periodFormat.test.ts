import { describe, expect, it } from "vitest";
import { resolvePeriodFormat } from "@/lib/periodFormat";

describe("periodFormat", () => {
  it("resolves from matchState when periodType is explicitly halves or quarters", () => {
    expect(resolvePeriodFormat(undefined, { periodType: "quarters", periodsCount: 4 })).toEqual({
      periodType: "quarters",
      periodsCount: 4,
    });

    expect(resolvePeriodFormat(undefined, { periodType: "halves" })).toEqual({
      periodType: "halves",
      periodsCount: 2,
    });
  });

  it("resolves from rules when matchState does not specify periodType", () => {
    expect(resolvePeriodFormat({ periodType: "quarters", periodsCount: 4 })).toEqual({
      periodType: "quarters",
      periodsCount: 4,
    });

    expect(resolvePeriodFormat(undefined)).toEqual({
      periodType: "halves",
      periodsCount: 2,
    });
  });

  it("widens to quarters or higher when game is past rules last period", () => {
    // half is 3 (past 2 halves), so widens to quarters
    expect(resolvePeriodFormat({ periodType: "halves", periodsCount: 2 }, { half: 3 })).toEqual({
      periodType: "quarters",
      periodsCount: 4,
    });

    // half is 5 (past 4), keeps periodType and sets periodsCount to half
    expect(resolvePeriodFormat({ periodType: "quarters", periodsCount: 4 }, { half: 5 })).toEqual({
      periodType: "quarters",
      periodsCount: 5,
    });
  });
});
