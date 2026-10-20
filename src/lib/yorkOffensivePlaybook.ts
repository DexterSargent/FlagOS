import routeData from "./yorkOffensivePlaybookData.json";
import {
  DEFAULT_LOS_Y,
  ensureSquadMatchup,
  MAX_PLAYBOOKS_PER_TEAM,
  type FormationAlignment,
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
export const YORK_OFFENSIVE_CATEGORIES = [
  "Run",
  "Pass",
  "RPO",
  "Extra Point/Short Yardage",
  "Uncategorized",
] as const;

type YorkCategory = typeof YORK_OFFENSIVE_CATEGORIES[number];
const YORK_CATEGORY_VERSION = 1;

// Best-effort diagram classifications, matching the OC's supplied category totals.
const YORK_PLAY_CATEGORIES: Record<string, YorkCategory> = {
  Captains: "Extra Point/Short Yardage",
  Hawaii: "Pass",
  Cowboy: "Pass",
  Levels: "Pass",
  Smash: "Pass",
  Spider: "Pass",
  "Z ISO": "Pass",
  "Y wheel": "Pass",
  Pairs: "Pass",
  Maui: "Pass",
  Trailmix: "Pass",
  "X option": "Pass",
  Xbox: "Pass",
  Chocolate: "Pass",
  Stripes: "Pass",
  Corn: "Pass",
  Divide: "Pass",
  Thieves: "Pass",
  Wrap: "Pass",
  Diamonds: "Pass",
  Flood: "Pass",
  Takeoff: "Pass",
  Taps: "Pass",
  Jello: "Run",
  Jerry: "Run",
  Cali: "Pass",
  Snag: "Extra Point/Short Yardage",
  "Coin Toss": "Pass",
  "X Factor": "Pass",
  Sheridan: "RPO",
  Jailbreak: "Pass",
  "Hot Potato": "RPO",
  "Penny Pincher": "RPO",
  "Run it back": "Run",
  King: "RPO",
  "007": "Uncategorized",
  Basketball: "Uncategorized",
  "Itsy Bitsy": "Pass",
};

function createYorkCategories(): FormationAlignment[] {
  return YORK_OFFENSIVE_CATEGORIES.map((name, index) => ({
    id: `york-offense-category-${index + 1}`,
    name,
    side: "offense",
    description: "Best-effort category inferred from the source diagrams and OC totals. Editable without changing player alignments.",
  }));
}

function migrateYorkCategories(book: Playbook): Playbook {
  const legacyCategory = "York Lions Offense";
  const needsCategorySeed = (book.seedCategoryVersion ?? 0) < YORK_CATEGORY_VERSION;
  const hasLegacyPlays = book.plays.some((play) => play.formation === legacyCategory);
  const missingCategories = createYorkCategories().filter(
    (category) => !book.formations.some((formation) => formation.name === category.name),
  );
  if (!needsCategorySeed && !hasLegacyPlays && missingCategories.length === 0) return book;

  return {
    ...book,
    seedCategoryVersion: YORK_CATEGORY_VERSION,
    formations: [
      ...book.formations.filter((formation) => formation.name !== legacyCategory),
      ...missingCategories,
    ],
    plays: book.plays.map((play) => {
      const sourceIndex = YORK_PLAY_SPECS.findIndex((spec) => spec.name === play.name);
      const isImportedPlay = sourceIndex >= 0 &&
        play.id === `york-offense-${String(sourceIndex + 1).padStart(2, "0")}`;
      if (needsCategorySeed && isImportedPlay &&
        (play.formation === legacyCategory || play.formation === "Uncategorized")) {
        return { ...play, formation: YORK_PLAY_CATEGORIES[play.name] };
      }
      return play.formation === legacyCategory ? { ...play, formation: "Uncategorized" } : play;
    }),
  };
}

export function includeYorkOffensivePlaybook(
  playbooks: Playbook[],
  teamId: string,
  replaceDefaultOffense: boolean,
): Playbook[] {
  if (playbooks.some((book) => book.id === YORK_OFFENSIVE_PLAYBOOK_ID)) {
    return playbooks.map((book) =>
      book.id === YORK_OFFENSIVE_PLAYBOOK_ID ? migrateYorkCategories(book) : book,
    );
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
      formation: YORK_PLAY_CATEGORIES[spec.name],
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
    seedCategoryVersion: YORK_CATEGORY_VERSION,
    formations: createYorkCategories(),
    plays,
    createdAt: now,
    updatedAt: now,
  };
}
