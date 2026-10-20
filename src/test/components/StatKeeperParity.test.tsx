import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AsyncPlayByPlayManager from "@/components/AsyncPlayByPlayManager";
import AdminView from "@/app/matches/[id]/play-by-play/AdminView";
import { addSandboxPlay } from "@/lib/demoSandbox";
import { loadStatKeeperHistory } from "@/lib/statKeeperHistory";

const { match, players, history } = vi.hoisted(() => ({
  match: {
    id: "match_demo_parity", homeTeamName: "Home", awayTeamName: "Away",
    homeTeamId: "home", awayTeamId: "away", homeScore: 0, awayScore: 0,
    possession: "Home", currentDown: 1, half: 1, gameClock: 1200, status: "in_progress",
  },
  players: [
    { id: "q1", playerName: "Low Number", teamId: "home", number: "2" },
    { id: "q2", playerName: "Pass Leader", teamId: "home", number: "90" },
    { id: "r1", playerName: "Catch Leader", teamId: "home", number: "80" },
    { id: "d1", playerName: "Flag Leader", teamId: "away", number: "1" },
    { id: "d2", playerName: "PBU Leader", teamId: "away", number: "50" },
    { id: "d3", playerName: "INT Leader", teamId: "away", number: "99" },
  ],
  history: [
    { id: "pass", playType: "Pass", qbPlayerId: "q2", receiverPlayerId: "r1", passOutcome: "Complete", defenders: ["d1"] },
    { id: "pbu", playType: "Pass", qbPlayerId: "q2", passOutcome: "PBU", defenders: ["d2"] },
    { id: "int", playType: "Pass", qbPlayerId: "q2", passOutcome: "Interception", defenders: ["d3"], flaggers: ["r1"] },
    { id: "rush", playType: "Run", runnerPlayerId: "r1", defenders: ["d1"] },
  ],
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
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
  loadStatKeeperHistory: vi.fn(async () => history),
}));
vi.mock("@/lib/demoSandbox", () => ({
  getSandboxMatches: () => [match], getSandboxMatch: () => match,
  getSandboxPlayers: () => players, getSandboxTeams: () => [],
  getSandboxPlays: () => [], isDemoMatch: () => true,
  subscribeDemoSandbox: () => () => {},
  addSandboxPlay: vi.fn(), updateSandboxMatch: vi.fn(),
  deleteSandboxPlay: vi.fn(), deleteSandboxPlaysForMatch: vi.fn(),
}));

async function start(mode: "sync" | "async", type = "Pass") {
  await act(async () => {
    render(mode === "sync"
      ? <Suspense><AdminView params={Promise.resolve({ id: match.id })} /></Suspense>
      : <AsyncPlayByPlayManager matchId={match.id} />);
  });
  fireEvent.click(await screen.findByRole("button", { name: mode === "sync" ? /CLICK WHEN SNAPPED/i : /START (NEXT )?PLAY/i }));
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${type}`, "i") }));
  await waitFor(() => expect(loadStatKeeperHistory).toHaveBeenCalled());
}

function expectBefore(first: string, second: string) {
  const a = screen.getByRole("button", { name: first });
  const b = screen.getByRole("button", { name: second });
  expect(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

describe.each(["sync", "async"] as const)("%s stat keeper selection parity", (mode) => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("ranks passers and receivers by their own stats rather than jersey number", async () => {
    await start(mode);
    expectBefore("Pass Leader", "Low Number");
    fireEvent.click(screen.getByRole("button", { name: "Pass Leader" }));
    expectBefore("Catch Leader", "Low Number");
    expect(screen.queryByRole("button", { name: "Pass Leader" })).not.toBeInTheDocument();
  });

  it("ranks runners by rushing counts", async () => {
    await start(mode, "Run");
    expectBefore("Catch Leader", "Low Number");
  });

  it.each([
    ["PBU", "PBU Leader"],
    ["Interception", "INT Leader"],
  ])("ranks %s defenders by the relevant statistic", async (outcome, leader) => {
    await start(mode);
    fireEvent.click(screen.getByRole("button", { name: "Pass Leader" }));
    if (outcome === "PBU" && mode === "sync") {
      fireEvent.click(screen.getByRole("button", { name: /^Incomplete$/i }));
    }
    fireEvent.click(screen.getByRole("button", { name: outcome === "PBU" ? /PBU|Pass Break Up/i : /^Interception$/i }));
    expectBefore(leader, "Flag Leader");
  });
});

describe("async copied workflows", () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it("records interception return flaggers and only one interceptor, without a clock", async () => {
    await start("async");
    fireEvent.click(screen.getByRole("button", { name: "Pass Leader" }));
    fireEvent.click(screen.getByRole("button", { name: /^Interception$/i }));
    const defenders = screen.getByRole("group", { name: "Interceptor(s)" });
    fireEvent.click(within(defenders).getByRole("button", { name: "PBU Leader" }));
    fireEvent.click(within(defenders).getByRole("button", { name: "INT Leader" }));
    expect(within(defenders).getByRole("button", { name: "PBU Leader" })).toHaveAttribute("aria-pressed", "false");
    const flaggers = screen.getByRole("group", { name: "Flagger(s) on Interception Return" });
    fireEvent.click(within(flaggers).getByRole("button", { name: "Catch Leader" }));
    fireEvent.click(screen.getByRole("button", { name: /Turnover/i }));
    expect(addSandboxPlay).toHaveBeenCalledWith(expect.objectContaining({
      defenders: ["INT Leader"], flaggers: ["Catch Leader"], gameClock: null,
    }));
  });

  it("supports sorted conversion credit and excludes the conversion passer from receiving", async () => {
    await start("async");
    fireEvent.click(screen.getByRole("button", { name: "Pass Leader" }));
    fireEvent.click(screen.getByRole("button", { name: "Catch Leader" }));
    fireEvent.click(screen.getByRole("button", { name: /Touchdown/i }));
    fireEvent.click(screen.getByRole("button", { name: /^1 POINT /i }));
    fireEvent.click(screen.getByRole("button", { name: /^✓ GOOD/i }));
    const passers = screen.getByRole("group", { name: "Conversion Passer / Runner" });
    const passerButtons = within(passers).getAllByRole("button");
    expect(passerButtons[0]).toHaveAccessibleName("Pass Leader");
    fireEvent.click(passerButtons[0]);
    const receivers = screen.getByRole("group", { name: "Conversion Receiver" });
    expect(within(receivers).queryByRole("button", { name: "Pass Leader" })).not.toBeInTheDocument();
    fireEvent.click(within(receivers).getByRole("button", { name: "Catch Leader" }));
    fireEvent.click(screen.getByRole("button", { name: /Confirm Conversion/i }));
    expect(addSandboxPlay).toHaveBeenCalledWith(expect.objectContaining({
      conversionPasser: "Pass Leader", conversionReceiver: "Catch Leader", gameClock: null,
    }));
  });

  it("does not award conversion credit if a selected successful attempt is changed to no good", async () => {
    await start("async");
    fireEvent.click(screen.getByRole("button", { name: "Pass Leader" }));
    fireEvent.click(screen.getByRole("button", { name: "Catch Leader" }));
    fireEvent.click(screen.getByRole("button", { name: /Touchdown/i }));
    fireEvent.click(screen.getByRole("button", { name: /^1 POINT /i }));
    fireEvent.click(screen.getByRole("button", { name: /^✓ GOOD/i }));
    fireEvent.click(within(screen.getByRole("group", { name: "Conversion Passer / Runner" })).getByRole("button", { name: "Pass Leader" }));
    fireEvent.click(within(screen.getByRole("group", { name: "Conversion Receiver" })).getByRole("button", { name: "Catch Leader" }));
    fireEvent.click(screen.getByRole("button", { name: /NO GOOD/i }));
    fireEvent.click(screen.getByRole("button", { name: /Confirm Conversion/i }));
    expect(addSandboxPlay).toHaveBeenCalledWith(expect.objectContaining({
      conversionPasser: "", conversionReceiver: "", conversionSuccess: false, pointsScored: 6,
    }));
  });
});
