import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit inside a window, then blocks", () => {
    const check = createRateLimiter({ limit: 2, windowMs: 60_000 });
    expect(check("ip", 0).allowed).toBe(true);
    expect(check("ip", 1).allowed).toBe(true);
    const blocked = check("ip", 2);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBe(60);
  });

  it("starts a fresh window after it expires", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 1_000 });
    check("ip", 0);
    expect(check("ip", 500).allowed).toBe(false);
    expect(check("ip", 1_000).allowed).toBe(true);
  });

  it("keeps separate windows per key", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 1_000 });
    expect(check("a", 0).allowed).toBe(true);
    expect(check("b", 0).allowed).toBe(true);
    expect(check("a", 1).allowed).toBe(false);
  });
});

describe("clientKey", () => {
  it("uses the first x-forwarded-for hop", () => {
    expect(clientKey(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("falls back to a shared bucket", () => {
    expect(clientKey(new Headers())).toBe("unknown");
  });
});
