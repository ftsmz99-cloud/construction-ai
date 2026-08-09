// =====================================
// IN-MEMORY RATE LIMITER (PER IP)
// =====================================
// Minimal, dependency-free fixed-window rate limiter used to protect the
// public widget chat endpoint (cost protection) and the login endpoint
// (brute-force protection).
//
// Deliberately uses process memory and NO database / Redis: buckets reset on
// server restart, which is acceptable for a single-process small SaaS V1.
//
// Buckets are keyed by client IP. Expired buckets are purged periodically so
// the map cannot grow unbounded, and a hard size cap provides a safety net.

const buckets = new Map();

const PURGE_INTERVAL_MS = 60 * 1000; // purge scan at most once per minute
const MAX_BUCKETS = 10000;

let lastPurgeAt = 0;

function purgeExpired(now) {
  // Run at most once per minute so request latency stays flat.
  if (now - lastPurgeAt < PURGE_INTERVAL_MS) {
    return;
  }
  lastPurgeAt = now;

  if (buckets.size > MAX_BUCKETS) {
    buckets.clear();
    return;
  }

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

/**
 * Creates a rate-limiting middleware.
 *
 * @param {object} options
 * @param {number} options.windowMs  Bucket window length in milliseconds.
 * @param {number} options.max       Max requests allowed per window per IP.
 * @param {string} options.name      Prefix for the bucket key (isolates limits).
 * @returns {Function} Express middleware.
 */
export default function createRateLimiter({
  windowMs = 60 * 1000,
  max = 10,
  name = "request"
}) {
  return function rateLimit(req, res, next) {
    const now = Date.now();
    purgeExpired(now);

    const key = `${name}:${req.ip || "unknown"}`;

    const current = { count: 1, resetAt: now + windowMs };

    const bucket = buckets.get(key);
    if (bucket && bucket.resetAt > now) {
      current.count = bucket.count + 1;
      current.resetAt = bucket.resetAt;
    }

    buckets.set(key, current);

    if (current.count > max) {
      const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({
        success: false,
        error: `Too many requests. Please try again in ${retryAfter} second(s).`
      });
    }

    next();
  };
}