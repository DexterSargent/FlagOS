"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Flag, Shield } from "lucide-react";
import {
  PENALTY_CATALOG,
  PenaltyDefinition,
  formatPenaltyStatement,
} from "@/lib/playSentenceFormatter";
import { sortRosterWithNumbers } from "@/lib/playerNumberHelper";

interface PenaltyWizardStepProps {
  possessionTeamName: string;
  defendingTeamName: string;
  currentDown: number;
  downsPerSeries?: number;
  offenseRoster: string[];
  defenseRoster: string[];
  playerNumbers?: Record<string, string>;
  accentColor?: string;
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
  playerNumbers = {},
  accentColor,
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
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

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
    <div className="flex h-full min-h-0 flex-col gap-1 overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => activeStep === 1 ? onCancel() : setActiveStep((activeStep - 1) as 1 | 2)}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-400 transition-colors hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          {activeStep === 1 ? "Back to Play Type" : "Back"}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-amber-500">Penalty</span>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-mono font-bold text-amber-500">
            STEP {activeStep} / 3
          </span>
        </div>
      </div>

      {activeStep === 1 && (
        <>
          <div className="flex min-h-0 flex-1 flex-col gap-1">
            <section className="shrink-0 space-y-1">
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
                Infraction committed by
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSideSwitch("defense")}
                  className={`flex items-center justify-between rounded-xl border px-2.5 py-1 text-left transition-all ${
                    side === "defense"
                      ? "border-amber-500 bg-amber-500/20 font-black text-white"
                      : "border-white/10 bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Shield className="h-4 w-4 shrink-0 text-amber-500" />
                    <span className="min-w-0">
                      <span className="block text-[9px] font-bold uppercase text-neutral-400">Defense</span>
                      <span className="block truncate text-xs font-bold text-white">{defendingTeamName}</span>
                    </span>
                  </span>
                  {side === "defense" && <Check className="h-4 w-4 shrink-0 text-amber-500" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleSideSwitch("offense")}
                  className={`flex items-center justify-between rounded-xl border px-2.5 py-1 text-left transition-all ${
                    side === "offense"
                      ? "border-amber-500 bg-amber-500/20 font-black text-white"
                      : "border-white/10 bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Flag className="h-4 w-4 shrink-0 text-amber-500" />
                    <span className="min-w-0">
                      <span className="block text-[9px] font-bold uppercase text-neutral-400">Offense</span>
                      <span className="block truncate text-xs font-bold text-white">{possessionTeamName}</span>
                    </span>
                  </span>
                  {side === "offense" && <Check className="h-4 w-4 shrink-0 text-amber-500" />}
                </button>
              </div>
            </section>

            <section className="flex min-h-0 flex-1 flex-col gap-1">
              <label className="block shrink-0 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
                Select infraction ({side})
              </label>
              <div className="grid min-h-0 grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-4">
                {availablePenalties.map((pDef) => {
                  const isSelected = selectedPenaltyId === pDef.id;
                  return (
                    <button
                      key={pDef.id}
                      type="button"
                      onClick={() => handleSelectPenalty(pDef)}
                      className={`flex min-h-10 flex-col justify-between gap-0.5 rounded-lg border p-1.5 text-left transition-all sm:p-2 ${
                        isSelected
                          ? "border-amber-500 bg-amber-500/15 text-white shadow-md"
                          : "border-white/10 bg-neutral-900 text-neutral-300 hover:border-amber-500/40 hover:bg-neutral-800"
                      }`}
                    >
                      <span className="line-clamp-2 text-[11px] font-bold leading-tight sm:text-xs">
                        {pDef.name}
                      </span>
                      <span className="flex items-center gap-1.5 [@media(max-height:450px)]:hidden">
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300">
                          {pDef.defaultYards} YDS
                        </span>
                        <span className="truncate text-[9px] font-mono uppercase text-neutral-400">
                          {pDef.defaultDownResult === "automatic_first_down"
                            ? "Auto 1st"
                            : pDef.defaultDownResult === "loss_of_down"
                            ? "Loss of Down"
                            : "Replay"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
          <button
            type="button"
            onClick={() => setActiveStep(2)}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#3CA505] px-4 py-2 text-sm font-black text-black shadow-md transition-colors hover:bg-[#4abb0b]"
          >
            Continue to enforcement <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {activeStep === 2 && (
        <>
          <div className="flex min-h-0 flex-1 items-center">
            <div className="w-full">
              <p className="mb-2 text-center text-xs font-bold text-neutral-400">
                {selectedDef?.name ?? "Penalty"} · {penalizedTeamName}
              </p>
              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 md:gap-3">
              <section className="space-y-1">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
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
                      onClick={() => setEnforcement(opt.id as "accepted" | "declined" | "offset")}
                      className={`rounded-lg border px-1 py-2 text-center text-[10px] font-bold transition-all sm:text-xs ${
                        enforcement === opt.id
                          ? "border-amber-500 bg-amber-500 text-black shadow-md"
                          : "border-white/10 bg-neutral-900 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-1">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
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
                      className={`rounded-lg border px-1 py-2 text-center text-[10px] font-bold transition-all sm:text-xs ${
                        yards === opt.yardsVal
                          ? "border-cyan-500 bg-cyan-500 text-black shadow-md"
                          : "border-white/10 bg-neutral-900 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-1">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
                  Down impact
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
                      onClick={() => setDownResult(opt.id as "automatic_first_down" | "repeat_down" | "loss_of_down")}
                      className={`rounded-lg border px-1 py-2 text-center text-[10px] font-bold transition-all sm:text-xs ${
                        downResult === opt.id
                          ? "border-white bg-white text-black shadow-md"
                          : "border-white/10 bg-neutral-900 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className="rounded-xl border border-white/10 bg-neutral-900 px-4 py-2 text-xs font-bold text-neutral-300 hover:bg-neutral-800"
            >
              Back to infraction
            </button>
            <button
              type="button"
              onClick={() => setActiveStep(3)}
              className="flex items-center gap-2 rounded-xl bg-[#3CA505] px-4 py-2 text-sm font-black text-black shadow-md transition-colors hover:bg-[#4abb0b]"
            >
              Continue to player <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}

      {activeStep === 3 && (
        <>
          <div
            className="shrink-0 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-neutral-900 to-black p-2"
            style={accentColor ? { borderColor: `${accentColor}80` } : undefined}
          >
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 shrink-0 text-amber-500" />
              <p className="line-clamp-2 text-xs font-bold leading-snug text-white">{liveStatement}</p>
            </div>
          </div>
          <section className="flex min-h-0 flex-1 flex-col gap-1">
            <label className="flex shrink-0 items-center justify-between gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
              <span>Athlete responsible (optional)</span>
              <span className="font-normal text-neutral-500">
                Selected:{" "}
                <strong className="text-white">
                  {player !== "TEAM" && playerNumbers[player] ? `#${playerNumbers[player]} ` : ""}
                  {player}
                </strong>
              </span>
            </label>
            <div className="grid min-h-0 grid-cols-2 content-start gap-1.5 overflow-y-auto sm:grid-cols-4 [@media(max-height:450px)]:grid-cols-6">
              <button
                type="button"
                onClick={() => setPlayer("TEAM")}
                className={`rounded-lg border px-2 py-1.5 text-left text-[10px] font-bold transition-all ${
                  player === "TEAM"
                    ? "border-amber-500 bg-amber-500 text-black"
                    : "border-white/10 bg-neutral-900 text-neutral-400 hover:text-white"
                }`}
              >
                TEAM Infraction
              </button>
              {sortRosterWithNumbers(currentRoster.filter((p) => p !== "TEAM"), playerNumbers).map((pName) => {
                const pNum = playerNumbers[pName];
                return (
                  <button
                    key={pName}
                    type="button"
                    aria-label={pName}
                    onClick={() => setPlayer(pName)}
                    className={`flex min-w-0 items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[10px] font-bold transition-all ${
                      player === pName
                        ? "border-amber-500 bg-amber-500 text-black"
                        : "border-white/10 bg-neutral-900 text-neutral-400 hover:text-white"
                    }`}
                  >
                    {pNum && (
                      <span className={`shrink-0 rounded px-1 py-0.5 font-mono text-[9px] font-bold ${
                        player === pName ? "bg-black/15 text-black" : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                      }`}>
                        #{pNum}
                      </span>
                    )}
                    <span className="truncate">{pName}</span>
                  </button>
                );
              })}
            </div>
          </section>
          <div className="flex shrink-0 items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className="rounded-xl border border-white/10 bg-neutral-900 px-4 py-2 text-xs font-bold text-neutral-300 hover:bg-neutral-800"
            >
              Back to enforcement
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-black uppercase tracking-wider text-black shadow-lg transition-all cursor-pointer"
            >
              <Flag className="h-4 w-4 fill-current" />
              Enforce penalty
            </button>
          </div>
        </>
      )}
    </div>
  );
}
