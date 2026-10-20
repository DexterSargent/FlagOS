import { beforeEach, describe, expect, it, vi } from "vitest";
import { connectAccountEmail, resolveConnectedAccount } from "@/lib/accountEmails";
import type { User } from "firebase/auth";

const { fetchMock, signInMock, customMock, signOutMock, deleteMock, secondaryAuth, mainAuth } = vi.hoisted(() => ({
  fetchMock: vi.fn(), signInMock: vi.fn(), customMock: vi.fn(), signOutMock: vi.fn(),
  deleteMock: vi.fn(), secondaryAuth: { id: "isolated" }, mainAuth: { id: "main" },
}));
vi.mock("@/lib/firebase", () => ({ app: { options: {} }, auth: mainAuth }));
vi.mock("firebase/app", () => ({ initializeApp: vi.fn(() => ({})), deleteApp: deleteMock }));
vi.mock("firebase/auth", () => ({
  browserPopupRedirectResolver: {}, inMemoryPersistence: {},
  initializeAuth: vi.fn(() => secondaryAuth), connectAuthEmulator: vi.fn(),
  EmailAuthProvider: {}, GoogleAuthProvider: vi.fn(function () { return { setCustomParameters: vi.fn() }; }),
  reauthenticateWithCredential: vi.fn(), reauthenticateWithPopup: vi.fn(),
  signInWithEmailAndPassword: signInMock, signInWithPopup: signInMock,
  signInWithCustomToken: customMock, signOut: signOutMock,
}));

describe("account email client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: {} }) });
    signInMock.mockResolvedValue({ user: { emailVerified: true, getIdToken: async () => "secondary-proof" } });
  });

  it("signs in to the additional email in an isolated session and removes it afterward", async () => {
    const primary = { emailVerified: true, getIdToken: async () => "primary-proof" } as User;
    await connectAccountEmail(primary, { email: "secondary@example.com", password: "password" });
    expect(signInMock).toHaveBeenCalledWith(secondaryAuth, "secondary@example.com", "password");
    expect(fetchMock).toHaveBeenCalledWith("/api/account/emails", expect.objectContaining({
      body: JSON.stringify({ action: "connect", proofToken: "secondary-proof" }),
    }));
    expect(signOutMock).toHaveBeenCalledWith(secondaryAuth);
    expect(signOutMock).not.toHaveBeenCalledWith(mainAuth);
    expect(deleteMock).toHaveBeenCalledTimes(1);
  });

  it("cleans up a failed or unverified additional sign-in without linking it", async () => {
    signInMock.mockResolvedValue({ user: { emailVerified: false } });
    await expect(connectAccountEmail({} as User)).rejects.toThrow("Verify the additional email");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(deleteMock).toHaveBeenCalledTimes(1);
  });

  it("exchanges a connected email for the same primary account UID", async () => {
    const primary = { uid: "primary" };
    customMock.mockResolvedValue({ user: primary });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: { customToken: "server-issued-token" } }) });
    const result = await resolveConnectedAccount({ emailVerified: true, getIdToken: async () => "alias" } as User);
    expect(customMock).toHaveBeenCalledWith(mainAuth, "server-issued-token");
    expect(result).toBe(primary);
  });

  it("fails closed when the linked-account lookup fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Account unavailable" }) });
    await expect(resolveConnectedAccount({ emailVerified: true, getIdToken: async () => "alias" } as User)).rejects.toThrow("Account unavailable");
    expect(signOutMock).toHaveBeenCalledWith(mainAuth);
    expect(customMock).not.toHaveBeenCalled();
  });
});
