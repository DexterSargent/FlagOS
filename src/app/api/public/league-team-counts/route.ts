import { adminDb } from "@/lib/firebaseAdmin";
import { createPublicRequestLimiter, requestClientKey } from "@/lib/publicRequestLimiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Directory cards need real team counts, but team docs in league collections are not listable
// by signed-out visitors. Counts for public leagues are computed here and shared per instance.
const allowRequest = createPublicRequestLimiter({ windowMs: 60_000, maxPerClient: 20, maxPerInstance: 300 });
const CACHE_MS = 5 * 60_000;
let cached: { counts: Record<string, number>; expiresAt: number } | null = null;
let inFlight: Promise<Record<string, number>> | null = null;

const NON_TEAM_NAMES = new Set(["free agent", "free agents"]);

async function loadCounts(): Promise<Record<string, number>> {
  const leaguesSnap = await adminDb.collection("leagues").select("visibility").limit(500).get();
  const publicLeagueIds = new Set(
    leaguesSnap.docs.filter((doc) => doc.get("visibility") !== "private").map((doc) => doc.id),
  );
  const teamsSnap = await adminDb.collection("teams").select("leagueId", "name").limit(5000).get();
  const counts: Record<string, number> = {};
  for (const doc of teamsSnap.docs) {
    const leagueId = doc.get("leagueId");
    if (typeof leagueId !== "string" || !publicLeagueIds.has(leagueId)) continue;
    const name = String(doc.get("name") || "").trim().toLowerCase();
    if (!name || NON_TEAM_NAMES.has(name) || doc.id === "team_free_agents") continue;
    counts[leagueId] = (counts[leagueId] || 0) + 1;
  }
  return counts;
}

export async function GET(request: Request) {
  if (!allowRequest(`ip:${requestClientKey(request)}`)) {
    return Response.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": "60" } });
  }
  try {
    if (!cached || cached.expiresAt <= Date.now()) {
      inFlight ??= loadCounts().finally(() => { inFlight = null; });
      const counts = await inFlight;
      cached = { counts, expiresAt: Date.now() + CACHE_MS };
    }
    return Response.json({ counts: cached.counts }, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (error) {
    console.error("League team count request failed:", error);
    return Response.json({ error: "Unable to load team counts." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
