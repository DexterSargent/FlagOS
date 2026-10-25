import type { DecodedIdToken } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";

const resolved = new WeakMap<DecodedIdToken, string[]>();

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/**
 * Loads every verified email connected to the signed-in account (primary first) and caches it on
 * the token so synchronous permission checks can use {@link accountEmails}. Connected-email
 * sessions run as the primary account, so roles stored against any connected email must count.
 */
export async function loadAccountEmails(token: DecodedIdToken): Promise<string[]> {
  const cached = resolved.get(token);
  if (cached) return cached;
  const primary = normalize(token.email);
  const emails = new Set<string>(primary ? [primary] : []);
  try {
    const account = await adminDb.doc(`account_email_connections/${token.uid}`).get();
    const entries: unknown = account.get("emails");
    if (Array.isArray(entries)) {
      for (const entry of entries.slice(0, 10)) {
        const email = normalize((entry as { email?: unknown })?.email);
        if (email) emails.add(email);
      }
    }
  } catch (error) {
    console.error("Connected email lookup failed:", error);
  }
  const list = [...emails];
  resolved.set(token, list);
  return list;
}

/** Synchronous view of the account's emails; falls back to the token email if not yet loaded. */
export function accountEmails(token: DecodedIdToken): string[] {
  const cached = resolved.get(token);
  if (cached) return cached;
  const primary = normalize(token.email);
  return primary ? [primary] : [];
}

export function matchesAccountEmail(token: DecodedIdToken, value: unknown): boolean {
  const email = normalize(value);
  return Boolean(email) && accountEmails(token).includes(email);
}

export function listHasAccountEmail(token: DecodedIdToken, values: unknown): boolean {
  if (!Array.isArray(values)) return false;
  const emails = accountEmails(token);
  return values.some((value) => emails.includes(normalize(value)));
}
