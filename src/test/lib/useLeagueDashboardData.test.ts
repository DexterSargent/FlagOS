import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLeagueDashboardData } from "@/lib/useLeagueDashboardData";

vi.mock("@/lib/firebase", () => ({
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  onSnapshot: vi.fn().mockReturnValue(() => {}),
  query: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("@/lib/authContext", () => ({
  useAuth: vi.fn(() => ({
    user: { uid: "user_test", email: "test@flagos.ca" },
    role: "spectator",
    isLeagueAdmin: false,
    isTeamAdmin: () => false,
    isPlayer: false,
    playerId: null,
    playerTeamId: null,
    playerData: null,
    canManageTeam: () => false,
    managedTeamId: null,
    setDevRole: vi.fn(),
  })),
}));

vi.mock("@/lib/leagueContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/leagueContext")>();
  return {
    ...actual,
    useLeague: vi.fn(() => ({
      settings: {
        leagueName: "Test League",
        rules: { periodDurationMinutes: 20, periodsCount: 2 },
      },
      activeLeagueId: "league_test_123",
      switchLeague: vi.fn(),
      isDemoLeague: true,
      subscription: { tier: "starter", maxTeams: 8 },
    })),
  };
});

vi.mock("@/lib/usePrivateLeagueAccess", () => ({
  usePrivateLeagueAccess: vi.fn(() => ({
    isDenied: false,
    deniedElement: null,
  })),
}));

describe("useLeagueDashboardData", () => {
  it("initializes with demo sandbox data in demo mode", () => {
    const { result } = renderHook(() => useLeagueDashboardData("default"));

    expect(result.current.isEffectiveDemo).toBe(true);
    expect(result.current.isSpectatorView).toBe(true);
    expect(result.current.isLeagueAdminView).toBe(false);
    expect(result.current.isPlayerView).toBe(false);
    expect(result.current.teams.length).toBeGreaterThan(0);
    expect(result.current.sortedStandings).toBeDefined();
    expect(result.current.topPasser).toBeDefined();
    expect(result.current.topReceiver).toBeDefined();
    expect(result.current.topFlagger).toBeDefined();
    expect(result.current.topScorer).toBeDefined();
  });
});
