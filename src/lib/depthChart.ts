import type { Playbook } from "./playbookTypes";

export const DEFAULT_PLAYER_POSITIONS = ["QB", "WR", "RB", "C", "DB", "RUSH", "LB", "ATH"];

export function getPlayerPositions(player: { positions?: unknown; position?: unknown }): string[] {
  const values = Array.isArray(player.positions) && player.positions.length ? player.positions : [player.position];
  const positions = [...new Set(values.filter((value): value is string => typeof value === "string" && !!value.trim()).map((value) => value.trim()))];
  return positions.length ? positions : ["ATH"];
}

export interface DepthFormation {
  key: string;
  name: string;
  side: "offense" | "defense";
  slots: { id: string; label: string }[];
}

export interface DepthChart {
  id: string;
  name: string;
  formationKey: string;
  assignments: Record<string, string[]>;
}

export interface DepthChartState {
  charts: DepthChart[];
  visibleToPlayers: boolean;
}

export interface DepthChartResponse extends DepthChartState {
  formations: DepthFormation[];
  canEdit: boolean;
}

export function getDepthFormations(playbooks: Playbook[] = []): DepthFormation[] {
  const formations: DepthFormation[] = [];
  for (const book of playbooks) {
    for (const formation of book.formations || []) {
      const side = formation.side || book.type;
      const nodes = formation.players?.length ? formation.players : book.plays?.find((play) => play.formation === formation.name)?.players || [];
      const players = nodes.filter((player) => player.side === side);
      const slots = players.map((player, index) => ({
        id: `${player.id || index}`,
        label: player.label || player.role || `${side === "offense" ? "O" : "D"}${index + 1}`,
      }));
      if (slots.length) formations.push({
        key: `${book.id}:${formation.id}`,
        name: `${book.title} / ${formation.name}`,
        side,
        slots,
      });
    }
  }
  if (formations.length) return formations;
  return [
    { key: "default:offense", name: "Default Offense", side: "offense", slots: [
      { id: "QB", label: "Quarterback" }, { id: "WR", label: "Wide Receiver" },
      { id: "RB", label: "Running Back" }, { id: "C", label: "Center" },
    ] },
    { key: "default:defense", name: "Default Defense", side: "defense", slots: [
      { id: "DB", label: "Defensive Back" }, { id: "RUSH", label: "Pass Rusher" },
      { id: "LB", label: "Linebacker" }, { id: "ATH", label: "Athlete / Flex" },
    ] },
  ];
}

/**
 * Charts built on the "Default Offense/Defense" template lose their formation once the team saves
 * its first real formation. Move them onto the first real formation of the same side, keeping each
 * slot's players where the position matches and filling remaining slots in order.
 */
export function migrateDefaultCharts(charts: DepthChart[], formations: DepthFormation[]): { charts: DepthChart[]; migrated: string[] } {
  const known = new Set(formations.map((formation) => formation.key));
  const migrated: string[] = [];
  const next = charts.map((chart) => {
    if (!chart.formationKey.startsWith("default:") || known.has(chart.formationKey)) return chart;
    const side = chart.formationKey === "default:defense" ? "defense" : "offense";
    const target = formations.find((formation) => formation.side === side && !formation.key.startsWith("default:"));
    if (!target) return chart;
    const normalize = (value: string) => value.trim().toUpperCase();
    const free = [...target.slots];
    const assignments: Record<string, string[]> = {};
    const leftovers: string[][] = [];
    for (const [slotId, playerIds] of Object.entries(chart.assignments)) {
      if (!playerIds.length) continue;
      const index = free.findIndex((slot) => normalize(slot.label) === normalize(slotId) || normalize(slot.id) === normalize(slotId));
      if (index >= 0) assignments[free.splice(index, 1)[0].id] = playerIds;
      else leftovers.push(playerIds);
    }
    for (const playerIds of leftovers) {
      const slot = free.shift();
      if (!slot) break;
      assignments[slot.id] = playerIds;
    }
    migrated.push(chart.name);
    return { ...chart, formationKey: target.key, assignments };
  });
  return { charts: next, migrated };
}

export function getFormationPositions(formations: DepthFormation[]): string[] {
  return [...new Set([...DEFAULT_PLAYER_POSITIONS, ...formations.filter((formation) => !formation.key.startsWith("default:")).flatMap((formation) => formation.slots.map((slot) => slot.label).filter((label) => label.length <= 20))])];
}

export function validateDepthCharts(value: unknown): value is DepthChartState {
  if (!value || typeof value !== "object") return false;
  const state = value as DepthChartState;
  if (typeof state.visibleToPlayers !== "boolean" || !Array.isArray(state.charts) || state.charts.length > 20) return false;
  const ids = new Set<string>();
  return state.charts.every((chart) => {
    if (!chart || typeof chart.id !== "string" || !/^[\w-]{1,100}$/.test(chart.id) || ids.has(chart.id) ||
      typeof chart.name !== "string" || !chart.name.trim() || chart.name.length > 100 ||
      typeof chart.formationKey !== "string" || chart.formationKey.length > 220 ||
      !chart.assignments || typeof chart.assignments !== "object" || Array.isArray(chart.assignments) ||
      Object.keys(chart.assignments).length > 16) return false;
    ids.add(chart.id);
    return Object.entries(chart.assignments).every(([key, players]) =>
      key.length > 0 && key.length <= 128 && Array.isArray(players) && players.length <= 30 &&
      new Set(players).size === players.length &&
      players.every((id) => typeof id === "string" && /^[^/]{1,128}$/.test(id)));
  });
}
