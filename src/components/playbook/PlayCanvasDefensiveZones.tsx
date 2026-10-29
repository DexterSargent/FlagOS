import React, { memo } from "react";
import type { PlayDiagram } from "@/lib/playbookTypes";

export interface PlayCanvasDefensiveZonesProps {
  play: PlayDiagram;
  isShowingOpponent: boolean;
  selectedZoneId: string | null;
  readOnly?: boolean;
  onPointerDownZone: (e: React.PointerEvent, zoneId: string) => void;
  onPointerDownZoneResize: (e: React.PointerEvent, zoneId: string, handle: "e" | "w" | "s" | "n" | "se") => void;
}

export const PlayCanvasDefensiveZones = memo(function PlayCanvasDefensiveZones({
  play,
  isShowingOpponent,
  selectedZoneId,
  readOnly,
  onPointerDownZone,
  onPointerDownZoneResize,
}: PlayCanvasDefensiveZonesProps) {
  if (play.type !== "defense" && !isShowingOpponent) {
    return null;
  }

  return (
    <>
      {play.zones?.map((zone) => {
        const isSelected = selectedZoneId === zone.id;
        const isRect = zone.shape === "rectangle" || zone.roundness !== undefined;
        const zoneColor = zone.color || "#8B5CF6";
        const cx = (zone.x / 100) * 1000;
        const cy = (zone.y / 100) * 700;
        const rx = (zone.rx / 100) * 1000;
        const ry = (zone.ry / 100) * 700;

        return (
          <g
            key={zone.id}
            data-testid={`zone-bubble-${zone.id}`}
            onPointerDown={(e) => onPointerDownZone(e, zone.id)}
          >
            {/* Zone Boundary Body */}
            <g
              className="cursor-move"
              onPointerDown={(e) => onPointerDownZone(e, zone.id)}
            >
              {isRect ? (
                <rect
                  x={cx - rx}
                  y={cy - ry}
                  width={rx * 2}
                  height={ry * 2}
                  rx={zone.roundness === undefined ? 14 : (rx * Math.max(0, Math.min(100, zone.roundness))) / 100}
                  ry={zone.roundness === undefined ? undefined : (ry * Math.max(0, Math.min(100, zone.roundness))) / 100}
                  fill={zoneColor}
                  fillOpacity={isSelected ? 0.32 : 0.18}
                  stroke={zoneColor}
                  strokeWidth={isSelected ? 3 : 1.5}
                  strokeDasharray="6 4"
                />
              ) : (
                <ellipse
                  cx={cx}
                  cy={cy}
                  rx={rx}
                  ry={ry}
                  fill={zoneColor}
                  fillOpacity={isSelected ? 0.32 : 0.18}
                  stroke={zoneColor}
                  strokeWidth={isSelected ? 3 : 1.5}
                  strokeDasharray="6 4"
                />
              )}
              <text
                x={cx}
                y={cy + 4}
                fill="#FFFFFF"
                stroke="#07120D"
                strokeWidth="3"
                paintOrder="stroke"
                fontSize="13"
                fontWeight="800"
                textAnchor="middle"
                letterSpacing="1"
                className="select-none pointer-events-none drop-shadow"
              >
                {zone.name}
              </text>
            </g>

            {/* Interactive Resize Handles when Zone is Selected */}
            {!readOnly && isSelected && (
              <g data-testid={`zone-resize-handles-${zone.id}`}>
                {/* East Handle (Horizontal width rx) */}
                <g
                  className="cursor-ew-resize"
                  data-testid="zone-resize-handle-e"
                  onPointerDown={(e) => onPointerDownZoneResize(e, zone.id, "e")}
                >
                  <circle cx={cx + rx} cy={cy} r="28" fill="transparent" />
                  <circle
                    cx={cx + rx}
                    cy={cy}
                    r="7"
                    fill="#FFFFFF"
                    stroke={zoneColor}
                    strokeWidth="2.5"
                    className="drop-shadow"
                  />
                </g>

                {/* West Handle (Horizontal width rx) */}
                <g
                  className="cursor-ew-resize"
                  data-testid="zone-resize-handle-w"
                  onPointerDown={(e) => onPointerDownZoneResize(e, zone.id, "w")}
                >
                  <circle cx={cx - rx} cy={cy} r="28" fill="transparent" />
                  <circle
                    cx={cx - rx}
                    cy={cy}
                    r="7"
                    fill="#FFFFFF"
                    stroke={zoneColor}
                    strokeWidth="2.5"
                    className="drop-shadow"
                  />
                </g>

                {/* South Handle (Vertical height ry) */}
                <g
                  className="cursor-ns-resize"
                  data-testid="zone-resize-handle-s"
                  onPointerDown={(e) => onPointerDownZoneResize(e, zone.id, "s")}
                >
                  <circle cx={cx} cy={cy + ry} r="28" fill="transparent" />
                  <circle
                    cx={cx}
                    cy={cy + ry}
                    r="7"
                    fill="#FFFFFF"
                    stroke={zoneColor}
                    strokeWidth="2.5"
                    className="drop-shadow"
                  />
                </g>

                {/* North Handle (Vertical height ry) */}
                <g
                  className="cursor-ns-resize"
                  data-testid="zone-resize-handle-n"
                  onPointerDown={(e) => onPointerDownZoneResize(e, zone.id, "n")}
                >
                  <circle cx={cx} cy={cy - ry} r="28" fill="transparent" />
                  <circle
                    cx={cx}
                    cy={cy - ry}
                    r="7"
                    fill="#FFFFFF"
                    stroke={zoneColor}
                    strokeWidth="2.5"
                    className="drop-shadow"
                  />
                </g>

                {/* South-East Corner Handle (Both width rx and height ry) */}
                <g
                  className="cursor-nwse-resize"
                  data-testid="zone-resize-handle-se"
                  onPointerDown={(e) => onPointerDownZoneResize(e, zone.id, "se")}
                >
                  <circle cx={cx + rx} cy={cy + ry} r="28" fill="transparent" />
                  <rect
                    x={cx + rx - 6}
                    y={cy + ry - 6}
                    width="12"
                    height="12"
                    rx="3"
                    fill="#FFFFFF"
                    stroke={zoneColor}
                    strokeWidth="2.5"
                    className="drop-shadow"
                  />
                </g>
              </g>
            )}
          </g>
        );
      })}
    </>
  );
});

export default PlayCanvasDefensiveZones;

