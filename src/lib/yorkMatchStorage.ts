import type { DemoMatch } from "./demoSeedData";

export const YORK_CUSTOM_MATCHES_KEY = "flagos_york_matches";
export const REMOVED_YORK_MATCH_IDS = new Set([
  "match_york_canadore_2",
  "match_york_waterloo_2",
  "match_york_western",
]);

export function getYorkCustomMatches(): DemoMatch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(YORK_CUSTOM_MATCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((match) => !REMOVED_YORK_MATCH_IDS.has(match?.id)) : [];
  } catch (error) {
    console.warn("Failed to parse custom York matches:", error);
    return [];
  }
}

export function saveYorkCustomMatch(match: DemoMatch): void {
  if (typeof window === "undefined" || !match?.id) return;
  try {
    const existing = getYorkCustomMatches();
    const index = existing.findIndex((record) => record.id === match.id);
    const updated = [...existing];
    if (index >= 0) updated[index] = { ...updated[index], ...match };
    else updated.push(match);
    localStorage.setItem(YORK_CUSTOM_MATCHES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("flagos-york-data-changed"));
  } catch (error) {
    console.warn("Failed to save custom York match:", error);
  }
}

export function deleteYorkCustomMatch(matchId: string): void {
  if (typeof window === "undefined" || !matchId) return;
  try {
    localStorage.setItem(YORK_CUSTOM_MATCHES_KEY, JSON.stringify(getYorkCustomMatches().filter((match) => match.id !== matchId)));
    window.dispatchEvent(new Event("flagos-york-data-changed"));
  } catch (error) {
    console.warn("Failed to delete custom York match:", error);
  }
}
