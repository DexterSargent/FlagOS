import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FlagOSPlatformLandingPage from "@/app/page";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/",
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock contexts
const mockUseLeague = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => mockUseLeague(),
}));

vi.mock("@/lib/authContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/components/home/SignedInHome", () => ({
  default: () => <div data-testid="signed-in-home">Signed-in home</div>,
}));

vi.mock("@/lib/themeContext", () => ({
  useTheme: () => ({
    resolvedTheme: "dark",
    setTheme: vi.fn(),
  }),
}));

describe("Marketing Landing Page (FlagOSPlatformLandingPage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLeague.mockReturnValue({
      activeLeagueId: "default",
      userLeagues: [
        {
          id: "league_public_1",
          name: "Toronto Flag League",
          visibility: "public",
          primaryColor: "#0284c7",
          accentColor: "#38bdf8",
        },
        {
          id: "league_private_1",
          name: "Secret Private Circuit",
          visibility: "private",
          primaryColor: "#333",
          accentColor: "#444",
        },
      ],
      settings: {
        leagueName: "FlagOS League",
        shortcode: "FLAG",
        primaryColor: "#3ca505",
        accentColor: "#22c55e",
      },
    });

    mockUseAuth.mockReturnValue({
      user: null,
      isLeagueAdmin: false,
      isTeamAdmin: () => false,
      role: null,
      isAuthorized: false,
    });
  });

  it("renders hero brand headline and primary call to actions", () => {
    render(<FlagOSPlatformLandingPage />);
    expect(screen.getAllByText(/FLAG/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Explore Demo League").length).toBeGreaterThan(0);
  });

  it("distinguishes the team and league plans with green and blue accents", () => {
    render(<FlagOSPlatformLandingPage />);

    const teamPlan = screen.getByRole("heading", { name: "Team Subscription" }).closest(".bg-gradient-to-b");
    const leaguePlan = screen.getByRole("heading", { name: "League Subscription" }).closest(".bg-gradient-to-b");

    expect(teamPlan).toHaveClass("border-emerald-500/40");
    expect(leaguePlan).toHaveClass("border-[#3b82f6]/40");
  });

  it("shows the personalized signed-in home instead of the marketing page when logged in", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "other-user", email: "coach_smith@example.com" },
      isLeagueAdmin: false,
      isTeamAdmin: () => false,
      role: "user",
      isAuthorized: true,
      isPlatformAdmin: false,
      loading: false,
    });

    render(<FlagOSPlatformLandingPage />);

    expect(screen.getByTestId("signed-in-home")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /pricing/i })).toBeNull();
  });

  it("shows the signed-in home while auth restores for a returning member", () => {
    localStorage.setItem("flagos_profile_dexter-1", "{}");
    mockUseAuth.mockReturnValue({
      user: null,
      isLeagueAdmin: false,
      isTeamAdmin: () => false,
      role: null,
      isAuthorized: false,
      isPlatformAdmin: false,
      loading: true,
    });

    try {
      render(<FlagOSPlatformLandingPage />);
      expect(screen.getByTestId("signed-in-home")).toBeInTheDocument();
    } finally {
      localStorage.removeItem("flagos_profile_dexter-1");
    }
  });

  it("keeps the marketing page while auth loads for a first-time visitor", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLeagueAdmin: false,
      isTeamAdmin: () => false,
      role: null,
      isAuthorized: false,
      isPlatformAdmin: false,
      loading: true,
    });

    render(<FlagOSPlatformLandingPage />);

    expect(screen.queryByTestId("signed-in-home")).toBeNull();
    expect(screen.getAllByRole("link", { name: /pricing/i }).length).toBeGreaterThan(0);
  });

  it("hides My Story nav links from signed-out visitors", () => {
    render(<FlagOSPlatformLandingPage />);

    expect(screen.queryByRole("link", { name: "My Story" })).toBeNull();
  });

  it("renders Demo League links in navigation pointing to the demo sandbox", () => {
    render(<FlagOSPlatformLandingPage />);
    const demoLeagueLinks = screen.getAllByRole("link", { name: /demo league/i });
    expect(demoLeagueLinks.length).toBeGreaterThan(0);
    expect(demoLeagueLinks[0]).toHaveAttribute("href", "/league/default?demo=true");
  });

  it("STRICT REQUIREMENT: Pricing link is present on marketing landing page and points to /pricing", () => {
    render(<FlagOSPlatformLandingPage />);
    const pricingLinks = screen.getAllByRole("link", { name: /pricing/i });
    expect(pricingLinks.length).toBeGreaterThan(0);
    expect(pricingLinks[0]).toHaveAttribute("href", "/pricing");
  });

  it("switches interactive demo preview tabs and updates feature iframe target", () => {
    render(<FlagOSPlatformLandingPage />);

    // Default tab is stats (verified by its unique description)
    expect(
      screen.getByText("Full gameday stat tracker with dual operating modes for live clocks or clockless fast-logging.")
    ).toBeInTheDocument();

    // Switch to Playbook Studio
    const playbookButton = screen.getByRole("tab", { name: /Playbook Studio/ });
    fireEvent.click(playbookButton);
    expect(playbookButton).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTitle("FlagOS Real Feature Live Sandbox")).toHaveAttribute(
      "src",
      "/teams/team_kc/playbook?embed=true&demo=true"
    );
    expect(
      screen.getByText("Up to 5 custom offensive & defensive playbooks per team, interactive route designer & wristband export.")
    ).toBeInTheDocument();

    // Switch to Schedule Builder
    const scheduleButton = screen.getByRole("tab", { name: /Schedule Builder/ });
    fireEvent.click(scheduleButton);
    expect(
      screen.getByText("Round-robin matchmaking engine, drag-and-drop game slot ordering, field assignments & playoff brackets.")
    ).toBeInTheDocument();

    // Switch to League Dashboard
    const dashboardButton = screen.getByRole("tab", { name: /League Dashboard/ });
    fireEvent.click(dashboardButton);
    expect(
      screen.getByText("Real-time standings, cumulative statistics, live match tickers, and public spectator portal.")
    ).toBeInTheDocument();
  });

  it("toggles synchronous vs asynchronous operating modes for stat wizard preview", () => {
    render(<FlagOSPlatformLandingPage />);

    // Click asynchronous mode button
    const asyncButton = screen.getByRole("button", { name: /asynchronous/i });
    fireEvent.click(asyncButton);
    expect(
      screen.getByText("Rapid clockless stat keeper for high-tempo post-game or sideline logging")
    ).toBeInTheDocument();

    // Click synchronous mode button (specifically excluding Asynchronous)
    const syncButton = screen.getByRole("button", {
      name: (content) => content.includes("Synchronous") && !content.includes("Asynchronous"),
    });
    fireEvent.click(syncButton);
    expect(
      screen.getByText("Official live clock, play clock, spot ball & down counter")
    ).toBeInTheDocument();
  });

  it("renders public league directory navigation link pointing to /leagues when user is not logged in", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLeagueAdmin: false,
      isTeamAdmin: () => false,
      role: null,
      isAuthorized: false,
      isPlatformAdmin: false,
    });

    render(<FlagOSPlatformLandingPage />);
    expect(screen.queryByText(/Public League Directory/i)).toBeNull();
    expect(screen.queryByText("Toronto Flag League")).toBeNull();
    const directoryLinks = screen.getAllByRole("link", { name: /league directory/i });
    expect(directoryLinks.length).toBeGreaterThan(0);
    expect(directoryLinks[0]).toHaveAttribute("href", "/leagues");
  });
});
