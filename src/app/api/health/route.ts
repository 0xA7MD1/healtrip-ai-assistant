import { jsonResponse, newRequestId } from "@/server/http";
import { countDoctors } from "@/server/providers/service";

/** GET /api/health — liveness plus a catalog check. Reports which keys are set, never their values. */
export async function GET() {
  const requestId = newRequestId();
  let catalog: { ok: boolean; doctors?: number } = { ok: false };
  try {
    catalog = { ok: true, doctors: await countDoctors() };
  } catch {
    // Reported below as a degraded status.
  }

  return jsonResponse(
    {
      status: catalog.ok ? "ok" : "degraded",
      catalog,
      llm: {
        google: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
        groq: Boolean(process.env.GROQ_API_KEY),
      },
    },
    requestId,
    { status: catalog.ok ? 200 : 503 },
  );
}
