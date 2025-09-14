import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';

// Load environment variables
dotenv.config();

// Debug: Check if DATABASE_URL is loaded
console.log('🔍 Environment check:');
console.log('  DATABASE_URL:', process.env['DATABASE_URL'] ? 'Present' : 'Missing');
console.log('  NODE_ENV:', process.env['NODE_ENV']);
console.log('  Working directory:', process.cwd());

// Import configurations and middleware
import { initializeFirebase } from './config/firebase';
import { initializeKysely } from './database/kysely';
import { initializeRedis } from './config/redis';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/logger';

// Import routes
import authRoutes from './routes/auth';
import guestAuthRoutes from './routes/guestAuth';
import userRoutes from './routes/users';
import cardRoutes from './routes/cards';
import deckRoutes from './routes/decks';
import syncRoutes from './routes/sync';
import gameRoutes from './routes/game';
import adminRoutes from './routes/admin';
import localizationRoutes from './routes/localization';
import staticDataRoutes from './routes/staticData';
import testRoutes from './routes/test';
import matchmakingRoutes from './routes/matchmaking';
import ratingsRoutes from './routes/ratings';
import questsRoutes from './routes/quests';

// Import unified data loader factory
import { createProductionDataLoader, createDevelopmentDataLoader } from '../../shared/data/UnifiedDataLoader';

// Import WebSocket setup
import { setupGameSocket } from './websocket/gameSocket';

// Import game data manager
// DataLoader import removed - using direct file system loading instead

const app = express();
const PORT = process.env['PORT'] || 3001;

// Basic health check endpoint (defined first to avoid middleware conflicts)
app.get('/health', async (_req, res) => {
  try {
    // Set JSON content type explicitly to prevent HTML responses
    res.setHeader('Content-Type', 'application/json');

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] || '1.0.0',
      environment: process.env['NODE_ENV'] || 'development',
      uptime: process.uptime(),
      services: {
        database: false,
        redis: false,
        firebase: true // Firebase is initialized during startup
      }
    };

    // Quick health checks (with timeout)
    const healthChecks = await Promise.allSettled([
      // Database health check using Kysely
      (async () => {
        try {
          const { default: db } = await import('./database/kysely');
          const result = await Promise.race([
            db.selectFrom('users').select(db.fn.count('id').as('count')).executeTakeFirst(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Database health check timeout')), 3000))
          ]);
          return result !== undefined;
        } catch (error) {
          console.error('Database health check error:', error);
          return false;
        }
      })(),

      // Redis health check
      (async () => {
        try {
          const { checkRedisHealth } = await import('./config/redis');
          return await Promise.race([
            checkRedisHealth(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Redis health check timeout')), 3000))
          ]);
        } catch (error) {
          console.error('Redis health check error:', error);
          return false;
        }
      })()
    ]);

    healthStatus.services.database = healthChecks[0].status === 'fulfilled' && healthChecks[0].value === true;
    healthStatus.services.redis = healthChecks[1].status === 'fulfilled' && healthChecks[1].value === true;

    // Determine overall status
    const allServicesHealthy = Object.values(healthStatus.services).every(status => status === true);
    healthStatus.status = allServicesHealthy ? 'healthy' : 'degraded';

    const statusCode = allServicesHealthy ? 200 : 503;
    res.status(statusCode).json(healthStatus);

  } catch (error) {
    console.error('Health check failed:', error);
    // Ensure JSON response even on error
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Initialize services
async function initializeServices() {
  try {
    console.log('🔥 Initializing Firebase Admin SDK...');
    await initializeFirebase();

    // Try to connect to PostgreSQL (optional for now)
    try {
      console.log('🐘 Connecting to PostgreSQL with Kysely...');
      await initializeKysely();
      console.log('✅ PostgreSQL connected successfully');
    } catch (error) {
      console.warn('⚠️  PostgreSQL not available, continuing without database');
      console.warn('   Install PostgreSQL to enable full functionality');
    }

    // Try to connect to Redis (optional)
    try {
      console.log('🔴 Connecting to Redis...');
      await initializeRedis();
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.warn('⚠️  Redis not available, using memory-based caching');
    }

    // Initialize server data loader
    try {
      console.log('📚 Initializing server data loader...');

      // Create data loader based on environment
      const isProduction = process.env['NODE_ENV'] === 'production';
      const dataPath = process.env['GAME_DATA_PATH'] || undefined;

      const serverDataLoader = isProduction
        ? createProductionDataLoader(dataPath)
        : createDevelopmentDataLoader(dataPath);

      // Preload commonly used data
      await serverDataLoader.preloadData();

      // Health check
      const isHealthy = await serverDataLoader.healthCheck();
      if (!isHealthy) {
        console.warn('⚠️  Server data loader health check failed');
      }

      // Store data loader globally for use in routes
      (global as any).serverDataLoader = serverDataLoader;

      // Log cache stats
      const stats = serverDataLoader.getCacheStats();
      console.log(`✅ Server data loader initialized (cache: ${stats.size} items)`);

    } catch (error) {
      console.error('❌ Failed to initialize server data loader:', error);
      console.error('   Game engine will not function without game data');
      // Don't exit - let server run without game data for now
    }

    console.log('✅ Core services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize core services:', error);
    process.exit(1);
  }
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env['CORS_ORIGIN']?.split(',') || ['http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression and parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static game data files for tests and client access
app.use('/game-config', express.static(require('path').join(__dirname, '../../public/data/game-config')));
app.use('/localization', express.static(require('path').join(__dirname, '../../public/data/localization')));

// Logging middleware
if (process.env['NODE_ENV'] !== 'test') {
  app.use(morgan('combined'));
}
app.use(requestLogger);

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`🌐 [DEBUG] ${req.method} ${req.url} - ${req.ip}`);
  if (req.method === 'PUT' && req.url.includes('/api/users/me')) {
    console.log('🚨🚨🚨 [DEBUG] PUT /api/users/me request detected!');
    console.log('🚨🚨🚨 [DEBUG] Headers:', req.headers);
    console.log('🚨🚨🚨 [DEBUG] Body:', req.body);
  }
  next();
});

// Rate limiting
app.use(rateLimiter);



// Detailed health check endpoint
app.get('/api/health/detailed', async (_req, res) => {
  try {
    // Set JSON content type explicitly to prevent HTML responses
    res.setHeader('Content-Type', 'application/json');

    const startTime = Date.now();
    const healthDetails = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] || '1.0.0',
      environment: process.env['NODE_ENV'] || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {} as any,
      checks: {} as any,
      responseTime: 0
    };

    // Database detailed check using Kysely
    try {
      const dbStartTime = Date.now();
      const { default: db } = await import('./database/kysely');

      // Test database connection with a simple query
      const result = await db.selectFrom('users')
        .select(db.fn.count('id').as('user_count'))
        .executeTakeFirst();

      const dbResponseTime = Date.now() - dbStartTime;
      const dbHealthy = result !== undefined;

      healthDetails.services.database = {
        status: dbHealthy ? 'healthy' : 'unhealthy',
        responseTime: dbResponseTime,
        userCount: result?.user_count || 0,
        connection: {
          host: process.env['DB_HOST'] || 'Railway',
          port: process.env['DB_PORT'] || '5432',
          database: process.env['DB_NAME'] || 'railway'
        }
      };
    } catch (error) {
      healthDetails.services.database = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Redis detailed check
    try {
      const redisStartTime = Date.now();
      const { checkRedisHealth, isRedisAvailable } = await import('./config/redis');

      const redisHealthy = await checkRedisHealth();
      const redisResponseTime = Date.now() - redisStartTime;

      healthDetails.services.redis = {
        status: redisHealthy ? 'healthy' : 'unhealthy',
        available: isRedisAvailable(),
        responseTime: redisResponseTime,
        connection: {
          url: process.env['UPSTASH_REDIS_REST_URL'] ? 'Upstash REST API' : 'Standard Redis',
          fallback: !isRedisAvailable() ? 'Memory cache' : null
        }
      };
    } catch (error) {
      healthDetails.services.redis = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Firebase check
    try {
      healthDetails.services.firebase = {
        status: 'healthy', // Firebase is initialized during startup
        projectId: process.env['FIREBASE_PROJECT_ID'],
        adminSdk: 'initialized'
      };
    } catch (error) {
      healthDetails.services.firebase = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Additional system checks
    healthDetails.checks = {
      diskSpace: await getDiskSpaceInfo(),
      networkConnectivity: await checkNetworkConnectivity(),
      environmentVariables: checkRequiredEnvVars()
    };

    // Calculate overall status
    const serviceStatuses = Object.values(healthDetails.services).map((service: any) => service.status);
    const allHealthy = serviceStatuses.every(status => status === 'healthy');
    const anyError = serviceStatuses.some(status => status === 'error');

    healthDetails.status = anyError ? 'unhealthy' : (allHealthy ? 'healthy' : 'degraded');
    healthDetails.responseTime = Date.now() - startTime;

    const statusCode = healthDetails.status === 'healthy' ? 200 :
                      healthDetails.status === 'degraded' ? 503 : 500;

    res.status(statusCode).json(healthDetails);

  } catch (error) {
    console.error('Detailed health check failed:', error);
    // Ensure JSON response even on error
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper functions for detailed health checks
async function getDiskSpaceInfo() {
  try {
    const fs = await import('fs/promises');
    await fs.stat('.');
    return {
      available: true,
      // Note: Getting actual disk space requires additional libraries
      // This is a placeholder for basic file system access
      accessible: true
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkNetworkConnectivity() {
  try {
    // Simple connectivity check to external services
    const checks = await Promise.allSettled([
      fetch('https://www.google.com', { method: 'HEAD', signal: AbortSignal.timeout(3000) }),
      // Add more connectivity checks as needed
    ]);

    return {
      external: checks[0].status === 'fulfilled' && checks[0].value.ok,
      checks: checks.length
    };
  } catch (error) {
    return {
      external: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function checkRequiredEnvVars() {
  const required = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'DATABASE_URL',
    'DB_HOST',
    'DB_NAME'
  ];

  const missing = required.filter(varName => !process.env[varName]);
  const optional = [
    'UPSTASH_REDIS_REST_URL',
    'REDIS_URL'
  ];

  const optionalMissing = optional.filter(varName => !process.env[varName]);

  return {
    required: {
      total: required.length,
      present: required.length - missing.length,
      missing: missing
    },
    optional: {
      total: optional.length,
      present: optional.length - optionalMissing.length,
      missing: optionalMissing
    }
  };
}

// Migrations health check endpoint
app.get('/api/health/migrations', async (_req, res) => {
  try {
    const { KyselyMigrator } = await import('./database/migrator');

    // Check if migrations table exists and get migration status
    await KyselyMigrator.ensureMigrationsTable();

    // Get list of executed migrations
    const { db } = await import('./database/kysely');
    const executedMigrations = await db
      .selectFrom('migrations')
      .select(['name', 'executed_at'])
      .orderBy('executed_at', 'asc')
      .execute();

    // Expected migrations list
    const expectedMigrations = [
      '001_mvp_schema',
      '002_guest_support',
      '003_add_user_collections',
      '004_add_profile_fields',
      '005_add_last_used_at_column',
      '006_biomasters_engine_schema',
      '007_add_game_sessions_table',
      '008_populate_enum_data',
      '009_add_conservation_statuses',
      '010_migrate_to_cardid_system_simple',
      '012_add_unified_user_fields',
      '013_add_matchmaking_system',
      '014_add_match_history',
      '015_add_quest_system'
    ];

    const executedMigrationNames = executedMigrations.map(m => m.name);
    const pendingMigrations = expectedMigrations.filter(name => !executedMigrationNames.includes(name));

    res.status(200).json({
      status: 'success',
      data: {
        migrationsTableExists: true,
        totalExpected: expectedMigrations.length,
        totalExecuted: executedMigrations.length,
        pendingCount: pendingMigrations.length,
        isUpToDate: pendingMigrations.length === 0,
        executedMigrations: executedMigrations,
        pendingMigrations: pendingMigrations
      }
    });

  } catch (error) {
    console.error('Migrations health check failed:', error);
    res.status(500).json({
      status: 'error',
      error: 'Failed to check migrations status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Run migrations endpoint (only in development/test)
app.post('/api/health/migrations/run', async (_req, res) => {
  if (process.env['NODE_ENV'] === 'production') {
    return res.status(403).json({
      status: 'error',
      error: 'Migration endpoint not available in production'
    });
  }

  try {
    const { KyselyMigrator } = await import('./database/migrator');
    await KyselyMigrator.runMigrations();

    return res.status(200).json({
      status: 'success',
      message: 'Migrations executed successfully'
    });
  } catch (error) {
    console.error('Migration execution failed:', error);
    return res.status(500).json({
      status: 'error',
      error: 'Failed to run migrations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/guest', guestAuthRoutes);
app.use('/api/users', (req, res, next) => {
  console.log('🔗 [Routes] /api/users route hit:', req.method, req.path);
  next();
}, userRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/decks', deckRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/localization', localizationRoutes);
app.use('/api/static-data', staticDataRoutes);
app.use('/api/matchmaking', matchmakingRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/quests', questsRoutes);

// Test routes (only available in non-production environments)
if (process.env['NODE_ENV'] !== 'production') {
  app.use('/api/test', testRoutes);
}

// 404 handler
app.use('*', (req, res) => {
  console.log('🚨🚨🚨 404 HANDLER HIT:', req.method, req.originalUrl);
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// Setup WebSocket for real-time game communication
const io = setupGameSocket(server);
if (io) {
  console.log('🔌 WebSocket server initialized');
} else {
  console.log('⚠️ WebSocket server disabled');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Handle unhandled promise rejections (like database connection errors)
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Promise Rejection:', reason);
  console.error('🚨 Promise:', promise);
  // Don't exit the process, just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  // For uncaught exceptions, we should exit gracefully
  console.log('🛑 Shutting down due to uncaught exception...');
  server.close(() => {
    process.exit(1);
  });
});

// Start server
async function startServer() {
  try {
    await initializeServices();
    
    server.listen(PORT, () => {
      console.log(`🚀 Biomasters TCG API Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env['NODE_ENV'] || 'development'}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API Base URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

export default app;
