import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent, within } from "@testing-library/react";
import TeamPlaybookPage from "@/app/teams/[id]/playbook/page";
import { createDefaultPlaybooks } from "@/lib/playbookTypes";

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
    logoUrl: "/flagos-emblem.png",
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

  const openFormationCards = async (empty = false, type: "offense" | "defense" = "offense") => {
    const book = createDefaultPlaybooks("team_apex").find((item) => item.type === type)!;
    const formation = book.formations[0];
    if (empty) book.plays = book.plays.filter((play) => play.formation !== formation.name);
    localStorage.setItem("flagos_playbooks_team_apex", JSON.stringify([book]));
    await renderPage();
    fireEvent.click(screen.getByRole("heading", { name: book.title }));
    fireEvent.click(screen.getByRole("heading", { name: formation.name }));
    return { book, formation, plays: book.plays.filter((play) => play.formation === formation.name) };
  };

  it.each(["offense", "defense"] as const)("shows each %s play as a card with its own route preview, filtered to the selected formation", async (type) => {
    const { book, plays } = await openFormationCards(false, type);

    expect(screen.getAllByRole("button", { name: /^Open play / })).toHaveLength(plays.length);
    expect(screen.getAllByRole("img", { name: /^Preview of / })).toHaveLength(plays.length);
    for (const play of plays) {
      const card = screen.getByRole("button", { name: `Open play ${play.name}` });
      const preview = within(card).getByRole("img", { name: `Preview of ${play.name}` });
      expect(preview.querySelector("svg")).toBeInTheDocument();
      expect(preview.querySelector("path[marker-end]")).toBeInTheDocument();
    }
    for (const play of book.plays.filter((play) => !plays.includes(play))) {
      expect(screen.queryByRole("button", { name: `Open play ${play.name}` })).not.toBeInTheDocument();
    }
    expect(screen.queryByText("Coach Q&A")).not.toBeInTheDocument();
  });

  it("opens the selected play from its card and returns to the play grid without tabs", async () => {
    const { plays } = await openFormationCards();
    const play = plays[plays.length - 1];
    fireEvent.click(screen.getByRole("button", { name: `Open play ${play.name}` }));

    expect(await screen.findByDisplayValue(play.name)).toBeInTheDocument();
    expect(screen.getByText("Coach Q&A")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save playbook" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print playbook" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Formation" })).toBeInTheDocument();
    expect(screen.queryByText("Tactical Confidentiality Guard Active")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Open play / })).not.toBeInTheDocument();
    const otherPlay = plays.find((item) => item.id !== play.id);
    if (otherPlay) {
      expect(screen.queryByText(otherPlay.name.replace(/^\d+v\d+\s+/, ""))).not.toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: "Back to plays" }));
    expect(screen.getAllByRole("button", { name: /^Open play / })).toHaveLength(plays.length);
    fireEvent.click(screen.getByRole("button", { name: `Open play ${play.name}` }));
    fireEvent.change(await screen.findByDisplayValue(play.name), { target: { value: "Updated card play" } });
    fireEvent.click(screen.getByRole("button", { name: "Back to plays" }));
    expect(screen.getByRole("button", { name: "Open play Updated card play" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Preview of Updated card play" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to formations" }));
    expect(screen.getByRole("heading", { name: "Spread 2x1" })).toBeInTheDocument();
  });

  it("duplicates and deletes plays from their cards without opening the editor", async () => {
    const { plays } = await openFormationCards();
    const play = plays[0];
    fireEvent.click(screen.getByRole("button", { name: `Duplicate ${play.name}` }));
    expect(screen.getByRole("button", { name: `Open play ${play.name} (Copy)` })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /^Preview of / })).toHaveLength(plays.length + 1);

    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: `Delete ${play.name} (Copy)` }));
    expect(screen.queryByRole("button", { name: `Open play ${play.name} (Copy)` })).not.toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /^Preview of / })).toHaveLength(plays.length);
    const cached = JSON.parse(localStorage.getItem("flagos_playbooks_team_apex")!);
    expect(cached[0].plays.some((item: { name: string }) => item.name.endsWith("(Copy)"))).toBe(false);
    confirm.mockRestore();
  });

  it("shows an empty formation without another formation's play and creates a new play in the editor", async () => {
    await openFormationCards(true);
    expect(screen.getByText("No Plays in this Formation")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /^Preview of / })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "New Play" }));
    expect(await screen.findByText("Coach Q&A")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to plays" }));
    expect(screen.getAllByRole("button", { name: /^Open play / })).toHaveLength(1);
  });

  it("allows rostered players to open previews but not create, duplicate, or delete plays", async () => {
    mockAuth.isPlayer = true;
    mockAuth.playerTeamId = "team_apex";
    mockAuth.isTeamAdmin = vi.fn(() => false);
    const { plays } = await openFormationCards();

    expect(screen.queryByRole("button", { name: "New Play" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Duplicate / })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Delete / })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: `Open play ${plays[0].name}` }));
    expect(await screen.findByText("Coach Q&A")).toBeInTheDocument();
    expect(screen.getByText(/Player View Only:/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Duplicate Play" })).not.toBeInTheDocument();
  });

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

  it("STRICT RBAC RULE 7: York Lions rostered player has strictly VIEW-ONLY access (cannot edit plays or create playbooks)", async () => {
    mockAuth.isLeagueAdmin = false;
    mockAuth.isPlayer = true;
    mockAuth.playerTeamId = "york_lions";
    mockAuth.isTeamAdmin = vi.fn(() => false);
    mockAuth.canManageTeam = vi.fn(() => false);

    delete (window as any).location;
    window.location = new URL("http://localhost:3000/teams/york_lions/playbook") as any;

    await renderPage("york_lions");

    await waitFor(() => {
      expect(screen.getAllByText(/York Lions/i).length).toBeGreaterThan(0);
      expect(screen.getByText("Player View Only")).toBeInTheDocument();
      // Player should NOT have edit controls even on York
      expect(screen.queryByRole("button", { name: /Create a Playbook/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /Save to Cloud/i })).toBeNull();
    });
  });

  it("PLAYER INTERACTION: Rostered player in Playmaker view sees Coach Q&A button", async () => {
    mockAuth.isLeagueAdmin = false;
    mockAuth.isPlayer = true;
    mockAuth.playerTeamId = "team_apex";
    mockAuth.isTeamAdmin = vi.fn(() => false);

    delete (window as any).location;
    window.location = new URL("http://localhost:3000/teams/team_apex/playbook?level=plays") as any;

    await renderPage("team_apex");

    await waitFor(() => {
      // Player sees Coach Q&A button
      expect(screen.getByText(/Coach Q&A/i)).toBeInTheDocument();
      // Player sees view-only notice
      expect(screen.getByText(/Player View Only:/i)).toBeInTheDocument();
      // Player does not see edit/save controls
      expect(screen.queryByRole("button", { name: /^Save$/i })).toBeNull();
    });
  });
});
