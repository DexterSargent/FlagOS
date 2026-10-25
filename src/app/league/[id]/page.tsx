"use client";

import { use, useState } from "react";
import { useLeague } from "@/lib/leagueContext";
import { useLeagueDashboardData } from "@/lib/useLeagueDashboardData";
import { LeagueAdminView } from "@/components/league/dashboard/LeagueAdminView";
import { TeamAdminView } from "@/components/league/dashboard/TeamAdminView";
import { PlayerView } from "@/components/league/dashboard/PlayerView";
import { SpectatorView } from "@/components/league/dashboard/SpectatorView";
import { QuickAddPlayerModal } from "@/components/league/dashboard/QuickAddPlayerModal";
import DemoRosterNotice from "@/components/league/DemoRosterNotice";

export default function FlagOSDashboard({ params }: { params?: Promise<{ id: string }> }) {
  const unwrappedParams = params ? use(params) : null;
  const leagueIdParam = unwrappedParams?.id;

  const { openCustomizer, activeLeagueId, loading: leagueLoading } = useLeague();
  const data = useLeagueDashboardData(leagueIdParam);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);

  if (data.isDenied) {
    return data.deniedElement;
  }

  // The context starts on the demo league (including during SSR), so wait for the requested league
  // instead of flashing demo content under a real league URL.
  const isRealLeagueParam = Boolean(leagueIdParam && leagueIdParam !== "default" && leagueIdParam !== "demo");
  if (isRealLeagueParam && (activeLeagueId !== leagueIdParam || leagueLoading)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-surface-base" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-3 text-neutral-400">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading league…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col justify-between">
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-[40rem] h-[40rem] bg-cyan-900/15 rounded-full blur-[160px]"></div>
        <div className="absolute bottom-20 right-10 w-[35rem] h-[35rem] bg-blue-900/15 rounded-full blur-[170px]"></div>
      </div>

      {data.isEffectiveDemo && <DemoRosterNotice />}

      {/* VIEW 1: LEAGUE COMMISSIONER / ADMIN */}
      {data.isLeagueAdminView && (
        <LeagueAdminView
          teams={data.teams}
          matches={data.matches}
          players={data.players}
          completedMatches={data.completedMatches}
          standingsMap={data.standingsMap}
          sortedStandings={data.sortedStandings}
          liveMatches={data.liveMatches}
          liveAndUpcomingGames={data.liveAndUpcomingGames}
          topPasser={data.topPasser}
          topReceiver={data.topReceiver}
          topScorer={data.topScorer}
          topFlagger={data.topFlagger}
          subscription={data.subscription}
          settings={data.settings}
          activeLeagueId={data.activeLeagueId}
          isEffectiveDemo={data.isEffectiveDemo}
          openCustomizer={openCustomizer}
        />
      )}

      {/* VIEW 2: TEAM ADMIN / COACH */}
      {data.isTeamAdminView && (
        <TeamAdminView
          managedTeam={data.managedTeam}
          managedTeamStanding={data.managedTeamStanding}
          managedTeamStandingRank={data.managedTeamStandingRank}
          managedTeamPlayers={data.managedTeamPlayers}
          managedTeamUpcoming={data.managedTeamUpcoming}
          nextOpponentName={data.nextOpponentName}
          nextOpponentTeam={data.nextOpponentTeam}
          teamTopPasser={data.teamTopPasser}
          teamTopReceiver={data.teamTopReceiver}
          teamTopScorer={data.teamTopScorer}
          teamTopDefender={data.teamTopDefender}
          playerStats={data.playerStats}
          liveAndUpcomingGames={data.liveAndUpcomingGames}
          liveMatches={data.liveMatches}
          teams={data.teams}
          standingsMap={data.standingsMap}
          sortedStandings={data.sortedStandings}
          isEffectiveDemo={data.isEffectiveDemo}
          onOpenAddPlayer={() => setIsAddPlayerModalOpen(true)}
        />
      )}

      {/* VIEW 2.5: ATHLETE / PLAYER */}
      {data.isPlayerView && (
        <PlayerView
          pName={data.pName}
          pNumber={data.pNumber}
          pPositions={data.pPositions}
          pExperience={data.pExperience}
          activePlayer={data.activePlayer}
          myPlayerTeam={data.myPlayerTeam}
          myPlayerStanding={data.myPlayerStanding}
          myPlayerStandingRank={data.myPlayerStandingRank}
          myPlayerTeammates={data.myPlayerTeammates}
          myPlayerUpcomingMatch={data.myPlayerUpcomingMatch}
          myPlayerOpponentName={data.myPlayerOpponentName}
          myPlayerOpponentTeam={data.myPlayerOpponentTeam}
          myStats={data.myStats}
          isLeagueTopPasser={data.isLeagueTopPasser}
          isLeagueTopReceiver={data.isLeagueTopReceiver}
          isLeagueTopScorer={data.isLeagueTopScorer}
          isLeagueTopFlagger={data.isLeagueTopFlagger}
          topPasser={data.topPasser}
          topReceiver={data.topReceiver}
          topScorer={data.topScorer}
          topFlagger={data.topFlagger}
          liveAndUpcomingGames={data.liveAndUpcomingGames}
          liveMatches={data.liveMatches}
          teams={data.teams}
          players={data.players}
          playerStats={data.playerStats}
          standingsMap={data.standingsMap}
          sortedStandings={data.sortedStandings}
          settings={data.settings}
          isLeagueAdmin={data.isLeagueAdmin}
          isTeamAdmin={data.isTeamAdmin}
          isEffectiveDemo={data.isEffectiveDemo}
          setDevRole={data.setDevRole}
        />
      )}

      {/* VIEW 3: SPECTATOR / FAN GAMEDAY CENTRAL */}
      {data.isSpectatorView && (
        <SpectatorView
          settings={data.settings}
          teams={data.teams}
          matches={data.matches}
          players={data.players}
          upcomingMatches={data.upcomingMatches}
          liveMatches={data.liveMatches}
          liveAndUpcomingGames={data.liveAndUpcomingGames}
          standingsMap={data.standingsMap}
          sortedStandings={data.sortedStandings}
          topPasser={data.topPasser}
          topReceiver={data.topReceiver}
          topScorer={data.topScorer}
          topFlagger={data.topFlagger}
          isEffectiveDemo={data.isEffectiveDemo}
          isEmbedded={typeof window !== "undefined" && new URLSearchParams(window.location.search).get("embed") === "true"}
          canRegisterAsPlayer={data.canRegisterAsPlayer}
        />
      )}

      {/* QUICK ADD PLAYER MODAL */}
      <QuickAddPlayerModal
        isOpen={isAddPlayerModalOpen}
        onClose={() => setIsAddPlayerModalOpen(false)}
        managedTeam={data.managedTeam}
        activeLeagueId={data.activeLeagueId}
        isEffectiveDemo={data.isEffectiveDemo}
        onPlayerAdded={(newPlayer) => {
          data.setPlayers((prev) => [...prev.filter((p) => p.id !== newPlayer.id), newPlayer]);
        }}
      />
    </div>
  );
}
