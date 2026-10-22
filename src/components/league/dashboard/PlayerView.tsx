"use client";

import React from "react";
import Link from "next/link";
import {
  Trophy,
  Sparkles,
  ChevronRight,
  Flame,
  MapPin,
  Clock,
  BookOpen,
  CalendarDays,
  Activity,
  User,
  Crosshair,
  Zap,
  Shield,
  Shirt,
  ArrowRight,
  Sliders,
  Users,
} from "lucide-react";
import { TeamLogo } from "@/components/TeamAssets";
import { LeagueScheduleWidget } from "./LeagueScheduleWidget";

export interface PlayerViewProps {
  pName: string;
  pNumber: string;
  pPositions: string[];
  pExperience: string;
  activePlayer: any;
  myPlayerTeam: any;
  myPlayerStanding: any;
  myPlayerStandingRank: number;
  myPlayerTeammates: any[];
  myPlayerUpcomingMatch: any;
  myPlayerOpponentName: string;
  myPlayerOpponentTeam: any;
  myStats: any;
  isLeagueTopPasser: boolean;
  isLeagueTopReceiver: boolean;
  isLeagueTopScorer: boolean;
  isLeagueTopFlagger: boolean;
  topPasser: any;
  topReceiver: any;
  topScorer: any;
  topFlagger: any;
  liveAndUpcomingGames: any[];
  liveMatches: any[];
  teams: any[];
  players: any[];
  playerStats: Record<string, any>;
  standingsMap: Record<string, any>;
  sortedStandings: any[];
  settings: any;
  isLeagueAdmin: boolean;
  isTeamAdmin: (teamId?: string) => boolean;
  isEffectiveDemo: boolean;
  setDevRole: (role: any, teamId?: string, playerId?: string) => void;
}

export function PlayerView({
  pName,
  pNumber,
  pPositions,
  pExperience,
  activePlayer,
  myPlayerTeam,
  myPlayerStanding,
  myPlayerStandingRank,
  myPlayerTeammates,
  myPlayerUpcomingMatch,
  myPlayerOpponentName,
  myPlayerOpponentTeam,
  myStats,
  isLeagueTopPasser,
  isLeagueTopReceiver,
  isLeagueTopScorer,
  isLeagueTopFlagger,
  topPasser,
  topReceiver,
  topScorer,
  topFlagger,
  liveAndUpcomingGames,
  liveMatches,
  teams,
  players,
  playerStats,
  standingsMap,
  sortedStandings,
  settings,
  isLeagueAdmin,
  isTeamAdmin,
  isEffectiveDemo,
  setDevRole,
}: PlayerViewProps) {
  return (
    <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full max-w-full overflow-hidden space-y-8">
      {/* Athlete Cockpit Hero Banner */}
      <div className="bg-gradient-to-br from-[#061822]/95 via-[#0B0F19] to-[#08121E] border-2 border-emerald-500/40 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
        {/* Ambient Background Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-line relative z-10">
          <div className="flex items-start sm:items-center gap-5">
            {/* Athlete Jersey Number / Logo Shield */}
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-black/80 border-2 border-emerald-500/50 p-2 flex flex-col items-center justify-center shrink-0 shadow-[0_0_35px_rgba(16,185,129,0.3)] relative group">
              <span className="text-[10px] font-mono uppercase font-black text-emerald-400 tracking-wider">
                JERSEY
              </span>
              <span className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-none mt-0.5">
                #{pNumber}
              </span>
              <div className="absolute -bottom-1 px-1.5 py-0.2 bg-emerald-500 text-black text-[9px] font-black rounded uppercase tracking-wider">
                {pPositions[0] || "ATH"}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Athlete Gameday Cockpit
                </span>
                <span className="text-neutral-500 text-xs">•</span>
                <span className="text-[11px] font-mono text-cyan-300 uppercase font-bold">
                  {pExperience}
                </span>
                {myPlayerTeam && (
                  <>
                    <span className="text-neutral-500 text-xs">•</span>
                    <span className="text-[11px] font-mono text-amber-400 font-bold">
                      {myPlayerTeam.name} (#{myPlayerStandingRank > 0 ? myPlayerStandingRank : "-"})
                    </span>
                  </>
                )}
              </div>

              <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                <span>{pName || "Athlete Profile"}</span>
              </h1>

              <p className="text-neutral-400 text-xs md:text-sm mt-1 max-w-xl">
                {myPlayerTeam ? (
                  <>
                    Rostered Athlete on{" "}
                    <span className="text-emerald-400 font-bold">{myPlayerTeam.name}</span>. Review upcoming
                    games, study team route diagrams, track personal statistics, and prepare for kickoff.
                  </>
                ) : (
                  <>
                    Active Free Agent athlete in the league pool. You are eligible for team signing and waiver
                    draft. Explore rosters and game day schedules.
                  </>
                )}
              </p>

              {/* Position tags */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {pPositions.map((pos) => (
                  <span
                    key={pos}
                    className="px-2.5 py-0.5 rounded-lg bg-surface-muted border border-line text-[10px] font-mono font-bold text-neutral-300 uppercase"
                  >
                    {pos}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Player Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 relative z-10">
            {myPlayerTeam && (!isLeagueAdmin || isTeamAdmin(myPlayerTeam.id)) && (
              <Link
                href={`/teams/${myPlayerTeam.id}/playbook`}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                <span>Team Playbook</span>
              </Link>
            )}
            {myPlayerTeam ? (
              <>
                <Link
                  href={`/teams/${myPlayerTeam.id}`}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider rounded-xl border border-white/15 transition-all flex items-center gap-2"
                >
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span>Team Hub</span>
                </Link>

                <Link
                  href={`/teams/${myPlayerTeam.id}/roster`}
                  className="px-4 py-2.5 bg-surface-muted hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl border border-line transition-colors flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Squad Roster</span>
                </Link>
              </>
            ) : (
              <Link
                href="/teams"
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                <span>View Teams</span>
              </Link>
            )}

            <Link
              href="/profile"
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider rounded-xl border border-cyan-500/30 transition-all flex items-center gap-2"
            >
              <User className="w-4 h-4 text-cyan-400" />
              <span>My Profile & Themes</span>
            </Link>
          </div>
        </div>

        {/* Athlete Performance Quick Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 relative z-10">
          <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl hover:border-emerald-500/30 transition-all">
            <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">
              Season Touchdowns
            </span>
            <div className="text-3xl font-black text-emerald-400 mt-1 tabular-nums">
              {myStats.totalTDs}
            </div>
            <span className="text-[11px] text-neutral-400 mt-1 block">
              {myStats.passTD} Pass • {myStats.recTD} Rec • {myStats.rushTD} Rush
            </span>
          </div>

          <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl hover:border-cyan-500/30 transition-all">
            <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">
              Defensive Impact
            </span>
            <div className="text-3xl font-black text-cyan-300 mt-1 tabular-nums">
              {myStats.flagPulls}
            </div>
            <span className="text-[11px] text-neutral-400 mt-1 block">
              {myStats.int} INT • {myStats.sacks} Sacks • {myStats.pbu} PBU
            </span>
          </div>

          <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl hover:border-amber-500/30 transition-all">
            <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">
              Team Standing
            </span>
            <div className="text-3xl font-black text-white mt-1 tabular-nums">
              {myPlayerStanding ? `${myPlayerStanding.w}-${myPlayerStanding.l}-${myPlayerStanding.t}` : "0-0-0"}
            </div>
            <span className="text-[11px] text-amber-400 mt-1 block font-mono">
              {myPlayerTeam
                ? `Rank #${myPlayerStandingRank > 0 ? myPlayerStandingRank : "-"} • ${myPlayerStanding?.pts || 0} Pts`
                : "Free Agent Pool"}
            </span>
          </div>

          <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl hover:border-white/20 transition-all">
            <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">
              Games Played
            </span>
            <div className="text-3xl font-black text-white mt-1 tabular-nums">
              {myStats.gamesPlayed}
            </div>
            <span className="text-[11px] text-emerald-400 mt-1 block">
              Active Season Games
            </span>
          </div>
        </div>
      </div>

      {/* ALL-STAR RECOGNITION RIBBON (If Player is a League Leader) */}
      {(isLeagueTopPasser || isLeagueTopReceiver || isLeagueTopScorer || isLeagueTopFlagger) && (
        <div className="bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-yellow-950/40 border border-amber-500/40 rounded-3xl p-5 md:p-6 backdrop-blur-md shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded">
                  League Leader Recognition
                </span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              </div>
              <h4 className="text-sm md:text-base font-black text-white mt-0.5">
                Congratulations! You are officially ranked among the top performers in the league.
              </h4>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isLeagueTopPasser && (
              <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-mono text-xs font-black border border-amber-500/30 flex items-center gap-1.5">
                <span>#1 Passing TDs ({topPasser.passTD})</span>
              </span>
            )}
            {isLeagueTopReceiver && (
              <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-mono text-xs font-black border border-amber-500/30 flex items-center gap-1.5">
                <span>#1 Receiving TDs ({topReceiver.recTD})</span>
              </span>
            )}
            {isLeagueTopScorer && (
              <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-mono text-xs font-black border border-amber-500/30 flex items-center gap-1.5">
                <span>#1 Total Touchdowns ({topScorer.totalTD})</span>
              </span>
            )}
            {isLeagueTopFlagger && (
              <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-mono text-xs font-black border border-amber-500/30 flex items-center gap-1.5">
                <span>#1 Defensive Flags ({topFlagger.flagPulls})</span>
              </span>
            )}
            <Link
              href="/stats"
              className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors flex items-center gap-1"
            >
              <span>Leaderboards</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* NEXT MATCHDAY SPOTLIGHT (Head-to-Head Banner) */}
      {myPlayerUpcomingMatch ? (
        <div className="bg-gradient-to-r from-emerald-950/40 via-[#0B0F19] to-cyan-950/40 border border-emerald-500/30 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-black uppercase tracking-wider text-white">
                Next Gameday Spotlight
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30">
                {myPlayerUpcomingMatch.week || "Upcoming Gameday"}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-mono text-[10px] font-bold border border-cyan-500/20 hidden sm:inline-block">
                Kickoff Ready
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Your Team */}
            <div className="flex items-center gap-4 flex-1">
              <div className="w-16 h-16 rounded-2xl bg-black/60 border border-emerald-500/40 p-2.5 flex items-center justify-center shrink-0">
                <TeamLogo
                  teamName={myPlayerTeam?.name || "Your Team"}
                  logoUrl={myPlayerTeam?.logoUrl}
                  icon={myPlayerTeam?.icon}
                  className="w-full h-full object-contain"
                  isDemo={isEffectiveDemo}
                  primaryColor={myPlayerTeam?.primaryColor || myPlayerTeam?.color}
                />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  YOUR SQUAD
                </span>
                <h3 className="text-xl font-black text-white">{myPlayerTeam?.name}</h3>
                <p className="text-xs text-neutral-400 font-mono">
                  {myPlayerStanding ? `${myPlayerStanding.w}-${myPlayerStanding.l}-${myPlayerStanding.t}` : "0-0-0"}
                </p>
              </div>
            </div>

            {/* VS Badge & Match Time */}
            <div className="flex flex-col items-center justify-center px-6 py-2 bg-black/70 rounded-2xl border border-line shrink-0 text-center">
              <span className="text-2xl font-black text-amber-400 tracking-wider">VS</span>
              <div className="text-xs font-bold text-white mt-1">{myPlayerUpcomingMatch.date}</div>
              <div className="text-[11px] font-mono text-emerald-400">{myPlayerUpcomingMatch.time || "TBD"}</div>
              <div className="text-[10px] text-neutral-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{myPlayerUpcomingMatch.location || "Field 1"}</span>
              </div>
            </div>

            {/* Opponent Team */}
            <div className="flex items-center gap-4 flex-1 justify-end text-right">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                  OPPOSING SQUAD
                </span>
                <h3 className="text-xl font-black text-white">{myPlayerOpponentName}</h3>
                <p className="text-xs text-neutral-400 font-mono">
                  {myPlayerOpponentTeam && standingsMap[myPlayerOpponentTeam.id]
                    ? `${standingsMap[myPlayerOpponentTeam.id].w}-${standingsMap[myPlayerOpponentTeam.id].l}-${standingsMap[myPlayerOpponentTeam.id].t}`
                    : "Opposing Team"}
                </p>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-black/60 border border-line p-2.5 flex items-center justify-center shrink-0">
                <TeamLogo
                  teamName={myPlayerOpponentName}
                  logoUrl={myPlayerOpponentTeam?.logoUrl}
                  icon={myPlayerOpponentTeam?.icon}
                  className="w-full h-full object-contain"
                  isDemo={isEffectiveDemo}
                  primaryColor={myPlayerOpponentTeam?.primaryColor || myPlayerOpponentTeam?.color}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-neutral-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                Game scheduled for{" "}
                <strong className="text-white">{myPlayerUpcomingMatch.date}</strong> at{" "}
                <strong className="text-cyan-300">{myPlayerUpcomingMatch.time || "TBD"}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              {myPlayerTeam && (!isLeagueAdmin || isTeamAdmin(myPlayerTeam.id)) && (
                <Link
                  href={`/teams/${myPlayerTeam.id}/playbook`}
                  className="px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/30 transition-all flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Study Game Plan</span>
                </Link>
              )}
              <Link
                href={`/matches/${myPlayerUpcomingMatch.id}`}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/15 transition-all flex items-center gap-2"
              >
                <span>Game Center & Matchup Preview →</span>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface-raised border border-line rounded-3xl p-6 text-center text-neutral-400 text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-neutral-300">
            <CalendarDays className="w-4 h-4 text-emerald-400" />
            <span>
              No upcoming games currently on your team schedule. You are on a Bye Week or awaiting schedule publication.
            </span>
          </div>
          <Link
            href="/schedule"
            className="px-4 py-2 bg-surface-muted hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-line transition-colors flex items-center gap-1.5"
          >
            <span>View Full League Schedule</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Section: Live & Upcoming Games */}
      <LeagueScheduleWidget
        games={liveAndUpcomingGames}
        liveCount={liveMatches.length}
        teams={teams}
        standingsMap={standingsMap}
        isLeagueAdmin={false}
        isDemo={isEffectiveDemo}
      />

      {/* ATHLETE STATS MATRIX (Individual Season Breakdown) */}
      <section className="bg-surface-raised border border-line rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-line-subtle">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-lg font-black uppercase tracking-wider text-white">
                Personal Season Performance Matrix
              </h3>
            </div>
            <p className="text-xs text-neutral-400">
              Official statistical production recorded across all sanctioned league matches this season.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/stats"
              className="px-3.5 py-1.5 bg-surface-muted hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold rounded-xl border border-line transition-colors flex items-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>League Leaderboards</span>
            </Link>
            <Link
              href="/profile"
              className="px-3.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/30 transition-colors flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full Career Logs</span>
            </Link>
          </div>
        </div>

        {/* 4 Stat Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Touchdowns & Scoring */}
          <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Touchdown Production
              </span>
              <Flame className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-3xl font-black text-amber-300 tabular-nums">
              {myStats.totalTDs} <span className="text-xs font-normal text-neutral-500">Total TDs</span>
            </div>
            <div className="space-y-1.5 mt-3 pt-3 border-t border-line-subtle text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Passing TDs:</span>
                <strong className="text-white font-mono">{myStats.passTD}</strong>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Receiving TDs:</span>
                <strong className="text-white font-mono">{myStats.recTD}</strong>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Rushing TDs:</span>
                <strong className="text-white font-mono">{myStats.rushTD}</strong>
              </div>
            </div>
          </div>

          {/* Card 2: Passing */}
          <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl relative overflow-hidden group hover:border-cyan-500/30 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Air Attack (Passing)
              </span>
              <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-3xl font-black text-cyan-300 tabular-nums">
              {myStats.passComp} <span className="text-xs font-normal text-neutral-500">/ {myStats.passAtt} Comp</span>
            </div>
            <div className="space-y-1.5 mt-3 pt-3 border-t border-line-subtle text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Comp Rate:</span>
                <strong className="text-white font-mono">
                  {myStats.passAtt > 0
                    ? `${Math.round((myStats.passComp / myStats.passAtt) * 100)}%`
                    : "0%"}
                </strong>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Pass TDs:</span>
                <strong className="text-white font-mono">{myStats.passTD}</strong>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Pass Attempts:</span>
                <strong className="text-white font-mono">{myStats.passAtt}</strong>
              </div>
            </div>
          </div>

          {/* Card 3: Receiving & Rushing */}
          <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Target Share & Carries
              </span>
              <Zap className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-3xl font-black text-blue-300 tabular-nums">
              {myStats.receptions} <span className="text-xs font-normal text-neutral-500">Receptions</span>
            </div>
            <div className="space-y-1.5 mt-3 pt-3 border-t border-line-subtle text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Rec TDs:</span>
                <strong className="text-white font-mono">{myStats.recTD}</strong>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Rush Attempts:</span>
                <strong className="text-white font-mono">{myStats.rushAtt}</strong>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Rush TDs:</span>
                <strong className="text-white font-mono">{myStats.rushTD}</strong>
              </div>
            </div>
          </div>

          {/* Card 4: Defense */}
          <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Defensive Stops
              </span>
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-emerald-400 tabular-nums">
              {myStats.flagPulls} <span className="text-xs font-normal text-neutral-500">Flags</span>
            </div>
            <div className="space-y-1.5 mt-3 pt-3 border-t border-line-subtle text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Interceptions (INT):</span>
                <strong className="text-white font-mono">{myStats.int}</strong>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>QB Sacks:</span>
                <strong className="text-white font-mono">{myStats.sacks}</strong>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Pass Breakups (PBU):</span>
                <strong className="text-white font-mono">{myStats.pbu}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2-COLUMN SECTION: Team CLUBHOUSE & PLAYBOOK ARMBAND */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Column 1 & 2: Team Locker Room & Squad Mates */}
        <div className="lg:col-span-2 bg-surface-raised border border-line rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-line-subtle">
              <div className="flex items-center gap-2">
                <Shirt className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-black uppercase tracking-wider text-white">
                  {myPlayerTeam ? `${myPlayerTeam.name} Roster` : "Squad Teammates"} (
                  {myPlayerTeammates.length} Athletes)
                </h3>
              </div>
              {myPlayerTeam && (
                <Link
                  href={`/teams/${myPlayerTeam.id}/roster`}
                  className="text-xs font-bold text-neutral-400 hover:text-white flex items-center gap-1"
                >
                  <span>Full Roster</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {myPlayerTeammates.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs italic bg-black/40 rounded-2xl border border-line-subtle">
                {myPlayerTeam
                  ? "No other players rostered on this team yet."
                  : "You are currently unassigned to a team. Join a team or await commissioner draft assignment."}
              </div>
            ) : (
              <div className="overflow-x-auto hide-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-neutral-500 border-b border-line-subtle font-mono uppercase">
                      <th className="pb-2 w-12">#</th>
                      <th className="pb-2">Athlete Name</th>
                      <th className="pb-2">Positions</th>
                      <th className="pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {myPlayerTeammates.slice(0, 8).map((p) => {
                      const isCurrentActivePlayer = p.playerName === pName;
                      return (
                        <tr
                          key={p.id}
                          className={`transition-colors ${
                            isCurrentActivePlayer
                              ? "bg-emerald-500/15 font-bold border-l-4 border-emerald-400"
                              : "hover:bg-surface-muted"
                          }`}
                        >
                          <td className="py-2.5 font-mono font-bold text-emerald-400">
                            #{p.playerNumber || p.number || "0"}
                          </td>
                          <td className="py-2.5 font-bold text-white flex items-center gap-1.5">
                            <span>{p.playerName}</span>
                            {isCurrentActivePlayer && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                                YOU
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 text-neutral-300 font-mono text-[11px]">
                            {Array.isArray(p.positions) && p.positions.length > 0
                              ? p.positions.join(", ")
                              : p.position || "ATH"}
                          </td>
                          <td className="py-2.5 text-right text-[10px] text-emerald-400 font-mono">Active</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {myPlayerTeam && (
            <div className="pt-4 mt-4 border-t border-line-subtle flex items-center justify-between gap-3">
              <div className="text-xs text-neutral-400">
                Squad Record:{" "}
                <strong className="text-white">
                  {myPlayerStanding ? `${myPlayerStanding.w}W - ${myPlayerStanding.l}L` : "0-0"}
                </strong>
              </div>
              <Link
                href={`/teams/${myPlayerTeam.id}`}
                className="py-2 px-4 bg-surface-muted hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold rounded-xl border border-line transition-colors flex items-center gap-2"
              >
                <span>View Team Clubhouse</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Column 3: Playbook & Tactical Armband */}
        <div className="bg-surface-raised border border-line rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-line-subtle">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-black uppercase tracking-wider text-white">
                  Playbook & Armband
                </h3>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">
                Interactive
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/30 to-blue-950/30 border border-cyan-500/20 mb-4">
              <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Study Your Routes</span>
              </h4>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Review your team's route assignments, passing progressions, and defensive alignment calls
                designed by your coaches.
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-black/50 border border-line-subtle p-3.5 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                  Field Configuration
                </span>
                <div className="text-sm font-black text-white mt-1">
                  {settings.rules?.playersOnField || 5}v{settings.rules?.playersOnField || 5} Squad Format
                </div>
                <div className="text-xs text-cyan-400 font-mono mt-0.5">
                  {settings.rules?.rushLineDistance || 7} Yard Rush Line • {settings.rules?.downsPerSeries || 4} Downs per Series
                </div>
              </div>

              <div className="bg-black/50 border border-line-subtle p-3.5 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                  Gameday Wristband
                </span>
                <div className="text-sm font-black text-white mt-1">
                  Printable Wrist Coach Armband
                </div>
                <div className="text-xs text-emerald-400 font-mono mt-0.5">
                  Instant Printable 8-Play Grid
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-line-subtle">
            {myPlayerTeam && (!isLeagueAdmin || isTeamAdmin(myPlayerTeam.id)) ? (
              <Link
                href={`/teams/${myPlayerTeam.id}/playbook`}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)] flex items-center justify-center gap-2"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Launch Team Playbook</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                href="/teams"
                className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <span>Browse Teams</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Section: Standings with Highlighted Player Team Row */}
      <section className="bg-surface-raised border border-line rounded-3xl p-6 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-line-subtle">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-base font-black uppercase tracking-wider text-white">
              League Standings (Championship Race)
            </h3>
          </div>
          <Link href="/stats" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
            <span>View Full Table</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto hide-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-neutral-500 border-b border-line-subtle font-mono uppercase">
                <th className="pb-2 w-8">#</th>
                <th className="pb-2">Team</th>
                <th className="pb-2 text-center">W</th>
                <th className="pb-2 text-center">L</th>
                <th className="pb-2 text-center hidden sm:table-cell">T</th>
                <th className="pb-2 text-center">Diff</th>
                <th className="pb-2 text-right">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedStandings.map((row, idx) => {
                const isMyTeam = row.id === myPlayerTeam?.id;
                const teamObj = teams.find((t) => t.id === row.id);

                return (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      isMyTeam
                        ? "bg-emerald-500/15 font-bold border-l-4 border-emerald-400"
                        : "hover:bg-surface-muted"
                    }`}
                  >
                    <td className="py-3 font-mono font-bold text-neutral-400">{idx + 1}</td>
                    <td className="py-3">
                      <Link
                        href={`/teams/${row.id}`}
                        className="font-bold text-white hover:text-cyan-400 transition-colors flex items-center gap-2.5"
                      >
                        <div className="w-6 h-6 rounded-lg bg-black/60 border border-line p-0.5 flex items-center justify-center shrink-0">
                          <TeamLogo
                            teamName={row.name}
                            logoUrl={teamObj?.logoUrl}
                            icon={teamObj?.icon}
                            className="w-full h-full object-contain"
                            isDemo={isEffectiveDemo}
                            primaryColor={teamObj?.primaryColor || teamObj?.color}
                          />
                        </div>
                        <span className={isMyTeam ? "text-emerald-300 font-black text-sm" : ""}>{row.name}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">({row.shortcode})</span>
                        {isMyTeam && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                            Your Team
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="py-3 text-center font-bold text-emerald-400">{row.w}</td>
                    <td className="py-3 text-center text-red-400">{row.l}</td>
                    <td className="py-3 text-center text-neutral-400 hidden sm:table-cell">{row.t}</td>
                    <td className="py-3 text-center text-neutral-400 font-mono">
                      {row.pf - row.pa > 0 ? `+${row.pf - row.pa}` : row.pf - row.pa}
                    </td>
                    <td className="py-3 text-right font-black text-emerald-300 text-sm">{row.pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Quick Athlete Switcher (ONLY rendered in Demo / Sandbox mode) */}
      {isEffectiveDemo && players.length > 0 && (
        <div className="p-4 rounded-2xl bg-black/40 border border-line-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-neutral-400">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>
              Active Athlete: Signed in as{" "}
              <strong className="text-white">#{pNumber} {pName}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-500">Switch Player:</span>
            <select
              value={activePlayer?.id || ""}
              onChange={(e) => {
                const chosen = players.find((p) => p.id === e.target.value);
                if (chosen) {
                  setDevRole("player", chosen.teamId, chosen.id);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-line text-white text-xs outline-none focus:border-emerald-500 cursor-pointer"
            >
              {players.map((p) => {
                const tm = teams.find((t) => t.id === p.teamId);
                return (
                  <option key={p.id} value={p.id} className="bg-neutral-900 text-white">
                    {p.playerName} (#{p.playerNumber || p.number || "00"}) — {tm?.name || "Free Agent"}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      )}
    </main>
  );
}

export default PlayerView;
