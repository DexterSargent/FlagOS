export function cleanFirebaseConfigValue(value: string | undefined, fallback?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;

  const quote = trimmed[0];
  if (
    trimmed.length >= 2 &&
    (quote === '"' || quote === "'") &&
    trimmed[trimmed.length - 1] === quote
  ) {
    const unquoted = trimmed.slice(1, -1).trim();
    return unquoted || fallback;
  }

  return trimmed || fallback;
}
