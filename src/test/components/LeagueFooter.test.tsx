import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import LeagueFooter from "@/components/LeagueFooter";

// Mock contexts
const mockUseLeague = vi.fn();
const mockUseAuth = vi.fn();
const mockUseTheme = vi.fn();

vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => mockUseLeague(),
}));

vi.mock("@/lib/authContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/themeContext", () => ({
  useTheme: () => mockUseTheme(),
}));

describe("LeagueFooter White-Labeling & Branding Specification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTheme.mockReturnValue({ resolvedTheme: "dark", theme: "dark" });
    mockUseAuth.mockReturnValue({
      canRegisterAsPlayer: true,
      isAuthorized: false,
      isLeagueAdmin: false,
    });
  });

  it("renders platform links and system indicator for default demo league", () => {
    mockUseLeague.mockReturnValue({
      settings: {
        leagueName: "FlagOS Demo League",
        shortcode: "FLAG",
        seasonTitle: "2026 Season",
        defaultLocation: "Central Stadium",
        contactEmail: "commissioner@flagos.ca",
        rulebookTitle: "Official IFAF Rules",
        visibility: "public",
      },
      openCustomizer: vi.fn(),
      activeLeagueId: "default",
      isDemoLeague: true,
      subscription: null,
    });

    render(<LeagueFooter />);

    // Powered by FlagOS is present
    expect(screen.getByText(/Powered by/i)).toBeInTheDocument();

    // FlagOS Home link is present in demo league
    expect(screen.getByRole("link", { name: /← FlagOS Home/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pricing" })).toBeInTheDocument();
  });

  it("STRICT WHITE-LABELING: custom or paid customer leagues ONLY have the Powered by FlagOS disclaimer", () => {
    mockUseLeague.mockReturnValue({
      settings: {
        leagueName: "Toronto Touch Football Association",
        shortcode: "TTFA",
        seasonTitle: "2026 Spring Invitational",
        defaultLocation: "Varsity Stadium",
        contactEmail: "info@ttfa.ca",
        rulebookTitle: "Official 5v5 Non-Contact Rules",
        visibility: "public",
      },
      openCustomizer: vi.fn(),
      activeLeagueId: "league_ttfa_2026",
      isDemoLeague: false,
      subscription: {
        plan: "league",
        status: "active",
        baseMonthlyFee: 49,
        perTeamMonthlyFee: 5,
        teamCount: 12,
        totalMonthlyFee: 109,
        billingCycle: "monthly",
      },
    });

    render(<LeagueFooter />);

    // Custom league name is rendered without FlagOS branding spans
    expect(screen.getAllByText("Toronto Touch Football Association").length).toBeGreaterThan(0);

    // The "Powered by FlagOS" disclaimer MUST be present
    expect(screen.getByText(/Powered by/i)).toBeInTheDocument();

    // Extra FlagOS Home link MUST NOT be present on custom/paid leagues
    expect(screen.queryByRole("link", { name: /← FlagOS Home/i })).toBeNull();

    // Customer leagues get plan wording instead of FlagOS marketing links
    expect(screen.getByRole("link", { name: "Plans" })).toBeInTheDocument();
  });
});
