/** Player-facing details a league admin can choose to publish. All fields are optional. */
export interface LeaguePlayerInfo {
  city?: string;
  venueName?: string;
  address?: string;
  gameDay?: string;
  gameTime?: string;
  skillLevel?: string;
  division?: string;
  registrationDeadline?: string;
  seasonDates?: string;
  acceptsFreeAgents?: boolean;
}

/** A field or venue the league plays at, with optional directions. */
export interface LeagueVenueInfo {
  name: string;
  address?: string;
  notes?: string;
}

export const PLAYER_INFO_TEXT_LIMITS: Record<Exclude<keyof LeaguePlayerInfo, "acceptsFreeAgents">, number> = {
  city: 80,
  venueName: 120,
  address: 200,
  gameDay: 60,
  gameTime: 60,
  skillLevel: 60,
  division: 60,
  registrationDeadline: 32,
  seasonDates: 80,
};

export const MAX_LEAGUE_VENUES = 20;
export const VENUE_LIMITS = { name: 100, address: 200, notes: 300 } as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidPublicEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value);
}

/** Returns an error message, or null when the value is a valid player-info map. */
export function validatePlayerInfo(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) return "Player details are invalid.";
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (key === "acceptsFreeAgents") {
      if (typeof item !== "boolean") return "Free agent setting is invalid.";
      continue;
    }
    const limit = PLAYER_INFO_TEXT_LIMITS[key as keyof typeof PLAYER_INFO_TEXT_LIMITS];
    if (!limit) return `Player detail "${key}" is not supported.`;
    if (typeof item !== "string" || item.length > limit) return `Player detail "${key}" is too long.`;
  }
  return null;
}

/** Returns an error message, or null when the value is a valid venue list. */
export function validateVenues(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value) || value.length > MAX_LEAGUE_VENUES) return "Venue list is invalid.";
  for (const venue of value) {
    if (!venue || typeof venue !== "object" || Array.isArray(venue)) return "Venue is invalid.";
    for (const [key, item] of Object.entries(venue as Record<string, unknown>)) {
      const limit = VENUE_LIMITS[key as keyof typeof VENUE_LIMITS];
      if (!limit || typeof item !== "string" || item.length > limit) return "Venue details are invalid.";
    }
    if (typeof (venue as LeagueVenueInfo).name !== "string" || !(venue as LeagueVenueInfo).name.trim()) {
      return "Each venue needs a name.";
    }
  }
  return null;
}

export function mapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Finds venue details for a game location by name (case-insensitive). */
export function findVenue(venues: LeagueVenueInfo[] | undefined, location: string | undefined): LeagueVenueInfo | null {
  if (!venues || !location) return null;
  const key = location.trim().toLowerCase();
  return venues.find((v) => v.name.trim().toLowerCase() === key) || null;
}
