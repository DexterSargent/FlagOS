import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AccountMenu from "@/components/AccountMenu";

const { mockUseAuth, mockLogout, mockOpenCustomizer, usePathnameMock } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockLogout: vi.fn(),
  mockOpenCustomizer: vi.fn(),
  usePathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: usePathnameMock }));
vi.mock("@/lib/authContext", () => ({ useAuth: () => mockUseAuth() }));
vi.mock("@/lib/leagueContext", () => ({ useLeague: () => ({ openCustomizer: mockOpenCustomizer }) }));

const signedOut = {
  user: null,
  isPlayer: false,
  playerData: null,
  playerTeamId: null,
  managedTeamId: null,
  isLeagueAdmin: false,
  isPlatformAdmin: false,
  isAuthorized: false,
  logout: mockLogout,
};

describe("AccountMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathnameMock.mockReturnValue("/teams/york_lions/playbook");
    mockUseAuth.mockReturnValue(signedOut);
  });

  it("shows a sign-in link that returns to the current page when signed out", () => {
    render(<AccountMenu />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login?redirect=%2Fteams%2Fyork_lions%2Fplaybook"
    );
  });

  it("hides the sign-in link on the login page itself", () => {
    usePathnameMock.mockReturnValue("/login");
    const { container } = render(<AccountMenu />);
    expect(container).toBeEmptyDOMElement();
  });

  it("opens a menu with team, settings and sign out for a signed-in coach", () => {
    mockUseAuth.mockReturnValue({
      ...signedOut,
      user: { displayName: "Dexter Sargent", email: "dextersargent@gmail.com" },
      managedTeamId: "york_lions",
      isAuthorized: true,
    });
    render(<AccountMenu />);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Account menu for Dexter Sargent" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("dextersargent@gmail.com")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /My Team/ })).toHaveAttribute("href", "/teams/york_lions");
    expect(screen.getByRole("menuitem", { name: /Account Settings/ })).toHaveAttribute("href", "/account");
    expect(screen.queryByRole("menuitem", { name: /My Profile/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /League Settings/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: /Sign Out/ }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("links rostered players to their profile and closes on Escape", () => {
    mockUseAuth.mockReturnValue({
      ...signedOut,
      user: { displayName: null, email: "player@example.com" },
      isPlayer: true,
      playerData: { playerName: "Sonia" },
      playerTeamId: "york_lions",
      isAuthorized: true,
    });
    render(<AccountMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Account menu for Sonia" }));
    expect(screen.getByRole("menuitem", { name: /My Profile/ })).toHaveAttribute("href", "/profile");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("offers league settings to signed-in league admins", () => {
    mockUseAuth.mockReturnValue({
      ...signedOut,
      user: { displayName: "Commissioner", email: "admin@example.com" },
      isLeagueAdmin: true,
      isAuthorized: true,
    });
    render(<AccountMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Account menu for Commissioner" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /League Settings/ }));
    expect(mockOpenCustomizer).toHaveBeenCalledTimes(1);
  });
});
