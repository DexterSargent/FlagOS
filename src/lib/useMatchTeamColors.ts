"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { getSandboxTeams, subscribeDemoSandbox } from "./demoSandbox";
import { resolveTeamColorPalette, type TeamColorSource } from "./teamColors";

export interface MatchTeamColorSource {
  homeTeamId?: string;
  awayTeamId?: string;
  homeTeamColor?: string;
  awayTeamColor?: string;
  homeTeamPrimaryColor?: string;
  awayTeamPrimaryColor?: string;
  homeTeamSecondaryColor?: string;
  awayTeamSecondaryColor?: string;
  homeTeamTertiaryColor?: string;
  awayTeamTertiaryColor?: string;
}

export function useMatchTeamColors(match: MatchTeamColorSource | null, isDemo: boolean) {
  const [teams, setTeams] = useState<Record<string, TeamColorSource>>({});
  const homeId = match?.homeTeamId;
  const awayId = match?.awayTeamId;
  useEffect(() => {
    if (isDemo) {
      const refresh = () => setTeams(Object.fromEntries(getSandboxTeams().map((team) => [team.id, team])));
      refresh();
      return subscribeDemoSandbox(refresh);
    }
    setTeams({});
    if (!db) return;
    const ids = [...new Set([homeId, awayId].filter((id): id is string =>
      typeof id === "string" && !!id && !id.startsWith("opponent_"),
    ))];
    const unsubscribes = ids.map((id) => onSnapshot(
      doc(db, "teams", id),
      (snapshot) => {
        if (snapshot.exists()) setTeams((previous) => ({ ...previous, [id]: snapshot.data() }));
      },
      (error) => console.warn(`Unable to subscribe to team colors for ${id}; using match or seed colors:`, error),
    ));
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [homeId, awayId, isDemo]);

  const palette = (side: "home" | "away") => {
    const id = match?.[`${side}TeamId`];
    const fallback: TeamColorSource = {
      color: match?.[`${side}TeamColor`],
      primaryColor: match?.[`${side}TeamPrimaryColor`],
      secondaryColor: match?.[`${side}TeamSecondaryColor`],
      tertiaryColor: match?.[`${side}TeamTertiaryColor`],
    };
    return resolveTeamColorPalette(
      (id && teams[id]) || fallback,
    );
  };
  return { home: palette("home"), away: palette("away") };
}
