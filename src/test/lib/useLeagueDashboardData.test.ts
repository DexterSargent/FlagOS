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

  it("calculates player stats, match schedule, and team info when viewing as an athlete", async () => {
    const { useAuth } = await import("@/lib/authContext");
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: "user_player_1", email: "mvance@buf.ca" } as any,
      role: "player",
      isLeagueAdmin: false,
      isTeamAdmin: () => false,
      isPlayer: true,
      playerId: "p_marcus",
      playerTeamId: "team_buf",
      playerData: { playerName: "Marcus Vance", teamId: "team_buf", number: "7" } as any,
      canManageTeam: () => false,
      managedTeamId: null,
      setDevRole: vi.fn(),
    } as any);

    const { result } = renderHook(() => useLeagueDashboardData("default"));

    expect(result.current.isPlayerView).toBe(true);
    expect(result.current.isSpectatorView).toBe(false);
    expect(result.current.myPlayerTeam?.id).toBe("team_buf");
    expect(result.current.myPlayerMatches.length).toBeGreaterThan(0);
    expect(result.current.myStats).toBeDefined();
    expect(result.current.myStats.gamesPlayed).toBeGreaterThanOrEqual(0);
  });

  it("sets up coach view and manages team when user is a coach", async () => {
    const { useAuth } = await import("@/lib/authContext");
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: "user_coach_1", email: "coach@buf.ca" } as any,
      role: "team_admin",
      isLeagueAdmin: false,
      isTeamAdmin: (tid: any) => tid === "team_buf",
      isPlayer: false,
      playerId: null,
      playerTeamId: null,
      playerData: null,
      canManageTeam: (tid: any) => tid === "team_buf",
      managedTeamId: "team_buf",
      setDevRole: vi.fn(),
    } as any);

    const { result } = renderHook(() => useLeagueDashboardData("default"));

    expect(result.current.isTeamAdminView).toBe(true);
    expect(result.current.isSpectatorView).toBe(false);
    expect(result.current.managedTeam?.id).toBe("team_buf");
  });

  it("sets up commissioner controls when user is league admin", async () => {
    const { useAuth } = await import("@/lib/authContext");
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: "user_admin_1", email: "commissioner@apex.ca" } as any,
      role: "league_admin" as any,
      isLeagueAdmin: true,
      isTeamAdmin: () => false,
      isPlayer: false,
      playerId: null,
      playerTeamId: null,
      playerData: null,
      canManageTeam: () => false,
      managedTeamId: null,
      setDevRole: vi.fn(),
    } as any);

    const { result } = renderHook(() => useLeagueDashboardData("default"));

    expect(result.current.isLeagueAdminView).toBe(true);
    expect(result.current.isSpectatorView).toBe(false);
  });

  it("subscribes to firestore collections in non-demo mode and unmounts cleanly", async () => {
    const { useLeague } = await import("@/lib/leagueContext");
    vi.mocked(useLeague).mockReturnValue({
      settings: {
        leagueName: "Real Flag League",
        rules: { periodDurationMinutes: 20, periodsCount: 2 },
      },
      activeLeagueId: "league_real_prod",
      switchLeague: vi.fn(),
      isDemoLeague: false,
      subscription: { tier: "starter", maxTeams: 8 } as any,
    } as any);

    const { unmount } = renderHook(() => useLeagueDashboardData("league_real_prod"));
    expect(() => unmount()).not.toThrow();
  });
});

