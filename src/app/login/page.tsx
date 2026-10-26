"use client";
import FlagOSLoader from "@/components/FlagOSLoader";

import { usePageGuide } from "@/lib/pageGuide";
import { LOGIN_WALKTHROUGH } from "@/lib/walkthroughs/public";

import { useAuth } from "@/lib/authContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Shield, Crown, User, ChevronLeft, ArrowRight, CheckCircle2, ShieldAlert, Lock, LogIn } from "lucide-react";
import { isRealTeam } from "@/components/TeamAssets";
import { getSandboxTeams, getSandboxPlayers } from "@/lib/demoSandbox";
import { useTheme } from "@/lib/themeContext";
import { FlagOSLogo } from "@/components/FlagOSLogo";
import EmailVerificationNotice from "@/components/EmailVerificationNotice";

export default function LoginPage() {
  usePageGuide(LOGIN_WALKTHROUGH);
  const { resolvedTheme } = useTheme();
  const {
    user,
    userProfile,
    role,
    isAuthorized,
    isLeagueAdmin,
    isTeamAdmin,
    isPlayer,
    playerData,
    managedTeamId,
    loading,
    login,
    loginWithEmailAndPassword,
    createAccount,
    sendPasswordReset,
    loginWithPlayerEmail,
    logout,
    setDevRole,
    needsEmailVerification,
  } = useAuth();
  const router = useRouter();
  const portalTeamId = userProfile?.managedTeamId || userProfile?.playerTeamId;
  const portalPath = portalTeamId && portalTeamId !== "team_free_agents" ? `/teams/${portalTeamId}` : "/";

  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [playerLoginEmail, setPlayerLoginEmail] = useState<string>("");
  const [playerLoginError, setPlayerLoginError] = useState<string>("");
  const [playerLoggingIn, setPlayerLoggingIn] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [emailPasswordError, setEmailPasswordError] = useState("");
  const [emailPasswordSuccess, setEmailPasswordSuccess] = useState("");
  const [emailPasswordLoggingIn, setEmailPasswordLoggingIn] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [googleLoggingIn, setGoogleLoggingIn] = useState(false);
  const [googleLoginError, setGoogleLoginError] = useState("");
  const [redirectUrl, setRedirectUrl] = useState<string>("");
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const red = params.get("redirect");
      if (red) setRedirectUrl(red);
      setIsLocalhost(window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    }
  }, []);

  useEffect(() => {
    const tList = getSandboxTeams().filter(isRealTeam);
    tList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    setTeams(tList);
    // Kansas City has sample plays, so it makes the best first impression for coaches and players.
    if (tList.length > 0) setSelectedTeamId((tList.find((t) => t.id === "team_kc") || tList[0]).id);

    const pList = getSandboxPlayers();
    pList.sort((a, b) => (a.playerName || "").localeCompare(b.playerName || ""));
    setPlayers(pList);
    if (pList.length > 0) setSelectedPlayerId((pList.find((p) => p.teamId === "team_kc") || pList[0]).id);
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        <FlagOSLoader />
      </div>
    );
  }

  const currentTeamName = teams.find((t) => t.id === managedTeamId)?.name;

  const handlePlayerEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlayerLoginError("");
    setPlayerLoggingIn(true);
    const res = await loginWithPlayerEmail(playerLoginEmail);
    setPlayerLoggingIn(false);
    if (res.success) {
      router.push(redirectUrl || "/profile");
    } else {
      setPlayerLoginError(res.message || "Player not found");
    }
  };

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailPasswordError("");
    setEmailPasswordSuccess("");
    setEmailPasswordLoggingIn(true);
    try {
      const result = isCreatingAccount
        ? await createAccount(displayName, email, password)
        : await loginWithEmailAndPassword(email, password);
      if (result.success) {
        if (isCreatingAccount) {
          setEmailPasswordSuccess(result.message || "Account created. Verify your email, then sign in.");
        } else if (redirectUrl || result.defaultPath) {
          router.push(redirectUrl || result.defaultPath!);
        }
      } else {
        setEmailPasswordError(result.message);
      }
    } catch (error) {
      console.error("Email/password login failed:", error);
      setEmailPasswordError(error instanceof Error ? error.message : "Sign-in failed. Please try again.");
    } finally {
      setEmailPasswordLoggingIn(false);
    }
  };

  const handlePasswordReset = async () => {
    setEmailPasswordError("");
    setEmailPasswordSuccess("");
    setSendingPasswordReset(true);
    try {
      const result = await sendPasswordReset(email);
      if (result.success) {
        setEmailPasswordSuccess(result.message || "Check your inbox for a link to set your password.");
      } else {
        setEmailPasswordError(result.message);
      }
    } finally {
      setSendingPasswordReset(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoginError("");
    setGoogleLoggingIn(true);
    try {
      const result = await login();
      if (result.success) {
        if (redirectUrl || result.defaultPath) router.push(redirectUrl || result.defaultPath!);
      } else {
        setGoogleLoginError(result.message);
      }
    } catch (error) {
      console.error("Google login failed:", error);
      setGoogleLoginError(error instanceof Error ? error.message : "Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Dynamic Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35rem] h-[35rem] bg-cyan-600 rounded-full mix-blend-screen filter blur-[150px] opacity-15 pointer-events-none"></div>

      {/* Back Button */}
      <div data-tour="login-back" className="relative z-20 w-full max-w-xl mb-4 md:mb-0 md:w-auto md:absolute md:top-8 md:left-8">
        <button
          onClick={() => router.push("/")}
          className="text-neutral-400 hover:text-white transition-colors flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md cursor-pointer text-xs"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to FlagOS
        </button>
      </div>

      <div className="bg-neutral-900/80 border border-white/10 p-8 md:p-12 rounded-[2.5rem] shadow-2xl flex flex-col items-center max-w-xl w-full backdrop-blur-xl relative z-10">
        {/* Brand Emblem */}
        <div className="flex flex-col items-center mb-4">
          <FlagOSLogo
            size="lg"
            variant="emblem"
            className="w-16 h-16 object-contain drop-shadow-[0_4px_20px_rgba(60,165,5,0.4)] hover:scale-105 transition-transform"
          />
        </div>

        {/* Redirect Notice Banner */}
        {redirectUrl && (
          <div className="w-full mb-6 p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs flex items-center gap-2.5">
            <Lock className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>
              <strong>Sign-In Required:</strong> Sign in to access your private league and team pages.
            </span>
          </div>
        )}

        {/* Role Status Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold uppercase tracking-wider mb-6 text-neutral-300">
          {isLeagueAdmin ? (
            <span className="flex items-center gap-1.5 text-amber-400 font-bold">
              <Crown className="w-3.5 h-3.5" /> League Admin
            </span>
          ) : isPlayer ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <User className="w-3.5 h-3.5" /> Rostered Player: #{playerData?.number || "00"} {playerData?.playerName}
            </span>
          ) : isTeamAdmin() ? (
            <span className="flex items-center gap-1.5 text-blue-400 font-bold">
              <Shield className="w-3.5 h-3.5" /> Team Admin: {currentTeamName || "Assigned Team"}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-neutral-400 font-medium">
              <User className="w-3.5 h-3.5" /> Spectator
            </span>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-black mb-2 uppercase tracking-tight text-center">
          {isCreatingAccount && !user ? "Create Account" : "Sign In"}
        </h1>
        <p className="text-neutral-400 text-xs text-center mb-6">
          {isCreatingAccount && !user
            ? "Create a free account with your email or Google. Use the email your coach or league has on file so you're connected to your team."
            : "Sign in with your email or Google account to access your teams and leagues."}
        </p>

        {/* Email-only roster role simulation is intentionally limited to local development. */}
        {isLocalhost && !user && (
          <form data-tour="login-local-email" onSubmit={handlePlayerEmailSubmit} className="w-full mb-6 p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Local Email Preview</span>
              </span>
              <span className="text-[10px] text-slate-600 dark:text-neutral-400 font-mono">Preview only</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Preview a player or coach account using an email on the local roster. This tool is only available in local development.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                value={playerLoginEmail}
                onChange={(e) => setPlayerLoginEmail(e.target.value)}
                placeholder="e.g. athlete@flagos.ca"
                className="min-w-0 w-full flex-1 px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs outline-none focus:border-emerald-500 font-mono"
              />
              <button
                type="submit"
                disabled={playerLoggingIn}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {playerLoggingIn ? "Verifying..." : "Sign In"}
              </button>
            </div>
            {playerLoginError && (
              <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
                {playerLoginError}
              </p>
            )}
          </form>
        )}

        {!user && (
          <form data-tour="login-email"
            onSubmit={handleEmailPasswordSubmit}
            className="w-full mb-5 p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3"
          >
            <label htmlFor="login-email" className="block text-xs font-bold uppercase tracking-wider text-neutral-200">
              {isCreatingAccount ? "Create account" : "Email and password"}
            </label>
            {isCreatingAccount && (
              <input
                id="login-display-name"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Name (optional)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-sm outline-none focus:border-emerald-500"
              />
            )}
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-sm outline-none focus:border-emerald-500"
            />
            <input
              id="login-password"
              type="password"
              autoComplete={isCreatingAccount ? "new-password" : "current-password"}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={isCreatingAccount ? 6 : undefined}
              placeholder={isCreatingAccount ? "Password (at least 6 characters)" : "Password"}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-sm outline-none focus:border-emerald-500"
            />
            {!isCreatingAccount && (
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={sendingPasswordReset}
                  title="Also works if you normally sign in with Google and want to add a password"
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-2 disabled:opacity-50 cursor-pointer"
                >
                  {sendingPasswordReset ? "Sending link..." : "Forgot or set password?"}
                </button>
              </div>
            )}
            {emailPasswordError && (
              <p role="alert" className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 p-3 rounded-lg font-medium">
                {emailPasswordError}
              </p>
            )}
            {emailPasswordSuccess && (
              <p role="status" className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg font-medium">
                {emailPasswordSuccess}
              </p>
            )}
            <button
              type="submit"
              disabled={emailPasswordLoggingIn}
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {emailPasswordLoggingIn
                ? isCreatingAccount ? "Creating account..." : "Signing in..."
                : isCreatingAccount ? "Create account" : "Sign in with email"}
            </button>
            <p className="text-center text-xs text-neutral-400">
              {isCreatingAccount ? "Already have an account?" : "New to FlagOS?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsCreatingAccount(!isCreatingAccount);
                  setEmailPasswordError("");
                }}
                className="font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-2 cursor-pointer"
              >
                {isCreatingAccount ? "Sign in" : "Create an account"}
              </button>
            </p>
          </form>
        )}

        {/* Google Auth section */}
        {user ? (
          <div data-tour="login-session" className="flex flex-col items-center gap-4 text-center w-full mb-6 p-4 rounded-2xl bg-black/40 border border-white/10">
            <div>
              <p className="text-xs text-neutral-400">Signed in as</p>
              <p className="text-sm text-white font-bold font-mono">{user.email}</p>
            </div>
            <Link href="/account" className="text-sm text-cyan-300 hover:text-cyan-200">
              Manage connected emails
            </Link>

            {needsEmailVerification ? (
              <EmailVerificationNotice />
            ) : isAuthorized ? (
              <div className="w-full space-y-2">
                <button
                  onClick={() => router.push(redirectUrl || portalPath)}
                  className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>CONTINUE TO LEAGUE PORTAL</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={logout}
                  className="py-2 px-4 text-neutral-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Sign Out Account
                </button>
              </div>
            ) : !userProfile?.role ? (
              <div className="w-full space-y-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs text-left space-y-1">
                  <div className="font-bold text-emerald-800">Account ready — no league role assigned</div>
                  <p className="text-[11px] leading-relaxed">
                    Your account can have a different role in each league. Choose a league to join, or create a league to become its commissioner.
                  </p>
                </div>
                <Link
                  href="/pricing"
                  className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  Explore league options
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={logout}
                  className="py-2 px-4 text-neutral-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="w-full space-y-3">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-left space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-400">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Account Not Authorized</span>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    This Google account is not registered to an active league commissioner, team coaching staff, or player roster.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await logout();
                    await handleGoogleLogin();
                  }}
                  className="w-full py-3 px-4 bg-white hover:bg-neutral-200 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Switch Account / Sign In Again</span>
                </button>
                <button
                  onClick={logout}
                  className="py-1 px-4 text-neutral-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {googleLoginError && (
              <p role="alert" className="w-full mb-4 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 p-3 rounded-lg font-medium">
                {googleLoginError}
              </p>
            )}
            <button data-tour="login-google"
              onClick={handleGoogleLogin}
              disabled={googleLoggingIn}
              className="w-full py-3.5 mb-6 bg-white hover:bg-neutral-200 text-black font-extrabold text-sm rounded-2xl transition-all active:scale-98 shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{googleLoggingIn ? "SIGNING IN..." : "SIGN IN WITH GOOGLE"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Localhost Role Switcher & Dev Tools (ONLY rendered in local development, NEVER in production on flagos.ca) */}
        {isLocalhost && (
          <div data-tour="login-local-roles" className="w-full border-t border-white/10 pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Preview a Role
              </span>
              <span className="text-[10px] text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded font-mono">
                Local preview only
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {/* 1. League Admin Button */}
              <button
                onClick={() => {
                  setDevRole("league_admin");
                  router.push(redirectUrl || "/");
                }}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  isLeagueAdmin
                    ? "bg-amber-500/10 border-amber-500/50 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                    : "bg-neutral-950/60 border-white/5 text-neutral-300 hover:bg-white/5 hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Crown className={`w-5 h-5 ${isLeagueAdmin ? "text-amber-400" : "text-neutral-500"}`} />
                  <div className="font-bold text-sm">League Admin</div>
                </div>
                {isLeagueAdmin && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
              </button>

              {/* 2. Team Admin Controls */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  isTeamAdmin()
                    ? "bg-blue-500/10 border-blue-500/50 text-white shadow-[0_0_15px_rgba(var(--league-accent-rgb),0.2)]"
                    : "bg-neutral-950/60 border-white/5 text-neutral-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Shield className={`w-5 h-5 ${isTeamAdmin() ? "text-blue-400" : "text-neutral-500"}`} />
                    <div className="font-bold text-sm">Team Admin</div>
                  </div>
                  {isTeamAdmin() && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3 pt-2 border-t border-white/5">
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="min-w-0 w-full min-h-10 flex-1 bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                    {teams.length === 0 && <option value="">No teams available</option>}
                  </select>
                  <button
                    onClick={() => {
                      if (selectedTeamId) {
                        setDevRole("team_admin", selectedTeamId);
                        router.push(redirectUrl || `/teams/${selectedTeamId}`);
                      }
                    }}
                    disabled={!selectedTeamId}
                    className="min-h-10 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Apply & Go
                  </button>
                </div>
              </div>

              {/* 3. Player Controls */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  isPlayer
                    ? "bg-emerald-500/10 border-emerald-500/50 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    : "bg-neutral-950/60 border-white/5 text-neutral-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <User className={`w-5 h-5 ${isPlayer ? "text-emerald-400" : "text-neutral-500"}`} />
                    <div className="font-bold text-sm">Rostered Player</div>
                  </div>
                  {isPlayer && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3 pt-2 border-t border-white/5">
                  <select
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    className="min-w-0 w-full min-h-10 flex-1 bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {players.map((p) => {
                      const team = teams.find((t) => t.id === p.teamId);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.playerName} (#{p.number || "00"}) — {team?.name || "Free Agent"}
                        </option>
                      );
                    })}
                    {players.length === 0 && <option value="">No rostered players</option>}
                  </select>
                  <button
                    onClick={() => {
                      const chosen = players.find((p) => p.id === selectedPlayerId);
                      if (chosen) {
                        setDevRole("player", chosen.teamId, chosen.id);
                        router.push(redirectUrl || "/profile");
                      }
                    }}
                    disabled={!selectedPlayerId}
                    className="min-h-10 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Sign In As Player
                  </button>
                </div>
              </div>

              {/* 4. Regular User (Spectator) Button */}
              <button
                onClick={() => {
                  setDevRole("user");
                  router.push(redirectUrl || "/");
                }}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  role === "user"
                    ? "bg-white/10 border-white/30 text-white"
                    : "bg-neutral-950/60 border-white/5 text-neutral-300 hover:bg-white/5 hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <User className={`w-5 h-5 ${role === "user" ? "text-white" : "text-neutral-500"}`} />
                  <div className="font-bold text-sm">Spectator (Default View)</div>
                </div>
                {role === "user" && <CheckCircle2 className="w-4 h-4 text-white" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
