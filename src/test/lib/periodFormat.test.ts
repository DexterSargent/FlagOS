import { describe, expect, it } from "vitest";
import { resolvePeriodFormat } from "@/lib/periodFormat";

describe("resolvePeriodFormat", () => {
  it("keeps the format a live game started with", () => {
    expect(resolvePeriodFormat({ periodType: "halves", periodsCount: 2 }, { half: 4, periodType: "quarters", periodsCount: 4 }))
      .toEqual({ periodType: "quarters", periodsCount: 4 });
  });

  it("uses league rules for games without a stored format", () => {
    expect(resolvePeriodFormat({ periodType: "halves", periodsCount: 2 }, { half: 1 }))
      .toEqual({ periodType: "halves", periodsCount: 2 });
  });

  it("never labels a period past the rules' last period as a half", () => {
    expect(resolvePeriodFormat({ periodType: "halves", periodsCount: 2 }, { half: 4 }))
      .toEqual({ periodType: "quarters", periodsCount: 4 });
  });
});
