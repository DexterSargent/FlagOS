"use client";

import React from "react";
import { FlagOSText } from "./FlagOSText";
import {
  FLAGOS_LOGO,
  FLAGOS_LOGO_LIGHT,
  FLAGOS_LOGO_DARK,
  getFlagOSLogoPath,
  isDefaultFlagOSLogo,
} from "@/lib/brandTokens";

export {
  FLAGOS_LOGO,
  FLAGOS_LOGO_LIGHT,
  FLAGOS_LOGO_DARK,
  getFlagOSLogoPath,
  isDefaultFlagOSLogo,
};

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
 * Uses the single unified high-res background-removed logo (`/flagos-emblem.png`).
 * Works uniformly across both light and dark themes without separate variants.
 * Typography text ("FLAG" + "OS") is kept strictly separate in `<FlagOSText />`.
 */
export function FlagOSLogo({
  variant,
  size = "md",
  className = "",
  alt = "FlagOS Logo",
  style,
  src,
  ...rest
}: FlagOSLogoProps) {
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;
  const isHero = variant === "hero" || size === "hero";
  const dropShadow = isHero
    ? "drop-shadow-[0_25px_50px_rgba(60,165,5,0.45)] hover:scale-105 transition-transform duration-300"
    : "drop-shadow-[0_4px_16px_rgba(60,165,5,0.3)] transition-transform";

  const logoSrc = src || FLAGOS_LOGO;
  const webpSrc = logoSrc.replace(/\.png$/i, ".webp");

  return (
    <picture className="inline-flex items-center justify-center">
      <source srcSet={webpSrc} type="image/webp" />
      <img
        src={logoSrc}
        alt={alt}
        width={rest.width || sizeConfig.width}
        height={rest.height || sizeConfig.height}
        loading={rest.loading || (isHero ? "eager" : "lazy")}
        decoding="async"
        className={`object-contain ${dropShadow} ${className}`.trim()}
        style={style}
        {...rest}
      />
    </picture>
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
