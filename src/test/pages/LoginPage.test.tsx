import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginPage from "@/app/login/page";

const { createAccountMock, loginWithEmailAndPasswordMock, routerPushMock, useAuthMock } = vi.hoisted(() => ({
  createAccountMock: vi.fn(),
  loginWithEmailAndPasswordMock: vi.fn(),
  routerPushMock: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock("@/lib/authContext", () => ({
  useAuth: useAuthMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock }),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({})),
  getDocs: vi.fn(async () => ({ docs: [] })),
}));

vi.mock("@/components/TeamAssets", () => ({
  isRealTeam: vi.fn(() => true),
}));

describe("LoginPage email/password sign-in", () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({
      user: null,
      userProfile: null,
      role: "user",
      isAuthorized: false,
      isLeagueAdmin: false,
      isTeamAdmin: () => false,
      isPlayer: false,
      playerId: null,
      playerData: null,
      managedTeamId: null,
      loading: false,
      login: vi.fn(async () => ({ success: true })),
      loginWithEmailAndPassword: loginWithEmailAndPasswordMock,
      createAccount: createAccountMock,
      loginWithPlayerEmail: vi.fn(),
      logout: vi.fn(),
      setDevRole: vi.fn(),
    });
    loginWithEmailAndPasswordMock.mockReset();
    createAccountMock.mockReset();
    routerPushMock.mockReset();
  });

  it("submits email/password credentials and redirects on success", async () => {
    loginWithEmailAndPasswordMock.mockResolvedValue({ success: true });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email and password"), {
      target: { value: "player@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "example-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in with email" }));

    await waitFor(() => {
      expect(loginWithEmailAndPasswordMock).toHaveBeenCalledWith(
        "player@example.com",
        "example-password"
      );
      expect(routerPushMock).toHaveBeenCalledWith("/league/default");
    });
  });

  it("shows Firebase sign-in errors to the user", async () => {
    loginWithEmailAndPasswordMock.mockResolvedValue({
      success: false,
      message: "Email/password sign-in is disabled.",
    });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email and password"), {
      target: { value: "player@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "example-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in with email" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email/password sign-in is disabled."
    );
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("creates an account without selecting a league role", async () => {
    createAccountMock.mockResolvedValue({ success: true });
    render(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: "Create an account" }));
    fireEvent.change(screen.getByPlaceholderText("Name (optional)"), {
      target: { value: "Taylor Player" },
    });
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "taylor@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password (at least 6 characters)"), {
      target: { value: "a-secure-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(createAccountMock).toHaveBeenCalledWith(
        "Taylor Player",
        "taylor@example.com",
        "a-secure-password"
      );
    });
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("shows the email-verification instructions after account creation", async () => {
    createAccountMock.mockResolvedValue({
      success: true,
      message: "Verify your email using the link we sent, then sign in.",
    });
    render(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: "Create an account" }));
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "taylor@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password (at least 6 characters)"), {
      target: { value: "a-secure-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Verify your email using the link we sent, then sign in."
    );
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("explains that a signed-in account can have league-specific roles", () => {
    useAuthMock.mockReturnValue({
      user: { email: "taylor@example.com" },
      userProfile: { uid: "user-1", email: "taylor@example.com" },
      role: "user",
      isAuthorized: false,
      isLeagueAdmin: false,
      isTeamAdmin: () => false,
      isPlayer: false,
      playerId: null,
      playerData: null,
      managedTeamId: null,
      loading: false,
      login: vi.fn(),
      loginWithEmailAndPassword: loginWithEmailAndPasswordMock,
      createAccount: createAccountMock,
      loginWithPlayerEmail: vi.fn(),
      logout: vi.fn(),
      setDevRole: vi.fn(),
    });

    render(<LoginPage />);

    expect(screen.getByText("Account ready — no league role assigned")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore league options" })).toHaveAttribute("href", "/pricing");
  });
});
