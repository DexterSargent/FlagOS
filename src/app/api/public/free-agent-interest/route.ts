import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { readLimitedRequestBody, RequestBodyTooLargeError } from "@/lib/limitedRequestBody";
import { createPublicRequestLimiter, requestClientKey } from "@/lib/publicRequestLimiter";
import { isValidPublicEmail } from "@/lib/leaguePublicProfile";
import { addNotificationsToBatch } from "@/lib/notificationsServer";
import { PLATFORM_ADMIN_EMAIL } from "@/lib/platformAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4_000;
// Each submission is one Firestore write; keep public spam bounded per client and per instance.
const allowRequest = createPublicRequestLimiter({ windowMs: 10 * 60_000, maxPerClient: 3, maxPerInstance: 100 });
const noStore = { "Cache-Control": "no-store" };

const LIMITS = { name: 100, email: 254, area: 120, experience: 60, notes: 500 } as const;

function respond(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: noStore });
}

export async function POST(request: Request) {
  if (!allowRequest(`ip:${requestClientKey(request)}`)) {
    return respond({ error: "Too many submissions. Please try again later." }, 429);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(await readLimitedRequestBody(request, MAX_BODY_BYTES));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return respond({ error: "Submission is too large." }, 413);
    return respond({ error: "Invalid submission." }, 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return respond({ error: "Invalid submission." }, 400);
  }
  const data = payload as Record<string, unknown>;
  // Honeypot: real users never fill this hidden field.
  if (typeof data.website === "string" && data.website.trim()) return respond({ ok: true });

  const clean: Record<string, string> = {};
  for (const [key, max] of Object.entries(LIMITS)) {
    const value = data[key];
    if (value === undefined || value === null || value === "") continue;
    if (typeof value !== "string" || value.trim().length > max) {
      return respond({ error: `The ${key} field is invalid.` }, 400);
    }
    clean[key] = value.trim();
  }
  if (!clean.name) return respond({ error: "Please enter your name." }, 400);
  if (!clean.email || !isValidPublicEmail(clean.email)) return respond({ error: "Please enter a valid email." }, 400);
  if (!clean.area) return respond({ error: "Please enter your city or area." }, 400);
  if (data.ageConfirmed !== true) {
    return respond({ error: "Please confirm you are 18+ or have a parent or guardian's permission." }, 400);
  }

  try {
    const ref = adminDb.collection("free_agent_interest").doc();
    const batch = adminDb.batch();
    batch.create(ref, {
      ...clean,
      email: clean.email.toLowerCase(),
      status: "new",
      createdAt: FieldValue.serverTimestamp(),
    });
    addNotificationsToBatch(batch, `free-agent/${ref.id}`, "free_agent_interest", [PLATFORM_ADMIN_EMAIL], {
      subject: "New player interest on FlagOS",
      title: "A player is looking for a team",
      preheader: "Review a new free-agent submission in the admin portal.",
      paragraphs: ["A new free-agent interest form has been submitted. Review the player's details in the admin portal before contacting them. Their contact information is not included in this email."],
      action: { label: "Review player interest", path: "/admin#free-agents" },
    });
    await batch.commit();
    return respond({ ok: true });
  } catch (error) {
    console.error("Free agent interest submission failed:", error);
    return respond({ error: "We couldn't save your details. Please try again." }, 500);
  }
}
