"use client";

import React, { memo } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";

export interface PlayByPlayResetModalProps {
  isOpen: boolean;
  isResetting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const PlayByPlayResetModal = memo(function PlayByPlayResetModal({
  isOpen,
  isResetting,
  onClose,
  onConfirm,
}: PlayByPlayResetModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#0B0F19] border-2 border-red-500/50 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        <div className="absolute top-3 right-3 z-10">
          <PageGuideButton />
        </div>
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 shadow-lg shadow-red-500/10">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <span className="px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
          Permanent & Irreversible Action
        </span>

        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-2">
          Reset Game to Pre-Game?
        </h2>

        <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
          Are you sure you want to completely reset this game? This will clear the live game session back to before kickoff.
        </p>

        <div className="w-full bg-red-950/20 border border-red-500/20 rounded-2xl p-4 text-left text-xs sm:text-sm text-neutral-300 space-y-2.5 mb-6">
          <div className="flex items-start gap-2">
            <span className="text-red-400 font-bold shrink-0 mt-0.5">•</span>
            <span>
              <strong>All live stats and plays will be deleted:</strong> Every pass, run, touchdown, sack, flag, and interception recorded for this game will be permanently erased.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-red-400 font-bold shrink-0 mt-0.5">•</span>
            <span>
              <strong>Scores reset to 0 – 0:</strong> Both team scores, timeouts, down &amp; distance, and game clock will return to pre-game starting values.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-red-400 font-bold shrink-0 mt-0.5">•</span>
            <span>
              <strong>Reverts to Scheduled:</strong> Game status will be restored to &quot;Scheduled&quot; (Pre-Game).
            </span>
          </div>
        </div>

        <div data-tour="reset-game-actions" className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            type="button"
            disabled={isResetting}
            onClick={onClose}
            className="flex-1 py-3.5 px-5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-2xl border border-white/10 transition-colors cursor-pointer"
          >
            Cancel / Keep Game
          </button>
          <button
            type="button"
            disabled={isResetting}
            onClick={onConfirm}
            className="flex-1 py-3.5 px-5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isResetting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Resetting...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Permanently Reset</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

export default PlayByPlayResetModal;

