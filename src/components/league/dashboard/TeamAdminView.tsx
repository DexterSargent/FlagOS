"use client";

import React from "react";
import Link from "next/link";
import {
  Shield,
  UserPlus,
  Users,
  BookOpen,
  Flame,
  MapPin,
  Shirt,
  Plus,
  ChevronRight,
  ArrowRight,
  Activity,
  Trophy,
} from "lucide-react";
import { TeamLogo, getTeamShortcode } from "@/components/TeamAssets";
import { LeagueScheduleWidget } from "./LeagueScheduleWidget";

export interface TeamAdminViewProps {
  managedTeam: any;
  managedTeamStanding: any;
  managedTeamStandingRank: number;
  managedTeamPlayers: any[];
  managedTeamUpcoming: any;
  nextOpponentName: string;
  nextOpponentTeam: any;
  teamTopPasser: any;
  teamTopReceiver: any;
  teamTopScorer: any;
  teamTopDefender: any;
  playerStats: Record<string, any>;
  liveAndUpcomingGames: any[];
  liveMatches: any[];
  teams: any[];
  standingsMap: Record<string, any>;
  sortedStandings: any[];
  isEffectiveDemo: boolean;
  onOpenAddPlayer: () => void;
}

export function TeamAdminView({
  managedTeam,
  managedTeamStanding,
  managedTeamStandingRank,
  managedTeamPlayers,
  managedTeamUpcoming,
  nextOpponentName,
  nextOpponentTeam,
  teamTopPasser,
  teamTopReceiver,
  teamTopScorer,
  teamTopDefender,
  playerStats,
  liveAndUpcomingGames,
  liveMatches,
  teams,
  standingsMap,
  sortedStandings,
  isEffectiveDemo,
  onOpenAddPlayer,
}: TeamAdminViewProps) {
  return (
    <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full max-w-full overflow-hidden space-y-8">
      {/* Team Clubhouse Hero Banner */}
      <div className="bg-gradient-to-br from-[#0B132B]/95 via-[#0B0F19] to-[#07090E] border-2 border-cyan-500/40 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-line">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-black/80 border-2 border-cyan-500/50 p-3 flex items-center justify-center shrink-0 shadow-[0_0_35px_rgba(var(--league-primary-rgb),0.3)]">
              <TeamLogo
                teamName={managedTeam?.name || "Team"}
                logoUrl={managedTeam?.logoUrl}
                icon={managedTeam?.icon}
                className="w-full h-full object-contain"
                isDemo={isEffectiveDemo}
                primaryColor={managedTeam?.primaryColor || managedTeam?.color}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-bold text-cyan-300 uppercase tracking-widest">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  Team Dashboard
                </span>
                <span className="text-neutral-500 text-xs">•</span>
                <span className="text-[11px] font-mono text-cyan-300 uppercase font-bold">
                  {managedTeam?.shortcode || (managedTeam ? getTeamShortcode(managedTeam) : "TEAM")}
                </span>
                <span className="text-neutral-500 text-xs">•</span>
                <span className="text-[11px] font-mono text-amber-400 font-bold">
                  Rank #{managedTeamStandingRank > 0 ? managedTeamStandingRank : "-"}
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white">
                {managedTeam?.name || "My Team"}
              </h1>
              <p className="text-neutral-400 text-xs md:text-sm mt-1 max-w-xl">
                Manage your team roster, review upcoming games, scout upcoming opponents, and view your team's statistical leaders.
              </p>
            </div>
          </div>

          {/* Team Admin Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenAddPlayer}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)] flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Player</span>
            </button>

            {managedTeam && (
              <>
                <Link
                  href={`/teams/${managedTeam.id}/roster`}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider rounded-xl border border-white/15 transition-all flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Full Roster</span>
                </Link>

                <Link
                  href={`/teams/${managedTeam.id}/playbook`}
                  className="px-4 py-2.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider rounded-xl border border-cyan-500/30 transition-all flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <span>Playbook</span>
                </Link>

                <Link
                  href={`/teams/${managedTeam.id}`}
                  className="px-4 py-2.5 bg-surface-muted hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl border border-line transition-colors flex items-center gap-2"
                >
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Edit Team Info</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Team Performance Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
          <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
            <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">Season Record</span>
            <div className="text-3xl font-black text-white mt-1 tabular-nums">
              {managedTeamStanding ? `${managedTeamStanding.w}-${managedTeamStanding.l}-${managedTeamStanding.t}` : "0-0-0"}
            </div>
            <span className="text-[11px] text-emerald-400 mt-1 block">
              {managedTeamStanding ? `${managedTeamStanding.pts} Standings Pts` : "0 Points"}
            </span>
          </div>

          <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
            <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">Active Roster</span>
            <div className="text-3xl font-black text-white mt-1 tabular-nums">{managedTeamPlayers.length}</div>
            <span className="text-[11px] text-cyan-400 mt-1 block">Athletes Signed</span>
          </div>

          <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
            <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">Point Differential</span>
            <div className="text-3xl font-black text-white mt-1 tabular-nums">
              {managedTeamStanding
                ? managedTeamStanding.pf - managedTeamStanding.pa > 0
                  ? `+${managedTeamStanding.pf - managedTeamStanding.pa}`
                  : `${managedTeamStanding.pf - managedTeamStanding.pa}`
                : "0"}
            </div>
            <span className="text-[11px] text-neutral-400 mt-1 block">
              {managedTeamStanding ? `${managedTeamStanding.pf} PF / ${managedTeamStanding.pa} PA` : "0 Scored"}
            </span>
          </div>

          <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
            <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">Next Opponent</span>
            <div className="text-base font-black text-white mt-1 truncate">
              {nextOpponentName}
            </div>
            <span className="text-[11px] text-amber-400 mt-1 block truncate">
              {managedTeamUpcoming ? `${managedTeamUpcoming.date} • ${managedTeamUpcoming.time || "Scheduled"}` : "Standby"}
            </span>
          </div>
        </div>
      </div>

      {/* NEXT MATCHUP SPOTLIGHT (Head-to-Head Banner) */}
      {managedTeamUpcoming ? (
        <div className="bg-gradient-to-r from-cyan-950/40 via-[#0B0F19] to-blue-950/40 border border-cyan-500/30 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-black uppercase tracking-wider text-white">Next Matchup Spotlight</span>
            </div>
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/30">
              {managedTeamUpcoming.week || "Gameday"}
            </span>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Your Team */}
            <div className="flex items-center gap-4 flex-1">
              <div className="w-16 h-16 rounded-2xl bg-black/60 border border-cyan-500/40 p-2.5 flex items-center justify-center shrink-0">
                <TeamLogo
                  teamName={managedTeam?.name || "Your Team"}
                  logoUrl={managedTeam?.logoUrl}
                  icon={managedTeam?.icon}
                  className="w-full h-full object-contain"
                  isDemo={isEffectiveDemo}
                  primaryColor={managedTeam?.primaryColor || managedTeam?.color}
                />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">YOUR TEAM</span>
                <h3 className="text-xl font-black text-white">{managedTeam?.name}</h3>
                <p className="text-xs text-neutral-400 font-mono">
                  {managedTeamStanding ? `${managedTeamStanding.w}-${managedTeamStanding.l}-${managedTeamStanding.t}` : "0-0-0"}
                </p>
              </div>
            </div>

            {/* VS Badge & Match Time */}
            <div className="flex flex-col items-center justify-center px-6 py-2 bg-black/70 rounded-2xl border border-line shrink-0 text-center">
              <span className="text-2xl font-black text-amber-400 tracking-wider">VS</span>
              <div className="text-xs font-bold text-white mt-1">{managedTeamUpcoming.date}</div>
              <div className="text-[11px] font-mono text-cyan-400">{managedTeamUpcoming.time || "TBD"}</div>
              <div className="text-[10px] text-neutral-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{managedTeamUpcoming.location || "Field 1"}</span>
              </div>
            </div>

            {/* Opponent Team */}
            <div className="flex items-center gap-4 flex-1 justify-end text-right">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">NEXT OPPONENT</span>
                <h3 className="text-xl font-black text-white">{nextOpponentName}</h3>
                <p className="text-xs text-neutral-400 font-mono">
                  {nextOpponentTeam && standingsMap[nextOpponentTeam.id]
                    ? `${standingsMap[nextOpponentTeam.id].w}-${standingsMap[nextOpponentTeam.id].l}-${standingsMap[nextOpponentTeam.id].t}`
                    : "Opposing Team"}
                </p>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-black/60 border border-line p-2.5 flex items-center justify-center shrink-0">
                <TeamLogo
                  teamName={nextOpponentName}
                  logoUrl={nextOpponentTeam?.logoUrl}
                  icon={nextOpponentTeam?.icon}
                  className="w-full h-full object-contain"
                  isDemo={isEffectiveDemo}
                  primaryColor={nextOpponentTeam?.primaryColor || nextOpponentTeam?.color}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-line flex items-center justify-end">
            <Link
              href={`/matches/${managedTeamUpcoming.id}`}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/15 transition-all flex items-center gap-2"
            >
              <span>View Matchup Center & Game Preview →</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-surface-raised border border-line rounded-3xl p-6 text-center text-neutral-400 text-xs italic">
          No upcoming matches scheduled for your team.
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

      {/* 2-COLUMN SECTION: MY TEAM ROSTER & MY TEAM STAT LEADERS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Column 1 & 2: Active Roster Quick Management */}
        <div className="lg:col-span-2 bg-surface-raised border border-line rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-line-subtle">
              <div className="flex items-center gap-2">
                <Shirt className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-black uppercase tracking-wider text-white">
                  Active Roster ({managedTeamPlayers.length} Athletes)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenAddPlayer}
                  className="px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-bold rounded-xl border border-cyan-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Player</span>
                </button>
                {managedTeam && (
                  <Link
                    href={`/teams/${managedTeam.id}/roster`}
                    className="text-xs font-bold text-neutral-400 hover:text-white flex items-center gap-1"
                  >
                    <span>Full Roster</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>

            {managedTeamPlayers.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs italic bg-black/40 rounded-2xl border border-line-subtle">
                No players signed to your roster yet. Click "Add Player" to register your athletes.
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
                    {managedTeamPlayers.slice(0, 8).map((p) => (
                      <tr key={p.id} className="hover:bg-surface-muted transition-colors">
                        <td className="py-2.5 font-mono font-bold text-cyan-400">
                          #{p.playerNumber || "0"}
                        </td>
                        <td className="py-2.5 font-bold text-white">
                          {p.playerName}
                          {p.isQB && (
                            <span className="ml-2 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              QB
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-neutral-300 font-mono text-[11px]">
                          {Array.isArray(p.positions) && p.positions.length > 0
                            ? p.positions.join(", ")
                            : p.isQB
                              ? "QB"
                              : "ATH"}
                        </td>
                        <td className="py-2.5 text-right text-[10px] text-emerald-400 font-mono">Active</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {managedTeam && (
            <div className="pt-4 mt-4 border-t border-line-subtle">
              <Link
                href={`/teams/${managedTeam.id}/roster`}
                className="w-full py-2.5 px-4 bg-surface-muted hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold rounded-xl border border-line transition-colors flex items-center justify-center gap-2"
              >
                <span>Manage Full Team Roster & Edit Numbers</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Column 3: Team Stat Leaders */}
        <div className="bg-surface-raised border border-line rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-line-subtle">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-black uppercase tracking-wider text-white">Team Leaders</h3>
              </div>
              {managedTeam && (
                <Link
                  href={`/teams/${managedTeam.id}/stats`}
                  className="text-xs font-bold text-cyan-400 hover:underline"
                >
                  Team Stats →
                </Link>
              )}
            </div>

            <div className="space-y-3">
              <div className="bg-black/50 border border-line-subtle p-3.5 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                  Team Passing Leader
                </span>
                <div className="text-base font-black text-white mt-1 truncate">
                  {teamTopPasser.name !== "-" ? teamTopPasser.name : "No stats yet"}
                </div>
                <div className="text-xs text-cyan-400 font-bold mt-1">{teamTopPasser.passTD} Passing TDs</div>
              </div>

              <div className="bg-black/50 border border-line-subtle p-3.5 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                  Team Receiving Leader
                </span>
                <div className="text-base font-black text-white mt-1 truncate">
                  {teamTopReceiver.name !== "-" ? teamTopReceiver.name : "No stats yet"}
                </div>
                <div className="text-xs text-blue-400 font-bold mt-1">{teamTopReceiver.recTD} Receiving TDs</div>
              </div>

              <div className="bg-black/50 border border-line-subtle p-3.5 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                  Team Touchdown Leader
                </span>
                <div className="text-base font-black text-white mt-1 truncate">
                  {teamTopScorer.name !== "-" ? teamTopScorer.name : "No stats yet"}
                </div>
                <div className="text-xs text-yellow-400 font-bold mt-1">{teamTopScorer.totalTD} Total TDs</div>
              </div>

              <div className="bg-black/50 border border-line-subtle p-3.5 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                  Top Flagger (Defense)
                </span>
                <div className="text-base font-black text-white mt-1 truncate">
                  {teamTopDefender.name !== "-" ? teamTopDefender.name : "No stats yet"}
                </div>
                <div className="text-xs text-emerald-400 font-bold mt-1">{teamTopDefender.flagPulls} Flags</div>
              </div>
            </div>
          </div>

          {managedTeam && (
            <div className="pt-4 mt-4 border-t border-line-subtle">
              <Link
                href={`/teams/${managedTeam.id}/stats`}
                className="w-full py-2.5 px-4 bg-surface-muted hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold rounded-xl border border-line transition-colors flex items-center justify-center gap-2"
              >
                <span>View All Team Individual Stats</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Section: Standings with Highlighted Team Row */}
      <section className="bg-surface-raised border border-line rounded-3xl p-6 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-line-subtle">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-base font-black uppercase tracking-wider text-white">
              League Standings (Your Position)
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
                const isMyTeam = row.id === managedTeam?.id;
                const teamObj = teams.find((t) => t.id === row.id);

                return (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      isMyTeam ? "bg-cyan-500/15 border-l-4 border-l-cyan-400" : "hover:bg-surface-muted"
                    }`}
                  >
                    <td className={`py-3 font-mono font-bold ${isMyTeam ? "text-cyan-300 font-black pl-2" : "text-neutral-400"}`}>
                      {idx + 1}
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/teams/${row.id}`}
                        className={`font-bold transition-colors flex items-center gap-2.5 ${
                          isMyTeam ? "text-cyan-200" : "text-white hover:text-cyan-400"
                        }`}
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
                        <span className="truncate">{row.name}</span>
                        {isMyTeam && (
                          <span className="px-1.5 py-0.2 rounded bg-cyan-500/30 text-cyan-300 text-[9px] font-black uppercase font-mono">
                            YOU
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
                    <td className="py-3 text-right font-black text-cyan-300 text-sm">{row.pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default TeamAdminView;
