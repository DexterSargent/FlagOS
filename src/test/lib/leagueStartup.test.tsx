import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_LEAGUE_SETTINGS, LeagueProvider, reconcileUserLeagues, useLeague, type UserLeagueSummary } from "@/lib/leagueContext";

const mocks = vi.hoisted(() => ({
  pathname: "/teams/falcons",
  getDoc: vi.fn(),
  sandboxSettings: vi.fn(),
}));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, collection, id) => ({ collection, id })),
  getDoc: mocks.getDoc,
  setDoc: vi.fn(),
}));
vi.mock("@/lib/demoSandbox", () => ({
  getSandboxSettings: mocks.sandboxSettings,
}));
function Probe() {
  const league = useLeague();
  return <output>{JSON.stringify({
    id: league.activeLeagueId, name: league.settings.leagueName,
    demo: league.isDemoLeague, loading: league.loading,
    leagues: league.userLeagues.map((l) => l.id),
  })}</output>;
}
const state = () => JSON.parse(screen.getByRole("status").textContent!);

describe("Route-scoped league startup", () => {
  beforeEach(() => {
    mocks.pathname = "/teams/falcons";
    mocks.sandboxSettings.mockReturnValue(DEFAULT_LEAGUE_SETTINGS);
    mocks.getDoc.mockImplementation(async ({ collection, id }) => ({
      id, exists: () => true,
      data: () => collection === "teams" ? { name: "Falcons", subscription: { status: "active" } }
        : collection === "matches" ? { managingTeamId: "falcons" } : { leagueName: "Selected Private League" },
    }));
    localStorage.setItem("flagos_active_league_id", "private-league");
  });

  it.each([
    "/teams/falcons", "/teams/hawks/roster", "/teams/falcons/playbook",
    "/teams/hawks/stats", "/teams/falcons/schedule",
    "/matches/customer-game/play-by-play",
  ])("does not initialize the unrelated league on %s", async (path) => {
    mocks.pathname = path;
    render(<LeagueProvider><Probe /></LeagueProvider>);
    await waitFor(() => expect(state()).toMatchObject({ id: "", name: "Falcons", demo: false, loading: false }));
    expect(mocks.getDoc.mock.calls.every(([ref]) => ref.collection !== "leagues")).toBe(true);
    expect(mocks.sandboxSettings).not.toHaveBeenCalled();
    expect(localStorage.getItem("flagos_active_league_id")).toBe("private-league");
  });

  it("restores the selected league after leaving an independent team", async () => {
    const view = render(<LeagueProvider><Probe /></LeagueProvider>);
    mocks.pathname = "/league/private-league";
    view.rerender(<LeagueProvider><Probe /></LeagueProvider>);
    await waitFor(() => expect(state()).toMatchObject({
      id: "private-league", name: "Selected Private League", loading: false,
    }));
    expect(mocks.getDoc.mock.calls.filter(([ref]) => ref.collection === "leagues")).toHaveLength(1);
    expect(mocks.sandboxSettings).not.toHaveBeenCalled();
  });

  it("discards an in-flight selected-league load when entering an independent team", async () => {
    let resolve!: (value: unknown) => void;
    mocks.getDoc.mockImplementation(({ collection, id }) => collection === "leagues"
      ? new Promise((done) => { resolve = done; })
      : Promise.resolve({ id, exists: () => true, data: () => ({ name: "Falcons", subscription: { status: "active" } }) }));
    mocks.pathname = "/league/private-league";
    const view = render(<LeagueProvider><Probe /></LeagueProvider>);
    mocks.pathname = "/teams/falcons";
    view.rerender(<LeagueProvider><Probe /></LeagueProvider>);
    await act(async () => resolve({
      exists: () => true, data: () => ({ leagueName: "Stale League" }),
    }));
    expect(state()).toMatchObject({ id: "", name: "Falcons", loading: false });
    expect(localStorage.getItem("league_settings_private-league")).toBeNull();
    expect(localStorage.getItem("flagos_active_league_id")).toBe("private-league");
  });

  it("still initializes demo settings on demo league routes", async () => {
    localStorage.setItem("flagos_active_league_id", "default");
    mocks.pathname = "/league/default";
    render(<LeagueProvider><Probe /></LeagueProvider>);
    await waitFor(() => expect(state()).toMatchObject({ id: "default", demo: true, loading: false }));
    expect(mocks.sandboxSettings).toHaveBeenCalledOnce();
    expect(mocks.getDoc).not.toHaveBeenCalled();
  });

  it("uses the owning league on a league team's pages and keeps it for league-wide pages", async () => {
    localStorage.setItem("flagos_active_league_id", "default");
    mocks.getDoc.mockImplementation(async ({ collection, id }) => ({
      id, exists: () => true,
      data: () => collection === "teams" ? { name: "York Lions", leagueId: "york" } : { leagueName: "York Region" },
    }));
    mocks.pathname = "/teams/york-lions";
    const view = render(<LeagueProvider><Probe /></LeagueProvider>);
    await waitFor(() => expect(state()).toMatchObject({ id: "york", name: "York Region", demo: false, loading: false }));
    expect(localStorage.getItem("flagos_active_league_id")).toBe("york");
    mocks.pathname = "/schedule";
    view.rerender(<LeagueProvider><Probe /></LeagueProvider>);
    expect(state()).toMatchObject({ id: "york", name: "York Region", demo: false, loading: false });
    expect(mocks.sandboxSettings).not.toHaveBeenCalled();
  });

  it("drops a deleted league from the switcher and falls back to the demo league", async () => {
    localStorage.setItem("flagos_active_league_id", "deleted-league");
    localStorage.setItem("flagos_user_leagues", JSON.stringify([
      { id: "default", name: "Demo", shortcode: "FLAG", role: "owner" },
      { id: "deleted-league", name: "Gone", shortcode: "GONE", role: "owner" },
    ]));
    mocks.getDoc.mockImplementation(async ({ id }) => ({ id, exists: () => false, data: () => null }));
    mocks.pathname = "/schedule";
    render(<LeagueProvider><Probe /></LeagueProvider>);
    await waitFor(() => expect(state()).toMatchObject({ id: "default", demo: true, loading: false, leagues: ["default"] }));
    expect(localStorage.getItem("flagos_active_league_id")).toBe("default");
    expect(JSON.parse(localStorage.getItem("flagos_user_leagues")!).map((l: { id: string }) => l.id)).toEqual(["default"]);
  });
});

describe("reconcileUserLeagues", () => {
  it("keeps only the demo league plus leagues the account still belongs to", () => {
    const previous: UserLeagueSummary[] = [
      { id: "default", name: "Demo", shortcode: "FLAG", role: "owner" },
      { id: "deleted", name: "Deleted", shortcode: "DEL", role: "owner" },
      { id: "mine", name: "Old Name", shortcode: "MINE", role: "owner" },
    ];
    const result = reconcileUserLeagues(previous, [
      { id: "mine", name: "Mine", shortcode: "MINE", seasonTitle: "", logoUrl: "", primaryColor: "", accentColor: "", visibility: "public", isCommissioner: true, teams: [] },
      { id: "york", name: "York Region", shortcode: "YRK", seasonTitle: "", logoUrl: "", primaryColor: "", accentColor: "", visibility: "public", isCommissioner: false, teams: [] },
    ]);
    expect(result.map((l) => [l.id, l.name, l.role])).toEqual([
      ["default", "Demo", "owner"], ["mine", "Mine", "owner"], ["york", "York Region", "member"],
    ]);
  });
});
