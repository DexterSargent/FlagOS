import { describe, expect, it } from "vitest";
import { DEFAULT_TEAM_COLOR_PALETTE, resolveTeamColorPalette, getTeamBadgeStyle, getTeamCssVariables, readableInk, INK_SURFACE_DARK, INK_SURFACE_LIGHT } from "@/lib/teamColors";

describe("resolveTeamColorPalette", () => {
  it("uses legacy team colors and sensible defaults when newer palette fields are missing", () => {
    expect(resolveTeamColorPalette({ color: "#123456" })).toEqual({
      primary: "#123456",
      secondary: DEFAULT_TEAM_COLOR_PALETTE.secondary,
      tertiary: "#123456",
    });
  });

  it("uses the configured primary, secondary, and tertiary colors", () => {
    expect(resolveTeamColorPalette({
      color: "#000000",
      primaryColor: "#111111",
      secondaryColor: "#222222",
      tertiaryColor: "#333333",
    })).toEqual({
      primary: "#111111",
      secondary: "#222222",
      tertiary: "#333333",
    });
  });

  it("renders team color text in front of a secondary colored background for Green Bay and other teams", () => {
    const greenBay = {
      name: "Green Bay",
      color: "#203731",
      primaryColor: "#203731",
      secondaryColor: "#FFB612",
      tertiaryColor: "#FFFFFF",
    };
    const style = getTeamBadgeStyle(greenBay);
    expect(style.color).toBe("#203731");
    expect(style.backgroundColor).toBe("#FFB612");
    expect(style.borderColor).toBe("#20373140");
  });

  it("generates CSS custom properties and shades for the whole team theme", () => {
    const palette = {
      primary: "#E31837",
      secondary: "#FFFFFF",
      tertiary: "#000000",
    };
    const vars = getTeamCssVariables(palette);
    expect(vars["--team-primary"]).toBe("#E31837");
    expect(vars["--team-secondary"]).toBe("#FFFFFF");
    expect(vars["--league-primary"]).toBe("#E31837");
    expect(vars["--league-accent"]).toBe("#FFFFFF");
    expect(vars["--team-primary-rgb"]).toBe("227, 24, 55");
    expect(vars["--league-primary-500"]).toBe("#e31837");
  });
});

describe("readableInk", () => {
  const lum = (hex: string) => {
    const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  const ratio = (a: string, b: string) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  it("lightens dark team colors until they are readable on dark surfaces", () => {
    const ink = readableInk("#00338d", INK_SURFACE_DARK);
    expect(ratio(ink, INK_SURFACE_DARK)).toBeGreaterThanOrEqual(4.5);
  });

  it("darkens light team colors until they are readable on light surfaces", () => {
    const ink = readableInk("#ffd700", INK_SURFACE_LIGHT);
    expect(ratio(ink, INK_SURFACE_LIGHT)).toBeGreaterThanOrEqual(4.5);
  });

  it("emits ink variables with team CSS variables", () => {
    const vars = getTeamCssVariables(DEFAULT_TEAM_COLOR_PALETTE);
    expect(vars["--team-ink-dark"]).toMatch(/^#|^rgb/);
    expect(vars["--team-ink-light"]).toMatch(/^#|^rgb/);
  });
});