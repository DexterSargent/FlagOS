import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LeagueAdminView, type LeagueAdminViewProps } from "@/components/league/dashboard/LeagueAdminView";

vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({ isLeagueArchived: false }),
}));
vi.mock("@/components/walkthrough/WalkthroughTrigger", () => ({ default: () => null }));
vi.mock("@/components/league/dashboard/LeagueScheduleWidget", () => ({ LeagueScheduleWidget: () => null }));
vi.mock("@/components/league/dashboard/LeagueStandingsWidget", () => ({ LeagueStandingsWidget: () => null }));
vi.mock("@/components/league/dashboard/LeagueLeadersWidget", () => ({ LeagueLeadersWidget: () => null }));
vi.mock("@/components/league/dashboard/LeagueTeamsGrid", () => ({ LeagueTeamsGrid: () => null }));

function props(isEffectiveDemo: boolean): LeagueAdminViewProps {
  return {
    teams: Array.from({ length: 32 }, (_, i) => ({ id: `team-${i}` })),
    matches: Array.from({ length: 272 }, (_, i) => ({ id: `match-${i}` })),
    completedMatches: Array.from({ length: 250 }, (_, i) => ({ id: `match-${i}` })),
    players: [],
    standingsMap: {},
    sortedStandings: [],
    liveMatches: [],
    liveAndUpcomingGames: [],
    topPasser: null,
    topReceiver: null,
    topScorer: { name: "Jaylen Warren", totalTD: 39, team: "Pittsburgh" },
    topFlagger: null,
    subscription: { totalMonthlyFee: 89, teamCount: 8 },
    settings: {},
    activeLeagueId: "default",
    isEffectiveDemo,
    openCustomizer: vi.fn(),
  };
}

describe("League admin overview", () => {
  it("labels sandbox teams without implying they use paid subscription slots", () => {
    const input = props(true);
    const { container } = render(<LeagueAdminView {...input} />);
    const kpis = within(container.querySelector<HTMLElement>('[data-tour="league-kpis"]')!);
    expect(kpis.getByText("Sandbox")).toBeInTheDocument();
    expect(kpis.getByText("Demo Teams")).toBeInTheDocument();
    expect(kpis.queryByText(/Paid|\$89/)).not.toBeInTheDocument();
    expect(kpis.getByText("250 / 272")).toHaveClass("whitespace-nowrap");
    expect(kpis.getByText("Jaylen Warren")).not.toHaveClass("truncate");
    fireEvent.click(screen.getByRole("button", { name: "Demo Settings" }));
    expect(input.openCustomizer).toHaveBeenCalledOnce();
  });

  it("preserves billing information and settings access for real leagues", () => {
    const input = props(false);
    render(<LeagueAdminView {...input} />);
    expect(screen.getByText("$89/mo")).toBeInTheDocument();
    expect(screen.getByText("/ 8 Paid")).toBeInTheDocument();
    expect(screen.queryByText("Sandbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "League Settings" }));
    expect(input.openCustomizer).toHaveBeenCalledOnce();
  });
});
