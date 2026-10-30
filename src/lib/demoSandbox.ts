"use client";

import { DEFAULT_LEAGUE_SETTINGS, LeagueSettings } from "./leagueContext";
import {
  DemoTeam,
  DemoPlayer,
  DemoMatch,
  DemoPlay,
  SEED_DEMO_TEAMS,
  SEED_DEMO_PLAYERS,
  SEED_DEMO_MATCHES,
  SEED_DEMO_PLAYS,
  DEMO_ROSTER_SOURCE,
  getSeedDemoPlays,
} from "./demoSeedData";
import { getGeneratedSeasonPlays } from "./demoPlayGenerator";
import { DEMO_EVENT, isDemoLeague, isDemoMatchId, notifySandboxChange } from "./demoSandboxRuntime";
import { compareByName } from "./sortUtils";
export { DEMO_EVENT, isDemoLeague, notifySandboxChange, subscribeDemoSandbox } from "./demoSandboxRuntime";

export type { DemoTeam, DemoPlayer, DemoMatch, DemoPlay };
export { SEED_DEMO_TEAMS, SEED_DEMO_PLAYERS, SEED_DEMO_MATCHES, SEED_DEMO_PLAYS, getGeneratedSeasonPlays };

// ---------------------------------------------------------------------------
// Session Storage Keys & Helper Functions
// ---------------------------------------------------------------------------

const KEY_INIT = "flagos_demo_initialized_2026_nfl_v3";
const KEY_TEAM_BRANDING_VERSION = "flagos_demo_team_branding_v2";
const KEY_SETTINGS = "flagos_demo_settings";
const KEY_TEAMS = "flagos_demo_teams";
const KEY_PLAYERS = "flagos_demo_players";
const KEY_ROSTER_SOURCE = "flagos_demo_roster_source";
const KEY_MATCHES = "flagos_demo_matches";
const KEY_PLAYS = "flagos_demo_plays";
const KEY_ROLE = "demo_dev_role";
const KEY_TEAM_ID = "demo_managed_team_id";
const KEY_PLAYER_ID = "demo_player_id";
const KEY_PLAYER_DATA = "demo_player_data";
const KEY_SCHEDULE_BACKUP = "flagos_demo_schedule_backup_v1";

export interface ScheduleBackup {
  matches: any[];
  savedAt: number;
  expiresAt: number;
}

export const isDemoMatch = (matchId?: string | null, leagueId?: string | null): boolean => {
  if (typeof window !== "undefined") {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("embed") === "true" || sp.get("demo") === "true") {
        return true;
      }
    } catch {
      // ignore
    }
  }
  // Persisted matches are real even when they belong to a league-free team.
  if (matchId && !isDemoMatchId(matchId)) return false;
  if (leagueId && !isDemoLeague(leagueId)) return false;
  if (isDemoLeague(leagueId)) return true;
  if (!matchId) return false;
  if (matchId.startsWith("match_live_")) return false;
  if (
    matchId.startsWith("match_demo_") ||
    matchId.startsWith("match_w") ||
    matchId.startsWith("match_playoff_")
  ) {
    return true;
  }
  return !!getSandboxMatch(matchId);
};

export const initDemoSandbox = (): void => {
  if (typeof window === "undefined") return;

  const initialized = sessionStorage.getItem(KEY_INIT);
  if (!initialized) {
    sessionStorage.setItem(KEY_INIT, "true");
    sessionStorage.setItem(KEY_TEAM_BRANDING_VERSION, "1");
    sessionStorage.setItem(KEY_SETTINGS, JSON.stringify(DEFAULT_LEAGUE_SETTINGS));
    sessionStorage.setItem(KEY_TEAMS, JSON.stringify(SEED_DEMO_TEAMS));
    sessionStorage.setItem(KEY_PLAYERS, JSON.stringify(SEED_DEMO_PLAYERS));
    sessionStorage.setItem(KEY_ROSTER_SOURCE, JSON.stringify(DEMO_ROSTER_SOURCE));
    sessionStorage.setItem(KEY_MATCHES, JSON.stringify(SEED_DEMO_MATCHES));
    sessionStorage.setItem(KEY_PLAYS, JSON.stringify(SEED_DEMO_PLAYS));
    return;
  }

  // Ensure individual storage keys exist if completely missing (null)
  if (sessionStorage.getItem(KEY_SETTINGS) === null) {
    sessionStorage.setItem(KEY_SETTINGS, JSON.stringify(DEFAULT_LEAGUE_SETTINGS));
  }
  if (sessionStorage.getItem(KEY_TEAMS) === null) {
    sessionStorage.setItem(KEY_TEAMS, JSON.stringify(SEED_DEMO_TEAMS));
  }
  if (sessionStorage.getItem(KEY_PLAYERS) === null) {
    sessionStorage.setItem(KEY_PLAYERS, JSON.stringify(SEED_DEMO_PLAYERS));
    sessionStorage.setItem(KEY_ROSTER_SOURCE, JSON.stringify(DEMO_ROSTER_SOURCE));
  }
  if (sessionStorage.getItem(KEY_MATCHES) === null) {
    sessionStorage.setItem(KEY_MATCHES, JSON.stringify(SEED_DEMO_MATCHES));
  }
  if (sessionStorage.getItem(KEY_PLAYS) === null) {
    sessionStorage.setItem(KEY_PLAYS, JSON.stringify(SEED_DEMO_PLAYS));
  }

  if (sessionStorage.getItem(KEY_TEAM_BRANDING_VERSION) !== "1") {
    const canonicalTeams = new Map(SEED_DEMO_TEAMS.map((team) => [team.id, team]));
    const rawTeams = sessionStorage.getItem(KEY_TEAMS);
    if (rawTeams) {
      try {
        const teams = JSON.parse(rawTeams) as DemoTeam[];
        sessionStorage.setItem(
          KEY_TEAMS,
          JSON.stringify(teams.map((team) => {
            const canonical = canonicalTeams.get(team.id);
            if (!canonical) return team;
            const primaryColor = team.primaryColor || canonical.primaryColor || canonical.color;
            return {
              ...team,
              name: canonical.name,
              shortcode: canonical.shortcode,
              color: primaryColor,
              primaryColor,
              secondaryColor: team.secondaryColor || canonical.secondaryColor,
              tertiaryColor: team.tertiaryColor || canonical.tertiaryColor,
            };
          }))
        );
      } catch (err) {
        console.error("Failed to migrate demo team branding:", err);
      }
    }
    sessionStorage.setItem(KEY_TEAM_BRANDING_VERSION, "1");
  }
};

export const resetDemoSession = (): void => {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem(KEY_INIT);
  sessionStorage.removeItem(KEY_TEAM_BRANDING_VERSION);
  sessionStorage.removeItem(KEY_SETTINGS);
  sessionStorage.removeItem(KEY_TEAMS);
  sessionStorage.removeItem(KEY_PLAYERS);
  sessionStorage.removeItem(KEY_ROSTER_SOURCE);
  sessionStorage.removeItem(KEY_MATCHES);
  sessionStorage.removeItem(KEY_PLAYS);
  sessionStorage.removeItem(KEY_ROLE);
  sessionStorage.removeItem(KEY_TEAM_ID);
  sessionStorage.removeItem(KEY_PLAYER_ID);
  sessionStorage.removeItem(KEY_PLAYER_DATA);
  sessionStorage.removeItem(KEY_SCHEDULE_BACKUP);

  try {
    localStorage.removeItem(KEY_SCHEDULE_BACKUP);
    localStorage.removeItem("dev_auth_role");
    localStorage.removeItem("dev_managed_team_id");
    localStorage.removeItem("dev_player_id");
    localStorage.removeItem("dev_player_data");
    localStorage.removeItem("flagos_user_colors");
  } catch {}

  // Keep demo active session flag so auth guards preserve access
  sessionStorage.setItem("flagos_demo_active", "true");

  // Reinitialize pristine state
  initDemoSandbox();

  // Notify all components in the active tab to re-sync
  window.dispatchEvent(new CustomEvent(DEMO_EVENT));
};

// ---------------------------------------------------------------------------
// Settings Get / Set
// ---------------------------------------------------------------------------

const DEMO_VENUE_ADDRESS = "70 Canuck Ave, Toronto, ON";
/** Sample public-profile details so the demo shows directions and player info. */
const DEMO_PUBLIC_PROFILE: Partial<LeagueSettings> = {
  venues: [
    { name: "Field 1 - Championship Turf", address: DEMO_VENUE_ADDRESS, notes: "Main entrance off Canuck Ave; free parking in Lot B." },
    { name: "Field 2 - Prime Turf", address: DEMO_VENUE_ADDRESS, notes: "East side of the complex, next to Field 1." },
    { name: "Field 3 - North Turf", address: DEMO_VENUE_ADDRESS, notes: "North end; follow the signs past the pavilion." },
    { name: "Field 4 - South Turf", address: DEMO_VENUE_ADDRESS, notes: "South end, closest to the washrooms." },
  ],
  playerInfo: {
    city: "Toronto, ON",
    venueName: "Downsview Park",
    address: DEMO_VENUE_ADDRESS,
    gameDay: "Sundays",
    gameTime: "9 AM \u2013 4 PM",
    skillLevel: "Recreational & Competitive",
    division: "Co-Ed",
    acceptsFreeAgents: true,
  },
};

export const getSandboxSettings = (): LeagueSettings => {
  initDemoSandbox();
  if (typeof window === "undefined") return { ...DEFAULT_LEAGUE_SETTINGS, ...DEMO_PUBLIC_PROFILE };
  const raw = sessionStorage.getItem(KEY_SETTINGS);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const isLegacyBrandPalette =
        typeof parsed.primaryColor === "string" &&
        parsed.primaryColor.toLowerCase() === DEFAULT_LEAGUE_SETTINGS.primaryColor &&
        typeof parsed.accentColor === "string" &&
        parsed.accentColor.toLowerCase() === "#22c55e" &&
        parsed.themePreset === DEFAULT_LEAGUE_SETTINGS.themePreset;

      if (parsed.primaryColor === "#06B6D4" || isLegacyBrandPalette) {
        if (parsed.primaryColor === "#06B6D4") {
          parsed.primaryColor = DEFAULT_LEAGUE_SETTINGS.primaryColor;
        }
        parsed.accentColor = DEFAULT_LEAGUE_SETTINGS.accentColor;
        parsed.themePreset = DEFAULT_LEAGUE_SETTINGS.themePreset;
        sessionStorage.setItem(KEY_SETTINGS, JSON.stringify(parsed));
      }
      return { ...DEMO_PUBLIC_PROFILE, ...parsed };
    } catch {}
  }
  return { ...DEFAULT_LEAGUE_SETTINGS, ...DEMO_PUBLIC_PROFILE };
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
  const filterActual = (list: DemoTeam[]) =>
    list.filter(
      (t) =>
        !(t as DemoTeam & { isStandalone?: boolean }).isStandalone &&
        t.id !== "team_free_agents" &&
        t.name?.trim().toLowerCase() !== "free agent" &&
        t.name?.trim().toLowerCase() !== "free agents"
    );

  if (typeof window === "undefined") return filterActual(SEED_DEMO_TEAMS);
  const raw = sessionStorage.getItem(KEY_TEAMS);
  if (raw) {
    try {
      return filterActual(JSON.parse(raw));
    } catch {}
  }
  return filterActual(SEED_DEMO_TEAMS);
};

export const addSandboxTeam = (name: string): DemoTeam => {
  const teams = getSandboxTeams();
  const newTeam: DemoTeam = {
    id: `team_${Date.now()}`,
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };
  const updated = [...teams, newTeam].sort(compareByName);
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY_TEAMS, JSON.stringify(updated));
    notifySandboxChange();
  }
  return newTeam;
};

export const updateSandboxTeam = (id: string, updates: string | Partial<DemoTeam>): void => {
  const teams = getSandboxTeams();
  const updated = teams
    .map((t) => {
      if (t.id !== id) return t;
      const normalizedUpdates = typeof updates === "string" ? { name: updates.trim() } : updates;
      return { ...t, ...normalizedUpdates };
    })
    .sort(compareByName);
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

export const getSandboxRosterSource = (): typeof DEMO_ROSTER_SOURCE | null => {
  initDemoSandbox();
  if (typeof window === "undefined") return DEMO_ROSTER_SOURCE;
  const raw = sessionStorage.getItem(KEY_ROSTER_SOURCE);
  if (!raw) return null;
  try {
    const source: unknown = JSON.parse(raw);
    if (source && typeof source === "object" && "season" in source && typeof source.season === "number"
      && "source" in source && source.source === "nflverse"
      && "sourceUrl" in source && source.sourceUrl === DEMO_ROSTER_SOURCE.sourceUrl
      && "sourceUpdatedAt" in source && typeof source.sourceUpdatedAt === "string"
      && Number.isFinite(Date.parse(source.sourceUpdatedAt))) {
      return { season: source.season, source: source.source, sourceUrl: source.sourceUrl, sourceUpdatedAt: source.sourceUpdatedAt };
    }
    throw new Error("Invalid demo roster source metadata.");
  } catch (error) {
    console.error("Could not read demo roster source:", error);
    return null;
  }
};

export const getSandboxPlayers = (): DemoPlayer[] => {
  initDemoSandbox();
  const baseline = SEED_DEMO_PLAYERS;
  if (typeof window === "undefined") return baseline;
  const raw = sessionStorage.getItem(KEY_PLAYERS);
  if (raw) {
    try {
      const stored = JSON.parse(raw);
      return stored;
    } catch {}
  }
  return baseline;
};

export const addSandboxPlayer = (player: Partial<DemoPlayer>): DemoPlayer => {
  const players = getSandboxPlayers();
  const newP: DemoPlayer = {
    id: `player_${Date.now()}`,
    teamId: player.teamId || "",
    playerName: player.playerName || "New Player",
    number: player.number || "00",
    position: player.position || "ATH",
    positions: player.positions || [player.position || "ATH"],
    status: player.status || (player.teamId ? "Active" : "Free Agent"),
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
  let list = SEED_DEMO_MATCHES;
  if (typeof window !== "undefined") {
    const raw = sessionStorage.getItem(KEY_MATCHES);
    if (raw) {
      try {
        list = JSON.parse(raw);
      } catch {}
    }
  }

  // Strict deduplication by match ID and matchup (week, home, away)
  const seenIds = new Set<string>();
  const seenMatchups = new Set<string>();
  const deduplicated: DemoMatch[] = [];

  for (const m of list) {
    if (
      m.id === "match_demo_1" ||
      m.id === "match_demo_3"
    ) continue;
    const matchupKey = `${m.week || ""}_${m.homeTeamId || ""}_${m.awayTeamId || ""}`;
    if (!seenIds.has(m.id) && !seenMatchups.has(matchupKey)) {
      seenIds.add(m.id);
      seenMatchups.add(matchupKey);
      deduplicated.push(m);
    }
  }
  const teamNames = new Map(getSandboxTeams().map((team) => [team.id, team.name]));
  return deduplicated.map((match) => ({
    ...match,
    homeTeamName: teamNames.get(match.homeTeamId) || match.homeTeamName,
    awayTeamName: teamNames.get(match.awayTeamId) || match.awayTeamName,
    // Seeded showcase games have a simulated scorekeeper until a visitor opens and exits the manager.
    ...(SIMULATED_LIVE_MATCH_IDS.has(match.id) ? { simulatedScorekeeper: match.simulatedScorekeeper !== false } : {}),
  }));
};

const SIMULATED_LIVE_MATCH_IDS = new Set(["match_w16_11", "match_w16_12"]);

export const getSandboxMatch = (id: string): DemoMatch | undefined => {
  const matches = getSandboxMatches();
  const canonicalId = id === "match_demo_1" ? "match_w16_11" : id === "match_demo_3" ? "match_w16_12" : id;
  const m = matches.find((match) => match.id === canonicalId || match.id === id);
  if (m) return m;
  return undefined;
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
  const targetId = id === "match_demo_1" ? "match_w16_11" : id === "match_demo_3" ? "match_w16_12" : id;
  const updated = matches.map((m) => {
    if (m.id === id || m.id === targetId) {
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

export const setSandboxMatches = (matches: DemoMatch[]): void => {
  initDemoSandbox();
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY_MATCHES, JSON.stringify(matches));
    notifySandboxChange();
  }
};

export const clearSandboxMatches = (): void => {
  initDemoSandbox();
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY_MATCHES, JSON.stringify([]));
    notifySandboxChange();
  }
};

// ---------------------------------------------------------------------------
// Plays CRUD
// ---------------------------------------------------------------------------

export const getSandboxPlays = (matchId?: string): DemoPlay[] => {
  initDemoSandbox();
  const players = getSandboxPlayers();
  const baselineSeasonPlays = getGeneratedSeasonPlays(players);
  const combinedBaseline = [...baselineSeasonPlays, ...getSeedDemoPlays(players)];

  if (typeof window === "undefined") {
    if (matchId) {
      const targetId = matchId === "match_demo_1" ? "match_w16_11" : matchId === "match_demo_3" ? "match_w16_12" : matchId;
      const reverseAlias = matchId === "match_w16_11" ? "match_demo_1" : matchId === "match_w16_12" ? "match_demo_3" : matchId;
      return combinedBaseline.filter((p) => p.matchId === matchId || p.matchId === targetId || p.matchId === reverseAlias);
    }
    return combinedBaseline;
  }

  const raw = sessionStorage.getItem(KEY_PLAYS);
  let sessionPlays: DemoPlay[] = [];
  if (raw) {
    try {
      sessionPlays = JSON.parse(raw);
    } catch {}
  }

  // Combine baseline season plays with session additions/overrides
  const playMap = new Map<string, DemoPlay>();
  combinedBaseline.forEach((p) => playMap.set(p.id, p));
  sessionPlays.forEach((p) => playMap.set(p.id, p));
  const all = Array.from(playMap.values());

  if (matchId) {
    const targetId = matchId === "match_demo_1" ? "match_w16_11" : matchId === "match_demo_3" ? "match_w16_12" : matchId;
    const reverseAlias = matchId === "match_w16_11" ? "match_demo_1" : matchId === "match_w16_12" ? "match_demo_3" : matchId;
    return all.filter((p) => p.matchId === matchId || p.matchId === targetId || p.matchId === reverseAlias);
  }
  return all;
};

export const addSandboxPlay = (play: Partial<DemoPlay> & Record<string, any>): DemoPlay => {
  const plays = getSandboxPlays();
  const calculatedPoints =
    play.points !== undefined
      ? play.points
      : play.pointsScored !== undefined
      ? play.pointsScored
      : play.isSafety
      ? 2
      : play.isTouchdown || play.isPick6
      ? 6
      : 0;

  const newPlay: DemoPlay & Record<string, any> = {
    ...play,
    id: play.id || `play_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
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
    defenders: play.defenders || [],
    flaggers: play.flaggers || [],
    points: calculatedPoints,
    result: play.result,
    notes: play.notes,
    timestamp: play.timestamp || new Date().toISOString(),
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

export const deleteSandboxPlay = (playId: string): void => {
  const plays = getSandboxPlays().filter((p) => p.id !== playId);
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY_PLAYS, JSON.stringify(plays));
    notifySandboxChange();
  }
};

export const removeLastSandboxPlay = (matchId: string): DemoPlay | null => {
  const allPlays = getSandboxPlays();
  const matchPlays = allPlays.filter((p) => p.matchId === matchId);
  if (matchPlays.length === 0) return null;
  const lastPlay = matchPlays[matchPlays.length - 1];
  const updated = allPlays.filter((p) => p.id !== lastPlay.id);
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY_PLAYS, JSON.stringify(updated));
    notifySandboxChange();
  }
  return lastPlay;
};

export const deleteSandboxPlaysForMatch = (matchId: string): void => {
  const plays = getSandboxPlays().filter((p) => p.matchId !== matchId);
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY_PLAYS, JSON.stringify(plays));
    notifySandboxChange();
  }
};

// ---------------------------------------------------------------------------
// 24-Hour Schedule Overwrite Backup (Single Snapshot)
// ---------------------------------------------------------------------------

export const saveSandboxScheduleBackup = (matches: any[]): ScheduleBackup | null => {
  if (typeof window === "undefined" || !matches || matches.length === 0) return null;
  const now = Date.now();
  const backup: ScheduleBackup = {
    matches,
    savedAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000, // Strictly 24 hours
  };
  try {
    // Save to localStorage so it survives tab closes for 24h
    localStorage.setItem(KEY_SCHEDULE_BACKUP, JSON.stringify(backup));
    sessionStorage.setItem(KEY_SCHEDULE_BACKUP, JSON.stringify(backup));
    notifySandboxChange();
    return backup;
  } catch (err) {
    console.error("Failed to save schedule backup:", err);
    return null;
  }
};

export const getSandboxScheduleBackup = (): ScheduleBackup | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem(KEY_SCHEDULE_BACKUP) ||
      sessionStorage.getItem(KEY_SCHEDULE_BACKUP);
    if (!raw) return null;
    const backup: ScheduleBackup = JSON.parse(raw);
    if (!backup || !Array.isArray(backup.matches) || !backup.expiresAt) {
      clearSandboxScheduleBackup();
      return null;
    }
    // Check 24-hour expiration
    if (Date.now() > backup.expiresAt) {
      clearSandboxScheduleBackup();
      return null;
    }
    return backup;
  } catch (err) {
    console.error("Error reading schedule backup:", err);
    return null;
  }
};

export const restoreSandboxScheduleBackup = (): boolean => {
  const backup = getSandboxScheduleBackup();
  if (!backup || !backup.matches || backup.matches.length === 0) return false;
  setSandboxMatches(backup.matches);
  clearSandboxScheduleBackup();
  return true;
};

export const clearSandboxScheduleBackup = (): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY_SCHEDULE_BACKUP);
    sessionStorage.removeItem(KEY_SCHEDULE_BACKUP);
    notifySandboxChange();
  } catch (err) {
    console.error("Error clearing schedule backup:", err);
  }
};
