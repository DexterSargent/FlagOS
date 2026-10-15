import React, { Suspense } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import {
  isYorkTeam,
  YORK_TEAM_ID,
  YORK_LIONS_TEAM,
  YORK_LIONS_PLAYERS,
  YORK_LIONS_MATCHES,
  YORK_LIONS_PLAYS,
  getYorkLionsPlaybooks,
} from "@/lib/yorkTeamData";
import TeamPortalHome from "@/app/teams/[id]/page";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/teams/york_lions",
}));

// Mock contexts
vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({
    isDemoLeague: false,
    settings: {
      leagueName: "FlagOS",
      rules: { playersOnField: 5, maxRosterSize: 15, minRosterSize: 5 },
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

    it("authorizes Dexter and Theo as coaching staff and admins", () => {
      expect(YORK_LIONS_TEAM.coachName).toBe("Dexter Harvey");
      expect(YORK_LIONS_TEAM.assistantCoach).toBe("Theo");
      expect(YORK_LIONS_TEAM.adminEmails).toContain("dexter@yuwffl.ca");
      expect(YORK_LIONS_TEAM.adminEmails).toContain("dexter.b.harvey@gmail.com");
      expect(YORK_LIONS_TEAM.adminEmails).toContain("theo@yuwffl.ca");
    });

    it("pre-seeds official 12-player varsity roster", () => {
      expect(YORK_LIONS_PLAYERS.length).toBe(12);
      const qb = YORK_LIONS_PLAYERS.find((p) => p.position === "QB");
      expect(qb?.playerName).toBe("Sarah Jenkins");
      expect(qb?.number).toBe("7");

      const rusher = YORK_LIONS_PLAYERS.find((p) => p.position === "RUSH");
      expect(rusher?.playerName).toBe("Brianna Scott");
      expect(rusher?.number).toBe("99");
    });

    it("provides exhibition schedule and completed game logs", () => {
      expect(YORK_LIONS_MATCHES.length).toBeGreaterThanOrEqual(3);
      const completed = YORK_LIONS_MATCHES.find((m) => m.status === "completed");
      expect(completed?.homeScore).toBe(28);
      expect(completed?.awayScore).toBe(21);
      expect(YORK_LIONS_PLAYS.length).toBeGreaterThanOrEqual(5);
    });

    it("pre-seeds custom 5v5 playbook with pre-snap motion for York", () => {
      const playbooks = getYorkLionsPlaybooks();
      expect(playbooks.length).toBe(2);
      const [offense, defense] = playbooks;
      expect(offense.type).toBe("offense");
      expect(defense.type).toBe("defense");

      const jetMotionPlay = offense.plays.find((p) => p.name === "Lion Jet Sweep Motion");
      expect(jetMotionPlay).toBeDefined();
      const motionPlayer = jetMotionPlay?.players.find((p) => p.routeType === "motion");
      expect(motionPlayer).toBeDefined();
      expect(motionPlayer?.label).toBe("Z");
    });
  });

  describe("TeamPortalHome Page Component for York Lions", () => {
    it("renders York Lions varsity club branding and complimentary active subscription badge", async () => {
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
        expect(screen.getByText("York Lions Women's Flag Football")).toBeInTheDocument();
      });

      // Check varsity portal badge
      expect(screen.getByText(/Varsity Club Team Portal/i)).toBeInTheDocument();

      // Check complimentary subscription banner
      expect(screen.getByText(/Active Subscription \(Complimentary Lifetime\)/i)).toBeInTheDocument();
      expect(screen.getByText(/York Lions Varsity Digital Headquarters/i)).toBeInTheDocument();

      // Check coaching staff
      expect(screen.getAllByText(/Dexter Harvey/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Theo/i).length).toBeGreaterThan(0);
      expect(screen.getByText("Coaching Staff:")).toBeInTheDocument();

      // Check bento navigation links
      expect(screen.getByText("Schedule")).toBeInTheDocument();
      expect(screen.getByText("Team")).toBeInTheDocument();
      expect(screen.getByText("Stat Leaders")).toBeInTheDocument();
      expect(screen.getByText("Playbooks")).toBeInTheDocument();
    });
  });
});
