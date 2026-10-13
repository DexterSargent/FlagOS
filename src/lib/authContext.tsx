"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { FirebaseError } from "firebase/app";
import {
  onAuthStateChanged,
  User,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { cleanFirebaseConfigValue } from "./firebaseConfig";
import { getSandboxPlayers, subscribeDemoSandbox, notifySandboxChange } from "./demoSandbox";

export type UserRole = "league_admin" | "team_admin" | "player" | "user";
type LoginResult = { success: true } | { success: false; message: string };

const getAuthErrorMessage = (error: unknown): string => {
  if (!(error instanceof FirebaseError)) {
    return error instanceof Error ? error.message : "Sign-in failed. Please try again.";
  }

  switch (error.code) {
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
  loginWithPlayerEmail: async () => ({ success: false }),
  logout: async () => { },
  bypassLogin: () => { },
  setDevRole: () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
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
      if (savedRole) setDevRoleState(savedRole);
      const savedTeam = sessionStorage.getItem("demo_managed_team_id") || localStorage.getItem("dev_managed_team_id");
      if (savedTeam) setDevTeamId(savedTeam);
      const savedPlayer = sessionStorage.getItem("demo_player_id") || localStorage.getItem("dev_player_id");
      if (savedPlayer) setDevPlayerId(savedPlayer);
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
  const findPlayerByEmail = async (email: string): Promise<{ id: string; teamId?: string; [key: string]: any } | null> => {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    try {
      const playersSnap = await getDocs(collection(db, "players"));
      for (const docSnap of playersSnap.docs) {
        const data = docSnap.data();
        const pEmails: string[] = Array.isArray(data.emails)
          ? data.emails.map((e: any) => String(e).trim().toLowerCase())
          : data.email
          ? [String(data.email).trim().toLowerCase()]
          : [];

        if (pEmails.includes(cleanEmail)) {
          return { id: docSnap.id, ...data };
        }
      }
    } catch (e) {
      console.error("Error looking up player by email:", e);
    }

    // Fallback: Check demo sandbox players
    try {
      const sbPlayer = getSandboxPlayers().find((p) => {
        const pEmails = Array.isArray(p.emails)
          ? p.emails.map((e) => e.toLowerCase())
          : p.email
          ? [p.email.toLowerCase()]
          : [];
        return pEmails.includes(cleanEmail);
      });
      if (sbPlayer) return sbPlayer;
    } catch {}

    return null;
  };

  // Helper to find team matching a coach or admin email address
  const findTeamByEmail = async (email: string): Promise<{ id: string; name: string } | null> => {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    try {
      const teamsSnap = await getDocs(collection(db, "teams"));
      for (const docSnap of teamsSnap.docs) {
        const data = docSnap.data();
        if (docSnap.id === "team_free_agents" || data.name?.trim().toLowerCase() === "free agent" || data.name?.trim().toLowerCase() === "free agents") {
          continue;
        }
        const tEmails: string[] = Array.isArray(data.adminEmails)
          ? data.adminEmails.map((e: any) => String(e).trim().toLowerCase())
          : [data.coachEmail, data.adminEmail, data.email].filter(Boolean).map((e: any) => String(e).trim().toLowerCase());
        if (tEmails.includes(cleanEmail)) {
          return { id: docSnap.id, name: data.name };
        }
      }
    } catch (e) {
      console.error("Error looking up team by email:", e);
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const isPendingUnassignedAccount = !!u.email &&
          pendingAccountEmails.current.has(u.email.trim().toLowerCase());
        try {
          const userDocRef = doc(db, "users", u.uid);
          const snap = await getDoc(userDocRef);
          const isEmailLeagueAdmin = !!(u.email && adminEmails.includes(u.email.toLowerCase()));

          if (isPendingUnassignedAccount) {
            const accountProfile: UserProfile = {
              uid: u.uid,
              email: u.email || "",
              ...(u.displayName ? { displayName: u.displayName } : {}),
            };
            await setDoc(userDocRef, {
              ...accountProfile,
              createdAt: serverTimestamp(),
            }, { merge: true });
            setUserProfile(accountProfile);
            setLoading(false);
            return;
          }

          // Look up if this email is attached to any player or team
          let matchingPlayer: any = null;
          let matchingTeam: any = null;
          if (u.email) {
            matchingPlayer = await findPlayerByEmail(u.email);
            matchingTeam = await findTeamByEmail(u.email);
          }

          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            if (data.role) {
              if (isEmailLeagueAdmin) {
                data.role = "league_admin";
              } else if (matchingPlayer) {
                data.role = "player";
                data.playerId = matchingPlayer.id;
                data.playerTeamId = matchingPlayer.teamId;
                data.playerData = matchingPlayer;
              } else if (matchingTeam) {
                data.role = "team_admin";
                data.managedTeamId = matchingTeam.id;
              }
            }
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
              role: newRole,
            };

            if (matchingPlayer?.id) {
              profileDataToSave.playerId = matchingPlayer.id;
            }
            if (matchingPlayer?.teamId) {
              profileDataToSave.playerTeamId = matchingPlayer.teamId;
            }
            if (matchingPlayer) {
              profileDataToSave.playerData = matchingPlayer;
            }
            if (matchingTeam?.id) {
              profileDataToSave.managedTeamId = matchingTeam.id;
            }

            await setDoc(userDocRef, profileDataToSave);
            setUserProfile({
              uid: u.uid,
              email: u.email || "",
              displayName: u.displayName || matchingPlayer?.playerName || "",
              role: newRole,
              playerId: matchingPlayer?.id,
              playerTeamId: matchingPlayer?.teamId,
              playerData: matchingPlayer,
              managedTeamId: matchingTeam?.id,
            });
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          const isEmailLeagueAdmin = !!(u.email && adminEmails.includes(u.email.toLowerCase()));
          setUserProfile({
            uid: u.uid,
            email: u.email || "",
            role: isEmailLeagueAdmin ? "league_admin" : "user",
          });
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
      await signInWithPopup(auth, provider);
      return { success: true };
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
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return { success: true };
    } catch (error: unknown) {
      console.error("Email/password login error:", error);
      return { success: false, message: getAuthErrorMessage(error) };
    }
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

      const accountProfile: UserProfile = {
        uid: credential.user.uid,
        email: credential.user.email || normalizedEmail,
        ...(name ? { displayName: name } : {}),
      };
      await setDoc(doc(db, "users", credential.user.uid), {
        ...accountProfile,
        createdAt: serverTimestamp(),
      }, { merge: true });
      setUser(credential.user);
      setUserProfile(accountProfile);
      return { success: true };
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
    }
    await signOut(auth);
  };

  const bypassLogin = (role: UserRole = "league_admin", teamId?: string, playerId?: string) => {
    setDevRole(role, teamId, playerId);
  };

  // Determine effective role & player properties
  const isDexter = !!user?.email && user.email.trim().toLowerCase() === "dextersargent@gmail.com";
  const effectiveRole: UserRole = isDexter ? "league_admin" : (devRole || userProfile?.role || "user");
  const isPlatformAdmin = isDexter || (!!user?.email && adminEmails.includes(user.email.trim().toLowerCase()));
  const effectiveTeamId: string | null =
    effectiveRole === "player"
      ? devTeamId || userProfile?.playerTeamId || null
      : devTeamId || userProfile?.managedTeamId || null;

  const effectivePlayerId: string | null =
    effectiveRole === "player" ? devPlayerId || userProfile?.playerId || null : null;

  const effectivePlayerData: any | null =
    effectiveRole === "player" ? devPlayerData || userProfile?.playerData || null : null;

  const isLeagueAdmin = isDexter || effectiveRole === "league_admin";
  const isPlayer = effectiveRole === "player";

  const isTeamAdmin = (teamId?: string) => {
    if (effectiveRole === "team_admin") {
      if (!teamId) return true;
      if (effectiveTeamId && effectiveTeamId === teamId) return true;
      if (userProfile?.managedTeamIds?.includes(teamId)) return true;
    }
    return false;
  };

  const canManageTeam = (teamId: string) => {
    if (isLeagueAdmin) return true;
    if (isTeamAdmin(teamId)) return true;
    return false;
  };

  const canManageSchedule = isLeagueAdmin;
  const canManagePlayByPlay = isLeagueAdmin;
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
