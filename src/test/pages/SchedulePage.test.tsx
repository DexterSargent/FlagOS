import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import SchedulePage from "@/app/schedule/page";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

let mockIsDemoLeague = true;
const mockDeleteDoc = vi.fn(async () => undefined);
const mockUpdateDoc = vi.fn(async () => undefined);
const mockDoc = vi.fn((_db, coll, id) => ({ coll, id }));
const mockCreateSecureRecord = vi.fn(async () => ({ id: "secure_match_1" }));
const mockGetLeagueSeasonMatchDocs = vi.fn(async () => [
  { ref: { id: "match_w1_1" } },
]);
const mockSubscribeLeagueSeasonMatches = vi.fn((_leagueId, onNext) => {
  onNext({
    docs: mockMatches.map((m) => ({ id: m.id, data: () => ({ ...m, leagueId: "league_firestore_test" }) })),
  });
  return () => {};
});

vi.mock("firebase/firestore", () => ({
  doc: (...args: any[]) => (mockDoc as any)(...args),
  deleteDoc: (...args: any[]) => (mockDeleteDoc as any)(...args),
  updateDoc: (...args: any[]) => (mockUpdateDoc as any)(...args),
  collection: vi.fn(),
  getDocs: vi.fn(async () => ({
    docs: mockTeams.map((t) => ({ id: t.id, data: () => ({ ...t, leagueId: "league_firestore_test" }) })),
  })),
  onSnapshot: vi.fn(),
  query: vi.fn((q) => q),
  where: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("@/lib/secureWrites", () => ({
  createSecureRecord: (...args: any[]) => (mockCreateSecureRecord as any)(...args),
}));

vi.mock("@/lib/leagueDataCache", () => ({
  getLeagueSeasonMatchDocs: (...args: any[]) => (mockGetLeagueSeasonMatchDocs as any)(...args),
  subscribeLeagueSeasonMatches: (...args: any[]) => (mockSubscribeLeagueSeasonMatches as any)(...args),
  getCachedLeagueTeams: vi.fn(async () => mockTeams.map((t) => ({ ...t, leagueId: "league_firestore_test" }))),
}));

let mockIsLeagueAdmin = true;
let mockIsPlatformAdmin = false;
const mockUpdateSettings = vi.fn(async () => undefined);
const mockSimulateFullGame = vi.fn(async () => ({
  success: true,
  homeScore: 21,
  awayScore: 14,
}));

vi.mock("@/lib/gameSimulator", () => ({
  simulateFullGame: (...args: any[]) => (mockSimulateFullGame as any)(...args),
}));

// Mock League Context
vi.mock("@/lib/leagueContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/leagueContext")>();
  return {
    ...actual,
    useLeague: () => ({
      activeLeagueId: "league_firestore_test",
      settings: {
        leagueName: "FlagOS League",
        shortcode: "FLAG",
        primaryColor: "#3ca505",
        accentColor: "#22c55e",
        defaultLocation: "Turf Field 1",
        announcement: "",
        playoffFormat: {
          teamsCount: 4,
          structure: "single_elimination",
        },
      },
      updateSettings: mockUpdateSettings,
      isDemoLeague: mockIsDemoLeague,
      currentSeasonId: "season-1",
      seasons: [{ id: "season-1", title: "2026 Season", status: "active", number: 1 }],
      viewingSeasonId: "season-1",
      setViewingSeasonId: vi.fn(),
      isViewingArchivedSeason: false,
    }),
  };
});

// Mock Auth
vi.mock("@/lib/authContext", () => ({
  useAuth: () => ({
    isLeagueAdmin: mockIsLeagueAdmin,
    isPlatformAdmin: mockIsPlatformAdmin,
  }),
}));

vi.mock("@/lib/themeContext", () => ({
  useTheme: () => ({
    resolvedTheme: "dark",
    setTheme: vi.fn(),
  }),
}));

// Mock Demo Sandbox
const mockTeams = [
  { id: "team_apex", name: "Apex Predators", shortcode: "APX" },
  { id: "team_cyber", name: "Cyber Knights", shortcode: "CYB" },
  { id: "team_raptors", name: "Raptors", shortcode: "RAP" },
  { id: "team_vipers", name: "Vipers", shortcode: "VIP" },
];

const mockMatches = [
  {
    id: "match_w1_1",
    week: "Week 1",
    homeTeamName: "Apex Predators",
    awayTeamName: "Cyber Knights",
    homeTeamId: "team_apex",
    awayTeamId: "team_cyber",
    date: "2026-09-12",
    time: "10:00 AM",
    location: "Turf Field 1",
    status: "completed",
    homeScore: 24,
    awayScore: 18,
    matchdayIndex: 1,
    isPreseason: false,
    isPlayoff: false,
  },
  {
    id: "match_w2_1",
    week: "Week 2",
    homeTeamName: "Raptors",
    awayTeamName: "Vipers",
    homeTeamId: "team_raptors",
    awayTeamId: "team_vipers",
    date: "2026-09-19",
    time: "11:00 AM",
    location: "Turf Field 2",
    status: "scheduled",
    matchdayIndex: 2,
    isPreseason: false,
    isPlayoff: false,
  },
];

const mockAddSandboxMatch = vi.fn();
const mockUpdateSandboxMatch = vi.fn();
const mockClearSandboxMatches = vi.fn();
const mockDeleteSandboxMatch = vi.fn();
const mockDeleteSandboxPlaysForMatch = vi.fn();
const mockGetSandboxScheduleBackup = vi.fn(() => null);
const mockRestoreSandboxScheduleBackup = vi.fn();

vi.mock("@/lib/demoSandbox", () => ({
  getSandboxTeams: () => mockTeams,
  getSandboxMatches: () => mockMatches,
  addSandboxMatch: (...args: any[]) => mockAddSandboxMatch(...args),
  updateSandboxMatch: (...args: any[]) => mockUpdateSandboxMatch(...args),
  deleteSandboxMatch: (...args: any[]) => mockDeleteSandboxMatch(...args),
  deleteSandboxPlaysForMatch: (...args: any[]) => mockDeleteSandboxPlaysForMatch(...args),
  setSandboxMatches: vi.fn(),
  clearSandboxMatches: (...args: any[]) => mockClearSandboxMatches(...args),
  subscribeDemoSandbox: () => () => {},
  saveSandboxScheduleBackup: vi.fn(),
  getSandboxScheduleBackup: () => mockGetSandboxScheduleBackup(),
  restoreSandboxScheduleBackup: () => mockRestoreSandboxScheduleBackup(),
  clearSandboxScheduleBackup: vi.fn(),
}));

describe("Schedule Operations & Playoff Generator Suite (SchedulePage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLeagueAdmin = true;
    mockIsDemoLeague = true;
    mockGetSandboxScheduleBackup.mockReturnValue(null);
    delete (window as any).location;
    window.location = new URL("http://localhost:3000/schedule?week=Week+1") as any;
    window.confirm = vi.fn(() => true);
  });

  const renderSchedule = async () => {
    let result: any;
    await act(async () => {
      result = render(<SchedulePage />);
    });
    return result;
  };

  it("renders schedule dashboard with match cards, scores, and field assignments", async () => {
    await renderSchedule();

    await waitFor(() => {
      expect(screen.getByText("Regular Season")).toBeInTheDocument();
    });

    const allWeeksBtn = await screen.findByRole("button", { name: /All Weeks/i });
    fireEvent.click(allWeeksBtn);

    await waitFor(() => {
      // Teams in matches
      expect(screen.getAllByText("Apex Predators").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Cyber Knights").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Raptors").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Vipers").length).toBeGreaterThan(0);
      // Completed score 24 - 18
      expect(screen.getByText("24")).toBeInTheDocument();
      expect(screen.getByText("18")).toBeInTheDocument();
    });
  });

  it("filters displayed matches by week using selector pills", async () => {
    await renderSchedule();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Week 1" })).toBeInTheDocument();
    });

    // Both Week 1 and Week 2 pills exist
    const week1Btn = screen.getByRole("button", { name: "Week 1" });
    const week2Btn = screen.getByRole("button", { name: "Week 2" });
    expect(week1Btn).toBeInTheDocument();
    expect(week2Btn).toBeInTheDocument();

    // Click Week 1 filter
    fireEvent.click(week1Btn);
    expect(screen.getAllByText("Apex Predators").length).toBeGreaterThan(0);
    // Raptors (from Week 2) should be filtered out
    expect(screen.queryByText("Raptors")).toBeNull();

    // Click Week 2 filter
    fireEvent.click(week2Btn);
    expect(screen.getAllByText("Raptors").length).toBeGreaterThan(0);
    expect(screen.queryByText("Apex Predators")).toBeNull();
  });

  it("switches to Playoff Picture tab to preview tournament bracket structure", async () => {
    await renderSchedule();

    const playoffTabBtn = await screen.findByRole("button", { name: /Playoff Picture/i });
    fireEvent.click(playoffTabBtn);

    await waitFor(() => {
      // Bracket view is rendered
      expect(screen.getByText(/Tournament Bracket/i)).toBeInTheDocument();
    });
  });

  it("opens automated schedule builder modal when clicking Build Schedule", async () => {
    await renderSchedule();

    const autoGenBtn = await screen.findByRole("button", { name: /Build Schedule/i });
    fireEvent.click(autoGenBtn);

    await waitFor(() => {
      // Modal is visible
      expect(screen.getByRole("heading", { name: /^Build Schedule$/i })).toBeInTheDocument();
      expect(screen.getByText(/Schedule Setup/i)).toHaveTextContent("FlagOS Schedule Setup");
      expect(screen.getByText("FlagOS")).toHaveClass("normal-case");
    });
  });

  it("restricts all scheduling controls when user is not a league admin", async () => {
    mockIsLeagueAdmin = false;
    await renderSchedule();

    await waitFor(() => {
      expect(screen.getByText("Regular Season")).toBeInTheDocument();
    });

    // None of the admin schedule actions should exist
    expect(screen.queryByRole("button", { name: /Build Schedule/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Schedule Game/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Playoff Format/i })).toBeNull();
    expect(screen.queryByTitle("Clear Schedule (Admin Reset)")).toBeNull();
    expect(screen.queryByTitle("Edit Event")).toBeNull();
    expect(screen.queryByTitle("Delete Event")).toBeNull();
  });

  it("renders Build Schedule and enables modal when embedded in the interactive demo frame (?embed=true)", async () => {
    mockIsLeagueAdmin = false;
    window.location = new URL("http://localhost:3000/schedule?embed=true&demo=true") as any;
    await renderSchedule();

    const autoGenBtn = await screen.findByRole("button", { name: /Build Schedule/i });
    expect(autoGenBtn).toBeInTheDocument();

    fireEvent.click(autoGenBtn);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /^Build Schedule$/i })).toBeInTheDocument();
      expect(screen.getByText(/Schedule Setup/i)).toHaveTextContent("FlagOS Schedule Setup");
      expect(screen.getByText("FlagOS")).toHaveClass("normal-case");
    });
  });

  it("allows league admin to delete an event", async () => {
    mockIsLeagueAdmin = true;
    await renderSchedule();

    const allWeeksBtn = await screen.findByRole("button", { name: /All Weeks/i });
    fireEvent.click(allWeeksBtn);

    const deleteBtns = await screen.findAllByTitle("Delete Event");
    expect(deleteBtns.length).toBeGreaterThan(0);

    fireEvent.click(deleteBtns[0]);
    fireEvent.click(await screen.findByRole("button", { name: /^Delete Game$/i }));
    expect(mockDeleteSandboxMatch).toHaveBeenCalledWith("match_w1_1");
  });

  it("renders light-mode compatible restore schedule banner and triggers restore when clicked", async () => {
    mockIsLeagueAdmin = true;
    (mockGetSandboxScheduleBackup as any).mockReturnValue({
      timestamp: Date.now(),
      matches: mockMatches,
    });

    await renderSchedule();

    await waitFor(() => {
      expect(screen.getByText(/Previous Schedule Archived/i)).toBeInTheDocument();
    });

    const restoreBtn = screen.getByRole("button", { name: /Restore Schedule/i });
    expect(restoreBtn).toBeInTheDocument();
    // Check that light/dark styles are applied
    expect(restoreBtn.className).toContain("text-slate-950");
    expect(restoreBtn.className).toContain("bg-amber-500");

    fireEvent.click(restoreBtn);
    expect(mockRestoreSandboxScheduleBackup).toHaveBeenCalledTimes(1);
  });

  it("refuses to restore an untagged backup into a real league", async () => {
    mockIsLeagueAdmin = true;
    mockIsDemoLeague = false;
    (mockGetSandboxScheduleBackup as any).mockReturnValue({
      timestamp: Date.now(),
      matches: mockMatches,
    });

    await renderSchedule();

    fireEvent.click(await screen.findByRole("button", { name: /Restore Schedule/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That backup belongs to a different league and cannot be restored here.",
    );
    expect(mockDeleteDoc).not.toHaveBeenCalled();
    expect(mockCreateSecureRecord).not.toHaveBeenCalled();
  });

  it("opens Schedule Game modal, enters details, and creates a new game", async () => {
    mockIsLeagueAdmin = true;
    const { container } = await renderSchedule();

    const scheduleGameBtn = await screen.findByRole("button", { name: /Schedule Game/i });
    fireEvent.click(scheduleGameBtn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Schedule Game/i })).toBeInTheDocument();
    });

    const homeSelect = container.querySelector("#schedule-home-team-select")!;
    const awaySelect = container.querySelector("#schedule-away-team-select")!;
    fireEvent.change(homeSelect, { target: { value: "team_apex" } });
    fireEvent.change(awaySelect, { target: { value: "team_cyber" } });

    const submitBtn = container.querySelector("button[type='submit']")!;
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockAddSandboxMatch).toHaveBeenCalled();
    });
  });

  it("opens Edit Game modal on existing match and saves changes", async () => {
    mockIsLeagueAdmin = true;
    const { container } = await renderSchedule();

    const allWeeksBtn = await screen.findByRole("button", { name: /All Weeks/i });
    fireEvent.click(allWeeksBtn);

    const editBtns = await screen.findAllByTitle("Edit Event");
    expect(editBtns.length).toBeGreaterThan(0);
    fireEvent.click(editBtns[0]);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Edit Game/i })).toBeInTheDocument();
    });

    const locationInput = container.querySelector("#schedule-location-input")!;
    fireEvent.change(locationInput, { target: { value: "Championship Field" } });

    const saveChangesBtn = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveChangesBtn);

    await waitFor(() => {
      expect(mockUpdateSandboxMatch).toHaveBeenCalled();
    });
  });

  it("opens Clear Schedule confirmation dialog and clears all games", async () => {
    mockIsLeagueAdmin = true;
    await renderSchedule();

    const clearBtn = await screen.findByTitle("Clear Schedule (Admin Reset)");
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText("Clear Full Schedule?")).toBeInTheDocument();
    });

    const confirmClearBtn = screen.getByRole("button", { name: /Clear All Games/i });
    fireEvent.click(confirmClearBtn);

    await waitFor(() => {
      expect(mockClearSandboxMatches).toHaveBeenCalledTimes(1);
    });
  });

  it("dismisses backup schedule alert banner when clicking Dismiss", async () => {
    mockIsLeagueAdmin = true;
    (mockGetSandboxScheduleBackup as any).mockReturnValue({
      timestamp: Date.now(),
      matches: mockMatches,
    });

    await renderSchedule();

    await waitFor(() => {
      expect(screen.getByText(/Previous Schedule Archived/i)).toBeInTheDocument();
    });

    const dismissBtn = screen.getByRole("button", { name: /Dismiss/i });
    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Previous Schedule Archived/i)).toBeNull();
    });
  });

  it("renders empty schedule call-to-action when there are no matches", async () => {
    mockIsLeagueAdmin = true;
    // Set sandbox matches to empty array
    const originalMatches = [...mockMatches];
    mockMatches.length = 0;

    await renderSchedule();

    await waitFor(() => {
      expect(screen.getByText("Season Schedule Is Empty")).toBeInTheDocument();
    });

    const buildBtns = screen.getAllByRole("button", { name: /Build Schedule/i });
    expect(buildBtns.length).toBeGreaterThan(0);

    // Restore mockMatches
    originalMatches.forEach((m) => mockMatches.push(m));
  });

  it("edits scores and status in Edit Game modal and updates sandbox match", async () => {
    mockIsLeagueAdmin = true;
    const { container } = await renderSchedule();

    const allWeeksBtn = await screen.findByRole("button", { name: /All Weeks/i });
    fireEvent.click(allWeeksBtn);

    const editBtns = await screen.findAllByTitle("Edit Event");
    fireEvent.click(editBtns[0]);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Edit Game/i })).toBeInTheDocument();
    });

    // Score inputs
    const scoreInputs = Array.from(container.querySelectorAll("input[type='number']")) as HTMLInputElement[];
    expect(scoreInputs.length).toBe(2);
    fireEvent.change(scoreInputs[0], { target: { value: "30" } });
    fireEvent.change(scoreInputs[1], { target: { value: "28" } });

    // Status select
    const statusSelect = container.querySelector("select:not(#schedule-home-team-select):not(#schedule-away-team-select)")!;
    fireEvent.change(statusSelect, { target: { value: "in_progress" } });

    const saveChangesBtn = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveChangesBtn);

    await waitFor(() => {
      expect(mockUpdateSandboxMatch).toHaveBeenCalled();
    });
  });

  it("renders championship banner when a playoff match has concluded with a winner", async () => {
    mockIsLeagueAdmin = true;
    const playoffMatch: any = {
      id: "match_playoff_final",
      week: "Championship",
      homeTeamName: "Apex Predators",
      awayTeamName: "Cyber Knights",
      homeTeamId: "team_apex",
      awayTeamId: "team_cyber",
      date: "2026-10-30",
      time: "2:00 PM",
      location: "Championship Stadium",
      status: "completed",
      homeScore: 35,
      awayScore: 21,
      isPlayoff: true,
      playoffRound: "Championship",
    };
    mockMatches.push(playoffMatch);

    await renderSchedule();

    const playoffTabBtn = await screen.findByRole("button", { name: /Playoffs|Playoff Picture/i });
    fireEvent.click(playoffTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Apex Predators are champions!/i)).toBeInTheDocument();
    });

    // Clean up
    const idx = mockMatches.indexOf(playoffMatch);
    if (idx !== -1) mockMatches.splice(idx, 1);
  });

  it("performs Firestore operations (create, update, delete match, clear schedule) when in non-demo mode", async () => {
    mockIsDemoLeague = false;
    mockIsLeagueAdmin = true;

    try {
      const { container } = await renderSchedule();

      await waitFor(() => {
        expect(screen.getByText("Regular Season")).toBeInTheDocument();
      });

      const allWeeksBtn = await screen.findByRole("button", { name: /All Weeks/i });
      fireEvent.click(allWeeksBtn);

      // 1. Edit match in Firestore mode
      const editBtns = await screen.findAllByTitle("Edit Event");
      expect(editBtns.length).toBeGreaterThan(0);
      fireEvent.click(editBtns[0]);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /Edit Game/i })).toBeInTheDocument();
      });

      const saveChangesBtn = screen.getByRole("button", { name: /Save Changes/i });
      fireEvent.click(saveChangesBtn);

      await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalled();
      });

      // 2. Delete match in Firestore mode
      const deleteBtns = await screen.findAllByTitle("Delete Event");
      expect(deleteBtns.length).toBeGreaterThan(0);
      fireEvent.click(deleteBtns[0]);
      fireEvent.click(await screen.findByRole("button", { name: /^Delete Game$/i }));

      await waitFor(() => {
        expect(mockDeleteDoc).toHaveBeenCalled();
      });

      // 3. Clear schedule in Firestore mode
      const clearBtn = await screen.findByRole("button", { name: /Clear Schedule/i });
      fireEvent.click(clearBtn);

      const confirmClearBtn = screen.getByRole("button", { name: /Clear All Games/i });
      fireEvent.click(confirmClearBtn);

      await waitFor(() => {
        expect(mockGetLeagueSeasonMatchDocs).toHaveBeenCalled();
      });

      // 4. Add new match in Firestore mode
      const scheduleGameBtns = screen.getAllByRole("button", { name: /Schedule Game/i });
      fireEvent.click(scheduleGameBtns[0]);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /Schedule Game/i })).toBeInTheDocument();
      });

      const weekInput = container.querySelector("#schedule-week-input") as HTMLInputElement;
      const homeSelect = container.querySelector("#schedule-home-team-select") as HTMLSelectElement;
      const awaySelect = container.querySelector("#schedule-away-team-select") as HTMLSelectElement;
      const dateInput = container.querySelector("#schedule-date-input") as HTMLInputElement;
      const timeInput = container.querySelector("#schedule-time-input") as HTMLInputElement;
      const locInput = container.querySelector("#schedule-location-input") as HTMLInputElement;

      if (weekInput) fireEvent.change(weekInput, { target: { value: "Week 3" } });
      if (homeSelect) fireEvent.change(homeSelect, { target: { value: "team_apex" } });
      if (awaySelect) fireEvent.change(awaySelect, { target: { value: "team_cyber" } });
      if (dateInput) fireEvent.change(dateInput, { target: { value: "2026-10-15" } });
      if (timeInput) fireEvent.change(timeInput, { target: { value: "15:00" } });
      if (locInput) fireEvent.change(locInput, { target: { value: "Field 3" } });

      const dialog = screen.getByRole("dialog");
      const saveSubmitBtn = within(dialog).getByRole("button", { name: /Schedule Game/i });
      fireEvent.click(saveSubmitBtn);

      await waitFor(() => {
        expect(mockCreateSecureRecord).toHaveBeenCalledWith("match", expect.anything());
      });
    } finally {
      mockIsDemoLeague = true;
    }
  });

  it("switches to playoffs view, filters by week, and toggles views", async () => {
    render(<SchedulePage />);
    await waitFor(() => {
      expect(screen.getAllByText("Apex Predators").length).toBeGreaterThan(0);
    });

    // 1. Filter by Week
    const allWeeksBtn = screen.queryByRole("button", { name: /All Weeks/i });
    if (allWeeksBtn) {
      fireEvent.click(allWeeksBtn);
      const week1Btn = screen.queryByRole("button", { name: /^Week 1$/i });
      if (week1Btn) fireEvent.click(week1Btn);
    }

    // 2. Switch to Playoffs tab
    const playoffsTab = screen.getByRole("button", { name: /Playoff|Playoffs/i });
    fireEvent.click(playoffsTab);

    await waitFor(() => {
      expect(screen.getAllByText(/Playoffs|Bracket|Projected/i).length).toBeGreaterThan(0);
    });

    // 3. Switch back to Regular Season
    const regularSeasonTab = screen.getByRole("button", { name: /Regular Season/i });
    fireEvent.click(regularSeasonTab);

    await waitFor(() => {
      expect(screen.getAllByText("Apex Predators").length).toBeGreaterThan(0);
    });
  });

  it("opens Change Playoff Format modal, adjusts teams count, and saves new format", async () => {
    render(<SchedulePage />);
    await waitFor(() => {
      expect(screen.getAllByText("Apex Predators").length).toBeGreaterThan(0);
    });

    const playoffsTab = screen.getByRole("button", { name: /Playoff|Playoffs/i });
    fireEvent.click(playoffsTab);

    const changeFormatBtn = await screen.findByRole("button", { name: /Change Playoff Format/i });
    fireEvent.click(changeFormatBtn);

    const applyBtn = await screen.findByRole("button", { name: /Apply Playoff Format/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          playoffFormat: expect.objectContaining({
            structure: expect.any(String),
          }),
        })
      );
    });
  });

  it("allows platform admin to simulate an uncompleted match", async () => {
    mockIsPlatformAdmin = true;
    render(<SchedulePage />);

    await waitFor(() => {
      expect(screen.getAllByText("Apex Predators").length).toBeGreaterThan(0);
    });

    const allWeeksBtn = screen.getByRole("button", { name: /All Weeks/i });
    fireEvent.click(allWeeksBtn);

    const simBtn = await screen.findByRole("button", { name: /Simulate/i });
    fireEvent.click(simBtn);
    fireEvent.click(await screen.findByRole("button", { name: /^Simulate Game$/i }));

    await waitFor(() => {
      expect(mockSimulateFullGame).toHaveBeenCalledWith(
        "match_w2_1",
        expect.objectContaining({
          isDemo: true,
        })
      );
    });
  });

  it("reorders matches via drag and drop", async () => {
    render(<SchedulePage />);

    await waitFor(() => {
      expect(screen.getAllByText("Apex Predators").length).toBeGreaterThan(0);
    });

    const allWeeksBtn = screen.getByRole("button", { name: /All Weeks/i });
    fireEvent.click(allWeeksBtn);

    await waitFor(() => {
      expect(screen.getAllByRole("link", { name: /Week/i }).length).toBeGreaterThanOrEqual(2);
    });

    const matchLinks = screen.getAllByRole("link", { name: /Week/i });
    const card1 = matchLinks[0].parentElement!;
    const card2 = matchLinks[1].parentElement!;

    fireEvent.dragStart(card1, { dataTransfer: { effectAllowed: "", dropEffect: "" } });
    fireEvent.dragOver(card2, { dataTransfer: { effectAllowed: "", dropEffect: "" } });
    fireEvent.drop(card2, { dataTransfer: { effectAllowed: "", dropEffect: "" } });

    await waitFor(() => {
      expect(mockUpdateSandboxMatch).toHaveBeenCalled();
    });
  });

  it("closes schedule game modal when Escape key is pressed", async () => {
    render(<SchedulePage />);

    await waitFor(() => {
      expect(screen.getAllByText("Apex Predators").length).toBeGreaterThan(0);
    });

    const addBtn = screen.getByRole("button", { name: /Schedule Game/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Schedule Game/i })).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /Schedule Game/i })).not.toBeInTheDocument();
    });
  });
});

