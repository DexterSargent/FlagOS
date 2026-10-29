import React, { memo } from "react";
import { YARD_HEIGHT_PCT } from "@/lib/playbookTypes";

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
  // 5-yard intervals from LOS downfield (+5, +10, +15, +20, +25, +30) and backfield (-5, -10, -15)
  const yardSteps = [-15, -10, -5, 5, 10, 15, 20, 25, 30];

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

      {/* Endzone (Top Area 0 to 12%) */}
      <rect x="0" y="0" width="1000" height="84" fill="#0C1D15" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
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

      {/* Goal Line */}
      <line x1="0" y1="84" x2="1000" y2="84" stroke="#FFFFFF" strokeWidth="4" />

      {/* Proportional 5-Yard Field Grid (1 Yard = 1.75% = YARD_HEIGHT_PCT) */}
      <g id="proportional-yard-grid">
        {yardSteps.map((yardsFromLos) => {
          const linePct = losY - yardsFromLos * YARD_HEIGHT_PCT;
          const yPos = (linePct / 100) * 700;
          // Do not render beyond goal line (84px) or field bottom (700px)
          if (yPos < 84 || yPos > 696) return null;
          const isMajor10 = yardsFromLos % 10 === 0 && yardsFromLos !== 0;
          const isIntermediate5 = Math.abs(yardsFromLos) % 10 === 5;
          const yardLabel = Math.abs(yardsFromLos);

          return (
            <g key={yardsFromLos}>
              {/* Field Line Across Field */}
              <line
                x1="20"
                y1={yPos}
                x2="980"
                y2={yPos}
                stroke={isMajor10 ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.11)"}
                strokeWidth={isMajor10 ? 2 : 1}
                strokeDasharray={isIntermediate5 ? "6 4" : undefined}
              />

              {/* Stencil Yard Numbers on Left & Right Sidelines for 10-Yard Lines */}
              {isMajor10 && (
                <>
                  <text
                    x="70"
                    y={yPos + 7}
                    fill="rgba(255,255,255,0.45)"
                    fontSize={Math.round(22 * fieldLabelScale)}
                    fontWeight="900"
                    fontStyle="italic"
                    textAnchor="middle"
                    fontFamily="monospace"
                    pointerEvents="none"
                  >
                    {yardLabel}
                  </text>
                  <text
                    x="930"
                    y={yPos + 7}
                    fill="rgba(255,255,255,0.45)"
                    fontSize={Math.round(22 * fieldLabelScale)}
                    fontWeight="900"
                    fontStyle="italic"
                    textAnchor="middle"
                    fontFamily="monospace"
                    pointerEvents="none"
                  >
                    {yardLabel}
                  </text>
                </>
              )}

              {/* In-Field Hash Marks (NFL/College 38% and 62% hash coordinates) */}
              <line
                x1="380"
                y1={yPos - (isMajor10 ? 6 : 4)}
                x2="380"
                y2={yPos + (isMajor10 ? 6 : 4)}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={isMajor10 ? 1.5 : 1}
              />
              <line
                x1="620"
                y1={yPos - (isMajor10 ? 6 : 4)}
                x2="620"
                y2={yPos + (isMajor10 ? 6 : 4)}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={isMajor10 ? 1.5 : 1}
              />

              {/* Sideline Inset Hash Marks */}
              <line
                x1="36"
                y1={yPos - 4}
                x2="36"
                y2={yPos + 4}
                stroke="rgba(255,255,255,0.20)"
                strokeWidth="1.2"
              />
              <line
                x1="964"
                y1={yPos - 4}
                x2="964"
                y2={yPos + 4}
                stroke="rgba(255,255,255,0.20)"
                strokeWidth="1.2"
              />
            </g>
          );
        })}

        {/* 1-Yard Sideline Tick Marks between LOS and 25-Yard Line */}
        {Array.from({ length: 35 }, (_, i) => i - 10).map((yd) => {
          if (yd === 0 || yd % 5 === 0) return null;
          const tickPct = losY - yd * YARD_HEIGHT_PCT;
          const tickY = (tickPct / 100) * 700;
          if (tickY < 84 || tickY > 696) return null;
          return (
            <g key={`tick-${yd}`}>
              <line x1="20" y1={tickY} x2="26" y2={tickY} stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
              <line x1="974" y1={tickY} x2="980" y2={tickY} stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
            </g>
          );
        })}
      </g>

      {/* Sideline Boundaries */}
      <line x1="20" y1="0" x2="20" y2="700" stroke="#FFFFFF" strokeWidth="3" />
      <line x1="980" y1="0" x2="980" y2="700" stroke="#FFFFFF" strokeWidth="3" />

      {/* 7-YARD RUSH LINE (Official Flag Football Rule Marker) */}
      <g opacity="0.9">
        <line
          x1="20"
          y1={(rushY / 100) * 700}
          x2="980"
          y2={(rushY / 100) * 700}
          stroke="#FACC15"
          strokeWidth="2.5"
          strokeDasharray="8 6"
        />
        <rect x={depthRailSide === "left" ? 845 : 25} y={(rushY / 100) * 700 - 10} width="130" height="20" rx="6" fill="#FACC15" />
        <text
          x={depthRailSide === "left" ? 910 : 90}
          y={(rushY / 100) * 700 + 4}
          fill="#000000"
          fontSize="10"
          fontWeight="900"
          textAnchor="middle"
          letterSpacing="1"
        >
          {rushLineDistanceYards}-YD RUSH CONE
        </text>
      </g>

      {/* LINE OF SCRIMMAGE (LOS) */}
      <g>
        <line
          x1="20"
          y1={(losY / 100) * 700}
          x2="980"
          y2={(losY / 100) * 700}
          stroke="#3ca505"
          strokeWidth="3.5"
        />
        {/* Football On Line of Scrimmage */}
        <ellipse
          cx="500"
          cy={(losY / 100) * 700}
          rx="14"
          ry="8"
          fill="#78350F"
          stroke="#FBBF24"
          strokeWidth="1.5"
        />
        <line
          x1="492"
          y1={(losY / 100) * 700}
          x2="508"
          y2={(losY / 100) * 700}
          stroke="#FFFFFF"
          strokeWidth="1"
        />
        <rect x={depthRailSide === "right" ? 30 : 850} y={(losY / 100) * 700 - 10} width="120" height="20" rx="6" fill="#3ca505" />
        <text
          x={depthRailSide === "right" ? 90 : 910}
          y={(losY / 100) * 700 + 4}
          fill="#000000"
          fontSize="10"
          fontWeight="900"
          textAnchor="middle"
          letterSpacing="1"
        >
          SCRIMMAGE (LOS)
        </text>
      </g>
    </>
  );
});

export default PlayCanvasFieldBackground;
