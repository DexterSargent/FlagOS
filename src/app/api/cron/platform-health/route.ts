import { timingSafeEqual } from "node:crypto";
import { runPlatformHealthJob } from "@/lib/platformJobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function secretMatches(header: string, secret: string): boolean {
  const given = Buffer.from(header.startsWith("Bearer ") ? header.slice(7) : "");
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Scheduled platform health job. It is throttled to one run per ~20 hours and returns no
 * private data, but like the notifications cron it refuses to run until CRON_SECRET is configured.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return Response.json({ error: "Platform health scheduler is not configured." }, { status: 503 });
  const authorized = secretMatches(request.headers.get("authorization") || "", secret);
  if (!authorized) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const force = new URL(request.url).searchParams.get("force") === "1";
  try {
    const result = await runPlatformHealthJob(Date.now(), { force });
    return Response.json(result);
  } catch (error) {
    console.error("Platform health job failed:", error);
    return Response.json({ error: "The health job failed." }, { status: 500 });
  }
}
