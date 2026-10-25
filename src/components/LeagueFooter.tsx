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
  Settings,
  Home,
} from "lucide-react";
import { FlagOSText, renderFlagOS } from "@/components/FlagOSText";
import ThemeToggle from "@/components/ThemeToggle";
import { findVenue, mapsSearchUrl } from "@/lib/leaguePublicProfile";
import { FLAGOS_SUPPORT_EMAIL } from "@/lib/platformAdmin";

export default function LeagueFooter() {
  const { settings, openCustomizer, activeLeagueId, subscription } = useLeague();
  const { canRegisterAsPlayer, isAuthorized, isLeagueAdmin, user } = useAuth();
  const homeVenue = findVenue(settings.venues, settings.defaultLocation) || settings.venues?.[0] || null;

  const isCustomOrPaidLeague =
    (activeLeagueId !== "default" && activeLeagueId !== "demo") ||
    (Boolean(settings.leagueName) && settings.leagueName !== "FlagOS Demo League" && settings.leagueName !== "FlagOS League") ||
    settings.visibility === "private" ||
    Boolean(subscription && subscription.status === "active" && activeLeagueId !== "default");

  return (
    <footer className="relative z-10 border-t border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black pt-12 pb-8 px-6 text-slate-600 dark:text-neutral-400 font-sans transition-colors">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Top Tier: Brand, Details, & Nav */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: League Brand */}
          <div className="space-y-4 py-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  {isCustomOrPaidLeague ? settings.leagueName : renderFlagOS(settings.leagueName)}
                </span>
                {settings.shortcode && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-[10px] font-mono text-emerald-700 dark:text-cyan-300 font-bold">
                    {settings.shortcode}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                {settings.seasonTitle || "Active Season"}
              </span>
            </div>

            {isAuthorized && isLeagueAdmin && (
              <button
                onClick={openCustomizer}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold border border-slate-300 dark:border-white/10 transition-all cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>League Settings</span>
              </button>
            )}
          </div>

          {/* Column 2: Venue & Operations */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">League Info</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 text-slate-600 dark:text-neutral-300">
                <MapPin className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-slate-900 dark:text-white">Home Field</span>
                  <span className="text-slate-500 dark:text-neutral-400 block">{homeVenue?.name || settings.defaultLocation || "Location to be announced"}</span>
                  {homeVenue?.address && (
                    <a
                      href={mapsSearchUrl(homeVenue.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-300 underline underline-offset-2"
                    >
                      {homeVenue.address} · Directions
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-600 dark:text-neutral-300">
                <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-slate-900 dark:text-white">Organizer Contact</span>
                  {settings.publicContactEmail ? (
                    <a
                      href={`mailto:${settings.publicContactEmail}`}
                      className="text-slate-500 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors underline underline-offset-2 break-all"
                    >
                      {settings.publicContactEmail}
                    </a>
                  ) : (
                    <span className="text-slate-500 dark:text-neutral-400">
                      Ask your coach, or email{" "}
                      <a
                        href={`mailto:${FLAGOS_SUPPORT_EMAIL}?subject=${encodeURIComponent(`Question about ${settings.leagueName || "my league"}`)}`}
                        className="hover:text-emerald-600 dark:hover:text-emerald-300 underline underline-offset-2 break-all"
                      >
                        FlagOS support
                      </a>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-600 dark:text-neutral-300">
                <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-slate-900 dark:text-white">Rulebook</span>
                  <span className="text-slate-500 dark:text-neutral-400">{settings.rulebookTitle || "IFAF 5v5 Flag Football Rules"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: League Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href={`/league/${activeLeagueId || "default"}`} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>League Home</span>
                </Link>
              </li>
              <li>
                <Link href="/schedule" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                  <span>Schedule</span>
                </Link>
              </li>
              <li>
                <Link href="/stats" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>Stats & Standings</span>
                </Link>
              </li>
              <li>
                <Link href="/teams" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                  <span>Team Directory</span>
                </Link>
              </li>
              {settings.rules?.enableFreeAgents !== false && canRegisterAsPlayer && (
                <li>
                  <Link href="/join" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Join League</span>
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Column 4: Platform Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Powered by</span>
              <FlagOSText />
            </h4>
            <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed">
              Schedules, live scores, play-by-play and player stats for <span className="text-slate-900 dark:text-white font-semibold">{isCustomOrPaidLeague ? settings.leagueName : renderFlagOS(settings.leagueName)}</span>.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2.5 text-xs font-bold">
              {!isCustomOrPaidLeague && (
                <>
                  <Link href="/" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
                    ← FlagOS Home
                  </Link>
                  <span className="text-slate-400 dark:text-neutral-500" aria-hidden="true">•</span>
                </>
              )}
              <Link href="/pricing" className="text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                {isCustomOrPaidLeague ? "Plans" : "Pricing"}
              </Link>
              <span className="text-slate-400 dark:text-neutral-500" aria-hidden="true">•</span>
              <Link href={user ? "/profile" : "/login"} className="text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                {user ? "My Account" : "Sign In"}
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Sub-bar */}
        <div className="pt-6 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-neutral-500">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="font-bold text-slate-900 dark:text-white uppercase">{isCustomOrPaidLeague ? settings.leagueName : renderFlagOS(settings.leagueName)}</span>
            <span aria-hidden="true">•</span>
            <span>{settings.seasonTitle || "2026"}</span>
            <span aria-hidden="true">•</span>
            <span>All rights reserved</span>
          </div>

          <ThemeToggle size="sm" />
        </div>
      </div>
    </footer>
  );
}
