import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LeagueHeader from "@/components/LeagueHeader";

// Mock contexts
const mockUseLeague = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => mockUseLeague(),
}));

vi.mock("@/lib/authContext", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("LeagueHeader Component", () => {
  const defaultLeagueSettings = {
    settings: {
      leagueName: "FlagOS League",
      shortcode: "FLAG",
      primaryColor: "#3ca505",
      accentColor: "#22c55e",
      logoUrl: "/flagos-logo.png",
      announcement: "",
      seasonTitle: "2026 Season",
      rules: { enableFreeAgents: true },
    },
    openCustomizer: vi.fn(),
    activeLeagueId: "default",
    userLeagues: [],
    switchLeague: vi.fn(),
    subscription: null,
    isDemoLeague: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLeague.mockReturnValue(defaultLeagueSettings);
  });

  it("renders the league name and brand emblem", () => {
    mockUseAuth.mockReturnValue({
      role: null,
      isLeagueAdmin: false,
      isPlayer: false,
      playerData: null,
      canRegisterAsPlayer: false,
      isAuthorized: false,
      playerTeamId: null,
      managedTeamId: null,
    });

    render(<LeagueHeader activePage="league" />);
    expect(screen.getAllByText(/FLAG/i).length).toBeGreaterThan(0);
    expect(screen.getByText("League Home")).toBeInTheDocument();
    expect(screen.getByText("Schedule")).toBeInTheDocument();
    expect(screen.getByText("Standings & Stats")).toBeInTheDocument();
    expect(screen.getByText("Teams")).toBeInTheDocument();
  });

  it("STRICT REQUIREMENT: Pricing link is NOT present anywhere in LeagueHeader navigation", () => {
    mockUseAuth.mockReturnValue({
      role: null,
      isLeagueAdmin: false,
      isPlayer: false,
      playerData: null,
      canRegisterAsPlayer: true,
      isAuthorized: false,
      playerTeamId: null,
      managedTeamId: null,
    });

    render(<LeagueHeader activePage="league" />);

    // Pricing should NOT exist in navigation links
    const pricingLinks = screen.queryAllByRole("link", { name: /pricing/i });
    expect(pricingLinks.length).toBe(0);

    const plansText = screen.queryByText(/pricing & plans/i);
    expect(plansText).toBeNull();
  });

  it("League Admins do NOT see Playbook link in header (preserving RBAC policy)", () => {
    mockUseAuth.mockReturnValue({
      role: "league_admin",
      isLeagueAdmin: true,
      isPlayer: false,
      playerData: null,
      canRegisterAsPlayer: false,
      isAuthorized: true,
      playerTeamId: null,
      managedTeamId: null,
    });

    render(<LeagueHeader activePage="league" />);

    // Settings trigger should be present for League Admin
    expect(screen.getByText("Settings")).toBeInTheDocument();

    // Playbook link should NOT be present for League Admin
    const playbookLink = screen.queryByRole("link", { name: /playbook/i });
    expect(playbookLink).toBeNull();
  });

  it("Authorized Team Coaches see Playbook link pointing to their team's playbook", () => {
    mockUseAuth.mockReturnValue({
      role: "team_admin",
      isLeagueAdmin: false,
      isPlayer: false,
      playerData: null,
      canRegisterAsPlayer: false,
      isAuthorized: true,
      playerTeamId: null,
      managedTeamId: "team_kc",
    });

    render(<LeagueHeader activePage="teams" />);

    const playbookLinks = screen.getAllByRole("link", { name: /playbook/i });
    expect(playbookLinks.length).toBeGreaterThan(0);
    expect(playbookLinks[0]).toHaveAttribute("href", "/teams/team_kc/playbook");
  });

  it("Rostered Athletes see Playbook link pointing to their rostered team's playbook", () => {
    mockUseAuth.mockReturnValue({
      role: "player",
      isLeagueAdmin: false,
      isPlayer: true,
      playerData: { playerName: "Patrick Mahomes", number: "15" },
      canRegisterAsPlayer: false,
      isAuthorized: true,
      playerTeamId: "team_kc",
      managedTeamId: null,
    });

    render(<LeagueHeader activePage="teams" />);

    const playbookLinks = screen.getAllByRole("link", { name: /playbook/i });
    expect(playbookLinks.length).toBeGreaterThan(0);
    expect(playbookLinks[0]).toHaveAttribute("href", "/teams/team_kc/playbook");
  });

  it("Mobile menu toggle opens drawer with navigation links and NO pricing link", () => {
    mockUseAuth.mockReturnValue({
      role: null,
      isLeagueAdmin: false,
      isPlayer: false,
      playerData: null,
      canRegisterAsPlayer: true,
      isAuthorized: false,
      playerTeamId: null,
      managedTeamId: null,
    });

    render(<LeagueHeader activePage="schedule" />);

    const menuButton = screen.getByRole("button", { name: /toggle navigation menu/i });
    expect(menuButton).toBeInTheDocument();

    // Open mobile menu
    fireEvent.click(menuButton);

    // Verify links in mobile drawer
    const scheduleLinks = screen.getAllByText("Schedule");
    expect(scheduleLinks.length).toBeGreaterThan(1);

    // Confirm pricing is still nowhere to be found
    const pricingLinks = screen.queryAllByRole("link", { name: /pricing/i });
    expect(pricingLinks.length).toBe(0);
  });
});
