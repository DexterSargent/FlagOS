"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  subscribeDemoSandbox,
  isDemoLeague as checkIsDemoLeague,
} from "./demoSandboxRuntime";
import { FLAGOS_LOGO } from "./brandTokens";
import { auth } from "./firebase";
import { createSecureRecord } from "./secureWrites";
import {
  getCachedMatchTeamId,
  isDemoMatchId,
  isDemoTeamId,
  isStandaloneTeam,
  loadMatchTeamId,
  useCanReadBrowserCache,
  useTeamRecord,
  type TeamRecord,
} from "./teamRecord";

export interface LeagueRules {
  playersOnField: number;          // e.g. 4, 5, 6, 7, 8 (default: 5)
  periodType: "halves" | "quarters"; // default: "halves"
  periodsCount: number;            // 2 or 4 (default: 2)
  periodDurationMinutes: number;   // default: 20
  timeoutsPerTeam: number;         // default: 2
  timeoutDurationSeconds: number;  // default: 60
  timeoutsResetPerPeriod: boolean; // default: true
  minRosterSize: number;           // default: 5
  maxRosterSize: number;           // hard cap: 30
  downsPerSeries: number;          // default: 4
  rushLineDistance: number;        // default: 7 (yards)
  playClockSeconds: number;        // default: 30 (seconds)
  halftimeDurationSeconds: number; // default: 300 (seconds)
  enableFreeAgents: boolean;       // default: true (Controls public join form and free agent pool)
}

export const DEFAULT_LEAGUE_RULES: LeagueRules = {
  playersOnField: 5,
  periodType: "quarters",
  periodsCount: 4,
  periodDurationMinutes: 15,
  timeoutsPerTeam: 2,
  timeoutDurationSeconds: 60,
  timeoutsResetPerPeriod: true,
  minRosterSize: 5,
  maxRosterSize: 30,
  downsPerSeries: 4,
  rushLineDistance: 7,
  playClockSeconds: 30,
  halftimeDurationSeconds: 300,
  enableFreeAgents: true,
};

// Official International Federation of American Football (IFAF) 5v5 Flag Regulations
export const IFAF_5V5_RULES: LeagueRules = {
  playersOnField: 5,
  periodType: "halves",
  periodsCount: 2,
  periodDurationMinutes: 20,
  timeoutsPerTeam: 2,
  timeoutDurationSeconds: 60,
  timeoutsResetPerPeriod: true,
  minRosterSize: 5,
  maxRosterSize: 30,
  downsPerSeries: 4,
  rushLineDistance: 7,
  playClockSeconds: 25,
  halftimeDurationSeconds: 120, // 2-minute halftime
  enableFreeAgents: true,
};

export interface LeagueSettings {
  leagueName: string;
  shortcode: string;
  tagline: string;
  seasonTitle: string;
  logoUrl: string;
  icon: string;
  primaryColor: string;
  accentColor: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  themePreset: string;
  defaultLocation: string;
  contactEmail: string;
  rulebookTitle: string;
  rulebookUrl?: string;
  announcement?: string;
  seasonStatus?: "active" | "completed" | "archived";
  isArchived?: boolean;
  archivedAt?: string;
  visibility?: "public" | "private"; // public = indexed in public directory, private = direct URL access only
  ownerUid?: string;
  createdAt?: string;
  adminEmails?: string[];
  rules: LeagueRules;
  playoffFormat?: PlayoffFormat;
  subscription?: LeagueSubscriptionInfo;
  registrationFeePerTeam?: number;
  individualFee?: number;
  amenities?: string[];
}

export interface PlayoffFormat {
  teamsCount: number; // 2, 4, 8, 16, 32, etc.
  structure: "single_elimination" | "double_elimination";
  hasByes?: boolean;
  byesCount?: number;
  playoffWeeks?: number;
  championshipName?: string;
}

/**
 * Calculates the nearest simple playoff bracket size based on the total teams in the league.
 * Simple brackets are standard power-of-2 tournament sizes (2, 4, 8, 16, 32...) with no byes.
 * e.g.
 *   5 teams -> 4 team playoff
 *   22 teams -> 16 team playoff
 *   4 teams -> 4 team playoff
 *   8 teams -> 8 team playoff
 *   12 teams -> 8 team playoff
 *   16 teams -> 16 team playoff
 */
export function getNearestSimplePlayoffBracket(totalTeams: number): number {
  const count = Math.floor(Number(totalTeams) || 0);
  if (count <= 0) return 4;
  if (count < 4) return 2;

  let p = 2;
  while (p * 2 <= count && p * 2 <= 64) {
    p *= 2;
  }
  return p;
}

export function getDefaultPlayoffFormat(
  totalTeams: number,
  isDemoLeague: boolean = false
): PlayoffFormat {
  if (isDemoLeague && totalTeams === 32) {
    return {
      teamsCount: 14,
      structure: "single_elimination",
      hasByes: true,
      byesCount: 2,
      playoffWeeks: 4,
      championshipName: "FlagOS Demo League Championship",
    };
  }

  const teamsCount = getNearestSimplePlayoffBracket(totalTeams);
  const playoffWeeks = Math.max(1, Math.round(Math.log2(teamsCount)));

  return {
    teamsCount,
    structure: "single_elimination",
    hasByes: false,
    byesCount: 0,
    playoffWeeks,
    championshipName: "FlagOS Demo League Championship",
  };
}

export function resolveLeaguePlayoffFormat(
  playoffFormat?: PlayoffFormat | null,
  totalTeams?: number,
  isDemoLeague: boolean = false
): PlayoffFormat {
  const count = Number(totalTeams) || 0;
  const fallback = getDefaultPlayoffFormat(count, isDemoLeague);

  if (!playoffFormat) {
    return fallback;
  }

  // Legacy NFL default was 14 teams with 2 byes; on non-NFL leagues, or if teamsCount exceeds total teams,
  // revert to the dynamic simple bracket.
  const isLegacyNflDefault = playoffFormat.teamsCount === 14 && !(isDemoLeague && count === 32);
  const exceedsTeams = count > 0 && playoffFormat.teamsCount > count;

  if (isLegacyNflDefault || exceedsTeams) {
    return fallback;
  }

  return playoffFormat;
}

const LEAGUE_UPDATE_KEYS: (keyof LeagueSettings)[] = [
  "leagueName", "shortcode", "tagline", "seasonTitle", "logoUrl", "icon", "primaryColor", "accentColor",
  "secondaryColor", "tertiaryColor", "themePreset", "defaultLocation", "rulebookTitle", "rulebookUrl",
  "announcement", "seasonStatus", "isArchived", "archivedAt", "visibility", "playoffFormat",
  "subscription", "contactEmail", "adminEmails",
];

export const DEFAULT_LEAGUE_SETTINGS: LeagueSettings = {
  leagueName: "FlagOS Demo League",
  shortcode: "FLAG",
  tagline: "The Flag Football Operating System",
  seasonTitle: "2026 Season",
  logoUrl: FLAGOS_LOGO,
  icon: "shield",
  primaryColor: "#3ca505", // Field Green (#3ca505)
  accentColor: "#3b82f6",  // FlagOS blue accent
  secondaryColor: "#3b82f6",
  tertiaryColor: "#ffffff",
  themePreset: "gridiron-green",
  defaultLocation: "Turf Field 1",
  contactEmail: "",
  rulebookTitle: "IFAF 5v5 Flag Football Rules",
  rulebookUrl: "",
  announcement: "",
  visibility: "public",
  rules: DEFAULT_LEAGUE_RULES,
  playoffFormat: {
    teamsCount: 4,
    structure: "single_elimination",
    hasByes: false,
    byesCount: 0,
    playoffWeeks: 2,
    championshipName: "FlagOS Demo League Championship",
  },
};

export interface LeagueSubscriptionInfo {
  plan: "league" | "team";
  status: "active" | "trial" | "past_due" | "archived" | "canceled";
  baseMonthlyFee: number;
  perTeamMonthlyFee: number;
  teamCount: number;
  totalMonthlyFee: number;
  billingCycle: "monthly";
  renewsAt?: string;
  adminEmails?: string[];
}

export interface UserLeagueSummary {
  id: string;
  name: string;
  shortcode: string;
  seasonTitle?: string;
  seasonStatus?: "active" | "completed" | "archived";
  isArchived?: boolean;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  role: "owner" | "admin" | "member";
  visibility?: "public" | "private";
  subscription?: LeagueSubscriptionInfo;
  adminEmails?: string[];
}

export const DEFAULT_LEAGUE_SUBSCRIPTION: LeagueSubscriptionInfo = {
  plan: "league",
  status: "active",
  baseMonthlyFee: 49,
  perTeamMonthlyFee: 5,
  teamCount: 8,
  totalMonthlyFee: 89,
  billingCycle: "monthly",
};

export const PRIVATE_LIVE_LEAGUE_SETTINGS: LeagueSettings = {
  leagueName: "Apex Private League",
  shortcode: "APEX",
  tagline: "Private Live Testing Environment with Active Database Writes",
  seasonTitle: "2026 Live Season",
  logoUrl: FLAGOS_LOGO,
  icon: "shield",
  primaryColor: "#10b981",
  accentColor: "#06b6d4",
  themePreset: "emerald",
  defaultLocation: "Gridiron Live Field 1",
  contactEmail: "dextersargent@gmail.com",
  rulebookTitle: "Official 5v5 Live Testing Rules",
  rulebookUrl: "",
  announcement: "Private Live League • Real DB Writes Active",
  visibility: "private",
  adminEmails: ["dextersargent@gmail.com"],
  rules: DEFAULT_LEAGUE_RULES,
};

export const PRIVATE_LIVE_LEAGUE_SUBSCRIPTION: LeagueSubscriptionInfo = {
  plan: "league",
  status: "active",
  baseMonthlyFee: 49,
  perTeamMonthlyFee: 5,
  teamCount: 4,
  totalMonthlyFee: 69,
  billingCycle: "monthly",
  adminEmails: ["dextersargent@gmail.com"],
};

export const DEFAULT_USER_LEAGUES: UserLeagueSummary[] = [
  {
    id: "default",
    name: DEFAULT_LEAGUE_SETTINGS.leagueName,
    shortcode: DEFAULT_LEAGUE_SETTINGS.shortcode,
    role: "owner",
    primaryColor: DEFAULT_LEAGUE_SETTINGS.primaryColor,
    accentColor: DEFAULT_LEAGUE_SETTINGS.accentColor,
    visibility: "public",
    subscription: DEFAULT_LEAGUE_SUBSCRIPTION,
  },
];

export const isAuthorizedForLeague = (
  leagueId: string,
  userEmail?: string | null,
  leagueData?: { visibility?: string; adminEmails?: string[]; subscription?: { adminEmails?: string[] } } | null
): boolean => {
  if (checkIsDemoLeague(leagueId) || leagueId === "default") return true;
  const isPrivate = leagueData?.visibility === "private" || leagueId === "league_private_live";
  if (!isPrivate) return true;
  if (!userEmail) return false;
  const cleanEmail = userEmail.trim().toLowerCase();
  if (cleanEmail === "dextersargent@gmail.com") return true;
  const directAdmins = leagueData?.adminEmails?.map((e) => e.trim().toLowerCase()) || [];
  const subAdmins = leagueData?.subscription?.adminEmails?.map((e) => e.trim().toLowerCase()) || [];
  return directAdmins.includes(cleanEmail) || subAdmins.includes(cleanEmail);
};

interface LeagueContextType {
  settings: LeagueSettings;
  updateSettings: (newSettings: Partial<LeagueSettings>) => Promise<void>;
  updateRules: (newRules: Partial<LeagueRules>) => Promise<void>;
  previewThemeColors: (primary: string, accent: string) => void;
  revertThemeColors: () => void;
  isCustomizerOpen: boolean;
  openCustomizer: () => void;
  closeCustomizer: () => void;
  loading: boolean;
  activeLeagueId: string;
  userLeagues: UserLeagueSummary[];
  publicLeagues: UserLeagueSummary[];
  switchLeague: (leagueId: string) => Promise<void>;
  createLeague: (data: {
    name: string;
    shortcode: string;
    seasonTitle?: string;
    teamCount?: number;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    tertiaryColor?: string;
    logoUrl?: string;
    rulePreset?: string;
    visibility?: "public" | "private";
  }) => Promise<string>;
  subscription: LeagueSubscriptionInfo | null;
  updateSubscriptionTeamCount: (newTeamCount: number) => Promise<LeagueSubscriptionInfo>;
  addTeamToSubscription: (customName?: string) => Promise<{ teamId: string; newSubscription: LeagueSubscriptionInfo }>;
  removeTeamFromSubscription: (teamId: string) => Promise<{ newSubscription: LeagueSubscriptionInfo }>;
  isDemoLeague: boolean;
  resetDemoSession: () => void | Promise<void>;
  archiveLeague: (action: "pause_subscription" | "new_season") => Promise<void>;
  resumeSubscription: () => Promise<void>;
  isLeagueArchived: boolean;
  isSubscriptionPastDue: boolean;
  isLeagueReadOnly: boolean;
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export const parseHex = (hex: string): RgbColor => {
  let c = (hex || "#3ca505").replace("#", "").trim();
  if (c.length === 3) {
    c = c.split("").map((x) => x + x).join("");
  }
  const num = parseInt(c, 16);
  if (isNaN(num) || c.length !== 6) return { r: 60, g: 165, b: 5 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const mix = (c1: RgbColor, c2: RgbColor, weight: number): RgbColor => {
  const w = Math.max(0, Math.min(1, weight));
  return {
    r: c1.r * (1 - w) + c2.r * w,
    g: c1.g * (1 - w) + c2.g * w,
    b: c1.b * (1 - w) + c2.b * w,
  };
};

const WHITE: RgbColor = { r: 255, g: 255, b: 255 };
const BLACK: RgbColor = { r: 0, g: 0, b: 0 };

export const generateShades = (baseHex: string): Record<string, string> => {
  const base = parseHex(baseHex);
  return {
    "50": rgbToHex(mix(base, WHITE, 0.94).r, mix(base, WHITE, 0.94).g, mix(base, WHITE, 0.94).b),
    "100": rgbToHex(mix(base, WHITE, 0.84).r, mix(base, WHITE, 0.84).g, mix(base, WHITE, 0.84).b),
    "200": rgbToHex(mix(base, WHITE, 0.68).r, mix(base, WHITE, 0.68).g, mix(base, WHITE, 0.68).b),
    "300": rgbToHex(mix(base, WHITE, 0.48).r, mix(base, WHITE, 0.48).g, mix(base, WHITE, 0.48).b),
    "400": rgbToHex(mix(base, WHITE, 0.24).r, mix(base, WHITE, 0.24).g, mix(base, WHITE, 0.24).b),
    "500": rgbToHex(base.r, base.g, base.b),
    "600": rgbToHex(mix(base, BLACK, 0.16).r, mix(base, BLACK, 0.16).g, mix(base, BLACK, 0.16).b),
    "700": rgbToHex(mix(base, BLACK, 0.34).r, mix(base, BLACK, 0.34).g, mix(base, BLACK, 0.34).b),
    "800": rgbToHex(mix(base, BLACK, 0.52).r, mix(base, BLACK, 0.52).g, mix(base, BLACK, 0.52).b),
    "900": rgbToHex(mix(base, BLACK, 0.70).r, mix(base, BLACK, 0.70).g, mix(base, BLACK, 0.70).b),
    "950": rgbToHex(mix(base, BLACK, 0.85).r, mix(base, BLACK, 0.85).g, mix(base, BLACK, 0.85).b),
  };
};

const LeagueContext = createContext<LeagueContextType>({
  settings: DEFAULT_LEAGUE_SETTINGS,
  updateSettings: async () => { },
  updateRules: async () => { },
  previewThemeColors: () => { },
  revertThemeColors: () => { },
  isCustomizerOpen: false,
  openCustomizer: () => { },
  closeCustomizer: () => { },
  loading: true,
  activeLeagueId: "default",
  userLeagues: [],
  publicLeagues: [],
  switchLeague: async () => { },
  createLeague: async () => "",
  subscription: DEFAULT_LEAGUE_SUBSCRIPTION,
  updateSubscriptionTeamCount: async () => DEFAULT_LEAGUE_SUBSCRIPTION,
  addTeamToSubscription: async () => ({ teamId: "", newSubscription: DEFAULT_LEAGUE_SUBSCRIPTION }),
  removeTeamFromSubscription: async () => ({ newSubscription: DEFAULT_LEAGUE_SUBSCRIPTION }),
  isDemoLeague: true,
  resetDemoSession: () => { },
  archiveLeague: async () => { },
  resumeSubscription: async () => { },
  isLeagueArchived: false,
  isSubscriptionPastDue: false,
  isLeagueReadOnly: false,
});

const SelectedLeagueProvider = ({ children }: { children: React.ReactNode }) => {
  const settingsRequest = useRef(0);
  const [settings, setSettings] = useState<LeagueSettings>(DEFAULT_LEAGUE_SETTINGS);
  const [activeLeagueId, setActiveLeagueId] = useState<string>("default");
  const [userLeagues, setUserLeagues] = useState<UserLeagueSummary[]>(DEFAULT_USER_LEAGUES);
  const [subscription, setSubscription] = useState<LeagueSubscriptionInfo | null>(DEFAULT_LEAGUE_SUBSCRIPTION);

  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Apply CSS color variables dynamically to root & update browser title
  const applyThemeColors = (primary: string, accent: string, leagueName?: string, seasonTitle?: string) => {
    if (typeof document !== "undefined") {
      const p = primary || "#3ca505";
      const a = accent || "#3b82f6";
      const pRgb = parseHex(p);
      const aRgb = parseHex(a);

      const pShades = generateShades(p);
      const aShades = generateShades(a);

      const root = document.documentElement;

      root.style.setProperty("--league-primary", p);
      root.style.setProperty("--league-accent", a);
      root.style.setProperty("--league-primary-rgb", `${pRgb.r}, ${pRgb.g}, ${pRgb.b}`);
      root.style.setProperty("--league-accent-rgb", `${aRgb.r}, ${aRgb.g}, ${aRgb.b}`);

      // Inject full primary shade palette dynamically
      Object.entries(pShades).forEach(([shade, hex]) => {
        root.style.setProperty(`--league-primary-${shade}`, hex);
      });

      // Inject full accent shade palette dynamically
      Object.entries(aShades).forEach(([shade, hex]) => {
        root.style.setProperty(`--league-accent-${shade}`, hex);
      });

      if (leagueName) {
        document.title = `${leagueName} | ${seasonTitle || "Active Season"}`;
      }
    }
  };

  // Helper to load settings for a given league id
  const fetchSettingsForLeague = async (leagueId: string) => {
    const request = ++settingsRequest.current;
    const isCurrent = () => request === settingsRequest.current;
    if (checkIsDemoLeague(leagueId)) {
      try {
        const { getSandboxSettings } = await import("./demoSandbox");
        if (!isCurrent()) return null;
        const sandboxSettings = getSandboxSettings();
        setSettings(sandboxSettings);
        setSubscription(DEFAULT_LEAGUE_SUBSCRIPTION);
        applyThemeColors(sandboxSettings.primaryColor, sandboxSettings.accentColor, sandboxSettings.leagueName, sandboxSettings.seasonTitle);
        return sandboxSettings;
      } catch (err) {
        if (isCurrent()) console.error("Failed to load demo settings:", err);
        return null;
      }
    }

    if (leagueId === "league_private_live") {
      try {
        const docRef = doc(db, "leagues", leagueId);
        const snap = await getDoc(docRef);
        if (!isCurrent()) return null;
        if (snap.exists()) {
          const remoteData = snap.data() as Partial<LeagueSettings> & { subscription?: LeagueSubscriptionInfo };
          const merged: LeagueSettings = {
            ...PRIVATE_LIVE_LEAGUE_SETTINGS,
            ...remoteData,
            rules: { ...DEFAULT_LEAGUE_RULES, ...(remoteData.rules || {}) },
          };
          setSettings(merged);
          setSubscription(remoteData.subscription || PRIVATE_LIVE_LEAGUE_SUBSCRIPTION);
          applyThemeColors(merged.primaryColor, merged.accentColor, merged.leagueName, merged.seasonTitle);
          if (typeof window !== "undefined") {
            localStorage.setItem(`league_settings_${leagueId}`, JSON.stringify(merged));
          }
          return merged;
        }
      } catch (err) {
        if (!isCurrent()) return null;
        console.warn("Falling back to local private league settings:", err);
      }
      setSettings(PRIVATE_LIVE_LEAGUE_SETTINGS);
      setSubscription(PRIVATE_LIVE_LEAGUE_SUBSCRIPTION);
      applyThemeColors(PRIVATE_LIVE_LEAGUE_SETTINGS.primaryColor, PRIVATE_LIVE_LEAGUE_SETTINGS.accentColor, PRIVATE_LIVE_LEAGUE_SETTINGS.leagueName, PRIVATE_LIVE_LEAGUE_SETTINGS.seasonTitle);
      return PRIVATE_LIVE_LEAGUE_SETTINGS;
    }
    try {
      const docRef = doc(db, "leagues", leagueId);
      const snap = await getDoc(docRef);
      if (!isCurrent()) return null;
      if (snap.exists()) {
        const remoteData = snap.data() as Partial<LeagueSettings> & { subscription?: LeagueSubscriptionInfo };
        const merged: LeagueSettings = {
          ...DEFAULT_LEAGUE_SETTINGS,
          ...remoteData,
          rules: { ...DEFAULT_LEAGUE_RULES, ...(remoteData.rules || {}) },
        };
        setSettings(merged);
        if (remoteData.subscription) {
          setSubscription(remoteData.subscription);
        }
        applyThemeColors(merged.primaryColor, merged.accentColor, merged.leagueName, merged.seasonTitle);
        if (typeof window !== "undefined") {
          localStorage.setItem(`league_settings_${leagueId}`, JSON.stringify(merged));
        }
        return merged;
      }
    } catch (err) {
      if (!isCurrent()) return null;
      console.error(`Failed to load settings for league ${leagueId}:`, err);
    }
    return null;
  };

  useEffect(() => {
    // Restore cached league settings and active league.
    let initialLeagueId = "default";
    if (typeof window !== "undefined") {
      try {
        const savedLeagueId = localStorage.getItem("flagos_active_league_id");
        if (savedLeagueId) {
          initialLeagueId = savedLeagueId;
          setActiveLeagueId(savedLeagueId);
        }

        const savedUserLeagues = localStorage.getItem("flagos_user_leagues");
        if (savedUserLeagues) {
          const parsedLeagues = JSON.parse(savedUserLeagues);
          if (Array.isArray(parsedLeagues) && parsedLeagues.length > 0) {
            const sanitized = parsedLeagues.map((l: UserLeagueSummary) => {
              if (l.primaryColor === "#06B6D4") {
                return { ...l, primaryColor: DEFAULT_LEAGUE_SETTINGS.primaryColor, accentColor: DEFAULT_LEAGUE_SETTINGS.accentColor };
              }
              return l;
            });
            setUserLeagues(sanitized);
            const activeSummary = sanitized.find((l: UserLeagueSummary) => l.id === initialLeagueId);
            if (activeSummary?.subscription) {
              setSubscription(activeSummary.subscription);
            }
          }
        }

        const cached = localStorage.getItem(`league_settings_${initialLeagueId}`) || localStorage.getItem("league_settings");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.primaryColor === "#06B6D4") {
            parsed.primaryColor = DEFAULT_LEAGUE_SETTINGS.primaryColor;
            parsed.accentColor = DEFAULT_LEAGUE_SETTINGS.accentColor;
            parsed.themePreset = DEFAULT_LEAGUE_SETTINGS.themePreset;
            localStorage.setItem(`league_settings_${initialLeagueId}`, JSON.stringify(parsed));
          }
          setSettings((prev) => ({
            ...DEFAULT_LEAGUE_SETTINGS,
            ...prev,
            ...parsed,
            rules: { ...DEFAULT_LEAGUE_RULES, ...(prev.rules || {}), ...(parsed.rules || {}) },
          }));
        }
        localStorage.removeItem("flagos_user_colors");
      } catch (err) {
        console.error("Failed to read league settings from cache:", err);
      }
    }

    applyThemeColors(settings.primaryColor || DEFAULT_LEAGUE_SETTINGS.primaryColor, settings.accentColor || DEFAULT_LEAGUE_SETTINGS.accentColor, settings.leagueName, settings.seasonTitle);

    const pending = fetchSettingsForLeague(initialLeagueId);
    const request = settingsRequest.current;
    void pending.then(() => {
      if (request === settingsRequest.current) setLoading(false);
    });
    return () => { settingsRequest.current++; };
  }, []);

  const switchLeague = async (leagueId: string) => {
    setLoading(true);
    setActiveLeagueId(leagueId);
    if (typeof window !== "undefined") {
      localStorage.setItem("flagos_active_league_id", leagueId);
    }

    const matchingLeague = userLeagues.find((l) => l.id === leagueId);
    if (matchingLeague?.subscription) {
      setSubscription(matchingLeague.subscription);
    }

    const pending = fetchSettingsForLeague(leagueId);
    const request = settingsRequest.current;
    await pending;
    if (request === settingsRequest.current) setLoading(false);
  };

  const createLeague = async (data: {
    name: string;
    shortcode: string;
    seasonTitle?: string;
    teamCount?: number;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    tertiaryColor?: string;
    logoUrl?: string;
    rulePreset?: string;
    visibility?: "public" | "private";
  }): Promise<string> => {
    const owner = auth.currentUser;
    if (!owner?.email || !owner.emailVerified) {
      throw new Error("Sign in with a verified email before creating a league.");
    }
    const pColor = data.primaryColor || "#3ca505";
    const sColor = data.secondaryColor || data.accentColor || "#3b82f6";
    const tColor = data.tertiaryColor || "#ffffff";
    const logo = data.logoUrl?.trim() || FLAGOS_LOGO;
    const teams = data.teamCount || 8;
    const baseFee = 40;
    const perTeamFee = 15;

    const newSub: LeagueSubscriptionInfo = {
      plan: "league",
      status: "active",
      baseMonthlyFee: baseFee,
      perTeamMonthlyFee: perTeamFee,
      teamCount: teams,
      totalMonthlyFee: baseFee + teams * perTeamFee,
      billingCycle: "monthly",
      renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const newLeagueSettings: LeagueSettings = {
      ...DEFAULT_LEAGUE_SETTINGS,
      leagueName: data.name,
      shortcode: data.shortcode.toUpperCase(),
      seasonTitle: data.seasonTitle || `${new Date().getFullYear()} Season`,
      visibility: data.visibility || "public",
      ownerUid: owner.uid,
      adminEmails: [owner.email.trim().toLowerCase()],
      createdAt: new Date().toISOString(),
      primaryColor: pColor,
      accentColor: sColor,
      secondaryColor: sColor,
      tertiaryColor: tColor,
      logoUrl: logo,
      rules: DEFAULT_LEAGUE_RULES,
      playoffFormat: getDefaultPlayoffFormat(teams),
      subscription: newSub,
    };

    // Save to Firestore
    let newLeagueId: string;
    try {
      newLeagueId = await createSecureRecord("league", newLeagueSettings as unknown as Record<string, unknown>);
    } catch (e) {
      console.error("Could not save new league to Firestore:", e);
      throw new Error("Could not create the league. Check your permissions and try again.");
    }

    const starterTeamColors = [
      "#3ca505", "#3b82f6", "#ef4444", "#f59e0b",
      "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
      "#06b6d4", "#84cc16", "#6366f1", "#d946ef",
      "#0ea5e9", "#eab308", "#10b981", "#a855f7",
    ];

    try {
      await Promise.all(
        Array.from({ length: teams }, (_, index) => {
          const num = index + 1;
          return createSecureRecord("team", {
            name: `Team ${num}`,
            shortcode: `TM${num}`,
            leagueId: newLeagueId,
            primaryColor: starterTeamColors[index % starterTeamColors.length],
            createdAt: new Date().toISOString(),
          });
        })
      );
    } catch (teamErr) {
      console.warn("Non-fatal: could not auto-create starter teams:", teamErr);
    }

    const newSummary: UserLeagueSummary = {
      id: newLeagueId,
      name: data.name,
      shortcode: data.shortcode.toUpperCase(),
      seasonTitle: newLeagueSettings.seasonTitle,
      primaryColor: pColor,
      accentColor: sColor,
      secondaryColor: sColor,
      tertiaryColor: tColor,
      logoUrl: logo,
      role: "owner",
      visibility: data.visibility || "public",
      subscription: newSub,
    };

    const updatedUserLeagues = [...userLeagues, newSummary];
    setUserLeagues(updatedUserLeagues);
    setSubscription(newSub);
    setSettings(newLeagueSettings);
    setActiveLeagueId(newLeagueId);

    if (typeof window !== "undefined") {
      localStorage.setItem("flagos_active_league_id", newLeagueId);
      localStorage.setItem("flagos_user_leagues", JSON.stringify(updatedUserLeagues));
      localStorage.setItem(`league_settings_${newLeagueId}`, JSON.stringify(newLeagueSettings));
    }

    applyThemeColors(pColor, sColor, data.name, newLeagueSettings.seasonTitle);
    return newLeagueId;
  };

  // Listen to sandbox reset/update events in demo mode
  useEffect(() => {
    let disposed = false;
    const unsub = subscribeDemoSandbox(() => {
      if (checkIsDemoLeague(activeLeagueId)) {
        void import("./demoSandbox").then(({ getSandboxSettings }) => {
          if (disposed) return;
          const current = getSandboxSettings();
          setSettings(current);
          applyThemeColors(current.primaryColor, current.accentColor, current.leagueName, current.seasonTitle);
        });
      }
    });
    return () => { disposed = true; unsub(); };
  }, [activeLeagueId]);

  const updateSettings = async (newSettings: Partial<LeagueSettings>) => {
    if (checkIsDemoLeague(activeLeagueId)) {
      const { updateSandboxSettings } = await import("./demoSandbox");
      const updated = updateSandboxSettings(newSettings);
      setSettings(updated);
      applyThemeColors(updated.primaryColor, updated.accentColor, updated.leagueName, updated.seasonTitle);
      return;
    }

    const merged: LeagueSettings = {
      ...settings,
      ...newSettings,
      rules: { ...settings.rules, ...(newSettings.rules || {}) },
    };
    setSettings(merged);
    applyThemeColors(merged.primaryColor, merged.accentColor, merged.leagueName, merged.seasonTitle);

    if (typeof window !== "undefined") {
      localStorage.setItem(`league_settings_${activeLeagueId}`, JSON.stringify(merged));
      localStorage.setItem("league_settings", JSON.stringify(merged));
    }

    // Update summary in userLeagues list if name, colors, or visibility changed
    setUserLeagues((prev) => {
      const updated = prev.map((l) =>
        l.id === activeLeagueId
          ? {
              ...l,
              name: merged.leagueName,
              shortcode: merged.shortcode,
              primaryColor: merged.primaryColor,
              accentColor: merged.accentColor,
              visibility: merged.visibility || "public",
            }
          : l
      );
      if (typeof window !== "undefined") {
        localStorage.setItem("flagos_user_leagues", JSON.stringify(updated));
      }
      return updated;
    });

    const payload: Record<string, unknown> = { leagueId: activeLeagueId };
    for (const key of LEAGUE_UPDATE_KEYS) {
      if (key in newSettings && merged[key] !== undefined) payload[key] = merged[key];
    }
    if (newSettings.rules) payload.rules = merged.rules;
    try {
      await createSecureRecord("league_update", payload);
    } catch (err) {
      console.error("Failed to sync league settings to Firestore:", err);
      throw err instanceof Error ? err : new Error("Could not save league settings.");
    }
  };

  const resetDemoSession = async () => {
    const { resetDemoSession: resetDemoSandboxHelper, getSandboxSettings } = await import("./demoSandbox");
    resetDemoSandboxHelper();
    const pristine = getSandboxSettings();
    setSettings(pristine);
    if (typeof window !== "undefined") {
      localStorage.removeItem("flagos_user_colors");
    }
    applyThemeColors(pristine.primaryColor, pristine.accentColor, pristine.leagueName, pristine.seasonTitle);
  };

  const updateRules = async (newRules: Partial<LeagueRules>) => {
    const updatedRules: LeagueRules = { ...settings.rules, ...newRules };
    await updateSettings({ rules: updatedRules });
  };

  const previewThemeColors = (primary: string, accent: string) => {
    applyThemeColors(primary, accent, settings.leagueName, settings.seasonTitle);
  };

  const revertThemeColors = () => {
    applyThemeColors(settings.primaryColor, settings.accentColor, settings.leagueName, settings.seasonTitle);
  };

  const isLeagueArchived = Boolean(
    settings.isArchived ||
    settings.seasonStatus === "archived" ||
    subscription?.status === "archived"
  );
  const isSubscriptionPastDue = subscription?.status === "past_due";
  const isLeagueReadOnly = isLeagueArchived || isSubscriptionPastDue;

  const archiveLeague = async (action: "pause_subscription" | "new_season") => {
    const isPaused = action === "pause_subscription";
    const updatedSub: LeagueSubscriptionInfo = {
      ...(subscription || DEFAULT_LEAGUE_SUBSCRIPTION),
      status: isPaused ? "archived" : "active",
    };
    const updatedSettings: LeagueSettings = {
      ...settings,
      isArchived: isPaused,
      seasonStatus: isPaused ? "archived" : "completed",
      archivedAt: new Date().toISOString(),
      subscription: updatedSub,
    };
    await updateSettings(updatedSettings);
    setSubscription(updatedSub);
  };

  const resumeSubscription = async () => {
    const updatedSub: LeagueSubscriptionInfo = {
      ...(subscription || DEFAULT_LEAGUE_SUBSCRIPTION),
      status: "active",
    };
    const updatedSettings: LeagueSettings = {
      ...settings,
      isArchived: false,
      seasonStatus: "active",
      subscription: updatedSub,
    };
    await updateSettings(updatedSettings);
    setSubscription(updatedSub);
  };

  const updateSubscriptionTeamCount = async (newTeamCount: number): Promise<LeagueSubscriptionInfo> => {
    const clampedCount = Math.max(2, Math.round(newTeamCount));
    const baseFee = subscription?.baseMonthlyFee ?? 40;
    const perTeamFee = subscription?.perTeamMonthlyFee ?? 15;
    const totalMonthlyFee = baseFee + clampedCount * perTeamFee;

    const nextSub: LeagueSubscriptionInfo = {
      ...(subscription || DEFAULT_LEAGUE_SUBSCRIPTION),
      baseMonthlyFee: baseFee,
      perTeamMonthlyFee: perTeamFee,
      teamCount: clampedCount,
      totalMonthlyFee,
      status: subscription?.status || "active",
      renewsAt: subscription?.renewsAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const nextSettings: LeagueSettings = {
      ...settings,
      subscription: nextSub,
      playoffFormat: getDefaultPlayoffFormat(clampedCount),
    };

    setSubscription(nextSub);
    setSettings(nextSettings);

    if (typeof window !== "undefined") {
      localStorage.setItem(`league_settings_${activeLeagueId}`, JSON.stringify(nextSettings));
      localStorage.setItem("league_settings", JSON.stringify(nextSettings));
    }

    setUserLeagues((prev) => {
      const updated = prev.map((l) =>
        l.id === activeLeagueId
          ? {
              ...l,
              subscription: nextSub,
            }
          : l
      );
      if (typeof window !== "undefined") {
        localStorage.setItem("flagos_user_leagues", JSON.stringify(updated));
      }
      return updated;
    });

    if (checkIsDemoLeague(activeLeagueId)) {
      const { updateSandboxSettings } = await import("./demoSandbox");
      updateSandboxSettings(nextSettings);
      return nextSub;
    }

    try {
      await createSecureRecord("league_update", {
        leagueId: activeLeagueId,
        subscription: nextSub,
        playoffFormat: nextSettings.playoffFormat,
      });
    } catch (err) {
      console.error("Failed to sync updated subscription to Firestore:", err);
    }

    return nextSub;
  };

  const addTeamToSubscription = async (customName?: string): Promise<{ teamId: string; newSubscription: LeagueSubscriptionInfo }> => {
    const currentCount = subscription?.teamCount ?? 8;
    const nextCount = currentCount + 1;
    const updatedSub = await updateSubscriptionTeamCount(nextCount);

    const teamColors = [
      "#3ca505", "#3b82f6", "#ef4444", "#f59e0b",
      "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
      "#06b6d4", "#84cc16", "#6366f1", "#d946ef",
      "#0ea5e9", "#eab308", "#10b981", "#a855f7",
    ];

    const teamName = customName?.trim() || `Team ${nextCount}`;
    const shortcode = teamName.startsWith("Team ") ? `TM${teamName.replace("Team ", "")}` : teamName.slice(0, 4).toUpperCase();

    if (checkIsDemoLeague(activeLeagueId)) {
      const { addSandboxTeam } = await import("./demoSandbox");
      const created = addSandboxTeam(teamName);
      return { teamId: created.id, newSubscription: updatedSub };
    }

    const teamId = await createSecureRecord("team", {
      name: teamName,
      shortcode,
      leagueId: activeLeagueId,
      primaryColor: teamColors[(nextCount - 1) % teamColors.length],
      createdAt: new Date().toISOString(),
    });

    return { teamId, newSubscription: updatedSub };
  };

  const removeTeamFromSubscription = async (teamId: string): Promise<{ newSubscription: LeagueSubscriptionInfo }> => {
    if (checkIsDemoLeague(activeLeagueId)) {
      const { deleteSandboxTeam } = await import("./demoSandbox");
      deleteSandboxTeam(teamId);
    } else {
      await createSecureRecord("delete_team", { teamId });
    }

    const currentCount = subscription?.teamCount ?? 8;
    const nextCount = Math.max(2, currentCount - 1);
    const updatedSub = await updateSubscriptionTeamCount(nextCount);
    return { newSubscription: updatedSub };
  };

  const openCustomizer = () => setIsCustomizerOpen(true);
  const closeCustomizer = () => {
    revertThemeColors();
    setIsCustomizerOpen(false);
  };

  return (
    <LeagueContext.Provider
      value={{
        settings,
        updateSettings,
        updateRules,
        previewThemeColors,
        revertThemeColors,
        isCustomizerOpen,
        openCustomizer,
        closeCustomizer,
        loading,
        activeLeagueId,
        userLeagues,
        publicLeagues: userLeagues.filter((l) => l.visibility !== "private"),
        switchLeague,
        createLeague,
        subscription,
        updateSubscriptionTeamCount,
        addTeamToSubscription,
        removeTeamFromSubscription,
        isDemoLeague: checkIsDemoLeague(activeLeagueId),
        resetDemoSession,
        archiveLeague,
        resumeSubscription,
        isLeagueArchived,
        isSubscriptionPastDue,
        isLeagueReadOnly,
      }}
    >
      {children}
    </LeagueContext.Provider>
  );
};

function independentTeamSettings(team: TeamRecord | null, teamId: string): LeagueSettings {
  const data = team || { id: teamId };
  return {
    ...DEFAULT_LEAGUE_SETTINGS,
    leagueName: typeof data.name === "string" && data.name ? data.name : DEFAULT_LEAGUE_SETTINGS.leagueName,
    shortcode: typeof data.shortcode === "string" ? data.shortcode : "",
    tagline: typeof data.tagline === "string" && data.tagline ? data.tagline : "Independent Team",
    logoUrl: typeof data.logoUrl === "string" ? data.logoUrl : "",
    icon: typeof data.icon === "string" && data.icon ? data.icon : DEFAULT_LEAGUE_SETTINGS.icon,
    primaryColor: data.primaryColor || data.color || DEFAULT_LEAGUE_SETTINGS.primaryColor,
    accentColor: data.secondaryColor || DEFAULT_LEAGUE_SETTINGS.accentColor,
    themePreset: "custom",
    defaultLocation: typeof data.defaultLocation === "string" ? data.defaultLocation : "",
    contactEmail: "",
    rulebookTitle: typeof data.rulebookTitle === "string" && data.rulebookTitle ? data.rulebookTitle : "IFAF 5v5 Flag Football Rules",
    rules: { ...IFAF_5V5_RULES, ...(data.rules && typeof data.rules === "object" ? data.rules : {}) },
    playoffFormat: undefined,
  };
}

function rejectIndependentLeagueMutation(): never {
  throw new Error("This is an independent team. League settings and demo actions do not apply to this team.");
}

function IndependentTeamLeague({ teamId, team, loading, children }: {
  teamId: string;
  team: TeamRecord | null;
  loading: boolean;
  children: React.ReactNode;
}) {
  const league = useContext(LeagueContext);
  return (
    <LeagueContext.Provider value={{
      ...league,
      settings: independentTeamSettings(team, teamId),
      activeLeagueId: "",
      isDemoLeague: false,
      loading,
      subscription: null,
      isLeagueArchived: false,
      isSubscriptionPastDue: false,
      isLeagueReadOnly: false,
      isCustomizerOpen: false,
      updateSettings: async () => rejectIndependentLeagueMutation(),
      updateRules: async () => rejectIndependentLeagueMutation(),
      previewThemeColors: rejectIndependentLeagueMutation,
      revertThemeColors: rejectIndependentLeagueMutation,
      openCustomizer: rejectIndependentLeagueMutation,
      closeCustomizer: rejectIndependentLeagueMutation,
      resetDemoSession: rejectIndependentLeagueMutation,
      archiveLeague: async () => rejectIndependentLeagueMutation(),
      resumeSubscription: async () => rejectIndependentLeagueMutation(),
      updateSubscriptionTeamCount: async () => rejectIndependentLeagueMutation(),
      addTeamToSubscription: async () => rejectIndependentLeagueMutation(),
      removeTeamFromSubscription: async () => rejectIndependentLeagueMutation(),
    }}>
      {children}
    </LeagueContext.Provider>
  );
}

/** Scopes league context to a standalone team; league teams keep their league context. */
export function TeamLeagueScope({ teamId, children }: { teamId: string; children: React.ReactNode }) {
  const isCustomerTeam = !isDemoTeamId(teamId);
  const { team, resolved } = useTeamRecord(teamId, isCustomerTeam);
  if (!isCustomerTeam || (team && !isStandaloneTeam(team))) return <>{children}</>;
  return <IndependentTeamLeague teamId={teamId} team={team} loading={!resolved && !team}>{children}</IndependentTeamLeague>;
}

// Real team and match routes resolve their owning team before choosing a league
// context so the persisted demo league never initializes on customer routes.
function CustomerRouteLeague({ teamId: routeTeamId, matchId, children }: {
  teamId: string | null;
  matchId: string | null;
  children: React.ReactNode;
}) {
  const canReadCache = useCanReadBrowserCache();
  const [matchTeam, setMatchTeam] = useState<{ matchId: string | null; teamId: string | null; resolved: boolean }>(() => ({
    matchId,
    teamId: null,
    resolved: !matchId,
  }));
  const storedMatchTeam = matchTeam.matchId === matchId ? matchTeam : { matchId, teamId: null, resolved: !matchId };
  const currentMatchTeam = storedMatchTeam.resolved || !matchId || !canReadCache
    ? storedMatchTeam
    : { ...storedMatchTeam, teamId: getCachedMatchTeamId(matchId) };

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;
    loadMatchTeamId(matchId)
      .then((teamId) => { if (!cancelled) setMatchTeam({ matchId, teamId, resolved: true }); })
      .catch(() => { if (!cancelled) setMatchTeam({ matchId, teamId: getCachedMatchTeamId(matchId), resolved: true }); });
    return () => { cancelled = true; };
  }, [matchId]);

  const teamId = routeTeamId || currentMatchTeam.teamId;
  const customerTeam = !!teamId && !isDemoTeamId(teamId);
  const { team, resolved } = useTeamRecord(teamId, customerTeam);
  const isLeagueTeam = !!team && !isStandaloneTeam(team);
  const unresolvedMatch = !!matchId && currentMatchTeam.resolved && !customerTeam;
  if (isLeagueTeam || unresolvedMatch) return <SelectedLeagueProvider>{children}</SelectedLeagueProvider>;
  return (
    <IndependentTeamLeague teamId={teamId || ""} team={team} loading={!team && (!resolved || !currentMatchTeam.resolved)}>
      {children}
    </IndependentTeamLeague>
  );
}

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const teamId = pathname?.startsWith("/teams/") ? pathname.split("/")[2] || null : null;
  const matchId = pathname?.startsWith("/matches/") ? pathname.split("/")[2] || null : null;
  if ((teamId && !isDemoTeamId(teamId)) || (matchId && !isDemoMatchId(matchId))) {
    return <CustomerRouteLeague teamId={teamId} matchId={teamId ? null : matchId}>{children}</CustomerRouteLeague>;
  }
  return <SelectedLeagueProvider>{children}</SelectedLeagueProvider>;
}

export const useLeague = () => useContext(LeagueContext);
