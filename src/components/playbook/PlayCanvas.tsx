"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useLeague } from "@/lib/leagueContext";
import {
  PlayerNode,
  RoutePoint,
  RouteType,
  ZoneBubble,
  PlayDiagram,
  Playbook,
  DEFAULT_LOS_Y,
  RUSH_LINE_DISTANCE,
  YARD_HEIGHT_PCT,
  snapYToYard,
  getYardsFromLos,
  getYFromYards,
  FieldPositionPreset,
  FIELD_POSITION_PRESETS,
  RoutePresetDefinition,
  ROUTE_PRESETS_CATALOG,
  CustomRoutePreset,
  MAX_CUSTOM_ROUTE_PRESETS_PER_TEAM,
  getTeamCustomRoutePresets,
  saveTeamCustomRoutePreset,
  deleteTeamCustomRoutePreset,
  applyCustomRoutePreset,
  generateRoutePreset,
  generateRoutePresetDetails,
  playerHasMotion,
  getPlayerMotionPath,
  getPlayerRouteOrigin,
  FLAG_PLAYERS_PER_SIDE,
  checkLegalPosition,
  clampLegalPosition,
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
  Users,
  MapPin,
  Magnet,
  ChevronDown,
  SlidersHorizontal,
  Hash,
  Ruler,
  Compass,
  Bookmark,
  FileText,
  Star,
  X,
  Layers,
  MessageSquare,
} from "lucide-react";

const PRIMARY_FLAG_ROUTES = [
  { name: "Slant", short: "Slant" },
  { name: "Out", short: "Out" },
  { name: "Dig / In", short: "Dig" },
  { name: "Post", short: "Post" },
  { name: "Corner", short: "Corner" },
  { name: "Go / Streak", short: "Go" },
  { name: "Curl / Hook", short: "Curl" },
  { name: "Hitch", short: "Hitch" },
  { name: "Flat", short: "Flat" },
  { name: "Wheel", short: "Wheel" },
  { name: "Drag / Cross", short: "Drag" },
  { name: "Fade", short: "Fade" },
  { name: "Whip / Pivot", short: "Whip" },
  { name: "Screen", short: "Screen" },
  { name: "Jet Motion", short: "Jet Motion" },
  { name: "Orbit Motion", short: "Orbit Motion" },
];

function interpolatePointsAlongPath(points: RoutePoint[], progress: number): { x: number; y: number } {
  if (points.length === 0) return { x: 50, y: 50 };
  if (points.length === 1 || progress <= 0) return { x: points[0].x, y: points[0].y };
  if (progress >= 1) return { x: points[points.length - 1].x, y: points[points.length - 1].y };

  const dists: number[] = [];
  let totalDist = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const d = Math.sqrt(dx * dx + dy * dy);
    dists.push(d);
    totalDist += d;
  }

  if (totalDist === 0) return { x: points[0].x, y: points[0].y };

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
}

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
    initialMotionPath: RoutePoint[];
  } | null>(null);

  const dragWaypointRef = useRef<{
    startX: number;
    startY: number;
    cursorStartX: number;
    cursorStartY: number;
    isMotionWp?: boolean;
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

  const { settings, isDemoLeague, activeLeagueId } = useLeague();
  const isDemo = Boolean(isDemoLeague || activeLeagueId === "default" || activeLeagueId === "demo");
  const leagueRulePlayers = settings?.rules?.playersOnField || 5;
  const playbookSquad = playbook?.playersOnField || leagueRulePlayers;

  // Detect squad count from play players or fallback to playbook / league rules
  const currentOff = play.players ? play.players.filter((p) => p.side === "offense").length : 0;
  const initialSquad = currentOff >= 4 && currentOff <= 8 ? currentOff : playbookSquad;
  const [activeSquadSize, setActiveSquadSize] = useState<number>(initialSquad);
  const rushLineDistanceYards = settings?.rules?.rushLineDistance || 7;

  // Routes snap to yard lines vertically (ON by default as requested)
  const [snapToYardLines, setSnapToYardLines] = useState<boolean>(true);
  const [draggedWaypointYards, setDraggedWaypointYards] = useState<number | null>(null);
  const [isFieldPositionMenuOpen, setIsFieldPositionMenuOpen] = useState<boolean>(false);

  // Team ID & Custom Route Presets State (Up to 20 additional custom route presets per team)
  const teamId = play.teamId || playbook?.teamId || "default";
  const [customPresets, setCustomPresets] = useState<CustomRoutePreset[]>([]);
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState(false);
  const [isPresetMenuOpen, setIsPresetMenuOpen] = useState(false);
  const presetMenuRef = useRef<HTMLDivElement>(null);
  const [newPresetName, setNewPresetName] = useState("");
  const [isPositionNotesModalOpen, setIsPositionNotesModalOpen] = useState(false);
  const [isPlayNotesModalOpen, setIsPlayNotesModalOpen] = useState(false);

  // Close preset routes menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (presetMenuRef.current && !presetMenuRef.current.contains(e.target as Node)) {
        setIsPresetMenuOpen(false);
      }
    };
    if (isPresetMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isPresetMenuOpen]);

  useEffect(() => {
    if (teamId) {
      if (isDemo) {
        // In demo league, custom presets are ephemeral and disappear on tab refresh
        setCustomPresets([]);
      } else {
        setCustomPresets(getTeamCustomRoutePresets(teamId));
      }
    }
  }, [teamId, isDemo]);

  // Selected player reference
  const selectedPlayer = (play.players || []).find((p) => p.id === selectedPlayerId) || null;

  const handleSaveCurrentRouteAsPreset = () => {
    if (!selectedPlayer?.route || selectedPlayer.route.length === 0) return;
    if (customPresets.length >= MAX_CUSTOM_ROUTE_PRESETS_PER_TEAM) {
      alert(`Maximum of ${MAX_CUSTOM_ROUTE_PRESETS_PER_TEAM} custom route presets per team reached.`);
      return;
    }
    const trimmed = newPresetName.trim();
    if (!trimmed) return;

    const offsets = selectedPlayer.route.map((pt) => ({
      dx: Math.round((pt.x - selectedPlayer.x) * 10) / 10,
      dy: Math.round((pt.y - selectedPlayer.y) * 10) / 10,
    }));

    const newPreset: CustomRoutePreset = {
      id: `crp_${Date.now()}`,
      name: trimmed,
      shortName: trimmed.length > 12 ? trimmed.slice(0, 10) + "…" : trimmed,
      teamId,
      category: "Custom",
      offsets,
      createdAt: new Date().toISOString(),
    };

    if (isDemo) {
      // In demo league: ephemeral in-memory only, disappears on tab refresh, not saved to localStorage or DB
      setCustomPresets((prev) => [
        ...prev.filter((p) => p.name.toLowerCase() !== trimmed.toLowerCase()),
        newPreset,
      ].slice(0, MAX_CUSTOM_ROUTE_PRESETS_PER_TEAM));
      setNewPresetName("");
      setIsSavePresetModalOpen(false);
      return;
    }

    const success = saveTeamCustomRoutePreset(teamId, newPreset);
    if (success) {
      setCustomPresets(getTeamCustomRoutePresets(teamId));
      setNewPresetName("");
      setIsSavePresetModalOpen(false);
    }
  };

  const handleDeleteCustomPreset = (presetId: string, presetName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete custom preset "${presetName}"?`)) {
      if (isDemo) {
        setCustomPresets((prev) => prev.filter((p) => p.id !== presetId));
        return;
      }
      deleteTeamCustomRoutePreset(teamId, presetId);
      setCustomPresets(getTeamCustomRoutePresets(teamId));
    }
  };

  const handleApplyCustomPreset = (preset: CustomRoutePreset) => {
    if (readOnly) return;
    const targetPlayer =
      selectedPlayer ||
      play.players.find((p) => p.side === "offense" && (p.role === "WR" || p.role === "TE" || p.role === "RB" || p.label === "X")) ||
      play.players.find((p) => p.side === "offense");
    if (!targetPlayer) return;

    if (!selectedPlayer || selectedPlayer.id !== targetPlayer.id) {
      setSelectedPlayerId(targetPlayer.id);
    }

    const origin = getPlayerRouteOrigin(targetPlayer);
    const hasMotion = playerHasMotion(targetPlayer);
    const motionPts = hasMotion ? getPlayerMotionPath(targetPlayer) : null;
    const newRoute = applyCustomRoutePreset(preset, origin.x, origin.y);
    const updated = play.players.map((p) =>
      p.id === targetPlayer.id
        ? {
            ...p,
            hasMotion,
            motionPath: motionPts || undefined,
            motionName: targetPlayer.motionName || (hasMotion ? "Jet Motion" : undefined),
            route: newRoute,
            quickRouteName: preset.name,
            routeType: "pass" as const,
            coverageType: undefined,
            zoneId: undefined,
            manTargetId: undefined,
          }
        : p
    );
    onChange({ ...play, players: updated });
  };

  const handleUpdatePlayerNotes = (playerId: string, notes: string) => {
    if (readOnly) return;
    const updated = play.players.map((p) =>
      p.id === playerId ? { ...p, notes } : p
    );
    onChange({ ...play, players: updated });
  };

  const playbookFormations = Array.from(
    new Set([
      ...(playbook?.formations?.map((f) => f.name) || []),
      ...(playbook?.plays?.map((p) => p.formation) || []),
      play.formation,
      ...(play.type === "defense"
        ? ["Cover 2 Zone", "Cover 1 Man Lock", "Cover 3 Cloud", "Goal Line Tight"]
        : ["Spread 2x1", "Trips Right", "Bunch Right", "Spread 2x2", "I-Formation", "Empty", "Double Wing"]),
    ].filter(Boolean))
  );

  const SITUATION_OPTIONS = [
    "Standard",
    "3rd & Short",
    "3rd & Long",
    "Red Zone",
    "Extra Point",
    "2-Minute Drill",
    "Goal Line",
  ];

  // Field Position helper (calculates current yardLine and territory)
  const getPlayFieldPosition = useCallback((p: PlayDiagram) => {
    let yardLine = p.fieldYardLine;
    let side = p.fieldSide;
    if (yardLine === undefined || side === undefined) {
      if (p.situation === "Red Zone") {
        yardLine = 20;
        side = "opp";
      } else if (p.situation === "Extra Point") {
        yardLine = 5;
        side = "opp";
      } else {
        yardLine = 20;
        side = "own";
      }
    }
    const label =
      p.fieldPosition ||
      (side === "midfield" ? "Midfield (50)" : `${side === "opp" ? "Opp" : "Own"} ${yardLine}`);
    return { yardLine, side, label };
  }, []);

  const handleFieldPositionChange = (
    yardLine: number,
    side: "own" | "opp" | "midfield",
    customLabel?: string
  ) => {
    if (readOnly) return;
    const label =
      customLabel ||
      (side === "midfield" ? "Midfield (50)" : `${side === "opp" ? "Opp" : "Own"} ${yardLine}`);
    onChange({
      ...play,
      fieldYardLine: yardLine,
      fieldSide: side,
      fieldPosition: label,
    });
    setIsFieldPositionMenuOpen(false);
  };

  // Sync squad size if playbook or rules change
  useEffect(() => {
    const off = play.players ? play.players.filter((p) => p.side === "offense").length : 0;
    if (off >= 4 && off <= 8) {
      setActiveSquadSize(off);
    } else {
      setActiveSquadSize(playbook?.playersOnField || settings?.rules?.playersOnField || 5);
    }
  }, [play.id, playbook?.playersOnField, settings?.rules?.playersOnField]);

  // Auto-select a receiver if none is selected so route presets are immediately visible and active in-frame
  useEffect(() => {
    if (!selectedPlayerId && play.players && play.players.length > 0) {
      const preferred =
        play.players.find(
          (p) => p.side === (play.type === "defense" ? "defense" : "offense") && p.label !== "QB" && p.label !== "C"
        ) || play.players.find((p) => p.side === (play.type === "defense" ? "defense" : "offense"));
      if (preferred) {
        setSelectedPlayerId(preferred.id);
      }
    }
  }, [play.id, play.type, selectedPlayerId]);

  const offensePlayers = play.players.filter((p) => p.side === "offense");
  const defensePlayers = play.players.filter((p) => p.side === "defense");

  const losY = play.losY || DEFAULT_LOS_Y;
  const rushDistanceY = rushLineDistanceYards * YARD_HEIGHT_PCT;
  const rushY = losY - rushDistanceY;

  // Show Opposing Side toggle (offense if defensive playbook, defense if offensive playbook). OFF by default.
  const [showOpposingSide, setShowOpposingSide] = useState<boolean>(false);

  // Filter visible players based on showOpposingSide
  const visiblePlayers = (play.players || []).filter((p) => (showOpposingSide ? true : p.side === play.type));

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

  // Convert client cursor coords to SVG percentage (0 - 100) with precise SVG screen transformation
  const getSvgCoordinates = useCallback(
    (e: React.PointerEvent): { x: number; y: number } | null => {
      const svg = svgRef.current;
      if (!svg) return null;

      try {
        const ctm = svg.getScreenCTM();
        if (ctm) {
          const pt = svg.createSVGPoint ? svg.createSVGPoint() : new DOMPoint(e.clientX, e.clientY);
          pt.x = e.clientX;
          pt.y = e.clientY;
          const svgP = pt.matrixTransform(ctm.inverse());
          // svgP.x is in viewBox coordinates (0 to 1000)
          // svgP.y is in viewBox coordinates (0 to 700)
          const x = Math.max(2, Math.min(98, (svgP.x / 1000) * 100));
          const y = Math.max(2, Math.min(98, (svgP.y / 700) * 100));
          return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
        }
      } catch (err) {
        console.warn("SVG getScreenCTM transform fallback:", err);
      }

      // Fallback if getScreenCTM is unavailable
      const rect = svg.getBoundingClientRect();
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
      initialMotionPath: player.motionPath ? player.motionPath.map((pt) => ({ ...pt })) : [],
    };

    // Attach pointer capture to SVG root so fast mouse movement never loses focus
    if (svgRef.current) {
      try {
        svgRef.current.setPointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handlePointerDownWaypoint = (
    e: React.PointerEvent,
    playerId: string,
    wpIndex: number,
    isMotionWp = false
  ) => {
    e.stopPropagation();
    if (readOnly) return;
    const coords = getSvgCoordinates(e);
    if (!coords) return;
    const player = play.players.find((p) => p.id === playerId);
    const wp = isMotionWp
      ? player?.motionPath?.[wpIndex]
      : player?.route?.[wpIndex];
    if (!wp) return;

    setSelectedPlayerId(playerId);
    setDraggedPlayerId(playerId);
    setDraggedWaypointIndex(wpIndex);

    dragWaypointRef.current = {
      startX: wp.x,
      startY: wp.y,
      cursorStartX: coords.x,
      cursorStartY: coords.y,
      isMotionWp,
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
      const { playerStartX, playerStartY, cursorStartX, cursorStartY, initialRoute, initialMotionPath } = dragStartRef.current;
      const player = play.players.find((p) => p.id === draggedPlayerId);
      if (!player) return;

      // 1. Calculate raw target with mouse click offset preserved
      const rawTargetX = playerStartX + (coords.x - cursorStartX);
      const rawTargetY = playerStartY + (coords.y - cursorStartY);

      // 2. STRICT LINE OF SCRIMMAGE & 5V5 LEGAL BOUNDARY CLAMPING
      // Offense CANNOT cross LOS (y >= losY). Center is fixed on losY. QB is at least losY + 4.
      // Defense CANNOT cross LOS into backfield (y <= losY - 1). Rusher is at least 7 yds back (y <= rushY).
      const clamped = clampLegalPosition(player, { x: rawTargetX, y: rawTargetY }, losY);

      // 3. Translate initial route & motion path relative to player displacement
      const deltaX = clamped.x - playerStartX;
      const deltaY = clamped.y - playerStartY;

      let updatedRoute = initialRoute.map((pt) => ({
        x: Math.max(4, Math.min(96, Math.round((pt.x + deltaX) * 10) / 10)),
        y: Math.max(4, Math.min(96, Math.round((pt.y + deltaY) * 10) / 10)),
      }));

      let updatedMotionPath = initialMotionPath?.length
        ? initialMotionPath.map((pt) => ({
            x: Math.max(4, Math.min(96, Math.round((pt.x + deltaX) * 10) / 10)),
            y: Math.max(4, Math.min(96, Math.round((pt.y + deltaY) * 10) / 10)),
          }))
        : undefined;

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
          return {
            ...p,
            x: clamped.x,
            y: clamped.y,
            route: updatedRoute,
            ...(updatedMotionPath !== undefined ? { motionPath: updatedMotionPath } : {}),
          };
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

    // Dragging specific waypoint along route or motion path
    if (draggedPlayerId && draggedWaypointIndex !== null && dragWaypointRef.current) {
      const { startX, startY, cursorStartX, cursorStartY, isMotionWp } = dragWaypointRef.current;
      const rawX = startX + (coords.x - cursorStartX);
      const rawY = startY + (coords.y - cursorStartY);
      const clampedPt = {
        x: Math.max(4, Math.min(96, Math.round(rawX * 10) / 10)),
        y: Math.max(4, Math.min(96, Math.round(rawY * 10) / 10)),
      };

      const updatedPlayers = play.players.map((p) => {
        if (p.id === draggedPlayerId) {
          if (isMotionWp && p.motionPath) {
            const newMotion = [...p.motionPath];
            newMotion[draggedWaypointIndex] = clampedPt;
            return { ...p, motionPath: newMotion };
          } else if (!isMotionWp && p.route) {
            const newRoute = [...p.route];
            newRoute[draggedWaypointIndex] = clampedPt;
            return { ...p, route: newRoute };
          }
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

      const hasMotion = playerHasMotion(selectedPlayer);
      const motionPts = hasMotion ? getPlayerMotionPath(selectedPlayer) : null;

      const updatedPlayers = play.players.map((p) => {
        if (p.id === selectedPlayer.id) {
          return {
            ...p,
            hasMotion,
            motionPath: motionPts || undefined,
            motionName: selectedPlayer.motionName || (hasMotion ? "Jet Motion" : undefined),
            route: currentRoute,
            quickRouteName: "Custom Route",
            routeType: "pass" as const,
          };
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
    if (readOnly) return;
    const targetPlayer =
      selectedPlayer ||
      play.players.find((p) => p.side === "offense" && (p.role === "WR" || p.role === "TE" || p.role === "RB" || p.label === "X")) ||
      play.players.find((p) => p.side === "offense");
    if (!targetPlayer) return;

    if (!selectedPlayer || selectedPlayer.id !== targetPlayer.id) {
      setSelectedPlayerId(targetPlayer.id);
    }

    const currentLosY = play.losY ?? DEFAULT_LOS_Y;
    const isMotionPreset =
      presetName.toLowerCase().includes("motion") ||
      presetName.toLowerCase().includes("shift");

    if (isMotionPreset) {
      // User selected a motion preset (e.g. Jet Motion, Orbit Motion, Shift, Return Motion)
      const motionPts = generateRoutePreset(presetName, targetPlayer.x, targetPlayer.y, currentLosY);
      const motionEnd = motionPts[motionPts.length - 1];

      // Does targetPlayer already have a post-snap route (distinct from pure motion)?
      const hadPostSnapRoute = Boolean(
        targetPlayer.route &&
        targetPlayer.route.length > 0 &&
        targetPlayer.routeType !== "motion"
      );

      let updatedPostSnapRoute = targetPlayer.route;
      if (hadPostSnapRoute && targetPlayer.quickRouteName) {
        // Re-anchor existing post-snap route preset from the new motion finish point
        updatedPostSnapRoute = generateRoutePreset(targetPlayer.quickRouteName, motionEnd.x, motionEnd.y, currentLosY);
      }

      const updatedPlayers = play.players.map((p) => {
        if (p.id === targetPlayer.id) {
          if (hadPostSnapRoute) {
            return {
              ...p,
              hasMotion: true,
              motionPath: motionPts,
              motionName: presetName,
              route: updatedPostSnapRoute,
              routeType: "pass" as RouteType,
              coverageType: undefined,
              zoneId: undefined,
              manTargetId: undefined,
            };
          } else {
            return {
              ...p,
              hasMotion: true,
              motionPath: motionPts,
              motionName: presetName,
              route: motionPts,
              quickRouteName: presetName,
              routeType: "motion" as RouteType,
              coverageType: undefined,
              zoneId: undefined,
              manTargetId: undefined,
            };
          }
        }
        // IFAF & Flag Rule: Only 1 player can be in pre-snap motion simultaneously
        if (playerHasMotion(p) && p.side === "offense") {
          return {
            ...p,
            hasMotion: false,
            motionPath: undefined,
            motionName: undefined,
            routeType: (p.routeType === "motion" ? "pass" : p.routeType) as RouteType,
          };
        }
        return p;
      });
      onChange({ ...play, players: updatedPlayers });
      return;
    }

    // Standard Route Preset (Slant, Out, Dig, Post, Corner, Go, Wheel, Flat, Curl, etc.)
    const hasMotion = playerHasMotion(targetPlayer);
    const motionPts = hasMotion ? getPlayerMotionPath(targetPlayer) : null;
    const origin = motionPts && motionPts.length > 0 ? motionPts[motionPts.length - 1] : { x: targetPlayer.x, y: targetPlayer.y };

    const pts = generateRoutePreset(presetName, origin.x, origin.y, currentLosY);

    const updatedPlayers = play.players.map((p) => {
      if (p.id === targetPlayer.id) {
        return {
          ...p,
          hasMotion: hasMotion,
          motionPath: motionPts || undefined,
          motionName: targetPlayer.motionName || (hasMotion ? (targetPlayer.quickRouteName?.includes("Motion") ? targetPlayer.quickRouteName : "Jet Motion") : undefined),
          route: pts,
          quickRouteName: presetName,
          routeType: "pass" as RouteType,
          coverageType: undefined,
          zoneId: undefined,
          manTargetId: undefined,
        };
      }
      return p;
    });
    onChange({ ...play, players: updatedPlayers });
  };

  // Toggle pre-snap motion on/off for selected offensive player
  const handleToggleMotion = () => {
    if (readOnly) return;
    const targetPlayer =
      selectedPlayer ||
      play.players.find((p) => p.side === "offense" && (p.role === "WR" || p.role === "TE" || p.role === "RB" || p.label === "X")) ||
      play.players.find((p) => p.side === "offense");
    if (!targetPlayer) return;

    if (!selectedPlayer || selectedPlayer.id !== targetPlayer.id) {
      setSelectedPlayerId(targetPlayer.id);
    }

    const currentLosY = play.losY ?? DEFAULT_LOS_Y;
    const isCurrentlyMotion = playerHasMotion(targetPlayer);

    if (!isCurrentlyMotion) {
      // Toggling motion ON:
      const motionPts = generateRoutePreset("Jet Motion", targetPlayer.x, targetPlayer.y, currentLosY);
      const motionEnd = motionPts[motionPts.length - 1];

      const hadPostSnapRoute = Boolean(
        targetPlayer.route &&
        targetPlayer.route.length > 0 &&
        targetPlayer.routeType !== "motion"
      );

      let updatedRoute = motionPts;
      let nextRouteType: RouteType = "motion";
      let nextQuickName = "Jet Motion";

      if (hadPostSnapRoute) {
        nextRouteType = "pass";
        nextQuickName = targetPlayer.quickRouteName || "Custom Route";
        if (targetPlayer.quickRouteName && targetPlayer.quickRouteName !== "Custom Route") {
          updatedRoute = generateRoutePreset(targetPlayer.quickRouteName, motionEnd.x, motionEnd.y, currentLosY);
        } else if (targetPlayer.route) {
          const deltaX = motionEnd.x - targetPlayer.x;
          const deltaY = motionEnd.y - targetPlayer.y;
          updatedRoute = targetPlayer.route.map((pt) => ({
            x: Math.max(4, Math.min(96, Math.round((pt.x + deltaX) * 10) / 10)),
            y: Math.max(4, Math.min(96, Math.round((pt.y + deltaY) * 10) / 10)),
          }));
        }
      }

      const updatedPlayers = play.players.map((p) => {
        if (p.id === targetPlayer.id) {
          return {
            ...p,
            hasMotion: true,
            motionPath: motionPts,
            motionName: "Jet Motion",
            route: updatedRoute,
            quickRouteName: nextQuickName,
            routeType: nextRouteType,
            coverageType: undefined,
            zoneId: undefined,
            manTargetId: undefined,
          };
        }
        // Ensure single motion player adherence
        if (playerHasMotion(p) && p.side === "offense") {
          return {
            ...p,
            hasMotion: false,
            motionPath: undefined,
            motionName: undefined,
            routeType: (p.routeType === "motion" ? "pass" : p.routeType) as RouteType,
          };
        }
        return p;
      });
      onChange({ ...play, players: updatedPlayers });
    } else {
      // Toggling motion OFF:
      const motionPts = getPlayerMotionPath(targetPlayer);
      const motionEnd = motionPts && motionPts.length > 0 ? motionPts[motionPts.length - 1] : { x: targetPlayer.x, y: targetPlayer.y };

      const hadPostSnapRoute = Boolean(
        targetPlayer.route &&
        targetPlayer.route.length > 0 &&
        targetPlayer.routeType !== "motion"
      );

      let updatedRoute: RoutePoint[] = [];
      let updatedQuickName: string | undefined = undefined;

      if (hadPostSnapRoute) {
        if (targetPlayer.quickRouteName && targetPlayer.quickRouteName !== "Custom Route") {
          updatedRoute = generateRoutePreset(targetPlayer.quickRouteName, targetPlayer.x, targetPlayer.y, currentLosY);
          updatedQuickName = targetPlayer.quickRouteName;
        } else if (targetPlayer.route) {
          const deltaX = targetPlayer.x - motionEnd.x;
          const deltaY = targetPlayer.y - motionEnd.y;
          updatedRoute = targetPlayer.route.map((pt) => ({
            x: Math.max(4, Math.min(96, Math.round((pt.x + deltaX) * 10) / 10)),
            y: Math.max(4, Math.min(96, Math.round((pt.y + deltaY) * 10) / 10)),
          }));
          updatedQuickName = "Custom Route";
        }
      }

      const updatedPlayers = play.players.map((p) => {
        if (p.id === targetPlayer.id) {
          return {
            ...p,
            hasMotion: false,
            motionPath: undefined,
            motionName: undefined,
            route: updatedRoute,
            quickRouteName: updatedQuickName,
            routeType: "pass" as RouteType,
          };
        }
        return p;
      });
      onChange({ ...play, players: updatedPlayers });
    }
  };

  // Clear route on selected player
  const handleClearRoute = () => {
    if (readOnly || !selectedPlayer) return;
    const updatedPlayers = play.players.map((p) => {
      if (p.id === selectedPlayer.id) {
        return {
          ...p,
          route: [],
          quickRouteName: undefined,
          coverageType: undefined,
          manTargetId: undefined,
          zoneId: undefined,
          hasMotion: false,
          motionPath: undefined,
          motionName: undefined,
          routeType: (p.routeType === "motion" ? "pass" : p.routeType) as RouteType,
        };
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
    const isOffense = player.side === "offense";
    const hasMotion = isOffense && playerHasMotion(player);
    const motionPts = hasMotion ? getPlayerMotionPath(player) : null;
    const hasPostSnapRoute = Boolean(
      player.route &&
      player.route.length > 0 &&
      (player.routeType !== "motion" || !motionPts)
    );

    const hasAnyMotionInPlay = play.players.some((p) => p.side === "offense" && playerHasMotion(p));

    if (hasAnyMotionInPlay) {
      if (progress <= 0.35) {
        // Pre-snap phase: motion player runs their motion path; all others hold alignment
        if (hasMotion && motionPts && motionPts.length > 0) {
          const fullMotionPoints = [{ x: player.x, y: player.y }, ...motionPts];
          const motionProg = Math.min(1, Math.max(0, progress / 0.35));
          return interpolatePointsAlongPath(fullMotionPoints, motionProg);
        }
        return { x: player.x, y: player.y };
      }

      // Post-snap phase: progress > 0.35
      const postSnapProg = Math.min(1, Math.max(0, (progress - 0.35) / 0.65));

      if (hasPostSnapRoute && player.route && player.route.length > 0) {
        const origin = motionPts && motionPts.length > 0 ? motionPts[motionPts.length - 1] : { x: player.x, y: player.y };
        const fullRoutePoints = [origin, ...player.route];
        return interpolatePointsAlongPath(fullRoutePoints, postSnapProg);
      }

      if (hasMotion && motionPts && motionPts.length > 0) {
        return motionPts[motionPts.length - 1];
      }

      if (animating && player.label === "QB") {
        return { x: player.x, y: player.y + postSnapProg * 2.5 };
      }

      return { x: player.x, y: player.y };
    }

    // Play without motion:
    if (hasPostSnapRoute && player.route && player.route.length > 0) {
      const fullRoutePoints = [{ x: player.x, y: player.y }, ...player.route];
      return interpolatePointsAlongPath(fullRoutePoints, progress);
    }

    if (animating && player.label === "QB") {
      return { x: player.x, y: player.y + progress * 2.5 };
    }

    return { x: player.x, y: player.y };
  };

  return (
    <div className="flex flex-col lg:flex-row gap-2.5 sm:gap-3 w-full max-w-full overflow-hidden font-sans h-full min-h-0">
      {/* ============================================================== */}
      {/* LEFT: MAIN PLAYMAKER CANVAS & FIELD SURFACE + ANIMATION BAR    */}
      {/* ============================================================== */}
      <div className="flex-1 min-w-0 flex flex-col bg-[#07090E] border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl relative h-full">
        {/* ============================================================== */}
        {/* UNIFIED TOP COMMAND BAR: NAME, FORMATION, SITUATION & CONTROLS */}
        {/* ============================================================== */}
        <div className="p-2 sm:p-2.5 bg-gradient-to-r from-[#0B0F19] via-[#0D1220] to-[#0B0F19] border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Play Name Editable Field */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[130px] sm:min-w-[180px] max-w-sm">
            <span className="text-[10px] font-black uppercase text-cyan-400 font-mono tracking-wider">Play:</span>
            <input
              type="text"
              disabled={readOnly}
              value={play.name}
              onChange={(e) => onChange({ ...play, name: e.target.value })}
              placeholder="Play Name..."
              className="w-full text-xs sm:text-sm font-black text-white uppercase tracking-wider bg-black/40 hover:bg-black/60 focus:bg-black/80 focus:border-cyan-500 rounded-xl px-2.5 py-1 border border-white/10 outline-none transition-all shadow-inner"
            />
          </div>

          {/* Formation Dropdown & Gameday Situation Dropdown */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Formation Dropdown */}
            <div className="flex items-center gap-1 bg-black/50 border border-white/10 rounded-xl px-2 py-1 shadow-inner">
              <span className="text-[10px] font-bold uppercase text-neutral-400 font-mono">Formation:</span>
              <select
                disabled={readOnly}
                value={play.formation}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__ADD_NEW__") {
                    const customForm = prompt("Enter new formation name for this playbook:");
                    if (customForm && customForm.trim()) {
                      const trimmedForm = customForm.trim();
                      const updated = applyFormationToSquad(play.players, trimmedForm, play.type, losY);
                      onChange({ ...play, formation: trimmedForm, players: updated });
                    }
                  } else {
                    const updated = applyFormationToSquad(play.players, val, play.type, losY);
                    onChange({ ...play, formation: val, players: updated });
                  }
                }}
                className="bg-transparent text-xs font-black text-cyan-300 outline-none cursor-pointer max-w-[150px] truncate"
              >
                {playbookFormations.map((fName) => (
                  <option key={fName} value={fName} className="bg-[#0B0F19] text-white">
                    {fName}
                  </option>
                ))}
                {!readOnly && (
                  <option value="__ADD_NEW__" className="bg-[#0B0F19] text-amber-300 font-bold">
                    + Add New Formation...
                  </option>
                )}
              </select>
            </div>

            {/* Gameday Situation Dropdown */}
            <div className="flex items-center gap-1 bg-black/50 border border-white/10 rounded-xl px-2 py-1 shadow-inner">
              <span className="text-[10px] font-bold uppercase text-neutral-400 font-mono">Situation:</span>
              <select
                disabled={readOnly}
                value={play.situation || "Standard"}
                onChange={(e) => onChange({ ...play, situation: e.target.value })}
                className="bg-transparent text-xs font-bold text-neutral-200 outline-none cursor-pointer"
              >
                {SITUATION_OPTIONS.map((sit) => (
                  <option key={sit} value={sit} className="bg-[#0B0F19] text-white">
                    {sit}
                  </option>
                ))}
              </select>
            </div>

            {/* Coach Play Notes Button */}
            <button
              type="button"
              onClick={() => setIsPlayNotesModalOpen(true)}
              className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                play.notes && play.notes.trim().length > 0
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                  : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
              }`}
              title="Open general coaching notes & scheme progression"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Notes</span>
            </button>

            {/* Opposing Side Toggle */}
            <button
              type="button"
              onClick={() => setShowOpposingSide((prev) => !prev)}
              className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
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
              <span className="hidden sm:inline">{showOpposingSide ? "Opponent On" : "Opponent Off"}</span>
            </button>

            {/* Legal Alignment Status Badge */}
            {alignmentIssues.length === 0 ? (
              <div className="hidden 2xl:flex items-center gap-1 px-2 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Legal</span>
              </div>
            ) : (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 text-xs font-bold cursor-pointer"
                title={alignmentIssues.map((i) => i.warning).join("\n")}
              >
                <AlertTriangle className="w-3.5 h-3.5 animate-pulse text-red-400" />
                <span>{alignmentIssues.length} Warning{alignmentIssues.length > 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Field Viewport */}
        <div
          ref={containerRef}
          className="relative flex-1 w-full aspect-[16/10] lg:aspect-auto bg-[#12231A] overflow-hidden select-none touch-none cursor-crosshair min-h-[250px]"
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
              <rect x="850" y={(losY / 100) * 700 - 10} width="120" height="20" rx="6" fill="#3ca505" />
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
              const isSelected = selectedPlayerId === player.id;
              const isOffense = player.side === "offense";
              const isRush = player.routeType === "rush" || player.coverageType === "rush";

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
                const currentQb = play.players.find(
                  (p) => p.side === "offense" && (p.label === "QB" || p.role.toLowerCase().includes("qb"))
                ) || { x: 50, y: losY + 9 };

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
                      {!readOnly && isSelected && motionPts?.map((pt, wpIdx) => (
                        <circle
                          key={`motion-wp-${wpIdx}`}
                          cx={(pt.x / 100) * 1000}
                          cy={(pt.y / 100) * 700}
                          r="6"
                          fill="#0B0F19"
                          stroke="#F59E0B"
                          strokeWidth="2"
                          className="cursor-pointer"
                          onPointerDown={(e) => handlePointerDownWaypoint(e, player.id, wpIdx, true)}
                        />
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
                      <path
                        d={routePathStr}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={isSelected ? (isRush ? 4.5 : 4) : 3}
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
                        player.route?.map((pt, wpIdx) => (
                          <circle
                            key={`route-wp-${wpIdx}`}
                            cx={(pt.x / 100) * 1000}
                            cy={(pt.y / 100) * 700}
                            r="7"
                            fill="#0B0F19"
                            stroke={strokeColor}
                            strokeWidth="2.5"
                            className="cursor-pointer"
                            onPointerDown={(e) => handlePointerDownWaypoint(e, player.id, wpIdx, false)}
                          />
                        ))}
                    </g>
                  )}
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
                        stroke={isIllegal ? "#EF4444" : isOffense ? "#3ca505" : "#A855F7"}
                        strokeWidth="2.5"
                        strokeOpacity="0.9"
                      />
                      <circle
                        cx={px}
                        cy={py}
                        r="30"
                        fill="none"
                        stroke={isIllegal ? "#EF4444" : isOffense ? "#3ca505" : "#A855F7"}
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

                  {/* Pre-Snap Motion Halo Ring */}
                  {isOffense && playerHasMotion(player) && (
                    <circle
                      cx={px}
                      cy={py}
                      r="23"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="2.2"
                      strokeDasharray="4 3"
                      className="animate-pulse"
                      opacity="0.95"
                    />
                  )}

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

                  {/* Pre-Snap Motion Mini Floating Badge */}
                  {isOffense && playerHasMotion(player) && (
                    <g transform={`translate(${px}, ${py - 24})`}>
                      <rect
                        x="-24"
                        y="-7"
                        width="48"
                        height="14"
                        rx="7"
                        fill="#0B0F19"
                        stroke="#F59E0B"
                        strokeWidth="1.2"
                      />
                      <text
                        x="0"
                        y="3.5"
                        fill="#FBBF24"
                        fontSize="7.5"
                        fontWeight="900"
                        textAnchor="middle"
                        letterSpacing="0.5"
                        className="select-none pointer-events-none"
                      >
                        ⚡ MOTION
                      </text>
                    </g>
                  )}

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
          <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] text-neutral-400 font-mono flex items-center gap-2 pointer-events-none">
            <Move className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Drag players to reposition • Drag waypoints to shape cuts</span>
          </div>
        </div>

        {/* Animation Simulator Controller Bar (Attached directly beneath field) */}
        <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-black/75 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleAnimate}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold uppercase tracking-wider text-xs transition-all cursor-pointer ${
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
              className="p-1 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Reset Timeline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1 ml-1">
              <span className="text-[10px] font-mono text-neutral-500">Speed:</span>
              {[0.5, 1, 1.5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setAnimSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
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
          <div className="flex items-center gap-2 flex-1 max-w-xs ml-auto">
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
      </div>

      {/* ============================================================== */}
      {/* RIGHT: TACTICAL CONTROL DOCK (PLAYER ROSTER, ROUTES & SCHEMES) */}
      {/* ============================================================== */}
      <div className="lg:w-[390px] xl:w-[440px] 2xl:w-[480px] shrink-0 flex flex-col bg-[#0A0E17] border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl h-full min-h-0">
        <div className="p-3 sm:p-3.5 flex-1 min-h-0 overflow-y-auto space-y-2.5 scrollbar-thin">
          {/* Top Control Bar: Active Player Quick Selector & Tool Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Player Selection Pills with Coaching Notes Indicator */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mr-1 flex items-center gap-1">
                <Users className="w-3 h-3 text-cyan-400" />
                <span>Player:</span>
              </span>
              {(play.type === "defense" ? defensePlayers : offensePlayers).map((p) => {
                const isSelected = selectedPlayer?.id === p.id;
                const hasRoute = p.route && p.route.length > 0;
                const hasNotes = p.notes && p.notes.trim().length > 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlayerId(p.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all border flex items-center gap-1.5 ${
                      isSelected
                        ? p.side === "offense"
                          ? "bg-cyan-500 text-black border-cyan-400 shadow-md shadow-cyan-500/25 ring-2 ring-cyan-400/30"
                          : "bg-purple-500 text-black border-purple-400 shadow-md shadow-purple-500/25 ring-2 ring-purple-400/30"
                        : "bg-black/60 text-neutral-300 border-white/10 hover:border-white/30 hover:text-white"
                    }`}
                  >
                    <span>{p.label}</span>
                    {hasRoute && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? "bg-black" : p.side === "offense" ? "bg-cyan-400" : "bg-purple-400"
                        }`}
                        title="Route Waypoints Placed"
                      />
                    )}
                    {hasNotes && (
                      <span
                        className={`text-[9px] ${isSelected ? "text-black" : "text-amber-400 font-bold"}`}
                        title={`Position note: ${p.notes}`}
                      >
                        📝
                      </span>
                    )}
                    {p.routeType === "motion" && (
                      <span
                        className={`text-[10px] ${isSelected ? "text-black" : "text-amber-400 font-bold"}`}
                        title="Pre-snap motion player"
                      >
                        ⚡
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Player Status & Action Buttons */}
            <div className="flex items-center gap-2 ml-auto">
              {selectedPlayer && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono">
                  <span className="text-neutral-400">{selectedPlayer.role}:</span>
                  <span
                    className={`font-bold ${
                      selectedPlayer.side === "offense" ? "text-cyan-400" : "text-purple-400"
                    }`}
                  >
                    {selectedPlayer.quickRouteName ||
                      (selectedPlayer.route && selectedPlayer.route.length > 0
                        ? "Custom Route"
                        : selectedPlayer.coverageType?.toUpperCase() || "No Route")}
                  </span>
                </div>
              )}

              {/* View All Position Notes / Install Sheet */}
              <button
                type="button"
                onClick={() => setIsPositionNotesModalOpen(true)}
                className="px-2.5 py-1 rounded-xl text-xs font-bold text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1.5"
                title="View & Edit Coaching Notes for all positions"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Position Notes Sheet</span>
              </button>

              {/* Freehand Route Draw Mode Toggle */}
              {!readOnly && selectedPlayer && selectedPlayer.side === "offense" && (
                <button
                  type="button"
                  onClick={() => setMode(mode === "draw" ? "select" : "draw")}
                  title={mode === "draw" ? "Drawing mode active: Click on field to add points" : "Enable Freehand Click-to-Draw"}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                    mode === "draw"
                      ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/25"
                      : "bg-white/5 hover:bg-white/10 text-neutral-300 border-white/10"
                  }`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{mode === "draw" ? "Drawing Active" : "Draw Route"}</span>
                  <span className="md:hidden">Draw</span>
                </button>
              )}

              {/* Clear Route Button */}
              {!readOnly && selectedPlayer?.route && selectedPlayer.route.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearRoute}
                  title="Clear Route / Assignment"
                  className="px-2 py-1 rounded-xl text-xs font-bold text-neutral-400 hover:text-red-400 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 transition-all flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Position Coaching Notes Bar for Currently Selected Player */}
          {selectedPlayer && (
            <div className="flex items-center gap-2.5 bg-black/70 border border-white/10 rounded-2xl px-3 py-2 shadow-inner">
              <div className="flex items-center gap-1.5 shrink-0 text-cyan-400 font-mono text-[11px] font-bold">
                <FileText className="w-3.5 h-3.5" />
                <span>{selectedPlayer.label} ({selectedPlayer.role}) Notes:</span>
              </div>
              <input
                type="text"
                disabled={readOnly}
                value={selectedPlayer.notes || ""}
                onChange={(e) => handleUpdatePlayerNotes(selectedPlayer.id, e.target.value)}
                placeholder={`Coaching assignment & read progression notes for ${selectedPlayer.label}...`}
                className="flex-1 bg-transparent text-xs text-white placeholder:text-neutral-500 outline-none"
              />
            </div>
          )}

          {/* Offense Route Presets Controls */}
          {selectedPlayer?.side === "offense" ? (
            <div className="space-y-2 relative" ref={presetMenuRef}>
              {/* Header row: Route assignment info & Action Buttons */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    <span>Route Assignment ({selectedPlayer.label}):</span>
                  </span>
                  {playerHasMotion(selectedPlayer) && (
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 text-[10px] flex items-center gap-1 shadow-sm">
                      <Activity className="w-3 h-3 text-amber-400" />
                      <span>{selectedPlayer.motionName || "Motion"} ⚡</span>
                    </span>
                  )}
                  {selectedPlayer.quickRouteName && (
                    <span
                      className={`px-2 py-0.5 rounded-lg font-bold text-[11px] border ${
                        selectedPlayer.routeType === "motion"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                      }`}
                    >
                      {selectedPlayer.quickRouteName}
                    </span>
                  )}
                  {!selectedPlayer.quickRouteName && !playerHasMotion(selectedPlayer) && (
                    <span className="text-[11px] text-neutral-400 font-mono">
                      {selectedPlayer.route && selectedPlayer.route.length > 0
                        ? `${selectedPlayer.route.length} custom point${selectedPlayer.route.length > 1 ? "s" : ""}`
                        : "No route drawn"}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  {/* Pre-Snap Motion Toggle Button */}
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={handleToggleMotion}
                    data-testid="toggle-motion-btn"
                    className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
                      playerHasMotion(selectedPlayer)
                        ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/30 font-black"
                        : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 hover:border-amber-500/50"
                    }`}
                    title={
                      playerHasMotion(selectedPlayer)
                        ? "Pre-snap motion active (click to remove pre-snap motion)"
                        : "Set this player to Pre-Snap Motion (dashed amber route, moves pre-snap)"
                    }
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>{playerHasMotion(selectedPlayer) ? "Motion Active ⚡" : "Pre-Snap Motion"}</span>
                  </button>

                  {/* Preset Routes Menu Toggle Button */}
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => setIsPresetMenuOpen((prev) => !prev)}
                    data-testid="route-presets-toggle"
                    className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
                      isPresetMenuOpen
                        ? "bg-cyan-500 text-black border-cyan-400 shadow-cyan-500/30"
                        : "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{isPresetMenuOpen ? "Hide Catalog" : "Preset Routes"}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isPresetMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Add Preset Button */}
                  {!readOnly && (
                    <button
                      type="button"
                      disabled={customPresets.length >= MAX_CUSTOM_ROUTE_PRESETS_PER_TEAM}
                      onClick={() => {
                        if (!selectedPlayer.route || selectedPlayer.route.length === 0) {
                          alert(`Please click on the field in Draw Mode to create a route for ${selectedPlayer.label} first, then click Add Preset.`);
                          return;
                        }
                        setNewPresetName(`${selectedPlayer.label} Custom Route`);
                        setIsSavePresetModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                      title={isDemo ? "Add temporary custom preset (session only)" : `Save current route as custom preset (${customPresets.length}/${MAX_CUSTOM_ROUTE_PRESETS_PER_TEAM})`}
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Add Preset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Instant 1-Click Horizontal Route Ribbon */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {PRIMARY_FLAG_ROUTES.map((route) => {
                  const isMotionRoute = route.name.toLowerCase().includes("motion");
                  const isCurrent =
                    selectedPlayer.quickRouteName?.toLowerCase() === route.name.toLowerCase() ||
                    selectedPlayer.quickRouteName?.toLowerCase() === route.short.toLowerCase();
                  return (
                    <button
                      key={route.name}
                      type="button"
                      disabled={readOnly}
                      onClick={() => handleApplyPreset(route.name)}
                      data-testid={`quick-route-${route.short.toLowerCase().replace(/\s+/g, "-")}`}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border flex items-center gap-1.5 cursor-pointer ${
                        isCurrent
                          ? isMotionRoute
                            ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/30 font-black"
                            : "bg-cyan-500 text-black border-cyan-400 shadow-md shadow-cyan-500/25 font-black"
                          : isMotionRoute
                          ? "bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-white border-amber-500/30"
                          : "bg-black/50 text-neutral-300 hover:bg-neutral-800 hover:text-white border-white/10"
                      }`}
                      title={`Apply ${route.name} route to ${selectedPlayer.label}`}
                    >
                      {isMotionRoute && <Activity className="w-3 h-3 text-amber-400" />}
                      <span>{route.short}</span>
                      {isCurrent && <Check className="w-3 h-3 text-black stroke-[3]" />}
                    </button>
                  );
                })}

                <div className="w-[1px] h-6 bg-white/10 mx-1 shrink-0" />

                {/* Quick toggle for all presets */}
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => setIsPresetMenuOpen((prev) => !prev)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 border flex items-center gap-1.5 cursor-pointer ${
                    isPresetMenuOpen
                      ? "bg-cyan-500 text-black border-cyan-400 shadow-md shadow-cyan-500/30"
                      : "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                  }`}
                  title="Browse full route catalog and custom team routes"
                >
                  <Zap className="w-3 h-3" />
                  <span>All Routes ({ROUTE_PRESETS_CATALOG.length + customPresets.length})</span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isPresetMenuOpen ? "rotate-180" : ""}`} />
                </button>
              </div>

              {/* Inline Collapsible Catalog Drawer (rendered in-flow so overflow-hidden never clips it) */}
              {isPresetMenuOpen && (
                <div
                  data-testid="route-presets-catalog"
                  className="mt-2.5 bg-[#080D1A] border border-cyan-500/40 rounded-2xl p-4 shadow-2xl space-y-3.5 transition-all animate-in fade-in zoom-in-95"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-white">Route Tree & Team Presets Catalog</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPresetMenuOpen(false)}
                      className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
                      title="Close catalog"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Custom Team Presets Section */}
                  {customPresets.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current text-amber-400" />
                        <span>Custom Team Presets ({customPresets.length}):</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                        {customPresets.map((cp) => {
                          const isCurrent = selectedPlayer.quickRouteName === cp.name;
                          return (
                            <div key={cp.id} className="relative group">
                              <button
                                type="button"
                                disabled={readOnly}
                                onClick={() => {
                                  handleApplyCustomPreset(cp);
                                }}
                                className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between gap-1.5 cursor-pointer ${
                                  isCurrent
                                    ? "bg-emerald-500 text-black border-emerald-400 shadow-md font-extrabold"
                                    : "bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/50 hover:text-white border-emerald-500/30"
                                }`}
                              >
                                <span className="truncate">{cp.name}</span>
                                {isCurrent && <Check className="w-3 h-3 text-black shrink-0" />}
                              </button>
                              {!readOnly && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteCustomPreset(cp.id, cp.name, e)}
                                  className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600/80 hover:bg-red-500 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  title={`Delete preset ${cp.name}`}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Standard Catalog Route Tree */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center justify-between">
                      <span>Standard Route Tree Catalog ({ROUTE_PRESETS_CATALOG.length})</span>
                      <span className="text-[10px] text-cyan-400/80 font-mono">Click to preview route on {selectedPlayer.label}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                      {ROUTE_PRESETS_CATALOG.map((rp) => {
                        const isCurrent =
                          selectedPlayer.quickRouteName === rp.name ||
                          selectedPlayer.quickRouteName === rp.shortName;
                        return (
                          <button
                            key={rp.name}
                            type="button"
                            disabled={readOnly}
                            onClick={() => {
                              handleApplyPreset(rp.name);
                            }}
                            data-testid={`catalog-route-${rp.shortName.toLowerCase()}`}
                            className={`p-2.5 rounded-xl text-xs font-bold text-left transition-all border flex items-start justify-between gap-2 cursor-pointer ${
                              isCurrent
                                ? "bg-cyan-500 text-black border-cyan-400 shadow-md font-extrabold"
                                : "bg-black/60 text-neutral-200 hover:bg-neutral-800 hover:text-white border-white/10"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-black truncate">{rp.name}</span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase ${
                                    isCurrent ? "bg-black/20 text-black" : "bg-white/10 text-neutral-400"
                                  }`}
                                >
                                  {rp.category}
                                </span>
                              </div>
                              <div
                                className={`text-[10px] mt-0.5 line-clamp-2 ${
                                  isCurrent ? "text-black/80 font-medium" : "text-neutral-400 font-normal"
                                }`}
                              >
                                {rp.description}
                              </div>
                            </div>
                            {isCurrent && <Check className="w-4 h-4 text-black shrink-0 mt-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom add preset shortcut inside menu */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400 font-mono text-[10px]">
                      {isDemo ? "⚡ Demo Mode: Presets are session-only" : `Capacity: ${customPresets.length}/20 custom presets`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedPlayer.route || selectedPlayer.route.length === 0) {
                          alert(`Draw a route for ${selectedPlayer.label} on the field first, then click Add Preset.`);
                          return;
                        }
                        setNewPresetName(`${selectedPlayer.label} Custom Route`);
                        setIsSavePresetModalOpen(true);
                      }}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save Current Route as Preset</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : selectedPlayer?.side === "defense" ? (
            /* Defense Coverage Presets Ribbon */
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  <span>Coverage & Assignment ({selectedPlayer.label}):</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">
                  Click assignment to apply to {selectedPlayer.label} on the field above
                </span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {/* 3 Main Defensive Modes */}
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={handleSelectZoneCoverage}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border flex items-center gap-1.5 ${
                    selectedPlayer.coverageType === "zone" || (!selectedPlayer.coverageType && selectedPlayer.label !== "RUSH")
                      ? "bg-purple-500 text-black border-purple-400 shadow-md shadow-purple-500/25"
                      : "bg-black/50 text-neutral-300 hover:bg-neutral-800 border-white/10"
                  }`}
                >
                  <Radio className="w-3 h-3" />
                  <span>Zone</span>
                </button>

                <button
                  type="button"
                  disabled={readOnly}
                  onClick={handleSelectManCoverage}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border flex items-center gap-1.5 ${
                    selectedPlayer.coverageType === "man" || mode === "man"
                      ? "bg-pink-500 text-black border-pink-400 shadow-md shadow-pink-500/25"
                      : "bg-black/50 text-neutral-300 hover:bg-neutral-800 border-white/10"
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  <span>Man Lock</span>
                </button>

                <button
                  type="button"
                  disabled={readOnly}
                  onClick={handleSetPassRush}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border flex items-center gap-1.5 ${
                    selectedPlayer.coverageType === "rush"
                      ? "bg-red-500 text-white border-red-400 shadow-md shadow-red-500/25"
                      : "bg-black/50 text-neutral-300 hover:bg-neutral-800 border-white/10"
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  <span>Pass Rush</span>
                </button>

                <div className="w-[1px] h-6 bg-white/10 mx-1 shrink-0" />

                {/* Standard Zones Quick Shortcuts */}
                {STANDARD_DEFENSIVE_ZONES.map((zt) => {
                  const isCurrent =
                    selectedPlayer.quickRouteName === zt.name ||
                    selectedPlayer.quickRouteName === zt.shortName;
                  return (
                    <button
                      key={zt.id}
                      type="button"
                      disabled={readOnly}
                      onClick={() => handleAssignStandardZone(zt)}
                      title={zt.description}
                      className={`px-2 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border flex items-center gap-1.5 ${
                        isCurrent
                          ? "bg-purple-500 text-black border-purple-400 shadow-md"
                          : "bg-black/50 text-neutral-300 hover:border-purple-400/40 hover:text-white border-white/10"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: zt.color }}
                      />
                      <span>{zt.shortName}</span>
                      {isCurrent && <Check className="w-3 h-3 text-black stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : play.type !== "defense" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400 font-mono py-1">
                <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Choose Receiver to Assign Route:</span>
                </span>
                <span className="text-[11px] text-neutral-500 hidden sm:inline">
                  Click any receiver below to apply a preset route
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {offensePlayers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlayerId(p.id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-white/5 hover:bg-cyan-500/20 text-neutral-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/40 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{p.label} ({p.role})</span>
                    {p.route && p.route.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-neutral-400 py-1 font-mono">
              Select a defensive player to assign zone, man lock, or pass rush.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Save Route Preset to Team (Up to 20 additional presets) */}
      {isSavePresetModalOpen && selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0B0F19] border border-emerald-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Bookmark className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-white">Save Route Preset</h3>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {customPresets.length}/20 Custom Presets for this Franchise
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSavePresetModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] uppercase font-bold text-neutral-300 block mb-1">
                  Preset Name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="e.g. Post-Corner, Wheel-Fade, Sluggo..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveCurrentRouteAsPreset();
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-emerald-500 text-white text-xs outline-none"
                />
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-[11px] text-neutral-300 space-y-1">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-neutral-400">Waypoints:</span>
                  <span className="text-emerald-400 font-bold">{selectedPlayer.route?.length || 0} cuts/points</span>
                </div>
                {isDemo ? (
                  <p className="text-[10px] text-amber-300/90 leading-relaxed pt-1 font-semibold">
                    ⚡ Demo League Mode: This preset is stored in session memory and will not be saved to the database. Refreshing the tab will clear it.
                  </p>
                ) : (
                  <p className="text-[10px] text-neutral-400 leading-relaxed pt-1">
                    Once saved, this route preset is saved to this team and will be available for all plays so any receiver can run it.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsSavePresetModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newPresetName.trim()}
                onClick={handleSaveCurrentRouteAsPreset}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50"
              >
                Save to Team ({customPresets.length}/20)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Coordinator Install Sheet / All Position Coaching Notes */}
      {isPositionNotesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0B0F19] border border-cyan-500/40 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-white tracking-wide">
                    {play.name} • Position Notes & Read Progression
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Install instructions & coaching notes for each position on field
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPositionNotesModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {(play.type === "defense" ? defensePlayers : offensePlayers).map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2 hover:border-cyan-500/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/40 font-mono font-black text-cyan-300 text-xs flex items-center justify-center">
                        {p.label}
                      </span>
                      <span className="text-xs font-bold text-white">{p.role}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-neutral-400">
                      Assignment:{" "}
                      <strong className="text-cyan-400">
                        {p.quickRouteName ||
                          (p.route && p.route.length > 0
                            ? "Custom Drawn Route"
                            : p.coverageType?.toUpperCase() || "Default Alignment")}
                      </strong>
                    </span>
                  </div>

                  <textarea
                    rows={2}
                    disabled={readOnly}
                    value={p.notes || ""}
                    onChange={(e) => handleUpdatePlayerNotes(p.id, e.target.value)}
                    placeholder={`e.g. Read free safety: if shading outside, break 2 steps inside. Checkdown option.`}
                    className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 focus:border-cyan-500 text-white text-xs outline-none resize-none leading-relaxed"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setIsPositionNotesModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Coach General Playbook Scheme Notes */}
      {isPlayNotesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0B0F19] border border-white/20 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-white">Coach Playbook Scheme Notes</h3>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    High-level concept, QB progression & situational rules
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPlayNotesModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              rows={5}
              disabled={readOnly}
              value={play.notes || ""}
              onChange={(e) => onChange({ ...play, notes: e.target.value })}
              placeholder="e.g. Read safety rotation: if Cover 2, look to split the safeties with X. Checkdown to RB on 3rd step. Use in 3rd & long or 2-minute drill."
              className="w-full p-3.5 rounded-2xl bg-black/60 border border-white/10 focus:border-cyan-500 text-white text-xs outline-none resize-none leading-relaxed"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsPlayNotesModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
