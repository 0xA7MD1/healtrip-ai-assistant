import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";
import { logEvent } from "@/server/http";
import { apiKeysFrom, buildCandidates, createModelRouter, parseLadder, type ModelSpec } from "./router";

/**
 * Models and keys are configuration, not code:
 *
 *   LLM_MODELS                     tiers separated by ",", models inside a tier by "|"
 *   GOOGLE_GENERATIVE_AI_API_KEY   plus _2, _3… for more keys
 *   GROQ_API_KEY                   plus _2, _3… for more keys
 *
 * The default ladder pairs a Groq and a Gemini model in every tier, so either provider can
 * carry the demo alone. router.ts decides which candidate answers each call.
 */

const DEFAULT_LADDER = [
  "groq:openai/gpt-oss-120b | google:gemini-3.8-flash",
  "groq:qwen/qwen3.8-27b | google:gemini-3.7-flash",
  "groq:openai/gpt-oss-20b | google:gemini-3.5-flash-lite",
].join(", ");

type ChatModel = ReturnType<ReturnType<typeof createGroq>>;

const PROVIDERS: Record<string, { keyVariable: string; create: (apiKey: string) => (modelId: string) => ChatModel }> = {
  google: { keyVariable: "GOOGLE_GENERATIVE_AI_API_KEY", create: (apiKey) => createGoogleGenerativeAI({ apiKey }) },
  groq: { keyVariable: "GROQ_API_KEY", create: (apiKey) => createGroq({ apiKey }) },
};

function createModel(spec: ModelSpec, apiKey: string): ChatModel {
  const provider = PROVIDERS[spec.provider];
  if (!provider) throw new Error(`Unsupported provider "${spec.provider}". Use "google" or "groq".`);
  return provider.create(apiKey)(spec.modelId);
}

let router: ReturnType<typeof createModelRouter<ChatModel>> | undefined;

function getRouter() {
  if (!router) {
    const keys = Object.fromEntries(
      Object.entries(PROVIDERS).map(([name, provider]) => [name, apiKeysFrom(process.env, provider.keyVariable)]),
    );
    const ladder = parseLadder(process.env.LLM_MODELS || DEFAULT_LADDER);
    router = createModelRouter(buildCandidates(ladder, keys, createModel));
  }
  return router;
}

/**
 * The model for one patient turn. Each call goes to the router, which picks a candidate and,
 * if it fails before answering, retries the same call on the next one.
 */
export function startModelTurn(requestId: string): { model: LanguageModel; active: () => string | undefined } {
  const turn = getRouter().startTurn((candidate, failure) =>
    logEvent("model_failover", {
      requestId,
      from: candidate.id,
      status: failure.status,
      cooling: failure.scope,
      cooldownSeconds: Math.round(failure.cooldownMs / 1000),
    }),
  );

  const model: ChatModel = {
    specificationVersion: "v4",
    provider: "router",
    modelId: "ladder",
    supportedUrls: {},
    doGenerate: (options) => turn.run((c) => c.model.doGenerate(options), options.abortSignal),
    doStream: (options) => turn.run((c) => c.model.doStream(options), options.abortSignal),
  };

  return { model, active: () => turn.current()?.id };
}

/** For /api/health: how many keys each provider has and the ladder they serve. Never the keys. */
export function describeModels(): { keys: Record<string, number>; tiers: string[][] } {
  const { candidates } = getRouter();
  const keys = Object.fromEntries(
    Object.keys(PROVIDERS).map((name) => [
      name,
      new Set(candidates.filter((c) => c.spec.provider === name).map((c) => c.key)).size,
    ]),
  );
  const tiers: string[][] = [];
  for (const { spec, tier } of candidates) {
    const label = `${spec.provider}:${spec.modelId}`;
    tiers[tier] ??= [];
    if (!tiers[tier].includes(label)) tiers[tier].push(label);
  }
  return { keys, tiers: tiers.filter(Boolean) };
}
