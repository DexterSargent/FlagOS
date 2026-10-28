import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LeagueAdminView, type LeagueAdminViewProps } from "@/components/league/dashboard/LeagueAdminView";
import { useLeague } from "@/lib/leagueContext";

vi.mock("@/lib/leagueContext", () => ({
  useLeague: vi.fn(() => ({ isLeagueArchived: false })),
  leagueScheduleHref: (leagueId?: string | null) => (leagueId ? `/schedule?league=${leagueId}` : "/schedule"),
}));
vi.mock("@/components/walkthrough/PageGuideButton", () => ({ default: () => null }));
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

  it("displays private league badge and copies direct URL to clipboard", async () => {
    const input = props(false);
    input.settings = { visibility: "private" };
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextSpy },
    });

    render(<LeagueAdminView {...input} />);

    expect(screen.getByText(/Private League:/i)).toBeInTheDocument();
    const copyBtn = screen.getByRole("button", { name: /Copy Direct URL/i });
    fireEvent.click(copyBtn);

    expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining("/league/default"));
    expect(screen.getByText("Copied Direct Link!")).toBeInTheDocument();
  });

  it("handles archived league state and complimentary subscription", () => {
    vi.mocked(useLeague).mockReturnValueOnce({ isLeagueArchived: true } as any);
    const input = props(false);
    input.subscription = { paymentMethod: "complimentary", teamCount: 12 };
    input.topScorer = { name: "-", totalTD: 0, team: "" };

    render(<LeagueAdminView {...input} />);

    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.getByText("View Teams")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Schedule Game/i })).not.toBeInTheDocument();
    expect(screen.getByText("No stats recorded")).toBeInTheDocument();
    expect(screen.getByText("0 Total TDs (No team)")).toBeInTheDocument();
  });
});

