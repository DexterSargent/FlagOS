"use client";

import { DEFAULT_LEAGUE_SETTINGS, LeagueSettings } from "./leagueContext";

export interface DemoTeam {
  id: string;
  name: string;
  color?: string;
  createdAt?: string;
}

export interface DemoPlayer {
  id: string;
  teamId: string;
  playerName: string;
  number?: string;
  position?: string;
  positions?: string[];
  experience?: string;
  status?: string;
  preferredTeammateNames?: string[];
  email?: string;
  emails?: string[];
  joinedAt?: string;
}

export interface DemoMatch {
  id: string;
  week: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId: string;
  awayTeamId: string;
  date: string;
  time: string;
  location: string;
  status: "scheduled" | "upcoming" | "in_progress" | "completed";
  homeScore?: number;
  awayScore?: number;
  matchdayIndex: number;
  order?: number;
  isPreseason?: boolean;
  isAsyncStatKeeping?: boolean;
  isIndependent?: boolean;
  managingTeamId?: string;
  subs?: string[];
  matchState?: any;
}

export interface DemoPlay {
  id: string;
  matchId: string;
  possessionTeamId: string;
  playType: "Pass" | "Run" | "Penalty";
  down?: number;
  firstDown?: boolean;
  qbPlayerId?: string | null;
  receiverPlayerId?: string | null;
  runnerPlayerId?: string | null;
  passOutcome?: string;
  isTouchdown?: boolean;
  isPick6?: boolean;
  isSafety?: boolean;
  turnover?: boolean;
  defenders?: string[];
  flaggers?: string[];
  points?: number;
  result?: string;
  notes?: string;
  timestamp?: string;
  half?: number;
  gameClock?: number;
}

// ---------------------------------------------------------------------------
// Pristine Default Demo Seed Data
// ---------------------------------------------------------------------------

export const SEED_DEMO_TEAMS: DemoTeam[] = [
  { id: "team_apex", name: "Apex Predators", color: "#06B6D4" },
  { id: "team_cyber", name: "Cyber Knights", color: "#8B5CF6" },
  { id: "team_raptors", name: "Neon Raptors", color: "#10B981" },
  { id: "team_vipers", name: "Iron Vipers", color: "#F59E0B" },
  { id: "team_free_agents", name: "Free Agent", color: "#64748B" },
];

export const SEED_DEMO_PLAYERS: DemoPlayer[] = [
  // Apex Predators (7 players)
  { id: "p_apx_1", teamId: "team_apex", playerName: "Marcus Vance", number: "7", position: "QB", positions: ["QB"], status: "Active" },
  { id: "p_apx_2", teamId: "team_apex", playerName: "Jordan Reed", number: "11", position: "WR", positions: ["WR"], status: "Active" },
  { id: "p_apx_3", teamId: "team_apex", playerName: "Tyler Brooks", number: "88", position: "WR", positions: ["WR"], status: "Active" },
  { id: "p_apx_4", teamId: "team_apex", playerName: "Devonte Cole", number: "24", position: "DB", positions: ["DB"], status: "Active" },
  { id: "p_apx_5", teamId: "team_apex", playerName: "Malik Sterling", number: "99", position: "RUSH", positions: ["RUSH"], status: "Active" },
  { id: "p_apx_6", teamId: "team_apex", playerName: "Chris Paulson", number: "17", position: "ATH", positions: ["ATH", "WR"], status: "Active" },
  { id: "p_apx_7", teamId: "team_apex", playerName: "David Chen", number: "3", position: "DB", positions: ["DB"], status: "Active" },

  // Cyber Knights (6 players)
  { id: "p_cyb_1", teamId: "team_cyber", playerName: "Jaxson Hayes", number: "12", position: "QB", positions: ["QB"], status: "Active" },
  { id: "p_cyb_2", teamId: "team_cyber", playerName: "Liam Walker", number: "1", position: "WR", positions: ["WR"], status: "Active" },
  { id: "p_cyb_3", teamId: "team_cyber", playerName: "Elijah Moore", number: "80", position: "WR", positions: ["WR"], status: "Active" },
  { id: "p_cyb_4", teamId: "team_cyber", playerName: "Trey Simmons", number: "21", position: "DB", positions: ["DB"], status: "Active" },
  { id: "p_cyb_5", teamId: "team_cyber", playerName: "Xavier Cruz", number: "55", position: "RUSH", positions: ["RUSH"], status: "Active" },
  { id: "p_cyb_6", teamId: "team_cyber", playerName: "Brandon Ortiz", number: "8", position: "ATH", positions: ["ATH", "DB"], status: "Active" },

  // Neon Raptors (6 players)
  { id: "p_rap_1", teamId: "team_raptors", playerName: "Kaelen Morris", number: "5", position: "QB", positions: ["QB"], status: "Active" },
  { id: "p_rap_2", teamId: "team_raptors", playerName: "Austin Ray", number: "84", position: "WR", positions: ["WR"], status: "Active" },
  { id: "p_rap_3", teamId: "team_raptors", playerName: "Caleb King", number: "19", position: "WR", positions: ["WR"], status: "Active" },
  { id: "p_rap_4", teamId: "team_raptors", playerName: "Dominic West", number: "23", position: "DB", positions: ["DB"], status: "Active" },
  { id: "p_rap_5", teamId: "team_raptors", playerName: "Isaiah Green", number: "90", position: "RUSH", positions: ["RUSH"], status: "Active" },
  { id: "p_rap_6", teamId: "team_raptors", playerName: "Sean Miller", number: "14", position: "ATH", positions: ["ATH", "WR"], status: "Active" },

  // Iron Vipers (6 players)
  { id: "p_vip_1", teamId: "team_vipers", playerName: "Damon Knight", number: "9", position: "QB", positions: ["QB"], status: "Active" },
  { id: "p_vip_2", teamId: "team_vipers", playerName: "Bryce Howard", number: "81", position: "WR", positions: ["WR"], status: "Active" },
  { id: "p_vip_3", teamId: "team_vipers", playerName: "Cameron Diaz", number: "10", position: "WR", positions: ["WR"], status: "Active" },
  { id: "p_vip_4", teamId: "team_vipers", playerName: "Andre Washington", number: "25", position: "DB", positions: ["DB"], status: "Active" },
  { id: "p_vip_5", teamId: "team_vipers", playerName: "Victor Rossi", number: "95", position: "RUSH", positions: ["RUSH"], status: "Active" },
  { id: "p_vip_6", teamId: "team_vipers", playerName: "Nate Campbell", number: "4", position: "ATH", positions: ["ATH", "DB"], status: "Active" },

  // Free Agents Pool (3 athletes)
  {
    id: "p_fa_1",
    teamId: "team_free_agents",
    playerName: "Leo Bennett",
    position: "WR",
    positions: ["WR"],
    experience: "3 years competitive flag football, former varsity WR",
    status: "Free Agent",
    preferredTeammateNames: ["Marcus Vance"],
    email: "leo.bennett@example.com",
  },
  {
    id: "p_fa_2",
    teamId: "team_free_agents",
    playerName: "Ethan Ross",
    position: "DB",
    positions: ["DB", "ATH"],
    experience: "College intramural champions safety",
    status: "Free Agent",
    preferredTeammateNames: [],
    email: "ethan.ross@example.com",
  },
  {
    id: "p_fa_3",
    teamId: "team_free_agents",
    playerName: "Maya Lin",
    position: "QB",
    positions: ["QB", "WR"],
    experience: "Metro tournament all-star passer",
    status: "Free Agent",
    preferredTeammateNames: [],
    email: "maya.lin@example.com",
  },
];

export const SEED_DEMO_MATCHES: DemoMatch[] = [
  {
    id: "match_demo_1",
    week: "Week 1",
    homeTeamName: "Apex Predators",
    awayTeamName: "Cyber Knights",
    homeTeamId: "team_apex",
    awayTeamId: "team_cyber",
    date: "2026-10-04",
    time: "18:00",
    location: "Field 1 - Championship Turf",
    status: "completed",
    homeScore: 28,
    awayScore: 20,
    matchdayIndex: 1,
    order: 0,
    isPreseason: false,
  },
  {
    id: "match_demo_2",
    week: "Week 1",
    homeTeamName: "Neon Raptors",
    awayTeamName: "Iron Vipers",
    homeTeamId: "team_raptors",
    awayTeamId: "team_vipers",
    date: "2026-10-04",
    time: "19:15",
    location: "Field 2 - Prime Turf",
    status: "completed",
    homeScore: 21,
    awayScore: 24,
    matchdayIndex: 1,
    order: 1,
    isPreseason: false,
  },
  {
    id: "match_demo_3",
    week: "Week 2",
    homeTeamName: "Apex Predators",
    awayTeamName: "Neon Raptors",
    homeTeamId: "team_apex",
    awayTeamId: "team_raptors",
    date: "2026-10-11",
    time: "18:00",
    location: "Field 1 - Championship Turf",
    status: "upcoming",
    homeScore: 0,
    awayScore: 0,
    matchdayIndex: 2,
    order: 0,
    isPreseason: false,
  },
  {
    id: "match_demo_4",
    week: "Week 2",
    homeTeamName: "Cyber Knights",
    awayTeamName: "Iron Vipers",
    homeTeamId: "team_cyber",
    awayTeamId: "team_vipers",
    date: "2026-10-11",
    time: "19:15",
    location: "Field 2 - Prime Turf",
    status: "upcoming",
    homeScore: 0,
    awayScore: 0,
    matchdayIndex: 2,
    order: 1,
    isPreseason: false,
  },
];

export const SEED_DEMO_PLAYS: DemoPlay[] = [
  // Match 1 Plays (Apex vs Cyber Knights)
  {
    id: "play_1_1",
    matchId: "match_demo_1",
    possessionTeamId: "team_apex",
    playType: "Pass",
    down: 1,
    qbPlayerId: "Marcus Vance",
    receiverPlayerId: "Jordan Reed",
    passOutcome: "Complete",
    isTouchdown: true,
    firstDown: true,
    defenders: ["Trey Simmons"],
    flaggers: [],
    points: 6,
    result: "Touchdown (Pass)",
  },
  {
    id: "play_1_2",
    matchId: "match_demo_1",
    possessionTeamId: "team_apex",
    playType: "Pass",
    qbPlayerId: "Marcus Vance",
    receiverPlayerId: "Tyler Brooks",
    passOutcome: "Complete",
    isTouchdown: false,
    points: 1,
    result: "1-PT Conversion Good",
  },
  {
    id: "play_1_3",
    matchId: "match_demo_1",
    possessionTeamId: "team_cyber",
    playType: "Pass",
    down: 1,
    qbPlayerId: "Jaxson Hayes",
    receiverPlayerId: "Liam Walker",
    passOutcome: "Complete",
    isTouchdown: false,
    firstDown: true,
    defenders: ["Devonte Cole"],
    flaggers: ["Devonte Cole"],
    result: "First Down Pass",
  },
  {
    id: "play_1_4",
    matchId: "match_demo_1",
    possessionTeamId: "team_cyber",
    playType: "Pass",
    down: 2,
    qbPlayerId: "Jaxson Hayes",
    receiverPlayerId: "Elijah Moore",
    passOutcome: "Complete",
    isTouchdown: true,
    firstDown: true,
    defenders: ["David Chen"],
    flaggers: [],
    points: 6,
    result: "Touchdown (Pass)",
  },
  {
    id: "play_1_5",
    matchId: "match_demo_1",
    possessionTeamId: "team_cyber",
    playType: "Pass",
    qbPlayerId: "Jaxson Hayes",
    receiverPlayerId: "Liam Walker",
    passOutcome: "Complete",
    isTouchdown: false,
    points: 2,
    result: "2-PT Conversion Good",
  },
  {
    id: "play_1_6",
    matchId: "match_demo_1",
    possessionTeamId: "team_apex",
    playType: "Pass",
    down: 1,
    qbPlayerId: "Marcus Vance",
    receiverPlayerId: "Tyler Brooks",
    passOutcome: "Complete",
    isTouchdown: true,
    firstDown: true,
    defenders: ["Xavier Cruz"],
    flaggers: [],
    points: 6,
    result: "Touchdown (Pass)",
  },
  {
    id: "play_1_7",
    matchId: "match_demo_1",
    possessionTeamId: "team_apex",
    playType: "Pass",
    qbPlayerId: "Marcus Vance",
    receiverPlayerId: "Jordan Reed",
    passOutcome: "Complete",
    isTouchdown: false,
    points: 1,
    result: "1-PT Conversion Good",
  },
  {
    id: "play_1_8",
    matchId: "match_demo_1",
    possessionTeamId: "team_cyber",
    playType: "Pass",
    down: 3,
    qbPlayerId: "Jaxson Hayes",
    receiverPlayerId: null,
    passOutcome: "Interception",
    turnover: true,
    defenders: ["Devonte Cole"],
    flaggers: ["Devonte Cole"],
    result: "Interception by Devonte Cole",
  },
  {
    id: "play_1_9",
    matchId: "match_demo_1",
    possessionTeamId: "team_apex",
    playType: "Run",
    down: 1,
    runnerPlayerId: "Marcus Vance",
    isTouchdown: true,
    firstDown: true,
    defenders: ["Xavier Cruz"],
    flaggers: [],
    points: 6,
    result: "Touchdown (Run)",
  },
  {
    id: "play_1_10",
    matchId: "match_demo_1",
    possessionTeamId: "team_apex",
    playType: "Pass",
    qbPlayerId: "Marcus Vance",
    receiverPlayerId: "Chris Paulson",
    passOutcome: "Complete",
    points: 2,
    result: "2-PT Conversion Good",
  },
  {
    id: "play_1_11",
    matchId: "match_demo_1",
    possessionTeamId: "team_cyber",
    playType: "Pass",
    down: 2,
    qbPlayerId: "Jaxson Hayes",
    receiverPlayerId: "Liam Walker",
    passOutcome: "Complete",
    isTouchdown: true,
    firstDown: true,
    defenders: ["David Chen"],
    flaggers: [],
    points: 6,
    result: "Touchdown (Pass)",
  },

  // Match 2 Plays (Neon Raptors vs Iron Vipers)
  {
    id: "play_2_1",
    matchId: "match_demo_2",
    possessionTeamId: "team_raptors",
    playType: "Pass",
    down: 1,
    qbPlayerId: "Kaelen Morris",
    receiverPlayerId: "Austin Ray",
    passOutcome: "Complete",
    isTouchdown: true,
    firstDown: true,
    defenders: ["Andre Washington"],
    points: 6,
    result: "Touchdown (Pass)",
  },
  {
    id: "play_2_2",
    matchId: "match_demo_2",
    possessionTeamId: "team_vipers",
    playType: "Pass",
    down: 1,
    qbPlayerId: "Damon Knight",
    receiverPlayerId: "Bryce Howard",
    passOutcome: "Complete",
    isTouchdown: true,
    firstDown: true,
    defenders: ["Dominic West"],
    points: 6,
    result: "Touchdown (Pass)",
  },
  {
    id: "play_2_3",
    matchId: "match_demo_2",
    possessionTeamId: "team_vipers",
    playType: "Pass",
    qbPlayerId: "Damon Knight",
    receiverPlayerId: "Cameron Diaz",
    passOutcome: "Complete",
    points: 2,
    result: "2-PT Conversion Good",
  },
  {
    id: "play_2_4",
    matchId: "match_demo_2",
    possessionTeamId: "team_raptors",
    playType: "Pass",
    down: 2,
    qbPlayerId: "Kaelen Morris",
    receiverPlayerId: "Caleb King",
    passOutcome: "Complete",
    isTouchdown: true,
    firstDown: true,
    defenders: ["Victor Rossi"],
    points: 6,
    result: "Touchdown (Pass)",
  },
  {
    id: "play_2_5",
    matchId: "match_demo_2",
    possessionTeamId: "team_vipers",
    playType: "Pass",
    down: 4,
    qbPlayerId: "Damon Knight",
    receiverPlayerId: "Cameron Diaz",
    passOutcome: "Complete",
    isTouchdown: true,
    firstDown: true,
    defenders: ["Isaiah Green"],
    points: 6,
    result: "Touchdown (Pass)",
  },
  {
    id: "play_2_6",
    matchId: "match_demo_2",
    possessionTeamId: "team_vipers",
    playType: "Pass",
    qbPlayerId: "Damon Knight",
    receiverPlayerId: "Bryce Howard",
    passOutcome: "Complete",
    points: 2,
    result: "2-PT Conversion Good",
  },
];

// ---------------------------------------------------------------------------
// Session Storage Keys & Helper Functions
// ---------------------------------------------------------------------------

const KEY_INIT = "flagos_demo_initialized";
const KEY_SETTINGS = "flagos_demo_settings";
const KEY_TEAMS = "flagos_demo_teams";
const KEY_PLAYERS = "flagos_demo_players";
const KEY_MATCHES = "flagos_demo_matches";
const KEY_PLAYS = "flagos_demo_plays";
const KEY_ROLE = "demo_dev_role";
const KEY_TEAM_ID = "demo_managed_team_id";
const KEY_PLAYER_ID = "demo_player_id";
const KEY_PLAYER_DATA = "demo_player_data";

export const DEMO_EVENT = "flagos_demo_sandbox_updated";

export const isDemoLeague = (leagueId?: string | null): boolean => {
  if (!leagueId) return true;
  return leagueId === "default" || leagueId === "demo";
};

export const initDemoSandbox = (): void => {
  if (typeof window === "undefined") return;

  const initialized = sessionStorage.getItem(KEY_INIT);
  if (!initialized) {
    sessionStorage.setItem(KEY_INIT, "true");
    sessionStorage.setItem(KEY_SETTINGS, JSON.stringify(DEFAULT_LEAGUE_SETTINGS));
    sessionStorage.setItem(KEY_TEAMS, JSON.stringify(SEED_DEMO_TEAMS));
    sessionStorage.setItem(KEY_PLAYERS, JSON.stringify(SEED_DEMO_PLAYERS));
    sessionStorage.setItem(KEY_MATCHES, JSON.stringify(SEED_DEMO_MATCHES));
    sessionStorage.setItem(KEY_PLAYS, JSON.stringify(SEED_DEMO_PLAYS));
  }
};

export const resetDemoSession = (): void => {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem(KEY_INIT);
  sessionStorage.removeItem(KEY_SETTINGS);
  sessionStorage.removeItem(KEY_TEAMS);
  sessionStorage.removeItem(KEY_PLAYERS);
  sessionStorage.removeItem(KEY_MATCHES);
  sessionStorage.removeItem(KEY_PLAYS);
  sessionStorage.removeItem(KEY_ROLE);
  sessionStorage.removeItem(KEY_TEAM_ID);
  sessionStorage.removeItem(KEY_PLAYER_ID);
  sessionStorage.removeItem(KEY_PLAYER_DATA);

  // Reinitialize pristine state
  initDemoSandbox();

  // Notify all components in the active tab to re-sync
  window.dispatchEvent(new CustomEvent(DEMO_EVENT));
};

export const notifySandboxChange = (): void => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DEMO_EVENT));
  }
};

export const subscribeDemoSandbox = (callback: () => void): (() => void) => {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(DEMO_EVENT, handler);
  return () => window.removeEventListener(DEMO_EVENT, handler);
};

// ---------------------------------------------------------------------------
// Settings Get / Set
// ---------------------------------------------------------------------------

export const getSandboxSettings = (): LeagueSettings => {
  initDemoSandbox();
  if (typeof window === "undefined") return DEFAULT_LEAGUE_SETTINGS;
  const raw = sessionStorage.getItem(KEY_SETTINGS);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {}
  }
  return DEFAULT_LEAGUE_SETTINGS;
};

export const updateSandboxSettings = (newSettings: Partial<LeagueSettings>): LeagueSettings => {
  const current = getSandboxSettings();
  const merged: LeagueSettings = {
    ...current,
    ...newSettings,
    rules: { ...current.rules, ...(newSettings.rules || {}) },
  };
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY_SETTINGS, JSON.stringify(merged));
    notifySandboxChange();
  }
  return merged;
};

// ---------------------------------------------------------------------------
// Teams CRUD
// ---------------------------------------------------------------------------

export const getSandboxTeams = (): DemoTeam[] => {
  initDemoSandbox();
  if (typeof window === "undefined") return SEED_DEMO_TEAMS;
  const raw = sessionStorage.getItem(KEY_TEAMS);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {}
  }
  return SEED_DEMO_TEAMS;
};

export const addSandboxTeam = (name: string): DemoTeam => {
  const teams = getSandboxTeams();
  const newTeam: DemoTeam = {
    id: `team_${Date.now()}`,
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };
  const updated = [...teams, newTeam].sort((a, b) => a.name.localeCompare(b.name));
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY_TEAMS, JSON.stringify(updated));
    notifySandboxChange();
  }
  return newTeam;
};

export const updateSandboxTeam = (id: string, name: string): void => {
  const teams = getSandboxTeams();
  const updated = teams
    .map((t) => (t.id === id ? { ...t, name: name.trim() } : t))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY_TEAMS, JSON.stringify(updated));
    notifySandboxChange();
  }
};

export const deleteSandboxTeam = (id: string): void => {
  const teams = getSandboxTeams().filter((t) => t.id !== id);
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY_TEAMS, JSON.stringify(teams));
    notifySandboxChange();
  }
};

// ---------------------------------------------------------------------------
// Players CRUD
// ---------------------------------------------------------------------------

export const getSandboxPlayers = (): DemoPlayer[] => {
  initDemoSandbox();
  if (typeof window === "undefined") return SEED_DEMO_PLAYERS;
  const raw = sessionStorage.getItem(KEY_PLAYERS);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {}
  }
  return SEED_DEMO_PLAYERS;
};

export const addSandboxPlayer = (player: Partial<DemoPlayer>): DemoPlayer => {
  const players = getSandboxPlayers();
  const newP: DemoPlayer = {
    id: `player_${Date.now()}`,
    teamId: player.teamId || "team_free_agents",
    playerName: player.playerName || "New Player",
    number: player.number || "00",
    position: player.position || "ATH",
    positions: player.positions || [player.position || "ATH"],
    status: player.status || "Active",
    experience: player.experience,
    preferredTeammateNames: player.preferredTeammateNames,
    email: player.email,
    joinedAt: new Date().toISOString(),
  };
  const updated = [...players, newP];
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY_PLAYERS, JSON.stringify(updated));
    notifySandboxChange();
  }
  return newP;
};

export const updateSandboxPlayer = (id: string, data: Partial<DemoPlayer>): void => {
  const players = getSandboxPlayers();
  const updated = players.map((p) => (p.id === id ? { ...p, ...data } : p));
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY_PLAYERS, JSON.stringify(updated));
    notifySandboxChange();
  }
};

export const deleteSandboxPlayer = (id: string): void => {
  const players = getSandboxPlayers().filter((p) => p.id !== id);
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY_PLAYERS, JSON.stringify(players));
    notifySandboxChange();
  }
};

// ---------------------------------------------------------------------------
// Matches CRUD
// ---------------------------------------------------------------------------

export const getSandboxMatches = (): DemoMatch[] => {
  initDemoSandbox();
  if (typeof window === "undefined") return SEED_DEMO_MATCHES;
  const raw = sessionStorage.getItem(KEY_MATCHES);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {}
  }
  return SEED_DEMO_MATCHES;
};

export const addSandboxMatch = (match: Partial<DemoMatch>): DemoMatch => {
  const matches = getSandboxMatches();
  const teams = getSandboxTeams();
  const homeT = teams.find((t) => t.id === match.homeTeamId);
  const awayT = teams.find((t) => t.id === match.awayTeamId);

  const newMatch: DemoMatch = {
    id: `match_${Date.now()}`,
    week: match.week || "Week 1",
    homeTeamName: homeT?.name || match.homeTeamName || "Home Team",
    awayTeamName: awayT?.name || match.awayTeamName || "Away Team",
    homeTeamId: match.homeTeamId || "",
    awayTeamId: match.awayTeamId || "",
    date: match.date || new Date().toISOString().split("T")[0],
    time: match.time || "18:00",
    location: match.location || "Field 1",
    status: match.status || "scheduled",
    homeScore: match.homeScore ?? 0,
    awayScore: match.awayScore ?? 0,
    matchdayIndex: match.matchdayIndex || 1,
    order: match.order ?? matches.length,
    isPreseason: match.isPreseason ?? false,
    isAsyncStatKeeping: match.isAsyncStatKeeping,
    isIndependent: match.isIndependent,
    managingTeamId: match.managingTeamId,
  };

  const updated = [...matches, newMatch];
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY_MATCHES, JSON.stringify(updated));
    notifySandboxChange();
  }
  return newMatch;
};

export const updateSandboxMatch = (id: string, data: Partial<DemoMatch>): void => {
  const matches = getSandboxMatches();
  const teams = getSandboxTeams();
  const updated = matches.map((m) => {
    if (m.id === id) {
      const merged = { ...m, ...data };
      if (data.homeTeamId && !data.homeTeamName) {
        merged.homeTeamName = teams.find((t) => t.id === data.homeTeamId)?.name || m.homeTeamName;
      }
      if (data.awayTeamId && !data.awayTeamName) {
        merged.awayTeamName = teams.find((t) => t.id === data.awayTeamId)?.name || m.awayTeamName;
      }
      return merged;
    }
    return m;
  });
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY_MATCHES, JSON.stringify(updated));
    notifySandboxChange();
  }
};

export const deleteSandboxMatch = (id: string): void => {
  const matches = getSandboxMatches().filter((m) => m.id !== id);
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY_MATCHES, JSON.stringify(matches));
    notifySandboxChange();
  }
};

// ---------------------------------------------------------------------------
// Plays CRUD
// ---------------------------------------------------------------------------

export const getSandboxPlays = (matchId?: string): DemoPlay[] => {
  initDemoSandbox();
  if (typeof window === "undefined") return SEED_DEMO_PLAYS;
  const raw = sessionStorage.getItem(KEY_PLAYS);
  let all: DemoPlay[] = SEED_DEMO_PLAYS;
  if (raw) {
    try {
      all = JSON.parse(raw);
    } catch {}
  }
  if (matchId) {
    return all.filter((p) => p.matchId === matchId);
  }
  return all;
};

export const addSandboxPlay = (play: Partial<DemoPlay>): DemoPlay => {
  const plays = getSandboxPlays();
  const newPlay: DemoPlay = {
    id: `play_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    matchId: play.matchId || "",
    possessionTeamId: play.possessionTeamId || "",
    playType: play.playType || "Pass",
    down: play.down,
    firstDown: play.firstDown,
    qbPlayerId: play.qbPlayerId,
    receiverPlayerId: play.receiverPlayerId,
    runnerPlayerId: play.runnerPlayerId,
    passOutcome: play.passOutcome,
    isTouchdown: play.isTouchdown,
    isPick6: play.isPick6,
    isSafety: play.isSafety,
    turnover: play.turnover,
    defenders: play.defenders,
    flaggers: play.flaggers,
    points: play.points,
    result: play.result,
    notes: play.notes,
    timestamp: new Date().toISOString(),
    half: play.half,
    gameClock: play.gameClock,
  };
  const updated = [...plays, newPlay];
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY_PLAYS, JSON.stringify(updated));
    notifySandboxChange();
  }
  return newPlay;
};

export const deleteSandboxPlaysForMatch = (matchId: string): void => {
  const plays = getSandboxPlays().filter((p) => p.matchId !== matchId);
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY_PLAYS, JSON.stringify(plays));
    notifySandboxChange();
  }
};
