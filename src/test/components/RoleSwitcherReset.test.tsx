import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import RoleSwitcherContent from "@/components/RoleSwitcherContent";

const mocks = vi.hoisted(() => ({
  reset: vi.fn(),
  reload: vi.fn(),
  setDevRole: vi.fn(),
  pathname: "/league/default",
  isDemoLeague: true,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
}));

let currentAuth = {
  user: null,
  role: "league_admin" as any,
  isLeagueAdmin: true,
  isPlayer: false,
  managedTeamId: "team_bears",
  playerId: "p_1",
  setDevRole: mocks.setDevRole,
};

vi.mock("@/lib/authContext", () => ({
  useAuth: () => currentAuth,
}));

vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({
    isDemoLeague: mocks.isDemoLeague,
    openCustomizer: vi.fn(),
    resetDemoSession: mocks.reset,
  }),
}));

const dummyTeams = [
  { id: "team_bears", name: "Chicago Bears" },
  { id: "team_kc", name: "Kansas City" },
];

const dummyPlayers = [
  { id: "p_1", teamId: "team_bears", playerName: "Caleb Williams", number: "18" },
  { id: "p_2", teamId: "team_kc", playerName: "Patrick Mahomes", number: "15" },
];

vi.mock("@/lib/demoSandbox", () => ({
  getSandboxPlayers: () => dummyPlayers,
  getSandboxTeams: () => dummyTeams,
  subscribeDemoSandbox: (cb: any) => {
    return () => {};
  },
}));

vi.mock("@/lib/yorkTeamData", () => ({ isYorkMatch: () => false, isYorkTeam: () => false }));

const originalLocation = window.location;

describe("RoleSwitcherContent Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pathname = "/league/default";
    mocks.isDemoLeague = true;
    currentAuth = {
      user: null,
      role: "league_admin",
      isLeagueAdmin: true,
      isPlayer: false,
      managedTeamId: "team_bears",
      playerId: "p_1",
      setDevRole: mocks.setDevRole,
    };
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });

  it("waits for lazy sandbox reset before reloading the page", async () => {
    let finish!: () => void;
    mocks.reset.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { hostname: "flagos.app", search: "", reload: mocks.reload },
    });
    render(<RoleSwitcherContent />);
    expect(screen.getByRole("button", { name: "League Admin" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Spectator" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: "Reset session" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm reset session" }));
    expect(mocks.reset).toHaveBeenCalledOnce();
    expect(mocks.reload).not.toHaveBeenCalled();
    await act(async () => { finish(); });
    expect(mocks.reload).toHaveBeenCalledOnce();
  });

  it("switches roles via persona toggle buttons", () => {
    render(<RoleSwitcherContent />);

    // Click Team Admin
    fireEvent.click(screen.getByRole("button", { name: "Team Admin" }));
    expect(mocks.setDevRole).toHaveBeenCalledWith("team_admin", "team_bears");

    // Click Player
    fireEvent.click(screen.getByRole("button", { name: "Player" }));
    expect(mocks.setDevRole).toHaveBeenCalledWith("player", "team_bears", "p_1");

    // Click Spectator
    fireEvent.click(screen.getByRole("button", { name: "Spectator" }));
    expect(mocks.setDevRole).toHaveBeenCalledWith("user");

    // Click League Admin
    fireEvent.click(screen.getByRole("button", { name: "League Admin" }));
    expect(mocks.setDevRole).toHaveBeenCalledWith("league_admin");
  });

  it("switches role via mobile select dropdown", () => {
    render(<RoleSwitcherContent />);
    const select = screen.getByLabelText("Demo role");
    fireEvent.change(select, { target: { value: "player" } });
    expect(mocks.setDevRole).toHaveBeenCalledWith("player", "team_bears", "p_1");
  });

  it("handles team selection when in team_admin role", () => {
    currentAuth.role = "team_admin";
    render(<RoleSwitcherContent />);

    const teamSelect = screen.getByLabelText("Demo team");
    expect(teamSelect).toBeInTheDocument();
    fireEvent.change(teamSelect, { target: { value: "team_kc" } });
    expect(mocks.setDevRole).toHaveBeenCalledWith("team_admin", "team_kc");
  });

  it("handles team and athlete selection when in player role", () => {
    currentAuth.role = "player";
    currentAuth.isPlayer = true;
    render(<RoleSwitcherContent />);

    const playerTeamSelect = screen.getByLabelText("Demo player team");
    fireEvent.change(playerTeamSelect, { target: { value: "team_kc" } });
    expect(mocks.setDevRole).toHaveBeenCalledWith("player", "team_kc", "p_2");

    const athleteSelect = screen.getByLabelText("Demo athlete");
    fireEvent.change(athleteSelect, { target: { value: "p_1" } });
    expect(mocks.setDevRole).toHaveBeenCalledWith("player", "team_bears", "p_1");
  });

  it("returns null when not an eligible demo page", () => {
    mocks.isDemoLeague = false;
    const { container: c1 } = render(<RoleSwitcherContent />);
    expect(c1).toBeEmptyDOMElement();

    mocks.isDemoLeague = true;
    mocks.pathname = "/teams/customer_real_team";
    const { container: c2 } = render(<RoleSwitcherContent />);
    expect(c2).toBeEmptyDOMElement();
  });
});
