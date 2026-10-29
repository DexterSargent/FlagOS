import React, { memo } from "react";
import type { PlayerNode, RoutePoint } from "@/lib/playbookTypes";

export interface PlayCanvasRoutePathsLayerProps {
  visiblePlayers: PlayerNode[];
  selectedPlayerId: string | null;
  readOnly?: boolean;
  currentQb: { x: number; y: number };
  playerHasMotion: (player: PlayerNode) => boolean;
  getPlayerMotionPath: (player: PlayerNode) => RoutePoint[] | null;
  handlePointerDownWaypoint: (
    e: React.PointerEvent,
    playerId: string,
    wpIdx: number,
    isMotion?: boolean
  ) => void;
}

export const PlayCanvasRoutePathsLayer = memo(function PlayCanvasRoutePathsLayer({
  visiblePlayers,
  selectedPlayerId,
  readOnly,
  currentQb,
  playerHasMotion,
  getPlayerMotionPath,
  handlePointerDownWaypoint,
}: PlayCanvasRoutePathsLayerProps) {
  return (
    <>
      {visiblePlayers.map((player) => {
        const isSelected = selectedPlayerId === player.id;
        const isOffense = player.side === "offense";
        const isRush = player.routeType === "rush" || player.coverageType === "rush";
        const isZoneDefender = player.side === "defense" && Boolean(player.zoneId);
        const isDraggableArrow = !readOnly && (isRush || isZoneDefender);

        const hasMotion = isOffense && playerHasMotion(player);
        const motionPts = hasMotion ? getPlayerMotionPath(player) : null;
        const hasPostSnapRoute = Boolean(
          player.route &&
          player.route.length > 0 &&
          (player.routeType !== "motion" || !motionPts)
        );

        if (!motionPts && !hasPostSnapRoute) return null;

        const motionStart = { x: player.x, y: player.y };
        const motionEnd = motionPts && motionPts.length > 0 ? motionPts[motionPts.length - 1] : motionStart;
        const routeStart = motionPts && motionPts.length > 0 ? motionEnd : motionStart;

        // Build motion path string if motion exists
        let motionPathStr = "";
        if (motionPts && motionPts.length > 0) {
          motionPathStr = `M ${(motionStart.x / 100) * 1000} ${(motionStart.y / 100) * 700}`;
          motionPts.forEach((pt) => {
            motionPathStr += ` L ${(pt.x / 100) * 1000} ${(pt.y / 100) * 700}`;
          });
        }

        // Build post-snap route path string if route exists
        let routePathStr = "";
        let bendWp: RoutePoint | null = null;
        if (hasPostSnapRoute && player.route && player.route.length > 0) {
          bendWp = isRush
            ? player.route[0] || { x: (player.x + currentQb.x) / 2, y: (player.y + currentQb.y) / 2 }
            : null;

          routePathStr = `M ${(routeStart.x / 100) * 1000} ${(routeStart.y / 100) * 700}`;
          if (isRush && bendWp) {
            routePathStr += ` L ${(bendWp.x / 100) * 1000} ${(bendWp.y / 100) * 700} L ${(currentQb.x / 100) * 1000} ${(currentQb.y / 100) * 700}`;
          } else {
            player.route.forEach((pt) => {
              routePathStr += ` L ${(pt.x / 100) * 1000} ${(pt.y / 100) * 700}`;
            });
          }
        }

        const strokeColor = isRush
          ? "#EF4444"
          : player.side === "defense"
          ? "#A855F7"
          : "#3ca505";

        const markerId = isRush
          ? "url(#arrow-rush)"
          : player.side === "defense"
          ? "url(#arrow-defense)"
          : "url(#arrow-pass)";

        return (
          <g key={`route-${player.id}`}>
            {/* 1. PRE-SNAP MOTION PATH (if motion active) */}
            {motionPathStr && (
              <g>
                {isSelected && (
                  <path
                    d={motionPathStr}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="7"
                    strokeOpacity="0.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                <path
                  d={motionPathStr}
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth={isSelected ? 3.5 : 2.5}
                  strokeDasharray="6 5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  markerEnd={hasPostSnapRoute ? undefined : "url(#arrow-motion)"}
                />
                {/* Interactive Handles for motion path */}
                {!readOnly &&
                  isSelected &&
                  motionPts?.map((pt, wpIdx) => (
                    <g
                      key={`motion-wp-${wpIdx}`}
                      className="cursor-pointer"
                      onPointerDown={(e) => handlePointerDownWaypoint(e, player.id, wpIdx, true)}
                    >
                      <circle cx={(pt.x / 100) * 1000} cy={(pt.y / 100) * 700} r="44" fill="transparent" />
                      <circle
                        cx={(pt.x / 100) * 1000}
                        cy={(pt.y / 100) * 700}
                        r="11"
                        fill="#0B0F19"
                        stroke="#F59E0B"
                        strokeWidth="3"
                      />
                    </g>
                  ))}
                {/* Snap Junction Indicator if both motion and route exist */}
                {hasPostSnapRoute && (
                  <g transform={`translate(${(motionEnd.x / 100) * 1000}, ${(motionEnd.y / 100) * 700})`}>
                    <circle r="6" fill="#F59E0B" stroke="#0B0F19" strokeWidth="1.5" />
                    <circle r="2.5" fill="#FFFFFF" />
                    <g transform="translate(0, -11)">
                      <rect x="-16" y="-6" width="32" height="12" rx="6" fill="#0B0F19" stroke="#F59E0B" strokeWidth="1" />
                      <text x="0" y="3" fill="#FBBF24" fontSize="6.5" fontWeight="900" textAnchor="middle" className="select-none pointer-events-none">
                        SNAP
                      </text>
                    </g>
                  </g>
                )}
              </g>
            )}

            {/* 2. POST-SNAP ROUTE PATH */}
            {routePathStr && (
              <g>
                {isSelected && (
                  <path
                    d={routePathStr}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="8"
                    strokeOpacity="0.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {/* Invisible wider hit area for easy drag targeting */}
                {isDraggableArrow && (
                  <path
                    d={routePathStr}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="28"
                    strokeLinecap="round"
                    className="cursor-move"
                    onPointerDown={(e) => {
                      if (isRush) {
                        handlePointerDownWaypoint(e, player.id, 0);
                      } else if (isZoneDefender && player.route && player.route.length > 0) {
                        handlePointerDownWaypoint(e, player.id, player.route.length - 1);
                      }
                    }}
                  />
                )}
                <path
                  d={routePathStr}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isSelected ? (isRush ? 4.5 : 4) : 3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  markerEnd={markerId}
                  className={isDraggableArrow ? "cursor-move" : undefined}
                  onPointerDown={(e) => {
                    if (readOnly) return;
                    if (isRush) {
                      handlePointerDownWaypoint(e, player.id, 0);
                    } else if (isZoneDefender && player.route && player.route.length > 0) {
                      handlePointerDownWaypoint(e, player.id, player.route.length - 1);
                    }
                  }}
                />

                {/* Rusher Custom Draggable Bend Handle */}
                {!readOnly && isSelected && isRush && bendWp && (
                  <g
                    className="cursor-move"
                    onPointerDown={(e) => handlePointerDownWaypoint(e, player.id, 0)}
                  >
                    <circle
                      cx={(bendWp.x / 100) * 1000}
                      cy={(bendWp.y / 100) * 700}
                      r="44"
                      fill="transparent"
                    />
                    <circle
                      cx={(bendWp.x / 100) * 1000}
                      cy={(bendWp.y / 100) * 700}
                      r="16"
                      fill="#F59E0B"
                      fillOpacity="0.25"
                      className="animate-pulse"
                    />
                    <circle
                      cx={(bendWp.x / 100) * 1000}
                      cy={(bendWp.y / 100) * 700}
                      r="10"
                      fill="#EF4444"
                      stroke="#FFFFFF"
                      strokeWidth="2.5"
                      className="drop-shadow-lg"
                    />
                    <circle
                      cx={(bendWp.x / 100) * 1000}
                      cy={(bendWp.y / 100) * 700}
                      r="3.5"
                      fill="#FFFFFF"
                    />
                    <g transform={`translate(${(bendWp.x / 100) * 1000}, ${(bendWp.y / 100) * 700 - 20})`}>
                      <rect
                        x="-38"
                        y="-9"
                        width="76"
                        height="18"
                        rx="9"
                        fill="#0B0F19"
                        stroke="#EF4444"
                        strokeWidth="1.5"
                        className="drop-shadow-md"
                      />
                      <text
                        x="0"
                        y="3.5"
                        fill="#FCA5A5"
                        fontSize="8.5"
                        fontWeight="900"
                        textAnchor="middle"
                        letterSpacing="0.5"
                        className="select-none pointer-events-none"
                      >
                        BEND RUSH
                      </text>
                    </g>
                  </g>
                )}

                {/* Standard Interactive Waypoint Handles */}
                {!readOnly &&
                  isSelected &&
                  !isRush &&
                  player.route?.map((pt, wpIdx) => (
                    <g
                      key={`route-wp-${wpIdx}`}
                      className="cursor-pointer"
                      onPointerDown={(e) => handlePointerDownWaypoint(e, player.id, wpIdx, false)}
                    >
                      <circle cx={(pt.x / 100) * 1000} cy={(pt.y / 100) * 700} r="44" fill="transparent" />
                      <circle
                        cx={(pt.x / 100) * 1000}
                        cy={(pt.y / 100) * 700}
                        r="12"
                        fill="#0B0F19"
                        stroke={strokeColor}
                        strokeWidth="3.5"
                      />
                    </g>
                  ))}
              </g>
            )}
          </g>
        );
      })}
    </>
  );
});

export default PlayCanvasRoutePathsLayer;

