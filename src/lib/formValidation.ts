/** Shared, dependency-free form validation helpers. */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** Splits a comma/semicolon/newline separated list of emails and returns the invalid ones. */
export function splitEmails(value: string): { valid: string[]; invalid: string[] } {
  const parts = value.split(/[,;\n]/).map((v) => v.trim()).filter(Boolean);
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const p of parts) (isValidEmail(p) ? valid : invalid).push(p.toLowerCase());
  return { valid: Array.from(new Set(valid)), invalid };
}

export function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Parses a whole number from user input; returns null for blank/invalid/out-of-range. */
export function parseIntInRange(value: string | number, min: number, max: number): number | null {
  const str = String(value).trim();
  if (!/^-?\d+$/.test(str)) return null;
  const n = Number(str);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

/** Parses a non-negative decimal (e.g. a fee); returns null for blank/invalid/negative. */
export function parseNonNegativeNumber(value: string | number): number | null {
  const str = String(value).trim();
  if (str === "") return null;
  const n = Number(str);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
