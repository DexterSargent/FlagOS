"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLeague } from "@/lib/leagueContext";
import { useAuth } from "@/lib/authContext";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  CalendarDays,
  Users,
  Trophy,
  UserPlus,
  Shield,
  Crown,
  BadgeDollarSign,
  Eye,
  Megaphone,
  Settings,
  User,
  ChevronDown,
  Check,
  Plus,
  Building2,
  Lock,
  Menu,
  X,
  BookOpen,
  LogIn,
  LogOut,
  Globe,
} from "lucide-react";
import { renderFlagOS } from "@/components/FlagOSText";
import { FlagOSLogo, FLAGOS_LOGO, isDefaultFlagOSLogo } from "@/components/FlagOSLogo";
import ThemeToggle from "@/components/ThemeToggle";
import AccountMenu from "@/components/AccountMenu";
import { useTheme } from "@/lib/themeContext";

interface LeagueHeaderProps {
  activePage?: "league" | "schedule" | "stats" | "teams" | "playbook" | "join" | "pricing" | "leagues";
}

export default function LeagueHeader({ activePage }: LeagueHeaderProps) {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const {
    settings,
    openCustomizer,
    activeLeagueId,
    userLeagues,
    switchLeague,
    subscription,
    isDemoLeague,
    isLeagueArchived,
    isSubscriptionPastDue,
    resumeSubscription,
  } = useLeague();
  const { user, role, isLeagueAdmin, isPlayer, playerData, canRegisterAsPlayer, isAuthorized, playerTeamId, managedTeamId, logout } = useAuth();

  const isCustomOrPaidLeague =
    (activeLeagueId !== "default" && activeLeagueId !== "demo") ||
    (Boolean(settings.leagueName) && settings.leagueName !== "FlagOS Demo League" && settings.leagueName !== "FlagOS League") ||
    settings.visibility === "private" ||
    Boolean(subscription && subscription.status === "active" && activeLeagueId !== "default");

  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setIsSwitcherOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Dynamically resolve active tab if not passed explicitly as prop
  const resolvedActivePage = activePage || (
    pathname?.startsWith("/leagues") ? "leagues" :
    pathname?.startsWith("/schedule") || pathname?.startsWith("/matches") ? "schedule" :
    pathname?.startsWith("/stats") ? "stats" :
    pathname?.includes("/playbook") ? "playbook" :
    pathname?.startsWith("/teams") ? "teams" :
    pathname?.startsWith("/join") ? "join" :
    pathname?.startsWith("/pricing") ? "pricing" :
    pathname?.startsWith("/league") ? "league" :
    "league"
  );

  return (
    <div className="sticky z-50 w-full transition-colors" style={{ top: "var(--role-switcher-height, 0px)" }}>
      {/* Site-Wide League Announcement Ribbon */}
      {settings.announcement && (
        <div
          className="py-1 px-4 text-center text-xs font-bold text-white flex items-center justify-center gap-2 border-b border-white/10 shadow-sm"
          style={{
            background: `linear-gradient(90deg, var(--league-primary), var(--league-accent))`,
          }}
        >
          <Megaphone className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{settings.announcement}</span>
        </div>
      )}

      {/* League Archival / Past-Due Status Banner */}
      {isSubscriptionPastDue && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 text-amber-200 text-xs px-3 sm:px-4 py-2 flex items-center justify-between gap-2 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">
              <strong>Subscription Payment Past Due:</strong> Administrative management and data writes are locked. Public viewer access remains active.
            </span>
          </div>
          {isLeagueAdmin && (
            <button
              onClick={() => resumeSubscription().catch((err: unknown) => {
                window.alert(err instanceof Error ? err.message : "Could not resume the subscription.");
              })}
              className="bg-amber-400 hover:bg-amber-300 text-black font-black text-[11px] px-3 py-1 rounded-lg uppercase tracking-wider shrink-0 transition-all cursor-pointer shadow"
            >
              Update Payment &amp; Resume
            </button>
          )}
        </div>
      )}

      {isLeagueArchived && !isSubscriptionPastDue && (
        <div className="bg-neutral-900/95 border-b border-white/10 text-neutral-300 text-xs px-3 sm:px-4 py-2 flex items-center justify-between gap-2 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <Archive className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="truncate">
              <strong>Archived Season ({settings.seasonTitle || "Completed"}):</strong> All historical scores, stats, and rosters are preserved in permanent read-only mode.
            </span>
          </div>
          {isLeagueAdmin && (
            <button
              onClick={openCustomizer}
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] px-3 py-1 rounded-lg shrink-0 transition-all cursor-pointer border border-white/10"
            >
              Season Options
            </button>
          )}
        </div>
      )}

      {/* Main Luxury Navigation Bar */}
      <header className="relative border-b border-slate-200/80 dark:border-white/[0.08] bg-white/85 dark:bg-[#07090E]/90 backdrop-blur-xl transition-colors shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-12 sm:h-14 flex items-center justify-between gap-1.5 sm:gap-4">

          {/* Left: Integrated League Brand & Multi-Tenant Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2 relative shrink min-w-0" ref={switcherRef}>
            {!isCustomOrPaidLeague && (
              <>
                <Link
                  href="/"
                  title="Return to FlagOS Platform Home"
                  className="flex items-center gap-1 px-2 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors border border-transparent hover:border-slate-200 dark:hover:border-white/10 shrink-0 text-xs font-bold group"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 group-hover:text-emerald-500 group-hover:-translate-x-0.5 transition-all" />
                  <FlagOSLogo size="xs" />
                  <span className="hidden xl:inline">FlagOS</span>
                </Link>
                <div className="hidden sm:block h-5 w-px bg-slate-200 dark:bg-white/10 mx-0.5 shrink-0" />
              </>
            )}

            <button
              onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
              className="flex items-center gap-1.5 sm:gap-2.5 p-1 -ml-1 sm:p-1.5 sm:-ml-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-left group cursor-pointer min-w-0"
              aria-label="Switch League"
              aria-expanded={isSwitcherOpen}
            >
              {/* League Emblem */}
              <div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center bg-transparent overflow-hidden p-0.5 shrink-0 group-hover:scale-105 transition-transform"
              >
                {!isDefaultFlagOSLogo(settings.logoUrl) ? (
                  <img
                    src={settings.logoUrl}
                    alt={settings.leagueName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      if (isCustomOrPaidLeague) {
                        e.currentTarget.style.display = "none";
                      } else {
                        e.currentTarget.src = FLAGOS_LOGO;
                      }
                    }}
                  />
                ) : isCustomOrPaidLeague ? (
                  <div
                    className={`w-full h-full rounded-xl flex items-center justify-center font-black uppercase shadow text-white tracking-tighter ${(settings.shortcode?.length ?? 0) > 3 ? "text-[9px]" : "text-xs"}`}
                    style={{
                      background: `linear-gradient(135deg, var(--league-primary, #10b981), var(--league-accent, #06b6d4))`,
                    }}
                  >
                    {settings.shortcode ? settings.shortcode.slice(0, 4) : (settings.leagueName?.charAt(0) || "L")}
                  </div>
                ) : (
                  <FlagOSLogo
                    variant="emblem"
                    className="w-full h-full object-contain drop-shadow"
                    alt={settings.leagueName || "FlagOS"}
                  />
                )}
              </div>

              {/* League Identity Text */}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="text-xs sm:text-base font-black uppercase tracking-tight text-slate-900 dark:text-white truncate max-w-[110px] xs:max-w-[140px] sm:max-w-[210px] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    {isCustomOrPaidLeague ? settings.leagueName : renderFlagOS(settings.leagueName)}
                  </span>
                  {settings.visibility === "private" ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[9px] font-bold text-amber-600 dark:text-amber-400 font-mono shrink-0" title="Private League: Accessible via Direct URL">
                      <Lock className="w-2.5 h-2.5" />
                    </span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" title="Active Circuit" />
                  )}
                </div>

                <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-neutral-400 font-medium leading-none mt-0.5">
                  <span className="truncate max-w-[80px] xs:max-w-[120px]">{settings.seasonTitle || "Active Season"}</span>
                  {settings.shortcode && (
                    <>
                      <span>•</span>
                      <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 shrink-0">{settings.shortcode}</span>
                    </>
                  )}
                  {isDemoLeague && (
                    <span
                      title="Interactive Demo Sandbox"
                      className="rounded bg-emerald-500/10 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300"
                    >
                      Demo
                    </span>
                  )}
                </div>
              </div>

              {/* Refined Integrated Chevron */}
              <div className="p-0.5 sm:p-1 rounded-lg text-slate-400 dark:text-neutral-500 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors shrink-0">
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isSwitcherOpen ? "rotate-180 text-cyan-600 dark:text-cyan-400" : ""}`} />
              </div>
            </button>

            {/* League Switcher Popover */}
            {isSwitcherOpen && (
              <div className="absolute top-full left-0 mt-2 w-76 bg-white dark:bg-neutral-950 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl">
                <div className="px-2 py-1.5 border-b border-slate-200 dark:border-white/10 mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-neutral-400 flex items-center gap-1.5">
                    <Building2 className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                    <span>My Leagues</span>
                  </span>
                  <span className="text-[9px] font-mono text-cyan-700 dark:text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded font-bold">
                    Multi-Tenant
                  </span>
                </div>

                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {userLeagues
                    .filter((l) => {
                      if (l.visibility === "private" || l.id === "league_private_live") {
                        const userEmail = (user?.email || "").trim().toLowerCase();
                        return (
                          userEmail === "dextersargent@gmail.com" ||
                          (l.adminEmails && l.adminEmails.some((e) => e.toLowerCase() === userEmail))
                        );
                      }
                      return true;
                    })
                    .map((l) => {
                    const isActive = l.id === activeLeagueId;
                    return (
                      <button
                        key={l.id}
                        onClick={() => {
                          switchLeague(l.id);
                          setIsSwitcherOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                          isActive
                            ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-900 dark:text-white font-bold"
                            : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black text-black shrink-0 shadow-sm"
                            style={{ backgroundColor: l.primaryColor || "#3ca505" }}
                          >
                            {l.shortcode?.slice(0, 2) || "LG"}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate leading-tight flex items-center gap-1.5">
                              <span className="truncate">{l.name}</span>
                              {l.visibility === "private" && (
                                <Lock className="w-2.5 h-2.5 text-amber-500 dark:text-amber-400 shrink-0" />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-neutral-500 font-mono flex items-center gap-1">
                              <span>{l.role === "owner" ? "Owner" : "Admin"}</span>
                              <span>•</span>
                              <span className={l.visibility === "private" ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-emerald-600 dark:text-emerald-400 font-semibold"}>
                                {l.visibility === "private" ? "Private" : "Public"}
                              </span>
                            </div>
                          </div>
                        </div>
                        {isActive && <Check className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-slate-200 dark:border-white/10 mt-2 pt-2 space-y-1.5">
                  <Link
                    href="/pricing"
                    onClick={() => setIsSwitcherOpen(false)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 text-xs font-bold border border-cyan-500/30 transition-all text-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create & Subscribe League</span>
                  </Link>

                  {!isCustomOrPaidLeague && (
                    <Link
                      href="/"
                      onClick={() => setIsSwitcherOpen(false)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 text-[11px] font-bold transition-all text-center"
                    >
                      <span>⚡ FlagOS Platform Home</span>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Center: Segmented Navigation Pills (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/70 dark:bg-white/[0.04] p-1 rounded-2xl border border-slate-200/70 dark:border-white/[0.06]">
            <Link
              href={`/league/${activeLeagueId || "default"}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all ${
                resolvedActivePage === "league"
                  ? "bg-white dark:bg-white/10 text-cyan-600 dark:text-cyan-400 shadow-sm border border-slate-200 dark:border-white/10"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>League Home</span>
            </Link>

            <Link
              href="/schedule"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all ${
                resolvedActivePage === "schedule"
                  ? "bg-white dark:bg-white/10 text-cyan-600 dark:text-cyan-400 shadow-sm border border-slate-200 dark:border-white/10"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Schedule</span>
            </Link>

            <Link
              href="/stats"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all ${
                resolvedActivePage === "stats"
                  ? "bg-white dark:bg-white/10 text-cyan-600 dark:text-cyan-400 shadow-sm border border-slate-200 dark:border-white/10"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5"
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Standings & Stats</span>
            </Link>

            <Link
              href="/teams"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all ${
                resolvedActivePage === "teams"
                  ? "bg-white dark:bg-white/10 text-cyan-600 dark:text-cyan-400 shadow-sm border border-slate-200 dark:border-white/10"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Teams</span>
            </Link>

            <Link
              href="/leagues"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all ${
                resolvedActivePage === "leagues"
                  ? "bg-white dark:bg-white/10 text-cyan-600 dark:text-cyan-400 shadow-sm border border-slate-200 dark:border-white/10"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Find a League</span>
            </Link>

            {/* Strict RBAC: League Admin NEVER sees Playbook */}
            {!isLeagueAdmin && (playerTeamId || managedTeamId) && (
              <Link
                href={`/teams/${playerTeamId || managedTeamId}/playbook`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all ${
                  resolvedActivePage === "playbook"
                    ? "bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-white/10"
                    : "text-emerald-600/90 dark:text-emerald-400/90 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-slate-200/50 dark:hover:bg-white/5"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Playbook</span>
              </Link>
            )}

            {/* Free Agent / Player Registration (Strictly no pricing links in navigation) */}
            {settings.rules?.enableFreeAgents !== false && canRegisterAsPlayer && (
              <Link
                href="/join"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all ${
                  resolvedActivePage === "join"
                    ? "bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-white/10"
                    : "text-emerald-600/90 dark:text-emerald-400/90 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-slate-200/50 dark:hover:bg-white/5"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Player Registration</span>
              </Link>
            )}
          </nav>

          {/* Right: Controls & Role Status */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <ThemeToggle size="md" />

            {/* League Settings Trigger for Commissioners */}
            {isAuthorized && isLeagueAdmin && (
              <button
                onClick={openCustomizer}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-500/25 transition-all shadow-sm cursor-pointer shrink-0"
                title="League Settings, Rules & Custom Colors"
              >
                <Settings className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            )}

            {/* User Identity / Role Pill */}
            {isPlayer ? (
              <Link
                href="/profile"
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 text-xs font-bold transition-all shadow-sm shrink-0"
              >
                <User className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <span className="truncate max-w-[70px] sm:max-w-[120px]">#{playerData?.number || "00"} {playerData?.playerName || "My Profile"}</span>
              </Link>
            ) : isDemoLeague ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-neutral-300 text-xs font-bold border border-slate-200 dark:border-white/10 shrink-0">
                  {isLeagueAdmin ? (
                    <>
                      <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                      <span className="hidden sm:inline">League Admin</span>
                    </>
                  ) : role === "team_admin" ? (
                    <>
                      <Shield className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 shrink-0" />
                      <span className="hidden sm:inline">Team Admin</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400 shrink-0" />
                      <span className="hidden sm:inline">Spectator</span>
                    </>
                  )}
                </div>

                <Link
                  href="/pricing"
                  className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-xs font-bold transition-all shadow-sm shrink-0"
                >
                  <BadgeDollarSign className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                  <span>Pricing</span>
                </Link>

                <Link
                  href="/login"
                  className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-900 dark:bg-neutral-800 text-white dark:text-neutral-100 hover:opacity-90 text-xs font-bold transition-all border border-slate-700 dark:border-white/10 shadow-sm shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Sign In</span>
                </Link>
              </div>
            ) : (
              <Link
                href={user ? "/profile" : "/login"}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl bg-slate-900 dark:bg-neutral-800 text-white dark:text-neutral-100 hover:opacity-90 text-xs font-bold transition-all border border-slate-700 dark:border-white/10 shadow-sm shrink-0"
              >
                {isLeagueAdmin ? (
                  <>
                    <Crown className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600 shrink-0" />
                    <span className="hidden sm:inline">League Admin</span>
                  </>
                ) : role === "team_admin" ? (
                  <>
                    <Shield className="w-3.5 h-3.5 text-cyan-400 dark:text-cyan-600 shrink-0" />
                    <span className="hidden sm:inline">Team Admin</span>
                  </>
                ) : user ? (
                  <>
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">My Account</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">Sign In</span>
                  </>
                )}
              </Link>
            )}

            {user && !isDemoLeague && <AccountMenu />}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 z-40 lg:hidden max-h-[calc(100dvh-3rem)] overflow-y-auto border-t border-slate-200/80 dark:border-white/10 bg-white/98 dark:bg-[#07090E]/98 px-6 py-4 space-y-2 animate-in slide-in-from-top-2 backdrop-blur-xl shadow-2xl">
            <Link
              href={`/league/${activeLeagueId || "default"}`}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                resolvedActivePage === "league" ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30" : "text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <Building2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>League Home</span>
            </Link>

            <Link
              href="/schedule"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                resolvedActivePage === "schedule" ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30" : "text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <CalendarDays className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Schedule</span>
            </Link>

            <Link
              href="/stats"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                resolvedActivePage === "stats" ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30" : "text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <Trophy className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Standings & Stats</span>
            </Link>

            <Link
              href="/teams"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                resolvedActivePage === "teams" ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30" : "text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Teams</span>
            </Link>

            <Link
              href="/leagues"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                resolvedActivePage === "leagues" ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30" : "text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <Globe className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Find a League</span>
            </Link>

            {!isLeagueAdmin && (playerTeamId || managedTeamId) && (
              <Link
                href={`/teams/${playerTeamId || managedTeamId}/playbook`}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                  resolvedActivePage === "playbook" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30" : "text-emerald-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Playbook</span>
              </Link>
            )}

            {settings.rules?.enableFreeAgents !== false && canRegisterAsPlayer && (
              <Link
                href="/join"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                  resolvedActivePage === "join" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30" : "text-emerald-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Player Registration</span>
              </Link>
            )}

            {user && !isDemoLeague && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  void logout();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            )}

            {/* Public Platform Navigation (Easy exit from Demo League to unlogged-in pages) */}
            {!isCustomOrPaidLeague && isDemoLeague && (
              <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-neutral-500 font-bold px-3.5">
                  <span className="normal-case">FlagOS</span> Platform Navigation
                </span>
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-emerald-500" />
                  <span><span className="normal-case">FlagOS</span> Platform Home</span>
                </Link>
                <Link
                  href="/pricing"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <BadgeDollarSign className="w-4 h-4 text-amber-500" />
                  <span>Pricing Plans</span>
                </Link>
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In / Register</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </header>
    </div>
  );
}
