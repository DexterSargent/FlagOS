import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

  it("shows a development notice instead of starting a league purchase", () => {
    render(<PricingPage />);

    const subscribeButton = screen.getByRole("button", {
      name: /Launch & Subscribe League/i,
    });
    fireEvent.click(subscribeButton);

    expect(screen.getByRole("dialog")).toHaveTextContent("FlagOS is still in development");
    expect(screen.getByRole("dialog")).toHaveTextContent("No payment will be taken");
    expect(screen.queryByPlaceholderText(/Gotham Flag Football League/i)).not.toBeInTheDocument();
    expect(mockCreateLeague).not.toHaveBeenCalled();
  });

  it("shows the same purchase notice instead of creating a team", () => {
    render(<PricingPage />);

    const subscribeTeamBtn = screen.getByRole("button", {
      name: /Subscribe Team Portal/i,
    });
    fireEvent.click(subscribeTeamBtn);

    expect(screen.getByRole("dialog")).toHaveTextContent("FlagOS is still in development");
    expect(screen.queryByPlaceholderText(/Apex Predators/i)).not.toBeInTheDocument();
  });
});
