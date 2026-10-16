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
 * Builds the complete public directory catalog merging live user leagues with curated public circuits.
 * STRICT SECURITY: Private leagues (visibility === 'private' or league_private_live) are strictly omitted.
 */
export function buildDirectoryCatalog(
  userLeagues: any[] = [],
  activeLeagueSettings?: any
): DirectoryLeague[] {
  const mergedMap = new Map<string, DirectoryLeague>();

  // 1. Add all curated public circuits
  CURATED_DIRECTORY_LEAGUES.forEach((l) => {
    mergedMap.set(l.id, l);
  });

  // 2. Add active league if public
  if (activeLeagueSettings && activeLeagueSettings.visibility !== "private") {
    const activeId = activeLeagueSettings.id || "default";
    const existing = mergedMap.get(activeId);
    mergedMap.set(activeId, {
      id: activeId,
      name: activeLeagueSettings.leagueName || existing?.name || "FlagOS League",
      shortcode: activeLeagueSettings.shortcode || existing?.shortcode || "FLAG",
      tagline: activeLeagueSettings.tagline || existing?.tagline || "Official FlagOS Circuit",
      seasonTitle: activeLeagueSettings.seasonTitle || existing?.seasonTitle || "2026 Season",
      rulesFormat: (activeLeagueSettings.rulesFormat as RulesetFormat) || existing?.rulesFormat || "5v5 Non-Contact",
      division: (activeLeagueSettings.division as LeagueDivision) || existing?.division || "Men's Open",
      competitionTier: existing?.competitionTier || "Competitive",
      gameDay: existing?.gameDay || "Sunday Mornings",
      gameTimeWindow: existing?.gameTimeWindow || "9:00 AM – 1:00 PM",
      venue: existing?.venue || {
        name: activeLeagueSettings.defaultLocation || "Metropolitan Sports Complex",
        address: "4700 Keele St",
        city: "Toronto",
        stateOrProvince: "ON",
        postalCode: "M3J 1P3",
        surface: "Outdoor Field Turf",
        hasLights: true,
        latitude: 43.7735,
        longitude: -79.5019,
      },
      teamCount: existing?.teamCount || 8,
      maxTeams: existing?.maxTeams || 12,
      registrationFeePerTeam: existing?.registrationFeePerTeam || 850,
      individualFee: existing?.individualFee || 95,
      registrationStatus: existing?.registrationStatus || "Open Registration",
      registrationDeadline: existing?.registrationDeadline || "May 1, 2026",
      seasonDates: existing?.seasonDates || "May – August 2026",
      primaryColor: activeLeagueSettings.primaryColor || existing?.primaryColor || "#3ca505",
      accentColor: activeLeagueSettings.accentColor || existing?.accentColor || "#3b82f6",
      logoUrl: activeLeagueSettings.logoUrl || existing?.logoUrl || FLAGOS_LOGO,
      visibility: "public",
      amenities: existing?.amenities || [
        "Certified Game Officials",
        "Live Scoreboard & Play-by-Play",
        "Team Standings & Stats",
      ],
      contactEmail: existing?.contactEmail,
      isFeatured: existing?.isFeatured || false,
    });
  }

  // 3. Add any additional user leagues created in Firestore that are public
  userLeagues
    .filter((l) => l.visibility !== "private" && l.id !== "league_private_live")
    .forEach((l) => {
      if (!mergedMap.has(l.id)) {
        mergedMap.set(l.id, {
          id: l.id,
          name: l.name,
          shortcode: l.shortcode || "MFL",
          tagline: l.tagline || "Official FlagOS Circuit",
          seasonTitle: l.seasonTitle || "2026 Championship",
          rulesFormat: (l.rulesFormat as RulesetFormat) || "5v5 Non-Contact",
          division: (l.division as LeagueDivision) || "Co-Ed",
          competitionTier: "Competitive",
          gameDay: "Sunday Mornings",
          gameTimeWindow: "9:00 AM – 1:00 PM",
          venue: {
            name: l.location || "Metropolitan Sports Complex",
            address: "100 Stadium Boulevard",
            city: "Toronto",
            stateOrProvince: "ON",
            postalCode: "M5V 3L9",
            surface: "Outdoor Field Turf",
            hasLights: true,
            latitude: 43.6426,
            longitude: -79.3871,
          },
          teamCount: l.teamCount || 8,
          maxTeams: 12,
          registrationFeePerTeam: 850,
          individualFee: 95,
          registrationStatus: "Open Registration",
          registrationDeadline: "May 1, 2026",
          seasonDates: "May – August 2026",
          primaryColor: l.primaryColor || "#3ca505",
          accentColor: l.accentColor || "#3b82f6",
          logoUrl: l.logoUrl || FLAGOS_LOGO,
          visibility: "public",
          amenities: [
            "Official Game Officials",
            "Live Play-by-Play & Box Scores",
            "Playoff Tournament",
          ],
        });
      }
    });

  return Array.from(mergedMap.values()).filter((l) => l.visibility !== "private");
}
