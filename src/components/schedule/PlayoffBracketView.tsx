"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Trophy,
  ChevronRight,
  Shield,
  Sparkles,
  AlertCircle,
  ArrowUpRight,
  Flame,
  Clock,
  MapPin,
  CheckCircle2,
  Crown,
  Layers,
  RotateCcw,
  Swords,
  Info,
  XCircle,
} from "lucide-react";
import { PlayoffFormat } from "@/lib/leagueContext";
import { TeamStanding, BracketRound, BracketMatchNode } from "@/lib/standingsEngine";

interface PlayoffBracketViewProps {
  standings: TeamStanding[];
  bracketRounds: BracketRound[];
  format: PlayoffFormat;
  isPlayoffActive: boolean;
  canManageSchedule?: boolean;
  onOpenScheduleBuilder?: () => void;
  onOpenPlayoffFormatModal?: () => void;
}

export default function PlayoffBracketView({
  standings,
  bracketRounds,
  format,
  isPlayoffActive,
  canManageSchedule,
  onOpenScheduleBuilder,
  onOpenPlayoffFormatModal,
}: PlayoffBracketViewProps) {
  const [activeTab, setActiveTab] = useState<"bracket" | "standings">("bracket");
  const [doubleElimSection, setDoubleElimSection] = useState<"all" | "winners" | "losers" | "finals">("all");

  const playoffSpots = format?.teamsCount || 8;
  const isDoubleElim = format?.structure === "double_elimination";
  const bubbleThreshold = Math.min(playoffSpots + 4, standings.length);

  // Group double elimination rounds by bracket partition
  const winnersRounds = useMemo(
    () => bracketRounds.filter((r) => r.bracketType === "winners"),
    [bracketRounds]
  );
  const losersRounds = useMemo(
    () => bracketRounds.filter((r) => r.bracketType === "losers"),
    [bracketRounds]
  );
  const finalsRounds = useMemo(
    () => bracketRounds.filter((r) => r.bracketType === "finals"),
    [bracketRounds]
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / Mode Explanation */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-900/90 via-[#0B0F19]/90 to-neutral-950 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        {isDoubleElim && (
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        )}

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 border ${
                  isPlayoffActive
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    : isDoubleElim
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                    : "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                }`}
              >
                {isDoubleElim ? <Swords className="w-3.5 h-3.5" /> : <Trophy className="w-3.5 h-3.5" />}
                <span>
                  {isPlayoffActive
                    ? isDoubleElim
                      ? "Double Elimination Active"
                      : "Championship Tournament Active"
                    : "Live Projected Seeding Matrix"}
                </span>
              </span>
              <span className="text-neutral-500 text-xs">•</span>
              <span className="text-xs font-mono text-neutral-300 font-bold">
                Top {playoffSpots} Teams Advance
              </span>
              <span className="text-neutral-500 text-xs">•</span>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                  isDoubleElim
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                    : "bg-cyan-500/15 border-cyan-500/30 text-cyan-300"
                }`}
              >
                {isDoubleElim ? "Double Elimination (2 Lives)" : "Single Elimination (Sudden Death)"}
              </span>
            </div>

            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              <span>
                {isPlayoffActive
                  ? isDoubleElim
                    ? "Double Elimination Tournament"
                    : "Playoff Elimination Bracket"
                  : isDoubleElim
                  ? "Projected Double Elimination Bracket"
                  : "Official Playoff Picture"}
              </span>
            </h2>

            <p className="text-neutral-400 text-xs md:text-sm max-w-2xl leading-relaxed">
              {isDoubleElim
                ? "Featuring an Upper (Winners) Bracket and a Lower (Elimination) Bracket. Teams must lose two matches to be eliminated. The Upper Bracket Champion meets the Elimination Bracket Champion in the Grand Championship series."
                : isPlayoffActive
                ? "The regular season has concluded. Tournament seeds are locked and teams compete in knockout bracket play to crown the league champion."
                : "Live projected bracket seeded by active seasonal standings if the regular season ended today. Seeds and bubble rankings dynamically update after every completed game."}
            </p>
          </div>

          {/* Sub-view toggle & Quick Action */}
          <div className="flex items-center gap-2 self-stretch md:self-auto flex-wrap">
            <div className="flex items-center bg-black/60 p-1 rounded-2xl border border-white/10 shrink-0">
              <button
                onClick={() => setActiveTab("bracket")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "bracket"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Tournament Bracket
              </button>
              <button
                onClick={() => setActiveTab("standings")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "standings"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Seeding & Bubble
              </button>
            </div>

            {canManageSchedule && (onOpenPlayoffFormatModal || onOpenScheduleBuilder) && (
              <button
                onClick={onOpenPlayoffFormatModal || onOpenScheduleBuilder}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/30 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Change Playoff Format</span>
              </button>
            )}
          </div>
        </div>

        {/* Double Elimination Sub-partition Filter Pills */}
        {isDoubleElim && activeTab === "bracket" && (
          <div className="relative z-10 mt-6 pt-5 border-t border-white/10 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-bold shrink-0 mr-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-neutral-400" />
              View Section:
            </span>

            <button
              onClick={() => setDoubleElimSection("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                doubleElimSection === "all"
                  ? "bg-white text-black shadow-lg font-black"
                  : "bg-white/5 text-neutral-300 hover:bg-white/10 border border-white/10"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Brackets</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/10 font-black">
                {bracketRounds.length} Rounds
              </span>
            </button>

            <button
              onClick={() => setDoubleElimSection("winners")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                doubleElimSection === "winners"
                  ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)] font-black"
                  : "bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/20"
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Upper (Winners)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 font-bold">
                {winnersRounds.length} Rounds
              </span>
            </button>

            <button
              onClick={() => setDoubleElimSection("losers")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                doubleElimSection === "losers"
                  ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)] font-black"
                  : "bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Elimination (Losers)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 font-bold">
                {losersRounds.length} Rounds
              </span>
            </button>

            <button
              onClick={() => setDoubleElimSection("finals")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                doubleElimSection === "finals"
                  ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)] font-black"
                  : "bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20 border border-yellow-500/20"
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Grand Championship</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-200 font-bold">
                Finals
              </span>
            </button>
          </div>
        )}
      </div>

      {activeTab === "bracket" ? (
        /* Tournament Bracket View */
        <div className="space-y-10">
          {/* SINGLE ELIMINATION BRACKET VIEW */}
          {!isDoubleElim && (
            <div className="overflow-x-auto pb-8 pt-2">
              <div className="min-w-[840px] flex items-stretch gap-8 lg:gap-12 px-2">
                {bracketRounds.map((round, rIdx) => (
                  <div key={round.name} className="flex-1 flex flex-col">
                    {/* Round Header */}
                    <div className="mb-6 text-center border-b border-white/10 pb-3">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">
                        Round {rIdx + 1}
                      </span>
                      <h3 className="text-lg font-black text-white uppercase tracking-wide">{round.name}</h3>
                      <span className="text-[11px] text-neutral-500">
                        {round.matches.length} {round.matches.length === 1 ? "Championship Match" : "Matchups"}
                      </span>
                    </div>

                    {/* Matches Column with dynamic vertical spacing */}
                    <div className="flex-1 flex flex-col justify-around gap-6">
                      {round.matches.map((node) => (
                        <BracketMatchCard key={node.id} node={node} isPlayoffActive={isPlayoffActive} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DOUBLE ELIMINATION BRACKET VIEW */}
          {isDoubleElim && (
            <div className="space-y-12">
              {/* 1. UPPER (WINNERS) BRACKET SECTION */}
              {(doubleElimSection === "all" || doubleElimSection === "winners") && winnersRounds.length > 0 && (
                <div className="p-6 md:p-8 rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-cyan-950/20 via-neutral-900/60 to-black/60 backdrop-blur-md space-y-6">
                  {/* Upper Section Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-cyan-500/20 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                          <span>Upper Bracket (Winners)</span>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            Undefeated Path
                          </span>
                        </h3>
                        <p className="text-xs text-neutral-400">
                          Teams advance on victory. One loss drops a team to the Elimination Bracket. Winner advances directly to Grand Championship.
                        </p>
                      </div>
                    </div>

                    <div className="text-xs font-mono text-cyan-400/80 shrink-0">
                      {winnersRounds.length} Tournament Rounds • Byes to Top Seeds
                    </div>
                  </div>

                  {/* Horizontal Upper Bracket Grid */}
                  <div className="overflow-x-auto pb-4 pt-2">
                    <div className="min-w-[840px] flex items-stretch gap-8 lg:gap-12 px-2">
                      {winnersRounds.map((round, rIdx) => (
                        <div key={round.name} className="flex-1 flex flex-col">
                          <div className="mb-6 text-center border-b border-cyan-500/20 pb-3">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">
                              Upper Round {rIdx + 1}
                            </span>
                            <h4 className="text-base font-black text-white uppercase tracking-wide">
                              {round.name}
                            </h4>
                            <span className="text-[11px] text-neutral-500">
                              {round.matches.length} {round.matches.length === 1 ? "Finalist Decider" : "Matchups"}
                            </span>
                          </div>

                          <div className="flex-1 flex flex-col justify-around gap-6">
                            {round.matches.map((node) => (
                              <BracketMatchCard
                                key={node.id}
                                node={node}
                                isPlayoffActive={isPlayoffActive}
                                accentColor="cyan"
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. ELIMINATION (LOSERS) BRACKET SECTION */}
              {(doubleElimSection === "all" || doubleElimSection === "losers") && losersRounds.length > 0 && (
                <div className="p-6 md:p-8 rounded-3xl border border-amber-500/20 bg-gradient-to-b from-amber-950/20 via-neutral-900/60 to-black/60 backdrop-blur-md space-y-6">
                  {/* Lower Section Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-amber-500/20 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                        <Flame className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                          <span>Elimination Bracket (Losers)</span>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Sudden Death (1 Life Left)
                          </span>
                        </h3>
                        <p className="text-xs text-neutral-400">
                          Teams fighting for survival. One loss here eliminates a team permanently. The survivor advances to the Grand Championship.
                        </p>
                      </div>
                    </div>

                    <div className="text-xs font-mono text-amber-400/80 shrink-0">
                      {losersRounds.length} Survival Rounds
                    </div>
                  </div>

                  {/* Horizontal Lower Bracket Grid */}
                  <div className="overflow-x-auto pb-4 pt-2">
                    <div className="min-w-[900px] flex items-stretch gap-6 lg:gap-8 px-2">
                      {losersRounds.map((round, rIdx) => (
                        <div key={round.name} className="flex-1 flex flex-col">
                          <div className="mb-6 text-center border-b border-amber-500/20 pb-3">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
                              Elimination R{rIdx + 1}
                            </span>
                            <h4 className="text-sm font-black text-white uppercase tracking-wide truncate">
                              {round.name}
                            </h4>
                            <span className="text-[11px] text-neutral-500">
                              {round.matches.length} {round.matches.length === 1 ? "Elimination Match" : "Matchups"}
                            </span>
                          </div>

                          <div className="flex-1 flex flex-col justify-around gap-4">
                            {round.matches.map((node) => (
                              <BracketMatchCard
                                key={node.id}
                                node={node}
                                isPlayoffActive={isPlayoffActive}
                                accentColor="amber"
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. GRAND CHAMPIONSHIP SECTION */}
              {(doubleElimSection === "all" || doubleElimSection === "finals") && finalsRounds.length > 0 && (
                <div className="p-6 md:p-8 rounded-3xl border border-yellow-500/30 bg-gradient-to-b from-yellow-950/20 via-neutral-900/70 to-black/80 backdrop-blur-md space-y-6">
                  {/* Finals Section Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-yellow-500/20 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                        <Crown className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                          <span>Grand Championship Series</span>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                            League Title
                          </span>
                        </h3>
                        <p className="text-xs text-neutral-400">
                          Upper Bracket Champion vs Elimination Bracket Champion. True double elimination with bracket reset decider if necessary.
                        </p>
                      </div>
                    </div>

                    <div className="text-xs font-mono text-yellow-400/90 shrink-0">
                      Best-of-2 Format
                    </div>
                  </div>

                  {/* Finals Matches Container */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto pt-2">
                    {finalsRounds[0]?.matches.map((node, mIdx) => (
                      <div key={node.id} className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono px-1">
                          <span className="font-bold text-yellow-400 flex items-center gap-1.5">
                            <Crown className="w-3.5 h-3.5" />
                            {mIdx === 0 ? "Game 1: Title Decider" : "Game 2: Bracket Reset (If Necessary)"}
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            {mIdx === 0
                              ? "Upper Champ wins = Crowned"
                              : "Played ONLY if Lower Champ wins Game 1"}
                          </span>
                        </div>
                        <BracketMatchCard
                          node={node}
                          isPlayoffActive={isPlayoffActive}
                          accentColor="gold"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-2xl bg-black/40 border border-yellow-500/20 flex items-center gap-3 max-w-3xl mx-auto text-xs text-neutral-300">
                    <Info className="w-4 h-4 text-yellow-400 shrink-0" />
                    <span>
                      <strong className="text-yellow-300">How Grand Finals Works:</strong> The Upper Bracket Champion enters undefeated (0 losses). If the Elimination Bracket Champion wins Game 1, both teams have 1 loss, triggering Game 2 as the ultimate winner-take-all decider!
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bracket Legend & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/10">
            {isDoubleElim ? (
              <>
                <div className="p-4 rounded-2xl bg-neutral-900/40 border border-amber-500/10 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white mb-0.5">Two-Loss Elimination</h4>
                    <p className="text-[11px] text-neutral-400">
                      Teams are only eliminated after losing two matches. A first loss sends an Upper Bracket team to the Elimination Bracket.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-900/40 border border-yellow-500/10 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center shrink-0">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white mb-0.5">Grand Finals Bracket Reset</h4>
                    <p className="text-[11px] text-neutral-400">
                      If the Lower Bracket Champion defeats the Upper Bracket Champion in Game 1, a decisive Game 2 Reset is triggered.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-900/40 border border-cyan-500/10 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white mb-0.5">Upper Seed Byes & Home Field</h4>
                    <p className="text-[11px] text-neutral-400">
                      Higher regular season seeds start with first-round byes in the Upper Bracket whenever tournament size is not a power of 2.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 rounded-2xl bg-neutral-900/40 border border-white/5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white mb-0.5">Top-Seed Home Advantage</h4>
                    <p className="text-[11px] text-neutral-400">
                      Higher regular season seeds are designated home teams with first possession option.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-900/40 border border-white/5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white mb-0.5">Automatic Tiebreaker Logic</h4>
                    <p className="text-[11px] text-neutral-400">
                      Seeds are calculated by Win %, point differential (PF - PA), total points scored, and head-to-head.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-900/40 border border-white/5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white mb-0.5">Instant Play-by-Play Integration</h4>
                    <p className="text-[11px] text-neutral-400">
                      Once playoff games kick off, live scores, clock states, and bracket advances track in real time.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Seeding Table & Bubble Watch */
        <div className="space-y-6">
          <div className="bg-[#0B0F19] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/[0.02]">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <span>Current League Seeding Table</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Top {playoffSpots} teams qualify for the championship tournament (
                  {isDoubleElim ? "Double Elimination" : "Single Elimination"}).
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-400 font-mono font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  Qualifying (1-{playoffSpots})
                </span>
                <span className="flex items-center gap-1.5 text-amber-400 font-mono font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  On the Bubble ({playoffSpots + 1}-{bubbleThreshold})
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01] text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Seed</th>
                    <th className="py-3 px-4">Franchise</th>
                    <th className="py-3 px-4 text-center">Record</th>
                    <th className="py-3 px-4 text-center">Win %</th>
                    <th className="py-3 px-4 text-center">PF</th>
                    <th className="py-3 px-4 text-center">PA</th>
                    <th className="py-3 px-4 text-center">Diff</th>
                    <th className="py-3 px-4 text-center">Streak</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs font-mono">
                  {standings.map((team) => {
                    const isQualified = team.rank <= playoffSpots;
                    const isBubble = !isQualified && team.rank <= bubbleThreshold;

                    return (
                      <tr
                        key={team.teamId}
                        className={`transition-colors hover:bg-white/[0.03] ${
                          isQualified
                            ? "bg-emerald-500/[0.03]"
                            : isBubble
                            ? "bg-amber-500/[0.02]"
                            : ""
                        }`}
                      >
                        <td className="py-3 px-4 font-bold">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black ${
                              isQualified
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : isBubble
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-neutral-800 text-neutral-400"
                            }`}
                          >
                            #{team.rank}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Link
                            href={`/teams/${team.teamId}`}
                            className="flex items-center gap-2.5 font-sans font-bold text-white hover:text-cyan-400 transition-colors"
                          >
                            <span
                              className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: team.color || "#06b6d4" }}
                            />
                            <span>{team.teamName}</span>
                            <span className="text-[10px] font-mono text-neutral-500 font-normal">
                              ({team.shortcode})
                            </span>
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-white">
                          {team.wins}-{team.losses}
                          {team.ties > 0 ? `-${team.ties}` : ""}
                        </td>
                        <td className="py-3 px-4 text-center text-neutral-300">
                          {(team.winPct * 100).toFixed(0)}%
                        </td>
                        <td className="py-3 px-4 text-center text-neutral-400">{team.pointsFor}</td>
                        <td className="py-3 px-4 text-center text-neutral-400">{team.pointsAgainst}</td>
                        <td
                          className={`py-3 px-4 text-center font-bold ${
                            team.diff > 0
                              ? "text-emerald-400"
                              : team.diff < 0
                              ? "text-rose-400"
                              : "text-neutral-400"
                          }`}
                        >
                          {team.diff > 0 ? `+${team.diff}` : team.diff}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-neutral-300">
                          {team.streak}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {team.clinchStatus === "clinched_bye" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-[10px] font-bold text-amber-300 shadow-sm shadow-amber-500/10">
                              <Crown className="w-3 h-3 text-amber-400" />
                              <span>Clinched #1 Seed (Bye)</span>
                            </span>
                          ) : team.clinchStatus === "clinched_playoffs" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Clinched Playoff Spot</span>
                            </span>
                          ) : team.clinchStatus === "eliminated" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-[10px] font-bold text-rose-300">
                              <XCircle className="w-3 h-3 text-rose-400" />
                              <span>Eliminated</span>
                            </span>
                          ) : isBubble || team.clinchStatus === "on_bubble" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-300">
                              <Flame className="w-3 h-3 text-amber-400" />
                              <span>On the Bubble</span>
                            </span>
                          ) : isQualified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-bold text-cyan-300">
                              <span>In Playoff Position</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-neutral-500 font-bold uppercase">In the Hunt</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual Match Card within the tournament bracket
 */
function BracketMatchCard({
  node,
  isPlayoffActive,
  accentColor = "cyan",
}: {
  node: BracketMatchNode;
  isPlayoffActive: boolean;
  accentColor?: "cyan" | "amber" | "gold";
}) {
  const isFinal = node.status === "completed";
  const isLive = node.status === "in_progress";
  const homeWon = isFinal && (node.homeScore ?? 0) > (node.awayScore ?? 0);
  const awayWon = isFinal && (node.awayScore ?? 0) > (node.homeScore ?? 0);

  const isByeMatch = node.awaySeedLabel?.toLowerCase().includes("bye advance") || node.homeSeedLabel?.toLowerCase().includes("bye advance");
  const isGrandReset = node.id === "bracket_gf_reset" || (node.bracketType === "finals" && node.matchIndex === 1);

  // Styling presets by accent color
  const borderColor =
    isLive
      ? "border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)] bg-neutral-900"
      : accentColor === "gold"
      ? "border-yellow-500/40 bg-neutral-900/90 hover:border-yellow-500/60 shadow-[0_0_20px_rgba(234,179,8,0.1)]"
      : accentColor === "amber"
      ? "border-amber-500/20 bg-neutral-900/80 hover:border-amber-500/40"
      : isFinal
      ? "border-white/10 bg-neutral-900/90 hover:border-white/20"
      : "border-white/10 bg-neutral-900/70 hover:border-cyan-500/30";

  const cardContent = (
    <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${borderColor}`}>
      {/* Match Top Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/5 bg-white/[0.02] text-[10px] font-mono text-neutral-400">
        <span className="font-bold text-neutral-300 truncate max-w-[160px]">
          {isGrandReset ? "Reset Match (If Needed)" : node.roundName}
        </span>
        {isLive ? (
          <span className="flex items-center gap-1 text-cyan-400 font-bold animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            LIVE
          </span>
        ) : isFinal ? (
          <span className="text-neutral-400 font-bold uppercase">Final</span>
        ) : isByeMatch ? (
          <span className="text-cyan-400 font-bold uppercase flex items-center gap-1">
            <Shield className="w-3 h-3" /> Bye
          </span>
        ) : isGrandReset ? (
          <span className="text-yellow-400 font-bold uppercase">Decider</span>
        ) : accentColor === "amber" ? (
          <span className="text-amber-400 font-bold uppercase flex items-center gap-1">
            <Flame className="w-3 h-3" /> Elim
          </span>
        ) : (
          <span className="text-cyan-400 font-bold uppercase">
            {isPlayoffActive ? "Scheduled" : "Projected"}
          </span>
        )}
      </div>

      {/* Teams Pair */}
      <div className="p-3 space-y-1.5">
        {/* Home Team */}
        <div
          className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
            homeWon
              ? "bg-emerald-500/10 text-white font-bold"
              : awayWon
              ? "text-neutral-400 opacity-70"
              : "text-white"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 shrink-0">
              {node.homeTeam ? `#${node.homeTeam.rank}` : node.homeSeedLabel}
            </span>
            {node.homeTeam && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: node.homeTeam.color || "#06b6d4" }}
              />
            )}
            <span className="text-xs font-bold truncate">
              {node.homeTeam ? node.homeTeam.teamName : node.homeSeedLabel}
            </span>
          </div>

          <div className="shrink-0 text-right font-mono">
            {isFinal || isLive ? (
              <span className={`text-sm font-black ${homeWon ? "text-emerald-400" : "text-white"}`}>
                {node.homeScore ?? 0}
              </span>
            ) : isByeMatch && !node.awayTeam ? (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                ADVANCE
              </span>
            ) : node.homeTeam ? (
              <span className="text-[10px] text-neutral-400 font-semibold">
                {node.homeTeam.wins}-{node.homeTeam.losses}
                <span className="text-neutral-500 ml-1">
                  ({node.homeTeam.diff >= 0 ? `+${node.homeTeam.diff}` : node.homeTeam.diff})
                </span>
              </span>
            ) : (
              <span className="text-[10px] text-neutral-600">-</span>
            )}
          </div>
        </div>

        {/* Away Team */}
        <div
          className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
            awayWon
              ? "bg-emerald-500/10 text-white font-bold"
              : homeWon
              ? "text-neutral-400 opacity-70"
              : isByeMatch && !node.awayTeam
              ? "text-neutral-500 opacity-50 bg-black/20"
              : "text-white"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 shrink-0">
              {node.awayTeam ? `#${node.awayTeam.rank}` : node.awaySeedLabel}
            </span>
            {node.awayTeam && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: node.awayTeam.color || "#06b6d4" }}
              />
            )}
            <span className="text-xs font-bold truncate">
              {node.awayTeam
                ? node.awayTeam.teamName
                : isByeMatch && !node.awayTeam
                ? "First Round Bye"
                : node.awaySeedLabel}
            </span>
          </div>

          <div className="shrink-0 text-right font-mono">
            {isFinal || isLive ? (
              <span className={`text-sm font-black ${awayWon ? "text-emerald-400" : "text-white"}`}>
                {node.awayScore ?? 0}
              </span>
            ) : node.awayTeam ? (
              <span className="text-[10px] text-neutral-400 font-semibold">
                {node.awayTeam.wins}-{node.awayTeam.losses}
                <span className="text-neutral-500 ml-1">
                  ({node.awayTeam.diff >= 0 ? `+${node.awayTeam.diff}` : node.awayTeam.diff})
                </span>
              </span>
            ) : (
              <span className="text-[10px] text-neutral-600">-</span>
            )}
          </div>
        </div>
      </div>

      {/* Match Details Footer */}
      {(node.date || node.location || node.time) && (
        <div className="px-3.5 py-1.5 border-t border-white/5 bg-white/[0.01] flex items-center justify-between text-[10px] font-mono text-neutral-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {node.date || "TBD"} {node.time ? `• ${node.time}` : ""}
          </span>
          {node.location && (
            <span className="flex items-center gap-1 truncate max-w-[120px]">
              <MapPin className="w-3 h-3" />
              {node.location}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (node.actualMatchId) {
    return (
      <Link href={`/matches/${node.actualMatchId}`} className="block">
        {cardContent}
      </Link>
    );
  }

  return <div>{cardContent}</div>;
}
