"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { FirebaseError } from "firebase/app";
import {
  onAuthStateChanged,
  User,
  signInWithPopup,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { cleanFirebaseConfigValue } from "./firebaseConfig";
import { DEMO_TEAM_IDS, subscribeDemoSandbox, notifySandboxChange } from "./demoSandboxRuntime";
import { requestPrivateData } from "./secureWrites";
import { resolveConnectedAccount } from "./accountEmails";
import { useEmbedState } from "./embedState";

export type UserRole = "league_admin" | "team_admin" | "player" | "user";
type LoginResult = { success: true; message?: string; defaultPath?: string } | { success: false; message: string };
type IdentityLookup = {
  teams: Array<{ id: string; name: string }>;
  players: Array<{ id: string; email?: string; emails?: string[]; [key: string]: any }>;
};

async function getSuccessfulLoginResult(user: User): Promise<LoginResult> {
  if (!user.emailVerified || !user.email) return { success: true };
  try {
    const { teams } = await requestPrivateData<IdentityLookup>("lookup");
    const team = teams.find((entry) => entry.id !== "team_free_agents");
    return { success: true, defaultPath: team ? `/teams/${team.id}` : undefined };
  } catch {
    return { success: true };
  }
}

const getAuthErrorMessage = (error: unknown): string => {
  if (!(error instanceof FirebaseError)) {
    return error instanceof Error ? error.message : "Sign-in failed. Please try again.";
  }

  switch (error.code) {
    case "auth/unauthorized-domain":
      return "This domain is not authorized for Google Sign-In in Firebase. If this is a new domain, please refresh and try again.";
    case "auth/popup-blocked":
      return "The sign-in popup was blocked by your browser. Please allow popups for this site and try again, or sign in with email and password.";
    case "auth/cancelled-popup-request":
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled. Please try again.";
    case "auth/api-key-not-valid":
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
      return "Sign-in is temporarily unavailable because the site's Firebase API key is invalid. Please contact the site administrator.";
    case "auth/operation-not-allowed":
      return "Email and password sign-in or account creation is not enabled for this site. Please contact the site administrator.";
    case "auth/email-already-in-use":
      return "An account already exists for this email. Sign in instead.";
    case "auth/weak-password":
      return "Choose a password with at least 6 characters.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "The email address or password is incorrect.";
    case "auth/too-many-requests":
      return "There have been too many sign-in attempts. Please wait and try again.";
    case "auth/network-request-failed":
      return "Unable to reach Firebase. Check your internet connection and try again.";
    default:
      return error.message;
  }
};

const PROFILE_CACHE_PREFIX = "flagos_profile_";

function readCachedProfile(uid: string, email: string | null): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_PREFIX + uid);
    if (!raw) return null;
    const profile = JSON.parse(raw) as UserProfile;
    if (profile?.uid !== uid) return null;
    if ((profile.email || "").toLowerCase() !== (email || "").toLowerCase()) return null;
    return profile;
  } catch {
    return null;
  }
}

function writeCachedProfile(uid: string, profile: UserProfile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROFILE_CACHE_PREFIX + uid, JSON.stringify({ ...profile, uid }));
  } catch {}
}

function clearCachedProfiles() {
  if (typeof window === "undefined") return;
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(PROFILE_CACHE_PREFIX) || key.startsWith("flagos_memberships_"))
      .forEach((key) => localStorage.removeItem(key));
  } catch {}
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role?: UserRole;
  managedTeamId?: string;
  managedTeamIds?: string[];
  playerId?: string;
  playerTeamId?: string;
  playerData?: any;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  role: UserRole;
  isAuthorized: boolean; // True if authenticated with an authorized email (admin, team admin/coach, or rostered player)
  isPlatformAdmin: boolean;
  isAdmin: boolean; // General admin flag (true for league_admin or team_admin)
  isLeagueAdmin: boolean; // Full write/edit access over schedule, play-by-play, teams
  isTeamAdmin: (teamId?: string) => boolean; // Team admin for specific or any team
  isPlayer: boolean; // Player on a specific team
  playerId: string | null; // Id of player in players collection
  playerTeamId: string | null; // Team id the player is rostered on
  playerData: any | null; // Player doc details (name, jersey number, stats, etc.)
  canManageTeam: (teamId: string) => boolean; // True if league_admin OR team_admin for this team
  canManageSchedule: boolean; // League admin only
  canManagePlayByPlay: boolean; // League admin only
  managedTeamId: string | null;
  canRegisterAsPlayer: boolean;
  loading: boolean;
  login: () => Promise<LoginResult>;
  loginWithEmailAndPassword: (email: string, password: string) => Promise<LoginResult>;
  createAccount: (displayName: string, email: string, password: string) => Promise<LoginResult>;
  sendPasswordReset: (email: string) => Promise<LoginResult>;
  loginWithPlayerEmail: (email: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  bypassLogin: (role?: UserRole, teamId?: string, playerId?: string) => void;
  setDevRole: (role: UserRole, teamId?: string, playerId?: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  role: "user",
  isAuthorized: false,
  isPlatformAdmin: false,
  isAdmin: false,
  isLeagueAdmin: false,
  isTeamAdmin: () => false,
  isPlayer: false,
  playerId: null,
  playerTeamId: null,
  playerData: null,
  canManageTeam: () => false,
  canManageSchedule: false,
  canManagePlayByPlay: false,
  managedTeamId: null,
  canRegisterAsPlayer: true,
  loading: true,
  login: async () => ({ success: false, message: "Sign-in is unavailable." }),
  loginWithEmailAndPassword: async () => ({ success: false, message: "Sign-in is unavailable." }),
  createAccount: async () => ({ success: false, message: "Account creation is unavailable." }),
  sendPasswordReset: async () => ({ success: false, message: "Password reset is unavailable." }),
  loginWithPlayerEmail: async () => ({ success: false }),
  logout: async () => { },
  bypassLogin: () => { },
  setDevRole: () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const embedState = useEmbedState();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [devRole, setDevRoleState] = useState<UserRole | null>(null);
  const [devTeamId, setDevTeamId] = useState<string | null>(null);
  const [devPlayerId, setDevPlayerId] = useState<string | null>(null);
  const [devPlayerData, setDevPlayerData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const pendingAccountEmails = useRef(new Set<string>());

  // Restore developer/testing auth state from sessionStorage (for ephemeral demo session) or localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedRole = (sessionStorage.getItem("demo_dev_role") || localStorage.getItem("dev_auth_role")) as UserRole | null;
      if (savedRole && savedRole !== devRole) setDevRoleState(savedRole);
      const savedTeam = sessionStorage.getItem("demo_managed_team_id") || localStorage.getItem("dev_managed_team_id");
      if (savedTeam && savedTeam !== devTeamId) setDevTeamId(savedTeam);
      const savedPlayer = sessionStorage.getItem("demo_player_id") || localStorage.getItem("dev_player_id");
      if (savedPlayer && savedPlayer !== devPlayerId) setDevPlayerId(savedPlayer);
      const savedData = sessionStorage.getItem("demo_player_data") || localStorage.getItem("dev_player_data");
      if (savedData) {
        try {
          setDevPlayerData(JSON.parse(savedData));
        } catch {}
      }
    }
  }, []);

  const adminEmails = (cleanFirebaseConfigValue(process.env.NEXT_PUBLIC_ADMIN_EMAILS) || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  // Helper to find player matching an email address
  const findPlayerByEmail = async (email: string, lookup?: Promise<IdentityLookup>): Promise<{ id: string; teamId?: string; [key: string]: any } | null> => {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    try {
      const results = await (lookup || requestPrivateData<IdentityLookup>("lookup"));
      const match = results.players.find((player) => {
        const playerEmails = [
          ...(Array.isArray(player.emails) ? player.emails : []),
          ...(player.email ? [player.email] : []),
        ].map((value) => value.trim().toLowerCase());
        return playerEmails.includes(cleanEmail);
      });
      if (match) return match;
    } catch (e) {
      console.error("Error looking up player by email:", e);
    }

    // Demo identities are session-local; do not initialize fixtures for real accounts.
    const demoParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const routeParts = typeof window !== "undefined" ? window.location.pathname.split("/") : [];
    const isCustomerRoute =
      routeParts[1] === "teams" && Boolean(routeParts[2]) && !DEMO_TEAM_IDS.includes(routeParts[2]);
    const canUseDemoPlayers = !isCustomerRoute && typeof window !== "undefined" && (
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ||
      demoParams?.get("demo") === "true" || demoParams?.get("embed") === "true" ||
      sessionStorage.getItem("flagos_demo_active") === "true"
    );
    if (canUseDemoPlayers) {
      try {
        const { getSandboxPlayers } = await import("./demoSandbox");
        const sbPlayer = getSandboxPlayers().find((p) => {
          const emails = Array.isArray(p.emails) ? p.emails : p.email ? [p.email] : [];
          return emails.some((value) => value.toLowerCase() === cleanEmail);
        });
        if (sbPlayer) return sbPlayer;
      } catch {}
    }

    return null;
  };

  // Helper to find team matching a coach or admin email address
  const findTeamByEmail = async (email: string, lookup?: Promise<IdentityLookup>): Promise<{ id: string; name: string } | null> => {
    if (!email) return null;
    try {
      const results = await (lookup || requestPrivateData<IdentityLookup>("lookup"));
      const matchingTeam = results.teams.find((team) =>
        team.id !== "team_free_agents" &&
        team.name.trim().toLowerCase() !== "free agent" &&
        team.name.trim().toLowerCase() !== "free agents"
      );
      if (matchingTeam) return matchingTeam;
    } catch (e) {
      console.error("Error looking up team by email:", e);
    }

    return null;
  };

  useEffect(() => {
    // Handle redirect result if user returned from Google redirect sign-in (e.g. on mobile)
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setUser(result.user);
        }
      })
      .catch((err) => {
        console.error("Redirect sign-in error:", err);
      });

    let authVersion = 0;
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      const version = ++authVersion;
      setUser(u);
      // Paint the last resolved profile for this uid instantly (UI gating only;
      // Firestore rules enforce real access) and revalidate in the background.
      const cachedProfile = u?.emailVerified ? readCachedProfile(u.uid, u.email) : null;
      setUserProfile(cachedProfile);
      setLoading(!cachedProfile && !!u);
      if (u) {
        const isPendingUnassignedAccount = !!u.email &&
          pendingAccountEmails.current.has(u.email.trim().toLowerCase());
        try {
          const userDocRef = doc(db, "users", u.uid);
          const isEmailLeagueAdmin = !!(u.email && adminEmails.includes(u.email.toLowerCase()));

          if (isPendingUnassignedAccount) {
            const accountProfile: UserProfile = {
              uid: u.uid,
              email: u.email || "",
              displayName: u.displayName || "",
              role: "user",
            };
            setUserProfile(accountProfile);
            setLoading(false);
            return;
          }

          // Look up if this email is attached to any player or team
          const lookup = u.email && u.emailVerified
            ? requestPrivateData<IdentityLookup>("lookup")
            : undefined;
          const [snap, [matchingPlayer, matchingTeam]] = await Promise.all([
            getDoc(userDocRef),
            lookup && u.email
              ? Promise.all([findPlayerByEmail(u.email, lookup), findTeamByEmail(u.email, lookup)])
              : Promise.resolve([null, null]),
          ]);
          if (version !== authVersion) return;
          const managedTeamIds = lookup
            ? (await lookup.catch(() => ({ teams: [] as IdentityLookup["teams"] }))).teams.map((team) => team.id)
            : [];

          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            data.role = isEmailLeagueAdmin
              ? "league_admin"
              : matchingTeam
              ? "team_admin"
              : matchingPlayer
              ? "player"
              : "user";
            if (matchingPlayer) {
              data.playerId = matchingPlayer.id;
              data.playerTeamId = matchingPlayer.teamId;
              data.playerData = matchingPlayer;
            }
            if (matchingTeam) {
              data.managedTeamId = matchingTeam.id;
              data.managedTeamIds = managedTeamIds;
            }
            writeCachedProfile(u.uid, data);
            setUserProfile(data);
          } else {
            // Create user profile in Firestore (strictly omitting undefined fields)
            const newRole: UserRole = isEmailLeagueAdmin
              ? "league_admin"
              : matchingPlayer
              ? "player"
              : matchingTeam
              ? "team_admin"
              : "user";

            const profileDataToSave: Record<string, any> = {
              uid: u.uid,
              email: u.email || "",
              displayName: u.displayName || matchingPlayer?.playerName || "",
              role: "user",
            };

            await setDoc(userDocRef, profileDataToSave);
            if (version !== authVersion) return;
            const createdProfile: UserProfile = {
              uid: u.uid,
              email: u.email || "",
              displayName: u.displayName || matchingPlayer?.playerName || "",
              role: newRole,
              playerId: matchingPlayer?.id,
              playerTeamId: matchingPlayer?.teamId,
              playerData: matchingPlayer,
              managedTeamId: matchingTeam?.id,
              managedTeamIds: matchingTeam ? managedTeamIds : undefined,
            };
            writeCachedProfile(u.uid, createdProfile);
            setUserProfile(createdProfile);
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          if (version !== authVersion) return;
          if (!cachedProfile) {
            const isEmailLeagueAdmin = !!(u.email && adminEmails.includes(u.email.toLowerCase()));
            setUserProfile({
              uid: u.uid,
              email: u.email || "",
              role: isEmailLeagueAdmin ? "league_admin" : "user",
            });
          }
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => {
      authVersion++;
      unsubscribe();
    };
  }, []);

  // Sync or reset dev role when demo session changes
  useEffect(() => {
    const unsub = subscribeDemoSandbox(() => {
      if (typeof window !== "undefined") {
        const savedRole = (sessionStorage.getItem("demo_dev_role") || localStorage.getItem("dev_auth_role")) as UserRole | null;
        setDevRoleState(savedRole || null);
        const savedTeam = sessionStorage.getItem("demo_managed_team_id") || localStorage.getItem("dev_managed_team_id");
        setDevTeamId(savedTeam || null);
        const savedPlayer = sessionStorage.getItem("demo_player_id") || localStorage.getItem("dev_player_id");
        setDevPlayerId(savedPlayer || null);
        const savedData = sessionStorage.getItem("demo_player_data") || localStorage.getItem("dev_player_data");
        if (savedData) {
          try {
            setDevPlayerData(JSON.parse(savedData));
          } catch {
            setDevPlayerData(null);
          }
        } else {
          setDevPlayerData(null);
        }
      }
    });
    return () => unsub();
  }, []);

  const setDevRole = async (role: UserRole, teamId?: string, playerId?: string) => {
    setDevRoleState(role);
    setDevTeamId(teamId || null);
    setDevPlayerId(playerId || null);

    let foundPlayer: any = null;
    if (playerId) {
      // First check demo sandbox players
      const { getSandboxPlayers } = await import("./demoSandbox");
      const sbPlayer = getSandboxPlayers().find((p) => p.id === playerId);
      if (sbPlayer) {
        foundPlayer = sbPlayer;
      } else {
        try {
          const playerSnap = await getDoc(doc(db, "players", playerId));
          if (playerSnap.exists()) {
            foundPlayer = { id: playerSnap.id, ...playerSnap.data() };
          }
        } catch (e) {
          console.error("Error loading dev player data:", e);
        }
      }
    }
    setDevPlayerData(foundPlayer);

    if (typeof window !== "undefined") {
      sessionStorage.setItem("demo_dev_role", role);
      if (teamId) {
        sessionStorage.setItem("demo_managed_team_id", teamId);
      } else {
        sessionStorage.removeItem("demo_managed_team_id");
      }
      if (playerId) {
        sessionStorage.setItem("demo_player_id", playerId);
      } else {
        sessionStorage.removeItem("demo_player_id");
      }
      if (foundPlayer) {
        sessionStorage.setItem("demo_player_data", JSON.stringify(foundPlayer));
      } else {
        sessionStorage.removeItem("demo_player_data");
      }
      notifySandboxChange();
    }
  };

  const loginWithPlayerEmail = async (email: string): Promise<{ success: boolean; message?: string }> => {
    if (
      typeof window === "undefined" ||
      (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1")
    ) {
      return {
        success: false,
        message: "Email-only roster access is available only during local development. Use Google or password sign-in.",
      };
    }

    if (!email || !email.trim()) {
      return { success: false, message: "Please enter an email address." };
    }
    const clean = email.trim().toLowerCase();

    // Check if league admin email
    if (adminEmails.includes(clean)) {
      await setDevRole("league_admin");
      return { success: true };
    }

    // Check if player roster email
    const player = await findPlayerByEmail(clean);
    if (player) {
      await setDevRole("player", player.teamId, player.id);
      return { success: true };
    }

    // Check if team coach/admin email
    const team = await findTeamByEmail(clean);
    if (team) {
      await setDevRole("team_admin", team.id);
      return { success: true };
    }

    return {
      success: false,
      message: `No active player, coaching staff, or league administrator found with email "${clean}". Please contact your league commissioner to register your account.`,
    };
  };

  const login = async (): Promise<LoginResult> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      // Redirect sign-in can lose its result when mobile browsers block cross-site storage.
      // Open the popup directly from the click handler to preserve user activation.
      const credential = await signInWithPopup(auth, provider);
      return getSuccessfulLoginResult(await resolveConnectedAccount(credential.user));
    } catch (error: unknown) {
      console.error("Login Error:", error);
      if (typeof window !== "undefined" && window.location.hostname === "localhost") {
        const message = getAuthErrorMessage(error);
        if (
          confirm(
            `Firebase Auth failed:\n${message}\n\nWould you like to bypass login and sign in as League Admin for testing?`
          )
        ) {
          setDevRole("league_admin");
          setLoading(false);
          return { success: true };
        }
      }
      return { success: false, message: getAuthErrorMessage(error) };
    }
  };

  const loginWithEmailAndPassword = async (
    email: string,
    password: string
  ): Promise<LoginResult> => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      return getSuccessfulLoginResult(await resolveConnectedAccount(credential.user));
    } catch (error: unknown) {
      console.error("Email/password login error:", error);
      return { success: false, message: getAuthErrorMessage(error) };
    }
  };

  // Also lets Google-only accounts add a password, for browsers where the Google popup is blocked.
  const sendPasswordReset = async (email: string): Promise<LoginResult> => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return { success: false, message: "Enter your email address first." };
    }
    try {
      await sendPasswordResetEmail(auth, normalizedEmail, {
        url: `${window.location.origin}/login`,
      });
    } catch (error: unknown) {
      if (!(error instanceof FirebaseError && error.code === "auth/user-not-found")) {
        console.error("Password reset error:", error);
        return { success: false, message: getAuthErrorMessage(error) };
      }
    }
    return {
      success: true,
      message: `If an account exists for ${normalizedEmail}, we sent a link to set a new password. Check your inbox and spam folder.`,
    };
  };

  const createAccount = async (
    displayName: string,
    email: string,
    password: string
  ): Promise<LoginResult> => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return { success: false, message: "Enter your email address." };
    }
    if (password.length < 6) {
      return { success: false, message: "Choose a password with at least 6 characters." };
    }

    pendingAccountEmails.current.add(normalizedEmail);
    try {
      const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const name = displayName.trim();
      if (name) {
        await updateProfile(credential.user, { displayName: name });
      }

      await sendEmailVerification(credential.user);
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      return {
        success: true,
        message: "Account created. Verify your email using the link we sent, then sign in.",
      };
    } catch (error: unknown) {
      console.error("Account creation error:", error);
      return { success: false, message: getAuthErrorMessage(error) };
    } finally {
      pendingAccountEmails.current.delete(normalizedEmail);
    }
  };

  const logout = async () => {
    setDevRoleState(null);
    setDevTeamId(null);
    setDevPlayerId(null);
    setDevPlayerData(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("demo_dev_role");
      sessionStorage.removeItem("demo_managed_team_id");
      sessionStorage.removeItem("demo_player_id");
      sessionStorage.removeItem("demo_player_data");
      localStorage.removeItem("dev_auth_role");
      localStorage.removeItem("dev_managed_team_id");
      localStorage.removeItem("dev_player_id");
      localStorage.removeItem("dev_player_data");
      clearCachedProfiles();
    }
    await signOut(auth);
  };

  const bypassLogin = (role: UserRole = "league_admin", teamId?: string, playerId?: string) => {
    setDevRole(role, teamId, playerId);
  };

  // Check if inside embedded interactive demo frame
  const isEmbed = embedState.embedQuery;
  const isEmbedPlaybook = isEmbed && embedState.playbookPath;
  // In the interactive demo frame, users are locked into admin role for everything except playbook
  // (In playbook, locked into team coach / team admin role so they can edit franchise playbooks)
  const lockedEmbedRole: UserRole | null = isEmbed ? (isEmbedPlaybook ? "team_admin" : "league_admin") : null;

  // Determine effective role & player properties
  const isDexter = !!user?.emailVerified && !!user.email && ["dextersargent@gmail.com", "dexter@yuwffl.ca", "dexter.b.harvey@gmail.com"].includes(user.email.trim().toLowerCase());
  // Explicitly chosen role in dev Role Switcher takes precedence so admins/devs can simulate any persona
  const effectiveRole: UserRole =
    lockedEmbedRole || devRole || (isDexter ? "league_admin" : (userProfile?.role || "user"));
  const isPlatformAdmin = isDexter || (!!user?.email && adminEmails.includes(user.email.trim().toLowerCase()));
  const effectiveTeamId: string | null =
    lockedEmbedRole === "team_admin"
      ? (typeof window !== "undefined" && window.location.pathname.split("/teams/")[1]?.split("/")[0]) || "team_kc"
      : (effectiveRole === "player"
          ? devTeamId || userProfile?.playerTeamId || null
          : devTeamId || userProfile?.managedTeamId || null);

  const effectivePlayerId: string | null =
    effectiveRole === "player" ? devPlayerId || userProfile?.playerId || null : null;

  const effectivePlayerData: any | null =
    effectiveRole === "player" ? devPlayerData || userProfile?.playerData || null : null;

  const isLeagueAdmin = lockedEmbedRole
    ? lockedEmbedRole === "league_admin"
    : (devRole ? devRole === "league_admin" : (isDexter || effectiveRole === "league_admin"));
  const isPlayer = effectiveRole === "player";

  const isTeamAdmin = (teamId?: string) => {
    if (lockedEmbedRole === "team_admin") return true;
    if (isDexter) return true;
    if (effectiveRole === "team_admin") {
      if (!teamId) return true;
      if (effectiveTeamId === teamId) return true;
      if (userProfile?.managedTeamIds?.includes(teamId)) return true;
    }
    return false;
  };

  const canManageTeam = (teamId: string) => {
    if (lockedEmbedRole === "team_admin") return true;
    if (isDexter) return true;
    if (isLeagueAdmin) return true;
    if (isTeamAdmin(teamId)) return true;
    return false;
  };

  const canManageSchedule = isLeagueAdmin || lockedEmbedRole === "league_admin";
  const canManagePlayByPlay = isLeagueAdmin || lockedEmbedRole === "league_admin";
  const isAdmin = isLeagueAdmin || effectiveRole === "team_admin";

  // Authorized email definition:
  // User must be authenticated AND have an authorized role (League Admin, Team Admin / Coach, or Rostered Player)
  const isAuthorized: boolean =
    (!!user || isPlayer || isAdmin) &&
    (isLeagueAdmin || isPlayer || isTeamAdmin() || !!effectiveTeamId);

  // Can register as player: ONLY users who are not logged in, OR users logged in without a team/role
  const canRegisterAsPlayer =
    !isLeagueAdmin &&
    !isPlayer &&
    effectiveRole === "user" &&
    !effectiveTeamId &&
    !effectivePlayerId &&
    !userProfile?.managedTeamId &&
    !userProfile?.playerTeamId &&
    !userProfile?.playerId;

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        role: effectiveRole,
        isAuthorized,
        isPlatformAdmin,
        isAdmin,
        isLeagueAdmin,
        isTeamAdmin,
        isPlayer,
        playerId: effectivePlayerId,
        playerTeamId: effectiveTeamId,
        playerData: effectivePlayerData,
        canManageTeam,
        canManageSchedule,
        canManagePlayByPlay,
        managedTeamId: effectiveTeamId,
        canRegisterAsPlayer,
        loading,
        login,
        loginWithEmailAndPassword,
        createAccount,
        sendPasswordReset,
        loginWithPlayerEmail,
        logout,
        bypassLogin,
        setDevRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
