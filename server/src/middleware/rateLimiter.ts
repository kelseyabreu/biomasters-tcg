import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { getRedisClient } from '../config/redis';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

// Rate limiters for different endpoints - initialized lazily
let generalLimiter: RateLimiterRedis | RateLimiterMemory | null = null;
let authLimiter: RateLimiterRedis | RateLimiterMemory | null = null;
let packOpeningLimiter: RateLimiterRedis | RateLimiterMemory | null = null;
let apiLimiter: RateLimiterRedis | RateLimiterMemory | null = null;

/**
 * Get rate limit configuration from environment variables
 */
function getRateLimitConfig() {
  return {
    general: {
      points: parseInt(process.env['RATE_LIMIT_GENERAL_POINTS'] || '100'),
      duration: parseInt(process.env['RATE_LIMIT_GENERAL_DURATION'] || '900'),
      blockDuration: parseInt(process.env['RATE_LIMIT_GENERAL_BLOCK_DURATION'] || '900')
    },
    auth: {
      points: parseInt(process.env['RATE_LIMIT_AUTH_POINTS'] || '1000'),
      duration: parseInt(process.env['RATE_LIMIT_AUTH_DURATION'] || '900'),
      blockDuration: parseInt(process.env['RATE_LIMIT_AUTH_BLOCK_DURATION'] || '1800')
    },
    packs: {
      points: parseInt(process.env['PACK_OPENING_RATE_LIMIT'] || '10'),
      duration: 3600,
      blockDuration: 3600
    },
    api: {
      points: parseInt(process.env['RATE_LIMIT_API_POINTS'] || '1000'),
      duration: parseInt(process.env['RATE_LIMIT_API_DURATION'] || '3600'),
      blockDuration: parseInt(process.env['RATE_LIMIT_API_BLOCK_DURATION'] || '3600')
    },
    strict: {
      points: parseInt(process.env['RATE_LIMIT_STRICT_POINTS'] || '10'),
      duration: parseInt(process.env['RATE_LIMIT_STRICT_DURATION'] || '3600'),
      blockDuration: parseInt(process.env['RATE_LIMIT_STRICT_BLOCK_DURATION'] || '3600')
    }
  };
}

/**
 * Initialize rate limiters
 */
function initializeRateLimiters() {
  const config = getRateLimitConfig();

  console.log(`🔧 Rate Limiter Configuration:
    General: ${config.general.points} requests per ${config.general.duration}s
    Auth: ${config.auth.points} requests per ${config.auth.duration}s
    API: ${config.api.points} requests per ${config.api.duration}s
    Strict: ${config.strict.points} requests per ${config.strict.duration}s`);

  try {
    const redisClient = getRedisClient();

    // General API rate limiter
    generalLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl_general',
      points: config.general.points,
      duration: config.general.duration,
      blockDuration: config.general.blockDuration,
    });

    // Authentication rate limiter
    authLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl_auth',
      points: config.auth.points,
      duration: config.auth.duration,
      blockDuration: config.auth.blockDuration,
    });

    // Pack opening rate limiter
    packOpeningLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl_packs',
      points: config.packs.points,
      duration: config.packs.duration,
      blockDuration: config.packs.blockDuration,
    });

    // API rate limiter (per user)
    apiLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl_api',
      points: config.api.points,
      duration: config.api.duration,
      blockDuration: config.api.blockDuration,
    });

  } catch (error) {
    console.warn('⚠️ Redis not available, using memory-based rate limiting');

    // Fallback to memory-based rate limiting
    generalLimiter = new RateLimiterMemory({
      keyPrefix: 'rl_general',
      points: config.general.points,
      duration: config.general.duration,
      blockDuration: config.general.blockDuration,
    });

    authLimiter = new RateLimiterMemory({
      keyPrefix: 'rl_auth',
      points: config.auth.points,
      duration: config.auth.duration,
      blockDuration: config.auth.blockDuration,
    });

    packOpeningLimiter = new RateLimiterMemory({
      keyPrefix: 'rl_packs',
      points: config.packs.points,
      duration: config.packs.duration,
      blockDuration: config.packs.blockDuration,
    });

    apiLimiter = new RateLimiterMemory({
      keyPrefix: 'rl_api',
      points: config.api.points,
      duration: config.api.duration,
      blockDuration: config.api.blockDuration,
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
  const config = getRateLimitConfig();

  try {
    const redisClient = getRedisClient();
    return new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl_strict',
      points: config.strict.points,
      duration: config.strict.duration,
      blockDuration: config.strict.blockDuration,
    });
  } catch (error) {
    return new RateLimiterMemory({
      keyPrefix: 'rl_strict',
      points: config.strict.points,
      duration: config.strict.duration,
      blockDuration: config.strict.blockDuration,
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
  points: parseInt(process.env['RATE_LIMIT_DAILY_REWARD_POINTS'] || '1'),
  duration: parseInt(process.env['RATE_LIMIT_DAILY_REWARD_DURATION'] || '86400'), // 24 hours
  blockDuration: parseInt(process.env['RATE_LIMIT_DAILY_REWARD_BLOCK_DURATION'] || '86400'),
  keyPrefix: 'rl_daily_reward',
  keyGenerator: (req) => `daily_${req.user?.firebase_uid || req.ip}_${new Date().toDateString()}`
});

/**
 * Rate limiter for password reset
 */
export const passwordResetRateLimiter = createCustomRateLimiter({
  points: parseInt(process.env['RATE_LIMIT_PASSWORD_RESET_POINTS'] || '3'),
  duration: parseInt(process.env['RATE_LIMIT_PASSWORD_RESET_DURATION'] || '3600'),
  blockDuration: parseInt(process.env['RATE_LIMIT_PASSWORD_RESET_BLOCK_DURATION'] || '3600'),
  keyPrefix: 'rl_password_reset',
  keyGenerator: (req) => `pwd_reset_${req.ip}_${req.body?.email || 'unknown'}`
});

/**
 * Rate limiter for account creation
 */
export const accountCreationRateLimiter = createCustomRateLimiter({
  points: parseInt(process.env['RATE_LIMIT_ACCOUNT_CREATION_POINTS'] || '3'),
  duration: parseInt(process.env['RATE_LIMIT_ACCOUNT_CREATION_DURATION'] || '86400'), // 24 hours
  blockDuration: parseInt(process.env['RATE_LIMIT_ACCOUNT_CREATION_BLOCK_DURATION'] || '86400'),
  keyPrefix: 'rl_account_creation',
  keyGenerator: (req) => `account_${req.ip}`
});
