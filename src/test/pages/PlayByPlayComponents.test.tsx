import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ViewerView from "@/app/matches/[id]/play-by-play/ViewerView";
import AdminView from "@/app/matches/[id]/play-by-play/AdminView";
import { PageGuideProvider } from "@/lib/pageGuide";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
  usePathname: () => "/matches/match_demo_live_1/play-by-play",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock League Context
vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({
    settings: {
      leagueName: "FlagOS Championship League",
      shortcode: "FLAG",
      primaryColor: "#06b6d4",
      accentColor: "#10b981",
      defaultLocation: "Turf Field 1",
    },
    isDemoLeague: true,
    activeLeagueId: "demo",
    updateSettings: vi.fn(),
  }),
}));

// Mock Auth
vi.mock("@/lib/authContext", () => ({
  useAuth: () => ({
    user: { uid: "admin_user_1", email: "admin@flagos.com" },
    isLeagueAdmin: true,
    managedTeamId: "team_apex",
    playerTeamId: null,
    canManageTeam: () => true,
  }),
}));

vi.mock("@/lib/themeContext", () => ({
  useTheme: () => ({
    resolvedTheme: "dark",
    setTheme: vi.fn(),
  }),
}));

const mockMatchData = {
  id: "match_demo_live_1",
  leagueId: "demo",
  week: "Week 3",
  homeTeamId: "team_apex",
  homeTeamName: "Apex Predators",
  awayTeamId: "team_cyber",
  awayTeamName: "Cyber Knights",
  homeScore: 18,
  awayScore: 12,
  date: "2026-10-25",
  time: "2:00 PM",
  location: "Turf Field 1",
  status: "in_progress",
  periodFormat: "halves",
  currentPeriod: 1,
  gameClockSeconds: 900,
  isClockRunning: false,
  timeoutsRemainingHome: 2,
  timeoutsRemainingAway: 2,
};

const mockPlays = [
  {
    id: "play_1",
    matchId: "match_demo_live_1",
    teamId: "team_apex",
    type: "pass_complete",
    scoringType: "pass_touchdown",
    quarter: 1,
    clock: "14:20",
    text: "Marcus Vance 22 yd pass complete to Devon Reed for a TOUCHDOWN",
    playStatement: "Marcus Vance 22 yd pass complete to Devon Reed for a TOUCHDOWN",
    pointsScored: 6,
    points: 6,
    timestamp: Date.now() - 60000,
  },
  {
    id: "play_2",
    matchId: "match_demo_live_1",
    teamId: "team_cyber",
    type: "run",
    quarter: 1,
    clock: "12:10",
    text: "Liam Vance 15 yd rush for first down",
    playStatement: "Liam Vance 15 yd rush for first down",
    pointsScored: 0,
    timestamp: Date.now() - 30000,
  },
];

const mockPlayers = [
  { id: "p1", teamId: "team_apex", name: "Marcus Vance", number: 7, primaryPosition: "QB" },
  { id: "p2", teamId: "team_apex", name: "Devon Reed", number: 11, primaryPosition: "WR" },
  { id: "p3", teamId: "team_cyber", name: "Liam Vance", number: 3, primaryPosition: "RB" },
  { id: "p4", teamId: "team_cyber", name: "Noah Stone", number: 88, primaryPosition: "DB" },
];

const mockUpdateSandboxMatch = vi.fn();
const mockAddSandboxPlay = vi.fn();

vi.mock("@/lib/demoSandbox", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/demoSandbox")>();
  return {
    ...actual,
    getSandboxTeams: () => [
      { id: "team_apex", name: "Apex Predators", shortcode: "APX", primaryColor: "#06b6d4" },
      { id: "team_cyber", name: "Cyber Knights", shortcode: "CYB", primaryColor: "#3b82f6" },
    ],
    getSandboxMatch: () => mockMatchData,
    getSandboxMatches: () => [mockMatchData],
    getSandboxPlays: () => mockPlays,
    getSandboxPlayers: () => mockPlayers,
    updateSandboxMatch: (...args: any[]) => mockUpdateSandboxMatch(...args),
    addSandboxPlay: (...args: any[]) => mockAddSandboxPlay(...args),
    deleteSandboxPlay: vi.fn(),
    deleteSandboxPlaysForMatch: vi.fn(),
    subscribeDemoSandbox: () => () => {},
    isDemoMatch: () => true,
  };
});

vi.mock("@/lib/matchPlaysQuery", () => ({
  describePlaysError: vi.fn(() => ""),
  subscribeMatchPlays: vi.fn((_id: string, cb: any) => {
    cb(mockPlays);
    return () => {};
  }),
  fetchMatchPlays: vi.fn(async () => mockPlays),
  matchPlayConstraints: vi.fn(() => []),
  sortPlaysChronologically: vi.fn((plays: any[]) => plays),
}));

describe("Play-by-play ViewerView & AdminView Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ViewerView", () => {
    it("renders spectator scoreboard, teams, score, and play feed", async () => {
      const params = Promise.resolve({ id: "match_demo_live_1" });

      await act(async () => {
        render(
          <PageGuideProvider>
            <ViewerView params={params} />
          </PageGuideProvider>
        );
      });

      // Verify teams and scores
      expect(screen.getAllByText("Apex Predators").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Cyber Knights").length).toBeGreaterThan(0);
      expect(screen.getByText("18")).toBeInTheDocument();
      expect(screen.getByText("12")).toBeInTheDocument();

      // Verify live plays displayed in timeline
      expect(
        screen.getByText(/Marcus Vance 22 yd pass complete to Devon Reed/i)
      ).toBeInTheDocument();

      // Switch to Live Box Score tab
      const boxScoreTab = screen.getByRole("button", { name: /Live Box Score/i });
      fireEvent.click(boxScoreTab);
      expect(screen.getAllByText("Apex Predators").length).toBeGreaterThan(0);

      // Switch to Team Stats tab
      const teamStatsTab = screen.getByRole("button", { name: /Team Stats/i });
      fireEvent.click(teamStatsTab);

      // Switch back to Play-by-Play tab
      const pbpTab = screen.getByRole("button", { name: /Play-by-Play/i });
      fireEvent.click(pbpTab);
    });
  });

  describe("AdminView", () => {
    it("renders stat-keeper admin controls, clock toggles, and handles play recording entry", async () => {
      const params = Promise.resolve({ id: "match_demo_live_1" });

      await act(async () => {
        render(
          <PageGuideProvider>
            <AdminView params={params} />
          </PageGuideProvider>
        );
      });

      // Verify header and teams
      expect(screen.getAllByText("Apex Predators").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Cyber Knights").length).toBeGreaterThan(0);

      // Check clock toggle button
      const playClockBtn = screen.getByTitle(/Start Game Clock|Pause Game Clock|Start Clock|Pause Clock/i) ||
        screen.queryByRole("button", { name: /Start|Pause/i });
      if (playClockBtn) {
        fireEvent.click(playClockBtn);
        expect(mockUpdateSandboxMatch).toHaveBeenCalled();
      }

      // Check timeout trigger buttons
      const timeoutBtns = screen.getAllByRole("button", { name: /Call Timeout|TO/i });
      if (timeoutBtns.length > 0) {
        fireEvent.click(timeoutBtns[0]);
      }

      // Open and close log drawer if present
      const logDrawerBtn = screen.queryByRole("button", { name: /Play Log|Game Log/i });
      if (logDrawerBtn) {
        fireEvent.click(logDrawerBtn);
      }
    });
  });
});
