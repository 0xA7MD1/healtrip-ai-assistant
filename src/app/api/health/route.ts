import { describeModels } from "@/server/agent/models";
import { jsonResponse, newRequestId } from "@/server/http";
import { countDoctors } from "@/server/providers/service";

/** GET /api/health — liveness plus a catalog check. Reports how many keys are set, never their values. */
export async function GET() {
  const requestId = newRequestId();
  let catalog: { ok: boolean; doctors?: number } = { ok: false };
  try {
    catalog = { ok: true, doctors: await countDoctors() };
  } catch {
    // Reported below as a degraded status.
  }
  let llm: ReturnType<typeof describeModels> | { error: string };
  try {
    llm = describeModels();
  } catch {
    llm = { error: "invalid LLM_MODELS" };
  }

  return jsonResponse(
    {
      status: catalog.ok ? "ok" : "degraded",
      catalog,
      llm,
    },
    requestId,
    { status: catalog.ok ? 200 : 503 },
  );
}
