import React, { memo } from "react";
import { YARD_HEIGHT_PCT } from "@/lib/playbookTypes";

const CANVAS_HEIGHT_PX = 700;
// The end zone occupies the top 12% of the canvas; the goal line sits on its front edge.
const GOAL_LINE_PX = 84;
// Flag rules forbid running plays inside the 5 yards before the goal line.
const NO_RUN_ZONE_YARDS = 5;
// 5-yard lines from 15 behind the LOS to 30 downfield (the LOS itself is drawn separately).
const yardSteps = [-15, -10, -5, 5, 10, 15, 20, 25, 30];

export interface PlayCanvasFieldBackgroundProps {
  fieldLabelScale: number;
  losY: number;
  rushY: number;
  rushLineDistanceYards: number;
  depthRailSide?: "left" | "right" | null;
}

export const PlayCanvasFieldBackground = memo(function PlayCanvasFieldBackground({
  fieldLabelScale,
  losY,
  rushY,
  rushLineDistanceYards,
  depthRailSide,
}: PlayCanvasFieldBackgroundProps) {
  const yardsToPx = (yardsFromLos: number) => ((losY - yardsFromLos * YARD_HEIGHT_PCT) / 100) * CANVAS_HEIGHT_PX;
  const losPx = (losY / 100) * CANVAS_HEIGHT_PX;
  const rushPx = (rushY / 100) * CANVAS_HEIGHT_PX;
  const noRunDepthPx = NO_RUN_ZONE_YARDS * YARD_HEIGHT_PCT * (CANVAS_HEIGHT_PX / 100);

  return (
    <>
      <defs>
        {/* Field Grass Pattern Texture */}
        <pattern id="turfStripe" width="1000" height="70" patternUnits="userSpaceOnUse">
          <rect width="1000" height="35" fill="#132B1F" />
          <rect y="35" width="1000" height="35" fill="#0E2319" />
        </pattern>

        {/* Arrowhead Markers for Route Paths */}
        <marker
          id="arrow-pass"
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#3ca505" />
        </marker>

        <marker
          id="arrow-motion"
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#F59E0B" />
        </marker>

        <marker
          id="arrow-rush"
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#EF4444" />
        </marker>

        <marker
          id="arrow-defense"
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#A855F7" />
        </marker>

        {/* Radial glow for selected node */}
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Field Base Turf */}
      <rect width="1000" height="700" fill="url(#turfStripe)" />

      {/* End Zone (top 12% of the canvas) */}
      <rect x="0" y="0" width="1000" height={GOAL_LINE_PX} fill="#0C1D15" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
      <text
        x="500"
        y="52"
        fill="rgba(255,255,255,0.32)"
        fontSize={Math.round(34 * fieldLabelScale)}
        fontWeight="900"
        textAnchor="middle"
        letterSpacing="12"
      >
        END ZONE
      </text>

      {/* No-Run Zone: the 5 yards in front of the goal line where running plays are not allowed */}
      <g id="no-run-zone" pointerEvents="none">
        <rect x="20" y={GOAL_LINE_PX} width="960" height={noRunDepthPx} fill="rgba(250,204,21,0.05)" />
        <line
          x1="20"
          y1={GOAL_LINE_PX + noRunDepthPx}
          x2="980"
          y2={GOAL_LINE_PX + noRunDepthPx}
          stroke="rgba(250,204,21,0.45)"
          strokeWidth="1.5"
          strokeDasharray="10 6"
        />
        <text
          x="500"
          y={GOAL_LINE_PX + noRunDepthPx - 8}
          fill="rgba(250,204,21,0.4)"
          fontSize={Math.round(11 * fieldLabelScale)}
          fontWeight="800"
          textAnchor="middle"
          letterSpacing="3"
        >
          NO-RUN ZONE
        </text>
      </g>

      {/* Goal Line */}
      <line x1="0" y1={GOAL_LINE_PX} x2="1000" y2={GOAL_LINE_PX} stroke="#FFFFFF" strokeWidth="4" />

      {/* 5-yard grid measured from the LOS (1 yard = YARD_HEIGHT_PCT of canvas height) */}
      <g id="proportional-yard-grid">
        {yardSteps.map((yardsFromLos) => {
          const yPos = yardsToPx(yardsFromLos);
          // Skip lines that would land in the end zone or off the bottom of the canvas
          if (yPos < GOAL_LINE_PX + 6 || yPos > 696) return null;
          const isMajor10 = yardsFromLos % 10 === 0;
          const isDownfield = yardsFromLos > 0;
          // Number downfield 10-yard lines only when they clear the goal line by a readable margin
          const showNumber = isMajor10 && isDownfield && yPos > GOAL_LINE_PX + 28;

          return (
            <g key={yardsFromLos}>
              <line
                x1="20"
                y1={yPos}
                x2="980"
                y2={yPos}
                stroke={isMajor10 ? "rgba(255,255,255,0.26)" : "rgba(255,255,255,0.12)"}
                strokeWidth={isMajor10 ? 2 : 1}
                strokeDasharray={isMajor10 ? undefined : "6 4"}
              />

              {showNumber && (
                <>
                  <text
                    x="62"
                    y={yPos + 7}
                    fill="rgba(255,255,255,0.45)"
                    fontSize={Math.round(20 * fieldLabelScale)}
                    fontWeight="900"
                    textAnchor="middle"
                    fontFamily="monospace"
                    pointerEvents="none"
                  >
                    {yardsFromLos}
                  </text>
                  <text
                    x="938"
                    y={yPos + 7}
                    fill="rgba(255,255,255,0.45)"
                    fontSize={Math.round(20 * fieldLabelScale)}
                    fontWeight="900"
                    textAnchor="middle"
                    fontFamily="monospace"
                    pointerEvents="none"
                  >
                    {yardsFromLos}
                  </text>
                </>
              )}

              {/* Sideline inset marks (flag fields have no in-field hash marks) */}
              <line x1="20" y1={yPos} x2="34" y2={yPos} stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
              <line x1="966" y1={yPos} x2="980" y2={yPos} stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
            </g>
          );
        })}

        {/* 1-yard sideline ticks between the 5-yard lines */}
        {Array.from({ length: 50 }, (_, i) => i - 15).map((yd) => {
          if (yd % 5 === 0) return null;
          const tickY = yardsToPx(yd);
          if (tickY < GOAL_LINE_PX + 6 || tickY > 696) return null;
          return (
            <g key={`tick-${yd}`}>
              <line x1="20" y1={tickY} x2="27" y2={tickY} stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
              <line x1="973" y1={tickY} x2="980" y2={tickY} stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
            </g>
          );
        })}
      </g>

      {/* Sideline Boundaries */}
      <line x1="20" y1="0" x2="20" y2="700" stroke="#FFFFFF" strokeWidth="3" />
      <line x1="980" y1="0" x2="980" y2="700" stroke="#FFFFFF" strokeWidth="3" />

      {/* Rush Line: pass rushers must start this many yards off the ball */}
      <g opacity="0.9">
        <line
          x1="20"
          y1={rushPx}
          x2="980"
          y2={rushPx}
          stroke="#FACC15"
          strokeWidth="2.5"
          strokeDasharray="8 6"
        />
        <rect x={depthRailSide === "left" ? 875 : 25} y={rushPx - 26} width="100" height="18" rx="5" fill="#FACC15" />
        <text
          x={depthRailSide === "left" ? 925 : 75}
          y={rushPx - 13}
          fill="#000000"
          fontSize="9"
          fontWeight="900"
          textAnchor="middle"
          letterSpacing="0.5"
        >
          {rushLineDistanceYards}-YD RUSH LINE
        </text>
      </g>

      {/* Line of Scrimmage */}
      <g>
        <line
          x1="20"
          y1={losPx}
          x2="980"
          y2={losPx}
          stroke="#3ca505"
          strokeWidth="3.5"
        />
        {/* Ball spotted on the LOS */}
        <ellipse
          cx="500"
          cy={losPx}
          rx="14"
          ry="8"
          fill="#78350F"
          stroke="#FBBF24"
          strokeWidth="1.5"
        />
        <line
          x1="492"
          y1={losPx}
          x2="508"
          y2={losPx}
          stroke="#FFFFFF"
          strokeWidth="1"
        />
        {/* Label sits just above the line in the sideline corner so it never covers wide receivers on the LOS */}
        <rect x={depthRailSide === "right" ? 25 : 865} y={losPx - 26} width="110" height="18" rx="5" fill="#3ca505" />
        <text
          x={depthRailSide === "right" ? 80 : 920}
          y={losPx - 13}
          fill="#000000"
          fontSize="9"
          fontWeight="900"
          textAnchor="middle"
          letterSpacing="0.5"
        >
          LINE OF SCRIMMAGE
        </text>
      </g>
    </>
  );
});

export default PlayCanvasFieldBackground;
