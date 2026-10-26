import { readLimitedRequestBody, RequestBodyTooLargeError } from "@/lib/limitedRequestBody";
import { BillingError, handleStripeWebhook } from "@/lib/billingServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature") || "";
  if (!signature) return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
  let body: string;
  try {
    // Signature verification needs the exact raw body.
    body = await readLimitedRequestBody(request, 512_000);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return Response.json({ error: "Payload is too large." }, { status: 413 });
    return Response.json({ error: "Could not read the event." }, { status: 400 });
  }
  try {
    return Response.json(await handleStripeWebhook(body, signature));
  } catch (error) {
    if (error instanceof BillingError) {
      if (error.status === 400) console.warn("Rejected a Stripe webhook with an invalid signature.");
      return Response.json({ error: error.message }, { status: error.status });
    }
    // A 500 makes Stripe retry delivery with backoff.
    console.error("Stripe webhook processing failed:", error);
    return Response.json({ error: "Event processing failed." }, { status: 500 });
  }
}