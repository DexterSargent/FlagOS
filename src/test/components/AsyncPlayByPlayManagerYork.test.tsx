import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AsyncPlayByPlayManager from "@/components/AsyncPlayByPlayManager";
import { getDoc, setDoc } from "firebase/firestore";
import { createSecureRecord } from "@/lib/secureWrites";
import { getYorkMatch } from "@/lib/yorkTeamData";

const { authState } = vi.hoisted(() => ({
  authState: { canManageTeam: true },
}));
vi.mock("@/lib/authContext", () => ({
  useAuth: () => ({
    loading: false,
    isLeagueAdmin: false,
    canManageTeam: () => authState.canManageTeam,
  }),
}));

vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("@/lib/secureWrites", () => ({
  createSecureRecord: vi.fn().mockResolvedValue({ id: "saved-play" }),
}));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => null }),
  onSnapshot: vi.fn(() => vi.fn()),
  getDocs: vi.fn().mockResolvedValue({ docs: [], empty: true }),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  addDoc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({
    settings: { rules: { downsPerSeries: 4 } },
    isDemoLeague: false,
    activeLeagueId: "real",
  }),
  DEFAULT_LEAGUE_SETTINGS: {
    rules: { downsPerSeries: 4 },
  },
}));

describe("AsyncPlayByPlayManager York Lions Match Loading", () => {
  beforeEach(() => {
    localStorage.clear();
    authState.canManageTeam = true;
  });

  it("loads a York seed match directly without infinite pinwheel spinner", async () => {
    render(<AsyncPlayByPlayManager matchId="match_york_mcmaster" />);

    // Should load the York team matchup without pinwheeling
    await waitFor(() => {
      expect(
        screen.getByText(/York Lions Women's Flag Football vs McMaster Marauders/i)
      ).toBeInTheDocument();
    });

    // Should render the Clockless Async Stat Keeper header and controls
    expect(screen.getByText(/Clockless Async Stat Keeper/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /START (NEXT )?PLAY/i })).toBeInTheDocument();

    // Clicking Box Score tab shows York players and their stats
    const boxScoreBtn = screen.getByRole("button", { name: "Box Score" });
    fireEvent.click(boxScoreBtn);

    await waitFor(() => {
      expect(screen.getByText(/Sonia Cabral/i)).toBeInTheDocument();
    });
  });

  it("displays Game Not Found if the matchId cannot be found in any records or cache", async () => {
    render(<AsyncPlayByPlayManager matchId="match_completely_invalid_99999" />);

    await waitFor(() => {
      expect(screen.getByText(/Game Not Found/i)).toBeInTheDocument();
      expect(screen.getByText(/Return to Schedule/i)).toBeInTheDocument();
    });
  });

  it("shows public box scores without management controls or autosaves", async () => {
    authState.canManageTeam = false;
    render(<AsyncPlayByPlayManager matchId="match_york_mcmaster" />);
    expect(await screen.findByText("Sonia Cabral")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /START (NEXT )?PLAY/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Stat Keeper$/ })).not.toBeInTheDocument();
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("gives the play log and box score bounded, keyboard-focusable scroll containers", async () => {
    render(<AsyncPlayByPlayManager matchId="match_york_mcmaster" />);
    fireEvent.click(await screen.findByRole("button", { name: /Play Log/ }));
    const log = screen.getByRole("region", { name: "Game play log" });
    expect(log).toHaveClass("flex-1", "min-h-0", "overflow-y-auto");
    expect(log).toHaveAttribute("tabindex", "0");
    fireEvent.click(screen.getByRole("button", { name: "Box Score" }));
    expect(screen.getByRole("region", { name: "Player box score" })).toHaveClass("overflow-y-auto");
  });

  it("omits the unrostered defense selector and saves offensive plays without team selection", async () => {
    render(<AsyncPlayByPlayManager matchId="match_york_mcmaster" />);
    fireEvent.click(await screen.findByRole("button", { name: /START (NEXT )?PLAY/i }));
    fireEvent.click(screen.getByRole("button", { name: "RUN PLAY" }));
    fireEvent.click(screen.getByRole("button", { name: "Sonia Cabral" }));

    expect(screen.queryByRole("button", { name: "Team Defense" })).not.toBeInTheDocument();
    expect(screen.queryByText("Defenders Involved / Flag")).not.toBeInTheDocument();
    expect(screen.queryByText("Flagger(s):")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "NEXT DOWN" }));
    await waitFor(() => expect(createSecureRecord).toHaveBeenCalledWith("play", expect.objectContaining({
      possessionTeamId: "york_lions",
      runnerPlayerId: "Sonia Cabral",
      defenders: [],
      result: "Next Down",
    })));
  });

  it("keeps individual defensive credit without a team defense choice in one-sided tracking", async () => {
    render(<AsyncPlayByPlayManager matchId="match_york_mcmaster" />);
    fireEvent.click(await screen.findByRole("button", { name: "McMaster Marauders" }));
    fireEvent.click(screen.getByRole("button", { name: /START (NEXT )?PLAY/i }));
    fireEvent.click(screen.getByRole("button", { name: "PASS PLAY" }));
    fireEvent.click(screen.getByRole("button", { name: "Sack" }));

    expect(screen.queryByRole("button", { name: "Team Defense" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sonia Cabral" }));
    fireEvent.click(screen.getByRole("button", { name: "NEXT DOWN" }));
    await waitFor(() => expect(createSecureRecord).toHaveBeenCalledWith("play", expect.objectContaining({
      possessionTeamId: "opponent_mcmaster",
      passOutcome: "Sack",
      defenders: ["Sonia Cabral"],
    })));
  });

  it("preserves the team defense option when both teams have rosters", async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      id: "match_york_mcmaster",
      data: () => ({
        ...getYorkMatch("match_york_mcmaster"),
        roster: { home: [], away: ["Opponent Defender"] },
      }),
    } as Awaited<ReturnType<typeof getDoc>>);
    render(<AsyncPlayByPlayManager matchId="match_york_mcmaster" />);
    fireEvent.click(await screen.findByRole("button", { name: /START (NEXT )?PLAY/i }));
    fireEvent.click(screen.getByRole("button", { name: "RUN PLAY" }));
    fireEvent.click(screen.getByRole("button", { name: "Sonia Cabral" }));

    fireEvent.click(screen.getByRole("button", { name: "Team Defense" }));
    fireEvent.click(screen.getByRole("button", { name: "NEXT DOWN" }));
    await waitFor(() => expect(createSecureRecord).toHaveBeenCalledWith("play", expect.objectContaining({
      defenders: ["TEAM"],
    })));
  });

  it("retains interception-return flaggers when the opponent defense has no roster", async () => {
    render(<AsyncPlayByPlayManager matchId="match_york_mcmaster" />);
    fireEvent.click(await screen.findByRole("button", { name: /START (NEXT )?PLAY/i }));
    fireEvent.click(screen.getByRole("button", { name: "PASS PLAY" }));
    fireEvent.click(screen.getByRole("button", { name: "Interception" }));
    const quarterbackSummary = screen.queryByRole("button", { name: /^Quarterback:/ });
    if (quarterbackSummary) fireEvent.click(quarterbackSummary);
    fireEvent.click(screen.getByRole("button", { name: "Sonia Cabral" }));
    expect(screen.getByRole("group", { name: "Flagger(s) on Interception Return" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Team Defense" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sonia Cabral" }));
    fireEvent.click(screen.getByRole("button", { name: "TURNOVER" }));
    await waitFor(() => expect(createSecureRecord).toHaveBeenCalledWith("play", expect.objectContaining({
      passOutcome: "Interception",
      defenders: [],
      flaggers: ["Sonia Cabral"],
    })));
  });

  const startRosteredPlay = async (type: "PASS PLAY" | "RUN PLAY") => {
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      id: "match_york_mcmaster",
      data: () => ({
        ...getYorkMatch("match_york_mcmaster"),
        roster: { home: ["Test Receiver"], away: ["Opponent Defender"] },
      }),
    } as Awaited<ReturnType<typeof getDoc>>);
    render(<AsyncPlayByPlayManager matchId="match_york_mcmaster" />);
    fireEvent.click(await screen.findByRole("button", { name: /START (NEXT )?PLAY/i }));
    fireEvent.click(screen.getByRole("button", { name: type }));
    if (type === "PASS PLAY") {
      const quarterbackSummary = screen.queryByRole("button", { name: /^Quarterback:/ });
      if (quarterbackSummary) fireEvent.click(quarterbackSummary);
      fireEvent.click(screen.getByRole("button", { name: "Sonia Cabral" }));
    }
  };

  it("filters gain results by offense, flagger, and out-of-bounds selections", async () => {
    await startRosteredPlay("RUN PLAY");
    expect(screen.queryByText("Save Play Result")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sonia Cabral" }));
    expect(screen.getByRole("button", { name: "TOUCHDOWN (+6)" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "FIRST DOWN" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "NEXT DOWN" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "TURNOVER" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "SAFETY (+2 DEF)" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "OUT OF BOUNDS" }));
    expect(screen.queryByRole("button", { name: "TOUCHDOWN (+6)" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "OOB - FIRST DOWN" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "OOB - SHORT" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Opponent Defender" }));
    expect(screen.queryByRole("button", { name: /OOB -/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "TOUCHDOWN (+6)" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "FIRST DOWN" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "NEXT DOWN" }));
    await waitFor(() => expect(createSecureRecord).toHaveBeenCalledWith("play", expect.objectContaining({
      result: "Next Down",
      defenders: ["Opponent Defender"],
    })));
  });

  it("requires a receiver for a rostered completion and clears OOB choices when the outcome changes", async () => {
    await startRosteredPlay("PASS PLAY");
    expect(screen.queryByText("Save Play Result")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Test Receiver" }));
    fireEvent.click(screen.getByRole("button", { name: "OUT OF BOUNDS" }));
    fireEvent.click(screen.getByRole("button", { name: "Incomplete" }));
    expect(screen.getByRole("button", { name: "NEXT DOWN" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /OOB -|TOUCHDOWN|FIRST DOWN|TURNOVER|SAFETY/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Complete" }));
    expect(screen.queryByText("Save Play Result")).not.toBeInTheDocument();
  });

  it.each([
    ["PASS PLAY", "Pass Breakup (PBU)", false],
    ["PASS PLAY", "Sack", true],
    ["PASS PLAY", "Flag Guarding / FFL", true],
    ["RUN PLAY", "Loss of Yards", true],
    ["RUN PLAY", "Flag Guarding / FFL", true],
  ] as const)("filters %s / %s results and requires defensive credit", async (type, outcome, allowsSafety) => {
    await startRosteredPlay(type);
    fireEvent.click(screen.getByRole("button", { name: outcome }));
    if (type === "RUN PLAY") fireEvent.click(screen.getByRole("button", { name: "Sonia Cabral" }));
    expect(screen.queryByText("Save Play Result")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Opponent Defender" }));
    expect(screen.getByRole("button", { name: "NEXT DOWN" })).toBeInTheDocument();
    expect(!!screen.queryByRole("button", { name: "SAFETY (+2 DEF)" })).toBe(allowsSafety);
    expect(screen.queryByRole("button", { name: /TOUCHDOWN|FIRST DOWN|TURNOVER|PICK 6/ })).not.toBeInTheDocument();
  });

  it("only offers turnover results for interceptions and hides pick six after a return flag", async () => {
    await startRosteredPlay("PASS PLAY");
    fireEvent.click(screen.getByRole("button", { name: "Interception" }));
    expect(screen.queryByText("Save Play Result")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Opponent Defender" }));
    expect(screen.getByRole("button", { name: "PICK 6 (+6)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "TURNOVER" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /NEXT DOWN|FIRST DOWN|TOUCHDOWN|SAFETY/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sonia Cabral" }));
    expect(screen.queryByRole("button", { name: "PICK 6 (+6)" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "TURNOVER" }));
    await waitFor(() => expect(createSecureRecord).toHaveBeenCalledWith("play", expect.objectContaining({
      result: "Turnover",
      turnover: true,
      passOutcome: "Interception",
      defenders: ["Opponent Defender"],
      flaggers: ["Sonia Cabral"],
    })));
  });

  it("saves an out-of-bounds result and resets its choices for the next play", async () => {
    await startRosteredPlay("RUN PLAY");
    fireEvent.click(screen.getByRole("button", { name: "Sonia Cabral" }));
    fireEvent.click(screen.getByRole("button", { name: "OUT OF BOUNDS" }));
    fireEvent.click(screen.getByRole("button", { name: "OOB - SHORT" }));
    await waitFor(() => expect(createSecureRecord).toHaveBeenCalledWith("play", expect.objectContaining({
      result: "Short",
      defenders: [],
      firstDown: false,
    })));
    fireEvent.click(screen.getByRole("button", { name: /START (NEXT )?PLAY/i }));
    fireEvent.click(screen.getByRole("button", { name: "RUN PLAY" }));
    fireEvent.click(screen.getByRole("button", { name: "Sonia Cabral" }));
    expect(screen.getByRole("button", { name: "TOUCHDOWN (+6)" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /OOB -/ })).not.toBeInTheDocument();
  });

  it("allows an unrostered opponent completion without inventing a receiver", async () => {
    render(<AsyncPlayByPlayManager matchId="match_york_mcmaster" />);
    fireEvent.click(await screen.findByRole("button", { name: "McMaster Marauders" }));
    fireEvent.click(screen.getByRole("button", { name: /START (NEXT )?PLAY/i }));
    fireEvent.click(screen.getByRole("button", { name: "PASS PLAY" }));
    expect(screen.getByRole("button", { name: "TOUCHDOWN (+6)" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sonia Cabral" }));
    fireEvent.click(screen.getByRole("button", { name: "NEXT DOWN" }));
    await waitFor(() => expect(createSecureRecord).toHaveBeenCalledWith("play", expect.objectContaining({
      passOutcome: "Complete",
      receiverPlayerId: null,
      defenders: ["Sonia Cabral"],
    })));
  });
});
