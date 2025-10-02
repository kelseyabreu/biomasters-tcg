/**
 * Kysely Database Configuration
 * Type-safe SQL builder setup for PostgreSQL
 */

import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Database } from './types';

/**
 * Get database configuration - lazy loaded to ensure environment variables are available
 */
function getDbConfig() {
  // Use connection string if available (for Railway and other hosted services)
  if (process.env['DATABASE_URL']) {
    console.log('🔍 Using DATABASE_URL for connection');

    // Optimize pool size for test environment
    const isTestEnv = process.env['NODE_ENV'] === 'test';
    const maxConnections = isTestEnv ? 2 : 3; // Even smaller for tests

    const config = {
      connectionString: process.env['DATABASE_URL'],
      ssl: { rejectUnauthorized: false }, // Always use SSL for Railway
      // Optimized pool configuration for Railway with test considerations
      max: maxConnections, // Reduced for Railway limits and test isolation
      min: 0, // Allow pool to scale to zero
      idleTimeoutMillis: isTestEnv ? 10000 : 30000, // Shorter for tests
      connectionTimeoutMillis: isTestEnv ? 10000 : 15000, // Shorter for tests
      acquireTimeoutMillis: isTestEnv ? 15000 : 20000,
      createTimeoutMillis: isTestEnv ? 10000 : 15000,
      destroyTimeoutMillis: 5000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: isTestEnv ? 1000 : 2000, // Faster retry for tests
    };
    console.log('🔍 Database config:', {
      connectionString: config.connectionString.substring(0, 50) + '...',
      ssl: config.ssl,
      max: config.max,
      environment: process.env['NODE_ENV']
    });
    return config;
  }

  // Fallback to individual config values
  const isTestEnv = process.env['NODE_ENV'] === 'test';
  const maxConnections = isTestEnv ? 2 : 3; // Even smaller for tests

  return {
    host: process.env['DB_HOST'] || 'localhost',
    port: parseInt(process.env['DB_PORT'] || '5432'),
    database: process.env['DB_NAME'] || 'biomasters_tcg',
    user: process.env['DB_USER'] || 'postgres',
    password: process.env['DB_PASSWORD'] || '',
    max: maxConnections, // Conservative limit optimized for environment
    min: 0, // Allow pool to scale to zero
    idleTimeoutMillis: isTestEnv ? 10000 : 30000, // Shorter for tests
    connectionTimeoutMillis: isTestEnv ? 10000 : 15000, // Shorter for tests
    acquireTimeoutMillis: isTestEnv ? 15000 : 20000,
    createTimeoutMillis: isTestEnv ? 10000 : 15000,
    destroyTimeoutMillis: 5000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: isTestEnv ? 1000 : 2000, // Faster retry for tests
    ssl: (process.env['DB_HOST']?.includes('rlwy.net') || process.env['NODE_ENV'] === 'production') ? { rejectUnauthorized: false } : false
  };
}

/**
 * Create PostgreSQL connection pool
 * Note: Pool is created lazily in the dialect to ensure env vars are loaded
 */

/**
 * Separate connection pools for different workloads
 */
let syncPool: Pool | null = null;      // High-priority user operations (sync, auth, etc.)
let workerPool: Pool | null = null;    // Background worker operations (cleanup, health checks, etc.)

/**
 * Create PostgreSQL pool with error handling and workload-specific configuration
 */
function createSyncPool() {
  // Return existing pool if already created
  if (syncPool) {
    console.log('♻️ Reusing existing SYNC PostgreSQL pool');
    return syncPool;
  }

  const config = getDbConfig();

  // SYNC POOL: Optimized for user-facing operations (high priority, low latency)
  const syncConfig = {
    ...config,
    max: 8,           // Higher connection limit for user operations
    min: 3,           // Keep warm connections ready
    idleTimeoutMillis: 30000,     // Keep connections alive longer
    connectionTimeoutMillis: 5000, // Fast timeout for user operations
    acquireTimeoutMillis: 8000,   // Reasonable wait for user operations
    createTimeoutMillis: 8000,
    destroyTimeoutMillis: 2000,
    reapIntervalMillis: 10000,    // Less frequent cleanup
    createRetryIntervalMillis: 500,
  };

  console.log('🔗 Creating new SYNC PostgreSQL pool...');
  syncPool = new Pool(syncConfig);

  // Add comprehensive error handling for the SYNC pool
  syncPool.on('error', (err) => {
    console.error('🚨 SYNC PostgreSQL pool error:', err.message);
    console.log('🔌 SYNC PostgreSQL connection error detected:', err.message);
    // Don't crash the server on pool errors
  });

  syncPool.on('connect', (client) => {
    console.log('🔗 New SYNC PostgreSQL connection established');

    // Handle client errors to prevent crashes
    client.on('error', (err) => {
      console.error('🚨 SYNC PostgreSQL client error:', err.message);
    });
  });

  syncPool.on('remove', () => {
    // Suppress logging during tests to prevent "Cannot log after tests are done" errors
    if (process.env['NODE_ENV'] !== 'test') {
      console.log('🔌 SYNC PostgreSQL connection removed from pool');
    }
  });

  // DISABLE EXCESSIVE LOGGING for sync pool (performance critical)
  // syncPool.on('acquire', () => {
  //   console.log('📥 SYNC PostgreSQL connection acquired from pool');
  // });

  // syncPool.on('release', () => {
  //   console.log('📤 SYNC PostgreSQL connection released to pool');
  // });

  return syncPool;
}

/**
 * Create PostgreSQL pool for background workers
 */
function createWorkerPool() {
  // Return existing pool if already created
  if (workerPool) {
    console.log('♻️ Reusing existing WORKER PostgreSQL pool');
    return workerPool;
  }

  const config = getDbConfig();

  // WORKER POOL: Optimized for background operations (lower priority, can wait)
  const workerConfig = {
    ...config,
    max: 3,           // Lower connection limit for background operations
    min: 1,           // Keep minimal warm connections
    idleTimeoutMillis: 60000,     // Longer idle timeout (workers can wait)
    connectionTimeoutMillis: 10000, // Longer timeout for background operations
    acquireTimeoutMillis: 15000,  // Workers can wait longer
    createTimeoutMillis: 10000,
    destroyTimeoutMillis: 5000,
    reapIntervalMillis: 30000,    // More frequent cleanup for workers
    createRetryIntervalMillis: 1000,
  };

  console.log('🔗 Creating new WORKER PostgreSQL pool...');
  workerPool = new Pool(workerConfig);

  // Add comprehensive error handling for the WORKER pool
  workerPool.on('error', (err) => {
    console.error('🚨 WORKER PostgreSQL pool error:', err.message);
    console.log('🔌 WORKER PostgreSQL connection error detected:', err.message);
    // Don't crash the server on pool errors
  });

  workerPool.on('connect', (client) => {
    console.log('🔗 New WORKER PostgreSQL connection established');

    // Handle client errors to prevent crashes
    client.on('error', (err) => {
      console.error('🚨 WORKER PostgreSQL client error:', err.message);
    });
  });

  workerPool.on('remove', () => {
    // Suppress logging during tests to prevent "Cannot log after tests are done" errors
    if (process.env['NODE_ENV'] !== 'test') {
      console.log('🔌 WORKER PostgreSQL connection removed from pool');
    }
  });

  // Keep logging for worker pool (less performance critical)
  workerPool.on('acquire', () => {
    console.log('📥 WORKER PostgreSQL connection acquired from pool');
  });

  workerPool.on('release', () => {
    console.log('📤 WORKER PostgreSQL connection released to pool');
  });

  return workerPool;
}

/**
 * Create Kysely database instances with separate pools
 */

// Main database instance for user-facing operations (sync, auth, etc.)
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: () => Promise.resolve(createSyncPool()), // Use SYNC pool for user operations
  }),
});

// Worker database instance for background operations (cleanup, health checks, etc.)
export const workerDb = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: () => Promise.resolve(createWorkerPool()), // Use WORKER pool for background operations
  }),
});

/**
 * Initialize database connection
 */
export async function initializeKysely(): Promise<void> {
  try {
    const dbConfig = getDbConfig();
    
    // Debug: Log the configuration being used
    console.log('🔍 Kysely Database config:', {
      host: 'host' in dbConfig ? dbConfig.host : 'connection string',
      port: 'port' in dbConfig ? dbConfig.port : 'from connection string',
      database: 'database' in dbConfig ? dbConfig.database : 'from connection string',
      user: 'user' in dbConfig ? dbConfig.user : 'from connection string',
      ssl: 'ssl' in dbConfig ? dbConfig.ssl : 'from connection string'
    });

    // Test the connection with a simple query
    const result = await db.selectFrom('users')
      .select(db.fn.count('id').as('user_count'))
      .executeTakeFirst();

    console.log('✅ Kysely PostgreSQL connected successfully');
    console.log(`📍 Database: ${process.env['DB_NAME'] || 'railway'} on ${process.env['DB_HOST'] || 'localhost'}:${process.env['DB_PORT'] || '5432'}`);
    console.log(`👥 Users in database: ${result?.user_count || 0}`);

  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL with Kysely:', error);
    throw error;
  }
}

/**
 * Close both connection pools (for test cleanup)
 */
export async function closeSingletonPool(): Promise<void> {
  const closePromises: Promise<void>[] = [];

  if (syncPool) {
    closePromises.push(
      syncPool.end().then(() => {
        syncPool = null;
        console.log('✅ SYNC PostgreSQL pool closed');
      }).catch((error) => {
        console.error('❌ Error closing SYNC pool:', error);
      })
    );
  }

  if (workerPool) {
    closePromises.push(
      workerPool.end().then(() => {
        workerPool = null;
        console.log('✅ WORKER PostgreSQL pool closed');
      }).catch((error) => {
        console.error('❌ Error closing WORKER pool:', error);
      })
    );
  }

  await Promise.all(closePromises);
}

/**
 * Database operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if it's a connection error that we should retry
      const isRetryableError =
        error.message?.includes('Connection terminated') ||
        error.message?.includes('connection closed') ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('ENOTFOUND') ||
        error.code === 'ECONNRESET' ||
        error.code === 'ENOTFOUND';

      if (!isRetryableError || attempt === maxRetries) {
        console.error(`❌ Database operation failed after ${attempt} attempts:`, error.message);
        throw error;
      }

      console.warn(`⚠️ Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      delayMs *= 2; // Exponential backoff
    }
  }

  throw lastError!;
}

/**
 * Close database connections
 */
export async function closeKysely(): Promise<void> {
  await Promise.all([
    db.destroy(),
    workerDb.destroy()
  ]);
}

export default db;
