/**
 * Team stat trackers only record their own roster. When the opponent has the ball,
 * their passer is stored under a placeholder ID so our defenders/flaggers can still be
 * credited. These helpers turn that placeholder into a readable label and keep it out
 * of individual stat tables.
 */

export const OPPONENT_QB_PLACEHOLDER = "Unknown QB";
export const OPPONENT_RUNNER_PLACEHOLDER = "Unknown Ball Carrier";

const QB_PLACEHOLDER_NAMES = new Set([
  "unknown qb",
  "unknown quarterback",
  "opponent qb",
  "opponent quarterback",
]);

const RUNNER_PLACEHOLDER_NAMES = new Set([
  "unknown ball carrier",
  "unknown runner",
  "opponent runner",
  "opponent ball carrier",
  "ball carrier",
]);

const GENERIC_PLACEHOLDER_NAMES = new Set([
  "unknown player",
  "unknown",
]);

export function isOpponentRunnerPlaceholder(name: unknown): boolean {
  if (typeof name !== "string") return false;
  return RUNNER_PLACEHOLDER_NAMES.has(name.trim().toLowerCase());
}

export function isOpponentPlaceholder(name: unknown): boolean {
  if (typeof name !== "string") return false;
  const lower = name.trim().toLowerCase();
  return (
    QB_PLACEHOLDER_NAMES.has(lower) ||
    RUNNER_PLACEHOLDER_NAMES.has(lower) ||
    GENERIC_PLACEHOLDER_NAMES.has(lower)
  );
}

export function toPossessive(teamName: unknown): string {
  const name = typeof teamName === "string" ? teamName.trim() : "";
  if (!name) return "Opponent's";
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

export function opponentQuarterbackLabel(teamName?: unknown): string {
  return `${toPossessive(teamName)} Quarterback`;
}

export function opponentRunnerLabel(teamName?: unknown): string {
  const name = typeof teamName === "string" ? teamName.trim() : "";
  return name ? `${name} Ball Carrier` : "Opponent Ball Carrier";
}

/**
 * Returns a display-safe player name. Placeholders resolve to the possessing team's
 * quarterback or ball carrier label; non-string or blank values resolve to an empty string.
 */
export function displayPlayerName(name: unknown, possessionTeamName?: unknown): string {
  if (typeof name !== "string") return "";
  const trimmed = name.trim();
  if (!trimmed) return "";
  if (isOpponentRunnerPlaceholder(trimmed)) {
    return opponentRunnerLabel(possessionTeamName);
  }
  return isOpponentPlaceholder(trimmed) ? opponentQuarterbackLabel(possessionTeamName) : trimmed;
}

/** Replaces any placeholder text embedded in a pre-formatted play statement. */
export function replacePlaceholderInText(text: unknown, possessionTeamName?: unknown): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/\bUnknown (QB|Quarterback)\b/gi, opponentQuarterbackLabel(possessionTeamName))
    .replace(/\bUnknown (Ball Carrier|Runner)\b/gi, opponentRunnerLabel(possessionTeamName));
}

/** True when a name should get its own row in a player stat table. */
export function isTrackablePlayer(name: unknown): name is string {
  return typeof name === "string" && name.trim().length > 0 && !isOpponentPlaceholder(name);
}
