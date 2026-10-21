import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AuthGuard from "@/components/AuthGuard";

const state = vi.hoisted(() => ({ pathname: "/teams/york_lions", loading: true, demo: false, push: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => state.pathname,
  useRouter: () => ({ push: state.push }),
}));
vi.mock("@/lib/authContext", () => ({
  useAuth: () => ({ user: null, isPlayer: false, isAuthorized: false, loading: state.loading, logout: vi.fn() }),
}));
vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({ isDemoLeague: state.demo, activeLeagueId: state.demo ? "default" : "" }),
}));

describe("independent York public route startup", () => {
  beforeEach(() => {
    state.loading = true;
    state.demo = false;
    state.push.mockClear();
  });

  it.each(["/teams/york_lions", "/teams/york/roster", "/teams/team_york/schedule", "/teams/york_lions/stats", "/teams/york_lions/matches/game/stat-keeper"])(
    "renders %s without waiting for auth or a selected league",
    (pathname) => {
      state.pathname = pathname;
      render(<AuthGuard><p>Public York content</p></AuthGuard>);
      expect(screen.getByText("Public York content")).toBeInTheDocument();
      expect(state.push).not.toHaveBeenCalled();
    },
  );

  it("keeps the private playbook guarded even when a demo league was previously selected", () => {
    state.pathname = "/teams/york_lions/playbook";
    state.demo = true;
    state.loading = false;
    sessionStorage.setItem("flagos_demo_active", "true");
    render(<AuthGuard><p>Private playbook</p></AuthGuard>);
    expect(screen.queryByText("Private playbook")).not.toBeInTheDocument();
    expect(state.push).toHaveBeenCalledWith("/login?redirect=%2Fteams%2Fyork_lions%2Fplaybook");
  });

  it("does not make another team's real portal public", () => {
    state.pathname = "/teams/private-team";
    state.loading = false;
    render(<AuthGuard><p>Other team</p></AuthGuard>);
    expect(screen.queryByText("Other team")).not.toBeInTheDocument();
    expect(state.push).toHaveBeenCalled();
  });
});
