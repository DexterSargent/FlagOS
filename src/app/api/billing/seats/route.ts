import { readLimitedRequestBody } from "@/lib/limitedRequestBody";
import {
  applySeatChange, authenticateBillingRequest, BillingError, billingErrorResponse, previewSeatChange,
} from "@/lib/billingServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** `{ leagueId, teamCount }` previews; add `confirm: true` and the preview's `prorationDate` to apply. */
export async function POST(request: Request) {
  try {
    const token = await authenticateBillingRequest(request);
    let body: { leagueId?: unknown; teamCount?: unknown; confirm?: unknown; prorationDate?: unknown };
    try {
      body = JSON.parse(await readLimitedRequestBody(request, 2_000));
    } catch {
      throw new BillingError("Request body must be valid JSON.");
    }
    if (body.confirm === true) {
      return Response.json(await applySeatChange(token, body.leagueId, body.teamCount, body.prorationDate));
    }
    return Response.json(await previewSeatChange(token, body.leagueId, body.teamCount));
  } catch (error) {
    return billingErrorResponse(error, "Team seat change");
  }
}