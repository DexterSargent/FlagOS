"use client";

import React, { memo, useState } from "react";
import Link from "next/link";
import {
  Users,
  Clock,
  Timer,
  Scale,
  RotateCcw,
  Check,
  Flame,
  Lock,
  BookOpen,
  Info,
  SlidersHorizontal,
  UserPlus,
  ExternalLink,
  Copy,
  Shield,
} from "lucide-react";
import FieldHelpTooltip from "@/components/FieldHelpTooltip";
import { rosterHardCap } from "@/lib/rosterLimits";
import type { LeagueRules } from "@/lib/leagueContext";

export interface LeagueCustomizerRulesTabProps {
  isLeagueAdmin: boolean;
  rules: LeagueRules;
  setRules: React.Dispatch<React.SetStateAction<LeagueRules>>;
  handleSaveLeagueSettings: (e: React.FormEvent) => void;
  handleResetToIFAF: () => void;
  ifafPresetNotice: boolean;
  setIfafPresetNotice: (v: boolean) => void;
  saving: boolean;
  closeCustomizer: () => void;
  activeLeagueId?: string | null;
}

export const LeagueCustomizerRulesTab = memo(function LeagueCustomizerRulesTab({
  isLeagueAdmin,
  rules,
  setRules,
  handleSaveLeagueSettings,
  handleResetToIFAF,
  ifafPresetNotice,
  setIfafPresetNotice,
  saving,
  closeCustomizer,
  activeLeagueId,
}: LeagueCustomizerRulesTabProps) {
  const [copiedJoinLink, setCopiedJoinLink] = useState(false);
  const isFreeAgentRegistrationEnabled = rules.enableFreeAgents !== false;
  const canViewJoinLink = isFreeAgentRegistrationEnabled || isLeagueAdmin;
  const customJoinPath = activeLeagueId && activeLeagueId !== "default"
    ? `/join?league=${activeLeagueId}`
    : `/join`;
  const customJoinUrl = typeof window !== "undefined"
    ? `${window.location.origin}${customJoinPath}`
    : customJoinPath;

  const handlePlayersOnFieldChange = (count: number) => {
    setRules((prev) => ({
      ...prev,
      playersOnField: count,
      minRosterSize: Math.min(rosterHardCap(count), Math.max(count, prev.minRosterSize)),
      maxRosterSize: Math.min(rosterHardCap(count), Math.max(count + 2, prev.maxRosterSize)),
    }));
  };

  const handlePeriodTypeChange = (type: "halves" | "quarters") => {
    setRules((prev) => ({
      ...prev,
      periodType: type,
      periodsCount: type === "quarters" ? 4 : 2,
      periodDurationMinutes: type === "quarters" ? 12 : 20,
    }));
  };

  if (!isLeagueAdmin) {
    return (
          <div className="space-y-6">
            {/* Header Status Bar */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/30 via-blue-950/20 to-black/40 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-cyan-300 tracking-wide">
                      Official League Rules
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Official Rulebook
                    </span>
                  </div>
                  <span className="text-[11px] text-cyan-100/70 block mt-0.5">
                    Current active gameplay parameters set by the League Commissioner for all teams and games.
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div data-tour="settings-rules-summary" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Squad Format</span>
                <span className="text-xl font-black font-mono text-cyan-400 mt-1">{rules.playersOnField} vs {rules.playersOnField}</span>
                <span className="text-[10px] text-neutral-400 mt-0.5">Per side on field</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Game Clock</span>
                <span className="text-xl font-black font-mono text-white mt-1">
                  {rules.periodsCount} × {rules.periodDurationMinutes}m
                </span>
                <span className="text-[10px] text-neutral-400 mt-0.5">{rules.periodsCount * rules.periodDurationMinutes}m regulation</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Downs / Series</span>
                <span className="text-xl font-black font-mono text-amber-400 mt-1">{rules.downsPerSeries} Downs</span>
                <span className="text-[10px] text-neutral-400 mt-0.5">To line to gain / score</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Rush Line</span>
                <span className="text-xl font-black font-mono text-orange-400 mt-1">{rules.rushLineDistance} Yards</span>
                <span className="text-[10px] text-neutral-400 mt-0.5">Behind scrimmage</span>
              </div>
            </div>

            {/* Detailed Rule Cards (Active Selections Only) */}
            <div data-tour="settings-rules-cards" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: On-field Format */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-cyan-500/30 transition-all flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Players On The Field</h4>
                      <p className="text-[11px] text-neutral-400">Active roster alignment per side</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-cyan-500/15 border border-cyan-400/40 text-cyan-300">
                    {rules.playersOnField}v{rules.playersOnField}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-[11px] text-neutral-300 leading-relaxed">
                  The play designer, defensive alignment, and rosters operate on a <strong>{rules.playersOnField}-player per side</strong> format.
                </div>
              </div>

              {/* Card 2: Game Timing */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-blue-500/30 transition-all flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Game Clock & Periods</h4>
                      <p className="text-[11px] text-neutral-400">Regulation timing & interval break</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-blue-500/15 border border-blue-400/40 text-blue-300">
                    {rules.periodsCount} {rules.periodType === "quarters" ? "Quarters" : "Halves"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-[11px] text-neutral-300 leading-relaxed">
                  Games consist of <strong>{rules.periodsCount} {rules.periodType === "quarters" ? "quarters" : "halves"} of {rules.periodDurationMinutes} minutes</strong> ({rules.periodsCount * rules.periodDurationMinutes} min total). Halftime interval is <strong>{rules.halftimeDurationSeconds >= 60 ? `${Math.round(rules.halftimeDurationSeconds / 60)} minutes` : `${rules.halftimeDurationSeconds}s`}</strong>.
                </div>
              </div>

              {/* Card 3: Downs & Series */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Downs Per Series</h4>
                      <p className="text-[11px] text-neutral-400">Offensive possessions to cross midfield</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-amber-500/15 border border-amber-400/40 text-amber-300">
                    {rules.downsPerSeries} Downs
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-[11px] text-neutral-300 leading-relaxed">
                  Offenses receive <strong>{rules.downsPerSeries} downs</strong> to cross the midfield line to gain. Upon crossing midfield, the team receives another set of <strong>{rules.downsPerSeries} downs</strong> to score a touchdown.
                </div>
              </div>

              {/* Card 4: Rush Line Distance */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-orange-500/30 transition-all flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Rush Distance</h4>
                      <p className="text-[11px] text-neutral-400">Defensive rusher alignment constraint</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-orange-500/15 border border-orange-400/40 text-orange-300">
                    {rules.rushLineDistance} Yards
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-[11px] text-neutral-300 leading-relaxed">
                  All defensive rushers must be positioned at least <strong>{rules.rushLineDistance} yards</strong> behind the line of scrimmage at the snap to be eligible to rush the passer.
                </div>
              </div>

              {/* Card 5: Play Clock */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-violet-500/30 transition-all flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
                      <Timer className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Offensive Play Clock</h4>
                      <p className="text-[11px] text-neutral-400">Pace of play between downs</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-violet-500/15 border border-violet-400/40 text-violet-300">
                    {rules.playClockSeconds} Seconds
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-[11px] text-neutral-300 leading-relaxed">
                  Offenses must snap the football within <strong>{rules.playClockSeconds} seconds</strong> from the official ready-for-play signal to prevent delay-of-game penalties.
                </div>
              </div>

              {/* Card 6: Timeouts */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/30 transition-all flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Timeouts & Stoppages</h4>
                      <p className="text-[11px] text-neutral-400">Team clock stoppages and duration</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-emerald-500/15 border border-emerald-400/40 text-emerald-300">
                    {rules.timeoutsPerTeam} × {rules.timeoutDurationSeconds}s
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-[11px] text-neutral-300 leading-relaxed">
                  Teams are granted <strong>{rules.timeoutsPerTeam} timeouts ({rules.timeoutDurationSeconds} seconds each)</strong> {rules.timeoutsResetPerPeriod ? `per ${rules.periodType === "quarters" ? "quarter" : "half"}` : "per entire game"}. Timeouts do not carry over.
                </div>
              </div>

              {/* Card 7: Roster Capacity */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-indigo-500/30 transition-all flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Roster Capacity</h4>
                      <p className="text-[11px] text-neutral-400">Team registration requirements</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-indigo-500/15 border border-indigo-400/40 text-indigo-300">
                    {rules.minRosterSize} - {rules.maxRosterSize} Players
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-[11px] text-neutral-300 leading-relaxed">
                  Each team needs at least <strong>{rules.minRosterSize} players</strong> and can register up to <strong>{rules.maxRosterSize} players</strong>.
                </div>
              </div>

              {/* Card 8: Free Agent Draft Pool */}
              <div data-tour="settings-rules-view-join" className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-pink-500/30 transition-all flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Free Agent Registration</h4>
                      <p className="text-[11px] text-neutral-400">Draft pool & open signups</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black font-mono ${rules.enableFreeAgents !== false
                    ? "bg-emerald-500/15 border border-emerald-400/40 text-emerald-300"
                    : "bg-neutral-500/15 border border-neutral-400/40 text-neutral-300"
                    }`}>
                    {rules.enableFreeAgents !== false ? "Active / Open" : "Closed"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-[11px] text-neutral-300 leading-relaxed space-y-2">
                  <p>
                    {rules.enableFreeAgents !== false ? (
                      <>
                        The Free Agent{" "}
                        <Link
                          href={customJoinPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 underline font-bold inline-flex items-center gap-1"
                          title="Open Free Agent Join Form"
                        >
                          <span>Join Form</span>
                          <ExternalLink className="w-3 h-3 inline" />
                        </Link>{" "}
                        is open for public registration, and unassigned players appear in the Free Agent pool ready to be claimed.
                      </>
                    ) : (
                      "The Free Agent Join Form and unassigned draft pool are currently closed by league administration."
                    )}
                  </p>

                  {canViewJoinLink && rules.enableFreeAgents !== false && (
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-cyan-300 font-mono truncate">
                        {customJoinUrl}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined") {
                            navigator.clipboard?.writeText(customJoinUrl);
                            setCopiedJoinLink(true);
                            setTimeout(() => setCopiedJoinLink(false), 2000);
                          }
                        }}
                        className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 text-white text-[10px] font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedJoinLink ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div data-tour="settings-rules-view-close" className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
              <div className="text-[11px] text-neutral-400 flex items-center gap-2 font-mono">
                <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>To propose changes to these rules, contact the League Commissioner.</span>
              </div>
              <button
                type="button"
                onClick={closeCustomizer}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
    );
  }

  return (
          <form onSubmit={handleSaveLeagueSettings} className="space-y-6">

            {/* Rule 1: Players on field */}
            <div data-tour="settings-players" className="border-b border-white/10 pb-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>1. Players on the Field (Per Side)</span>
                  <FieldHelpTooltip
                    title="Squad Format"
                    content="Number of active athletes per squad on the field at one time (e.g. 5v5 for Olympic IFAF standard, 7v7 or 8v8 for contact/screen styles)."
                  />
                </span>
                <span className="text-[10px] font-mono font-bold text-neutral-400">
                  {rules.playersOnField} vs {rules.playersOnField}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {[4, 5, 6, 7, 8].map((count) => {
                  const isSelected = rules.playersOnField === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      disabled={!isLeagueAdmin}
                      onClick={() => handlePlayersOnFieldChange(count)}
                      className={`py-3 px-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${isSelected
                        ? "bg-cyan-500/20 border-cyan-400 text-white shadow-lg shadow-cyan-500/15"
                        : "bg-black/40 border-white/10 text-neutral-400"
                        } ${isLeagueAdmin ? "cursor-pointer hover:text-white hover:border-white/20" : "cursor-default opacity-85"}`}
                    >
                      <span className="text-base font-black font-mono tracking-tight text-[var(--text-primary)]">
                        {count}v{count}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-neutral-400">
                        {count === 4 && "4v4"}
                        {count === 5 && "5v5"}
                        {count === 6 && "6v6"}
                        {count === 7 && "7v7"}
                        {count === 8 && "8v8"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rule 2: Periods & Clock */}
            <div data-tour="settings-clock" className="border-b border-white/10 pb-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>2. Game Periods & Clock Structure</span>
                  <FieldHelpTooltip
                    title="Game Clock Structure"
                    content="Configure match timing, whether divided into two halves or four quarters, period length in minutes, and halftime duration."
                  />
                </span>
                <span className="text-[10px] font-mono font-bold text-neutral-400">
                  {rules.periodsCount} {rules.periodType === "quarters" ? "Quarters" : "Halves"} @ {rules.periodDurationMinutes} mins
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-2">
                    <span>Format</span>
                    <FieldHelpTooltip
                      title="Period Division"
                      content="Halves (traditional 2 halves) or Quarters (4 shorter periods with breaks between)."
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!isLeagueAdmin}
                      onClick={() => handlePeriodTypeChange("halves")}
                      className={`p-3 rounded-xl border text-left transition-all ${rules.periodType === "halves"
                        ? "bg-cyan-500/20 border-cyan-400 text-white"
                        : "bg-black/40 border-white/10 text-neutral-400"
                        } ${isLeagueAdmin ? "cursor-pointer hover:border-white/20" : "cursor-default"}`}
                    >
                      <div className="text-xs font-black uppercase text-[var(--text-primary)]">Halves</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">Traditional 1st & 2nd Half</div>
                    </button>

                    <button
                      type="button"
                      disabled={!isLeagueAdmin}
                      onClick={() => handlePeriodTypeChange("quarters")}
                      className={`p-3 rounded-xl border text-left transition-all ${rules.periodType === "quarters"
                        ? "bg-cyan-500/20 border-cyan-400 text-white"
                        : "bg-black/40 border-white/10 text-neutral-400"
                        } ${isLeagueAdmin ? "cursor-pointer hover:border-white/20" : "cursor-default"}`}
                    >
                      <div className="text-xs font-black uppercase text-[var(--text-primary)]">Quarters</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">4 quarters with short breaks between</div>
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-2">
                    Games already in progress keep the format they started with. The change applies from the next game.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-2">
                    <span>Duration Per Period (Minutes)</span>
                    <FieldHelpTooltip
                      title="Period Duration"
                      content="Clock duration for each quarter or half of regulation play."
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    {[10, 12, 15, 20, 25].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        disabled={!isLeagueAdmin}
                        onClick={() => setRules((prev) => ({ ...prev, periodDurationMinutes: mins }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${rules.periodDurationMinutes === mins
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                          : "bg-black/40 border-white/10 text-neutral-400"
                          } ${isLeagueAdmin ? "cursor-pointer hover:text-white" : "cursor-default"}`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                  {isLeagueAdmin && (
                    <div className="mt-2 flex items-center gap-2">
                      <label htmlFor="lc-period-minutes" className="text-[10px] text-neutral-500">Custom minutes (5–60):</label>
                      <input
                        id="lc-period-minutes"
                        type="number"
                        inputMode="numeric"
                        min={5}
                        max={60}
                        step={1}
                        value={rules.periodDurationMinutes}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          if (Number.isFinite(n)) setRules((prev) => ({ ...prev, periodDurationMinutes: n }));
                        }}
                        onBlur={() =>
                          setRules((prev) => ({
                            ...prev,
                            periodDurationMinutes: Math.min(60, Math.max(5, prev.periodDurationMinutes || 20)),
                          }))
                        }
                        className="w-16 px-2 py-1 rounded-lg bg-black/60 border border-white/10 text-white font-mono text-xs text-center"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Halftime break */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                    <span>Halftime Intermission Duration</span>
                    <FieldHelpTooltip
                      title="Halftime Break"
                      content="Countdown duration displayed on the scoreboard clock during the halftime break."
                    />
                  </span>
                  <span className="text-[10px] text-neutral-500">Break clock shown between periods</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[60, 120, 300].map((secs) => (
                    <button
                      key={secs}
                      type="button"
                      disabled={!isLeagueAdmin}
                      onClick={() => setRules((prev) => ({ ...prev, halftimeDurationSeconds: secs }))}
                      className={`px-3 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all ${rules.halftimeDurationSeconds === secs
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                        : "bg-black/60 border-white/10 text-neutral-400"
                        } ${isLeagueAdmin ? "cursor-pointer hover:text-white" : "cursor-default"}`}
                    >
                      {secs / 60} min
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Rule 3: Timeouts */}
            <div data-tour="settings-timeouts" className="border-b border-white/10 pb-5 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" />
                <span>3. Timeouts & Stoppages</span>
                <FieldHelpTooltip
                  title="Timeouts & Stoppages"
                  content="Number of charged timeouts permitted per team, clock stoppage duration, and reset rules per period."
                />
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-2">
                    <span>Timeouts Per Team</span>
                    <FieldHelpTooltip
                      title="Timeout Quota"
                      content="Number of team timeouts allowed per game or period."
                    />
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((t) => (
                      <button
                        key={t}
                        type="button"
                        disabled={!isLeagueAdmin}
                        onClick={() => setRules((prev) => ({ ...prev, timeoutsPerTeam: t }))}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${rules.timeoutsPerTeam === t
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                          : "bg-black/40 border-white/10 text-neutral-400"
                          } ${isLeagueAdmin ? "cursor-pointer hover:text-white" : "cursor-default"}`}
                      >
                        {t} {t === 1 ? "TO" : "TOs"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-2">
                    <span>Timeout Duration</span>
                    <FieldHelpTooltip
                      title="Timeout Duration"
                      content="Length of timeout countdown in seconds before teams must return to the huddle."
                    />
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[30, 60, 90].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        disabled={!isLeagueAdmin}
                        onClick={() => setRules((prev) => ({ ...prev, timeoutDurationSeconds: sec }))}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${rules.timeoutDurationSeconds === sec
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                          : "bg-black/40 border-white/10 text-neutral-400"
                          } ${isLeagueAdmin ? "cursor-pointer hover:text-white" : "cursor-default"}`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10">
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Reset Timeouts Each Period/Half</span>
                    <FieldHelpTooltip
                      title="Timeout Reset Policy"
                      content="If enabled, timeouts replenish to maximum after every intermission. If disabled, total timeouts are pooled across the full game."
                    />
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    When enabled, teams get fresh timeouts each period; otherwise timeouts are for the entire game.
                  </span>
                </div>
                <input
                  type="checkbox"
                  disabled={!isLeagueAdmin}
                  checked={rules.timeoutsResetPerPeriod}
                  onChange={(e) => setRules((prev) => ({ ...prev, timeoutsResetPerPeriod: e.target.checked }))}
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 border-white/20 cursor-pointer accent-cyan-500"
                />
              </div>
            </div>

            {/* Rule 4: Downs & Scrimmage */}
            <div data-tour="settings-downs" className="border-b border-white/10 pb-5 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                <span>4. Downs & Scrimmage Rules</span>
                <FieldHelpTooltip
                  title="Downs & Scrimmage"
                  content="Gridiron progression rules including series down count, defensive rush mark distance, and play clock interval."
                />
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-2">
                    <span>Downs Per Series</span>
                    <FieldHelpTooltip
                      title="Downs Allowed"
                      content="Attempts allowed to cross midfield for a first down or score a touchdown (3 downs Canadian style, 4 downs American style)."
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!isLeagueAdmin}
                      onClick={() => setRules((prev) => ({ ...prev, downsPerSeries: 3 }))}
                      className={`p-2.5 rounded-xl border text-center transition-all ${rules.downsPerSeries === 3
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                        : "bg-black/40 border-white/10 text-neutral-400"
                        } ${isLeagueAdmin ? "cursor-pointer hover:text-white" : "cursor-default"}`}
                    >
                      <span className="text-sm font-black block">3 Downs</span>
                      <span className="text-[10px] text-neutral-400">Canadian Standard</span>
                    </button>

                    <button
                      type="button"
                      disabled={!isLeagueAdmin}
                      onClick={() => setRules((prev) => ({ ...prev, downsPerSeries: 4 }))}
                      className={`p-2.5 rounded-xl border text-center transition-all ${rules.downsPerSeries === 4
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                        : "bg-black/40 border-white/10 text-neutral-400"
                        } ${isLeagueAdmin ? "cursor-pointer hover:text-white" : "cursor-default"}`}
                    >
                      <span className="text-sm font-black block">4 Downs</span>
                      <span className="text-[10px] text-neutral-400">American Standard</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-2">
                    <span>Rush Distance</span>
                    <FieldHelpTooltip
                      title="Rush Line Marker"
                      content="Minimum distance in yards behind the line of scrimmage from which defensive rushers must initiate their rush."
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 5, 7, 10].map((yds) => (
                      <button
                        key={yds}
                        type="button"
                        disabled={!isLeagueAdmin}
                        onClick={() => setRules((prev) => ({ ...prev, rushLineDistance: yds }))}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${rules.rushLineDistance === yds
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                          : "bg-black/40 border-white/10 text-neutral-400"
                          } ${isLeagueAdmin ? "cursor-pointer hover:text-white" : "cursor-default"}`}
                      >
                        {yds} Yds
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5 mb-2">
                    <span>Play Clock Duration</span>
                    <FieldHelpTooltip
                      title="Play Clock"
                      content="Time in seconds between official ball ready signal and snap before a delay of game penalty."
                    />
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[25, 30, 40].map((clk) => (
                      <button
                        key={clk}
                        type="button"
                        disabled={!isLeagueAdmin}
                        onClick={() => setRules((prev) => ({ ...prev, playClockSeconds: clk }))}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${rules.playClockSeconds === clk
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                          : "bg-black/40 border-white/10 text-neutral-400"
                          } ${isLeagueAdmin ? "cursor-pointer hover:text-white" : "cursor-default"}`}
                      >
                        {clk}s
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-neutral-500 mt-1.5 block">
                    Referee play clock between downs
                  </span>
                </div>
              </div>
            </div>

            {/* Stat keeping mode */}
            <div data-tour="settings-stat-keeping" className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Stat Keeping Mode</span>
                <FieldHelpTooltip
                  title="Stat Keeping Mode"
                  content="Live uses the game clock, play clock and timeouts. No clock skips the timers and records both teams' plays by half, so games can be scored from the sideline or entered afterwards."
                />
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {([
                  { id: "live", title: "Live clocks", body: "Game clock, play clock and timeouts run during the game." },
                  { id: "async", title: "No clock, both teams", body: "No clocks. Record each team's plays by half, live or after the game." },
                ] as const).map((mode) => {
                  const active = (rules.statKeepingMode || "live") === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      aria-pressed={active}
                      disabled={!isLeagueAdmin}
                      onClick={() => setRules((prev) => ({ ...prev, statKeepingMode: mode.id }))}
                      className={`text-left p-3 rounded-xl border transition-all ${active
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                        : "bg-black/40 border-white/10 text-neutral-400"
                        } ${isLeagueAdmin ? "cursor-pointer hover:text-white" : "cursor-default"}`}
                    >
                      <span className="block text-xs font-black uppercase tracking-wide">{mode.title}</span>
                      <span className="block text-[11px] mt-1 text-neutral-400">{mode.body}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rule 5: Roster Limits */}
            <div data-tour="settings-rosters" className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>5. Roster Size Limits & Compliance</span>
                <FieldHelpTooltip
                  title="Roster Sizes"
                  content="Set minimum roster compliance thresholds and maximum athlete limits per team."
                />
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5">
                    <span>Minimum Roster Size</span>
                    <FieldHelpTooltip
                      title="Minimum Roster"
                      content="Minimum number of active athletes required on a team roster. Teams with fewer players show compliance warnings."
                    />
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      disabled={!isLeagueAdmin}
                      min={rules.playersOnField}
                      max={30}
                      value={rules.minRosterSize}
                      aria-label="Minimum roster size"
                      inputMode="numeric"
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10);
                        if (Number.isFinite(n)) setRules((prev) => ({ ...prev, minRosterSize: n }));
                      }}
                      onBlur={() =>
                        setRules((prev) => ({
                          ...prev,
                          minRosterSize: Math.min(30, Math.max(prev.playersOnField, prev.minRosterSize || prev.playersOnField)),
                        }))
                      }
                      className="w-20 px-3 py-2 rounded-xl bg-black/80 border border-white/10 text-white font-mono font-bold text-center text-sm disabled:opacity-80"
                    />
                    <span className="text-[11px] text-neutral-400 leading-tight">
                      Must be at least <span className="text-cyan-300 font-bold">{rules.playersOnField}</span>. Teams below show compliance alerts and may be ineligible.
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
                  <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider flex items-center gap-1.5">
                    <span>Maximum Roster Size</span>
                    <FieldHelpTooltip
                      title="Roster Cap"
                      content="Hard cap on team roster size. Managers cannot add more players once this number is reached."
                    />
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      disabled={!isLeagueAdmin}
                      min={rules.minRosterSize}
                      max={rosterHardCap(rules.playersOnField)}
                      value={rules.maxRosterSize}
                      aria-label="Maximum roster size"
                      inputMode="numeric"
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10);
                        if (Number.isFinite(n)) setRules((prev) => ({ ...prev, maxRosterSize: n }));
                      }}
                      onBlur={() =>
                        setRules((prev) => ({
                          ...prev,
                          maxRosterSize: Math.min(rosterHardCap(prev.playersOnField), Math.max(prev.minRosterSize, prev.maxRosterSize || prev.minRosterSize)),
                        }))
                      }
                      className="w-20 px-3 py-2 rounded-xl bg-black/80 border border-white/10 text-white font-mono font-bold text-center text-sm disabled:opacity-80"
                    />
                    <span className="text-[11px] text-neutral-400 leading-tight">
                      Up to {rosterHardCap(rules.playersOnField)} players ({rules.playersOnField}v{rules.playersOnField} allows 5 per spot on the field). Teams cannot add players once this limit is reached.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rule 6: Free Agent Pool & Public Registration Form */}
            <div data-tour="settings-free-agents" className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>6. Free Agent Pool & Public Registration Form</span>
                  <FieldHelpTooltip
                    title="Free Agent Draft Pool"
                    content="Allows prospective athletes to register independently through the public join form and pool together for team draft selection."
                  />
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${rules.enableFreeAgents !== false
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-red-500/20 text-red-300 border-red-500/40"
                    }`}
                >
                  {rules.enableFreeAgents !== false ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Controls whether athletes can register online via the{" "}
                  {canViewJoinLink ? (
                    <Link
                      href={customJoinPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 underline font-bold inline-flex items-center gap-1"
                      title="Open League Custom Join Form"
                    >
                      <span>Join Form</span>
                      <ExternalLink className="w-3 h-3 inline" />
                    </Link>
                  ) : (
                    <span className="font-bold text-neutral-300">Join Form</span>
                  )}{" "}
                  and whether the Free Agent pool of unassigned players appears on the Teams page for admins.
                </p>

                {canViewJoinLink && (
                  <div className="p-3 rounded-xl bg-black/60 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="text-[10px] uppercase font-bold text-neutral-400 shrink-0 font-mono">
                        Custom Join Link:
                      </span>
                      <Link
                        href={customJoinPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-cyan-300 hover:underline truncate"
                      >
                        {customJoinUrl}
                      </Link>
                      {!isFreeAgentRegistrationEnabled && isLeagueAdmin && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold shrink-0">
                          Admin Preview (Disabled to Public)
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          navigator.clipboard?.writeText(customJoinUrl);
                          setCopiedJoinLink(true);
                          setTimeout(() => setCopiedJoinLink(false), 2000);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[11px] font-bold shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedJoinLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Join Link</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-white block">
                    Public Join Form & Free Agent Pool
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {rules.enableFreeAgents !== false
                      ? "Athletes can register online and appear in the Free Agent draft pool on Teams page until assigned."
                      : "Registration is closed and Free Agent list is hidden from the Teams page."}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={!isLeagueAdmin}
                  onClick={() =>
                    setRules((prev) => ({
                      ...prev,
                      enableFreeAgents: !(prev.enableFreeAgents !== false),
                    }))
                  }
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 flex items-center gap-2 ${rules.enableFreeAgents !== false
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/10"
                    : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                    } ${isLeagueAdmin ? "cursor-pointer" : "cursor-default opacity-85"}`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${rules.enableFreeAgents !== false
                      ? "bg-emerald-500 border-emerald-400 text-black"
                      : "border-white/20"
                      }`}
                  >
                    {rules.enableFreeAgents !== false && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span>{rules.enableFreeAgents !== false ? "Enabled" : "Disabled"}</span>
                </button>
              </div>
            </div>

            {/* Notification when IFAF preset is loaded */}
            {ifafPresetNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-between gap-3 font-mono shadow-lg shadow-emerald-950/50">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Official IFAF 5v5 Preset Loaded <strong> Remember to click &quot;Apply &amp; Save Settings&quot;.  </strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIfafPresetNotice(false)}
                  className="text-emerald-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Footer buttons */}
            <div data-tour="settings-rules-save" className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 max-sm:order-last max-sm:w-full">
                <button
                  type="button"
                  onClick={closeCustomizer}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleResetToIFAF}
                  className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 hover:text-amber-200 border border-amber-500/20 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 max-sm:flex-1 max-sm:justify-center"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Reset to IFAF 5v5</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-wider whitespace-nowrap transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 max-sm:w-full"
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>{saving ? "Saving Changes..." : "Apply & Save Settings"}</span>
              </button>
            </div>
          </form>
  );
});

export default LeagueCustomizerRulesTab;
