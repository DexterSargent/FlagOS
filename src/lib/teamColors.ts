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
