import { lazy, Suspense, type ComponentType } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LeagueCustomizerModal from "@/components/LeagueCustomizerModal";
import RoleSwitcherBar from "@/components/RoleSwitcherBar";

const mocks = vi.hoisted(() => ({
  pathname: "/teams/york_lions",
  league: { isDemoLeague: true, isCustomizerOpen: false },
  user: null as { email: string } | null,
  customizerImported: vi.fn(),
  roleImported: vi.fn(),
}));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("@/lib/leagueContext", () => ({ useLeague: () => mocks.league }));
vi.mock("@/lib/authContext", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<{ default: ComponentType<Record<string, unknown>> }>) => {
    const Content = lazy(loader);
    return function DynamicContent(props: Record<string, unknown>) {
      return <Suspense fallback={null}><Content {...props} /></Suspense>;
    };
  },
}));
vi.mock("@/components/LeagueCustomizerContent", () => {
  mocks.customizerImported();
  return { default: () => <div>Customizer content</div> };
});
vi.mock("@/components/RoleSwitcherContent", () => {
  mocks.roleImported();
  return { default: () => <div>Role switcher content</div> };
});

describe("Optional startup UI boundaries", () => {
  beforeEach(() => {
    mocks.pathname = "/teams/york_lions";
    mocks.user = null;
    mocks.league = { isDemoLeague: true, isCustomizerOpen: false };
  });

  it("does not import the customizer before it is opened", async () => {
    const view = render(<LeagueCustomizerModal />);
    expect(mocks.customizerImported).not.toHaveBeenCalled();
    mocks.league.isCustomizerOpen = true;
    view.rerender(<LeagueCustomizerModal />);
    expect(await screen.findByText("Customizer content")).toBeInTheDocument();
    mocks.league.isCustomizerOpen = false;
    view.rerender(<LeagueCustomizerModal />);
    expect(screen.queryByText("Customizer content")).not.toBeInTheDocument();
  });

  it("never imports role controls on York/customer pages, including for the owner on York", async () => {
    const view = render(<RoleSwitcherBar />);
    expect(mocks.roleImported).not.toHaveBeenCalled();
    mocks.user = { email: "dextersargent@gmail.com" };
    view.rerender(<RoleSwitcherBar />);
    expect(mocks.roleImported).not.toHaveBeenCalled();
    mocks.user = null;
    mocks.pathname = "/teams/customer-team";
    view.rerender(<RoleSwitcherBar />);
    expect(mocks.roleImported).not.toHaveBeenCalled();
    mocks.pathname = "/matches/match_york_waterloo";
    view.rerender(<RoleSwitcherBar />);
    expect(mocks.roleImported).not.toHaveBeenCalled();
    mocks.pathname = "/league/default";
    view.rerender(<RoleSwitcherBar />);
    expect(await screen.findByText("Role switcher content")).toBeInTheDocument();
    expect(mocks.roleImported).toHaveBeenCalledOnce();
  });
});
