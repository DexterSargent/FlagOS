"use client";

import React from "react";
import Link from "next/link";
import { Users, Shield, ChevronRight } from "lucide-react";
import { TeamLogo, getTeamShortcode, isRealTeam } from "@/components/TeamAssets";
import { resolveTeamColorPalette, getReadableTextColor } from "@/lib/teamColors";

export interface LeagueTeamsGridProps {
  teams: any[];
  players: any[];
  standingsMap: Record<string, any>;
  isEffectiveDemo?: boolean;
  isEmbedded?: boolean;
  isAdminView?: boolean;
  title?: string;
  subtitle?: string;
}

export function LeagueTeamsGrid({
  teams,
  players,
  standingsMap,
  isEffectiveDemo,
  isEmbedded,
  isAdminView = false,
  title = isAdminView ? "Manage Teams" : "Team Directory",
  subtitle = isAdminView
    ? "Manage team rosters, branding, and settings."
    : "Teams and player rosters.",
}: LeagueTeamsGridProps) {
  const filteredTeams = teams.filter(isRealTeam);

  return (
    <section data-tour="league-teams-grid" className="bg-surface-raised border border-line rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-line-subtle">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
            {isAdminView ? (
              <Shield className="w-5 h-5 text-amber-400" />
            ) : (
              <Users className="w-5 h-5 text-cyan-400" />
            )}
            <span>{title}</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>
        </div>
        {!isEmbedded && (
          <Link href="/teams" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
            <span>{isAdminView ? "Team Directory" : "View All Teams"}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredTeams.map((team) => {
          const teamRosterCount = players.filter((p) => p.teamId === team.id).length;
          const standing = standingsMap[team.id] || { w: 0, l: 0, t: 0 };
          const tPalette = resolveTeamColorPalette(team);

          return (
            <div
              key={team.id}
              className={`p-5 bg-black/60 border border-line-subtle rounded-2xl transition-all flex flex-col justify-between ${
                isAdminView ? "hover:border-amber-500/40" : "hover:border-cyan-500/40"
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-black/60 border border-line p-2.5 flex items-center justify-center shadow-md shrink-0">
                    <TeamLogo
                      teamName={team.name}
                      logoUrl={team.logoUrl}
                      icon={team.icon}
                      className="w-full h-full object-contain"
                      isDemo={isEffectiveDemo}
                      primaryColor={team.primaryColor || team.color}
                    />
                  </div>
                  <span
                    className="font-mono text-xs font-black px-2 py-0.5 rounded border shadow-sm"
                    style={{
                      backgroundColor: tPalette.secondary,
                      color: getReadableTextColor(tPalette.secondary, tPalette.primary),
                      borderColor: `${tPalette.primary}40`,
                    }}
                  >
                    {team.shortcode || getTeamShortcode(team)}
                  </span>
                </div>

                <h4 className="text-lg font-black text-white truncate">{team.name}</h4>
                <p className="text-xs text-neutral-400 mt-0.5">{teamRosterCount} Players</p>
                <div className="mt-2 text-xs font-mono text-neutral-300">
                  Record: <span className="font-bold text-white">{standing.w}-{standing.l}-{standing.t}</span>
                </div>
              </div>

              {!isEmbedded && (
                <div className="pt-4 mt-4 border-t border-line-subtle grid grid-cols-2 gap-2 text-xs">
                  <Link
                    href={`/teams/${team.id}/roster`}
                    className="min-h-10 flex items-center justify-center py-1.5 px-2.5 bg-surface-muted hover:bg-white/10 text-neutral-300 hover:text-white rounded-lg text-center font-semibold border border-line transition-colors"
                  >
                    Roster
                  </Link>
                  <Link
                    href={isAdminView ? `/teams/${team.id}?edit=1` : `/teams/${team.id}`}
                    className={`min-h-10 flex items-center justify-center py-1.5 px-2.5 rounded-lg text-center font-semibold transition-colors ${
                      isAdminView
                        ? "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white border border-cyan-500/20"
                        : "bg-surface-muted hover:bg-white/10 text-cyan-400 hover:text-cyan-300 border border-line"
                    }`}
                  >
                    {isAdminView ? "Edit Team" : "Team Page"}
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default LeagueTeamsGrid;
