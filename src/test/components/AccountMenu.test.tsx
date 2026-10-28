import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AccountMenu from "@/components/AccountMenu";
import * as authContext from "@/lib/authContext";
import * as leagueContext from "@/lib/leagueContext";

let mockPathname = "/schedule";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("@/lib/authContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/leagueContext", () => ({
  useLeague: vi.fn(),
}));

describe("AccountMenu", () => {
  const mockLogout = vi.fn();
  const mockOpenCustomizer = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/schedule";
    (leagueContext.useLeague as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      openCustomizer: mockOpenCustomizer,
      activeLeagueId: "league_1",
      portalLeagueId: null,
    });
  });

  it("renders Sign In link when user is signed out, and null when on /login", () => {
    (authContext.useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
    });

    const { rerender } = render(<AccountMenu />);
    const signInLink = screen.getByRole("link", { name: /Sign in/i });
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveAttribute("href", "/login?redirect=%2Fschedule");

    mockPathname = "/login";
    rerender(<AccountMenu />);
    expect(screen.queryByRole("link", { name: /Sign in/i })).not.toBeInTheDocument();
  });

  it("renders avatar button and dropdown menu when signed in, and handles actions", () => {
    (authContext.useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { displayName: "Coach Taylor", email: "taylor@dillon.com" },
      userProfile: { playerRecords: [] },
      isPlayer: true,
      playerId: "p_taylor",
      playerData: { playerName: "Coach Taylor" },
      playerTeamId: "team_panthers",
      managedTeamId: "team_panthers",
      isLeagueAdmin: true,
      isPlatformAdmin: true,
      isAuthorized: true,
      logout: mockLogout,
    });

    render(<AccountMenu />);

    // Initial is 'C'
    const menuBtn = screen.getByRole("button", { name: /Account menu for Coach Taylor/i });
    expect(menuBtn).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();

    // Open dropdown
    fireEvent.click(menuBtn);
    expect(screen.getByRole("menu", { name: "Account" })).toBeInTheDocument();
    expect(screen.getByText("Coach Taylor")).toBeInTheDocument();
    expect(screen.getByText("taylor@dillon.com")).toBeInTheDocument();

    // Verify navigation links
    expect(screen.getByRole("menuitem", { name: /My Profile/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /My Team/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Account Settings/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Platform Admin/i })).toBeInTheDocument();

    // Click League Settings
    const leagueSettingsBtn = screen.getByRole("menuitem", { name: /League Settings/i });
    fireEvent.click(leagueSettingsBtn);
    expect(mockOpenCustomizer).toHaveBeenCalled();

    // Reopen menu and click Sign Out
    fireEvent.click(menuBtn);
    const signOutBtn = screen.getByRole("menuitem", { name: /Sign Out/i });
    fireEvent.click(signOutBtn);
    expect(mockLogout).toHaveBeenCalled();
  });

  it("closes dropdown menu on Escape key press", () => {
    (authContext.useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { displayName: "Alex", email: "alex@flagos.com" },
      logout: mockLogout,
    });

    render(<AccountMenu />);
    const menuBtn = screen.getByRole("button", { name: /Account menu for Alex/i });
    fireEvent.click(menuBtn);
    expect(screen.getByRole("menu", { name: "Account" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Account" })).not.toBeInTheDocument();
  });
});
