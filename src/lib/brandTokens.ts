/**
 * ============================================================================
 * FlagOS Official Brand Tokens & Assets
 * ============================================================================
 * 
 * To change the FlagOS logo across the entire site, simply update these two file paths:
 * - FLAGOS_LOGO_LIGHT: Path to the logo image used in light mode.
 * - FLAGOS_LOGO_DARK:  Path to the logo image used in dark mode.
 * 
 * Note: The brand typography text ("FLAG" + "OS") is kept strictly separate in
 * `@/components/FlagOSText`, so changing either logo path here will update the
 * visual emblem everywhere without altering the text styling.
 */

export const FLAGOS_LOGO_LIGHT = "/flagos-emblem.png";
export const FLAGOS_LOGO_DARK = "/flagos-emblem.png";

/**
 * Returns the active FlagOS logo file path based on the given theme ("light" | "dark").
 * Defaults to FLAGOS_LOGO_DARK if theme is not "light".
 */
export function getFlagOSLogoPath(theme?: string | null): string {
  return theme === "light" ? FLAGOS_LOGO_LIGHT : FLAGOS_LOGO_DARK;
}

/**
 * Known internal FlagOS logo asset paths. Used by components like LeagueHeader
 * to recognize whether a league is using default FlagOS branding vs a custom team/circuit logo.
 */
export const DEFAULT_FLAGOS_LOGO_URLS = [
  FLAGOS_LOGO_LIGHT,
  FLAGOS_LOGO_DARK,
  "/flagos-logo.png",
  "/flagos-emblem.png",
  "/flagos-emblem-dark.png",
  "/flagos-emblem-light.png",
  "/flagos-logo-original.png",
  "/logo.png",
] as const;

/**
 * Checks if a given URL is one of the default FlagOS logos.
 */
export function isDefaultFlagOSLogo(url?: string | null): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  return (DEFAULT_FLAGOS_LOGO_URLS as readonly string[]).includes(trimmed);
}
