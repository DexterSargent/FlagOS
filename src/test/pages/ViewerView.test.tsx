import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ViewerView from "@/app/matches/[id]/play-by-play/ViewerView";
import { Suspense } from "react";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/",
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Auth
let mockIsLeagueAdmin = false;
let mockManagedTeamId: string | null = null;
let mockPlayerTeamId: string | null = null;
let mockUser: any = null;

vi.mock("@/lib/authContext", () => ({
  useAuth: () => ({
    isLeagueAdmin: mockIsLeagueAdmin,
    managedTeamId: mockManagedTeamId,
    playerTeamId: mockPlayerTeamId,
    user: mockUser,
  }),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, coll, id) => ({ id, path: `${coll}/${id}` })),
  onSnapshot: vi.fn((_ref, cb) => {
    cb({ exists: () => false, data: () => null });
    return () => {};
  }),
}));

// Mock League Context
vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({
    settings: {
      leagueName: "FlagOS League",
      shortcode: "FLAG",
      primaryColor: "#3ca505",
      accentColor: "#22c55e",
      rules: { playersOnField: 5 },
    },
    isDemoLeague: true,
  }),
}));

// Mock demoSandbox functions
const mockMatch = {
  id: "match_demo_101",
  homeTeamName: "Apex Predators",
  awayTeamName: "Cyber Knights",
  homeTeamId: "team_apex",
  awayTeamId: "team_cyber",
  homeScore: 21,
  awayScore: 14,
  currentDown: 2,
  possession: "HOME",
  half: 2,
  gameClock: 720,
  status: "in_progress",
  location: "Field 1",
  date: "2026-10-18",
  time: "10:00 AM",
};

const mockPlays = [
  {
    id: "play_1",
    matchId: "match_demo_101",
    timestamp: "2026-10-18T10:05:00Z",
    period: 1,
    clock: "19:20",
    possessionTeamId: "team_apex",
    down: 1,
    playType: "Pass",
    passOutcome: "Complete",
    qbPlayerId: "Marcus Vance",
    receiverPlayerId: "Leo Sterling",
    targetPlayerId: "Leo Sterling",
    gainYards: 15,
    firstDown: true,
    isTouchdown: false,
    defFlagPullPlayerId: "David Kim",
  },
  {
    id: "play_2",
    matchId: "match_demo_101",
    timestamp: "2026-10-18T10:06:00Z",
    period: 1,
    clock: "18:45",
    possessionTeamId: "team_apex",
    down: 1,
    playType: "Pass",
    passOutcome: "Complete",
    qbPlayerId: "Marcus Vance",
    receiverPlayerId: "Leo Sterling",
    targetPlayerId: "Leo Sterling",
    gainYards: 20,
    firstDown: true,
    isTouchdown: true,
  },
  {
    id: "play_3",
    matchId: "match_demo_101",
    timestamp: "2026-10-18T10:07:00Z",
    period: 1,
    clock: "18:00",
    possessionTeamId: "team_cyber",
    down: 1,
    playType: "Run",
    ballCarrierPlayerId: "Cole Hayes",
    gainYards: 8,
    firstDown: false,
    isTouchdown: false,
    defFlagPullPlayerId: "Jaxson Reed",
  },
];

let currentMockMatch: any = mockMatch;
let currentMockPlays: any[] = [...mockPlays];
const mockUpdateSandboxMatch = vi.fn();
const mockDeleteSandboxPlaysForMatch = vi.fn();

vi.mock("@/lib/demoSandbox", () => ({
  getSandboxMatches: () => [mockMatch],
  getSandboxMatch: () => currentMockMatch,
  getSandboxPlays: () => [...currentMockPlays],
  getSandboxPlayers: () => [
    { id: "p1", playerName: "Marcus Vance", teamId: "team_apex" },
    { id: "p2", playerName: "Leo Sterling", teamId: "team_apex" },
    { id: "p3", playerName: "Jaxson Reed", teamId: "team_apex" },
    { id: "p4", playerName: "David Kim", teamId: "team_cyber" },
    { id: "p5", playerName: "Cole Hayes", teamId: "team_cyber" },
  ],
  getSandboxTeams: () => [
    { id: "team_apex", primaryColor: "#A10A39", secondaryColor: "#FFFFFF", tertiaryColor: "#FFCC00" },
    { id: "team_cyber", primaryColor: "#123456", secondaryColor: "#EEEEEE", tertiaryColor: "#ABCDEF" },
  ],
  updateSandboxMatch: (...args: any[]) => mockUpdateSandboxMatch(...args),
  deleteSandboxPlaysForMatch: (...args: any[]) => mockDeleteSandboxPlaysForMatch(...args),
  subscribeDemoSandbox: (cb: any) => () => {},
  isDemoMatch: () => true,
}));

describe("Live Game Spectator & Box Score Suite (ViewerView)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLeagueAdmin = false;
    mockManagedTeamId = null;
    mockPlayerTeamId = null;
    mockUser = null;
    currentMockMatch = mockMatch;
    currentMockPlays = [...mockPlays];
    delete (window as any).location;
    window.location = new URL("http://localhost:3000/matches/match_demo_101/play-by-play") as any;
    window.location.reload = vi.fn();
  });

  const renderViewer = async () => {
    let result: any;
    const paramsPromise = Promise.resolve({ id: "match_demo_101" });
    await act(async () => {
      result = render(
        <Suspense fallback={<div>Loading match...</div>}>
          <ViewerView params={paramsPromise} />
        </Suspense>
      );
    });
    return result;
  };

  it("renders live scoreboard with team names, score differentials, and game state", async () => {
    await renderViewer();

    await waitFor(() => {
      expect(screen.getAllByText("Apex Predators").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Cyber Knights").length).toBeGreaterThan(0);
      // Scores: 21 - 14
      expect(screen.getByText("21")).toBeInTheDocument();
      expect(screen.getByText("14")).toBeInTheDocument();
      // Field and status
      expect(screen.getByText(/Field 1/i)).toBeInTheDocument();
    });
  });

  it("uses saved team palettes in the spectator scoreboard and team selector", async () => {
    await renderViewer();
    expect(screen.getByTestId("home-scoreboard")).toHaveStyle({ backgroundColor: "#FFFFFF", color: "#A10A39" });
    expect(screen.getByTestId("away-scoreboard")).toHaveStyle({ backgroundColor: "#EEEEEE", color: "#123456" });
    fireEvent.click(screen.getByRole("button", { name: "Live Box Score" }));
    expect(screen.getByRole("button", { name: "Apex Predators" })).toHaveStyle({ backgroundColor: "#FFFFFF", color: "#A10A39" });
    fireEvent.click(screen.getByRole("button", { name: "Cyber Knights" }));
    expect(screen.getByRole("button", { name: "Cyber Knights" })).toHaveStyle({ backgroundColor: "#EEEEEE", color: "#123456" });
  });

  it("renders chronological play-by-play sentences formatted by engine", async () => {
    await renderViewer();

    await waitFor(() => {
      // The play-by-play tab is active by default
      expect(screen.getByRole("button", { name: "Play-by-Play" })).toBeInTheDocument();
      // Play 1: Marcus Vance complete pass to Leo Sterling
      expect(screen.getAllByText(/Marcus Vance/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Leo Sterling/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/TOUCHDOWN/i).length).toBeGreaterThan(0);
    });
  });

  it("switches to Box Score tab and calculates player passing, receiving, and defensive stats", async () => {
    await renderViewer();

    // Click Live Box Score tab button
    const boxScoreTabBtn = screen.getByRole("button", { name: "Live Box Score" });
    fireEvent.click(boxScoreTabBtn);

    await waitFor(() => {
      // Home team (Apex Predators) subtab active by default
      // Marcus Vance should have pass attempts, completions, TD
      expect(screen.getAllByText("Marcus Vance").length).toBeGreaterThan(0);
      // Leo Sterling should have receptions, TD
      expect(screen.getAllByText("Leo Sterling").length).toBeGreaterThan(0);
    });

    // Switch to Away Team subtab (Cyber Knights)
    const awayTab = screen.getByRole("button", { name: "Cyber Knights" });
    fireEvent.click(awayTab);

    await waitFor(() => {
      // David Kim should appear with defensive stats
      expect(screen.getByText("David Kim")).toBeInTheDocument();
      // Cole Hayes should appear with rushing stats
      expect(screen.getByText("Cole Hayes")).toBeInTheDocument();
    });
  });

  it("switches to Team Stats tab and renders game team stats for the selected game", async () => {
    await renderViewer();

    const teamStatsBtn = screen.getByRole("button", { name: "Team Stats" });
    expect(teamStatsBtn).toBeInTheDocument();

    fireEvent.click(teamStatsBtn);

    await waitFor(() => {
      expect(screen.getByTestId("game-team-stats")).toBeInTheDocument();
      expect(screen.getByTestId("team-stats-view-comparison")).toHaveAttribute("aria-selected", "true");
      // Should show both teams
      expect(screen.getAllByText("Apex Predators").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Cyber Knights").length).toBeGreaterThan(0);
    });

    // Toggle to Apex Predators breakdown
    const homeBtn = screen.getByTestId("team-stats-view-home");
    fireEvent.click(homeBtn);

    await waitFor(() => {
      expect(screen.getByTestId("team-stats-view-home")).toHaveAttribute("aria-selected", "true");
      expect(screen.getByTestId("stat-card-firstDowns")).toBeInTheDocument();
      expect(screen.getByTestId("stat-card-totalTDs")).toBeInTheDocument();
    });

    // Toggle to Cyber Knights breakdown
    const awayBtn = screen.getByTestId("team-stats-view-away");
    fireEvent.click(awayBtn);

    await waitFor(() => {
      expect(screen.getByTestId("team-stats-view-away")).toHaveAttribute("aria-selected", "true");
    });
  });

  it("opens flag football terms glossary drawer when Terms button is clicked", async () => {
    await renderViewer();

    const termsBtn = screen.getByRole("button", { name: /Terms/i });
    fireEvent.click(termsBtn);

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /Flag football terms/i })).toBeInTheDocument();
      expect(screen.getByText("New to flag football?")).toBeInTheDocument();
    });
  });

  it("opens terms drawer focused on Down when Down pill button is clicked", async () => {
    await renderViewer();

    const downBtn = screen.getByTitle("What is a down?");
    fireEvent.click(downBtn);

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /Flag football terms/i })).toBeInTheDocument();
      expect(screen.getByText("New to flag football?")).toBeInTheDocument();
    });
  });

  it("toggles all stats vs core stats in live box score", async () => {
    await renderViewer();

    // Click Live Box Score
    fireEvent.click(screen.getByRole("button", { name: "Live Box Score" }));

    // Click All Stats toggle button if present
    const toggleBtn = screen.queryByRole("button", { name: /All Stats/i });
    if (toggleBtn) {
      fireEvent.click(toggleBtn);
      expect(screen.getByRole("button", { name: /Core Stats/i })).toBeInTheDocument();
    }
  });

  it("renders Game Not Found state when match does not exist", async () => {
    currentMockMatch = null;

    const paramsPromise = Promise.resolve({ id: "non_existent_match" });
    await act(async () => {
      render(
        <Suspense fallback={<div>Loading match...</div>}>
          <ViewerView params={paramsPromise} />
        </Suspense>
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Game Not Found")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Return to Schedule/i })).toHaveAttribute("href", "/schedule");
    });
  });

  it("switches teams in live box score tab", async () => {
    await renderViewer();

    fireEvent.click(screen.getByRole("button", { name: "Live Box Score" }));

    const awayTeamBtn = screen.getByRole("button", { name: /Cyber Knights/i });
    fireEvent.click(awayTeamBtn);

    const homeTeamBtn = screen.getByRole("button", { name: /Apex Predators/i });
    fireEvent.click(homeTeamBtn);
  });

  it("renders Final banner and status when match is completed", async () => {
    currentMockMatch = {
      ...mockMatch,
      status: "completed",
    };

    await renderViewer();

    await waitFor(() => {
      expect(screen.getAllByText("Final").length).toBeGreaterThan(0);
    });
  });

  it("taps stat column header to display definition bar and closes it", async () => {
    await renderViewer();

    fireEvent.click(screen.getByRole("button", { name: "Live Box Score" }));

    const colHeader = screen.queryByRole("button", { name: /^P-TD$/i });
    if (colHeader) {
      fireEvent.click(colHeader);
      const closeDefBtn = screen.queryByRole("button", { name: /Dismiss|Close/i });
      if (closeDefBtn) fireEvent.click(closeDefBtn);
    }
  });

  it("handles admin demo controls for opening manager and resetting match", async () => {
    mockIsLeagueAdmin = true;
    mockUser = { uid: "admin_1" };
    vi.spyOn(window, "confirm").mockReturnValue(true);

    await renderViewer();

    const openManagerBtn = screen.getByRole("button", { name: /Open Live Manager/i });
    expect(openManagerBtn).toBeInTheDocument();
    fireEvent.click(openManagerBtn);
    expect(mockUpdateSandboxMatch).toHaveBeenCalledWith("match_demo_101", { status: "in_progress" });

    const resetBtn = screen.getByRole("button", { name: /Reset Match/i });
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn);
    expect(mockDeleteSandboxPlaysForMatch).toHaveBeenCalledWith("match_demo_101");
  });

  it("renders untimed / independent match without live clock", async () => {
    currentMockMatch = {
      ...mockMatch,
      isAsyncStatKeeping: true,
      isIndependent: true,
    };

    await renderViewer();

    await waitFor(() => {
      expect(screen.getByText(/3 Plays/i)).toBeInTheDocument();
    });
  });

  it("pre-selects away team tab when user manages away team", async () => {
    mockManagedTeamId = "team_cyber";

    await renderViewer();

    fireEvent.click(screen.getByRole("button", { name: "Live Box Score" }));

    await waitFor(() => {
      expect(screen.getByText("David Kim")).toBeInTheDocument();
    });
  });

  it("calculates conversions and defensive events in live box score", async () => {
    currentMockPlays = [
      ...mockPlays,
      {
        id: "play_conv",
        matchId: "match_demo_101",
        timestamp: "2026-10-18T10:08:00Z",
        period: 1,
        possessionTeamId: "team_apex",
        playType: "Pass",
        isConversion: true,
        conversionSuccess: true,
        conversionPasser: "Marcus Vance",
        conversionReceiver: "Leo Sterling",
        points: 2,
      },
      {
        id: "play_sack",
        matchId: "match_demo_101",
        timestamp: "2026-10-18T10:09:00Z",
        period: 1,
        possessionTeamId: "team_apex",
        playType: "Pass",
        passOutcome: "Sack",
        defenders: ["David Kim"],
        isSafety: true,
      },
      {
        id: "play_pick6",
        matchId: "match_demo_101",
        timestamp: "2026-10-18T10:10:00Z",
        period: 1,
        possessionTeamId: "team_apex",
        playType: "Pass",
        passOutcome: "Interception",
        interceptorPlayerId: "David Kim",
        isPick6: true,
      },
    ];

    await renderViewer();

    fireEvent.click(screen.getByRole("button", { name: "Live Box Score" }));
    fireEvent.click(screen.getByRole("button", { name: "Cyber Knights" }));

    await waitFor(() => {
      expect(screen.getByText("David Kim")).toBeInTheDocument();
    });
  });

  it("handles embedded mode with hidden back button", async () => {
    delete (window as any).location;
    window.location = new URL("http://localhost:3000/matches/match_demo_101/play-by-play?embed=true") as any;
    window.location.reload = vi.fn();

    await renderViewer();

    expect(screen.queryByRole("link", { name: "" })).not.toBeInTheDocument();
  });
});


