interface ConversionAttemptSelectorProps {
  points: 1 | 2 | null;
  isGood: boolean | null;
  onPointsChange: (points: 1 | 2) => void;
  onResultChange: (isGood: boolean) => void;
  showResultButtons?: boolean;
  variant: "sync" | "async";
  accentColor?: string;
}

export default function ConversionAttemptSelector({
  points,
  isGood,
  onPointsChange,
  onResultChange,
  showResultButtons = true,
  variant,
  accentColor,
}: ConversionAttemptSelectorProps) {
  if (variant === "sync") {
    return (
      <>
        {!points && (
          <div className="flex-1 min-h-0 flex items-center justify-center gap-3 md:gap-6">
            {[1, 2].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onPointsChange(value as 1 | 2)}
                style={accentColor ? { borderColor: `${accentColor}80` } : undefined}
                className="w-36 h-36 md:w-52 md:h-52 max-h-full bg-neutral-900 border border-white/10 hover:border-emerald-500 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center gap-2 group"
              >
                <span style={accentColor ? { color: accentColor } : undefined} className="text-5xl md:text-7xl font-black text-white group-hover:text-emerald-400">{value}</span>
                <span className="text-sm md:text-lg font-bold uppercase tracking-widest text-neutral-500">
                  From {value === 1 ? 5 : 10} Yd
                </span>
              </button>
            ))}
          </div>
        )}

        {points && showResultButtons && isGood === null && (
          <div className="flex-1 min-h-0 flex items-center justify-center gap-3 md:gap-6 animate-in slide-in-from-right-4">
            <button
              type="button"
              onClick={() => onResultChange(true)}
              className="flex-1 max-w-sm py-8 md:py-12 bg-emerald-600 rounded-2xl md:rounded-3xl font-black text-3xl md:text-4xl text-white"
            >
              GOOD
            </button>
            <button
              type="button"
              onClick={() => onResultChange(false)}
              className="flex-1 max-w-sm py-8 md:py-12 bg-neutral-800 rounded-2xl md:rounded-3xl font-black text-3xl md:text-4xl text-white border border-white/10"
            >
              NO GOOD
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:gap-3">
        {[1, 2].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onPointsChange(value as 1 | 2)}
            style={points === value && accentColor ? { backgroundColor: accentColor, borderColor: accentColor, color: "#000" } : accentColor ? { borderColor: `${accentColor}80` } : undefined}
            className={`py-3 md:py-4 px-3 rounded-xl border text-center font-black transition-all ${
              points === value
                ? "bg-emerald-500 text-black border-emerald-500 shadow-lg"
                : "bg-neutral-800 border-white/10 text-white"
            }`}
          >
            <div className="text-2xl">{value} {value === 1 ? "POINT" : "POINTS"}</div>
            <div className="text-[11px] font-normal mt-1 opacity-80">{value === 1 ? "5" : "10"} Yard Line Attempt</div>
          </button>
        ))}
      </div>

      {points && showResultButtons && (
        <div className="space-y-2 pt-1">
          <div className="flex justify-center gap-4">
            {[true, false].map((result) => (
              <button
                key={String(result)}
                type="button"
                onClick={() => onResultChange(result)}
                className={`py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border ${
                  isGood === result
                    ? result
                      ? "bg-emerald-500 text-black border-emerald-500 font-black"
                      : "bg-red-500 text-white border-red-500 font-black"
                    : "bg-neutral-800 border-white/10 text-neutral-300"
                }`}
              >
                {result ? `✓ GOOD (+${points} PTS)` : "✗ NO GOOD (0 PTS)"}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
