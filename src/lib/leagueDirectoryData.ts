import { FLAGOS_LOGO } from "./brandTokens";

export type RulesetFormat =
  | "4v4 Air It Out"
  | "5v5 Non-Contact"
  | "5v5 Contact"
  | "6v6 Screen"
  | "7v7 Screen"
  | "8v8 Contact"
  | string;

export interface FormatChoice {
  id: "4v4" | "5v5" | "6v6" | "7v7" | "8v8";
  label: string;
  subtitle: string;
}

export const DIRECTORY_FORMAT_OPTIONS: FormatChoice[] = [
  { id: "4v4", label: "4v4", subtitle: "Air It Out / Passing" },
  { id: "5v5", label: "5v5", subtitle: "Non-Contact & Contact" },
  { id: "6v6", label: "6v6", subtitle: "Screen Passing" },
  { id: "7v7", label: "7v7", subtitle: "Screen Passing" },
  { id: "8v8", label: "8v8", subtitle: "Contact / Full Squad" },
];

export type LeagueDivision =
  | "Men's Open"
  | "Women's Flag"
  | "Co-Ed"
  | "Youth / High School"
  | "Collegiate Varsity"
  | "Masters 35+";

export type CompetitionTier =
  | "Premier / Elite"
  | "Competitive"
  | "Recreational / Social";

export type RegistrationStatus =
  | "Open Registration"
  | "Early Bird"
  | "Waitlist Only"
  | "Season In Progress";

export interface LeagueVenue {
  name: string;
  address: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;
  surface: "Indoor Turf" | "Outdoor Field Turf" | "Natural Grass";
  hasLights: boolean;
  latitude: number;
  longitude: number;
  mapsUrl?: string;
}

export interface DirectoryLeague {
  id: string;
  name: string;
  shortcode: string;
  tagline: string;
  seasonTitle: string;
  rulesFormat: RulesetFormat;
  division: LeagueDivision;
  competitionTier: CompetitionTier;
  gameDay: string;
  gameTimeWindow: string;
  venue: LeagueVenue;
  teamCount: number;
  maxTeams: number;
  registrationFeePerTeam: number;
  individualFee: number;
  registrationStatus: RegistrationStatus;
  registrationDeadline: string;
  seasonDates: string;
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
  visibility: "public" | "private";
  amenities: string[];
  contactEmail?: string;
  isFeatured?: boolean;
  isLive?: boolean;
  isUserLeague?: boolean;
  isActive?: boolean;
  isSample?: boolean;
}

/**
 * Standard Haversine distance calculator returning distance in miles
 */
export function calculateDistanceInMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth radius in statute miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export interface RegionPreset {
  id: string;
  name: string;
  label: string;
  latitude: number;
  longitude: number;
  radiusDefault: number;
}

export const REGION_PRESETS: RegionPreset[] = [
  {
    id: "gta",
    name: "Toronto / GTA",
    label: "Greater Toronto Area",
    latitude: 43.6532,
    longitude: -79.3832,
    radiusDefault: 25,
  },
  {
    id: "york",
    name: "York Region",
    label: "Vaughan / Markham / Richmond Hill",
    latitude: 43.8202,
    longitude: -79.5074,
    radiusDefault: 15,
  },
  {
    id: "hamilton",
    name: "Hamilton / Niagara",
    label: "Hamilton & Golden Horseshoe",
    latitude: 43.2557,
    longitude: -79.8711,
    radiusDefault: 30,
  },
  {
    id: "ottawa",
    name: "Ottawa & Capital",
    label: "National Capital Region",
    latitude: 45.4215,
    longitude: -75.6972,
    radiusDefault: 25,
  },
  {
    id: "london",
    name: "London / SW Ontario",
    label: "London & Middlesex",
    latitude: 42.9849,
    longitude: -81.2453,
    radiusDefault: 30,
  },
  {
    id: "montreal",
    name: "Greater Montreal",
    label: "Montreal & Laval",
    latitude: 45.5017,
    longitude: -73.5673,
    radiusDefault: 30,
  },
];

export const CURATED_DIRECTORY_LEAGUES: DirectoryLeague[] = [];

/**
 * Normalizes any league record (Firestore document, user league summary, or settings)
 * into a typed DirectoryLeague record with complete presentation metadata.
 */
export function normalizeToDirectoryLeague(
  raw: any,
  meta?: { isLive?: boolean; isUserLeague?: boolean; isActive?: boolean }
): DirectoryLeague {
  const id = raw.id || "default";
  const name = raw.leagueName || raw.name || "FlagOS League";
  const shortcode =
    raw.shortcode || (name.length <= 4 ? name.toUpperCase() : name.slice(0, 4).toUpperCase());
  const tagline =
    raw.tagline || (meta?.isLive ? "Active Live FlagOS Circuit" : "Official FlagOS Circuit");
  const seasonTitle = raw.seasonTitle || `${new Date().getFullYear()} Championship`;

  // Rules Format resolution
  let rulesFormat: RulesetFormat = "5v5 Non-Contact";
  if (raw.rulesFormat && typeof raw.rulesFormat === "string") {
    rulesFormat = raw.rulesFormat as RulesetFormat;
  } else if (raw.rules?.playersOnField) {
    const count = Number(raw.rules.playersOnField);
    const isContact = raw.rules.contactLevel === "contact";
    if (count === 4) rulesFormat = "4v4 Air It Out";
    else if (count === 6) rulesFormat = "6v6 Screen";
    else if (count === 7) rulesFormat = "7v7 Screen";
    else if (count === 8) rulesFormat = "8v8 Contact";
    else if (count === 5 && isContact) rulesFormat = "5v5 Contact";
    else rulesFormat = "5v5 Non-Contact";
  }

  // Division resolution
  let division: LeagueDivision = "Co-Ed";
  if (raw.division && typeof raw.division === "string") {
    division = raw.division as LeagueDivision;
  } else {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("women")) {
      division = "Women's Flag";
    } else if (lowerName.includes("men")) {
      division = "Men's Open";
    } else if (lowerName.includes("youth") || lowerName.includes("high school")) {
      division = "Youth / High School";
    } else if (lowerName.includes("varsity") || lowerName.includes("college")) {
      division = "Collegiate Varsity";
    }
  }

  // Venue resolution
  let venue: LeagueVenue;
  if (raw.venue && typeof raw.venue === "object" && raw.venue.name) {
    venue = {
      name: raw.venue.name,
      address: raw.venue.address || "Metropolitan Sports Complex",
      city: raw.venue.city || "Toronto",
      stateOrProvince: raw.venue.stateOrProvince || "ON",
      postalCode: raw.venue.postalCode || "M3J 1P3",
      surface: raw.venue.surface || "Outdoor Field Turf",
      hasLights: raw.venue.hasLights ?? true,
      latitude: Number(raw.venue.latitude ?? 43.7735),
      longitude: Number(raw.venue.longitude ?? -79.5019),
      mapsUrl: raw.venue.mapsUrl,
    };
  } else {
    const locName = raw.defaultLocation || raw.location || "Metropolitan Sports Complex";
    venue = {
      name: locName,
      address: raw.address || "4700 Keele St",
      city: raw.city || "Toronto",
      stateOrProvince: raw.stateOrProvince || "ON",
      postalCode: raw.postalCode || "M3J 1P3",
      surface: "Outdoor Field Turf",
      hasLights: true,
      latitude: Number(raw.latitude ?? 43.7735),
      longitude: Number(raw.longitude ?? -79.5019),
    };
  }

  // Team counts
  const teamCount = Number(
    raw.teamCount ?? raw.teamsCount ?? (Array.isArray(raw.teams) ? raw.teams.length : undefined) ?? raw.subscription?.teamCount ?? 8
  );
  const maxTeams = Number(raw.maxTeams ?? Math.max(teamCount + 4, 12));

  // Pricing
  const registrationFeePerTeam = Number(raw.registrationFeePerTeam ?? 850);
  const individualFee = Number(raw.individualFee ?? 95);

  // Status
  let registrationStatus: RegistrationStatus = "Open Registration";
  if (raw.registrationStatus) {
    registrationStatus = raw.registrationStatus as RegistrationStatus;
  } else if (raw.isArchived || raw.seasonStatus === "completed") {
    registrationStatus = "Season In Progress";
  }

  return {
    id,
    name,
    shortcode,
    tagline,
    seasonTitle,
    rulesFormat,
    division,
    competitionTier: raw.competitionTier || "Competitive",
    gameDay: raw.gameDay || "Sunday Mornings",
    gameTimeWindow: raw.gameTimeWindow || "9:00 AM – 1:30 PM",
    venue,
    teamCount,
    maxTeams,
    registrationFeePerTeam,
    individualFee,
    registrationStatus,
    registrationDeadline: raw.registrationDeadline || "May 1, 2026",
    seasonDates: raw.seasonDates || "May – August 2026",
    primaryColor: raw.primaryColor || "#3ca505",
    accentColor: raw.accentColor || "#3b82f6",
    logoUrl: raw.logoUrl || FLAGOS_LOGO,
    visibility: raw.visibility === "private" ? "private" : "public",
    amenities:
      Array.isArray(raw.amenities) && raw.amenities.length > 0
        ? raw.amenities
        : [
            "Certified Game Officials",
            "Live Play-by-Play & Box Scores",
            "Official Team Standings & Stat Tracking",
          ],
    contactEmail: raw.contactEmail,
    isFeatured: Boolean(raw.isFeatured),
    isLive: meta?.isLive ?? Boolean(raw.isLive),
    isUserLeague: meta?.isUserLeague ?? Boolean(raw.isUserLeague),
    isActive: meta?.isActive ?? Boolean(raw.isActive),
    isSample: Boolean(raw.isSample),
  };
}

/**
 * Builds the complete public directory catalog merging live user leagues, remote Firestore leagues,
 * and curated public circuits.
 * STRICT SECURITY: Private leagues (visibility === 'private' or league_private_live) are strictly omitted.
 * PRIORITY ORDERING: Active League -> User Created Leagues -> Live Firestore Circuits -> Sample Circuits.
 */
export function buildDirectoryCatalog(
  userLeagues: any[] = [],
  activeLeagueSettings?: any,
  remoteLeagues: any[] = [],
  activeLeagueId?: string
): DirectoryLeague[] {
  const mergedMap = new Map<string, DirectoryLeague>();

  // Curated mock circuits omitted - all catalog entries are live public circuits

  // 2. Add or override with live public leagues from Firestore
  remoteLeagues
    .filter((l) => l && l.visibility !== "private" && l.id !== "league_private_live")
    .forEach((l) => {
      const isUser = userLeagues.some((ul) => ul.id === l.id);
      const isAct =
        activeLeagueId === l.id || (activeLeagueSettings && activeLeagueSettings.id === l.id);
      const normalized = normalizeToDirectoryLeague(l, {
        isLive: true,
        isUserLeague: isUser,
        isActive: isAct,
      });
      // Live remote leagues override sample duplicates
      mergedMap.set(l.id, normalized);
    });

  // 3. Add or enhance user-created leagues from context/localStorage
  userLeagues
    .filter((l) => l && l.visibility !== "private" && l.id !== "league_private_live")
    .forEach((l) => {
      const isAct =
        activeLeagueId === l.id || (activeLeagueSettings && activeLeagueSettings.id === l.id);
      const existing = mergedMap.get(l.id);
      if (existing) {
        existing.isUserLeague = true;
        existing.isLive = true;
        if (isAct) existing.isActive = true;
        if (l.name) existing.name = l.name;
        if (l.shortcode) existing.shortcode = l.shortcode;
        if (l.primaryColor) existing.primaryColor = l.primaryColor;
        if (l.accentColor) existing.accentColor = l.accentColor;
        if (l.teamCount) existing.teamCount = l.teamCount;
        if (l.location || l.defaultLocation) {
          existing.venue.name = l.location || l.defaultLocation;
        }
      } else {
        mergedMap.set(
          l.id,
          normalizeToDirectoryLeague(l, {
            isLive: true,
            isUserLeague: true,
            isActive: isAct,
          })
        );
      }
    });

  // 4. Add or enhance active league if public
  if (
    activeLeagueSettings &&
    activeLeagueSettings.visibility !== "private" &&
    activeLeagueSettings.id !== "league_private_live"
  ) {
    const activeId = activeLeagueSettings.id || activeLeagueId || "default";
    const existing = mergedMap.get(activeId);
    if (existing) {
      existing.isActive = true;
      existing.isLive = true;
      if (activeLeagueSettings.leagueName) existing.name = activeLeagueSettings.leagueName;
      if (activeLeagueSettings.shortcode) existing.shortcode = activeLeagueSettings.shortcode;
      if (activeLeagueSettings.primaryColor) existing.primaryColor = activeLeagueSettings.primaryColor;
      if (activeLeagueSettings.accentColor) existing.accentColor = activeLeagueSettings.accentColor;
      if (activeLeagueSettings.tagline) existing.tagline = activeLeagueSettings.tagline;
      if (activeLeagueSettings.defaultLocation) {
        existing.venue.name = activeLeagueSettings.defaultLocation;
      }
    } else {
      mergedMap.set(
        activeId,
        normalizeToDirectoryLeague(
          { id: activeId, ...activeLeagueSettings },
          {
            isLive: true,
            isActive: true,
            isUserLeague: userLeagues.some((ul) => ul.id === activeId),
          }
        )
      );
    }
  }

  // 5. Strictly filter out any private leagues
  const allLeagues = Array.from(mergedMap.values()).filter(
    (l) => l.visibility !== "private" && l.id !== "league_private_live"
  );

  // 6. Sort existing leagues to the top: Active -> User's own -> Live remote -> Sample
  return allLeagues.sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;

    if (a.isUserLeague && !b.isUserLeague) return -1;
    if (!a.isUserLeague && b.isUserLeague) return 1;

    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;

    return 0;
  });
}
