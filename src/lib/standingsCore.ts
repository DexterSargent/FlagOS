/* eslint-disable @typescript-eslint/no-explicit-any */
// Dependency-free standings helpers shared by client pages and server routes.

import { compareNatural } from "./sortUtils";

export interface StandingSortRow {
  winPct: number;
  diff: number;
  pointsFor: number;
  pointsAgainst: number;
  name: string;
}

export function compareStandingRows(a: StandingSortRow, b: StandingSortRow): number {
  if (b.winPct !== a.winPct) return b.winPct - a.winPct;
  if (b.diff !== a.diff) return b.diff - a.diff;
  if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
  if (a.pointsAgainst !== b.pointsAgainst) return a.pointsAgainst - b.pointsAgainst;
  return compareNatural(a.name, b.name);
}

export function isPlayoffMatch(m: any): boolean {
  return Boolean(m?.isPlayoff || m?.week?.toString().toLowerCase().includes("playoff"));
}
