import { describe, expect, it } from "vitest";
import { DEFAULT_TEAM_COLOR_PALETTE, resolveTeamColorPalette, getTeamBadgeStyle, getTeamCssVariables } from "@/lib/teamColors";

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


