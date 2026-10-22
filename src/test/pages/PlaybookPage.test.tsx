import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent, within } from "@testing-library/react";
import TeamPlaybookPage from "@/app/teams/[id]/playbook/page";
import { createDefaultPlaybooks } from "@/lib/playbookTypes";
import { getDoc } from "firebase/firestore";

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
  loading: false,
};

const mockSecureWrite = vi.hoisted(() => vi.fn().mockResolvedValue("ok"));
vi.mock("@/lib/secureWrites", () => ({ createSecureRecord: mockSecureWrite }));

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
    mockAuth.loading = false;
    localStorage.clear();

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

  const openFormationCards = async (empty = false, type: "offense" | "defense" = "offense", withEmptyCategory = false) => {
    const book = createDefaultPlaybooks("team_apex").find((item) => item.type === type)!;
    const formation = book.formations[0];
    if (withEmptyCategory) book.formations.push({ id: "empty-category", name: "Empty Category", side: type });
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

  it("paints cached playbooks before Firestore responds, then swaps in the cloud copy without auto-saving it", async () => {
    const [cachedBook] = createDefaultPlaybooks("team_apex");
    cachedBook.title = "Cached Offense";
    localStorage.setItem("flagos_playbooks_team_apex", JSON.stringify([cachedBook]));
    const cloudBook = { ...cachedBook, title: "Cloud Offense" };
    let finishPlaybook!: (value: unknown) => void;
    vi.mocked(getDoc)
      .mockResolvedValueOnce({ exists: () => true, id: "team_apex", data: () => ({ name: "Apex Predators", shortcode: "APX" }) } as any)
      .mockReturnValueOnce(new Promise((resolve) => { finishPlaybook = resolve; }) as any);

    await renderPage();
    expect(vi.mocked(getDoc)).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("heading", { name: "Cached Offense" })).toBeInTheDocument();

    await act(async () => {
      finishPlaybook({ exists: () => true, data: () => ({ playbooks: [cloudBook] }) });
    });
    expect(await screen.findByRole("heading", { name: "Cloud Offense" })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 2700));
    expect(mockSecureWrite).not.toHaveBeenCalled();
  });

  it("shows a loading spinner instead of an access-denied screen while auth is still resolving", async () => {
    mockAuth.loading = true;
    mockAuth.isTeamAdmin = vi.fn(() => false);
    mockAuth.managedTeamId = null;
    await renderPage();
    expect(screen.getByRole("status", { name: "Loading playbook" })).toBeInTheDocument();
    expect(screen.queryByText(/Playbook Confidential/i)).not.toBeInTheDocument();
    expect(vi.mocked(getDoc)).not.toHaveBeenCalled();
  });

  it("opens the selected play from its card and returns to the play grid without tabs", async () => {
    const { plays } = await openFormationCards();
    const play = plays[plays.length - 1];
    fireEvent.click(screen.getByRole("button", { name: `Open play ${play.name}` }));

    expect(await screen.findByDisplayValue(play.name)).toBeInTheDocument();
    expect(screen.getByText("Coach Q&A")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save playbook" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print playbook" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Play category" })).toBeInTheDocument();
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

  it.each(["offense", "defense"] as const)("moves every %s play out of a category without deleting it or changing diagrams", async (type) => {
    const { book, formation, plays } = await openFormationCards(false, type, true);
    for (const play of plays) {
      fireEvent.change(screen.getByRole("combobox", { name: `Category for ${play.name}` }), {
        target: { value: "Empty Category" },
      });
    }
    expect(screen.getByText("No Plays in this Formation")).toBeInTheDocument();
    const cached = JSON.parse(localStorage.getItem("flagos_playbooks_team_apex")!);
    expect(cached[0].formations.some((item: { name: string }) => item.name === formation.name)).toBe(true);
    expect(cached[0].plays.filter((item: { formation: string }) => item.formation === formation.name)).toHaveLength(0);
    for (const play of plays) {
      const moved = cached[0].plays.find((item: { id: string }) => item.id === play.id);
      expect(moved).toEqual({ ...book.plays.find((item) => item.id === play.id), formation: "Empty Category" });
    }
    fireEvent.click(screen.getByRole("button", { name: "Back to formations" }));
    expect(screen.getByRole("heading", { name: formation.name })).toBeInTheDocument();
  });

  it("creates a category with zero plays and no automatic starter play", async () => {
    const { book } = await openFormationCards();
    fireEvent.click(screen.getByRole("button", { name: "Back to formations" }));
    fireEvent.click(screen.getByRole("button", { name: /Add Formation/i }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Spread 2x1, Trips Right, Pistol Bunch..."), {
      target: { value: "Empty Install" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Formation Alignment" }));
    expect(screen.getByRole("heading", { name: "Empty Install" })).toBeInTheDocument();
    const cached = JSON.parse(localStorage.getItem("flagos_playbooks_team_apex")!);
    expect(cached[0].plays).toHaveLength(book.plays.length);
    expect(cached[0].formations.some((item: { name: string }) => item.name === "Empty Install")).toBe(true);
    fireEvent.click(screen.getByRole("heading", { name: "Empty Install" }));
    expect(screen.getByText("No Plays in this Formation")).toBeInTheDocument();
  });

  it("moves a play in the editor without applying an alignment and persists a newly named category", async () => {
    const { book, formation, plays } = await openFormationCards(false, "offense", true);
    fireEvent.click(screen.getByRole("button", { name: `Open play ${plays[0].name}` }));
    fireEvent.change(screen.getByRole("combobox", { name: "Play category" }), { target: { value: "Empty Category" } });
    expect(screen.getByRole("button", { name: "Back to plays" })).toBeInTheDocument();
    let cached = JSON.parse(localStorage.getItem("flagos_playbooks_team_apex")!);
    expect(cached[0].plays.find((item: { id: string }) => item.id === plays[0].id))
      .toEqual({ ...book.plays.find((item) => item.id === plays[0].id), formation: "Empty Category" });
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("Custom Category");
    fireEvent.change(screen.getByRole("combobox", { name: "Play formation" }), { target: { value: "__ADD_NEW__" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Play category" }), { target: { value: formation.name } });
    cached = JSON.parse(localStorage.getItem("flagos_playbooks_team_apex")!);
    expect(cached[0].formations.some((item: { name: string }) => item.name === "Custom Category")).toBe(true);
    expect(cached[0].plays.some((item: { formation: string }) => item.formation === "Custom Category")).toBe(false);
    prompt.mockRestore();
  });

  it("allows rostered players to open previews but not create, duplicate, or delete plays", async () => {
    mockAuth.isPlayer = true;
    mockAuth.playerTeamId = "team_apex";
    mockAuth.isTeamAdmin = vi.fn(() => false);
    const { plays } = await openFormationCards();

    expect(screen.queryByRole("button", { name: "New Play" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Duplicate / })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Delete / })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /^Category for / })).not.toBeInTheDocument();
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

  it("STRICT RBAC RULE 7: independent team rostered player has strictly VIEW-ONLY access (cannot edit plays or create playbooks)", async () => {
    mockAuth.isLeagueAdmin = false;
    mockAuth.isPlayer = true;
    mockAuth.playerTeamId = "falcons";
    mockAuth.isTeamAdmin = vi.fn(() => false);
    mockAuth.canManageTeam = vi.fn(() => false);

    delete (window as any).location;
    window.location = new URL("http://localhost:3000/teams/falcons/playbook") as any;

    vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => true, id: "falcons", data: () => ({ name: "Falcons", subscription: { status: "active" } }) } as any);
    await renderPage("falcons");

    await waitFor(() => {
      expect(screen.getAllByText(/Falcons/i).length).toBeGreaterThan(0);
      expect(screen.getByText("Player View Only")).toBeInTheDocument();
      // Player should NOT have edit controls on an independent team
      expect(screen.queryByRole("button", { name: /Create a Playbook/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /Save to Cloud/i })).toBeNull();
    });

  });

  it("does not put an independent team into demo or embedded mode from visitor flags", async () => {
      mockAuth.isTeamAdmin = vi.fn(() => false);
      mockAuth.canManageTeam = vi.fn(() => false);
      sessionStorage.setItem("flagos_demo_active", "true");
      delete (window as any).location;
      window.location = new URL("http://localhost:3000/teams/falcons/playbook?demo=true&embed=true") as any;
      try {
        await renderPage("falcons");
        expect(await screen.findByText("Sign In as Player / Coach")).toBeInTheDocument();
        expect(screen.queryByRole("textbox", { name: "Play name" })).not.toBeInTheDocument();
      } finally {
        sessionStorage.removeItem("flagos_demo_active");
      }
  });

  it("PLAYER INTERACTION: Rostered player in Playmaker view sees Coach Q&A button", async () => {
    mockAuth.isLeagueAdmin = false;
    mockAuth.isPlayer = true;
    mockAuth.playerTeamId = "team_apex";
    mockAuth.isTeamAdmin = vi.fn(() => false);
    localStorage.setItem("flagos_playbooks_team_apex", JSON.stringify(createDefaultPlaybooks("team_apex")));

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

  it("NEW TEAMS: New teams (independent or in a league) have 0 playbooks autoloaded", async () => {
    // Team with no saved playbooks in Firestore or localStorage
    mockAuth.isTeamAdmin = vi.fn((tid?: string) => tid === "team_apex");
    mockAuth.canManageTeam = vi.fn((tid?: string) => tid === "team_apex");

    await renderPage("team_apex");

    await waitFor(() => {
      expect(screen.getByText("Existing Playbooks (0/5):")).toBeInTheDocument();
      expect(screen.getByText("No Playbooks Created Yet")).toBeInTheDocument();
      expect(screen.getByText(/New teams start with an empty playbook canvas/i)).toBeInTheDocument();
      expect(screen.getByTestId("create-first-playbook-btn")).toBeInTheDocument();
    });
  });

  it("DELETE ALL PLAYBOOKS: Coach can delete all playbooks down to 0", async () => {
    mockAuth.user = { uid: "test-user-1", email: "dexter@yuwffl.ca" };
    const [book] = createDefaultPlaybooks("team_apex");
    localStorage.setItem("flagos_playbooks_team_apex", JSON.stringify([book]));
    mockAuth.isTeamAdmin = vi.fn((tid?: string) => tid === "team_apex");
    mockAuth.canManageTeam = vi.fn((tid?: string) => tid === "team_apex");

    await renderPage("team_apex");

    expect(screen.getByRole("heading", { name: book.title })).toBeInTheDocument();
    const deleteBtn = screen.getByTestId(`delete-playbook-btn-${book.id}`);
    expect(deleteBtn).toBeInTheDocument();

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText("Existing Playbooks (0/5):")).toBeInTheDocument();
      expect(screen.getByText("No Playbooks Created Yet")).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: book.title })).toBeNull();
    });

    const cached = JSON.parse(localStorage.getItem("flagos_playbooks_team_apex")!);
    expect(cached).toEqual([]);
    confirmSpy.mockRestore();
  });

  it("DELETE ALL FORMATIONS: Coach can delete all formations down to 0 in a playbook", async () => {
    const [book] = createDefaultPlaybooks("team_apex");
    // Leave only 1 formation
    const formName = book.formations[0].name;
    book.formations = [book.formations[0]];
    book.plays = book.plays.filter((p) => p.formation === formName);
    localStorage.setItem("flagos_playbooks_team_apex", JSON.stringify([book]));

    mockAuth.isTeamAdmin = vi.fn((tid?: string) => tid === "team_apex");
    mockAuth.canManageTeam = vi.fn((tid?: string) => tid === "team_apex");

    await renderPage("team_apex");

    // Drill into formations
    fireEvent.click(screen.getByRole("heading", { name: book.title }));
    expect(screen.getByRole("heading", { name: formName })).toBeInTheDocument();

    // Verify delete button is present even with only 1 formation
    const deleteFormBtn = screen.getByTestId(`delete-formation-btn-${book.formations[0].id || formName}`);
    expect(deleteFormBtn).toBeInTheDocument();

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(deleteFormBtn);

    await waitFor(() => {
      expect(screen.getByText("No Formations Created Yet")).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: formName })).toBeNull();
    });

    const cached = JSON.parse(localStorage.getItem("flagos_playbooks_team_apex")!);
    expect(cached[0].formations).toHaveLength(0);
    confirmSpy.mockRestore();
  });
});
