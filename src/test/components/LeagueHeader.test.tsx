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

    expect(screen.getByText("Demo")).toHaveAttribute("title", "Demo league: changes reset when you leave");
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

  it("opens mobile navigation drawer and allows navigating through links", () => {
    const logoutMock = vi.fn();
    mockUseLeague.mockReturnValue(defaultLeagueSettings);
    mockUseAuth.mockReturnValue({
      user: { email: "player@flagos.com" },
      role: "player",
      isLeagueAdmin: false,
      isPlayer: true,
      playerData: { playerName: "Jordan" },
      canRegisterAsPlayer: true,
      isAuthorized: true,
      playerTeamId: "team_apex",
      managedTeamId: "team_apex",
      logout: logoutMock,
    });

    render(<LeagueHeader activePage="schedule" />);

    const menuToggle = screen.getByLabelText(/Toggle navigation menu/i);
    expect(menuToggle).toBeInTheDocument();
    fireEvent.click(menuToggle);

    // Mobile drawer is open
    expect(screen.getAllByText("League Home").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Schedule").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Standings & Stats").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Teams").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Find a League").length).toBeGreaterThan(0);
    expect(screen.getAllByText("My Team").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Playbook").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Player Registration").length).toBeGreaterThan(0);

    // Sign out button in mobile menu
    const signOutBtn = screen.getByRole("button", { name: /Sign Out/i });
    fireEvent.click(signOutBtn);
    expect(logoutMock).toHaveBeenCalledOnce();
  });

  it("renders demo platform exit links in mobile menu when in demo league", () => {
    mockUseLeague.mockReturnValue({
      ...defaultLeagueSettings,
      isDemoLeague: true,
    });
    mockUseAuth.mockReturnValue({
      user: null,
      role: null,
      isLeagueAdmin: false,
      isPlayer: false,
      canRegisterAsPlayer: false,
      isAuthorized: false,
      playerTeamId: null,
      managedTeamId: null,
    });

    render(<LeagueHeader activePage="league" />);
    fireEvent.click(screen.getByLabelText(/Toggle navigation menu/i));

    expect(screen.getByText("Pricing Plans")).toBeInTheDocument();
    expect(screen.getByText(/Sign In \/ Register/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /FlagOS Platform Home/i })).toBeInTheDocument();
  });

  it("renders announcement banner when announcement is set", () => {
    mockUseLeague.mockReturnValue({
      ...defaultLeagueSettings,
      settings: {
        ...defaultLeagueSettings.settings,
        announcement: "Playoffs start this weekend! Check your schedule.",
      },
    });
    mockUseAuth.mockReturnValue(signedOutAuth);

    render(<LeagueHeader activePage="schedule" />);
    expect(screen.getByText(/Playoffs start this weekend!/i)).toBeInTheDocument();
  });

  it("renders switcher actions for Create & Subscribe League and Platform Home", () => {
    mockUseLeague.mockReturnValue({
      ...defaultLeagueSettings,
      userLeagues: switcherLeagues,
      isDemoLeague: true,
    });
    mockUseAuth.mockReturnValue(signedOutAuth);

    render(<LeagueHeader activePage="schedule" />);
    fireEvent.click(screen.getByRole("button", { name: "Switch League" }));

    expect(screen.getByText("Create & Subscribe League")).toBeInTheDocument();
    expect(screen.getByText(/FlagOS Platform Home/i)).toBeInTheDocument();
  });

  it("handles subscription past due banner and resume subscription", async () => {
    const resumeSubscription = vi.fn().mockResolvedValue(undefined);
    mockUseLeague.mockReturnValue({
      ...defaultLeagueSettings,
      isSubscriptionPastDue: true,
      resumeSubscription,
    });
    mockUseAuth.mockReturnValue({
      ...signedOutAuth,
      isLeagueAdmin: true,
      isAuthorized: true,
    });

    render(<LeagueHeader activePage="schedule" />);
    expect(screen.getByText(/Subscription Payment Past Due/i)).toBeInTheDocument();

    const resumeBtn = screen.getByRole("button", { name: /Update Payment & Resume/i });
    fireEvent.click(resumeBtn);
    expect(resumeSubscription).toHaveBeenCalledTimes(1);
  });

  it("handles subscription past due banner error alert", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const resumeSubscription = vi.fn().mockRejectedValue(new Error("Card declined"));
    mockUseLeague.mockReturnValue({
      ...defaultLeagueSettings,
      isSubscriptionPastDue: true,
      resumeSubscription,
    });
    mockUseAuth.mockReturnValue({
      ...signedOutAuth,
      isLeagueAdmin: true,
      isAuthorized: true,
    });

    render(<LeagueHeader activePage="schedule" />);
    const resumeBtn = screen.getByRole("button", { name: /Update Payment & Resume/i });
    fireEvent.click(resumeBtn);

    // Wait for promise rejection to trigger alert
    await vi.waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Card declined");
    });
    alertSpy.mockRestore();
  });

  it("handles archived season banner with Season Options trigger", () => {
    const openCustomizer = vi.fn();
    mockUseLeague.mockReturnValue({
      ...defaultLeagueSettings,
      isLeagueArchived: true,
      isSubscriptionPastDue: false,
      openCustomizer,
    });
    mockUseAuth.mockReturnValue({
      ...signedOutAuth,
      isLeagueAdmin: true,
      isAuthorized: true,
    });

    render(<LeagueHeader activePage="schedule" />);
    expect(screen.getByText(/Archived Season/i)).toBeInTheDocument();

    const seasonOptionsBtn = screen.getByRole("button", { name: /Season Options/i });
    fireEvent.click(seasonOptionsBtn);
    expect(openCustomizer).toHaveBeenCalledTimes(1);
  });

  it("renders Settings button for authorized league admin and calls openCustomizer", () => {
    const openCustomizer = vi.fn();
    mockUseLeague.mockReturnValue({
      ...defaultLeagueSettings,
      openCustomizer,
    });
    mockUseAuth.mockReturnValue({
      ...signedOutAuth,
      isLeagueAdmin: true,
      isAuthorized: true,
    });

    render(<LeagueHeader activePage="league" />);
    const settingsBtn = screen.getByRole("button", { name: /Settings/i });
    expect(settingsBtn).toBeInTheDocument();
    fireEvent.click(settingsBtn);
    expect(openCustomizer).toHaveBeenCalledTimes(1);
  });

  it("renders player profile pill when user is a rostered player", () => {
    mockUseLeague.mockReturnValue(defaultLeagueSettings);
    mockUseAuth.mockReturnValue({
      ...signedOutAuth,
      isPlayer: true,
      playerData: { number: "12", playerName: "Tom Brady" },
    });

    render(<LeagueHeader activePage="schedule" />);
    expect(screen.getByText("#12 Tom Brady")).toBeInTheDocument();
  });

  it("allows signing out from mobile drawer when logged in to non-demo league", () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    mockUseLeague.mockReturnValue({
      ...defaultLeagueSettings,
      activeLeagueId: "real-league-123",
      isDemoLeague: false,
    });
    mockUseAuth.mockReturnValue({
      ...signedOutAuth,
      user: { uid: "user-1" },
      logout,
    });

    render(<LeagueHeader activePage="schedule" />);
    fireEvent.click(screen.getByLabelText(/Toggle navigation menu/i));

    const signOutBtn = screen.getByRole("button", { name: /Sign Out/i });
    expect(signOutBtn).toBeInTheDocument();
    fireEvent.click(signOutBtn);
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("navigates to standard tabs from mobile drawer", () => {
    mockUseLeague.mockReturnValue({
      ...defaultLeagueSettings,
      activeLeagueId: "demo-league",
    });
    mockUseAuth.mockReturnValue({
      ...signedOutAuth,
      playerTeamId: "team-a",
      canRegisterAsPlayer: true,
    });

    render(<LeagueHeader activePage="schedule" />);
    fireEvent.click(screen.getByLabelText(/Toggle navigation menu/i));

    expect(screen.getAllByRole("link", { name: /League Home/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /Schedule/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /Standings & Stats/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /^Teams$/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /Find a League/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /My Team/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /Playbook/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { name: /Player Registration/i }).length).toBeGreaterThanOrEqual(1);

    // Clicking a link closes the mobile drawer
    const scheduleLink = screen.getAllByRole("link", { name: /Schedule/i })[1];
    fireEvent.click(scheduleLink);
  });

  it("renders role pill for Team Admin and Spectator in demo league", () => {
    mockUseLeague.mockReturnValue({
      ...defaultLeagueSettings,
      isDemoLeague: true,
    });
    mockUseAuth.mockReturnValue({
      ...signedOutAuth,
      role: "team_admin",
    });

    const { rerender } = render(<LeagueHeader activePage="schedule" />);
    expect(screen.getByText("Team Admin")).toBeInTheDocument();

    mockUseAuth.mockReturnValue({
      ...signedOutAuth,
      role: "spectator",
    });
    rerender(<LeagueHeader activePage="schedule" />);
    expect(screen.getByText("Spectator")).toBeInTheDocument();
  });

  it("renders role pill for League Admin, Team Admin, and User in non-demo league", () => {
    mockUseLeague.mockReturnValue({
      ...defaultLeagueSettings,
      isDemoLeague: false,
    });
    mockUseAuth.mockReturnValue({
      ...signedOutAuth,
      isLeagueAdmin: true,
      user: { uid: "admin-1" },
    });

    const { rerender } = render(<LeagueHeader activePage="schedule" />);
    expect(screen.getByText("League Admin")).toBeInTheDocument();

    mockUseAuth.mockReturnValue({
      ...signedOutAuth,
      isLeagueAdmin: false,
      role: "team_admin",
      user: { uid: "team-admin-1" },
    });
    rerender(<LeagueHeader activePage="schedule" />);
    expect(screen.getByText("Team Admin")).toBeInTheDocument();

    mockUseAuth.mockReturnValue({
      ...signedOutAuth,
      isLeagueAdmin: false,
      role: null,
      user: { uid: "regular-user-1" },
    });
    rerender(<LeagueHeader activePage="schedule" />);
    expect(screen.getByText("My Account")).toBeInTheDocument();
  });

  it("renders popover links for Create & Subscribe League and Platform Home", () => {
    mockUseLeague.mockReturnValue({
      ...defaultLeagueSettings,
      userLeagues: switcherLeagues,
      isDemoLeague: true,
    });
    mockUseAuth.mockReturnValue(signedOutAuth);

    render(<LeagueHeader activePage="schedule" />);
    fireEvent.click(screen.getByRole("button", { name: "Switch League" }));

    const createLink = screen.getByRole("link", { name: /Create & Subscribe League/i });
    expect(createLink).toBeInTheDocument();
    fireEvent.click(createLink);

    // Reopen switcher
    fireEvent.click(screen.getByRole("button", { name: "Switch League" }));
    const homeLink = screen.getByRole("link", { name: /FlagOS Platform Home/i });
    expect(homeLink).toBeInTheDocument();
    fireEvent.click(homeLink);
  });

  it("filters private leagues in switcher unless user is authorized", () => {
    const leaguesWithPrivate = [
      { id: "default", name: "Public League", shortcode: "PUB", role: "member", visibility: "public" },
      { id: "priv1", name: "Private League", shortcode: "PRV", role: "member", visibility: "private" },
    ];

    // Unauthorized user
    mockUseLeague.mockReturnValue({
      ...defaultLeagueSettings,
      userLeagues: leaguesWithPrivate,
    });
    mockUseAuth.mockReturnValue({
      ...signedOutAuth,
      user: { email: "stranger@example.com" },
    });

    const { rerender } = render(<LeagueHeader activePage="schedule" />);
    fireEvent.click(screen.getByRole("button", { name: "Switch League" }));
    expect(screen.getByText("Public League")).toBeInTheDocument();
    expect(screen.queryByText("Private League")).not.toBeInTheDocument();

    // Authorized owner user
    mockUseAuth.mockReturnValue({
      ...signedOutAuth,
      user: { email: "dextersargent@flagos.ca" },
    });
    rerender(<LeagueHeader activePage="schedule" />);
    expect(screen.getByText("Private League")).toBeInTheDocument();
  });

  it("opens mobile navigation menu and clicks mobile drawer links", () => {
    const mockLogout = vi.fn();
    mockUseLeague.mockReturnValue({
      ...defaultLeagueSettings,
      isDemoLeague: true,
    });
    mockUseAuth.mockReturnValue({
      ...signedOutAuth,
      user: { email: "player@example.com" },
      playerTeamId: "team_apex",
      canRegisterAsPlayer: true,
      logout: mockLogout,
    });

    const { rerender } = render(<LeagueHeader activePage="schedule" />);

    // Open mobile menu
    const menuBtn = screen.getByRole("button", { name: "Toggle Navigation Menu" });
    fireEvent.click(menuBtn);

    // Click links inside mobile drawer
    const linksToClick = [
      "Standings & Stats",
      "Teams",
      "Find a League",
      "Playbook",
      "Player Registration",
      "FlagOS Platform Home",
      "Pricing Plans",
      "Schedule",
    ];

    linksToClick.forEach((text) => {
      // If menu was closed by previous click, reopen it
      const openBtn = screen.queryByRole("button", { name: "Toggle Navigation Menu" });
      if (openBtn) fireEvent.click(openBtn);

      const links = screen.queryAllByRole("link", { name: new RegExp(text, "i") });
      const mobileLink = links[links.length - 1];
      if (mobileLink) fireEvent.click(mobileLink);
    });

    // Test sign out in non-demo mode
    mockUseLeague.mockReturnValue({
      ...defaultLeagueSettings,
      isDemoLeague: false,
    });
    rerender(<LeagueHeader activePage="schedule" />);
    const reopenBtn = screen.getByRole("button", { name: "Toggle Navigation Menu" });
    fireEvent.click(reopenBtn);

    const signOutBtn = screen.getByRole("button", { name: /Sign Out/i });
    fireEvent.click(signOutBtn);
    expect(mockLogout).toHaveBeenCalled();
  });
});

