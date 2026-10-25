"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useLeague } from "@/lib/leagueContext";
import { DEMO_TEAM_IDS, isDemoLeaguePagePath, isDemoMatchId, isDemoTeamId } from "@/lib/demoSandboxRuntime";
import { useEmbedState } from "@/lib/embedState";

const RoleSwitcherContent = dynamic(() => import("./RoleSwitcherContent"), { ssr: false });

export default function RoleSwitcherBar() {
  const pathname = usePathname();
  const { isDemoLeague, loading } = useLeague();

  const teamId = pathname?.startsWith("/teams/") ? pathname.split("/")[2] : null;
  const matchId = pathname?.startsWith("/matches/") ? pathname.split("/")[2] : null;
  const leagueId = pathname?.startsWith("/league/") ? pathname.split("/")[2] : null;
  const demoTeam = Boolean(teamId && isDemoLeague && DEMO_TEAM_IDS.includes(teamId));
  const embedded = useEmbedState().embedQuery;

  // Real customer league, team and game pages never show demo chrome.
  const isRealCustomerLeague = Boolean(leagueId && leagueId !== "default" && leagueId !== "demo" && !isDemoLeague);
  const customerPage = Boolean(isRealCustomerLeague || (teamId && !isDemoTeamId(teamId)) || (matchId && !isDemoMatchId(matchId)));

  // Allow in the main page sandbox preview frame for league dashboard (/league/default?embed=true&demo=true)
  const isMainPageSandboxLeague = Boolean(embedded && (leagueId === "default" || leagueId === "demo" || isDemoLeague) && pathname?.startsWith("/league/"));
  const allowEmbed = isMainPageSandboxLeague ? true : !embedded;

  const allowed = allowEmbed && isDemoLeague && !loading &&
    !customerPage &&
    (!teamId || demoTeam) &&
    isDemoLeaguePagePath(pathname);

  return allowed ? <RoleSwitcherContent /> : null;
}
