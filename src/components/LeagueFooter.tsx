"use client";

import Link from "next/link";
import { useLeague } from "@/lib/leagueContext";
import { useAuth } from "@/lib/authContext";
import {
  MapPin,
  Mail,
  FileText,
  CalendarDays,
  Trophy,
  Users,
  UserPlus,
  ArrowRight,
  Settings,
  Home,
} from "lucide-react";
import { FlagOSText, renderFlagOS } from "@/components/FlagOSText";
import ThemeToggle from "@/components/ThemeToggle";

export default function LeagueFooter() {
  const { settings, openCustomizer, activeLeagueId } = useLeague();
  const { canRegisterAsPlayer, isAuthorized, isLeagueAdmin } = useAuth();

  return (
    <footer className="relative z-10 border-t border-white/10 bg-black pt-12 pb-8 px-6 text-neutral-400 font-sans transition-colors">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Top Tier: Brand, Details, & Nav */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: League Brand */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black uppercase tracking-wider text-white">
                  {renderFlagOS(settings.leagueName)}
                </span>
                {settings.shortcode && (
                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-cyan-300 font-bold">
                    {settings.shortcode}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                {settings.seasonTitle || "Active Season"}
              </span>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              {settings.tagline || "The premier competitive flag football circuit with real-time statistics and match tracking."}
            </p>

            {isAuthorized && isLeagueAdmin && (
              <button
                onClick={openCustomizer}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold border border-white/10 transition-all cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-cyan-400" />
                <span>League Settings</span>
              </button>
            )}
          </div>

          {/* Column 2: Venue & Operations */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Operations & Venue</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 text-neutral-300">
                <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-white">Primary Field</span>
                  <span className="text-neutral-400">{settings.defaultLocation || "Central Stadium Field"}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-neutral-300">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-white">Contact Commissioner</span>
                  {settings.contactEmail ? (
                    <a
                      href={`mailto:${settings.contactEmail}`}
                      className="text-neutral-400 hover:text-emerald-300 transition-colors underline underline-offset-2"
                    >
                      {settings.contactEmail}
                    </a>
                  ) : (
                    <span className="text-neutral-400">commissioner@flagleague.com</span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 text-neutral-300">
                <FileText className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-white">Rulebook</span>
                  <span className="text-neutral-400">{settings.rulebookTitle || "Official 7v7 Non-Contact Rules"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: League Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href={`/league/${activeLeagueId || "default"}`} className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-cyan-400" />
                  <span>League Home</span>
                </Link>
              </li>
              <li>
                <Link href="/schedule" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Schedule</span>
                </Link>
              </li>
              <li>
                <Link href="/stats" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Stats & Standings</span>
                </Link>
              </li>
              <li>
                <Link href="/teams" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>Team Directory</span>
                </Link>
              </li>
              {settings.rules?.enableFreeAgents !== false && canRegisterAsPlayer && (
                <li>
                  <Link href="/join" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Join League</span>
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Column 4: Platform Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
              <span>Powered by</span>
              <FlagOSText />
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Operating enterprise tournament management, real-time live scorekeeping, down-by-down play logs, and player statistics for <span className="text-white font-semibold">{renderFlagOS(settings.leagueName)}</span>.
            </p>
            {settings.rules?.enableFreeAgents !== false && canRegisterAsPlayer && (
              <div className="pt-2">
                <Link
                  href="/join"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md"
                  style={{
                    background: `linear-gradient(135deg, var(--league-primary), var(--league-accent))`,
                  }}
                >
                  <span>Register for {settings.seasonTitle || "Season"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Sub-bar */}
        <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white uppercase">{renderFlagOS(settings.leagueName)}</span>
            <span>•</span>
            <span>{settings.seasonTitle || "2026"}</span>
            <span>•</span>
            <span>All rights reserved</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <ThemeToggle size="sm" />
            <span>System: <FlagOSText /> Multi-Tenant v2.4</span>
            <span className="text-neutral-700">|</span>
            <span className="text-neutral-400">Real-Time Sync Active</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
