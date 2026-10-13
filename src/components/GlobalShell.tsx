"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import LeagueHeader from "@/components/LeagueHeader";
import LeagueFooter from "@/components/LeagueFooter";

function GlobalShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
  const isLandingPage = pathname === "/";
  const hideChrome = isEmbedded || isPlayByPlay || isLogin || isAdminSandbox;

  return (
    <div className="flex flex-col min-h-screen">
      {!hideChrome && !isLandingPage && <LeagueHeader />}
      <main className="flex-1 w-full">
        {children}
      </main>
      {!hideChrome && <LeagueFooter />}
    </div>
  );
}

export default function GlobalShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex-1 w-full">{children}</div>}>
      <GlobalShellInner>{children}</GlobalShellInner>
    </Suspense>
  );
}
