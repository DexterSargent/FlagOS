"use client";

import React, { useState, useMemo } from "react";
import {
  Flag,
  Shield,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Users,
  Check,
} from "lucide-react";
import {
  PENALTY_CATALOG,
  PenaltyDefinition,
  formatPenaltyStatement,
  getOrdinal,
} from "@/lib/playSentenceFormatter";

interface PenaltyWizardStepProps {
  possessionTeamName: string;
  defendingTeamName: string;
  currentDown: number;
  downsPerSeries?: number;
  offenseRoster: string[];
  defenseRoster: string[];
  onCancel: () => void;
  onSavePenalty: (penaltyData: {
    side: "offense" | "defense";
    penalizedTeamName: string;
    penaltyDef: PenaltyDefinition;
    yards: number;
    enforcement: "accepted" | "declined" | "offset";
    downResult: "automatic_first_down" | "repeat_down" | "loss_of_down" | "play_stands";
    player?: string;
    statement: string;
  }) => void;
}

export default function PenaltyWizardStep({
  possessionTeamName,
  defendingTeamName,
  currentDown,
  downsPerSeries = 4,
  offenseRoster,
  defenseRoster,
  onCancel,
  onSavePenalty,
}: PenaltyWizardStepProps) {
  // 1. Side / Team penalized
  const [side, setSide] = useState<"defense" | "offense">("defense");

  // 2. Selected penalty
  const defaultPenalty = side === "defense" ? "dpi" : "false_start";
  const [selectedPenaltyId, setSelectedPenaltyId] = useState<string>(defaultPenalty);

  // 3. Yardage
  const [yards, setYards] = useState<number>(10);

  // 4. Enforcement
  const [enforcement, setEnforcement] = useState<"accepted" | "declined" | "offset">("accepted");

  // 5. Down impact
  const [downResult, setDownResult] = useState<
    "automatic_first_down" | "repeat_down" | "loss_of_down" | "play_stands"
  >("automatic_first_down");

  // 6. Player responsible
  const [player, setPlayer] = useState<string>("TEAM");

  // Filtered penalties for current side
  const availablePenalties = useMemo(
    () => PENALTY_CATALOG.filter((p) => p.side === side),
    [side]
  );

  const selectedDef = useMemo(
    () => PENALTY_CATALOG.find((p) => p.id === selectedPenaltyId) || availablePenalties[0],
    [selectedPenaltyId, availablePenalties]
  );

  const penalizedTeamName = side === "offense" ? possessionTeamName : defendingTeamName;
  const currentRoster = side === "offense" ? offenseRoster : defenseRoster;

  // Real-time generated play statement
  const liveStatement = useMemo(() => {
    return formatPenaltyStatement({
      teamName: penalizedTeamName,
      side,
      penaltyName: selectedDef?.name || "Penalty",
      yards,
      enforcement,
      downResult,
      currentDown,
      downsPerSeries,
      playerName: player !== "TEAM" ? player : undefined,
    });
  }, [
    penalizedTeamName,
    side,
    selectedDef,
    yards,
    enforcement,
    downResult,
    currentDown,
    downsPerSeries,
    player,
  ]);

  // Handle switching side (Defense vs Offense)
  const handleSideSwitch = (newSide: "defense" | "offense") => {
    setSide(newSide);
    const newDefault = newSide === "defense" ? "dpi" : "false_start";
    setSelectedPenaltyId(newDefault);
    const pDef = PENALTY_CATALOG.find((p) => p.id === newDefault);
    if (pDef) {
      setYards(pDef.defaultYards);
      setDownResult(pDef.defaultDownResult);
    }
    setPlayer("TEAM");
  };

  // Handle selecting a specific penalty infraction
  const handleSelectPenalty = (pDef: PenaltyDefinition) => {
    setSelectedPenaltyId(pDef.id);
    setYards(pDef.defaultYards);
    setDownResult(pDef.defaultDownResult);
  };

  const handleSubmit = () => {
    onSavePenalty({
      side,
      penalizedTeamName,
      penaltyDef: selectedDef,
      yards,
      enforcement,
      downResult,
      player: player !== "TEAM" ? player : undefined,
      statement: liveStatement,
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 content-start min-h-0 h-full gap-2 md:gap-3 max-w-6xl mx-auto w-full overflow-y-auto md:overflow-hidden animate-in zoom-in-95 duration-200">
      {/* Top Bar with Cancel */}
      <div className="md:col-span-2 flex items-center justify-between">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-neutral-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Play Type
        </button>

        <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
          <Flag className="w-3.5 h-3.5" />
          <span>Official Penalty Administration</span>
        </span>
      </div>

      {/* LIVE STATEMENT CALLOUT CARD */}
      <div className="md:col-span-2 p-2 md:p-3 rounded-xl bg-gradient-to-r from-amber-950/40 via-neutral-900 to-black border border-amber-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start gap-3 relative z-10">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Flag className="w-4 h-4" />
          </div>
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 block">
              Official Play-by-Play Statement (Preview)
            </span>
            <p className="text-xs md:text-sm font-black text-white leading-snug font-sans line-clamp-2">
              {liveStatement}
            </p>
          </div>
        </div>
      </div>

      {/* STEP 1: SELECT PENALTY SIDE (TEAM) */}
      <div className="md:col-span-2 space-y-1">
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">
          1. Infraction Committed By:
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleSideSwitch("defense")}
            className={`py-2 px-3 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${
              side === "defense"
                ? "bg-amber-500/20 border-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.25)] font-black"
                : "bg-neutral-900 border-white/10 text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <Shield className={`w-4 h-4 ${side === "defense" ? "text-amber-400" : "text-neutral-500"}`} />
              <div>
                <span className="text-[10px] uppercase block text-neutral-400 font-bold">DEFENSE</span>
                <span className="text-xs md:text-sm font-bold text-white">{defendingTeamName}</span>
              </div>
            </div>
            {side === "defense" && <Check className="w-5 h-5 text-amber-400" />}
          </button>

          <button
            type="button"
            onClick={() => handleSideSwitch("offense")}
            className={`py-2 px-3 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${
              side === "offense"
                ? "bg-amber-500/20 border-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.25)] font-black"
                : "bg-neutral-900 border-white/10 text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <Flag className={`w-4 h-4 ${side === "offense" ? "text-amber-400" : "text-neutral-500"}`} />
              <div>
                <span className="text-[10px] uppercase block text-neutral-400 font-bold">OFFENSE</span>
                <span className="text-xs md:text-sm font-bold text-white">{possessionTeamName}</span>
              </div>
            </div>
            {side === "offense" && <Check className="w-5 h-5 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* STEP 2: SELECT PENALTY INFRACTION */}
      <div className="space-y-1">
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">
          2. Select Infraction ({side.toUpperCase()}):
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-none md:max-h-36 overflow-y-auto pr-1">
          {availablePenalties.map((pDef) => {
            const isSelected = selectedPenaltyId === pDef.id;
            return (
              <button
                key={pDef.id}
                type="button"
                onClick={() => handleSelectPenalty(pDef)}
                className={`p-2 rounded-lg border text-left transition-all flex flex-col justify-between gap-0.5 cursor-pointer ${
                  isSelected
                    ? "bg-white text-black border-white shadow-lg font-black"
                    : "bg-neutral-900 border-white/10 text-neutral-300 hover:border-amber-500/40 hover:bg-neutral-800"
                }`}
              >
                <span className="text-xs font-bold leading-tight line-clamp-2">
                  {pDef.name}
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                      isSelected
                        ? "bg-black/10 text-black"
                        : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {pDef.defaultYards} YDS
                  </span>
                  <span
                    className={`text-[9px] font-mono uppercase truncate ${
                      isSelected ? "text-neutral-700" : "text-neutral-400"
                    }`}
                  >
                    {pDef.defaultDownResult === "automatic_first_down"
                      ? "Auto 1st"
                      : pDef.defaultDownResult === "loss_of_down"
                      ? "Loss of Down"
                      : "Replay"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 3: ENFORCEMENT & YARDS CONFIG */}
      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 gap-2 md:gap-3 pt-1">
        {/* Enforcement Status */}
        <div className="space-y-1">
          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">
            Enforcement
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: "accepted", label: "Accepted" },
              { id: "declined", label: "Declined" },
              { id: "offset", label: "Offset" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setEnforcement(opt.id as any)}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border ${
                  enforcement === opt.id
                    ? "bg-amber-500 text-black border-amber-500 font-black shadow-md"
                    : "bg-neutral-900 border-white/10 text-neutral-400 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Yardage Assessment */}
        <div className="space-y-1">
          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">
            Yardage
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { yardsVal: 5, label: "5 Yds" },
              { yardsVal: 10, label: "10 Yds" },
              { yardsVal: 15, label: "15 Yds" },
              { yardsVal: 0, label: "Spot" },
            ].map((opt) => (
              <button
                key={opt.yardsVal}
                type="button"
                onClick={() => setYards(opt.yardsVal)}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border ${
                  yards === opt.yardsVal
                    ? "bg-cyan-500 text-black border-cyan-500 font-black shadow-md"
                    : "bg-neutral-900 border-white/10 text-neutral-400 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Down Result */}
        <div className="space-y-1">
          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">
            Down Impact
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: "automatic_first_down", label: "Auto 1st" },
              { id: "repeat_down", label: "Replay" },
              { id: "loss_of_down", label: "Loss Down" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDownResult(opt.id as any)}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border ${
                  downResult === opt.id
                    ? "bg-white text-black border-white font-black shadow-md"
                    : "bg-neutral-900 border-white/10 text-neutral-400 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* STEP 4: PLAYER RESPONSIBLE (OPTIONAL) */}
      <div className="md:col-span-2 space-y-1">
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
          <span>Athlete Responsible (Optional):</span>
          <span className="text-[10px] text-neutral-500 font-normal">
            Selected: <strong className="text-white">{player}</strong>
          </span>
        </label>
        <div className="flex flex-wrap gap-1 overflow-y-auto md:max-h-16">
          <button
            type="button"
            onClick={() => setPlayer("TEAM")}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-all border ${
              player === "TEAM"
                ? "bg-amber-500 text-black border-amber-500 font-black"
                : "bg-neutral-900 border-white/10 text-neutral-400 hover:text-white"
            }`}
          >
            TEAM Infraction
          </button>
          {currentRoster.map((pName) => (
            <button
              key={pName}
              type="button"
              onClick={() => setPlayer(pName)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-all border ${
                player === pName
                  ? "bg-amber-500 text-black border-amber-500 font-black"
                  : "bg-neutral-900 border-white/10 text-neutral-400 hover:text-white"
              }`}
            >
              {pName}
            </button>
          ))}
        </div>
      </div>

      {/* CONFIRM & SUBMIT BUTTON */}
      <div className="md:col-span-2 pt-1">
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs md:text-sm uppercase tracking-wider transition-all shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:scale-101 active:scale-99 cursor-pointer flex items-center justify-center gap-2"
        >
          <Flag className="w-5 h-5 fill-current" />
          <span>ENFORCE PENALTY & RECORD PLAY</span>
        </button>
      </div>
    </div>
  );
}
