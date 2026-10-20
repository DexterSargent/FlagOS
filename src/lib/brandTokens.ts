/**
 * ============================================================================
 * FlagOS Official Brand Tokens & Assets
 * ============================================================================
 * 
 * Single Unified Brand Logo Asset:
 * `/flagos-emblem.png` is the high-res, background-removed official FlagOS logo.
 * There is no separate dark/light or emblem/logo distinction needed because the emblem
 * IS the logo and works seamlessly across both light and dark themes.
 * Typography text ("FLAG" + "OS") is rendered via `<FlagOSText />`.
 */

export const FLAGOS_LOGO = "/flagos-emblem-512.png";

// Backward-compatible aliases for legacy imports
export const FLAGOS_LOGO_LIGHT = FLAGOS_LOGO;
export const FLAGOS_LOGO_DARK = FLAGOS_LOGO;

/**
 * Returns the unified FlagOS logo file path regardless of theme.
 */
export function getFlagOSLogoPath(_theme?: string | null): string {
  return FLAGOS_LOGO;
}

/**
 * Known internal FlagOS logo asset paths. Used by components like LeagueHeader
 * to recognize whether a league is using default FlagOS branding vs a custom team/circuit logo.
 */
export const DEFAULT_FLAGOS_LOGO_URLS = [
  FLAGOS_LOGO,
  "/flagos-emblem.png",
  "/flagos-emblem.webp",
  "/flagos-emblem-512.webp",
] as const;

/**
 * Checks if a given URL is one of the default FlagOS logos.
 */
export function isDefaultFlagOSLogo(url?: string | null): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  return (DEFAULT_FLAGOS_LOGO_URLS as readonly string[]).includes(trimmed);
}
