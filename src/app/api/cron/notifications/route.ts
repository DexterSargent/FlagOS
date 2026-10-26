import { timingSafeEqual } from "node:crypto";
import { processNotificationQueue } from "@/lib/notificationsServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return Response.json({ error: "Notification scheduler is not configured." }, { status: 503 });
  const given = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const result = await processNotificationQueue();
    return Response.json(result, { status: result.failed > 0 ? 502 : 200 });
  } catch (error) {
    console.error("Notification queue processing failed:", error);
    return Response.json({ error: "Notifications could not be processed. Check notification configuration and delivery status in the admin portal." }, { status: 503 });
  }
}
