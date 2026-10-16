import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LeagueDirectoryPage from "@/app/leagues/page";

// Mock LeagueContext
vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({
    activeLeagueId: "default",
    settings: {
      leagueName: "FlagOS Demo League",
      shortcode: "DEMO",
      tagline: "The Flag Football Operating System",
      seasonTitle: "2026 Championship",
      visibility: "public",
      rulesFormat: "5v5 Non-Contact",
      division: "Co-Ed",
      defaultLocation: "Metropolitan Sports Complex",
      primaryColor: "#0284c7",
      accentColor: "#38bdf8",
      rules: {
        playersOnField: 5,
        enableFreeAgents: true,
      },
    },
    userLeagues: [
      {
        id: "league_secret",
        name: "Secret Private Circuit",
        visibility: "private",
      },
    ],
    switchLeague: vi.fn(),
    subscription: null,
    isDemoLeague: true,
    isLeagueArchived: false,
    isSubscriptionPastDue: false,
    resumeSubscription: vi.fn(),
  }),
}));

// Mock AuthContext
vi.mock("@/lib/authContext", () => ({
  useAuth: () => ({
    user: { uid: "test-user-1", email: "athlete@example.com" },
    role: "user",
    isLeagueAdmin: false,
    isTeamAdmin: () => false,
    isPlayer: false,
    playerData: null,
    canRegisterAsPlayer: true,
    isAuthorized: true,
    playerTeamId: null,
    managedTeamId: null,
  }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/leagues",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("League Directory & Proximity Finder Suite (LeagueDirectoryPage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page hero and public directory circuits while excluding private leagues", () => {
    render(<LeagueDirectoryPage />);

    expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    expect(screen.getByText(/York University Women's Flag League/i)).toBeInTheDocument();
    expect(screen.getByText(/Toronto Flag League/i)).toBeInTheDocument();
    expect(screen.getByText(/GTA Premier 5v5 Flag Championship/i)).toBeInTheDocument();
    // Private circuits must be strictly excluded
    expect(screen.queryByText("Secret Private Circuit")).toBeNull();
  });

  it("filters circuits by keyword search (city or league name)", () => {
    render(<LeagueDirectoryPage />);

    const searchInput = screen.getByPlaceholderText(/Search by city/i);
    fireEvent.change(searchInput, { target: { value: "Ottawa" } });

    expect(screen.getByText(/National Capital Flag League/i)).toBeInTheDocument();
    expect(screen.queryByText(/York University Women's Flag League/i)).toBeNull();
  });

  it("switches metro regions and updates distance calculations", () => {
    render(<LeagueDirectoryPage />);

    const regionBtn = screen.getByRole("button", { name: "Hamilton / Niagara" });
    fireEvent.click(regionBtn);

    expect(screen.getByText(/Hamilton Steel City Flag Circuit/i)).toBeInTheDocument();
    expect(screen.getByText(/Center:/i)).toHaveTextContent("Hamilton / Niagara");
  });

  it("filters by ruleset format (e.g. 7v7 Screen)", () => {
    render(<LeagueDirectoryPage />);

    const formatSelect = screen.getByDisplayValue("All Formats");
    fireEvent.change(formatSelect, { target: { value: "7v7" } });

    expect(screen.getByText(/National Capital Flag League/i)).toBeInTheDocument();
    expect(screen.queryByText(/York University Women's Flag League/i)).toBeNull();
  });

  it("filters by division (e.g. Women's Flag)", () => {
    render(<LeagueDirectoryPage />);

    const divisionSelect = screen.getByDisplayValue("All Divisions");
    fireEvent.change(divisionSelect, { target: { value: "womens" } });

    expect(screen.getByText(/York University Women's Flag League/i)).toBeInTheDocument();
    expect(screen.queryByText(/Hamilton Steel City Flag Circuit/i)).toBeNull();
  });

  it("switches view modes between Cards, Venues, and Compare Table", () => {
    render(<LeagueDirectoryPage />);

    // Switch to Venues view
    const venuesBtn = screen.getByRole("button", { name: /Venues/i });
    fireEvent.click(venuesBtn);
    expect(screen.getAllByText(/Circuits Hosted at this Facility/i).length).toBeGreaterThan(0);

    // Switch to Compare Table view
    const tableBtn = screen.getByRole("button", { name: /Compare/i });
    fireEvent.click(tableBtn);
    expect(screen.getByText("Circuit & Format")).toBeInTheDocument();
    expect(screen.getByText("Team Fee")).toBeInTheDocument();
  });

  it("opens Contact Commissioner inquiry modal and submits message", async () => {
    render(<LeagueDirectoryPage />);

    const inquireBtns = screen.getAllByRole("button", { name: /Inquire/i });
    fireEvent.click(inquireBtns[0]);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Inquire with/i)).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Hello Coach\/Commissioner/i);
    fireEvent.change(textarea, { target: { value: "Looking to join as a free agent wide receiver." } });

    const sendBtn = screen.getByRole("button", { name: /Send Inquiry/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText(/Message Dispatched to Commissioner/i)).toBeInTheDocument();
    });
  });
});
