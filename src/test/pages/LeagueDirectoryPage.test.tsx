import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LeagueDirectoryPage from "@/app/leagues/page";

// Mock Firestore
const mockGetDocs = vi.fn();
vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name) => ({ name })),
  query: vi.fn((ref) => ref),
  limit: vi.fn(),
  getDocs: (...args: any[]) => mockGetDocs(...args),
}));

const mockSwitchLeague = vi.fn();

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
      {
        id: "league_user_created",
        name: "Metro West Flag League",
        shortcode: "MWFL",
        visibility: "public",
        teamCount: 6,
        primaryColor: "#10b981",
        accentColor: "#059669",
      },
    ],
    switchLeague: mockSwitchLeague,
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
    mockGetDocs.mockResolvedValue({ docs: [] });
  });

  it("renders page hero and public directory circuits while excluding private leagues", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/York University Women's Flag League/i)).toBeInTheDocument();
    expect(screen.getByText(/Toronto Flag League/i)).toBeInTheDocument();
    expect(screen.getByText(/GTA Premier 5v5 Flag Championship/i)).toBeInTheDocument();
    // Private circuits must be strictly excluded
    expect(screen.queryByText("Secret Private Circuit")).toBeNull();
  });

  it("fetches and displays real existing leagues from Firestore with Live Circuit badge and team counts", async () => {
    mockGetDocs.mockImplementation(async (ref: { name?: string }) => {
      if (ref?.name === "leagues") {
        return {
          docs: [
            {
              id: "league_ontario_live_1",
              data: () => ({
                leagueName: "Ontario Premier Flag Championship",
                shortcode: "OPFC",
                tagline: "Live Competitive Gridiron",
                seasonTitle: "2026 Live Season",
                visibility: "public",
                primaryColor: "#e11d48",
                accentColor: "#fb7185",
                rules: { playersOnField: 7, contactLevel: "screen" },
                defaultLocation: "Downsview Park Stadium",
              }),
            },
          ],
        };
      }
      if (ref?.name === "teams") {
        return {
          docs: [
            { data: () => ({ leagueId: "league_ontario_live_1" }) },
            { data: () => ({ leagueId: "league_ontario_live_1" }) },
            { data: () => ({ leagueId: "league_ontario_live_1" }) },
            { data: () => ({ leagueId: "league_ontario_live_1" }) },
          ],
        };
      }
      return { docs: [] };
    });

    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Ontario Premier Flag Championship")).toBeInTheDocument();
    });

    expect(screen.getByText("OPFC")).toBeInTheDocument();
    expect(screen.getByText("Downsview Park Stadium")).toBeInTheDocument();
    expect(screen.getByText("4 Teams")).toBeInTheDocument();
    expect(screen.getAllByText("Live Circuit").length).toBeGreaterThan(0);
  });

  it("allows users to click Set Active to switch active league directly from directory", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

    const setActiveBtns = screen.getAllByRole("button", { name: /Set Active/i });
    expect(setActiveBtns.length).toBeGreaterThan(0);

    fireEvent.click(setActiveBtns[0]);
    expect(mockSwitchLeague).toHaveBeenCalled();
  });

  it("filters directory by category: All Circuits vs Live Leagues vs My Leagues", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

    // Click "My Leagues"
    const myLeaguesBtn = screen.getByRole("button", { name: /My Leagues/i });
    fireEvent.click(myLeaguesBtn);

    expect(screen.getByText("Metro West Flag League")).toBeInTheDocument();
    expect(screen.queryByText("Toronto Flag League")).toBeNull();

    // Click back to "All Circuits"
    const allBtn = screen.getByRole("button", { name: /All Circuits/i });
    fireEvent.click(allBtn);

    expect(screen.getByText(/Toronto Flag League/i)).toBeInTheDocument();
  });

  it("filters circuits by keyword search (city or league name)", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by city/i);
    fireEvent.change(searchInput, { target: { value: "Ottawa" } });

    expect(screen.getByText(/National Capital Flag League/i)).toBeInTheDocument();
    expect(screen.queryByText(/York University Women's Flag League/i)).toBeNull();
  });

  it("switches metro regions and updates distance calculations", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

    const regionBtn = screen.getByRole("button", { name: "Hamilton / Niagara" });
    fireEvent.click(regionBtn);

    expect(screen.getByText(/Hamilton Steel City Flag Circuit/i)).toBeInTheDocument();
    expect(screen.getByText(/Center:/i)).toHaveTextContent("Hamilton / Niagara");
  });

  it("filters by ruleset format (e.g. 7v7 Screen)", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

    const formatSelect = screen.getByDisplayValue("All Formats");
    fireEvent.change(formatSelect, { target: { value: "7v7" } });

    expect(screen.getByText(/National Capital Flag League/i)).toBeInTheDocument();
    expect(screen.queryByText(/York University Women's Flag League/i)).toBeNull();
  });

  it("filters by division (e.g. Women's Flag)", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

    const divisionSelect = screen.getByDisplayValue("All Divisions");
    fireEvent.change(divisionSelect, { target: { value: "womens" } });

    expect(screen.getByText(/York University Women's Flag League/i)).toBeInTheDocument();
    expect(screen.queryByText(/Hamilton Steel City Flag Circuit/i)).toBeNull();
  });

  it("switches view modes between Cards, Venues, and Compare Table", async () => {
    render(<LeagueDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

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

    await waitFor(() => {
      expect(screen.getByText(/Find a Flag Football League/i)).toBeInTheDocument();
    });

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
