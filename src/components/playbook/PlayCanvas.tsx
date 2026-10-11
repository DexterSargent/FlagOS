"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useLeague } from "@/lib/leagueContext";
import {
  PlayerNode,
  RoutePoint,
  ZoneBubble,
  PlayDiagram,
  Playbook,
  DEFAULT_LOS_Y,
  RUSH_LINE_DISTANCE,
  FLAG_PLAYERS_PER_SIDE,
  checkLegalPosition,
  clampLegalPosition,
  generateRoutePreset,
  LegalPositionCheck,
  ensureSquadMatchup,
  ensure5v5Matchup,
  applyFormationToSquad,
  FLAG_5V5_FORMATIONS,
  STANDARD_DEFENSIVE_ZONES,
  StandardZoneTemplate,
} from "@/lib/playbookTypes";
import {
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
  Plus,
  Trash2,
  Lock,
  Radio,
  Zap,
  ArrowRight,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Check,
  Move,
  Edit2,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Sliders,
  Users
} from "lucide-react";

interface PlayCanvasProps {
  play: PlayDiagram;
  onChange: (updatedPlay: PlayDiagram) => void;
  readOnly?: boolean;
  playbook?: Playbook | null;
}

export default function PlayCanvas({ play, onChange, readOnly = false, playbook }: PlayCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Interaction State
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [draggedWaypointIndex, setDraggedWaypointIndex] = useState<number | null>(null);
  const [draggedZoneId, setDraggedZoneId] = useState<string | null>(null);

  // Smooth drag tracking refs to eliminate snapping/jittering
  const dragStartRef = useRef<{
    playerStartX: number;
    playerStartY: number;
    cursorStartX: number;
    cursorStartY: number;
    initialRoute: RoutePoint[];
  } | null>(null);

  const dragWaypointRef = useRef<{
    startX: number;
    startY: number;
    cursorStartX: number;
    cursorStartY: number;
  } | null>(null);

  const dragZoneRef = useRef<{
    startX: number;
    startY: number;
    cursorStartX: number;
    cursorStartY: number;
  } | null>(null);

  // Active Tool Mode
  const [mode, setMode] = useState<"select" | "draw" | "man" | "zone">("select");

  // Animation State
  const [animating, setAnimating] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  const [animSpeed, setAnimSpeed] = useState<number>(1); // 0.5x, 1x, 1.5x
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const { settings } = useLeague();
  const leagueRulePlayers = settings?.rules?.playersOnField || 5;
  const playbookSquad = playbook?.playersOnField || leagueRulePlayers;

  // Detect squad count from play players or fallback to playbook / league rules
  const currentOff = play.players ? play.players.filter((p) => p.side === "offense").length : 0;
  const initialSquad = currentOff >= 4 && currentOff <= 8 ? currentOff : playbookSquad;
  const [activeSquadSize, setActiveSquadSize] = useState<number>(initialSquad);
  const rushLineDistanceYards = settings?.rules?.rushLineDistance || 7;

  // Sync squad size if playbook or rules change
  useEffect(() => {
    const off = play.players ? play.players.filter((p) => p.side === "offense").length : 0;
    if (off >= 4 && off <= 8) {
      setActiveSquadSize(off);
    } else {
      setActiveSquadSize(playbook?.playersOnField || settings?.rules?.playersOnField || 5);
    }
  }, [play.id, playbook?.playersOnField, settings?.rules?.playersOnField]);

  const offensePlayers = play.players.filter((p) => p.side === "offense");
  const defensePlayers = play.players.filter((p) => p.side === "defense");

  const losY = play.losY || DEFAULT_LOS_Y;
  const rushDistanceY = (rushLineDistanceYards * 12) / 7;
  const rushY = losY - rushDistanceY;

  // Show Opposing Side toggle (offense if defensive playbook, defense if offensive playbook). OFF by default.
  const [showOpposingSide, setShowOpposingSide] = useState<boolean>(false);

  // Filter visible players based on showOpposingSide
  const visiblePlayers = play.players.filter((p) => (showOpposingSide ? true : p.side === play.type));

  // Selected player reference
  const selectedPlayer = play.players.find((p) => p.id === selectedPlayerId) || null;

  // Compute legal status across visible players in play
  const alignmentIssues = visiblePlayers
    .map((p) => ({ player: p, ...checkLegalPosition(p, losY) }))
    .filter((item) => !item.isLegal);

  // Guarantee squad sizing matching active squad size on both sides of the ball
  useEffect(() => {
    const off = play.players.filter((p) => p.side === "offense");
    const def = play.players.filter((p) => p.side === "defense");
    if (off.length !== activeSquadSize || def.length !== activeSquadSize) {
      const sanitized = ensureSquadMatchup(play.players, losY, activeSquadSize);
      onChange({ ...play, players: sanitized });
    }
  }, [play.id, losY, activeSquadSize]);

  // Squad format switcher on canvas
  const handleSquadFormatChange = (newCount: number) => {
    setActiveSquadSize(newCount);
    const sanitized = ensureSquadMatchup(play.players, losY, newCount);
    onChange({ ...play, players: sanitized });
  };

  // --- Animation Loop ---
  const handleToggleAnimate = () => {
    if (animating) {
      setAnimating(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    } else {
      if (progress >= 1) setProgress(0);
      setAnimating(true);
      lastTimeRef.current = performance.now();
    }
  };

  const handleResetAnimate = () => {
    setAnimating(false);
    setProgress(0);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  };

  useEffect(() => {
    if (!animating) return;

    const animateStep = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      // Complete play in ~3.2 seconds at 1x
      const rate = (1 / 3.2) * animSpeed;
      setProgress((prev) => {
        const next = prev + delta * rate;
        if (next >= 1) {
          setAnimating(false);
          return 1;
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(animateStep);
    };

    animFrameRef.current = requestAnimationFrame(animateStep);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [animating, animSpeed]);

  // Convert client cursor coords to SVG percentage (0 - 100)
  const getSvgCoordinates = useCallback(
    (e: React.PointerEvent): { x: number; y: number } | null => {
      if (!svgRef.current) return null;
      const rect = svgRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      const x = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(2, Math.min(98, ((e.clientY - rect.top) / rect.height) * 100));
      return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    },
    []
  );

  // Pointer Down Handlers
  const handlePointerDownPlayer = (e: React.PointerEvent, playerId: string) => {
    e.stopPropagation();
    if (readOnly) return;

    const clickedPlayer = play.players.find((p) => p.id === playerId);
    if (!clickedPlayer) return;

    const currentSelected = play.players.find((p) => p.id === selectedPlayerId);
    const isDefenderInMan =
      currentSelected &&
      currentSelected.side === "defense" &&
      (currentSelected.coverageType === "man" || mode === "man");

    // Requirement: If you select man it should auto show offense, and the db should have a dotted line drawn to whichever receiver is clicked while the db is highlighted.
    if (isDefenderInMan && clickedPlayer.side === "offense" && selectedPlayerId !== playerId) {
      const updatedPlayers = play.players.map((p) => {
        if (p.id === selectedPlayerId) {
          return {
            ...p,
            coverageType: "man" as const,
            manTargetId: playerId,
            route: [],
            zoneId: undefined,
          };
        }
        return p;
      });
      onChange({ ...play, players: updatedPlayers });
      // Strictly keep DB highlighted as requested!
      return;
    }

    const coords = getSvgCoordinates(e);
    if (!coords) return;
    const player = play.players.find((p) => p.id === playerId);
    if (!player) return;

    setSelectedPlayerId(playerId);
    setSelectedZoneId(null);
    setDraggedPlayerId(playerId);
    setDraggedWaypointIndex(null);

    // Record starting coordinates to avoid mouse snapping jump
    dragStartRef.current = {
      playerStartX: player.x,
      playerStartY: player.y,
      cursorStartX: coords.x,
      cursorStartY: coords.y,
      initialRoute: player.route ? player.route.map((pt) => ({ ...pt })) : [],
    };

    // Attach pointer capture to SVG root so fast mouse movement never loses focus
    if (svgRef.current) {
      try {
        svgRef.current.setPointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handlePointerDownWaypoint = (e: React.PointerEvent, playerId: string, wpIndex: number) => {
    e.stopPropagation();
    if (readOnly) return;
    const coords = getSvgCoordinates(e);
    if (!coords) return;
    const player = play.players.find((p) => p.id === playerId);
    const wp = player?.route?.[wpIndex];
    if (!wp) return;

    setSelectedPlayerId(playerId);
    setDraggedPlayerId(playerId);
    setDraggedWaypointIndex(wpIndex);

    dragWaypointRef.current = {
      startX: wp.x,
      startY: wp.y,
      cursorStartX: coords.x,
      cursorStartY: coords.y,
    };

    if (svgRef.current) {
      try {
        svgRef.current.setPointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handlePointerDownZone = (e: React.PointerEvent, zoneId: string) => {
    e.stopPropagation();
    if (readOnly) return;
    const coords = getSvgCoordinates(e);
    if (!coords) return;
    const zone = play.zones?.find((z) => z.id === zoneId);
    if (!zone) return;

    setSelectedZoneId(zoneId);
    setSelectedPlayerId(null);
    setDraggedZoneId(zoneId);

    dragZoneRef.current = {
      startX: zone.x,
      startY: zone.y,
      cursorStartX: coords.x,
      cursorStartY: coords.y,
    };

    if (svgRef.current) {
      try {
        svgRef.current.setPointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  // Pointer Move (Dragging with Strict LOS Clamping)
  const handlePointerMove = (e: React.PointerEvent) => {
    if (readOnly) return;
    const coords = getSvgCoordinates(e);
    if (!coords) return;

    // Dragging Player Starting Node
    if (draggedPlayerId && draggedWaypointIndex === null && dragStartRef.current) {
      const { playerStartX, playerStartY, cursorStartX, cursorStartY, initialRoute } = dragStartRef.current;
      const player = play.players.find((p) => p.id === draggedPlayerId);
      if (!player) return;

      // 1. Calculate raw target with mouse click offset preserved
      const rawTargetX = playerStartX + (coords.x - cursorStartX);
      const rawTargetY = playerStartY + (coords.y - cursorStartY);

      // 2. STRICT LINE OF SCRIMMAGE & 5V5 LEGAL BOUNDARY CLAMPING
      // Offense CANNOT cross LOS (y >= losY). Center is fixed on losY. QB is at least losY + 4.
      // Defense CANNOT cross LOS into backfield (y <= losY - 1). Rusher is at least 7 yds back (y <= rushY).
      const clamped = clampLegalPosition(player, { x: rawTargetX, y: rawTargetY }, losY);

      // 3. Translate initial route relative to player displacement
      const deltaX = clamped.x - playerStartX;
      const deltaY = clamped.y - playerStartY;

      let updatedRoute = initialRoute.map((pt) => ({
        x: Math.max(4, Math.min(96, Math.round((pt.x + deltaX) * 10) / 10)),
        y: Math.max(4, Math.min(96, Math.round((pt.y + deltaY) * 10) / 10)),
      }));

      const isMovingQb =
        player.side === "offense" &&
        (player.label === "QB" || player.role.toLowerCase().includes("qb"));

      if (player.coverageType === "rush" && initialRoute.length >= 2) {
        const qb = play.players.find(
          (pl) => pl.side === "offense" && (pl.label === "QB" || pl.role.toLowerCase().includes("qb"))
        ) || { x: 50, y: losY + 9 };
        const bendPt = {
          x: Math.max(4, Math.min(96, Math.round((initialRoute[0].x + deltaX) * 10) / 10)),
          y: Math.max(4, Math.min(96, Math.round((initialRoute[0].y + deltaY) * 10) / 10)),
        };
        updatedRoute = [bendPt, { x: qb.x, y: qb.y }];
      }

      const updatedPlayers = play.players.map((p) => {
        if (p.id === draggedPlayerId) {
          return { ...p, x: clamped.x, y: clamped.y, route: updatedRoute };
        }
        if (isMovingQb && p.coverageType === "rush" && p.route && p.route.length >= 2) {
          const nextRoute = [...p.route];
          nextRoute[nextRoute.length - 1] = { x: clamped.x, y: clamped.y };
          return { ...p, route: nextRoute };
        }
        return p;
      });
      onChange({ ...play, players: updatedPlayers });
      return;
    }

    // Dragging specific waypoint along route
    if (draggedPlayerId && draggedWaypointIndex !== null && dragWaypointRef.current) {
      const { startX, startY, cursorStartX, cursorStartY } = dragWaypointRef.current;
      const rawX = startX + (coords.x - cursorStartX);
      const rawY = startY + (coords.y - cursorStartY);
      const clampedPt = {
        x: Math.max(4, Math.min(96, Math.round(rawX * 10) / 10)),
        y: Math.max(4, Math.min(96, Math.round(rawY * 10) / 10)),
      };

      const updatedPlayers = play.players.map((p) => {
        if (p.id === draggedPlayerId && p.route) {
          const newRoute = [...p.route];
          newRoute[draggedWaypointIndex] = clampedPt;
          return { ...p, route: newRoute };
        }
        return p;
      });
      onChange({ ...play, players: updatedPlayers });
      return;
    }

    // Dragging Zone Bubble
    if (draggedZoneId && dragZoneRef.current && play.zones) {
      const { startX, startY, cursorStartX, cursorStartY } = dragZoneRef.current;
      const rawX = startX + (coords.x - cursorStartX);
      const rawY = startY + (coords.y - cursorStartY);
      const clampedZone = {
        x: Math.max(10, Math.min(90, Math.round(rawX * 10) / 10)),
        y: Math.max(6, Math.min(losY - 2, Math.round(rawY * 10) / 10)),
      };

      const updatedZones = play.zones.map((z) => {
        if (z.id === draggedZoneId) {
          return { ...z, x: clampedZone.x, y: clampedZone.y };
        }
        return z;
      });
      onChange({ ...play, zones: updatedZones });
      return;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setDraggedPlayerId(null);
    setDraggedWaypointIndex(null);
    setDraggedZoneId(null);
    dragStartRef.current = null;
    dragWaypointRef.current = null;
    dragZoneRef.current = null;
    if (svgRef.current && e) {
      try {
        svgRef.current.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  // Canvas Click (Drawing Mode: Add Waypoint)
  const handleCanvasClick = (e: React.PointerEvent) => {
    if (readOnly) return;
    const coords = getSvgCoordinates(e);
    if (!coords) return;

    if (mode === "draw" && selectedPlayer) {
      const currentRoute = selectedPlayer.route ? [...selectedPlayer.route] : [];
      currentRoute.push(coords);

      const updatedPlayers = play.players.map((p) => {
        if (p.id === selectedPlayer.id) {
          return { ...p, route: currentRoute, quickRouteName: "Custom Route" };
        }
        return p;
      });
      onChange({ ...play, players: updatedPlayers });
    } else if (mode === "select") {
      // Click on blank turf deselects
      setSelectedPlayerId(null);
      setSelectedZoneId(null);
    }
  };

  // Apply Quick Route Preset to currently selected receiver
  const handleApplyPreset = (presetName: string) => {
    if (readOnly || !selectedPlayer) return;
    const pts = generateRoutePreset(presetName, selectedPlayer.x, selectedPlayer.y);
    const updatedPlayers = play.players.map((p) => {
      if (p.id === selectedPlayer.id) {
        return {
          ...p,
          route: pts,
          quickRouteName: presetName,
          routeType: (presetName === "Pre-Snap Motion" ? "motion" : "pass") as any,
        };
      }
      return p;
    });
    onChange({ ...play, players: updatedPlayers });
  };

  // Clear route on selected player
  const handleClearRoute = () => {
    if (readOnly || !selectedPlayer) return;
    const updatedPlayers = play.players.map((p) => {
      if (p.id === selectedPlayer.id) {
        return { ...p, route: [], quickRouteName: undefined, coverageType: undefined, manTargetId: undefined, zoneId: undefined };
      }
      return p;
    });
    onChange({ ...play, players: updatedPlayers });
  };

  // Assign Zone to selected defender
  const handleAssignZone = (zoneId: string) => {
    if (readOnly || !selectedPlayer) return;
    const zone = play.zones?.find((z) => z.id === zoneId);
    if (!zone) return;

    const updatedPlayers = play.players.map((p) => {
      if (p.id === selectedPlayer.id) {
        return {
          ...p,
          coverageType: "zone" as const,
          zoneId,
          route: [{ x: zone.x, y: zone.y }],
        };
      }
      return p;
    });
    onChange({ ...play, players: updatedPlayers });
  };

  // Select Zone Coverage for defender
  const handleSelectZoneCoverage = () => {
    if (readOnly || !selectedPlayer) return;
    setMode("select");
    const updatedPlayers = play.players.map((p) => {
      if (p.id === selectedPlayer.id) {
        return {
          ...p,
          coverageType: "zone" as const,
          manTargetId: undefined,
          quickRouteName: p.quickRouteName || "Zone Drop",
        };
      }
      return p;
    });
    onChange({ ...play, players: updatedPlayers });
  };

  // Assign Standard Zone from templates to selected defender
  const handleAssignStandardZone = (zoneTemplate: StandardZoneTemplate) => {
    if (readOnly || !selectedPlayer) return;

    const targetY = Math.max(8, Math.min(losY - 2, losY + zoneTemplate.relY));
    const targetX = zoneTemplate.x;

    let matchingZone = (play.zones || []).find((z) => z.name === zoneTemplate.name);
    let nextZones = play.zones || [];

    if (!matchingZone) {
      matchingZone = {
        id: `zone-${zoneTemplate.id}-${Date.now()}`,
        name: zoneTemplate.name,
        x: targetX,
        y: targetY,
        rx: zoneTemplate.rx,
        ry: zoneTemplate.ry,
        color: zoneTemplate.color,
      };
      nextZones = [...nextZones, matchingZone];
    }

    const updatedPlayers = play.players.map((p) => {
      if (p.id === selectedPlayer.id) {
        return {
          ...p,
          coverageType: "zone" as const,
          zoneId: matchingZone.id,
          quickRouteName: zoneTemplate.shortName,
          route: [{ x: matchingZone.x, y: matchingZone.y }],
          manTargetId: undefined,
        };
      }
      return p;
    });

    onChange({ ...play, zones: nextZones, players: updatedPlayers });
  };

  // Select Man Coverage for defender: auto-shows offense and activates man targeting
  const handleSelectManCoverage = () => {
    if (readOnly || !selectedPlayer) return;
    setShowOpposingSide(true); // Auto show offense
    setMode("man");

    const updatedPlayers = play.players.map((p) => {
      if (p.id === selectedPlayer.id) {
        return {
          ...p,
          coverageType: "man" as const,
          zoneId: undefined,
          route: [],
          quickRouteName: "Man Lock",
        };
      }
      return p;
    });

    onChange({ ...play, players: updatedPlayers });
  };

  // Set Pass Rush for defender: auto-shows offense, draws line to QB, with bend point
  const handleSetPassRush = () => {
    if (readOnly || !selectedPlayer) return;
    setShowOpposingSide(true); // Auto show offense so QB is visible
    setMode("select");

    const qb = play.players.find(
      (p) => p.side === "offense" && (p.label === "QB" || p.role.toLowerCase().includes("qb"))
    ) || { x: 50, y: losY + 9 };

    const bendX =
      selectedPlayer.x < 45
        ? Math.max(14, selectedPlayer.x - 8)
        : selectedPlayer.x > 55
        ? Math.min(86, selectedPlayer.x + 8)
        : 50;
    const bendY = Math.round(((selectedPlayer.y + qb.y) / 2) * 10) / 10;

    const updatedPlayers = play.players.map((p) => {
      if (p.id === selectedPlayer.id) {
        return {
          ...p,
          coverageType: "rush" as const,
          routeType: "rush" as const,
          quickRouteName: "Pass Rush",
          manTargetId: undefined,
          zoneId: undefined,
          route: [
            { x: Math.round(bendX * 10) / 10, y: bendY },
            { x: qb.x, y: qb.y },
          ],
        };
      }
      return p;
    });

    onChange({ ...play, players: updatedPlayers });
  };

  // Bend rush line to specific side
  const handleBendRush = (direction: "left" | "straight" | "right") => {
    if (readOnly || !selectedPlayer) return;
    const qb = play.players.find(
      (p) => p.side === "offense" && (p.label === "QB" || p.role.toLowerCase().includes("qb"))
    ) || { x: 50, y: losY + 9 };

    let targetX = 50;
    if (direction === "left") {
      targetX = Math.min(28, selectedPlayer.x - 12);
    } else if (direction === "right") {
      targetX = Math.max(72, selectedPlayer.x + 12);
    } else {
      targetX = (selectedPlayer.x + qb.x) / 2;
    }
    const bendY = Math.round(((selectedPlayer.y + qb.y) / 2) * 10) / 10;

    const updatedPlayers = play.players.map((p) => {
      if (p.id === selectedPlayer.id) {
        return {
          ...p,
          coverageType: "rush" as const,
          routeType: "rush" as const,
          route: [
            { x: Math.round(targetX * 10) / 10, y: bendY },
            { x: qb.x, y: qb.y },
          ],
        };
      }
      return p;
    });
    onChange({ ...play, players: updatedPlayers });
  };

  // Add a new Zone Bubble
  const handleAddZoneBubble = (name = "Deep Zone", color = "#3B82F6") => {
    if (readOnly) return;
    const newZone: ZoneBubble = {
      id: `zone-${Date.now()}`,
      name,
      x: 50,
      y: losY - 20,
      rx: 18,
      ry: 10,
      color,
    };
    const updatedZones = [...(play.zones || []), newZone];
    onChange({ ...play, zones: updatedZones });
    setSelectedZoneId(newZone.id);
  };

  // Delete selected Zone Bubble
  const handleDeleteZone = (zoneId: string) => {
    if (readOnly) return;
    const updatedZones = (play.zones || []).filter((z) => z.id !== zoneId);
    const updatedPlayers = play.players.map((p) => (p.zoneId === zoneId ? { ...p, zoneId: undefined, coverageType: undefined } : p));
    onChange({ ...play, zones: updatedZones, players: updatedPlayers });
    setSelectedZoneId(null);
  };

  // Add extra player node (Offense or Defense, max activeSquadSize per side)
  const handleAddPlayer = (roleLabel: string, side: "offense" | "defense") => {
    const currentSideCount = side === "offense" ? offensePlayers.length : defensePlayers.length;
    if (currentSideCount >= activeSquadSize) {
      alert(`${activeSquadSize}v${activeSquadSize} Flag Football rules allow a maximum of ${activeSquadSize} players on ${side}.`);
      return;
    }
    const isOffense = side === "offense";
    const newPlayer: PlayerNode = {
      id: `p-${Date.now()}`,
      label: roleLabel,
      role: isOffense ? `Offensive ${roleLabel}` : `Defensive ${roleLabel}`,
      x: 50 + (Math.random() * 20 - 10),
      y: isOffense
        ? (roleLabel === "C" ? losY : roleLabel === "QB" ? losY + 9 : losY + 1)
        : (roleLabel === "RUSH" ? losY - 13 : losY - 6),
      side,
      route: [],
    };
    onChange({ ...play, players: [...play.players, newPlayer] });
    setSelectedPlayerId(newPlayer.id);
  };

  // Delete / Reset selected player (strictly preserves squad sizing on both sides)
  const handleDeletePlayer = (playerId: string) => {
    const player = play.players.find((p) => p.id === playerId);
    if (!player) return;
    const sameSide = play.players.filter((p) => p.side === player.side);
    if (sameSide.length <= activeSquadSize) {
      // Squad rules require activeSquadSize players on each side: reset node to default alignment & clear route
      const defaultY = player.side === "offense"
        ? (player.label === "C" ? losY : player.label === "QB" ? losY + 9 : losY + 1)
        : (player.label === "RUSH" ? losY - 13 : losY - 6);
      const updatedPlayers = play.players.map((p) => {
        if (p.id === playerId) {
          return {
            ...p,
            y: defaultY,
            route: [],
            quickRouteName: undefined,
            coverageType: player.label === "RUSH" ? ("rush" as const) : ("zone" as const),
            manTargetId: undefined,
            zoneId: undefined,
          };
        }
        return p;
      });
      onChange({ ...play, players: updatedPlayers });
      return;
    }
    const updatedPlayers = play.players.filter((p) => p.id !== playerId);
    onChange({ ...play, players: updatedPlayers });
    setSelectedPlayerId(null);
  };

  // Calculate animated position of player given progress (0 to 1)
  const getAnimatedPlayerPos = (player: PlayerNode): { x: number; y: number } => {
    if (progress <= 0 || !player.route || player.route.length === 0) {
      // QB subtle pocket drop
      if (animating && player.label === "QB") {
        return { x: player.x, y: player.y + progress * 2.5 };
      }
      return { x: player.x, y: player.y };
    }

    // Build complete waypoint path including start point
    const points: RoutePoint[] = [{ x: player.x, y: player.y }, ...player.route];
    if (points.length < 2) return { x: player.x, y: player.y };

    // Calculate total path distance
    const dists: number[] = [];
    let totalDist = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      dists.push(d);
      totalDist += d;
    }

    if (totalDist === 0) return { x: player.x, y: player.y };

    const targetDist = progress * totalDist;
    let accumulated = 0;

    for (let i = 0; i < dists.length; i++) {
      const segDist = dists[i];
      if (accumulated + segDist >= targetDist || i === dists.length - 1) {
        const segProgress = segDist > 0 ? (targetDist - accumulated) / segDist : 0;
        const currentP = points[i];
        const nextP = points[i + 1];
        return {
          x: currentP.x + (nextP.x - currentP.x) * Math.min(1, Math.max(0, segProgress)),
          y: currentP.y + (nextP.y - currentP.y) * Math.min(1, Math.max(0, segProgress)),
        };
      }
      accumulated += segDist;
    }

    return points[points.length - 1];
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full font-sans">
      {/* ============================================================== */}
      {/* MAIN PLAYMAKER CANVAS & FIELD SURFACE                          */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col bg-[#07090E] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
        {/* Top Field Status Bar */}
        <div className="p-4 bg-[#0A0E17] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold">
              <span
                className={`w-2 h-2 rounded-full ${
                  play.type === "offense" ? "bg-cyan-400" : "bg-purple-400"
                }`}
              ></span>
              <span className="uppercase text-white tracking-wider">
                {play.type === "offense" ? "Offensive Play" : "Defensive Play"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
              <Users className="w-3.5 h-3.5" />
              <span>{activeSquadSize}v{activeSquadSize} ({offensePlayers.length}/{activeSquadSize} Off • {defensePlayers.length}/{activeSquadSize} Def)</span>
            </div>

            {/* Quick Canvas Squad Format Selector */}
            {!readOnly && (
              <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-xl border border-white/10 text-xs font-mono">
                <span className="text-[10px] text-neutral-400 uppercase font-bold mr-1 hidden md:inline">Format:</span>
                {[4, 5, 6, 7, 8].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => handleSquadFormatChange(cnt)}
                    className={`px-1.5 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
                      activeSquadSize === cnt
                        ? play.type === "offense"
                          ? "bg-cyan-500 text-black shadow-sm"
                          : "bg-purple-500 text-white shadow-sm"
                        : "text-neutral-400 hover:text-white hover:bg-white/5"
                    }`}
                    title={`Switch play to ${cnt}v${cnt} format`}
                  >
                    {cnt}v{cnt}
                  </button>
                ))}
              </div>
            )}

            <span className="text-xs text-neutral-400 hidden lg:inline font-mono">
              Formation: <span className="text-white font-bold">{play.formation}</span>
            </span>
          </div>

          {/* Controls: Opposing Side Toggle & Legal Positioning Badge */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOpposingSide((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                showOpposingSide
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm"
                  : "bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10"
              }`}
              title={
                showOpposingSide
                  ? `Hide opposing ${play.type === "offense" ? "defense" : "offense"}`
                  : `Show opposing ${play.type === "offense" ? "defense" : "offense"}`
              }
            >
              {showOpposingSide ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>
                {showOpposingSide
                  ? `Hide Opposing ${play.type === "offense" ? "Defense" : "Offense"}`
                  : `Show Opposing ${play.type === "offense" ? "Defense" : "Offense"}`}
              </span>
            </button>

            {alignmentIssues.length === 0 ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>100% Legal Flag Alignment</span>
              </div>
            ) : (
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/40 text-red-400 text-xs font-bold cursor-pointer"
                title={alignmentIssues.map((i) => i.warning).join("\n")}
              >
                <AlertTriangle className="w-3.5 h-3.5 animate-pulse text-red-400" />
                <span>{alignmentIssues.length} Alignment Warning{alignmentIssues.length > 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        </div>

        {/* Animation Simulator Controller Bar */}
        <div className="px-5 py-2.5 bg-black/60 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleAnimate}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all ${
                animating
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              {animating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{animating ? "Pause" : progress >= 1 ? "Replay" : "Play Action"}</span>
            </button>

            <button
              onClick={handleResetAnimate}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              title="Reset Timeline"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-[11px] font-mono text-neutral-500">Speed:</span>
              {[0.5, 1, 1.5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setAnimSpeed(spd)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                    animSpeed === spd
                      ? "bg-white/20 text-white border border-white/20"
                      : "text-neutral-500 hover:text-white"
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Scrubber */}
          <div className="flex items-center gap-3 flex-1 max-w-xs ml-auto">
            <span className="text-[10px] font-mono text-neutral-500 tabular-nums">
              {(progress * 3.2).toFixed(1)}s
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={progress}
              onChange={(e) => {
                setAnimating(false);
                setProgress(parseFloat(e.target.value));
              }}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>

        {/* Interactive Field Viewport */}
        <div
          ref={containerRef}
          className="relative flex-1 w-full aspect-[4/3] sm:aspect-[16/10] bg-[#12231A] overflow-hidden select-none touch-none cursor-crosshair"
        >
          <svg
            ref={svgRef}
            viewBox="0 0 1000 700"
            className="w-full h-full"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerDown={handleCanvasClick}
          >
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
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#06B6D4" />
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
              fill="rgba(255,255,255,0.15)"
              fontSize="34"
              fontWeight="900"
              textAnchor="middle"
              letterSpacing="12"
            >
              END ZONE
            </text>

            {/* Goal Line */}
            <line x1="0" y1="84" x2="1000" y2="84" stroke="#FFFFFF" strokeWidth="4" />

            {/* Yard Lines & Yard Numbers every 10 yards */}
            {[20, 30, 40, 50, 60, 70, 80, 90].map((pct) => {
              const yPos = (pct / 100) * 700;
              const isGoalLine = pct === 12;
              return (
                <g key={pct}>
                  <line
                    x1="0"
                    y1={yPos}
                    x2="1000"
                    y2={yPos}
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="1.5"
                  />
                  {/* Left & Right Hash marks */}
                  <line x1="380" y1={yPos - 5} x2="380" y2={yPos + 5} stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                  <line x1="620" y1={yPos - 5} x2="620" y2={yPos + 5} stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                  <line x1="40" y1={yPos - 4} x2="40" y2={yPos + 4} stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
                  <line x1="960" y1={yPos - 4} x2="960" y2={yPos + 4} stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
                </g>
              );
            })}

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
              <rect x="25" y={(rushY / 100) * 700 - 10} width="130" height="20" rx="6" fill="#FACC15" />
              <text
                x="90"
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
                stroke="#06B6D4"
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
              <rect x="850" y={(losY / 100) * 700 - 10} width="120" height="20" rx="6" fill="#06B6D4" />
              <text
                x="910"
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

            {/* ============================================================== */}
            {/* DEFENSIVE ZONE BUBBLES                                         */}
            {/* ============================================================== */}
            {(play.type === "defense" || showOpposingSide) &&
              play.zones?.map((zone) => {
              const isSelected = selectedZoneId === zone.id;
              return (
                <g
                  key={zone.id}
                  className="cursor-move"
                  onPointerDown={(e) => handlePointerDownZone(e, zone.id)}
                >
                  <ellipse
                    cx={(zone.x / 100) * 1000}
                    cy={(zone.y / 100) * 700}
                    rx={(zone.rx / 100) * 1000}
                    ry={(zone.ry / 100) * 700}
                    fill={zone.color}
                    fillOpacity={isSelected ? 0.28 : 0.16}
                    stroke={zone.color}
                    strokeWidth={isSelected ? 3 : 1.5}
                    strokeDasharray="6 4"
                  />
                  <text
                    x={(zone.x / 100) * 1000}
                    y={(zone.y / 100) * 700 + 4}
                    fill={zone.color}
                    fontSize="13"
                    fontWeight="800"
                    textAnchor="middle"
                    letterSpacing="1"
                    className="select-none pointer-events-none drop-shadow"
                  >
                    {zone.name}
                  </text>
                </g>
              );
            })}

            {/* ============================================================== */}
            {/* MAN COVERAGE DOTTED LOCK LINES                                 */}
            {/* ============================================================== */}
            {play.players
              .filter((p) => p.side === "defense" && p.coverageType === "man" && p.manTargetId)
              .map((def) => {
                const targetOff = play.players.find((p) => p.id === def.manTargetId);
                if (!targetOff) return null;
                if (!showOpposingSide && selectedPlayerId !== def.id) return null;

                const defPos = getAnimatedPlayerPos(def);
                const targetPos = getAnimatedPlayerPos(targetOff);

                const x1 = (defPos.x / 100) * 1000;
                const y1 = (defPos.y / 100) * 700;
                const x2 = (targetPos.x / 100) * 1000;
                const y2 = (targetPos.y / 100) * 700;

                const isDefSelected = selectedPlayerId === def.id;

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
                        x="-30"
                        y="-10"
                        width="60"
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
                        fontSize="8.5"
                        fontWeight="900"
                        textAnchor="middle"
                        letterSpacing="0.8"
                        className="select-none pointer-events-none"
                      >
                        MAN LOCK
                      </text>
                    </g>
                  </g>
                );
              })}

            {/* ============================================================== */}
            {/* ROUTE PATHS (WAYPOINTS, PASS RUSH BEND & ARROWHEADS)           */}
            {/* ============================================================== */}
            {visiblePlayers.map((player) => {
              if (!player.route || player.route.length === 0) return null;

              const isSelected = selectedPlayerId === player.id;
              const startX = (player.x / 100) * 1000;
              const startY = (player.y / 100) * 700;

              const isMotion = player.routeType === "motion";
              const isRush = player.routeType === "rush" || player.coverageType === "rush";

              // For Pass Rusher, lock end point onto the QB and waypoint 0 is the draggable bend point
              const currentQb = play.players.find(
                (p) => p.side === "offense" && (p.label === "QB" || p.role.toLowerCase().includes("qb"))
              ) || { x: 50, y: losY + 9 };

              const bendWp = isRush
                ? player.route[0] || { x: (player.x + currentQb.x) / 2, y: (player.y + currentQb.y) / 2 }
                : null;

              let pathStr = `M ${startX} ${startY}`;
              if (isRush && bendWp) {
                pathStr += ` L ${(bendWp.x / 100) * 1000} ${(bendWp.y / 100) * 700} L ${(currentQb.x / 100) * 1000} ${(currentQb.y / 100) * 700}`;
              } else {
                player.route.forEach((pt) => {
                  pathStr += ` L ${(pt.x / 100) * 1000} ${(pt.y / 100) * 700}`;
                });
              }

              const strokeColor = isMotion
                ? "#F59E0B"
                : isRush
                ? "#EF4444"
                : player.side === "defense"
                ? "#A855F7"
                : "#06B6D4";

              const markerId = isMotion
                ? "url(#arrow-motion)"
                : isRush
                ? "url(#arrow-rush)"
                : player.side === "defense"
                ? "url(#arrow-defense)"
                : "url(#arrow-pass)";

              return (
                <g key={`route-${player.id}`}>
                  {/* Outer selection casing */}
                  {isSelected && (
                    <path
                      d={pathStr}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="8"
                      strokeOpacity="0.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Main Route Line */}
                  <path
                    d={pathStr}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isSelected ? (isRush ? 4.5 : 4) : 3}
                    strokeDasharray={isMotion ? "6 5" : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    markerEnd={markerId}
                    className={isRush && !readOnly ? "cursor-move" : undefined}
                    onPointerDown={(e) => {
                      if (isRush && !readOnly) {
                        handlePointerDownWaypoint(e, player.id, 0);
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
                    player.route.map((pt, wpIdx) => (
                      <circle
                        key={wpIdx}
                        cx={(pt.x / 100) * 1000}
                        cy={(pt.y / 100) * 700}
                        r="7"
                        fill="#0B0F19"
                        stroke={strokeColor}
                        strokeWidth="2.5"
                        className="cursor-pointer"
                        onPointerDown={(e) => handlePointerDownWaypoint(e, player.id, wpIdx)}
                      />
                    ))}
                </g>
              );
            })}

            {/* ============================================================== */}
            {/* PLAYER NODES (OFFENSE & DEFENSE)                              */}
            {/* ============================================================== */}
            {visiblePlayers.map((player) => {
              const isSelected = selectedPlayerId === player.id;
              const isOffense = player.side === "offense";
              const animPos = getAnimatedPlayerPos(player);

              const px = (animPos.x / 100) * 1000;
              const py = (animPos.y / 100) * 700;

              // Check legality on starting spot (not during animation)
              const legality = checkLegalPosition(player, losY);
              const isIllegal = !legality.isLegal;

              return (
                <g
                  key={player.id}
                  className="cursor-pointer"
                  onPointerDown={(e) => handlePointerDownPlayer(e, player.id)}
                >
                  {/* Selection Precision Halo Rings (Static, crisp, no pinwheel) */}
                  {isSelected && (
                    <g>
                      <circle
                        cx={px}
                        cy={py}
                        r="25"
                        fill="none"
                        stroke={isIllegal ? "#EF4444" : isOffense ? "#06B6D4" : "#A855F7"}
                        strokeWidth="2.5"
                        strokeOpacity="0.9"
                      />
                      <circle
                        cx={px}
                        cy={py}
                        r="30"
                        fill="none"
                        stroke={isIllegal ? "#EF4444" : isOffense ? "#06B6D4" : "#A855F7"}
                        strokeWidth="1.5"
                        strokeOpacity="0.4"
                      />
                    </g>
                  )}

                  {/* Illegal Positioning Glow Indicator */}
                  {isIllegal && (
                    <circle cx={px} cy={py} r="24" fill="#EF4444" fillOpacity="0.25" />
                  )}

                  {/* Player Badge Circle */}
                  <circle
                    cx={px}
                    cy={py}
                    r="18"
                    fill={
                      isIllegal
                        ? "#7F1D1D"
                        : isOffense
                        ? player.label === "QB"
                          ? "#0284C7"
                          : player.label === "C"
                          ? "#0E7490"
                          : "#0F172A"
                        : player.label === "RUSH"
                        ? "#991B1B"
                        : "#312E81"
                    }
                    stroke={
                      isIllegal
                        ? "#EF4444"
                        : isSelected
                        ? "#FFFFFF"
                        : isOffense
                        ? "#38BDF8"
                        : "#A855F7"
                    }
                    strokeWidth={isSelected ? 3 : 2}
                  />

                  {/* Player Label Text (QB, C, X, Y, Z, RUSH, etc.) */}
                  <text
                    x={px}
                    y={py + 4.5}
                    fill="#FFFFFF"
                    fontSize="12"
                    fontWeight="900"
                    textAnchor="middle"
                    className="select-none pointer-events-none tracking-tighter"
                  >
                    {player.label}
                  </text>

                  {/* Man Coverage target indicator around receivers when DB is highlighted in Man mode */}
                  {selectedPlayer?.side === "defense" && (selectedPlayer.coverageType === "man" || mode === "man") && isOffense && (
                    <g>
                      <circle
                        cx={px}
                        cy={py}
                        r="25"
                        fill="none"
                        stroke="#EC4899"
                        strokeWidth="2"
                        strokeDasharray="4 3"
                        className="animate-pulse"
                        opacity="0.9"
                      />
                      {selectedPlayer.manTargetId === player.id && (
                        <g transform={`translate(${px}, ${py - 24})`}>
                          <rect
                            x="-22"
                            y="-8"
                            width="44"
                            height="16"
                            rx="8"
                            fill="#EC4899"
                            className="drop-shadow-md"
                          />
                          <text
                            x="0"
                            y="3.5"
                            fill="#FFFFFF"
                            fontSize="8"
                            fontWeight="900"
                            textAnchor="middle"
                            className="select-none pointer-events-none"
                          >
                            LOCKED
                          </text>
                        </g>
                      )}
                    </g>
                  )}

                  {/* Pass Rush target indicator around QB when rusher is highlighted */}
                  {selectedPlayer?.side === "defense" && selectedPlayer.coverageType === "rush" && isOffense && (player.label === "QB" || player.role.toLowerCase().includes("qb")) && (
                    <circle
                      cx={px}
                      cy={py}
                      r="25"
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                      className="animate-pulse"
                      opacity="0.9"
                    />
                  )}

                  {/* Illegal Icon Alert Tag */}
                  {isIllegal && (
                    <g transform={`translate(${px + 10}, ${py - 18})`}>
                      <circle cx="6" cy="6" r="8" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1" />
                      <text x="6" y="9.5" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">
                        !
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Quick On-Field Canvas Helper Tooltip */}
          <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] text-neutral-400 font-mono flex items-center gap-2">
            <Move className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Drag players to reposition • Drag waypoints to shape cuts</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SIDEBAR: ROUTE DRAWING, PLAY SETTINGS, & COVERAGE TOOLS        */}
      {/* ============================================================== */}
      <div className="w-full xl:w-96 flex flex-col gap-5 shrink-0">
        {/* Play Details Info Card */}
        <div className="bg-[#0B0F19] border border-white/10 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-base font-black uppercase text-white tracking-wide">{play.name}</h3>
              <span className="text-xs text-neutral-400 font-mono">
                {play.type === "offense" ? "Offense" : "Defense"} • {play.situation}
              </span>
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block mb-1">
              Play Name
            </label>
            <input
              type="text"
              disabled={readOnly}
              value={play.name}
              onChange={(e) => onChange({ ...play, name: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 focus:border-cyan-500 text-white text-xs outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block mb-1">
                Formation
              </label>
              <input
                type="text"
                disabled={readOnly}
                value={play.formation}
                onChange={(e) => onChange({ ...play, formation: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 focus:border-cyan-500 text-white text-xs outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block mb-1">
                Gameday Situation
              </label>
              <select
                disabled={readOnly}
                value={play.situation}
                onChange={(e) => onChange({ ...play, situation: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 focus:border-cyan-500 text-white text-xs outline-none cursor-pointer"
              >
                <option value="Standard">Standard</option>
                <option value="Red Zone">Red Zone</option>
                <option value="3rd & Short">3rd & Short</option>
                <option value="3rd & Long">3rd & Long</option>
                <option value="Extra Point">Extra Point</option>
                <option value="2-Minute Drill">2-Minute Drill</option>
              </select>
            </div>
          </div>
        </div>

        {/* Selected Player Inspector & Route Tree */}
        {selectedPlayer ? (
          <div className="bg-[#0B0F19] border border-cyan-500/40 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center font-black text-cyan-300 text-xs">
                  {selectedPlayer.label}
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase text-white">{selectedPlayer.role}</h4>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Alignment: ({selectedPlayer.x}%, {selectedPlayer.y}%)
                  </span>
                </div>
              </div>

              {!readOnly && (
                <button
                  onClick={() => handleDeletePlayer(selectedPlayer.id)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                  title={
                    play.players.filter((p) => p.side === selectedPlayer.side).length <= activeSquadSize
                      ? `Reset Player Spot & Clear Route (${activeSquadSize}v${activeSquadSize} requires ${activeSquadSize} players)`
                      : "Remove Player Node"
                  }
                >
                  {play.players.filter((p) => p.side === selectedPlayer.side).length <= activeSquadSize ? (
                    <RotateCcw className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-red-400" />
                  )}
                </button>
              )}
            </div>

            {/* Legal Positioning Status for Selected Player */}
            {(() => {
              const check = checkLegalPosition(selectedPlayer, losY);
              return !check.isLegal ? (
                <div className="bg-red-500/15 border border-red-500/30 p-3 rounded-2xl flex items-start gap-2 text-xs text-red-300">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{check.warning}</span>
                </div>
              ) : null;
            })()}

            {/* Quick 5v5 Position Switcher */}
            <div>
              <label className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block mb-1.5">
                Switch Position (5v5)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(selectedPlayer.side === "offense"
                  ? [
                      { lbl: "C", role: "Center" },
                      { lbl: "QB", role: "Quarterback" },
                      { lbl: "X", role: "Receiver Left" },
                      { lbl: "Z", role: "Receiver Right" },
                      { lbl: "R", role: "Slot / Running Back" },
                    ]
                  : [
                      { lbl: "RUSH", role: "Pass Rusher (7 yds back)" },
                      { lbl: "CB1", role: "Cornerback Left" },
                      { lbl: "CB2", role: "Cornerback Right" },
                      { lbl: "FS", role: "Free Safety" },
                      { lbl: "SS", role: "Strong Safety" },
                      { lbl: "NB", role: "Nickel Corner" },
                    ]
                ).map((pos) => (
                  <button
                    key={pos.lbl}
                    type="button"
                    disabled={readOnly}
                    onClick={() => {
                      const updatedPlayers = play.players.map((p) => {
                        if (p.id === selectedPlayer.id) {
                          let newY = p.y;
                          if (p.side === "offense") {
                            if (pos.lbl === "C") newY = losY;
                            else if (pos.lbl === "QB") newY = Math.max(losY + 4, p.y);
                          } else {
                            if (pos.lbl === "RUSH") newY = Math.min(rushY, p.y);
                          }
                          return {
                            ...p,
                            label: pos.lbl,
                            role: pos.role,
                            y: newY,
                          };
                        }
                        return p;
                      });
                      onChange({ ...play, players: updatedPlayers });
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold transition-all border ${
                      selectedPlayer.label === pos.lbl
                        ? selectedPlayer.side === "offense"
                          ? "bg-cyan-500 text-black border-cyan-400 shadow-md shadow-cyan-500/20"
                          : "bg-purple-500 text-black border-purple-400 shadow-md shadow-purple-500/20"
                        : "bg-black/50 text-neutral-400 border-white/10 hover:text-white"
                    }`}
                  >
                    {pos.lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* OFFENSIVE ROUTE TREE */}
            {selectedPlayer.side === "offense" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Route Tree Presets</span>
                  </span>
                  {selectedPlayer.route && selectedPlayer.route.length > 0 && (
                    <button
                      onClick={handleClearRoute}
                      className="text-[10px] text-neutral-400 hover:text-red-400 underline"
                    >
                      Clear Route
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    "Slant",
                    "Out",
                    "Dig / In",
                    "Post",
                    "Corner",
                    "Go / Streak",
                    "Curl / Hook",
                    "Wheel",
                    "Flat",
                    "Drag / Cross",
                    "Block / Screen",
                  ].map((route) => (
                    <button
                      key={route}
                      type="button"
                      disabled={readOnly}
                      onClick={() => handleApplyPreset(route)}
                      className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all text-center truncate ${
                        selectedPlayer.quickRouteName === route
                          ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                          : "bg-black/50 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-white/5"
                      }`}
                    >
                      {route.split(" / ")[0]}
                    </button>
                  ))}
                </div>

                {/* Freehand Waypoint Click Mode */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => setMode(mode === "draw" ? "select" : "draw")}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border ${
                      mode === "draw"
                        ? "bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/20"
                        : "bg-white/5 hover:bg-white/10 text-neutral-300 border-white/10"
                    }`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{mode === "draw" ? "Clicking on field adds points" : "Freehand Route Draw Mode"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* DEFENSIVE ASSIGNMENT CONTROLS */}
            {selectedPlayer.side === "defense" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Coverage & Assignment</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                    {selectedPlayer.coverageType === "man"
                      ? "MAN LOCK"
                      : selectedPlayer.coverageType === "rush"
                      ? "PASS RUSH"
                      : "ZONE COVERAGE"}
                  </span>
                </div>

                {/* 3 Coverage Type Selector Tabs */}
                <div className="grid grid-cols-3 gap-1.5">
                  {/* Zone Button */}
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={handleSelectZoneCoverage}
                    className={`p-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border ${
                      selectedPlayer.coverageType === "zone" || (!selectedPlayer.coverageType && selectedPlayer.label !== "RUSH")
                        ? "bg-purple-500 text-black border-purple-400 shadow-lg shadow-purple-500/20"
                        : "bg-black/50 text-neutral-300 hover:bg-neutral-800 border-white/5"
                    }`}
                  >
                    <Radio className="w-4 h-4" />
                    <span>Zone</span>
                  </button>

                  {/* Man Lock Button */}
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={handleSelectManCoverage}
                    className={`p-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border ${
                      selectedPlayer.coverageType === "man" || mode === "man"
                        ? "bg-pink-500 text-black border-pink-400 shadow-lg shadow-pink-500/20"
                        : "bg-black/50 text-neutral-300 hover:bg-neutral-800 border-white/5"
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    <span>Man Lock</span>
                  </button>

                  {/* Pass Rush Button */}
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={handleSetPassRush}
                    className={`p-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border ${
                      selectedPlayer.coverageType === "rush"
                        ? "bg-red-500 text-white border-red-400 shadow-lg shadow-red-500/20"
                        : "bg-black/50 text-neutral-300 hover:bg-neutral-800 border-white/5"
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    <span>Pass Rush</span>
                  </button>
                </div>

                {/* --- 1. ZONE COVERAGE: CLICKABLE ZONE OPTIONS --- */}
                {(selectedPlayer.coverageType === "zone" || (!selectedPlayer.coverageType && selectedPlayer.label !== "RUSH")) && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider">
                        Clickable Zone Drops:
                      </label>
                      {selectedPlayer.quickRouteName && (
                        <span className="text-[10px] font-mono font-bold text-purple-400">
                          Active: {selectedPlayer.quickRouteName}
                        </span>
                      )}
                    </div>

                    {(["Deep Zones", "Underneath & Hook", "Flats & Short"] as const).map((category) => {
                      const zonesInCat = STANDARD_DEFENSIVE_ZONES.filter((z) => z.category === category);
                      return (
                        <div key={category} className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                            {category}
                          </span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {zonesInCat.map((zt) => {
                              const isCurrentZone =
                                selectedPlayer.quickRouteName === zt.name ||
                                selectedPlayer.quickRouteName === zt.shortName;
                              return (
                                <button
                                  key={zt.id}
                                  type="button"
                                  disabled={readOnly}
                                  onClick={() => handleAssignStandardZone(zt)}
                                  className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-between text-left ${
                                    isCurrentZone
                                      ? "bg-purple-500 text-black border-purple-400 shadow-md"
                                      : "bg-black/50 text-neutral-300 border-white/10 hover:border-purple-400/40 hover:text-white"
                                  }`}
                                  title={zt.description}
                                >
                                  <div className="flex items-center gap-1.5 overflow-hidden">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full shrink-0"
                                      style={{ backgroundColor: zt.color }}
                                    />
                                    <span className="truncate">{zt.name}</span>
                                  </div>
                                  {isCurrentZone && <Check className="w-3.5 h-3.5 shrink-0 ml-1 text-black" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Pre-existing or custom zones */}
                    {play.zones && play.zones.length > 0 && (
                      <div className="pt-2 border-t border-white/5 space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block">
                          Field Zone Bubbles:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {play.zones.map((z) => (
                            <button
                              key={z.id}
                              type="button"
                              disabled={readOnly}
                              onClick={() => handleAssignZone(z.id)}
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                                selectedPlayer.zoneId === z.id
                                  ? "bg-purple-500 text-black border-purple-400 shadow-sm"
                                  : "bg-white/5 text-neutral-300 border-white/10 hover:border-white/20"
                              }`}
                            >
                              {z.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* --- 2. MAN COVERAGE: AUTO-SHOW OFFENSE & CLICK RECEIVER --- */}
                {selectedPlayer.coverageType === "man" && (
                  <div className="space-y-3 pt-1">
                    <div className="bg-pink-500/10 border border-pink-500/30 rounded-2xl p-3 text-xs text-pink-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Lock className="w-3.5 h-3.5 text-pink-400" />
                        <span>Man-to-Man Lock Mode</span>
                      </div>
                      <p className="text-[11px] text-neutral-300">
                        Click on any receiver directly on the field (or pick below) while this DB is highlighted. A dotted line will connect the defender to the receiver.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block">
                        Lock Onto Receiver:
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {offensePlayers.map((off) => {
                          const isLocked = selectedPlayer.manTargetId === off.id;
                          return (
                            <button
                              key={off.id}
                              type="button"
                              disabled={readOnly}
                              onClick={() => {
                                const updated = play.players.map((p) =>
                                  p.id === selectedPlayer.id
                                    ? { ...p, coverageType: "man" as const, manTargetId: off.id, route: [], zoneId: undefined }
                                    : p
                                );
                                onChange({ ...play, players: updated });
                              }}
                              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-between ${
                                isLocked
                                  ? "bg-pink-500 text-black border-pink-400 shadow-md shadow-pink-500/20"
                                  : "bg-black/50 text-neutral-300 border-white/10 hover:border-pink-400/40 hover:text-white"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-mono font-black">{off.label}</span>
                                <span className="text-[10px] text-neutral-400 font-normal truncate">
                                  {off.role}
                                </span>
                              </div>
                              {isLocked && <Check className="w-3.5 h-3.5 text-black shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {selectedPlayer.manTargetId && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = play.players.map((p) =>
                            p.id === selectedPlayer.id ? { ...p, manTargetId: undefined } : p
                          );
                          onChange({ ...play, players: updated });
                        }}
                        className="w-full py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white text-xs font-bold border border-white/10 transition-colors"
                      >
                        Clear Receiver Lock
                      </button>
                    )}
                  </div>
                )}

                {/* --- 3. PASS RUSH: LINE TO QB WITH BEND HANDLE --- */}
                {selectedPlayer.coverageType === "rush" && (
                  <div className="space-y-3 pt-1">
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 text-xs text-red-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Zap className="w-3.5 h-3.5 text-red-400" />
                        <span>Pass Rush Blitz to QB</span>
                      </div>
                      <p className="text-[11px] text-neutral-300">
                        Line is locked directly to the QB. Drag the yellow <strong className="text-amber-400">BEND RUSH</strong> handle on the field to bend the line and show which side to rush.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block">
                        Bend Rush Side:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => handleBendRush("left")}
                          className="px-2 py-2 rounded-xl bg-black/50 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-white/10 text-xs font-bold transition-all flex flex-col items-center gap-1"
                        >
                          <ArrowRight className="w-3.5 h-3.5 rotate-180 text-amber-400" />
                          <span>Rush Left</span>
                        </button>
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => handleBendRush("straight")}
                          className="px-2 py-2 rounded-xl bg-black/50 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-white/10 text-xs font-bold transition-all flex flex-col items-center gap-1"
                        >
                          <ArrowRight className="w-3.5 h-3.5 -rotate-90 text-red-400" />
                          <span>Bull Rush</span>
                        </button>
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => handleBendRush("right")}
                          className="px-2 py-2 rounded-xl bg-black/50 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-white/10 text-xs font-bold transition-all flex flex-col items-center gap-1"
                        >
                          <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                          <span>Rush Right</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : selectedZoneId ? (
          // Selected Zone Bubble Inspector
          (() => {
            const currentZone = play.zones?.find((z) => z.id === selectedZoneId);
            if (!currentZone) return null;
            return (
              <div className="bg-[#0B0F19] border border-purple-500/40 rounded-3xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="text-sm font-black uppercase text-white">Zone Inspector</h4>
                  <button
                    onClick={() => handleDeleteZone(currentZone.id)}
                    className="p-1.5 text-neutral-500 hover:text-red-400 rounded-lg hover:bg-white/5"
                    title="Delete Zone"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block mb-1">
                    Zone Title
                  </label>
                  <input
                    type="text"
                    value={currentZone.name}
                    onChange={(e) => {
                      const updatedZones = play.zones?.map((z) =>
                        z.id === currentZone.id ? { ...z, name: e.target.value } : z
                      );
                      onChange({ ...play, zones: updatedZones });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block mb-1">
                      Width (Radius X)
                    </label>
                    <input
                      type="range"
                      min={8}
                      max={35}
                      value={currentZone.rx}
                      onChange={(e) => {
                        const updatedZones = play.zones?.map((z) =>
                          z.id === currentZone.id ? { ...z, rx: parseInt(e.target.value) } : z
                        );
                        onChange({ ...play, zones: updatedZones });
                      }}
                      className="w-full h-1.5 bg-neutral-800 rounded accent-purple-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block mb-1">
                      Depth (Radius Y)
                    </label>
                    <input
                      type="range"
                      min={6}
                      max={25}
                      value={currentZone.ry}
                      onChange={(e) => {
                        const updatedZones = play.zones?.map((z) =>
                          z.id === currentZone.id ? { ...z, ry: parseInt(e.target.value) } : z
                        );
                        onChange({ ...play, zones: updatedZones });
                      }}
                      className="w-full h-1.5 bg-neutral-800 rounded accent-purple-400"
                    />
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          // Default Field Actions & 5v5 Matchup Palette
          <div className="bg-[#0B0F19] border border-white/10 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
                5v5 Matchup Squads
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                {offensePlayers.length}/5 Off • {defensePlayers.length}/5 Def
              </span>
            </div>

            {/* OFFENSE SQUAD SECTION */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Offense ({offensePlayers.length}/{activeSquadSize})</span>
                </span>
                {offensePlayers.length === activeSquadSize && (
                  <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    Full ({activeSquadSize}/{activeSquadSize})
                  </span>
                )}
              </div>
              {offensePlayers.length < activeSquadSize ? (
                <div className="flex flex-wrap gap-1.5">
                  {["C", "QB", "X", "Z", "R", "H", "Y", "RB"].slice(0, activeSquadSize).map((role) => (
                    <button
                      key={role}
                      type="button"
                      disabled={readOnly}
                      onClick={() => handleAddPlayer(role, "offense")}
                      className="px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all"
                    >
                      + {role}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] text-neutral-400 leading-relaxed">
                    {activeSquadSize} offensive players set (C on LOS, QB, WRs/Backs). Click any player on field to draw routes.
                  </p>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block mb-1">
                      Snap to Formation Alignment:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {["Spread 2x1", "Trips Right", "Bunch Right", "Spread 2x2"].map((formName) => (
                        <button
                          key={formName}
                          type="button"
                          disabled={readOnly}
                          onClick={() => {
                            const updated = applyFormationToSquad(play.players, formName, "offense", losY);
                            onChange({ ...play, players: updated, formation: formName });
                          }}
                          className={`px-2 py-1 rounded-xl text-[10px] font-bold border transition-all ${
                            play.formation === formName
                              ? "bg-cyan-500 text-black border-cyan-400 shadow-sm"
                              : "bg-black/50 text-neutral-300 border-white/10 hover:border-cyan-500/40"
                          }`}
                        >
                          {formName}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* DEFENSE SQUAD SECTION */}
            <div className="space-y-2.5 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold text-purple-400 tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Defense ({defensePlayers.length}/{activeSquadSize})</span>
                </span>
                {defensePlayers.length === activeSquadSize && (
                  <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    Full ({activeSquadSize}/{activeSquadSize})
                  </span>
                )}
              </div>
              {defensePlayers.length < activeSquadSize ? (
                <div className="flex flex-wrap gap-1.5">
                  {["RUSH", "CB1", "CB2", "FS", "SS", "MLB", "WLB", "SLB"].slice(0, activeSquadSize).map((role) => (
                    <button
                      key={role}
                      type="button"
                      disabled={readOnly}
                      onClick={() => handleAddPlayer(role, "defense")}
                      className="px-2.5 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all"
                    >
                      + {role}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] text-neutral-400 leading-relaxed">
                    {activeSquadSize} defensive players set (1 Rusher {rushLineDistanceYards} yds back, DBs/LBs). Click any player on field to assign coverage.
                  </p>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block mb-1">
                      Snap to Defensive Alignment:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {["Cover 2 Zone", "Cover 1 Man Lock", "Cover 3 Cloud", "Goal Line Tight"].map((defFormName) => (
                        <button
                          key={defFormName}
                          type="button"
                          disabled={readOnly}
                          onClick={() => {
                            const updated = applyFormationToSquad(play.players, defFormName, "defense", losY);
                            onChange({ ...play, players: updated });
                          }}
                          className="px-2 py-1 rounded-xl text-[10px] font-bold border bg-black/50 text-neutral-300 border-white/10 hover:border-purple-500/40 transition-all"
                        >
                          {defFormName.split(" ")[0] + " " + (defFormName.split(" ")[1] || "")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-white/10">
              <button
                type="button"
                disabled={readOnly}
                onClick={() => handleAddZoneBubble("Zone Area", "#8B5CF6")}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider border border-white/10 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Zone Coverage Bubble</span>
              </button>
            </div>
          </div>
        )}

        {/* Coach Gameday Notes */}
        <div className="bg-[#0B0F19] border border-white/10 rounded-3xl p-5 space-y-2">
          <label className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block">
            Coach Playbook Notes / Progression
          </label>
          <textarea
            rows={3}
            disabled={readOnly}
            value={play.notes || ""}
            onChange={(e) => onChange({ ...play, notes: e.target.value })}
            placeholder="e.g. Read free safety: if rotating weakside, hit X on post. Checkdown to RB on 3rd step."
            className="w-full p-3 rounded-2xl bg-black/50 border border-white/10 focus:border-cyan-500 text-white text-xs outline-none resize-none leading-relaxed"
          ></textarea>
        </div>
      </div>
    </div>
  );
}
