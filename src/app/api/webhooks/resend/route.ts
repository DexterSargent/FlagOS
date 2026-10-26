import { Webhook } from "svix";
import { readLimitedRequestBody, RequestBodyTooLargeError } from "@/lib/limitedRequestBody";
import { recordNotificationEvent } from "@/lib/notificationsServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) return Response.json({ error: "Email webhook is not configured." }, { status: 503 });
  let body: string;
  try {
    body = await readLimitedRequestBody(request, 64_000);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return Response.json({ error: "Payload is too large." }, { status: 413 });
    console.error("Email webhook body could not be read:", error);
    return Response.json({ error: "Could not read email event." }, { status: 400 });
  }
  let payload: unknown;
  try {
    new Webhook(secret).verify(body, {
      "svix-id": request.headers.get("svix-id") || "",
      "svix-timestamp": request.headers.get("svix-timestamp") || "",
      "svix-signature": request.headers.get("svix-signature") || "",
    });
    payload = JSON.parse(body);
  } catch {
    console.warn("Rejected an email webhook with an invalid signature or payload.");
    return Response.json({ error: "Invalid webhook signature or payload." }, { status: 400 });
  }
  try {
    return Response.json(await recordNotificationEvent(payload));
  } catch (error) {
    console.error("Email webhook processing failed:", error);
    return Response.json({ error: "Email event could not be recorded." }, { status: 500 });
  }
}
