// Shared demo signals must not pull fixture data into production startup.
export const DEMO_EVENT = "flagos_demo_sandbox_updated";
export const loadDemoSandbox = () => import("./demoSandbox");

export const isDemoLeague = (leagueId?: string | null): boolean => {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (params.get("embed") === "true" || params.get("demo") === "true") return true;
  }
  return !leagueId || leagueId === "default" || leagueId === "demo";
};

export const notifySandboxChange = (): void => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(DEMO_EVENT));
};

export const subscribeDemoSandbox = (callback: () => void): (() => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(DEMO_EVENT, callback);
  return () => window.removeEventListener(DEMO_EVENT, callback);
};

export const DEMO_TEAM_IDS = [
  "team_buf", "team_mia", "team_ne", "team_nye", "team_bal", "team_cin", "team_cle", "team_pit",
  "team_hou", "team_ind", "team_jax", "team_ten", "team_kc", "team_den", "team_lv", "team_lac",
  "team_dal", "team_phi", "team_nyg", "team_was", "team_chi", "team_det", "team_gb", "team_min",
  "team_atl", "team_car", "team_no", "team_tb", "team_ari", "team_lar", "team_sf", "team_sea",
];

/** Demo fixtures use `team_*` ids; real Firestore teams use generated ids. */
export function isDemoTeamId(teamId?: string | null): boolean {
  if (!teamId) return true;
  return teamId === "demo" || (teamId.startsWith("team_") && !teamId.startsWith("team_live_"));
}

/** Demo and sandbox matches use `match_*` fixture prefixes; persisted matches do not. */
export function isDemoMatchId(matchId?: string | null): boolean {
  if (!matchId) return true;
  return /^match_(demo_|w|playoff_|auto_|\d)/.test(matchId);
}

/** Independent (non-league) teams own their settings and are never demo data. */
export function isStandaloneTeam(record?: object | null): boolean {
  if (!record) return false;
  const team = record as { isStandalone?: unknown; leagueId?: unknown; subscription?: { status?: unknown } };
  if (team.isStandalone === true) return true;
  return !team.leagueId && team.subscription?.status === "active";
}

// The persona simulator only belongs to demo league pages.
export function isDemoLeaguePagePath(pathname: string | null): boolean {
  if (!pathname || pathname.includes("/play-by-play")) return false;
  return pathname === "/league" || pathname.startsWith("/league/") ||
    pathname === "/schedule" || pathname === "/stats" ||
    pathname === "/teams" || pathname.startsWith("/teams/") ||
    pathname.startsWith("/matches/") || pathname === "/join" || pathname.startsWith("/join/");
}
