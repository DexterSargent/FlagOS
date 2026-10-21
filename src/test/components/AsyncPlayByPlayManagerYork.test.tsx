import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import AsyncPlayByPlayManager from "@/components/AsyncPlayByPlayManager";
import { getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { createSecureRecord } from "@/lib/secureWrites";
import { getYorkMatch, saveYorkCustomMatch } from "@/lib/yorkTeamData";

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
    saveYorkCustomMatch({
      ...getYorkMatch("match_york_mcmaster")!,
      status: "scheduled",
      homeScore: 0,
      awayScore: 0,
    });
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

  it("opens a finalized York game as read-only with its final score, play log and box score", async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      id: "match_york_mcmaster",
      data: () => ({
        ...getYorkMatch("match_york_mcmaster"),
        status: "completed",
        homeScore: 46,
        awayScore: 12,
      }),
    } as Awaited<ReturnType<typeof getDoc>>);
    render(<AsyncPlayByPlayManager matchId="match_york_mcmaster" />);

    expect(await screen.findByRole("region", { name: "Game play log" })).toBeInTheDocument();
    expect(screen.getByText("Game Complete")).toBeInTheDocument();
    expect(screen.getByTestId("home-scoreboard")).toHaveTextContent("46");
    expect(screen.getByTestId("away-scoreboard")).toHaveTextContent("12");
    expect(screen.queryByRole("region", { name: "Play entry" })).not.toBeInTheDocument();
    for (const name of [/START (NEXT )?PLAY/i, /^Stat Keeper$/, /^Game Over$/, /^Undo$/, /^Add Player$/, /Halftime/, /Down$/]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
    expect(screen.queryByText(/Press "START PLAY"/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Box Score" }));
    expect(screen.getByRole("region", { name: "Player box score" })).toBeInTheDocument();
    expect(screen.getByText("Sonia Cabral")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Play Log/ }));
    expect(screen.getByRole("region", { name: "Game play log" })).toBeInTheDocument();
    expect(setDoc).not.toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
    expect(deleteDoc).not.toHaveBeenCalled();
    expect(createSecureRecord).not.toHaveBeenCalled();
  });

  it("removes the play-entry interface immediately after successfully finalizing a game", async () => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<AsyncPlayByPlayManager matchId="match_york_mcmaster" />);
    fireEvent.click(await screen.findByRole("button", { name: "Game Over" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Final Score" }));

    expect(await screen.findByText("Game Complete")).toBeInTheDocument();
    expect(setDoc).toHaveBeenCalledWith(undefined, expect.objectContaining({ status: "completed" }), { merge: true });
    expect(screen.getByRole("region", { name: "Game play log" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Stat Keeper$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /START (NEXT )?PLAY/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Play entry" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Box Score" }));
    expect(screen.getByRole("region", { name: "Player box score" })).toBeInTheDocument();
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
    expect(await screen.findByRole("region", { name: "Play entry" })).toHaveClass("min-h-0", "overflow-y-auto");
    fireEvent.click(await screen.findByRole("button", { name: /Play Log/ }));
    const log = screen.getByRole("region", { name: "Game play log" });
    expect(log).toHaveClass("flex-1", "min-h-0", "overflow-y-auto");
    expect(log).toHaveAttribute("tabindex", "0");
    fireEvent.click(screen.getByRole("button", { name: "Box Score" }));
    expect(screen.getByRole("region", { name: "Player box score" })).toHaveClass("overflow-y-auto");
  });

  it("allows an incomplete on fourth down to advance possession without a scoring option", async () => {
    render(<AsyncPlayByPlayManager matchId="match_york_mcmaster" />);
    fireEvent.click(await screen.findByRole("button", { name: "4th Down" }));
    fireEvent.click(screen.getByRole("button", { name: /START (NEXT )?PLAY/i }));
    fireEvent.click(screen.getByRole("button", { name: "PASS PLAY" }));
    fireEvent.click(screen.getByRole("button", { name: "Incomplete" }));
    // A remembered passer may already be filled from the loaded game history.
    if (!screen.queryByRole("button", { name: "SAVE & NEXT DOWN" })) {
      fireEvent.click(screen.getByRole("button", { name: "Sonia Cabral" }));
    }
    expect(screen.queryByRole("button", { name: /TOUCHDOWN/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "SAVE & NEXT DOWN" }));
    await waitFor(() => expect(createSecureRecord).toHaveBeenCalledWith("play", expect.objectContaining({
      down: 4, passOutcome: "Incomplete", result: "Next Down", turnover: true,
    })));
    expect(screen.getByRole("heading", { name: "McMaster Marauders on Offense" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /START (NEXT )?PLAY/i })).toBeInTheDocument();
  });

  it("omits the unrostered defense selector and saves offensive plays without team selection", async () => {
    render(<AsyncPlayByPlayManager matchId="match_york_mcmaster" />);
    fireEvent.click(await screen.findByRole("button", { name: /START (NEXT )?PLAY/i }));
    fireEvent.click(screen.getByRole("button", { name: "RUN PLAY" }));
    fireEvent.click(screen.getByRole("button", { name: "Sonia Cabral" }));

    expect(screen.queryByRole("button", { name: "Team Defense" })).not.toBeInTheDocument();
    expect(screen.queryByText("Defenders Involved / Flag")).not.toBeInTheDocument();
    expect(screen.queryByText("Flagger(s):")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "SHORT OF LINE" }));
    await waitFor(() => expect(createSecureRecord).toHaveBeenCalledWith("play", expect.objectContaining({
      possessionTeamId: "york_lions",
      runnerPlayerId: "Sonia Cabral",
      defenders: [],
      result: "Short",
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
    fireEvent.click(screen.getByRole("button", { name: "LOSS OF YARDS" }));
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
    fireEvent.click(screen.getByRole("button", { name: "SHORT OF LINE" }));
    await waitFor(() => expect(createSecureRecord).toHaveBeenCalledWith("play", expect.objectContaining({
      defenders: ["TEAM"],
    })));
  });

  it("retains interception-return flaggers when the opponent defense has no roster", async () => {
    render(<AsyncPlayByPlayManager matchId="match_york_mcmaster" />);
    fireEvent.click(await screen.findByRole("button", { name: /START (NEXT )?PLAY/i }));
    fireEvent.click(screen.getByRole("button", { name: "PASS PLAY" }));
    fireEvent.click(screen.getByRole("button", { name: "Interception" }));
    const returnFlaggers = screen.getByRole("group", { name: "Flagger(s) on Interception Return" });
    expect(screen.queryByRole("button", { name: "Team Defense" })).not.toBeInTheDocument();
    const expandFlaggers = within(returnFlaggers).queryByRole("button", { name: /Click to change/ });
    if (expandFlaggers) fireEvent.click(expandFlaggers);
    fireEvent.click(within(returnFlaggers).getByRole("button", { name: "Sonia Cabral" }));
    if (!screen.queryByRole("button", { name: /Quarterback:.*Sonia Cabral/ })) {
      fireEvent.click(screen.getByRole("button", { name: /Quarterback:.*Click to change/ }));
      fireEvent.click(screen.getByRole("button", { name: "Sonia Cabral" }));
    }
    fireEvent.click(screen.getByRole("button", { name: /FLAGGED.*Save Turnover/ }));
    await waitFor(() => expect(createSecureRecord).toHaveBeenCalledWith("play", expect.objectContaining({
      passOutcome: "Interception",
      defenders: [],
      flaggers: ["Sonia Cabral"],
    })));
  });
});
