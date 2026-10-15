"use client";

import React from "react";
import { useLeague } from "@/lib/leagueContext";
import { PlayDiagram, DEFAULT_LOS_Y, RUSH_LINE_DISTANCE } from "@/lib/playbookTypes";

interface MiniPlayDiagramProps {
  play: PlayDiagram;
  theme?: "dark" | "light";
  className?: string;
  showLabels?: boolean;
  showOpposingSide?: boolean;
}

export default function MiniPlayDiagram({
  play,
  theme = "dark",
  className = "w-full h-auto",
  showLabels = true,
  showOpposingSide = false,
}: MiniPlayDiagramProps) {
  const { settings } = useLeague();
  const rushLineDistanceYards = settings?.rules?.rushLineDistance || 7;

  const losY = play.losY || DEFAULT_LOS_Y;
  const rushDistanceY = (rushLineDistanceYards * 12) / 7;
  const rushY = losY - rushDistanceY;
  const isLight = theme === "light";

  // Unique IDs for SVG definitions to prevent collisions when multiple plays render on one page
  const playUid = (play.id || "play").replace(/[^a-zA-Z0-9_-]/g, "");
  const turfPatternId = `turf-${playUid}-${theme}`;
  const markerPassId = `arr-pass-${playUid}-${theme}`;
  const markerRushId = `arr-rush-${playUid}-${theme}`;
  const markerDefId = `arr-def-${playUid}-${theme}`;
  const markerMotId = `arr-mot-${playUid}-${theme}`;

  // Background and line colors for print vs screen
  const turfBg = isLight ? "#FFFFFF" : "#102319";
  const turfStripe = isLight ? "#F8FAFC" : "#0D1E16";
  const yardLineColor = isLight ? "#CBD5E1" : "rgba(255, 255, 255, 0.12)";
  const sidelineColor = isLight ? "#475569" : "rgba(255, 255, 255, 0.4)";
  const losColor = "#0284C7"; // Cyan / Blue LOS
  const rushColor = "#D97706"; // Amber Rush line

  return (
    <svg
      viewBox="0 0 1000 700"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Striped grass pattern */}
        <pattern id={turfPatternId} width="1000" height="70" patternUnits="userSpaceOnUse">
          <rect width="1000" height="35" fill={turfBg} />
          <rect y="35" width="1000" height="35" fill={turfStripe} />
        </pattern>

        {/* Arrowheads for routes */}
        <marker id={markerPassId} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill={isLight ? "#0284C7" : "#38BDF8"} />
        </marker>
        <marker id={markerRushId} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#DC2626" />
        </marker>
        <marker id={markerDefId} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill={isLight ? "#7C3AED" : "#C084FC"} />
        </marker>
        <marker id={markerMotId} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#D97706" />
        </marker>
      </defs>

      {/* Field Turf */}
      <rect width="1000" height="700" fill={`url(#${turfPatternId})`} />

      {/* Endzone */}
      <rect x="0" y="0" width="1000" height="84" fill={isLight ? "#F1F5F9" : "#08140E"} stroke={yardLineColor} strokeWidth="1.5" />
      <text
        x="500"
        y="52"
        fill={isLight ? "#64748B" : "rgba(255,255,255,0.18)"}
        fontSize="28"
        fontWeight="900"
        textAnchor="middle"
        letterSpacing="8"
      >
        END ZONE
      </text>

      {/* Goal Line & Yard Lines */}
      <line x1="0" y1="84" x2="1000" y2="84" stroke={isLight ? "#64748B" : "#FFFFFF"} strokeWidth="3" />
      {[20, 30, 40, 50, 60, 70, 80, 90].map((pct) => (
        <line
          key={pct}
          x1="20"
          y1={(pct / 100) * 700}
          x2="980"
          y2={(pct / 100) * 700}
          stroke={yardLineColor}
          strokeWidth="1"
        />
      ))}

      {/* Sidelines */}
      <line x1="20" y1="0" x2="20" y2="700" stroke={sidelineColor} strokeWidth="2" />
      <line x1="980" y1="0" x2="980" y2="700" stroke={sidelineColor} strokeWidth="2" />

      {/* 7-Yard Rush Cone Line */}
      <line
        x1="20"
        y1={(rushY / 100) * 700}
        x2="980"
        y2={(rushY / 100) * 700}
        stroke={rushColor}
        strokeWidth="2"
        strokeDasharray="6 4"
      />
      <text
        x="60"
        y={(rushY / 100) * 700 - 4}
        fill={rushColor}
        fontSize="9"
        fontWeight="800"
      >
        {rushLineDistanceYards}-YD RUSH
      </text>

      {/* Line of Scrimmage */}
      <line
        x1="20"
        y1={(losY / 100) * 700}
        x2="980"
        y2={(losY / 100) * 700}
        stroke={losColor}
        strokeWidth="3"
      />
      {/* Football on LOS */}
      <ellipse cx="500" cy={(losY / 100) * 700} rx="10" ry="6" fill="#78350F" stroke="#F59E0B" strokeWidth="1" />
      <text
        x="930"
        y={(losY / 100) * 700 - 4}
        fill={losColor}
        fontSize="9"
        fontWeight="800"
        textAnchor="end"
      >
        LOS
      </text>

      {/* Defensive Zones */}
      {(play.type === "defense" || showOpposingSide) &&
        play.zones?.map((z) => (
          <ellipse
            key={z.id}
            cx={(z.x / 100) * 1000}
            cy={(z.y / 100) * 700}
            rx={(z.rx / 100) * 1000}
            ry={(z.ry / 100) * 700}
            fill={z.color}
            fillOpacity={isLight ? 0.15 : 0.22}
            stroke={z.color}
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
        ))}

      {/* Man Lock Lines (Visible when both sides are shown) */}
      {showOpposingSide &&
        play.players
          .filter((p) => p.side === "defense" && p.coverageType === "man" && p.manTargetId)
          .map((def) => {
            const offTarget = play.players.find((p) => p.id === def.manTargetId);
            if (!offTarget) return null;
            return (
              <line
                key={`man-${def.id}-${offTarget.id}`}
                x1={(def.x / 100) * 1000}
                y1={(def.y / 100) * 700}
                x2={(offTarget.x / 100) * 1000}
                y2={(offTarget.y / 100) * 700}
                stroke="#EC4899"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.8"
              />
            );
          })}

      {/* Route Lines */}
      {play.players
        .filter((player) => (showOpposingSide ? true : player.side === play.type))
        .map((player) => {
          if (!player.route || player.route.length === 0) return null;

          const pts = [{ x: player.x, y: player.y }, ...player.route];
          let pathStr = `M ${(pts[0].x / 100) * 1000} ${(pts[0].y / 100) * 700}`;
          for (let i = 1; i < pts.length; i++) {
            pathStr += ` L ${(pts[i].x / 100) * 1000} ${(pts[i].y / 100) * 700}`;
          }

          const isRush = player.routeType === "rush" || player.coverageType === "rush";
          const isMotion = player.routeType === "motion";
          const isDef = player.side === "defense";

          const stroke = isMotion
            ? "#D97706"
            : isRush
            ? "#DC2626"
            : isDef
            ? (isLight ? "#7C3AED" : "#C084FC")
            : (isLight ? "#0284C7" : "#38BDF8");

          const markerId = isMotion
            ? `url(#${markerMotId})`
            : isRush
            ? `url(#${markerRushId})`
            : isDef
            ? `url(#${markerDefId})`
            : `url(#${markerPassId})`;

          return (
            <path
              key={`route-${player.id}`}
              d={pathStr}
              fill="none"
              stroke={stroke}
              strokeWidth={isLight ? "3.5" : "3"}
              strokeDasharray={isMotion ? "5 4" : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd={markerId}
            />
          );
        })}

      {/* Player Nodes */}
      {play.players
        .filter((player) => (showOpposingSide ? true : player.side === play.type))
        .map((player) => {
        const px = (player.x / 100) * 1000;
        const py = (player.y / 100) * 700;
        const isOffense = player.side === "offense";

        const fill = isOffense
          ? player.label === "QB"
            ? "#0284C7"
            : player.label === "C"
            ? "#0E7490"
            : (isLight ? "#1E293B" : "#0F172A")
          : player.label === "RUSH"
          ? "#991B1B"
          : (isLight ? "#4C1D95" : "#312E81");

        const stroke = isOffense
          ? "#38BDF8"
          : player.label === "RUSH"
          ? "#EF4444"
          : "#C084FC";

        return (
          <g key={player.id}>
            {isOffense && player.routeType === "motion" && (
              <circle
                cx={px}
                cy={py}
                r="21"
                fill="none"
                stroke="#D97706"
                strokeWidth="1.8"
                strokeDasharray="3 2"
              />
            )}
            <circle
              cx={px}
              cy={py}
              r="17"
              fill={fill}
              stroke={stroke}
              strokeWidth="2"
            />
            {showLabels && (
              <text
                x={px}
                y={py + 4.5}
                fill="#FFFFFF"
                fontSize="11"
                fontWeight="900"
                textAnchor="middle"
                className="select-none pointer-events-none"
              >
                {player.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
