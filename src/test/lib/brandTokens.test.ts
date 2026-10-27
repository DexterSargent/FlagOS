import { describe, it, expect } from "vitest";
import {
  FLAGOS_LOGO,
  FLAGOS_LOADER_PINWHEEL,
  FLAGOS_LOGO_LIGHT,
  FLAGOS_LOGO_DARK,
  getFlagOSLogoPath,
  isDefaultFlagOSLogo,
  DEFAULT_FLAGOS_LOGO_URLS,
} from "@/lib/brandTokens";

describe("FlagOS Brand Tokens & Logo Architecture", () => {
  it("exports a single unified logo token used across all themes", () => {
    expect(FLAGOS_LOGO).toBe("/flagos-emblem-v2-512.png");
    expect(FLAGOS_LOGO_LIGHT).toBe(FLAGOS_LOGO);
    expect(FLAGOS_LOGO_DARK).toBe(FLAGOS_LOGO);
    expect(FLAGOS_LOADER_PINWHEEL).toBe("/football_gear_tilted_spin.gif");
  });

  it("resolves the unified logo file path regardless of active theme", () => {
    expect(getFlagOSLogoPath("light")).toBe(FLAGOS_LOGO);
    expect(getFlagOSLogoPath("dark")).toBe(FLAGOS_LOGO);
    expect(getFlagOSLogoPath(null)).toBe(FLAGOS_LOGO);
    expect(getFlagOSLogoPath(undefined)).toBe(FLAGOS_LOGO);
  });

  it("identifies default FlagOS logo URLs accurately", () => {
    expect(isDefaultFlagOSLogo(FLAGOS_LOGO_LIGHT)).toBe(true);
    expect(isDefaultFlagOSLogo(FLAGOS_LOGO_DARK)).toBe(true);
    expect(isDefaultFlagOSLogo(null)).toBe(true);
    expect(isDefaultFlagOSLogo(undefined)).toBe(true);
    expect(isDefaultFlagOSLogo("")).toBe(true);
    expect(isDefaultFlagOSLogo("/flagos-emblem.png")).toBe(true);
    expect(isDefaultFlagOSLogo("/flagos-emblem.webp")).toBe(true);
    expect(isDefaultFlagOSLogo("/flagos-emblem-512.png")).toBe(true);
    expect(isDefaultFlagOSLogo("/flagos-emblem-v2-512.webp")).toBe(true);

    // Custom third-party team logos should NOT be marked as default
    expect(isDefaultFlagOSLogo("https://example.com/custom-team-logo.png")).toBe(false);
    expect(isDefaultFlagOSLogo("/uploads/team_vipers.png")).toBe(false);
  });

  it("DEFAULT_FLAGOS_LOGO_URLS includes current light and dark logo tokens", () => {
    expect(DEFAULT_FLAGOS_LOGO_URLS).toContain(FLAGOS_LOGO_LIGHT);
    expect(DEFAULT_FLAGOS_LOGO_URLS).toContain(FLAGOS_LOGO_DARK);
  });
});
