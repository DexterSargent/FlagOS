"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import RoleSwitcherBar from "@/components/RoleSwitcherBar";
import LeagueCustomizerModal from "@/components/LeagueCustomizerModal";

const InteractiveDemoGuard = dynamic(() => import("./InteractiveDemoGuard"), { ssr: false });
const LeagueHeader = dynamic(() => import("./LeagueHeader"));
const LeagueFooter = dynamic(() => import("./LeagueFooter"));
const SiteHeader = dynamic(() => import("./SiteHeader"));
const PoweredByFooter = dynamic(() => import("./PoweredByFooter"));

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

  // Views that skip the league header/footer entirely:
  // 1. Embedded preview iframe (e.g. interactive landing feature frame)
  // 2. Play-by-play views (they render their own controls inside the console header)
  // 3. Login portal and admin sandbox (they get the minimal site header instead)
  const isPlayByPlay = pathname ? pathname.includes("/play-by-play") : false;
  const isLogin = pathname === "/login";
  const isAdminSandbox = pathname === "/admin/sandbox";
  const isLandingPage = pathname === "/" || pathname === "" || pathname === null;
  const isPricingPage = pathname === "/pricing";
  const isMyStoryPage = pathname === "/my-story";
  const hideChrome = isEmbedded || isPlayByPlay || isLogin || isAdminSandbox;

  // Individual team portals (team hub, roster, playbook, schedule, stats) carry their own team nav.
  // The league-wide /teams directory is a league page and keeps the league header/footer.
  const isTeamRoute = Boolean(pathname?.startsWith("/teams/"));

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
    pathname === "/league" ||
    pathname?.startsWith("/league/") ||
    pathname === "/schedule" ||
    pathname === "/stats" ||
    pathname === "/teams" ||
    // League box-score pages (live play-by-play stays chrome-less via hideChrome)
    pathname?.startsWith("/matches/") ||
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

  // Every other page still gets the theme toggle, account menu and "Powered by FlagOS" footer.
  // Marketing pages, team portals and play-by-play views render these inside their own chrome.
  const showSiteChrome =
    !isEmbedded &&
    !showLeagueNav &&
    !isLandingPage &&
    !isPricingPage &&
    !isMyStoryPage &&
    !isTeamRoute &&
    !isPlayByPlay;

  return (
    <div className="flex flex-col min-h-screen w-full max-w-full overflow-x-clip">
      <RoleSwitcherBar />
      {showLeagueNav && <LeagueHeader />}
      {showSiteChrome && <SiteHeader />}
      <main id="main-content" tabIndex={-1} className="flex-1 w-full max-w-full overflow-x-clip">
        {children}
      </main>
      {showLeagueNav && <LeagueFooter />}
      {showSiteChrome && <PoweredByFooter />}
      {isEmbedded && <InteractiveDemoGuard />}
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
