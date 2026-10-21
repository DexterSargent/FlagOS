"use client";

import { useState, useRef, useEffect, useCallback, useMemo, useSyncExternalStore, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useLeague } from "@/lib/leagueContext";
import { YORK_OFFENSIVE_PLAYBOOK_ID } from "@/lib/yorkOffensivePlaybook";
import {
  PlayerNode,
  RoutePoint,
  RouteType,
  ZoneBubble,
  ZoneShape,
  PlayDiagram,
  Playbook,
  DEFAULT_LOS_Y,
  YARD_HEIGHT_PCT,
  getYardsFromLos,
  snapYToYard,
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
  advanceAnimationProgress,
  createAnimationProgressStore,
  createPlayAnimationModel,
  PLAY_ANIMATION_DURATION_SECONDS,
  type AnimationProgressStore,
} from "./playAnimation";
import {
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
  Plus,
  Minus,
  Square,
  Circle,
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
  FileText,
  X,
  Layers,
  MessageSquare,
  HelpCircle,
  FolderPlus,
} from "lucide-react";
import {
  STANDARD_OFFENSIVE_PRESETS,
  STANDARD_DEFENSIVE_PRESETS,
} from "@/lib/opponentPlayPresets";

const MIN_ROUTE_DEPTH_YARDS = 1;
const MAX_ROUTE_DEPTH_YARDS = 25;

const PRE_SNAP_MOTION_PRESETS = [
  { name: "Jet Motion", short: "Jet", description: "Fast sweep across the formation toward the snap" },
  { name: "Orbit Motion", short: "Orbit", description: "Loops behind the QB before the snap" },
];

const DEFENSIVE_ZONE_CATEGORIES = [
  { id: "deep", label: "Deep", category: "Deep Zones" },
  { id: "underneath", label: "Hook", category: "Underneath & Hook" },
  { id: "flats", label: "Flat", category: "Flats & Short" },
  { id: "special", label: "Special", category: "Special Assignment" },
] as const;

// Lightweight dialogs are only fetched when a coach opens them.
const SaveRoutePresetDialog = dynamic(() =>
  import("./PlayCanvasDialogs").then((mod) => mod.SaveRoutePresetDialog)
);
const PositionNotesDialog = dynamic(() =>
  import("./PlayCanvasDialogs").then((mod) => mod.PositionNotesDialog)
);
const PlayNotesDialog = dynamic(() => import("./PlayCanvasDialogs").then((mod) => mod.PlayNotesDialog));
const loadRouteCatalogDrawer = () => import("./RouteCatalogDrawer");
// The route tree drawer (40+ preset cards) is split out and warmed on hover/focus of its toggle.
const RouteCatalogDrawer = dynamic(loadRouteCatalogDrawer, {
  loading: () => (
    <div
      role="status"
      className="mt-2.5 rounded-2xl border border-cyan-500/40 bg-[#0A0E17] p-3 text-xs font-bold text-cyan-300"
    >
      Loading route catalog?
    </div>
  ),
});

/**
 * Subscribes only its own subtree to animation progress so each frame skips the
 * heavy designer chrome (sidebar, catalogs, command bar).
 */
function AnimationProgressView({
  store,
  children,
}: {
  store: AnimationProgressStore;
  children: (progress: number) => ReactNode;
}) {
  const progress = useSyncExternalStore(store.subscribe, store.get, store.get);
  return <>{children(progress)}</>;
}

interface PlayCanvasProps {
  play: PlayDiagram;
  onChange: (updatedPlay: PlayDiagram) => void;
  readOnly?: boolean;
  playbook?: Playbook | null;
  allPlaybooks?: Playbook[];
  onOpenQuestions?: () => void;
}

export default function PlayCanvas({
  play: committedPlay,
  onChange: onPlayChange,
  readOnly = false,
  playbook,
  allPlaybooks = [],
  onOpenQuestions,
}: PlayCanvasProps) {
  // Pointer drags edit a local draft so the parent (and its localStorage persistence) only
  // receives the released result instead of one full playbook write per pointer move.
  const [dragDraft, setDragDraft] = useState<PlayDiagram | null>(null);
  const dragDraftRef = useRef<PlayDiagram | null>(null);
  const play = dragDraft && dragDraft.id === committedPlay.id ? dragDraft : committedPlay;

  const onChange = useCallback((updatedPlay: PlayDiagram) => {
    const previousZoneIds = new Set(committedPlay.players.map((player) => player.zoneId).filter(Boolean));
    const assignedZoneIds = new Set(updatedPlay.players.map((player) => player.zoneId).filter(Boolean));
    const zones = updatedPlay.zones?.filter((zone) => !previousZoneIds.has(zone.id) || assignedZoneIds.has(zone.id));
    onPlayChange({ ...updatedPlay, zones });
  }, [committedPlay.players, onPlayChange]);

  const getDragBase = () =>
    dragDraftRef.current && dragDraftRef.current.id === committedPlay.id ? dragDraftRef.current : play;
  const updateDragDraft = (next: PlayDiagram) => {
    dragDraftRef.current = next;
    setDragDraft(next);
  };
  const commitDragDraft = () => {
    const draft = dragDraftRef.current;
    dragDraftRef.current = null;
    setDragDraft(null);
    if (draft && draft.id === committedPlay.id) onChange(draft);
  };

  // Never drop an in-progress drag: flush it if the designer unmounts or switches plays mid-drag.
  const flushDragDraftRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    flushDragDraftRef.current = () => {
      const draft = dragDraftRef.current;
      dragDraftRef.current = null;
      if (draft) onPlayChange(draft);
    };
  }, [onPlayChange]);
  useEffect(() => () => flushDragDraftRef.current?.(), []);
  useEffect(() => {
    if (dragDraftRef.current && dragDraftRef.current.id !== committedPlay.id) {
      flushDragDraftRef.current?.();
      setDragDraft(null);
    }
  }, [committedPlay.id]);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Interaction State
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const selectedPlayContextRef = useRef<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [draggedWaypointIndex, setDraggedWaypointIndex] = useState<number | null>(null);
  const [draggedWaypointIsMotion, setDraggedWaypointIsMotion] = useState(false);
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

  const [draggedZoneResizeHandle, setDraggedZoneResizeHandle] = useState<string | null>(null);
  const dragZoneResizeRef = useRef<{
    zoneId: string;
    handle: "e" | "w" | "s" | "n" | "se";
    startRx: number;
    startRy: number;
    cursorStartX: number;
    cursorStartY: number;
  } | null>(null);

  // Active Tool Mode
  const [mode, setMode] = useState<"select" | "draw" | "man" | "zone">("select");
  const [defensiveZoneCategory, setDefensiveZoneCategory] =
    useState<StandardZoneTemplate["category"]>("Deep Zones");

  // Animation State
  const [animating, setAnimating] = useState(false);
  // Progress (0 to 1) lives outside React state so frames only re-render subscribed field layers.
  const [progressStore] = useState(() => createAnimationProgressStore());
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
  const [isMotionMenuOpen, setIsMotionMenuOpen] = useState(false);
  const presetMenuRef = useRef<HTMLDivElement>(null);
  const [newPresetName, setNewPresetName] = useState("");
  const [isPositionNotesModalOpen, setIsPositionNotesModalOpen] = useState(false);
  const [isPlayNotesModalOpen, setIsPlayNotesModalOpen] = useState(false);
  const [isCompactLandscape, setIsCompactLandscape] = useState(false);

  // Opponent Play Selector State
  const [isOpponentMenuOpen, setIsOpponentMenuOpen] = useState(false);
  const [selectedOpponentPlayTitle, setSelectedOpponentPlayTitle] = useState<string>("");
  const opponentMenuRef = useRef<HTMLDivElement>(null);

  // Close preset routes & opponent menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (presetMenuRef.current && !presetMenuRef.current.contains(e.target as Node)) {
        setIsPresetMenuOpen(false);
        setIsMotionMenuOpen(false);
      }
      if (opponentMenuRef.current && !opponentMenuRef.current.contains(e.target as Node)) {
        setIsOpponentMenuOpen(false);
      }
    };
    if (isPresetMenuOpen || isMotionMenuOpen || isOpponentMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isPresetMenuOpen, isMotionMenuOpen, isOpponentMenuOpen]);

  useEffect(() => {
    const updateCompactLandscape = () => {
      setIsCompactLandscape(window.innerWidth >= 600 && window.innerHeight <= 450);
    };
    updateCompactLandscape();
    window.addEventListener("resize", updateCompactLandscape);
    return () => window.removeEventListener("resize", updateCompactLandscape);
  }, []);

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

  // Active zone reference: either directly selected zone, or zone attached to selected player
  const activeZone =
    (selectedZoneId ? play.zones?.find((z) => z.id === selectedZoneId) : null) ||
    (selectedPlayer?.zoneId ? play.zones?.find((z) => z.id === selectedPlayer.zoneId) : null) ||
    null;

  useEffect(() => {
    const assignedZone = STANDARD_DEFENSIVE_ZONES.find(
      (zone) =>
        zone.name === selectedPlayer?.quickRouteName ||
        zone.shortName === selectedPlayer?.quickRouteName
    );
    if (assignedZone) setDefensiveZoneCategory(assignedZone.category);
  }, [selectedPlayer?.id, selectedPlayer?.quickRouteName]);

  // Route depth control for preset routes (null = use each route's default depth)
  const [routeDepth, setRouteDepth] = useState<number | null>(null);
  useEffect(() => {
    setRouteDepth(null);
  }, [selectedPlayerId]);

  const currentCatalogRoute =
    selectedPlayer?.quickRouteName && selectedPlayer.routeType !== "motion"
      ? ROUTE_PRESETS_CATALOG.find(
          (r) =>
            r.name === selectedPlayer.quickRouteName || r.shortName === selectedPlayer.quickRouteName
        )
      : undefined;
  const maxRouteDepthYards = Math.max(
    MIN_ROUTE_DEPTH_YARDS,
    Math.min(MAX_ROUTE_DEPTH_YARDS, Math.floor(((selectedPlayer?.y ?? 70) - 4) / YARD_HEIGHT_PCT))
  );
  const effectiveRouteDepth =
    routeDepth ?? selectedPlayer?.routeDepthYards ?? currentCatalogRoute?.defaultBreakYards ?? 5;

  const handleDepthChange = (next: number) => {
    const depth = Math.max(MIN_ROUTE_DEPTH_YARDS, Math.min(maxRouteDepthYards, Math.round(next)));
    setRouteDepth(depth);
    if (currentCatalogRoute) handleApplyPreset(currentCatalogRoute.name, depth);
  };

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
      ...(playbook?.id === YORK_OFFENSIVE_PLAYBOOK_ID
        ? []
        : play.type === "defense"
        ? ["Cover 2 Zone", "Cover 1 Man", "Cover 3 Cloud", "Goal Line Tight"]
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

  // Select an active-side player when switching plays, while preserving direct field selection within a play.
  useEffect(() => {
    const selectionContext = `${play.id}:${play.type}`;
    const contextChanged = selectedPlayContextRef.current !== selectionContext;
    selectedPlayContextRef.current = selectionContext;

    const playerExists = play.players.some((player) => player.id === selectedPlayerId);
    if (!contextChanged) {
      // Deselecting (null) is a valid state; only clear a selection whose player disappeared
      if (selectedPlayerId && !playerExists) setSelectedPlayerId(null);
      return;
    }

    const activeSide = play.type === "defense" ? "defense" : "offense";
    const preferred =
      play.players.find(
        (player) => player.side === activeSide && player.label !== "QB" && player.label !== "C"
      ) || play.players.find((player) => player.side === activeSide);
    setSelectedPlayerId(preferred?.id ?? null);
  }, [play.id, play.type, play.players, selectedPlayerId]);

  const offensePlayers = play.players.filter((p) => p.side === "offense");
  const currentQb = offensePlayers.find(
    (p) => p.label === "QB" || p.role.toLowerCase().includes("qb")
  ) || { x: 50, y: (play.losY || DEFAULT_LOS_Y) + 9 };
  const defensePlayers = play.players.filter((p) => p.side === "defense");

  const losY = play.losY || DEFAULT_LOS_Y;
  const compactFieldViewBox = isCompactLandscape
    ? play.type === "defense"
      ? `0 ${Math.max(0, Math.round((losY - 40) * 7))} 1000 380`
      : `0 ${Math.max(0, Math.round((losY - 33) * 7))} 1000 440`
    : "0 0 1000 700";
  const rushDistanceY = rushLineDistanceYards * YARD_HEIGHT_PCT;
  const rushY = losY - rushDistanceY;

  // Show Opposing Side toggle (offense if defensive playbook, defense if offensive playbook). OFF by default.
  const [showOpposingSide, setShowOpposingSide] = useState<boolean>(false);

  // Filter visible players based on showOpposingSide
  const visiblePlayers = (play.players || []).filter((p) => (showOpposingSide ? true : p.side === play.type));

  // Compute legal status across visible players in play
  const legalityByPlayer = useMemo(
    () => new Map(play.players.map((p) => [p, checkLegalPosition(p, losY)] as const)),
    [play.players, losY]
  );
  const getLegality = (p: PlayerNode) => legalityByPlayer.get(p) ?? checkLegalPosition(p, losY);
  const alignmentIssues = visiblePlayers
    .map((p) => ({ player: p, ...getLegality(p) }))
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
      if (progressStore.get() >= 1) progressStore.set(0);
      setAnimating(true);
      lastTimeRef.current = performance.now();
    }
  };

  const handleResetAnimate = () => {
    setAnimating(false);
    progressStore.set(0);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  };

  useEffect(() => {
    if (!animating) return;

    const animateStep = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      const { progress: next, done } = advanceAnimationProgress(progressStore.get(), delta, animSpeed);
      progressStore.set(next);
      if (done) {
        animFrameRef.current = null;
        setAnimating(false);
        return;
      }
      animFrameRef.current = requestAnimationFrame(animateStep);
    };

    animFrameRef.current = requestAnimationFrame(animateStep);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [animating, animSpeed, progressStore]);

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
    setDraggedWaypointIsMotion(isMotionWp);

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

  const handlePointerDownZoneResize = (
    e: React.PointerEvent,
    zoneId: string,
    handle: "e" | "w" | "s" | "n" | "se"
  ) => {
    e.stopPropagation();
    if (readOnly) return;
    const coords = getSvgCoordinates(e);
    if (!coords) return;
    const zone = play.zones?.find((z) => z.id === zoneId);
    if (!zone) return;

    setSelectedZoneId(zoneId);
    setDraggedZoneResizeHandle(handle);

    dragZoneResizeRef.current = {
      zoneId,
      handle,
      startRx: zone.rx,
      startRy: zone.ry,
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
    if (!draggedPlayerId && !draggedZoneId && !dragZoneResizeRef.current) return;
    const coords = getSvgCoordinates(e);
    if (!coords) return;
    const play = getDragBase();

    // Resizing Zone Bubble
    if (dragZoneResizeRef.current && play.zones) {
      const { zoneId, handle, startRx, startRy, cursorStartX, cursorStartY } = dragZoneResizeRef.current;
      const deltaX = coords.x - cursorStartX;
      const deltaY = coords.y - cursorStartY;

      let newRx = startRx;
      let newRy = startRy;

      if (handle === "e") {
        newRx = Math.max(6, Math.min(38, Math.round((startRx + deltaX) * 10) / 10));
      } else if (handle === "w") {
        newRx = Math.max(6, Math.min(38, Math.round((startRx - deltaX) * 10) / 10));
      } else if (handle === "s") {
        newRy = Math.max(4, Math.min(26, Math.round((startRy + deltaY) * 10) / 10));
      } else if (handle === "n") {
        newRy = Math.max(4, Math.min(26, Math.round((startRy - deltaY) * 10) / 10));
      } else if (handle === "se") {
        newRx = Math.max(6, Math.min(38, Math.round((startRx + deltaX) * 10) / 10));
        newRy = Math.max(4, Math.min(26, Math.round((startRy + deltaY) * 10) / 10));
      }

      const updatedZones = play.zones.map((z) =>
        z.id === zoneId ? { ...z, rx: newRx, ry: newRy } : z
      );
      updateDragDraft({ ...play, zones: updatedZones });
      return;
    }

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
      // Defense cannot cross the LOS; players assigned to rush must also stay behind the rush line.
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
      } else if (player.side === "defense" && player.zoneId && play.zones) {
        // Keep zone drop route anchored to its zone when moving the player alignment
        const zone = play.zones.find((z) => z.id === player.zoneId);
        if (zone) {
          updatedRoute = [{ x: zone.x, y: zone.y }];
        }
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
      updateDragDraft({ ...play, players: updatedPlayers });
      return;
    }

    // Dragging specific waypoint along route or motion path
    if (draggedPlayerId && draggedWaypointIndex !== null && dragWaypointRef.current) {
      const { startX, startY, cursorStartX, cursorStartY, isMotionWp } = dragWaypointRef.current;
      const rawX = startX + (coords.x - cursorStartX);
      const rawY = startY + (coords.y - cursorStartY);
      const shouldSnap = snapToYardLines && !isMotionWp;
      const clampedPt = {
        x: Math.max(4, Math.min(96, Math.round(rawX * 10) / 10)),
        y: Math.max(
          4,
          Math.min(96, shouldSnap ? snapYToYard(rawY, losY) : Math.round(rawY * 10) / 10)
        ),
      };

      const draggedPlayer = play.players.find((p) => p.id === draggedPlayerId);
      const attachedZoneId = draggedPlayer?.zoneId;
      const isDefensiveZoneArrow =
        draggedPlayer?.side === "defense" &&
        Boolean(attachedZoneId) &&
        !isMotionWp &&
        Boolean(play.zones?.some((z) => z.id === attachedZoneId));

      const targetPt = isDefensiveZoneArrow
        ? {
            x: Math.max(10, Math.min(90, Math.round(rawX * 10) / 10)),
            y: Math.max(
              6,
              Math.min(losY - 2, shouldSnap ? snapYToYard(rawY, losY) : Math.round(rawY * 10) / 10)
            ),
          }
        : clampedPt;

      setDraggedWaypointYards(getYardsFromLos(targetPt.y, losY));

      let updatedZones = play.zones;
      if (isDefensiveZoneArrow && attachedZoneId && play.zones) {
        updatedZones = play.zones.map((z) => {
          if (z.id === attachedZoneId) {
            return { ...z, x: targetPt.x, y: targetPt.y };
          }
          return z;
        });
      }

      const updatedPlayers = play.players.map((p) => {
        if (p.id === draggedPlayerId) {
          if (isMotionWp && p.motionPath) {
            const newMotion = [...p.motionPath];
            newMotion[draggedWaypointIndex] = targetPt;
            return { ...p, motionPath: newMotion };
          } else if (!isMotionWp && p.route) {
            const newRoute = [...p.route];
            newRoute[draggedWaypointIndex] = targetPt;
            return { ...p, route: newRoute };
          }
        } else if (isDefensiveZoneArrow && attachedZoneId && p.zoneId === attachedZoneId) {
          if (p.route && p.route.length > 0) {
            const otherRoute = [...p.route];
            otherRoute[otherRoute.length - 1] = targetPt;
            return { ...p, route: otherRoute };
          }
        }
        return p;
      });
      updateDragDraft({ ...play, players: updatedPlayers, ...(updatedZones ? { zones: updatedZones } : {}) });
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
      // Keep the player-to-zone line attached to the moved zone.
      const attachedPlayers = play.players.map((p) =>
        p.zoneId === draggedZoneId ? { ...p, route: [{ x: clampedZone.x, y: clampedZone.y }] } : p
      );
      updateDragDraft({ ...play, zones: updatedZones, players: attachedPlayers });
      return;
    }

    // Resizing Zone (via edge/corner handles)
    if (dragZoneResizeRef.current && play.zones) {
      const { zoneId, handle, startRx, startRy, cursorStartX, cursorStartY } = dragZoneResizeRef.current;
      const deltaX = coords.x - cursorStartX;
      const deltaY = coords.y - cursorStartY;

      let nextRx = startRx;
      let nextRy = startRy;

      if (handle === "e") {
        nextRx = startRx + deltaX;
      } else if (handle === "w") {
        nextRx = startRx - deltaX;
      } else if (handle === "s") {
        nextRy = startRy + deltaY;
      } else if (handle === "n") {
        nextRy = startRy - deltaY;
      } else if (handle === "se") {
        nextRx = startRx + deltaX;
        nextRy = startRy + deltaY;
      }

      const clampedRx = Math.max(5, Math.min(38, Math.round(nextRx * 10) / 10));
      const clampedRy = Math.max(3, Math.min(26, Math.round(nextRy * 10) / 10));

      const updatedZones = play.zones.map((z) => {
        if (z.id === zoneId) {
          return {
            ...z,
            rx: clampedRx,
            ry: clampedRy,
          };
        }
        return z;
      });

      updateDragDraft({ ...play, zones: updatedZones });
      return;
    }
  };

  // Release, cancel and lost capture all end the drag and persist the latest preview once.
  const handlePointerUp = (e: React.PointerEvent) => {
    commitDragDraft();
    setDraggedPlayerId(null);
    setDraggedWaypointIndex(null);
    setDraggedZoneId(null);
    setDraggedWaypointYards(null);
    setDraggedZoneResizeHandle(null);
    dragStartRef.current = null;
    dragWaypointRef.current = null;
    dragZoneRef.current = null;
    dragZoneResizeRef.current = null;
    if (svgRef.current && e) {
      try {
        svgRef.current.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  // Canvas Click (Drawing Mode: Add Waypoint)
  const handleCanvasClick = (e: React.PointerEvent) => {
    if (readOnly) return;
    if (mode === "select") {
      // Click on blank turf deselects
      setSelectedPlayerId(null);
      setSelectedZoneId(null);
      return;
    }
    const coords = getSvgCoordinates(e);
    if (!coords) return;

    if (mode === "draw" && selectedPlayer) {
      const currentRoute = selectedPlayer.route ? [...selectedPlayer.route] : [];
      // Vertical position snaps to whole yards; horizontal stays free
      const newPoint = snapToYardLines ? { x: coords.x, y: snapYToYard(coords.y, losY) } : coords;
      currentRoute.push(newPoint);

      // Holding and dragging after the tap keeps adjusting the new point and shows its depth
      setDraggedPlayerId(selectedPlayer.id);
      setDraggedWaypointIndex(currentRoute.length - 1);
      setDraggedWaypointIsMotion(false);
      setDraggedWaypointYards(getYardsFromLos(newPoint.y, losY));
      dragWaypointRef.current = {
        startX: newPoint.x,
        startY: newPoint.y,
        cursorStartX: coords.x,
        cursorStartY: coords.y,
        isMotionWp: false,
      };
      try {
        svgRef.current?.setPointerCapture(e.pointerId);
      } catch (err) {}

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
            routeDepthYards: undefined,
            routeType: "pass" as const,
          };
        }
        return p;
      });
      onChange({ ...play, players: updatedPlayers });
    }
  };

  // Apply Quick Route Preset to currently selected receiver
  const handleApplyPreset = (presetName: string, depthYards?: number) => {
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
        updatedPostSnapRoute = generateRoutePreset(targetPlayer.quickRouteName, motionEnd.x, motionEnd.y, currentLosY, targetPlayer.routeDepthYards);
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

    const pts = generateRoutePreset(presetName, origin.x, origin.y, currentLosY, depthYards).map((pt) => ({
      x: pt.x,
      y: Math.max(4, pt.y),
    }));

    const updatedPlayers = play.players.map((p) => {
      if (p.id === targetPlayer.id) {
        return {
          ...p,
          routeDepthYards: depthYards,
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
          updatedRoute = generateRoutePreset(targetPlayer.quickRouteName, motionEnd.x, motionEnd.y, currentLosY, targetPlayer.routeDepthYards);
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
          updatedRoute = generateRoutePreset(targetPlayer.quickRouteName, targetPlayer.x, targetPlayer.y, currentLosY, targetPlayer.routeDepthYards);
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
  const handleAssignZone = (zoneId: string, targetPlayerId?: string) => {
    const playerToAssign = targetPlayerId
      ? play.players.find((p) => p.id === targetPlayerId)
      : selectedPlayer;
    if (readOnly || !playerToAssign) return;
    const zone = play.zones?.find((z) => z.id === zoneId);
    if (!zone) return;

    const updatedPlayers = play.players.map((p) => {
      if (p.id === playerToAssign.id) {
        return {
          ...p,
          coverageType: "zone" as const,
          zoneId,
          quickRouteName: zone.name,
          route: [{ x: zone.x, y: zone.y }],
          manTargetId: undefined,
          routeType: undefined,
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
          zoneId: undefined,
          routeType: undefined,
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
    setMode("select");
    setDefensiveZoneCategory(zoneTemplate.category);

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
          coverageType: zoneTemplate.id === "qb-spy" ? ("spy" as const) : ("zone" as const),
          zoneId: matchingZone.id,
          quickRouteName: zoneTemplate.shortName,
          route: [{ x: matchingZone.x, y: matchingZone.y }],
          manTargetId: undefined,
          routeType: undefined,
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
          quickRouteName: "Man",
          routeType: undefined,
        };
      }
      return p;
    });

    onChange({ ...play, players: updatedPlayers });
  };

  // Set rush for defender: draws line to QB, with bend point (does NOT auto-show opponent)
  const handleSetPassRush = () => {
    if (readOnly || !selectedPlayer) return;
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
          quickRouteName: "Rush",
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

  // Add a new custom zone bubble (with custom shape: ellipse or rectangle)
  const handleCreateCustomZone = (shape: ZoneShape = "ellipse", name?: string, color = "#8B5CF6") => {
    if (readOnly) return;
    const defaultY = selectedPlayer
      ? Math.max(8, Math.min(losY - 4, selectedPlayer.y - 12))
      : losY - 18;
    const defaultX = selectedPlayer ? selectedPlayer.x : 50;

    const newZone: ZoneBubble = {
      id: `zone-custom-${Date.now()}`,
      name: name || (shape === "rectangle" ? "Box Zone" : "Custom Zone"),
      x: defaultX,
      y: defaultY,
      rx: shape === "rectangle" ? 16 : 18,
      ry: shape === "rectangle" ? 8 : 10,
      color,
      shape,
    };

    const nextZones = [...(play.zones || []), newZone];

    let updatedPlayers = play.players;
    if (selectedPlayer && selectedPlayer.side === "defense") {
      updatedPlayers = play.players.map((p) =>
        p.id === selectedPlayer.id
          ? {
              ...p,
              coverageType: "zone" as const,
              zoneId: newZone.id,
              quickRouteName: newZone.name,
              route: [{ x: newZone.x, y: newZone.y }],
              manTargetId: undefined,
              routeType: undefined,
            }
          : p
      );
    }

    onChange({ ...play, zones: nextZones, players: updatedPlayers });
    setSelectedZoneId(newZone.id);
  };

  const handleUpdateZone = (zoneId: string, updates: Partial<ZoneBubble>) => {
    if (readOnly) return;
    const updatedZones = (play.zones || []).map((z) =>
      z.id === zoneId ? { ...z, ...updates } : z
    );
    let updatedPlayers = play.players;
    if (updates.name !== undefined) {
      updatedPlayers = play.players.map((p) =>
        p.zoneId === zoneId ? { ...p, quickRouteName: updates.name } : p
      );
    }
    onChange({ ...play, zones: updatedZones, players: updatedPlayers });
  };

  const handleAddZoneBubble = (name = "Deep Zone", color = "#3B82F6") => {
    handleCreateCustomZone("ellipse", name, color);
  };

  // Delete selected Zone Bubble
  const handleDeleteZone = (zoneId: string) => {
    if (readOnly) return;
    const updatedZones = (play.zones || []).filter((z) => z.id !== zoneId);
    const updatedPlayers = play.players.map((p) =>
      p.zoneId === zoneId
        ? {
            ...p,
            zoneId: undefined,
            coverageType: undefined,
            quickRouteName: undefined,
            route: [],
          }
        : p
    );
    onChange({ ...play, zones: updatedZones, players: updatedPlayers });
    setSelectedZoneId(null);
  };

  const renderZoneCustomizer = (zone: ZoneBubble) => {
    return (
      <div
        data-testid="zone-customizer-panel"
        className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-2.5 shadow-lg backdrop-blur-sm [@media(min-width:600px)_and_(max-height:450px)]:col-span-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-3 h-3 rounded-full shrink-0 shadow-sm border border-white/20"
              style={{ backgroundColor: zone.color }}
            />
            <span className="text-[11px] font-mono font-bold text-purple-300 uppercase tracking-wide truncate">
              Zone Properties ({zone.shape === "rectangle" ? "Box" : "Oval"})
            </span>
          </div>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => handleDeleteZone(zone.id)}
            data-testid="delete-zone-btn"
            className="text-neutral-400 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-colors text-xs flex items-center gap-1 cursor-pointer"
            title="Delete this zone"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="text-[10px]">Delete</span>
          </button>
        </div>

        {/* Zone Name Input */}
        <div>
          <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
            Zone Name
          </label>
          <input
            type="text"
            disabled={readOnly}
            value={zone.name}
            onChange={(e) => handleUpdateZone(zone.id, { name: e.target.value })}
            placeholder="e.g. Deep 1/3, Robber, Flat Box"
            data-testid="zone-name-input"
            className="w-full bg-black/60 border border-white/20 rounded-lg px-2.5 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-400 font-medium"
          />
        </div>

        {/* Shape Picker: Ellipse vs Rectangle */}
        <div>
          <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
            Shape
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={readOnly}
              data-testid="zone-shape-ellipse"
              aria-pressed={(zone.shape || "ellipse") === "ellipse"}
              onClick={() => handleUpdateZone(zone.id, { shape: "ellipse" })}
              className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                (zone.shape || "ellipse") === "ellipse"
                  ? "bg-purple-300 text-black border-purple-200 shadow-sm"
                  : "bg-black/50 text-neutral-300 border-white/10 hover:text-white hover:bg-neutral-800"
              }`}
            >
              <Circle className="w-3.5 h-3.5" />
              <span>Oval / Bubble</span>
            </button>
            <button
              type="button"
              disabled={readOnly}
              data-testid="zone-shape-rectangle"
              aria-pressed={zone.shape === "rectangle"}
              onClick={() => handleUpdateZone(zone.id, { shape: "rectangle" })}
              className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                zone.shape === "rectangle"
                  ? "bg-purple-300 text-black border-purple-200 shadow-sm"
                  : "bg-black/50 text-neutral-300 border-white/10 hover:text-white hover:bg-neutral-800"
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              <span>Box / Rectangle</span>
            </button>
          </div>
        </div>

        {/* Width & Depth Steppers and Sliders */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="flex justify-between items-center text-[10px] text-neutral-400 uppercase font-bold mb-1">
              <span>Width</span>
              <span className="text-white font-mono">{zone.rx}%</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={readOnly}
                data-testid="zone-width-decrease"
                onClick={() => handleUpdateZone(zone.id, { rx: Math.max(6, zone.rx - 2) })}
                className="p-1 rounded bg-black/60 border border-white/15 text-neutral-300 hover:text-white cursor-pointer"
                title="Narrow zone width"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="range"
                disabled={readOnly}
                min="6"
                max="36"
                step="1"
                value={zone.rx}
                data-testid="zone-width-slider"
                onChange={(e) => handleUpdateZone(zone.id, { rx: Number(e.target.value) })}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <button
                type="button"
                disabled={readOnly}
                data-testid="zone-width-increase"
                onClick={() => handleUpdateZone(zone.id, { rx: Math.min(36, zone.rx + 2) })}
                className="p-1 rounded bg-black/60 border border-white/15 text-neutral-300 hover:text-white cursor-pointer"
                title="Widen zone width"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center text-[10px] text-neutral-400 uppercase font-bold mb-1">
              <span>Depth</span>
              <span className="text-white font-mono">{zone.ry}%</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={readOnly}
                data-testid="zone-depth-decrease"
                onClick={() => handleUpdateZone(zone.id, { ry: Math.max(4, zone.ry - 2) })}
                className="p-1 rounded bg-black/60 border border-white/15 text-neutral-300 hover:text-white cursor-pointer"
                title="Make zone shallower"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="range"
                disabled={readOnly}
                min="4"
                max="24"
                step="1"
                value={zone.ry}
                data-testid="zone-depth-slider"
                onChange={(e) => handleUpdateZone(zone.id, { ry: Number(e.target.value) })}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <button
                type="button"
                disabled={readOnly}
                data-testid="zone-depth-increase"
                onClick={() => handleUpdateZone(zone.id, { ry: Math.min(24, zone.ry + 2) })}
                className="p-1 rounded bg-black/60 border border-white/15 text-neutral-300 hover:text-white cursor-pointer"
                title="Make zone deeper"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Color Palette */}
        <div>
          <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
            Color
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#06B6D4", "#EF4444", "#6366F1"].map((c) => (
              <button
                key={c}
                type="button"
                disabled={readOnly}
                onClick={() => handleUpdateZone(zone.id, { color: c })}
                style={{ backgroundColor: c }}
                title={`Set zone color to ${c}`}
                className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                  zone.color === c
                    ? "scale-125 border-white ring-2 ring-purple-400/50"
                    : "border-black/50 opacity-80 hover:opacity-100 hover:scale-110"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
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

  // Opposing playbooks available to populate from
  const targetOppositeSide = play.type === "defense" ? "offense" : "defense";
  const availableOpposingPlaybooks = useMemo(() => {
    let books = (allPlaybooks || []).filter((b) => b.type === targetOppositeSide);
    if (books.length === 0 && typeof window !== "undefined") {
      try {
        const local = localStorage.getItem(`flagos_playbooks_${teamId}`);
        if (local) {
          const parsed: Playbook[] = JSON.parse(local);
          books = parsed.filter((b) => b.type === targetOppositeSide);
        }
      } catch (e) {}
    }
    return books;
  }, [allPlaybooks, targetOppositeSide, teamId]);

  const systemOpponentPresets = play.type === "defense" ? STANDARD_OFFENSIVE_PRESETS : STANDARD_DEFENSIVE_PRESETS;

  // Populate an opponent play into the opposing side of the field
  const handleSelectOpponentPlay = (opponentPlay: PlayDiagram, sourceBookTitle?: string) => {
    if (readOnly) return;

    if (play.type === "defense") {
      // Current play is defense: populate offense from opponent play
      const currentDefense = play.players.filter((p) => p.side === "defense");
      const importedOffense = opponentPlay.players
        .filter((p) => p.side === "offense")
        .map((off, idx) => ({
          ...off,
          id: `opp-off-${idx}-${Date.now()}`,
          side: "offense" as const,
        }));

      onChange({
        ...play,
        players: [...currentDefense, ...importedOffense],
      });
    } else {
      // Current play is offense: populate defense and zones from opponent play
      const currentOffense = play.players.filter((p) => p.side === "offense");
      const importedDefense = opponentPlay.players
        .filter((p) => p.side === "defense")
        .map((def, idx) => ({
          ...def,
          id: `opp-def-${idx}-${Date.now()}`,
          side: "defense" as const,
        }));

      const nextZones = opponentPlay.zones && opponentPlay.zones.length > 0 ? opponentPlay.zones : (play.zones || []);
      onChange({
        ...play,
        players: [...currentOffense, ...importedDefense],
        zones: nextZones,
      });
    }

    setSelectedOpponentPlayTitle(sourceBookTitle ? `${sourceBookTitle}: ${opponentPlay.name}` : opponentPlay.name);
    setShowOpposingSide(true);
    setIsOpponentMenuOpen(false);
  };

  const handleResetOpponentAlignment = () => {
    if (readOnly) return;
    const sanitized = ensureSquadMatchup(
      play.players.filter((p) => p.side === play.type),
      losY,
      activeSquadSize
    );
    onChange({
      ...play,
      players: sanitized,
      zones: play.type === "defense" ? play.zones : [],
    });
    setSelectedOpponentPlayTitle("");
    setIsOpponentMenuOpen(false);
  };

  // Route/motion geometry is measured once per players change; frames only interpolate.
  const animationModel = useMemo(() => createPlayAnimationModel(play.players), [play.players]);
  const getAnimatedPlayerPos = (player: PlayerNode, progress: number) =>
    animationModel.getPosition(player, progress, animating);

  return (
    <div className="flex flex-col md:flex-row [@media(max-height:450px)]:flex-col [@media(min-width:600px)_and_(max-height:450px)]:flex-row gap-2 sm:gap-3 [@media(max-width:639px)_and_(min-height:451px)]:gap-1.5 w-full max-w-full overflow-hidden [@media(max-width:639px)_and_(min-height:451px)]:overflow-y-auto font-sans h-full min-h-0 [&_button]:min-h-9 [&_button]:leading-snug [&_button>svg]:shrink-0 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-cyan-400">
      {/* ============================================================== */}
      {/* LEFT: MAIN PLAYMAKER CANVAS & FIELD SURFACE + ANIMATION BAR    */}
      {/* ============================================================== */}
      <div data-testid="designer-field-pane" className="flex flex-1 [@media(max-width:639px)_and_(min-height:451px)]:flex-none md:flex-1 [@media(max-width:599px)_and_(max-height:450px)]:flex-[0_0_42%] [@media(min-width:600px)_and_(max-height:450px)]:flex-1 min-w-0 min-h-0 flex-col bg-[#07090E] border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl relative">
        {/* ============================================================== */}
        {/* UNIFIED TOP COMMAND BAR: NAME, FORMATION, SITUATION & CONTROLS */}
        {/* ============================================================== */}
        <div className="p-2 sm:p-3 [@media(max-height:450px)]:p-1.5 [@media(max-width:639px)_and_(min-height:451px)]:p-1.5 bg-[#0B0F19] border-b border-white/10 flex flex-col gap-2 [@media(max-width:639px)_and_(min-height:451px)]:gap-1.5 shrink-0">
          {/* Play Name Editable Field */}
          <div className="flex items-center gap-2 min-w-0 w-full">
            <span className="text-[10px] font-black uppercase text-cyan-400 font-mono tracking-wider [@media(max-width:639px)]:hidden">Play:</span>
            <input
              type="text"
              aria-label="Play name"
              disabled={readOnly}
              value={play.name}
              onChange={(e) => onChange({ ...play, name: e.target.value })}
              placeholder="Play Name..."
              className="min-w-0 w-full text-sm font-bold text-white bg-black/40 hover:bg-black/60 focus:bg-black/80 focus:border-cyan-500 rounded-lg px-3 py-2 border border-white/10 outline-none transition-all"
            />
          </div>

          {/* Formation Dropdown & Gameday Situation Dropdown */}
          <div className="flex items-center gap-2 max-sm:gap-1.5 flex-wrap max-sm:flex-nowrap [@media(max-height:450px)]:hidden">
            {/* Formation Dropdown */}
            <div className="flex flex-col gap-0.5 flex-1 min-w-[130px] max-sm:min-w-0">
              <span className="text-[10px] font-semibold text-neutral-400 max-sm:hidden">Formation</span>
              <select
                aria-label="Play formation"
                title={play.formation}
                disabled={readOnly}
                value={play.formation}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__ADD_NEW__") {
                    const customForm = prompt("Enter new formation name for this playbook:");
                    if (customForm && customForm.trim()) {
                      const trimmedForm = customForm.trim();
                      const updated = playbook?.id === YORK_OFFENSIVE_PLAYBOOK_ID
                        ? play.players
                        : applyFormationToSquad(play.players, trimmedForm, play.type, losY);
                      onChange({ ...play, formation: trimmedForm, players: updated });
                    }
                  } else {
                    const updated = playbook?.id === YORK_OFFENSIVE_PLAYBOOK_ID
                      ? play.players
                      : applyFormationToSquad(play.players, val, play.type, losY);
                    onChange({ ...play, formation: val, players: updated });
                  }
                }}
                className="w-full min-w-0 bg-black/40 border border-white/10 rounded-lg p-2 text-xs font-semibold text-cyan-300 outline-none focus:border-cyan-400 cursor-pointer"
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
            <div className="flex flex-col gap-0.5 flex-1 min-w-[120px] max-sm:min-w-0">
              <span className="text-[10px] font-semibold text-neutral-400 max-sm:hidden">Situation</span>
              <select
                aria-label="Play situation"
                disabled={readOnly}
                value={play.situation || "Standard"}
                onChange={(e) => onChange({ ...play, situation: e.target.value })}
                className="w-full min-w-0 bg-black/40 border border-white/10 rounded-lg p-2 text-xs font-semibold text-neutral-200 outline-none focus:border-cyan-400 cursor-pointer"
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
              className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                play.notes && play.notes.trim().length > 0
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                  : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
              }`}
              title="Open general coaching notes & scheme progression"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>

            {/* Coach Q&A Button */}
            {onOpenQuestions && (
              <button
                type="button"
                onClick={onOpenQuestions}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  play.questions && play.questions.some((q) => !q.answered)
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm"
                    : play.questions && play.questions.length > 0
                    ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                    : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                }`}
                title="Ask coach questions or view tactical Q&A for this play"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xl:inline">Q&A</span>
                {play.questions && play.questions.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-white/10 text-white">
                    {play.questions.length}
                  </span>
                )}
              </button>
            )}

            {/* Opposing Side Toggle */}
            <button
              type="button"
              data-testid="toggle-opponent-btn"
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

            {/* Opponent Scheme Selector Dropdown (When Opponent is ON) */}
            {showOpposingSide && (
              <div ref={opponentMenuRef} className="relative">
                <button
                  type="button"
                  data-testid="opponent-play-selector-btn"
                  onClick={() => setIsOpponentMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-bold transition-all border bg-amber-500/15 border-amber-500/35 text-amber-200 hover:bg-amber-500/25 hover:text-white cursor-pointer"
                  title={`Select opposing ${play.type === "defense" ? "offensive" : "defensive"} play to populate and run simulation against`}
                >
                  <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                  <span className="max-w-[110px] sm:max-w-[160px] truncate">
                    {selectedOpponentPlayTitle ? `Vs: ${selectedOpponentPlayTitle}` : `Choose Opponent Play`}
                  </span>
                  <ChevronDown className="w-3 h-3 text-amber-400" />
                </button>

                {isOpponentMenuOpen && (
                  <div
                    data-testid="opponent-plays-menu"
                    className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 max-h-96 overflow-y-auto bg-[#0B0F19] border border-amber-500/30 rounded-2xl shadow-2xl p-2 z-50 space-y-2 scrollbar-thin text-white"
                  >
                    <div className="px-2 py-1 border-b border-white/10 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                          Opposing {play.type === "defense" ? "Offense" : "Defense"} Scheme
                        </span>
                        <span className="text-[11px] text-neutral-400 block">
                          Populate into field &amp; run to test coverage reads
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsOpponentMenuOpen(false)}
                        className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Team's Other Playbooks */}
                    {availableOpposingPlaybooks.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 px-2 block font-bold">
                          Your Team Playbooks:
                        </span>
                        {availableOpposingPlaybooks.map((book) => (
                          <div key={book.id} className="space-y-1 bg-white/5 rounded-xl p-1.5">
                            <div className="flex items-center gap-1.5 px-1.5 py-0.5 text-xs font-bold text-neutral-300">
                              {book.type === "offense" ? (
                                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                              ) : (
                                <Shield className="w-3.5 h-3.5 text-purple-400" />
                              )}
                              <span className="truncate">{book.title}</span>
                            </div>
                            <div className="space-y-0.5 pl-2">
                              {book.plays.length === 0 ? (
                                <span className="text-[11px] text-neutral-500 italic block py-0.5 px-2">
                                  No plays in this playbook yet
                                </span>
                              ) : (
                                book.plays.map((oppPlay) => (
                                  <button
                                    key={oppPlay.id}
                                    type="button"
                                    data-testid={`select-opp-play-${oppPlay.id}`}
                                    onClick={() => handleSelectOpponentPlay(oppPlay, book.title)}
                                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-cyan-500/20 text-xs text-neutral-200 hover:text-white transition-colors flex items-center justify-between group cursor-pointer"
                                  >
                                    <span className="truncate font-semibold">{oppPlay.name}</span>
                                    <span className="text-[10px] font-mono text-neutral-500 group-hover:text-cyan-300 shrink-0 ml-1">
                                      {oppPlay.formation}
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Standard System Presets */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 px-2 block font-bold">
                        Standard {play.type === "defense" ? "Offensive" : "Defensive"} Schemes:
                      </span>
                      {systemOpponentPresets.map((oppPlay) => (
                        <button
                          key={oppPlay.id}
                          type="button"
                          data-testid={`select-opp-preset-${oppPlay.id}`}
                          onClick={() => handleSelectOpponentPlay(oppPlay, "Standard")}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-amber-500/20 text-xs text-neutral-200 hover:text-white transition-colors flex items-center justify-between group cursor-pointer"
                        >
                          <span className="truncate font-semibold">{oppPlay.name}</span>
                          <span className="text-[10px] font-mono text-neutral-500 group-hover:text-amber-300 shrink-0 ml-1">
                            {oppPlay.formation}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Reset Button */}
                    <div className="pt-1 border-t border-white/10">
                      <button
                        type="button"
                        onClick={handleResetOpponentAlignment}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-red-500/20 text-xs text-neutral-400 hover:text-red-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3 text-red-400" />
                        <span>Reset Opponent to Default Spots</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Custom Zone Quick Add Buttons for Defense */}
            {(play.type === "defense" || showOpposingSide) && !readOnly && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleCreateCustomZone("ellipse")}
                  data-testid="add-custom-oval-zone-btn"
                  className="flex items-center gap-1 px-2 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 hover:text-white text-xs font-bold cursor-pointer transition-colors"
                  title="Add custom oval zone bubble"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <Circle className="w-3 h-3" />
                  <span className="hidden lg:inline">Oval Zone</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateCustomZone("rectangle")}
                  data-testid="add-custom-box-zone-btn"
                  className="flex items-center gap-1 px-2 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 hover:text-white text-xs font-bold cursor-pointer transition-colors"
                  title="Add custom box/rectangle zone"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <Square className="w-3 h-3" />
                  <span className="hidden lg:inline">Box Zone</span>
                </button>
              </div>
            )}

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
                <span>{alignmentIssues.length}<span className="hidden sm:inline"> Warning{alignmentIssues.length > 1 ? "s" : ""}</span></span>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Field Viewport */}
        <div
          ref={containerRef}
          className="relative flex-1 [@media(max-width:639px)_and_(min-height:451px)]:flex-none w-full aspect-[16/10] md:aspect-auto [@media(max-width:639px)_and_(max-height:450px)]:aspect-auto [@media(max-width:639px)_and_(min-height:451px)]:aspect-[10/7] bg-[#12231A] overflow-hidden select-none touch-none cursor-crosshair min-h-[250px] md:min-h-0 [@media(max-width:639px)]:min-h-0 [@media(max-height:450px)]:min-h-[120px]"
          data-testid="designer-field"
        >
          <svg
            ref={svgRef}
            viewBox={compactFieldViewBox}
            aria-label={isCompactLandscape ? "Zoomed field view around the line of scrimmage" : "Full flag football field"}
            className="w-full h-full"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onLostPointerCapture={handlePointerUp}
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
                const isRect = zone.shape === "rectangle";
                const zoneColor = zone.color || "#8B5CF6";
                const cx = (zone.x / 100) * 1000;
                const cy = (zone.y / 100) * 700;
                const rx = (zone.rx / 100) * 1000;
                const ry = (zone.ry / 100) * 700;

                return (
                  <g
                    key={zone.id}
                    data-testid={`zone-bubble-${zone.id}`}
                    onPointerDown={(e) => handlePointerDownZone(e, zone.id)}
                  >
                    {/* Zone Boundary Body */}
                    <g
                      className="cursor-move"
                      onPointerDown={(e) => handlePointerDownZone(e, zone.id)}
                    >
                      {isRect ? (
                        <rect
                          x={cx - rx}
                          y={cy - ry}
                          width={rx * 2}
                          height={ry * 2}
                          rx="14"
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
                          onPointerDown={(e) => handlePointerDownZoneResize(e, zone.id, "e")}
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
                          onPointerDown={(e) => handlePointerDownZoneResize(e, zone.id, "w")}
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
                          onPointerDown={(e) => handlePointerDownZoneResize(e, zone.id, "s")}
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
                          onPointerDown={(e) => handlePointerDownZoneResize(e, zone.id, "n")}
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
                          onPointerDown={(e) => handlePointerDownZoneResize(e, zone.id, "se")}
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

            {/* ============================================================== */}
            {/* MAN COVERAGE DOTTED LOCK LINES                                 */}
            {/* ============================================================== */}
            <AnimationProgressView store={progressStore}>
            {(progress) => play.players
              .filter((p) => p.side === "defense" && p.coverageType === "man" && p.manTargetId)
              .map((def) => {
                const targetOff = play.players.find((p) => p.id === def.manTargetId);
                if (!targetOff) return null;
                if (!showOpposingSide && selectedPlayerId !== def.id) return null;

                const defPos = getAnimatedPlayerPos(def, progress);
                const targetPos = getAnimatedPlayerPos(targetOff, progress);

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
                        MAN
                      </text>
                    </g>
                  </g>
                );
              })}
            </AnimationProgressView>

            {/* ============================================================== */}
            {/* ROUTE PATHS (WAYPOINTS, Rush BEND & ARROWHEADS)           */}
            {/* ============================================================== */}
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
                      {!readOnly && isSelected && motionPts?.map((pt, wpIdx) => (
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

            {/* ============================================================== */}
            {/* PLAYER NODES (OFFENSE & DEFENSE)                              */}
            {/* ============================================================== */}
            <AnimationProgressView store={progressStore}>
            {(progress) => visiblePlayers.map((player) => {
              const isSelected = selectedPlayerId === player.id;
              const isOffense = player.side === "offense";
              const animPos = getAnimatedPlayerPos(player, progress);

              const px = (animPos.x / 100) * 1000;
              const py = (animPos.y / 100) * 700;

              // Check legality on starting spot (not during animation)
              const legality = getLegality(player);
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
                        stroke={isIllegal ? "#EF4444" : isOffense ? "var(--team-primary, #3ca505)" : "#A855F7"}
                        strokeWidth="2.5"
                        strokeOpacity="0.9"
                      />
                      <circle
                        cx={px}
                        cy={py}
                        r="30"
                        fill="none"
                        stroke={isIllegal ? "#EF4444" : isOffense ? "var(--team-primary, #3ca505)" : "#A855F7"}
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
                        ? "var(--team-primary, #38BDF8)"
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

                  {/* Open / Covered indicator during simulation against opponent */}
                  {showOpposingSide && isOffense && player.route && player.route.length > 0 && (
                    (() => {
                      const defenders = play.players.filter((p) => p.side === "defense");
                      if (defenders.length === 0) return null;
                      let minDistanceYards = 999;
                      for (const def of defenders) {
                        const defPos = getAnimatedPlayerPos(def, progress);
                        const dx = (animPos.x - defPos.x) * 0.533;
                        const dy = (animPos.y - defPos.y) / 1.75;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < minDistanceYards) minDistanceYards = dist;
                      }
                      const isOpen = minDistanceYards >= 3.5;
                      const isTight = minDistanceYards < 2.2;
                      if (!animating && progress === 0) return null;

                      return (
                        <g>
                          {isOpen && (
                            <g data-testid={`open-receiver-${player.id}`}>
                              <circle
                                cx={px}
                                cy={py}
                                r="26"
                                fill="none"
                                stroke="#10B981"
                                strokeWidth="2.5"
                                className="animate-pulse"
                                opacity="0.9"
                              />
                              <g transform={`translate(${px}, ${py - 25})`}>
                                <rect
                                  x="-25"
                                  y="-9"
                                  width="50"
                                  height="18"
                                  rx="9"
                                  fill="#064E3B"
                                  stroke="#10B981"
                                  strokeWidth="1.5"
                                  className="drop-shadow-lg"
                                />
                                <text
                                  x="0"
                                  y="3.5"
                                  fill="#A7F3D0"
                                  fontSize="8.5"
                                  fontWeight="900"
                                  textAnchor="middle"
                                  className="select-none pointer-events-none"
                                >
                                  OPEN
                                </text>
                              </g>
                            </g>
                          )}
                          {isTight && (
                            <g data-testid={`covered-receiver-${player.id}`} transform={`translate(${px}, ${py - 25})`}>
                              <rect
                                x="-28"
                                y="-9"
                                width="56"
                                height="18"
                                rx="9"
                                fill="#4C0519"
                                stroke="#F43F5E"
                                strokeWidth="1.5"
                                className="drop-shadow-lg"
                              />
                              <text
                                x="0"
                                y="3.5"
                                fill="#FECDD3"
                                fontSize="8"
                                fontWeight="900"
                                textAnchor="middle"
                                className="select-none pointer-events-none"
                              >
                                COVERED
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })()
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

                  {/* Rush target indicator around QB when rusher is highlighted */}
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
            </AnimationProgressView>

            {/* Live depth readout while holding a route point */}
            {draggedWaypointYards !== null &&
              draggedPlayerId &&
              draggedWaypointIndex !== null &&
              (() => {
                const dragged = play.players.find((p) => p.id === draggedPlayerId);
                const pt = (draggedWaypointIsMotion ? dragged?.motionPath : dragged?.route)?.[
                  draggedWaypointIndex
                ];
                if (!pt) return null;
                const bx = Math.max(60, Math.min(940, (pt.x / 100) * 1000));
                const by = Math.max(40, (pt.y / 100) * 700 - 52);
                return (
                  <g transform={`translate(${bx}, ${by})`} className="pointer-events-none" data-testid="route-depth-badge">
                    <rect x="-52" y="-16" width="104" height="32" rx="16" fill="#0B0F19" stroke="#22D3EE" strokeWidth="2.5" />
                    <text x="0" y="6" fill="#67E8F9" fontSize="18" fontWeight="900" textAnchor="middle" className="select-none">
                      {draggedWaypointYards >= 0 ? `${draggedWaypointYards} yd deep` : `${Math.abs(draggedWaypointYards)} yd back`}
                    </text>
                  </g>
                );
              })()}
          </svg>

          {isCompactLandscape && (
            <div className="absolute top-1.5 right-1.5 rounded-md border border-white/15 bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/80 pointer-events-none">
              Zoomed to the line of scrimmage
            </div>
          )}

          {/* Quick On-Field Canvas Helper Tooltip */}
          <div className="absolute bottom-3 left-3 right-3 max-w-fit bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] leading-relaxed text-neutral-400 hidden sm:[@media(min-height:451px)]:flex items-center gap-2 pointer-events-none">
            <Move className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Drag players or route points to adjust.</span>
          </div>
        </div>

        {/* Animation Simulator Controller Bar (Attached directly beneath field) */}
        <div className="px-2 sm:px-3 py-1.5 bg-black/75 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 [@media(max-height:450px)]:hidden">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleToggleAnimate}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold uppercase tracking-wider text-xs transition-all cursor-pointer ${
                animating
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              {animating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <AnimationProgressView store={progressStore}>
                {(progress) => <span>{animating ? "Pause" : progress >= 1 ? "Replay" : "Run Play"}</span>}
              </AnimationProgressView>
            </button>

            <button
              onClick={handleResetAnimate}
              aria-label="Reset animation"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Reset Timeline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1 ml-1">
              <span className="text-[10px] font-mono text-neutral-400">Speed:</span>
              {[0.5, 1, 1.5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setAnimSpeed(spd)}
                  aria-label={`Animation speed ${spd}x`}
                  aria-pressed={animSpeed === spd}
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
          <AnimationProgressView store={progressStore}>
            {(progress) => (
          <div className="flex items-center gap-2 flex-1 min-w-24 max-w-xs ml-auto">
            <span className="text-[10px] font-mono text-neutral-500 tabular-nums">
              {(progress * PLAY_ANIMATION_DURATION_SECONDS).toFixed(1)}s
            </span>
            <input
              type="range"
              aria-label="Animation timeline"
              min={0}
              max={1}
              step={0.01}
              value={progress}
              onChange={(e) => {
                setAnimating(false);
                progressStore.set(parseFloat(e.target.value));
              }}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
            )}
          </AnimationProgressView>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT: TACTICAL CONTROL DOCK (PLAYER ROSTER, ROUTES & SCHEMES) */}
      {/* ============================================================== */}
      <div data-testid="designer-assignments-pane" className="flex w-full md:w-[340px] xl:w-[380px] [@media(max-height:450px)]:w-full [@media(min-width:600px)_and_(max-height:450px)]:w-[46%] [@media(min-width:600px)_and_(max-height:450px)]:flex-none flex-none max-h-[46%] [@media(max-width:639px)_and_(min-height:451px)]:flex-1 [@media(max-width:639px)_and_(min-height:451px)]:max-h-none [@media(max-width:639px)_and_(min-height:451px)]:min-h-[180px] md:max-h-full md:self-start md:shrink-0 [@media(max-width:599px)_and_(max-height:450px)]:flex-1 [@media(max-height:450px)]:max-h-none flex-col bg-[#0A0E17] border border-white/10 rounded-2xl overflow-hidden shadow-xl min-h-0">
        <div className="p-2 sm:p-3.5 [@media(min-width:600px)_and_(max-height:450px)]:p-2 [@media(max-width:639px)]:p-2 flex-1 min-h-0 overflow-y-auto space-y-2.5 [@media(min-width:600px)_and_(max-height:450px)]:space-y-1 [@media(max-width:639px)]:space-y-1.5 scrollbar-thin">
          {/* Top Control Bar: Active Player Quick Selector & Tool Buttons */}
          <div className="flex flex-col items-stretch gap-3">
            {/* Player Selection Pills with Coaching Notes Indicator */}
            <div className="flex items-center gap-1.5 flex-wrap max-w-full">
              <span className="hidden sm:flex [@media(min-width:600px)_and_(max-height:450px)]:hidden text-[10px] font-black uppercase tracking-wider text-neutral-400 mr-1 items-center gap-1">
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
                    aria-pressed={isSelected}
                    aria-label={`Select ${p.label}`}
                    onClick={() => setSelectedPlayerId(p.id)}
                    className={`min-w-10 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border flex items-center justify-center gap-1.5 ${
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
            <div className="flex items-center gap-2 flex-wrap">
              {selectedPlayer && (
              <div className="w-full flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs leading-relaxed">
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
                className="px-2.5 py-1 rounded-xl text-xs font-bold text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1.5 [@media(min-width:600px)_and_(max-height:450px)]:hidden [@media(max-width:639px)]:px-1.5"
                title="View & Edit Coaching Notes for all positions"
                aria-label="View and edit position notes"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Position Notes</span>
              </button>

              {/* Freehand Route Draw Mode Toggle */}
              {!readOnly && selectedPlayer && selectedPlayer.side === "offense" && (
                <button
                  type="button"
                  onClick={() => setMode(mode === "draw" ? "select" : "draw")}
                  title={mode === "draw" ? "Drawing mode active: Click on field to add points" : "Enable Freehand Click-to-Draw"}
                  aria-label={mode === "draw" ? "Stop drawing route" : "Draw route"}
                  className={`px-2.5 py-1 [@media(max-width:639px)]:px-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                    mode === "draw"
                      ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/25"
                      : "bg-white/5 hover:bg-white/10 text-neutral-300 border-white/10"
                  }`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{mode === "draw" ? "Stop Drawing" : "Draw Route"}</span>
                </button>
              )}

              {/* Clear Route Button */}
              {!readOnly && selectedPlayer?.route && selectedPlayer.route.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearRoute}
                  title="Clear Route / Assignment"
                  aria-label="Clear route or assignment"
                  className="px-2 py-1 [@media(max-width:639px)]:px-1.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-red-400 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 transition-all flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline [@media(max-width:639px)]:hidden">Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Position Coaching Notes Bar for Currently Selected Player */}
          {selectedPlayer && (
            <div className="space-y-1.5 border-t border-white/10 pt-3 [@media(max-height:450px)]:hidden max-sm:hidden">
              <div className="flex items-center gap-1.5 shrink-0 text-cyan-400 font-mono text-[11px] font-bold">
                <FileText className="w-3.5 h-3.5" />
                <span>{selectedPlayer.label} notes:</span>
              </div>
              <textarea
                rows={2}
                aria-label={`${selectedPlayer.label} coaching notes`}
                disabled={readOnly}
                value={selectedPlayer.notes || ""}
                onChange={(e) => handleUpdatePlayerNotes(selectedPlayer.id, e.target.value)}
                placeholder="Coaching assignment and read notes..."
                className="w-full min-w-0 resize-y rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-xs leading-relaxed text-white placeholder:text-neutral-500 outline-none focus:border-cyan-400"
              />
            </div>
          )}

          {/* Offense Route Presets Controls */}
          {selectedPlayer?.side === "offense" ? (
            <div className="space-y-2 [@media(max-width:639px)]:space-y-1 relative" ref={presetMenuRef}>
              {/* Header row: Route assignment info & Action Buttons */}
              <div className="flex flex-col items-stretch gap-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1 max-sm:hidden">
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

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Pre-Snap Motion Menu Button */}
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => {
                      setIsMotionMenuOpen((prev) => !prev);
                      setIsPresetMenuOpen(false);
                    }}
                    data-testid="toggle-motion-btn"
                    aria-label={isMotionMenuOpen ? "Hide motion menu" : "Show motion menu"}
                    aria-expanded={isMotionMenuOpen}
                    className={`px-3 py-2 min-h-10 rounded-xl text-xs font-black border transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
                      isMotionMenuOpen || playerHasMotion(selectedPlayer)
                        ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/30"
                        : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 hover:border-amber-500/50"
                    }`}
                    title="Pre-snap motion options"
                  >
                    <Activity className="w-4 h-4" />
                    <span>Motion</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMotionMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Preset Routes Menu Toggle Button */}
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => {
                      setIsPresetMenuOpen((prev) => !prev);
                      setIsMotionMenuOpen(false);
                    }}
                    onPointerEnter={() => void loadRouteCatalogDrawer()}
                    onPointerDown={() => void loadRouteCatalogDrawer()}
                    onFocus={() => void loadRouteCatalogDrawer()}
                    data-testid="route-presets-toggle"
                    aria-label={isPresetMenuOpen ? "Hide route catalog" : "Show route catalog"}
                    aria-expanded={isPresetMenuOpen}
                    className={`px-3 py-2 min-h-10 rounded-xl text-xs font-black border transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
                      isPresetMenuOpen
                        ? "bg-cyan-500 text-black border-cyan-400 shadow-cyan-500/30"
                        : "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40"
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    <span>Routes</span>
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
                      <span>Save Preset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Pre-Snap Motion Menu (larger panel) */}
              {isMotionMenuOpen && (
                <div
                  data-testid="motion-menu"
                  className="mt-2 bg-[#0A0E17] border border-amber-500/40 rounded-2xl p-3 shadow-2xl space-y-2.5 max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-[70] max-sm:mt-0 max-sm:max-h-[42dvh] max-sm:overflow-y-auto max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] [@media(max-height:450px)]:fixed [@media(max-height:450px)]:inset-y-0 [@media(max-height:450px)]:right-0 [@media(max-height:450px)]:left-auto [@media(max-height:450px)]:z-[70] [@media(max-height:450px)]:mt-0 [@media(max-height:450px)]:w-[42%] [@media(max-height:450px)]:overflow-y-auto [@media(max-height:450px)]:rounded-none [@media(max-height:450px)]:border-y-0 [@media(max-height:450px)]:border-r-0"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-white">
                        Pre-Snap Motion ({selectedPlayer.label})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMotionMenuOpen(false)}
                      className="p-2 -m-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
                      aria-label="Close motion menu"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {PRE_SNAP_MOTION_PRESETS.map((motion) => {
                      const isCurrent =
                        selectedPlayer.motionName === motion.name ||
                        selectedPlayer.quickRouteName === motion.name;
                      return (
                        <button
                          key={motion.name}
                          type="button"
                          disabled={readOnly}
                          onClick={() => {
                            handleApplyPreset(motion.name);
                            setIsMotionMenuOpen(false);
                          }}
                          data-testid={`quick-route-${motion.short.toLowerCase()}-motion`}
                          className={`min-h-12 p-3 rounded-xl text-left transition-all border cursor-pointer ${
                            isCurrent
                              ? "bg-amber-500 text-black border-amber-400 shadow-md"
                              : "bg-black/60 text-amber-200 hover:bg-amber-500/15 border-amber-500/30"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-sm font-black">
                            <span>{motion.name}</span>
                            {isCurrent && <Check className="w-4 h-4 stroke-[3]" />}
                          </div>
                          <div className={`text-[11px] mt-0.5 ${isCurrent ? "text-black/75" : "text-neutral-400"}`}>
                            {motion.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {playerHasMotion(selectedPlayer) && (
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => {
                        handleToggleMotion();
                        setIsMotionMenuOpen(false);
                      }}
                      data-testid="remove-motion-btn"
                      className="w-full min-h-11 rounded-xl text-xs font-black text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remove Motion</span>
                    </button>
                  )}
                </div>
              )}

              {/* Inline Collapsible Catalog Drawer (rendered in-flow so overflow-hidden never clips it) */}
              {isPresetMenuOpen && (
                <RouteCatalogDrawer
                  selectedPlayer={selectedPlayer}
                  readOnly={readOnly}
                  isDemo={isDemo}
                  customPresets={customPresets}
                  effectiveRouteDepth={effectiveRouteDepth}
                  minRouteDepthYards={MIN_ROUTE_DEPTH_YARDS}
                  maxRouteDepthYards={maxRouteDepthYards}
                  isUsingRouteDefaultDepth={routeDepth === null && Boolean(currentCatalogRoute)}
                  onClose={() => setIsPresetMenuOpen(false)}
                  onDepthChange={handleDepthChange}
                  onApplyPreset={(presetName) => handleApplyPreset(presetName, routeDepth ?? undefined)}
                  onApplyCustomPreset={handleApplyCustomPreset}
                  onDeleteCustomPreset={handleDeleteCustomPreset}
                  onSaveCurrentRoute={() => {
                    if (!selectedPlayer.route || selectedPlayer.route.length === 0) {
                      alert(`Draw a route for ${selectedPlayer.label} on the field first, then click Add Preset.`);
                      return;
                    }
                    setNewPresetName(`${selectedPlayer.label} Custom Route`);
                    setIsSavePresetModalOpen(true);
                  }}
                />
              )}
            </div>
          ) : selectedPlayer?.side === "defense" ? (
            /* Defense Coverage Presets Ribbon */
            <div className="space-y-1.5 [@media(min-width:600px)_and_(max-height:450px)]:grid [@media(min-width:600px)_and_(max-height:450px)]:grid-cols-[auto_1fr] [@media(min-width:600px)_and_(max-height:450px)]:gap-x-2">
              <div className="flex items-center justify-between [@media(min-width:600px)_and_(max-height:450px)]:col-span-2">
                <span className="text-xs font-black uppercase tracking-wider text-purple-200 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  <span>Coverage & Assignment ({selectedPlayer.label}):</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin [@media(min-width:600px)_and_(max-height:450px)]:col-start-1 [@media(min-width:600px)_and_(max-height:450px)]:row-start-2">
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={handleSelectZoneCoverage}
                  aria-pressed={selectedPlayer.coverageType === "zone"}
                  className={`px-2.5 py-1.5 [@media(min-width:600px)_and_(max-height:450px)]:py-1 rounded-xl text-xs font-bold transition-all shrink-0 border flex items-center gap-1.5 ${
                    selectedPlayer.coverageType === "zone" || (!selectedPlayer.coverageType && selectedPlayer.label !== "RUSH")
                      ? "bg-purple-300 text-black border-purple-200 shadow-md"
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
                  aria-pressed={selectedPlayer.coverageType === "man" || mode === "man"}
                  className={`px-2.5 py-1.5 [@media(min-width:600px)_and_(max-height:450px)]:py-1 rounded-xl text-xs font-bold transition-all shrink-0 border flex items-center gap-1.5 ${
                    selectedPlayer.coverageType === "man" || mode === "man"
                      ? "bg-pink-300 text-black border-pink-200 shadow-md"
                      : "bg-black/50 text-neutral-300 hover:bg-neutral-800 border-white/10"
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  <span>Man</span>
                </button>

                <button
                  type="button"
                  data-testid="set-pass-rush-btn"
                  disabled={readOnly}
                  onClick={handleSetPassRush}
                  aria-pressed={selectedPlayer.coverageType === "rush"}
                  className={`px-2.5 py-1.5 [@media(min-width:600px)_and_(max-height:450px)]:py-1 rounded-xl text-xs font-bold transition-all shrink-0 border flex items-center gap-1.5 ${
                    selectedPlayer.coverageType === "rush"
                      ? "bg-red-300 text-black border-red-200 shadow-md"
                      : "bg-black/50 text-neutral-300 hover:bg-neutral-800 border-white/10"
                  }`}
                  title={`Rusher must line up at least ${rushLineDistanceYards} yards behind the line of scrimmage`}
                >
                  <Zap className="w-3 h-3" />
                  <span>Rush</span>
                  <span className="text-[10px] opacity-80">{rushLineDistanceYards} yd</span>
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1 [@media(min-width:600px)_and_(max-height:450px)]:col-start-2 [@media(min-width:600px)_and_(max-height:450px)]:row-start-2">
                {DEFENSIVE_ZONE_CATEGORIES.map((item) => (
                  <button
                    key={item.category}
                    type="button"
                    data-testid={`coverage-category-${item.id}`}
                    aria-pressed={defensiveZoneCategory === item.category}
                    onClick={() => setDefensiveZoneCategory(item.category)}
                    className={`rounded-lg px-2 py-1.5 [@media(min-width:600px)_and_(max-height:450px)]:py-1 text-[10px] font-black uppercase tracking-wide border transition-colors ${
                      defensiveZoneCategory === item.category
                        ? "bg-purple-500/20 border-purple-400/50 text-purple-200"
                        : "bg-black/40 border-white/20 text-neutral-200 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 [@media(min-width:600px)_and_(max-height:450px)]:col-span-2 [@media(min-width:600px)_and_(max-height:450px)]:row-start-3 gap-1.5">
                {STANDARD_DEFENSIVE_ZONES.filter(
                  (zone) => zone.category === defensiveZoneCategory
                ).map((zt) => {
                  const isCurrent =
                    selectedPlayer.quickRouteName === zt.name ||
                    selectedPlayer.quickRouteName === zt.shortName;
                  return (
                    <button
                      key={zt.id}
                      type="button"
                      disabled={readOnly}
                      aria-pressed={isCurrent}
                      onClick={() => handleAssignStandardZone(zt)}
                      data-testid={`coverage-${zt.id}`}
                      title={zt.description}
                      className={`min-w-0 min-h-10 px-2 py-2 [@media(min-width:600px)_and_(max-height:450px)]:py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-purple-200 focus-visible:outline-offset-2 ${
                        isCurrent
                          ? "bg-purple-300 text-black border-purple-200 shadow-md"
                          : "bg-black/50 text-neutral-100 hover:border-purple-300 hover:text-white border-white/20"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: zt.color }}
                      />
                      <span className="min-w-0 break-words text-left">{zt.shortName}</span>
                      {isCurrent && <Check className="w-3 h-3 text-black stroke-[3] shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Custom Zone Creation Options */}
              <div className="pt-2 border-t border-white/10 space-y-1.5 [@media(min-width:600px)_and_(max-height:450px)]:col-span-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  <span>Custom Zones</span>
                  <span className="text-[10px] text-neutral-400 normal-case font-normal">Shape & size controls</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={readOnly}
                    data-testid="create-custom-oval-zone"
                    onClick={() => handleCreateCustomZone("ellipse")}
                    className="min-h-9 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 bg-purple-950/40 border-purple-500/40 text-purple-200 hover:bg-purple-900/60 hover:text-white cursor-pointer"
                  >
                    <Circle className="w-3.5 h-3.5" />
                    <span>+ Custom Oval</span>
                  </button>
                  <button
                    type="button"
                    disabled={readOnly}
                    data-testid="create-custom-box-zone"
                    onClick={() => handleCreateCustomZone("rectangle")}
                    className="min-h-9 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 bg-purple-950/40 border-purple-500/40 text-purple-200 hover:bg-purple-900/60 hover:text-white cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>+ Custom Box</span>
                  </button>
                </div>
              </div>

              {/* Inspector / Customizer Panel for Active Zone */}
              {activeZone && renderZoneCustomizer(activeZone)}
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
            <div className="space-y-2">
              {activeZone ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-neutral-300 font-mono py-1">
                    <span className="flex items-center gap-1.5 text-purple-300 font-bold">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Customizing Zone: {activeZone.name}</span>
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Drag to move or resize on field
                    </span>
                  </div>
                  {renderZoneCustomizer(activeZone)}
                  <div className="pt-1.5">
                    <div className="text-[10px] text-neutral-400 uppercase font-bold mb-1">
                      Assign Defender to this Zone
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                      {defensePlayers.map((p) => {
                        const isAssigned = p.zoneId === activeZone.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              if (isAssigned) {
                                const updatedPlayers = play.players.map((pl) =>
                                  pl.id === p.id
                                    ? {
                                        ...pl,
                                        zoneId: undefined,
                                        coverageType: undefined,
                                        quickRouteName: undefined,
                                        route: [],
                                      }
                                    : pl
                                );
                                onChange({ ...play, players: updatedPlayers });
                              } else {
                                handleAssignZone(activeZone.id, p.id);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                              isAssigned
                                ? "bg-purple-300 text-black border-purple-200 shadow-sm"
                                : "bg-black/40 text-neutral-300 border-white/10 hover:text-white hover:bg-neutral-800"
                            }`}
                          >
                            <span>{p.label} ({p.role})</span>
                            {isAssigned && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 py-1">
                  <div className="flex items-center justify-between text-xs text-neutral-300 font-mono">
                    <span className="flex items-center gap-1.5 text-purple-300 font-bold">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Defensive Zone Coverage:</span>
                    </span>
                    <span className="text-[11px] text-neutral-400 hidden sm:inline">
                      Select a player or create custom zones
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={readOnly}
                      data-testid="create-custom-oval-zone"
                      onClick={() => handleCreateCustomZone("ellipse")}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 bg-purple-950/40 border-purple-500/40 text-purple-200 hover:bg-purple-900/60 hover:text-white cursor-pointer"
                    >
                      <Circle className="w-3.5 h-3.5" />
                      <span>+ Custom Oval Zone</span>
                    </button>
                    <button
                      type="button"
                      disabled={readOnly}
                      data-testid="create-custom-box-zone"
                      onClick={() => handleCreateCustomZone("rectangle")}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 bg-purple-950/40 border-purple-500/40 text-purple-200 hover:bg-purple-900/60 hover:text-white cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>+ Custom Box Zone</span>
                    </button>
                  </div>
                  {play.zones && play.zones.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-neutral-400 font-mono">Zones:</span>
                      {play.zones.map((z) => (
                        <button
                          key={z.id}
                          type="button"
                          onClick={() => setSelectedZoneId(z.id)}
                          className="px-2 py-1 rounded-md text-[10px] font-bold bg-white/5 hover:bg-purple-500/20 text-neutral-300 hover:text-purple-300 border border-white/10 flex items-center gap-1 cursor-pointer"
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: z.color }}
                          />
                          <span>{z.name}</span>
                          <span className="text-[9px] opacity-70 uppercase font-mono">
                            ({z.shape === "rectangle" ? "Box" : "Oval"})
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin pt-1">
                    <span className="text-[11px] text-neutral-400 font-mono shrink-0">Defenders:</span>
                    {defensePlayers.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlayerId(p.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white/5 hover:bg-purple-500/20 text-neutral-300 hover:text-purple-300 border border-white/10 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <span>{p.label}</span>
                        {p.coverageType && (
                          <span className="text-[10px] opacity-75 capitalize">({p.coverageType})</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Save Route Preset to Team (Up to 20 additional presets) */}
      {isSavePresetModalOpen && selectedPlayer && (
        <SaveRoutePresetDialog
          customPresetCount={customPresets.length}
          waypointCount={selectedPlayer.route?.length || 0}
          isDemo={isDemo}
          presetName={newPresetName}
          onPresetNameChange={setNewPresetName}
          onSave={handleSaveCurrentRouteAsPreset}
          onClose={() => setIsSavePresetModalOpen(false)}
        />
      )}

      {/* MODAL: Coordinator Install Sheet / All Position Coaching Notes */}
      {isPositionNotesModalOpen && (
        <PositionNotesDialog
          playName={play.name}
          players={play.type === "defense" ? defensePlayers : offensePlayers}
          readOnly={readOnly}
          onUpdatePlayerNotes={handleUpdatePlayerNotes}
          onClose={() => setIsPositionNotesModalOpen(false)}
        />
      )}

      {/* MODAL: Coach General Playbook Scheme Notes */}
      {isPlayNotesModalOpen && (
        <PlayNotesDialog
          notes={play.notes || ""}
          readOnly={readOnly}
          onNotesChange={(notes) => onChange({ ...play, notes })}
          onClose={() => setIsPlayNotesModalOpen(false)}
        />
      )}
    </div>
  );
}
