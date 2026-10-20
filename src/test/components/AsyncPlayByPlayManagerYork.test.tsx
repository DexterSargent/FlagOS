import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AsyncPlayByPlayManager from "@/components/AsyncPlayByPlayManager";
import { setDoc } from "firebase/firestore";

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
});
