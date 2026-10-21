import { PlayDiagram, DEFAULT_LOS_Y } from "./playbookTypes";

const losY = DEFAULT_LOS_Y; // 65

/**
 * Standard Offensive Concepts to populate into defensive plays for simulation
 */
export const STANDARD_OFFENSIVE_PRESETS: PlayDiagram[] = [
  {
    id: "opp-off-verts",
    teamId: "system",
    name: "Verticals",
    type: "offense",
    formation: "Spread 2x1",
    situation: "Standard",
    losY,
    players: [
      { id: "opp-qb", side: "offense", label: "QB", role: "Quarterback", x: 50, y: losY + 9 },
      { id: "opp-c", side: "offense", label: "C", role: "Center", x: 50, y: losY, route: [{ x: 50, y: losY - 14 }], quickRouteName: "Seam", routeType: "pass" },
      { id: "opp-wr1", side: "offense", label: "WR1", role: "Wide Receiver", x: 16, y: losY, route: [{ x: 16, y: 15 }], quickRouteName: "Go", routeType: "pass" },
      { id: "opp-slot", side: "offense", label: "SLOT", role: "Slot Receiver", x: 34, y: losY, route: [{ x: 34, y: losY - 18 }, { x: 22, y: 18 }], quickRouteName: "Corner", routeType: "pass" },
      { id: "opp-wr2", side: "offense", label: "WR2", role: "Wide Receiver", x: 84, y: losY, route: [{ x: 84, y: 15 }], quickRouteName: "Go", routeType: "pass" },
    ],
  },
  {
    id: "opp-off-mesh",
    teamId: "system",
    name: "Mesh Under",
    type: "offense",
    formation: "Spread 2x1",
    situation: "Standard",
    losY,
    players: [
      { id: "opp-qb", side: "offense", label: "QB", role: "Quarterback", x: 50, y: losY + 9 },
      { id: "opp-c", side: "offense", label: "C", role: "Center", x: 50, y: losY, route: [{ x: 50, y: losY - 9 }], quickRouteName: "Sit", routeType: "pass" },
      { id: "opp-wr1", side: "offense", label: "WR1", role: "Wide Receiver", x: 16, y: losY, route: [{ x: 16, y: losY - 8 }, { x: 82, y: losY - 8 }], quickRouteName: "Drag", routeType: "pass" },
      { id: "opp-slot", side: "offense", label: "SLOT", role: "Slot Receiver", x: 34, y: losY, route: [{ x: 34, y: losY - 18 }, { x: 14, y: losY - 18 }], quickRouteName: "Out", routeType: "pass" },
      { id: "opp-wr2", side: "offense", label: "WR2", role: "Wide Receiver", x: 84, y: losY, route: [{ x: 84, y: losY - 10 }, { x: 18, y: losY - 10 }], quickRouteName: "Drag", routeType: "pass" },
    ],
  },
  {
    id: "opp-off-flood",
    teamId: "system",
    name: "Trips Flood",
    type: "offense",
    formation: "Trips Right",
    situation: "3rd & Long",
    losY,
    players: [
      { id: "opp-qb", side: "offense", label: "QB", role: "Quarterback", x: 50, y: losY + 9 },
      { id: "opp-c", side: "offense", label: "C", role: "Center", x: 50, y: losY, route: [{ x: 50, y: losY - 8 }], quickRouteName: "Check", routeType: "pass" },
      { id: "opp-wr1", side: "offense", label: "WR1", role: "Wide Receiver", x: 16, y: losY, route: [{ x: 16, y: losY - 20 }, { x: 45, y: 18 }], quickRouteName: "Post", routeType: "pass" },
      { id: "opp-slot1", side: "offense", label: "SL1", role: "Slot Receiver", x: 68, y: losY, route: [{ x: 68, y: losY - 4 }, { x: 90, y: losY - 6 }], quickRouteName: "Flat", routeType: "pass" },
      { id: "opp-slot2", side: "offense", label: "SL2", role: "Slot Receiver", x: 78, y: losY, route: [{ x: 78, y: losY - 18 }, { x: 92, y: losY - 18 }], quickRouteName: "Out", routeType: "pass" },
      { id: "opp-wr2", side: "offense", label: "WR2", role: "Wide Receiver", x: 88, y: losY, route: [{ x: 88, y: 15 }], quickRouteName: "Clearout", routeType: "pass" },
    ],
  },
  {
    id: "opp-off-slants",
    teamId: "system",
    name: "Quick Slants",
    type: "offense",
    formation: "Spread 2x2",
    situation: "Standard",
    losY,
    players: [
      { id: "opp-qb", side: "offense", label: "QB", role: "Quarterback", x: 50, y: losY + 9 },
      { id: "opp-c", side: "offense", label: "C", role: "Center", x: 50, y: losY, route: [{ x: 50, y: losY - 7 }], quickRouteName: "Hook", routeType: "pass" },
      { id: "opp-wr1", side: "offense", label: "WR1", role: "Wide Receiver", x: 16, y: losY, route: [{ x: 16, y: losY - 6 }, { x: 38, y: losY - 16 }], quickRouteName: "Slant", routeType: "pass" },
      { id: "opp-slot", side: "offense", label: "SLOT", role: "Slot Receiver", x: 34, y: losY, route: [{ x: 34, y: losY - 5 }, { x: 18, y: losY - 10 }], quickRouteName: "Quick Out", routeType: "pass" },
      { id: "opp-wr2", side: "offense", label: "WR2", role: "Wide Receiver", x: 84, y: losY, route: [{ x: 84, y: losY - 6 }, { x: 62, y: losY - 16 }], quickRouteName: "Slant", routeType: "pass" },
    ],
  },
  {
    id: "opp-off-corner-strike",
    teamId: "system",
    name: "Bunch Corner Strike",
    type: "offense",
    formation: "Bunch Right",
    situation: "Red Zone",
    losY,
    players: [
      { id: "opp-qb", side: "offense", label: "QB", role: "Quarterback", x: 50, y: losY + 9 },
      { id: "opp-c", side: "offense", label: "C", role: "Center", x: 50, y: losY, route: [{ x: 45, y: losY - 10 }], quickRouteName: "Hook", routeType: "pass" },
      { id: "opp-wr1", side: "offense", label: "WR1", role: "Wide Receiver", x: 16, y: losY, route: [{ x: 16, y: losY - 16 }, { x: 42, y: losY - 16 }], quickRouteName: "Dig", routeType: "pass" },
      { id: "opp-point", side: "offense", label: "POINT", role: "Wide Receiver", x: 74, y: losY, route: [{ x: 74, y: losY - 16 }, { x: 92, y: losY - 26 }], quickRouteName: "Corner", routeType: "pass" },
      { id: "opp-flat", side: "offense", label: "FLAT", role: "Slot Receiver", x: 82, y: losY + 2, route: [{ x: 82, y: losY - 3 }, { x: 94, y: losY - 5 }], quickRouteName: "Flat", routeType: "pass" },
    ],
  },
];

/**
 * Standard Defensive Concepts to populate into offensive plays for simulation
 */
export const STANDARD_DEFENSIVE_PRESETS: PlayDiagram[] = [
  {
    id: "opp-def-cover2",
    teamId: "system",
    name: "Cover 2 Zone (2 Deep, 3 Under)",
    type: "defense",
    formation: "Cover 2",
    situation: "Standard",
    losY,
    zones: [
      { id: "z-c2-dl", name: "Deep Half Left", x: 30, y: losY - 28, rx: 18, ry: 10, color: "#3B82F6" },
      { id: "z-c2-dr", name: "Deep Half Right", x: 70, y: losY - 28, rx: 18, ry: 10, color: "#3B82F6" },
      { id: "z-c2-fl", name: "Left Flat", x: 18, y: losY - 8, rx: 12, ry: 7, color: "#10B981" },
      { id: "z-c2-mid", name: "Mid Hook", x: 50, y: losY - 10, rx: 14, ry: 8, color: "#F59E0B" },
      { id: "z-c2-fr", name: "Right Flat", x: 82, y: losY - 8, rx: 12, ry: 7, color: "#10B981" },
    ],
    players: [
      { id: "opp-rush", side: "defense", label: "R", role: "Pass Rusher", x: 42, y: losY - 12, routeType: "rush", coverageType: "rush", route: [{ x: 40, y: losY - 2 }, { x: 50, y: losY + 9 }] },
      { id: "opp-cb1", side: "defense", label: "CB1", role: "Cornerback", x: 18, y: losY - 5, coverageType: "zone", zoneId: "z-c2-fl", route: [{ x: 18, y: losY - 8 }] },
      { id: "opp-mlb", side: "defense", label: "MLB", role: "Middle Linebacker", x: 50, y: losY - 7, coverageType: "zone", zoneId: "z-c2-mid", route: [{ x: 50, y: losY - 10 }] },
      { id: "opp-cb2", side: "defense", label: "CB2", role: "Cornerback", x: 82, y: losY - 5, coverageType: "zone", zoneId: "z-c2-fr", route: [{ x: 82, y: losY - 8 }] },
      { id: "opp-fs", side: "defense", label: "FS", role: "Free Safety", x: 30, y: losY - 18, coverageType: "zone", zoneId: "z-c2-dl", route: [{ x: 30, y: losY - 28 }] },
      { id: "opp-ss", side: "defense", label: "SS", role: "Strong Safety", x: 70, y: losY - 18, coverageType: "zone", zoneId: "z-c2-dr", route: [{ x: 70, y: losY - 28 }] },
    ],
  },
  {
    id: "opp-def-cover1",
    teamId: "system",
    name: "Cover 1 Man (1 Deep, Man Lock)",
    type: "defense",
    formation: "Cover 1",
    situation: "3rd & Short",
    losY,
    zones: [
      { id: "z-c1-deep", name: "Deep Middle 1/3", x: 50, y: losY - 30, rx: 24, ry: 12, color: "#3B82F6" },
    ],
    players: [
      { id: "opp-rush", side: "defense", label: "R", role: "Pass Rusher", x: 40, y: losY - 12, routeType: "rush", coverageType: "rush", route: [{ x: 42, y: losY - 2 }, { x: 50, y: losY + 9 }] },
      { id: "opp-cb1", side: "defense", label: "CB1", role: "Cornerback", x: 16, y: losY - 6, coverageType: "man", quickRouteName: "Man" },
      { id: "opp-nick", side: "defense", label: "NCB", role: "Nickelback", x: 34, y: losY - 6, coverageType: "man", quickRouteName: "Man" },
      { id: "opp-cb2", side: "defense", label: "CB2", role: "Cornerback", x: 84, y: losY - 6, coverageType: "man", quickRouteName: "Man" },
      { id: "opp-fs", side: "defense", label: "FS", role: "Free Safety", x: 50, y: losY - 20, coverageType: "zone", zoneId: "z-c1-deep", route: [{ x: 50, y: losY - 30 }] },
    ],
  },
  {
    id: "opp-def-cover3",
    teamId: "system",
    name: "Cover 3 Cloud (3 Deep, 2 Under)",
    type: "defense",
    formation: "Cover 3",
    situation: "3rd & Long",
    losY,
    zones: [
      { id: "z-c3-dl", name: "Deep Left 1/3", x: 22, y: losY - 30, rx: 15, ry: 12, color: "#3B82F6" },
      { id: "z-c3-dm", name: "Deep Mid 1/3", x: 50, y: losY - 32, rx: 16, ry: 12, color: "#3B82F6" },
      { id: "z-c3-dr", name: "Deep Right 1/3", x: 78, y: losY - 30, rx: 15, ry: 12, color: "#3B82F6" },
      { id: "z-c3-ul", name: "Under Hook Left", x: 34, y: losY - 10, rx: 14, ry: 8, color: "#F59E0B" },
      { id: "z-c3-ur", name: "Under Hook Right", x: 66, y: losY - 10, rx: 14, ry: 8, color: "#F59E0B" },
    ],
    players: [
      { id: "opp-rush", side: "defense", label: "R", role: "Pass Rusher", x: 50, y: losY - 12, routeType: "rush", coverageType: "rush", route: [{ x: 50, y: losY + 9 }] },
      { id: "opp-cb1", side: "defense", label: "CB1", role: "Cornerback", x: 18, y: losY - 8, coverageType: "zone", zoneId: "z-c3-dl", route: [{ x: 22, y: losY - 30 }] },
      { id: "opp-mlb1", side: "defense", label: "LB1", role: "Linebacker", x: 34, y: losY - 6, coverageType: "zone", zoneId: "z-c3-ul", route: [{ x: 34, y: losY - 10 }] },
      { id: "opp-mlb2", side: "defense", label: "LB2", role: "Linebacker", x: 66, y: losY - 6, coverageType: "zone", zoneId: "z-c3-ur", route: [{ x: 66, y: losY - 10 }] },
      { id: "opp-cb2", side: "defense", label: "CB2", role: "Cornerback", x: 82, y: losY - 8, coverageType: "zone", zoneId: "z-c3-dr", route: [{ x: 78, y: losY - 30 }] },
      { id: "opp-fs", side: "defense", label: "FS", role: "Free Safety", x: 50, y: losY - 18, coverageType: "zone", zoneId: "z-c3-dm", route: [{ x: 50, y: losY - 32 }] },
    ],
  },
  {
    id: "opp-def-blitz",
    teamId: "system",
    name: "All-Out Overload Blitz",
    type: "defense",
    formation: "Blitz",
    situation: "Goal Line",
    losY,
    players: [
      { id: "opp-r1", side: "defense", label: "R1", role: "Pass Rusher", x: 38, y: losY - 12, routeType: "rush", coverageType: "rush", route: [{ x: 42, y: losY - 2 }, { x: 50, y: losY + 9 }] },
      { id: "opp-r2", side: "defense", label: "R2", role: "Pass Rusher", x: 62, y: losY - 12, routeType: "rush", coverageType: "rush", route: [{ x: 58, y: losY - 2 }, { x: 50, y: losY + 9 }] },
      { id: "opp-cb1", side: "defense", label: "CB1", role: "Cornerback", x: 16, y: losY - 4, coverageType: "man", quickRouteName: "Press Man" },
      { id: "opp-mlb", side: "defense", label: "MLB", role: "Linebacker", x: 50, y: losY - 5, coverageType: "man", quickRouteName: "Man" },
      { id: "opp-cb2", side: "defense", label: "CB2", role: "Cornerback", x: 84, y: losY - 4, coverageType: "man", quickRouteName: "Press Man" },
    ],
  },
];
