import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/lib/authContext";

const {
  createUserWithEmailAndPasswordMock,
  docMock,
  getDocMock,
  authStateCallback,
  setDocMock,
  updateProfileMock,
} = vi.hoisted(() => ({
  createUserWithEmailAndPasswordMock: vi.fn(),
  docMock: vi.fn((_db: unknown, collectionName: string, id: string) => ({ collectionName, id })),
  getDocMock: vi.fn(),
  authStateCallback: { current: null as null | ((user: unknown) => Promise<void>) },
  setDocMock: vi.fn(),
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
  updateProfile: updateProfileMock,
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signOut: vi.fn(),
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

describe("AuthProvider account creation", () => {
  beforeEach(() => {
    authStateCallback.current = null;
    createUserWithEmailAndPasswordMock.mockReset();
    updateProfileMock.mockReset();
    getDocMock.mockReset();
    getDocMock.mockResolvedValue({ exists: () => false });
    setDocMock.mockReset();
    setDocMock.mockResolvedValue(undefined);
    createUserWithEmailAndPasswordMock.mockImplementation(async () => {
      const user = { uid: "new-account", email: "taylor@example.com", displayName: null };
      if (authStateCallback.current) {
        void authStateCallback.current(user);
      }
      return { user };
    });
  });

  it("creates an authenticated profile without assigning a global role", async () => {
    render(
      <AuthProvider>
        <AccountCreationHarness />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(setDocMock).toHaveBeenCalled();
      expect(screen.getByText("no account role")).toBeInTheDocument();
    });

    expect(createUserWithEmailAndPasswordMock).toHaveBeenCalledWith(
      {},
      "taylor@example.com",
      "secure-password"
    );
    expect(updateProfileMock).toHaveBeenCalledWith(
      { uid: "new-account", email: "taylor@example.com", displayName: null },
      { displayName: "Taylor Player" }
    );
    const savedProfiles = setDocMock.mock.calls.map((call) => call[1]);
    expect(savedProfiles.length).toBeGreaterThan(0);
    for (const savedProfile of savedProfiles) {
      expect(savedProfile).toMatchObject({
        uid: "new-account",
        email: "taylor@example.com",
      });
      expect(savedProfile).not.toHaveProperty("role");
    }
    expect(savedProfiles).toContainEqual(
      expect.objectContaining({
        uid: "new-account",
        email: "taylor@example.com",
        displayName: "Taylor Player",
        createdAt: "server-time",
      })
    );
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
});
