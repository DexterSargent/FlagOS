import type { Playbook, PlayDiagram, PlayerNode, RoutePoint, ZoneBubble } from "./playbookTypes";
import { MAX_PLAYBOOKS_PER_TEAM } from "./playbookTypes";
import { YORK_TEAM_ID } from "./yorkStaff";

export const YORK_DEFENSIVE_PLAYBOOK_ID = "pb-york-defense-pdf-2026";
type Point = readonly [number, number];
type Defender = "CL" | "CR" | "SH" | "WH" | "FS";
type Receiver = "Z" | "Y" | "C" | "X" | "QB";
type Assignment = {
  at?: Point;
  to?: readonly Point[];
  man?: Receiver;
  rush?: boolean;
  zone?: readonly [string, number, number, number, number, string, "rectangle"?];
  notes?: string;
};
type Spec = {
  name: string;
  page: number;
  formation: "2-2-1" | "York D";
  defenders: Record<Defender, Assignment>;
  offense?: Partial<Record<Receiver, Point>>;
  offenseRoutes?: Partial<Record<Receiver, readonly Point[]>>;
  notes?: string;
};

const BLUE = "#2589CF";
const YELLOW = "#DBC000";
const PURPLE = "#A344CF";
const RED = "#EF4444";
const GRAY = "#737373";
const BASE: Record<Defender, Point> = { CL: [71, 166], CR: [355, 166], SH: [187, 166], WH: [242, 166], FS: [213, 218] };
const OFFENSE: Record<Receiver, Point> = { Z: [83, 123], Y: [148, 123], C: [213, 123], X: [314, 123], QB: [213, 85] };
const CROP_NOTE = "The PDF clips some deep drops at the bottom of its field. Paths are traced to that visible boundary; clipped zone extents are approximate, not asserted off-page assignments.";
const MATCH_CORNER = "Outside leverage; key the outside receiver. Lock a go route. Do not chase in-breaking slant/in/post routes: pass them to SS/FS, then look inside for out/corner/bang. If nothing comes out, slowly reduce toward the middle to help SS.";

// Coordinates are traced in the PDF's 425px-wide page preview. The source has
// defense below the LOS; reflect Y so downfield agrees with the editable canvas.
function point([x, y]: Point): RoutePoint {
  return { x: Math.round((x - 20) / 385 * 10_000) / 100, y: Math.round((65 - (y - 123) * 0.378) * 100) / 100 };
}

const SPECS: Spec[] = [
  {
    name: "2-2-1 Cover 2 Copy", page: 3, formation: "2-2-1",
    offense: { Y: [132, 77], QB: [213, 77], X: [342, 123], Z: [79, 123] },
    defenders: {
      CL: { at: [94, 179], zone: ["Left short zone", 94, 179, 38, 38, PURPLE] },
      CR: { at: [328, 179], zone: ["Right short zone", 328, 179, 36, 36, PURPLE] },
      SH: { at: [137, 179], to: [[142, 258]], zone: ["Deep left", 142, 258, 46, 46, BLUE] },
      WH: { at: [223, 179], to: [[208, 220]], zone: ["Middle underneath", 208, 220, 30, 30, YELLOW], notes: "R in the source; short middle assignment is drawn rather than a rush." },
      FS: { at: [213, 221], to: [[275, 258]], zone: ["Deep right", 275, 258, 47, 47, BLUE] },
    }, notes: CROP_NOTE,
  },
  {
    name: "2-2-1 Cover 1 MATCH", page: 4, formation: "2-2-1",
    offense: { Z: [80, 123], Y: [151, 100], X: [347, 123], QB: [213, 100] },
    defenders: {
      CL: { at: [75, 217], to: [[94, 239]], zone: ["Left match rail", 94, 226, 35, 55, PURPLE, "rectangle"], notes: MATCH_CORNER },
      CR: { at: [357, 213], to: [[337, 239]], zone: ["Right match rail", 337, 226, 35, 55, PURPLE, "rectangle"], notes: MATCH_CORNER },
      SH: { at: [156, 207], to: [[227, 216]], zone: ["Middle robber", 227, 216, 48, 48, YELLOW], notes: "SS: rob the middle. Eyes to center for the quick hook, then anything coming inside. Do not chase routes outside." },
      WH: { at: [203, 188], to: [[206, 152], [209, 78]], rush: true, notes: "R: rush the quarterback." },
      FS: { at: [213, 255], to: [[213, 279]], zone: ["Deep middle", 213, 279, 57, 25, BLUE], notes: "Deep middle; do not widen to outside go/corner routes. Cover seams/posts and play the ball. If nothing comes, look for work." },
    }, notes: `Communicate and do not chase outside your zone unless the ball is thrown. ${CROP_NOTE}`,
  },
  {
    name: "2-2-1 Bracket", page: 5, formation: "2-2-1",
    defenders: {
      CL: { at: [94, 204], to: [[90, 106]], notes: "Outside vertical bracket, as drawn." },
      CR: { at: [347, 194], to: [[347, 114]], notes: "Outside vertical bracket, as drawn." },
      SH: { at: [166, 199], to: [[205, 128]], notes: "SS: inside bracket toward the center/slot lane." },
      WH: { at: [213, 189], to: [[218, 96]], rush: true, notes: "R: straight rush path." },
      FS: { at: [280, 195], to: [[280, 99]], notes: "Inside vertical bracket. Source shows assignment arrows without receiver identities." },
    },
  },
  {
    name: "York D Cover 2", page: 7, formation: "York D",
    defenders: {
      CL: { to: [[111, 279]], zone: ["Deep left", 119, 294, 48, 22, BLUE] },
      CR: { to: [[341, 209]], zone: ["Right underneath", 341, 209, 46, 46, YELLOW] },
      SH: { to: [[82, 209]], zone: ["Left underneath", 82, 209, 46, 46, YELLOW] },
      WH: { to: [[213, 212]], zone: ["Middle underneath", 213, 212, 42, 42, YELLOW] },
      FS: { at: [208, 251], to: [[233, 279]], zone: ["Deep right", 286, 297, 57, 20, BLUE] },
    }, notes: CROP_NOTE,
  },
  {
    name: "York D Cover 1", page: 8, formation: "York D",
    offense: { Y: [148, 123], X: [314, 123] },
    defenders: {
      CL: { man: "Z" }, CR: { man: "X" }, SH: { man: "Y" }, WH: { man: "C" },
      FS: { to: [[213, 268]], zone: ["Deep middle", 213, 268, 69, 69, BLUE] },
    },
  },
  {
    name: "York D Engage 8", page: 9, formation: "York D",
    defenders: {
      CL: { at: [68, 167], to: [[103, 262]], zone: ["Deep left third", 103, 262, 51, 51, BLUE] },
      CR: { at: [355, 166], to: [[326, 252]], zone: ["Deep right third", 326, 252, 54, 54, BLUE] },
      SH: { to: [[213, 85]], rush: true }, WH: { to: [[213, 85]], rush: true },
      FS: { to: [[215, 265]], zone: ["Deep middle third", 215, 265, 57, 57, BLUE] },
    }, notes: "Both SH and WH rush the quarterback; corners and FS drop into three deep zones. " + CROP_NOTE,
  },
  {
    name: "York D Cover 0 (Strong)", page: 10, formation: "York D",
    defenders: { CL: { man: "Z" }, CR: { man: "X" }, SH: { to: [[205, 101]], rush: true }, WH: { man: "C" }, FS: { man: "Y" } },
  },
  {
    name: "York D Buzz Slide", page: 11, formation: "York D",
    defenders: {
      CL: { at: [81, 171], to: [[210, 270]], zone: ["Buzz middle", 210, 270, 70, 70, BLUE] },
      CR: { at: [317, 167], man: "X" }, SH: { at: [152, 167], man: "Z" },
      WH: { at: [217, 167], man: "Y" }, FS: { at: [214, 218], man: "C" },
    }, notes: "Left corner buzzes to the deep middle while the remaining four defenders match the four eligible receivers.",
  },
  {
    name: "York D Cover 0 (Weak)", page: 12, formation: "York D",
    defenders: { CL: { man: "Z" }, CR: { man: "X" }, SH: { man: "C" }, WH: { to: [[213, 85]], rush: true }, FS: { man: "Y" } },
  },
  {
    name: "York D Bunch ADJUSTMENT", page: 13, formation: "York D",
    offense: { Z: [92, 95], Y: [138, 96], X: [113, 123] },
    defenders: {
      CL: { at: [82, 167], to: [[86, 148]], zone: ["Bunch left bracket", 86, 148, 19, 19, RED] },
      CR: { at: [151, 168], to: [[146, 150]], zone: ["Bunch right bracket", 146, 150, 20, 20, RED] },
      SH: { at: [114, 146], man: "X" }, WH: { to: [[213, 85]], rush: true },
      FS: { at: [215, 217], man: "C" },
    }, notes: "Three receivers bunch left. Two corners bracket the bunch; SH matches the point receiver, FS matches C, and WH rushes.",
  },
  {
    name: "York D Cover 2 hype", page: 14, formation: "York D",
    defenders: {
      CL: { to: [[115, 279]], zone: ["Deep left half", 129, 305, 78, 64, BLUE] },
      CR: { to: [[303, 279]], zone: ["Deep right half", 284, 305, 79, 67, BLUE] },
      SH: { to: [[136, 192]], zone: ["Left hook", 136, 192, 35, 35, YELLOW] },
      WH: { to: [[300, 200]], zone: ["Right hook", 300, 200, 40, 40, YELLOW] },
      FS: { at: [209, 249], to: [[209, 181]], zone: ["Middle hook", 209, 181, 33, 33, YELLOW] },
    }, notes: CROP_NOTE,
  },
  {
    name: "York D Robber", page: 15, formation: "York D",
    defenders: {
      CL: { to: [[95, 279]], zone: ["Deep left half", 95, 282, 68, 68, RED] },
      CR: { to: [[328, 279]], zone: ["Deep right half", 328, 282, 72, 68, RED] },
      SH: { to: [[184, 125], [185, 99], [197, 81], [220, 71]], rush: true, notes: "Curved rush path through the left side to the quarterback lane, as drawn." },
      WH: { to: [[323, 191]], zone: ["Right intermediate", 323, 191, 59, 59, GRAY] },
      FS: { at: [275, 234], to: [[222, 226]], zone: ["Middle robber", 222, 226, 37, 37, RED] },
    }, notes: CROP_NOTE,
  },
  {
    name: "York D Play 17", page: 16, formation: "York D",
    offense: { Z: [83, 123], Y: [147, 58], X: [314, 123] },
    offenseRoutes: { Y: [[147, 123], [147, 151], [138, 188]], C: [[194, 142]] },
    defenders: {
      CL: { at: [75, 142], notes: "No coverage line is supplied for this corner in the source." },
      CR: { at: [350, 142], notes: "No coverage line is supplied for this corner in the source." },
      SH: { at: [213, 142], to: [[213, 123]], notes: "SH points to C. Source has no explicit man-coverage line here." },
      WH: { at: [223, 194], notes: "No coverage line is supplied for WH in the source." },
      FS: { at: [215, 218], man: "Y" },
    }, notes: "Preserves the source title and incomplete assignments rather than inventing missing coverage. FS matches the advanced Y receiver; the opposing Y and C paths are included.",
  },
  {
    name: "York D Engage 4", page: 17, formation: "York D",
    defenders: {
      CL: { at: [68, 167], to: [[103, 262]], zone: ["Deep left third", 103, 262, 51, 51, BLUE] },
      CR: { to: [[326, 252]], zone: ["Deep right third", 326, 252, 54, 54, BLUE] },
      SH: { to: [[198, 146], [215, 199]], zone: ["Middle underneath", 215, 202, 43, 43, YELLOW] },
      WH: { to: [[213, 85]], rush: true },
      FS: { to: [[215, 265]], zone: ["Deep middle third", 215, 265, 57, 57, BLUE] },
    }, notes: CROP_NOTE,
  },
  {
    name: "York D Cover 2 Go", page: 18, formation: "York D",
    defenders: {
      CL: { to: [[108, 279]], zone: ["Deep left", 117, 295, 50, 22, BLUE] },
      CR: { to: [[341, 209]], zone: ["Right underneath", 341, 209, 46, 46, YELLOW] },
      SH: { to: [[82, 209]], zone: ["Left underneath", 82, 209, 46, 46, YELLOW] },
      WH: { to: [[222, 95]], notes: "WH carries the vertical/seam lane up to the marked point; no rush arrow is shown." },
      FS: { at: [208, 251], to: [[233, 279]], zone: ["Deep right", 286, 297, 57, 20, BLUE] },
    }, notes: CROP_NOTE,
  },
  {
    name: "York D Strong Half 2 Go", page: 19, formation: "York D",
    defenders: {
      CL: { to: [[71, 225]], zone: ["Left half", 71, 225, 66, 66, BLUE] },
      CR: { to: [[341, 209]], zone: ["Right underneath", 341, 209, 46, 46, YELLOW] },
      SH: { to: [[159, 279]], zone: ["Deep middle-left", 148, 301, 50, 22, YELLOW] },
      WH: { to: [[222, 95]], notes: "WH carries the vertical/seam lane to the source's marked point." },
      FS: { at: [208, 251], to: [[233, 279]], zone: ["Deep right", 286, 297, 57, 20, BLUE] },
    }, notes: CROP_NOTE,
  },
  {
    name: "York D Weak Half 2 Go", page: 20, formation: "York D",
    defenders: {
      CL: { to: [[71, 225]], zone: ["Left half", 71, 225, 66, 66, BLUE] },
      CR: { to: [[341, 209]], zone: ["Right underneath", 341, 209, 46, 46, YELLOW] },
      SH: { to: [[192, 100]], notes: "SH carries the vertical/seam lane to the marked point." },
      WH: { to: [[262, 279]], zone: ["Deep middle-right", 275, 301, 50, 22, YELLOW] },
      FS: { at: [208, 251], to: [[194, 279]], zone: ["Deep left", 152, 297, 57, 20, BLUE] },
    }, notes: CROP_NOTE,
  },
  {
    name: "York D Weak Cobra 2 Go", page: 21, formation: "York D",
    defenders: {
      CL: { to: [[71, 225]], zone: ["Left half", 71, 225, 66, 66, BLUE] },
      CR: { to: [[323, 279]], zone: ["Deep right", 301, 298, 50, 22, YELLOW] },
      SH: { to: [[192, 100]], notes: "SH carries the vertical/seam lane to the marked point." },
      WH: { to: [[337, 176]], zone: ["Right cobra", 337, 176, 67, 67, YELLOW] },
      FS: { at: [208, 251], to: [[194, 279]], zone: ["Deep left", 152, 297, 57, 20, BLUE] },
    }, notes: CROP_NOTE,
  },
  {
    name: "York D Double Cobra 2 Go", page: 22, formation: "York D",
    defenders: {
      CL: { to: [[91, 279]], zone: ["Deep left", 103, 300, 50, 22, BLUE] },
      CR: { to: [[323, 279]], zone: ["Deep right", 301, 298, 50, 22, YELLOW] },
      SH: { to: [[192, 100]], notes: "SH carries the vertical/seam lane to the marked point." },
      WH: { to: [[337, 176]], zone: ["Right cobra", 337, 176, 67, 67, YELLOW] },
      FS: { at: [208, 251], to: [[98, 195]], zone: ["Left cobra", 98, 195, 66, 66, BLUE] },
    }, notes: CROP_NOTE,
  },
];

export function createYorkDefensivePlaybook(teamId = YORK_TEAM_ID): Playbook {
  if (teamId !== YORK_TEAM_ID) throw new Error("The supplied defensive playbook belongs to York Lions.");
  const now = new Date().toISOString();
  const plays = SPECS.map((spec, index): PlayDiagram => {
    const id = `york-defense-pdf-${String(index + 1).padStart(2, "0")}`;
    const zones: ZoneBubble[] = [];
    const players: PlayerNode[] = (Object.keys(OFFENSE) as Receiver[]).map((label) => ({
      id: label.toLowerCase(), label, role: label === "QB" ? "Quarterback" : label === "C" ? "Center" : `${label} receiver`,
      ...point(spec.offense?.[label] ?? OFFENSE[label]), side: "offense", color: "#94A3B8",
      ...(spec.offenseRoutes?.[label] ? { route: spec.offenseRoutes[label].map(point) } : {}),
    }));
    for (const key of Object.keys(BASE) as Defender[]) {
      const assignment = spec.defenders[key];
      const label = spec.formation === "2-2-1"
        ? ({ CL: "CB", CR: "CB", SH: "SS", WH: "R", FS: "FS" } as const)[key]
        : key === "CL" || key === "CR" ? "C" : key;
      const player: PlayerNode = {
        id: key.toLowerCase(), label, role: key === "CL" ? "Left corner" : key === "CR" ? "Right corner" : label,
        ...point(assignment.at ?? BASE[key]), side: "defense",
        color: assignment.zone?.[5] ?? (key === "SH" || key === "WH" ? GRAY : RED),
        ...(assignment.to ? { route: assignment.to.map(point) } : {}),
        ...(assignment.notes ? { notes: assignment.notes } : {}),
      };
      if (assignment.man) {
        player.coverageType = "man";
        player.manTargetId = assignment.man.toLowerCase();
      } else if (assignment.rush) {
        player.coverageType = "rush";
        player.routeType = "rush";
      } else if (assignment.zone) {
        const [name, x, y, rx, ry, color, shape] = assignment.zone;
        const zoneId = `${id}-${key.toLowerCase()}-zone`;
        // Several source zones extend past the cropped diagram. Keep the center
        // in-bounds while preserving the visible depth of the source bubble.
        const center = point([x, y]);
        const zoneY = Math.max(2, center.y);
        zones.push({
          id: zoneId, name, x: center.x, y: zoneY,
          rx: Math.round(rx / 385 * 10_000) / 100,
          ry: Math.max(2, Math.round((ry * 0.378 - (zoneY - center.y)) * 100) / 100),
          color, ...(shape ? { shape } : {}),
        });
        player.coverageType = "zone";
        player.zoneId = zoneId;
      }
      players.push(player);
    }
    return {
      id, teamId, name: spec.name, type: "defense", formation: spec.formation, situation: "Standard",
      notes: `Visually digitized from defensive playbook.pdf, page ${spec.page}, play ${index + 1}.${spec.notes ? ` ${spec.notes}` : ""}`,
      players, zones, losY: 65, createdAt: now, updatedAt: now,
    };
  });
  return {
    id: YORK_DEFENSIVE_PLAYBOOK_ID, teamId, title: "York Lions Defensive Playbook", type: "defense", playersOnField: 5,
    description: "19 editable defenses visually reconstructed from the supplied 22-page York Lions defensive playbook. Original 2-2-1 and York D groupings preserved.",
    formations: ["2-2-1", "York D"].map((name, index) => ({ id: `york-defense-pdf-formation-${index + 1}`, name, side: "defense" })),
    plays, createdAt: now, updatedAt: now,
  };
}

/** Append once; never replace existing defenses or reapply over a coach's edits. */
export function includeYorkDefensivePlaybook(playbooks: Playbook[]): Playbook[] {
  if (playbooks.some((book) => book.teamId !== YORK_TEAM_ID)) throw new Error("Only York Lions playbooks can receive this import.");
  if (playbooks.some((book) => book.id === YORK_DEFENSIVE_PLAYBOOK_ID)) return playbooks;
  if (playbooks.length >= MAX_PLAYBOOKS_PER_TEAM) throw new Error("York already has five playbooks. Make room before importing the defensive PDF.");
  return [...playbooks, createYorkDefensivePlaybook()];
}
