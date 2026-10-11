"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useLeague } from "@/lib/leagueContext";
import { useAuth } from "@/lib/authContext";
import {
  CalendarDays,
  Users,
  Trophy,
  UserPlus,
  Shield,
  Crown,
  Sparkles,
  Settings,
  User,
  ChevronDown,
  Check,
  Plus,
  CreditCard,
  Building2,
} from "lucide-react";
import { renderFlagOS } from "@/components/FlagOSText";
import ThemeToggle from "@/components/ThemeToggle";

interface LeagueHeaderProps {
  activePage?: "schedule" | "stats" | "teams" | "join" | "pricing";
}

export default function LeagueHeader({ activePage }: LeagueHeaderProps) {
  const { settings, openCustomizer, activeLeagueId, userLeagues, switchLeague, subscription } = useLeague();
  const { role, isLeagueAdmin, isPlayer, playerData, canRegisterAsPlayer } = useAuth();

  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
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

  return (
    <div className="relative z-20 sticky top-0">
      {/* Site-Wide League Announcement Bar */}
      {settings.announcement && (
        <div
          className="py-1.5 px-4 text-center text-xs font-semibold text-white flex items-center justify-center gap-2 border-b border-white/10 shadow-sm"
          style={{
            background: `linear-gradient(90deg, var(--league-primary), var(--league-accent))`,
          }}
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse shrink-0" />
          <span className="truncate">{settings.announcement}</span>
        </div>
      )}

      <header className="border-b border-white/10 bg-[#07090E]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Brand & League Status with Multi-League Switcher */}
          <div className="flex items-center gap-3 relative" ref={switcherRef}>
            <Link href={`/league/${activeLeagueId || "default"}`} className="flex items-center gap-3 group">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md overflow-hidden p-1.5 shrink-0 border border-white/10 group-hover:scale-105 transition-transform"
                style={{
                  background: `linear-gradient(135deg, var(--league-primary), var(--league-accent))`,
                }}
              >
                {settings.logoUrl && settings.logoUrl !== "/flagos-logo.png" ? (
                  <img
                    src={settings.logoUrl}
                    alt={settings.leagueName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "/flagos-emblem.png";
                    }}
                  />
                ) : (
                  <img
                    src="/flagos-emblem.png"
                    alt="FlagOS"
                    className="w-full h-full object-contain drop-shadow"
                  />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black uppercase tracking-wider leading-none text-white group-hover:text-cyan-400 transition-colors">
                    {renderFlagOS(settings.leagueName)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {settings.seasonTitle || "Active Season"}
                  </span>
                  {settings.shortcode && (
                    <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-cyan-300 font-bold">
                      {settings.shortcode}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-neutral-400 font-mono tracking-widest uppercase block mt-0.5">
                  {settings.tagline || "Official League Management System"}
                </span>
              </div>
            </Link>

            {/* League Switcher Trigger */}
            <button
              onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer"
              title="Switch League or Portal"
              aria-label="Switch League"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSwitcherOpen ? "rotate-180 text-cyan-400" : ""}`} />
            </button>

            {/* League Switcher Popover */}
            {isSwitcherOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-neutral-950 border border-white/10 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl">
                <div className="px-2 py-1.5 border-b border-white/10 mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
                    <Building2 className="w-3 h-3 text-cyan-400" />
                    <span>My Leagues</span>
                  </span>
                  <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                    Multi-Tenant
                  </span>
                </div>

                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {userLeagues.map((l) => {
                    const isActive = l.id === activeLeagueId;
                    return (
                      <button
                        key={l.id}
                        onClick={() => {
                          switchLeague(l.id);
                          setIsSwitcherOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                          isActive
                            ? "bg-cyan-500/15 border border-cyan-500/30 text-white"
                            : "hover:bg-white/5 text-neutral-300 hover:text-white border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black text-black shrink-0"
                            style={{ backgroundColor: l.primaryColor || "#3ca505" }}
                          >
                            {l.shortcode?.slice(0, 2) || "LG"}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate leading-tight">{l.name}</div>
                            <div className="text-[10px] text-neutral-500 font-mono">
                              {l.role === "owner" ? "Owner / Commissioner" : "Admin"}
                            </div>
                          </div>
                        </div>
                        {isActive && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-white/10 mt-2 pt-2 space-y-1.5">
                  <Link
                    href="/pricing"
                    onClick={() => setIsSwitcherOpen(false)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 text-xs font-bold border border-cyan-500/30 transition-all text-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create & Subscribe League</span>
                  </Link>

                  <Link
                    href="/"
                    onClick={() => setIsSwitcherOpen(false)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 text-[11px] font-bold transition-all text-center"
                  >
                    <span>⚡ FlagOS Platform Home</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-neutral-300">
            <Link
              href="/schedule"
              className={`transition-colors flex items-center gap-1.5 ${
                activePage === "schedule" ? "text-cyan-400 border-b-2 border-cyan-400 pb-1 -mb-1" : "hover:text-cyan-400"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Schedule</span>
            </Link>
            <Link
              href="/stats"
              className={`transition-colors flex items-center gap-1.5 ${
                activePage === "stats" ? "text-cyan-400 border-b-2 border-cyan-400 pb-1 -mb-1" : "hover:text-cyan-400"
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Standings & Stats</span>
            </Link>
            <Link
              href="/teams"
              className={`transition-colors flex items-center gap-1.5 ${
                activePage === "teams" ? "text-cyan-400 border-b-2 border-cyan-400 pb-1 -mb-1" : "hover:text-cyan-400"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Teams</span>
            </Link>
            {settings.rules?.enableFreeAgents !== false && canRegisterAsPlayer && (
              <Link
                href="/join"
                className={`transition-colors flex items-center gap-1.5 ${
                  activePage === "join" ? "text-emerald-400 border-b-2 border-emerald-400 pb-1 -mb-1" : "hover:text-emerald-400"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Player Registration</span>
              </Link>
            )}
            <Link
              href="/pricing"
              className={`transition-colors flex items-center gap-1.5 ${
                activePage === "pricing" ? "text-cyan-400 border-b-2 border-cyan-400 pb-1 -mb-1" : "text-amber-400/90 hover:text-amber-300"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Pricing & Plans</span>
            </Link>
          </nav>

          {/* User Status & Settings Trigger */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle size="md" />

            <button
              onClick={openCustomizer}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold rounded-xl border border-white/10 transition-all shadow-sm cursor-pointer"
              title="League Settings, Rules & Custom Colors"
            >
              <Settings className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            {isPlayer ? (
              <Link
                href="/profile"
                className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/30 transition-colors flex items-center gap-2"
              >
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>#{playerData?.number || "00"} {playerData?.playerName || "My Profile"}</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold rounded-xl border border-white/10 transition-colors flex items-center gap-2"
              >
                {isLeagueAdmin ? (
                  <>
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>League Admin</span>
                  </>
                ) : role === "team_admin" ? (
                  <>
                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Team Admin</span>
                  </>
                ) : (
                  <>
                    <Users className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Sign In</span>
                  </>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}
