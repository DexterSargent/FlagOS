export interface TeamColorSource {
  color?: string;
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
}

export interface TeamColorPalette {
  primary: string;
  secondary: string;
  tertiary: string;
}

export const DEFAULT_TEAM_COLOR_PALETTE: TeamColorPalette = {
  primary: "#06B6D4",
  secondary: "#E2E8F0",
  tertiary: "#22D3EE",
};

export function resolveTeamColorPalette(team?: TeamColorSource | null): TeamColorPalette {
  const primary = team?.primaryColor || team?.color || DEFAULT_TEAM_COLOR_PALETTE.primary;
  return {
    primary,
    secondary: team?.secondaryColor || DEFAULT_TEAM_COLOR_PALETTE.secondary,
    tertiary: team?.tertiaryColor || primary,
  };
}

function luminance(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

function contrastRatio(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Keeps the preferred text colour when it is readable on the background, otherwise falls back to black or white.
export function getReadableTextColor(background: string, preferred: string): string {
  const bg = luminance(background);
  if (bg === null) return preferred;
  const pref = luminance(preferred);
  if (pref !== null && contrastRatio(bg, pref) >= 4.5) return preferred;
  return contrastRatio(bg, 0) >= contrastRatio(bg, 1) ? "#000000" : "#FFFFFF";
}

/** Surfaces the ink colours are tuned against: the lightest dark-mode panel and the darkest light-mode panel. */
export const INK_SURFACE_DARK = "#171e28";
export const INK_SURFACE_LIGHT = "#e7edf4";

/** Lightens or darkens a brand colour just enough to read as text (4.5:1) on the given surface. */
export function readableInk(color: string, surface: string, minRatio = 4.5): string {
  const bg = luminance(surface);
  const base = /^#?[0-9a-f]{6}$/i.test(color.trim()) ? parseHexColor(color) : null;
  if (bg === null || !base) return color;
  const target = bg < 0.2 ? 255 : 0;
  for (let step = 0; step <= 20; step += 1) {
    const w = step / 20;
    const mixed = [base.r, base.g, base.b].map((v) => Math.round(v * (1 - w) + target * w));
    const hex = `#${mixed.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    const lum = luminance(hex);
    if (lum !== null && contrastRatio(bg, lum) >= minRatio) return hex;
  }
  return target ? "#ffffff" : "#000000";
}

/** First team colour that stays legible on a near-black surface, for accents, bars and highlights. */
export function getAccentOnDark(palette: TeamColorPalette, surface = "#0A0A0A"): string {
  const bg = luminance(surface) ?? 0;
  const candidate = [palette.primary, palette.secondary, palette.tertiary].find((color) => {
    const lum = luminance(color);
    return lum !== null && contrastRatio(bg, lum) >= 3;
  });
  return candidate || "#FFFFFF";
}

export function getTeamBadgeStyle(team?: TeamColorSource | null): {
  color: string;
  backgroundColor: string;
  borderColor: string;
} {
  const palette = resolveTeamColorPalette(team);
  return {
    color: getReadableTextColor(palette.secondary, palette.primary),
    backgroundColor: palette.secondary,
    borderColor: `${palette.primary}40`,
  };
}

export function parseHexColor(hex: string): { r: number; g: number; b: number } {
  let cleaned = (hex || "#06B6D4").replace("#", "").trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split("").map((c) => c + c).join("");
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return { r: 6, g: 182, b: 212 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function generateColorShades(hex: string): Record<string, string> {
  const base = parseHexColor(hex);
  const mix = (c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }, weight: number) => ({
    r: Math.round(c1.r * (1 - weight) + c2.r * weight),
    g: Math.round(c1.g * (1 - weight) + c2.g * weight),
    b: Math.round(c1.b * (1 - weight) + c2.b * weight),
  });
  const rgbToHex = (r: number, g: number, b: number) =>
    `#${[r, g, b].map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0")).join("")}`;

  const WHITE = { r: 255, g: 255, b: 255 };
  const BLACK = { r: 0, g: 0, b: 0 };

  return {
    "50": rgbToHex(mix(base, WHITE, 0.95).r, mix(base, WHITE, 0.95).g, mix(base, WHITE, 0.95).b),
    "100": rgbToHex(mix(base, WHITE, 0.90).r, mix(base, WHITE, 0.90).g, mix(base, WHITE, 0.90).b),
    "200": rgbToHex(mix(base, WHITE, 0.75).r, mix(base, WHITE, 0.75).g, mix(base, WHITE, 0.75).b),
    "300": rgbToHex(mix(base, WHITE, 0.48).r, mix(base, WHITE, 0.48).g, mix(base, WHITE, 0.48).b),
    "400": rgbToHex(mix(base, WHITE, 0.24).r, mix(base, WHITE, 0.24).g, mix(base, WHITE, 0.24).b),
    "500": rgbToHex(base.r, base.g, base.b),
    "600": rgbToHex(mix(base, BLACK, 0.16).r, mix(base, BLACK, 0.16).g, mix(base, BLACK, 0.16).b),
    "700": rgbToHex(mix(base, BLACK, 0.34).r, mix(base, BLACK, 0.34).g, mix(base, BLACK, 0.34).b),
    "800": rgbToHex(mix(base, BLACK, 0.52).r, mix(base, BLACK, 0.52).g, mix(base, BLACK, 0.52).b),
    "900": rgbToHex(mix(base, BLACK, 0.70).r, mix(base, BLACK, 0.70).g, mix(base, BLACK, 0.70).b),
    "950": rgbToHex(mix(base, BLACK, 0.85).r, mix(base, BLACK, 0.85).g, mix(base, BLACK, 0.85).b),
  };
}

export function getTeamCssVariables(palette: TeamColorPalette): Record<string, string> {
  const pRgb = parseHexColor(palette.primary);
  const sRgb = parseHexColor(palette.secondary);
  const tRgb = parseHexColor(palette.tertiary);
  const pShades = generateColorShades(palette.primary);
  const sShades = generateColorShades(palette.secondary);

  const vars: Record<string, string> = {
    "--team-primary": palette.primary,
    "--team-secondary": palette.secondary,
    "--team-tertiary": palette.tertiary,
    "--team-primary-rgb": `${pRgb.r}, ${pRgb.g}, ${pRgb.b}`,
    "--team-secondary-rgb": `${sRgb.r}, ${sRgb.g}, ${sRgb.b}`,
    "--team-tertiary-rgb": `${tRgb.r}, ${tRgb.g}, ${tRgb.b}`,
    "--league-primary": palette.primary,
    "--league-accent": palette.secondary,
    "--league-primary-rgb": `${pRgb.r}, ${pRgb.g}, ${pRgb.b}`,
    "--league-accent-rgb": `${sRgb.r}, ${sRgb.g}, ${sRgb.b}`,
    "--team-ink-dark": readableInk(palette.primary, INK_SURFACE_DARK),
    "--team-ink-light": readableInk(palette.primary, INK_SURFACE_LIGHT),
    "--league-ink-dark": readableInk(palette.primary, INK_SURFACE_DARK),
    "--league-ink-light": readableInk(palette.primary, INK_SURFACE_LIGHT),
  };

  Object.entries(pShades).forEach(([shade, hex]) => {
    vars[`--league-primary-${shade}`] = hex;
    vars[`--team-primary-${shade}`] = hex;
  });

  Object.entries(sShades).forEach(([shade, hex]) => {
    vars[`--league-accent-${shade}`] = hex;
    vars[`--team-secondary-${shade}`] = hex;
  });

  return vars;
}


