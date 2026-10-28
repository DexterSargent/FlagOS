"use client";

import Link from "next/link";
import { Globe, Shield } from "lucide-react";
import { useLeague } from "@/lib/leagueContext";
import { isDemoLeague as isDemoLeagueId } from "@/lib/demoSandboxRuntime";

/**
 * League-wide pages name their league with ?league= or the portal being browsed. When neither
 * exists there is nothing to show — the demo league is only reachable from the demo button.
 */
export default function NoLeagueSelected({ pagePath, noun }: { pagePath: string; noun: string }) {
  const { userLeagues } = useLeague();
  const leagues = (userLeagues || []).filter((league) => !isDemoLeagueId(league.id));
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-6">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Shield className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase">Choose a League</h1>
          <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
            {noun} live inside a league portal. Open one of your leagues below, or browse the public league directory.
          </p>
        </div>
        {leagues.length > 0 && (
          <ul className="space-y-2 text-left">
            {leagues.map((league) => (
              <li key={league.id}>
                <Link
                  href={`${pagePath}?league=${encodeURIComponent(league.id)}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10 transition-colors"
                >
                  <span className="truncate">{league.name}</span>
                  {league.shortcode && (
                    <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 shrink-0">{league.shortcode}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/leagues"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-wider transition-all"
        >
          <Globe className="w-4 h-4" />
          Find a League
        </Link>
      </div>
    </div>
  );
}
