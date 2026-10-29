"use client";

import React, { memo } from "react";
import { Timer } from "lucide-react";

export interface PlayByPlayTimeoutModalProps {
  isActive: boolean;
  timeoutClock: number;
  onEndTimeout: () => void;
}

export const PlayByPlayTimeoutModal = memo(function PlayByPlayTimeoutModal({
  isActive,
  timeoutClock,
  onEndTimeout,
}: PlayByPlayTimeoutModalProps) {
  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <Timer className="w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 text-white mb-4 sm:mb-8 animate-pulse" />
      <h2 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-widest text-amber-500 mb-2 sm:mb-4 text-center">
        Timeout
      </h2>
      <div className="text-6xl sm:text-8xl md:text-9xl font-mono font-black mb-6 sm:mb-8 text-white">
        {timeoutClock}
      </div>
      <button
        type="button"
        onClick={onEndTimeout}
        className="py-3 px-6 sm:py-4 sm:px-8 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-base sm:text-xl rounded-2xl transition-colors cursor-pointer"
      >
        End Timeout
      </button>
    </div>
  );
});

export default PlayByPlayTimeoutModal;

