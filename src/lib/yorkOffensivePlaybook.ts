import routeData from "./yorkOffensivePlaybookData.json";
import {
  DEFAULT_LOS_Y,
  ensureSquadMatchup,
  MAX_PLAYBOOKS_PER_TEAM,
  type Playbook,
  type PlayDiagram,
  type PlayerNode,
} from "./playbookTypes";

type YorkPosition = "C" | "QB" | "X" | "Y" | "Z";
type Coordinate = number[];
type YorkPlaySpec = {
  name: string;
  start: Partial<Record<YorkPosition, Coordinate>>;
  routes: Partial<Record<YorkPosition, Coordinate[]>>;
};

const YORK_PLAY_SPECS: YorkPlaySpec[] = routeData;
export const YORK_OFFENSIVE_PLAYBOOK_ID = "pb-york-offense-york_lions";

export function includeYorkOffensivePlaybook(
  playbooks: Playbook[],
  teamId: string,
  replaceDefaultOffense: boolean,
): Playbook[] {
  if (playbooks.some((book) => book.id === YORK_OFFENSIVE_PLAYBOOK_ID)) {
    return playbooks;
  }

  if (replaceDefaultOffense) {
    const yorkOffense = createYorkOffensivePlaybook(teamId);
    return playbooks.map((book) => book.type === "offense" ? yorkOffense : book);
  }
  if (playbooks.length >= MAX_PLAYBOOKS_PER_TEAM) {
    return playbooks;
  }
  return [...playbooks, createYorkOffensivePlaybook(teamId)];
}

const POSITION_COLORS: Record<YorkPosition, string> = {
  C: "#4D4D4D",
  QB: "#E50101",
  X: "#FF7A00",
  Y: "#A403C8",
  Z: "#00746B",
};

const POSITION_ROLES: Record<YorkPosition, string> = {
  C: "Center",
  QB: "Quarterback",
  X: "X receiver",
  Y: "Y receiver",
  Z: "Z receiver",
};

const DEFAULT_STARTS: Record<YorkPosition, Coordinate> = {
  C: [50, DEFAULT_LOS_Y],
  QB: [50, DEFAULT_LOS_Y + 9],
  X: [82, DEFAULT_LOS_Y],
  Y: [66, DEFAULT_LOS_Y],
  Z: [18, DEFAULT_LOS_Y],
};

const POSITIONS: YorkPosition[] = ["C", "QB", "X", "Y", "Z"];

export function createYorkOffensivePlaybook(teamId: string): Playbook {
  const now = new Date().toISOString();
  const plays: PlayDiagram[] = YORK_PLAY_SPECS.map((spec, index) => {
    const offensivePlayers: PlayerNode[] = POSITIONS.map((position) => {
      const [x, y] = spec.start[position] || DEFAULT_STARTS[position];
      const route = spec.routes[position]?.map(([routeX, routeY]) => ({
        x: routeX,
        y: routeY,
      }));
      return {
        id: position.toLowerCase(),
        label: position,
        role: POSITION_ROLES[position],
        x,
        y,
        side: "offense",
        color: POSITION_COLORS[position],
        ...(route?.length ? { route } : {}),
      };
    });

    return {
      id: `york-offense-${String(index + 1).padStart(2, "0")}`,
      teamId,
      name: spec.name,
      type: "offense",
      formation: "York Lions Offense",
      situation: "Standard",
      notes: `Digitized from the York Lions offensive playbook, play ${index + 1}.`,
      players: ensureSquadMatchup(offensivePlayers, DEFAULT_LOS_Y, 5),
      losY: DEFAULT_LOS_Y,
      createdAt: now,
      updatedAt: now,
    };
  });

  return {
    id: YORK_OFFENSIVE_PLAYBOOK_ID,
    teamId,
    title: "York Lions Offensive Playbook",
    type: "offense",
    playersOnField: 5,
    description: "38 plays digitized from the York Lions offensive playbook.",
    formations: [
      {
        id: "york-lions-offense",
        name: "York Lions Offense",
        side: "offense",
        description: "Routes and player alignments transcribed from the supplied playbook.",
      },
    ],
    plays,
    createdAt: now,
    updatedAt: now,
  };
}
