import { readLimitedRequestBody } from "@/lib/limitedRequestBody";
import {
  appOrigin, authenticateBillingRequest, BillingError, billingErrorResponse, createCheckoutSession,
} from "@/lib/billingServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const token = await authenticateBillingRequest(request);
    let body: { kind?: unknown; teamCount?: unknown };
    try {
      body = JSON.parse(await readLimitedRequestBody(request, 2_000));
    } catch {
      throw new BillingError("Request body must be valid JSON.");
    }
    if (body?.kind !== "team" && body?.kind !== "league") throw new BillingError("Choose a team or league plan.");
    const checkout = await createCheckoutSession({
      uid: token.uid,
      email: String(token.email),
      kind: body.kind,
      teamCount: body.teamCount,
      origin: appOrigin(request),
    });
    return Response.json(checkout);
  } catch (error) {
    return billingErrorResponse(error, "Checkout session");
  }
}