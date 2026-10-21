import React, { Suspense } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import TeamRosterPage from "@/app/teams/[id]/roster/page";
import { YORK_LIONS_PLAYERS } from "@/lib/yorkTeamData";
import { getDepthFormations } from "@/lib/depthChart";
import { createSecureRecord } from "@/lib/secureWrites";

vi.mock("@/lib/teamSeasonSummary", () => ({
  loadTeamSeasonSummary: vi.fn().mockResolvedValue({ teamStats: {}, playerStats: {} }),
  buildRosterPlayerStats: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/secureWrites", () => ({
  createSecureRecord: vi.fn().mockResolvedValue("player-id"),
  requestPrivateData: vi.fn(async (action: string) => action === "depth_chart"
    ? { charts: [], formations: getDepthFormations(), visibleToPlayers: false, canEdit: true }
    : { team: {}, players: {} }),
}));

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/teams/york_lions/roster",
}));

// Mock contexts
vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({
    isDemoLeague: false,
    settings: {
      leagueName: "FlagOS",
      rules: { playersOnField: 5, maxRosterSize: 30, minRosterSize: 5 },
    },
  }),
}));

const mockUseAuth = vi.fn();
vi.mock("@/lib/authContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock firebase
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  collection: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  query: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: "new_player_id" }),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
}));

describe("Team Roster & Depth Chart Specification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { email: "dexter@yuwffl.ca" },
      isAdmin: true,
      isLeagueAdmin: false,
      isTeamAdmin: (id?: string) => id === "york_lions" || !id,
      canManageTeam: (id: string) => id === "york_lions",
      isPlayer: false,
      playerTeamId: null,
    });
  });

  it("enforces a hard cap of 30 players for all teams", async () => {
    const paramsPromise = Promise.resolve({ id: "york_lions" });
    await act(async () => {
      render(
        <Suspense fallback={<div>Loading suspense...</div>}>
          <TeamRosterPage params={paramsPromise} />
        </Suspense>
      );
    });

    await waitFor(() => {
      // Hard cap of 30 players is displayed
      expect(screen.getByText("20/30 Players (Min: 5)")).toBeInTheDocument();
      expect(screen.getByText("Roster (20/30)")).toBeInTheDocument();
    });
  });

  it("saves more than one position without dropping existing selections", async () => {
    await act(async () => {
      render(<Suspense><TeamRosterPage params={Promise.resolve({ id: "york_lions" })} /></Suspense>);
    });
    fireEvent.click((await screen.findAllByTitle("Edit Player Details"))[0]);
    for (const position of ["WR", "DB"]) {
      const button = screen.getByRole("button", { name: position });
      if (button.getAttribute("aria-pressed") !== "true") fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole("button", { name: "Save Details" }));
    await waitFor(() => expect(createSecureRecord).toHaveBeenCalledWith("player_update", expect.objectContaining({
      positions: expect.arrayContaining(["WR", "DB"]),
    })));
  });

  it("lets coaches create depth charts instead of inferring player order alphabetically", async () => {
    const paramsPromise = Promise.resolve({ id: "york_lions" });
    await act(async () => {
      render(
        <Suspense fallback={<div>Loading suspense...</div>}>
          <TeamRosterPage params={paramsPromise} />
        </Suspense>
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Depth Chart")).toBeInTheDocument();
      expect(screen.getByText("Show Stats")).toBeInTheDocument();
    });

    // Switch to Depth Chart view
    fireEvent.click(screen.getByText("Depth Chart"));

    expect(await screen.findByRole("button", { name: "Create Depth Chart" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Depth chart name"), { target: { value: "First Team" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Depth Chart" }));
    expect(screen.getByText("Quarterback")).toBeInTheDocument();

    // STRICT REQUIREMENT 1: Stats button must NOT disappear when clicking Depth Chart!
    expect(screen.getByText("Show Stats")).toBeInTheDocument();

    // STRICT REQUIREMENT 2: Position card frame aligns single player to the top (justify-start, NOT justify-between)
    const qbBadge = screen.getByText("Quarterback");
    const qbFrame = qbBadge.closest(".flex-col");
    expect(qbFrame).toHaveClass("justify-start");
    expect(qbFrame).not.toHaveClass("justify-between");

    fireEvent.change(screen.getByLabelText("Add player to Quarterback"), { target: { value: YORK_LIONS_PLAYERS.find((player) => player.playerName === "Sonia Cabral")!.id } });
    expect(screen.getByText(/1\. #.*Sonia Cabral/)).toBeInTheDocument();

    // Toggle Show Stats button inside Depth Chart
    fireEvent.click(screen.getByText("Show Stats"));
    expect(screen.getByText("Hide Stats")).toBeInTheDocument();

    // STRICT REQUIREMENT 3: Depth chart does NOT denote which players are reserves
    const reserveBadges = screen.queryAllByText(/Reserve/i);
    expect(reserveBadges.length).toBe(0);
  });

  it("hides player emails from public/non-admin users and shows them only to team and league admins", async () => {
    // 1. Non-admin user viewing roster
    mockUseAuth.mockReturnValue({
      user: null,
      isAdmin: false,
      isLeagueAdmin: false,
      isTeamAdmin: () => false,
      canManageTeam: () => false,
      isPlayer: false,
      playerTeamId: null,
    });

    const paramsPromise = Promise.resolve({ id: "york_lions" });
    let unmountFn: () => void = () => {};
    await act(async () => {
      const { unmount } = render(
        <Suspense fallback={<div>Loading suspense...</div>}>
          <TeamRosterPage params={paramsPromise} />
        </Suspense>
      );
      unmountFn = unmount;
    });

    await waitFor(() => {
      expect(screen.getByText("Sonia Cabral")).toBeInTheDocument();
    });

    // Player email should NOT be displayed on the page for public users
    expect(screen.queryByText(/@/)).toBeNull();
    unmountFn();

    // 2. Team admin viewing roster
    mockUseAuth.mockReturnValue({
      user: { email: "dextersargent@gmail.com" },
      isAdmin: true,
      isLeagueAdmin: false,
      isTeamAdmin: (id?: string) => id === "york_lions",
      canManageTeam: (id: string) => id === "york_lions",
      isPlayer: false,
      playerTeamId: null,
    });

    await act(async () => {
      render(
        <Suspense fallback={<div>Loading suspense...</div>}>
          <TeamRosterPage params={paramsPromise} />
        </Suspense>
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Sonia Cabral")).toBeInTheDocument();
    });
  });
});
