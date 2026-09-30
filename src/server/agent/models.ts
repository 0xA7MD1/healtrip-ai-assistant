import "server-only";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { wrapLanguageModel, type LanguageModel, type LanguageModelMiddleware } from "ai";
import { logEvent } from "@/server/http";

/**
 * Models are configuration, not code: `LLM_PRIMARY_MODEL` / `LLM_FALLBACK_MODEL` hold
 * "<provider>:<model-id>". Both default to free tiers. When the primary fails before it
 * starts answering (rate limit, outage, bad model id, network), the same request is replayed
 * on the fallback, so a Gemini 429 costs the patient a second of latency instead of an error.
 */

const DEFAULT_PRIMARY = "google:gemini-3.8-flash";
const DEFAULT_FALLBACK = "groq:openai/gpt-oss-120b";

type ProviderModel = ReturnType<typeof google> | ReturnType<typeof groq>;

function resolveModel(spec: string): ProviderModel {
  const separator = spec.indexOf(":");
  const provider = spec.slice(0, separator);
  const modelId = spec.slice(separator + 1);
  if (separator > 0 && modelId) {
    if (provider === "google") return google(modelId);
    if (provider === "groq") return groq(modelId);
  }
  throw new Error(`Unsupported model "${spec}". Use "google:<id>" or "groq:<id>".`);
}

function statusOf(error: unknown): number | undefined {
  const status = (error as { statusCode?: unknown } | null)?.statusCode;
  return typeof status === "number" ? status : undefined;
}

function withFallback(primary: ProviderModel, fallback: ProviderModel): LanguageModel {
  const switchOver = (error: unknown, abortSignal: AbortSignal | undefined) => {
    // A patient closing the tab is not an outage.
    if (abortSignal?.aborted) return false;
    logEvent("model_fallback", {
      from: `${primary.provider}:${primary.modelId}`,
      to: `${fallback.provider}:${fallback.modelId}`,
      status: statusOf(error) ?? null,
    });
    return true;
  };

  const middleware: LanguageModelMiddleware = {
    specificationVersion: "v4",
    wrapGenerate: async ({ doGenerate, params }) => {
      try {
        return await doGenerate();
      } catch (error) {
        if (!switchOver(error, params.abortSignal)) throw error;
        return fallback.doGenerate(params);
      }
    },
    wrapStream: async ({ doStream, params }) => {
      try {
        return await doStream();
      } catch (error) {
        if (!switchOver(error, params.abortSignal)) throw error;
        return fallback.doStream(params);
      }
    },
  };

  return wrapLanguageModel({ model: primary, middleware });
}

let chatModel: LanguageModel | undefined;

export function getChatModel(): LanguageModel {
  chatModel ??= withFallback(
    resolveModel(process.env.LLM_PRIMARY_MODEL || DEFAULT_PRIMARY),
    resolveModel(process.env.LLM_FALLBACK_MODEL || DEFAULT_FALLBACK),
  );
  return chatModel;
}
