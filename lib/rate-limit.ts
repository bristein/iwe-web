import { NextRequest, NextResponse } from 'next/server';

/**
 * Rate Limiting Strategy:
 *
 * Production Settings:
 * - Login: 10 attempts per 5 minutes (prevents brute force while allowing retries)
 * - Signup: 20 signups per hour per IP (allows testing and shared networks)
 *
 * Testing:
 * - Set DISABLE_RATE_LIMIT=true to disable rate limiting for tests
 * - Tests should use unique emails with timestamps to avoid conflicts
 *
 * Future Improvements:
 * - Use Redis for distributed rate limiting in production
 * - Implement per-email rate limiting for login attempts
 * - Add exponential backoff for repeated failures
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting
// In production, use Redis or similar distributed cache
const rateLimitStore: RateLimitStore = {};

// Clean up old entries every minute
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach((key) => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
}, 60000);

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
}

const defaultConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 requests per window
  message: 'Too many requests, please try again later',
};

export function rateLimit(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };

  return async function rateLimitMiddleware(request: NextRequest): Promise<NextResponse | null> {
    // Skip rate limiting if disabled via environment variable (for testing)
    if (process.env.DISABLE_RATE_LIMIT === 'true') {
      return null;
    }

    // Generate rate limit key
    const keyGenerator =
      finalConfig.keyGenerator ||
      ((req) => {
        // Use IP address as default key
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
        return `${req.nextUrl.pathname}:${ip}`;
      });

    const key = keyGenerator(request);
    const now = Date.now();
    const resetTime = now + finalConfig.windowMs;

    // Get or create rate limit entry
    if (!rateLimitStore[key] || rateLimitStore[key].resetTime < now) {
      rateLimitStore[key] = {
        count: 0,
        resetTime,
      };
    }

    const entry = rateLimitStore[key];
    entry.count++;

    // Check if limit exceeded
    if (entry.count > finalConfig.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      return NextResponse.json(
        { error: finalConfig.message },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': finalConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
          },
        }
      );
    }

    // Add rate limit headers to successful responses
    const remaining = finalConfig.maxRequests - entry.count;

    // Return null to indicate the request should proceed
    return null;
  };
}

// Specific rate limiters for different endpoints
export const authRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 10, // 10 attempts per 5 minutes
  message: 'Too many authentication attempts, please try again later',
});

export const signupRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20, // 20 signups per hour per IP (reasonable for testing and shared networks)
  message: 'Too many signup attempts, please try again later',
});
