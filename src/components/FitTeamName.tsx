"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

/**
 * Shows the full team name when it fits on one line, otherwise the team's shortcode.
 * Available width is the parent's content box minus its other children, so the parent
 * should have a definite width (e.g. `w-full`) rather than shrink-wrapping its content.
 */
export default function FitTeamName({
  name,
  shortcode,
  className = "",
  style,
}: {
  name: string;
  shortcode?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [useShort, setUseShort] = useState(false);
  const canShorten = !!shortcode && shortcode !== name;

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const measurer = measureRef.current;
    const parent = wrapper?.parentElement;
    if (!wrapper || !measurer || !parent || !canShorten) {
      setUseShort(false);
      return;
    }
    const measure = () => {
      const cs = getComputedStyle(parent);
      const gap = parseFloat(cs.columnGap) || 0;
      const padding = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      let siblings = 0;
      let siblingCount = 0;
      for (const child of Array.from(parent.children)) {
        if (child === wrapper) continue;
        const position = getComputedStyle(child).position;
        if (position === "absolute" || position === "fixed") continue;
        siblings += child.getBoundingClientRect().width;
        siblingCount += 1;
      }
      const available = parent.clientWidth - padding - siblings - gap * siblingCount;
      setUseShort(measurer.getBoundingClientRect().width > available + 0.5);
    };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(parent);
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(measure).catch(() => {});
    }
    return () => observer?.disconnect();
  }, [name, shortcode, canShorten]);

  return (
    <span
      ref={wrapperRef}
      className={`relative min-w-0 truncate ${className}`}
      style={style}
      title={useShort ? name : undefined}
    >
      <span
        ref={measureRef}
        aria-hidden="true"
        className="absolute left-0 top-0 invisible whitespace-nowrap pointer-events-none"
      >
        {name}
      </span>
      {useShort ? (
        <>
          <span aria-hidden="true">{shortcode}</span>
          <span className="sr-only">{name}</span>
        </>
      ) : (
        name
      )}
    </span>
  );
}
