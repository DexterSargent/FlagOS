import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginPage from "@/app/login/page";

const {
  createAccountMock,
  loginMock,
  loginWithEmailAndPasswordMock,
  loginWithPlayerEmailMock,
  logoutMock,
  routerPushMock,
  sendPasswordResetMock,
  setDevRoleMock,
  useAuthMock,
} = vi.hoisted(() => ({
  createAccountMock: vi.fn(),
  loginMock: vi.fn(async () => ({ success: true })),
  loginWithEmailAndPasswordMock: vi.fn(),
  loginWithPlayerEmailMock: vi.fn(async () => ({ success: true })),
  logoutMock: vi.fn(async () => undefined),
  routerPushMock: vi.fn(),
  sendPasswordResetMock: vi.fn(),
  setDevRoleMock: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock("@/lib/authContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/authContext")>();
  return {
    ...actual,
    useAuth: useAuthMock,
  };
});

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
    window.history.replaceState(null, "", "/login");
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
      login: loginMock,
      loginWithEmailAndPassword: loginWithEmailAndPasswordMock,
      createAccount: createAccountMock,
      sendPasswordReset: sendPasswordResetMock,
      loginWithPlayerEmail: loginWithPlayerEmailMock,
      logout: logoutMock,
      setDevRole: setDevRoleMock,
    });
    loginMock.mockReset().mockResolvedValue({ success: true, defaultPath: "/schedule" } as any);
    loginWithEmailAndPasswordMock.mockReset();
    loginWithPlayerEmailMock.mockReset().mockResolvedValue({ success: true });
    logoutMock.mockReset().mockResolvedValue(undefined);
    createAccountMock.mockReset();
    sendPasswordResetMock.mockReset();
    setDevRoleMock.mockReset();
    routerPushMock.mockReset();
  });

  it("sends a set-password link for the entered email", async () => {
    sendPasswordResetMock.mockResolvedValue({ success: true, message: "We sent a link to set a new password." });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email and password"), {
      target: { value: "coach@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Forgot or set password?" }));

    expect(await screen.findByRole("status")).toHaveTextContent("We sent a link to set a new password.");
    expect(sendPasswordResetMock).toHaveBeenCalledWith("coach@example.com");
  });

  it("submits email/password credentials and redirects to the account's portal", async () => {
    loginWithEmailAndPasswordMock.mockResolvedValue({ success: true, defaultPath: "/teams/team_1" });
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
      expect(routerPushMock).toHaveBeenCalledWith("/teams/team_1");
    });
  });

  it("does not send accounts without a league to the demo league", async () => {
    loginWithEmailAndPasswordMock.mockResolvedValue({ success: true });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email and password"), {
      target: { value: "player@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "example-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in with email" }));

    await waitFor(() => expect(loginWithEmailAndPasswordMock).toHaveBeenCalled());
    expect(routerPushMock).not.toHaveBeenCalled();
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

  it("opens the independent team returned by a verified coach login", async () => {
    loginWithEmailAndPasswordMock.mockResolvedValue({ success: true, defaultPath: "/teams/york_lions" });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Email and password"), { target: { value: "tbrown99@my.yorku.ca" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "example-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in with email" }));
    await waitFor(() => expect(routerPushMock).toHaveBeenCalledWith("/teams/york_lions"));
  });

  it("preserves an explicit destination instead of replacing it with the coach home", async () => {
    window.history.replaceState(null, "", "/login?redirect=%2Fteams%2Fyork_lions%2Fplaybook");
    loginWithEmailAndPasswordMock.mockResolvedValue({ success: true, defaultPath: "/teams/york_lions" });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Email and password"), { target: { value: "tbrown99@my.yorku.ca" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "example-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in with email" }));
    await waitFor(() => expect(routerPushMock).toHaveBeenCalledWith("/teams/york_lions/playbook"));
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

  it("renders FlagOSLoader when auth is loading", () => {
    useAuthMock.mockReturnValue({
      user: null,
      loading: true,
      role: "user",
      isAuthorized: false,
      isLeagueAdmin: false,
      isTeamAdmin: () => false,
      isPlayer: false,
      playerId: null,
      playerData: null,
      managedTeamId: null,
      login: loginMock,
      loginWithEmailAndPassword: loginWithEmailAndPasswordMock,
      createAccount: createAccountMock,
      sendPasswordReset: sendPasswordResetMock,
      loginWithPlayerEmail: loginWithPlayerEmailMock,
      logout: logoutMock,
      setDevRole: setDevRoleMock,
    });

    render(<LoginPage />);
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  it("navigates back to home when clicking Back to FlagOS button", () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: /Back to FlagOS/i }));
    expect(routerPushMock).toHaveBeenCalledWith("/");
  });

  it("handles Google sign-in success, error message, and exception", async () => {
    // 1. Success case
    loginMock.mockResolvedValueOnce({ success: true, defaultPath: "/schedule" } as any);
    const { unmount } = render(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: /SIGN IN WITH GOOGLE/i }));
    await waitFor(() => {
      expect(loginMock).toHaveBeenCalled();
      expect(routerPushMock).toHaveBeenCalledWith("/schedule");
    });
    unmount();

    // 2. Failure message case
    loginMock.mockResolvedValueOnce({ success: false, message: "Popup window closed by user" } as any);
    render(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: /SIGN IN WITH GOOGLE/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Popup window closed by user");

    // 3. Exception throw case
    loginMock.mockRejectedValueOnce(new Error("Network connection lost"));
    fireEvent.click(screen.getByRole("button", { name: /SIGN IN WITH GOOGLE/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Network connection lost");
  });

  it("handles authorized signed-in user continuing to portal and signing out", async () => {
    useAuthMock.mockReturnValue({
      user: { email: "admin@flagos.ca" },
      userProfile: { uid: "admin-1", email: "admin@flagos.ca", role: "league_admin" },
      role: "league_admin",
      isAuthorized: true,
      isLeagueAdmin: true,
      isTeamAdmin: () => false,
      isPlayer: false,
      playerId: null,
      playerData: null,
      managedTeamId: null,
      loading: false,
      login: loginMock,
      loginWithEmailAndPassword: loginWithEmailAndPasswordMock,
      createAccount: createAccountMock,
      sendPasswordReset: sendPasswordResetMock,
      loginWithPlayerEmail: loginWithPlayerEmailMock,
      logout: logoutMock,
      setDevRole: setDevRoleMock,
    });

    render(<LoginPage />);

    expect(screen.getByText("Signed in as")).toBeInTheDocument();
    expect(screen.getByText("admin@flagos.ca")).toBeInTheDocument();

    // Continue to portal
    const continueBtn = screen.getByRole("button", { name: /CONTINUE TO LEAGUE PORTAL/i });
    fireEvent.click(continueBtn);
    expect(routerPushMock).toHaveBeenCalledWith("/");

    // Sign out
    const signOutBtn = screen.getByRole("button", { name: /Sign Out Account/i });
    fireEvent.click(signOutBtn);
    expect(logoutMock).toHaveBeenCalled();
  });

  it("handles unauthorized signed-in user with switch account action", async () => {
    useAuthMock.mockReturnValue({
      user: { email: "unauthorized@flagos.ca" },
      userProfile: { uid: "unauth-1", email: "unauthorized@flagos.ca", role: "spectator" },
      role: "spectator",
      isAuthorized: false,
      isLeagueAdmin: false,
      isTeamAdmin: () => false,
      isPlayer: false,
      playerId: null,
      playerData: null,
      managedTeamId: null,
      loading: false,
      login: loginMock,
      loginWithEmailAndPassword: loginWithEmailAndPasswordMock,
      createAccount: createAccountMock,
      sendPasswordReset: sendPasswordResetMock,
      loginWithPlayerEmail: loginWithPlayerEmailMock,
      logout: logoutMock,
      setDevRole: setDevRoleMock,
    });

    render(<LoginPage />);

    expect(screen.getByText("Account Not Authorized")).toBeInTheDocument();

    const switchBtn = screen.getByRole("button", { name: /Switch Account \/ Sign In Again/i });
    fireEvent.click(switchBtn);
    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalled();
      expect(loginMock).toHaveBeenCalled();
    });
  });

  it("handles local email preview submit success and error states", async () => {
    render(<LoginPage />);

    const localEmailInput = screen.getByPlaceholderText(/e\.g\. athlete@flagos\.ca/i);
    const localSignInBtn = screen.getByRole("button", { name: "Sign In" });

    // Success
    loginWithPlayerEmailMock.mockResolvedValueOnce({ success: true });
    fireEvent.change(localEmailInput, { target: { value: "player@local.ca" } });
    fireEvent.click(localSignInBtn);

    await waitFor(() => {
      expect(loginWithPlayerEmailMock).toHaveBeenCalledWith("player@local.ca");
      expect(routerPushMock).toHaveBeenCalledWith("/profile");
    });

    // Error
    loginWithPlayerEmailMock.mockResolvedValueOnce({ success: false, message: "Roster email not found" } as any);
    fireEvent.change(localEmailInput, { target: { value: "unknown@local.ca" } });
    fireEvent.click(localSignInBtn);

    expect(await screen.findByText("Roster email not found")).toBeInTheDocument();
  });

  it("previews roles using developer toolbar buttons on localhost", () => {
    render(<LoginPage />);

    // 1. League Admin preview button
    const adminBtn = screen.getByRole("button", { name: /League Admin/i });
    fireEvent.click(adminBtn);
    expect(setDevRoleMock).toHaveBeenCalledWith("league_admin");
    expect(routerPushMock).toHaveBeenCalledWith("/");

    // 2. Spectator preview button
    const spectatorBtn = screen.getByRole("button", { name: /Spectator \(Default View\)/i });
    fireEvent.click(spectatorBtn);
    expect(setDevRoleMock).toHaveBeenCalledWith("user");
    expect(routerPushMock).toHaveBeenCalledWith("/");

    // 3. Team Admin preview
    const applyTeamBtn = screen.getByRole("button", { name: /Apply & Go/i });
    fireEvent.click(applyTeamBtn);
    expect(setDevRoleMock).toHaveBeenCalledWith("team_admin", expect.any(String));

    // 4. Player preview
    const signAsPlayerBtn = screen.getByRole("button", { name: /Sign In As Player/i });
    fireEvent.click(signAsPlayerBtn);
    expect(setDevRoleMock).toHaveBeenCalledWith("player", expect.any(String), expect.any(String));
  });

  it("handles password reset errors and account creation errors", async () => {
    sendPasswordResetMock.mockResolvedValueOnce({ success: false, message: "Email not found in auth records" });
    createAccountMock.mockResolvedValueOnce({ success: false, message: "Account already registered with this email" });

    render(<LoginPage />);

    // Password reset error
    fireEvent.change(screen.getByLabelText("Email and password"), { target: { value: "notfound@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Forgot or set password?" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email not found in auth records");

    // Account creation error
    fireEvent.click(screen.getByRole("button", { name: "Create an account" }));
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: "existing@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password (at least 6 characters)"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Account already registered with this email");

    // Toggle back to sign in
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("button", { name: "Sign in with email" })).toBeInTheDocument();
  });
});

