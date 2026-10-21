import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/lib/authContext";
import { requestPrivateData } from "@/lib/secureWrites";
const TEAM_ADMIN_EMAILS = ["head@falcons.com", "assistant@falcons.com"];

const {
  createUserWithEmailAndPasswordMock,
  docMock,
  getDocMock,
  authStateCallback,
  setDocMock,
  sendEmailVerificationMock,
  signOutMock,
  updateProfileMock,
} = vi.hoisted(() => ({
  createUserWithEmailAndPasswordMock: vi.fn(),
  docMock: vi.fn((_db: unknown, collectionName: string, id: string) => ({ collectionName, id })),
  getDocMock: vi.fn(),
  authStateCallback: { current: null as null | ((user: unknown) => Promise<void>) },
  setDocMock: vi.fn(),
  sendEmailVerificationMock: vi.fn(),
  signOutMock: vi.fn(),
  updateProfileMock: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({ app: {}, db: {}, auth: {} }));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn((_auth, callback) => {
    authStateCallback.current = callback;
    void callback(null);
    return vi.fn();
  }),
  createUserWithEmailAndPassword: createUserWithEmailAndPasswordMock,
  sendEmailVerification: sendEmailVerificationMock,
  updateProfile: updateProfileMock,
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  getRedirectResult: vi.fn(async () => null),
  GoogleAuthProvider: vi.fn(() => ({ setCustomParameters: vi.fn() })),
  signOut: signOutMock,
}));

vi.mock("firebase/firestore", () => ({
  doc: docMock,
  getDoc: getDocMock,
  setDoc: setDocMock,
  collection: vi.fn(() => ({})),
  getDocs: vi.fn(async () => ({ docs: [] })),
  serverTimestamp: vi.fn(() => "server-time"),
}));

vi.mock("@/lib/demoSandbox", () => ({
  getSandboxPlayers: vi.fn(() => []),
  subscribeDemoSandbox: vi.fn(() => vi.fn()),
  notifySandboxChange: vi.fn(),
}));
vi.mock("@/lib/secureWrites", () => ({
  requestPrivateData: vi.fn(async () => ({ players: [], teams: [] })),
}));

function AccountCreationHarness() {
  const { createAccount, userProfile } = useAuth();

  return (
    <>
      <button onClick={() => void createAccount("Taylor Player", "TAYLOR@example.com", "secure-password")}>
        Create account
      </button>
      <output>{userProfile?.role ?? "no account role"}</output>
    </>
  );
}

function RoleHarness() {
  const { role } = useAuth();
  return <output>{role}</output>;
}

function CoachHarness() {
  const { role, isPlatformAdmin, managedTeamId, canManageTeam } = useAuth();
  return <output>{JSON.stringify({
    role, isPlatformAdmin, managedTeamId,
    team: canManageTeam("falcons"),
    second: canManageTeam("hawks"),
    other: canManageTeam("team_other"),
  })}</output>;
}

describe("AuthProvider account creation", () => {
  beforeEach(() => {
    vi.mocked(requestPrivateData).mockResolvedValue({ players: [], teams: [] });
    authStateCallback.current = null;
    createUserWithEmailAndPasswordMock.mockReset();
    updateProfileMock.mockReset();
    getDocMock.mockReset();
    getDocMock.mockResolvedValue({ exists: () => false });
    setDocMock.mockReset();
    setDocMock.mockResolvedValue(undefined);
    sendEmailVerificationMock.mockReset();
    sendEmailVerificationMock.mockResolvedValue(undefined);
    signOutMock.mockReset();
    createUserWithEmailAndPasswordMock.mockImplementation(async () => {
      const user = { uid: "new-account", email: "taylor@example.com", displayName: null };
      if (authStateCallback.current) {
        void authStateCallback.current(user);
      }
      return { user };
    });
  });

  it("requires email verification before enabling the account", async () => {
    render(
      <AuthProvider>
        <AccountCreationHarness />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(sendEmailVerificationMock).toHaveBeenCalled());

    expect(createUserWithEmailAndPasswordMock).toHaveBeenCalledWith(
      {},
      "taylor@example.com",
      "secure-password"
    );
    expect(updateProfileMock).toHaveBeenCalledWith(
      { uid: "new-account", email: "taylor@example.com", displayName: null },
      { displayName: "Taylor Player" }
    );
    expect(signOutMock).toHaveBeenCalled();
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it("restores persisted developer roles after the hydration-safe initial render", async () => {
    localStorage.setItem("dev_auth_role", "league_admin");

    const serverMarkup = renderToString(
      <AuthProvider>
        <RoleHarness />
      </AuthProvider>
    );
    expect(serverMarkup).toContain(">user</output>");

    render(
      <AuthProvider>
        <RoleHarness />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("league_admin")).toBeInTheDocument();
    });
  });

  it.each(TEAM_ADMIN_EMAILS)(
    "grants verified %s independent team coach access without platform privileges",
    async (email) => {
      vi.mocked(requestPrivateData).mockResolvedValue({ players: [], teams: [{ id: "falcons", name: "Falcons" }, { id: "hawks", name: "Hawks" }] });
      render(<AuthProvider><CoachHarness /></AuthProvider>);
      await act(async () => {
        await authStateCallback.current?.({ uid: "coach", email, emailVerified: true });
      });
      const state = JSON.parse(screen.getByRole("status").textContent || "{}");
      expect(state).toEqual({
        role: "team_admin", isPlatformAdmin: false, managedTeamId: "falcons",
        team: true, second: true, other: false,
      });
    },
  );

  it("does not grant team access to an unverified coach address", async () => {
    render(<AuthProvider><CoachHarness /></AuthProvider>);
    await act(async () => {
      await authStateCallback.current?.({
        uid: "unverified-coach", email: "assistant@falcons.com", emailVerified: false,
      });
    });
    const state = JSON.parse(screen.getByRole("status").textContent || "{}");
    expect(state.team).toBe(false);
    expect(state.isPlatformAdmin).toBe(false);
  });
});
