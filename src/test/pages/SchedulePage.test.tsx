import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import SchedulePage from "@/app/schedule/page";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock League Context
vi.mock("@/lib/leagueContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/leagueContext")>();
  return {
    ...actual,
    useLeague: () => ({
      settings: {
        leagueName: "FlagOS League",
        shortcode: "FLAG",
        primaryColor: "#3ca505",
        accentColor: "#22c55e",
        defaultLocation: "Turf Field 1",
        announcement: "",
      },
      updateSettings: vi.fn(),
      isDemoLeague: true,
    }),
  };
});

// Mock Auth
let mockIsLeagueAdmin = true;
vi.mock("@/lib/authContext", () => ({
  useAuth: () => ({
    isLeagueAdmin: mockIsLeagueAdmin,
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

const mockDeleteSandboxMatch = vi.fn();
const mockDeleteSandboxPlaysForMatch = vi.fn();
const mockGetSandboxScheduleBackup = vi.fn(() => null);
const mockRestoreSandboxScheduleBackup = vi.fn();

vi.mock("@/lib/demoSandbox", () => ({
  getSandboxTeams: () => mockTeams,
  getSandboxMatches: () => mockMatches,
  addSandboxMatch: vi.fn(),
  updateSandboxMatch: vi.fn(),
  deleteSandboxMatch: (...args: any[]) => mockDeleteSandboxMatch(...args),
  deleteSandboxPlaysForMatch: (...args: any[]) => mockDeleteSandboxPlaysForMatch(...args),
  setSandboxMatches: vi.fn(),
  clearSandboxMatches: vi.fn(),
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

  it("opens automated schedule builder modal when clicking Auto Schedule Builder", async () => {
    await renderSchedule();

    const autoGenBtn = await screen.findByRole("button", { name: /Auto Schedule Builder/i });
    fireEvent.click(autoGenBtn);

    await waitFor(() => {
      // Modal is visible
      expect(screen.getByText(/Automated Schedule Builder/i)).toBeInTheDocument();
      expect(screen.getByText(/Scheduling Matrix Engine/i)).toHaveTextContent("FlagOS Scheduling Matrix Engine");
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
    expect(screen.queryByRole("button", { name: /Auto Schedule Builder/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Schedule Game/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Playoff Format/i })).toBeNull();
    expect(screen.queryByTitle("Clear Schedule (Admin Reset)")).toBeNull();
    expect(screen.queryByTitle("Edit Event")).toBeNull();
    expect(screen.queryByTitle("Delete Event")).toBeNull();
  });

  it("renders Auto Schedule Builder and enables modal when embedded in the interactive demo frame (?embed=true)", async () => {
    mockIsLeagueAdmin = false;
    window.location = new URL("http://localhost:3000/schedule?embed=true&demo=true") as any;
    await renderSchedule();

    const autoGenBtn = await screen.findByRole("button", { name: /Auto Schedule Builder/i });
    expect(autoGenBtn).toBeInTheDocument();

    fireEvent.click(autoGenBtn);
    await waitFor(() => {
      expect(screen.getByText(/Automated Schedule Builder/i)).toBeInTheDocument();
      expect(screen.getByText(/Scheduling Matrix Engine/i)).toHaveTextContent("FlagOS Scheduling Matrix Engine");
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
    expect(restoreBtn.className).toContain("from-amber-500");

    fireEvent.click(restoreBtn);
    expect(mockRestoreSandboxScheduleBackup).toHaveBeenCalledTimes(1);
  });
});
