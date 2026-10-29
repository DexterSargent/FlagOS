import React, { memo } from "react";
import type { PlayDiagram, PlayerNode } from "@/lib/playbookTypes";
import { YARD_HEIGHT_PCT } from "@/lib/playbookTypes";

export interface PlayCanvasManCoverageLayerProps {
  play: PlayDiagram;
  selectedPlayerId: string | null;
  isShowingOpponent: boolean;
  progress: number;
  getAnimatedPlayerPos: (player: PlayerNode, progress: number) => { x: number; y: number };
}

export const PlayCanvasManCoverageLayer = memo(function PlayCanvasManCoverageLayer({
  play,
  selectedPlayerId,
  isShowingOpponent,
  progress,
  getAnimatedPlayerPos,
}: PlayCanvasManCoverageLayerProps) {
  return (
    <>
      {play.players
        .filter((p) => p.side === "defense" && p.coverageType === "man" && p.manTargetId)
        .map((def) => {
          const targetOff = play.players.find((p) => p.id === def.manTargetId);
          if (!targetOff) return null;
          if (!isShowingOpponent && selectedPlayerId !== def.id) return null;

          const defPos = getAnimatedPlayerPos(def, progress);
          const targetPos = getAnimatedPlayerPos(targetOff, progress);

          const x1 = (defPos.x / 100) * 1000;
          const y1 = (defPos.y / 100) * 700;
          const x2 = (targetPos.x / 100) * 1000;
          const y2 = (targetPos.y / 100) * 700;

          const isDefSelected = selectedPlayerId === def.id;

          const cushion =
            def.cushionYards ??
            Math.max(1, Math.round(((targetOff.y - def.y) / YARD_HEIGHT_PCT) * 10) / 10);
          const cushionLabel = cushion <= 1 ? "PRESS" : `${cushion}YD`;

          return (
            <g key={`man-${def.id}-${targetOff.id}`}>
              {/* Outer selection glow */}
              {isDefSelected && (
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#EC4899"
                  strokeWidth="8"
                  strokeOpacity="0.25"
                />
              )}

              {/* Dotted Lock Line */}
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#EC4899"
                strokeWidth={isDefSelected ? 3.5 : 2.5}
                strokeDasharray="6 5"
                opacity="0.95"
              />

              {/* Target Reticle Halo around Receiver */}
              <circle
                cx={x2}
                cy={y2}
                r="24"
                fill="none"
                stroke="#EC4899"
                strokeWidth="2"
                strokeDasharray="4 3"
                opacity={isDefSelected ? 0.95 : 0.6}
              />

              {/* Midpoint Lock Badge */}
              <g transform={`translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2})`}>
                <rect
                  x="-38"
                  y="-10"
                  width="76"
                  height="20"
                  rx="10"
                  fill="#0F172A"
                  stroke="#EC4899"
                  strokeWidth="1.5"
                  className="drop-shadow-md"
                />
                <text
                  x="0"
                  y="4"
                  fill="#F472B6"
                  fontSize="8"
                  fontWeight="900"
                  textAnchor="middle"
                  letterSpacing="0.6"
                  className="select-none pointer-events-none font-mono"
                >
                  MAN • {cushionLabel}
                </text>
              </g>
            </g>
          );
        })}
    </>
  );
});

export default PlayCanvasManCoverageLayer;

