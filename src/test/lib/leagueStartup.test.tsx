import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_LEAGUE_SETTINGS, LeagueProvider, useLeague } from "@/lib/leagueContext";

const mocks = vi.hoisted(() => ({
  pathname: "/teams/york_lions",
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
  })}</output>;
}
const state = () => JSON.parse(screen.getByRole("status").textContent!);

describe("Route-scoped league startup", () => {
  beforeEach(() => {
    mocks.pathname = "/teams/york_lions";
    mocks.sandboxSettings.mockReturnValue(DEFAULT_LEAGUE_SETTINGS);
    mocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ leagueName: "Selected Private League" }),
    });
    localStorage.setItem("flagos_active_league_id", "private-league");
  });

  it.each([
    "/teams/york_lions", "/teams/team_york/roster", "/teams/york/playbook",
    "/teams/yuwffl_lions/stats", "/teams/york_wffl/schedule",
    "/matches/match_york_waterloo/play-by-play",
  ])("does not initialize the unrelated league on %s", (path) => {
    mocks.pathname = path;
    render(<LeagueProvider><Probe /></LeagueProvider>);
    expect(state()).toMatchObject({ id: "", demo: false, loading: false });
    expect(mocks.getDoc).not.toHaveBeenCalled();
    expect(mocks.sandboxSettings).not.toHaveBeenCalled();
    expect(localStorage.getItem("flagos_active_league_id")).toBe("private-league");
  });

  it("restores the selected league after leaving York", async () => {
    const view = render(<LeagueProvider><Probe /></LeagueProvider>);
    mocks.pathname = "/league/private-league";
    view.rerender(<LeagueProvider><Probe /></LeagueProvider>);
    await waitFor(() => expect(state()).toMatchObject({
      id: "private-league", name: "Selected Private League", loading: false,
    }));
    expect(mocks.getDoc).toHaveBeenCalledTimes(1);
    expect(mocks.sandboxSettings).not.toHaveBeenCalled();
  });

  it("discards an in-flight selected-league load when entering York", async () => {
    let resolve!: (value: unknown) => void;
    mocks.getDoc.mockReturnValue(new Promise((done) => { resolve = done; }));
    mocks.pathname = "/league/private-league";
    const view = render(<LeagueProvider><Probe /></LeagueProvider>);
    mocks.pathname = "/teams/york_lions";
    view.rerender(<LeagueProvider><Probe /></LeagueProvider>);
    await act(async () => resolve({
      exists: () => true, data: () => ({ leagueName: "Stale League" }),
    }));
    expect(state()).toMatchObject({ id: "", name: "York Lions Women's Flag Football", loading: false });
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
});
