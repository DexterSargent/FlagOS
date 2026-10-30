"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogIn, LogOut, Settings, Shield, Sliders, User, Users } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { useLeague } from "@/lib/leagueContext";

/**
 * Signed out: a "Sign In" link that returns to the current page.
 * Signed in: an avatar menu with profile, team, account settings and sign out.
 */
export default function AccountMenu({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const { user, userProfile, isPlayer, playerId, playerData, playerTeamId, managedTeamId, isLeagueAdmin, isPlatformAdmin, isAuthorized, logout } = useAuth();
  const { openCustomizer, activeLeagueId, portalLeagueId, isDemoLeague } = useLeague();
  // Remember the path the menu was opened on so navigating away closes it.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath !== null && openPath === pathname;
  const setOpen = (next: boolean | ((v: boolean) => boolean)) => {
    const value = typeof next === "function" ? next(open) : next;
    setOpenPath(value ? pathname : null);
  };
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenPath(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenPath(null);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // If not logged in and not a demo commissioner, show standard Sign In button
  if (!user && !isLeagueAdmin) {
    if (pathname === "/login") return null;
    const redirect = pathname && pathname !== "/" ? `?redirect=${encodeURIComponent(pathname)}` : "";
    return (
      <Link
        href={`/login${redirect}`}
        className={`inline-flex items-center gap-1.5 h-9 sm:h-8 px-2.5 sm:px-3 rounded-xl bg-surface-inset hover:bg-surface-hover border border-token text-text-primary text-xs font-bold transition-colors shrink-0 ${className}`}
        aria-label="Sign in"
      >
        <LogIn className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline whitespace-nowrap">Sign In</span>
      </Link>
    );
  }

  const displayName = (isPlayer && playerData?.playerName) || user?.displayName || user?.email?.split("@")[0] || (isLeagueAdmin ? "Commissioner" : "Account");
  const initial = displayName.trim().charAt(0).toUpperCase() || "A";
  // "My" links point at the portal being browsed; outside a portal, Profile lists every roster to pick from.
  const teamId = managedTeamId || playerTeamId;
  const realPortalLeague = portalLeagueId && portalLeagueId !== "default" ? portalLeagueId : null;
  const profileHref = isPlayer && playerId && realPortalLeague
    ? `/profile?league=${encodeURIComponent(realPortalLeague)}&player=${encodeURIComponent(playerId)}`
    : isPlayer && playerId && playerTeamId && !portalLeagueId
      ? `/profile?team=${encodeURIComponent(playerTeamId)}&player=${encodeURIComponent(playerId)}`
      : "/profile";
  const showProfile = Boolean(user && (isPlayer || userProfile?.playerRecords?.length));
  const itemClass =
    "flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors text-left cursor-pointer";

  return (
    <div ref={rootRef} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${displayName}`}
        className="inline-flex items-center gap-0.5 h-9 sm:h-8 pl-0.5 pr-1 rounded-xl bg-surface-inset hover:bg-surface-hover border border-token text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
      >
        <span className="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 text-white text-[11px] font-black flex items-center justify-center">
          {initial}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full mt-2 z-[70] w-64 max-w-[calc(100vw-1rem)] rounded-2xl border border-token bg-surface-raised p-1.5 shadow-2xl"
        >
          <div className="px-3 py-2 border-b border-token mb-1">
            <p className="text-sm font-bold text-text-primary truncate">{displayName}</p>
            {user?.email ? (
              <p className="text-xs text-text-muted truncate">{user.email}</p>
            ) : (
              <p className="text-xs text-text-muted truncate font-medium">Demo Administrator</p>
            )}
          </div>
          {showProfile && (
            <Link href={profileHref} role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              <User className="w-4 h-4 shrink-0" /> My Profile
            </Link>
          )}
          {teamId && (
            <Link href={`/teams/${teamId}`} role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              <Users className="w-4 h-4 shrink-0" /> My Team
            </Link>
          )}
          {isAuthorized && isLeagueAdmin && !pathname?.startsWith("/admin") && (
            <button
              type="button"
              role="menuitem"
              className={`${itemClass} text-amber-600 dark:text-amber-400 font-bold hover:!text-amber-500`}
              onClick={() => {
                setOpen(false);
                openCustomizer();
              }}
            >
              <Sliders className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400" />
              <span>League Settings</span>
            </button>
          )}
          {user ? (
            <Link href="/account" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              <Settings className="w-4 h-4 shrink-0" /> Account Settings
            </Link>
          ) : (
            <Link href="/login" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              <LogIn className="w-4 h-4 shrink-0" /> Sign In / Create Account
            </Link>
          )}
          {isPlatformAdmin && (
            <Link href="/admin" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              <Shield className="w-4 h-4 shrink-0" /> Platform Admin
            </Link>
          )}
          {user && (
            <div className="border-t border-token mt-1 pt-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  void logout();
                }}
                className={`${itemClass} hover:!text-red-500`}
              >
                <LogOut className="w-4 h-4 shrink-0" /> Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
