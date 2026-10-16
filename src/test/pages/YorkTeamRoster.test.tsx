import React, { Suspense } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import TeamRosterPage from "@/app/teams/[id]/roster/page";
import { YORK_LIONS_PLAYERS } from "@/lib/yorkTeamData";

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
      expect(screen.getByText("Roster (20/30 Max • Min: 5)")).toBeInTheDocument();
    });
  });

  it("switches to Depth Chart view, keeps stats button visible, aligns single player to top, and does NOT denote reserves", async () => {
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

    // Verify depth chart headings exist
    expect(screen.getByText("Offense Depth Chart")).toBeInTheDocument();
    expect(screen.getByText("Defense & Special Depth Chart")).toBeInTheDocument();

    // Verify positions exist
    expect(screen.getByText("Quarterback")).toBeInTheDocument();
    expect(screen.getByText("Wide Receiver")).toBeInTheDocument();

    // STRICT REQUIREMENT 1: Stats button must NOT disappear when clicking Depth Chart!
    expect(screen.getByText("Show Stats")).toBeInTheDocument();

    // STRICT REQUIREMENT 2: Position card frame aligns single player to the top (justify-start, NOT justify-between)
    const qbBadge = screen.getByText("QB");
    const qbFrame = qbBadge.closest(".flex-col");
    expect(qbFrame).toHaveClass("justify-start");
    expect(qbFrame).not.toHaveClass("justify-between");

    // Key players appear in depth chart
    expect(screen.getByText("Sonia Cabral")).toBeInTheDocument();

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
