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
          ? "grid grid-cols-3 items-center content-center gap-2 md:gap-4 flex-1 min-h-0 max-w-4xl mx-auto w-full"
          : "grid grid-cols-3 items-center content-center gap-2 md:gap-4 flex-1 min-h-0 max-w-4xl mx-auto w-full"
      }
    >
      {playTypes.map(({ type, icon, label }) => (
        <button
          key={type}
          type="button"
          onClick={() => onSelect(type)}
          style={variant === "async" && accentColor ? { borderColor: `${accentColor}80` } : undefined}
          className={
            variant === "async"
              ? `h-24 sm:h-28 md:h-36 px-2 md:px-4 rounded-xl md:rounded-2xl bg-white dark:bg-neutral-900 border-2 ${
                  type === "Pass"
                    ? "border-blue-200 dark:border-blue-500/30 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    : type === "Run"
                    ? "border-emerald-200 dark:border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    : "border-amber-200 dark:border-amber-500/30 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                } font-black text-sm md:text-xl uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 md:gap-3 transition-all shadow-sm hover:shadow-lg cursor-pointer group`
              : `h-24 sm:h-28 md:h-36 bg-white dark:bg-neutral-900 border-2 ${
                  type === "Pass"
                    ? "border-blue-200 dark:border-blue-500/30 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    : type === "Run"
                    ? "border-emerald-200 dark:border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    : "border-amber-200 dark:border-amber-500/30 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                } rounded-xl md:rounded-2xl p-2 sm:p-3 md:p-5 flex flex-col items-center justify-center gap-1.5 md:gap-3 transition-all group shadow-sm hover:shadow-lg cursor-pointer`
          }
        >
          <span
            aria-hidden="true"
            className={`${variant === "async" ? "text-2xl md:text-4xl" : "text-3xl sm:text-4xl md:text-5xl"} ${type === "Pass" ? "text-blue-700 dark:text-blue-300" : type === "Run" ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"} group-hover:scale-110 transition-transform`}
          >
            {type === "Run" && variant === "async" ? "⚡" : icon}
          </span>
          <span
            className={`font-black ${variant === "sync" ? "text-[11px] sm:text-sm md:text-xl" : ""} ${type === "Pass" ? "text-blue-700 dark:text-blue-300" : type === "Run" ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}
          >
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
