"use client";

import React, { useState, useEffect } from "react";
import { useLeague } from "@/lib/leagueContext";
import { useAuth } from "@/lib/authContext";
import PrivateLeagueAccessDenied from "@/components/PrivateLeagueAccessDenied";

export function usePrivateLeagueAccess(
  contextLeagueIdOrOptions?: string | { contextLeagueId?: string; isPrivateOverride?: boolean }
) {
  const options =
    typeof contextLeagueIdOrOptions === "string"
      ? { contextLeagueId: contextLeagueIdOrOptions }
      : contextLeagueIdOrOptions || {};
  const { activeLeagueId, settings, isDemoLeague } = useLeague();
  const { user } = useAuth();
  const [isEmbedded] = useState(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("embed") === "true" || sp.get("demo") === "true";
    }
    return false;
  });

  const isEffectiveDemo = isDemoLeague || isEmbedded;
  const targetLeagueId = options.contextLeagueId || activeLeagueId;

  const isPrivate =
    Boolean(options.isPrivateOverride) ||
    targetLeagueId === "league_private_live" ||
    (settings?.visibility === "private" && !isEffectiveDemo);

  const isAuthorized =
    !isPrivate ||
    user?.email?.trim().toLowerCase() === "dextersargent@flagos.ca" ||
    user?.email?.trim().toLowerCase() === "dextersargent@gmail.com" ||
    Boolean(
      settings?.adminEmails &&
        settings.adminEmails.some(
          (e) => e.toLowerCase() === user?.email?.trim().toLowerCase()
        )
    );

  const isDenied = isPrivate && !isAuthorized;

  return {
    isPrivate,
    isAuthorized,
    isDenied,
    deniedElement: isDenied ? (
      <PrivateLeagueAccessDenied
        requiredEmail="dextersargent@gmail.com"
        leagueName={settings?.leagueName || "Private League"}
      />
    ) : null,
  };
}

export default usePrivateLeagueAccess;
