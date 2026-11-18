// In-memory sliding-window rate limiter per IP for route protection.
// In distributed multi-region production, this can be swapped with Upstash Redis / Vercel KV.

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

const trackers = new Map<string, number[]>();

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { windowMs: 60_000, max: 30 }
): { success: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const timestamps = (trackers.get(identifier) || []).filter((t) => t > windowStart);

  if (timestamps.length >= config.max) {
    trackers.set(identifier, timestamps);
    return { success: false, remaining: 0 };
  }

  timestamps.push(now);
  trackers.set(identifier, timestamps);
  return { success: true, remaining: config.max - timestamps.length };
}

// Periodic cleanup to avoid memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const threshold = Date.now() - 300_000; // 5 mins
    for (const [id, times] of trackers.entries()) {
      const active = times.filter((t) => t > threshold);
      if (active.length === 0) {
        trackers.delete(id);
      } else {
        trackers.set(id, active);
      }
    }
  }, 120_000);
}
