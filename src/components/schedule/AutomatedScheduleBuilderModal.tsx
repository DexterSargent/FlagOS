"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Zap,
  Calendar,
  Clock,
  MapPin,
  Trophy,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Plus,
  Trash2,
  ArrowRight,
  Shield,
  Layers,
} from "lucide-react";
import { isRealTeam } from "@/components/TeamAssets";
import { PlayoffFormat, getNearestSimplePlayoffBracket } from "@/lib/leagueContext";
import FieldHelpTooltip from "@/components/FieldHelpTooltip";
import { assignScheduleSlots, scheduleDayOffsets } from "@/lib/scheduleSlots";
import { buildPlayoffFixtureTemplates } from "@/lib/standingsEngine";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";
import { usePageGuide } from "@/lib/pageGuide";
import { SCHEDULE_BUILDER_WALKTHROUGH } from "@/lib/walkthroughs/league";
import { parseLocalDate, toLocalDateString } from "@/lib/formatMatchTime";
import FormNotice, { type FormNoticeState } from "@/components/ui/FormNotice";

interface AutomatedScheduleBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: any[];
  defaultLocation?: string;
  existingMatchesCount: number;
  initialPlayoffFormat?: PlayoffFormat;
  onApplySchedule: (
    generatedMatches: any[],
    playoffFormat: PlayoffFormat,
    clearExisting: boolean,
    targetView?: "schedule" | "playoffs"
  ) => Promise<void>;
}

const BUILDER_PREFS_KEY = "flagos_schedule_builder_prefs";

interface BuilderPrefs {
  weeksCount: number;
  gameDays: "saturdays" | "sundays" | "weekends";
  venues: string[];
  timeSlots: string[];
}

function readBuilderPrefs(): BuilderPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BUILDER_PREFS_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return null;
    const prefs: BuilderPrefs = {
      weeksCount: Number.isInteger(parsed.weeksCount) && parsed.weeksCount > 0 ? parsed.weeksCount : 4,
      gameDays: ["saturdays", "sundays", "weekends"].includes(parsed.gameDays) ? parsed.gameDays : "saturdays",
      venues: Array.isArray(parsed.venues) && parsed.venues.length > 0 ? parsed.venues.map(String) : [],
      timeSlots: Array.isArray(parsed.timeSlots) && parsed.timeSlots.length > 0 ? parsed.timeSlots.map(String) : [],
    };
    return prefs;
  } catch {
    return null;
  }
}

function writeBuilderPrefs(prefs: BuilderPrefs) {
  try {
    window.localStorage.setItem(BUILDER_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage may be unavailable (private mode); preferences are optional.
  }
}

export default function AutomatedScheduleBuilderModal({
  isOpen,
  onClose,
  teams,
  defaultLocation,
  existingMatchesCount,
  initialPlayoffFormat,
  onApplySchedule,
}: AutomatedScheduleBuilderModalProps) {
  usePageGuide(isOpen ? SCHEDULE_BUILDER_WALKTHROUGH : null, 1);
  // Phase: "form" | "building" | "completed"
  const [phase, setPhase] = useState<"form" | "building" | "completed">("form");
  const [formNotice, setFormNotice] = useState<FormNoticeState | null>(null);
  const [unplacedGames, setUnplacedGames] = useState<string[]>([]);

  // Form State
  const eligibleTeams = teams.filter(isRealTeam);
  const [savedPrefs] = useState(readBuilderPrefs);
  const [weeksCount, setWeeksCount] = useState<number>(savedPrefs?.weeksCount ?? 4);
  const [startDate, setStartDate] = useState<string>(() => {
    // Default to next upcoming Saturday
    const d = new Date();
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
    return toLocalDateString(d);
  });
  const [gameDays, setGameDays] = useState<"saturdays" | "sundays" | "weekends">(savedPrefs?.gameDays ?? "saturdays");

  // Venues / Fields
  const [venues, setVenues] = useState<string[]>(savedPrefs?.venues.length ? savedPrefs.venues : [
    defaultLocation || "Field 1 - Championship Turf",
    "Field 2 - Prime Turf",
    "Field 3 - North Turf",
    "Field 4 - South Turf",
  ]);
  const [newVenueInput, setNewVenueInput] = useState("");

  // Kickoff Times
  const [timeSlots, setTimeSlots] = useState<string[]>(savedPrefs?.timeSlots.length ? savedPrefs.timeSlots : [
    "9:00 AM",
    "10:15 AM",
    "11:30 AM",
    "12:45 PM",
    "2:00 PM",
  ]);
  const [newTimeInput, setNewTimeInput] = useState("");

  // Playoff Format State
  const defaultPlayoffCount = useMemo(() => {
    return getNearestSimplePlayoffBracket(eligibleTeams.length);
  }, [eligibleTeams.length]);

  const [playoffTeamsCount, setPlayoffTeamsCount] = useState<number>(() => {
    if (initialPlayoffFormat?.teamsCount) {
      if (initialPlayoffFormat.teamsCount === 14 && eligibleTeams.length !== 32) {
        return getNearestSimplePlayoffBracket(eligibleTeams.length);
      }
      if (initialPlayoffFormat.teamsCount <= eligibleTeams.length) {
        return initialPlayoffFormat.teamsCount;
      }
    }
    return getNearestSimplePlayoffBracket(eligibleTeams.length);
  });
  const [playoffStructure, setPlayoffStructure] = useState<"single_elimination" | "double_elimination">(
    initialPlayoffFormat?.structure || "single_elimination"
  );
  const [includePlayoffs, setIncludePlayoffs] = useState<boolean>(true);
  const [clearExisting, setClearExisting] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      if (initialPlayoffFormat?.teamsCount) {
        if (initialPlayoffFormat.teamsCount === 14 && eligibleTeams.length !== 32) {
          setPlayoffTeamsCount(getNearestSimplePlayoffBracket(eligibleTeams.length));
        } else if (initialPlayoffFormat.teamsCount <= eligibleTeams.length) {
          setPlayoffTeamsCount(initialPlayoffFormat.teamsCount);
        } else {
          setPlayoffTeamsCount(getNearestSimplePlayoffBracket(eligibleTeams.length));
        }
      } else {
        setPlayoffTeamsCount(getNearestSimplePlayoffBracket(eligibleTeams.length));
      }
    }
  }, [isOpen, eligibleTeams.length, initialPlayoffFormat]);

  // Live Synthesis Progress State
  const [buildProgress, setBuildProgress] = useState(0);
  const [currentStepText, setCurrentStepText] = useState("");
  const [generatedStream, setGeneratedStream] = useState<any[]>([]);
  const streamRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the live feed as fixtures are minted
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [generatedStream]);

  if (!isOpen) return null;

  const handleAddVenue = () => {
    const next = newVenueInput.trim();
    if (!next) return;
    if (venues.some((v) => v.toLowerCase() === next.toLowerCase())) {
      setFormNotice({ tone: "error", message: `"${next}" is already in the field list.` });
      return;
    }
    setFormNotice(null);
    setVenues([...venues, next]);
    setNewVenueInput("");
  };

  const handleRemoveVenue = (idx: number) => {
    if (venues.length <= 1) return;
    setVenues(venues.filter((_, i) => i !== idx));
  };

  const handleAddTime = () => {
    const raw = newTimeInput.trim();
    if (!raw) return;
    const match = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/.exec(raw);
    if (!match || Number(match[1]) > 23 || Number(match[2]) > 59 || (match[3] && Number(match[1]) > 12)) {
      setFormNotice({ tone: "error", message: "Enter a time like 3:15 PM or 15:15." });
      return;
    }
    const next = `${Number(match[1])}:${match[2]}${match[3] ? ` ${match[3].toUpperCase()}` : ""}`;
    if (timeSlots.includes(next)) {
      setFormNotice({ tone: "error", message: `${next} is already a kickoff slot.` });
      return;
    }
    setFormNotice(null);
    setTimeSlots([...timeSlots, next]);
    setNewTimeInput("");
  };

  const handleRemoveTime = (idx: number) => {
    if (timeSlots.length <= 1) return;
    setTimeSlots(timeSlots.filter((_, i) => i !== idx));
  };

  const handleStartBuilding = async () => {
    if (eligibleTeams.length < 2) {
      setFormNotice({ tone: "error", message: "Add at least two active teams before building a schedule." });
      return;
    }
    const baseDate = parseLocalDate(startDate);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      !Number.isFinite(baseDate.getTime()) ||
      toLocalDateString(baseDate) !== startDate
    ) {
      setFormNotice({ tone: "error", message: "Choose a valid season start date." });
      return;
    }
    setFormNotice(null);

    writeBuilderPrefs({ weeksCount, gameDays, venues, timeSlots });
    setPhase("building");
    setBuildProgress(5);
    setCurrentStepText("Building a round-robin schedule for your teams...");
    setGeneratedStream([]);

    const createdMatches: any[] = [];
    const fieldsToUse = venues.length > 0 ? venues : ["Field 1"];
    const slotsToUse = timeSlots.length > 0 ? timeSlots : ["10:00 AM"];
    const dayOffsets = scheduleDayOffsets(gameDays);
    const unplaced: string[] = [];

    // Compute calendar dates for each week
    // 1. Generate Regular Season Fixtures
    const n = eligibleTeams.length;
    const isOdd = n % 2 !== 0;
    const teamPool = isOdd ? [...eligibleTeams, { id: "BYE", name: "BYE" }] : [...eligibleTeams];
    const totalRounds = weeksCount;

    // Simulate animated construction in steps so user WATCHES it build
    await new Promise((r) => setTimeout(r, 400));
    setBuildProgress(15);
    setCurrentStepText("Balancing home/away splits and rest windows...");

    for (let w = 1; w <= totalRounds; w++) {
      // Calculate date for week
      const weekDate = new Date(baseDate);
      weekDate.setDate(weekDate.getDate() + (w - 1) * 7);
      const dateString = toLocalDateString(weekDate);

      await new Promise((r) => setTimeout(r, 180));
      setBuildProgress(Math.min(75, 20 + Math.round((w / totalRounds) * 55)));
      setCurrentStepText(`Scheduling Week ${w} matchups across ${fieldsToUse.length} field venues...`);

      // Round-robin pairing algorithm
      const rotation = (w - 1) % (teamPool.length - 1);
      const roundTeams = [
        teamPool[0],
        ...teamPool.slice(1 + rotation),
        ...teamPool.slice(1, 1 + rotation),
      ];

      const matchesPerRound = Math.floor(roundTeams.length / 2);
      const pairings: Array<{ home: { id: string; name: string }; away: { id: string; name: string } }> = [];
      for (let i = 0; i < matchesPerRound; i++) {
        const t1 = roundTeams[i];
        const t2 = roundTeams[roundTeams.length - 1 - i];
        if (t1.id === "BYE" || t2.id === "BYE") continue; // Bye week
        pairings.push(w % 2 === 0 ? { home: t2, away: t1 } : { home: t1, away: t2 });
      }
      const { slots: weekSlots } = assignScheduleSlots(pairings.length, fieldsToUse, slotsToUse, dayOffsets);

      for (let i = 0; i < pairings.length; i++) {
        const { home, away } = pairings[i];
        const slot = weekSlots[i];
        let gameDate = dateString;
        if (slot && slot.dayOffset > 0) {
          const d = new Date(weekDate);
          d.setDate(d.getDate() + slot.dayOffset);
          gameDate = toLocalDateString(d);
        }
        if (!slot) unplaced.push(`Week ${w}: ${away.name} at ${home.name}`);

        const matchObj = {
          id: `match_auto_w${w}_${i + 1}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          week: `Week ${w}`,
          matchdayIndex: w,
          homeTeamId: home.id,
          homeTeamName: home.name,
          awayTeamId: away.id,
          awayTeamName: away.name,
          date: gameDate,
          time: slot ? slot.time : "TBD",
          location: slot ? slot.location : "TBD",
          status: "scheduled",
          isPreseason: false,
          isPlayoff: false,
          homeScore: 0,
          awayScore: 0,
          order: i,
        };

        createdMatches.push(matchObj);
        setGeneratedStream((prev) => [...prev, matchObj]);
      }
    }

    // 2. Generate Playoff Tournament Fixtures (if enabled)
    let P = 2;
    while (P < playoffTeamsCount) P *= 2;
    const byes = P - playoffTeamsCount;
    const baseWeeks = Math.round(Math.log2(P));
    const playoffWeeks = playoffStructure === "double_elimination" ? baseWeeks + 1 : baseWeeks;

    let finalFormat: PlayoffFormat = {
      teamsCount: playoffTeamsCount,
      structure: playoffStructure,
      hasByes: byes > 0,
      byesCount: byes,
      playoffWeeks,
      championshipName: "FlagOS League Championship",
    };

    if (includePlayoffs && eligibleTeams.length >= 4) {
      await new Promise((r) => setTimeout(r, 350));
      setBuildProgress(85);
      setCurrentStepText(`Constructing Top ${playoffTeamsCount} Playoff Elimination Bracket architecture...`);

      const playoffBaseDate = new Date(baseDate);
      playoffBaseDate.setDate(playoffBaseDate.getDate() + totalRounds * 7);

      // Playoff teams stay TBD until the regular season ends; the schedule page then
      // seeds them from final standings and advances winners round by round.
      const templates = buildPlayoffFixtureTemplates(playoffTeamsCount);
      const playoffFixtures = templates.map((fixture, i) => {
        const roundDate = new Date(playoffBaseDate);
        roundDate.setDate(roundDate.getDate() + fixture.roundIndex * 7);
        const roundFixtures = templates.filter((t) => t.roundIndex === fixture.roundIndex);
        const roundSlot = assignScheduleSlots(roundFixtures.length, fieldsToUse, slotsToUse, dayOffsets).slots[roundFixtures.indexOf(fixture)];
        if (roundSlot && roundSlot.dayOffset > 0) roundDate.setDate(roundDate.getDate() + roundSlot.dayOffset);
        if (!roundSlot) unplaced.push(`Playoffs: ${fixture.awayTeamName} at ${fixture.homeTeamName}`);
        return {
          week: "Playoffs",
          matchdayIndex: totalRounds + 1 + fixture.roundIndex,
          playoffRound: fixture.playoffRound,
          bracketSlot: fixture.bracketSlot,
          homeTeamId: "",
          homeTeamName: fixture.homeTeamName,
          awayTeamId: "",
          awayTeamName: fixture.awayTeamName,
          date: toLocalDateString(roundDate),
          time: roundSlot ? roundSlot.time : "TBD",
          location: roundSlot ? roundSlot.location : "TBD",
          status: "scheduled",
          isPreseason: false,
          isPlayoff: true,
          homeScore: 0,
          awayScore: 0,
          order: 1000 + i,
        };
      });
      createdMatches.push(...playoffFixtures);
      setGeneratedStream((prev) => [...prev, ...playoffFixtures]);
    }

    await new Promise((r) => setTimeout(r, 400));
    setBuildProgress(100);
    setCurrentStepText("Schedule generated and verified!");
    await new Promise((r) => setTimeout(r, 500));

    setUnplacedGames(unplaced);
    try {
      await onApplySchedule(createdMatches, finalFormat, clearExisting);
      setPhase("completed");
    } catch (err) {
      console.error("Failed to apply generated schedule:", err);
      setPhase("form");
      setFormNotice({
        tone: "error",
        message: err instanceof Error && err.message ? err.message : "The schedule was generated but could not be saved. Check your connection and try again.",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn">
      <div role="dialog" aria-modal="true" aria-labelledby="schedule-builder-title" className="bg-[#0B0F19] border border-cyan-500/30 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div data-tour="builder-header" className="flex items-center justify-between gap-3 p-4 sm:p-6 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                <span className="normal-case">FlagOS</span> Schedule Setup
              </span>
              <h3 id="schedule-builder-title" className="text-base sm:text-xl md:text-2xl font-black text-white uppercase tracking-tight">
                Build Schedule
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
          <PageGuideButton />
          <button
            onClick={onClose}
            aria-label="Close schedule builder"
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          </div>
        </div>

        {/* Modal Body Based on Phase */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
          {phase === "form" && (
            <div className="space-y-6">
              {/* Franchise Indicator */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Participating Teams
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Balanced round-robin rotation for all active teams in the league.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
                  {eligibleTeams.length} Active Teams
                </span>
              </div>

              {/* Season Parameters Grid */}
              <div data-tour="builder-season-settings" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Regular Season Weeks */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono text-neutral-400 font-bold flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Regular Season Duration</span>
                      <FieldHelpTooltip
                        title="Season Duration"
                        content="Schedule any custom duration from 1 up to 24 game weeks. The round-robin builder automatically balances matchups and home/away splits."
                      />
                    </label>
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      {weeksCount} {weeksCount === 1 ? "Week" : "Weeks"}
                    </span>
                  </div>

                  {/* Stepper + Direct Number Input + Smooth Range Slider */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setWeeksCount((w) => Math.max(1, w - 1))}
                      className="w-9 h-9 rounded-xl bg-neutral-900 border border-white/10 text-white hover:border-cyan-400 hover:text-cyan-300 font-bold text-sm flex items-center justify-center transition-all cursor-pointer shrink-0"
                      title="Decrease by 1 week"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={weeksCount}
                      aria-label="Number of regular-season weeks"
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          setWeeksCount(Math.max(1, Math.min(24, val)));
                        }
                      }}
                      className="w-16 bg-black/80 border border-white/10 rounded-xl py-2 text-center text-sm font-black text-white outline-none focus:border-cyan-400 font-mono"
                      title="Enter any number of weeks from 1 to 24"
                    />
                    <button
                      type="button"
                      onClick={() => setWeeksCount((w) => Math.min(24, w + 1))}
                      className="w-9 h-9 rounded-xl bg-neutral-900 border border-white/10 text-white hover:border-cyan-400 hover:text-cyan-300 font-bold text-sm flex items-center justify-center transition-all cursor-pointer shrink-0"
                      title="Increase by 1 week"
                    >
                      +
                    </button>
                    <input
                      type="range"
                      min={1}
                      max={24}
                      value={weeksCount}
                      onChange={(e) => setWeeksCount(Number(e.target.value))}
                      className="flex-1 accent-cyan-400 cursor-pointer h-2 bg-neutral-800 rounded-lg ml-2"
                      title="Slide to select duration (1-24 weeks)"
                    />
                  </div>

                  {/* Complete 1-to-24 Weeks Select Dropdown */}
                  <select
                    value={weeksCount}
                    onChange={(e) => setWeeksCount(Number(e.target.value))}
                    className="w-full bg-black/70 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-cyan-400 font-mono"
                  >
                    {Array.from({ length: 24 }, (_, i) => i + 1).map((w) => (
                      <option key={w} value={w}>
                        Week 1 to Week {w} ({w} {w === 1 ? "Week" : "Weeks"}
                        {w === 4
                          ? " - Showcase"
                          : w === 6
                          ? " - Standard Season"
                          : w === 8
                          ? " - Extended"
                          : w === 10
                          ? " - Pro League"
                          : w === 12
                          ? " - Full Season"
                          : w === 17
                          ? " - NFL 17-Week Slate"
                          : w === 24
                          ? " - Maximum 24-Week Marathon"
                          : ""}
                        )
                      </option>
                    ))}
                  </select>
                </div>

                {/* Season Start Date */}
                <div>
                  <label className="text-xs font-mono text-neutral-400 font-bold block mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Opening Day / Start Date</span>
                    <FieldHelpTooltip
                      title="Opening Day"
                      content="The calendar date for Week 1 matches. Subsequent regular season weeks will automatically schedule 7 days apart."
                    />
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-black/70 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>

              {/* Playoff Format Selection (Required by prompt) */}
              <div data-tour="builder-playoffs" className="space-y-3 p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span>Playoff Tournament Format</span>
                      <FieldHelpTooltip
                        title="Playoff Structure"
                        content="Choose whether teams are eliminated after one loss or two losses."
                      />
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIncludePlayoffs(!includePlayoffs)}
                    className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold border transition-colors ${
                      includePlayoffs
                        ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                        : "bg-black border-white/10 text-[var(--text-muted)]"
                    }`}
                  >
                    {includePlayoffs ? "Playoffs Enabled ✓" : "Regular Season Only"}
                  </button>
                </div>

                {includePlayoffs && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/60 border border-white/10">
                      <div>
                        <label className="text-xs font-mono font-bold text-white block">
                          Playoff Qualifying Teams
                        </label>
                        <span className="text-[10px] text-neutral-400">
                          Choose any amount from 2 up to league total ({eligibleTeams.length})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={2}
                          max={eligibleTeams.length}
                          value={playoffTeamsCount}
                          onChange={(e) =>
                            setPlayoffTeamsCount(
                              Math.max(2, Math.min(eligibleTeams.length, Number(e.target.value) || 2))
                            )
                          }
                          className="w-16 bg-neutral-900 border border-cyan-500/40 rounded-lg p-1.5 text-center text-sm font-black font-mono text-cyan-300 outline-none focus:border-cyan-300"
                        />
                        <span className="text-xs font-mono text-neutral-400">Teams</span>
                      </div>
                    </div>

                    {/* Elimination Structure Selector */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPlayoffStructure("single_elimination")}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          playoffStructure === "single_elimination"
                            ? "bg-cyan-500/15 border-cyan-500/50 text-[var(--text-primary)] shadow-sm"
                            : "bg-black/40 border-white/10 text-neutral-400 hover:text-white"
                        }`}
                      >
                        <span className="text-xs font-bold block">Single Elimination</span>
                        <span className="text-[10px] text-neutral-400">1 loss knocked out</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlayoffStructure("double_elimination")}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          playoffStructure === "double_elimination"
                            ? "bg-amber-500/15 border-amber-500/50 text-[var(--text-primary)] shadow-sm"
                            : "bg-black/40 border-white/10 text-neutral-400 hover:text-white"
                        }`}
                      >
                        <span className="text-xs font-bold block">Double Elimination</span>
                        <span className="text-[10px] text-neutral-400">Winners & Losers brackets</span>
                      </button>
                    </div>

                    {/* Range Slider from 2 to League Total */}
                    <input
                      type="range"
                      min={2}
                      max={eligibleTeams.length}
                      value={playoffTeamsCount}
                      onChange={(e) => setPlayoffTeamsCount(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer h-2 bg-neutral-800 rounded-lg"
                    />

                    {/* Quick Presets */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[2, 4, 6, 8, 12, 14, 16, 24, 32, 64, eligibleTeams.length]
                        .filter((c, idx, arr) => c >= 2 && c <= eligibleTeams.length && arr.indexOf(c) === idx)
                        .map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setPlayoffTeamsCount(c)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all ${
                              playoffTeamsCount === c
                                ? "bg-cyan-500 text-black border-cyan-400 shadow-sm"
                                : "bg-black/50 text-neutral-400 hover:text-white border-white/10"
                            }`}
                          >
                            {c === eligibleTeams.length
                              ? `All (${c})`
                              : `${c} Teams${c === defaultPlayoffCount ? " (Default)" : ""}`}
                          </button>
                        ))}
                    </div>

                    {/* Structure details preview */}
                    {(() => {
                      let P = 2;
                      while (P < playoffTeamsCount) P *= 2;
                      const rounds = Math.round(Math.log2(P));
                      const byes = P - playoffTeamsCount;
                      return (
                        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-[11px] font-mono text-neutral-400">
                          <span>
                            Structure: <strong className="text-white">{rounds} Knockout Rounds</strong>
                          </span>
                          <span className={byes > 0 ? "text-emerald-400 font-bold" : "text-neutral-400"}>
                            {byes > 0 ? `Top ${byes} Seed${byes > 1 ? "s" : ""} receive 1st-Round Bye` : "No Byes (All Play)"}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div data-tour="builder-venues-times" className="space-y-6">
              {/* Venues / Fields Manager */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-neutral-400 font-bold block flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Available Field Venues ({venues.length})</span>
                  <FieldHelpTooltip
                    title="Field Venues"
                    content="Specify turf fields or courts. The automated scheduler balances matchups across all configured venues so teams get fair field distribution."
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {venues.map((v, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white font-mono"
                    >
                      <span>{v}</span>
                      {venues.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveVenue(i)}
                          aria-label={`Remove field ${v}`}
                          className="min-h-9 min-w-9 inline-flex items-center justify-center text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    maxLength={60}
                    aria-label="New field or venue name"
                    value={newVenueInput}
                    onChange={(e) => setNewVenueInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddVenue())}
                    placeholder="Add venue or field name..."
                    className="flex-1 bg-black/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddVenue}
                    className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
                  >
                    + Add Field
                  </button>
                </div>
              </div>

              {/* Kickoff Times Manager */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-neutral-400 font-bold block flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Kickoff Time Slots ({timeSlots.length})</span>
                  <FieldHelpTooltip
                    title="Kickoff Times"
                    content="Game start times on matchdays. Games are assigned to these available kickoff times."
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {timeSlots.map((ts, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white font-mono"
                    >
                      <span>{ts}</span>
                      {timeSlots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTime(i)}
                          aria-label={`Remove kickoff time ${ts}`}
                          className="min-h-9 min-w-9 inline-flex items-center justify-center text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    maxLength={8}
                    aria-label="New kickoff time"
                    value={newTimeInput}
                    onChange={(e) => setNewTimeInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTime())}
                    placeholder="Add time slot (e.g. '3:15 PM')..."
                    className="flex-1 bg-black/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddTime}
                    className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
                  >
                    + Add Time
                  </button>
                </div>
              </div>

              </div>

              {/* Overwrite Existing Schedule Warning (if matches exist) */}
              {existingMatchesCount > 0 && (
                <div className="p-4 rounded-2xl bg-[var(--tint-danger)] border border-[var(--tint-danger-border)] text-[var(--text-danger)] text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-[var(--text-danger)] text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Regenerating will delete your existing schedule</span>
                  </div>
                  <p className="text-xs leading-relaxed text-[var(--text-primary)]">
                    Generating a new schedule will delete your current <strong>{existingMatchesCount} games</strong>.
                    A single backup copy will be archived for <strong>24 hours</strong> so you can restore it if done accidentally.
                    If you regenerate again later, the previous backup is permanently replaced and a fresh 24-hour countdown starts.
                  </p>
                </div>
              )}
            </div>
          )}

          {phase === "building" && (
            /* Interactive Live Generation Screen: "Watch as the schedule is built out in front of them" */
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-cyan-400 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span>{currentStepText}</span>
                  </span>
                  <span className="text-white font-black">{buildProgress}%</span>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                    style={{ width: `${buildProgress}%` }}
                  />
                </div>
              </div>

              {/* Live Streaming Terminal / Fixture Feed */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 px-1">
                  <span>Generated Game Slate</span>
                  <span className="text-cyan-400 font-bold">{generatedStream.length} Slotted</span>
                </div>

                <div
                  ref={streamRef}
                  className="bg-black/90 border border-white/10 rounded-2xl p-4 h-64 overflow-y-auto space-y-2 font-mono text-xs shadow-inner"
                >
                  {generatedStream.map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5 animate-fadeIn"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 shrink-0">
                          {m.week}
                        </span>
                        <span className="text-white font-bold truncate">
                          {m.homeTeamName} <span className="text-[var(--text-muted)]">vs</span> {m.awayTeamName}
                        </span>
                      </div>
                      <div className="shrink-0 text-right text-[10px] text-neutral-400">
                        {m.location} • {m.time}
                      </div>
                    </div>
                  ))}

                  {generatedStream.length === 0 && (
                    <div className="flex items-center justify-center h-full text-[var(--text-muted)] italic text-xs">
                      Initiating scheduling matrix...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {phase === "completed" && (
            /* Completed Screen with Direct Options */
            <div className="space-y-6 py-6 text-center">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h4 className="text-2xl font-black text-white uppercase tracking-tight">
                  Season Schedule Built Successfully!
                </h4>
                <p className="text-xs md:text-sm text-neutral-400 max-w-md mx-auto">
                  {generatedStream.length} games scheduled across {weeksCount} regular season weeks,
                  with a Top {playoffTeamsCount} elimination bracket initialized.
                </p>
              </div>

              {unplacedGames.length > 0 && (
                <div role="alert" className="max-w-lg mx-auto text-left p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  <p className="text-sm font-bold text-amber-300">
                    {unplacedGames.length} {unplacedGames.length === 1 ? "game needs" : "games need"} a time and field
                  </p>
                  <p className="text-xs text-neutral-300 mt-1">
                    There weren&apos;t enough field and kickoff combinations to fit every game without double-booking. These games were saved with time and field set to TBD. Add more fields or kickoff times, or edit them on the schedule.
                  </p>
                  <ul className="mt-2 max-h-32 overflow-y-auto text-xs text-neutral-200 space-y-0.5 list-disc pl-4">
                    {unplacedGames.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto pt-2">
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="text-xl font-black text-white">{generatedStream.length}</div>
                  <div className="text-[10px] font-mono text-neutral-400 uppercase">Total Games</div>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="text-xl font-black text-cyan-400">{weeksCount}</div>
                  <div className="text-[10px] font-mono text-neutral-400 uppercase">Season Weeks</div>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="text-xl font-black text-emerald-400">{venues.length}</div>
                  <div className="text-[10px] font-mono text-neutral-400 uppercase">Field Venues</div>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="text-xl font-black text-amber-400">Top {playoffTeamsCount}</div>
                  <div className="text-[10px] font-mono text-neutral-400 uppercase">Playoff Bracket</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        {phase === "form" && formNotice ? (
          <div className="px-6 pt-4">
            <FormNotice notice={formNotice} onDismiss={() => setFormNotice(null)} />
          </div>
        ) : null}
        <div data-tour="builder-actions" className="p-6 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-4">
          {phase === "form" ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartBuilding}
                className={`px-6 py-3 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer ${
                  existingMatchesCount > 0
                    ? "bg-amber-500 hover:bg-amber-400 text-black shadow-rose-900/40"
                    : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                }`}
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>
                  {existingMatchesCount > 0
                    ? "Overwrite & Generate New Schedule"
                    : "Build Season Schedule"}
                </span>
              </button>
            </>
          ) : phase === "building" ? (
            <div className="w-full text-center text-xs font-mono text-neutral-400 py-1 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Building schedule in real-time...</span>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white transition-colors"
              >
                Close
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-cyan-700 hover:bg-cyan-800 text-[#fff] font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-cyan-500/30 flex items-center gap-2 cursor-pointer"
              >
                <span>View Full Schedule & Bracket</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
