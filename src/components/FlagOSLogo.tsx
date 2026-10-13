"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "@/lib/themeContext";
import { FlagOSText } from "./FlagOSText";
import {
  FLAGOS_LOGO_LIGHT,
  FLAGOS_LOGO_DARK,
  getFlagOSLogoPath,
  isDefaultFlagOSLogo,
} from "@/lib/brandTokens";

export { FLAGOS_LOGO_LIGHT, FLAGOS_LOGO_DARK, getFlagOSLogoPath, isDefaultFlagOSLogo };

export interface FlagOSLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  variant?: "emblem" | "full" | "hero";
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "hero";
  className?: string;
  alt?: string;
}

const SIZE_MAP = {
  xs: { width: 24, height: 24 },
  sm: { width: 32, height: 32 },
  md: { width: 40, height: 40 },
  lg: { width: 64, height: 64 },
  xl: { width: 80, height: 80 },
  hero: { width: 200, height: 200 },
};

/**
 * FlagOS Official Brand Logo Component
 * 
 * Uses the single brand logo token defined in `@/lib/brandTokens`.
 * Automatically resolves light mode (`FLAGOS_LOGO_LIGHT`) or dark mode (`FLAGOS_LOGO_DARK`).
 * 
 * NOTE: The typography text is intentionally separated into `<FlagOSText />` in `@/components/FlagOSText`,
 * so updating the logo only requires updating the single file path token in brandTokens.ts.
 */
export function FlagOSLogo({
  variant = "emblem",
  size = "md",
  className = "",
  alt = "FlagOS Logo",
  style,
  ...rest
}: FlagOSLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const themeToUse = mounted ? resolvedTheme : "dark";
  const logoSrc = getFlagOSLogoPath(themeToUse);
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;

  let variantStyles = "object-contain drop-shadow";
  if (variant === "hero") {
    variantStyles =
      "object-contain drop-shadow-[0_25px_50px_rgba(60,165,5,0.45)] hover:scale-105 transition-transform duration-300";
  } else if (variant === "emblem") {
    variantStyles =
      "object-contain drop-shadow-[0_4px_16px_rgba(60,165,5,0.3)] transition-transform";
  }

  return (
    <img
      src={logoSrc}
      alt={alt}
      width={rest.width || sizeConfig.width}
      height={rest.height || sizeConfig.height}
      className={`${variantStyles} ${className}`.trim()}
      style={style}
      {...rest}
    />
  );
}

/**
 * Convenience composition of the separate `<FlagOSLogo />` and `<FlagOSText />` tokens.
 */
export function FlagOSBrand({
  logoSize = "md",
  className = "inline-flex items-center gap-2.5",
  textClassName = "",
  osClassName = "",
  showText = true,
}: {
  logoSize?: FlagOSLogoProps["size"];
  className?: string;
  textClassName?: string;
  osClassName?: string;
  showText?: boolean;
}) {
  return (
    <div className={className}>
      <FlagOSLogo size={logoSize} />
      {showText && <FlagOSText className={textClassName} osClassName={osClassName} />}
    </div>
  );
}

export default FlagOSLogo;
