"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  getSandboxSettings,
  updateSandboxSettings,
  resetDemoSession as resetDemoSandboxHelper,
  subscribeDemoSandbox,
  isDemoLeague as checkIsDemoLeague,
} from "./demoSandbox";

export interface LeagueRules {
  playersOnField: number;          // e.g. 4, 5, 6, 7, 8 (default: 5)
  periodType: "halves" | "quarters"; // default: "halves"
  periodsCount: number;            // 2 or 4 (default: 2)
  periodDurationMinutes: number;   // default: 20
  timeoutsPerTeam: number;         // default: 2
  timeoutDurationSeconds: number;  // default: 60
  timeoutsResetPerPeriod: boolean; // default: true
  minRosterSize: number;           // default: 5
  maxRosterSize: number;           // default: 15
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
  maxRosterSize: 15,
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
  maxRosterSize: 15,
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
  themePreset: string;
  defaultLocation: string;
  contactEmail: string;
  rulebookTitle: string;
  rulebookUrl?: string;
  announcement?: string;
  visibility?: "public" | "private"; // public = indexed in public directory, private = direct URL access only
  rules: LeagueRules;
  playoffFormat?: PlayoffFormat;
}

export interface PlayoffFormat {
  teamsCount: number; // 4, 6, 8, 12, 14, 16
  structure: "single_elimination" | "double_elimination";
  hasByes?: boolean;
  byesCount?: number;
  playoffWeeks?: number;
  championshipName?: string;
}

export const DEFAULT_LEAGUE_SETTINGS: LeagueSettings = {
  leagueName: "FlagOS League",
  shortcode: "FLAG",
  tagline: "The Flag Football Operating System",
  seasonTitle: "2026 Season",
  logoUrl: "/flagos-logo.png",
  icon: "shield",
  primaryColor: "#3ca505", // Field Green (#3ca505)
  accentColor: "#22c55e",  // Turf Green (#22c55e)
  themePreset: "gridiron-green",
  defaultLocation: "Turf Field 1",
  contactEmail: "commissioner@flagos.app",
  rulebookTitle: "Official 7v7 Non-Contact Rules",
  rulebookUrl: "",
  announcement: "",
  visibility: "public",
  rules: DEFAULT_LEAGUE_RULES,
  playoffFormat: {
    teamsCount: 14,
    structure: "single_elimination",
    hasByes: true,
    byesCount: 2,
    playoffWeeks: 4,
    championshipName: "FlagOS League Championship",
  },
};

export interface LeagueSubscriptionInfo {
  plan: "league" | "team";
  status: "active" | "trial" | "past_due";
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
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  role: "owner" | "admin" | "member";
  visibility?: "public" | "private";
  subscription?: LeagueSubscriptionInfo;
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

interface LeagueContextType {
  settings: LeagueSettings;
  updateSettings: (newSettings: Partial<LeagueSettings>) => Promise<void>;
  updateRules: (newRules: Partial<LeagueRules>) => Promise<void>;
  previewThemeColors: (primary: string, accent: string) => void;
  revertThemeColors: () => void;
  userThemeColors: { primary: string; accent: string } | null;
  setUserThemeColors: (colors: { primary: string; accent: string } | null) => void;
  resetToLeagueColors: () => void;
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
    accentColor?: string;
    rulePreset?: string;
    visibility?: "public" | "private";
  }) => Promise<string>;
  subscription: LeagueSubscriptionInfo | null;
  isDemoLeague: boolean;
  resetDemoSession: () => void;
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
  userThemeColors: null,
  setUserThemeColors: () => { },
  resetToLeagueColors: () => { },
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
  isDemoLeague: true,
  resetDemoSession: () => { },
});

export const LeagueProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<LeagueSettings>(DEFAULT_LEAGUE_SETTINGS);
  const [userThemeColors, setUserThemeColorsState] = useState<{ primary: string; accent: string } | null>(null);
  const [activeLeagueId, setActiveLeagueId] = useState<string>("default");
  const [userLeagues, setUserLeagues] = useState<UserLeagueSummary[]>([
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
  ]);
  const [subscription, setSubscription] = useState<LeagueSubscriptionInfo | null>(DEFAULT_LEAGUE_SUBSCRIPTION);

  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Apply CSS color variables dynamically to root & update browser title
  const applyThemeColors = (primary: string, accent: string, leagueName?: string, seasonTitle?: string) => {
    if (typeof document !== "undefined") {
      const p = primary || "#3ca505";
      const a = accent || "#22c55e";
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
    if (checkIsDemoLeague(leagueId)) {
      const sandboxSettings = getSandboxSettings();
      setSettings(sandboxSettings);
      setSubscription(DEFAULT_LEAGUE_SUBSCRIPTION);
      if (!userThemeColors) {
        applyThemeColors(sandboxSettings.primaryColor, sandboxSettings.accentColor, sandboxSettings.leagueName, sandboxSettings.seasonTitle);
      }
      return sandboxSettings;
    }
    try {
      const docRef = doc(db, "leagues", leagueId);
      const snap = await getDoc(docRef);
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
        if (!userThemeColors) {
          applyThemeColors(merged.primaryColor, merged.accentColor, merged.leagueName, merged.seasonTitle);
        }
        if (typeof window !== "undefined") {
          localStorage.setItem(`league_settings_${leagueId}`, JSON.stringify(merged));
        }
        return merged;
      }
    } catch (err) {
      console.error(`Failed to load settings for league ${leagueId}:`, err);
    }
    return null;
  };

  useEffect(() => {
    // Restore cached league settings, active league, & user theme colors
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
        const rawUserColors = localStorage.getItem("flagos_user_colors");
        if (rawUserColors) {
          const parsedUserColors = JSON.parse(rawUserColors);
          if (parsedUserColors?.primary === "#06B6D4") {
            localStorage.removeItem("flagos_user_colors");
            setUserThemeColorsState(null);
          } else {
            setUserThemeColorsState(parsedUserColors);
          }
        }
      } catch (err) {
        console.error("Failed to read league settings from cache:", err);
      }
    }

    const effPrimary = userThemeColors?.primary || settings.primaryColor || DEFAULT_LEAGUE_SETTINGS.primaryColor;
    const effAccent = userThemeColors?.accent || settings.accentColor || DEFAULT_LEAGUE_SETTINGS.accentColor;
    applyThemeColors(effPrimary, effAccent, settings.leagueName, settings.seasonTitle);

    fetchSettingsForLeague(initialLeagueId).then(() => setLoading(false));
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

    await fetchSettingsForLeague(leagueId);
    setLoading(false);
  };

  const createLeague = async (data: {
    name: string;
    shortcode: string;
    seasonTitle?: string;
    teamCount?: number;
    primaryColor?: string;
    accentColor?: string;
    rulePreset?: string;
    visibility?: "public" | "private";
  }): Promise<string> => {
    const newLeagueId = `league_${Date.now()}`;
    const pColor = data.primaryColor || "#3ca505";
    const aColor = data.accentColor || "#22c55e";
    const teams = data.teamCount || 8;
    const baseFee = 49;
    const perTeamFee = 5;

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

    const newLeagueSettings: LeagueSettings & { subscription: LeagueSubscriptionInfo } = {
      ...DEFAULT_LEAGUE_SETTINGS,
      leagueName: data.name,
      shortcode: data.shortcode.toUpperCase(),
      seasonTitle: data.seasonTitle || `${new Date().getFullYear()} Season`,
      primaryColor: pColor,
      accentColor: aColor,
      rules: DEFAULT_LEAGUE_RULES,
      subscription: newSub,
    };

    // Save to Firestore
    try {
      await setDoc(doc(db, "leagues", newLeagueId), newLeagueSettings);
    } catch (e) {
      console.warn("Could not save new league to Firestore immediately (using local store):", e);
    }

    const newSummary: UserLeagueSummary = {
      id: newLeagueId,
      name: data.name,
      shortcode: data.shortcode.toUpperCase(),
      seasonTitle: newLeagueSettings.seasonTitle,
      primaryColor: pColor,
      accentColor: aColor,
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

    applyThemeColors(pColor, aColor, data.name, newLeagueSettings.seasonTitle);
    return newLeagueId;
  };

  // Listen to sandbox reset/update events in demo mode
  useEffect(() => {
    const unsub = subscribeDemoSandbox(() => {
      if (checkIsDemoLeague(activeLeagueId)) {
        const current = getSandboxSettings();
        setSettings(current);
        if (!userThemeColors) {
          applyThemeColors(current.primaryColor, current.accentColor, current.leagueName, current.seasonTitle);
        }
      }
    });
    return () => unsub();
  }, [activeLeagueId, userThemeColors]);

  const updateSettings = async (newSettings: Partial<LeagueSettings>) => {
    if (checkIsDemoLeague(activeLeagueId)) {
      const updated = updateSandboxSettings(newSettings);
      setSettings(updated);
      if (!userThemeColors) {
        applyThemeColors(updated.primaryColor, updated.accentColor, updated.leagueName, updated.seasonTitle);
      }
      return;
    }

    const merged: LeagueSettings = {
      ...settings,
      ...newSettings,
      rules: { ...settings.rules, ...(newSettings.rules || {}) },
    };
    setSettings(merged);
    if (!userThemeColors) {
      applyThemeColors(merged.primaryColor, merged.accentColor, merged.leagueName, merged.seasonTitle);
    }

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

    try {
      const targetDoc = doc(db, "leagues", activeLeagueId);
      await setDoc(targetDoc, merged, { merge: true });
    } catch (err) {
      console.error("Failed to sync league settings to Firestore:", err);
    }
  };

  const resetDemoSession = () => {
    resetDemoSandboxHelper();
    const pristine = getSandboxSettings();
    setSettings(pristine);
    setUserThemeColorsState(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("flagos_user_colors");
    }
    applyThemeColors(pristine.primaryColor, pristine.accentColor, pristine.leagueName, pristine.seasonTitle);
  };

  const updateRules = async (newRules: Partial<LeagueRules>) => {
    const updatedRules: LeagueRules = { ...settings.rules, ...newRules };
    await updateSettings({ rules: updatedRules });
  };

  const setUserThemeColors = (colors: { primary: string; accent: string } | null) => {
    setUserThemeColorsState(colors);
    if (typeof window !== "undefined") {
      if (colors) {
        localStorage.setItem("flagos_user_colors", JSON.stringify(colors));
        applyThemeColors(colors.primary, colors.accent, settings.leagueName, settings.seasonTitle);
      } else {
        localStorage.removeItem("flagos_user_colors");
        applyThemeColors(settings.primaryColor, settings.accentColor, settings.leagueName, settings.seasonTitle);
      }
    }
  };

  const resetToLeagueColors = () => {
    setUserThemeColors(null);
  };

  const previewThemeColors = (primary: string, accent: string) => {
    applyThemeColors(primary, accent, settings.leagueName, settings.seasonTitle);
  };

  const revertThemeColors = () => {
    const effPrimary = userThemeColors?.primary || settings.primaryColor;
    const effAccent = userThemeColors?.accent || settings.accentColor;
    applyThemeColors(effPrimary, effAccent, settings.leagueName, settings.seasonTitle);
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
        userThemeColors,
        setUserThemeColors,
        resetToLeagueColors,
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
        isDemoLeague: checkIsDemoLeague(activeLeagueId),
        resetDemoSession,
      }}
    >
      {children}
    </LeagueContext.Provider>
  );
};

export const useLeague = () => useContext(LeagueContext);
