"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import { authenticatedPost } from "@/lib/secureWrites";
import { SCORER_GRANTS_COLLECTION, scorerGrantDocId, timestampMillis } from "@/lib/scorerAccess";

export type ScorerLink = { id: string; label: string; expiresAt: number; redeemedByEmail: string };

export async function scorerAccessRequest<T>(action: string, data: Record<string, unknown>): Promise<T> {
  const result = await authenticatedPost<{ data?: T }>("/api/scorer-access", { action, ...data }, "Scorer access request failed.");
  return result.data as T;
}

/**
 * Tracks whether the signed-in user holds an active scorer grant for this game, redeeming a
 * `?scorer=` link first when one is present. Access drops automatically when the grant expires.
 */
export function useScorerGrant(matchId: string | undefined, enabled = true) {
  const { user, loading: authLoading } = useAuth();
  const [expiresAt, setExpiresAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [redeemError, setRedeemError] = useState("");
  const [pendingToken, setPendingToken] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("scorer") || "";
  });
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!enabled || !matchId || authLoading || !user || !pendingToken) return;
    let cancelled = false;
    const cleanUrl = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("scorer");
      return url.toString();
    };
    scorerAccessRequest<{ expiresAt: number }>("redeem", { matchId, token: pendingToken })
      .then(() => {
        // The game, its teams and (for private leagues) the league itself were read before access
        // existed, so start over with the grant in place.
        if (!cancelled) window.location.replace(cleanUrl());
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setRedeemError(error.message);
        setPendingToken("");
        window.history.replaceState(null, "", cleanUrl());
      });
    return () => { cancelled = true; };
  }, [enabled, matchId, authLoading, user, pendingToken]);

  useEffect(() => {
    if (!enabled || !matchId || authLoading) return;
    if (!user) {
      setExpiresAt(0);
      setChecked(true);
      return;
    }
    if (pendingToken) return;
    const unsubscribe = onSnapshot(
      doc(db, SCORER_GRANTS_COLLECTION, scorerGrantDocId(matchId, user.uid)),
      (snap) => {
        setExpiresAt(snap.exists() ? timestampMillis(snap.get("expiresAt")) : 0);
        setChecked(true);
      },
      () => {
        setExpiresAt(0);
        setChecked(true);
      },
    );
    return unsubscribe;
  }, [enabled, matchId, authLoading, user, pendingToken]);

  useEffect(() => {
    if (!expiresAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  return {
    hasGrant: expiresAt > now,
    expiresAt,
    redeemError,
    needsSignIn: !!pendingToken && !authLoading && !user,
    loading: enabled && !!matchId && (authLoading || !!pendingToken && !!user || !checked),
  };
}
