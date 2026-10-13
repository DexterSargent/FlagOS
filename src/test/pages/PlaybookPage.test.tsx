import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import TeamPlaybookPage from "@/app/teams/[id]/playbook/page";

import { Suspense } from "react";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock contexts
const mockAuth = {
  user: { uid: "test-user-1", email: "test@flagos.ca" },
  role: "team_coach",
  isPlayer: false,
  playerTeamId: null as string | null,
  isLeagueAdmin: false,
  isTeamAdmin: vi.fn(),
  managedTeamId: "team_apex" as string | null,
  canManageTeam: vi.fn(),
};

vi.mock("@/lib/authContext", () => ({
  useAuth: () => mockAuth,
}));

vi.mock("@/lib/leagueContext", () => ({
  DEFAULT_LEAGUE_SETTINGS: {
    leagueName: "FlagOS League",
    shortcode: "FLAG",
    tagline: "The Flag Football Operating System",
    seasonTitle: "2026 Season",
    logoUrl: "/flagos-logo.png",
    icon: "shield",
    primaryColor: "#3ca505",
    accentColor: "#22c55e",
    themePreset: "gridiron-green",
    defaultLocation: "Turf Field 1",
    contactEmail: "commissioner@flagos.ca",
    rulebookTitle: "IFAF 5v5 Non-Contact Rulebook",
    visibility: "public",
    rules: { playersOnField: 5 },
  },
  DEFAULT_LEAGUE_RULES: {
    playersOnField: 5,
  },
  useLeague: () => ({
    settings: {
      leagueName: "FlagOS League",
      shortcode: "FLAG",
      primaryColor: "#3ca505",
      accentColor: "#22c55e",
      rules: { playersOnField: 5 },
      announcement: "",
    },
    isDemoLeague: false,
  }),
}));

vi.mock("@/lib/themeContext", () => ({
  useTheme: () => ({
    resolvedTheme: "dark",
    setTheme: vi.fn(),
  }),
}));

// Mock Firebase Firestore getDoc & setDoc
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    id: "team_apex",
    data: () => ({
      name: "Apex Predators",
      shortcode: "APX",
    }),
  }),
  setDoc: vi.fn().mockResolvedValue(undefined),
}));

describe("Playbook RBAC & Studio Security Suite (TeamPlaybookPage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: Coach for team_apex
    mockAuth.role = "team_coach";
    mockAuth.isLeagueAdmin = false;
    mockAuth.isPlayer = false;
    mockAuth.playerTeamId = null;
    mockAuth.managedTeamId = "team_apex";
    mockAuth.isTeamAdmin = vi.fn((tid?: string) => tid === "team_apex");
    mockAuth.canManageTeam = vi.fn((tid?: string) => tid === "team_apex");

    // Clean window location search
    delete (window as any).location;
    window.location = new URL("http://localhost:3000/teams/team_apex/playbook") as any;
  });

  const renderPage = async (teamId = "team_apex") => {
    let result: any;
    const paramsPromise = Promise.resolve({ id: teamId });
    await act(async () => {
      result = render(
        <Suspense fallback={<div>Loading suspense...</div>}>
          <TeamPlaybookPage params={paramsPromise} />
        </Suspense>
      );
    });
    return result;
  };

  it("STRICT RBAC RULE 1: Blocks League Administrator from accessing franchise playbook", async () => {
    // League Admin signed in
    mockAuth.isLeagueAdmin = true;
    mockAuth.isTeamAdmin = vi.fn(() => false);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("League Admin Access Restricted")).toBeInTheDocument();
      expect(screen.getByText("Confidentiality Policy Protected")).toBeInTheDocument();
      expect(
        screen.getByText(/To safeguard competitive integrity and prevent tactical advantages/i)
      ).toBeInTheDocument();
    });
  });

  it("STRICT RBAC RULE 2: Blocks opponent coach from viewing rival team's tactical schemes", async () => {
    // Coach of rival team (e.g. team_cyber) visiting team_apex
    mockAuth.isLeagueAdmin = false;
    mockAuth.isPlayer = false;
    mockAuth.managedTeamId = "team_cyber";
    mockAuth.isTeamAdmin = vi.fn((tid?: string) => {
      if (!tid) return true; // is general team admin
      return tid === "team_cyber"; // but only for team_cyber, not team_apex
    });

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("Coach Access Restricted")).toBeInTheDocument();
      expect(screen.getByText("Opponent Playbook Confidential")).toBeInTheDocument();
      expect(
        screen.getByText(/As an authorized Team Coach or Manager, you only have editing and management access to your own franchise's playbook/i)
      ).toBeInTheDocument();
    });
  });

  it("STRICT RBAC RULE 3: Blocks opponent player from viewing rival team's playbook", async () => {
    // Player on team_cyber visiting team_apex
    mockAuth.isLeagueAdmin = false;
    mockAuth.isPlayer = true;
    mockAuth.playerTeamId = "team_cyber";
    mockAuth.isTeamAdmin = vi.fn(() => false);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("Tactical Playbook Confidential")).toBeInTheDocument();
      expect(screen.getByText("Opponent Playbook Protected")).toBeInTheDocument();
      expect(
        screen.getByText(/As a rostered player, you only have view access to the playbooks of your own team/i)
      ).toBeInTheDocument();
    });
  });

  it("STRICT RBAC RULE 4: Unauthenticated spectator receives login prompt", async () => {
    mockAuth.isLeagueAdmin = false;
    mockAuth.isPlayer = false;
    mockAuth.playerTeamId = null;
    mockAuth.isTeamAdmin = vi.fn(() => false);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("Sign In as Player / Coach")).toBeInTheDocument();
      expect(screen.getByText(/Playbooks and strategic formations are private assets restricted to rostered players/i)).toBeInTheDocument();
    });
  });

  it("STRICT RBAC RULE 5: Rostered player on the team has VIEW-ONLY access (no editing controls)", async () => {
    // Player on team_apex viewing team_apex
    mockAuth.isLeagueAdmin = false;
    mockAuth.isPlayer = true;
    mockAuth.playerTeamId = "team_apex";
    mockAuth.isTeamAdmin = vi.fn(() => false);

    await renderPage();

    await waitFor(() => {
      // Player sees their team's playbook title and "Player View Only" badge
      expect(screen.getAllByText(/Apex Predators/i).length).toBeGreaterThan(0);
      expect(screen.getByText("Player View Only")).toBeInTheDocument();
      // Should NOT have edit buttons
      expect(screen.queryByRole("button", { name: /Create a Playbook/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /Save to Cloud/i })).toBeNull();
    });
  });

  it("STRICT RBAC RULE 6: Authorized team coach has full EDIT access (create playbook, save)", async () => {
    // Coach of team_apex viewing team_apex
    mockAuth.isLeagueAdmin = false;
    mockAuth.isPlayer = false;
    mockAuth.managedTeamId = "team_apex";
    mockAuth.isTeamAdmin = vi.fn((tid?: string) => !tid || tid === "team_apex");

    await renderPage();

    await waitFor(() => {
      expect(screen.getAllByText(/Apex Predators/i).length).toBeGreaterThan(0);
      // Coach should see "Create a Playbook" and "Save to Cloud" buttons
      expect(screen.getByRole("button", { name: /Create a Playbook/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Save to Cloud/i })).toBeInTheDocument();
    });
  });

  it("renders embedded layout directly when ?embed=true is set", async () => {
    delete (window as any).location;
    window.location = new URL("http://localhost:3000/teams/team_apex/playbook?embed=true") as any;

    await renderPage();

    await waitFor(() => {
      // In embedded mode, the compact studio header appears
      expect(screen.getAllByText(/Playbook Studio/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/SCRIMMAGE \(LOS\)/i)).toBeInTheDocument();
    });
  });
});
