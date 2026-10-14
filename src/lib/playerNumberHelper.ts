/**
 * Player Number Helper
 * Ensures all play-by-play wizards automatically include jersey numbers
 * so stat trackers can track plays by numbers even if they don't know everyone's names.
 */

export interface PlayerNumberItem {
  id?: string;
  playerName?: string;
  name?: string;
  number?: string | number;
  jerseyNumber?: string | number;
  playerNumber?: string | number;
  teamId?: string;
}

/**
 * Builds a dictionary mapping player names to jersey numbers.
 * If a player does not have an explicit jersey number assigned,
 * automatically generates a stable 1-indexed fallback number based on roster position
 * so that EVERY player in every wizard has a number for stat tracking.
 */
export function getPlayerNumberMap(
  players: PlayerNumberItem[] = [],
  homeRoster: string[] = [],
  awayRoster: string[] = []
): Record<string, string> {
  const map: Record<string, string> = {};

  // 1. Populate from explicit player records
  if (Array.isArray(players)) {
    players.forEach((p) => {
      const name = p.playerName || p.name;
      const num = p.number ?? p.jerseyNumber ?? p.playerNumber;
      if (name && num !== undefined && num !== null && String(num).trim() !== "") {
        map[name] = String(num).replace(/^#/, "").trim();
      }
    });
  }

  // 2. Scan roster names for inline numbers, e.g. "#15 Patrick Mahomes" or "15 Patrick"
  const allNames = Array.from(new Set([...homeRoster, ...awayRoster]));
  allNames.forEach((name) => {
    if (!name || name === "TEAM" || map[name]) return;
    const match = name.match(/^#?(\d+)\s*[-:]?\s*/);
    if (match && match[1]) {
      map[name] = match[1];
    }
  });

  // 3. Auto-assign fallback numbers for any player still lacking one
  // so stat trackers on field always have a number to tap
  let nextFallback = 1;
  const usedNumbers = new Set(Object.values(map));

  allNames.forEach((name) => {
    if (!name || name === "TEAM" || map[name]) return;
    while (usedNumbers.has(String(nextFallback))) {
      nextFallback++;
    }
    const assigned = String(nextFallback);
    map[name] = assigned;
    usedNumbers.add(assigned);
    nextFallback++;
  });

  return map;
}

/**
 * Sorts roster players by jersey number numerically, followed by non-numbered,
 * with 'TEAM' placed at the end.
 */
export function sortRosterWithNumbers(
  roster: string[],
  numberMap: Record<string, string> = {}
): string[] {
  const cleanRoster = roster.filter((p) => p !== "TEAM");
  const sorted = [...cleanRoster].sort((a, b) => {
    const numA = numberMap[a];
    const numB = numberMap[b];
    const parsedA = numA !== undefined ? parseInt(numA, 10) : NaN;
    const parsedB = numB !== undefined ? parseInt(numB, 10) : NaN;

    if (!isNaN(parsedA) && !isNaN(parsedB)) {
      if (parsedA !== parsedB) return parsedA - parsedB;
      return a.localeCompare(b);
    }
    if (!isNaN(parsedA)) return -1;
    if (!isNaN(parsedB)) return 1;
    return a.localeCompare(b);
  });

  if (roster.includes("TEAM")) {
    sorted.push("TEAM");
  }
  return sorted;
}

/**
 * Returns formatted player label with number, e.g. "#15 Patrick Mahomes"
 */
export function formatPlayerDisplay(name: string, numberMap: Record<string, string> = {}): string {
  if (!name || name === "TEAM") return name;
  const num = numberMap[name];
  return num ? `#${num} ${name}` : name;
}
