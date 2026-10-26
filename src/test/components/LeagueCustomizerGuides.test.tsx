import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LeagueCustomizerContent from "@/components/LeagueCustomizerContent";
import { PageGuideProvider, useActivePageGuide, usePageGuide } from "@/lib/pageGuide";
import { LEAGUE_SETTINGS_GUIDES, LEAGUE_RULES_VIEW_GUIDE, ADMIN_CONSOLE_GUIDES, ADMIN_SANDBOX_GUIDE } from "@/lib/walkthroughs/admin";

const { league, auth } = vi.hoisted(() => ({
  league: {
    settings: { leagueName: "Test League", shortcode: "TEST", tagline: "Play flag", seasonTitle: "2026", logoUrl: "", primaryColor: "#112233", accentColor: "#445566", rules: { playersOnField: 5, periodType: "halves", periodsCount: 2, periodDurationMinutes: 20, halftimeDurationSeconds: 120, timeoutsPerTeam: 2, timeoutDurationSeconds: 60, timeoutsResetPerPeriod: true, downsPerSeries: 4, rushLineDistance: 7, playClockSeconds: 25, minRosterSize: 5, maxRosterSize: 15, enableFreeAgents: true } },
    isCustomizerOpen: true, activeLeagueId: "demo", isDemoLeague: true,
    closeCustomizer: vi.fn(), previewThemeColors: vi.fn(),
  },
  auth: { isLeagueAdmin: true, isPlayer: false, playerData: null },
}));
vi.mock("@/lib/leagueContext", () => ({ useLeague: () => league, DEFAULT_LEAGUE_RULES: league.settings.rules, IFAF_5V5_RULES: league.settings.rules }));
vi.mock("@/lib/authContext", () => ({ useAuth: () => auth }));
vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("@/lib/demoSandbox", () => ({ getSandboxTeams: () => [] }));

function ParentGuide() {
  usePageGuide(ADMIN_SANDBOX_GUIDE);
  const guide = useActivePageGuide();
  return <output data-testid="active-guide">{guide?.id}</output>;
}
function Fixture() {
  return <PageGuideProvider><ParentGuide /><LeagueCustomizerContent /></PageGuideProvider>;
}

describe("League Settings page guides", () => {
  beforeEach(() => {
    league.isCustomizerOpen = true;
    auth.isLeagueAdmin = true;
  });
  it("replaces the page guide for each tab and restores it when settings close", async () => {
    const view = render(<Fixture />);
    expect(screen.getByTestId("active-guide")).toHaveTextContent(LEAGUE_SETTINGS_GUIDES.branding.id);
    expect(screen.getByTestId("page-guide-button")).toBeInTheDocument();
    for (const [label, key] of [["League Rules", "rules"], ["Subscription & Teams", "subscription"], ["Season & Archival", "season"], ["League Branding", "branding"]] as const) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${label}$`) }));
      await waitFor(() => expect(screen.getByTestId("active-guide")).toHaveTextContent(LEAGUE_SETTINGS_GUIDES[key].id));
    }
    league.isCustomizerOpen = false;
    view.rerender(<Fixture />);
    await waitFor(() => expect(screen.getByTestId("active-guide")).toHaveTextContent(ADMIN_SANDBOX_GUIDE.id));
  });
  it("uses the read-only rules guide for non-commissioners", () => {
    auth.isLeagueAdmin = false;
    render(<Fixture />);
    expect(screen.getByTestId("active-guide")).toHaveTextContent(LEAGUE_RULES_VIEW_GUIDE.id);
    expect(screen.queryByRole("button", { name: /^League Branding$/ })).not.toBeInTheDocument();
  });
  it("keeps every guide overview-first, uniquely identified and readable", () => {
    for (const guide of [...Object.values(LEAGUE_SETTINGS_GUIDES), LEAGUE_RULES_VIEW_GUIDE, ...Object.values(ADMIN_CONSOLE_GUIDES), ADMIN_SANDBOX_GUIDE]) {
      expect(guide.steps[0].targetSelector).toBe("");
      expect(new Set(guide.steps.map((step) => step.id)).size).toBe(guide.steps.length);
      for (const step of guide.steps) expect(step.details?.length ?? 0).toBeLessThanOrEqual(8);
    }
  });

  it("covers every visible settings section in its tab guide", () => {
    const { container } = render(<Fixture />);
    for (const [label, key] of [["League Branding", "branding"], ["League Rules", "rules"], ["Subscription & Teams", "subscription"], ["Season & Archival", "season"]] as const) {
      fireEvent.click(screen.getByRole("button", { name: label }));
      const selectors = LEAGUE_SETTINGS_GUIDES[key].steps.map((step) => step.targetSelector);
      for (const section of container.querySelectorAll("[data-tour]")) {
        expect(selectors, `${key}: ${section.getAttribute("data-tour")}`).toContain(`[data-tour="${section.getAttribute("data-tour")}"]`);
      }
    }
  });

  it("explains all three privacy choices and the difference between links and membership", () => {
    const privacy = LEAGUE_SETTINGS_GUIDES.branding.steps.find((step) => step.id === "settings-privacy")!;
    expect(privacy.details?.map((detail) => detail.label)).toEqual(expect.arrayContaining([
      "Listed Publicly", "Unlisted (Link Only)", "Private (Members Only)",
    ]));
    expect(privacy.details?.find((detail) => detail.label === "Private (Members Only)")?.text).toMatch(/does not grant membership/);
  });
});
