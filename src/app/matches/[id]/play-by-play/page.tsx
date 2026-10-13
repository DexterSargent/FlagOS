"use client";

import { useAuth } from "@/lib/authContext";
import { use, useEffect, useState } from "react";
import AdminView from "./AdminView";
import ViewerView from "./ViewerView";
import AsyncPlayByPlayManager from "@/components/AsyncPlayByPlayManager";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useLeague } from "@/lib/leagueContext";
import { getSandboxMatches, getSandboxMatch, subscribeDemoSandbox, isDemoMatch } from "@/lib/demoSandbox";

export default function PlayByPlayWrapper({ params }: { params: Promise<{ id: string }> }) {
  const { isLeagueAdmin, isTeamAdmin, canManageTeam, loading } = useAuth();
  const { isDemoLeague } = useLeague();
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

  const isDemo = isDemoLeague || isEmbedded || isDemoMatch(matchId);

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
          setMatchData(snap.data());
        }
      } catch (err) {
        console.warn("Unable to load remote match from Firestore, falling back to sandbox:", err);
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
      }
      setModeInitialized(true);
    }
  }, [matchData]);

  if (loading || isFetching) {
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // In demo matches / play-by-play wizard demo:
  // - If embedded on the landing page showcase (embed=true), allow interactive testing of the wizard
  // - In full app, ONLY league admin can administer the game
  // - If the user switches to any role other than league admin (e.g. Team Admin, Player, Spectator),
  //   show the play-by-play / box score view for the game they were in.
  const canAdministerMatch = isEmbedded
    ? true
    : isDemo
    ? isLeagueAdmin
    : (isLeagueAdmin ||
       (matchData?.managingTeamId && canManageTeam(matchData.managingTeamId)) ||
       (matchData?.homeTeamId && canManageTeam(matchData.homeTeamId)) ||
       (matchData?.awayTeamId && canManageTeam(matchData.awayTeamId)));

  if (canAdministerMatch && matchData?.status !== "completed") {
    return (
      <div className="relative">
        {activeMode === "async" ? (
          <AsyncPlayByPlayManager matchId={matchId} backUrl={`/matches/${matchId}`} />
        ) : (
          <AdminView params={params} />
        )}
      </div>
    );
  }

  return <ViewerView params={params} />;
}
