import type { ComponentProps, ReactNode } from "react";
import { Flag, X } from "lucide-react";
import ConversionAttemptSelector from "@/components/play-by-play/ConversionAttemptSelector";
import PenaltyWizardStep from "@/components/play-by-play/PenaltyWizardStep";
import PlayTypeSelector from "@/components/play-by-play/PlayTypeSelector";
import { getOrdinal } from "@/lib/playSentenceFormatter";

type Variant = "sync" | "async";
type PlayType = "Pass" | "Run" | "Penalty";
type ConversionPoints = 1 | 2 | null;
type PenaltyData = Parameters<ComponentProps<typeof PenaltyWizardStep>["onSavePenalty"]>[0];

type PlayEntryWizardProps =
  | {
      step: "type";
      variant: Variant;
      possession: string;
      currentDown: number;
      downsPerSeries?: number;
      onDownChange?: (down: number) => void;
      accentColor?: string;
      onSelectType: (type: PlayType) => void;
      onCancel?: () => void;
    }
  | {
      step: "penalty";
      variant: Variant;
      possessionTeamName: string;
      defendingTeamName: string;
      currentDown: number;
      downsPerSeries: number;
      offenseRoster: string[];
      defenseRoster: string[];
      playerNumbers: Record<string, string>;
      accentColor?: string;
      onCancel: () => void;
      onSavePenalty: (penaltyData: PenaltyData) => void;
    }
  | {
      step: "conversion";
      variant: Variant;
      points: ConversionPoints;
      isGood: boolean | null;
      onPointsChange: (points: Exclude<ConversionPoints, null>) => void;
      onResultChange: (isGood: boolean) => void;
      showResultButtons?: boolean;
      accentColor?: string;
      children: ReactNode;
    };

export default function PlayEntryWizard(props: PlayEntryWizardProps) {
  if (props.step === "type") {
    if (props.variant === "sync") {
      return (
        <div className="flex flex-col flex-1 min-h-0 gap-2 md:gap-3 max-w-6xl mx-auto w-full">
          {props.onDownChange && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl bg-neutral-900 border border-white/10 shrink-0 shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">Offense:</span>
                <span className="text-xs sm:text-sm font-black uppercase tracking-wide text-white">
                  {props.possession}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 hidden sm:inline">Down:</span>
                <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-xl border border-white/10">
                  {Array.from({ length: props.downsPerSeries || 4 }, (_, i) => i + 1).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => props.onDownChange?.(d)}
                      aria-label={`${getOrdinal(d)} Down`}
                      className={`px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        props.currentDown === d
                          ? "bg-white text-black shadow-md font-black"
                          : "text-neutral-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {getOrdinal(d)}<span className="hidden sm:inline"> Down</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <PlayTypeSelector onSelect={props.onSelectType} variant="sync" accentColor={props.accentColor} />
        </div>
      );
    }

    return (
      <div className="shrink-0 md:shrink md:flex-1 min-h-48 bg-neutral-900 border border-white/10 rounded-2xl p-3 md:p-5 flex flex-col gap-3 md:gap-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-2 shrink-0">
          <div>
            <h3 className="text-base sm:text-xl font-black uppercase text-white">Select Play Type</h3>
            <p className="text-xs text-neutral-400">
              {props.possession} • {getOrdinal(props.currentDown)} Down
            </p>
          </div>
          <div className="flex items-center gap-2">
            {props.onCancel && (
              <button
                type="button"
                onClick={() => props.onCancel?.()}
                aria-label="Cancel play"
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        <PlayTypeSelector onSelect={props.onSelectType} variant="async" accentColor={props.accentColor} />
      </div>
    );
  }

  if (props.step === "penalty") {
    const penaltyWizard = (
      <PenaltyWizardStep
        possessionTeamName={props.possessionTeamName}
        defendingTeamName={props.defendingTeamName}
        currentDown={props.currentDown}
        downsPerSeries={props.downsPerSeries}
        offenseRoster={props.offenseRoster}
        defenseRoster={props.defenseRoster}
        playerNumbers={props.playerNumbers}
        accentColor={props.accentColor}
        onCancel={props.onCancel}
        onSavePenalty={props.onSavePenalty}
      />
    );

    return props.variant === "async" ? (
      <div className="shrink-0 md:shrink md:flex-1 md:min-h-0 bg-neutral-900 border border-amber-500/30 rounded-2xl p-2 md:p-3 md:overflow-y-auto shadow-2xl">
        {penaltyWizard}
      </div>
    ) : (
      penaltyWizard
    );
  }

  return props.variant === "sync" ? (
    <div className="flex flex-col flex-1 min-h-0 gap-2 md:gap-3 max-w-7xl mx-auto w-full animate-in zoom-in-95 duration-200">
      <h3
        className="text-base md:text-xl font-black text-emerald-400 flex items-center justify-center gap-2 bg-emerald-950/30 py-2 md:py-3 rounded-2xl border border-emerald-500/30 shrink-0"
        style={props.accentColor ? { borderColor: `${props.accentColor}80` } : undefined}
      >
        <Flag className="w-5 h-5" /> POINT AFTER ATTEMPT
      </h3>
      <ConversionAttemptSelector
        points={props.points}
        isGood={props.isGood}
        onPointsChange={props.onPointsChange}
        onResultChange={props.onResultChange}
        showResultButtons={props.showResultButtons}
        accentColor={props.accentColor}
        variant="sync"
      />
      {props.children}
    </div>
  ) : (
    <div
      className="shrink-0 md:shrink md:flex-1 md:min-h-0 bg-neutral-900 border border-emerald-500/40 rounded-2xl p-3 md:p-4 flex flex-col gap-3 md:gap-4 shadow-2xl md:overflow-y-auto"
      style={props.accentColor ? { borderColor: `${props.accentColor}80` } : undefined}
    >
      <div className="space-y-1 text-center">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
          Touchdown Scored!
        </span>
        <h3 className="text-lg sm:text-2xl font-black uppercase text-white">Point After Conversion (PAT)</h3>
        <p className="text-xs text-neutral-400">Select attempt value and result</p>
      </div>
      <ConversionAttemptSelector
        points={props.points}
        isGood={props.isGood}
        onPointsChange={props.onPointsChange}
        onResultChange={props.onResultChange}
        showResultButtons={props.showResultButtons}
        accentColor={props.accentColor}
        variant="async"
      />
      {props.children}
    </div>
  );
}
