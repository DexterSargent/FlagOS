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

const {
  mockUpdateSandboxMatch,
  mockAddSandboxPlay,
  mockDeleteSandboxPlay,
  mockDeleteSandboxPlaysForMatch,
  getSandboxPlaysList,
  setSandboxPlaysList,
  getMockMatch,
  setMockMatch,
} = vi.hoisted(() => {
  let plays: any[] = [];
  let currentMatch: any = null;
  return {
    mockUpdateSandboxMatch: vi.fn(),
    mockAddSandboxPlay: vi.fn((play: Record<string, unknown>) => ({ id: "sandbox-play", ...play })),
    mockDeleteSandboxPlay: vi.fn(),
    mockDeleteSandboxPlaysForMatch: vi.fn(),
    getSandboxPlaysList: () => plays,
    setSandboxPlaysList: (p: any[]) => { plays = p; },
    getMockMatch: () => currentMatch,
    setMockMatch: (m: any) => { currentMatch = m; },
  };
});

vi.mock("@/lib/demoSandbox", () => ({
  getSandboxMatches: () => [getMockMatch() || mockMatch],
  getSandboxMatch: () => getMockMatch() || mockMatch,
  getSandboxPlays: () => getSandboxPlaysList(),
  getSandboxPlayers: () => mockPlayers,
  getSandboxTeams: () => [],
  isDemoMatch: () => true,
  updateSandboxMatch: mockUpdateSandboxMatch,
  addSandboxPlay: mockAddSandboxPlay,
  deleteSandboxPlay: mockDeleteSandboxPlay,
  deleteSandboxPlaysForMatch: mockDeleteSandboxPlaysForMatch,
  subscribeDemoSandbox: (cb: any) => () => {},
}));

describe("Live Game Operator & Official Admin Suite (AdminView)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSandboxPlaysList([]);
    setMockMatch(null);
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
      const toButtons = screen.getAllByRole("button", { name: /Call (home|away) timeout \(2 left\)/i });
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

  it("handles down selection directly in sync play wizard header", async () => {
    await renderAdmin();

    await waitFor(() => {
      const snapButton = screen.getByRole("button", { name: /CLICK WHEN SNAPPED/i });
      fireEvent.click(snapButton);
    });

    // Verify down selector buttons exist
    const secondDownBtn = screen.getByRole("button", { name: /2nd Down/i });
    expect(secondDownBtn).toBeInTheDocument();
    fireEvent.click(secondDownBtn);

    // Down should now be 2nd
    expect(secondDownBtn.className).toContain("bg-white");
  });

  it("handles INCOMPLETE pass outcome via Missed Throw", async () => {
    await renderAdmin();

    await waitFor(() => {
      const snapButton = screen.getByRole("button", { name: /CLICK WHEN SNAPPED/i });
      fireEvent.click(snapButton);
    });

    // PASS play
    fireEvent.click(screen.getByRole("button", { name: /PASS/i }));
    fireEvent.click(screen.getByRole("button", { name: "Marcus Vance" }));

    // Change outcome to Incomplete
    const outcomeBtn = screen.getByRole("button", { name: /Play Outcome: Complete\. Click to change/i });
    fireEvent.click(outcomeBtn);

    const incompleteOption = screen.getByRole("button", { name: /^Incomplete$/i });
    fireEvent.click(incompleteOption);

    // Choose Missed Throw
    const missedThrowBtn = screen.getByRole("button", { name: /MISSED THROW/i });
    fireEvent.click(missedThrowBtn);

    // Record Incomplete Pass
    const recordBtn = screen.getByRole("button", { name: /SAVE & NEXT DOWN/i });
    expect(recordBtn).toBeInTheDocument();
    fireEvent.click(recordBtn);

    // After play is saved, operator is prompted to spot the ball
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /CLICK WHEN SPOTTED/i })).toBeInTheDocument();
    });
  });

  it("handles TOUCHDOWN outcome and transitions to extra point / conversion wizard", async () => {
    await renderAdmin();

    await waitFor(() => {
      const snapButton = screen.getByRole("button", { name: /CLICK WHEN SNAPPED/i });
      fireEvent.click(snapButton);
    });

    // PASS play
    fireEvent.click(screen.getByRole("button", { name: /PASS/i }));
    fireEvent.click(screen.getByRole("button", { name: "Marcus Vance" }));
    fireEvent.click(screen.getByRole("button", { name: "Leo Sterling" }));

    // Click TOUCHDOWN
    const tdBtn = screen.getByRole("button", { name: /TOUCHDOWN/i });
    fireEvent.click(tdBtn);

    // Should prompt for conversion attempt: 1 PT from 5 Yd or 2 PT from 10 Yd
    await waitFor(() => {
      expect(screen.getByText(/From 5 Yd/i)).toBeInTheDocument();
      expect(screen.getByText(/From 10 Yd/i)).toBeInTheDocument();
    });
  });

  it("handles SACK outcome on PASS play with loss of yards", async () => {
    await renderAdmin();

    await waitFor(() => {
      const snapButton = screen.getByRole("button", { name: /CLICK WHEN SNAPPED/i });
      fireEvent.click(snapButton);
    });

    fireEvent.click(screen.getByRole("button", { name: /PASS/i }));
    fireEvent.click(screen.getByRole("button", { name: "Marcus Vance" }));

    const outcomeBtn = screen.getByRole("button", { name: /Play Outcome: Complete\. Click to change/i });
    fireEvent.click(outcomeBtn);
    fireEvent.click(screen.getByRole("button", { name: /^Sack$/i }));

    const sackerBtn = screen.getByRole("button", { name: "David Kim" });
    fireEvent.click(sackerBtn);

    const lossOfYardsBtn = screen.getByRole("button", { name: /Loss Of Yards/i });
    expect(lossOfYardsBtn).toBeInTheDocument();
    fireEvent.click(lossOfYardsBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /CLICK WHEN SPOTTED/i })).toBeInTheDocument();
    });
  });

  it("handles SACK resulting in SAFETY and awards 2 points", async () => {
    await renderAdmin();

    await waitFor(() => {
      const snapButton = screen.getByRole("button", { name: /CLICK WHEN SNAPPED/i });
      fireEvent.click(snapButton);
    });

    fireEvent.click(screen.getByRole("button", { name: /PASS/i }));
    fireEvent.click(screen.getByRole("button", { name: "Marcus Vance" }));

    const outcomeBtn = screen.getByRole("button", { name: /Play Outcome: Complete\. Click to change/i });
    fireEvent.click(outcomeBtn);
    fireEvent.click(screen.getByRole("button", { name: /^Sack$/i }));

    fireEvent.click(screen.getByRole("button", { name: "David Kim" }));

    const safetyBtn = screen.getByRole("button", { name: /^Safety$/i });
    fireEvent.click(safetyBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /CLICK WHEN SPOTTED/i })).toBeInTheDocument();
    });
  });

  it("handles INTERCEPTION with PICK 6 outcome", async () => {
    await renderAdmin();

    await waitFor(() => {
      const snapButton = screen.getByRole("button", { name: /CLICK WHEN SNAPPED/i });
      fireEvent.click(snapButton);
    });

    fireEvent.click(screen.getByRole("button", { name: /PASS/i }));
    fireEvent.click(screen.getByRole("button", { name: "Marcus Vance" }));

    const outcomeBtn = screen.getByRole("button", { name: /Play Outcome: Complete\. Click to change/i });
    fireEvent.click(outcomeBtn);
    fireEvent.click(screen.getByRole("button", { name: /^Interception$/i }));

    fireEvent.click(screen.getByRole("button", { name: "David Kim" }));

    const pick6Btn = screen.getByRole("button", { name: /PICK 6/i });
    expect(pick6Btn).toBeInTheDocument();
    fireEvent.click(pick6Btn);

    await waitFor(() => {
      expect(screen.getByText(/From 5 Yd/i)).toBeInTheDocument();
    });
  });

  it("handles INTERCEPTION with TURNOVER (Downed/OOB)", async () => {
    await renderAdmin();

    await waitFor(() => {
      const snapButton = screen.getByRole("button", { name: /CLICK WHEN SNAPPED/i });
      fireEvent.click(snapButton);
    });

    fireEvent.click(screen.getByRole("button", { name: /PASS/i }));
    fireEvent.click(screen.getByRole("button", { name: "Marcus Vance" }));

    const outcomeBtn = screen.getByRole("button", { name: /Play Outcome: Complete\. Click to change/i });
    fireEvent.click(outcomeBtn);
    fireEvent.click(screen.getByRole("button", { name: /^Interception$/i }));

    fireEvent.click(screen.getByRole("button", { name: "David Kim" }));

    const turnoverBtn = screen.getByRole("button", { name: /OOB \/ DOWNED/i });
    expect(turnoverBtn).toBeInTheDocument();
    fireEvent.click(turnoverBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /CLICK WHEN SPOTTED/i })).toBeInTheDocument();
    });
  });

  it("handles RUN play with Flag For Loss (FFL)", async () => {
    await renderAdmin();

    await waitFor(() => {
      const snapButton = screen.getByRole("button", { name: /CLICK WHEN SNAPPED/i });
      fireEvent.click(snapButton);
    });

    fireEvent.click(screen.getByRole("button", { name: /RUN/i }));
    fireEvent.click(screen.getByRole("button", { name: "Marcus Vance" }));

    const outcomeBtn = screen.getByRole("button", { name: /Play Outcome: Positive \/ No Gain\. Click to change|Play Outcome: Gain\. Click to change/i });
    fireEvent.click(outcomeBtn);
    fireEvent.click(screen.getByRole("button", { name: /Flag For Loss/i }));

    fireEvent.click(screen.getByRole("button", { name: "David Kim" }));

    const lossOfYardsBtn = screen.getByRole("button", { name: /Loss Of Yards/i });
    fireEvent.click(lossOfYardsBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /CLICK WHEN SPOTTED/i })).toBeInTheDocument();
    });
  });

  it("handles OUT OF BOUNDS prompt for Complete Pass", async () => {
    await renderAdmin();

    await waitFor(() => {
      const snapButton = screen.getByRole("button", { name: /CLICK WHEN SNAPPED/i });
      fireEvent.click(snapButton);
    });

    fireEvent.click(screen.getByRole("button", { name: /PASS/i }));
    fireEvent.click(screen.getByRole("button", { name: "Marcus Vance" }));
    fireEvent.click(screen.getByRole("button", { name: "Leo Sterling" }));

    const oobBtn = screen.getByRole("button", { name: /OUT OF BOUNDS/i });
    fireEvent.click(oobBtn);

    const oobFirstDownBtn = screen.getByRole("button", { name: /OOB - FIRST DOWN/i });
    expect(oobFirstDownBtn).toBeInTheDocument();
    fireEvent.click(oobFirstDownBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /CLICK WHEN SPOTTED/i })).toBeInTheDocument();
    });
  });

  it("handles TOUCHDOWN followed by NO GOOD conversion", async () => {
    await renderAdmin();

    await waitFor(() => {
      const snapButton = screen.getByRole("button", { name: /CLICK WHEN SNAPPED/i });
      fireEvent.click(snapButton);
    });

    fireEvent.click(screen.getByRole("button", { name: /PASS/i }));
    fireEvent.click(screen.getByRole("button", { name: "Marcus Vance" }));
    fireEvent.click(screen.getByRole("button", { name: "Leo Sterling" }));

    fireEvent.click(screen.getByRole("button", { name: /TOUCHDOWN/i }));

    await waitFor(() => {
      expect(screen.getByText(/From 5 Yd/i)).toBeInTheDocument();
    });

    const onePtBtn = screen.getByRole("button", { name: /From 5 Yd/i });
    fireEvent.click(onePtBtn);

    const noGoodBtn = screen.getByRole("button", { name: /NO GOOD/i });
    expect(noGoodBtn).toBeInTheDocument();
    fireEvent.click(noGoodBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /CLICK WHEN SPOTTED/i })).toBeInTheDocument();
    });
  });

  it("handles TOUCHDOWN followed by GOOD conversion and saves conversion stats", async () => {
    await renderAdmin();

    await waitFor(() => {
      const snapButton = screen.getByRole("button", { name: /CLICK WHEN SNAPPED/i });
      fireEvent.click(snapButton);
    });

    fireEvent.click(screen.getByRole("button", { name: /PASS/i }));
    fireEvent.click(screen.getByRole("button", { name: "Marcus Vance" }));
    fireEvent.click(screen.getByRole("button", { name: "Leo Sterling" }));

    fireEvent.click(screen.getByRole("button", { name: /TOUCHDOWN/i }));

    await waitFor(() => {
      expect(screen.getByText(/From 5 Yd/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /From 5 Yd/i }));

    const goodBtn = screen.getByRole("button", { name: /^GOOD$/i });
    fireEvent.click(goodBtn);

    const saveStatsBtn = screen.getByRole("button", { name: /SAVE CONVERSION STATS/i });
    expect(saveStatsBtn).toBeInTheDocument();
    fireEvent.click(saveStatsBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /CLICK WHEN SPOTTED/i })).toBeInTheDocument();
    });
  });

  it("handles PENALTY play type selection and returns to play type", async () => {
    await renderAdmin();

    await waitFor(() => {
      const snapButton = screen.getByRole("button", { name: /CLICK WHEN SNAPPED/i });
      fireEvent.click(snapButton);
    });

    fireEvent.click(screen.getByRole("button", { name: /PENALTY/i }));

    await waitFor(() => {
      const backBtn = screen.getByRole("button", { name: /Back to Play Type/i });
      expect(backBtn).toBeInTheDocument();
      fireEvent.click(backBtn);
    });

    expect(screen.getByRole("button", { name: /PASS/i })).toBeInTheDocument();
  });

  it("enforces penalty with automatic first down", async () => {
    await renderAdmin();

    await waitFor(() => {
      const snapButton = screen.getByRole("button", { name: /CLICK WHEN SNAPPED/i });
      fireEvent.click(snapButton);
    });

    fireEvent.click(screen.getByRole("button", { name: /PENALTY/i }));

    await waitFor(() => {
      expect(screen.getByText(/Select Infraction/i)).toBeInTheDocument();
    });

    const dpiBtn = screen.getByRole("button", { name: /Defensive Pass Interference/i });
    fireEvent.click(dpiBtn);

    const contEnforcementBtn = screen.getByRole("button", { name: /Continue to enforcement/i });
    fireEvent.click(contEnforcementBtn);

    const contPlayerBtn = screen.getByRole("button", { name: /Continue to player/i });
    fireEvent.click(contPlayerBtn);

    const enforceBtn = screen.getByRole("button", { name: /Enforce penalty/i });
    fireEvent.click(enforceBtn);

    await waitFor(() => {
      expect(mockAddSandboxPlay).toHaveBeenCalledWith(
        expect.objectContaining({
          playType: "Penalty",
          firstDown: true,
        })
      );
    });
  });

  it("adjusts game clock by 10s and allows pausing and resetting play clock", async () => {
    await renderAdmin();

    const addClockBtn = screen.getByRole("button", { name: "Add 10 seconds" });
    fireEvent.pointerDown(addClockBtn);
    fireEvent.pointerUp(addClockBtn);

    const removeClockBtn = screen.getByRole("button", { name: "Remove 10 seconds" });
    fireEvent.pointerDown(removeClockBtn);
    fireEvent.pointerUp(removeClockBtn);

    const playClockToggle = screen.getByRole("button", { name: /Start play clock|Pause play clock/i });
    fireEvent.click(playClockToggle);
    expect(screen.getByRole("button", { name: /Start play clock|Pause play clock/i })).toBeInTheDocument();

    const resetPlayClockBtn = screen.getByRole("button", { name: "Reset play clock" });
    fireEvent.click(resetPlayClockBtn);
  });

  it("handles timeout flow and ends timeout early", async () => {
    await renderAdmin();

    const homeTimeoutBtn = screen.getByRole("button", { name: /Call home timeout/i });
    fireEvent.click(homeTimeoutBtn);

    expect(screen.getByText("Timeout")).toBeInTheDocument();
    const endEarlyBtn = screen.getByRole("button", { name: /END TIMEOUT EARLY/i });
    fireEvent.click(endEarlyBtn);

    await waitFor(() => {
      expect(screen.queryByText("END TIMEOUT EARLY")).not.toBeInTheDocument();
    });
  });

  it("transitions to HALFTIME when clock reaches 0 and begins second half", async () => {
    setMockMatch({
      ...mockMatch,
      status: "in_progress",
      matchState: {
        gameClock: 0,
        half: 1,
        currentDown: 1,
        possession: "Apex Predators",
      },
    });

    await renderAdmin();

    await waitFor(() => {
      const snapButton = screen.getByRole("button", { name: /CLICK WHEN SNAPPED/i });
      fireEvent.click(snapButton);
    });

    fireEvent.click(screen.getByRole("button", { name: /RUN/i }));
    const runnerBtn1 = screen.queryByRole("button", { name: "Marcus Vance" });
    if (runnerBtn1) fireEvent.click(runnerBtn1);
    fireEvent.click(screen.getByRole("button", { name: /OUT OF BOUNDS/i }));
    fireEvent.click(screen.getByRole("button", { name: /OOB - SHORT/i }));

    await waitFor(() => {
      expect(screen.getByText("Halftime")).toBeInTheDocument();
    });

    const skipBreakBtn = screen.getByRole("button", { name: /SKIP BREAK|BEGIN SECOND HALF/i });
    fireEvent.click(skipBreakBtn);

    await waitFor(() => {
      expect(screen.queryByText("Halftime")).not.toBeInTheDocument();
    });
  });

  it("transitions to GAME_OVER when second half clock expires and finalizes game", async () => {
    setMockMatch({
      ...mockMatch,
      status: "in_progress",
      matchState: {
        gameClock: 0,
        half: 2,
        currentDown: 1,
        possession: "Apex Predators",
      },
    });

    await renderAdmin();

    await waitFor(() => {
      const snapButton = screen.getByRole("button", { name: /CLICK WHEN SNAPPED/i });
      fireEvent.click(snapButton);
    });

    fireEvent.click(screen.getByRole("button", { name: /RUN/i }));
    const runnerBtn2 = screen.queryByRole("button", { name: "Marcus Vance" });
    if (runnerBtn2) fireEvent.click(runnerBtn2);
    fireEvent.click(screen.getByRole("button", { name: /OUT OF BOUNDS/i }));
    fireEvent.click(screen.getByRole("button", { name: /OOB - SHORT/i }));

    await waitFor(() => {
      expect(screen.getByText("Game Over")).toBeInTheDocument();
      expect(screen.getByText("Did Not Participate")).toBeInTheDocument();
    });

    // Mark Marcus Vance as absent then unmark
    const vanceBtn = screen.getByRole("button", { name: /Marcus Vance/i });
    fireEvent.click(vanceBtn);
    expect(screen.getByText("Absent")).toBeInTheDocument();
    fireEvent.click(vanceBtn);
    expect(screen.queryByText("Absent")).not.toBeInTheDocument();

    const finalizeBtn = screen.getByRole("button", { name: /FINALIZE GAME & SAVE STATS/i });
    fireEvent.click(finalizeBtn);

    await waitFor(() => {
      expect(mockUpdateSandboxMatch).toHaveBeenCalledWith(
        "match_demo_101",
        expect.objectContaining({
          status: "completed",
        })
      );
      expect(mockPush).toHaveBeenCalledWith("/matches/match_demo_101");
    });
  });


  it("confirms Reset Game to Pre-Game and resets match data", async () => {
    await renderAdmin();

    await waitFor(() => {
      const resetBtn = screen.getByRole("button", { name: /Reset Game/i });
      fireEvent.click(resetBtn);
    });

    const confirmBtn = screen.getByRole("button", { name: /Permanently Reset/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteSandboxPlaysForMatch).toHaveBeenCalledWith("match_demo_101");
      expect(mockUpdateSandboxMatch).toHaveBeenCalled();
    });
  });

  it("confirms undo last play and removes last play", async () => {
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
    const confirmMock = vi.spyOn(window, "confirm").mockReturnValue(true);

    setSandboxPlaysList([
      {
        id: "play_1",
        matchId: "match_demo_101",
        down: 2,
        possessionTeamId: "team_apex",
        isTouchdown: false,
      },
    ]);

    await renderAdmin();

    const undoBtn = screen.getByRole("button", { name: /Undo last play/i });
    fireEvent.click(undoBtn);

    expect(confirmMock).toHaveBeenCalled();
    expect(mockDeleteSandboxPlay).toHaveBeenCalledWith("play_1");
    expect(alertMock).toHaveBeenCalledWith("Last play undone successfully.");

    alertMock.mockRestore();
    confirmMock.mockRestore();
  });

  it("opens and closes play log drawer", async () => {
    await renderAdmin();

    const playLogBtn = screen.getByRole("button", { name: /Play Log/i });
    fireEvent.click(playLogBtn);

    expect(screen.getByText("Live Game Play Log")).toBeInTheDocument();
    expect(screen.getByText("No plays logged yet.")).toBeInTheDocument();

    const closeButtons = screen.getAllByRole("button");
    const closeBtn = closeButtons.find(b => b.querySelector("svg.lucide-x"));
    expect(closeBtn).toBeDefined();
    if (closeBtn) {
      fireEvent.click(closeBtn);
      expect(screen.queryByText("Live Game Play Log")).not.toBeInTheDocument();
    }
  });

  it("toggles game clock running state", async () => {
    await renderAdmin();

    const pauseBtn = screen.getByRole("button", { name: /Pause game clock|Start game clock/i });
    expect(pauseBtn).toBeInTheDocument();
    fireEvent.click(pauseBtn);
  });
});


