import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LeagueHeader from "@/components/LeagueHeader";

// Mock contexts
const mockUseLeague = vi.fn();
const mockUseAuth = vi.fn();
const navigation = vi.hoisted(() => ({ pathname: "/schedule", push: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push, replace: vi.fn() }),
}));

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
      logoUrl: "/flagos-emblem.png",
      announcement: "",
      seasonTitle: "2026 Season",
      rules: { enableFreeAgents: true },
    },
    openCustomizer: vi.fn(),
    activeLeagueId: "default",
    userLeagues: [],
    switchLeague: vi.fn(),
    subscription: null,
    isDemoLeague: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    navigation.pathname = "/schedule";
    mockUseLeague.mockReturnValue(defaultLeagueSettings);
  });

  const switcherLeagues = [
    { id: "default", name: "FlagOS Demo League", shortcode: "FLAG", role: "owner", visibility: "public" },
    { id: "york", name: "York Region", shortcode: "YRK", role: "member", visibility: "public" },
  ];
  const signedOutAuth = {
    role: null, isLeagueAdmin: false, isPlayer: false, playerData: null, canRegisterAsPlayer: false,
    isAuthorized: false, playerTeamId: null, managedTeamId: null,
  };

  it("switches leagues in place on league-wide pages", () => {
    const switchLeague = vi.fn();
    mockUseLeague.mockReturnValue({ ...defaultLeagueSettings, userLeagues: switcherLeagues, switchLeague });
    mockUseAuth.mockReturnValue(signedOutAuth);
    render(<LeagueHeader activePage="schedule" />);
    fireEvent.click(screen.getByRole("button", { name: "Switch League" }));
    expect(screen.getByText("Member")).toBeInTheDocument();
    fireEvent.click(screen.getByText("York Region"));
    expect(switchLeague).toHaveBeenCalledWith("york");
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("navigates to the chosen league from a league-bound dashboard URL", () => {
    navigation.pathname = "/league/default";
    const switchLeague = vi.fn();
    mockUseLeague.mockReturnValue({ ...defaultLeagueSettings, userLeagues: switcherLeagues, switchLeague });
    mockUseAuth.mockReturnValue(signedOutAuth);
    render(<LeagueHeader activePage="league" />);
    fireEvent.click(screen.getByRole("button", { name: "Switch League" }));
    fireEvent.click(screen.getByText("York Region"));
    expect(switchLeague).toHaveBeenCalledWith("york");
    expect(navigation.push).toHaveBeenCalledWith("/league/york");
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

  it("shows compact demo context and easy navigation back to platform pages", () => {
    mockUseLeague.mockReturnValue({
      ...defaultLeagueSettings,
      isDemoLeague: true,
    });

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

    expect(screen.getByText("Demo")).toHaveAttribute("title", "Interactive Demo Sandbox");
    expect(screen.queryByText("Demo League Sandbox")).not.toBeInTheDocument();

    // Links to unlogged-in pages exist
    const homeLinks = screen.getAllByRole("link", { name: /flagos/i });
    expect(homeLinks.length).toBeGreaterThan(0);

    const pricingLinks = screen.getAllByRole("link", { name: /pricing/i });
    expect(pricingLinks.length).toBeGreaterThan(0);
    expect(pricingLinks[0]).toHaveAttribute("href", "/pricing");

    const signInLinks = screen.getAllByRole("link", { name: /sign in/i });
    expect(signInLinks.length).toBeGreaterThan(0);
    expect(signInLinks[0]).toHaveAttribute("href", "/login");
  });

  it("STRICT WHITE-LABELING: custom or paid customer leagues omit FlagOS return button and FlagOS branding in LeagueHeader", () => {
    mockUseLeague.mockReturnValue({
      settings: {
        leagueName: "Apex Premier Flag Football",
        shortcode: "APEX",
        primaryColor: "#E31837",
        accentColor: "#000000",
        logoUrl: "",
        announcement: "",
        seasonTitle: "2026 Live Championship",
        rules: { enableFreeAgents: true },
      },
      openCustomizer: vi.fn(),
      activeLeagueId: "league_apex_999",
      userLeagues: [],
      switchLeague: vi.fn(),
      subscription: {
        plan: "league",
        status: "active",
        baseMonthlyFee: 49,
        perTeamMonthlyFee: 5,
        teamCount: 8,
        totalMonthlyFee: 89,
        billingCycle: "monthly",
      },
      isDemoLeague: false,
    });

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

    // Custom league name is rendered cleanly
    expect(screen.getByText("Apex Premier Flag Football")).toBeInTheDocument();

    // FlagOS return link ("Return to FlagOS Platform Home") MUST NOT exist
    const flagosPlatformHomeLink = screen.queryByTitle(/return to flagos platform home/i);
    expect(flagosPlatformHomeLink).toBeNull();

    // The word/link "FlagOS" should NOT be in the header navigation
    const flagosLinks = screen.queryAllByRole("link", { name: /^flagos$/i });
    expect(flagosLinks.length).toBe(0);
  });
});
