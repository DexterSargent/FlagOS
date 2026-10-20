import fs from "fs";

const { matches, allPlays } = JSON.parse(fs.readFileSync("scripts/parsedOutput.json", "utf-8"));

const players = [
  {
    id: "p_york_7",
    teamId: "york_lions",
    playerName: "Sonia Cabral",
    number: "7",
    position: "QB",
    positions: ["QB"],
    experience: "Varsity Starter",
    status: "Active",
    email: "sonia.cabral@my.yorku.ca",
    emails: ["sonia.cabral@my.yorku.ca"],
    joinedAt: "2026-08-15T00:00:00Z",
  },
  {
    id: "p_york_13",
    teamId: "york_lions",
    playerName: "Tizana Sutharsan",
    number: "13",
    position: "WR",
    positions: ["WR", "ATH"],
    experience: "Varsity Starter",
    status: "Active",
    email: "tizana.s@my.yorku.ca",
    emails: ["tizana.s@my.yorku.ca"],
    joinedAt: "2026-08-15T00:00:00Z",
  },
  {
    id: "p_york_88",
    teamId: "york_lions",
    playerName: "Charlette Dewaepenaere",
    number: "88",
    position: "WR",
    positions: ["WR"],
    experience: "Varsity Starter",
    status: "Active",
    email: "charlette.d@my.yorku.ca",
    emails: ["charlette.d@my.yorku.ca"],
    joinedAt: "2026-08-15T00:00:00Z",
  },
  {
    id: "p_york_21",
    teamId: "york_lions",
    playerName: "Cameron Sears",
    number: "21",
    position: "WR",
    positions: ["WR", "ATH"],
    experience: "Varsity Starter",
    status: "Active",
    email: "cameron.sears@my.yorku.ca",
    emails: ["cameron.sears@my.yorku.ca"],
    joinedAt: "2026-08-15T00:00:00Z",
  },
  {
    id: "p_york_17",
    teamId: "york_lions",
    playerName: "Tehya Castro",
    number: "17",
    position: "WR",
    positions: ["WR"],
    experience: "Varsity Starter",
    status: "Active",
    email: "tehya.castro@my.yorku.ca",
    emails: ["tehya.castro@my.yorku.ca"],
    joinedAt: "2026-08-15T00:00:00Z",
  },
  {
    id: "p_york_24",
    teamId: "york_lions",
    playerName: "Alexa Tomines-Rivera",
    number: "24",
    position: "WR",
    positions: ["WR", "RB"],
    experience: "Varsity Starter",
    status: "Active",
    email: "alexa.tr@my.yorku.ca",
    emails: ["alexa.tr@my.yorku.ca"],
    joinedAt: "2026-08-15T00:00:00Z",
  },
  {
    id: "p_york_55",
    teamId: "york_lions",
    playerName: "Jordyn Pemberton",
    number: "55",
    position: "C",
    positions: ["C", "WR"],
    experience: "Varsity Starter",
    status: "Active",
    email: "jordyn.p@my.yorku.ca",
    emails: ["jordyn.p@my.yorku.ca"],
    joinedAt: "2026-08-15T00:00:00Z",
  },
  {
    id: "p_york_3",
    teamId: "york_lions",
    playerName: "Isabelle Verstraten",
    number: "3",
    position: "DB",
    positions: ["DB"],
    experience: "Varsity Starter",
    status: "Active",
    email: "isabelle.v@my.yorku.ca",
    emails: ["isabelle.v@my.yorku.ca"],
    joinedAt: "2026-08-15T00:00:00Z",
  },
  {
    id: "p_york_11",
    teamId: "york_lions",
    playerName: "Isabella Achoneftos",
    number: "11",
    position: "DB",
    positions: ["DB"],
    experience: "Varsity Starter",
    status: "Active",
    email: "isabella.a@my.yorku.ca",
    emails: ["isabella.a@my.yorku.ca"],
    joinedAt: "2026-08-15T00:00:00Z",
  },
  {
    id: "p_york_18",
    teamId: "york_lions",
    playerName: "Emilie Eslamian",
    number: "18",
    position: "DB",
    positions: ["DB"],
    experience: "Varsity Starter",
    status: "Active",
    email: "emilie.e@my.yorku.ca",
    emails: ["emilie.e@my.yorku.ca"],
    joinedAt: "2026-08-15T00:00:00Z",
  },
  {
    id: "p_york_8",
    teamId: "york_lions",
    playerName: "Alexxandria Olivier",
    number: "8",
    position: "DB",
    positions: ["DB"],
    experience: "Varsity Starter",
    status: "Active",
    email: "alexxandria.o@my.yorku.ca",
    emails: ["alexxandria.o@my.yorku.ca"],
    joinedAt: "2026-08-15T00:00:00Z",
  },
  {
    id: "p_york_99",
    teamId: "york_lions",
    playerName: "Shavannah Walker",
    number: "99",
    position: "RUSH",
    positions: ["RUSH", "LB"],
    experience: "Varsity Starter",
    status: "Active",
    email: "shavannah.w@my.yorku.ca",
    emails: ["shavannah.w@my.yorku.ca"],
    joinedAt: "2026-08-15T00:00:00Z",
  },
  {
    id: "p_york_23",
    teamId: "york_lions",
    playerName: "Emma Giangrosso",
    number: "23",
    position: "DB",
    positions: ["DB", "LB"],
    experience: "Varsity Starter",
    status: "Active",
    email: "emma.g@my.yorku.ca",
    emails: ["emma.g@my.yorku.ca"],
    joinedAt: "2026-08-15T00:00:00Z",
  },
  {
    id: "p_york_44",
    teamId: "york_lions",
    playerName: "Malika Babur",
    number: "44",
    position: "DB",
    positions: ["DB"],
    experience: "Varsity Starter",
    status: "Active",
    email: "malika.b@my.yorku.ca",
    emails: ["malika.b@my.yorku.ca"],
    joinedAt: "2026-08-15T00:00:00Z",
  },
  {
    id: "p_york_52",
    teamId: "york_lions",
    playerName: "Giovanna Scountrianos",
    number: "52",
    position: "RUSH",
    positions: ["RUSH", "LB"],
    experience: "Varsity Starter",
    status: "Active",
    email: "giovanna.s@my.yorku.ca",
    emails: ["giovanna.s@my.yorku.ca"],
    joinedAt: "2026-08-15T00:00:00Z",
  },
  {
    id: "p_york_catherine_chase",
    teamId: "york_lions",
    playerName: "Catherine Chase",
    position: "ATH",
    positions: ["ATH"],
    experience: "Tournament Reserve",
    status: "Reserve",
    email: "catherine.chase@my.yorku.ca",
    emails: ["catherine.chase@my.yorku.ca"],
    joinedAt: "2026-08-15T00:00:00Z",
  },
  {
    id: "p_york_ciara_bagby_sue",
    teamId: "york_lions",
    playerName: "Ciara Bagby-Sue",
    position: "ATH",
    positions: ["ATH"],
    experience: "Tournament Reserve",
    status: "Reserve",
    email: "ciara.bagbysue@my.yorku.ca",
    emails: ["ciara.bagbysue@my.yorku.ca"],
    joinedAt: "2026-08-15T00:00:00Z",
  },
  {
    id: "p_york_ciara_williams",
    teamId: "york_lions",
    playerName: "Ciara Williams",
    position: "ATH",
    positions: ["ATH"],
    experience: "Tournament Reserve",
    status: "Reserve",
    email: "ciara.williams@my.yorku.ca",
    emails: ["ciara.williams@my.yorku.ca"],
    joinedAt: "2026-08-15T00:00:00Z",
  },
  {
    id: "p_york_melina_bosco",
    teamId: "york_lions",
    playerName: "Melina Bosco",
    position: "ATH",
    positions: ["ATH"],
    experience: "Tournament Reserve",
    status: "Reserve",
    email: "melina.bosco@my.yorku.ca",
    emails: ["melina.bosco@my.yorku.ca"],
    joinedAt: "2026-08-15T00:00:00Z",
  },
  {
    id: "p_york_nicole_stylianou",
    teamId: "york_lions",
    playerName: "Nicole Stylianou",
    position: "ATH",
    positions: ["ATH"],
    experience: "Tournament Reserve",
    status: "Reserve",
    email: "nicole.stylianou@my.yorku.ca",
    emails: ["nicole.stylianou@my.yorku.ca"],
    joinedAt: "2026-08-15T00:00:00Z",
  },
];

const teamDataHeader = `import { DemoTeam, DemoPlayer, DemoMatch, DemoPlay } from "./demoSeedData";
import { Playbook, DEFAULT_LOS_Y, createDefaultPlaybooks, applyFormationToSquad, ensureSquadMatchup } from "./playbookTypes";

import { YORK_TEAM_ID, YORK_ADMIN_EMAILS } from "./yorkStaff";
export { YORK_TEAM_ID, YORK_TEAM_ALIASES, YORK_ADMIN_EMAILS, isYorkTeam } from "./yorkStaff";

export const YORK_LIONS_TEAM: DemoTeam & Record<string, any> = {
  id: YORK_TEAM_ID,
  name: "York Lions Women's Flag Football",
  shortcode: "YORK",
  color: "#E31837",
  primaryColor: "#E31837", // York Red
  secondaryColor: "#FFFFFF", // White
  tertiaryColor: "#000000", // Black
  icon: "cat", // Lion
  logoUrl: "",
  coachName: "Dexter Sargent",
  coachRole: "Head Coach",
  assistantCoach: "Theo Brown",
  assistantCoachRole: "Defensive Coordinator",
  defensiveCoordinator: "Theo Brown",
  defensiveCoordinatorRole: "Defensive Coordinator",
  offensiveCoordinator: "Justin Fawcett",
  offensiveCoordinatorRole: "Offensive Coordinator",
  coachEmail: "dextersargent@gmail.com",
  adminEmails: YORK_ADMIN_EMAILS,
  isStandalone: true,
  isFounderTeam: true,
  isComplimentary: true,
  createdAt: "2026-08-01T00:00:00.000Z",
  subscription: {
    status: "active",
    plan: "team_pro",
    planName: "Pro Team Subscription",
    tier: "Founder Varsity Club",
    isComplimentary: true,
    isFounderTeam: true,
    isStandalone: true,
    monthlyFee: 0,
    playbookLimit: 5,
    billingCycle: "Complimentary Lifetime (Founder Club)",
    renewsAt: "Lifetime",
    features: [
      "Dedicated Team Portal & Roster Hub",
      "Up to 5 Custom Playbooks with Visual Route Designer",
      "Pre-Snap Motion & Play Simulation Animations",
      "Printable Wristband & Armband Inserts (8, 12, 16 plays)",
      "Dynamic Play-by-Play Wizard (Clockless & Synchronous)",
      "Public Live Game Box Scores & Down-by-Down Logs",
      "Career Stat Tracking & Multi-Season Player Résumés",
      "Autonomy for Tournaments & Non-League Exhibition Scrimmages",
    ],
  },
};
`;

const playbooksBlock = `
export function getYorkLionsPlaybooks(): Playbook[] {
  const baseBooks = createDefaultPlaybooks(YORK_TEAM_ID);

  const offenseBook: Playbook = {
    ...baseBooks[0],
    id: \`pb-off-\${YORK_TEAM_ID}\`,
    teamId: YORK_TEAM_ID,
    title: "Lions Red & White Spread Offense",
    description: "Official York Lions 5v5 playbook designed for rapid rhythm passing, pre-snap jet motions, and red-zone option packages.",
    plays: [
      {
        id: "play-york-jet-motion-1",
        teamId: YORK_TEAM_ID,
        name: "Lion Jet Sweep Motion",
        formation: "Spread 2x2",
        type: "offense",
        situation: "Standard",
        losY: DEFAULT_LOS_Y,
        notes: "Z goes in pre-snap motion across formation. Quick flip or deep post read.",
        players: [
          { id: "qb", label: "QB", role: "Quarterback", x: 50, y: DEFAULT_LOS_Y + 7, side: "offense", notes: "Catch snap, read flat to post" },
          { id: "c", label: "C", role: "Center", x: 50, y: DEFAULT_LOS_Y, side: "offense", quickRouteName: "Block", route: [{ x: 50, y: DEFAULT_LOS_Y - 4 }], notes: "Snap & short release" },
          { id: "x", label: "X", role: "Receiver Left", x: 20, y: DEFAULT_LOS_Y, side: "offense", quickRouteName: "Post", route: [{ x: 20, y: DEFAULT_LOS_Y - 14 }, { x: 45, y: DEFAULT_LOS_Y - 26 }], notes: "Deep Post (Primary Target)" },
          { id: "z", label: "Z", role: "Receiver Right (Slot)", x: 80, y: DEFAULT_LOS_Y, side: "offense", routeType: "motion", quickRouteName: "Jet Motion", route: [{ x: 52, y: DEFAULT_LOS_Y + 6 }, { x: 15, y: DEFAULT_LOS_Y + 2 }], notes: "Jet Motion Cross" },
          { id: "y", label: "Y", role: "Receiver Slot", x: 68, y: DEFAULT_LOS_Y, side: "offense", quickRouteName: "Dig", route: [{ x: 68, y: DEFAULT_LOS_Y - 10 }, { x: 42, y: DEFAULT_LOS_Y - 10 }], notes: "10-Yd Dig" },
          { id: "rush", label: "RUSH", role: "Pass Rusher (7 yds back)", x: 50, y: DEFAULT_LOS_Y - 12.25, side: "defense", coverageType: "rush", routeType: "rush", notes: "Rush QB" },
          { id: "cb1", label: "CB1", role: "Cornerback Left", x: 20, y: DEFAULT_LOS_Y - 7, side: "defense", coverageType: "zone", notes: "Deep 1/3" },
          { id: "cb2", label: "CB2", role: "Cornerback Right", x: 80, y: DEFAULT_LOS_Y - 7, side: "defense", coverageType: "zone", notes: "Deep 1/3" },
          { id: "fs", label: "FS", role: "Free Safety", x: 50, y: DEFAULT_LOS_Y - 18, side: "defense", coverageType: "zone", notes: "Middle 1/3" },
          { id: "lb", label: "LB", role: "Linebacker", x: 50, y: DEFAULT_LOS_Y - 5, side: "defense", coverageType: "zone", notes: "Under Hook" },
        ],
        createdAt: "2026-08-01T00:00:00Z",
        updatedAt: "2026-08-01T00:00:00Z",
      },
      ...baseBooks[0].plays,
    ],
  };

  const defenseBook: Playbook = {
    ...baseBooks[1],
    id: \`pb-def-\${YORK_TEAM_ID}\`,
    teamId: YORK_TEAM_ID,
    title: "Lions Red & White Lockdown Defense",
    description: "Official York Lions 5v5 defensive playbook. Coached by DC Dexter Sargent, featuring aggressive 1-man press, 2-deep match zone, and timed rusher blitzes.",
  };

  return [offenseBook, defenseBook];
}

export function getYorkTeamData(): DemoTeam & Record<string, any> {
  return YORK_LIONS_TEAM;
}

export function getYorkTeamPlayers(): DemoPlayer[] {
  return YORK_LIONS_PLAYERS;
}

export function getYorkTeamMatches(): DemoMatch[] {
  return YORK_LIONS_MATCHES;
}

export function getYorkTeamPlays(): DemoPlay[] {
  return YORK_LIONS_PLAYS;
}
`;

const fileContent = `${teamDataHeader}
export const YORK_LIONS_PLAYERS: DemoPlayer[] = ${JSON.stringify(players, null, 2)};

export const YORK_LIONS_RESERVE_PLAYERS: DemoPlayer[] = YORK_LIONS_PLAYERS.filter(
  (p) => p.status === "Reserve"
);

export const YORK_LIONS_ACTIVE_PLAYERS: DemoPlayer[] = YORK_LIONS_PLAYERS.filter(
  (p) => p.status !== "Reserve"
);

export const YORK_LIONS_MATCHES: DemoMatch[] = ${JSON.stringify(matches, null, 2)};

export const YORK_LIONS_PLAYS: DemoPlay[] = ${JSON.stringify(allPlays, null, 2)};

${playbooksBlock}
`;

fs.writeFileSync("src/lib/yorkTeamData.ts", fileContent);
console.log("src/lib/yorkTeamData.ts successfully written!");
