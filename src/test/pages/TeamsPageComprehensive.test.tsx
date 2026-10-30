import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import TeamsPage from "@/app/teams/page";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/teams",
}));

vi.mock("@/lib/pageGuide", () => ({ usePageGuide: vi.fn() }));

const mockTeams = [
  { id: "team_apex", name: "Apex Predators", shortcode: "APX", primaryColor: "#3ca505", secondaryColor: "#111827", leagueId: "league_1" },
  { id: "team_cyber", name: "Cyber Knights", shortcode: "CYB", primaryColor: "#3b82f6", secondaryColor: "#1e293b", leagueId: "league_1" },
];

const mockPlayers = [
  { id: "p1", playerName: "Marcus Vance", teamId: "team_apex", position: "QB", number: "7" },
  { id: "p2", playerName: "Leo Sterling", teamId: "team_apex", position: "WR", number: "11" },
  { id: "fa1", playerName: "Alex Rivera", teamId: "free_agent", position: "DB", experience: "Pro", emails: ["alex@example.com"] },
  { id: "fa2", playerName: "Jordan Bell", teamId: "free_agent", position: "WR", experience: "College", emails: ["jordan@example.com"] },
];

const mockMatches = [
  {
    id: "match_1",
    status: "completed",
    homeTeamId: "team_apex",
    awayTeamId: "team_cyber",
    homeScore: 24,
    awayScore: 12,
    date: "2026-10-01",
  },
  {
    id: "match_2",
    status: "scheduled",
    homeTeamId: "team_apex",
    awayTeamId: "team_cyber",
    date: "2026-11-15",
  },
];

const mockGetCachedLeagueTeams = vi.fn(async () => mockTeams);
const mockGetCachedLeaguePlayers = vi.fn(async () => mockPlayers);
const mockGetCachedLeagueMatches = vi.fn(async () => mockMatches);
const mockGetCachedLeaguePlays = vi.fn(async () => []);
const mockNotifyDataChanged = vi.fn();

vi.mock("@/lib/leagueDataCache", () => ({
  getCachedLeagueTeams: (...args: any[]) => (mockGetCachedLeagueTeams as any)(...args),
  getCachedLeaguePlayers: (...args: any[]) => (mockGetCachedLeaguePlayers as any)(...args),
  getCachedLeagueMatches: (...args: any[]) => (mockGetCachedLeagueMatches as any)(...args),
  getCachedLeaguePlays: (...args: any[]) => (mockGetCachedLeaguePlays as any)(...args),
  notifyDataChanged: (...args: any[]) => (mockNotifyDataChanged as any)(...args),
}));

const mockCreateSecureRecord = vi.fn().mockResolvedValue("team_new");
vi.mock("@/lib/secureWrites", () => ({
  createSecureRecord: (...args: any[]) => mockCreateSecureRecord(...args),
}));

const mockAuth = {
  isAdmin: true,
  isLeagueAdmin: true,
  isPlatformAdmin: false,
  isTeamAdmin: vi.fn((tid?: string) => tid === "team_apex"),
  playerTeamId: "team_apex",
  userProfile: { uid: "u_admin", managedTeamIds: ["team_apex"] },
  canManageTeam: vi.fn(() => true),
  canRegisterAsPlayer: true,
};

vi.mock("@/lib/authContext", () => ({
  useAuth: () => mockAuth,
}));

const mockOpenCustomizer = vi.fn();
const mockSubscription: { status: string; plan: string; teamCount: number; paymentMethod?: string } = { status: "active", plan: "league", teamCount: 8 };
const mockAddTeamToSubscription = vi.fn().mockResolvedValue({ teamId: "team_new", newSubscription: { status: "active", teamCount: 8 }, seatAdded: false });
const mockRemoveTeamFromSubscription = vi.fn().mockResolvedValue({});

vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({
    settings: {
      leagueName: "Apex League Circuit",
      rules: {
        playersOnField: 5,
        minRosterSize: 5,
        maxRosterSize: 12,
        enableFreeAgents: true,
      },
    },
    isDemoLeague: false,
    activeLeagueId: "league_1",
    portalLeagueId: "league_1",
    userLeagues: [{ id: "league_1", name: "Apex League Circuit", shortcode: "APX", role: "owner" }],
    subscription: mockSubscription,
    updateSubscriptionTeamCount: vi.fn(),
    addTeamToSubscription: mockAddTeamToSubscription,
    removeTeamFromSubscription: mockRemoveTeamFromSubscription,
    openCustomizer: mockOpenCustomizer,
  }),
}));

vi.mock("@/lib/usePrivateLeagueAccess", () => ({
  usePrivateLeagueAccess: () => ({ isDenied: false, deniedElement: null }),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn(async () => ({ docs: [] })),
  updateDoc: vi.fn(),
  doc: vi.fn(),
  query: vi.fn((q) => q),
  where: vi.fn(),
  limit: vi.fn(),
}));

describe("TeamsPage Comprehensive Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).location;
    window.location = new URL("http://localhost:3000/teams?league=league_1") as any;
  });

  const renderPage = async () => {
    await act(async () => {
      render(<TeamsPage />);
    });
  };

  it("renders league teams with calculated win-loss records and roster count badges", async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("Apex Predators")).toBeInTheDocument();
      expect(screen.getByText("Cyber Knights")).toBeInTheDocument();
    });

    // Record for Apex Predators (won match_1)
    expect(screen.getByText("1-0-0")).toBeInTheDocument();
    // My Team badge on Apex Predators
    expect(screen.getByText("My Team")).toBeInTheDocument();
  });

  it("renders Free Agent draft pool and filters athletes by search query", async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Free Agent Player Pool/i)).toBeInTheDocument();
      expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
      expect(screen.getByText("Jordan Bell")).toBeInTheDocument();
    });

    // Filter by search
    const searchInput = screen.getByPlaceholderText(/Search free agents by name, position/i);
    fireEvent.change(searchInput, { target: { value: "Alex" } });

    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    expect(screen.queryByText("Jordan Bell")).not.toBeInTheDocument();
  });

  it("allows league admin to draft a free agent to a team", async () => {
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    });

    // Select team for Alex Rivera in dropdown
    const teamSelect = screen.getByLabelText(/Team for Alex Rivera/i);
    fireEvent.change(teamSelect, { target: { value: "team_apex" } });

    // Click Assign button on Alex Rivera's row
    const assignButtons = screen.getAllByRole("button", { name: "Assign" });
    fireEvent.click(assignButtons[0]);

    await waitFor(() => {
      expect(mockCreateSecureRecord).toHaveBeenCalledWith(
        "assign_player",
        expect.objectContaining({
          playerId: "fa1",
          teamId: "team_apex",
        })
      );
    });
  });

  it("allows adding a new team using the header inline team creator", async () => {
    await renderPage();

    // Click Create Team button to open inline input
    const createTeamBtn = await screen.findByRole("button", { name: /Create Team/i });
    fireEvent.click(createTeamBtn);

    await waitFor(() => {
      expect(screen.getByLabelText("New team name")).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText("New team name");
    fireEvent.change(nameInput, { target: { value: "Shadow Wolves" } });

    const addTeamBtn = screen.getByLabelText("Add team");
    fireEvent.click(addTeamBtn);

    // Two of eight slots are used, so the context fills an open slot instead of buying a seat.
    await waitFor(() => {
      expect(mockAddTeamToSubscription).toHaveBeenCalledWith("Shadow Wolves", { teamsInUse: 2 });
    });
    expect(screen.getByText("Shadow Wolves")).toBeInTheDocument();
  });

  it("warns the league admin about the seat cost before adding a team when every slot is used", async () => {
    mockSubscription.teamCount = 2;
    mockSubscription.paymentMethod = "paid";
    try {
      await renderPage();
      await screen.findByRole("button", { name: /Create Team \(\+\$20\/mo\)/i });
      expect(screen.getByText(/All 2 slots are in use\. Adding a team adds a seat: a prorated charge is billed now, then \$100\/mo/i)).toBeInTheDocument();
    } finally {
      mockSubscription.teamCount = 8;
      delete mockSubscription.paymentMethod;
    }
  });

  it("navigates into team detailed view, adds a player to roster, and swaps a player", async () => {
    await renderPage();

    // Click on Apex Predators team card to open detailed view
    const teamCard = await screen.findByRole("heading", { name: "Apex Predators" });
    fireEvent.click(teamCard);

    // Should display Roster section
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Roster/i })).toBeInTheDocument();
      expect(screen.getByText("Marcus Vance")).toBeInTheDocument();
      expect(screen.getByText("Team Stats")).toBeInTheDocument();
      expect(screen.getByText("Top Performers")).toBeInTheDocument();
    });

    // Add a player to the roster
    const rosterHeading = screen.getByRole("heading", { name: /Roster/i });
    const rosterHeaderContainer = rosterHeading.closest("div")?.parentElement;
    const plusBtn = rosterHeaderContainer?.querySelector("button");
    expect(plusBtn).toBeTruthy();
    if (plusBtn) fireEvent.click(plusBtn);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("New Player Name...")).toBeInTheDocument();
    });

    const playerNameInput = screen.getByPlaceholderText("New Player Name...");
    fireEvent.change(playerNameInput, { target: { value: "Marcus Ray" } });

    // Select WR position chip
    const wrButton = screen.getByRole("button", { name: "WR" });
    fireEvent.click(wrButton);

    const savePlayerBtn = screen.getByRole("button", { name: "Save Player" });
    fireEvent.click(savePlayerBtn);

    await waitFor(() => {
      expect(mockCreateSecureRecord).toHaveBeenCalledWith(
        "player",
        expect.objectContaining({
          playerName: "Marcus Ray",
          teamId: "team_apex",
          position: "ATH",
        })
      );
    });

    // Test swapping player to another team (first player in sorted order is Leo Sterling)
    const swapBtn = screen.getAllByRole("button", { name: /Swap/i })[0];
    fireEvent.click(swapBtn);

    await waitFor(() => {
      expect(screen.getByLabelText(/Move Leo Sterling to team/i)).toBeInTheDocument();
    });

    const moveSelect = screen.getByLabelText(/Move Leo Sterling to team/i);
    fireEvent.change(moveSelect, { target: { value: "team_cyber" } });

    // Click confirm check button
    const confirmMoveBtn = moveSelect.parentElement?.querySelector("button:first-of-type");
    if (confirmMoveBtn) fireEvent.click(confirmMoveBtn);

    await waitFor(() => {
      expect(mockCreateSecureRecord).toHaveBeenCalledWith(
        "assign_player",
        expect.objectContaining({
          playerId: "p2",
          teamId: "team_cyber",
        })
      );
    });

    // Test editing team name
    const editNameBtn = screen.getByRole("button", { name: /Edit Name/i });
    fireEvent.click(editNameBtn);

    await waitFor(() => {
      expect(screen.getByLabelText("Team name")).toBeInTheDocument();
    });

    const teamNameInput = screen.getByLabelText("Team name");
    fireEvent.change(teamNameInput, { target: { value: "Apex Legends" } });

    const saveTeamNameBtn = screen.getByLabelText("Save team name");
    fireEvent.click(saveTeamNameBtn);

    // Test player stats modal when clicking on player name
    const playerRow = screen.getByText("Marcus Vance");
    fireEvent.click(playerRow);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Close modal by clicking backdrop
    const backdrop = screen.getByRole("dialog").querySelector(".bg-black\\/80");
    if (backdrop) fireEvent.click(backdrop);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Test deleting team
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const deleteTeamBtn = screen.getByRole("button", { name: /Delete Team/i });
    fireEvent.click(deleteTeamBtn);

    await waitFor(() => {
      expect(mockRemoveTeamFromSubscription).toHaveBeenCalledWith("team_apex");
    });
  });

  it("allows league admin to delete a free agent", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle("Delete Free Agent");
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockCreateSecureRecord).toHaveBeenCalledWith(
        "delete_player",
        expect.objectContaining({
          playerId: "fa1",
        })
      );
    });
  });
});

