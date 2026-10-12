"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/authContext";
import { ShieldAlert, Lock, LogIn, Home, ArrowRight, Shield } from "lucide-react";

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
  const { user, isPlayer, isAuthorized, loading, logout } = useAuth();
  const [isIframeEmbed, setIsIframeEmbed] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    // Allow iframe embedded preview frames inside the marketing page showcase
    if (typeof window !== "undefined") {
      const isEmbed = window.self !== window.top && window.location.search.includes("embed=true");
      setIsIframeEmbed(isEmbed);
    }
  }, []);

  // Determine if current path is strictly public
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  // Only allow iframe embeds to render if they are strictly on one of the 4 showcased feature routes
  const isAllowedEmbedShowcase = isIframeEmbed && isShowcaseRoute(pathname);

  // If public route or valid showcase preview frame, grant immediate access
  if (isPublic || isAllowedEmbedShowcase) {
    return <>{children}</>;
  }

  // Still checking Firebase Auth / Firestore verification
  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-emerald-600/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <img
              src="/flagos-emblem.png"
              alt="FlagOS"
              className="w-16 h-16 object-contain animate-pulse drop-shadow-[0_4px_20px_rgba(60,165,5,0.4)]"
            />
            <div className="absolute -inset-2 rounded-2xl bg-emerald-500/20 blur-md -z-10" />
          </div>
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mt-2" />
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

  // Case 1: Visitor is completely unauthenticated (not logged in)
  // Redirect immediately to login with redirect parameter
  if (!user && !isPlayer) {
    if (typeof window !== "undefined") {
      const target = `/login?redirect=${encodeURIComponent(pathname + window.location.search)}`;
      router.push(target);
    }

    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-xs text-neutral-400 font-mono">Redirecting to Authorized Sign In...</div>
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
              <span>Access Restricted</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
              Private League Portal
            </h1>
            <p className="text-neutral-400 text-xs max-w-sm mx-auto leading-relaxed">
              For security and athlete privacy, schedules, rosters, and playbooks on FlagOS are restricted to verified coaches, rostered athletes, and league commissioners.
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
              This email address is not registered to an active league, coaching staff, or player roster.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="w-full space-y-2.5">
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
