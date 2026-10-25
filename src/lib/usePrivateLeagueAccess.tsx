"use client";

import React, { useState } from "react";
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
  const { activeLeagueId, settings, isDemoLeague, memberLeagueIds } = useLeague();
  const { user, isLeagueAdmin, loading: authLoading } = useAuth();
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

  const email = user?.email?.trim().toLowerCase() || "";
  const isMember = Boolean(targetLeagueId && memberLeagueIds?.includes(targetLeagueId));
  const isAuthorized =
    !isPrivate ||
    isLeagueAdmin ||
    isMember ||
    Boolean(settings?.adminEmails?.some((e) => e.toLowerCase() === email));
  // Memberships come from the server; never show the lock screen to a member before they arrive.
  const isResolving = isPrivate && !isAuthorized && (authLoading || (Boolean(user) && memberLeagueIds === null));

  const isDenied = isPrivate && !isAuthorized && !isResolving;

  return {
    isPrivate,
    isAuthorized,
    isDenied,
    deniedElement: isDenied ? (
      <PrivateLeagueAccessDenied leagueName={settings?.leagueName || "Private League"} />
    ) : null,
  };
}

export default usePrivateLeagueAccess;
