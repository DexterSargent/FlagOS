import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GameTeamStats from "@/components/match/GameTeamStats";
import { TEAM_STAT_DEFINITIONS } from "@/lib/teamStatsCalculator";

describe("GameTeamStats Component", () => {
  const mockMatchData = {
    id: "match_game_123",
    homeTeamId: "team_titans",
    awayTeamId: "team_spartans",
    homeTeamName: "Titans",
    awayTeamName: "Spartans",
    homeScore: 26,
    awayScore: 18,
    status: "completed",
  };

  const mockPlays = [
    // 3rd down conversion for Titans
    {
      id: "p1",
      matchId: "match_game_123",
      possessionTeamId: "team_titans",
      down: 3,
      playType: "Pass",
      passOutcome: "Complete",
      firstDown: true,
      result: "First Down",
    },
    // Touchdown for Titans
    {
      id: "p2",
      matchId: "match_game_123",
      possessionTeamId: "team_titans",
      down: 1,
      playType: "Pass",
      passOutcome: "Complete",
      isTouchdown: true,
      result: "Touchdown",
      conversionAttempt: 1,
      conversionSuccess: true,
    },
    // Sack by Spartans defense
    {
      id: "p3",
      matchId: "match_game_123",
      possessionTeamId: "team_titans",
      down: 2,
      playType: "Pass",
      passOutcome: "Sack",
      result: "Sack",
      defenders: ["Spartan Rusher"],
    },
    // Spartans possession: 4th down conversion
    {
      id: "p4",
      matchId: "match_game_123",
      possessionTeamId: "team_spartans",
      down: 4,
      playType: "Run",
      firstDown: true,
      result: "First Down",
    },
    // Spartans possession: Interception by Titans
    {
      id: "p5",
      matchId: "match_game_123",
      possessionTeamId: "team_spartans",
      down: 1,
      playType: "Pass",
      passOutcome: "Interception",
      result: "Turnover",
      defenders: ["Titan DB"],
    },
  ];

  it("renders match summary with scores and head-to-head comparison by default", () => {
    render(<GameTeamStats matchData={mockMatchData} plays={mockPlays} isDemo={true} />);

    expect(screen.getByTestId("game-team-stats")).toBeInTheDocument();
    expect(screen.getAllByText("Titans").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Spartans").length).toBeGreaterThan(0);
    expect(screen.getAllByText("26").length).toBeGreaterThan(0);
    expect(screen.getAllByText("18").length).toBeGreaterThan(0);

    expect(screen.getByTestId("team-stats-view-comparison")).toBeInTheDocument();
    expect(screen.getByTestId("team-stats-view-home")).toBeInTheDocument();
    expect(screen.getByTestId("team-stats-view-away")).toBeInTheDocument();

    // Verify key comparative stat rows appear
    expect(screen.getByTestId("comparison-row-firstDowns")).toBeInTheDocument();
    expect(screen.getByTestId("comparison-row-thirdDownPct")).toBeInTheDocument();
    expect(screen.getByTestId("comparison-row-sacks")).toBeInTheDocument();
    expect(screen.getByTestId("comparison-row-interceptions")).toBeInTheDocument();
    expect(screen.getByTestId("comparison-row-turnoverDiff")).toBeInTheDocument();
  });

  it("switches to individual team breakdown matching the team dashboard card layout", () => {
    render(<GameTeamStats matchData={mockMatchData} plays={mockPlays} isDemo={true} />);

    // Switch to Titans breakdown
    fireEvent.click(screen.getByTestId("team-stats-view-home"));

    expect(screen.getByTestId("team-stats-view-home")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("region", { name: "Titans Scoring" })).toBeInTheDocument();
    // In breakdown view, cards are displayed for each stat definition
    expect(screen.getByTestId("stat-card-firstDowns")).toBeInTheDocument();
    expect(screen.getByTestId("stat-card-thirdDownPct")).toBeInTheDocument();
    expect(screen.getByTestId("stat-card-totalTDs")).toBeInTheDocument();

    // Switch to Spartans breakdown
    fireEvent.click(screen.getByTestId("team-stats-view-away"));

    expect(screen.getByTestId("team-stats-view-away")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("region", { name: "Spartans Defense" })).toBeInTheDocument();
    expect(screen.getByTestId("stat-card-fourthDownPct")).toBeInTheDocument();
  });

  it("filters metrics by category tabs", () => {
    render(<GameTeamStats matchData={mockMatchData} plays={mockPlays} isDemo={true} />);

    // Filter to Defense only
    fireEvent.click(screen.getByTestId("category-filter-defense"));

    expect(screen.getByTestId("comparison-row-sacks")).toBeInTheDocument();
    expect(screen.getByTestId("comparison-row-interceptions")).toBeInTheDocument();
    expect(screen.queryByTestId("comparison-row-passAttempts")).toBeNull();

    // Filter to Offense only
    fireEvent.click(screen.getByTestId("category-filter-offense"));

    expect(screen.getByTestId("comparison-row-totalTDs")).toBeInTheDocument();
    expect(screen.getByTestId("comparison-row-passAttempts")).toBeInTheDocument();
    expect(screen.queryByTestId("comparison-row-sacks")).toBeNull();

    // Reset to All Stats
    fireEvent.click(screen.getByTestId("category-filter-all"));
    expect(screen.getByTestId("comparison-row-sacks")).toBeInTheDocument();
    expect(screen.getByTestId("comparison-row-totalTDs")).toBeInTheDocument();
  });

  it("omits season-only aggregates like record, win % and per-game averages", () => {
    render(<GameTeamStats matchData={mockMatchData} plays={mockPlays} isDemo={true} />);

    for (const id of ["record", "winPct", "ppg", "dppg"]) {
      expect(screen.queryByTestId(`comparison-row-${id}`)).toBeNull();
    }
    expect(screen.queryByText(/win %/i)).toBeNull();

    fireEvent.click(screen.getByTestId("category-filter-record"));
    expect(screen.getByTestId("category-filter-record")).toHaveTextContent("Scoring");
    expect(screen.getByTestId("comparison-row-pf")).toBeInTheDocument();
    expect(screen.getByTestId("comparison-row-pa")).toBeInTheDocument();
    expect(screen.getByTestId("comparison-row-diff")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("team-stats-view-home"));
    expect(screen.queryByTestId("stat-card-winPct")).toBeNull();
    expect(screen.queryByTestId("stat-card-ppg")).toBeNull();
    expect(screen.getByTestId("stat-card-pf")).toBeInTheDocument();
  });
});
