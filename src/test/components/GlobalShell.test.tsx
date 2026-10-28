import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { lazy, Suspense, type ComponentType } from "react";
import GlobalShell from "@/components/GlobalShell";

const { usePathnameMock, useSearchParamsMock, mockUseAuth, mockUseLeague } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
  mockUseAuth: vi.fn(),
  mockUseLeague: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock("@/lib/authContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => mockUseLeague(),
}));

vi.mock("@/components/LeagueHeader", () => ({
  default: () => <header>League Header</header>,
}));

vi.mock("@/components/LeagueFooter", () => ({
  default: () => <footer>League Footer</footer>,
}));
vi.mock("@/components/SiteHeader", () => ({
  default: () => <header>Site Header</header>,
}));
vi.mock("@/components/PoweredByFooter", () => ({
  default: () => <footer>Powered by FlagOS</footer>,
}));
vi.mock("@/components/RoleSwitcherBar", () => ({ default: () => null }));
vi.mock("@/components/LeagueCustomizerModal", () => ({ default: () => null }));
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<{ default: ComponentType }>) => {
    const Content = lazy(loader);
    return function DynamicContent() {
      return <Suspense fallback={null}><Content /></Suspense>;
    };
  },
}));

describe("GlobalShell", () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue("/");
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    mockUseAuth.mockReturnValue({
      role: "user",
      isLeagueAdmin: false,
      isPlatformAdmin: false,
      managedTeamId: null,
      playerTeamId: null,
    });
    // Default: a league portal is being browsed.
    mockUseLeague.mockReturnValue({ portalLeagueId: "league_x" });
  });

  it("omits the league header from the public landing page", () => {
    render(
      <GlobalShell>
        <div>Landing content</div>
      </GlobalShell>
    );

    expect(screen.getByText("Landing content")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
    expect(screen.queryByText("League Header")).not.toBeInTheDocument();
  });

  it("omits the league header and footer from the pricing page", () => {
    usePathnameMock.mockReturnValue("/pricing");

    render(
      <GlobalShell>
        <div>Pricing content</div>
      </GlobalShell>
    );

    expect(screen.getByText("Pricing content")).toBeInTheDocument();
    expect(screen.queryByText("League Header")).not.toBeInTheDocument();
    expect(screen.queryByText("League Footer")).not.toBeInTheDocument();
  });

  it("omits the league header and footer when viewing an individual team portal", () => {
    usePathnameMock.mockReturnValue("/teams/york_lions");

    render(
      <GlobalShell>
        <div>York Lions Portal</div>
      </GlobalShell>
    );

    expect(screen.getByText("York Lions Portal")).toBeInTheDocument();
    expect(screen.queryByText("League Header")).not.toBeInTheDocument();
    expect(screen.queryByText("League Footer")).not.toBeInTheDocument();
  });

  it.each([
    ["coach/team admin", { role: "team_admin", managedTeamId: "york_lions", playerTeamId: null }],
    ["rostered player", { role: "player", managedTeamId: null, playerTeamId: "york_lions" }],
  ])("keeps the league header and footer on league pages for a %s", async (_label, auth) => {
    usePathnameMock.mockReturnValue("/schedule");
    mockUseAuth.mockReturnValue({ isLeagueAdmin: false, isPlatformAdmin: false, ...auth });

    render(
      <GlobalShell>
        <div>Schedule content</div>
      </GlobalShell>
    );

    expect(await screen.findByText("League Header")).toBeInTheDocument();
    expect(screen.getByText("League Footer")).toBeInTheDocument();
    expect(screen.queryByText("Site Header")).not.toBeInTheDocument();
  });

  it("keeps the league header and footer when actively in a specific league", async () => {
    usePathnameMock.mockReturnValue("/league/default");

    render(
      <GlobalShell>
        <div>League Dashboard</div>
      </GlobalShell>
    );

    expect(await screen.findByText("League Header")).toBeInTheDocument();
    expect(screen.getByText("League Footer")).toBeInTheDocument();
  });

  it("uses the site chrome instead of league nav on a league directory page with no league selected", async () => {
    usePathnameMock.mockReturnValue("/teams");
    mockUseLeague.mockReturnValue({ portalLeagueId: null });

    render(
      <GlobalShell>
        <div>Pick a league</div>
      </GlobalShell>
    );

    expect(await screen.findByText("Site Header")).toBeInTheDocument();
    expect(screen.queryByText("League Header")).not.toBeInTheDocument();
    expect(screen.queryByText("League Footer")).not.toBeInTheDocument();
  });

  it("keeps the league header on league schedule page for non-team users", async () => {
    usePathnameMock.mockReturnValue("/schedule");

    render(
      <GlobalShell>
        <div>Schedule content</div>
      </GlobalShell>
    );

    expect(await screen.findByText("League Header")).toBeInTheDocument();
    expect(screen.getByText("League Footer")).toBeInTheDocument();
  });

  it.each(["/profile", "/account", "/login", "/admin", "/leagues"])(
    "gives %s the site header and Powered by FlagOS footer",
    async (path) => {
      usePathnameMock.mockReturnValue(path);

      render(
        <GlobalShell>
          <div>Page content</div>
        </GlobalShell>
      );

      expect(await screen.findByText("Site Header")).toBeInTheDocument();
      expect(screen.getByText("Powered by FlagOS")).toBeInTheDocument();
      expect(screen.queryByText("League Header")).not.toBeInTheDocument();
    }
  );

  it.each(["/", "/pricing", "/teams/york_lions/playbook", "/matches/m1/play-by-play"])(
    "leaves %s to render its own header and footer",
    (path) => {
      usePathnameMock.mockReturnValue(path);

      render(
        <GlobalShell>
          <div>Page content</div>
        </GlobalShell>
      );

      expect(screen.queryByText("Site Header")).not.toBeInTheDocument();
      expect(screen.queryByText("Powered by FlagOS")).not.toBeInTheDocument();
      expect(screen.queryByText("League Header")).not.toBeInTheDocument();
    }
  );
});
