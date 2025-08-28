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
    return {
      connectionString: process.env['DATABASE_URL'],
      ssl: (process.env['DB_HOST']?.includes('rlwy.net') || process.env['NODE_ENV'] === 'production') ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    };
  }

  // Fallback to individual config values
  return {
    host: process.env['DB_HOST'] || 'localhost',
    port: parseInt(process.env['DB_PORT'] || '5432'),
    database: process.env['DB_NAME'] || 'biomasters_tcg',
    user: process.env['DB_USER'] || 'postgres',
    password: process.env['DB_PASSWORD'] || '',
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 5000, // Increased timeout for network issues
    ssl: (process.env['DB_HOST']?.includes('rlwy.net') || process.env['NODE_ENV'] === 'production') ? { rejectUnauthorized: false } : false
  };
}

/**
 * Create PostgreSQL connection pool
 * Note: Pool is created lazily in the dialect to ensure env vars are loaded
 */

/**
 * Create Kysely database instance with lazy pool creation
 */
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: async () => new Pool(getDbConfig()),
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
      host: dbConfig.host || 'connection string',
      port: dbConfig.port || 'from connection string',
      database: dbConfig.database || 'from connection string',
      user: dbConfig.user || 'from connection string',
      ssl: dbConfig.ssl
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
 * Close database connection
 */
export async function closeKysely(): Promise<void> {
  await db.destroy();
}

export default db;
