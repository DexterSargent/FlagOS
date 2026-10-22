"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { useLeague } from "@/lib/leagueContext";
import { DEMO_TEAM_IDS, isDemoMatchId, isDemoTeamId, subscribeDemoSandbox } from "@/lib/demoSandboxRuntime";
import { isDexterUser } from "@/lib/teamAdminRbac";
import { useEmbedState } from "@/lib/embedState";

const RoleSwitcherContent = dynamic(() => import("./RoleSwitcherContent"), { ssr: false });

function getLocalOrDemoSnapshot() {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".local") ||
    host.startsWith("192.168.") || host.startsWith("10.") ||
    window.location.search.includes("demo=true") || sessionStorage.getItem("flagos_demo_active") === "true";
}

export default function RoleSwitcherBar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isDemoLeague } = useLeague();
  const localOrDemo = useSyncExternalStore(subscribeDemoSandbox, getLocalOrDemoSnapshot, () => false);

  const teamId = pathname?.startsWith("/teams/") ? pathname.split("/")[2] : null;
  const matchId = pathname?.startsWith("/matches/") ? pathname.split("/")[2] : null;
  const owner = isDexterUser(user?.email);
  const demoTeam = Boolean(teamId && isDemoLeague && DEMO_TEAM_IDS.includes(teamId));
  const embedded = useEmbedState().embedQuery;
  // Real customer team and game pages never show demo chrome.
  const customerPage = Boolean((teamId && !isDemoTeamId(teamId)) || (matchId && !isDemoMatchId(matchId)));
  const allowed = !embedded && (localOrDemo || owner || isDemoLeague) &&
    !customerPage &&
    (!teamId || demoTeam) &&
    pathname !== "/" && pathname !== "/pricing" && pathname !== "/login" && pathname !== "/my-story" &&
    !pathname?.includes("/play-by-play") &&
    !(pathname === "/admin" || (pathname?.startsWith("/admin/") && !pathname.startsWith("/admin/sandbox")));

  return allowed ? <RoleSwitcherContent /> : null;
}
