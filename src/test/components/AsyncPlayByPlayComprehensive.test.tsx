import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AsyncPlayByPlayManager from "@/components/AsyncPlayByPlayManager";

const testMatch = {
  id: "match_demo_comp_test",
  homeTeamName: "Apex Lions",
  awayTeamName: "Thunder Sharks",
  homeTeamId: "team_apex",
  awayTeamId: "team_thunder",
  managingTeamId: "team_apex",
  homeScore: 14,
  awayScore: 7,
  possession: "Apex Lions",
  matchState: { possession: "Apex Lions", currentDown: 1, half: 1 },
  currentDown: 1,
  half: 1,
  status: "in_progress",
};

const testPlayers = [
  { id: "p1", playerName: "Tom QB", teamId: "team_apex", number: "12" },
  { id: "p2", playerName: "Jerry WR", teamId: "team_apex", number: "80" },
  { id: "p3", playerName: "Sam Defender", teamId: "team_thunder", number: "21" },
];

const mockSandboxPlays = [
  {
    id: "play_1",
    matchId: "match_demo_comp_test",
    half: 1,
    down: 1,
    playType: "pass",
    passOutcome: "Complete",
    yardsGained: 15,
    passerId: "p1",
    receiverId: "p2",
    playResult: "First Down",
    timestamp: "10:00",
  },
];

vi.mock("next/navigation", () => ({
  usePathname: () => "/matches/match_demo_comp_test/play-by-play",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/firebase", () => ({
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, coll, id) => ({ id, path: `${coll}/${id}` })),
  getDoc: vi.fn(async () => ({
    exists: () => true,
    id: "match_demo_comp_test",
    data: () => testMatch,
  })),
  setDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
  collection: vi.fn((_db, coll) => ({ id: coll })),
  query: vi.fn((c) => c),
  where: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(async () => ({ docs: [] })),
  onSnapshot: vi.fn(() => () => {}),
}));

vi.mock("@/lib/authContext", () => ({
  useAuth: () => ({
    user: { uid: "u1", email: "admin@flagos.ca" },
    loading: false,
    isPlatformAdmin: true,
    isLeagueAdmin: true,
    canManageTeam: () => true,
  }),
}));

vi.mock("@/lib/usePrivateLeagueAccess", () => ({
  usePrivateLeagueAccess: () => ({ isDenied: false, deniedElement: null }),
}));

vi.mock("@/lib/useMatchTeamColors", () => ({
  useMatchTeamColors: () => ({
    home: { primary: "#111111", secondary: "#ffffff", tertiary: "#ff0000" },
    away: { primary: "#222222", secondary: "#ffffff", tertiary: "#00ff00" },
    homeShortcode: "APX",
    awayShortcode: "THU",
  }),
}));

vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({
    isDemoLeague: true,
    settings: {
      rules: {
        downsPerSeries: 4,
        periodDurationMinutes: 20,
        playClockSeconds: 30,
        timeoutsPerTeam: 2,
        periodType: "halves",
        periodsCount: 2,
      },
    },
  }),
}));

vi.mock("@/lib/statKeeperHistory", () => ({
  loadStatKeeperHistory: vi.fn(async () => []),
}));

const mockUpdateSandboxMatch = vi.fn();
const mockAddSandboxPlay = vi.fn((play: any) => ({ ...play, id: "play_mock_saved_99" }));
const mockDeleteSandboxPlay = vi.fn();

vi.mock("@/lib/demoSandbox", () => ({
  getSandboxMatches: () => [testMatch],
  getSandboxMatch: () => testMatch,
  getSandboxPlayers: () => testPlayers,
  getSandboxTeams: () => [],
  getSandboxPlays: () => mockSandboxPlays,
  isDemoMatch: () => true,
  subscribeDemoSandbox: () => () => {},
  addSandboxPlay: (...args: any[]) => (mockAddSandboxPlay as any)(...args),
  updateSandboxMatch: (...args: any[]) => (mockUpdateSandboxMatch as any)(...args),
  deleteSandboxPlay: (...args: any[]) => (mockDeleteSandboxPlay as any)(...args),
  deleteSandboxPlaysForMatch: vi.fn(),
}));

describe("AsyncPlayByPlayManager Comprehensive Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders live score, possession, and current down header", async () => {
    await act(async () => {
      render(<AsyncPlayByPlayManager matchId="match_demo_comp_test" />);
    });

    const startBtn = await screen.findByRole("button", { name: /START (NEXT )?PLAY/i });
    expect(startBtn).toBeInTheDocument();
    expect(screen.getAllByText("Apex Lions").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Thunder Sharks").length).toBeGreaterThan(0);
    expect(screen.getAllByText("14").length).toBeGreaterThan(0);
    expect(screen.getAllByText("7").length).toBeGreaterThan(0);
  });

  it("navigates through tabs: Play Log, Box Score, and Team Stats", async () => {
    await act(async () => {
      render(<AsyncPlayByPlayManager matchId="match_demo_comp_test" />);
    });

    await screen.findByRole("button", { name: /START (NEXT )?PLAY/i });

    // Click Play Log tab
    const playLogTab = screen.getByRole("button", { name: /Play Log/i });
    fireEvent.click(playLogTab);
    expect(screen.getByText(/Game Play Log/i)).toBeInTheDocument();

    // Click Box Score tab
    const boxScoreTab = screen.getByRole("button", { name: /Box Score/i });
    fireEvent.click(boxScoreTab);
    expect(screen.getAllByText(/Box Score/i).length).toBeGreaterThan(0);

    // Click Team Stats tab
    const teamStatsTab = screen.getByRole("button", { name: /Team Stats/i });
    fireEvent.click(teamStatsTab);
    expect(screen.getByRole("tab", { name: /Compare/i })).toBeInTheDocument();

    // Return to Stat Keeper tab
    const statKeeperTab = screen.getByRole("button", { name: /Stat Keeper/i });
    fireEvent.click(statKeeperTab);
    expect(screen.getByRole("button", { name: /START (NEXT )?PLAY/i })).toBeInTheDocument();
  });

  it("steps through complete pass play wizard with defender tackle and submits a play", async () => {
    await act(async () => {
      render(<AsyncPlayByPlayManager matchId="match_demo_comp_test" />);
    });

    const startBtn = await screen.findByRole("button", { name: /START (NEXT )?PLAY/i });
    fireEvent.click(startBtn);

    // Step 1: Select Pass play
    const passBtn = screen.getByRole("button", { name: /^Pass/i });
    fireEvent.click(passBtn);

    // Step 2: Select Complete
    const completeBtn = screen.getByRole("button", { name: /^Complete/i });
    fireEvent.click(completeBtn);

    // Select QB
    const qbBtn = screen.getByRole("button", { name: /Tom QB/i });
    fireEvent.click(qbBtn);

    // Select Receiver
    const recBtn = screen.getByRole("button", { name: /Jerry WR/i });
    fireEvent.click(recBtn);

    // Select Defender (Sam Defender)
    const defenderBtn = screen.getByRole("button", { name: /Sam Defender/i });
    fireEvent.click(defenderBtn);

    // Select Result (First Down) - clicking directly saves the play and advances
    const firstDownBtn = screen.getByRole("button", { name: /FIRST DOWN/i });
    fireEvent.click(firstDownBtn);

    expect(mockAddSandboxPlay).toHaveBeenCalled();
  });

  it("steps through incomplete pass play and saves next down", async () => {
    await act(async () => {
      render(<AsyncPlayByPlayManager matchId="match_demo_comp_test" />);
    });

    const startBtn = await screen.findByRole("button", { name: /START (NEXT )?PLAY/i });
    fireEvent.click(startBtn);

    // Select Pass play
    const passBtn = screen.getByRole("button", { name: /^Pass/i });
    fireEvent.click(passBtn);

    // Select Incomplete
    const incBtn = screen.getByRole("button", { name: /^Incomplete/i });
    fireEvent.click(incBtn);

    // Select QB
    const qbBtn = screen.getByRole("button", { name: /Tom QB/i });
    fireEvent.click(qbBtn);

    // Save & Next Down button
    const saveBtn = screen.getByRole("button", { name: /SAVE & NEXT DOWN/i });
    fireEvent.click(saveBtn);

    expect(mockAddSandboxPlay).toHaveBeenCalled();
  });

  it("handles run play with touchdown and conversion wizard", async () => {
    await act(async () => {
      render(<AsyncPlayByPlayManager matchId="match_demo_comp_test" />);
    });

    const startBtn = await screen.findByRole("button", { name: /START (NEXT )?PLAY/i });
    fireEvent.click(startBtn);

    // Run play
    const runBtn = screen.getByRole("button", { name: /^Run/i });
    fireEvent.click(runBtn);

    // Runner
    const runnerBtn = screen.getByRole("button", { name: /Jerry WR/i });
    fireEvent.click(runnerBtn);

    // Touchdown immediately saves pending TD and advances to conversion
    const tdBtn = screen.getByRole("button", { name: /TOUCHDOWN \(\+6\)/i });
    fireEvent.click(tdBtn);

    expect(mockAddSandboxPlay).toHaveBeenCalled();
  });

  it("handles interception play with Pick 6", async () => {
    await act(async () => {
      render(<AsyncPlayByPlayManager matchId="match_demo_comp_test" />);
    });

    const startBtn = await screen.findByRole("button", { name: /START (NEXT )?PLAY/i });
    fireEvent.click(startBtn);

    // Pass
    const passBtn = screen.getByRole("button", { name: /^Pass/i });
    fireEvent.click(passBtn);

    // Interception
    const intBtn = screen.getByRole("button", { name: /Interception/i });
    fireEvent.click(intBtn);

    // Passer
    const qbBtn = screen.getByRole("button", { name: /Tom QB/i });
    fireEvent.click(qbBtn);

    // Interceptor (Sam Defender)
    const interceptorBtn = screen.getByRole("button", { name: /Sam Defender/i });
    fireEvent.click(interceptorBtn);

    // Pick 6 (+6)
    const pick6Btn = screen.getByRole("button", { name: /PICK 6 \(\+6\)/i });
    fireEvent.click(pick6Btn);

    expect(mockAddSandboxPlay).toHaveBeenCalled();
  });

  it("handles defensive safety play and awards 2 points to defense", async () => {
    await act(async () => {
      render(<AsyncPlayByPlayManager matchId="match_demo_comp_test" />);
    });

    const startBtn = await screen.findByRole("button", { name: /START (NEXT )?PLAY/i });
    fireEvent.click(startBtn);

    // Run
    const runBtn = screen.getByRole("button", { name: /^Run/i });
    fireEvent.click(runBtn);

    // Loss
    const lossBtn = screen.getByRole("button", { name: /^Loss of Yards$/i });
    fireEvent.click(lossBtn);


    // Runner
    const runnerBtn = screen.getByRole("button", { name: /Jerry WR/i });
    fireEvent.click(runnerBtn);

    // Defender
    const defBtn = screen.getByRole("button", { name: /Sam Defender/i });
    fireEvent.click(defBtn);

    // Safety (+2 DEF)
    const safetyBtn = screen.getByRole("button", { name: /SAFETY \(\+2 DEF\)/i });
    fireEvent.click(safetyBtn);

    expect(mockAddSandboxPlay).toHaveBeenCalled();
  });

  it("steps through penalty play wizard and enforces penalty", async () => {
    await act(async () => {
      render(<AsyncPlayByPlayManager matchId="match_demo_comp_test" />);
    });

    const startBtn = await screen.findByRole("button", { name: /START (NEXT )?PLAY/i });
    fireEvent.click(startBtn);

    // Penalty
    const penaltyBtn = screen.getByRole("button", { name: /^Penalty/i });
    fireEvent.click(penaltyBtn);

    // Penalty wizard is now open
    expect(screen.getByText(/Defensive Pass Interference/i)).toBeInTheDocument();

    // Step through enforcement and player
    fireEvent.click(screen.getByRole("button", { name: /Continue to enforcement/i }));
    fireEvent.click(screen.getByRole("button", { name: /Continue to player/i }));

    // Enforce penalty
    const enforceBtn = screen.getByRole("button", { name: /Enforce penalty/i });
    fireEvent.click(enforceBtn);

    expect(mockAddSandboxPlay).toHaveBeenCalled();
  });

  it("finalizes game when Game Over and Confirm Final Score buttons are clicked", async () => {
    vi.spyOn(window, "alert").mockImplementation(() => {});

    await act(async () => {
      render(<AsyncPlayByPlayManager matchId="match_demo_comp_test" />);
    });

    const gameOverBtn = await screen.findByRole("button", { name: /Game Over/i });
    fireEvent.click(gameOverBtn);

    const confirmBtn = await screen.findByRole("button", { name: /Confirm Final Score/i });
    fireEvent.click(confirmBtn);

    expect(mockUpdateSandboxMatch).toHaveBeenCalledWith("match_demo_comp_test", expect.objectContaining({
      status: "completed",
    }));
  });

  it("resumes game from Game Over modal and allows manual possession and down changes", async () => {
    await act(async () => {
      render(<AsyncPlayByPlayManager matchId="match_demo_comp_test" />);
    });

    const gameOverBtn = await screen.findByRole("button", { name: /Game Over/i });
    fireEvent.click(gameOverBtn);
    expect(screen.getByText("Finalize Game")).toBeInTheDocument();

    // Click Resume Game to return to IDLE
    const resumeBtn = screen.getByRole("button", { name: /Resume Game/i });
    fireEvent.click(resumeBtn);
    expect(screen.queryByText("Finalize Game")).not.toBeInTheDocument();

    // Change possession manually
    const awayPossessionBtn = screen.getAllByRole("button", { name: "Thunder Sharks" })[0];
    fireEvent.click(awayPossessionBtn);

    // Change down manually
    const secondDownBtn = screen.getByRole("button", { name: "2nd Down" });
    fireEvent.click(secondDownBtn);
  });

  it("navigates between Box Score, Team Stats, and Play Log tabs", async () => {
    await act(async () => {
      render(<AsyncPlayByPlayManager matchId="match_demo_comp_test" />);
    });

    // Switch to Box Score tab
    const boxScoreTabBtn = await screen.findByRole("button", { name: /Box Score/i });
    fireEvent.click(boxScoreTabBtn);
    expect(screen.getByText("Player Box Score")).toBeInTheDocument();

    // Toggle between Home and Away team box scores
    const teamToggleBtns = screen.getAllByRole("button", { name: /Thunder Sharks/i });
    fireEvent.click(teamToggleBtns[teamToggleBtns.length - 1]);
    expect(screen.getByText("Athlete")).toBeInTheDocument();

    // Switch to Team Stats tab
    const teamStatsTabBtn = screen.getByRole("button", { name: /Team Stats/i });
    fireEvent.click(teamStatsTabBtn);
    expect(screen.getByRole("button", { name: "Stat Keeper" })).toBeInTheDocument();

    // Switch to Play Log tab
    const playLogTabBtn = screen.getByRole("button", { name: /Play Log/i });
    fireEvent.click(playLogTabBtn);
    expect(screen.getByText("Game Play Log")).toBeInTheDocument();

    // Switch back to Stat Keeper
    const trackerTabBtn = screen.getByRole("button", { name: "Stat Keeper" });
    fireEvent.click(trackerTabBtn);
    expect(screen.getByText(/Possession:/i)).toBeInTheDocument();
  });

  it("opens Add Player modal, switches team, enters sub name, and adds player", async () => {
    await act(async () => {
      render(<AsyncPlayByPlayManager matchId="match_demo_comp_test" />);
    });

    const addPlayerBtn = await screen.findByRole("button", { name: /Add Player/i });
    fireEvent.click(addPlayerBtn);

    expect(screen.getByText("Add Player / Sub")).toBeInTheDocument();

    // Select Away team in sub modal
    const awayTeamSubBtn = screen.getAllByRole("button", { name: /Thunder Sharks/i })[0];
    fireEvent.click(awayTeamSubBtn);

    // Enter player name
    const input = screen.getByPlaceholderText(/Player Name/i);
    fireEvent.change(input, { target: { value: "Alex Rookie" } });

    // Submit sub
    const submitSubBtn = screen.getByRole("button", { name: /Add Player to Roster/i });
    fireEvent.click(submitSubBtn);
  });

  it("advances to second half when Halftime button is clicked and handles undo", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "alert").mockImplementation(() => {});

    await act(async () => {
      render(<AsyncPlayByPlayManager matchId="match_demo_comp_test" />);
    });

    // Advance to halftime
    const halftimeBtn = await screen.findByRole("button", { name: /Halftime \(2nd Half\)/i });
    fireEvent.click(halftimeBtn);
    expect(screen.getByText("Second Half")).toBeInTheDocument();

    // Click Undo
    const undoBtn = screen.getByRole("button", { name: /Undo/i });
    fireEvent.click(undoBtn);
  });

  it("handles pass play with Sack and Loss of Yards", async () => {
    await act(async () => {
      render(<AsyncPlayByPlayManager matchId="match_demo_comp_test" />);
    });

    const startBtn = await screen.findByRole("button", { name: /START (NEXT )?PLAY/i });
    fireEvent.click(startBtn);

    // Pass
    const passBtn = screen.getByRole("button", { name: /^Pass/i });
    fireEvent.click(passBtn);

    // Sack
    const sackBtn = screen.getByRole("button", { name: /^Sack$/i });
    fireEvent.click(sackBtn);

    // QB
    const qbBtn = screen.getByRole("button", { name: /Tom QB/i });
    fireEvent.click(qbBtn);

    // Sacker
    const sackerBtn = screen.getByRole("button", { name: /Sam Defender/i });
    fireEvent.click(sackerBtn);

    // Loss of Yards
    const lossBtn = screen.getByRole("button", { name: /LOSS OF YARDS/i });
    fireEvent.click(lossBtn);

    expect(mockAddSandboxPlay).toHaveBeenCalledWith(expect.objectContaining({
      playType: "Pass",
      passOutcome: "Sack",
      result: "Short",
    }));
  });

  it("handles pass play with Sack resulting in Safety", async () => {
    await act(async () => {
      render(<AsyncPlayByPlayManager matchId="match_demo_comp_test" />);
    });

    const startBtn = await screen.findByRole("button", { name: /START (NEXT )?PLAY/i });
    fireEvent.click(startBtn);

    // Pass
    const passBtn = screen.getByRole("button", { name: /^Pass/i });
    fireEvent.click(passBtn);

    // Sack
    const sackBtn = screen.getByRole("button", { name: /^Sack$/i });
    fireEvent.click(sackBtn);

    // QB
    const qbBtn = screen.getByRole("button", { name: /Tom QB/i });
    fireEvent.click(qbBtn);

    // Sacker
    const sackerBtn = screen.getByRole("button", { name: /Sam Defender/i });
    fireEvent.click(sackerBtn);

    // Safety (+2 DEF)
    const safetyBtn = screen.getByRole("button", { name: /SAFETY \(\+2 DEF\)/i });
    fireEvent.click(safetyBtn);

    expect(mockAddSandboxPlay).toHaveBeenCalledWith(expect.objectContaining({
      playType: "Pass",
      passOutcome: "Sack",
      result: "Safety",
    }));
  });

  it("handles pass play with Pass Breakup (PBU)", async () => {
    await act(async () => {
      render(<AsyncPlayByPlayManager matchId="match_demo_comp_test" />);
    });

    const startBtn = await screen.findByRole("button", { name: /START (NEXT )?PLAY/i });
    fireEvent.click(startBtn);

    // Pass
    const passBtn = screen.getByRole("button", { name: /^Pass/i });
    fireEvent.click(passBtn);

    // PBU
    const pbuBtn = screen.getByRole("button", { name: /Pass Breakup \(PBU\)/i });
    fireEvent.click(pbuBtn);

    // QB
    const qbBtn = screen.getByRole("button", { name: /Tom QB/i });
    fireEvent.click(qbBtn);

    // Defender
    const defBtn = screen.getByRole("button", { name: /Sam Defender/i });
    fireEvent.click(defBtn);

    // Save & Next Down
    const saveBtn = screen.getByRole("button", { name: /SAVE & NEXT DOWN/i });
    fireEvent.click(saveBtn);

    expect(mockAddSandboxPlay).toHaveBeenCalledWith(expect.objectContaining({
      playType: "Pass",
      passOutcome: "PBU",
      result: "Next Down",
    }));
  });

  it("handles pass play with Flag For Loss (FFL)", async () => {
    await act(async () => {
      render(<AsyncPlayByPlayManager matchId="match_demo_comp_test" />);
    });

    const startBtn = await screen.findByRole("button", { name: /START (NEXT )?PLAY/i });
    fireEvent.click(startBtn);

    // Pass
    const passBtn = screen.getByRole("button", { name: /^Pass/i });
    fireEvent.click(passBtn);

    // FFL
    const fflBtn = screen.getByRole("button", { name: /Flag For Loss \(FFL\)/i });
    fireEvent.click(fflBtn);

    // QB
    const qbBtn = screen.getByRole("button", { name: /Tom QB/i });
    fireEvent.click(qbBtn);

    // Sacker
    const sackerBtn = screen.getByRole("button", { name: /Sam Defender/i });
    fireEvent.click(sackerBtn);

    // Loss of Yards
    const lossBtn = screen.getByRole("button", { name: /LOSS OF YARDS/i });
    fireEvent.click(lossBtn);

    expect(mockAddSandboxPlay).toHaveBeenCalledWith(expect.objectContaining({
      playType: "Pass",
      passOutcome: "FFL",
      result: "Short",
    }));
  });

  it("handles complete pass with Out of Bounds prompt choices", async () => {
    await act(async () => {
      render(<AsyncPlayByPlayManager matchId="match_demo_comp_test" />);
    });

    const startBtn = await screen.findByRole("button", { name: /START (NEXT )?PLAY/i });
    fireEvent.click(startBtn);

    // Pass -> Complete
    fireEvent.click(screen.getByRole("button", { name: /^Pass/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Complete/i }));

    // QB and Receiver
    fireEvent.click(screen.getByRole("button", { name: /Tom QB/i }));
    fireEvent.click(screen.getByRole("button", { name: /Jerry WR/i }));

    // Click Out of Bounds (opens OOB choices)
    const oobBtn = screen.getByRole("button", { name: /OUT OF BOUNDS/i });
    fireEvent.click(oobBtn);

    // Click OOB - FIRST DOWN
    const oobFirstDownBtn = screen.getByRole("button", { name: /OOB - FIRST DOWN/i });
    fireEvent.click(oobFirstDownBtn);

    expect(mockAddSandboxPlay).toHaveBeenCalledWith(expect.objectContaining({
      playType: "Pass",
      passOutcome: "Complete",
      result: "First Down",
    }));
  });

  it("handles touchdown followed by successful 1PT conversion confirmation", async () => {
    await act(async () => {
      render(<AsyncPlayByPlayManager matchId="match_demo_comp_test" />);
    });

    const startBtn = await screen.findByRole("button", { name: /START (NEXT )?PLAY/i });
    fireEvent.click(startBtn);

    // Run -> TD
    fireEvent.click(screen.getByRole("button", { name: /^Run/i }));
    fireEvent.click(screen.getByRole("button", { name: /Jerry WR/i }));
    fireEvent.click(screen.getByRole("button", { name: /TOUCHDOWN \(\+6\)/i }));

    // Now in CONVERSION step - button is 1 POINT
    const onePtBtn = await screen.findByRole("button", { name: /1 POINT/i });
    fireEvent.click(onePtBtn);

    // Select GOOD
    const goodBtn = screen.getByRole("button", { name: /✓ GOOD/i });
    fireEvent.click(goodBtn);

    // Select Conversion Passer/Runner (Tom QB) and Receiver (Jerry WR)
    const qbBtn = screen.getByRole("button", { name: /Tom QB/i });
    fireEvent.click(qbBtn);
    const recBtn = screen.getByRole("button", { name: /Jerry WR/i });
    fireEvent.click(recBtn);

    // Confirm conversion
    const confirmBtn = screen.getByRole("button", { name: /Confirm Conversion & Flip Possession/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockAddSandboxPlay).toHaveBeenCalledWith(expect.objectContaining({
        conversionAttempt: 1,
        conversionSuccess: true,
      }));
    });
  });

  it("handles touchdown followed by failed (NO GOOD) 2PT conversion", async () => {
    await act(async () => {
      render(<AsyncPlayByPlayManager matchId="match_demo_comp_test" />);
    });

    const startBtn = await screen.findByRole("button", { name: /START (NEXT )?PLAY/i });
    fireEvent.click(startBtn);

    // Run -> TD
    fireEvent.click(screen.getByRole("button", { name: /^Run/i }));
    fireEvent.click(screen.getByRole("button", { name: /Jerry WR/i }));
    fireEvent.click(screen.getByRole("button", { name: /TOUCHDOWN \(\+6\)/i }));

    // Select 2 POINTS
    const twoPtBtn = await screen.findByRole("button", { name: /2 POINTS/i });
    fireEvent.click(twoPtBtn);

    // Select NO GOOD
    const noGoodBtn = screen.getByRole("button", { name: /✗ NO GOOD/i });
    fireEvent.click(noGoodBtn);

    // Confirm conversion
    const confirmBtn = screen.getByRole("button", { name: /Confirm Conversion & Flip Possession/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockAddSandboxPlay).toHaveBeenCalledWith(expect.objectContaining({
        conversionAttempt: 2,
        conversionSuccess: false,
      }));
    });
  });

  it("handles interception with return flagger and saves turnover", async () => {
    await act(async () => {
      render(<AsyncPlayByPlayManager matchId="match_demo_comp_test" />);
    });

    const startBtn = await screen.findByRole("button", { name: /START (NEXT )?PLAY/i });
    fireEvent.click(startBtn);

    // Pass -> Interception
    fireEvent.click(screen.getByRole("button", { name: /^Pass/i }));
    fireEvent.click(screen.getByRole("button", { name: /Interception/i }));

    // Passer
    fireEvent.click(screen.getByRole("button", { name: /Tom QB/i }));

    // Interceptor
    fireEvent.click(screen.getByRole("button", { name: /Sam Defender/i }));

    // Flagger on return
    fireEvent.click(screen.getByRole("button", { name: /Jerry WR/i }));

    // FLAGGED (Save Turnover)
    const turnoverBtn = screen.getByRole("button", { name: /FLAGGED \(Save Turnover\)/i });
    fireEvent.click(turnoverBtn);

    expect(mockAddSandboxPlay).toHaveBeenCalledWith(expect.objectContaining({
      playType: "Pass",
      passOutcome: "Interception",
      result: "Turnover",
    }));
  });

  it("handles undo last play in demo mode", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "alert").mockImplementation(() => {});

    await act(async () => {
      render(<AsyncPlayByPlayManager matchId="match_demo_comp_test" />);
    });

    const undoBtn = await screen.findByRole("button", { name: /Undo/i });
    fireEvent.click(undoBtn);

    expect(mockDeleteSandboxPlay).toHaveBeenCalledWith("play_1");
  });

  it("handles penalty entry flow and logs penalty play", async () => {
    await act(async () => {
      render(<AsyncPlayByPlayManager matchId="match_demo_comp_test" />);
    });

    const startBtn = await screen.findByRole("button", { name: /START (NEXT )?PLAY/i });
    fireEvent.click(startBtn);

    // Choose Penalty play type
    fireEvent.click(screen.getByRole("button", { name: /Penalty/i }));

    // Penalty Wizard: Defensive Pass Interference is default, proceed through enforcement & player
    fireEvent.click(screen.getByRole("button", { name: /Continue to enforcement/i }));
    fireEvent.click(screen.getByRole("button", { name: /Continue to player/i }));
    fireEvent.click(screen.getByRole("button", { name: /Enforce penalty/i }));

    expect(mockAddSandboxPlay).toHaveBeenCalledWith(expect.objectContaining({
      playType: "Penalty",
      penaltyTeam: "defense",
    }));
  });
});



