import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import AsyncPlayByPlayManager from "@/components/AsyncPlayByPlayManager";

const testMatch = {
  id: "match_demo_def_test",
  homeTeamName: "Apex Lions",
  awayTeamName: "Thunder Sharks",
  homeTeamId: "team_apex",
  awayTeamId: "team_thunder",
  managingTeamId: "team_apex",
  homeScore: 0,
  awayScore: 0,
  possession: "Thunder Sharks", // Opponent on offense, so Apex Lions is on defense!
  matchState: { possession: "Thunder Sharks", currentDown: 1, half: 1 },
  currentDown: 1,
  half: 1,
  status: "in_progress",
};

const testPlayers = [
  { id: "p1", playerName: "Sarah Defender", teamId: "team_apex", number: "7" },
  { id: "p2", playerName: "Alex Safety", teamId: "team_apex", number: "24" },
];

vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("@/lib/authContext", () => ({
  useAuth: () => ({ loading: false, isPlatformAdmin: false, isLeagueAdmin: true, canManageTeam: () => true }),
}));
vi.mock("@/lib/usePrivateLeagueAccess", () => ({
  usePrivateLeagueAccess: () => ({ isDenied: false, deniedElement: null }),
}));
vi.mock("@/lib/useMatchTeamColors", () => ({
  useMatchTeamColors: () => ({
    home: { primary: "#111111", secondary: "#ffffff", tertiary: "#ff0000" },
    away: { primary: "#111111", secondary: "#ffffff", tertiary: "#00ff00" },
  }),
}));
vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({
    isDemoLeague: true,
    settings: { rules: { downsPerSeries: 4, periodDurationMinutes: 20, playClockSeconds: 30, timeoutsPerTeam: 2 } },
  }),
}));
vi.mock("@/lib/statKeeperHistory", () => ({
  loadStatKeeperHistory: vi.fn(async () => []),
}));
vi.mock("@/lib/demoSandbox", () => ({
  getSandboxMatches: () => [testMatch],
  getSandboxMatch: () => testMatch,
  getSandboxPlayers: () => testPlayers,
  getSandboxTeams: () => [],
  getSandboxPlays: () => [],
  isDemoMatch: () => true,
  subscribeDemoSandbox: () => () => {},
  addSandboxPlay: vi.fn(),
  updateSandboxMatch: vi.fn(),
  deleteSandboxPlay: vi.fn(),
  deleteSandboxPlaysForMatch: vi.fn(),
}));

describe("AsyncPlayByPlayManager - One Sided Defense Ball Carrier", () => {
  it("automatically sets opponent ball carrier and skips to defenders when on defense", async () => {
    await act(async () => {
      render(<AsyncPlayByPlayManager matchId={testMatch.id} />);
    });

    // Start a play
    const startPlayBtn = await screen.findByRole("button", { name: /START (NEXT )?PLAY/i });
    fireEvent.click(startPlayBtn);

    // Choose Run
    const runBtn = screen.getByRole("button", { name: /^Run/i });
    fireEvent.click(runBtn);

    // Ball Carrier should show "Thunder Sharks Ball Carrier" without needing manual selection
    expect(screen.getAllByText(/Thunder Sharks Ball Carrier/i).length).toBeGreaterThan(0);

    // Defenders section should be open with our defenders ready to be selected
    const defenderBtn = screen.getByRole("button", { name: /Sarah Defender/i });
    expect(defenderBtn).toBeDefined();

    // Click defender to log flag pull
    fireEvent.click(defenderBtn);

    // Outcome options should now be ready to save
    expect(screen.getByRole("button", { name: /SHORT OF LINE/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /FIRST DOWN/i })).toBeDefined();
  });
});
