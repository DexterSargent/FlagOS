import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FirebaseError } from "firebase/app";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/lib/authContext";
import { useState } from "react";

vi.mock("@/lib/accountEmails", () => ({
  resolveConnectedAccount: vi.fn(async (user) => user),
}));

const { popupMock, redirectMock, parametersMock, authStateCallback } = vi.hoisted(() => ({
  popupMock: vi.fn(),
  redirectMock: vi.fn(),
  parametersMock: vi.fn(),
  authStateCallback: { current: null as null | ((user: unknown) => Promise<void>) },
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn((_auth, callback) => {
    authStateCallback.current = callback;
    void callback(null);
    return vi.fn();
  }),
  signInWithPopup: popupMock,
  signInWithRedirect: redirectMock,
  getRedirectResult: vi.fn(async () => null),
  GoogleAuthProvider: vi.fn(function () { return { setCustomParameters: parametersMock }; }),
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

function GoogleSignInHarness() {
  const { login, user } = useAuth();
  const [result, setResult] = useState("");
  return (
    <>
      <button onClick={() => void login().then((res) => setResult(res.success ? res.defaultPath || "success" : res.message))}>
        Google sign-in
      </button>
      <output aria-label="result">{result}</output>
      <output aria-label="user">{user?.uid ?? "signed out"}</output>
    </>
  );
}

describe("Google sign-in", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    popupMock.mockReset();
    redirectMock.mockReset();
    authStateCallback.current = null;
  });

  it.each([
    ["iPhone Safari", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1"],
    ["Android Chrome", "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36"],
    ["iPad Safari", "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1"],
    ["desktop Chrome", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36"],
  ])("uses popup sign-in on %s and waits for completion", async (_browser, userAgent) => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
    let finishSignIn!: () => void;
    popupMock.mockImplementation(() => new Promise((resolve) => {
      finishSignIn = () => resolve({ user: { uid: "google-user", email: null, emailVerified: false } });
    }));
    render(<AuthProvider><GoogleSignInHarness /></AuthProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Google sign-in" }));

    expect(popupMock).toHaveBeenCalledTimes(1);
    expect(parametersMock).toHaveBeenCalledWith({ prompt: "select_account" });
    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("result")).toBeEmptyDOMElement();

    await act(async () => {
      await authStateCallback.current?.({ uid: "google-user", email: null });
      finishSignIn();
    });

    expect(screen.getByLabelText("result")).toHaveTextContent("success");
    expect(screen.getByLabelText("user")).toHaveTextContent("google-user");
  });

  it.each([true, false])("only returns the York destination for verified staff (verified=%s)", async (emailVerified) => {
    popupMock.mockResolvedValue({ user: { uid: "york-coach", email: "tbrown99@my.yorku.ca", emailVerified } });
    render(<AuthProvider><GoogleSignInHarness /></AuthProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Google sign-in" }));
    await waitFor(() => expect(screen.getByLabelText("result")).toHaveTextContent(emailVerified ? "/teams/york_lions" : "success"));
  });

  it("shows recovery instructions rather than falling back to a broken redirect", async () => {
    popupMock.mockRejectedValue(new FirebaseError("auth/popup-blocked", "Popup blocked"));
    render(<AuthProvider><GoogleSignInHarness /></AuthProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Google sign-in" }));

    await waitFor(() => expect(screen.getByLabelText("result")).toHaveTextContent("Please allow popups for this site"));
    expect(screen.getByLabelText("result")).toHaveTextContent("sign in with email and password");
    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("user")).toHaveTextContent("signed out");
  });

  it("does not report success when Google sign-in is cancelled", async () => {
    popupMock.mockRejectedValue(new FirebaseError("auth/popup-closed-by-user", "Popup closed"));
    render(<AuthProvider><GoogleSignInHarness /></AuthProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Google sign-in" }));

    await waitFor(() => expect(screen.getByLabelText("result")).toHaveTextContent("Sign-in was cancelled"));
    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("user")).toHaveTextContent("signed out");
  });
});
