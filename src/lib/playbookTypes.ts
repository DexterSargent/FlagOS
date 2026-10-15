export type PlaySide = "offense" | "defense";

export type RouteType = "pass" | "motion" | "rush" | "block";

export type DefensiveCoverageType = "man" | "zone" | "rush" | "spy";

export interface RoutePoint {
  x: number; // percentage across field (0 - 100)
  y: number; // percentage down field (0 - 100, smaller y = further downfield towards endzone)
}

export interface ZoneBubble {
  id: string;
  name: string; // e.g. "Deep 1/3", "Flat", "Hook/Curl", "Deep 1/2", "Under", "Spy"
  x: number; // center x (0 - 100)
  y: number; // center y (0 - 100)
  rx: number; // horizontal radius in %
  ry: number; // vertical radius in %
  color: string;
}

export interface StandardZoneTemplate {
  id: string;
  name: string;
  shortName: string;
  category: "Deep Zones" | "Underneath & Hook" | "Flats & Short";
  color: string;
  relY: number; // percentage downfield relative to losY (negative = downfield into defensive backfield)
  x: number;
  rx: number;
  ry: number;
  description: string;
}

export const STANDARD_DEFENSIVE_ZONES: StandardZoneTemplate[] = [
  // Deep Coverage
  {
    id: "deep-half-l",
    name: "Deep Half (Left)",
    shortName: "Deep Half (L)",
    category: "Deep Zones",
    color: "#3B82F6",
    relY: -26,
    x: 28,
    rx: 24,
    ry: 13,
    description: "Deep 1/2 zone covering the left sideline & hash",
  },
  {
    id: "deep-half-r",
    name: "Deep Half (Right)",
    shortName: "Deep Half (R)",
    category: "Deep Zones",
    color: "#3B82F6",
    relY: -26,
    x: 72,
    rx: 24,
    ry: 13,
    description: "Deep 1/2 zone covering the right sideline & hash",
  },
  {
    id: "deep-third-m",
    name: "Deep 1/3 (Middle)",
    shortName: "Deep 1/3 (Mid)",
    category: "Deep Zones",
    color: "#8B5CF6",
    relY: -26,
    x: 50,
    rx: 18,
    ry: 13,
    description: "Cover 3 middle third post & seam defender",
  },
  {
    id: "deep-third-l",
    name: "Deep 1/3 (Left)",
    shortName: "Deep 1/3 (L)",
    category: "Deep Zones",
    color: "#8B5CF6",
    relY: -26,
    x: 20,
    rx: 16,
    ry: 13,
    description: "Cover 3 left sideline deep third defender",
  },
  {
    id: "deep-third-r",
    name: "Deep 1/3 (Right)",
    shortName: "Deep 1/3 (R)",
    category: "Deep Zones",
    color: "#8B5CF6",
    relY: -26,
    x: 80,
    rx: 16,
    ry: 13,
    description: "Cover 3 right sideline deep third defender",
  },
  // Underneath & Hook
  {
    id: "middle-hook",
    name: "Middle Hook",
    shortName: "Middle Hook",
    category: "Underneath & Hook",
    color: "#EC4899",
    relY: -13,
    x: 50,
    rx: 18,
    ry: 9,
    description: "Low hole / middle hook guarding crosses & checkdowns",
  },
  {
    id: "hook-curl-l",
    name: "Hook / Curl (Left)",
    shortName: "Hook / Curl (L)",
    category: "Underneath & Hook",
    color: "#F59E0B",
    relY: -13,
    x: 32,
    rx: 15,
    ry: 9,
    description: "Underneath intermediate hook/curl to the left hash",
  },
  {
    id: "hook-curl-r",
    name: "Hook / Curl (Right)",
    shortName: "Hook / Curl (R)",
    category: "Underneath & Hook",
    color: "#F59E0B",
    relY: -13,
    x: 68,
    rx: 15,
    ry: 9,
    description: "Underneath intermediate hook/curl to the right hash",
  },
  // Flats & Short
  {
    id: "flat-l",
    name: "Flat (Left)",
    shortName: "Flat (L)",
    category: "Flats & Short",
    color: "#10B981",
    relY: -6,
    x: 18,
    rx: 16,
    ry: 7,
    description: "Hard flat / cloud coverage on the left boundary",
  },
  {
    id: "flat-r",
    name: "Flat (Right)",
    shortName: "Flat (R)",
    category: "Flats & Short",
    color: "#10B981",
    relY: -6,
    x: 82,
    rx: 16,
    ry: 7,
    description: "Hard flat / cloud coverage on the right boundary",
  },
  {
    id: "qb-spy",
    name: "QB Spy",
    shortName: "QB Spy",
    category: "Flats & Short",
    color: "#06B6D4",
    relY: -7,
    x: 50,
    rx: 14,
    ry: 7,
    description: "Shallow spy mirroring QB rollout & scramble threat",
  },
];

export interface PlayerNode {
  id: string;
  label: string; // "C", "QB", "X", "Y", "Z", "RB", "H" or "RUSH", "CB1", "CB2", "FS", "SS", "LB"
  role: string;  // descriptive role
  x: number; // starting field position % (0 - 100)
  y: number; // starting field position % (0 - 100)
  side: PlaySide;
  color?: string; // jersey color or highlight
  route?: RoutePoint[]; // path waypoints
  routeType?: RouteType;
  quickRouteName?: string; // "Slant", "Post", "Go", "Out", "Corner", "Curl", "Wheel", "Flat", "Drag"
  breakYards?: number; // amount of yards before first break
  routeDepth?: number; // total route depth in yards
  // Defensive Specific
  coverageType?: DefensiveCoverageType;
  manTargetId?: string; // id of offensive player to mirror / lock
  zoneId?: string; // id of zone to drop into
  notes?: string; // Coaching notes & assignment instructions for this specific position
}

export interface PlayDiagram {
  id: string;
  teamId: string;
  name: string;
  type: PlaySide;
  formation: string;
  situation: string; // "Standard", "Red Zone", "3rd & Long", "Extra Point", "2-Minute Drill"
  notes?: string;
  players: PlayerNode[];
  zones?: ZoneBubble[];
  losY: number; // Line of Scrimmage Y coordinate (default 65%)
  fieldPosition?: string; // e.g. "Opp 20", "Midfield", "Own 20"
  fieldYardLine?: number; // 1 to 50
  fieldSide?: "own" | "opp" | "midfield";
  createdAt?: string;
  updatedAt?: string;
}

export interface FormationAlignment {
  id: string;
  name: string; // e.g. "Spread 2x1", "Trips Right", "Cover 2 Zone"
  description?: string;
  side: PlaySide;
  players?: PlayerNode[];
}

export interface Playbook {
  id: string;
  teamId: string;
  title: string;
  type: PlaySide; // "offense" | "defense"
  playersOnField?: number; // e.g. 4, 5, 6, 7, 8 (defaults to league rules)
  description?: string;
  formations: FormationAlignment[];
  plays: PlayDiagram[];
  createdAt: string;
  updatedAt: string;
}

// A team can have up to 5 playbooks
export const MAX_PLAYBOOKS_PER_TEAM = 5;

// Gameday Situations for sorting & call sheets
export const GAMEDAY_SITUATIONS = [
  "Standard / 1st Down",
  "3rd & Short",
  "3rd & Long",
  "Red Zone",
  "Extra Point (1-pt / 2-pt)",
  "2-Minute Drill",
] as const;

// 5v5 Flag Football Standard Rules
export const FLAG_PLAYERS_PER_SIDE = 5;

// Line of Scrimmage default in percentage
export const DEFAULT_LOS_Y = 65;

// Authentic game spacing: 1 yard = 1.75% of canvas height (e.g. in 700px height: 12.25px per yard)
export const YARD_HEIGHT_PCT = 1.75;

// In standard 50-yard flag field, 7 yards back is ~12.25% on the vertical axis
export const RUSH_LINE_DISTANCE = 12.25;

/**
 * Snaps a vertical Y coordinate to the nearest yard line relative to the Line of Scrimmage (LOS).
 */
export function snapYToYard(y: number, losY = DEFAULT_LOS_Y, resolution = 1): number {
  const rawYards = (losY - y) / YARD_HEIGHT_PCT;
  const snappedYards = Math.round(rawYards / resolution) * resolution;
  return Math.round((losY - snappedYards * YARD_HEIGHT_PCT) * 100) / 100;
}

/**
 * Calculates the exact downfield yards from the Line of Scrimmage for a given Y coordinate.
 * Positive = downfield toward defense/endzone. Negative = backfield toward offensive QB.
 */
export function getYardsFromLos(y: number, losY = DEFAULT_LOS_Y): number {
  return Math.round(((losY - y) / YARD_HEIGHT_PCT) * 10) / 10;
}

/**
 * Converts downfield yards from the Line of Scrimmage into a vertical Y percentage coordinate.
 */
export function getYFromYards(yards: number, losY = DEFAULT_LOS_Y): number {
  return Math.round((losY - yards * YARD_HEIGHT_PCT) * 100) / 100;
}

export interface FieldPositionPreset {
  id: string;
  label: string;
  shortLabel: string;
  yardLine: number;
  side: "own" | "opp" | "midfield";
  description: string;
}

export const FIELD_POSITION_PRESETS: FieldPositionPreset[] = [
  { id: "own-5", label: "Own 5 (Backed Up)", shortLabel: "Own 5", yardLine: 5, side: "own", description: "Deep in own territory against the goal line" },
  { id: "own-20", label: "Own 20 (Standard Start)", shortLabel: "Own 20", yardLine: 20, side: "own", description: "Standard starting drive spot after touchback" },
  { id: "own-35", label: "Own 35", shortLabel: "Own 35", yardLine: 35, side: "own", description: "Approaching midfield" },
  { id: "midfield", label: "Midfield (50 Yd Line)", shortLabel: "50", yardLine: 50, side: "midfield", description: "Center of the field / 1st down to-gain line" },
  { id: "opp-30", label: "Opponent 30", shortLabel: "Opp 30", yardLine: 30, side: "opp", description: "Opponent territory" },
  { id: "opp-20", label: "Opponent 20 (Red Zone)", shortLabel: "Opp 20", yardLine: 20, side: "opp", description: "High red zone scoring territory" },
  { id: "opp-10", label: "Opponent 10 (Low Red Zone)", shortLabel: "Opp 10", yardLine: 10, side: "opp", description: "Inside the 10-yard line" },
  { id: "opp-5", label: "Opponent 5 (Goal Line)", shortLabel: "Opp 5", yardLine: 5, side: "opp", description: "Goal-to-go situation" },
  { id: "opp-2", label: "Opponent 2 (Extra Point / 2-Pt)", shortLabel: "Opp 2", yardLine: 2, side: "opp", description: "Point after attempt" },
];

export interface LegalPositionCheck {
  isLegal: boolean;
  warning?: string;
}

/**
 * Clamps coordinates during drag to strictly enforce Line of Scrimmage and 5v5 legal alignment.
 * Offense cannot move beyond LOS (y >= losY). Center is fixed on LOS (y = losY).
 * QB is set in backfield (y >= losY + 4).
 * Defense cannot cross LOS into offense (y <= losY - 1). Rusher is at least 7 yards back (y <= rushY).
 */
export function clampLegalPosition(
  player: PlayerNode,
  targetCoords: { x: number; y: number },
  losY = DEFAULT_LOS_Y
): { x: number; y: number } {
  const rushLineY = losY - RUSH_LINE_DISTANCE;
  // Field sidelines: keep players inside the field bounds [4, 96]
  const clampedX = Math.max(4, Math.min(96, Math.round(targetCoords.x * 10) / 10));
  let clampedY = Math.round(targetCoords.y * 10) / 10;

  if (player.side === "offense") {
    if (player.label === "C") {
      // Center snaps from the ball and cannot move off the Line of Scrimmage vertically
      clampedY = losY;
    } else if (player.label === "QB") {
      // QB must be in the backfield (at least 4% behind scrimmage)
      clampedY = Math.max(losY + 4, Math.min(94, clampedY));
    } else {
      // Receivers and runners can align on or behind LOS, but NEVER beyond it
      clampedY = Math.max(losY, Math.min(94, clampedY));
    }
  } else {
    if (player.label.toUpperCase().includes("RUSH") || player.coverageType === "rush") {
      // Pass Rusher must be at least 7 yards behind LOS (marked by yellow rush cone)
      clampedY = Math.max(12, Math.min(rushLineY, clampedY));
    } else {
      // Defenders must stay on defensive side of the Line of Scrimmage
      clampedY = Math.max(12, Math.min(losY - 1, clampedY));
    }
  }

  return { x: clampedX, y: clampedY };
}

/**
 * Validates legal flag football alignment
 * Scrimmage line is at losY (typically 65%).
 * Smaller Y = downfield (towards defense endzone).
 * Larger Y = backfield (towards offense).
 */
export function checkLegalPosition(player: PlayerNode, losY = DEFAULT_LOS_Y): LegalPositionCheck {
  const rushLineY = losY - RUSH_LINE_DISTANCE; // 7 yards on defensive side

  if (player.side === "offense") {
    // 1. Offense cannot be offsides (smaller Y than LOS means past the ball)
    if (player.y < losY - 0.5) {
      return {
        isLegal: false,
        warning: `${player.label} is offsides (past the Line of Scrimmage).`,
      };
    }

    // 2. Center must be right on the Line of Scrimmage
    if (player.label === "C" && Math.abs(player.y - losY) > 1) {
      return {
        isLegal: false,
        warning: "Center must be aligned on the Line of Scrimmage.",
      };
    }

    // 3. QB must be in the backfield behind Center
    if (player.label === "QB" && player.y < losY + 3.5) {
      return {
        isLegal: false,
        warning: "QB must be set in the backfield (shotgun/under center).",
      };
    }

    return { isLegal: true };
  } else {
    // Defense checks
    // 1. Defenders cannot be offsides (cannot cross LOS into offensive backfield)
    if (player.y > losY - 0.5) {
      return {
        isLegal: false,
        warning: `${player.label} is offsides across the Line of Scrimmage.`,
      };
    }

    // 2. Rusher must be at least 7 yards behind LOS at the snap
    if (player.label.toUpperCase().includes("RUSH") || player.coverageType === "rush") {
      if (player.y > rushLineY + 0.5) {
        return {
          isLegal: false,
          warning: `Pass Rusher must align at least 7 yards back of scrimmage (marked by dashed yellow rush line).`,
        };
      }
    }

    return { isLegal: true };
  }
}

export interface CustomRoutePreset {
  id: string;
  name: string;
  shortName: string;
  teamId: string;
  category?: string;
  offsets: Array<{ dx: number; dy: number }>;
  createdAt?: string;
}

export const MAX_CUSTOM_ROUTE_PRESETS_PER_TEAM = 20;

export function getTeamCustomRoutePresets(teamId: string): CustomRoutePreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`flagos_custom_routes_${teamId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Failed to load custom route presets:", e);
  }
  return [];
}

export function saveTeamCustomRoutePreset(teamId: string, preset: CustomRoutePreset): boolean {
  if (typeof window === "undefined") return false;
  try {
    const current = getTeamCustomRoutePresets(teamId);
    if (current.length >= MAX_CUSTOM_ROUTE_PRESETS_PER_TEAM) {
      return false;
    }
    const filtered = current.filter((p) => p.id !== preset.id && p.name.toLowerCase() !== preset.name.toLowerCase());
    const updated = [...filtered, preset].slice(0, MAX_CUSTOM_ROUTE_PRESETS_PER_TEAM);
    localStorage.setItem(`flagos_custom_routes_${teamId}`, JSON.stringify(updated));
    return true;
  } catch (e) {
    console.error("Failed to save custom route preset:", e);
    return false;
  }
}

export function deleteTeamCustomRoutePreset(teamId: string, presetId: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getTeamCustomRoutePresets(teamId);
    const updated = current.filter((p) => p.id !== presetId);
    localStorage.setItem(`flagos_custom_routes_${teamId}`, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to delete custom route preset:", e);
  }
}

export function applyCustomRoutePreset(
  preset: CustomRoutePreset,
  startX: number,
  startY: number
): RoutePoint[] {
  return preset.offsets.map((pt) => ({
    x: Math.max(4, Math.min(96, Math.round((startX + pt.dx) * 10) / 10)),
    y: Math.max(8, Math.min(94, Math.round((startY + pt.dy) * 10) / 10)),
  }));
}

export interface RoutePresetDefinition {
  name: string;
  shortName: string;
  category: "Quick & Short" | "Intermediate" | "Deep" | "Cross & Motion" | "Custom";
  defaultBreakYards: number;
  minBreakYards: number;
  maxBreakYards: number;
  description: string;
}

export const ROUTE_PRESETS_CATALOG: RoutePresetDefinition[] = [
  {
    name: "Slant",
    shortName: "Slant",
    category: "Quick & Short",
    defaultBreakYards: 4,
    minBreakYards: 2,
    maxBreakYards: 10,
    description: "Stems downfield then cuts 45° across the middle inside the hashes",
  },
  {
    name: "Out",
    shortName: "Out",
    category: "Quick & Short",
    defaultBreakYards: 5,
    minBreakYards: 3,
    maxBreakYards: 15,
    description: "Vertical stem followed by a flat 90° break directly to the boundary",
  },
  {
    name: "Dig / In",
    shortName: "Dig",
    category: "Intermediate",
    defaultBreakYards: 10,
    minBreakYards: 5,
    maxBreakYards: 18,
    description: "Intermediate square-in break 90° across the middle at 10-12 yards depth",
  },
  {
    name: "Post",
    shortName: "Post",
    category: "Deep",
    defaultBreakYards: 10,
    minBreakYards: 6,
    maxBreakYards: 18,
    description: "Deep vertical stem then breaks 45° toward the goal post / center field",
  },
  {
    name: "Corner",
    shortName: "Corner",
    category: "Deep",
    defaultBreakYards: 10,
    minBreakYards: 6,
    maxBreakYards: 18,
    description: "Deep vertical stem then breaks 45° toward the boundary pylon",
  },
  {
    name: "Go / Streak",
    shortName: "Go",
    category: "Deep",
    defaultBreakYards: 25,
    minBreakYards: 10,
    maxBreakYards: 35,
    description: "Vertical burner straight downfield testing deep coverage",
  },
  {
    name: "Curl / Hook",
    shortName: "Curl",
    category: "Intermediate",
    defaultBreakYards: 8,
    minBreakYards: 4,
    maxBreakYards: 14,
    description: "Hard stem downfield, plants outside foot and works 2 yards back toward QB",
  },
  {
    name: "Hitch",
    shortName: "Hitch",
    category: "Quick & Short",
    defaultBreakYards: 5,
    minBreakYards: 3,
    maxBreakYards: 8,
    description: "Quick 5-yard stem, stops on a dime and squares up toward the ball",
  },
  {
    name: "Comeback",
    shortName: "Comeback",
    category: "Intermediate",
    defaultBreakYards: 12,
    minBreakYards: 8,
    maxBreakYards: 18,
    description: "Sells vertical streak, then plants and cuts back 45° toward the sideline at 10 yards",
  },
  {
    name: "Drag / Cross",
    shortName: "Drag",
    category: "Cross & Motion",
    defaultBreakYards: 3,
    minBreakYards: 1,
    maxBreakYards: 7,
    description: "Underneath shallow crossing route running horizontally across the formation",
  },
  {
    name: "Flat",
    shortName: "Flat",
    category: "Quick & Short",
    defaultBreakYards: 2,
    minBreakYards: 1,
    maxBreakYards: 6,
    description: "Immediate quick release diagonally into the flat",
  },
  {
    name: "Wheel",
    shortName: "Wheel",
    category: "Cross & Motion",
    defaultBreakYards: 3,
    minBreakYards: 2,
    maxBreakYards: 8,
    description: "Releases toward the flat, then plants and turns straight up the sideline",
  },
  {
    name: "Whip / Pivot",
    shortName: "Whip",
    category: "Quick & Short",
    defaultBreakYards: 4,
    minBreakYards: 2,
    maxBreakYards: 8,
    description: "Fakes shallow cross inside, plants and whips back outside",
  },
  {
    name: "Fade",
    shortName: "Fade",
    category: "Deep",
    defaultBreakYards: 6,
    minBreakYards: 3,
    maxBreakYards: 14,
    description: "Outside release fading toward the back corner pylon in the end zone",
  },
  {
    name: "Block / Screen",
    shortName: "Screen",
    category: "Quick & Short",
    defaultBreakYards: 1,
    minBreakYards: 0,
    maxBreakYards: 3,
    description: "Sets up behind or at the scrimmage line for quick dump-off or lead block",
  },
  {
    name: "Jet Motion",
    shortName: "Jet Motion",
    category: "Cross & Motion",
    defaultBreakYards: 0,
    minBreakYards: 0,
    maxBreakYards: 4,
    description: "Pre-snap sprint across the backfield behind the quarterback before the snap",
  },
  {
    name: "Orbit Motion",
    shortName: "Orbit Motion",
    category: "Cross & Motion",
    defaultBreakYards: 4,
    minBreakYards: 2,
    maxBreakYards: 8,
    description: "Pre-snap arc looping deep behind the QB into the opposite flat or backfield",
  },
  {
    name: "Shift / Re-align",
    shortName: "Shift",
    category: "Cross & Motion",
    defaultBreakYards: 0,
    minBreakYards: 0,
    maxBreakYards: 3,
    description: "Pre-snap lateral shift across the alignment into bunch or stack formation",
  },
  {
    name: "Return Motion",
    shortName: "Return Motion",
    category: "Cross & Motion",
    defaultBreakYards: 1,
    minBreakYards: 0,
    maxBreakYards: 4,
    description: "Fakes pre-snap motion toward center, then plants and resets to original flank",
  },
];

/**
 * Route generator presets: calculates waypoints relative to a player's starting (x, y),
 * strictly snapping vertical breaks to integer yard lines.
 */
export function generateRoutePreset(
  routeName: string,
  startX: number,
  startY: number,
  losY = DEFAULT_LOS_Y,
  customBreakYards?: number
): RoutePoint[] {
  const isLeftSide = startX < 50;
  const match = ROUTE_PRESETS_CATALOG.find(
    (r) =>
      r.name.toLowerCase() === routeName.toLowerCase() ||
      r.shortName.toLowerCase() === routeName.toLowerCase() ||
      routeName.toLowerCase().startsWith(r.shortName.toLowerCase())
  );

  const breakYards = Math.max(
    0,
    customBreakYards !== undefined ? customBreakYards : match?.defaultBreakYards ?? 5
  );

  // Exact vertical stem Y snapped to yard line
  const breakY = snapYToYard(startY - breakYards * YARD_HEIGHT_PCT, losY);

  switch (match?.shortName || routeName) {
    case "Slant": {
      const cutDir = isLeftSide ? 14 : -14;
      const endY = snapYToYard(breakY - 6 * YARD_HEIGHT_PCT, losY);
      return [
        { x: startX, y: breakY },
        { x: Math.max(4, Math.min(96, startX + cutDir)), y: endY },
      ];
    }
    case "Out": {
      const outDir = isLeftSide ? -14 : 14;
      return [
        { x: startX, y: breakY },
        { x: Math.max(4, Math.min(96, startX + outDir)), y: breakY },
      ];
    }
    case "Dig":
    case "Dig / In": {
      const inDir = isLeftSide ? 18 : -18;
      return [
        { x: startX, y: breakY },
        { x: Math.max(4, Math.min(96, startX + inDir)), y: breakY },
      ];
    }
    case "Post": {
      const postCut = (50 - startX) * 0.7;
      const endY = snapYToYard(breakY - 12 * YARD_HEIGHT_PCT, losY);
      return [
        { x: startX, y: breakY },
        { x: Math.max(4, Math.min(96, startX + postCut)), y: endY },
      ];
    }
    case "Corner": {
      const cornerCut = isLeftSide ? -16 : 16;
      const endY = snapYToYard(breakY - 10 * YARD_HEIGHT_PCT, losY);
      return [
        { x: startX, y: breakY },
        { x: Math.max(4, Math.min(96, startX + cornerCut)), y: endY },
      ];
    }
    case "Go":
    case "Go / Streak": {
      return [{ x: startX, y: breakY }];
    }
    case "Curl":
    case "Curl / Hook": {
      const comebackY = snapYToYard(breakY + 2 * YARD_HEIGHT_PCT, losY);
      return [
        { x: startX, y: breakY },
        { x: startX + (isLeftSide ? 1.5 : -1.5), y: comebackY },
      ];
    }
    case "Hitch": {
      const hitchY = snapYToYard(breakY + 1 * YARD_HEIGHT_PCT, losY);
      return [
        { x: startX, y: breakY },
        { x: startX, y: hitchY },
      ];
    }
    case "Comeback": {
      const cutDir = isLeftSide ? -8 : 8;
      const comebackY = snapYToYard(breakY + 2 * YARD_HEIGHT_PCT, losY);
      return [
        { x: startX, y: breakY },
        { x: Math.max(4, Math.min(96, startX + cutDir)), y: comebackY },
      ];
    }
    case "Wheel": {
      const flatOut = isLeftSide ? -10 : 10;
      const verticalY = snapYToYard(breakY - 16 * YARD_HEIGHT_PCT, losY);
      return [
        { x: Math.max(4, Math.min(96, startX + flatOut)), y: breakY },
        { x: Math.max(4, Math.min(96, startX + flatOut)), y: verticalY },
      ];
    }
    case "Flat": {
      const flatDir = isLeftSide ? -14 : 14;
      return [
        { x: Math.max(4, Math.min(96, startX + flatDir)), y: breakY },
      ];
    }
    case "Drag":
    case "Drag / Cross": {
      const crossDir = isLeftSide ? 35 : -35;
      const crossEnd = snapYToYard(breakY - 1 * YARD_HEIGHT_PCT, losY);
      return [
        { x: startX, y: breakY },
        { x: Math.max(4, Math.min(96, startX + crossDir)), y: crossEnd },
      ];
    }
    case "Whip":
    case "Whip / Pivot": {
      const inFake = isLeftSide ? 6 : -6;
      const outWhip = isLeftSide ? -10 : 10;
      return [
        { x: startX + inFake, y: breakY },
        { x: Math.max(4, Math.min(96, startX + outWhip)), y: snapYToYard(breakY + 1 * YARD_HEIGHT_PCT, losY) },
      ];
    }
    case "Fade": {
      const fadeDir = isLeftSide ? -12 : 12;
      const endY = snapYToYard(breakY - 8 * YARD_HEIGHT_PCT, losY);
      return [
        { x: startX, y: breakY },
        { x: Math.max(4, Math.min(96, startX + fadeDir)), y: endY },
      ];
    }
    case "Screen":
    case "Block / Screen": {
      return [{ x: startX, y: breakY }];
    }
    case "Jet Motion": {
      const targetSideX = isLeftSide ? Math.max(76, 100 - startX) : Math.min(24, 100 - startX);
      const motionY = snapYToYard(losY + 2.5 * YARD_HEIGHT_PCT, losY);
      return [
        { x: 50, y: motionY },
        { x: targetSideX, y: motionY },
      ];
    }
    case "Orbit Motion": {
      const targetSideX = isLeftSide ? 78 : 22;
      const deepY = snapYToYard(losY + 5.5 * YARD_HEIGHT_PCT, losY);
      const exitY = snapYToYard(losY + 3.0 * YARD_HEIGHT_PCT, losY);
      return [
        { x: (startX + 50) / 2, y: deepY },
        { x: targetSideX, y: exitY },
      ];
    }
    case "Shift":
    case "Shift / Re-align": {
      const shiftX = isLeftSide ? Math.min(startX + 14, 45) : Math.max(startX - 14, 55);
      return [
        { x: shiftX, y: startY },
      ];
    }
    case "Return Motion": {
      const insideX = isLeftSide ? startX + 12 : startX - 12;
      return [
        { x: insideX, y: startY + 1 * YARD_HEIGHT_PCT },
        { x: startX, y: startY },
      ];
    }
    case "Motion":
    case "Pre-Snap Motion": {
      const targetSideX = isLeftSide ? Math.max(76, 100 - startX) : Math.min(24, 100 - startX);
      const motionY = snapYToYard(losY + 2.5 * YARD_HEIGHT_PCT, losY);
      return [
        { x: 50, y: motionY },
        { x: targetSideX, y: motionY },
      ];
    }
    default:
      return [{ x: startX, y: breakY }];
  }
}

export function generateRoutePresetDetails(
  routeName: string,
  startX: number,
  startY: number,
  losY = DEFAULT_LOS_Y,
  customBreakYards?: number
): { route: RoutePoint[]; breakYards: number } {
  const match = ROUTE_PRESETS_CATALOG.find(
    (r) =>
      r.name.toLowerCase() === routeName.toLowerCase() ||
      r.shortName.toLowerCase() === routeName.toLowerCase() ||
      routeName.toLowerCase().startsWith(r.shortName.toLowerCase())
  );
  const breakYards = Math.max(
    0,
    customBreakYards !== undefined ? customBreakYards : match?.defaultBreakYards ?? 5
  );
  const route = generateRoutePreset(routeName, startX, startY, losY, breakYards);
  return { route, breakYards };
}

// Standard Squad Offense Preset Lineup (Supports 4 to 8 players per side)
export const STANDARD_SQUAD_OFFENSE = (losY = DEFAULT_LOS_Y, count = 5): PlayerNode[] => {
  const target = Math.max(4, Math.min(8, count || 5));
  switch (target) {
    case 4:
      return [
        { id: "c", label: "C", role: "Center", x: 50, y: losY, side: "offense", route: [{ x: 50, y: losY - 6 }], quickRouteName: "Drag" },
        { id: "qb", label: "QB", role: "Quarterback", x: 50, y: losY + 9, side: "offense" },
        { id: "x", label: "X", role: "Receiver Left", x: 20, y: losY + 1, side: "offense", route: [{ x: 20, y: losY - 8 }, { x: 32, y: losY - 18 }], quickRouteName: "Slant" },
        { id: "z", label: "Z", role: "Receiver Right", x: 80, y: losY + 1, side: "offense", route: [{ x: 80, y: losY - 8 }, { x: 68, y: losY - 18 }], quickRouteName: "Slant" },
      ];
    case 6:
      return [
        { id: "c", label: "C", role: "Center", x: 50, y: losY, side: "offense", route: [{ x: 50, y: losY - 6 }, { x: 38, y: losY - 6 }], quickRouteName: "Drag / Cross" },
        { id: "qb", label: "QB", role: "Quarterback", x: 50, y: losY + 9, side: "offense" },
        { id: "x", label: "X", role: "Receiver Left", x: 16, y: losY + 1, side: "offense", route: [{ x: 16, y: losY - 8 }, { x: 28, y: losY - 18 }], quickRouteName: "Slant" },
        { id: "r", label: "R", role: "Slot Left", x: 34, y: losY + 2, side: "offense", route: [{ x: 22, y: losY - 1 }], quickRouteName: "Flat" },
        { id: "h", label: "H", role: "Slot Right", x: 66, y: losY + 2, side: "offense", route: [{ x: 78, y: losY - 1 }], quickRouteName: "Out" },
        { id: "z", label: "Z", role: "Receiver Right", x: 84, y: losY + 1, side: "offense", route: [{ x: 84, y: losY - 8 }, { x: 72, y: losY - 18 }], quickRouteName: "Post" },
      ];
    case 7:
      return [
        { id: "c", label: "C", role: "Center", x: 50, y: losY, side: "offense", route: [{ x: 50, y: losY - 6 }], quickRouteName: "Drag" },
        { id: "qb", label: "QB", role: "Quarterback", x: 50, y: losY + 9, side: "offense" },
        { id: "rb", label: "RB", role: "Running Back", x: 40, y: losY + 11, side: "offense", route: [{ x: 28, y: losY + 4 }, { x: 20, y: losY - 2 }], quickRouteName: "Wheel" },
        { id: "x", label: "X", role: "Wide Receiver Left", x: 15, y: losY + 1, side: "offense", route: [{ x: 15, y: losY - 8 }, { x: 26, y: losY - 18 }], quickRouteName: "Slant" },
        { id: "y", label: "Y", role: "Slot / Tight End", x: 30, y: losY + 1, side: "offense", route: [{ x: 30, y: losY - 10 }], quickRouteName: "Seam" },
        { id: "h", label: "H", role: "Slot Right", x: 70, y: losY + 1, side: "offense", route: [{ x: 70, y: losY - 10 }], quickRouteName: "Seam" },
        { id: "z", label: "Z", role: "Wide Receiver Right", x: 85, y: losY + 1, side: "offense", route: [{ x: 85, y: losY - 8 }, { x: 74, y: losY - 18 }], quickRouteName: "Post" },
      ];
    case 8:
      return [
        { id: "c", label: "C", role: "Center", x: 50, y: losY, side: "offense", route: [{ x: 50, y: losY - 6 }], quickRouteName: "Drag" },
        { id: "qb", label: "QB", role: "Quarterback", x: 50, y: losY + 9, side: "offense" },
        { id: "rb", label: "RB", role: "Running Back", x: 40, y: losY + 11, side: "offense", route: [{ x: 25, y: losY + 2 }], quickRouteName: "Swing" },
        { id: "fb", label: "FB", role: "Fullback / H-Back", x: 60, y: losY + 10, side: "offense", route: [{ x: 70, y: losY + 1 }], quickRouteName: "Flat" },
        { id: "x", label: "X", role: "Wide Receiver Left", x: 14, y: losY + 1, side: "offense", route: [{ x: 14, y: losY - 8 }, { x: 25, y: losY - 18 }], quickRouteName: "Slant" },
        { id: "y", label: "Y", role: "Tight End Left", x: 28, y: losY + 1, side: "offense", route: [{ x: 28, y: losY - 10 }], quickRouteName: "Seam" },
        { id: "h", label: "H", role: "Slot Right", x: 72, y: losY + 1, side: "offense", route: [{ x: 72, y: losY - 10 }], quickRouteName: "Seam" },
        { id: "z", label: "Z", role: "Wide Receiver Right", x: 86, y: losY + 1, side: "offense", route: [{ x: 86, y: losY - 8 }, { x: 75, y: losY - 18 }], quickRouteName: "Post" },
      ];
    case 5:
    default:
      return [
        { id: "c", label: "C", role: "Center", x: 50, y: losY, side: "offense", route: [{ x: 50, y: losY - 6 }, { x: 38, y: losY - 6 }], quickRouteName: "Drag / Cross" },
        { id: "qb", label: "QB", role: "Quarterback", x: 50, y: losY + 9, side: "offense" },
        { id: "x", label: "X", role: "Receiver Left", x: 18, y: losY + 1, side: "offense", route: [{ x: 18, y: losY - 8 }, { x: 30, y: losY - 18 }], quickRouteName: "Slant" },
        { id: "r", label: "R", role: "Slot / Running Back", x: 35, y: losY + 3, side: "offense", route: [{ x: 22, y: losY - 1 }], quickRouteName: "Flat" },
        { id: "z", label: "Z", role: "Receiver Right", x: 82, y: losY + 1, side: "offense", route: [{ x: 82, y: losY - 8 }, { x: 70, y: losY - 18 }], quickRouteName: "Slant" },
      ];
  }
};

export const STANDARD_5V5_OFFENSE = (losY = DEFAULT_LOS_Y): PlayerNode[] => STANDARD_SQUAD_OFFENSE(losY, 5);

// Standard Squad Defense Preset Lineup (Supports 4 to 8 players per side)
export const STANDARD_SQUAD_DEFENSE = (losY = DEFAULT_LOS_Y, count = 5): PlayerNode[] => {
  const target = Math.max(4, Math.min(8, count || 5));
  switch (target) {
    case 4:
      return [
        { id: "rush", label: "RUSH", role: "Pass Rusher (7 yds back)", x: 50, y: losY - 13, side: "defense", coverageType: "rush", route: [{ x: 50, y: losY + 9 }], routeType: "rush" },
        { id: "cb1", label: "CB1", role: "Cornerback Left", x: 20, y: losY - 5, side: "defense", coverageType: "zone", route: [{ x: 22, y: losY - 8 }] },
        { id: "cb2", label: "CB2", role: "Cornerback Right", x: 80, y: losY - 5, side: "defense", coverageType: "zone", route: [{ x: 78, y: losY - 8 }] },
        { id: "fs", label: "FS", role: "Free Safety", x: 50, y: losY - 18, side: "defense", coverageType: "zone", route: [{ x: 50, y: losY - 26 }] },
      ];
    case 6:
      return [
        { id: "rush", label: "RUSH", role: "Pass Rusher (7 yds back)", x: 50, y: losY - 13, side: "defense", coverageType: "rush", route: [{ x: 50, y: losY + 9 }], routeType: "rush" },
        { id: "cb1", label: "CB1", role: "Cornerback Left", x: 18, y: losY - 5, side: "defense", coverageType: "zone", route: [{ x: 20, y: losY - 8 }] },
        { id: "cb2", label: "CB2", role: "Cornerback Right", x: 82, y: losY - 5, side: "defense", coverageType: "zone", route: [{ x: 80, y: losY - 8 }] },
        { id: "mlb", label: "MLB", role: "Middle Linebacker", x: 50, y: losY - 6, side: "defense", coverageType: "zone", route: [{ x: 50, y: losY - 10 }] },
        { id: "fs", label: "FS", role: "Free Safety", x: 35, y: losY - 16, side: "defense", coverageType: "zone", route: [{ x: 35, y: losY - 26 }] },
        { id: "ss", label: "SS", role: "Strong Safety", x: 65, y: losY - 16, side: "defense", coverageType: "zone", route: [{ x: 65, y: losY - 26 }] },
      ];
    case 7:
      return [
        { id: "rush", label: "RUSH", role: "Pass Rusher (7 yds back)", x: 50, y: losY - 13, side: "defense", coverageType: "rush", route: [{ x: 50, y: losY + 9 }], routeType: "rush" },
        { id: "cb1", label: "CB1", role: "Cornerback Left", x: 16, y: losY - 5, side: "defense", coverageType: "zone", route: [{ x: 18, y: losY - 8 }] },
        { id: "cb2", label: "CB2", role: "Cornerback Right", x: 84, y: losY - 5, side: "defense", coverageType: "zone", route: [{ x: 82, y: losY - 8 }] },
        { id: "wlb", label: "WLB", role: "Will Linebacker", x: 34, y: losY - 6, side: "defense", coverageType: "zone", route: [{ x: 34, y: losY - 10 }] },
        { id: "mlb", label: "MLB", role: "Middle Linebacker", x: 50, y: losY - 7, side: "defense", coverageType: "zone", route: [{ x: 50, y: losY - 11 }] },
        { id: "slb", label: "SLB", role: "Sam Linebacker", x: 66, y: losY - 6, side: "defense", coverageType: "zone", route: [{ x: 66, y: losY - 10 }] },
        { id: "fs", label: "FS", role: "Free Safety", x: 50, y: losY - 18, side: "defense", coverageType: "zone", route: [{ x: 50, y: losY - 26 }] },
      ];
    case 8:
      return [
        { id: "rush", label: "RUSH", role: "Pass Rusher (7 yds back)", x: 50, y: losY - 13, side: "defense", coverageType: "rush", route: [{ x: 50, y: losY + 9 }], routeType: "rush" },
        { id: "cb1", label: "CB1", role: "Cornerback Left", x: 15, y: losY - 5, side: "defense", coverageType: "zone", route: [{ x: 17, y: losY - 8 }] },
        { id: "cb2", label: "CB2", role: "Cornerback Right", x: 85, y: losY - 5, side: "defense", coverageType: "zone", route: [{ x: 83, y: losY - 8 }] },
        { id: "wlb", label: "WLB", role: "Will Linebacker", x: 32, y: losY - 6, side: "defense", coverageType: "zone", route: [{ x: 32, y: losY - 10 }] },
        { id: "mlb", label: "MLB", role: "Middle Linebacker", x: 50, y: losY - 7, side: "defense", coverageType: "zone", route: [{ x: 50, y: losY - 11 }] },
        { id: "slb", label: "SLB", role: "Sam Linebacker", x: 68, y: losY - 6, side: "defense", coverageType: "zone", route: [{ x: 68, y: losY - 10 }] },
        { id: "fs", label: "FS", role: "Free Safety", x: 35, y: losY - 18, side: "defense", coverageType: "zone", route: [{ x: 35, y: losY - 26 }] },
        { id: "ss", label: "SS", role: "Strong Safety", x: 65, y: losY - 18, side: "defense", coverageType: "zone", route: [{ x: 65, y: losY - 26 }] },
      ];
    case 5:
    default:
      return [
        { id: "rush", label: "RUSH", role: "Pass Rusher (7 yds back)", x: 50, y: losY - 13, side: "defense", coverageType: "rush", route: [{ x: 50, y: losY + 9 }], routeType: "rush" },
        { id: "cb1", label: "CB1", role: "Cornerback Left", x: 18, y: losY - 5, side: "defense", coverageType: "zone", route: [{ x: 20, y: losY - 8 }] },
        { id: "cb2", label: "CB2", role: "Cornerback Right", x: 82, y: losY - 5, side: "defense", coverageType: "zone", route: [{ x: 80, y: losY - 8 }] },
        { id: "fs", label: "FS", role: "Free Safety", x: 35, y: losY - 16, side: "defense", coverageType: "zone", route: [{ x: 35, y: losY - 26 }] },
        { id: "ss", label: "SS", role: "Strong Safety", x: 65, y: losY - 16, side: "defense", coverageType: "zone", route: [{ x: 65, y: losY - 26 }] },
      ];
  }
};

export const STANDARD_5V5_DEFENSE = (losY = DEFAULT_LOS_Y): PlayerNode[] => STANDARD_SQUAD_DEFENSE(losY, 5);

// Standard 5v5 Flag Football Formation Presets
export const FLAG_5V5_FORMATIONS: Record<string, { label: string; role: string; x: number; y: number }[]> = {
  // Offense Formations (5 players)
  "Spread 2x1": [
    { label: "C", role: "Center", x: 50, y: 0 },
    { label: "QB", role: "Quarterback", x: 50, y: 9 },
    { label: "X", role: "Receiver Left", x: 18, y: 1 },
    { label: "R", role: "Slot / Running Back", x: 35, y: 3 },
    { label: "Z", role: "Receiver Right", x: 82, y: 1 },
  ],
  "Trips Right": [
    { label: "C", role: "Center", x: 50, y: 0 },
    { label: "QB", role: "Quarterback", x: 50, y: 9 },
    { label: "X", role: "Solo Receiver Left", x: 18, y: 1 },
    { label: "R", role: "Inside Slot Right", x: 68, y: 2 },
    { label: "Z", role: "Outside Receiver Right", x: 84, y: 1 },
  ],
  "Trips Left": [
    { label: "C", role: "Center", x: 50, y: 0 },
    { label: "QB", role: "Quarterback", x: 50, y: 9 },
    { label: "Z", role: "Solo Receiver Right", x: 82, y: 1 },
    { label: "R", role: "Inside Slot Left", x: 32, y: 2 },
    { label: "X", role: "Outside Receiver Left", x: 16, y: 1 },
  ],
  "Bunch Right": [
    { label: "C", role: "Center", x: 50, y: 0 },
    { label: "QB", role: "Quarterback", x: 50, y: 9 },
    { label: "X", role: "Split Left", x: 20, y: 1 },
    { label: "R", role: "Bunch Point", x: 68, y: 2 },
    { label: "Z", role: "Bunch Outside", x: 78, y: 3 },
  ],
  "Bunch Left": [
    { label: "C", role: "Center", x: 50, y: 0 },
    { label: "QB", role: "Quarterback", x: 50, y: 9 },
    { label: "Z", role: "Split Right", x: 80, y: 1 },
    { label: "R", role: "Bunch Point", x: 32, y: 2 },
    { label: "X", role: "Bunch Outside", x: 22, y: 3 },
  ],
  "Spread 2x2": [
    { label: "C", role: "Center", x: 50, y: 0 },
    { label: "QB", role: "Quarterback", x: 50, y: 9 },
    { label: "X", role: "Wide Receiver Left", x: 15, y: 1 },
    { label: "R", role: "Slot Left", x: 32, y: 1 },
    { label: "Z", role: "Wide Receiver Right", x: 85, y: 1 },
  ],
  // Defense Formations (5 players)
  "Cover 2 Zone": [
    { label: "RUSH", role: "Pass Rusher (7 yds back)", x: 50, y: -13 },
    { label: "CB1", role: "Cornerback Left (Flat)", x: 18, y: -5 },
    { label: "CB2", role: "Cornerback Right (Flat)", x: 82, y: -5 },
    { label: "FS", role: "Free Safety (Deep Left)", x: 34, y: -16 },
    { label: "SS", role: "Strong Safety (Deep Right)", x: 66, y: -16 },
  ],
  "Cover 1 Man Lock": [
    { label: "RUSH", role: "Pass Rusher (7 yds back)", x: 50, y: -13 },
    { label: "CB1", role: "Cornerback Left (Man Lock)", x: 18, y: -3 },
    { label: "CB2", role: "Cornerback Right (Man Lock)", x: 82, y: -3 },
    { label: "NB", role: "Nickel Corner (Man Lock)", x: 68, y: -3 },
    { label: "FS", role: "Centerfield Safety", x: 50, y: -20 },
  ],
  "Cover 3 Cloud": [
    { label: "RUSH", role: "Pass Rusher (7 yds back)", x: 50, y: -13 },
    { label: "CB1", role: "Cornerback Left (Deep 1/3)", x: 20, y: -8 },
    { label: "CB2", role: "Cornerback Right (Deep 1/3)", x: 80, y: -8 },
    { label: "FS", role: "Free Safety (Deep 1/3 Mid)", x: 50, y: -18 },
    { label: "MLB", role: "Middle Linebacker (Under)", x: 50, y: -6 },
  ],
  "Goal Line Tight": [
    { label: "RUSH", role: "Pass Rusher (7 yds back)", x: 50, y: -13 },
    { label: "CB1", role: "Cornerback Left", x: 20, y: -2 },
    { label: "CB2", role: "Cornerback Right", x: 80, y: -2 },
    { label: "NB", role: "Inside Bracket", x: 50, y: -2 },
    { label: "FS", role: "Goal Line Safety", x: 50, y: -10 },
  ],
};

/**
 * Ensures a play has a full balanced matchup on both sides of the ball matching the league rules.
 * Clamps coordinates to guarantee pre-snap legal line-of-scrimmage alignment.
 */
export function ensureSquadMatchup(players: PlayerNode[], losY = DEFAULT_LOS_Y, count = 5): PlayerNode[] {
  const targetCount = Math.max(4, Math.min(8, count || 5));
  let offense = (players || []).filter((p) => p.side === "offense");
  let defense = (players || []).filter((p) => p.side === "defense");

  // 1. Guarantee exactly targetCount offensive players
  const stdOffense = STANDARD_SQUAD_OFFENSE(losY, targetCount);
  if (offense.length === 0) {
    offense = stdOffense.map((p) => ({ ...p }));
  } else if (offense.length < targetCount) {
    for (const std of stdOffense) {
      if (offense.length >= targetCount) break;
      if (!offense.some((p) => p.label === std.label)) {
        offense.push({
          ...std,
          id: `off-${std.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        });
      }
    }
    const remainingLabels = ["X", "Z", "R", "H", "Y", "RB", "FB", "WR"];
    while (offense.length < targetCount) {
      const lbl = remainingLabels[offense.length] || `WR${offense.length}`;
      offense.push({
        id: `off-${Date.now()}-${offense.length}`,
        label: lbl,
        role: `Offensive ${lbl}`,
        x: Math.min(85, Math.max(15, 15 + offense.length * 11)),
        y: lbl === "C" ? losY : lbl === "QB" ? losY + 9 : losY + 2,
        side: "offense",
      });
    }
  } else if (offense.length > targetCount) {
    offense = offense.slice(0, targetCount);
  }

  // 2. Guarantee exactly targetCount defensive players
  const stdDefense = STANDARD_SQUAD_DEFENSE(losY, targetCount);
  if (defense.length === 0) {
    defense = stdDefense.map((p) => ({ ...p }));
  } else if (defense.length < targetCount) {
    for (const std of stdDefense) {
      if (defense.length >= targetCount) break;
      if (!defense.some((p) => p.label === std.label)) {
        defense.push({
          ...std,
          id: `def-${std.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        });
      }
    }
    const remainingLabels = ["RUSH", "CB1", "CB2", "FS", "SS", "MLB", "WLB", "SLB"];
    while (defense.length < targetCount) {
      const lbl = remainingLabels[defense.length] || `DB${defense.length}`;
      defense.push({
        id: `def-${Date.now()}-${defense.length}`,
        label: lbl,
        role: `Defensive ${lbl}`,
        x: Math.min(85, Math.max(15, 15 + defense.length * 11)),
        y: lbl === "RUSH" ? losY - 13 : losY - 6,
        side: "defense",
        coverageType: lbl === "RUSH" ? "rush" : "zone",
      });
    }
  } else if (defense.length > targetCount) {
    defense = defense.slice(0, targetCount);
  }

  // 3. Pre-snap boundary clamp on all players
  offense = offense.map((p) => {
    const clamped = clampLegalPosition(p, { x: p.x, y: p.y }, losY);
    return { ...p, x: clamped.x, y: clamped.y };
  });

  defense = defense.map((p) => {
    const clamped = clampLegalPosition(p, { x: p.x, y: p.y }, losY);
    return { ...p, x: clamped.x, y: clamped.y };
  });

  return [...offense, ...defense];
}

/**
 * Ensures a play always has a full 5v5 matchup (EXACTLY 5 offense and 5 defense) on both sides of the ball.
 * Maintained for backward compatibility.
 */
export function ensure5v5Matchup(players: PlayerNode[], losY = DEFAULT_LOS_Y): PlayerNode[] {
  return ensureSquadMatchup(players, losY, 5);
}

/**
 * Snaps players of the given side to a standard formation alignment.
 * Preserves the full squad count (4 to 8 players), positioning extra players
 * cleanly according to standard alignment presets.
 */
export function applyFormationToSquad(
  players: PlayerNode[],
  formationName: string,
  side: PlaySide,
  losY = DEFAULT_LOS_Y
): PlayerNode[] {
  const formationConfig = FLAG_5V5_FORMATIONS[formationName];
  if (!formationConfig) return players;

  const otherSidePlayers = players.filter((p) => p.side !== side);
  const targetPlayers = players.filter((p) => p.side === side);
  const squadCount = Math.max(4, Math.min(8, targetPlayers.length || 5));
  const fallbackLineup = side === "offense" ? STANDARD_SQUAD_OFFENSE(losY, squadCount) : STANDARD_SQUAD_DEFENSE(losY, squadCount);

  const updatedSide: PlayerNode[] = targetPlayers.map((player, idx) => {
    if (idx < formationConfig.length) {
      const spot = formationConfig[idx];
      const newY = losY + spot.y;
      const clamped = clampLegalPosition(
        { ...player, label: spot.label },
        { x: spot.x, y: newY },
        losY
      );
      return {
        ...player,
        label: spot.label,
        role: spot.role,
        x: clamped.x,
        y: clamped.y,
        route: [],
        quickRouteName: undefined,
      };
    } else {
      const fallbackSpot = fallbackLineup[idx] || player;
      const clamped = clampLegalPosition(
        { ...player, label: fallbackSpot.label || player.label },
        { x: fallbackSpot.x, y: fallbackSpot.y },
        losY
      );
      return {
        ...player,
        label: fallbackSpot.label || player.label,
        role: fallbackSpot.role || player.role,
        x: clamped.x,
        y: clamped.y,
        route: [],
        quickRouteName: undefined,
      };
    }
  });

  return side === "offense" ? [...updatedSide, ...otherSidePlayers] : [...otherSidePlayers, ...updatedSide];
}

/**
 * Pre-built template 5v5 flag football plays (Offensive & Defensive)
 * 5v5 ON BOTH SIDES OF THE BALL: 5 Offensive Players vs 5 Defensive Players on field simultaneously.
 */
export const DEFAULT_FLAG_PLAYS: PlayDiagram[] = [
  // 5v5 OFFENSE 1: Spread 2x1 - Quick Slants vs Cover 2
  {
    id: "offense-spread-slants",
    teamId: "default",
    name: "5v5 Spread - Quick Slants",
    type: "offense",
    formation: "Spread 2x1",
    situation: "Standard",
    notes: "5v5 Matchup: Read middle safety between hashes. If safeties spread to flats, C is open over the ball. R provides checkdown.",
    losY: DEFAULT_LOS_Y,
    zones: [
      { id: "z-c2-l", name: "Deep 1/2 Left", x: 32, y: DEFAULT_LOS_Y - 28, rx: 24, ry: 14, color: "#3B82F6" },
      { id: "z-c2-r", name: "Deep 1/2 Right", x: 68, y: DEFAULT_LOS_Y - 28, rx: 24, ry: 14, color: "#3B82F6" },
      { id: "z-c2-fl", name: "Flat Left", x: 20, y: DEFAULT_LOS_Y - 8, rx: 16, ry: 8, color: "#10B981" },
      { id: "z-c2-fr", name: "Flat Right", x: 80, y: DEFAULT_LOS_Y - 8, rx: 16, ry: 8, color: "#10B981" },
    ],
    players: [
      // 5 Offense
      { id: "c", label: "C", role: "Center", x: 50, y: DEFAULT_LOS_Y, side: "offense", route: [{ x: 50, y: DEFAULT_LOS_Y - 5 }, { x: 38, y: DEFAULT_LOS_Y - 7 }], quickRouteName: "Drag / Cross" },
      { id: "qb", label: "QB", role: "Quarterback", x: 50, y: DEFAULT_LOS_Y + 9, side: "offense" },
      { id: "x", label: "X", role: "Receiver Left", x: 18, y: DEFAULT_LOS_Y + 1, side: "offense", route: [{ x: 18, y: DEFAULT_LOS_Y - 8 }, { x: 30, y: DEFAULT_LOS_Y - 18 }], quickRouteName: "Slant" },
      { id: "r", label: "R", role: "Slot / Running Back", x: 35, y: DEFAULT_LOS_Y + 3, side: "offense", route: [{ x: 22, y: DEFAULT_LOS_Y - 1 }], quickRouteName: "Flat" },
      { id: "z", label: "Z", role: "Receiver Right", x: 82, y: DEFAULT_LOS_Y + 1, side: "offense", route: [{ x: 82, y: DEFAULT_LOS_Y - 8 }, { x: 70, y: DEFAULT_LOS_Y - 18 }], quickRouteName: "Slant" },
      // 5 Defense
      { id: "rush", label: "RUSH", role: "Pass Rusher (7 yds back)", x: 50, y: DEFAULT_LOS_Y - 13, side: "defense", coverageType: "rush", route: [{ x: 50, y: DEFAULT_LOS_Y + 9 }], routeType: "rush" },
      { id: "cb1", label: "CB1", role: "Cornerback Left (Flat)", x: 18, y: DEFAULT_LOS_Y - 5, side: "defense", coverageType: "zone", zoneId: "z-c2-fl", route: [{ x: 20, y: DEFAULT_LOS_Y - 8 }] },
      { id: "cb2", label: "CB2", role: "Cornerback Right (Flat)", x: 82, y: DEFAULT_LOS_Y - 5, side: "defense", coverageType: "zone", zoneId: "z-c2-fr", route: [{ x: 80, y: DEFAULT_LOS_Y - 8 }] },
      { id: "fs", label: "FS", role: "Free Safety (Deep Left)", x: 34, y: DEFAULT_LOS_Y - 16, side: "defense", coverageType: "zone", zoneId: "z-c2-l", route: [{ x: 32, y: DEFAULT_LOS_Y - 28 }] },
      { id: "ss", label: "SS", role: "Strong Safety (Deep Right)", x: 66, y: DEFAULT_LOS_Y - 16, side: "defense", coverageType: "zone", zoneId: "z-c2-r", route: [{ x: 68, y: DEFAULT_LOS_Y - 28 }] },
    ],
  },

  // 5v5 OFFENSE 2: Trips Right - Flood Overload vs Cover 3
  {
    id: "offense-trips-flood",
    teamId: "default",
    name: "5v5 Trips - Flood Overload",
    type: "offense",
    formation: "Trips Right",
    situation: "3rd & Medium",
    notes: "Overloads the right sideline with 3 levels. Solo backside X keeps safety honest with deep post route.",
    losY: DEFAULT_LOS_Y,
    zones: [
      { id: "z-c3-l", name: "Deep 1/3 Left", x: 22, y: DEFAULT_LOS_Y - 30, rx: 18, ry: 14, color: "#8B5CF6" },
      { id: "z-c3-m", name: "Deep 1/3 Middle", x: 50, y: DEFAULT_LOS_Y - 30, rx: 18, ry: 14, color: "#8B5CF6" },
      { id: "z-c3-r", name: "Deep 1/3 Right", x: 78, y: DEFAULT_LOS_Y - 30, rx: 18, ry: 14, color: "#8B5CF6" },
      { id: "z-c3-u", name: "Under Hook", x: 50, y: DEFAULT_LOS_Y - 10, rx: 20, ry: 8, color: "#EC4899" },
    ],
    players: [
      // 5 Offense
      { id: "c", label: "C", role: "Center", x: 50, y: DEFAULT_LOS_Y, side: "offense", route: [{ x: 50, y: DEFAULT_LOS_Y - 6 }, { x: 62, y: DEFAULT_LOS_Y - 6 }], quickRouteName: "Flat" },
      { id: "qb", label: "QB", role: "Quarterback", x: 50, y: DEFAULT_LOS_Y + 9, side: "offense" },
      { id: "x", label: "X", role: "Solo Receiver Left", x: 18, y: DEFAULT_LOS_Y + 1, side: "offense", route: [{ x: 18, y: DEFAULT_LOS_Y - 18 }, { x: 32, y: DEFAULT_LOS_Y - 34 }], quickRouteName: "Post" },
      { id: "r", label: "R", role: "Inside Slot Right", x: 68, y: DEFAULT_LOS_Y + 2, side: "offense", route: [{ x: 68, y: DEFAULT_LOS_Y - 12 }, { x: 82, y: DEFAULT_LOS_Y - 12 }], quickRouteName: "Out" },
      { id: "z", label: "Z", role: "Outside Receiver Right", x: 84, y: DEFAULT_LOS_Y + 1, side: "offense", route: [{ x: 84, y: DEFAULT_LOS_Y - 18 }, { x: 92, y: DEFAULT_LOS_Y - 34 }], quickRouteName: "Corner" },
      // 5 Defense
      { id: "rush", label: "RUSH", role: "Pass Rusher (7 yds back)", x: 50, y: DEFAULT_LOS_Y - 13, side: "defense", coverageType: "rush", route: [{ x: 50, y: DEFAULT_LOS_Y + 9 }], routeType: "rush" },
      { id: "cb1", label: "CB1", role: "Corner Left (Deep 1/3)", x: 18, y: DEFAULT_LOS_Y - 8, side: "defense", coverageType: "zone", zoneId: "z-c3-l", route: [{ x: 22, y: DEFAULT_LOS_Y - 30 }] },
      { id: "cb2", label: "CB2", role: "Corner Right (Deep 1/3)", x: 82, y: DEFAULT_LOS_Y - 8, side: "defense", coverageType: "zone", zoneId: "z-c3-r", route: [{ x: 78, y: DEFAULT_LOS_Y - 30 }] },
      { id: "fs", label: "FS", role: "Free Safety (Deep Mid)", x: 50, y: DEFAULT_LOS_Y - 18, side: "defense", coverageType: "zone", zoneId: "z-c3-m", route: [{ x: 50, y: DEFAULT_LOS_Y - 30 }] },
      { id: "mlb", label: "MLB", role: "Middle Linebacker", x: 50, y: DEFAULT_LOS_Y - 6, side: "defense", coverageType: "zone", zoneId: "z-c3-u", route: [{ x: 50, y: DEFAULT_LOS_Y - 10 }] },
    ],
  },

  // 5v5 OFFENSE 3: Bunch Right - Mesh Rub vs Man Lock
  {
    id: "offense-bunch-mesh",
    teamId: "default",
    name: "5v5 Bunch - Mesh Rub",
    type: "offense",
    formation: "Bunch Right",
    situation: "Red Zone",
    notes: "Creates natural pick and rub action against man coverage in short yardage and red zone.",
    losY: DEFAULT_LOS_Y,
    players: [
      // 5 Offense
      { id: "c", label: "C", role: "Center", x: 50, y: DEFAULT_LOS_Y, side: "offense", route: [{ x: 50, y: DEFAULT_LOS_Y - 10 }, { x: 50, y: DEFAULT_LOS_Y - 7 }], quickRouteName: "Curl / Hook" },
      { id: "qb", label: "QB", role: "Quarterback", x: 50, y: DEFAULT_LOS_Y + 9, side: "offense" },
      { id: "x", label: "X", role: "Split Left", x: 20, y: DEFAULT_LOS_Y + 1, side: "offense", route: [{ x: 20, y: DEFAULT_LOS_Y - 5 }, { x: 74, y: DEFAULT_LOS_Y - 7 }], quickRouteName: "Drag / Cross" },
      { id: "r", label: "R", role: "Bunch Point", x: 68, y: DEFAULT_LOS_Y + 2, side: "offense", route: [{ x: 68, y: DEFAULT_LOS_Y - 5 }, { x: 26, y: DEFAULT_LOS_Y - 6 }], quickRouteName: "Drag / Cross" },
      { id: "z", label: "Z", role: "Bunch Outside", x: 78, y: DEFAULT_LOS_Y + 3, side: "offense", route: [{ x: 86, y: DEFAULT_LOS_Y - 4 }, { x: 88, y: DEFAULT_LOS_Y - 32 }], quickRouteName: "Wheel" },
      // 5 Defense
      { id: "rush", label: "RUSH", role: "Pass Rusher (7 yds back)", x: 50, y: DEFAULT_LOS_Y - 13, side: "defense", coverageType: "rush", route: [{ x: 50, y: DEFAULT_LOS_Y + 9 }], routeType: "rush" },
      { id: "cb1", label: "CB1", role: "Cornerback Left (Man Lock)", x: 20, y: DEFAULT_LOS_Y - 3, side: "defense", coverageType: "man", manTargetId: "x" },
      { id: "cb2", label: "CB2", role: "Cornerback Right (Man Lock)", x: 78, y: DEFAULT_LOS_Y - 3, side: "defense", coverageType: "man", manTargetId: "z" },
      { id: "nb", label: "NB", role: "Nickel Corner (Man Lock)", x: 68, y: DEFAULT_LOS_Y - 3, side: "defense", coverageType: "man", manTargetId: "r" },
      { id: "fs", label: "FS", role: "Centerfield Safety", x: 50, y: DEFAULT_LOS_Y - 20, side: "defense", coverageType: "zone", route: [{ x: 50, y: DEFAULT_LOS_Y - 28 }] },
    ],
  },

  // 5v5 DEFENSE 1: Cover 2 Zone vs Spread 2x1
  {
    id: "defense-cover2-zone",
    teamId: "default",
    name: "5v5 Cover 2 Zone",
    type: "defense",
    formation: "Cover 2 Zone",
    situation: "Standard",
    notes: "Base 5v5 zone scheme. Rusher fires from 7 yards back. 2 Corners cover the flats; 2 Safeties split deep halves.",
    losY: DEFAULT_LOS_Y,
    zones: [
      { id: "z-deep-l", name: "Deep 1/2 Left", x: 32, y: DEFAULT_LOS_Y - 28, rx: 24, ry: 14, color: "#3B82F6" },
      { id: "z-deep-r", name: "Deep 1/2 Right", x: 68, y: DEFAULT_LOS_Y - 28, rx: 24, ry: 14, color: "#3B82F6" },
      { id: "z-flat-l", name: "Flat Left", x: 20, y: DEFAULT_LOS_Y - 8, rx: 16, ry: 8, color: "#10B981" },
      { id: "z-flat-r", name: "Flat Right", x: 80, y: DEFAULT_LOS_Y - 8, rx: 16, ry: 8, color: "#10B981" },
    ],
    players: [
      // 5 Defense
      { id: "rush", label: "RUSH", role: "Pass Rusher (7 yds back)", x: 50, y: DEFAULT_LOS_Y - 13, side: "defense", coverageType: "rush", route: [{ x: 50, y: DEFAULT_LOS_Y + 9 }], routeType: "rush" },
      { id: "cb1", label: "CB1", role: "Cornerback Left (Flat)", x: 18, y: DEFAULT_LOS_Y - 5, side: "defense", coverageType: "zone", zoneId: "z-flat-l", route: [{ x: 20, y: DEFAULT_LOS_Y - 8 }] },
      { id: "cb2", label: "CB2", role: "Cornerback Right (Flat)", x: 82, y: DEFAULT_LOS_Y - 5, side: "defense", coverageType: "zone", zoneId: "z-flat-r", route: [{ x: 80, y: DEFAULT_LOS_Y - 8 }] },
      { id: "fs", label: "FS", role: "Free Safety (Deep Left)", x: 34, y: DEFAULT_LOS_Y - 16, side: "defense", coverageType: "zone", zoneId: "z-deep-l", route: [{ x: 32, y: DEFAULT_LOS_Y - 28 }] },
      { id: "ss", label: "SS", role: "Strong Safety (Deep Right)", x: 66, y: DEFAULT_LOS_Y - 16, side: "defense", coverageType: "zone", zoneId: "z-deep-r", route: [{ x: 68, y: DEFAULT_LOS_Y - 28 }] },
      // 5 Offense
      { id: "c", label: "C", role: "Center", x: 50, y: DEFAULT_LOS_Y, side: "offense", route: [{ x: 50, y: DEFAULT_LOS_Y - 6 }, { x: 38, y: DEFAULT_LOS_Y - 6 }] },
      { id: "qb", label: "QB", role: "Quarterback", x: 50, y: DEFAULT_LOS_Y + 9, side: "offense" },
      { id: "x", label: "X", role: "Receiver Left", x: 18, y: DEFAULT_LOS_Y + 1, side: "offense", route: [{ x: 18, y: DEFAULT_LOS_Y - 8 }, { x: 30, y: DEFAULT_LOS_Y - 18 }], quickRouteName: "Slant" },
      { id: "r", label: "R", role: "Slot / Running Back", x: 35, y: DEFAULT_LOS_Y + 3, side: "offense", route: [{ x: 22, y: DEFAULT_LOS_Y - 1 }], quickRouteName: "Flat" },
      { id: "z", label: "Z", role: "Receiver Right", x: 82, y: DEFAULT_LOS_Y + 1, side: "offense", route: [{ x: 82, y: DEFAULT_LOS_Y - 8 }, { x: 70, y: DEFAULT_LOS_Y - 18 }], quickRouteName: "Slant" },
    ],
  },

  // 5v5 DEFENSE 2: Cover 1 Man-to-Man Lock vs Trips
  {
    id: "defense-man-press",
    teamId: "default",
    name: "5v5 Man Press Lock",
    type: "defense",
    formation: "Man Press 1-High",
    situation: "Extra Point / Short Yardage",
    notes: "Aggressive 5v5 man coverage. Rusher attacks from 7-yard mark. 3 Defenders lock man-to-man; Free Safety patrols center field.",
    losY: DEFAULT_LOS_Y,
    players: [
      // 5 Defense
      { id: "rush", label: "RUSH", role: "Pass Rusher (7 yds back)", x: 50, y: DEFAULT_LOS_Y - 13, side: "defense", coverageType: "rush", route: [{ x: 50, y: DEFAULT_LOS_Y + 9 }], routeType: "rush" },
      { id: "cb1", label: "CB1", role: "Cornerback Left (Man Lock)", x: 18, y: DEFAULT_LOS_Y - 3, side: "defense", coverageType: "man", manTargetId: "x" },
      { id: "cb2", label: "CB2", role: "Cornerback Right (Man Lock)", x: 84, y: DEFAULT_LOS_Y - 3, side: "defense", coverageType: "man", manTargetId: "z" },
      { id: "nb", label: "NB", role: "Nickel Slot (Man Lock)", x: 68, y: DEFAULT_LOS_Y - 3, side: "defense", coverageType: "man", manTargetId: "r" },
      { id: "fs", label: "FS", role: "Centerfield Free Safety", x: 50, y: DEFAULT_LOS_Y - 20, side: "defense", coverageType: "zone", route: [{ x: 50, y: DEFAULT_LOS_Y - 28 }] },
      // 5 Offense
      { id: "c", label: "C", role: "Center", x: 50, y: DEFAULT_LOS_Y, side: "offense" },
      { id: "qb", label: "QB", role: "Quarterback", x: 50, y: DEFAULT_LOS_Y + 9, side: "offense" },
      { id: "x", label: "X", role: "Receiver Left", x: 18, y: DEFAULT_LOS_Y + 1, side: "offense", route: [{ x: 18, y: DEFAULT_LOS_Y - 18 }, { x: 32, y: DEFAULT_LOS_Y - 34 }], quickRouteName: "Post" },
      { id: "r", label: "R", role: "Slot Right", x: 68, y: DEFAULT_LOS_Y + 2, side: "offense", route: [{ x: 68, y: DEFAULT_LOS_Y - 12 }, { x: 82, y: DEFAULT_LOS_Y - 12 }], quickRouteName: "Out" },
      { id: "z", label: "Z", role: "Receiver Right", x: 84, y: DEFAULT_LOS_Y + 1, side: "offense", route: [{ x: 84, y: DEFAULT_LOS_Y - 18 }, { x: 92, y: DEFAULT_LOS_Y - 34 }], quickRouteName: "Corner" },
    ],
  },

  // 5v5 DEFENSE 3: Cover 3 Cloud Zone vs Bunch
  {
    id: "defense-cover3-zone",
    teamId: "default",
    name: "5v5 Cover 3 Deep Cloud",
    type: "defense",
    formation: "Cover 3 Cloud",
    situation: "3rd & Long",
    notes: "Protects against deep chunk plays. Corners bail to deep thirds, safety guards deep middle, middle linebacker patrols intermediate hole.",
    losY: DEFAULT_LOS_Y,
    zones: [
      { id: "z-c3-l", name: "Deep 1/3 Left", x: 22, y: DEFAULT_LOS_Y - 30, rx: 18, ry: 14, color: "#8B5CF6" },
      { id: "z-c3-m", name: "Deep 1/3 Middle", x: 50, y: DEFAULT_LOS_Y - 30, rx: 18, ry: 14, color: "#8B5CF6" },
      { id: "z-c3-r", name: "Deep 1/3 Right", x: 78, y: DEFAULT_LOS_Y - 30, rx: 18, ry: 14, color: "#8B5CF6" },
      { id: "z-c3-under", name: "Under Hook", x: 50, y: DEFAULT_LOS_Y - 10, rx: 20, ry: 8, color: "#EC4899" },
    ],
    players: [
      // 5 Defense
      { id: "rush", label: "RUSH", role: "Pass Rusher (7 yds back)", x: 50, y: DEFAULT_LOS_Y - 13, side: "defense", coverageType: "rush", route: [{ x: 50, y: DEFAULT_LOS_Y + 9 }], routeType: "rush" },
      { id: "cb1", label: "CB1", role: "Cornerback Left (Deep 1/3)", x: 20, y: DEFAULT_LOS_Y - 8, side: "defense", coverageType: "zone", zoneId: "z-c3-l", route: [{ x: 22, y: DEFAULT_LOS_Y - 30 }] },
      { id: "cb2", label: "CB2", role: "Cornerback Right (Deep 1/3)", x: 80, y: DEFAULT_LOS_Y - 8, side: "defense", coverageType: "zone", zoneId: "z-c3-r", route: [{ x: 78, y: DEFAULT_LOS_Y - 30 }] },
      { id: "fs", label: "FS", role: "Free Safety (Deep 1/3 Mid)", x: 50, y: DEFAULT_LOS_Y - 18, side: "defense", coverageType: "zone", zoneId: "z-c3-m", route: [{ x: 50, y: DEFAULT_LOS_Y - 30 }] },
      { id: "mlb", label: "MLB", role: "Middle Linebacker (Under)", x: 50, y: DEFAULT_LOS_Y - 6, side: "defense", coverageType: "zone", zoneId: "z-c3-under", route: [{ x: 50, y: DEFAULT_LOS_Y - 10 }] },
      // 5 Offense
      { id: "c", label: "C", role: "Center", x: 50, y: DEFAULT_LOS_Y, side: "offense" },
      { id: "qb", label: "QB", role: "Quarterback", x: 50, y: DEFAULT_LOS_Y + 9, side: "offense" },
      { id: "x", label: "X", role: "Split Left", x: 20, y: DEFAULT_LOS_Y + 1, side: "offense", route: [{ x: 20, y: DEFAULT_LOS_Y - 5 }, { x: 74, y: DEFAULT_LOS_Y - 7 }], quickRouteName: "Drag / Cross" },
      { id: "r", label: "R", role: "Bunch Point", x: 68, y: DEFAULT_LOS_Y + 2, side: "offense", route: [{ x: 68, y: DEFAULT_LOS_Y - 5 }, { x: 26, y: DEFAULT_LOS_Y - 6 }], quickRouteName: "Drag / Cross" },
      { id: "z", label: "Z", role: "Bunch Outside", x: 78, y: DEFAULT_LOS_Y + 3, side: "offense", route: [{ x: 86, y: DEFAULT_LOS_Y - 4 }, { x: 88, y: DEFAULT_LOS_Y - 32 }], quickRouteName: "Wheel" },
    ],
  },
];

/**
 * Creates seed default playbooks (1 Offense, 1 Defense) for a team aligned with league rules squad size.
 */
export function createDefaultPlaybooks(teamId: string, playersPerSide: number = 5): Playbook[] {
  const squadSize = Math.max(4, Math.min(8, playersPerSide || 5));
  const offensivePlays = DEFAULT_FLAG_PLAYS.filter((p) => p.type === "offense").map((p) => ({
    ...p,
    teamId,
    name: p.name.replace(/^5v5 /, `${squadSize}v${squadSize} `),
    players: ensureSquadMatchup(p.players, p.losY || DEFAULT_LOS_Y, squadSize),
  }));
  const defensivePlays = DEFAULT_FLAG_PLAYS.filter((p) => p.type === "defense").map((p) => ({
    ...p,
    teamId,
    name: p.name.replace(/^5v5 /, `${squadSize}v${squadSize} `),
    players: ensureSquadMatchup(p.players, p.losY || DEFAULT_LOS_Y, squadSize),
  }));

  const offenseBook: Playbook = {
    id: `pb-off-${teamId}`,
    teamId,
    title: `${squadSize}v${squadSize} Spread & Trips Offense`,
    type: "offense",
    playersOnField: squadSize,
    description: "Primary offensive playbook featuring spread quick game, flood overloads, and red zone rub concepts.",
    formations: [
      { id: "form-spread", name: "Spread 2x1", side: "offense", description: "Balanced 2-receiver right, 1-receiver left spread.", players: applyFormationToSquad(ensureSquadMatchup([], DEFAULT_LOS_Y, squadSize), "Spread 2x1", "offense", DEFAULT_LOS_Y) },
      { id: "form-trips", name: "Trips Right", side: "offense", description: "Overload three receivers to the field side with backside solo X.", players: applyFormationToSquad(ensureSquadMatchup([], DEFAULT_LOS_Y, squadSize), "Trips Right", "offense", DEFAULT_LOS_Y) },
      { id: "form-bunch", name: "Bunch Right", side: "offense", description: "Compressed 3-man bunch creating natural rub action.", players: applyFormationToSquad(ensureSquadMatchup([], DEFAULT_LOS_Y, squadSize), "Bunch Right", "offense", DEFAULT_LOS_Y) },
      { id: "form-empty", name: "Spread 2x2", side: "offense", description: "Empty backfield 4-receiver spread.", players: applyFormationToSquad(ensureSquadMatchup([], DEFAULT_LOS_Y, squadSize), "Spread 2x2", "offense", DEFAULT_LOS_Y) },
    ],
    plays: offensivePlays,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const defenseBook: Playbook = {
    id: `pb-def-${teamId}`,
    teamId,
    title: `${squadSize}v${squadSize} Lockdown Defense`,
    type: "defense",
    playersOnField: squadSize,
    description: "Core defensive schemes featuring 2-deep zone shells, man lock press, and cloud coverage.",
    formations: [
      { id: "form-cover2", name: "Cover 2 Zone", side: "defense", description: "Base 2-deep safety shell with aggressive flat defenders.", players: applyFormationToSquad(ensureSquadMatchup([], DEFAULT_LOS_Y, squadSize), "Cover 2 Zone", "defense", DEFAULT_LOS_Y) },
      { id: "form-cover1", name: "Cover 1 Man Lock", side: "defense", description: "Tight man-to-man coverage with 1 centerfield safety.", players: applyFormationToSquad(ensureSquadMatchup([], DEFAULT_LOS_Y, squadSize), "Cover 1 Man Lock", "defense", DEFAULT_LOS_Y) },
      { id: "form-cover3", name: "Cover 3 Cloud", side: "defense", description: "3-deep zone thirds with intermediate hook coverage.", players: applyFormationToSquad(ensureSquadMatchup([], DEFAULT_LOS_Y, squadSize), "Cover 3 Cloud", "defense", DEFAULT_LOS_Y) },
      { id: "form-goalline", name: "Goal Line Tight", side: "defense", description: "Condensed goal line press bracket.", players: applyFormationToSquad(ensureSquadMatchup([], DEFAULT_LOS_Y, squadSize), "Goal Line Tight", "defense", DEFAULT_LOS_Y) },
    ],
    plays: defensivePlays,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return [offenseBook, defenseBook];
}

/**
 * Migrates a raw list of plays (from previous schema) into structured Playbooks.
 */
export function migrateRawPlaysToPlaybooks(rawPlays: PlayDiagram[], teamId: string, playersPerSide: number = 5): Playbook[] {
  if (!rawPlays || rawPlays.length === 0) {
    return createDefaultPlaybooks(teamId, playersPerSide);
  }

  const offPlays = rawPlays.filter((p) => p.type === "offense");
  const defPlays = rawPlays.filter((p) => p.type === "defense");

  const playbooks: Playbook[] = [];

  if (offPlays.length > 0 || defPlays.length === 0) {
    const formationsInUse = Array.from(new Set(offPlays.map((p) => p.formation || "Spread 2x1")));
    if (formationsInUse.length === 0) formationsInUse.push("Spread 2x1", "Trips Right");

    playbooks.push({
      id: `pb-off-${teamId}`,
      teamId,
      title: "Team Offensive Playbook",
      type: "offense",
      playersOnField: playersPerSide,
      description: "Primary offensive playbook and alignments.",
      formations: formationsInUse.map((name, i) => ({
        id: `form-off-${i}-${Date.now()}`,
        name,
        side: "offense",
        players: applyFormationToSquad(ensureSquadMatchup([], DEFAULT_LOS_Y, playersPerSide), name, "offense", DEFAULT_LOS_Y),
      })),
      plays: offPlays.length > 0 ? offPlays : DEFAULT_FLAG_PLAYS.filter((p) => p.type === "offense").map(p => ({ ...p, teamId })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  if (defPlays.length > 0) {
    const formationsInUse = Array.from(new Set(defPlays.map((p) => p.formation || "Cover 2 Zone")));
    if (formationsInUse.length === 0) formationsInUse.push("Cover 2 Zone", "Cover 1 Man Lock");

    playbooks.push({
      id: `pb-def-${teamId}`,
      teamId,
      title: "Team Defensive Playbook",
      type: "defense",
      playersOnField: playersPerSide,
      description: "Primary defensive schemes and coverage shells.",
      formations: formationsInUse.map((name, i) => ({
        id: `form-def-${i}-${Date.now()}`,
        name,
        side: "defense",
        players: applyFormationToSquad(ensureSquadMatchup([], DEFAULT_LOS_Y, playersPerSide), name, "defense", DEFAULT_LOS_Y),
      })),
      plays: defPlays,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return playbooks;
}

/**
 * Creates a brand new play inside a specific formation/alignment of a playbook.
 * Automatically aligns to the playbook's configured squad size or league rules.
 */
export function createPlayInFormation(
  playbook: Playbook,
  formation: FormationAlignment | string,
  losY = DEFAULT_LOS_Y,
  playersPerSide = 5
): PlayDiagram {
  const squadCount = playbook.playersOnField || playersPerSide || 5;
  const formationName = typeof formation === "string" ? formation : formation.name;
  const formationObj =
    typeof formation === "object"
      ? formation
      : playbook.formations.find((f) => f.name === formation);

  let alignedPlayers: PlayerNode[];
  if (formationObj?.players && formationObj.players.length > 0) {
    // Inherit the exact pre-snap spots placed by the coach, matching squad sizing
    alignedPlayers = ensureSquadMatchup(
      formationObj.players.map((p) => ({
        ...p,
        route: [],
        quickRouteName: undefined,
      })),
      losY,
      squadCount
    );
  } else {
    const basePlayers = ensureSquadMatchup([], losY, squadCount);
    alignedPlayers = applyFormationToSquad(basePlayers, formationName, playbook.type, losY);
  }

  return {
    id: `play-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    teamId: playbook.teamId,
    name: `${formationName} - Concept ${Math.floor(Math.random() * 90) + 10}`,
    type: playbook.type,
    formation: formationName,
    situation: "Standard",
    notes: `Created within ${formationName} alignment (${squadCount}v${squadCount}).`,
    losY,
    players: alignedPlayers,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

