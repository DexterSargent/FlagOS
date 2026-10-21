"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import HelpGuide from "@/components/HelpGuide";
import RoleSwitcherBar from "@/components/RoleSwitcherBar";
import LeagueCustomizerModal from "@/components/LeagueCustomizerModal";

const InteractiveDemoGuard = dynamic(() => import("./InteractiveDemoGuard"), { ssr: false });
const LeagueHeader = dynamic(() => import("./LeagueHeader"));
const LeagueFooter = dynamic(() => import("./LeagueFooter"));

import { useAuth } from "@/lib/authContext";

function GlobalShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { role, isLeagueAdmin, isPlatformAdmin, managedTeamId, playerTeamId } = useAuth();

  // Always initialize to false so server HTML matches the first client render.
  // The real embedded state is determined in useEffect (client-only).
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    const isEmbedQuery = window.location.search.includes("embed=true");
    const isIframe = window.self !== window.top;
    setIsEmbedded(isEmbedQuery || (isIframe && isEmbedQuery));
  }, [pathname, searchParams]);

  // Certain views require full-screen chrome-less layout:
  // 1. Embedded preview iframe (e.g. interactive landing feature frame)
  // 2. Play-by-play live game scorekeeper operator console
  // 3. Dedicated authentication / login portal
  // 4. Standalone admin sandbox
  const isPlayByPlay = pathname ? pathname.includes("/play-by-play") : false;
  const isLogin = pathname === "/login";
  const isAdminSandbox = pathname === "/admin/sandbox";
  const isLandingPage = pathname === "/" || pathname === "" || pathname === null;
  const isPricingPage = pathname === "/pricing";
  const isMyStoryPage = pathname === "/my-story";
  const hideChrome = isEmbedded || isPlayByPlay || isLogin || isAdminSandbox;

  // Individual team portals and routes (team hub, roster, playbook, schedule, stats, all teams)
  const isTeamRoute = Boolean(pathname?.startsWith("/teams"));

  // User is logged in as an individual team (coach/team admin or rostered player, not a league commissioner)
  const isLoggedInAsIndividualTeam =
    !isLeagueAdmin &&
    !isPlatformAdmin &&
    (role === "team_admin" ||
      role === "player" ||
      Boolean(managedTeamId) ||
      Boolean(playerTeamId));

  // Specific league routes where league navigation is relevant
  const isLeagueRoute = Boolean(
    pathname?.startsWith("/league") ||
    pathname === "/schedule" ||
    pathname === "/stats" ||
    pathname?.startsWith("/join")
  );

  // League navigation (header and footer) should ONLY appear if:
  // 1. Not in chrome-less views (iframe embed, login, play-by-play, admin sandbox, landing, pricing, my-story)
  // 2. Not on an individual team page or team portal (/teams/...)
  // 3. User is NOT logged in as an individual team (they manage or play for a team, not the league)
  // 4. Actively in a specific league route
  const showLeagueNav =
    !hideChrome &&
    !isLandingPage &&
    !isPricingPage &&
    !isMyStoryPage &&
    !isTeamRoute &&
    !isLoggedInAsIndividualTeam &&
    isLeagueRoute;

  return (
    <div className="flex flex-col min-h-screen w-full max-w-full overflow-x-clip">
      <RoleSwitcherBar />
      {showLeagueNav && <LeagueHeader />}
      <main id="main-content" tabIndex={-1} className="flex-1 w-full max-w-full overflow-x-clip">
        {children}
      </main>
      {showLeagueNav && <LeagueFooter />}
      {isEmbedded && <InteractiveDemoGuard />}
      {!isEmbedded && !isLogin && !isAdminSandbox && !isLandingPage && <HelpGuide />}
      <LeagueCustomizerModal />
    </div>
  );
}

export default function GlobalShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<main id="main-content" tabIndex={-1} className="flex-1 w-full">{children}</main>}>
      <GlobalShellInner>{children}</GlobalShellInner>
    </Suspense>
  );
}
