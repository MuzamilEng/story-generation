import { NextResponse } from 'next/server';

/**
 * In-memory sliding-window rate limiter.
 *
 * Each limiter instance tracks request timestamps per key (usually userId or IP).
 * Old entries are pruned automatically on every check to prevent memory growth.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 20 });
 *   const result = limiter.check(userId);
 *   if (!result.allowed) return rateLimitResponse(result.retryAfterMs);
 */

interface RateLimiterOptions {
  /** Sliding window duration in milliseconds */
  windowMs: number;
  /** Maximum requests allowed within the window */
  max: number;
}

interface CheckResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

interface RateLimiter {
  check: (key: string) => CheckResult;
}

// Global store shared across all limiter instances — keeps related cleanup centralized
const stores = new Map<string, Map<string, number[]>>();
let cleanupScheduled = false;

/** Periodic cleanup: remove expired entries every 5 minutes to bound memory */
function scheduleCleanup() {
  if (cleanupScheduled) return;
  cleanupScheduled = true;

  setInterval(() => {
    const now = Date.now();
    for (const [, store] of stores) {
      for (const [key, timestamps] of store) {
        // Remove keys with no recent activity (oldest window across all limiters is 10 min)
        if (timestamps.length === 0 || now - timestamps[timestamps.length - 1] > 10 * 60_000) {
          store.delete(key);
        }
      }
    }
  }, 5 * 60_000).unref?.(); // unref so it doesn't keep the process alive
}

/**
 * Create a rate limiter with the given window and max requests.
 *
 * @param id - Unique identifier for this limiter (used for internal store separation)
 */
export function createRateLimiter(opts: RateLimiterOptions & { id?: string }): RateLimiter {
  const { windowMs, max, id = `limiter_${Date.now()}_${Math.random()}` } = opts;

  if (!stores.has(id)) {
    stores.set(id, new Map());
  }
  const store = stores.get(id)!;

  scheduleCleanup();

  return {
    check(key: string): CheckResult {
      const now = Date.now();
      const cutoff = now - windowMs;

      let timestamps = store.get(key);
      if (!timestamps) {
        timestamps = [];
        store.set(key, timestamps);
      }

      // Prune expired timestamps
      while (timestamps.length > 0 && timestamps[0] <= cutoff) {
        timestamps.shift();
      }

      if (timestamps.length >= max) {
        // Calculate when the oldest request in the window expires
        const retryAfterMs = timestamps[0] + windowMs - now;
        return { allowed: false, remaining: 0, retryAfterMs: Math.max(retryAfterMs, 1000) };
      }

      timestamps.push(now);
      return { allowed: true, remaining: max - timestamps.length, retryAfterMs: 0 };
    },
  };
}

/**
 * Standard 429 response with Retry-After header.
 */
export function rateLimitResponse(retryAfterMs: number) {
  const retryAfterSecs = Math.ceil(retryAfterMs / 1000);
  return NextResponse.json(
    { error: 'Too many requests. Please slow down and try again shortly.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSecs),
        'X-RateLimit-Reset': String(retryAfterSecs),
      },
    }
  );
}

/**
 * Extract a rate-limit key from a request.
 * Uses userId if available, otherwise falls back to IP + User-Agent hash.
 */
export function getRateLimitKey(req: { headers: { get(name: string): string | null } }, userId?: string | null): string {
  if (userId) return `user:${userId}`;
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  return `ip:${ip}`;
}

// ─── Pre-configured limiters for different endpoint categories ─────────────

/** Chat API: 20 requests per minute per user (LLM calls are expensive) */
export const chatLimiter = createRateLimiter({ id: 'chat', windowMs: 60_000, max: 20 });

/** Story creation: 5 per minute (creates DB records + triggers generation) */
export const storyCreateLimiter = createRateLimiter({ id: 'story-create', windowMs: 60_000, max: 5 });

/** Audio assembly: 3 per minute (heavy processing) */
export const audioAssembleLimiter = createRateLimiter({ id: 'audio-assemble', windowMs: 60_000, max: 3 });

/** Audio generate (legacy): 3 per minute */
export const audioGenerateLimiter = createRateLimiter({ id: 'audio-generate', windowMs: 60_000, max: 3 });

/** Auth signup: 5 per 5 minutes per IP (prevents account creation spam) */
export const signupLimiter = createRateLimiter({ id: 'signup', windowMs: 5 * 60_000, max: 5 });

/** Beta signup: 5 per 5 minutes per IP */
export const betaSignupLimiter = createRateLimiter({ id: 'beta-signup', windowMs: 5 * 60_000, max: 5 });

/** Waitlist: 3 per 5 minutes per IP */
export const waitlistLimiter = createRateLimiter({ id: 'waitlist', windowMs: 5 * 60_000, max: 3 });

/** General authenticated write operations: 30 per minute */
export const generalWriteLimiter = createRateLimiter({ id: 'general-write', windowMs: 60_000, max: 30 });
