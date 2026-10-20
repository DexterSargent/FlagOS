import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PlayoffBracketView from "@/components/schedule/PlayoffBracketView";
import { generatePlayoffBracket, type TeamStanding } from "@/lib/standingsEngine";

const standings: TeamStanding[] = Array.from({ length: 8 }, (_, index) => ({
  teamId: `team_${index}`, teamName: `Team ${index}`, rank: index + 1,
  gamesPlayed: 10, wins: 8 - index, losses: index + 2, ties: 0, winPct: (8 - index) / 10,
  pointsFor: 100, pointsAgainst: 80, diff: 20, streak: "W1", playoffStatus: "in_spot",
}));

describe("playoff bracket connectors", () => {
  it("tracks actual feeder IDs through single elimination, including byes", () => {
    const rounds = generatePlayoffBracket(standings.slice(0, 6), { teamsCount: 6, structure: "single_elimination" });
    const ids = new Set(rounds.flatMap((round) => round.matches.map((node) => node.id)));
    const sources = rounds.flatMap((round) => round.matches.flatMap((node) => [node.homeSource, node.awaySource].filter(Boolean)));
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) expect(ids.has(source!.matchId)).toBe(true);
    const semifinal = rounds.find((round) => round.matches.some((node) => node.homeTeam?.rank === 1));
    expect(semifinal).toBeDefined();
  });

  it.each(["single_elimination", "double_elimination"] as const)("draws visible paths for %s instead of disconnected cards", (structure) => {
    const format = { teamsCount: 8, structure };
    const rounds = generatePlayoffBracket(standings, format);
    const view = render(<PlayoffBracketView standings={standings} bracketRounds={rounds} format={format} isPlayoffActive={false} />);
    const svgs = screen.getAllByTestId("bracket-connectors");
    expect(svgs.length).toBe(structure === "single_elimination" ? 1 : 3);
    expect(view.container.querySelectorAll("[data-bracket-match]").length).toBe(rounds.flatMap((round) => round.matches).length);
    expect(view.container.querySelectorAll("svg[data-testid='bracket-connectors'] path").length).toBeGreaterThan(0);
    if (structure === "double_elimination") {
      expect(rounds.some((round) => round.matches.some((node) => node.homeSource?.result === "loser"))).toBe(true);
      expect(view.container.querySelector('path[stroke-dasharray="5 4"]')).toBeInTheDocument();
    }
  });
});
