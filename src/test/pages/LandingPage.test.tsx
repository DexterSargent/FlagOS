import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FlagOSPlatformLandingPage from "@/app/page";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
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
    const playbookButton = screen.getByRole("button", { name: "Playbook Studio" });
    fireEvent.click(playbookButton);
    expect(
      screen.getByText("Up to 5 custom offensive & defensive playbooks per team, interactive route designer & wristband export.")
    ).toBeInTheDocument();

    // Switch to Automated Schedule-Builder
    const scheduleButton = screen.getByRole("button", { name: "Automated Schedule-Builder" });
    fireEvent.click(scheduleButton);
    expect(
      screen.getByText("Round-robin matchmaking engine, drag-and-drop game slot ordering, field assignments & playoff brackets.")
    ).toBeInTheDocument();

    // Switch to League Dashboard
    const dashboardButton = screen.getByRole("button", { name: "League Dashboard" });
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

  it("renders public leagues in directory and excludes private circuits", () => {
    render(<FlagOSPlatformLandingPage />);
    expect(screen.getByText("Toronto Flag League")).toBeInTheDocument();
    expect(screen.queryByText("Secret Private Circuit")).toBeNull();
  });
});
