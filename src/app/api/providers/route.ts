import type { NextRequest } from "next/server";
import { errorResponse, jsonResponse, logEvent, newRequestId } from "@/server/http";
import { DoctorSearchSchema } from "@/server/providers/schemas";
import { searchDoctors } from "@/server/providers/service";

/**
 * GET /api/providers?specialty=cardiology&city=Riyadh&language=en&second_opinion=true
 *
 * The same search the agent's `search_providers` tool runs, exposed as plain REST so it can
 * be called from curl, a mobile app or a partner system.
 */
export async function GET(request: NextRequest) {
  const requestId = newRequestId();
  const params = request.nextUrl.searchParams;

  const toBoolean = (value: string | null) =>
    value === null ? undefined : value === "true" || value === "1";
  const toNumber = (value: string | null) => (value === null ? undefined : Number(value));

  const parsed = DoctorSearchSchema.safeParse({
    specialty: params.get("specialty") ?? undefined,
    city: params.get("city") ?? undefined,
    country: params.get("country") ?? undefined,
    language: params.get("language") ?? undefined,
    second_opinion: toBoolean(params.get("second_opinion")),
    telemedicine: toBoolean(params.get("telemedicine")),
    max_fee: toNumber(params.get("max_fee")),
    limit: toNumber(params.get("limit")),
  });

  if (!parsed.success) {
    return errorResponse(400, "invalid_query", "Invalid search parameters.", requestId, parsed.error.issues);
  }

  try {
    const result = await searchDoctors(parsed.data);
    return jsonResponse(result, requestId);
  } catch (error) {
    logEvent("providers_search_failed", { requestId, error: String(error) });
    return errorResponse(503, "catalog_unavailable", "Provider search is temporarily unavailable.", requestId);
  }
}
