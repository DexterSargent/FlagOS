// Keep this module data-only so trusted routes do not import the season fixtures.
export const YORK_TEAM_ID = "york_lions";
export const YORK_TEAM_ALIASES = [
  YORK_TEAM_ID, "team_york", "york", "yuwffl_lions", "york_wffl",
];

export const YORK_HEAD_COACH_EMAILS = [
  "dextersargent@gmail.com", "dexters4@my.yorku.ca",
];

export const YORK_ADMIN_EMAILS = [
  ...YORK_HEAD_COACH_EMAILS,
  "tbrown99@my.yorku.ca", "theobrown24@icloud.com", "theoren911@gmail.com",
  "fawcett1@my.yorku.ca", "justinfawcett93@gmail.com",
];

export function isYorkTeam(teamId?: string | null): boolean {
  return typeof teamId === "string" && YORK_TEAM_ALIASES.includes(teamId.trim().toLowerCase());
}
