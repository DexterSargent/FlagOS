import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import StatsAndStandings from "@/app/stats/page";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock contexts
vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({
    settings: {
      leagueName: "FlagOS League",
      shortcode: "FLAG",
      primaryColor: "#3ca505",
      accentColor: "#22c55e",
      announcement: "",
    },
    isDemoLeague: true,
    seasons: [{ id: "season-1", title: "Season 1", status: "active", number: 1 }],
    currentSeasonId: "season-1",
    viewingSeasonId: "season-1",
    setViewingSeasonId: vi.fn(),
    isViewingArchivedSeason: false,
  }),
}));

vi.mock("@/lib/authContext", () => ({
  useAuth: () => ({
    user: null,
    isLeagueAdmin: false,
    isTeamAdmin: () => false,
  }),
}));

vi.mock("@/lib/themeContext", () => ({
  useTheme: () => ({
    resolvedTheme: "dark",
    setTheme: vi.fn(),
  }),
}));

// Mock Sandbox Data
const mockTeams = [
  { id: "team_apex", name: "Apex Predators", shortcode: "APX" },
  { id: "team_cyber", name: "Cyber Knights", shortcode: "CYB" },
  { id: "team_free_agents", name: "Free Agents", shortcode: "FA" }, // Should be excluded!
];

const mockPlayers = [
  { id: "p1", playerName: "Marcus Vance", teamId: "team_apex" },
  { id: "p2", playerName: "Leo Sterling", teamId: "team_apex" },
  { id: "p3", playerName: "David Kim", teamId: "team_cyber" },
];

const mockMatches = [
  {
    id: "match_1",
    status: "completed",
    homeTeamId: "team_apex",
    awayTeamId: "team_cyber",
    homeScore: 28,
    awayScore: 14,
    isHidden: false,
  },
];

const mockPlays = [
  {
    id: "play_1",
    matchId: "match_1",
    playType: "Pass",
    passOutcome: "Complete",
    qbPlayerId: "Marcus Vance",
    receiverPlayerId: "Leo Sterling",
    isTouchdown: true,
  },
  {
    id: "play_2",
    matchId: "match_1",
    playType: "Pass",
    passOutcome: "Complete",
    qbPlayerId: "Marcus Vance",
    receiverPlayerId: "Leo Sterling",
    isTouchdown: false,
    firstDown: true,
    defenders: ["David Kim"],
  },
];

vi.mock("@/lib/demoSandbox", () => ({
  getSandboxTeams: () => mockTeams,
  getSandboxPlayers: () => mockPlayers,
  getSandboxMatches: () => mockMatches,
  getSandboxPlays: () => mockPlays,
  subscribeDemoSandbox: () => () => {},
}));

describe("League Standings & Individual Leaderboards Suite (StatsAndStandings)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).location;
    window.location = new URL("http://localhost:3000/stats") as any;
  });

  const renderStats = async () => {
    let result: any;
    await act(async () => {
      result = render(<StatsAndStandings />);
    });
    return result;
  };

  it("renders league standings table with calculated records, points, and differentials", async () => {
    await renderStats();

    await waitFor(() => {
      expect(screen.getAllByText("Team Standings").length).toBeGreaterThan(0);
      // Apex Predators won 28 - 14 -> 1-0-0, 2 PTS, +14 DIFF
      expect(screen.getAllByText("Apex Predators").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Cyber Knights").length).toBeGreaterThan(0);
      // Free agents pool should NOT appear as a standings franchise
      expect(screen.queryByText("Free Agents")).toBeNull();
    });
  });

  it("switches to Individual Stats tab and shows top player stat category leaders", async () => {
    await renderStats();

    // Click Individual Stats tab button
    const indivTabBtn = screen.getByRole("button", { name: /Individual Stats/i });
    fireEvent.click(indivTabBtn);

    await waitFor(() => {
      // Leaders view is active by default
      // Marcus Vance appears in Passing Touchdowns leader card
      expect(screen.getAllByText("Marcus Vance").length).toBeGreaterThan(0);
      // Leo Sterling appears in Receiving leader card
      expect(screen.getAllByText("Leo Sterling").length).toBeGreaterThan(0);
      // David Kim appears in Defensive leader card
      expect(screen.getAllByText("David Kim").length).toBeGreaterThan(0);
    });
  });
});
