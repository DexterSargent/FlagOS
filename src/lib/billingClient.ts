"use client";

import { authenticatedPost } from "@/lib/secureWrites";

export type BillingKind = "team" | "league";

export type CheckoutStatus = {
  requestId: string;
  status: "pending" | "paid" | "consumed" | "expired" | "failed" | string;
  kind: BillingKind;
  teamCount: number;
  createdEntityId: string;
};

export type SeatChangePreview = {
  currentTeamCount: number;
  teamCount: number;
  currency: string;
  amountDueNowCents: number;
  newMonthlyCents: number;
  prorationDate: number;
  takesEffect: "after_payment" | "next_renewal";
};

const DRAFT_KEY = "flagos_checkout_draft";

/** Starts Stripe Checkout and navigates to the hosted payment page. */
export async function startCheckout(kind: BillingKind, teamCount?: number): Promise<void> {
  const { url } = await authenticatedPost<{ url: string; requestId: string }>(
    "/api/billing/checkout",
    { kind, ...(kind === "league" ? { teamCount } : {}) },
    "Could not start checkout.",
  );
  window.location.assign(url);
}

export function getCheckoutStatus(requestId: string): Promise<CheckoutStatus> {
  return authenticatedPost<CheckoutStatus>("/api/billing/status", { requestId }, "Could not confirm your payment.");
}

export function listUnusedPurchases(): Promise<{ enabled: boolean; unused: CheckoutStatus[] }> {
  return authenticatedPost("/api/billing/status", {}, "Could not load your purchases.");
}

export async function openBillingPortal(kind: BillingKind, entityId: string): Promise<void> {
  const { url } = await authenticatedPost<{ url: string }>(
    "/api/billing/portal",
    { kind, entityId },
    "Could not open billing management.",
  );
  window.location.assign(url);
}

export function previewSeatChange(leagueId: string, teamCount: number): Promise<SeatChangePreview> {
  return authenticatedPost("/api/billing/seats", { leagueId, teamCount }, "Could not price this change.");
}

export function applySeatChange(
  leagueId: string,
  teamCount: number,
  prorationDate: number,
): Promise<{ status: "applied" | "payment_required"; teamCount: number }> {
  return authenticatedPost(
    "/api/billing/seats",
    { leagueId, teamCount, prorationDate, confirm: true },
    "Could not change the plan.",
  );
}

export function formatCad(cents: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}

/** The setup form is kept in this tab while the customer pays, then restored on return. */
export function saveCheckoutDraft(draft: Record<string, unknown>): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Large uploaded logos may exceed storage; the form can be re-entered.
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, logoUrl: "" }));
    } catch { /* ignore */ }
  }
}

export function readCheckoutDraft(): Record<string, unknown> | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function clearCheckoutDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch { /* ignore */ }
}