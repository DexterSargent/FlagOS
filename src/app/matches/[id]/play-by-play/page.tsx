"use client";
import FlagOSLoader from "@/components/FlagOSLoader";

import { useAuth } from "@/lib/authContext";
import { use, useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";

const AdminView = dynamic(() => import("./AdminView"));
const ViewerView = dynamic(() => import("./ViewerView"));
const AsyncPlayByPlayManager = dynamic(() => import("@/components/AsyncPlayByPlayManager"));
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useLeague } from "@/lib/leagueContext";
import { getSandboxMatches, getSandboxMatch, subscribeDemoSandbox, isDemoMatch } from "@/lib/demoSandbox";
import { isDemoMatchId } from "@/lib/demoSandboxRuntime";
import { canRecordMatch } from "@/lib/scorerAccess";
import { useScorerGrant } from "@/lib/scorerAccessClient";
import Link from "next/link";
import DemoNoticeStrip from "@/components/DemoNoticeStrip";

/** Banners above the full-height stat keeper/viewer; their height is subtracted from the screen via --pbp-banner-height. */
function TopBanners({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    if (!el) return;
    const update = () => root.style.setProperty("--pbp-banner-height", `${Math.ceil(el.getBoundingClientRect().height)}px`);
    update();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(el);
    return () => {
      observer?.disconnect();
      root.style.removeProperty("--pbp-banner-height");
    };
  }, []);
  return <div ref={ref}>{children}</div>;
}

export default function PlayByPlayWrapper({ params }: { params: Promise<{ id: string }> }) {
  const { isLeagueAdmin, canManageTeam, loading } = useAuth();
  const { isDemoLeague, activeLeagueId, settings } = useLeague();
  const leagueStatKeepingMode = settings?.rules?.statKeepingMode;
  const unwrappedParams = use(params);
  const matchId = unwrappedParams.id;
  const [matchData, setMatchData] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(true);

  const [isEmbedded, setIsEmbedded] = useState(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("embed") === "true" || sp.get("demo") === "true";
    }
    return false;
  });

  const isDemo = isDemoMatchId(matchId) && (isDemoLeague || isEmbedded || isDemoMatch(matchId, activeLeagueId));
  const [isEmbedFrame] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("embed") === "true");
  const showDemoNotice = isDemo && !isEmbedFrame;
  const scorer = useScorerGrant(matchId, !isDemo);

  useEffect(() => {
    const loadMatch = async () => {
      if (isDemo) {
        const m = getSandboxMatch(matchId);
        if (m) setMatchData(m);
        setIsFetching(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "matches", matchId));
        if (snap.exists()) {
          setMatchData({ ...snap.data(), id: snap.id });
        } else {
          const m = getSandboxMatch(matchId);
          if (m) setMatchData(m);
        }
      } catch (err) {
        console.warn("Unable to load remote match from Firestore, falling back to local/sandbox:", err);
        const m = getSandboxMatch(matchId);
        if (m) setMatchData(m);
      }
      setIsFetching(false);
    };
    loadMatch();
    if (isDemo) {
      const unsub = subscribeDemoSandbox(() => loadMatch());
      return () => unsub();
    }
  }, [matchId, isDemo]);
  
  const [activeMode, setActiveMode] = useState<"sync" | "async">("sync");
  const [modeInitialized, setModeInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const urlMode = sp.get("mode");
      if (urlMode === "async" || urlMode === "sync") {
        setActiveMode(urlMode);
      } else if (matchData?.isAsyncStatKeeping || matchData?.isIndependent) {
        setActiveMode("async");
      } else {
        // A league set to async opens games in the clockless manager, unless a live clock game is already underway.
        const liveGameUnderway = matchData?.isAsyncStatKeeping === false || (matchData?.matchState && matchData.matchState.gameClock !== undefined && !matchData.matchState.isAsyncStatKeeping);
        const isLeagueGame = !!matchData?.leagueId && !matchData?.isStandalone;
        setActiveMode(isLeagueGame && leagueStatKeepingMode === "async" && !liveGameUnderway ? "async" : "sync");
      }
      setModeInitialized(true);
    }
  }, [matchData, leagueStatKeepingMode]);

  if (scorer.needsSignIn) {
    const here = typeof window !== "undefined" ? window.location.pathname + window.location.search : `/matches/${matchId}/play-by-play`;
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center space-y-3">
          <h1 className="text-xl font-black">You&apos;ve been invited to keep score</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Sign in or create a free account to record this game. The link only works for one person and expires automatically.
          </p>
          <Link href={`/login?redirect=${encodeURIComponent(here)}`} className="inline-block rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-cyan-700">
            Sign in to keep score
          </Link>
        </div>
      </div>
    );
  }

  if (loading || isFetching || scorer.loading) {
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        <FlagOSLoader />
      </div>
    );
  }

  // Embedded demos change presentation/data sources, not the role required to manage a game.
  // Games managed by a league-free team are administered by that team's coaches.
  // Temporary scorers invited by a league admin record only the game their link was for.
  const canAdministerMatch = canRecordMatch(matchData, { isDemo, isLeagueAdmin, canManageTeam, hasScorerGrant: scorer.hasGrant });

  if (canAdministerMatch && modeInitialized && matchData?.status !== "completed") {
    return (
      <div className="relative">
        {(showDemoNotice || (scorer.hasGrant && !isLeagueAdmin)) && (
          <TopBanners>
            {showDemoNotice && <DemoNoticeStrip />}
            {scorer.hasGrant && !isLeagueAdmin && (
              <div data-tour="scorer-access-banner" className="bg-emerald-600 px-3 py-1.5 text-center text-[11px] font-bold text-white">
                Temporary scorer access for this game · ends {new Date(scorer.expiresAt).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}
              </div>
            )}
          </TopBanners>
        )}
        {activeMode === "async" ? (
          <AsyncPlayByPlayManager matchId={matchId} backUrl={`/matches/${matchId}`} hasScorerGrant={scorer.hasGrant} />
        ) : (
          <AdminView params={params} />
        )}
      </div>
    );
  }

  return (
    <>
      {(showDemoNotice || scorer.redeemError) && (
        <TopBanners>
          {showDemoNotice && <DemoNoticeStrip />}
          {scorer.redeemError && (
            <div role="alert" className="bg-amber-500 px-3 py-2 text-center text-xs font-bold text-black">
              {scorer.redeemError}
            </div>
          )}
        </TopBanners>
      )}
      <ViewerView params={params} />
    </>
  );
}
