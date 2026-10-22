"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isDemoTeamId, isStandaloneTeam, useTeamRecord } from "@/lib/teamRecord";
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
  isStandalone: boolean;
  loading: boolean;
  badgeStyle: { color: string; backgroundColor: string; borderColor: string };
  getReadableTextColor: (background: string, preferred: string) => string;
}

const TeamColorContext = createContext<TeamColorContextValue>({
  team: null,
  palette: DEFAULT_TEAM_COLOR_PALETTE,
  isStandalone: false,
  loading: false,
  badgeStyle: getTeamBadgeStyle(null),
  getReadableTextColor,
});

export function TeamColorScope({
  teamId,
  initialTeam,
  children,
}: {
  teamId: string;
  initialTeam?: any;
  children: React.ReactNode;
}) {
  const isDemo = isDemoTeamId(teamId);
  const record = useTeamRecord(teamId, !isDemo && !initialTeam);
  const [demoTeam, setDemoTeam] = useState<any>(null);
  const [demoLoading, setDemoLoading] = useState<boolean>(isDemo && !initialTeam);

  useEffect(() => {
    if (!isDemo || initialTeam) return;
    let cancelled = false;
    const found = getSandboxTeams().find((t) => t.id === teamId || (teamId === "team_apex" && t.id === "team_kc"));
    if (found) {
      setDemoTeam(found);
      setDemoLoading(false);
      return;
    }
    getDoc(doc(db, "teams", teamId))
      .then((snap) => { if (!cancelled && snap.exists()) setDemoTeam({ ...snap.data(), id: snap.id }); })
      .catch((e) => console.warn("Could not load team for TeamColorScope:", e))
      .finally(() => { if (!cancelled) setDemoLoading(false); });
    const handleCustomUpdate = (e: any) => {
      if (e?.detail) setDemoTeam((prev: any) => ({ ...prev, ...e.detail }));
    };
    window.addEventListener("flagos_team_updated", handleCustomUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("flagos_team_updated", handleCustomUpdate);
    };
  }, [teamId, isDemo, initialTeam]);

  const team = initialTeam || (isDemo ? demoTeam : record.team);
  const loading = !initialTeam && (isDemo ? demoLoading : !record.team && !record.resolved);
  const standalone = isStandaloneTeam(team);

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
      isStandalone: standalone,
      loading,
      badgeStyle,
      getReadableTextColor,
    }),
    [team, palette, standalone, loading, badgeStyle]
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
