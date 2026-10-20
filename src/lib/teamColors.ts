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

