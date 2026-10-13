"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useTheme } from "@/lib/themeContext";

interface FlagOSLogoProps {
  variant?: "full" | "emblem" | "horizontal";
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "hero";
  className?: string;
  showText?: boolean;
}

const SIZE_MAP = {
  xs: { img: 24, font: "text-sm", gap: "gap-1.5" },
  sm: { img: 32, font: "text-base", gap: "gap-2" },
  md: { img: 40, font: "text-xl", gap: "gap-2.5" },
  lg: { img: 56, font: "text-2xl", gap: "gap-3" },
  xl: { img: 80, font: "text-3xl", gap: "gap-4" },
  hero: { img: 140, font: "text-5xl", gap: "gap-5" },
};

/**
 * Official FlagOS Brand Logo Component
 * Uses the 3D football gear emblem and brand typography
 * Adapts dynamically to light and dark theme mode
 */
export default function FlagOSLogo({
  variant = "horizontal",
  size = "md",
  className = "",
  showText = true,
}: FlagOSLogoProps) {
  const config = SIZE_MAP[size] || SIZE_MAP.md;
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Default to dark mode emblem (dark middle hole)
  const isLight = mounted && resolvedTheme === "light";
  const emblemSrc = isLight ? "/flagos-emblem-light.png" : "/flagos-emblem-dark.png";
  const logoSrc = isLight ? "/flagos-emblem-light.png" : "/flagos-logo.png";

  if (variant === "full") {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <img
          src={logoSrc}
          alt="FlagOS Logo"
          className="object-contain drop-shadow-[0_10px_30px_rgba(60,165,5,0.25)] transition-transform hover:scale-105"
          style={{ width: config.img * 2, height: config.img * 2 }}
        />
      </div>
    );
  }

  if (variant === "emblem") {
    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>
        <img
          src={emblemSrc}
          alt="FlagOS Emblem"
          className="object-contain drop-shadow-[0_4px_16px_rgba(60,165,5,0.3)] transition-transform hover:scale-105"
          style={{ width: config.img, height: config.img }}
        />
      </div>
    );
  }

  // Horizontal variant: Emblem + FLAGOS wordmark
  return (
    <div className={`inline-flex items-center ${config.gap} ${className}`}>
      <img
        src={emblemSrc}
        alt="FlagOS Emblem"
        className="object-contain shrink-0 drop-shadow-[0_4px_16px_rgba(60,165,5,0.35)]"
        style={{ width: config.img, height: config.img }}
      />
      {showText && (
        <span className={`font-black uppercase tracking-tight leading-none ${config.font}`}>
          <span className="text-slate-900 dark:text-white transition-colors">FLAG</span>
          <span style={{ color: "#3CA505" }}>OS</span>
        </span>
      )}
    </div>
  );
}
