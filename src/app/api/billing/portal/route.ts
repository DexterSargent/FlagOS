import { readLimitedRequestBody } from "@/lib/limitedRequestBody";
import {
  appOrigin, authenticateBillingRequest, BillingError, billingErrorResponse, createPortalSession,
} from "@/lib/billingServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const token = await authenticateBillingRequest(request);
    let body: { kind?: unknown; entityId?: unknown };
    try {
      body = JSON.parse(await readLimitedRequestBody(request, 2_000));
    } catch {
      throw new BillingError("Request body must be valid JSON.");
    }
    const path = body.kind === "league" ? `/league/${String(body.entityId)}` : `/teams/${String(body.entityId)}`;
    const url = await createPortalSession(token, body.kind, body.entityId, `${appOrigin(request)}${path}`);
    return Response.json({ url });
  } catch (error) {
    return billingErrorResponse(error, "Billing portal");
  }
}