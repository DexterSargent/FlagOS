import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import SignedInHome from "@/components/home/SignedInHome";
import type { Memberships, MembershipGame, TeamMembership } from "@/lib/useMyMemberships";

const mockUseAuth = vi.fn();
const mockUseMemberships = vi.fn();

vi.mock("@/lib/authContext", () => ({ useAuth: () => mockUseAuth() }));
vi.mock("@/lib/useMyMemberships", () => ({ useMyMemberships: () => mockUseMemberships() }));
vi.mock("@/components/SiteHeader", () => ({ default: () => <header>site header</header> }));
vi.mock("@/components/PoweredByFooter", () => ({ default: () => <footer>powered by FlagOS</footer> }));
vi.mock("@/components/TeamAssets", () => ({ TeamLogo: ({ teamName }: { teamName: string }) => <span>{teamName} logo</span> }));

function game(overrides: Partial<MembershipGame>): MembershipGame {
  return {
    id: "g",
    date: "2099-01-01",
    time: "18:00",
    status: "scheduled",
    location: "",
    homeTeamId: "",
    awayTeamId: "",
    homeTeamName: "",
    awayTeamName: "",
    homeScore: null,
    awayScore: null,
    ...overrides,
  };
}

function team(overrides: Partial<TeamMembership>): TeamMembership {
  return {
    id: "t",
    name: "Team",
    shortcode: "",
    leagueId: "",
    logoUrl: "",
    primaryColor: "#123456",
    roles: [],
    player: null,
    nextGame: null,
    lastGame: null,
    ...overrides,
  };
}

const memberships: Memberships = {
  leagues: [
    {
      id: "league_play",
      name: "Sunday Social",
      shortcode: "SUN",
      seasonTitle: "Fall 2026",
      logoUrl: "",
      primaryColor: "#111111",
      accentColor: "#222222",
      visibility: "public",
      isCommissioner: false,
      teams: [
        team({
          id: "sharks",
          name: "Sharks",
          leagueId: "league_play",
          roles: ["player"],
          player: { id: "p1", name: "Dexter Sargent", number: "12" },
          nextGame: game({ id: "g_sharks", date: "2099-03-01", homeTeamId: "sharks", awayTeamId: "jets", homeTeamName: "Sharks", awayTeamName: "Jets" }),
        }),
      ],
    },
    {
      id: "league_run",
      name: "Metro Flag",
      shortcode: "MET",
      seasonTitle: "",
      logoUrl: "",
      primaryColor: "#333333",
      accentColor: "#444444",
      visibility: "private",
      isCommissioner: true,
      teams: [],
    },
  ],
  independentTeams: [
    team({
      id: "york_lions",
      name: "York Lions",
      roles: ["coach"],
      nextGame: game({
        id: "g_live",
        status: "in_progress",
        liveHeartbeatAt: Date.now(),
        date: "2099-12-31",
        homeTeamId: "york_lions",
        awayTeamId: "carleton",
        homeTeamName: "York Lions",
        awayTeamName: "Carleton",
        homeScore: 14,
        awayScore: 7,
      }),
      lastGame: game({
        id: "g_final",
        status: "completed",
        homeTeamId: "ottawa",
        awayTeamId: "york_lions",
        homeTeamName: "Ottawa",
        awayTeamName: "York Lions",
        homeScore: 20,
        awayScore: 21,
      }),
    }),
  ],
};

describe("SignedInHome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { uid: "dexter", displayName: "Dexter Sargent" },
      userProfile: null,
      playerData: null,
      isPlatformAdmin: false,
    });
    mockUseMemberships.mockReturnValue({ data: memberships, loading: false, refreshing: false, error: "", retry: vi.fn() });
  });

  it("greets the member and summarizes roles across leagues and teams", () => {
    render(<SignedInHome />);
    expect(screen.getByRole("heading", { name: "Welcome back, Dexter" })).toBeInTheDocument();
    expect(screen.getByText(/1 league you run · 1 team you coach · 1 team you play on/)).toBeInTheDocument();
    expect(screen.getByText("site header")).toBeInTheDocument();
    expect(screen.getByText("powered by FlagOS")).toBeInTheDocument();
  });

  it("shows roles per league: commissioner dashboard for one, player access for another", () => {
    render(<SignedInHome />);
    expect(screen.getByRole("link", { name: /Open League/ })).toHaveAttribute("href", "/league/league_run");
    expect(screen.getByRole("link", { name: /League Home/ })).toHaveAttribute("href", "/league/league_play");

    const sundayCard = screen.getByRole("heading", { name: "Sunday Social" }).closest("article")!;
    expect(within(sundayCard).getByText("Player · #12")).toBeInTheDocument();
    expect(within(sundayCard).queryByText("Commissioner")).toBeNull();
    expect(within(sundayCard).getByRole("link", { name: /My Stats/ })).toHaveAttribute("href", "/profile");
    expect(within(sundayCard).getByRole("link", { name: /^Roster$/ })).toHaveAttribute("href", "/teams/sharks/roster");

    const metroCard = screen.getByRole("heading", { name: "Metro Flag" }).closest("article")!;
    expect(within(metroCard).getByText("Commissioner")).toBeInTheDocument();
    expect(within(metroCard).getByText("Private")).toBeInTheDocument();
  });

  it("gives coaches of independent teams their management links and last result", () => {
    render(<SignedInHome />);
    const yorkCard = screen.getByText("Independent team").closest("article")!;
    expect(within(yorkCard).getByText("Coach")).toBeInTheDocument();
    expect(within(yorkCard).getByRole("link", { name: /Manage Roster/ })).toHaveAttribute("href", "/teams/york_lions/roster");
    expect(within(yorkCard).getByRole("link", { name: /Playbook/ })).toHaveAttribute("href", "/teams/york_lions/playbook");
    expect(within(yorkCard).getByRole("link", { name: /^Stats$/ })).toHaveAttribute("href", "/teams/york_lions/stats");
    expect(within(yorkCard).getByRole("link", { name: /Team hub/ })).toHaveAttribute("href", "/teams/york_lions");
    expect(within(yorkCard).getByRole("link", { name: "Last game: W 21-20 vs Ottawa" })).toBeInTheDocument();
  });

  it("lists live games first in Up next and routes each to the right place", () => {
    render(<SignedInHome />);
    const upNext = screen.getByRole("region", { name: "Up next" });
    const links = within(upNext).getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveTextContent("Live now");
    expect(links[0]).toHaveTextContent("14–7");
    expect(links[0]).toHaveAttribute("href", "/teams/york_lions/matches/g_live/stat-keeper");
    expect(links[1]).toHaveAttribute("href", "/matches/g_sharks");
  });

  it("shows a started game as paused once the scorekeeper has left the manager", () => {
    const york = memberships.independentTeams[0];
    const pausedGame = { ...york.nextGame!, liveHeartbeatAt: Date.now() - 10 * 60_000 };
    mockUseMemberships.mockReturnValue({
      data: { ...memberships, independentTeams: [{ ...york, nextGame: pausedGame }] },
      loading: false,
      refreshing: false,
      error: "",
      retry: vi.fn(),
    });
    render(<SignedInHome />);
    const links = within(screen.getByRole("region", { name: "Up next" })).getAllByRole("link");
    expect(links[0]).toHaveTextContent("Paused");
    expect(links[0]).not.toHaveTextContent("Live now");
    expect(links[0]).toHaveTextContent("14–7");
    expect(links[0]).toHaveTextContent("Resume stat keeper");
  });

  it("shows an empty state and emphasizes getting started when the account has no memberships", () => {
    mockUseMemberships.mockReturnValue({
      data: { leagues: [], independentTeams: [] },
      loading: false,
      refreshing: false,
      error: "",
      retry: vi.fn(),
    });
    render(<SignedInHome />);
    expect(screen.getByText("You're not on a league or team yet")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Get started" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Create a league/ })).toHaveAttribute("href", "/pricing");
    expect(screen.getByRole("link", { name: /Find a league/ })).toHaveAttribute("href", "/leagues");
  });

  it("keeps create options available below the member's leagues", () => {
    render(<SignedInHome />);
    expect(screen.getByRole("heading", { name: "Start something new" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Start a team/ })).toHaveAttribute("href", "/pricing");
  });

  it("offers a retry when memberships fail to load", () => {
    const retry = vi.fn();
    mockUseMemberships.mockReturnValue({ data: null, loading: false, refreshing: false, error: "Network down", retry });
    render(<SignedInHome />);
    screen.getByRole("button", { name: /Try again/ }).click();
    expect(retry).toHaveBeenCalled();
  });
});
