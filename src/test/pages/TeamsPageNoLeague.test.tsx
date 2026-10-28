import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import TeamsPage from "@/app/teams/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/teams",
}));

vi.mock("@/lib/pageGuide", () => ({ usePageGuide: vi.fn() }));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn(async () => ({ docs: [] })),
  updateDoc: vi.fn(),
  doc: vi.fn(),
  query: vi.fn((q) => q),
  where: vi.fn(),
  limit: vi.fn(),
}));

const mockGetCachedLeagueTeams = vi.hoisted(() => vi.fn(async () => [
  { id: "real_team_1", name: "Real Titans", shortcode: "RT", leagueId: "league_x" },
]));
vi.mock("@/lib/leagueDataCache", () => ({
  getCachedLeagueTeams: mockGetCachedLeagueTeams,
  getCachedLeaguePlayers: vi.fn(async () => []),
  getCachedLeagueMatches: vi.fn(async () => []),
  getCachedLeaguePlays: vi.fn(async () => []),
  notifyDataChanged: vi.fn(),
}));

vi.mock("@/lib/secureWrites", () => ({ createSecureRecord: vi.fn() }));

vi.mock("@/lib/authContext", () => ({
  useAuth: () => ({
    isAdmin: false,
    isLeagueAdmin: false,
    isPlatformAdmin: false,
    isTeamAdmin: () => false,
    playerTeamId: null,
    userProfile: null,
    canManageTeam: () => false,
    canRegisterAsPlayer: true,
  }),
}));

const mockLeague = vi.hoisted(() => ({
  portalLeagueId: null as string | null,
  userLeagues: [
    { id: "default", name: "FlagOS Demo League", shortcode: "DEMO", role: "member" as const },
    { id: "league_x", name: "My Real League", shortcode: "MRL", role: "owner" as const },
  ],
}));
vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({
    settings: { leagueName: "FlagOS League", rules: {} },
    // Mirror the real context: the URL's ?league= or the portal picks the league; "default" is the demo.
    ...((): { isDemoLeague: boolean; activeLeagueId: string } => {
      const linked = new URLSearchParams(window.location.search).get("league");
      const active = mockLeague.portalLeagueId || linked || "default";
      return { isDemoLeague: active === "default", activeLeagueId: active };
    })(),
    portalLeagueId: mockLeague.portalLeagueId,
    userLeagues: mockLeague.userLeagues,
    subscription: null,
    updateSubscriptionTeamCount: vi.fn(),
    addTeamToSubscription: vi.fn(),
    removeTeamFromSubscription: vi.fn(),
    openCustomizer: vi.fn(),
  }),
}));

vi.mock("@/lib/usePrivateLeagueAccess", () => ({
  usePrivateLeagueAccess: () => ({ isDenied: false, deniedElement: null }),
}));

vi.mock("@/lib/demoSandbox", () => ({
  getSandboxTeams: () => [{ id: "team_kc", name: "Demo Chiefs", shortcode: "KC" }],
  addSandboxTeam: vi.fn(),
  updateSandboxTeam: vi.fn(),
  deleteSandboxTeam: vi.fn(),
  getSandboxPlayers: () => [],
  addSandboxPlayer: vi.fn(),
  updateSandboxPlayer: vi.fn(),
  deleteSandboxPlayer: vi.fn(),
  getSandboxMatches: () => [],
  getSandboxPlays: () => [],
  subscribeDemoSandbox: () => () => {},
}));

const renderPage = async () => {
  await act(async () => {
    render(<TeamsPage />);
  });
};

describe("TeamsPage league selection gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLeague.portalLeagueId = null;
    delete (window as any).location;
    window.location = new URL("http://localhost:3000/teams") as any;
  });

  it("shows a league picker instead of the demo league when no league is selected", async () => {
    await renderPage();
    expect(screen.getByText("Choose a League")).toBeInTheDocument();
    expect(screen.queryByText("Demo Chiefs")).not.toBeInTheDocument();
    expect(mockGetCachedLeagueTeams).not.toHaveBeenCalled();
  });

  it("the picker lists the account's real leagues and never the demo league", async () => {
    await renderPage();
    const link = screen.getByRole("link", { name: /My Real League/ });
    expect(link).toHaveAttribute("href", "/teams?league=league_x");
    expect(screen.queryByRole("link", { name: /FlagOS Demo League/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Find a League/ })).toHaveAttribute("href", "/leagues");
  });

  it("shows the demo league only when the demo portal is actively being browsed", async () => {
    mockLeague.portalLeagueId = "default";
    await renderPage();
    expect(screen.queryByText("Choose a League")).not.toBeInTheDocument();
  });

  it("loads the league named in the URL instead of the picker", async () => {
    window.location = new URL("http://localhost:3000/teams?league=league_x") as any;
    await renderPage();
    expect(screen.queryByText("Choose a League")).not.toBeInTheDocument();
    expect(mockGetCachedLeagueTeams).toHaveBeenCalledWith("league_x");
  });
});
