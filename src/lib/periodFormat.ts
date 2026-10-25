export type PeriodType = "halves" | "quarters";

export interface PeriodFormat {
  periodType: PeriodType;
  periodsCount: number;
}

interface RulesLike {
  periodType?: string;
  periodsCount?: number;
}

interface MatchStateLike {
  half?: number;
  periodType?: string;
  periodsCount?: number;
}

/**
 * A game keeps the period format it started with, so changing league rules mid-game
 * doesn't relabel a 4th quarter as a "4th half". Older games that never stored a
 * format fall back to league rules, widened to quarters if the game is already past
 * the rules' last period.
 */
export function resolvePeriodFormat(rules: RulesLike | undefined, matchState?: MatchStateLike | null): PeriodFormat {
  if (matchState && (matchState.periodType === "halves" || matchState.periodType === "quarters")) {
    return {
      periodType: matchState.periodType,
      periodsCount: matchState.periodsCount || (matchState.periodType === "quarters" ? 4 : 2),
    };
  }
  const periodType: PeriodType = rules?.periodType === "quarters" ? "quarters" : "halves";
  const periodsCount = rules?.periodsCount || (periodType === "quarters" ? 4 : 2);
  const half = matchState?.half ?? 1;
  if (half > periodsCount) {
    return half <= 4 ? { periodType: "quarters", periodsCount: 4 } : { periodType, periodsCount: half };
  }
  return { periodType, periodsCount };
}
