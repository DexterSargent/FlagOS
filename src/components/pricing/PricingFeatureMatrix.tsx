"use client";

import React, { memo, useState } from "react";
import { CheckCircle2, Minus } from "lucide-react";

export interface MatrixRow {
  category: "team" | "playbook" | "stats" | "league" | "spectator";
  feature: string;
  detail: string;
  team: boolean | string;
  league: boolean | string;
}

export const MATRIX_ROWS: MatrixRow[] = [
    // --- 1. TEAM & ROSTER HUB (team) ---
    {
      category: "team",
      feature: "Private Team Hub",
      detail: "Your private team home for roster management, player contact info, depth charts, and playbooks",
      team: "1 Dedicated Team",
      league: "Included for Every Team",
    },
    {
      category: "team",
      feature: "Free Fan & Spectator Pages",
      detail: "Parents and fans follow your schedule, scores, and player stats on any phone with zero login required",
      team: true,
      league: true,
    },
    {
      category: "team",
      feature: "Roster & Depth Charts",
      detail: "Set offensive and defensive starters, backups, jersey numbers, and custom positions",
      team: true,
      league: true,
    },
    {
      category: "team",
      feature: "Independent Team Freedom",
      detail: "Run travel teams, tournament squads, or scrimmages on your own without needing a parent league",
      team: true,
      league: true,
    },
    {
      category: "team",
      feature: "Take Your Team Anywhere",
      detail: "Keep your playbooks, rosters, and player stats intact when entering tournaments or joining a FlagOS league",
      team: true,
      league: true,
    },
    {
      category: "team",
      feature: "Coach & Staff Permissions",
      detail: "Give assistant coaches access while keeping playbooks and team contact lists private from outside eyes",
      team: true,
      league: true,
    },

    // --- 2. PLAYBOOK DESIGNER (playbook) ---
    {
      category: "playbook",
      feature: "Custom Playbooks",
      detail: "Build complete offensive and defensive pass and run schemes designed specifically for flag football",
      team: "Up to 5 Playbooks",
      league: "Up to 5 per Team (All Teams)",
    },
    {
      category: "playbook",
      feature: "Visual Route Designer",
      detail: "Interactive field board with standard presets: Slant, Out, Post, Go, Dig, Wheel, Drag, Corner, Hitch, Comeback",
      team: true,
      league: true,
    },
    {
      category: "playbook",
      feature: "Save Custom Routes",
      detail: "Draw unique team route concepts and save up to 20 custom routes to reuse across any play",
      team: "Up to 20 Custom Routes",
      league: "Up to 20 per Team",
    },
    {
      category: "playbook",
      feature: "Coach Notes & Progression Reads",
      detail: "Add quarterback reads, receiver assignments, and coaching keys directly to each play",
      team: true,
      league: true,
    },
    {
      category: "playbook",
      feature: "Defensive Schemes & Coverages",
      detail: "Set up Cover 2, Cover 3, blitz packages, designated rusher alignments, and man-to-man coverage",
      team: true,
      league: true,
    },
    {
      category: "playbook",
      feature: "Printable Wristbands & Call Sheets",
      detail: "One-click PDF export for 1, 2, 4, or 8-play wristband inserts and formatted sideline call sheets",
      team: true,
      league: true,
    },

    // --- 3. SIDELINE STATS & CLOCKS (stats) ---
    {
      category: "stats",
      feature: "Clockless Sideline Stat Tracking",
      detail: "Tap-and-go stat logger built for a single coach on the sideline during scrimmages or post-game",
      team: true,
      league: true,
    },
    {
      category: "stats",
      feature: "Live Clocks & Gameday Management",
      detail: "Official regulation game clock, 25-second play clock, stoppage tracking, and timeout controls",
      team: false,
      league: true,
    },
    {
      category: "stats",
      feature: "Down & Distance Tracker",
      detail: "Live line of scrimmage, first down line, down counter, and possession indicators updated in real time",
      team: true,
      league: true,
    },
    {
      category: "stats",
      feature: "Live Play-by-Play & Box Scores",
      detail: "Real-time game feed and box scores updated down-by-down for parents and fans watching from anywhere",
      team: true,
      league: true,
    },
    {
      category: "stats",
      feature: "Season Player & Team Stats",
      detail: "Track completions, passing/rushing/receiving yards, touchdowns, sacks, flag pulls, and extra points",
      team: true,
      league: true,
    },
    {
      category: "stats",
      feature: "Multi-Season Player Career Stats",
      detail: "Player game logs and stats follow athletes across all FlagOS seasons, teams, and leagues",
      team: true,
      league: true,
    },
    {
      category: "stats",
      feature: "League Stat Leaderboards",
      detail: "Automatic rankings for top passers, receivers, rushers, flag pullers, defensive stoppers, and scorers",
      team: false,
      league: true,
    },

    // --- 4. LEAGUE OPERATIONS (league) ---
    {
      category: "league",
      feature: "Free Team Portals for Every Coach",
      detail: "Every team in your league gets their own private portal, stats hub, and 5 playbooks at no extra cost to them",
      team: "1 Independent Portal",
      league: "Included for All Teams",
    },
    {
      category: "league",
      feature: "Automated Season Scheduler",
      detail: "Generate a complete regular season schedule with balanced home/away games and field times in seconds",
      team: false,
      league: true,
    },
    {
      category: "league",
      feature: "No Back-to-Back Games",
      detail: "Scheduler automatically prevents teams from playing back-to-back games and avoids field double-booking",
      team: false,
      league: true,
    },
    {
      category: "league",
      feature: "Drag-and-Drop Rescheduling",
      detail: "Easily adjust kickoff times, swap fields, or move games to different dates with a quick drag",
      team: false,
      league: true,
    },
    {
      category: "league",
      feature: "Standings & Tiebreakers",
      detail: "Real-time league standings with automatic head-to-head tiebreakers and point differential calculations",
      team: false,
      league: true,
    },
    {
      category: "league",
      feature: "Playoff Bracket Generator",
      detail: "Automatically generate seeded single or double elimination playoff brackets based on regular season finish",
      team: false,
      league: true,
    },
    {
      category: "league",
      feature: "Multiple Divisions",
      detail: "Run youth, adult, recreational, competitive, and co-ed divisions all within the same league",
      team: false,
      league: true,
    },
    {
      category: "league",
      feature: "Custom League Branding",
      detail: "Feature your league logo, custom colors, division names, league rules, and personalized web link",
      team: "Team Colors Only",
      league: true,
    },
    {
      category: "league",
      feature: "Public Directory or Private Link",
      detail: "List your league publicly for new players to find you, or keep it unlisted with a direct invite link",
      team: "Public or Unlisted",
      league: true,
    },
    {
      category: "league",
      feature: "Player Registration & Free Agent Pool",
      detail: "Online signup form for players, plus an unassigned free agent board to quickly build and fill team rosters",
      team: false,
      league: true,
    },
    {
      category: "league",
      feature: "Run Multiple Leagues or Tournaments",
      detail: "Manage multiple leagues, weekend tournaments, or seasonal divisions all under one commissioner account",
      team: false,
      league: true,
    },
  ];

export const PricingFeatureMatrix = memo(function PricingFeatureMatrix() {
  const [activeMatrixTab, setActiveMatrixTab] = useState<"all" | "team" | "playbook" | "stats" | "league" | "spectator">("all");

  const filteredMatrixRows =
    activeMatrixTab === "all"
      ? MATRIX_ROWS
      : MATRIX_ROWS.filter((r) => r.category === activeMatrixTab);

  return (
        <section data-tour="pricing-features" className="space-y-8 pt-8 border-t border-neutral-200 dark:border-white/10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-800 dark:text-emerald-400">
                Side-by-Side Breakdown
              </span>
              <h2 className="text-2xl md:text-4xl font-black uppercase text-neutral-950 dark:text-white tracking-tight mt-1">
                Compare Team &amp; League Plans
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 text-xs md:text-sm mt-1">
                Everything you need to know about what is included for individual teams versus full league setups.
              </p>
            </div>

            {/* Matrix Category Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-200/80 dark:bg-neutral-900 border border-neutral-300 dark:border-white/10 text-xs font-bold max-w-full overflow-x-auto hide-scrollbar shrink-0">
              <button
                onClick={() => setActiveMatrixTab("all")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeMatrixTab === "all" ? "bg-white dark:bg-white/15 text-neutral-950 dark:text-white shadow-sm" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
                }`}
              >
                All Features ({MATRIX_ROWS.length})
              </button>
              <button
                onClick={() => setActiveMatrixTab("team")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeMatrixTab === "team" ? "bg-emerald-600 text-white font-black shadow-sm" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
                }`}
              >
                Team &amp; Roster Hub
              </button>
              <button
                onClick={() => setActiveMatrixTab("playbook")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeMatrixTab === "playbook" ? "bg-emerald-600 text-white font-black shadow-sm" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
                }`}
              >
                Playbook Designer
              </button>
              <button
                onClick={() => setActiveMatrixTab("stats")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeMatrixTab === "stats" ? "bg-emerald-600 text-white font-black shadow-sm" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
                }`}
              >
                Sideline Stats &amp; Clocks
              </button>
              <button
                onClick={() => setActiveMatrixTab("league")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeMatrixTab === "league" ? "bg-blue-600 text-white font-black shadow-sm" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
                }`}
              >
                League Operations
              </button>
            </div>
          </div>

          {/* Desktop Matrix Table */}
          <div className="hidden md:block bg-white dark:bg-[#0B0F19] border border-neutral-200/80 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-black/60 border-b border-neutral-200/80 dark:border-white/10 text-neutral-600 dark:text-neutral-400 font-mono uppercase">
                    <th className="py-4 px-6 w-1/2">Capability</th>
                    <th className="py-4 px-6 text-center w-1/4">
                      <div className="font-black text-neutral-950 dark:text-white text-sm">Team Subscription</div>
                      <div className="text-[10px] text-emerald-800 dark:text-emerald-400 font-semibold lowercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md inline-block mt-1 font-mono">
                        $40 / month flat
                      </div>
                    </th>
                    <th className="py-4 px-6 text-center w-1/4">
                      <div className="font-black text-neutral-950 dark:text-white text-sm">League Subscription</div>
                      <div className="text-[10px] text-blue-800 dark:text-[#60a5fa] font-semibold lowercase bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md inline-block mt-1 font-mono">
                        $40 base + $20/team/mo
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                  {filteredMatrixRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-neutral-950 dark:text-white text-sm">{row.feature}</div>
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">{row.detail}</div>
                      </td>
                      <td className="py-3.5 px-6 text-center font-mono">
                        {typeof row.team === "boolean" ? (
                          row.team ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mx-auto" />
                          ) : (
                            <Minus className="w-4 h-4 text-neutral-300 dark:text-neutral-600 mx-auto" />
                          )
                        ) : (
                          <span className="font-bold text-emerald-800 dark:text-emerald-300 text-xs">{row.team}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-center font-mono">
                        {typeof row.league === "boolean" ? (
                          row.league ? (
                            <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-[#60a5fa] mx-auto" />
                          ) : (
                            <Minus className="w-4 h-4 text-neutral-300 dark:text-neutral-600 mx-auto" />
                          )
                        ) : (
                          <span className="font-bold text-blue-800 dark:text-[#93c5fd] text-xs">{row.league}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Feature Cards (Prevents horizontal overflow and clipping on small screens) */}
          <div className="md:hidden space-y-3">
            <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-900/60 border border-neutral-200 dark:border-white/10 flex items-center justify-between text-xs font-mono font-bold">
              <span className="text-emerald-800 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">Team: $40/mo</span>
              <span className="text-blue-800 dark:text-[#60a5fa] bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg">League: $40 + $20/team</span>
            </div>

            {filteredMatrixRows.map((row, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white dark:bg-[#0B0F19] border border-neutral-200/80 dark:border-white/10 shadow-sm space-y-3"
              >
                <div>
                  <div className="font-bold text-neutral-950 dark:text-white text-sm">{row.feature}</div>
                  <div className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">{row.detail}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100 dark:border-white/5">
                  {/* Team Status */}
                  <div className="p-2 rounded-xl bg-neutral-50 dark:bg-black/40 border border-neutral-200/60 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-neutral-500">Team</span>
                    <div>
                      {typeof row.team === "boolean" ? (
                        row.team ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Minus className="w-4 h-4 text-neutral-300 dark:text-neutral-600" />
                        )
                      ) : (
                        <span className="font-bold text-emerald-800 dark:text-emerald-300 text-[10px]">{row.team}</span>
                      )}
                    </div>
                  </div>

                  {/* League Status */}
                  <div className="p-2 rounded-xl bg-neutral-50 dark:bg-black/40 border border-neutral-200/60 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-neutral-500">League</span>
                    <div>
                      {typeof row.league === "boolean" ? (
                        row.league ? (
                          <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-[#60a5fa]" />
                        ) : (
                          <Minus className="w-4 h-4 text-neutral-300 dark:text-neutral-600" />
                        )
                      ) : (
                        <span className="font-bold text-blue-800 dark:text-[#93c5fd] text-[10px]">{row.league}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>


  );
});

export default PricingFeatureMatrix;
