/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { memo } from "react";
import { Flag, X } from "lucide-react";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";
import { formatPlaySentence } from "@/lib/playSentenceFormatter";

export interface PlayByPlayLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  matchPlaysList: any[];
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId: string;
  downsPerSeries: number;
  periodType: string;
}

function getOrdinal(n: number) {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  if (n === 4) return "4th";
  return `${n}th`;
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export const PlayByPlayLogDrawer = memo(function PlayByPlayLogDrawer({
  isOpen,
  onClose,
  matchPlaysList,
  homeTeamName,
  awayTeamName,
  homeTeamId,
  downsPerSeries,
  periodType,
}: PlayByPlayLogDrawerProps) {
  if (!isOpen) return null;

  return (
    <div
      data-tour="scoreboard-drawers"
      className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in"
    >
      <div className="bg-neutral-950 border-l border-white/10 w-full max-w-lg h-full p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-black uppercase text-white">Live Game Play Log</h3>
          </div>
          <div className="flex items-center gap-2">
            <PageGuideButton />
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-2.5">
          {matchPlaysList.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-muted)] text-sm italic">
              No plays logged yet.
            </div>
          ) : (
            matchPlaysList.map((p, idx) => {
              const sentence = formatPlaySentence(p, {
                homeTeamName,
                awayTeamName,
                homeTeamId,
                downsPerSeries,
              });
              const isPenalty = p.playType === "Penalty";

              return (
                <div
                  key={p.id || idx}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isPenalty
                      ? "bg-amber-950/20 border-amber-500/30"
                      : "bg-neutral-900 border-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mb-1">
                    <span className="font-bold text-cyan-400">
                      {periodType === "quarters" || p.half > 2
                        ? `Q${p.half}`
                        : p.half === 2
                        ? "2nd Half"
                        : "1st Half"}{" "}
                      • {getOrdinal(p.down || 1)} Down
                    </span>
                    <span>
                      {p.gameClock !== undefined && p.gameClock !== null
                        ? formatTime(p.gameClock)
                        : ""}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-white leading-relaxed">{sentence}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
});

export default PlayByPlayLogDrawer;
