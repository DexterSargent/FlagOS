"use client";

import { useEffect, useState } from "react";
import { FLAGOS_LOADER_PINWHEEL } from "@/lib/brandTokens";
import { RotateCcw } from "lucide-react";

export default function FlagOSLoader({
  className = "",
  size = 80,
  label = "Loading",
  timeoutSeconds = 6,
  onRetry,
}: {
  className?: string;
  size?: number;
  label?: string;
  timeoutSeconds?: number;
  onRetry?: () => void;
}) {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!timeoutSeconds || timeoutSeconds <= 0) return;
    const timer = setTimeout(() => setIsSlow(true), timeoutSeconds * 1000);
    return () => clearTimeout(timer);
  }, [timeoutSeconds]);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <span
        role="status"
        aria-label={label}
        className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={FLAGOS_LOADER_PINWHEEL}
          alt=""
          aria-hidden="true"
          width={440}
          height={440}
          className="h-full w-full object-contain"
        />
        <span className="sr-only">{label}</span>
      </span>

      {isSlow && (
        <div className="mt-4 flex flex-col items-center gap-2 animate-in fade-in duration-300 px-4 text-center">
          <p className="text-xs text-slate-500 dark:text-neutral-400 font-medium">
            Connection is taking longer than expected...
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors border border-cyan-500/20 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}
    </div>
  );
}
