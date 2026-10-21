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
