import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SeasonHistoryPanel from "@/components/league/SeasonHistoryPanel";
import type { LeagueSeason, PlayerStatLine, SeasonSnapshot } from "@/lib/leagueSeasons";

const mockSeasons: LeagueSeason[] = [
  {
    id: "season_1",
    number: 1,
    title: "Inaugural Championship Season",
    status: "archived",
    championTeamId: "team_alpha",
    championTeamName: "Alpha Predators",
    startedAt: "2025-09-01T00:00:00.000Z",
    endedAt: "2025-11-20T00:00:00.000Z",
  },
  {
    id: "season_2",
    number: 2,
    title: "Spring Flag Invitational",
    status: "active",
    startedAt: "2026-03-01T00:00:00.000Z",
  },
];

const mockSnapshots: SeasonSnapshot[] = [
  {
    id: "snap_1",
    seasonId: "season_1",
    leagueId: "league_test",
    number: 1,
    title: "Inaugural Championship Season",
    championTeamId: "team_alpha",
    championTeamName: "Alpha Predators",
    startedAt: "2025-09-01T00:00:00.000Z",
    endedAt: "2025-11-20T00:00:00.000Z",
    savedAt: "2025-11-21T00:00:00.000Z",
    finalStandings: [],
    playerStats: [
      {
        playerId: "p1",
        name: "Marcus Vance",
        teamId: "team_alpha",
        teamName: "Alpha Predators",
        gamesPlayed: 10,
        totalTDs: 14,
        passTD: 8,
        rushTD: 2,
        recTD: 4,
        receptions: 18,
        flagPulls: 25,
        int: 5,
        sacks: 3,
        passAtt: 20,
        passComp: 15,
        passYds: 220,
        rushYds: 50,
        recYds: 120,
        tacklesForLoss: 2,
        safeties: 0,
        pickSixes: 1,
        twoPtConv: 2,
        onePtConv: 1,
      },
    ],
  },
] as any;

const mockLivePlayerStats: PlayerStatLine[] = [
  {
    playerId: "p1",
    name: "Marcus Vance",
    teamId: "team_alpha",
    teamName: "Alpha Predators",
    gamesPlayed: 4,
    totalTDs: 6,
    passTD: 3,
    rushTD: 1,
    recTD: 2,
    receptions: 8,
    flagPulls: 10,
    int: 2,
    sacks: 1,
    passAtt: 12,
    passComp: 9,
    passYds: 100,
    rushYds: 20,
    recYds: 60,
    tacklesForLoss: 1,
    safeties: 0,
    pickSixes: 0,
    twoPtConv: 1,
    onePtConv: 0,
  },
  {
    playerId: "p2",
    name: "Devon Reed",
    teamId: "team_beta",
    teamName: "Beta Storm",
    gamesPlayed: 4,
    totalTDs: 8,
    passTD: 0,
    rushTD: 3,
    recTD: 5,
    receptions: 15,
    flagPulls: 8,
    int: 1,
    sacks: 0,
    passAtt: 0,
    passComp: 0,
    passYds: 0,
    rushYds: 75,
    recYds: 180,
    tacklesForLoss: 0,
    safeties: 0,
    pickSixes: 0,
    twoPtConv: 0,
    onePtConv: 0,
  },
] as any;

describe("SeasonHistoryPanel", () => {
  it("renders seasons list, leaders, and career statistics correctly", () => {
    const onViewSeason = vi.fn();

    render(
      <SeasonHistoryPanel
        seasons={mockSeasons}
        snapshots={mockSnapshots}
        currentSeasonId="season_2"
        livePlayerStats={mockLivePlayerStats}
        loading={false}
        error=""
        onViewSeason={onViewSeason}
      />
    );

    // Seasons section
    expect(screen.getByRole("heading", { name: /^Seasons$/i })).toBeInTheDocument();
    expect(screen.getByText("Inaugural Championship Season")).toBeInTheDocument();
    expect(screen.getByText("Spring Flag Invitational")).toBeInTheDocument();
    expect(screen.getByText("Alpha Predators")).toBeInTheDocument();

    // Click onViewSeason for Season 1
    const viewButtons = screen.getAllByRole("button", { name: /View (final|live) standings/i });
    expect(viewButtons.length).toBe(2);
    fireEvent.click(viewButtons[0]);
    expect(onViewSeason).toHaveBeenCalled();

    // All-time leaders section
    expect(screen.getByRole("heading", { name: /All-time leaders/i })).toBeInTheDocument();
    expect(screen.getByText("Touchdowns")).toBeInTheDocument();

    // Career stats section & table
    expect(screen.getByRole("heading", { name: /Career stats/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Marcus Vance/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Devon Reed/i })).toBeInTheDocument();

    // Expand player row to view seasons breakdown
    const marcusBtn = screen.getByRole("button", { name: /Marcus Vance/i });
    fireEvent.click(marcusBtn);
    expect(screen.getAllByText(/Alpha Predators/i).length).toBeGreaterThan(0);
  });

  it("filters player career stats by search input", () => {
    render(
      <SeasonHistoryPanel
        seasons={mockSeasons}
        snapshots={mockSnapshots}
        currentSeasonId="season_2"
        livePlayerStats={mockLivePlayerStats}
        loading={false}
        error=""
        onViewSeason={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search players/i);
    fireEvent.change(searchInput, { target: { value: "Devon" } });

    expect(screen.getByRole("button", { name: /Devon Reed/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Marcus Vance/i })).not.toBeInTheDocument();

    // Search for non-existing player
    fireEvent.change(searchInput, { target: { value: "NonExistentPlayer" } });
    expect(screen.getByText(/No players match that search/i)).toBeInTheDocument();
  });

  it("renders error message and loading states", () => {
    const { rerender } = render(
      <SeasonHistoryPanel
        seasons={[]}
        snapshots={[]}
        currentSeasonId=""
        livePlayerStats={[]}
        loading={true}
        error="Failed to load season history data"
        onViewSeason={vi.fn()}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load season history data");
    expect(screen.getByText("Loading past seasons...")).toBeInTheDocument();

    // Rerender with empty state (no stats yet)
    rerender(
      <SeasonHistoryPanel
        seasons={[]}
        snapshots={[]}
        currentSeasonId=""
        livePlayerStats={[]}
        loading={false}
        error=""
        onViewSeason={vi.fn()}
      />
    );

    expect(screen.getByText(/Career stats appear once games are played/i)).toBeInTheDocument();
  });
});
