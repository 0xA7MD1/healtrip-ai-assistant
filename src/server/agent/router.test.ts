import { APICallError } from "ai";
import { describe, expect, it } from "vitest";
import { apiKeysFrom, buildCandidates, classifyFailure, createModelRouter, parseLadder } from "./router";

function apiError(statusCode: number, { retryAfter, body = "" }: { retryAfter?: string; body?: string } = {}) {
  return new APICallError({
    message: `HTTP ${statusCode}`,
    url: "https://provider.test",
    requestBodyValues: {},
    statusCode,
    responseHeaders: retryAfter ? { "retry-after": retryAfter } : {},
    responseBody: body,
  });
}

/** Tier 0: groq:big and google:flash on two Groq keys and one Google key. Tier 1: groq:small. */
function setup() {
  let time = 0;
  const candidates = buildCandidates(
    parseLadder("groq:big | google:flash, groq:small"),
    { groq: ["gk1", "gk2"], google: ["ak1"] },
    (spec, apiKey) => `${spec.modelId}@${apiKey}`,
  );
  const router = createModelRouter(candidates, () => time);
  /** Candidate ids that fail, with the error each one throws. */
  const failing = new Map<string, unknown>();
  const calls: string[] = [];
  const call = (turn: ReturnType<typeof router.startTurn>) =>
    turn.run(async (c) => {
      calls.push(c.id);
      if (failing.has(c.id)) throw failing.get(c.id);
      return c.id;
    });
  return { router, failing, calls, call, advance: (ms: number) => (time += ms) };
}

describe("configuration", () => {
  it("parses tiers and the models inside each tier", () => {
    expect(parseLadder("groq:openai/gpt-oss-120b | google:gemini-3.8-flash, groq:qwen/qwen3.8-27b")).toEqual([
      [
        { provider: "groq", modelId: "openai/gpt-oss-120b" },
        { provider: "google", modelId: "gemini-3.8-flash" },
      ],
      [{ provider: "groq", modelId: "qwen/qwen3.8-27b" }],
    ]);
    expect(() => parseLadder("gemini-3.8-flash")).toThrow(/provider/);
  });

  it("reads numbered keys in order and skips empty or repeated ones", () => {
    const env = { GROQ_API_KEY_3: "c", GROQ_API_KEY: "a", GROQ_API_KEY_2: " ", GROQ_API_KEY_4: "a", OTHER: "x" };
    expect(apiKeysFrom(env, "GROQ_API_KEY")).toEqual(["a", "c"]);
  });

  it("makes one candidate per model and key, alternating providers and keys, without the key in the id", () => {
    const { router } = setup();
    expect(router.candidates.map((c) => c.id)).toEqual([
      "groq#1:big",
      "google#1:flash",
      "groq#2:big",
      "groq#1:small",
      "groq#2:small",
    ]);
    expect(JSON.stringify(router.candidates.map((c) => [c.id, c.key]))).not.toMatch(/gk1|ak1/);
  });

  it("skips a provider that has no key", () => {
    const candidates = buildCandidates(parseLadder("google:flash | groq:big"), { groq: ["k"] }, () => null);
    expect(candidates.map((c) => c.id)).toEqual(["groq#1:big"]);
  });
});

describe("createModelRouter", () => {
  it("spreads consecutive turns over the models and keys of the first tier", async () => {
    const { router, call } = setup();
    const firsts = [];
    for (let i = 0; i < 4; i++) firsts.push(await call(router.startTurn()));
    expect(firsts).toEqual(["groq#1:big", "google#1:flash", "groq#2:big", "groq#1:big"]);
  });

  it("keeps every step of a turn on the same candidate", async () => {
    const { router, call } = setup();
    const turn = router.startTurn();
    const steps = [await call(turn), await call(turn), await call(turn)];
    expect(new Set(steps).size).toBe(1);
  });

  it("moves a rate-limited call to the next candidate at once and rests the failed one for its retry-after", async () => {
    const { router, failing, calls, call, advance } = setup();
    failing.set("groq#1:big", apiError(429, { retryAfter: "20" }));
    const failures: string[] = [];
    const turn = router.startTurn((c, f) => failures.push(`${c.id} ${f.cooldownMs}`));

    expect(await call(turn)).toBe("google#1:flash");
    expect(failures).toEqual(["groq#1:big 20000"]);
    // The rest of the turn stays on the candidate that answered.
    expect(await call(turn)).toBe("google#1:flash");

    failing.clear();
    calls.length = 0;
    advance(19_000);
    for (let i = 0; i < 2; i++) await call(router.startTurn());
    expect(calls).not.toContain("groq#1:big");
    advance(1_000);
    for (let i = 0; i < 3; i++) await call(router.startTurn());
    expect(calls).toContain("groq#1:big");
  });

  it("uses a lower tier only while the whole tier above is cooling", async () => {
    const { router, failing, call } = setup();
    for (const id of ["groq#1:big", "google#1:flash", "groq#2:big"]) failing.set(id, apiError(429));
    expect(await call(router.startTurn())).toBe("groq#1:small");
  });

  it("tries the candidate that recovers first when every one is cooling", async () => {
    const { router, failing, calls, call } = setup();
    for (const c of router.candidates) failing.set(c.id, apiError(429, { retryAfter: "60" }));
    failing.set("groq#2:small", apiError(429, { retryAfter: "5" }));
    await expect(call(router.startTurn())).rejects.toThrow("HTTP 429");

    failing.clear();
    calls.length = 0;
    expect(await call(router.startTurn())).toBe("groq#2:small");
  });

  it("cools every model of a key that is invalid or revoked", async () => {
    const { router, failing, calls, call } = setup();
    failing.set("groq#1:big", apiError(401));
    await call(router.startTurn());
    failing.clear();
    calls.length = 0;
    for (let i = 0; i < 6; i++) await call(router.startTurn());
    expect(calls.filter((id) => id.startsWith("groq#1:"))).toEqual([]);
  });

  it("does not rest a model for a request it rejected", async () => {
    const { router, failing, calls, call } = setup();
    failing.set("groq#1:big", apiError(400, { body: "tool call validation failed" }));
    expect(await call(router.startTurn())).toBe("google#1:flash");

    failing.clear();
    calls.length = 0;
    await call(router.startTurn());
    await call(router.startTurn());
    expect(calls).toEqual(["groq#2:big", "groq#1:big"]);
  });

  it("fails the call only after every candidate failed", async () => {
    const { router, failing, calls, call } = setup();
    for (const c of router.candidates) failing.set(c.id, apiError(503));
    await expect(call(router.startTurn())).rejects.toThrow("HTTP 503");
    expect(calls).toHaveLength(router.candidates.length);
  });

  it("stops at once when the patient aborts", async () => {
    const { router, failing, calls } = setup();
    failing.set("groq#1:big", apiError(500));
    const controller = new AbortController();
    const turn = router.startTurn();
    const run = turn.run(async (c) => {
      calls.push(c.id);
      controller.abort();
      throw failing.get(c.id);
    }, controller.signal);
    await expect(run).rejects.toThrow("HTTP 500");
    expect(calls).toEqual(["groq#1:big"]);
  });
});

describe("classifyFailure", () => {
  it("backs off 1, 5, then 30 minutes on repeated rate limits without a hint", () => {
    expect([0, 1, 2, 3].map((strikes) => classifyFailure(apiError(429), strikes).cooldownMs)).toEqual([
      60_000, 300_000, 1_800_000, 1_800_000,
    ]);
  });

  it("reads Gemini's retryDelay, but rests a spent daily quota for at least an hour", () => {
    expect(classifyFailure(apiError(429, { body: '{"retryDelay": "35s"}' }), 0).cooldownMs).toBe(35_000);
    const daily = apiError(429, { body: '{"quotaId": "GenerateRequestsPerDayPerProjectPerModel", "retryDelay": "35s"}' });
    expect(classifyFailure(daily, 0).cooldownMs).toBe(3_600_000);
  });

  it("treats network errors and 5xx as short outages", () => {
    expect(classifyFailure(new TypeError("fetch failed"), 0)).toMatchObject({ scope: "candidate", cooldownMs: 30_000 });
    expect(classifyFailure(apiError(503), 0)).toMatchObject({ scope: "candidate", cooldownMs: 30_000 });
  });

  it("blames the key for an invalid API key, whatever the status code", () => {
    expect(classifyFailure(apiError(400, { body: "API key not valid" }), 0).scope).toBe("key");
    expect(classifyFailure(apiError(403), 0).scope).toBe("key");
  });
});
