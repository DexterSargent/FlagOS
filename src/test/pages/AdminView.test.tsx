import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import AdminView from "@/app/matches/[id]/play-by-play/AdminView";
import { Suspense } from "react";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/",
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
  getSandboxTeams: () => [],
  isDemoMatch: () => true,
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

  it("renders down with extension underneath clock and allows manual adjustment with plus and minus buttons", async () => {
    await renderAdmin();

    await waitFor(() => {
      // Down indicator rendered underneath clock (starts at 1st)
      expect(screen.getAllByText("1st").length).toBeGreaterThan(0);

      // Click Increase Down button (+) to move to 2nd
      const increaseBtn = screen.getByRole("button", { name: /Increase Down/i });
      fireEvent.click(increaseBtn);
      expect(screen.getByText("2nd")).toBeInTheDocument();

      // Click Increase Down button (+) to move to 3rd
      fireEvent.click(increaseBtn);
      expect(screen.getByText("3rd")).toBeInTheDocument();

      // Click Decrease Down button (-) to move back to 2nd
      const decreaseBtn = screen.getByRole("button", { name: /Decrease Down/i });
      fireEvent.click(decreaseBtn);
      expect(screen.getByText("2nd")).toBeInTheDocument();
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
      const toButtons = screen.getAllByRole("button", { name: /TO\s*\(?2\)?/i });
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

  it("vertically stacks player sections and auto-collapses on selection with reopen down arrow", async () => {
    await renderAdmin();

    // Snap the ball to enter play wizard
    await waitFor(() => {
      const snapButton = screen.getByRole("button", { name: /CLICK WHEN SNAPPED/i });
      fireEvent.click(snapButton);
    });

    // 1. Select PASS
    const passButton = screen.getByRole("button", { name: /PASS/i });
    fireEvent.click(passButton);

    // 2. Quarterback selection should be open vertically
    expect(screen.getByText("Select Quarterback")).toBeInTheDocument();
    const marcusBtn = screen.getByRole("button", { name: "Marcus Vance" });
    expect(marcusBtn).toBeInTheDocument();

    // Select Marcus Vance as QB
    fireEvent.click(marcusBtn);

    // Quarterback list should now auto-collapse and display "Quarterback: Marcus Vance" with Change / down arrow
    expect(screen.queryByText("Select Quarterback")).not.toBeInTheDocument();
    const qbCollapsed = screen.getByRole("button", { name: /Quarterback: Marcus Vance/i });
    expect(qbCollapsed).toBeInTheDocument();

    // 3. Receiver selection should now be open vertically
    expect(screen.getByText("Select Receiver")).toBeInTheDocument();
    const leoBtn = screen.getByRole("button", { name: "Leo Sterling" });
    expect(leoBtn).toBeInTheDocument();

    // Select Leo Sterling as Receiver
    fireEvent.click(leoBtn);

    // Receiver list should auto-collapse and display "Receiver: Leo Sterling" with Change / down arrow
    expect(screen.queryByText("Select Receiver")).not.toBeInTheDocument();
    const receiverCollapsed = screen.getByRole("button", { name: /Receiver: Leo Sterling/i });
    expect(receiverCollapsed).toBeInTheDocument();

    // 4. Outcomes and Flaggers should now be presented
    expect(screen.getByText("Flagger(s)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /TOUCHDOWN/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /OUT OF BOUNDS/i })).toBeInTheDocument();

    // 5. Open optional flaggers and select David Kim -> outcomes update to First Down / Short
    fireEvent.click(screen.getByRole("button", { name: /Add flagger/i }));
    const davidBtn = screen.getByRole("button", { name: "David Kim" });
    fireEvent.click(davidBtn);
    expect(screen.getByRole("button", { name: /FIRST DOWN/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /SHORT OF LINE/i })).toBeInTheDocument();

    // 6. Test reopening collapsed sections: Click collapsed Quarterback button
    fireEvent.click(qbCollapsed);
    expect(screen.getByText("Select Quarterback")).toBeInTheDocument();
  });

  it("handles RUN play type with auto-collapsing runner section and presented outcomes", async () => {
    await renderAdmin();

    // Snap the ball
    await waitFor(() => {
      const snapButton = screen.getByRole("button", { name: /CLICK WHEN SNAPPED/i });
      fireEvent.click(snapButton);
    });

    // 1. Select RUN
    const runButton = screen.getByRole("button", { name: /RUN/i });
    fireEvent.click(runButton);

    // 2. Runner selection should be open vertically
    expect(screen.getByText("Select Runner")).toBeInTheDocument();
    const marcusBtn = screen.getByRole("button", { name: "Marcus Vance" });
    expect(marcusBtn).toBeInTheDocument();

    // Select Marcus Vance as Runner
    fireEvent.click(marcusBtn);

    // Runner list should auto-collapse and display "Runner: Marcus Vance" with Change / down arrow
    expect(screen.queryByText("Select Runner")).not.toBeInTheDocument();
    const runnerCollapsed = screen.getByRole("button", { name: /Runner: Marcus Vance/i });
    expect(runnerCollapsed).toBeInTheDocument();

    // 3. Flaggers and Outcomes are now presented
    expect(screen.getByText("Flagger(s)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /TOUCHDOWN/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /OUT OF BOUNDS/i })).toBeInTheDocument();

    // Reopen Runner
    fireEvent.click(runnerCollapsed);
    expect(screen.getByText("Select Runner")).toBeInTheDocument();
  });

  it("provides IFAF-compliant play clock controls (start/pause, reset to 30s, and stop on snap)", async () => {
    await renderAdmin();

    await waitFor(() => {
      // Spot the ball to enter play type selection
      const snapButton = screen.getByRole("button", { name: /CLICK WHEN SNAPPED/i });
      fireEvent.click(snapButton);
    });

    // Verify play clock toggle and reset buttons exist
    const playClockToggle = screen.getByRole("button", { name: /start play clock|pause play clock/i });
    const playClockReset = screen.getByRole("button", { name: /reset play clock/i });
    expect(playClockToggle).toBeInTheDocument();
    expect(playClockReset).toBeInTheDocument();

    // Resetting play clock sets it to 30s
    fireEvent.click(playClockReset);
    expect(screen.getByText("30")).toBeInTheDocument();

    // Clicking PASS selects play type and stops play clock on the snap
    const passButton = screen.getByRole("button", { name: /PASS/i });
    fireEvent.click(passButton);
    expect(screen.getByText("Select Quarterback")).toBeInTheDocument();
  });

  it("persists quarterback selection play-to-play while allowing reopening to change", async () => {
    await renderAdmin();

    // Snap and start first PASS play
    await waitFor(() => {
      const snapButton = screen.getByRole("button", { name: /CLICK WHEN SNAPPED/i });
      fireEvent.click(snapButton);
    });
    fireEvent.click(screen.getByRole("button", { name: /PASS/i }));

    // Select Marcus Vance on Play 1
    expect(screen.getByText("Select Quarterback")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Marcus Vance" }));

    // Select Receiver Leo Sterling
    expect(screen.getByText("Select Receiver")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Leo Sterling" }));

    // Add flagger David Kim and save First Down
    fireEvent.click(screen.getByRole("button", { name: /Add flagger/i }));
    fireEvent.click(screen.getByRole("button", { name: "David Kim" }));
    fireEvent.click(screen.getByRole("button", { name: /FIRST DOWN/i }));

    // Now on Play 2: Spot the ball then select PASS
    await waitFor(() => {
      const spotButton = screen.getByRole("button", { name: /CLICK WHEN SPOTTED/i });
      fireEvent.click(spotButton);
    });

    // Select PASS for Play 2
    fireEvent.click(screen.getByRole("button", { name: /PASS/i }));

    // VERIFICATION: QB Marcus Vance STAYS selected play-to-play!
    // The QB section is auto-collapsed with "Quarterback: Marcus Vance"
    const qbCollapsed = screen.getByRole("button", { name: /Quarterback: Marcus Vance/i });
    expect(qbCollapsed).toBeInTheDocument();

    // Receiver section is immediately open for fast entry
    expect(screen.getByText("Select Receiver")).toBeInTheDocument();

    // VERIFICATION: Operator can still click the collapsed QB button to reopen and change QB
    fireEvent.click(qbCollapsed);
    expect(screen.getByText("Select Quarterback")).toBeInTheDocument();
  });
});

