interface PlayTypeSelectorProps {
  onSelect: (type: "Pass" | "Run" | "Penalty") => void;
  variant: "sync" | "async";
  accentColor?: string;
}

const playTypes = [
  { type: "Pass", icon: "🏈", label: "PASS" },
  { type: "Run", icon: "🏃‍♀️", label: "RUN" },
  { type: "Penalty", icon: "🚩", label: "PENALTY" },
] as const;

export default function PlayTypeSelector({ onSelect, variant, accentColor }: PlayTypeSelectorProps) {
  return (
    <div
      className={
        variant === "async"
          ? "grid grid-cols-3 gap-2 md:gap-4 flex-1 min-h-0"
          : "flex flex-col md:grid md:grid-cols-3 gap-2 md:gap-4 flex-1 min-h-0 max-w-6xl mx-auto w-full overflow-visible pb-2 md:pb-0"
      }
    >
      {playTypes.map(({ type, icon, label }) => (
        <button
          key={type}
          type="button"
          onClick={() => onSelect(type)}
          style={accentColor ? { borderColor: `${accentColor}80`, boxShadow: `0 0 16px ${accentColor}18` } : undefined}
          className={
            variant === "async"
              ? `min-h-28 md:min-h-0 py-3 md:py-5 px-2 md:px-4 rounded-xl md:rounded-2xl ${
                  type === "Pass"
                    ? "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 hover:border-emerald-500"
                    : type === "Run"
                    ? "bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 hover:border-cyan-500"
                    : "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 hover:border-amber-500 shadow-lg shadow-amber-500/5"
                } border text-white font-black text-sm md:text-xl uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 md:gap-3 transition-all cursor-pointer group`
              : `min-h-24 md:min-h-0 bg-neutral-900 border-2 border-white/5 ${
                  type === "Pass"
                    ? "hover:border-blue-500 hover:bg-blue-900/20"
                    : type === "Run"
                    ? "hover:border-emerald-500 hover:bg-emerald-900/20"
                    : "hover:border-amber-500 hover:bg-amber-900/20"
                } rounded-2xl md:rounded-3xl p-3 md:p-5 flex flex-row md:flex-col items-center justify-start md:justify-center gap-3 md:gap-4 transition-all group shadow-xl shrink-0`
          }
        >
          <span
            aria-hidden="true"
            style={accentColor ? { color: accentColor } : undefined}
            className={`${variant === "async" ? "text-2xl md:text-4xl" : "text-4xl md:text-6xl"} group-hover:scale-110 transition-transform`}
          >
            {type === "Run" && variant === "async" ? "⚡" : icon}
          </span>
          <span style={accentColor ? { color: accentColor } : undefined} className={variant === "sync" ? "font-black text-xl md:text-3xl" : ""}>
            {variant === "async" && type === "Pass"
              ? "PASS PLAY"
              : variant === "async" && type === "Run"
              ? "RUN PLAY"
              : label}
          </span>
        </button>
      ))}
    </div>
  );
}
