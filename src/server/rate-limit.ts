/**
 * Fixed-window, in-memory rate limiter keyed by client IP.
 *
 * Good enough for a single-region prototype: each serverless instance keeps its own window,
 * so the real limit is "per instance". A production deployment would move this to a shared
 * store (Upstash/Redis) behind the same interface.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets; sent as `Retry-After` when blocked. */
  retryAfterSeconds: number;
}

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const windows = new Map<string, { count: number; resetAt: number }>();

  return function check(key: string, now = Date.now()): RateLimitResult {
    // Drop expired windows opportunistically so the map cannot grow without bound.
    if (windows.size > 10_000) {
      for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
    }

    let window = windows.get(key);
    if (!window || window.resetAt <= now) {
      window = { count: 0, resetAt: now + windowMs };
      windows.set(key, window);
    }
    window.count += 1;

    return {
      allowed: window.count <= limit,
      remaining: Math.max(0, limit - window.count),
      retryAfterSeconds: Math.ceil((window.resetAt - now) / 1000),
    };
  };
}

/** First hop of `x-forwarded-for` (set by Vercel), else a shared bucket. */
export function clientKey(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
