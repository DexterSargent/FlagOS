import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PricingPage from "@/app/pricing/page";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/",
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

let mockAuth = {
  user: { uid: "test-user-1", email: "coach@flagos.ca" },
  isLeagueAdmin: false,
  isPlatformAdmin: false,
  setDevRole: mockSetDevRole,
};

vi.mock("@/lib/authContext", () => ({
  useAuth: () => mockAuth,
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

const mockCreateSecureRecord = vi.fn();
vi.mock("@/lib/secureWrites", () => ({
  createSecureRecord: (...args: unknown[]) => mockCreateSecureRecord(...args),
}));

const ownerAuth = () => ({
  user: { uid: "owner-1", email: "dextersargent@flagos.ca", emailVerified: true },
  isLeagueAdmin: true,
  isPlatformAdmin: true,
  setDevRole: mockSetDevRole,
});

describe("FlagOS Pricing & Packaging Page (PricingPage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockCreateLeague.mockResolvedValue("league_new_99");
    mockCreateSecureRecord.mockResolvedValue("team_new_42");
    mockAuth = {
      user: { uid: "test-user-1", email: "coach@flagos.ca" },
      isLeagueAdmin: false,
      isPlatformAdmin: false,
      setDevRole: mockSetDevRole,
    };
  });

  it("renders side-by-side subscription plans with correct base rates", () => {
    render(<PricingPage />);

    expect(screen.getByText("Plans Available for Teams & Leagues")).toBeInTheDocument();
    expect(screen.getAllByText("Team Subscription").length).toBeGreaterThan(0);
    expect(screen.getAllByText("League Subscription").length).toBeGreaterThan(0);

    // Standalone team plan is $40/mo
    expect(screen.getAllByText("$40").length).toBeGreaterThan(0);

    // Default 4 teams league plan is $120/mo ($40 base + 4 * $20)
    expect(screen.getAllByText("$120").length).toBeGreaterThan(0);
    expect(screen.getByText("4 to 64 Teams")).toBeInTheDocument();
    expect(screen.getAllByText("/ month").length).toBeGreaterThan(0);
  });

  it("dynamically recalculates total league price when slider or stepper buttons are pressed", () => {
    render(<PricingPage />);

    // Initial 4 teams -> $120
    expect(screen.getAllByText("$120").length).toBeGreaterThan(0);

    // Click increment '+' button -> 5 teams -> $40 + (5 * $20) = $140
    const plusButton = screen.getByRole("button", { name: "Increase team count" });
    fireEvent.click(plusButton);
    expect(screen.getAllByText("$140").length).toBeGreaterThan(0);
    expect(screen.getByText("5 Teams")).toBeInTheDocument();

    // Decrementing twice stops at the 4-team minimum -> $120
    const minusButton = screen.getByRole("button", { name: "Decrease team count" });
    fireEvent.click(minusButton);
    fireEvent.click(minusButton);
    expect(screen.getAllByText("$120").length).toBeGreaterThan(0);
    expect(screen.getByText("4 Teams")).toBeInTheDocument();
  });

  it("filters feature comparison matrix rows when switching category tabs", () => {
    render(<PricingPage />);

    // Default "All Features" shows features across domains
    expect(screen.getAllByText("Custom Playbooks").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Automated Season Scheduler").length).toBeGreaterThan(0);

    // Switch to "Sideline Stats & Clocks" tab
    const statsTab = screen.getByRole("button", { name: /Sideline Stats & Clocks/i });
    fireEvent.click(statsTab);
    expect(screen.getAllByText("Clockless Sideline Stat Tracking").length).toBeGreaterThan(0);
    // Playbook-specific row should be filtered out
    expect(screen.queryAllByText("Custom Playbooks")).toHaveLength(0);

    // Switch to "Playbook Designer" tab
    const playbookTab = screen.getByRole("button", { name: /Playbook Designer/i });
    fireEvent.click(playbookTab);
    expect(screen.getAllByText("Custom Playbooks").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Automated Season Scheduler")).toHaveLength(0);

    // Switch to "League Operations" tab
    const leagueOpsTab = screen.getByRole("button", { name: /League Operations/i });
    fireEvent.click(leagueOpsTab);
    expect(screen.getAllByText("Automated Season Scheduler").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Clockless Sideline Stat Tracking")).toHaveLength(0);
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

  it("enables league creation modal and creates league when logged into owner email using subscribe button", async () => {
    mockAuth = ownerAuth() as typeof mockAuth;

    render(<PricingPage />);

    const subscribeButton = screen.getByRole("button", {
      name: /Create League \(no charge\)/i,
    });
    fireEvent.click(subscribeButton);

    // Modal should now be open
    expect(screen.getByPlaceholderText(/Gotham Flag Football League/i)).toBeInTheDocument();

    // Fill in form and submit
    fireEvent.change(screen.getByPlaceholderText(/Gotham Flag Football League/i), {
      target: { value: "Metro Flag League" },
    });
    fireEvent.change(screen.getByPlaceholderText(/GFFL/i), {
      target: { value: "MFL" },
    });

    const confirmBtn = screen.getByRole("button", { name: /Complimentary/i });
    fireEvent.click(confirmBtn);

    expect(mockCreateLeague).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Metro Flag League",
        shortcode: "MFL",
        primaryColor: "#3ca505",
        secondaryColor: "#3b82f6",
        tertiaryColor: "#ffffff",
        logoUrl: "/flagos-emblem-v2-512.png",
      })
    );
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/league/league_new_99"));
  });

  it("creates a league with custom primary, secondary, tertiary colors and custom logo", async () => {
    mockAuth = ownerAuth() as typeof mockAuth;
    render(<PricingPage />);

    fireEvent.click(screen.getByRole("button", { name: /Create League \(no charge\)/i }));
    fireEvent.change(screen.getByPlaceholderText(/Gotham Flag Football League/i), { target: { value: "Apex Flag League" } });
    fireEvent.change(screen.getByPlaceholderText(/GFFL/i), { target: { value: "AFL" } });
    fireEvent.change(screen.getByPlaceholderText(/Paste image URL/i), { target: { value: "https://example.com/crest.png" } });

    // Pick secondary color swatch
    fireEvent.click(screen.getByRole("button", { name: /League secondary color #06B6D4/i }));
    // Pick tertiary color swatch
    fireEvent.click(screen.getByRole("button", { name: /League tertiary color #FCD34D/i }));

    fireEvent.click(screen.getByRole("button", { name: /Complimentary/i }));

    expect(mockCreateLeague).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Apex Flag League",
        shortcode: "AFL",
        primaryColor: "#3ca505",
        secondaryColor: "#06B6D4",
        tertiaryColor: "#FCD34D",
        logoUrl: "https://example.com/crest.png",
      })
    );
  });

  it("creates a complimentary independent team for the owner and opens its portal", async () => {
    mockAuth = ownerAuth() as typeof mockAuth;
    render(<PricingPage />);

    fireEvent.click(screen.getByRole("button", { name: /Create Team Portal \(no charge\)/i }));
    fireEvent.change(screen.getByPlaceholderText(/Apex Predators/i), { target: { value: "Waterloo Wolves" } });
    fireEvent.change(screen.getByPlaceholderText(/APX/i), { target: { value: "wat" } });
    fireEvent.change(screen.getByLabelText(/Team Portal Visibility/i), { target: { value: "private" } });
    fireEvent.click(screen.getByRole("button", { name: /Complimentary/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/teams/team_new_42"));
    expect(mockCreateSecureRecord).toHaveBeenCalledWith("team", expect.objectContaining({
      name: "Waterloo Wolves",
      shortcode: "WAT",
      leagueId: "",
      isStandalone: true,
      visibility: "private",
      primaryColor: "#22c55e",
      secondaryColor: "#06b6d4",
      tertiaryColor: "#ffffff",
      logoUrl: "/flagos-emblem-v2-512.png",
      adminEmails: ["dextersargent@flagos.ca"],
      subscription: expect.objectContaining({ status: "active", paymentMethod: "complimentary" }),
    }));
  });

  it("creates a team with custom primary, secondary, tertiary colors and custom logo", async () => {
    mockAuth = ownerAuth() as typeof mockAuth;
    render(<PricingPage />);

    fireEvent.click(screen.getByRole("button", { name: /Create Team Portal \(no charge\)/i }));
    fireEvent.change(screen.getByPlaceholderText(/Apex Predators/i), { target: { value: "Viper Squad" } });
    fireEvent.change(screen.getByPlaceholderText(/APX/i), { target: { value: "VIP" } });
    fireEvent.change(screen.getByPlaceholderText(/Paste image URL/i), { target: { value: "https://example.com/viper.png" } });

    // Pick primary color swatch
    fireEvent.click(screen.getByRole("button", { name: /Team primary color #8B5CF6/i }));
    // Pick secondary color swatch
    fireEvent.click(screen.getByRole("button", { name: /Team secondary color #EC4899/i }));

    fireEvent.click(screen.getByRole("button", { name: /Complimentary/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/teams/team_new_42"));
    expect(mockCreateSecureRecord).toHaveBeenCalledWith("team", expect.objectContaining({
      name: "Viper Squad",
      shortcode: "VIP",
      primaryColor: "#8B5CF6",
      secondaryColor: "#EC4899",
      tertiaryColor: "#ffffff",
      logoUrl: "https://example.com/viper.png",
    }));
  });

  it("provisions a team when authenticated as dextersargent@flagos.ca", async () => {
    mockAuth = {
      user: { uid: "flagos-owner", email: "dextersargent@flagos.ca", emailVerified: true },
      isLeagueAdmin: true,
      isPlatformAdmin: true,
      setDevRole: mockSetDevRole,
    } as typeof mockAuth;
    render(<PricingPage />);

    fireEvent.click(screen.getByRole("button", { name: /Create Team Portal \(no charge\)/i }));
    fireEvent.change(screen.getByPlaceholderText(/Apex Predators/i), { target: { value: "FlagOS Raptors" } });
    fireEvent.change(screen.getByPlaceholderText(/APX/i), { target: { value: "RAP" } });
    fireEvent.click(screen.getByRole("button", { name: /Complimentary/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/teams/team_new_42"));
    expect(mockCreateSecureRecord).toHaveBeenCalledWith("team", expect.objectContaining({
      name: "FlagOS Raptors",
      shortcode: "RAP",
      adminEmails: ["dextersargent@flagos.ca"],
    }));
  });

  it("shows the server error inside the checkout instead of a generic notice", async () => {
    mockAuth = ownerAuth() as typeof mockAuth;
    mockCreateSecureRecord.mockRejectedValue(new Error("Write rate limit reached."));
    render(<PricingPage />);

    fireEvent.click(screen.getByRole("button", { name: /Create Team Portal \(no charge\)/i }));
    fireEvent.change(screen.getByPlaceholderText(/Apex Predators/i), { target: { value: "Wolves" } });
    fireEvent.click(screen.getByRole("button", { name: /Complimentary/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Write rate limit reached.");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("ignores the local dev-role override for non-owner accounts", () => {
    localStorage.setItem("dev_auth_role", "league_admin");
    render(<PricingPage />);

    fireEvent.click(screen.getByRole("button", { name: /Launch & Subscribe League/i }));
    expect(screen.getByRole("dialog")).toHaveTextContent("FlagOS is still in development");
    expect(screen.queryByPlaceholderText(/Gotham Flag Football League/i)).not.toBeInTheDocument();
  });
});
