import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PricingPage from "@/app/pricing/page";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock contexts
const mockCreateLeague = vi.fn();
const mockSetDevRole = vi.fn();

vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({
    createLeague: mockCreateLeague,
    userLeagues: [],
    activeLeagueId: "default",
    subscription: null,
    settings: {
      leagueName: "FlagOS League",
      shortcode: "FLAG",
      primaryColor: "#3ca505",
      accentColor: "#22c55e",
      announcement: "",
    },
  }),
}));

vi.mock("@/lib/authContext", () => ({
  useAuth: () => ({
    user: { uid: "test-user-1", email: "coach@flagos.ca" },
    isLeagueAdmin: false,
    setDevRole: mockSetDevRole,
  }),
}));

vi.mock("@/lib/themeContext", () => ({
  useTheme: () => ({
    resolvedTheme: "dark",
    setTheme: vi.fn(),
  }),
}));

// Mock firestore addDoc
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: "team_mock_123" }),
}));

describe("FlagOS Pricing & Packaging Page (PricingPage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateLeague.mockResolvedValue("league_new_99");
  });

  it("renders side-by-side subscription plans with correct base rates", () => {
    render(<PricingPage />);

    expect(screen.getByText("Plans Available for Teams & Leagues")).toBeInTheDocument();
    expect(screen.getAllByText("Team Subscription").length).toBeGreaterThan(0);
    expect(screen.getAllByText("League Subscription").length).toBeGreaterThan(0);

    // Standalone team plan is $30/mo
    expect(screen.getByText("$30")).toBeInTheDocument();

    // Default 8 teams league plan is $160/mo ($40 base + 8 * $15)
    expect(screen.getAllByText("$160").length).toBeGreaterThan(0);
  });

  it("dynamically recalculates total league price when slider or stepper buttons are pressed", () => {
    render(<PricingPage />);

    // Initial 8 teams -> $160
    expect(screen.getAllByText("$160").length).toBeGreaterThan(0);

    // Click increment '+' button -> 9 teams -> $40 + (9 * $15) = $175
    const plusButton = screen.getByRole("button", { name: "+" });
    fireEvent.click(plusButton);
    expect(screen.getAllByText("$175").length).toBeGreaterThan(0);
    expect(screen.getByText("9 Teams")).toBeInTheDocument();

    // Click decrement '-' button twice -> 7 teams -> $40 + (7 * $15) = $145
    const minusButton = screen.getByRole("button", { name: "-" });
    fireEvent.click(minusButton);
    fireEvent.click(minusButton);
    expect(screen.getAllByText("$145").length).toBeGreaterThan(0);
    expect(screen.getByText("7 Teams")).toBeInTheDocument();
  });

  it("filters feature comparison matrix rows when switching category tabs", () => {
    render(<PricingPage />);

    // Default "All Features" shows features across domains
    expect(screen.getByText("Custom Playbooks per Team")).toBeInTheDocument();
    expect(screen.getByText("Automated Seasonal Scheduler Engine")).toBeInTheDocument();

    // Switch to "Stat-Tracking" tab
    const statsTab = screen.getByRole("button", { name: "Stat-Tracking" });
    fireEvent.click(statsTab);
    expect(screen.getByText("Dynamic Play-by-Play Wizard (Asynchronous Mode)")).toBeInTheDocument();
    // Playbook-specific row should be filtered out
    expect(screen.queryByText("Custom Playbooks per Team")).toBeNull();

    // Switch to "Playbook Studio" tab
    const playbookTab = screen.getByRole("button", { name: "Playbook Studio" });
    fireEvent.click(playbookTab);
    expect(screen.getByText("Custom Playbooks per Team")).toBeInTheDocument();
    expect(screen.queryByText("Automated Seasonal Scheduler Engine")).toBeNull();

    // Switch to "League Ops" tab
    const leagueOpsTab = screen.getByRole("button", { name: "League Ops" });
    fireEvent.click(leagueOpsTab);
    expect(screen.getByText("Automated Seasonal Scheduler Engine")).toBeInTheDocument();
    expect(screen.queryByText("Dynamic Play-by-Play Wizard (Asynchronous Mode)")).toBeNull();
  });

  it("opens league creation modal, calculates team fees, and invokes createLeague handler", async () => {
    render(<PricingPage />);

    // Click Launch & Subscribe League button
    const subscribeButton = screen.getByRole("button", {
      name: /Launch & Subscribe League/i,
    });
    fireEvent.click(subscribeButton);

    // Modal is now open
    expect(screen.getByText("Subscribe League Portal")).toBeInTheDocument();

    // Fill in League Name and Shortcode
    const leagueNameInput = screen.getByPlaceholderText(/Gotham Flag Football League/i);
    const shortcodeInput = screen.getByPlaceholderText(/GFFL/i);

    fireEvent.change(leagueNameInput, { target: { value: "Apex Flag Championship" } });
    fireEvent.change(shortcodeInput, { target: { value: "APEX" } });

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /Confirm & Pay/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateLeague).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Apex Flag Championship",
          shortcode: "APEX",
          teamCount: 8,
        })
      );
      expect(mockSetDevRole).toHaveBeenCalledWith("league_admin");
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("opens team subscription modal and handles team creation", async () => {
    render(<PricingPage />);

    // Click Subscribe Team button
    const subscribeTeamBtn = screen.getByRole("button", {
      name: /Subscribe Team Portal/i,
    });
    fireEvent.click(subscribeTeamBtn);

    // Modal is now open
    expect(screen.getAllByText("Subscribe Team Portal").length).toBeGreaterThan(0);

    // Fill team name
    const teamNameInput = screen.getByPlaceholderText(/Apex Predators/i);
    fireEvent.change(teamNameInput, { target: { value: "Neon Raptors" } });

    // Submit team form
    const submitTeamBtn = screen.getByRole("button", { name: /Confirm & Pay \$30\/mo/i });
    fireEvent.click(submitTeamBtn);

    await waitFor(() => {
      expect(mockSetDevRole).toHaveBeenCalledWith("team_admin", "team_mock_123");
      expect(mockPush).toHaveBeenCalledWith("/teams/team_mock_123");
    });
  });
});
