import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AuthGuard from "@/components/AuthGuard";

const state = vi.hoisted(() => ({ pathname: "/teams/falcons", loading: true, demo: false, push: vi.fn(), visibility: "public", resolved: true }));
vi.mock("next/navigation", () => ({
  usePathname: () => state.pathname,
  useRouter: () => ({ push: state.push }),
}));
vi.mock("@/lib/authContext", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/authContext")>(),
  useAuth: () => ({ user: null, isPlayer: false, isAuthorized: false, loading: state.loading, logout: vi.fn(), needsEmailVerification: false, identityLookupFailed: false }),
  useAccountAuth: () => ({ user: null, isPlayer: false, isAuthorized: false, loading: state.loading, logout: vi.fn(), needsEmailVerification: false, identityLookupFailed: false }),
}));
vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({ isDemoLeague: state.demo, activeLeagueId: state.demo ? "default" : "" }),
}));

vi.mock("@/lib/teamRecord", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/teamRecord")>(),
  useTeamRecord: () => ({ team: state.resolved ? { id: "falcons", visibility: state.visibility, subscription: { status: "active" } } : null, resolved: state.resolved }),
}));

describe("independent team public route startup", () => {
  beforeEach(() => {
    state.pathname = "/teams/falcons";
    state.loading = true;
    state.visibility = "public";
    state.resolved = true;
    state.demo = false;
    state.push.mockClear();
  });

  it.each(["/teams/falcons", "/teams/falcons/roster", "/teams/falcons/schedule", "/teams/falcons/stats", "/teams/falcons/matches/game/stat-keeper"])(
    "renders %s without waiting for auth or a selected league",
    (pathname) => {
      state.pathname = pathname;
      render(<AuthGuard><p>Public team content</p></AuthGuard>);
      expect(screen.getByText("Public team content")).toBeInTheDocument();
      expect(state.push).not.toHaveBeenCalled();
    },
  );

  it("waits for the stored team visibility before exposing content or redirecting", () => {
    state.loading = false;
    state.resolved = false;
    render(<AuthGuard><p>Public team content</p></AuthGuard>);
    expect(screen.queryByText("Public team content")).not.toBeInTheDocument();
    expect(screen.getByText("Verifying Authorization")).toBeInTheDocument();
    expect(state.push).not.toHaveBeenCalled();
  });

  it("keeps the private playbook guarded even when a demo league was previously selected", () => {
    state.pathname = "/teams/falcons/playbook";
    state.demo = true;
    state.loading = false;
    sessionStorage.setItem("flagos_demo_active", "true");
    render(<AuthGuard><p>Private playbook</p></AuthGuard>);
    expect(screen.queryByText("Private playbook")).not.toBeInTheDocument();
    expect(state.push).toHaveBeenCalledWith("/login?redirect=%2Fteams%2Ffalcons%2Fplaybook");
  });

  it("does not make another team's real portal public", () => {
    state.pathname = "/teams/private-team";
    state.visibility = "private";
    state.loading = false;
    render(<AuthGuard><p>Other team</p></AuthGuard>);
    expect(screen.queryByText("Other team")).not.toBeInTheDocument();
    expect(state.push).toHaveBeenCalled();
  });
});
