import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivateLeagueAccessDenied from "@/components/PrivateLeagueAccessDenied";

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));
vi.mock("@/lib/authContext", () => ({ useAuth: () => mockUseAuth() }));

describe("PrivateLeagueAccessDenied", () => {
  beforeEach(() => mockUseAuth.mockReturnValue({ user: null, logout: vi.fn() }));

  it("offers sign-in and league browsing to signed-out visitors", () => {
    render(<PrivateLeagueAccessDenied leagueName="North League" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("North League is Private");
    expect(screen.getByRole("link", { name: /sign in with email/i })).toHaveAttribute("href", expect.stringContaining("/login?redirect="));
    expect(screen.getByRole("link", { name: /browse leagues/i })).toHaveAttribute("href", "/leagues");
    expect(screen.queryByText(/return to demo/i)).not.toBeInTheDocument();
  });

  it("lets a signed-in non-member switch accounts instead of signing in again", () => {
    mockUseAuth.mockReturnValue({ user: { email: "fan@example.com" }, logout: vi.fn() });
    render(<PrivateLeagueAccessDenied />);
    expect(screen.getByText("fan@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out to switch accounts/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign in with email/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /browse leagues/i })).toBeInTheDocument();
  });
});
