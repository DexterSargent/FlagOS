"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, CalendarDays, LayoutGrid, Users, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { useTeamColors } from "@/lib/teamColorContext";
import { useEmbedState } from "@/lib/embedState";
import { getAccentOnDark } from "@/lib/teamColors";
import { TeamLogo } from "@/components/TeamAssets";
import { useLeague } from "@/lib/leagueContext";
import SiteControls from "@/components/SiteControls";

type TeamSection = "overview" | "schedule" | "roster" | "stats" | "playbook";

const SECTIONS: { key: TeamSection; label: string; mobileLabel: string; path: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Overview", mobileLabel: "Home", path: "", icon: LayoutGrid },
  { key: "schedule", label: "Schedule", mobileLabel: "Games", path: "/schedule", icon: CalendarDays },
  { key: "roster", label: "Roster", mobileLabel: "Roster", path: "/roster", icon: Users },
  { key: "stats", label: "Stats", mobileLabel: "Stats", path: "/stats", icon: Activity },
  { key: "playbook", label: "Playbook", mobileLabel: "Plays", path: "/playbook", icon: BookOpen },
];

export function getActiveTeamSection(pathname: string | null, teamId: string): TeamSection | null {
  if (!pathname) return null;
  const base = `/teams/${teamId}`;
  if (pathname === base || pathname === `${base}/`) return "overview";
  const match = SECTIONS.find((s) => s.path && (pathname === base + s.path || pathname.startsWith(`${base}${s.path}/`)));
  return match?.key ?? null;
}

/** Same rule as the team hub and playbook page: coaches of this team and its rostered players. */
export function useCanAccessTeamPlaybook(teamId: string): boolean {
  const { isTeamAdmin, isLeagueAdmin, isPlayer, playerTeamId, userProfile } = useAuth();
  const isListedCoach = userProfile?.managedTeamId === teamId || !!userProfile?.managedTeamIds?.includes(teamId);
  return (isTeamAdmin(teamId) && (!isLeagueAdmin || isListedCoach)) || (isPlayer && playerTeamId === teamId);
}

/**
 * Sticky section switcher shared by every team page so coaches and players can
 * jump between Overview, Schedule, Roster, Stats and Playbook in one tap.
 */
export default function TeamNavBar({ teamId, className = "" }: { teamId: string; className?: string }) {
  const pathname = usePathname();
  const { team, palette } = useTeamColors();
  const { isDemoLeague } = useLeague();
  const { embedQuery } = useEmbedState();
  const canAccessPlaybook = useCanAccessTeamPlaybook(teamId);
  const active = getActiveTeamSection(pathname, teamId);

  if (embedQuery) return null;

  const accent = getAccentOnDark(palette);
  const teamName = team?.name || "Team";
  const sections = SECTIONS.filter((s) => s.key !== "playbook" || canAccessPlaybook || active === "playbook");

  return (
    <nav
      aria-label={`${teamName} sections`}
      className={`sticky top-[var(--role-switcher-height,0px)] z-40 w-full shrink-0 border-b border-white/10 bg-black/85 backdrop-blur-md ${className}`}
    >
      <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-4 px-2 sm:px-6 h-14 sm:h-12">
        <Link
          href={`/teams/${teamId}`}
          className="hidden sm:flex items-center gap-2 min-w-0 sm:shrink rounded-lg px-1 py-1 hover:bg-white/5 transition-colors"
          aria-label={`${teamName} overview`}
        >
          <span
            className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center overflow-hidden border"
            style={{ borderColor: `${accent}55`, backgroundColor: `${accent}14` }}
          >
            <TeamLogo
              teamName={teamName}
              logoUrl={team?.logoUrl}
              icon={team?.icon}
              primaryColor={accent}
              isDemo={isDemoLeague}
              className="w-6 h-6"
            />
          </span>
          <span className="hidden lg:block truncate text-sm font-black uppercase tracking-wide text-white max-w-[14rem]">
            {teamName}
          </span>
        </Link>

        <ul className="flex flex-1 items-stretch justify-end gap-0.5 sm:gap-1 min-w-0">
          {sections.map(({ key, label, mobileLabel, path, icon: Icon }) => {
            const isActive = active === key;
            return (
              <li key={key} className="flex-1 sm:flex-none min-w-0">
                <Link
                  href={`/teams/${teamId}${path}`}
                  aria-label={label}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 h-12 sm:h-10 px-0.5 sm:px-3 rounded-lg text-[9px] sm:text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-colors ${
                    isActive ? "text-white" : "text-neutral-400 hover:text-white hover:bg-white/5"
                  }`}
                  style={isActive ? { backgroundColor: `${accent}22`, color: accent } : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="sm:hidden">{mobileLabel}</span>
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <SiteControls />
      </div>
    </nav>
  );
}
