import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseHex,
  isAuthorizedForLeague,
  reconcileUserLeagues,
  DEFAULT_LEAGUE_RULES,
  IFAF_5V5_RULES,
  DEFAULT_LEAGUE_SETTINGS,
  LeagueProvider,
  leaguePageHref,
  useLeague,
  type UserLeagueSummary,
} from "@/lib/leagueContext";
import * as secureWrites from "@/lib/secureWrites";
import * as demoSandboxRuntime from "@/lib/demoSandboxRuntime";

vi.mock("next/navigation", () => ({
  usePathname: () => "/league/league_apex",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/firebase", () => ({
  auth: {
    currentUser: {
      uid: "user_owner",
      email: "owner@flagos.ca",
      emailVerified: true,
    },
  },
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, collection, id) => ({ collection, id })),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({
      leagueName: "Apex League",
      visibility: "public",
      rules: DEFAULT_LEAGUE_RULES,
      subscription: { status: "active", plan: "league", teamCount: 8 },
      seasons: [
        { id: "season_2026", title: "2026 Season", isCurrent: true },
        { id: "season_past", title: "2025 Season", isCurrent: false },
      ],
    }),
  }),
  setDoc: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/secureWrites", () => ({
  createSecureRecord: vi.fn().mockResolvedValue("rec_123"),
}));

vi.mock("@/lib/billingClient", () => ({
  applySeatChange: vi.fn().mockResolvedValue({
    status: "applied",
    newTeamCount: 10,
  }),
  previewSeatChange: vi.fn().mockResolvedValue({
    amountDueNowCents: 0,
    newMonthlyCents: 10000,
  }),
  formatCad: vi.fn((c) => `$${c / 100} CAD`),
}));

describe("leagueContext Comprehensive Suite", () => {
  describe("parseHex utility", () => {
    it("parses valid 6-character hex colors", () => {
      expect(parseHex("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
      expect(parseHex("00ff00")).toEqual({ r: 0, g: 255, b: 0 });
      expect(parseHex("#0000ff")).toEqual({ r: 0, g: 0, b: 255 });
    });

    it("parses valid 3-character shorthand hex colors", () => {
      expect(parseHex("#f00")).toEqual({ r: 255, g: 0, b: 0 });
      expect(parseHex("0f0")).toEqual({ r: 0, g: 255, b: 0 });
      expect(parseHex("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    });

    it("falls back to default green on invalid or empty hex strings", () => {
      const fallback = { r: 60, g: 165, b: 5 };
      expect(parseHex("")).toEqual(fallback);
      expect(parseHex("invalid")).toEqual(fallback);
      expect(parseHex("#12")).toEqual(fallback);
      expect(parseHex("#gggggg")).toEqual(fallback);
    });
  });

  describe("isAuthorizedForLeague utility", () => {
    it("authorizes demo and default leagues for everyone", () => {
      expect(isAuthorizedForLeague("default", null, null)).toBe(true);
      expect(isAuthorizedForLeague("demo_league", "anon@x.com", null)).toBe(true);
    });

    it("authorizes public leagues for any user", () => {
      expect(isAuthorizedForLeague("league_public", null, { visibility: "public" })).toBe(true);
    });

    it("denies unauthenticated or unauthorized users on private leagues", () => {
      expect(isAuthorizedForLeague("league_private", null, { visibility: "private" })).toBe(false);
      expect(isAuthorizedForLeague("league_private", "stranger@x.com", {
        visibility: "private",
        adminEmails: ["admin@flagos.ca"],
      })).toBe(false);
    });

    it("authorizes league admins, subscription admins, and platform owner on private leagues", () => {
      // Direct admin
      expect(isAuthorizedForLeague("league_priv", "admin@flagos.ca", {
        visibility: "private",
        adminEmails: ["admin@flagos.ca"],
      })).toBe(true);

      // Subscription admin
      expect(isAuthorizedForLeague("league_priv", "sub_admin@flagos.ca", {
        visibility: "private",
        subscription: { adminEmails: ["sub_admin@flagos.ca"] },
      })).toBe(true);

      // Platform owner
      expect(isAuthorizedForLeague("league_priv", "dextersargent@flagos.ca", {
        visibility: "private",
        adminEmails: [],
      })).toBe(true);
    });
  });

  describe("reconcileUserLeagues utility", () => {
    it("merges custom user leagues with default demo league without duplicates", () => {
      const custom: UserLeagueSummary[] = [
        { id: "league_1", name: "Metro League", shortcode: "METRO", role: "owner" },
      ];
      const memberships = [
        { id: "league_1", name: "Metro League", role: "owner" as const },
      ];
      const result = reconcileUserLeagues(custom, memberships as any);
      expect(result.some((l) => l.id === "league_1")).toBe(true);
      expect(result.some((l) => l.id === "default")).toBe(true);
      expect(new Set(result.map((l) => l.id)).size).toBe(result.length);
    });
  });

  describe("leaguePageHref utility", () => {
    it("uses the supplied league ID instead of the current demo URL flag", () => {
      window.history.replaceState({}, "", "/schedule?demo=true");

      expect(leaguePageHref("/schedule", "league_real")).toBe("/schedule?league=league_real");
      expect(leaguePageHref("/schedule", "default")).toBe("/schedule?demo=true");

      window.history.replaceState({}, "", "/");
    });
  });

  describe("LeagueProvider operations", () => {
    function ConsumerComponent() {
      const league = useLeague();
      return (
        <div>
          <span data-testid="league-name">{league.settings.leagueName}</span>
          <span data-testid="customizer-status">{league.isCustomizerOpen ? "open" : "closed"}</span>
          <span data-testid="season-viewing">{league.viewingSeasonId}</span>
          <button data-testid="open-customizer-btn" onClick={league.openCustomizer}>Open</button>
          <button data-testid="close-customizer-btn" onClick={league.closeCustomizer}>Close</button>
          <button
            data-testid="update-settings-btn"
            onClick={() => league.updateSettings({ leagueName: "Updated Name" })}
          >
            Update Settings
          </button>
          <button
            data-testid="update-rules-btn"
            onClick={() => league.updateRules({ rushLineDistance: 10 })}
          >
            Update Rules
          </button>
          <button
            data-testid="preview-theme-btn"
            onClick={() => league.previewThemeColors("#ff0000", "#00ff00")}
          >
            Preview Theme
          </button>
          <button data-testid="revert-theme-btn" onClick={league.revertThemeColors}>
            Revert Theme
          </button>
          <button
            data-testid="set-season-btn"
            onClick={() => league.setViewingSeasonId("season_past")}
          >
            Set Season
          </button>
          <button
            data-testid="create-league-btn"
            onClick={async () => {
              await league.createLeague({
                name: "New League",
                shortcode: "NWL",
                visibility: "public",
              });
            }}
          >
            Create League
          </button>
          <button
            data-testid="archive-league-btn"
            onClick={() => league.archiveLeague("pause_subscription")}
          >
            Archive League
          </button>
          <button
            data-testid="resume-sub-btn"
            onClick={() => league.resumeSubscription()}
          >
            Resume Sub
          </button>
          <button
            data-testid="update-seats-btn"
            onClick={() => league.updateSubscriptionTeamCount(12)}
          >
            Update Seats
          </button>
          <button
            data-testid="start-season-btn"
            onClick={() => league.startNewSeason("2027 Summer")}
          >
            Start Season
          </button>
          <button
            data-testid="reset-demo-btn"
            onClick={() => league.resetDemoSession()}
          >
            Reset Demo
          </button>
        </div>
      );
    }

    it("provides league context and handles customizer open/close and theme preview/revert", async () => {
      render(
        <LeagueProvider>
          <ConsumerComponent />
        </LeagueProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("league-name")).toHaveTextContent("Apex League");
      });

      // Customizer toggling
      expect(screen.getByTestId("customizer-status")).toHaveTextContent("closed");
      act(() => {
        screen.getByTestId("open-customizer-btn").click();
      });
      expect(screen.getByTestId("customizer-status")).toHaveTextContent("open");
      act(() => {
        screen.getByTestId("close-customizer-btn").click();
      });
      expect(screen.getByTestId("customizer-status")).toHaveTextContent("closed");

      // Theme preview and revert
      act(() => {
        screen.getByTestId("preview-theme-btn").click();
      });
      act(() => {
        screen.getByTestId("revert-theme-btn").click();
      });

      // Update settings
      await act(async () => {
        screen.getByTestId("update-settings-btn").click();
      });
      expect(secureWrites.createSecureRecord).toHaveBeenCalled();

      // Update rules
      await act(async () => {
        screen.getByTestId("update-rules-btn").click();
      });
      expect(secureWrites.createSecureRecord).toHaveBeenCalled();

      // Viewing season
      act(() => {
        screen.getByTestId("set-season-btn").click();
      });
      expect(screen.getByTestId("season-viewing")).toHaveTextContent("season_past");

      // Archive league
      await act(async () => {
        screen.getByTestId("archive-league-btn").click();
      });
      expect(secureWrites.createSecureRecord).toHaveBeenCalled();

      // Resume subscription
      await act(async () => {
        screen.getByTestId("resume-sub-btn").click();
      });
      expect(secureWrites.createSecureRecord).toHaveBeenCalled();

      // Update subscription team count
      await act(async () => {
        screen.getByTestId("update-seats-btn").click();
      });

      // Start new season
      await act(async () => {
        screen.getByTestId("start-season-btn").click();
      });
      expect(secureWrites.createSecureRecord).toHaveBeenCalledWith("start_season", expect.objectContaining({
        title: "2027 Summer",
      }));

      // Reset demo session
      await act(async () => {
        screen.getByTestId("reset-demo-btn").click();
      });

      // Create league
      await act(async () => {
        screen.getByTestId("create-league-btn").click();
      });
      expect(secureWrites.createSecureRecord).toHaveBeenCalledWith("league", expect.objectContaining({
        leagueName: "New League",
      }));
    });
  });
});
