"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Compass,
  Map,
  Sparkles,
  HelpCircle,
  CheckCircle,
  Lightbulb,
  Crosshair,
  Search,
  Filter,
  Eye,
  Sliders
} from "lucide-react";
import {
  ToolWalkthrough,
  WalkthroughStep,
  OverlayCallout,
  ALL_WALKTHROUGHS,
} from "@/lib/walkthroughData";

export type WalkthroughViewMode = "tour" | "map";

interface WalkthroughModalProps {
  walkthrough: ToolWalkthrough;
  initialMode?: WalkthroughViewMode;
  initialStepIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export default function WalkthroughModal({
  walkthrough,
  initialMode = "tour",
  initialStepIndex = 0,
  isOpen,
  onClose,
}: WalkthroughModalProps) {
  const [mode, setMode] = useState<WalkthroughViewMode>(initialMode);
  const [stepIndex, setStepIndex] = useState<number>(initialStepIndex);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [activeCalloutId, setActiveCalloutId] = useState<string | null>(null);
  const [calloutFilter, setCalloutFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  // Reset to initial state when opened
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setStepIndex(initialStepIndex);
      setActiveCalloutId(null);
      setSearchQuery("");
      setCalloutFilter("all");
    }
  }, [isOpen, initialMode, initialStepIndex]);

  // Keep track of viewport dimensions
  useEffect(() => {
    const updateSize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const currentStep: WalkthroughStep | undefined = walkthrough.steps[stepIndex];

  // Measure target element position for current step in tour mode
  const updateTargetRect = useCallback(() => {
    if (!isOpen || mode !== "tour" || !currentStep) {
      setTargetRect(null);
      return;
    }

    try {
      const el = document.querySelector(currentStep.targetSelector) as HTMLElement | null;
      if (el) {
        // Scroll target into view if offscreen
        const rect = el.getBoundingClientRect();
        const isInViewport =
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= window.innerHeight &&
          rect.right <= window.innerWidth;

        if (!isInViewport) {
          el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
        }

        // Slight delay to re-measure after smooth scroll or re-measure immediately
        const freshRect = el.getBoundingClientRect();
        setTargetRect({
          top: freshRect.top,
          left: freshRect.left,
          width: freshRect.width,
          height: freshRect.height,
          bottom: freshRect.bottom,
          right: freshRect.right,
        });
      } else {
        setTargetRect(null);
      }
    } catch (err) {
      console.warn("Could not query selector for step:", currentStep.targetSelector, err);
      setTargetRect(null);
    }
  }, [isOpen, mode, currentStep]);

  useEffect(() => {
    updateTargetRect();
    const handleScrollOrResize = () => {
      updateTargetRect();
    };
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [updateTargetRect]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (mode === "tour") {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          if (stepIndex < walkthrough.steps.length - 1) {
            setStepIndex((prev) => prev + 1);
          } else {
            onClose();
          }
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          if (stepIndex > 0) {
            setStepIndex((prev) => prev - 1);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, mode, stepIndex, walkthrough.steps.length, onClose]);

  // Compute live positions of all callouts for the Button Map HUD
  const locatedCallouts = useMemo(() => {
    if (!isOpen || typeof document === "undefined") return [];

    return walkthrough.callouts
      .map((callout, index) => {
        try {
          const el = document.querySelector(callout.targetSelector) as HTMLElement | null;
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          // Filter out elements that have 0 width or height (e.g. hidden dropdowns)
          if (rect.width === 0 && rect.height === 0) return null;

          return {
            ...callout,
            index: index + 1,
            rect: {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              centerX: rect.left + rect.width / 2,
              centerY: rect.top + rect.height / 2,
            },
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as (OverlayCallout & {
      index: number;
      rect: { top: number; left: number; width: number; height: number; centerX: number; centerY: number };
    })[];
  }, [isOpen, walkthrough.callouts, viewportSize]);

  // Filtered callouts based on category and search
  const filteredCallouts = useMemo(() => {
    return locatedCallouts.filter((c) => {
      const matchesCategory = calloutFilter === "all" || c.category === calloutFilter;
      const matchesSearch =
        searchQuery.trim() === "" ||
        c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [locatedCallouts, calloutFilter, searchQuery]);

  if (!isOpen) return null;

  // Calculate Tooltip position for Tour Mode
  const computeTooltipStyle = () => {
    const cardWidth = Math.min(380, window.innerWidth - 32);
    const cardHeightEstimate = 260;
    const padding = 16;

    if (!targetRect) {
      // Center in screen if no element found
      return {
        top: Math.max(padding, (window.innerHeight - cardHeightEstimate) / 2),
        left: Math.max(padding, (window.innerWidth - cardWidth) / 2),
        width: cardWidth,
      };
    }

    const preferred = currentStep?.placement || "bottom";
    let top = 0;
    let left = targetRect.left + (targetRect.width - cardWidth) / 2;

    // Clamp left within viewport
    left = Math.max(padding, Math.min(left, window.innerWidth - cardWidth - padding));

    if (preferred === "bottom") {
      top = targetRect.bottom + 14;
      // If overflows bottom, flip to top
      if (top + cardHeightEstimate > window.innerHeight - padding) {
        top = Math.max(padding, targetRect.top - cardHeightEstimate - 14);
      }
    } else if (preferred === "top") {
      top = targetRect.top - cardHeightEstimate - 14;
      // If overflows top, flip to bottom
      if (top < padding) {
        top = Math.min(window.innerHeight - cardHeightEstimate - padding, targetRect.bottom + 14);
      }
    } else if (preferred === "left") {
      top = Math.max(padding, targetRect.top - 20);
      left = targetRect.left - cardWidth - 14;
      if (left < padding) {
        left = Math.min(window.innerWidth - cardWidth - padding, targetRect.right + 14);
      }
    } else if (preferred === "right") {
      top = Math.max(padding, targetRect.top - 20);
      left = targetRect.right + 14;
      if (left + cardWidth > window.innerWidth - padding) {
        left = Math.max(padding, targetRect.left - cardWidth - 14);
      }
    }

    // Safety clamp
    top = Math.max(padding, Math.min(top, window.innerHeight - cardHeightEstimate - padding));

    return {
      top,
      left,
      width: cardWidth,
    };
  };

  const tooltipStyle = computeTooltipStyle();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${walkthrough.toolName} walkthrough`}
      className="fixed inset-0 z-[120] overflow-hidden select-none"
    >
      {/* ============================================================== */}
      {/* MODE 1: STEP-BY-STEP SPOTLIGHT TOUR                            */}
      {/* ============================================================== */}
      {mode === "tour" && (
        <>
          {/* SVG Cutout Mask for Spotlight */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300">
            <defs>
              <mask id="walkthrough-spotlight-mask">
                {/* Everything white is visible (the dark backdrop) */}
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {/* Black cutout creates the transparent hole over target */}
                {targetRect && (
                  <rect
                    x={Math.max(0, targetRect.left - 6)}
                    y={Math.max(0, targetRect.top - 6)}
                    width={targetRect.width + 12}
                    height={targetRect.height + 12}
                    rx="14"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(5, 8, 16, 0.78)"
              mask="url(#walkthrough-spotlight-mask)"
            />
          </svg>

          {/* Glowing Animated Ring Around Spotlight Target */}
          {targetRect && (
            <div
              className="absolute pointer-events-none transition-all duration-300 rounded-2xl ring-4 ring-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.6)] animate-pulse"
              style={{
                top: Math.max(0, targetRect.top - 6),
                left: Math.max(0, targetRect.left - 6),
                width: targetRect.width + 12,
                height: targetRect.height + 12,
              }}
            />
          )}

          {/* Floating Tour Card */}
          <div
            className="absolute z-10 bg-slate-900/95 dark:bg-[#0B0F19]/95 text-white border-2 border-cyan-500/50 rounded-2xl shadow-2xl backdrop-blur-xl p-4 sm:p-5 flex flex-col gap-3 transition-all duration-200"
            style={{
              top: tooltipStyle.top,
              left: tooltipStyle.left,
              width: tooltipStyle.width,
            }}
          >
            {/* Header: Progress, Category & Mode Switcher */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Step {stepIndex + 1} of {walkthrough.steps.length}
                </span>
                {currentStep?.category && (
                  <span className="text-[11px] font-mono font-bold text-neutral-400">
                    • {currentStep.category}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* Switch to HUD Map */}
                <button
                  type="button"
                  onClick={() => setMode("map")}
                  title="Switch to full-screen Button Map HUD"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white text-[11px] font-bold transition-colors cursor-pointer"
                >
                  <Map className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Button Map</span>
                </button>
                {/* Close Tour */}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close walkthrough"
                  className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white mb-1">
                {currentStep?.title}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                {currentStep?.description}
              </p>
            </div>

            {/* Action Hint / Try It */}
            {currentStep?.actionHint && (
              <div className="bg-cyan-500/10 border border-cyan-500/25 rounded-xl p-2.5 flex items-start gap-2 text-xs text-cyan-200">
                <Crosshair className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-cyan-300 font-bold">Try it:</strong> {currentStep.actionHint}
                </span>
              </div>
            )}

            {/* Pro Tip */}
            {currentStep?.tip && (
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-2.5 flex items-start gap-2 text-xs text-amber-200">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-amber-300 font-bold">Coach Tip:</strong> {currentStep.tip}
                </span>
              </div>
            )}

            {/* Navigation Footer */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 mt-1">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer px-1"
              >
                Skip Tour
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={stepIndex === 0}
                  onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer border border-white/10"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                {stepIndex < walkthrough.steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setStepIndex((prev) => prev + 1)}
                    className="flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/30 transition-all cursor-pointer active:scale-95"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/30 transition-all cursor-pointer active:scale-95"
                  >
                    <CheckCircle className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Got It!</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* MODE 2: TRANSLUCENT BUTTON MAP ("COACH HUD")                   */}
      {/* ============================================================== */}
      {mode === "map" && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col text-white animate-in fade-in duration-200">
          {/* Top Control Bar */}
          <div className="p-3 sm:p-4 bg-slate-900/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-xl shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-sm">
                <Map className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                    {walkthrough.toolName} • Button Map HUD
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Cheat Sheet
                  </span>
                </div>
                <p className="text-xs text-neutral-400 hidden sm:block">
                  Translucent overlay showing every button and tool control on this screen
                </p>
              </div>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Filter */}
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                {(["all", "primary", "tactics", "gameplay", "settings"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCalloutFilter(cat)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      calloutFilter === cat
                        ? "bg-cyan-500 text-black shadow-sm"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Mode Switcher: Back to Tour */}
              <button
                type="button"
                onClick={() => setMode("tour")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all cursor-pointer"
                title="Switch to guided Step-by-Step Tour"
              >
                <Compass className="w-4 h-4" />
                <span className="hidden sm:inline">Guided Tour</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close button map"
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Interactive Screen Overlay with Glowing Pins */}
          <div className="relative flex-1 overflow-hidden pointer-events-auto">
            {filteredCallouts.map((c) => {
              const isSelected = activeCalloutId === c.id;

              return (
                <div
                  key={c.id}
                  style={{
                    position: "absolute",
                    top: Math.max(8, c.rect.top - 8),
                    left: Math.max(8, c.rect.left - 8),
                  }}
                  className="z-20 transition-all duration-200"
                >
                  {/* Glowing Outline Box over the button */}
                  <div
                    style={{
                      width: c.rect.width + 16,
                      height: c.rect.height + 16,
                    }}
                    className={`rounded-2xl border-2 transition-all duration-200 pointer-events-none ${
                      isSelected
                        ? "border-amber-400 ring-4 ring-amber-400/40 shadow-[0_0_20px_rgba(251,191,36,0.6)] bg-amber-500/10"
                        : "border-cyan-400/60 ring-2 ring-cyan-400/20 hover:border-cyan-300 bg-cyan-500/5"
                    }`}
                  />

                  {/* Labeled Badge Pin */}
                  <button
                    type="button"
                    onClick={() => setActiveCalloutId(isSelected ? null : c.id)}
                    className={`absolute -top-3.5 -left-3.5 flex items-center gap-1 px-2 py-0.5 rounded-full font-black text-xs shadow-xl transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? "bg-amber-400 text-black ring-2 ring-white scale-110"
                        : "bg-cyan-500 hover:bg-cyan-400 text-black ring-1 ring-black/40"
                    }`}
                  >
                    <span>{c.index}</span>
                    <span className="font-bold text-[11px] tracking-tight">{c.label}</span>
                  </button>

                  {/* Active Tooltip Popover if Selected */}
                  {isSelected && (
                    <div
                      className="absolute left-0 top-full mt-2 w-72 bg-neutral-900 border-2 border-amber-400 rounded-2xl p-3 shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-white/10 mb-1.5">
                        <span className="text-xs font-black uppercase text-amber-400">
                          #{c.index} {c.label}
                        </span>
                        <span className="text-[10px] font-mono uppercase text-neutral-400 bg-white/5 px-1.5 py-0.5 rounded">
                          {c.category}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-200 leading-relaxed">
                        {c.description}
                      </p>
                      {c.shortcutOrRole && (
                        <p className="text-[11px] text-amber-300/90 mt-1 font-mono">
                          Role: {c.shortcutOrRole}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Drawer: Directory of All Mapped Buttons for Quick Scanning */}
          <div className="bg-slate-900/95 border-t border-white/10 p-3 max-h-48 overflow-y-auto shrink-0 shadow-2xl scrollbar-thin">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
                Mapped Controls ({filteredCallouts.length} detected)
              </span>
              <span className="text-[11px] text-neutral-400">
                Click any control below to highlight it on your screen
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {filteredCallouts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setActiveCalloutId(c.id);
                    // Scroll to button
                    try {
                      const el = document.querySelector(c.targetSelector);
                      el?.scrollIntoView({ behavior: "smooth", block: "center" });
                    } catch {}
                  }}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex items-start gap-2 ${
                    activeCalloutId === c.id
                      ? "bg-amber-500/20 border-amber-400 text-white"
                      : "bg-black/40 border-white/10 text-neutral-300 hover:border-white/30 hover:text-white"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-cyan-500 text-black text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                    {c.index}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate text-white">{c.label}</div>
                    <div className="text-[11px] text-neutral-400 line-clamp-1">{c.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
