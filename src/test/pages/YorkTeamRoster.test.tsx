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

vi.mock("@/lib/authContext", () => ({
  useAuth: () => ({
    user: { email: "dexter@yuwffl.ca" },
    isAdmin: true,
    isLeagueAdmin: false,
    isTeamAdmin: (id?: string) => id === "york_lions" || !id,
    canManageTeam: (id: string) => id === "york_lions",
    isPlayer: false,
    playerTeamId: null,
  }),
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

  it("switches to Depth Chart view and does NOT denote which players are reserves", async () => {
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
    });

    // Switch to Depth Chart view
    fireEvent.click(screen.getByText("Depth Chart"));

    // Verify depth chart headings exist
    expect(screen.getByText("Offense Depth Chart")).toBeInTheDocument();
    expect(screen.getByText("Defense & Special Depth Chart")).toBeInTheDocument();

    // Verify positions exist
    expect(screen.getByText("Quarterback")).toBeInTheDocument();
    expect(screen.getByText("Wide Receiver")).toBeInTheDocument();

    // Key players appear in depth chart
    expect(screen.getByText("Sonia Cabral")).toBeInTheDocument();

    // STRICT REQUIREMENT: Depth chart does NOT denote which players are reserves
    const reserveBadges = screen.queryAllByText(/Reserve/i);
    // Any remaining "Reserve" text should not be in the depth chart
    expect(reserveBadges.length).toBe(0);
  });
});
