"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isYorkTeam, YORK_TEAM_ID } from "@/lib/yorkStaff";
import { getYorkTeamData, YORK_LIONS_TEAM } from "@/lib/yorkTeamProfile";
import { getSandboxTeams } from "@/lib/demoSandbox";
import {
  DEFAULT_TEAM_COLOR_PALETTE,
  resolveTeamColorPalette,
  getTeamCssVariables,
  getTeamBadgeStyle,
  getReadableTextColor,
  type TeamColorPalette,
  type TeamColorSource,
} from "./teamColors";

export interface TeamColorContextValue {
  team: any | null;
  palette: TeamColorPalette;
  isYork: boolean;
  loading: boolean;
  badgeStyle: { color: string; backgroundColor: string; borderColor: string };
  getReadableTextColor: (background: string, preferred: string) => string;
}

const TeamColorContext = createContext<TeamColorContextValue>({
  team: null,
  palette: DEFAULT_TEAM_COLOR_PALETTE,
  isYork: false,
  loading: false,
  badgeStyle: getTeamBadgeStyle(null),
  getReadableTextColor,
});

export function TeamColorScope({
  teamId: rawTeamId,
  initialTeam,
  children,
}: {
  teamId: string;
  initialTeam?: any;
  children: React.ReactNode;
}) {
  const teamId = isYorkTeam(rawTeamId) ? YORK_TEAM_ID : rawTeamId;
  const isYork = isYorkTeam(teamId);

  const [team, setTeam] = useState<any>(() => {
    if (initialTeam) return initialTeam;
    if (isYork) {
      let yData: any = { ...getYorkTeamData() };
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem("flagos_york_team_custom");
          if (cached) yData = { ...yData, ...JSON.parse(cached) };
        } catch {}
      }
      return yData;
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(!initialTeam && !isYork);

  // Load team details
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        if (isYork) {
          let yData: any = { ...getYorkTeamData() };
          if (typeof window !== "undefined") {
            try {
              const cached = localStorage.getItem("flagos_york_team_custom");
              if (cached) yData = { ...yData, ...JSON.parse(cached) };
            } catch {}
          }
          try {
            const snap = await getDoc(doc(db, "teams", teamId));
            if (snap.exists() && !cancelled) {
              yData = { ...yData, ...snap.data() };
            }
          } catch {}
          if (!cancelled) {
            setTeam(yData);
            setLoading(false);
          }
          return;
        }

        // Demo team check
        const isDemo =
          !teamId.startsWith("team_live_") &&
          (teamId === "team_apex" ||
            teamId === "team_cyber" ||
            teamId === "team_raptors" ||
            teamId === "team_vipers" ||
            teamId === "demo" ||
            teamId.startsWith("team_demo_") ||
            (teamId.startsWith("team_") && !teamId.startsWith("team_live_")));

        if (isDemo) {
          const demoTeams = getSandboxTeams();
          const found = demoTeams.find((t) => t.id === teamId || (teamId === "team_apex" && t.id === "team_kc"));
          if (found && !cancelled) {
            setTeam(found);
            setLoading(false);
            return;
          }
        }

        // Live team from Firestore
        const snap = await getDoc(doc(db, "teams", teamId));
        if (cancelled) return;
        if (snap.exists()) {
          setTeam({ id: snap.id, ...snap.data() });
        }
      } catch (e) {
        console.warn("Could not load team for TeamColorScope:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();

    // Listen to real-time custom updates (when user changes colors in edit modal)
    const handleCustomUpdate = (e: any) => {
      if (e?.detail) {
        setTeam((prev: any) => ({ ...prev, ...e.detail }));
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (isYork && e.key === "flagos_york_team_custom" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setTeam((prev: any) => ({ ...prev, ...parsed }));
        } catch {}
      }
    };

    window.addEventListener("flagos_team_updated", handleCustomUpdate);
    window.addEventListener("storage", handleStorage);

    return () => {
      cancelled = true;
      window.removeEventListener("flagos_team_updated", handleCustomUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, [teamId, isYork]);

  const palette = useMemo(() => resolveTeamColorPalette(team), [team]);
  const cssVars = useMemo(() => getTeamCssVariables(palette), [palette]);
  const badgeStyle = useMemo(() => getTeamBadgeStyle(team), [team]);

  // Synchronize CSS variables onto documentElement for portals & ambient backgrounds
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const previousEntries: [string, string][] = [];

    // Save previous values and apply new team variables
    Object.entries(cssVars).forEach(([key, val]) => {
      previousEntries.push([key, root.style.getPropertyValue(key)]);
      root.style.setProperty(key, val);
    });

    return () => {
      // Revert to prior values upon unmounting the team route
      previousEntries.forEach(([key, prevVal]) => {
        if (prevVal) {
          root.style.setProperty(key, prevVal);
        } else {
          root.style.removeProperty(key);
        }
      });
    };
  }, [cssVars]);

  const contextValue = useMemo<TeamColorContextValue>(
    () => ({
      team,
      palette,
      isYork,
      loading,
      badgeStyle,
      getReadableTextColor,
    }),
    [team, palette, isYork, loading, badgeStyle]
  );

  return (
    <TeamColorContext.Provider value={contextValue}>
      <div
        className="contents team-color-scope"
        data-team-id={teamId}
        style={cssVars as React.CSSProperties}
      >
        {children}
      </div>
    </TeamColorContext.Provider>
  );
}

export function useTeamColors(): TeamColorContextValue {
  return useContext(TeamColorContext);
}
