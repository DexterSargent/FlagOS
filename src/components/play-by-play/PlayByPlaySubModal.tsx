"use client";

import React, { memo, useState } from "react";
import { X, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";
import { compareNatural } from "@/lib/sortUtils";

export interface PlayByPlaySubModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId: string;
  awayTeamId: string;
  homePlayers: string[];
  awayPlayers: string[];
  allPlayers: Array<{
    id: string;
    playerName: string;
    teamId?: string;
    number?: string | number;
    jerseyNumber?: string | number;
    playerNumber?: string | number;
  }>;
  onAddSub: (playerName: string, team: "HOME" | "AWAY") => void;
}

export const PlayByPlaySubModal = memo(function PlayByPlaySubModal({
  isOpen,
  onClose,
  homeTeamName,
  awayTeamName,
  homeTeamId,
  awayTeamId,
  homePlayers,
  awayPlayers,
  allPlayers,
  onAddSub,
}: PlayByPlaySubModalProps) {
  const [subModalTeam, setSubModalTeam] = useState<"HOME" | "AWAY" | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setSubModalTeam(null);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-8">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl sm:rounded-3xl md:rounded-[3rem] p-4 sm:p-8 max-w-xl w-full flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center mb-4 sm:mb-6 shrink-0">
          <h2 className="text-xl sm:text-3xl font-black uppercase tracking-widest text-white">
            Add Sub
          </h2>
          <div className="flex items-center gap-2">
            <PageGuideButton />
            <button
              type="button"
              onClick={handleClose}
              className="text-[var(--text-muted)] hover:text-white p-2 bg-white/5 rounded-full cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {!subModalTeam ? (
          <div className="flex flex-col gap-4">
            <h3 className="text-neutral-400 font-bold mb-2">Select team to add sub to:</h3>
            <button
              type="button"
              onClick={() => setSubModalTeam("HOME")}
              className="py-6 px-4 bg-neutral-950 border border-white/5 rounded-2xl text-2xl font-black hover:bg-neutral-800 transition-colors uppercase flex items-center justify-between text-white cursor-pointer"
            >
              {homeTeamName}
              <ChevronRight className="w-6 h-6 text-neutral-600" />
            </button>
            <button
              type="button"
              onClick={() => setSubModalTeam("AWAY")}
              className="py-6 px-4 bg-neutral-950 border border-white/5 rounded-2xl text-2xl font-black hover:bg-neutral-800 transition-colors uppercase flex items-center justify-between text-white cursor-pointer"
            >
              {awayTeamName}
              <ChevronRight className="w-6 h-6 text-neutral-600" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 overflow-hidden h-full">
            <button
              type="button"
              onClick={() => setSubModalTeam(null)}
              className="flex items-center text-amber-500 mb-2 hover:text-amber-400 w-fit shrink-0 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 mr-1" /> Back
            </button>
            <h3 className="text-neutral-400 font-bold mb-2 shrink-0">
              Select player to join {subModalTeam === "HOME" ? homeTeamName : awayTeamName}:
            </h3>
            <div className="flex flex-col gap-2 overflow-y-auto pr-2 pb-4">
              {allPlayers
                .filter((p) => {
                  const teamPlayers = subModalTeam === "HOME" ? homePlayers : awayPlayers;
                  return !teamPlayers.includes(p.playerName);
                })
                .sort((a, b) => compareNatural(a.playerName, b.playerName))
                .map((p) => {
                  const opposingTeamId = subModalTeam === "HOME" ? awayTeamId : homeTeamId;
                  const isOpponent = p.teamId === opposingTeamId;
                  const pNum = p.number || p.jerseyNumber || p.playerNumber;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => onAddSub(p.playerName, subModalTeam)}
                      className="py-4 px-4 bg-neutral-950 border border-white/5 rounded-2xl text-lg font-bold hover:bg-white/10 transition-colors text-left flex justify-between items-center text-white cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {pNum && (
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-black bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                            #{String(pNum).replace(/^#/, "")}
                          </span>
                        )}
                        <span>
                          {p.playerName}{" "}
                          {isOpponent && (
                            <span className="text-amber-500 ml-1" title="Currently on opposing team">
                              *
                            </span>
                          )}
                        </span>
                      </div>
                      <Plus className="w-5 h-5 text-neutral-600" />
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default PlayByPlaySubModal;

