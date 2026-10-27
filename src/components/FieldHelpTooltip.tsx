"use client";

import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { HelpCircle } from "lucide-react";

interface FieldHelpTooltipProps {
  content: string;
  title?: string;
  className?: string;
}

export default function FieldHelpTooltip({
  content,
  title,
  className = "",
}: FieldHelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [shiftX, setShiftX] = useState(0);

  // Keep the bubble inside the viewport near a screen edge (phones). Measured from the anchor and the
  // untransformed width so the entry animation's transform can't feed back into it.
  useLayoutEffect(() => {
    const tip = tooltipRef.current;
    const anchor = containerRef.current;
    if (!isOpen || !tip || !anchor) {
      setShiftX(0);
      return;
    }
    const margin = 8;
    const width = tip.offsetWidth;
    const anchorRect = anchor.getBoundingClientRect();
    const viewport = document.documentElement.clientWidth;
    if (!width || !viewport) return;
    const center = anchorRect.left + anchorRect.width / 2;
    const naturalLeft = center - width / 2;
    const naturalRight = center + width / 2;
    let next = 0;
    if (naturalRight > viewport - margin) next = viewport - margin - naturalRight;
    if (naturalLeft + next < margin) next = margin - naturalLeft;
    setShiftX(next);
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Claim the key so an enclosing dialog stays open.
        event.preventDefault();
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Hover already opened it on desktop, so a click must never toggle it shut.
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={(e) => {
          // If related target is not inside container, close
          if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setIsOpen(false);
          }
        }}
        aria-label={title ? `${title}: ${content}` : content}
        aria-expanded={isOpen}
        className="inline-flex items-center justify-center p-0.5 text-neutral-400 hover:text-cyan-400 focus:text-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors rounded-full cursor-pointer ml-1"
      >
        <HelpCircle className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
      </button>

      {isOpen && (
        <div
          ref={tooltipRef}
          role="tooltip"
          style={{ transform: `translateX(calc(-50% + ${shiftX}px))` }}
          className="absolute bottom-full left-1/2 mb-2 w-64 max-w-[85vw] p-3 rounded-xl bg-neutral-900/95 border border-cyan-500/30 text-neutral-200 text-xs shadow-2xl backdrop-blur-md z-50 pointer-events-auto animate-in fade-in zoom-in-95 duration-150 leading-relaxed font-sans normal-case tracking-normal"
        >
          {title && (
            <div className="font-bold text-cyan-300 uppercase font-mono text-[10px] tracking-wider mb-1 flex items-center gap-1.5">
              <span>{title}</span>
            </div>
          )}
          <p className="text-[11px] text-neutral-300 leading-snug font-normal">{content}</p>
          {/* Subtle Tooltip Arrow */}
          <div
            style={{ left: `calc(50% - ${shiftX}px)` }}
            className="absolute top-full -translate-x-1/2 -mt-1 border-4 border-transparent border-t-neutral-900/95 pointer-events-none"
          />
        </div>
      )}
    </div>
  );
}
