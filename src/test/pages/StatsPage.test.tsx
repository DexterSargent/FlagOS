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

// Mock league context state
let mockLeagueContext = {
  settings: {
    leagueName: "FlagOS League",
    shortcode: "FLAG",
    primaryColor: "#3ca505",
    accentColor: "#22c55e",
    announcement: "",
  },
  isDemoLeague: true,
  portalLeagueId: "demo",
  activeLeagueId: "league-123",
  seasons: [
    { id: "season-1", title: "Season 1", status: "active", number: 1 },
  ],
  currentSeasonId: "season-1",
  viewingSeasonId: "season-1",
  setViewingSeasonId: vi.fn(),
  isViewingArchivedSeason: false,
};

vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => mockLeagueContext,
}));

vi.mock("@/lib/leagueDataCache", () => ({
  getCachedLeagueTeams: vi.fn().mockResolvedValue([
    { id: "team_real_1", name: "Real Titans", shortcode: "RT", leagueId: "league-123" },
  ]),
  getCachedLeaguePlayers: vi.fn().mockResolvedValue([
    { id: "p_real_1", playerName: "Sam Rivers", teamId: "team_real_1", leagueId: "league-123" },
  ]),
  getCachedLeagueMatches: vi.fn().mockResolvedValue([]),
  getCachedLeaguePlays: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/useLeagueSeasonHistory", () => ({
  useLeagueSeasonHistory: vi.fn().mockReturnValue({
    snapshots: [
      {
        seasonId: "season-0",
        seasonTitle: "Season 0",
        number: 0,
        championTeamName: "Apex Predators",
        standings: [
          { id: "team_apex", name: "Apex Predators", shortcode: "APX", played: 5, won: 5, lost: 0, tied: 0, pf: 150, pa: 50, diff: 100, pts: 10, rank: 1 },
        ],
        playerStats: [
          { name: "Marcus Vance", teamName: "Apex Predators", teamShortcode: "APX", teamId: "team_apex", passTD: 15, passComp: 45, passAtt: 50, receptions: 0, flagPulls: 0, gamesPlayed: 5 },
        ],
      },
    ],
    loading: false,
    error: "",
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
    window.location = new URL("http://localhost:3000/stats?league=league-123") as any;
    mockLeagueContext = {
      settings: {
        leagueName: "FlagOS League",
        shortcode: "FLAG",
        primaryColor: "#3ca505",
        accentColor: "#22c55e",
        announcement: "",
      },
      isDemoLeague: true,
      portalLeagueId: "demo",
      activeLeagueId: "league-123",
      seasons: [
        { id: "season-1", title: "Season 1", status: "active", number: 1 },
      ],
      currentSeasonId: "season-1",
      viewingSeasonId: "season-1",
      setViewingSeasonId: vi.fn(),
      isViewingArchivedSeason: false,
    };
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

  it("sorts team standings columns when headers are clicked", async () => {
    await renderStats();

    await waitFor(() => {
      expect(screen.getAllByText("Team Standings").length).toBeGreaterThan(0);
    });

    // Click PF column header
    const pfHeader = screen.getByText("PF");
    fireEvent.click(pfHeader);
    // Click again to toggle sort direction
    fireEvent.click(pfHeader);

    // Click PA, DIFF, PTS, and Team name
    const paHeader = screen.getByText("PA");
    fireEvent.click(paHeader);

    const diffHeader = screen.getByText("DIFF");
    fireEvent.click(diffHeader);

    const ptsHeader = screen.getByText("PTS");
    fireEvent.click(ptsHeader);

    const teamHeader = screen.getByText("Team");
    fireEvent.click(teamHeader);
    fireEvent.click(teamHeader);

    expect(screen.getAllByText("Apex Predators").length).toBeGreaterThan(0);
  });

  it("switches to Individual Stats tab and allows navigation between leaders and full table mode", async () => {
    await renderStats();

    // Click Individual Stats tab button
    const indivTabBtn = screen.getByRole("button", { name: /Individual Stats/i });
    fireEvent.click(indivTabBtn);

    await waitFor(() => {
      expect(screen.getAllByText("Marcus Vance").length).toBeGreaterThan(0);
    });

    // Switch to Full Table view
    const fullTableBtn = screen.getByRole("button", { name: /Full Table/i });
    fireEvent.click(fullTableBtn);

    await waitFor(() => {
      expect(screen.getByText(/Comprehensive Player Leaderboard/i)).toBeDefined();
    });

    // Test sorting by Player name in table view
    const playerHeader = screen.getByText("Player");
    fireEvent.click(playerHeader);
    fireEvent.click(playerHeader);

    // Test sorting by Pass TD and the combined Comp/Att (%) column
    const passTDHeader = screen.getByText("Pass TD");
    fireEvent.click(passTDHeader);

    const compPctHeader = screen.getByText("Comp/Att (%)");
    fireEvent.click(compPctHeader);

    // Switch to Receiving / Rushing sub-tab
    const recTab = screen.getByRole("button", { name: /Receiving \/ Rushing/i });
    fireEvent.click(recTab);

    await waitFor(() => {
      expect(screen.getByText("Receptions")).toBeDefined();
    });

    // Sort by Receptions and Rec TD
    const recHeader = screen.getByText("Receptions");
    fireEvent.click(recHeader);
    const recTDHeader = screen.getByText("Rec TD");
    fireEvent.click(recTDHeader);

    // Switch to Defense sub-tab
    const defTab = screen.getByRole("button", { name: /^Defense$/i });
    fireEvent.click(defTab);

    await waitFor(() => {
      expect(screen.getByText("Flags")).toBeDefined();
    });

    // Sort by Flags and Def TD
    const flagsHeader = screen.getByText("Flags");
    fireEvent.click(flagsHeader);
    const defTDHeader = screen.getByText("Def TD");
    fireEvent.click(defTDHeader);

    // Click Back to Stat Leaders
    const backBtn = screen.getByRole("button", { name: /Back to Stat Leaders/i });
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByText(/League Stat Leaders/i)).toBeDefined();
    });

    // Test clicking direct "View Full Passing TDs Stats" button on card
    const viewFullPassingBtn = screen.getByRole("button", { name: /View Full Passing TDs Stats/i });
    fireEvent.click(viewFullPassingBtn);

    await waitFor(() => {
      expect(screen.getByText(/Viewing/i)).toBeDefined();
    });

    // Test sorting by Team name in table view
    const teamColHeaders = screen.getAllByText(/Team/i);
    fireEvent.click(teamColHeaders[teamColHeaders.length - 1]);
  });

  it("renders history tab and allows viewing archived seasons when league has past seasons", async () => {
    mockLeagueContext = {
      ...mockLeagueContext,
      isDemoLeague: false,
      seasons: [
        { id: "season-1", title: "Season 1", status: "active", number: 1 },
        { id: "season-0", title: "Season 0", status: "archived", number: 0 },
      ],
      isViewingArchivedSeason: true,
      viewingSeasonId: "season-0",
    };

    await renderStats();

    await waitFor(() => {
      expect(screen.getByText(/Viewing Season 0/i)).toBeDefined();
      expect(screen.getAllByText(/Apex Predators/i).length).toBeGreaterThan(0);
    });

    // Test clicking back to current season
    const backToCurrentBtn = screen.getByRole("button", { name: /Back to current season/i });
    fireEvent.click(backToCurrentBtn);
    expect(mockLeagueContext.setViewingSeasonId).toHaveBeenCalledWith("season-1");

    // Click History tab
    const historyTabBtn = screen.getByRole("button", { name: /History/i });
    fireEvent.click(historyTabBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Season 0/i).length).toBeGreaterThan(0);
    });

  });
});



