import type { WalkthroughStep } from "@/lib/walkthroughData";

/** Appended to every page guide while the demo role switcher is on screen. */
export const DEMO_ROLE_SWITCHER_STEP: WalkthroughStep = {
  id: "demo-role-switcher",
  targetSelector: '[data-tour="demo-role-switcher"]',
  title: "Demo Role Switcher",
  category: "Demo",
  description: "Preview the demo league as each kind of member. Switching roles changes what you can see and do; nothing you change here affects a real league.",
  details: [
    { label: "Exit Demo", text: "Leave the demo league and return to the FlagOS home page.", targetSelector: 'a[href="/"]' },
    { label: "Switch role", text: "Expand the role switcher to change who you are viewing the demo as.", targetSelector: 'button[aria-expanded="false"]' },
    { label: "Demo role", text: "Choose which member to view the demo as: League Admin, Coach, Player or Spectator.", targetSelector: 'select[aria-label="Demo role"]' },
    { label: "League Admin", text: "Commissioner view: league settings, the schedule, teams and live scorekeeping.", targetSelector: 'button[aria-label="League Admin"]' },
    { label: "Team Admin", text: "Coach view: your team's portal, roster, playbook, exhibition games and stat keeping.", targetSelector: 'button[aria-label="Team Admin"]' },
    { label: "Player", text: "Rostered player view: personal stats, player profile and the team playbook.", targetSelector: 'button[aria-label="Player"]' },
    { label: "Spectator", text: "Fan view: the public schedule, standings and game box scores.", targetSelector: 'button[aria-label="Spectator"]' },
    { label: "Demo team", text: "As a coach, pick which demo team you manage.", targetSelector: 'select[aria-label="Demo team"]' },
    { label: "Demo player team", text: "As a player, pick the team whose players you want to choose from.", targetSelector: 'select[aria-label="Demo player team"]' },
    { label: "Demo athlete", text: "As a player, pick which athlete you are viewing as.", targetSelector: 'select[aria-label^="Demo athlete"]' },
    { label: "Reset session", text: "Undo your demo changes and restore the original demo data. Tap twice to confirm.", targetSelector: 'button[aria-label$="eset session"]' },
  ],
};
