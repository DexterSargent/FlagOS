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
  return (available.length > 0 ? available : steps).map((step) =>
    step.details?.some((d) => d.requiresSelector)
      ? { ...step, details: step.details.filter((d) => !d.requiresSelector || findVisibleTarget(d.requiresSelector)) }
      : step,
  );
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
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const available = getAvailableSteps(walkthrough.steps);
    setSteps(available);
    setStepIndex(Math.min(initialStepIndex, available.length - 1));
  }, [isOpen, walkthrough, initialStepIndex]);

  useLayoutEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [stepIndex]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cardRef.current?.focus();
    return () => {
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [isOpen]);

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
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
      else if (e.key === "Tab") {
        const controls = cardRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), [tabindex='0']");
        const first = controls?.[0];
        const last = controls?.[controls.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === cardRef.current)) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
      else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, goNext, goBack, onClose]);

  if (!isOpen || !currentStep || typeof document === "undefined") return null;

  const isMobile = viewport.width < MOBILE_BREAKPOINT;
  const cardWidth = isMobile ? viewport.width - PADDING * 2 : Math.min(420, viewport.width - PADDING * 2);
  const maxCardHeight = Math.min(viewport.height - PADDING * 2, Math.round(viewport.height * (isMobile ? 0.65 : 0.85)));
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
      left: targetRect.left >= viewport.width - targetRect.right ? PADDING : viewport.width - cardWidth - PADDING,
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
          className="absolute pointer-events-none transition-all duration-300 rounded-2xl ring-2 ring-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.15)]"
          style={{ top: spotlight.y, left: spotlight.x, width: spotlight.width, height: spotlight.height }}
        />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${walkthrough.toolName} walkthrough`}
        tabIndex={-1}
        className="absolute z-10 flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-900 shadow-2xl transition-[top,left] duration-200 dark:border-white/15 dark:bg-[#0B0F19] dark:text-neutral-100"
        style={{ top: position.top, left: position.left, width: cardWidth, maxHeight: maxCardHeight }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 pt-3 pb-2.5 dark:border-white/10 shrink-0">
          <div className="flex min-w-0 items-center gap-1.5 flex-wrap">
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs font-bold text-blue-800 dark:text-blue-300">
              Step {stepIndex + 1} of {steps.length}
            </span>
            <span className="text-xs font-semibold text-[var(--text-secondary)]">{walkthrough.toolName}</span>
            {currentStep.category && (
              <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400">{currentStep.category}</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close walkthrough"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body (scrolls if the step has a lot of detail) */}
        <div ref={bodyRef} role="region" aria-label="Step details" tabIndex={0} className="flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite" aria-atomic="true">
          <div>
            <h3 className="mb-1 text-base font-black tracking-tight sm:text-lg">{currentStep.title}</h3>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{currentStep.description}</p>
          </div>

          {currentStep.details && currentStep.details.length > 0 && (
            <div className="rounded-xl bg-blue-500/[0.04] p-3 dark:bg-blue-500/[0.06]">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)]">
                <MousePointerClick className="h-3.5 w-3.5" />
                What each control does
              </div>
              <ul className="space-y-3">
                {currentStep.details.map((detail) => (
                  <li key={detail.label} className="text-sm leading-relaxed text-[var(--text-secondary)]">
                    <strong className="font-semibold text-[var(--text-primary)]">{detail.label}</strong>
                    {" — "}
                    {detail.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {currentStep.actionHint && (
            <div className="flex items-start gap-2 rounded-xl bg-blue-500/[0.06] p-3 text-sm text-[var(--text-secondary)]">
              <Crosshair className="mt-0.5 h-4 w-4 shrink-0 text-blue-700 dark:text-blue-300" />
              <span>
                <strong className="font-bold">After the guide:</strong> {currentStep.actionHint}
              </span>
            </div>
          )}

          {currentStep.tip && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-500/[0.06] p-3 text-sm text-[var(--text-secondary)]">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong className="font-bold">Keep in mind:</strong> {currentStep.tip}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200 px-4 pt-2 pb-3 dark:border-white/10">
          <div className="h-1 w-full overflow-hidden rounded-full bg-blue-500/10" aria-hidden="true">
            <div className="h-full rounded-full bg-blue-600 dark:bg-blue-400" style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 px-1 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] cursor-pointer"
            >
              Close guide
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={stepIndex === 0}
                onClick={goBack}
                className="flex min-h-11 items-center gap-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-semibold text-neutral-800 transition-all hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
              {isLastStep ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex min-h-11 items-center gap-1 rounded-xl bg-[#256c03] px-4 py-2 text-sm font-bold text-[#fff] transition-all hover:bg-[#1c5302] active:scale-95 cursor-pointer"
                >
                  <CheckCircle className="h-3.5 w-3.5 stroke-[3]" />
                  <span>Done</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goNext}
                  className="flex min-h-11 items-center gap-1 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-[#fff] transition-all hover:bg-blue-800 active:scale-95 cursor-pointer"
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
