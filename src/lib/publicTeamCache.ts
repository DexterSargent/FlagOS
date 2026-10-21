type Entry = { promise: Promise<unknown>; expiresAt: number };
const entries = new Map<string, Entry>();
let listening = false;

export function invalidatePublicTeamData(): void {
  entries.clear();
}

/** Only public data belongs here. Private coach/account responses must never use this cache. */
export function cachedPublicTeamRequest<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!listening && typeof window !== "undefined") {
    listening = true;
    window.addEventListener("focus", invalidatePublicTeamData);
    window.addEventListener("storage", invalidatePublicTeamData);
    window.addEventListener("flagos-public-data-changed", invalidatePublicTeamData);
  }
  const existing = entries.get(key);
  if (existing && existing.expiresAt > Date.now()) return existing.promise as Promise<T>;
  const entry: Entry = { promise: Promise.resolve(), expiresAt: Infinity };
  entry.promise = load().then(
    (value) => {
      entry.expiresAt = Date.now() + 30_000;
      return value;
    },
    (error: unknown) => {
      if (entries.get(key) === entry) entries.delete(key);
      throw error;
    },
  );
  entries.set(key, entry);
  return entry.promise as Promise<T>;
}
