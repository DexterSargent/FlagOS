import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { FirebaseError } from "firebase/app";

// Hoist mock functions
const mockSignInWithPopup = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSendEmailVerification = vi.fn();
const mockSendPasswordResetEmail = vi.fn();
const mockUpdateProfile = vi.fn();
const mockSignOut = vi.fn();
const mockGetRedirectResult = vi.fn().mockResolvedValue(null);
const mockOnAuthStateChanged = vi.fn((_auth, callback) => {
  callback(null);
  return () => {};
});

vi.mock("firebase/auth", () => ({
  getAuth: () => ({ currentUser: null }),
  onAuthStateChanged: (auth: any, cb: any) => mockOnAuthStateChanged(auth, cb),
  signInWithPopup: (...args: any[]) => mockSignInWithPopup(...args),
  getRedirectResult: (...args: any[]) => mockGetRedirectResult(...args),
  GoogleAuthProvider: class {
    setCustomParameters = vi.fn();
  },
  signInWithEmailAndPassword: (...args: any[]) => mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args: any[]) => mockCreateUserWithEmailAndPassword(...args),
  sendEmailVerification: (...args: any[]) => mockSendEmailVerification(...args),
  sendPasswordResetEmail: (...args: any[]) => mockSendPasswordResetEmail(...args),
  updateProfile: (...args: any[]) => mockUpdateProfile(...args),
  signOut: (...args: any[]) => mockSignOut(...args),
  connectAuthEmulator: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  getFirestore: () => ({}),
  connectFirestoreEmulator: vi.fn(),
  doc: vi.fn((_db, coll, id) => ({ id, path: `${coll}/${id}` })),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => null })),
  setDoc: vi.fn(async () => {}),
}));

vi.mock("@/lib/secureWrites", () => ({
  requestPrivateData: vi.fn().mockResolvedValue({
    teams: [{ id: "team_apex", name: "Apex Lions" }],
    players: [{ id: "pl_sam", email: "sam@flagos.ca", teamId: "team_apex" }],
  }),
}));

vi.mock("@/lib/accountEmails", () => ({
  resolveConnectedAccount: vi.fn(async (user) => user),
}));

vi.mock("@/lib/leagueAccess", () => ({
  announceLeagueAccess: vi.fn(),
}));

import { AuthProvider, useAuth, clearIdentityLookupCache } from "@/lib/authContext";
import { requestPrivateData } from "@/lib/secureWrites";
import { auth } from "@/lib/firebase";

function renderAuthHook() {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
  return renderHook(() => useAuth(), { wrapper });
}

describe("authContext Methods and Role Logic Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearIdentityLookupCache();
    sessionStorage.clear();
    localStorage.clear();
    (auth as any).currentUser = null;
  });

  describe("createAccount validations & flows", () => {
    it("validates empty email", async () => {
      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      const res = await result.current.createAccount("John", "", "password123");
      expect(res.success).toBe(false);
      expect(res.message).toBe("Enter your email address.");
    });

    it("validates short password (< 6 characters)", async () => {
      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      const res = await result.current.createAccount("John", "john@example.com", "12345");
      expect(res.success).toBe(false);
      expect(res.message).toBe("Choose a password with at least 6 characters.");
    });

    it("successfully creates account, updates profile, sends verification, and signs out", async () => {
      const mockCreatedUser = { uid: "user_created_1", email: "newuser@flagos.ca" };
      mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({ user: mockCreatedUser });
      mockUpdateProfile.mockResolvedValueOnce(undefined);
      mockSendEmailVerification.mockResolvedValueOnce(undefined);
      mockSignOut.mockResolvedValueOnce(undefined);

      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      const res = await result.current.createAccount("New Coach", "newuser@flagos.ca", "secret1234");
      expect(res.success).toBe(true);
      expect(res.message).toContain("Account created");
      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(auth, "newuser@flagos.ca", "secret1234");
      expect(mockUpdateProfile).toHaveBeenCalledWith(mockCreatedUser, { displayName: "New Coach" });
      expect(mockSendEmailVerification).toHaveBeenCalledWith(mockCreatedUser);
      expect(mockSignOut).toHaveBeenCalledWith(auth);
    });

    it("maps FirebaseError auth/email-already-in-use", async () => {
      const error = new FirebaseError("auth/email-already-in-use", "Email exists");
      mockCreateUserWithEmailAndPassword.mockRejectedValueOnce(error);

      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      const res = await result.current.createAccount("New Coach", "exists@flagos.ca", "secret1234");
      expect(res.success).toBe(false);
      expect(res.message).toBe("An account already exists for this email. Sign in instead.");
    });
  });

  describe("sendPasswordReset error handling & flows", () => {
    it("validates empty email", async () => {
      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      const res = await result.current.sendPasswordReset("");
      expect(res.success).toBe(false);
      expect(res.message).toBe("Enter your email address first.");
    });

    it("obscures auth/user-not-found error for privacy", async () => {
      const error = new FirebaseError("auth/user-not-found", "User not found");
      mockSendPasswordResetEmail.mockRejectedValueOnce(error);

      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      const res = await result.current.sendPasswordReset("unknown@flagos.ca");
      expect(res.success).toBe(true);
      expect(res.message).toContain("If an account exists for unknown@flagos.ca");
    });

    it("sends password reset link successfully", async () => {
      mockSendPasswordResetEmail.mockResolvedValueOnce(undefined);

      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      const res = await result.current.sendPasswordReset("registered@flagos.ca");
      expect(res.success).toBe(true);
      expect(res.message).toContain("If an account exists for registered@flagos.ca");
    });

    it("handles generic FirebaseError", async () => {
      const error = new FirebaseError("auth/network-request-failed", "Network err");
      mockSendPasswordResetEmail.mockRejectedValueOnce(error);

      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      const res = await result.current.sendPasswordReset("registered@flagos.ca");
      expect(res.success).toBe(false);
      expect(res.message).toBe("Unable to reach Firebase. Check your internet connection and try again.");
    });
  });

  describe("loginWithEmailAndPassword flows", () => {
    it("signs in successfully with email and password", async () => {
      const mockUser = {
        uid: "u_verified",
        email: "verified@flagos.ca",
        emailVerified: true,
      };
      mockSignInWithEmailAndPassword.mockResolvedValueOnce({ user: mockUser });

      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      const res = await result.current.loginWithEmailAndPassword("verified@flagos.ca", "pass123");
      expect(res.success).toBe(true);
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(auth, "verified@flagos.ca", "pass123");
    });

    it("returns friendly message for auth/wrong-password", async () => {
      const error = new FirebaseError("auth/wrong-password", "Bad pass");
      mockSignInWithEmailAndPassword.mockRejectedValueOnce(error);

      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      const res = await result.current.loginWithEmailAndPassword("user@flagos.ca", "wrong");
      expect(res.success).toBe(false);
      expect(res.message).toBe("The email address or password is incorrect.");
    });
  });

  describe("Google login & popup fallback", () => {
    it("handles popup-blocked error code", async () => {
      const error = new FirebaseError("auth/popup-blocked", "Blocked");
      mockSignInWithPopup.mockRejectedValueOnce(error);

      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      const res = await result.current.login();
      expect(res.success).toBe(false);
      expect(res.message).toContain("The sign-in popup was blocked by your browser");
    });

    it("handles popup-closed-by-user error code", async () => {
      const error = new FirebaseError("auth/popup-closed-by-user", "Closed");
      mockSignInWithPopup.mockRejectedValueOnce(error);

      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      const res = await result.current.login();
      expect(res.success).toBe(false);
      expect(res.message).toBe("Sign-in was cancelled. Please try again.");
    });

    it("prompts to bypass login when on localhost and sign-in fails", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      const error = new FirebaseError("auth/unauthorized-domain", "Domain error");
      mockSignInWithPopup.mockRejectedValueOnce(error);

      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      const res = await result.current.login();
      expect(confirmSpy).toHaveBeenCalled();
      expect(res.success).toBe(true);
      await waitFor(() => {
        expect(result.current.role).toBe("league_admin");
      });
    });
  });

  describe("loginWithPlayerEmail local dev helper", () => {
    it("handles empty email", async () => {
      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      const res = await result.current.loginWithPlayerEmail("  ");
      expect(res.success).toBe(false);
      expect(res.message).toBe("Please enter an email address.");
    });

    it("assigns league_admin dev role for platform admin email", async () => {
      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      const res = await result.current.loginWithPlayerEmail("dextersargent@flagos.ca");
      expect(res.success).toBe(true);
      await waitFor(() => {
        expect(result.current.role).toBe("league_admin");
        expect(result.current.isLeagueAdmin).toBe(true);
      });
    });

    it("returns error message when email is not found on any roster", async () => {
      vi.mocked(requestPrivateData).mockResolvedValue({
        teams: [],
        players: [],
      });

      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      const res = await result.current.loginWithPlayerEmail("notonroster@example.com");
      expect(res.success).toBe(false);
      expect(res.message).toContain("No active player, coaching staff, or league administrator found");
    });
  });

  describe("logout, bypassLogin, and role authority helpers", () => {
    it("clears dev storage keys and signs out on logout", async () => {
      sessionStorage.setItem("demo_dev_role", "league_admin");
      localStorage.setItem("dev_auth_role", "league_admin");

      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.logout();
      });

      expect(mockSignOut).toHaveBeenCalledWith(auth);
      expect(sessionStorage.getItem("demo_dev_role")).toBeNull();
      expect(localStorage.getItem("dev_auth_role")).toBeNull();
    });

    it("supports bypassLogin with role, teamId, and playerId", async () => {
      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.bypassLogin("team_admin", "team_apex");
      });

      expect(result.current.role).toBe("team_admin");
      expect(result.current.managedTeamId).toBe("team_apex");
      expect(result.current.isTeamAdmin("team_apex")).toBe(true);
      expect(result.current.canManageTeam("team_apex")).toBe(true);
      expect(result.current.canManageSchedule).toBe(false);
      expect(result.current.canRegisterAsPlayer).toBe(false);
    });

    it("grants full authority to league_admin", async () => {
      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setDevRole("league_admin");
      });

      expect(result.current.isLeagueAdmin).toBe(true);
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.canManageSchedule).toBe(true);
      expect(result.current.canManagePlayByPlay).toBe(true);
      expect(result.current.canManageTeam("any_team")).toBe(true);
    });

    it("evaluates canRegisterAsPlayer correctly for unassigned guest", async () => {
      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.role).toBe("user");
      expect(result.current.canRegisterAsPlayer).toBe(true);
    });
  });

  describe("confirmEmailVerified checks", () => {
    it("returns false if no current user", async () => {
      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      const verified = await result.current.confirmEmailVerified();
      expect(verified).toBe(false);
    });

    it("returns false if current user is not verified after reload", async () => {
      (auth as any).currentUser = {
        reload: vi.fn().mockResolvedValue(undefined),
        emailVerified: false,
      };

      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      const verified = await result.current.confirmEmailVerified();
      expect(verified).toBe(false);
    });

    it("calls getIdToken and reloads window when email is verified", async () => {
      const reloadSpy = vi.fn();
      Object.defineProperty(window, "location", {
        writable: true,
        value: { ...window.location, reload: reloadSpy },
      });

      (auth as any).currentUser = {
        reload: vi.fn().mockResolvedValue(undefined),
        emailVerified: true,
        getIdToken: vi.fn().mockResolvedValue("new_token"),
      };

      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      const verified = await result.current.confirmEmailVerified();
      expect(verified).toBe(true);
      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  describe("onAuthStateChanged profile synchronization & cache loading", () => {
    it("flags needsEmailVerification when email is unverified", async () => {
      mockOnAuthStateChanged.mockImplementationOnce((_auth, callback) => {
        callback({
          uid: "u_unverified",
          email: "unverified@flagos.ca",
          emailVerified: false,
        });
        return () => {};
      });

      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.needsEmailVerification).toBe(true);
    });

    it("resends verification email successfully", async () => {
      (auth as any).currentUser = {
        uid: "u_unverified",
        email: "unverified@flagos.ca",
        emailVerified: false,
      };
      mockSendEmailVerification.mockResolvedValueOnce(undefined);

      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      const res = await result.current.resendVerificationEmail();
      expect(res.success).toBe(true);
      expect(mockSendEmailVerification).toHaveBeenCalled();
    });

    it("reads cached profile from localStorage on startup", async () => {
      const cached = {
        uid: "u_cached",
        email: "cached@flagos.ca",
        role: "team_admin" as const,
        managedTeamId: "team_apex",
      };
      localStorage.setItem("flagos_profile_u_cached", JSON.stringify(cached));

      mockOnAuthStateChanged.mockImplementationOnce((_auth, callback) => {
        callback({
          uid: "u_cached",
          email: "cached@flagos.ca",
          emailVerified: true,
        });
        return () => {};
      });

      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.userProfile?.managedTeamId).toBe("team_apex");
      expect(result.current.role).toBe("team_admin");
    });
  });

  describe("auth error messages mapping", () => {
    it("handles weak-password, invalid-email, and operation-not-allowed", async () => {
      const { result } = renderAuthHook();
      await waitFor(() => expect(result.current.loading).toBe(false));

      mockSignInWithEmailAndPassword.mockRejectedValueOnce(
        new FirebaseError("auth/weak-password", "Weak")
      );
      const resWeak = await result.current.loginWithEmailAndPassword("test@flagos.ca", "123");
      expect(resWeak.message).toBe("Choose a password with at least 6 characters.");

      mockSignInWithEmailAndPassword.mockRejectedValueOnce(
        new FirebaseError("auth/invalid-email", "Invalid email")
      );
      const resEmail = await result.current.loginWithEmailAndPassword("invalid", "password123");
      expect(resEmail.message).toBe("Enter a valid email address.");

      mockSignInWithEmailAndPassword.mockRejectedValueOnce(
        new FirebaseError("auth/operation-not-allowed", "Not allowed")
      );
      const resOp = await result.current.loginWithEmailAndPassword("test@flagos.ca", "password123");
      expect(resOp.message).toContain("not enabled for this site");
    });
  });
});
