"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ChevronLeft, ShieldAlert, Clock, MapPin } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/lib/authContext";
import { useLeague } from "@/lib/leagueContext";
import LeagueHeader from "@/components/LeagueHeader";
import LeagueFooter from "@/components/LeagueFooter";
import { renderFlagOS } from "@/components/FlagOSText";
import { getSandboxMatches, getSandboxMatch, updateSandboxMatch, deleteSandboxPlaysForMatch, subscribeDemoSandbox } from "@/lib/demoSandbox";

export default function MatchDetails({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const matchId = unwrappedParams.id;
  const { settings, isDemoLeague } = useLeague();
  const { isLeagueAdmin, canManageTeam } = useAuth();

  const [matchData, setMatchData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatch = async () => {
      if (isDemoLeague) {
        const m = getSandboxMatch(matchId);
        if (m) setMatchData(m);
        setLoading(false);
        return;
      }
      try {
        const docSnap = await getDoc(doc(db, "matches", matchId));
        if (docSnap.exists()) {
          setMatchData(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching match:", error);
      }
      setLoading(false);
    };
    fetchMatch();
    if (isDemoLeague) {
      const unsub = subscribeDemoSandbox(() => fetchMatch());
      return () => unsub();
    }
  }, [matchId, isDemoLeague]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Match Not Found</h2>
          <Link href="/schedule" className="text-cyan-400 hover:underline">Return to Schedule</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col">
      {/* Branded League Navigation Bar */}
      <LeagueHeader activePage="schedule" />

      <div className="max-w-4xl mx-auto space-y-8 flex-1 w-full p-6 md:p-12">

        {/* Navigation */}
        <Link href="/schedule" className="inline-flex items-center text-neutral-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Schedule
        </Link>

        {/* Match Header */}
        <div className="bg-neutral-900 border border-white/5 rounded-3xl p-8 relative overflow-hidden">
          <div
            className="absolute top-0 left-0 w-full h-1"
            style={{
              background: `linear-gradient(90deg, var(--league-primary), var(--league-accent))`,
            }}
          ></div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-1">
                <span className="text-xs font-bold tracking-widest text-cyan-400 uppercase">
                  {renderFlagOS(settings.leagueName)} • Week {matchData.week}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-mono text-neutral-400">
                  {settings.seasonTitle || "2026 Season"}
                </span>
                {matchData.isPreseason && <span className="text-xs font-bold tracking-widest text-amber-500 uppercase bg-amber-500/10 px-2 py-0.5 rounded-md">Preseason</span>}
              </div>
              <h1 className="text-3xl md:text-4xl font-black mt-2 text-white">{matchData.homeTeamName} vs. {matchData.awayTeamName}</h1>
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-neutral-400">
                  <Clock className="w-4 h-4" />
                  <span>{matchData.date} • {matchData.time}</span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-500">
                  <MapPin className="w-4 h-4" />
                  <span>{matchData.location || settings.defaultLocation}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8 bg-black/50 px-8 py-4 rounded-2xl border border-white/5">
              <div className="text-center w-24">
                <span className="text-sm text-neutral-400 block mb-1 truncate">{matchData.homeTeamName}</span>
                <span className="text-4xl font-bold">{matchData.homeScore || 0}</span>
              </div>
              <span className="text-neutral-600 font-light text-2xl">-</span>
              <div className="text-center w-24">
                <span className="text-sm text-neutral-400 block mb-1 truncate">{matchData.awayTeamName}</span>
                <span className="text-4xl font-bold">{matchData.awayScore || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Controls */}
        {(isLeagueAdmin || (matchData?.managingTeamId && canManageTeam(matchData.managingTeamId)) || (matchData?.homeTeamId && canManageTeam(matchData.homeTeamId)) || (matchData?.awayTeamId && canManageTeam(matchData.awayTeamId))) && (
          <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-lg text-white">Match Administration</h3>
                <p className="text-sm text-neutral-400">
                  {matchData.isAsyncStatKeeping
                    ? "Asynchronous clockless match tracking with First & Second Half scoring."
                    : "Official live match tracking with game clock and play clock."}
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              {isLeagueAdmin && (
                <button
                  onClick={async () => {
                    try {
                      const newValue = !matchData.isPreseason;
                      if (isDemoLeague) {
                        updateSandboxMatch(matchId, { isPreseason: newValue });
                        setMatchData({ ...matchData, isPreseason: newValue });
                        return;
                      }
                      const { updateDoc, doc } = await import('firebase/firestore');
                      await updateDoc(doc(db, 'matches', matchId), { isPreseason: newValue });
                      setMatchData({ ...matchData, isPreseason: newValue });
                    } catch (e) { console.error(e) }
                  }}
                  className={`px-4 py-3 font-semibold rounded-xl transition-all whitespace-nowrap border ${matchData.isPreseason ? 'bg-amber-500/20 text-amber-500 border-amber-500/50 hover:bg-amber-500/30' : 'bg-neutral-800 text-neutral-400 border-white/10 hover:bg-neutral-700'}`}
                >
                  {matchData.isPreseason ? "★ Preseason" : "Mark as Preseason"}
                </button>
              )}
              {matchData.status !== 'completed' ? (
                <Link
                  href={`/matches/${matchId}/play-by-play`}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/30 transition-all active:scale-95 whitespace-nowrap"
                >
                  {matchData.isAsyncStatKeeping ? "Async Stat Keeper" : "Play-by-Play Manager"}
                </Link>
              ) : isDemoLeague && isLeagueAdmin ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      updateSandboxMatch(matchId, { status: "in_progress" });
                      window.location.href = `/matches/${matchId}/play-by-play`;
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/30 transition-all active:scale-95 whitespace-nowrap"
                  >
                    Reopen Play-by-Play
                  </button>
                  <button
                    onClick={() => {
                      if (!confirm("Reset this demo match to pre-game state (0-0 score, all plays cleared)?")) return;
                      deleteSandboxPlaysForMatch(matchId);
                      updateSandboxMatch(matchId, {
                        status: "scheduled",
                        homeScore: 0,
                        awayScore: 0,
                        matchState: null,
                        didNotPlay: [],
                      });
                      window.location.reload();
                    }}
                    className="px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xl border border-white/10 transition-all whitespace-nowrap"
                  >
                    Reset Match
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}

        <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 mt-4">
          <div>
            <h3 className="font-semibold text-lg text-white">
              {matchData.status === 'completed' ? 'Box Score & Play-by-Play' : 'Live Play-by-Play'}
            </h3>
            <p className="text-sm text-neutral-400">
              {matchData.status === 'completed' ? 'Review the full stats and history of this game.' : 'Follow the game action in real-time.'}
            </p>
          </div>
          <Link
            href={`/matches/${matchId}/play-by-play`}
            className="px-6 py-3 bg-white hover:bg-neutral-200 text-black font-semibold rounded-xl shadow-lg transition-all active:scale-95 whitespace-nowrap"
          >
            {matchData.status === 'completed' ? 'See Stats' : 'Watch Live'}
          </Link>
        </div>

      </div>

      {/* Branded League Footer */}
      <LeagueFooter />
    </div>
  );
}
