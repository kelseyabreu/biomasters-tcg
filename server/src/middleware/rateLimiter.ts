import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { getRedisClient } from '../config/redis';

// Rate limiters for different endpoints - initialized lazily
let generalLimiter: RateLimiterRedis | RateLimiterMemory | null = null;
let authLimiter: RateLimiterRedis | RateLimiterMemory | null = null;
let packOpeningLimiter: RateLimiterRedis | RateLimiterMemory | null = null;
let apiLimiter: RateLimiterRedis | RateLimiterMemory | null = null;

/**
 * Initialize rate limiters
 */
function initializeRateLimiters() {
  try {
    const redisClient = getRedisClient();
    
    // General API rate limiter
    generalLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl_general',
      points: 100, // Number of requests
      duration: 900, // Per 15 minutes
      blockDuration: 900, // Block for 15 minutes if limit exceeded
    });

    // Authentication rate limiter (stricter)
    authLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl_auth',
      points: 5, // Number of requests
      duration: 900, // Per 15 minutes
      blockDuration: 1800, // Block for 30 minutes if limit exceeded
    });

    // Pack opening rate limiter
    packOpeningLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl_packs',
      points: parseInt(process.env['PACK_OPENING_RATE_LIMIT'] || '10'), // Number of packs
      duration: 3600, // Per hour
      blockDuration: 3600, // Block for 1 hour if limit exceeded
    });

    // API rate limiter (per user)
    apiLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl_api',
      points: 1000, // Number of requests
      duration: 3600, // Per hour
      blockDuration: 3600, // Block for 1 hour if limit exceeded
    });

  } catch (error) {
    console.warn('⚠️ Redis not available, using memory-based rate limiting');
    
    // Fallback to memory-based rate limiting
    generalLimiter = new RateLimiterMemory({
      keyPrefix: 'rl_general',
      points: 100,
      duration: 900,
      blockDuration: 900,
    });

    authLimiter = new RateLimiterMemory({
      keyPrefix: 'rl_auth',
      points: 5,
      duration: 900,
      blockDuration: 1800,
    });

    packOpeningLimiter = new RateLimiterMemory({
      keyPrefix: 'rl_packs',
      points: parseInt(process.env['PACK_OPENING_RATE_LIMIT'] || '10'),
      duration: 3600,
      blockDuration: 3600,
    });

    apiLimiter = new RateLimiterMemory({
      keyPrefix: 'rl_api',
      points: 1000,
      duration: 3600,
      blockDuration: 3600,
    });
  }
}



/**
 * Create rate limiting middleware
 */
function createRateLimitMiddleware(
  limiter: RateLimiterRedis | RateLimiterMemory,
  keyGenerator?: (req: Request) => string
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Generate key for rate limiting
      const key = keyGenerator ? keyGenerator(req) : req.ip;
      
      // Check rate limit
      const result = await limiter.consume(key || 'anonymous');
      
      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': limiter.points.toString(),
        'X-RateLimit-Remaining': result.remainingPoints?.toString() || '0',
        'X-RateLimit-Reset': new Date(Date.now() + result.msBeforeNext).toISOString(),
      });

      next();
    } catch (rateLimiterRes) {
      // Rate limit exceeded
      const secs = Math.round((rateLimiterRes as any).msBeforeNext / 1000) || 1;
      
      res.set({
        'X-RateLimit-Limit': limiter.points.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + (rateLimiterRes as any).msBeforeNext).toISOString(),
        'Retry-After': secs.toString(),
      });

      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        retryAfter: secs,
        timestamp: new Date().toISOString()
      });
    }
  };
}

// Getter functions to ensure initialization
function getGeneralLimiter() {
  if (!generalLimiter) initializeRateLimiters();
  return generalLimiter!;
}

function getAuthLimiter() {
  if (!authLimiter) initializeRateLimiters();
  return authLimiter!;
}

function getPackOpeningLimiter() {
  if (!packOpeningLimiter) initializeRateLimiters();
  return packOpeningLimiter!;
}

function getApiLimiter() {
  if (!apiLimiter) initializeRateLimiters();
  return apiLimiter!;
}

/**
 * General rate limiter middleware
 */
export const rateLimiter = createRateLimitMiddleware(getGeneralLimiter());

/**
 * Authentication rate limiter middleware
 */
export const authRateLimiter = createRateLimitMiddleware(
  getAuthLimiter(),
  (req) => `auth_${req.ip}_${req.body?.email || 'unknown'}`
);

/**
 * Pack opening rate limiter middleware
 */
export const packOpeningRateLimiter = createRateLimitMiddleware(
  getPackOpeningLimiter(),
  (req) => req.user?.firebase_uid || req.ip || 'anonymous'
);

/**
 * API rate limiter middleware (per user)
 */
export const apiRateLimiter = createRateLimitMiddleware(
  getApiLimiter(),
  (req) => req.user?.firebase_uid || req.ip || 'anonymous'
);

/**
 * Strict rate limiter for sensitive operations
 */
function createStrictLimiter() {
  try {
    const redisClient = getRedisClient();
    return new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl_strict',
      points: 10, // Very limited requests
      duration: 3600, // Per hour
      blockDuration: 3600, // Block for 1 hour
    });
  } catch (error) {
    return new RateLimiterMemory({
      keyPrefix: 'rl_strict',
      points: 10,
      duration: 3600,
      blockDuration: 3600,
    });
  }
}

export const strictRateLimiter = createRateLimitMiddleware(createStrictLimiter());

/**
 * Custom rate limiter for specific use cases
 */
export function createCustomRateLimiter(options: {
  points: number;
  duration: number;
  blockDuration?: number;
  keyPrefix: string;
  keyGenerator?: (req: Request) => string;
}) {
  const generalLim = getGeneralLimiter();
  const limiter = new (generalLim.constructor as any)({
    storeClient: generalLim instanceof RateLimiterRedis ? getRedisClient() : undefined,
    keyPrefix: options.keyPrefix,
    points: options.points,
    duration: options.duration,
    blockDuration: options.blockDuration || options.duration,
  });

  return createRateLimitMiddleware(limiter, options.keyGenerator);
}

/**
 * Rate limiter for daily rewards
 */
export const dailyRewardRateLimiter = createCustomRateLimiter({
  points: 1, // One claim per day
  duration: 24 * 60 * 60, // 24 hours
  blockDuration: 24 * 60 * 60, // Block for 24 hours
  keyPrefix: 'rl_daily_reward',
  keyGenerator: (req) => `daily_${req.user?.firebase_uid || req.ip}_${new Date().toDateString()}`
});

/**
 * Rate limiter for password reset
 */
export const passwordResetRateLimiter = createCustomRateLimiter({
  points: 3, // 3 attempts
  duration: 3600, // Per hour
  blockDuration: 3600, // Block for 1 hour
  keyPrefix: 'rl_password_reset',
  keyGenerator: (req) => `pwd_reset_${req.ip}_${req.body?.email || 'unknown'}`
});

/**
 * Rate limiter for account creation
 */
export const accountCreationRateLimiter = createCustomRateLimiter({
  points: 3, // 3 accounts per IP
  duration: 24 * 60 * 60, // Per day
  blockDuration: 24 * 60 * 60, // Block for 24 hours
  keyPrefix: 'rl_account_creation',
  keyGenerator: (req) => `account_${req.ip}`
});
