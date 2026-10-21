import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { createPublicRequestLimiter, requestClientKey } from "@/lib/publicRequestLimiter";
import {
  buildPublicTeamSeasonSummary,
  resolveSummaryTeamScope,
  TeamSummaryError,
  type PublicTeamSeasonSummary,
} from "@/lib/teamStatSummaryService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Every summary request costs Firestore metadata reads, so callers are throttled per instance.
const allowRequest = createPublicRequestLimiter({ windowMs: 60_000, maxPerClient: 30, maxPerInstance: 300 });
// Concurrent requests for the same team share one snapshot read; nothing is retained after it settles.
const inFlight = new Map<string, Promise<PublicTeamSeasonSummary>>();
const noStore = { "Cache-Control": "no-store" };
const unavailable = () =>
  Response.json({ error: "Public stat summaries are not available for this team." }, { status: 404, headers: noStore });

async function optionalToken(request: Request): Promise<DecodedIdToken | null | "invalid"> {
  const authorization = request.headers.get("authorization") || "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!idToken) return null;
  try {
    return await adminAuth.verifyIdToken(idToken, true);
  } catch {
    return "invalid";
  }
}

export async function GET(request: Request, context: { params: Promise<{ teamId: string }> }) {
  try {
    const { teamId } = await context.params;
    if (typeof teamId !== "string" || !teamId || teamId.length > 128) return unavailable();
    const token = await optionalToken(request);
    if (token === "invalid") {
      return Response.json({ error: "Your session could not be verified. Sign in again." }, { status: 401, headers: noStore });
    }
    // Throttle before any Firestore read, keyed by account when signed in.
    if (!allowRequest(token ? `uid:${token.uid}` : `ip:${requestClientKey(request)}`)) {
      return Response.json({ error: "Too many stat requests. Please wait a moment." }, {
        status: 429,
        headers: { ...noStore, "Retry-After": "60" },
      });
    }
    const scope = await resolveSummaryTeamScope(adminDb, teamId);
    if (!scope) return unavailable();
    // Public-league team data is readable by any signed-in user under the Firestore rules;
    // public independent teams are readable by anyone.
    if (scope.requiresSignIn && !token) {
      return Response.json({ error: "Sign in to view this team's stats." }, { status: 401, headers: noStore });
    }
    let pending = inFlight.get(scope.teamId);
    if (!pending) {
      pending = buildPublicTeamSeasonSummary(adminDb, scope).finally(() => inFlight.delete(scope.teamId));
      inFlight.set(scope.teamId, pending);
    }
    const data = await pending;
    // Never cached by browsers or CDNs: corrections must be visible on the next request.
    return Response.json({ data }, { headers: noStore });
  } catch (error) {
    if (error instanceof TeamSummaryError) {
      return Response.json({ error: error.message }, {
        status: error.status,
        headers: error.status === 503 ? { ...noStore, "Retry-After": "5" } : noStore,
      });
    }
    console.error("Team stat summary request failed:", error);
    return Response.json({ error: "Unable to load team stats." }, { status: 500, headers: noStore });
  }
}
