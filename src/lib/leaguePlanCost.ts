import type { LeagueSubscriptionInfo } from "./leagueContext";

/*
 * Client-side mirror of the league pricing model (see billingServer.ts): a $40 base fee plus $20
 * per team seat each month. Seat additions are invoiced immediately (prorated) and take effect
 * once paid; seat reductions bill from the next renewal.
 */

export const LEAGUE_BASE_MONTHLY = 40;
export const LEAGUE_SEAT_MONTHLY = 20;
export const DEFAULT_LEAGUE_SEATS = 8;

export function leagueSeatCount(subscription?: LeagueSubscriptionInfo | null): number {
  return subscription?.teamCount ?? DEFAULT_LEAGUE_SEATS;
}

export function leagueMonthlyTotal(subscription: LeagueSubscriptionInfo | null | undefined, seats: number): number {
  const base = subscription?.baseMonthlyFee ?? LEAGUE_BASE_MONTHLY;
  const perSeat = subscription?.perTeamMonthlyFee ?? LEAGUE_SEAT_MONTHLY;
  return base + seats * perSeat;
}

export function isComplimentaryPlan(subscription?: LeagueSubscriptionInfo | null): boolean {
  return subscription?.paymentMethod === "complimentary";
}

export type AddTeamCost = {
  /** The league already uses every seat, so adding a team also buys a seat. */
  needsSeat: boolean;
  /** No money changes hands (open seat, complimentary plan or demo). */
  free: boolean;
  seats: number;
  openSeats: number;
  newMonthlyTotal: number;
  /** Short call-to-action, e.g. "Add Team (+$20/mo)". */
  label: string;
  /** One-line explanation to show beside the add-team form. */
  detail: string;
};

/** Describes what adding one team to the league costs right now. */
export function describeAddTeamCost(input: {
  subscription?: LeagueSubscriptionInfo | null;
  teamsInUse: number;
  isDemo?: boolean;
  verb?: string;
}): AddTeamCost {
  const { subscription, teamsInUse, isDemo = false } = input;
  const verb = input.verb || "Add Team";
  const seats = leagueSeatCount(subscription);
  const openSeats = Math.max(0, seats - teamsInUse);
  const needsSeat = openSeats === 0;
  const perSeat = subscription?.perTeamMonthlyFee ?? LEAGUE_SEAT_MONTHLY;
  const newMonthlyTotal = leagueMonthlyTotal(subscription, needsSeat ? seats + 1 : seats);

  if (isDemo) {
    return {
      needsSeat, free: true, seats, openSeats, newMonthlyTotal,
      label: verb,
      detail: needsSeat
        ? `Demo: all ${seats} slots are in use, so a real league would add a seat here. Nothing is saved or charged.`
        : `Demo: uses one of ${openSeats} open slots. Nothing is saved or charged.`,
    };
  }
  if (isComplimentaryPlan(subscription)) {
    return {
      needsSeat, free: true, seats, openSeats, newMonthlyTotal,
      label: `${verb} (Complimentary)`,
      detail: needsSeat
        ? `All ${seats} slots are in use. Adding a team raises your complimentary capacity to ${seats + 1}. No charge.`
        : `Uses one of ${openSeats} open slots. No charge.`,
    };
  }
  if (!needsSeat) {
    return {
      needsSeat, free: true, seats, openSeats, newMonthlyTotal,
      label: `${verb} (slot available)`,
      detail: `Uses one of ${openSeats} open slots on your ${seats}-team plan. No extra charge.`,
    };
  }
  return {
    needsSeat, free: false, seats, openSeats, newMonthlyTotal,
    label: `${verb} (+$${perSeat}/mo)`,
    detail: `All ${seats} slots are in use. Adding a team adds a seat: a prorated charge is billed now, then $${newMonthlyTotal}/mo from your next renewal.`,
  };
}
