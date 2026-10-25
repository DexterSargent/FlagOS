"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, ShieldAlert, ArrowLeft, LogIn } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { useLeague } from "@/lib/leagueContext";

export default function PrivateLeagueAccessDenied({
  requiredEmail = "dextersargent@gmail.com",
  leagueName = "Private League",
}: {
  requiredEmail?: string;
  leagueName?: string;
}) {
  const { user, logout } = useAuth();
  const { switchLeague } = useLeague();
  const router = useRouter();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full bg-neutral-950/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(245,158,11,0.12)] backdrop-blur-xl">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 shadow-[0_0_25px_rgba(245,158,11,0.25)]">
          <Lock className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-widest mb-3">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Access Restricted</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-2">
          {leagueName} is Private
        </h1>

        <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed mb-6">
          This private environment has live database writes enabled and is strictly inaccessible without an authorized account. Access is restricted to:
        </p>

        <div className="px-4 py-3 rounded-2xl bg-black/60 border border-amber-500/30 text-amber-300 font-mono font-bold text-xs sm:text-sm mb-6 break-all">
          {requiredEmail}
        </div>

        {user ? (
          <div className="text-xs text-neutral-400 mb-6 p-3 rounded-xl bg-white/5 border border-white/10">
            Currently signed in as: <strong className="text-white">{user.email || "Unknown"}</strong>
            <button
              onClick={() => logout()}
              className="block mx-auto mt-2 text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
            >
              Sign out to switch accounts
            </button>
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In With Email</span>
          </Link>

          <button
            onClick={() => {
              void switchLeague("default");
              router.push("/league/default");
            }}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Demo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
