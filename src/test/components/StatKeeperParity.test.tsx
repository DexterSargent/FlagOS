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
  loadStatKeeperHistory: vi.fn(async () => history),
}));
vi.mock("@/lib/demoSandbox", () => ({
  getSandboxMatches: () => [match], getSandboxMatch: () => match,
  getSandboxPlayers: () => players, getSandboxTeams: () => [],
  getSandboxPlays: () => [], isDemoMatch: () => true,
  subscribeDemoSandbox: () => () => {},
  addSandboxPlay: vi.fn((play: Record<string, unknown>) => ({ id: `sandbox_${Math.random().toString(36).slice(2)}`, ...play })),
  updateSandboxMatch: vi.fn(),
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

function chooseOutcome(name: string | RegExp) {
  const summary = screen.queryByRole("button", { name: /^Play Outcome:.*Click to change/ });
  if (summary) fireEvent.click(summary);
  fireEvent.click(screen.getByRole("button", { name }));
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
      chooseOutcome(/^Incomplete$/i);
    }
    chooseOutcome(outcome === "PBU" ? /PBU|Pass Break Up/i : /^Interception$/i);
    expectBefore(leader, "Flag Leader");
  });

  it("collapses a chosen sacker and allows reopening to add shared sack credit", async () => {
    await start(mode);
    fireEvent.click(screen.getByRole("button", { name: "Pass Leader" }));
    chooseOutcome("Sack");
    fireEvent.click(screen.getByRole("button", { name: "Flag Leader" }));
    expect(screen.queryByRole("button", { name: "INT Leader" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Sacker\(s\):.*Click to change/ }));
    fireEvent.click(screen.getByRole("button", { name: "INT Leader" }));
    expect(screen.getByRole("button", { name: /^Sacker\(s\):.*Click to change/ })).toHaveTextContent("INT Leader");
    const results = screen.getByRole("group", { name: "Save play result" });
    expect(results).toHaveClass("shrink-0");
    fireEvent.click(within(results).getByRole("button", { name: /loss of yards/i }));
    await waitFor(() => expect(addSandboxPlay).toHaveBeenCalledWith(expect.objectContaining({
      defenders: ["Flag Leader", "INT Leader"], passOutcome: "Sack",
    })));
  });

  it("collapses conversion categories and keeps the save action outside the selection scroller", async () => {
    await start(mode);
    fireEvent.click(screen.getByRole("button", { name: "Pass Leader" }));
    fireEvent.click(screen.getByRole("button", { name: "Catch Leader" }));
    fireEvent.click(screen.getByRole("button", { name: /Touchdown/i }));
    fireEvent.click(screen.getByRole("button", { name: mode === "sync" ? /From 5 Yd/i : /^1 POINT /i }));
    fireEvent.click(screen.getByRole("button", { name: mode === "sync" ? /^GOOD$/ : /^✓ GOOD/i }));
    expect(screen.getByRole("button", { name: /^Conversion attempt:.*Click to change/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Conversion result:.*Click to change/ })).toBeInTheDocument();
    if (mode === "async") {
      fireEvent.click(within(screen.getByRole("group", { name: "Conversion Passer / Runner" })).getByRole("button", { name: "Pass Leader" }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Catch Leader" }));
    expect(screen.queryByRole("button", { name: "Catch Leader" })).not.toBeInTheDocument();
    const save = screen.getByRole("button", { name: mode === "sync" ? /SAVE CONVERSION STATS/ : /Confirm Conversion/ });
    expect(save.parentElement).toHaveClass("shrink-0");
    fireEvent.click(save);
    await waitFor(() => expect(addSandboxPlay).toHaveBeenCalledWith(expect.objectContaining({
      conversionSuccess: true, conversionPasser: "Pass Leader", conversionReceiver: "Catch Leader",
    })));
  });
});

describe("async copied workflows", () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it.each([
    ["Incomplete", ["SAVE & NEXT DOWN"]],
    ["Pass Breakup (PBU)", ["SAVE & NEXT DOWN"]],
    ["Sack", ["LOSS OF YARDS", "SAFETY (+2 DEF)"]],
    ["Flag For Loss (FFL)", ["LOSS OF YARDS", "SAFETY (+2 DEF)"]],
    ["Interception", ["PICK 6 (+6)", "OOB / DOWNED (Save Turnover)"]],
  ])("limits %s to valid results after the required players are selected", async (outcome, results) => {
    await start("async");
    fireEvent.click(screen.getByRole("button", { name: "Pass Leader" }));
    chooseOutcome(outcome);
    const resultGroup = screen.getByRole("group", { name: "Save play result" });
    if (outcome !== "Incomplete") {
      expect(within(resultGroup).queryAllByRole("button")).toHaveLength(0);
      fireEvent.click(screen.getByRole("button", { name: "INT Leader" }));
    } else {
      expect(screen.queryByText("Defenders Involved / Flag")).not.toBeInTheDocument();
    }
    expect(within(resultGroup).getAllByRole("button").map((button) => button.textContent)).toEqual(results);
    expect(screen.queryByRole("button", { name: "TOUCHDOWN (+6)" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "FIRST DOWN" })).not.toBeInTheDocument();
    fireEvent.click(within(resultGroup).getByRole("button", { name: results[0] }));
    if (outcome !== "Interception") {
      expect(addSandboxPlay).toHaveBeenCalledWith(expect.objectContaining({
        result: outcome === "Incomplete" || outcome === "Pass Breakup (PBU)" ? "Next Down" : "Short",
        gameClock: null,
      }));
    }
  });

  it("requires a receiver and switches gained-play results between scoring, OOB and flag pulls", async () => {
    await start("async");
    const results = screen.getByRole("group", { name: "Save play result" });
    expect(within(results).queryAllByRole("button")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Pass Leader" }));
    expect(within(results).queryAllByRole("button")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Catch Leader" }));
    expect(within(results).getAllByRole("button").map((button) => button.textContent)).toEqual(["TOUCHDOWN (+6)", "OUT OF BOUNDS"]);
    fireEvent.click(screen.getByRole("button", { name: "OUT OF BOUNDS" }));
    expect(within(results).getAllByRole("button").map((button) => button.textContent)).toEqual(["OOB - FIRST DOWN", "OOB - SHORT"]);
    fireEvent.click(screen.getByRole("button", { name: "Flag Leader" }));
    expect(within(results).getAllByRole("button").map((button) => button.textContent)).toEqual(["FIRST DOWN", "SHORT OF LINE"]);
  });

  it("does not allow touchdowns or first downs on a run for a loss", async () => {
    await start("async", "Run");
    fireEvent.click(screen.getByRole("button", { name: "Catch Leader" }));
    chooseOutcome("Loss of Yards");
    const results = screen.getByRole("group", { name: "Save play result" });
    expect(within(results).getAllByRole("button").map((button) => button.textContent)).toEqual(["LOSS OF YARDS", "SAFETY (+2 DEF)"]);
  });

  it("keeps the original offense on a pick-six record while crediting the defending team's score", async () => {
    await start("async");
    fireEvent.click(screen.getByRole("button", { name: "Pass Leader" }));
    chooseOutcome("Interception");
    fireEvent.click(screen.getByRole("button", { name: "INT Leader" }));
    fireEvent.click(screen.getByRole("button", { name: "PICK 6 (+6)" }));
    fireEvent.click(screen.getByRole("button", { name: /^1 POINT /i }));
    fireEvent.click(screen.getByRole("button", { name: /NO GOOD/i }));
    fireEvent.click(screen.getByRole("button", { name: /Confirm Conversion/i }));
    await waitFor(() => expect(addSandboxPlay).toHaveBeenCalledWith(expect.objectContaining({
      possessionTeamId: "home", defenders: ["INT Leader"], isPick6: true, pointsScored: 6,
    })));
    expect(screen.getByTestId("away-scoreboard")).toHaveTextContent("6");
  });

  it("does not classify a fourth-down touchdown as a turnover on downs", async () => {
    await start("async");
    fireEvent.click(screen.getByRole("button", { name: "4th Down" }));
    fireEvent.click(screen.getByRole("button", { name: "Pass Leader" }));
    fireEvent.click(screen.getByRole("button", { name: "Catch Leader" }));
    fireEvent.click(screen.getByRole("button", { name: "TOUCHDOWN (+6)" }));
    fireEvent.click(screen.getByRole("button", { name: /^1 POINT /i }));
    fireEvent.click(screen.getByRole("button", { name: /NO GOOD/i }));
    fireEvent.click(screen.getByRole("button", { name: /Confirm Conversion/i }));
    await waitFor(() => expect(addSandboxPlay).toHaveBeenCalledWith(expect.objectContaining({
      down: 4, result: "Touchdown", turnover: false, isFourthDownConversion: true,
    })));
  });

  it("records interception return flaggers and only one interceptor, without a clock", async () => {
    await start("async");
    fireEvent.click(screen.getByRole("button", { name: "Pass Leader" }));
    chooseOutcome(/^Interception$/i);
    const defenders = screen.getByRole("group", { name: "Interceptor(s)" });
    fireEvent.click(within(defenders).getByRole("button", { name: "PBU Leader" }));
    expect(within(defenders).queryByRole("button", { name: "INT Leader" })).not.toBeInTheDocument();
    fireEvent.click(within(defenders).getByRole("button", { name: /Click to change/ }));
    fireEvent.click(within(defenders).getByRole("button", { name: "INT Leader" }));
    expect(within(defenders).getByRole("button", { name: /Click to change/ })).toHaveTextContent("INT Leader");
    const flaggers = screen.getByRole("group", { name: "Flagger(s) on Interception Return" });
    fireEvent.click(within(flaggers).getByRole("button", { name: "Catch Leader" }));
    expect(screen.queryByRole("button", { name: /PICK 6/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Turnover/i }));
    await waitFor(() => expect(addSandboxPlay).toHaveBeenCalledWith(expect.objectContaining({
      defenders: ["INT Leader"], flaggers: ["Catch Leader"], gameClock: null,
    })));
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
    expect(within(passers).queryByRole("button", { name: "Pass Leader" })).not.toBeInTheDocument();
    expect(within(passers).getByRole("button", { name: /Click to change/ })).toHaveTextContent("Pass Leader");
    const receivers = screen.getByRole("group", { name: "Conversion Receiver" });
    expect(within(receivers).queryByRole("button", { name: "Pass Leader" })).not.toBeInTheDocument();
    fireEvent.click(within(receivers).getByRole("button", { name: "Catch Leader" }));
    expect(within(receivers).getByRole("button", { name: /Click to change/ })).toHaveTextContent("Catch Leader");
    fireEvent.click(screen.getByRole("button", { name: /Confirm Conversion/i }));
    await waitFor(() => expect(addSandboxPlay).toHaveBeenCalledWith(expect.objectContaining({
      conversionPasser: "Pass Leader", conversionReceiver: "Catch Leader", gameClock: null,
    })));
  });

  it("preserves conversion selections while reopening and changing the attempt value", async () => {
    await start("async");
    fireEvent.click(screen.getByRole("button", { name: "Pass Leader" }));
    fireEvent.click(screen.getByRole("button", { name: "Catch Leader" }));
    fireEvent.click(screen.getByRole("button", { name: /Touchdown/i }));
    fireEvent.click(screen.getByRole("button", { name: /^1 POINT /i }));
    expect(screen.queryByRole("button", { name: /^2 POINTS /i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^✓ GOOD/i }));
    fireEvent.click(within(screen.getByRole("group", { name: "Conversion Passer / Runner" })).getByRole("button", { name: "Pass Leader" }));
    fireEvent.click(within(screen.getByRole("group", { name: "Conversion Receiver" })).getByRole("button", { name: "Catch Leader" }));
    fireEvent.click(screen.getByRole("button", { name: /^Conversion attempt:.*Click to change/ }));
    fireEvent.click(screen.getByRole("button", { name: /^2 POINTS /i }));
    fireEvent.click(screen.getByRole("button", { name: /Confirm Conversion/i }));
    await waitFor(() => expect(addSandboxPlay).toHaveBeenCalledWith(expect.objectContaining({
      conversionAttempt: 2, conversionSuccess: true, conversionPasser: "Pass Leader",
      conversionReceiver: "Catch Leader", pointsScored: 8,
    })));
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
    fireEvent.click(screen.getByRole("button", { name: /Conversion result: Good.*Click to change/ }));
    fireEvent.click(screen.getByRole("button", { name: /NO GOOD/i }));
    fireEvent.click(screen.getByRole("button", { name: /Confirm Conversion/i }));
    await waitFor(() => expect(addSandboxPlay).toHaveBeenCalledWith(expect.objectContaining({
      conversionPasser: "", conversionReceiver: "", conversionSuccess: false, pointsScored: 6,
    })));
  });
});
