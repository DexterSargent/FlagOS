import React, { Suspense } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import {
  isYorkTeam,
  YORK_TEAM_ID,
  YORK_LIONS_TEAM,
  YORK_LIONS_PLAYERS,
  YORK_LIONS_MATCHES,
  YORK_LIONS_PLAYS,
} from "@/lib/yorkTeamData";
import TeamPortalHome from "@/app/teams/[id]/page";
import { loadTeamSeasonSummary } from "@/lib/teamSeasonSummary";

vi.mock("@/lib/teamSeasonSummary", async () => {
  const { calculateTeamComprehensiveStats } = await import("@/lib/teamStatsCalculator");
  return { loadTeamSeasonSummary: vi.fn().mockResolvedValue({
    teamStats: calculateTeamComprehensiveStats("york_lions", [], []), playerStats: {},
  }) };
});
vi.mock("@/lib/secureWrites", () => ({
  requestPrivateData: vi.fn().mockResolvedValue({ team: {} }),
  createSecureRecord: vi.fn().mockResolvedValue("record-id"),
}));

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/teams/york_lions",
}));

// Mock contexts
vi.mock("@/lib/leagueContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/leagueContext")>();
  return {
    ...actual,
    useLeague: () => ({
      isDemoLeague: false,
      activeLeagueId: "default",
      settings: {
        leagueName: "FlagOS",
        rules: { playersOnField: 5, maxRosterSize: 30, minRosterSize: 5 },
      },
    }),
  };
});

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

vi.mock("@/lib/usePrivateLeagueAccess", () => ({
  usePrivateLeagueAccess: () => ({
    isDenied: false,
    deniedElement: null,
  }),
}));

// Mock firebase
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  collection: vi.fn(),
  query: vi.fn((reference) => reference),
  where: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
}));

describe("York Lions Dedicated Team Portal & Standalone Subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("York Team Data & Standalone Subscription Specification", () => {
    it("recognizes York team aliases", () => {
      expect(isYorkTeam("york_lions")).toBe(true);
      expect(isYorkTeam("team_york")).toBe(true);
      expect(isYorkTeam("york")).toBe(true);
      expect(isYorkTeam("yuwffl_lions")).toBe(true);
      expect(isYorkTeam("team_kc")).toBe(false);
      expect(isYorkTeam(null)).toBe(false);
    });

    it("defines complimentary lifetime Pro Team subscription for York Lions", () => {
      expect(YORK_LIONS_TEAM.id).toBe(YORK_TEAM_ID);
      expect(YORK_LIONS_TEAM.isStandalone).toBe(true);
      expect(YORK_LIONS_TEAM.isComplimentary).toBe(true);
      expect(YORK_LIONS_TEAM.isFounderTeam).toBe(true);

      const sub = YORK_LIONS_TEAM.subscription;
      expect(sub.status).toBe("active");
      expect(sub.plan).toBe("team_pro");
      expect(sub.isComplimentary).toBe(true);
      expect(sub.monthlyFee).toBe(0);
      expect(sub.playbookLimit).toBe(5);
    });

    it("configures all three coaches and seven authorized sign-in addresses", () => {
      expect(YORK_LIONS_TEAM.coachName).toBe("Dexter Sargent");
      expect(YORK_LIONS_TEAM.assistantCoach).toBe("Theo Brown");
      expect(YORK_LIONS_TEAM.offensiveCoordinator).toBe("Justin Fawcett");
      expect(YORK_LIONS_TEAM.adminEmails).toEqual([
        "dextersargent@gmail.com", "dexters4@my.yorku.ca",
        "tbrown99@my.yorku.ca", "theobrown24@icloud.com", "theoren911@gmail.com",
        "fawcett1@my.yorku.ca", "justinfawcett93@gmail.com",
      ]);
    });

    it("pre-seeds official varsity roster with 15 active players and 5 tournament reserves", () => {
      expect(YORK_LIONS_PLAYERS.length).toBe(20);
      const active = YORK_LIONS_PLAYERS.filter((p) => p.status === "Active");
      const reserves = YORK_LIONS_PLAYERS.filter((p) => p.status === "Reserve");
      expect(active.length).toBe(15);
      expect(reserves.length).toBe(5);

      const qb = YORK_LIONS_PLAYERS.find((p) => p.position === "QB");
      expect(qb?.playerName).toBe("Sonia Cabral");
      expect(qb?.number).toBe("7");

      const rusher = YORK_LIONS_PLAYERS.find((p) => p.position === "RUSH");
      expect(rusher?.playerName).toBe("Shavannah Walker");
      expect(rusher?.number).toBe("99");

      const reserveNames = reserves.map((r) => r.playerName);
      expect(reserveNames).toContain("Catherine Chase");
      expect(reserveNames).toContain("Ciara Bagby-Sue");
      expect(reserveNames).toContain("Ciara Williams");
      expect(reserveNames).toContain("Melina Bosco");
      expect(reserveNames).toContain("Nicole Stylianou");
    });

    it("provides exhibition schedule and completed game logs", () => {
      expect(YORK_LIONS_MATCHES.length).toBe(5);
      const completed = YORK_LIONS_MATCHES.filter((m) => m.status === "completed");
      expect(completed.length).toBe(4);
      expect(YORK_LIONS_PLAYS.length).toBe(246);
    });

    });

  describe("TeamPortalHome Page Component for York Lions", () => {
    it("shows branding and navigation while the season summary is still loading, without querying raw plays", async () => {
      vi.mocked(loadTeamSeasonSummary).mockReturnValueOnce(new Promise(() => {}));
      const { getDocs } = await import("firebase/firestore");
      await act(async () => {
        render(<Suspense><TeamPortalHome params={Promise.resolve({ id: "york_lions" })} /></Suspense>);
      });
      expect(screen.getByText("Schedule")).toBeInTheDocument();
      expect(screen.getByText("Team")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("Loading season statistics");
      expect(getDocs).not.toHaveBeenCalled();
    });

    it("keeps team edits open and does not cache unsaved colors when a shared save fails", async () => {
      const { updateDoc } = await import("firebase/firestore");
      vi.mocked(updateDoc).mockRejectedValueOnce(new Error("Network unavailable"));
      const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
      await act(async () => {
        render(<Suspense fallback="loading"><TeamPortalHome params={Promise.resolve({ id: "york_lions" })} /></Suspense>);
      });
      fireEvent.click(await screen.findByText("Edit Team Info"));
      await act(async () => fireEvent.click(screen.getByRole("button", { name: /Save Changes/ })));
      expect(alert).toHaveBeenCalledWith("Failed to update team details.");
      expect(screen.getByText("Edit Team Details")).toBeInTheDocument();
      expect(localStorage.getItem("flagos_york_team_custom")).toBeNull();
      alert.mockRestore();
    });

    it("renders York Lions varsity branding, staff and team navigation", async () => {
      const paramsPromise = Promise.resolve({ id: "york_lions" });
      await act(async () => {
        render(
          <Suspense fallback={<div>Loading suspense...</div>}>
            <TeamPortalHome params={paramsPromise} />
          </Suspense>
        );
      });

      // Check team name
      await waitFor(() => {
        expect(screen.getAllByText("York Lions Women's Flag Football").length).toBeGreaterThan(0);
      });

      // Check varsity portal badge
      expect(screen.getAllByText(/Varsity Club Team Portal/i).length).toBeGreaterThan(0);

      // Check coaching staff
      expect(screen.getAllByText(/Dexter Sargent/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Theo/i).length).toBeGreaterThan(0);
      expect(screen.getByText("Coaching Staff:")).toBeInTheDocument();
      expect(screen.getByText("Theo Brown (Defensive Coordinator)")).toBeInTheDocument();
      expect(screen.getByText("Justin Fawcett (Offensive Coordinator)")).toBeInTheDocument();

      // Check bento navigation links
      expect(screen.getByText("Schedule")).toBeInTheDocument();
      expect(screen.getByText("Team")).toBeInTheDocument();
      expect(screen.getByText("Stat Leaders")).toBeInTheDocument();
      expect(screen.getByText("Playbooks")).toBeInTheDocument();

      // Check dedicated logo slot / space for custom team logo
      expect(screen.getByText("Add Logo")).toBeInTheDocument();
      expect(screen.getByText("Click to Upload")).toBeInTheDocument();

      // Check team colours swatches bar
      expect(screen.getByText("Colours:")).toBeInTheDocument();

      // Check Edit Team Info button
      expect(screen.getByText("Edit Team Info")).toBeInTheDocument();

      // Check Powered by FlagOS disclaimer is present in footer as the sole FlagOS branding
      expect(screen.getByText(/Powered by/i)).toBeInTheDocument();
      expect(screen.getByText("OS")).toBeInTheDocument();

      // STRICT REQUIREMENT: No Back to All Teams button on York team or independent team pages
      expect(screen.queryByText(/All Teams/i)).toBeNull();
    });

    it("shows three coaches with all seven sign-in addresses rather than seven separate admins", async () => {
      await act(async () => render(
        <Suspense fallback="loading"><TeamPortalHome params={Promise.resolve({ id: "york_lions" })} /></Suspense>,
      ));
      fireEvent.click(await screen.findByText("Coaches & Admins (3)"));
      expect(screen.getByText("Current Team Admins (3)")).toBeInTheDocument();
      expect(screen.getByText("Dexter Sargent")).toBeInTheDocument();
      expect(screen.getByText("Theo Brown")).toBeInTheDocument();
      expect(screen.getByText("Justin Fawcett")).toBeInTheDocument();
      for (const email of ["dextersargent@gmail.com", "dexters4@my.yorku.ca", "tbrown99@my.yorku.ca", "theobrown24@icloud.com", "theoren911@gmail.com", "fawcett1@my.yorku.ca", "justinfawcett93@gmail.com"]) {
        expect(screen.getByText(email)).toBeInTheDocument();
      }
      expect(screen.getByRole("link", { name: "Manage my connected emails" })).toHaveAttribute("href", "/account");
    });

    it("opens edit team details modal allowing customization of name, logo, and colours", async () => {
      const paramsPromise = Promise.resolve({ id: "york_lions" });
      await act(async () => {
        render(
          <Suspense fallback={<div>Loading suspense...</div>}>
            <TeamPortalHome params={paramsPromise} />
          </Suspense>
        );
      });

      await waitFor(() => {
        expect(screen.getByText("Edit Team Info")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Edit Team Info"));

      // Check modal heading and fields
      expect(screen.getByText("Edit Team Details")).toBeInTheDocument();
      expect(screen.getByDisplayValue("York Lions Women's Flag Football")).toBeInTheDocument();
      expect(screen.getByDisplayValue("YORK")).toBeInTheDocument();
      expect(screen.getByText("Quick Colour Presets:")).toBeInTheDocument();
      expect(screen.getByText("Team Logo & Emblem")).toBeInTheDocument();
      expect(screen.getByText("Upload Logo from Device")).toBeInTheDocument();

      // Check pinned action buttons
      expect(screen.getByTitle("Close")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
      expect(screen.getByText("Save Changes")).toBeInTheDocument();
    });

    it("renders Season Team Stats strip displaying strictly record, points for, and points allowed by default", async () => {
      const paramsPromise = Promise.resolve({ id: "york_lions" });
      await act(async () => {
        render(
          <Suspense fallback={<div>Loading suspense...</div>}>
            <TeamPortalHome params={paramsPromise} />
          </Suspense>
        );
      });

      await waitFor(() => {
        expect(screen.getByText("Season Team Stats")).toBeInTheDocument();
      });

      // Default visible stats: 3 active (Record, Points For, Points Allowed)
      expect(screen.getByText("3 ACTIVE")).toBeInTheDocument();
      expect(screen.getByText("REC")).toBeInTheDocument();
      expect(screen.getByText("PF")).toBeInTheDocument();
      expect(screen.getByText("PA")).toBeInTheDocument();

      // Advanced stats hidden by default
      expect(screen.queryByText("PPG")).not.toBeInTheDocument();
      expect(screen.queryByText("DPPG")).not.toBeInTheDocument();
      expect(screen.queryByText("3RD %")).not.toBeInTheDocument();
      expect(screen.queryByText("4TH %")).not.toBeInTheDocument();
      expect(screen.queryByText("PAT %")).not.toBeInTheDocument();
      expect(screen.queryByText("TO DIFF")).not.toBeInTheDocument();
    });

    it("allows team admin to open Customize Stats modal, select additional stats, and save preferences", async () => {
      const paramsPromise = Promise.resolve({ id: "york_lions" });
      await act(async () => {
        render(
          <Suspense fallback={<div>Loading suspense...</div>}>
            <TeamPortalHome params={paramsPromise} />
          </Suspense>
        );
      });

      await waitFor(() => {
        expect(screen.getByText("Customize Stats")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Customize Stats"));

      // Check modal heading and category controls
      expect(await screen.findByText("Customize Team Stats Display")).toBeInTheDocument();
      expect(screen.getByText("Reset to Default (Record, PF, PA)")).toBeInTheDocument();
      expect(screen.getByText("Select All")).toBeInTheDocument();
      expect(screen.getByText("Clear All")).toBeInTheDocument();

      // Toggle PPG (Points Per Game) to visible
      const ppgOption = screen.getByText("Points Per Game (PPG)");
      expect(ppgOption).toBeInTheDocument();
      fireEvent.click(ppgOption);

      // Save custom stats
      const saveStatsBtn = screen.getByText("Save Custom Stats");
      expect(saveStatsBtn).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(saveStatsBtn);
      });

      // Modal closes and PPG now displays in the stats strip
      await waitFor(() => {
        expect(screen.queryByText("Customize Team Stats Display")).not.toBeInTheDocument();
        expect(screen.getByText("PPG")).toBeInTheDocument();
      });
    });

    it("renders All Teams button for league member teams but excludes it for York and independent teams", async () => {
      // 1. York Lions (independent team) -> No All Teams button
      const yorkPromise = Promise.resolve({ id: "york_lions" });
      let unmountFn: () => void = () => {};
      await act(async () => {
        const { unmount } = render(
          <Suspense fallback={<div>Loading suspense...</div>}>
            <TeamPortalHome params={yorkPromise} />
          </Suspense>
        );
        unmountFn = unmount;
      });
      await waitFor(() => {
        expect(screen.queryByText("All Teams")).toBeNull();
      });
      unmountFn();

      // 2. League member team with leagueId -> Has All Teams button pointing to specifically its league
      const { getDoc } = await import("firebase/firestore");
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          id: "team_buf",
          name: "Buffalo",
          shortcode: "BUF",
          leagueId: "league_demo",
        }),
      } as any);

      const bufPromise = Promise.resolve({ id: "team_buf" });
      await act(async () => {
        const { unmount } = render(
          <Suspense fallback={<div>Loading suspense...</div>}>
            <TeamPortalHome params={bufPromise} />
          </Suspense>
        );
        unmountFn = unmount;
      });
      await waitFor(() => {
        const allTeamsBtn = screen.getByRole("link", { name: /all teams/i });
        expect(allTeamsBtn).toBeInTheDocument();
        expect(allTeamsBtn).toHaveAttribute("href", "/league/league_demo");
      });
      unmountFn();

      // 3. Demo league team without explicit leagueId -> Has All Teams button pointing specifically to demo league
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          id: "team_kc",
          name: "Kansas City",
          shortcode: "KC",
        }),
      } as any);

      const kcPromise = Promise.resolve({ id: "team_kc" });
      await act(async () => {
        render(
          <Suspense fallback={<div>Loading suspense...</div>}>
            <TeamPortalHome params={kcPromise} />
          </Suspense>
        );
      });
      await waitFor(() => {
        const allTeamsBtn = screen.getByRole("link", { name: /all teams/i });
        expect(allTeamsBtn).toBeInTheDocument();
        expect(allTeamsBtn).toHaveAttribute("href", "/league/default");
      });
    });
  });
});
