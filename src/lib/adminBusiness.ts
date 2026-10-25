"use client";

import { auth } from "@/lib/firebase";
import type { AuditEntry, CustomerKind, LedgerEntry, LedgerType, PlatformUser } from "@/lib/adminMetrics";

export interface BusinessSnapshot {
  ledger: LedgerEntry[];
  audit: AuditEntry[];
  users: PlatformUser[];
  counts: { leagues: number | null; teams: number | null; players: number | null; matches: number | null; plays: number | null };
  warnings: string[];
  generatedAt: number;
}

export interface LedgerDraft {
  type: LedgerType;
  amount: number;
  date: string;
  category: string;
  description?: string;
  customerId?: string;
  customerKind?: CustomerKind;
  customerName?: string;
  advanceRenewal?: boolean;
}

export interface SubscriptionDraft {
  kind: CustomerKind;
  id: string;
  status: string;
  paymentMethod: "paid" | "complimentary";
  monthlyFee?: number;
  baseMonthlyFee?: number;
  perTeamMonthlyFee?: number;
  teamCount?: number;
  renewsAt: string;
}

export async function adminBusinessRequest<T>(action: string, data: Record<string, unknown> = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before continuing.");
  const idToken = await user.getIdToken();
  const response = await fetch("/api/admin/business", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  const result = (await response.json().catch(() => ({}))) as { data?: T; error?: string };
  if (!response.ok || result.data === undefined) throw new Error(result.error || "The admin request could not be completed.");
  return result.data;
}
