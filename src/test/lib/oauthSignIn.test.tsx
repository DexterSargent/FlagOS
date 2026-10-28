import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FirebaseError } from "firebase/app";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth, type OAuthProviderId } from "@/lib/authContext";
import { useState } from "react";
import { requestPrivateData } from "@/lib/secureWrites";
vi.mock("@/lib/secureWrites", () => ({ requestPrivateData: vi.fn(async () => ({ players: [], teams: [] })) }));

vi.mock("@/lib/accountEmails", () => ({
  resolveConnectedAccount: vi.fn(async (user) => user),
}));

const { popupMock, parametersMock, oauthCtor, authStateCallback } = vi.hoisted(() => ({
  popupMock: vi.fn(),
  parametersMock: vi.fn(),
  oauthCtor: vi.fn(),
  authStateCallback: { current: null as null | ((user: unknown) => Promise<void>) },
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn((_auth, callback) => {
    authStateCallback.current = callback;
    void callback(null);
    return vi.fn();
  }),
  signInWithPopup: popupMock,
  signInWithRedirect: vi.fn(),
  getRedirectResult: vi.fn(async () => null),
  GoogleAuthProvider: vi.fn(function () { return { setCustomParameters: parametersMock }; }),
  OAuthProvider: vi.fn(function (id: string) { oauthCtor(id); return { providerId: id }; }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendEmailVerification: vi.fn(),
  updateProfile: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(async () => ({ exists: () => true, data: () => ({ role: "user" }) })),
  setDoc: vi.fn(),
}));

vi.mock("@/lib/demoSandbox", () => ({
  getSandboxPlayers: vi.fn(() => []),
  subscribeDemoSandbox: vi.fn(() => vi.fn()),
  notifySandboxChange: vi.fn(),
}));

function Harness({ provider }: { provider: OAuthProviderId }) {
  const { loginWithProvider, user } = useAuth();
  const [result, setResult] = useState("");
  return (
    <>
      <button onClick={() => void loginWithProvider(provider).then((res) => setResult(res.success ? res.defaultPath || "success" : res.message))}>
        Sign in
      </button>
      <output aria-label="result">{result}</output>
      <output aria-label="user">{user?.uid ?? "signed out"}</output>
    </>
  );
}

describe("OAuth provider sign-in", () => {
  beforeEach(() => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    vi.mocked(requestPrivateData).mockResolvedValue({ players: [], teams: [] });
    popupMock.mockReset();
    parametersMock.mockReset();
    oauthCtor.mockReset();
    authStateCallback.current = null;
  });

  it.each([
    ["apple", "apple.com"],
    ["microsoft", "microsoft.com"],
    ["facebook", "facebook.com"],
    ["twitter", "twitter.com"],
    ["yahoo", "yahoo.com"],
    ["github", "github.com"],
  ] as const)("builds the %s provider with the Firebase id %s and signs in with a popup", async (provider, firebaseId) => {
    popupMock.mockResolvedValue({ user: { uid: `${provider}-user`, email: null, emailVerified: false } });
    render(<AuthProvider><Harness provider={provider} /></AuthProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(oauthCtor).toHaveBeenCalledWith(firebaseId);
    expect(popupMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByLabelText("result")).toHaveTextContent("success"));
  });

  it("uses the Google provider with account selection for google", async () => {
    popupMock.mockResolvedValue({ user: { uid: "google-user", email: null, emailVerified: false } });
    render(<AuthProvider><Harness provider="google" /></AuthProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(parametersMock).toHaveBeenCalledWith({ prompt: "select_account" });
    expect(oauthCtor).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByLabelText("result")).toHaveTextContent("success"));
  });

  it("returns a managed team destination from a verified provider sign-in", async () => {
    vi.mocked(requestPrivateData).mockResolvedValue({ players: [], teams: [{ id: "falcons", name: "Falcons" }] });
    popupMock.mockResolvedValue({ user: { uid: "apple-coach", email: "coach@falcons.com", emailVerified: true } });
    render(<AuthProvider><Harness provider="apple" /></AuthProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(screen.getByLabelText("result")).toHaveTextContent("/teams/falcons"));
  });

  it("surfaces a friendly error when the provider popup is cancelled", async () => {
    popupMock.mockRejectedValue(new FirebaseError("auth/popup-closed-by-user", "Popup closed"));
    render(<AuthProvider><Harness provider="github" /></AuthProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(screen.getByLabelText("result")).toHaveTextContent("Sign-in was cancelled"));
    expect(screen.getByLabelText("user")).toHaveTextContent("signed out");
  });
});
