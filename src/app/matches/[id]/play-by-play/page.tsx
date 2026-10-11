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

  useEffect(() => {
    const loadMatch = async () => {
      if (isDemoLeague) {
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
    if (isDemoLeague) {
      const unsub = subscribeDemoSandbox(() => loadMatch());
      return () => unsub();
    }
  }, [matchId, isDemoLeague]);
  
  if (loading || isFetching) {
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isAsyncMatch = matchData?.isAsyncStatKeeping || matchData?.isIndependent;
  const canAdministerMatch =
    isLeagueAdmin ||
    (matchData?.managingTeamId && canManageTeam(matchData.managingTeamId)) ||
    (matchData?.homeTeamId && canManageTeam(matchData.homeTeamId)) ||
    (matchData?.awayTeamId && canManageTeam(matchData.awayTeamId));

  // If this is an asynchronous clockless match, always route to AsyncPlayByPlayManager
  if (isAsyncMatch && canAdministerMatch && matchData?.status !== "completed") {
    return <AsyncPlayByPlayManager matchId={matchId} backUrl={`/matches/${matchId}`} />;
  }

  // Official league admin view for scheduled/in-progress matches with clock
  if (isLeagueAdmin && matchData?.status !== "completed") {
    return <AdminView params={params} />;
  }

  return <ViewerView params={params} />;
}
