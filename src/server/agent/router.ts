import { APICallError } from "ai";

/**
 * Model router: spreads chat turns over a ladder of models and API keys, and moves a call to
 * the next candidate the moment one is rate-limited or down. Free-tier quotas are per model and
 * per account, so every model × key pair is a candidate with its own quota.
 *
 *   tiers     preference order: a lower tier answers only while the whole tier above is cooling
 *   in a tier round-robin, so traffic is spread over models and keys instead of draining one
 *   cooldown  a failed candidate is skipped for a while (its retry-after, else 1 → 5 → 30 min).
 *             The patient never waits for it: the same call moves on to the next candidate.
 *   a turn    every step stays on the candidate that answered the first one, unless it fails
 *
 * State lives in memory, per server instance: a fresh instance may spend one failed call to
 * learn a cooldown. A shared store (Redis) would share what each instance learns.
 */

export interface ModelSpec {
  provider: string;
  modelId: string;
}

export interface Candidate<M> {
  /** "groq#2:openai/gpt-oss-120b": provider, key number and model. Never the key itself. */
  id: string;
  /** "groq#2": shared by every model called with that key. */
  key: string;
  spec: ModelSpec;
  tier: number;
  model: M;
}

export interface Failure {
  status: number | null;
  /** What cools down: this model on this key, the whole key, or nothing (the request was at fault). */
  scope: "candidate" | "key" | "none";
  cooldownMs: number;
}

const MINUTE = 60_000;
/** Consecutive rate limits without a retry-after: a minute window, then longer. */
const RATE_LIMIT_BACKOFF_MS = [MINUTE, 5 * MINUTE, 30 * MINUTE];
/** A daily quota does not come back within minutes, whatever the retry hint says. */
const DAILY_QUOTA_COOLDOWN_MS = 60 * MINUTE;
/** Invalid or revoked key, unknown model: skip it and check again later. */
const BROKEN_COOLDOWN_MS = 60 * MINUTE;
const TRANSIENT_COOLDOWN_MS = 30_000;
/** Failed calls answer fast (a 429 is one short round trip); this bounds the worst case. */
const MAX_ATTEMPTS_PER_CALL = 8;

/** "a|b, c|d": tiers separated by commas, models inside a tier by "|". */
export function parseLadder(spec: string): ModelSpec[][] {
  return spec
    .split(",")
    .map((tier) =>
      tier
        .split("|")
        .map((model) => model.trim())
        .filter(Boolean)
        .map(parseModel),
    )
    .filter((tier) => tier.length > 0);
}

function parseModel(spec: string): ModelSpec {
  const separator = spec.indexOf(":");
  const provider = spec.slice(0, separator);
  const modelId = spec.slice(separator + 1);
  if (separator <= 0 || !modelId) {
    throw new Error(`Unsupported model "${spec}". Use "<provider>:<model-id>".`);
  }
  return { provider, modelId };
}

/** `NAME`, `NAME_2`, `NAME_3`… in number order. Empty values and repeated keys are skipped. */
export function apiKeysFrom(env: Record<string, string | undefined>, name: string): string[] {
  const pattern = new RegExp(`^${name}(?:_(\\d+))?$`);
  const found = Object.entries(env).flatMap(([variable, value]) => {
    const match = pattern.exec(variable);
    return match && value?.trim() ? [{ order: Number(match[1] ?? 1), key: value.trim() }] : [];
  });
  return [...new Set(found.sort((a, b) => a.order - b.order).map((entry) => entry.key))];
}

/**
 * Every model of the ladder with every key of its provider. Inside a tier the list alternates
 * providers and keys, so round-robin spreads consecutive turns over different accounts.
 * A provider without keys contributes nothing.
 */
export function buildCandidates<M>(
  ladder: ModelSpec[][],
  keys: Record<string, readonly string[]>,
  create: (spec: ModelSpec, apiKey: string) => M,
): Candidate<M>[] {
  return ladder.flatMap((tier, tierIndex) => {
    const deepest = Math.max(0, ...tier.map((spec) => keys[spec.provider]?.length ?? 0));
    return Array.from({ length: deepest }, (_, keyIndex) =>
      tier.flatMap((spec) => {
        const apiKey = keys[spec.provider]?.[keyIndex];
        if (!apiKey) return [];
        const key = `${spec.provider}#${keyIndex + 1}`;
        return [{ id: `${key}:${spec.modelId}`, key, spec, tier: tierIndex, model: create(spec, apiKey) }];
      }),
    ).flat();
  });
}

function retryAfterMs(error: APICallError): number | undefined {
  const header = Number(error.responseHeaders?.["retry-after"]);
  if (Number.isFinite(header) && header > 0) return header * 1000;
  // Gemini puts the hint in the body: "retryDelay": "35s".
  const delay = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(error.responseBody ?? "");
  return delay ? Number(delay[1]) * 1000 : undefined;
}

/** How long a failed candidate should rest; `strikes` counts its failures since its last success. */
export function classifyFailure(error: unknown, strikes: number): Failure {
  if (!APICallError.isInstance(error)) {
    // Network error or timeout before an answer.
    return { status: null, scope: "candidate", cooldownMs: TRANSIENT_COOLDOWN_MS };
  }
  const status = error.statusCode ?? null;
  const body = error.responseBody ?? error.message;

  if (status === 429) {
    const backoff = RATE_LIMIT_BACKOFF_MS[Math.min(strikes, RATE_LIMIT_BACKOFF_MS.length - 1)];
    const cooldownMs = Math.max(1_000, retryAfterMs(error) ?? backoff);
    const daily = /per.?day/i.test(body);
    return { status, scope: "candidate", cooldownMs: daily ? Math.max(cooldownMs, DAILY_QUOTA_COOLDOWN_MS) : cooldownMs };
  }
  if (status === 401 || status === 403 || (status === 400 && /api.?key/i.test(body))) {
    return { status, scope: "key", cooldownMs: BROKEN_COOLDOWN_MS };
  }
  if (status === 404) return { status, scope: "candidate", cooldownMs: BROKEN_COOLDOWN_MS };
  if (status === null || status === 408 || status >= 500) {
    return { status, scope: "candidate", cooldownMs: TRANSIENT_COOLDOWN_MS };
  }
  // Another 4xx (a malformed tool call, a request too large for this model): another model
  // may accept the same request, and this one is fine for the next.
  return { status, scope: "none", cooldownMs: 0 };
}

export function createModelRouter<M>(candidates: readonly Candidate<M>[], now: () => number = Date.now) {
  /** Candidate id or key → the time it may be called again. */
  const coolingUntil = new Map<string, number>();
  const strikes = new Map<string, number>();
  /** Tier → index where the next turn starts looking. */
  const cursor = new Map<number, number>();
  const tiers = [...new Set(candidates.map((c) => c.tier))].sort((a, b) => a - b);

  const readyAt = (c: Candidate<M>) => Math.max(coolingUntil.get(c.id) ?? 0, coolingUntil.get(c.key) ?? 0);

  function pick(tried: ReadonlySet<string>, current: Candidate<M> | undefined): Candidate<M> | undefined {
    const time = now();
    if (current && !tried.has(current.id) && readyAt(current) <= time) return current;

    for (const tier of tiers) {
      const inTier = candidates.filter((c) => c.tier === tier);
      const start = cursor.get(tier) ?? 0;
      for (let offset = 0; offset < inTier.length; offset++) {
        const index = (start + offset) % inTier.length;
        const candidate = inTier[index];
        if (!tried.has(candidate.id) && readyAt(candidate) <= time) {
          cursor.set(tier, index + 1);
          return candidate;
        }
      }
    }
    // Everything is cooling: try the one that recovers first rather than fail without trying.
    return candidates.filter((c) => !tried.has(c.id)).sort((a, b) => readyAt(a) - readyAt(b))[0];
  }

  function recordFailure(candidate: Candidate<M>, error: unknown): Failure {
    const count = strikes.get(candidate.id) ?? 0;
    const failure = classifyFailure(error, count);
    if (failure.scope !== "none") {
      coolingUntil.set(failure.scope === "key" ? candidate.key : candidate.id, now() + failure.cooldownMs);
      strikes.set(candidate.id, count + 1);
    }
    return failure;
  }

  function recordSuccess(candidate: Candidate<M>): void {
    strikes.delete(candidate.id);
    coolingUntil.delete(candidate.id);
    coolingUntil.delete(candidate.key);
  }

  /** One patient turn: several calls (steps) that stay on one candidate while it works. */
  function startTurn(onFailure?: (candidate: Candidate<M>, failure: Failure) => void) {
    let current: Candidate<M> | undefined;

    async function run<T>(attempt: (candidate: Candidate<M>) => PromiseLike<T>, signal?: AbortSignal): Promise<T> {
      const tried = new Set<string>();
      let lastError: unknown = new Error("No language model is configured: add an API key.");
      for (let i = 0; i < MAX_ATTEMPTS_PER_CALL; i++) {
        const candidate = pick(tried, current);
        if (!candidate) break;
        tried.add(candidate.id);
        try {
          const result = await attempt(candidate);
          recordSuccess(candidate);
          current = candidate;
          return result;
        } catch (error) {
          // A patient closing the tab is not an outage.
          if (signal?.aborted) throw error;
          const failure = recordFailure(candidate, error);
          onFailure?.(candidate, failure);
          lastError = error;
        }
      }
      throw lastError;
    }

    return { run, current: () => current };
  }

  return { candidates, startTurn };
}
