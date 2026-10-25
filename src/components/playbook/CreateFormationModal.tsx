"use client";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";
import { usePageGuide } from "@/lib/pageGuide";
import { FORMATION_EDITOR_WALKTHROUGH } from "@/lib/walkthroughData";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useLeague } from "@/lib/leagueContext";
import {
  Playbook,
  FormationAlignment,
  PlayerNode,
  DEFAULT_LOS_Y,
  RUSH_LINE_DISTANCE,
  clampLegalPosition,
  checkLegalPosition,
  ensureSquadMatchup,
  ensure5v5Matchup,
  applyFormationToSquad,
  FLAG_5V5_FORMATIONS
} from "@/lib/playbookTypes";
import { X, CheckCircle2, AlertTriangle, Sparkles, Move, Zap, Shield, RotateCcw, Eye, EyeOff } from "lucide-react";

interface CreateFormationModalProps {
  isOpen: boolean;
  onClose: () => void;
  playbook: Playbook;
  initialFormation?: FormationAlignment | null;
  onSaveFormation: (formation: FormationAlignment) => void;
}

export default function CreateFormationModal({
  isOpen,
  onClose,
  playbook,
  initialFormation = null,
  onSaveFormation,
}: CreateFormationModalProps) {
  const { settings } = useLeague();
  const leagueRulePlayers = settings?.rules?.playersOnField || 5;

  // Requirement: Default to the league rule for players on field when adding a new formation
  const defaultSquadCount = initialFormation
    ? (initialFormation.players?.filter((p) => p.side === playbook.type).length || playbook.playersOnField || leagueRulePlayers)
    : leagueRulePlayers;

  const [squadCount, setSquadCount] = useState<number>(defaultSquadCount);
  const rushLineDistanceYards = settings?.rules?.rushLineDistance || 7;

  const losY = DEFAULT_LOS_Y;
  const rushDistanceY = (rushLineDistanceYards * 12) / 7;
  const rushY = losY - rushDistanceY;
  const isOffense = playbook.type === "offense";

  // Initial players setup:
  const getInitialPlayers = (): PlayerNode[] => {
    if (initialFormation?.players && initialFormation.players.length > 0) {
      return ensureSquadMatchup(initialFormation.players.map((p) => ({ ...p })), losY, defaultSquadCount);
    }
    const defaultFormationName = isOffense ? "Spread 2x1" : "Cover 2 Zone";
    const base = ensureSquadMatchup([], losY, defaultSquadCount);
    return applyFormationToSquad(base, defaultFormationName, playbook.type, losY);
  };

  const [formationName, setFormationName] = useState(
    initialFormation?.name || (isOffense ? "Spread 2x1" : "Cover 2 Zone")
  );
  const [players, setPlayers] = useState<PlayerNode[]>(getInitialPlayers);
  const [showOpposingSide, setShowOpposingSide] = useState<boolean>(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync / Reset to League Rule on open when adding a new formation
  useEffect(() => {
    if (isOpen) {
      if (initialFormation) {
        const existingCount =
          initialFormation.players && initialFormation.players.length > 0
            ? initialFormation.players.filter((p) => p.side === playbook.type).length || playbook.playersOnField || leagueRulePlayers
            : playbook.playersOnField || leagueRulePlayers;
        setSquadCount(existingCount);
        setFormationName(initialFormation.name);
        setPlayers(
          ensureSquadMatchup(
            initialFormation.players ? initialFormation.players.map((p) => ({ ...p })) : [],
            losY,
            existingCount
          )
        );
      } else {
        // Adding a NEW formation: strictly default to league rule for players on field
        setSquadCount(leagueRulePlayers);
        const defaultName = isOffense ? "Spread 2x1" : "Cover 2 Zone";
        setFormationName(defaultName);
        const base = ensureSquadMatchup([], losY, leagueRulePlayers);
        setPlayers(applyFormationToSquad(base, defaultName, playbook.type, losY));
      }
      setSelectedPlayerId(null);
      setDraggedPlayerId(null);
      setError(null);
    }
  }, [isOpen, initialFormation, leagueRulePlayers, playbook.playersOnField, playbook.type, losY, isOffense]);

  const visiblePlayers = players.filter((p) => (showOpposingSide ? true : p.side === playbook.type));

  const svgRef = useRef<SVGSVGElement>(null);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    cursorX: number;
    cursorY: number;
  } | null>(null);

  usePageGuide(isOpen ? FORMATION_EDITOR_WALKTHROUGH : null, 2);
  if (!isOpen) return null;

  // Convert client cursor coords to SVG percentage (0 - 100)
  const getSvgCoords = (e: React.PointerEvent): { x: number; y: number } | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const x = Math.max(4, Math.min(96, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(4, Math.min(96, ((e.clientY - rect.top) / rect.height) * 100));
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  };

  const handlePointerDown = (e: React.PointerEvent, playerId: string) => {
    e.stopPropagation();
    const coords = getSvgCoords(e);
    if (!coords) return;
    const player = visiblePlayers.find((p) => p.id === playerId);
    if (!player) return;

    setSelectedPlayerId(playerId);
    setDraggedPlayerId(playerId);

    dragStartRef.current = {
      startX: player.x,
      startY: player.y,
      cursorX: coords.x,
      cursorY: coords.y,
    };

    if (svgRef.current) {
      try {
        svgRef.current.setPointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggedPlayerId || !dragStartRef.current) return;
    const coords = getSvgCoords(e);
    if (!coords) return;

    const { startX, startY, cursorX, cursorY } = dragStartRef.current;
    const targetPlayer = players.find((p) => p.id === draggedPlayerId);
    if (!targetPlayer) return;

    const rawTargetX = startX + (coords.x - cursorX);
    const rawTargetY = startY + (coords.y - cursorY);

    // Strictly enforce legal pre-snap alignment clamping
    const clamped = clampLegalPosition(targetPlayer, { x: rawTargetX, y: rawTargetY }, losY);

    setPlayers((prev) =>
      prev.map((p) => (p.id === draggedPlayerId ? { ...p, x: clamped.x, y: clamped.y } : p))
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setDraggedPlayerId(null);
    dragStartRef.current = null;
    if (svgRef.current) {
      try {
        svgRef.current.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  // Squad format switcher
  const handleSquadSizeChange = (newCount: number) => {
    setSquadCount(newCount);
    const updated = ensureSquadMatchup(players, losY, newCount);
    setPlayers(updated);
  };

  // Quick preset starters
  const handleApplyPreset = (presetName: string) => {
    const base = ensureSquadMatchup(players, losY, squadCount);
    const nextPlayers = applyFormationToSquad(base, presetName, playbook.type, losY);
    setPlayers(nextPlayers);
    if (!initialFormation) {
      setFormationName(presetName);
    }
  };

  // Legality checks
  const illegalIssues = players
    .filter((p) => p.side === playbook.type)
    .map((p) => ({ player: p, ...checkLegalPosition(p, losY) }))
    .filter((res) => !res.isLegal);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formationName.trim()) {
      setError("Please enter a name for this formation.");
      return;
    }

    const savedFormation: FormationAlignment = {
      id: initialFormation?.id || `form-${Date.now()}`,
      name: formationName.trim(),
      side: playbook.type,
      description: `${formationName.trim()} ${squadCount}v${squadCount} alignment.`,
      players: players.map((p) => ({ ...p, route: [], quickRouteName: undefined })),
    };

    onSaveFormation(savedFormation);
    onClose();
  };

  const presetList = isOffense
    ? ["Spread 2x1", "Trips Right", "Trips Left", "Bunch Right", "Spread 2x2"]
    : ["Cover 2 Zone", "Cover 1 Man Lock", "Cover 3 Cloud", "Goal Line Tight"];

  return (
    <div className="fixed inset-0 top-[var(--role-switcher-height,0px)] z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="max-h-[calc(100dvh-var(--role-switcher-height,0px)-2rem)] overflow-y-auto bg-[#0B0F19] border border-white/10 rounded-3xl w-full max-w-4xl p-5 sm:p-7 space-y-5 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                  isOffense
                    ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                    : "bg-purple-500/10 text-purple-300 border-purple-500/30"
                }`}
              >
                {isOffense ? "Offensive Alignment Designer" : "Defensive Shell Designer"}
              </span>
              <span className="text-xs font-mono text-neutral-400">
                {playbook.title} • {squadCount}v{squadCount}
              </span>
            </div>
            <PageGuideButton />
            <h2 className="text-xl font-black uppercase text-white mt-1">
              {initialFormation ? "Edit Formation Alignment" : "Design New Formation"}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Drag and position your {squadCount} players to establish their exact pre-snap alignment.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/15 border border-red-500/40 rounded-2xl p-3 text-xs text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formation Controls Bar */}
        <div data-tour="formation-settings" className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-xs">
            <label className="text-[11px] uppercase font-bold text-neutral-300 tracking-wider block mb-1">
              Formation / Alignment Name
            </label>
            <input
              type="text"
              required
              value={formationName}
              onChange={(e) => setFormationName(e.target.value)}
              placeholder="e.g. Spread 2x1, Trips Right, Pistol Bunch..."
              className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 focus:border-cyan-400 text-white text-xs outline-none"
            />
          </div>

          {/* Squad Format Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider">
                Squad Format:
              </label>
              <span className="text-[10px] font-mono font-bold text-cyan-400">
                League Rule: {leagueRulePlayers}v{leagueRulePlayers}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {[4, 5, 6, 7, 8].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => handleSquadSizeChange(cnt)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all border flex items-center gap-1 ${
                    squadCount === cnt
                      ? isOffense
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-sm"
                        : "bg-purple-500/20 text-purple-300 border-purple-400 shadow-sm"
                      : "bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10"
                  }`}
                  title={`${cnt}v${cnt} Alignment`}
                >
                  <span>{cnt}v{cnt}</span>
                  {cnt === leagueRulePlayers && (
                    <span className="text-[8px] uppercase tracking-wider px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Rule
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Preset Starters */}
          <div>
            <label className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block mb-1">
              Preset Template:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {presetList.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 text-xs font-bold transition-all"
                >
                  {preset.split(" ")[0] + " " + (preset.split(" ")[1] || "")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Interactive Field Viewport */}
        <div data-tour="formation-field" className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-mono flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-cyan-400" />
              <span>Drag circles on the field to place your players in position:</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowOpposingSide(!showOpposingSide)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                  showOpposingSide
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10"
                }`}
                title={
                  showOpposingSide
                    ? `Hide opposing ${isOffense ? "defense" : "offense"}`
                    : `Show opposing ${isOffense ? "defense" : "offense"}`
                }
              >
                {showOpposingSide ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>
                  {showOpposingSide
                    ? `Hide Opposing ${isOffense ? "Defense" : "Offense"}`
                    : `Show Opposing ${isOffense ? "Defense" : "Offense"}`}
                </span>
              </button>

              {illegalIssues.length === 0 ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>100% Legal Alignment</span>
                </span>
              ) : (
                <span className="text-red-400 font-bold flex items-center gap-1 bg-red-500/15 px-2 py-0.5 rounded-full border border-red-500/30">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Alignment Warning</span>
                </span>
              )}
            </div>
          </div>

          <div className="w-full aspect-[16/10] bg-[#102319] rounded-2xl border border-white/10 overflow-hidden relative select-none touch-none cursor-crosshair shadow-inner">
            <svg
              ref={svgRef}
              viewBox="0 0 1000 700"
              className="w-full h-full"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <defs>
                <pattern id="turfPattern" width="1000" height="70" patternUnits="userSpaceOnUse">
                  <rect width="1000" height="35" fill="#132B1F" />
                  <rect y="35" width="1000" height="35" fill="#0E2319" />
                </pattern>
              </defs>

              {/* Field Base Turf */}
              <rect width="1000" height="700" fill="url(#turfPattern)" />

              {/* Endzone */}
              <rect x="0" y="0" width="1000" height="84" fill="#0C1D15" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
              <text x="500" y="52" fill="rgba(255,255,255,0.15)" fontSize="32" fontWeight="900" textAnchor="middle" letterSpacing="10">
                END ZONE
              </text>

              {/* Yard Lines */}
              {[20, 30, 40, 50, 60, 70, 80, 90].map((pct) => (
                <line
                  key={pct}
                  x1="20"
                  y1={(pct / 100) * 700}
                  x2="980"
                  y2={(pct / 100) * 700}
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="1.5"
                />
              ))}

              {/* Sidelines */}
              <line x1="20" y1="0" x2="20" y2="700" stroke="#FFFFFF" strokeWidth="3" />
              <line x1="980" y1="0" x2="980" y2="700" stroke="#FFFFFF" strokeWidth="3" />

              {/* 7-Yard Rush Cone Line */}
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
              <text x="90" y={(rushY / 100) * 700 + 4} fill="#000000" fontSize="10" fontWeight="900" textAnchor="middle">
                {rushLineDistanceYards}-YD RUSH CONE
              </text>

              {/* Line of Scrimmage */}
              <line
                x1="20"
                y1={(losY / 100) * 700}
                x2="980"
                y2={(losY / 100) * 700}
                stroke="#3ca505"
                strokeWidth="3.5"
              />
              <ellipse cx="500" cy={(losY / 100) * 700} rx="14" ry="8" fill="#78350F" stroke="#FBBF24" strokeWidth="1.5" />
              <rect x="850" y={(losY / 100) * 700 - 10} width="120" height="20" rx="6" fill="#3ca505" />
              <text x="910" y={(losY / 100) * 700 + 4} fill="#000000" fontSize="10" fontWeight="900" textAnchor="middle">
                SCRIMMAGE (LOS)
              </text>

              {/* Player Nodes (Both sides rendered if opposing toggled, otherwise only active unit) */}
              {visiblePlayers.map((player) => {
                const px = (player.x / 100) * 1000;
                const py = (player.y / 100) * 700;
                const isSelected = selectedPlayerId === player.id;
                const isUnit = player.side === playbook.type;

                return (
                  <g
                    key={player.id}
                    className="cursor-move"
                    onPointerDown={(e) => handlePointerDown(e, player.id)}
                  >
                    {/* Active Halo */}
                    {isSelected && (
                      <circle
                        cx={px}
                        cy={py}
                        r="25"
                        fill="none"
                        stroke={isUnit ? (isOffense ? "#3ca505" : "#A855F7") : "#64748B"}
                        strokeWidth="2.5"
                        strokeOpacity="0.8"
                      />
                    )}

                    {/* Circle Badge */}
                    <circle
                      cx={px}
                      cy={py}
                      r="18"
                      fill={
                        player.side === "offense"
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
                        isUnit
                          ? isOffense
                            ? "#38BDF8"
                            : "#A855F7"
                          : "rgba(255, 255, 255, 0.4)"
                      }
                      strokeWidth={isUnit ? 2.5 : 1}
                      opacity={isUnit ? 1 : 0.4}
                    />

                    {/* Text Label */}
                    <text
                      x={px}
                      y={py + 4.5}
                      fill="#FFFFFF"
                      fontSize="12"
                      fontWeight="900"
                      textAnchor="middle"
                      className="select-none pointer-events-none"
                    >
                      {player.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Submit Actions */}
        <div data-tour="formation-save" className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 ${
              isOffense
                ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/20"
                : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Save Formation Alignment</span>
          </button>
        </div>
      </div>
    </div>
  );
}
