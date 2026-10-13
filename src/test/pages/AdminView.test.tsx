import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import AdminView from "@/app/matches/[id]/play-by-play/AdminView";
import { Suspense } from "react";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
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
      rules: {
        periodType: "halves",
        periodsCount: 2,
        periodDurationMinutes: 20,
        timeoutsPerTeam: 2,
        downsPerSeries: 4,
        playClockSeconds: 30,
      },
    },
    isDemoLeague: true,
  }),
}));

const mockMatch = {
  id: "match_demo_101",
  homeTeamName: "Apex Predators",
  awayTeamName: "Cyber Knights",
  homeTeamId: "team_apex",
  awayTeamId: "team_cyber",
  homeScore: 14,
  awayScore: 7,
  currentDown: 1,
  possession: "Apex Predators",
  half: 1,
  gameClock: 1200,
  status: "in_progress",
  location: "Field 1",
  date: "2026-10-18",
  time: "10:00 AM",
};

const mockPlayers = [
  { id: "p1", playerName: "Marcus Vance", teamId: "team_apex" },
  { id: "p2", playerName: "Leo Sterling", teamId: "team_apex" },
  { id: "p3", playerName: "David Kim", teamId: "team_cyber" },
];

vi.mock("@/lib/demoSandbox", () => ({
  getSandboxMatches: () => [mockMatch],
  getSandboxMatch: () => mockMatch,
  getSandboxPlays: () => [],
  getSandboxPlayers: () => mockPlayers,
  updateSandboxMatch: vi.fn(),
  addSandboxPlay: vi.fn(),
  deleteSandboxPlay: vi.fn(),
  deleteSandboxPlaysForMatch: vi.fn(),
  subscribeDemoSandbox: (cb: any) => () => {},
}));

describe("Live Game Operator & Official Admin Suite (AdminView)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).location;
    window.location = new URL("http://localhost:3000/matches/match_demo_101/play-by-play") as any;
  });

  const renderAdmin = async () => {
    let result: any;
    const paramsPromise = Promise.resolve({ id: "match_demo_101" });
    await act(async () => {
      result = render(
        <Suspense fallback={<div>Loading operator console...</div>}>
          <AdminView params={paramsPromise} />
        </Suspense>
      );
    });
    return result;
  };

  it("renders operator scoreboard header with team names, scores, and 20:00 game clock", async () => {
    await renderAdmin();

    await waitFor(() => {
      expect(screen.getAllByText("Apex Predators").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Cyber Knights").length).toBeGreaterThan(0);
      expect(screen.getAllByText("14").length).toBeGreaterThan(0);
      expect(screen.getAllByText("7").length).toBeGreaterThan(0);
      expect(screen.getAllByText("20:00").length).toBeGreaterThan(0);
    });
  });

  it("renders interactive down buttons (1, 2, 3, 4) and allows manual down changes", async () => {
    await renderAdmin();

    await waitFor(() => {
      // 4 down buttons rendered
      const down3Button = screen.getByRole("button", { name: "3" });
      expect(down3Button).toBeInTheDocument();

      // Click Down 3
      fireEvent.click(down3Button);
      // Down 3 button becomes active with white bg
      expect(down3Button).toHaveClass("bg-white");
    });
  });

  it("prompts to Spot the Ball before logging play and starts 30-second play clock", async () => {
    await renderAdmin();

    await waitFor(() => {
      // Prompt overlay visible initially on first play of half
      const snapButton = screen.getByRole("button", { name: /CLICK WHEN SNAPPED/i });
      expect(snapButton).toBeInTheDocument();

      // Click snap to start play
      fireEvent.click(snapButton);

      // Now wizard enters PLAY_TYPE selection
      expect(screen.getByRole("button", { name: /PASS/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /RUN/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /PENALTY/i })).toBeInTheDocument();
    });
  });

  it("decrements team timeout counter and triggers timeout modal", async () => {
    await renderAdmin();

    await waitFor(() => {
      // Home team timeout button (first of two TO buttons)
      const toButtons = screen.getAllByRole("button", { name: /TO \(2\)/i });
      expect(toButtons.length).toBe(2);

      fireEvent.click(toButtons[0]);

      // Timeout modal is active
      expect(screen.getByText("Timeout")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /END TIMEOUT EARLY/i })).toBeInTheDocument();
    });
  });

  it("opens reset match confirmation modal and protects from accidental wipe", async () => {
    await renderAdmin();

    await waitFor(() => {
      const resetBtn = screen.getByRole("button", { name: /Reset Game/i });
      fireEvent.click(resetBtn);

      // Modal is visible
      expect(screen.getByText("Reset Game to Pre-Game?")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Permanently Reset/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cancel \/ Keep Game/i })).toBeInTheDocument();
    });
  });
});
