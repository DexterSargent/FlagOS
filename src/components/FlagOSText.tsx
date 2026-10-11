"use client";

import React from "react";

/**
 * Renders the "FlagOS" brand with "FLAG" in crisp white
 * and "OS" in the active primary league theme color.
 */
export function FlagOSText({
  className = "",
  osClassName = "",
}: {
  className?: string;
  osClassName?: string;
}) {
  return (
    <span className={`inline-flex items-baseline tracking-normal font-black ${className}`}>
      <span className="text-white">FLAG</span>
      <span style={{ color: "var(--league-primary, #3CA505)" }} className={osClassName}>
        OS
      </span>
    </span>
  );
}

/**
 * Scans text content for any occurrences of "FlagOS" (case-insensitive)
 * and formats them with "FLAG" in white and "OS" in var(--league-primary, #3CA505).
 */
export function renderFlagOS(text: string | null | undefined): React.ReactNode {
  if (!text || typeof text !== "string") return text;
  if (!/flagos/i.test(text)) return text;

  const parts = text.split(/(flagos)/gi);
  return (
    <>
      {parts.map((part, index) => {
        if (/^flagos$/i.test(part)) {
          return (
            <span key={index} className="inline-flex items-baseline font-black tracking-normal">
              <span className="text-white">FLAG</span>
              <span style={{ color: "var(--league-primary, #3CA505)" }}>OS</span>
            </span>
          );
        }
        return part;
      })}
    </>
  );
}

export default FlagOSText;
