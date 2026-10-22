import { FLAGOS_LOGO } from "./brandTokens";

export type RulesetFormat =
  | "5v5 Non-Contact"
  | "7v7 Screen"
  | "5v5 Contact"
  | "4v4 Air It Out"
  | "8v8 Contact";

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

export const CURATED_DIRECTORY_LEAGUES: DirectoryLeague[] = [
  {
    id: "yuwffl",
    name: "York University Women's Flag League",
    shortcode: "YORK",
    tagline: "Official Varsity & Collegiate Flag Football Circuit",
    seasonTitle: "2026 Varsity Spring Championship",
    rulesFormat: "5v5 Non-Contact",
    division: "Women's Flag",
    competitionTier: "Premier / Elite",
    gameDay: "Sunday Afternoons",
    gameTimeWindow: "1:00 PM – 5:30 PM",
    venue: {
      name: "Alumni Field & York Lions Stadium",
      address: "4700 Keele Street",
      city: "Toronto",
      stateOrProvince: "ON",
      postalCode: "M3J 1P3",
      surface: "Outdoor Field Turf",
      hasLights: true,
      latitude: 43.7735,
      longitude: -79.5019,
      mapsUrl: "https://maps.google.com/?q=York+University+Alumni+Field",
    },
    teamCount: 6,
    maxTeams: 8,
    registrationFeePerTeam: 850,
    individualFee: 95,
    registrationStatus: "Open Registration",
    registrationDeadline: "May 1, 2026",
    seasonDates: "May 10 – July 26, 2026",
    primaryColor: "#e31837",
    accentColor: "#ffffff",
    logoUrl: "/york_lions_icon.png",
    visibility: "public",
    amenities: [
      "Official IFAF Certified Referees",
      "Full Live Stats & Play-by-Play",
      "Tactical Film Breakdown",
      "Varsity Stadium Surface",
      "All-Star Game & Medals",
    ],
    contactEmail: "athletics@yorku.ca",
    isFeatured: true,
  },
  {
    id: "toronto_flag_league",
    name: "Toronto Flag League",
    shortcode: "TFFL",
    tagline: "Toronto's Premier Co-Ed & Open 5v5 Circuit",
    seasonTitle: "2026 Summer Metro Series",
    rulesFormat: "5v5 Non-Contact",
    division: "Co-Ed",
    competitionTier: "Competitive",
    gameDay: "Sunday Mornings",
    gameTimeWindow: "8:30 AM – 1:30 PM",
    venue: {
      name: "The Hangar Sports Complex",
      address: "75 Carl Hall Road",
      city: "North York",
      stateOrProvince: "ON",
      postalCode: "M3K 2B9",
      surface: "Indoor Turf",
      hasLights: true,
      latitude: 43.738,
      longitude: -79.4795,
      mapsUrl: "https://maps.google.com/?q=Downsview+Park+The+Hangar",
    },
    teamCount: 12,
    maxTeams: 16,
    registrationFeePerTeam: 920,
    individualFee: 110,
    registrationStatus: "Open Registration",
    registrationDeadline: "April 28, 2026",
    seasonDates: "May 17 – August 9, 2026",
    primaryColor: "#0284c7",
    accentColor: "#38bdf8",
    logoUrl: FLAGOS_LOGO,
    visibility: "public",
    amenities: [
      "Climate Controlled Dome",
      "Two Certified Officials Per Game",
      "Team Reversible Jerseys Included",
      "Real-Time Box Scores & Leaderboards",
      "End of Season Banquet",
    ],
    contactEmail: "info@torontoflag.ca",
    isFeatured: true,
  },
  {
    id: "gta_premier_5v5",
    name: "GTA Premier 5v5 Flag Championship",
    shortcode: "GP5",
    tagline: "High-Octane Contact Flag Football with Cash Purse",
    seasonTitle: "2026 Elite Summer Tour",
    rulesFormat: "5v5 Contact",
    division: "Men's Open",
    competitionTier: "Premier / Elite",
    gameDay: "Friday Night Lights",
    gameTimeWindow: "7:00 PM – 11:00 PM",
    venue: {
      name: "Vaughan Sportsplex II",
      address: "8301 Keele Street",
      city: "Vaughan",
      stateOrProvince: "ON",
      postalCode: "L4K 1Z6",
      surface: "Indoor Turf",
      hasLights: true,
      latitude: 43.8202,
      longitude: -79.5074,
      mapsUrl: "https://maps.google.com/?q=Vaughan+Sportsplex+II",
    },
    teamCount: 10,
    maxTeams: 12,
    registrationFeePerTeam: 1100,
    individualFee: 125,
    registrationStatus: "Early Bird",
    registrationDeadline: "May 5, 2026",
    seasonDates: "May 22 – August 14, 2026",
    primaryColor: "#f59e0b",
    accentColor: "#10b981",
    logoUrl: FLAGOS_LOGO,
    visibility: "public",
    amenities: [
      "$5,000 Championship Purse",
      "HD Film Broadcast Cameras",
      "Bump-and-Run Press Coverage Allowed",
      "Play-Clock Operators",
      "Championship Rings",
    ],
    contactEmail: "commissioner@gtapremier.com",
    isFeatured: true,
  },
  {
    id: "capital_flag_ottawa",
    name: "National Capital Flag League",
    shortcode: "NCFL",
    tagline: "Eastern Ontario's Flag Football Headquarters",
    seasonTitle: "2026 Capital Cup",
    rulesFormat: "7v7 Screen",
    division: "Co-Ed",
    competitionTier: "Competitive",
    gameDay: "Saturday Afternoons",
    gameTimeWindow: "11:00 AM – 4:00 PM",
    venue: {
      name: "Carleton University MNP Park",
      address: "1125 Colonel By Drive",
      city: "Ottawa",
      stateOrProvince: "ON",
      postalCode: "K1S 5B6",
      surface: "Outdoor Field Turf",
      hasLights: true,
      latitude: 45.3831,
      longitude: -75.696,
      mapsUrl: "https://maps.google.com/?q=Carleton+University+MNP+Park",
    },
    teamCount: 8,
    maxTeams: 12,
    registrationFeePerTeam: 890,
    individualFee: 100,
    registrationStatus: "Open Registration",
    registrationDeadline: "May 8, 2026",
    seasonDates: "May 23 – August 1, 2026",
    primaryColor: "#dc2626",
    accentColor: "#1e293b",
    logoUrl: FLAGOS_LOGO,
    visibility: "public",
    amenities: [
      "Full 7v7 Passing Grid",
      "Electronic Whistle Referees",
      "Dedicated Scorekeeper on Site",
      "Live Standings & Stats",
      "National Qualifier Pathway",
    ],
    contactEmail: "ottawa@capitalflag.ca",
    isFeatured: false,
  },
  {
    id: "hamilton_steel_city",
    name: "Hamilton Steel City Flag Circuit",
    shortcode: "SCFL",
    tagline: "Golden Horseshoe Flag Football on University Turf",
    seasonTitle: "2026 Steel City Cup",
    rulesFormat: "5v5 Non-Contact",
    division: "Men's Open",
    competitionTier: "Competitive",
    gameDay: "Tuesday & Thursday Evenings",
    gameTimeWindow: "6:30 PM – 9:30 PM",
    venue: {
      name: "Ron Joyce Stadium at McMaster",
      address: "1280 Main Street West",
      city: "Hamilton",
      stateOrProvince: "ON",
      postalCode: "L8S 4L8",
      surface: "Outdoor Field Turf",
      hasLights: true,
      latitude: 43.2609,
      longitude: -79.9192,
      mapsUrl: "https://maps.google.com/?q=Ron+Joyce+Stadium+Hamilton",
    },
    teamCount: 8,
    maxTeams: 10,
    registrationFeePerTeam: 780,
    individualFee: 90,
    registrationStatus: "Open Registration",
    registrationDeadline: "May 12, 2026",
    seasonDates: "May 26 – August 11, 2026",
    primaryColor: "#eab308",
    accentColor: "#0f172a",
    logoUrl: FLAGOS_LOGO,
    visibility: "public",
    amenities: [
      "Stadium Lights & Sound System",
      "Game Video Highlights",
      "Certified Referees",
      "Team Photo Package Included",
    ],
    contactEmail: "hamilton@steelcityflag.ca",
    isFeatured: false,
  },
  {
    id: "markham_sports_dome",
    name: "Markham Community Flag League",
    shortcode: "MCFL",
    tagline: "Friendly, Community-Focused Flag Football for All Skill Levels",
    seasonTitle: "2026 Recreational Spring Season",
    rulesFormat: "5v5 Non-Contact",
    division: "Recreational / Social" as any,
    competitionTier: "Recreational / Social",
    gameDay: "Saturday Mornings",
    gameTimeWindow: "9:00 AM – 1:00 PM",
    venue: {
      name: "Markham Sports Dome",
      address: "5600 14th Avenue",
      city: "Markham",
      stateOrProvince: "ON",
      postalCode: "L3S 3K8",
      surface: "Indoor Turf",
      hasLights: true,
      latitude: 43.856,
      longitude: -79.268,
      mapsUrl: "https://maps.google.com/?q=Markham+Sports+Dome",
    },
    teamCount: 6,
    maxTeams: 8,
    registrationFeePerTeam: 750,
    individualFee: 85,
    registrationStatus: "Open Registration",
    registrationDeadline: "May 2, 2026",
    seasonDates: "May 9 – July 18, 2026",
    primaryColor: "#10b981",
    accentColor: "#06b6d4",
    logoUrl: FLAGOS_LOGO,
    visibility: "public",
    amenities: [
      "Rookie-Friendly Rules & Coaching Pointers",
      "Uniform T-Shirts for All Players",
      "Weekly MVP Ribbons",
      "Free Agent Team Placement Guaranteed",
    ],
    contactEmail: "play@markhamflag.ca",
    isFeatured: false,
  },
  {
    id: "nfl_flag_national_demo",
    name: "NFL Flag National Showcase Circuit",
    shortcode: "NFLF",
    tagline: "Official NFL FLAG Ruleset & National Tournament Pathway",
    seasonTitle: "2026 National Championship Circuit",
    rulesFormat: "5v5 Non-Contact",
    division: "Youth / High School",
    competitionTier: "Premier / Elite",
    gameDay: "Sunday Mornings",
    gameTimeWindow: "9:00 AM – 2:00 PM",
    venue: {
      name: "Metropolitan Sports Complex",
      address: "100 Stadium Boulevard",
      city: "Toronto",
      stateOrProvince: "ON",
      postalCode: "M5V 3L9",
      surface: "Outdoor Field Turf",
      hasLights: true,
      latitude: 43.6426,
      longitude: -79.3871,
      mapsUrl: "https://maps.google.com/?q=Toronto+Sports+Complex",
    },
    teamCount: 16,
    maxTeams: 16,
    registrationFeePerTeam: 890,
    individualFee: 105,
    registrationStatus: "Waitlist Only",
    registrationDeadline: "April 15, 2026",
    seasonDates: "May 3 – July 19, 2026",
    primaryColor: "#013369",
    accentColor: "#d50a0a",
    logoUrl: FLAGOS_LOGO,
    visibility: "public",
    amenities: [
      "NFL Team Reversible Jerseys Included",
      "NFL Flag Regional Qualifier Bid",
      "Player Stats & Highlight Reels",
      "Certified High School & College Refs",
    ],
    contactEmail: "nflflag@showcase.com",
    isFeatured: true,
  },
];

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
    if (count === 7) rulesFormat = "7v7 Screen";
    else if (count === 4) rulesFormat = "4v4 Air It Out";
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

  // 1. Add curated circuits as baseline sample reference circuits
  CURATED_DIRECTORY_LEAGUES.forEach((l) => {
    mergedMap.set(l.id, { ...l, isSample: true });
  });

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
