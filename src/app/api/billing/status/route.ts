import { readLimitedRequestBody } from "@/lib/limitedRequestBody";
import {
  authenticateBillingRequest, BillingError, billingErrorResponse, getBillingRequestForUser, isBillingEnabled,
  listUnusedPurchases,
} from "@/lib/billingServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public: whether paid checkout is switched on (no account details). */
export async function GET() {
  return Response.json({ enabled: isBillingEnabled() }, { headers: { "Cache-Control": "no-store" } });
}

/** `{ requestId }` confirms one checkout with Stripe; `{}` lists paid purchases not yet set up. */
export async function POST(request: Request) {
  try {
    const token = await authenticateBillingRequest(request);
    let body: { requestId?: unknown };
    try {
      body = JSON.parse((await readLimitedRequestBody(request, 1_000)) || "{}");
    } catch {
      throw new BillingError("Request body must be valid JSON.");
    }
    if (body.requestId !== undefined) return Response.json(await getBillingRequestForUser(body.requestId, token.uid));
    return Response.json({ enabled: isBillingEnabled(), unused: await listUnusedPurchases(token.uid) });
  } catch (error) {
    return billingErrorResponse(error, "Checkout status");
  }
}