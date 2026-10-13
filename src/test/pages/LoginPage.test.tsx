import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginPage from "@/app/login/page";

const { loginWithEmailAndPasswordMock, routerPushMock, useAuthMock } = vi.hoisted(() => ({
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
      loginWithPlayerEmail: vi.fn(),
      logout: vi.fn(),
      setDevRole: vi.fn(),
    });
    loginWithEmailAndPasswordMock.mockReset();
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
});
