"use client";

import { useEffect, useState, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/authContext";
import { useLeague } from "@/lib/leagueContext";
import { ShieldAlert, Lock, LogIn, Home, ArrowRight, Shield, PlayCircle } from "lucide-react";
import FlagOSLoader from "@/components/FlagOSLoader";
import { isDemoTeamId, useTeamRecord } from "@/lib/teamRecord";
import { useEmbedState } from "@/lib/embedState";
import EmailVerificationNotice from "@/components/EmailVerificationNotice";

// The only pages publicly accessible without being logged in to an authorized email
const PUBLIC_ROUTES = ["/", "/pricing", "/login"];

// Strictly restrict iframe embedded sandbox access ONLY to the 4 features showcased in the preview frame
function isShowcaseRoute(path: string): boolean {
  if (path.startsWith("/matches/") && path.endsWith("/play-by-play")) return true;
  if (path.endsWith("/playbook")) return true;
  if (path === "/schedule") return true;
  if (path.startsWith("/league/")) return true;
  return false;
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, isPlayer, isAuthorized, loading, logout, needsEmailVerification, identityLookupFailed } = useAuth();
  const { isDemoLeague, activeLeagueId } = useLeague();
  const { demoFlag, inIframe, embedQuery } = useEmbedState();
  const routeTeamId = pathname.startsWith("/teams/") ? pathname.split("/")[2] || null : null;
  const isCustomerTeamRoute = !!routeTeamId && !isDemoTeamId(routeTeamId);
  const { team: routeTeam, resolved: routeTeamResolved } = useTeamRecord(routeTeamId, isCustomerTeamRoute);
  // Teams that publish their profile expose read-only pages to signed-out visitors.
  const isPublicTeamRoute = isCustomerTeamRoute && routeTeam?.visibility === "public" &&
    /^\/teams\/[^/]+(?:\/(?:schedule|roster|stats)|\/matches\/[^/]+\/stat-keeper)?\/?$/.test(pathname);
  const awaitingTeam = isCustomerTeamRoute && !routeTeam && !routeTeamResolved;

  // Synchronous client/server evaluation:
  // Is this the interactive demo sandbox where all features should be explored without signing in?
  const isDemo = useMemo(() => {
    if (isCustomerTeamRoute) return false;
    // 1. Explicit demo routes
    if (
      pathname.startsWith("/league/default") ||
      pathname.startsWith("/league/demo") ||
      pathname.startsWith("/matches/match_demo_")
    ) {
      return true;
    }

    // 2. Active league context is the default demo league
    if (isDemoLeague || activeLeagueId === "default" || activeLeagueId === "demo") {
      return true;
    }

    // 3. Client-side storage or query parameter (read after hydration)
    if (demoFlag) return true;

    return false;
  }, [pathname, isDemoLeague, activeLeagueId, isCustomerTeamRoute, demoFlag]);

  const isEmbedShowcase = !isCustomerTeamRoute && inIframe && embedQuery && isShowcaseRoute(pathname);

  // Determine if current path is strictly public
  const isPublic = PUBLIC_ROUTES.includes(pathname) || isPublicTeamRoute;

  // Synchronously persist demo state so subsequent sub-page navigations stay in sandbox
  useEffect(() => {
    if (typeof window !== "undefined" && isDemo) {
      try {
        sessionStorage.setItem("flagos_demo_active", "true");
        localStorage.setItem("flagos_demo_active", "true");
      } catch {}
    }
  }, [isDemo, pathname]);

  // Redirect unauthenticated visitors on private real leagues
  useEffect(() => {
    if (!isPublic && !isEmbedShowcase && !isDemo && !loading && !awaitingTeam && !user && !isPlayer) {
      if (typeof window !== "undefined") {
        router.push(`/login?redirect=${encodeURIComponent(pathname + window.location.search)}`);
      }
    }
  }, [isPublic, isEmbedShowcase, isDemo, loading, awaitingTeam, user, isPlayer, pathname, router]);

  // If public route, valid showcase preview frame, or demo sandbox, GRANT IMMEDIATE ACCESS!
  // Zero database writes, zero sign-in required.
  if (isPublic || isEmbedShowcase || isDemo) {
    return <>{children}</>;
  }

  // Still checking Firebase Auth / Firestore verification for real leagues
  if (loading || (awaitingTeam && !user)) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-emerald-600/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          <FlagOSLoader size={112} label="Verifying authorization" />
          <div>
            <div className="text-sm font-bold uppercase tracking-wider text-neutral-300">
              Verifying Authorization
            </div>
            <div className="text-xs text-neutral-500 font-mono mt-0.5">
              Securing FlagOS Portal Access (flagos.ca)...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Case 1: Visitor is completely unauthenticated on a private league
  if (!user && !isPlayer) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="flex flex-col items-center text-center space-y-4 max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold uppercase tracking-wider text-white">
              Private League Portal
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              Sign in is required to view this private league portal.
            </div>
          </div>
          <div className="flex flex-col w-full gap-2.5 pt-2">
            <Link
              href={`/login?redirect=${encodeURIComponent(pathname)}`}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In to Continue</span>
            </Link>
            <Link
              href="/league/default?demo=true"
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-400 hover:text-cyan-300 text-xs font-bold transition-all border border-white/10 flex items-center justify-center gap-1.5"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Explore Demo League Sandbox</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Case 2a: Password account that hasn't clicked its verification link yet. Identity lookup
  // requires a verified email, so explain that instead of claiming the email isn't registered.
  if (!isAuthorized && needsEmailVerification) {
    return (
      <div className="dark min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 md:p-12 font-sans">
        <div className="bg-neutral-900/90 border border-amber-500/30 p-8 md:p-10 rounded-[2rem] shadow-2xl flex flex-col items-center max-w-md w-full text-center space-y-5">
          <h1 className="text-2xl font-black uppercase tracking-tight">One more step</h1>
          <EmailVerificationNotice />
        </div>
      </div>
    );
  }

  // Case 2b: The membership check itself failed (offline or throttled). Don't claim the account has no access.
  if (!isAuthorized && identityLookupFailed) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-neutral-900/90 border border-white/10 p-8 rounded-[2rem] max-w-md w-full text-center space-y-4">
          <ShieldAlert className="w-10 h-10 mx-auto text-amber-400" aria-hidden />
          <h1 className="text-xl font-black">We couldn&apos;t confirm your access</h1>
          <p className="text-sm text-neutral-300">
            FlagOS is busy or your connection dropped while checking your leagues and teams. Your access hasn&apos;t changed.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full min-h-11 rounded-xl bg-white text-black font-extrabold text-sm hover:bg-neutral-200"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Case 2: User is signed in with an unauthorized email
  // (e.g. personal email that is not an admin, not a coach, and not in any player roster)
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden font-sans selection:bg-amber-500/30 selection:text-amber-200">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35rem] h-[35rem] bg-amber-600/10 rounded-full blur-[150px] pointer-events-none" />

        <div className="bg-neutral-900/90 border border-amber-500/30 p-8 md:p-12 rounded-[2.5rem] shadow-2xl flex flex-col items-center max-w-lg w-full backdrop-blur-xl relative z-10 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              <span>{userProfile?.role ? "Access Restricted" : "No League Membership Yet"}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
              {userProfile?.role ? "Private League Portal" : "Your account is ready"}
            </h1>
            <p className="text-neutral-400 text-xs max-w-sm mx-auto leading-relaxed">
              {userProfile?.role
                ? "For security and athlete privacy, schedules, rosters, and playbooks on FlagOS are restricted to verified coaches, rostered athletes, and league commissioners."
                : "Your FlagOS account has no global role. Join a league as a player or create a league to become its commissioner; your role is specific to each league."}
            </p>
          </div>

          {/* Current Signed-In Info */}
          <div className="w-full p-4 rounded-2xl bg-black/60 border border-white/10 text-left space-y-1.5">
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono">
              Signed-In Account
            </div>
            <div className="text-xs font-bold text-neutral-200 truncate font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
              <span className="truncate">{user?.email || "Unregistered Account"}</span>
            </div>
            <p className="text-[11px] text-amber-300/80 pt-1">
              {userProfile?.role
                ? "This email address is not registered to an active league, coaching staff, or player roster."
                : "You can have different memberships and permissions in different leagues."}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="w-full space-y-2.5">
            {userProfile?.role ? (
              <button
                onClick={async () => {
                  await logout();
                  router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In With Authorized Account</span>
              </button>
            ) : (
              <Link
                href="/pricing"
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg active:scale-98"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Explore leagues</span>
              </Link>
            )}

            <Link
              href="/"
              className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold transition-all border border-white/10 flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Return to FlagOS Home</span>
            </Link>

            <Link
              href="/pricing"
              className="w-full py-2.5 px-4 rounded-xl text-neutral-400 hover:text-cyan-400 text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <span>View League & Team Pricing Plans</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Case 3: User is authenticated and authorized with an approved email!
  return <>{children}</>;
}
