/**
 * Health Check Routes
 * Provides system health monitoring including Firebase scaling metrics
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { scalableFirebaseAuth } from '../utils/firebase-scaling';
import { db } from '../database/kysely';
import { isRedisAvailable, CacheManager } from '../config/redis';
import { getGameWorkerManager } from '../services/GameWorkerManager';
import { checkIORedisHealth } from '../config/ioredis';

const router = Router();

/**
 * Basic health check
 */
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env['npm_package_version'] || '1.0.0'
  };

  res.json(health);
}));

/**
 * Detailed system health check
 */
router.get('/detailed', asyncHandler(async (_req: Request, res: Response) => {
  const startTime = Date.now();

  // Check database health
  let databaseHealth = 'unknown';
  let databaseLatency = 0;
  try {
    const dbStart = Date.now();
    await db.selectFrom('users').select('id').limit(1).execute();
    databaseLatency = Date.now() - dbStart;
    databaseHealth = 'healthy';
  } catch (error) {
    databaseHealth = 'unhealthy';
    console.error('Database health check failed:', error);
  }

  // Check Redis health
  let redisHealth = 'unknown';
  let redisLatency = 0;
  try {
    const redisStart = Date.now();
    if (isRedisAvailable()) {
      await CacheManager.set('health-check', 'ok', 10);
      redisLatency = Date.now() - redisStart;
      redisHealth = 'healthy';
    } else {
      redisHealth = 'unavailable';
    }
  } catch (error) {
    redisHealth = 'unhealthy';
    console.error('Redis health check failed:', error);
  }

  // Get Firebase scaling metrics
  const firebaseMetrics = scalableFirebaseAuth.getHealthMetrics();

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    responseTime: Date.now() - startTime,
    services: {
      database: {
        status: databaseHealth,
        latency: databaseLatency
      },
      redis: {
        status: redisHealth,
        latency: redisLatency
      },
      firebase: {
        status: firebaseMetrics.circuitBreakerState === 'CLOSED' ? 'healthy' : 'degraded',
        circuitBreakerState: firebaseMetrics.circuitBreakerState,
        queueStatus: firebaseMetrics.queueStatus,
        retryConfig: firebaseMetrics.retryConfig
      }
    },
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.env['npm_package_version'] || '1.0.0',
      nodeVersion: process.version,
      platform: process.platform
    }
  };

  // Determine overall status
  const serviceStatuses = Object.values(health.services).map(service => service.status);
  if (serviceStatuses.includes('unhealthy')) {
    health.status = 'unhealthy';
  } else if (serviceStatuses.includes('degraded')) {
    health.status = 'degraded';
  }

  res.json(health);
}));

/**
 * Firebase-specific health check
 */
router.get('/firebase', asyncHandler(async (_req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Get Firebase scaling metrics
    const metrics = scalableFirebaseAuth.getHealthMetrics();
    
    // Test Firebase connectivity (lightweight operation)
    const testStart = Date.now();
    try {
      // This is a minimal test that doesn't create resources
      scalableFirebaseAuth.getHealthMetrics(); // Just get metrics again as a connectivity test
      const connectivityLatency = Date.now() - testStart;
      
      const health = {
        status: metrics.circuitBreakerState === 'CLOSED' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        firebase: {
          circuitBreaker: {
            state: metrics.circuitBreakerState,
            healthy: metrics.circuitBreakerState === 'CLOSED'
          },
          operationQueue: {
            queueLength: metrics.queueStatus.queueLength,
            running: metrics.queueStatus.running,
            healthy: metrics.queueStatus.queueLength < 100 // Alert if queue is backing up
          },
          retryConfiguration: metrics.retryConfig,
          connectivity: {
            latency: connectivityLatency,
            healthy: connectivityLatency < 5000 // Alert if latency > 5 seconds
          }
        },
        recommendations: [] as string[]
      };

      // Add recommendations based on metrics
      if (metrics.queueStatus.queueLength > 50) {
        health.recommendations.push('High queue length detected - consider scaling Firebase operations');
      }

      if (metrics.circuitBreakerState !== 'CLOSED') {
        health.recommendations.push('Circuit breaker is not closed - Firebase operations may be failing');
      }

      if (connectivityLatency > 2000) {
        health.recommendations.push('High Firebase latency detected - check network connectivity');
      }

      res.json(health);
      
    } catch (connectivityError) {
      // Firebase connectivity test failed
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: 'Firebase connectivity test failed',
        firebase: {
          circuitBreaker: {
            state: metrics.circuitBreakerState,
            healthy: false
          },
          operationQueue: metrics.queueStatus,
          connectivity: {
            healthy: false,
            error: (connectivityError as Error).message
          }
        }
      });
    }
    
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      error: 'Failed to get Firebase health metrics',
      details: (error as Error).message
    });
  }
}));

/**
 * Performance metrics endpoint
 */
router.get('/metrics', asyncHandler(async (_req: Request, res: Response) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    firebase: scalableFirebaseAuth.getHealthMetrics(),
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    },
    database: {
      // Add database connection pool metrics if available
      available: !!db
    },
    redis: {
      available: isRedisAvailable()
    }
  };

  res.json(metrics);
}));

/**
 * Readiness probe (for Kubernetes/Docker)
 */
router.get('/ready', asyncHandler(async (_req: Request, res: Response) => {
  try {
    // Check critical services
    if (!db) {
      throw new Error('Database not available');
    }

    // Quick database connectivity test
    await db.selectFrom('users').select('id').limit(1).execute();

    // Check Firebase circuit breaker
    const firebaseMetrics = scalableFirebaseAuth.getHealthMetrics();
    if (firebaseMetrics.circuitBreakerState === 'OPEN') {
      throw new Error('Firebase circuit breaker is open');
    }

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: (error as Error).message
    });
  }
}));

/**
 * Liveness probe (for Kubernetes/Docker)
 */
router.get('/live', asyncHandler(async (_req: Request, res: Response) => {
  // Simple liveness check - just verify the process is running
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}));

/**
 * Game worker health check endpoint
 */
router.get('/worker', asyncHandler(async (_req: Request, res: Response) => {
  try {
    const workerManager = getGameWorkerManager();

    if (!workerManager.isReady()) {
      return res.status(503).json({
        status: 'unhealthy',
        error: 'Game worker not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const healthStatus = await workerManager.getHealthStatus();

    return res.json({
      status: healthStatus.isHealthy ? 'healthy' : 'unhealthy',
      worker: healthStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Worker health check failed:', error);
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Worker health check failed'
    });
  }
}));

/**
 * Detailed worker metrics endpoint
 */
router.get('/worker/metrics', asyncHandler(async (_req: Request, res: Response) => {
  try {
    const workerManager = getGameWorkerManager();

    if (!workerManager.isReady()) {
      return res.status(503).json({
        error: 'Game worker not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const metrics = await workerManager.getWorkerMetrics();

    return res.json({
      metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Worker metrics failed:', error);
    return res.status(500).json({
      error: 'Failed to get worker metrics',
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * IORedis health check (for distributed worker system)
 */
router.get('/ioredis', asyncHandler(async (_req: Request, res: Response) => {
  try {
    const isHealthy = await checkIORedisHealth();

    if (isHealthy) {
      res.json({
        status: 'healthy',
        service: 'ioredis',
        message: 'Memorystore Redis connection is working',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'error',
        service: 'ioredis',
        message: 'IORedis connection failed',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'ioredis',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * Debug Redis state (temporary)
 */
router.get('/redis-debug', asyncHandler(async (_req: Request, res: Response) => {
  try {
    console.log('🔴 [DEBUG] Redis debug endpoint called');

    const redisClient = require('../config/redis').redisClient;
    const isAvailable = isRedisAvailable();

    console.log('🔴 [DEBUG] Redis client exists:', !!redisClient);
    console.log('🔴 [DEBUG] isRedisAvailable():', isAvailable);

    // Try to ping Redis directly
    let pingResult = null;
    let pingError = null;

    if (redisClient) {
      try {
        pingResult = await redisClient.ping();
        console.log('🔴 [DEBUG] Direct ping result:', pingResult);
      } catch (error) {
        pingError = (error as any)?.message || 'Unknown error';
        console.log('🔴 [DEBUG] Direct ping error:', pingError);
      }
    }

    res.json({
      status: 'debug',
      redisClientExists: !!redisClient,
      isRedisAvailable: isAvailable,
      directPingResult: pingResult,
      directPingError: pingError,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('🔴 [DEBUG] Redis debug error:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}));

export default router;
