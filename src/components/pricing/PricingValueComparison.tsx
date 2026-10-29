"use client";

import React, { memo } from "react";
import { Users, Building2, Check, X } from "lucide-react";

export const PricingValueComparison = memo(function PricingValueComparison() {
  return (
    <section data-tour="pricing-savings" className="space-y-8 pt-8 border-t border-neutral-200 dark:border-white/10">
        <section data-tour="pricing-savings" className="space-y-8 pt-8 border-t border-neutral-200 dark:border-white/10">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-800 dark:text-emerald-400">
              Everything in One Plan
            </span>
            <h2 className="text-2xl md:text-4xl font-black uppercase text-neutral-950 dark:text-white tracking-tight">
              Compare the Cost of Separate Tools
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 text-xs md:text-sm">
              Compare the estimated cost of separate tools with a FlagOS plan. Schedules, playbooks, rosters, and stats are included in one subscription.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* PANEL 1: SINGLE TEAM COST BREAKDOWN (PER MONTH) */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-neutral-900/90 border border-emerald-500/30 space-y-6 shadow-xl flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block font-bold">Independent Clubs</span>
                      <h3 className="text-lg font-black text-neutral-950 dark:text-white uppercase">Single Team Breakdown</h3>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold border border-emerald-500/20 whitespace-nowrap shrink-0">
                    Software Worth: $100 / mo
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Fragmented Standalone Tools (Team) */}
                  <div className="p-4 rounded-2xl bg-red-500/[0.04] dark:bg-red-950/20 border border-red-500/20 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-xs uppercase tracking-wider">
                        <X className="w-4 h-4 shrink-0" />
                        <span>Fragmented Tools</span>
                      </div>
                      <div className="space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                        <div className="flex justify-between">
                          <span>Playbook Builder &amp; Routes:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$20/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Roster Hub &amp; Depth Charts:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$10/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sideline Stat Logger &amp; Scores:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$40/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Live Parent &amp; Fan Passes:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$10/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Call Sheets &amp; Wristband Inserts:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$10/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Career Stats &amp; Season Logs:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$10/mo</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-neutral-200 dark:border-white/10 flex justify-between items-baseline">
                      <span className="text-[11px] text-neutral-500">Standalone Value:</span>
                      <span className="text-sm font-black text-red-700 dark:text-red-400 font-mono">$100 / mo</span>
                    </div>
                  </div>

                  {/* FlagOS Team Plan */}
                  <div className="p-4 rounded-2xl bg-emerald-500/[0.06] dark:bg-emerald-950/30 border border-emerald-500/30 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>FlagOS Team Plan</span>
                      </div>
                      <div className="space-y-1.5 text-[11px] text-neutral-700 dark:text-neutral-300">
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>5 Playbooks &amp; Route Designer</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Full Roster Hub &amp; Depth Charts</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Sideline Stat Logger &amp; Box Scores</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Free spectator links for parents</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>One-click PDF call sheet export</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Multi-season player career stats</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-emerald-500/20 flex justify-between items-baseline">
                      <span className="text-[11px] text-slate-600 dark:text-neutral-400">FlagOS Flat Rate:</span>
                      <span className="text-sm font-black text-emerald-800 dark:text-emerald-400 font-mono">$40 / mo</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Callout */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between text-emerald-950 dark:text-emerald-300">
                <span className="font-semibold">Total Team Savings:</span>
                <span className="font-bold text-neutral-950 dark:text-white font-mono bg-emerald-500/20 px-2 py-0.5 rounded">
                  Save $60/mo ($720/yr) • $100 worth for $40/mo
                </span>
              </div>
            </div>

            {/* PANEL 2: LEAGUE COST BREAKDOWN (10-TEAM LEAGUE) */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-neutral-900/90 border border-[#3b82f6]/30 space-y-6 shadow-xl flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center text-blue-700 dark:text-[#60a5fa]">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-blue-800 dark:text-[#60a5fa] uppercase tracking-wider block font-bold">10-Team League Setup</span>
                      <h3 className="text-lg font-black text-neutral-950 dark:text-white uppercase">10-Team League Savings</h3>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#3b82f6]/10 text-blue-800 dark:text-[#93c5fd] text-xs font-mono font-bold border border-[#3b82f6]/20 whitespace-nowrap shrink-0">
                    Software Worth: $650 / mo
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Fragmented Stack (League) */}
                  <div className="p-4 rounded-2xl bg-red-500/[0.04] dark:bg-red-950/20 border border-red-500/20 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-xs uppercase tracking-wider">
                        <X className="w-4 h-4 shrink-0" />
                        <span>Fragmented Tools</span>
                      </div>
                      <div className="space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                        <div className="flex justify-between">
                          <span>10 Team Portals:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$400/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span>League Hub &amp; Registration:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$90/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Live Stats &amp; Play-by-Play:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$70/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Automated Scheduler:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$35/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Standings &amp; Brackets:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$25/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span>League Leaderboards:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$30/mo</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-neutral-200 dark:border-white/10 flex justify-between items-baseline">
                      <span className="text-[11px] text-neutral-500">Combined Value:</span>
                      <span className="text-sm font-black text-red-700 dark:text-red-400 font-mono">$650 / mo</span>
                    </div>
                  </div>

                  {/* FlagOS League Plan */}
                  <div className="p-4 rounded-2xl bg-[#3b82f6]/[0.06] dark:bg-[#1e3a8a]/20 border border-[#3b82f6]/30 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-blue-800 dark:text-[#60a5fa] font-bold text-xs uppercase tracking-wider">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>FlagOS League Plan</span>
                      </div>
                      <div className="space-y-1.5 text-[11px] text-neutral-700 dark:text-neutral-300">
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-blue-600 dark:text-[#60a5fa] shrink-0" />
                          <span>10 Private Team Portals with Playbooks</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-blue-600 dark:text-[#60a5fa] shrink-0" />
                          <span>Public League Hub ($0 per-player fees)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-blue-600 dark:text-[#60a5fa] shrink-0" />
                          <span>Live updating play-by-play &amp; box scores</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-blue-600 dark:text-[#60a5fa] shrink-0" />
                          <span>Automated scheduler &amp; conflict solver</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-blue-600 dark:text-[#60a5fa] shrink-0" />
                          <span>Multi-way tiebreakers &amp; seeded brackets</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-blue-600 dark:text-[#60a5fa] shrink-0" />
                          <span>League leaderboards &amp; career stats</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#3b82f6]/20 flex justify-between items-baseline">
                      <span className="text-[11px] text-slate-600 dark:text-neutral-400">FlagOS All-In Rate:</span>
                      <span className="text-sm font-black text-blue-800 dark:text-[#60a5fa] font-mono">$240 / mo</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Callout */}
              <div className="p-3 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-xs flex items-center justify-between text-blue-950 dark:text-[#93c5fd]">
                <span className="font-semibold">Total League Savings:</span>
                <span className="font-bold text-neutral-950 dark:text-white font-mono bg-[#3b82f6]/20 px-2 py-0.5 rounded">
                  Save $410/mo ($4,920/yr) • $650 worth for $240/mo all-in
                </span>
              </div>
            </div>
          </div>
        </section>

    </section>
  );
});

export default PricingValueComparison;
