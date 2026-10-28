import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AuthGuard from "@/components/AuthGuard";

const state = vi.hoisted(() => ({
  pathname: "/teams/falcons",
  loading: true,
  demo: false,
  leagueId: "",
  user: null as null | { email: string },
  push: vi.fn(),
  visibility: "public",
  resolved: true,
  needsEmailVerification: false,
  identityLookupFailed: false,
  userProfile: null as any,
  isPlayer: false,
  isAuthorized: false,
  logout: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => state.pathname,
  useRouter: () => ({ push: state.push }),
}));
vi.mock("@/lib/authContext", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/authContext")>(),
  useAuth: () => ({
    user: state.user,
    isPlayer: state.isPlayer,
    isAuthorized: state.isAuthorized,
    loading: state.loading,
    logout: state.logout,
    needsEmailVerification: state.needsEmailVerification,
    identityLookupFailed: state.identityLookupFailed,
    userProfile: state.userProfile,
  }),
  useAccountAuth: () => ({
    user: state.user,
    isPlayer: state.isPlayer,
    isAuthorized: state.isAuthorized,
    loading: state.loading,
    logout: state.logout,
    needsEmailVerification: state.needsEmailVerification,
    identityLookupFailed: state.identityLookupFailed,
    userProfile: state.userProfile,
  }),
}));
vi.mock("@/lib/leagueContext", () => ({
  useLeague: () => ({ isDemoLeague: state.demo, activeLeagueId: state.demo ? "default" : state.leagueId }),
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
    state.leagueId = "";
    state.user = null;
    state.needsEmailVerification = false;
    state.identityLookupFailed = false;
    state.userProfile = null;
    state.isPlayer = false;
    state.isAuthorized = false;
    state.push.mockClear();
    state.logout.mockClear();
    sessionStorage.clear();
    localStorage.clear();
  });

  it("does not let a leftover demo flag unlock a real league's pages", () => {
    state.pathname = "/schedule";
    state.leagueId = "private-league";
    state.loading = false;
    localStorage.setItem("flagos_demo_active", "true");
    render(<AuthGuard><p>Private league schedule</p></AuthGuard>);
    expect(screen.queryByText("Private league schedule")).not.toBeInTheDocument();
    expect(state.push).toHaveBeenCalledWith("/login?redirect=%2Fschedule");
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

  it("lets a verified non-member reach a league-wide page so the page can apply league privacy", () => {
    state.pathname = "/join";
    state.leagueId = "public-league";
    state.loading = false;
    state.user = { email: "newplayer@example.com" };
    render(<AuthGuard><p>Join form</p></AuthGuard>);
    expect(screen.getByText("Join form")).toBeInTheDocument();
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

  it("renders email verification screen when password user has not verified email", () => {
    state.pathname = "/dashboard";
    state.loading = false;
    state.user = { email: "unverified@example.com" };
    state.isAuthorized = false;
    state.needsEmailVerification = true;
    render(<AuthGuard><p>Guarded dashboard</p></AuthGuard>);
    expect(screen.getByText("One more step")).toBeInTheDocument();
  });

  it("renders connection failure screen when identity lookup failed and allows reload", () => {
    const originalReload = window.location.reload;
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { reload: reloadMock },
      writable: true,
    });

    state.pathname = "/dashboard";
    state.loading = false;
    state.user = { email: "user@example.com" };
    state.isAuthorized = false;
    state.identityLookupFailed = true;

    render(<AuthGuard><p>Guarded dashboard</p></AuthGuard>);
    expect(screen.getByText("We couldn't confirm your access")).toBeInTheDocument();

    const tryAgainBtn = screen.getByRole("button", { name: /Try again/i });
    fireEvent.click(tryAgainBtn);
    expect(reloadMock).toHaveBeenCalled();

    window.location.reload = originalReload;
  });

  it("renders Access Restricted when unauthorized user has a role and handles sign-in with authorized account", () => {
    state.pathname = "/admin/settings";
    state.loading = false;
    state.user = { email: "coach@example.com" };
    state.isAuthorized = false;
    state.userProfile = { role: "coach" };

    render(<AuthGuard><p>Admin content</p></AuthGuard>);
    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.getByText("coach@example.com")).toBeInTheDocument();

    const switchBtn = screen.getByRole("button", { name: /Sign In With Authorized Account/i });
    fireEvent.click(switchBtn);
    expect(state.logout).toHaveBeenCalled();
  });

  it("renders No League Membership Yet when unauthorized user has no role", () => {
    state.pathname = "/admin/settings";
    state.loading = false;
    state.user = { email: "newcomer@example.com" };
    state.isAuthorized = false;
    state.userProfile = null;

    render(<AuthGuard><p>Admin content</p></AuthGuard>);
    expect(screen.getByText("No League Membership Yet")).toBeInTheDocument();
    expect(screen.getByText("Explore leagues")).toBeInTheDocument();
  });

  it("renders children directly when user is authenticated and authorized", () => {
    state.pathname = "/dashboard";
    state.loading = false;
    state.user = { email: "admin@flagos.ca" };
    state.isAuthorized = true;

    render(<AuthGuard><p>Authorized content</p></AuthGuard>);
    expect(screen.getByText("Authorized content")).toBeInTheDocument();
  });
});
