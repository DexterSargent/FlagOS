"use client";

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, CheckCircle, Lightbulb, Crosshair, MousePointerClick } from "lucide-react";
import { createPortal } from "react-dom";
import { ToolWalkthrough, WalkthroughStep } from "@/lib/walkthroughData";

interface WalkthroughModalProps {
  walkthrough: ToolWalkthrough;
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

const PADDING = 12;
const GAP = 14;
const MOBILE_BREAKPOINT = 640;

/** Returns the first element matching the selector that is actually rendered on screen. */
function findVisibleTarget(selector: string): HTMLElement | null {
  if (!selector || typeof document === "undefined") return null;
  try {
    const matches = Array.from(document.querySelectorAll<HTMLElement>(selector));
    return (
      matches.find((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        const style = window.getComputedStyle(el);
        return style.visibility !== "hidden" && style.display !== "none";
      }) ?? null
    );
  } catch {
    return null;
  }
}

/** Steps whose target is not on the current screen (e.g. defense-only controls on an offense play) are skipped. */
export function getAvailableSteps(steps: WalkthroughStep[]): WalkthroughStep[] {
  const available = steps.filter((step) => !step.targetSelector || findVisibleTarget(step.targetSelector));
  return available.length > 0 ? available : steps;
}

export default function WalkthroughModal({
  walkthrough,
  initialStepIndex = 0,
  isOpen,
  onClose,
}: WalkthroughModalProps) {
  const [steps, setSteps] = useState<WalkthroughStep[]>(walkthrough.steps);
  const [stepIndex, setStepIndex] = useState<number>(initialStepIndex);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [viewport, setViewport] = useState({ width: 1024, height: 768 });
  const [cardHeight, setCardHeight] = useState(280);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const available = getAvailableSteps(walkthrough.steps);
    setSteps(available);
    setStepIndex(Math.min(initialStepIndex, available.length - 1));
  }, [isOpen, walkthrough, initialStepIndex]);

  useEffect(() => {
    const updateSize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const currentStep: WalkthroughStep | undefined = steps[stepIndex];
  const isLastStep = stepIndex >= steps.length - 1;

  const measureTarget = useCallback(
    (scroll: boolean) => {
      if (!isOpen || !currentStep?.targetSelector) {
        setTargetRect(null);
        return;
      }
      const el = findVisibleTarget(currentStep.targetSelector);
      if (!el) {
        setTargetRect(null);
        return;
      }
      if (scroll) {
        const rect = el.getBoundingClientRect();
        const fullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight && rect.left >= 0 && rect.right <= window.innerWidth;
        if (!fullyVisible) el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }
      const r = el.getBoundingClientRect();
      setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right });
    },
    [isOpen, currentStep]
  );

  useEffect(() => {
    measureTarget(true);
    const remeasure = () => measureTarget(false);
    // Smooth scrolling settles after the first measurement, so measure again shortly after.
    const settle = window.setTimeout(remeasure, 450);
    window.addEventListener("scroll", remeasure, true);
    window.addEventListener("resize", remeasure);
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener("scroll", remeasure, true);
      window.removeEventListener("resize", remeasure);
    };
  }, [measureTarget]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardHeight(cardRef.current.offsetHeight);
  }, [stepIndex, isOpen, viewport.width, steps]);

  useEffect(() => {
    const el = cardRef.current;
    if (!isOpen || !el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setCardHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [isOpen, stepIndex]);

  const goNext = useCallback(() => {
    if (isLastStep) onClose();
    else setStepIndex((prev) => prev + 1);
  }, [isLastStep, onClose]);

  const goBack = useCallback(() => setStepIndex((prev) => Math.max(0, prev - 1)), []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, goNext, goBack, onClose]);

  if (!isOpen || !currentStep || typeof document === "undefined") return null;

  const isMobile = viewport.width < MOBILE_BREAKPOINT;
  const cardWidth = isMobile ? viewport.width - PADDING * 2 : Math.min(420, viewport.width - PADDING * 2);
  const maxCardHeight = Math.round(viewport.height * (isMobile ? 0.55 : 0.8));
  const effectiveCardHeight = Math.min(cardHeight, maxCardHeight);

  const computeCardPosition = (): { top: number; left: number } => {
    const centered = {
      top: Math.max(PADDING, (viewport.height - effectiveCardHeight) / 2),
      left: Math.max(PADDING, (viewport.width - cardWidth) / 2),
    };
    if (!targetRect) return centered;

    if (isMobile) {
      // Dock to whichever screen edge leaves the highlighted control visible.
      const targetCenter = targetRect.top + targetRect.height / 2;
      const top = targetCenter > viewport.height / 2 ? PADDING : viewport.height - effectiveCardHeight - PADDING;
      return { top, left: PADDING };
    }

    const placement = currentStep.placement || "bottom";
    const clampLeft = (l: number) => Math.max(PADDING, Math.min(l, viewport.width - cardWidth - PADDING));
    const clampTop = (t: number) => Math.max(PADDING, Math.min(t, viewport.height - effectiveCardHeight - PADDING));
    const below = targetRect.bottom + GAP;
    const above = targetRect.top - effectiveCardHeight - GAP;
    const fitsBelow = below + effectiveCardHeight <= viewport.height - PADDING;
    const fitsAbove = above >= PADDING;
    const centeredLeft = clampLeft(targetRect.left + (targetRect.width - cardWidth) / 2);

    if (placement === "left" || placement === "right") {
      const leftSide = targetRect.left - cardWidth - GAP;
      const rightSide = targetRect.right + GAP;
      const fitsLeft = leftSide >= PADDING;
      const fitsRight = rightSide + cardWidth <= viewport.width - PADDING;
      const top = clampTop(targetRect.top + targetRect.height / 2 - effectiveCardHeight / 2);
      if (placement === "left" && fitsLeft) return { top, left: leftSide };
      if (placement === "right" && fitsRight) return { top, left: rightSide };
      if (fitsLeft) return { top, left: leftSide };
      if (fitsRight) return { top, left: rightSide };
    }

    if (placement === "top" && fitsAbove) return { top: above, left: centeredLeft };
    if (fitsBelow) return { top: below, left: centeredLeft };
    if (fitsAbove) return { top: above, left: centeredLeft };
    // Large targets (e.g. the whole field) leave no room above or below: pin to the roomier side, overlapping slightly.
    const roomBelow = viewport.height - targetRect.bottom;
    return {
      top: roomBelow >= targetRect.top ? viewport.height - effectiveCardHeight - PADDING : PADDING,
      left: centeredLeft,
    };
  };

  // Targets scrolled out of view (e.g. inside a scrolling panel) can yield off-screen coordinates; keep the card visible.
  const rawPosition = computeCardPosition();
  const position = {
    top: Math.max(PADDING, Math.min(rawPosition.top, viewport.height - effectiveCardHeight - PADDING)),
    left: Math.max(PADDING, Math.min(rawPosition.left, viewport.width - cardWidth - PADDING)),
  };
  const spotlight = targetRect
    ? {
        x: Math.max(0, targetRect.left - 6),
        y: Math.max(0, targetRect.top - 6),
        width: targetRect.width + 12,
        height: targetRect.height + 12,
      }
    : null;

  // Portal to <body> so ancestors with transforms or backdrop filters can't trap or clip the fixed overlay.
  return createPortal(
    <div className="fixed inset-0 z-[120] overflow-hidden">
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="walkthrough-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlight && <rect {...spotlight} rx="14" fill="black" />}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(5, 8, 16, 0.72)" mask="url(#walkthrough-spotlight-mask)" />
      </svg>

      {spotlight && (
        <div
          data-testid="walkthrough-spotlight"
          className="absolute pointer-events-none transition-all duration-300 rounded-2xl ring-4 ring-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.6)]"
          style={{ top: spotlight.y, left: spotlight.x, width: spotlight.width, height: spotlight.height }}
        />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${walkthrough.toolName} walkthrough`}
        className="absolute z-10 flex flex-col rounded-2xl border-2 border-cyan-500/50 bg-white text-slate-900 shadow-2xl transition-[top,left] duration-200 dark:bg-[#0B0F19] dark:text-white"
        style={{ top: position.top, left: position.left, width: cardWidth, maxHeight: maxCardHeight }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 pt-3 pb-2.5 dark:border-white/10 shrink-0">
          <div className="flex min-w-0 items-center gap-1.5 flex-wrap">
            <span className="rounded-full border border-cyan-600/30 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-cyan-700 dark:border-cyan-500/40 dark:bg-cyan-500/20 dark:text-cyan-300">
              Step {stepIndex + 1} of {steps.length}
            </span>
            {currentStep.category && (
              <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400">{currentStep.category}</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close walkthrough"
            className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body (scrolls if the step has a lot of detail) */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-4 py-3">
          <div>
            <h3 className="mb-1 text-base font-black tracking-tight sm:text-lg">{currentStep.title}</h3>
            <p className="text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-neutral-300">{currentStep.description}</p>
          </div>

          {currentStep.details && currentStep.details.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-white/10 dark:bg-white/5">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                <MousePointerClick className="h-3.5 w-3.5" />
                What each control does
              </div>
              <ul className="space-y-1.5">
                {currentStep.details.map((detail) => (
                  <li key={detail.label} className="text-xs leading-snug text-slate-700 dark:text-neutral-300">
                    <strong className="font-bold text-slate-900 dark:text-white">{detail.label}</strong>
                    {" — "}
                    {detail.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {currentStep.actionHint && (
            <div className="flex items-start gap-2 rounded-xl border border-cyan-600/25 bg-cyan-500/10 p-2.5 text-xs text-cyan-900 dark:border-cyan-500/25 dark:text-cyan-100">
              <Crosshair className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
              <span>
                <strong className="font-bold">Try it:</strong> {currentStep.actionHint}
              </span>
            </div>
          )}

          {currentStep.tip && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:border-amber-500/25 dark:text-amber-100">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong className="font-bold">Coach tip:</strong> {currentStep.tip}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200 px-4 pt-2 pb-3 dark:border-white/10">
          <div className="flex items-center justify-center gap-1" aria-hidden="true">
            {steps.map((step, i) => (
              <span
                key={step.id}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIndex ? "w-4 bg-cyan-500" : i < stepIndex ? "w-1.5 bg-cyan-500/50" : "w-1.5 bg-slate-300 dark:bg-white/15"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-1 text-xs font-bold text-slate-500 transition-colors hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
            >
              Skip tour
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={stepIndex === 0}
                onClick={goBack}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-200 disabled:pointer-events-none disabled:opacity-30 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
              {isLastStep ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-1 rounded-xl bg-emerald-500 px-4 py-1.5 text-xs font-black text-black shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-400 active:scale-95 cursor-pointer"
                >
                  <CheckCircle className="h-3.5 w-3.5 stroke-[3]" />
                  <span>Got it!</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goNext}
                  className="flex items-center gap-1 rounded-xl bg-cyan-500 px-4 py-1.5 text-xs font-black text-black shadow-lg shadow-cyan-500/30 transition-all hover:bg-cyan-400 active:scale-95 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5 stroke-[3]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
