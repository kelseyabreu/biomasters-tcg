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
 * Singleton pool manager to prevent multiple pool creation
 */
let globalPool: Pool | null = null;

/**
 * Create PostgreSQL pool with error handling (singleton pattern)
 */
function createPool() {
  // Return existing pool if already created
  if (globalPool) {
    console.log('♻️ Reusing existing PostgreSQL pool');
    return globalPool;
  }

  const config = getDbConfig();
  console.log('🔗 Creating new PostgreSQL pool...');
  globalPool = new Pool(config);

  // Add comprehensive error handling for the pool
  globalPool.on('error', (err) => {
    console.error('🚨 PostgreSQL pool error:', err.message);
    console.log('🔌 PostgreSQL connection error detected:', err.message);
    // Don't crash the server on pool errors
  });

  globalPool.on('connect', (client) => {
    console.log('🔗 New PostgreSQL connection established');

    // Handle client errors to prevent crashes
    client.on('error', (err) => {
      console.error('🚨 PostgreSQL client error:', err.message);
    });
  });

  globalPool.on('remove', () => {
    // Suppress logging during tests to prevent "Cannot log after tests are done" errors
    if (process.env['NODE_ENV'] !== 'test') {
      console.log('🔌 PostgreSQL connection removed from pool');
    }
  });

  globalPool.on('acquire', () => {
    console.log('📥 PostgreSQL connection acquired from pool');
  });

  globalPool.on('release', () => {
    console.log('📤 PostgreSQL connection released to pool');
  });

  return globalPool;
}

/**
 * Create Kysely database instance with singleton pool
 */
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: () => Promise.resolve(createPool()), // Use singleton pool with Promise wrapper
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
 * Close the singleton pool (for test cleanup)
 */
export async function closeSingletonPool(): Promise<void> {
  if (globalPool) {
    try {
      await globalPool.end();
      globalPool = null;
      console.log('✅ Singleton PostgreSQL pool closed');
    } catch (error) {
      console.error('❌ Error closing singleton pool:', error);
    }
  }
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
 * Close database connection
 */
export async function closeKysely(): Promise<void> {
  await db.destroy();
}

export default db;
