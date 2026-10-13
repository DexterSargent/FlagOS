import { describe, it, expect } from "vitest";
import {
  FLAGOS_LOGO_LIGHT,
  FLAGOS_LOGO_DARK,
  getFlagOSLogoPath,
  isDefaultFlagOSLogo,
  DEFAULT_FLAGOS_LOGO_URLS,
} from "@/lib/brandTokens";

describe("FlagOS Brand Tokens & Logo Architecture", () => {
  it("exports single light and dark mode logo tokens as accessible file paths", () => {
    expect(typeof FLAGOS_LOGO_LIGHT).toBe("string");
    expect(typeof FLAGOS_LOGO_DARK).toBe("string");
    expect(FLAGOS_LOGO_LIGHT.length).toBeGreaterThan(0);
    expect(FLAGOS_LOGO_DARK.length).toBeGreaterThan(0);
  });

  it("resolves the correct logo file path based on active theme", () => {
    expect(getFlagOSLogoPath("light")).toBe(FLAGOS_LOGO_LIGHT);
    expect(getFlagOSLogoPath("dark")).toBe(FLAGOS_LOGO_DARK);
    expect(getFlagOSLogoPath(null)).toBe(FLAGOS_LOGO_DARK);
    expect(getFlagOSLogoPath(undefined)).toBe(FLAGOS_LOGO_DARK);
  });

  it("identifies default FlagOS logo URLs accurately", () => {
    expect(isDefaultFlagOSLogo(FLAGOS_LOGO_LIGHT)).toBe(true);
    expect(isDefaultFlagOSLogo(FLAGOS_LOGO_DARK)).toBe(true);
    expect(isDefaultFlagOSLogo(null)).toBe(true);
    expect(isDefaultFlagOSLogo(undefined)).toBe(true);
    expect(isDefaultFlagOSLogo("")).toBe(true);
    expect(isDefaultFlagOSLogo("/flagos-logo.png")).toBe(true);
    expect(isDefaultFlagOSLogo("/flagos-emblem.png")).toBe(true);
    expect(isDefaultFlagOSLogo("/flagos-emblem-dark.png")).toBe(true);
    expect(isDefaultFlagOSLogo("/flagos-emblem-light.png")).toBe(true);

    // Custom third-party team logos should NOT be marked as default
    expect(isDefaultFlagOSLogo("https://example.com/custom-team-logo.png")).toBe(false);
    expect(isDefaultFlagOSLogo("/uploads/team_vipers.png")).toBe(false);
  });

  it("DEFAULT_FLAGOS_LOGO_URLS includes current light and dark logo tokens", () => {
    expect(DEFAULT_FLAGOS_LOGO_URLS).toContain(FLAGOS_LOGO_LIGHT);
    expect(DEFAULT_FLAGOS_LOGO_URLS).toContain(FLAGOS_LOGO_DARK);
  });
});
