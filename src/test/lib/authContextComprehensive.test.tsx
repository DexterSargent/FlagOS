import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  portalHomePath,
  clearIdentityLookupCache,
  scopeAuthToPortal,
  AuthProvider,
  useAuth,
} from "@/lib/authContext";
import { auth } from "@/lib/firebase";

vi.mock("@/lib/secureWrites", () => ({
  requestPrivateData: vi.fn().mockResolvedValue({
    teams: [{ id: "team_apex", name: "Apex" }],
    players: [],
  }),
}));

vi.mock("@/lib/leagueAccess", () => ({
  announceLeagueAccess: vi.fn(),
}));

describe("authContext Comprehensive Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearIdentityLookupCache();
    localStorage.clear();
  });

  describe("portalHomePath helper", () => {
    it("returns root '/' when user has no teams or player roles", () => {
      expect(portalHomePath([], [])).toBe("/");
    });

    it("returns '/teams/:id' directly when user belongs to exactly one team", () => {
      const teams = [{ id: "falcons" }];
      expect(portalHomePath(teams, [])).toBe("/teams/falcons");
    });

    it("ignores team_free_agents placeholder team", () => {
      const teams = [{ id: "team_free_agents" }];
      expect(portalHomePath(teams, [])).toBe("/");
    });

    it("resolves single player portal from teamId or leagueId", () => {
      expect(portalHomePath([], [{ teamId: "ravens" }])).toBe("/teams/ravens");
      expect(portalHomePath([], [{ leagueId: "league_ontario" }])).toBe("/league/league_ontario");
    });

    it("routes to '/account' when account has access to multiple portals", () => {
      const teams = [{ id: "falcons" }, { id: "hawks" }];
      expect(portalHomePath(teams, [])).toBe("/account");
    });
  });

  describe("scopeAuthToPortal utility", () => {
    const baseMockAuth: any = {
      user: { uid: "u123", email: "player@flagos.ca" },
      role: "user",
      isLeagueAdmin: false,
      isPlatformAdmin: false,
      isTeamAdmin: vi.fn(() => false),
      userProfile: {
        uid: "u123",
        email: "player@flagos.ca",
        managedTeamIds: ["team_apex"],
        playerRecords: [
          { id: "pl_1", teamId: "team_thunder", playerName: "Sam" },
        ],
      },
    };

    it("returns base auth untouched if simulatedIdentity is present", () => {
      const simulated = { ...baseMockAuth, simulatedIdentity: { role: "admin" } };
      expect(scopeAuthToPortal(simulated, ["team_apex"])).toBe(simulated);
    });

    it("scopes to team_admin when managedTeamIds intersect teamIds", () => {
      const scoped = scopeAuthToPortal(baseMockAuth, ["team_apex"]);
      expect(scoped.role).toBe("team_admin");
      expect(scoped.managedTeamId).toBe("team_apex");
      expect(scoped.isAdmin).toBe(true);
      expect(scoped.isAuthorized).toBe(true);
      expect(scoped.canRegisterAsPlayer).toBe(false);
    });

    it("scopes to player when playerRecords intersect teamIds", () => {
      const scoped = scopeAuthToPortal(baseMockAuth, ["team_thunder"]);
      expect(scoped.role).toBe("player");
      expect(scoped.isPlayer).toBe(true);
      expect(scoped.playerId).toBe("pl_1");
      expect(scoped.playerTeamId).toBe("team_thunder");
      expect(scoped.isAuthorized).toBe(true);
    });

    it("falls back to regular user role when neither team nor player matches portal", () => {
      const scoped = scopeAuthToPortal(baseMockAuth, ["team_other"]);
      expect(scoped.role).toBe("user");
      expect(scoped.isPlayer).toBe(false);
      expect(scoped.canRegisterAsPlayer).toBe(true);
      expect(scoped.isAuthorized).toBe(false);
    });

    it("preserves league_admin role even when scoped to another team", () => {
      const adminAuth = { ...baseMockAuth, role: "league_admin", isLeagueAdmin: true };
      const scoped = scopeAuthToPortal(adminAuth, ["team_random"]);
      expect(scoped.role).toBe("league_admin");
      expect(scoped.isAdmin).toBe(true);
      expect(scoped.isAuthorized).toBe(true);
    });
  });

  describe("AuthProvider and useAuth hook", () => {
    function AuthConsumer() {
      const { user, loading, role, setDevRole, canManageTeam } = useAuth();
      return (
        <div>
          <span data-testid="auth-loading">{loading ? "loading" : "ready"}</span>
          <span data-testid="user-email">{user?.email || "anonymous"}</span>
          <span data-testid="user-role">{role}</span>
          <span data-testid="can-manage-apex">{canManageTeam?.("team_apex") ? "yes" : "no"}</span>
          <button data-testid="set-role-btn" onClick={() => setDevRole("league_admin")}>
            Set Role
          </button>
        </div>
      );
    }

    it("provides authentication state and role updates", async () => {
      (auth as any).currentUser = {
        uid: "user_test_999",
        email: "test@flagos.ca",
        displayName: "Tester",
        emailVerified: true,
        getIdToken: vi.fn().mockResolvedValue("token_123"),
      };

      render(
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("auth-loading")).toHaveTextContent("ready");
      });

      expect(screen.getByTestId("user-role")).toBeInTheDocument();

      act(() => {
        screen.getByTestId("set-role-btn").click();
      });

      expect(screen.getByTestId("user-role")).toHaveTextContent("league_admin");
    });
  });
});
