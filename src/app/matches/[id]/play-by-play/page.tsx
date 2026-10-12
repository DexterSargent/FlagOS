"use client";

import { useAuth } from "@/lib/authContext";
import { use, useEffect, useState } from "react";
import AdminView from "./AdminView";
import ViewerView from "./ViewerView";
import AsyncPlayByPlayManager from "@/components/AsyncPlayByPlayManager";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useLeague } from "@/lib/leagueContext";
import { getSandboxMatches, subscribeDemoSandbox } from "@/lib/demoSandbox";

export default function PlayByPlayWrapper({ params }: { params: Promise<{ id: string }> }) {
  const { isLeagueAdmin, isTeamAdmin, canManageTeam, loading } = useAuth();
  const { isDemoLeague } = useLeague();
  const unwrappedParams = use(params);
  const matchId = unwrappedParams.id;
  const [matchData, setMatchData] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(true);

  const isDemo = isDemoLeague || matchId.startsWith("match_demo_");

  useEffect(() => {
    const loadMatch = async () => {
      if (isDemo) {
        const m = getSandboxMatches().find((m: any) => m.id === matchId);
        if (m) setMatchData(m);
        setIsFetching(false);
        return;
      }
      const snap = await getDoc(doc(db, "matches", matchId));
      if (snap.exists()) {
        setMatchData(snap.data());
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

  const isDemoMatch = isDemoLeague || matchId.startsWith("match_demo_");
  const canAdministerMatch =
    isLeagueAdmin ||
    isDemoMatch ||
    (matchData?.managingTeamId && canManageTeam(matchData.managingTeamId)) ||
    (matchData?.homeTeamId && canManageTeam(matchData.homeTeamId)) ||
    (matchData?.awayTeamId && canManageTeam(matchData.awayTeamId));

  if (canAdministerMatch && matchData?.status !== "completed") {
    return (
      <div className="relative">
        {/* Floating Mode Switcher Toggle Bar */}
        <div className="fixed top-2.5 right-4 z-50 flex items-center gap-1 bg-black/90 backdrop-blur-xl p-1 rounded-xl border border-white/20 shadow-2xl text-[11px] font-bold">
          <button
            onClick={() => setActiveMode("sync")}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              activeMode === "sync"
                ? "bg-cyan-500 text-black font-black shadow-md"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            ⚡ Synchronous Mode
          </button>
          <button
            onClick={() => setActiveMode("async")}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              activeMode === "async"
                ? "bg-emerald-500 text-black font-black shadow-md"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            📝 Asynchronous Mode
          </button>
        </div>

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
