import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;

/**
 * Database configuration - lazy loaded to ensure environment variables are available
 */
function getDbConfig() {
  const config: any = {
    host: process.env['DB_HOST'] || 'localhost',
    port: parseInt(process.env['DB_PORT'] || '5432'),
    database: process.env['DB_NAME'] || 'biomasters_tcg',
    user: process.env['DB_USER'] || 'postgres',
    password: process.env['DB_PASSWORD'] || '',
    max: 30, // Increased for test load
    idleTimeoutMillis: 60000, // Increased idle timeout for test stability
    connectionTimeoutMillis: 10000, // Increased timeout for network issues
    ssl: (process.env['DB_HOST']?.includes('supabase.co') || process.env['NODE_ENV'] === 'production') ? { rejectUnauthorized: false } : false
  };

  // Force IPv4 for Supabase to avoid IPv6 connectivity issues
  if (process.env['DB_HOST']?.includes('supabase.co')) {
    config.options = '-c default_transaction_isolation=read_committed';
    // Try to use the connection string directly for better compatibility
    if (process.env['DATABASE_URL']) {
      return {
        connectionString: process.env['DATABASE_URL'],
        ssl: { rejectUnauthorized: false },
        max: 30, // Increased for test load
        idleTimeoutMillis: 60000, // Increased for test stability
        connectionTimeoutMillis: 10000 // Increased timeout
      };
    }
  }

  return config;
}

/**
 * Initialize database connection pool with retry logic
 */
export async function initializeDatabase(): Promise<void> {
  const maxRetries = 5;
  const retryDelay = 3000; // 3 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const dbConfig = getDbConfig();
      console.log(`🐘 [Database] Attempt ${attempt}/${maxRetries} - Connecting to PostgreSQL...`);

      // Create connection pool with OPTIMIZED configuration for performance
      pool = new Pool({
        ...dbConfig,
        // PERFORMANCE OPTIMIZED settings
        max: 5, // Reduced pool size to minimize connection overhead
        min: 2, // Keep minimum connections warm
        idleTimeoutMillis: 60000, // Keep connections alive longer
        connectionTimeoutMillis: 5000, // Faster timeout for failed connections
        acquireTimeoutMillis: 10000, // Reduced wait time for pool acquisition
        createTimeoutMillis: 10000, // Faster connection creation timeout
        destroyTimeoutMillis: 2000, // Faster cleanup
        reapIntervalMillis: 5000, // Less frequent cleanup checks
        createRetryIntervalMillis: 500, // Slower retry to reduce churn
        // Connection validation
        allowExitOnIdle: false,
      });

      // Test the connection with timeout
      const testConnection = async () => {
        const client = await pool!.connect();
        try {
          const result = await client.query('SELECT NOW() as current_time, version() as db_version');
          console.log(`✅ [Database] Connected to PostgreSQL at ${result.rows[0].current_time}`);
          return result;
        } finally {
          client.release();
        }
      };

      // Test connection with timeout
      const connectionPromise = testConnection();
      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Database connection timeout')), 15000);
      });

      await Promise.race([connectionPromise, timeoutPromise]);
      clearTimeout(timeoutId!); // Clear timeout to prevent open handle

      // Set up enhanced error handling
      pool.on('error', (err) => {
        console.error('❌ [Database] Unexpected error on idle client:', err);
        // Don't crash the process, just log the error
      });

      pool.on('connect', (client) => {
        // Only log in development mode to reduce production overhead
        if (process.env.NODE_ENV === 'development') {
          console.log('🔗 [Database] New client connected');
        }

        // Set up client-level error handling
        client.on('error', (err) => {
          console.error('❌ [Database] Client error:', err);
        });
      });

      // DISABLE EXCESSIVE LOGGING - These events fire on every query and cause performance overhead
      // pool.on('acquire', () => {
      //   console.log('📤 [Database] Client acquired from pool');
      // });

      // pool.on('release', () => {
      //   console.log('📥 [Database] Client released back to pool');
      // });

      console.log('✅ [Database] PostgreSQL connection pool initialized successfully');
      return;

    } catch (error) {
      console.warn(`⚠️ [Database] Attempt ${attempt}/${maxRetries} failed:`, error instanceof Error ? error.message : error);

      // Clean up failed pool
      if (pool) {
        try {
          await pool.end();
        } catch (cleanupError) {
          console.warn('Failed to clean up failed pool:', cleanupError);
        }
        pool = null;
      }

      if (attempt < maxRetries) {
        console.log(`🔄 [Database] Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  // All attempts failed
  console.error('❌ [Database] Failed to connect to PostgreSQL after all retries');
  throw new Error('Database connection failed after all retry attempts');
}

/**
 * Get database pool
 */
export function getDatabase(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

/**
 * Retry wrapper for database operations
 */
async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a connection-related error that we should retry
      const isRetryableError = error instanceof Error && (
        error.message.includes('connection') ||
        error.message.includes('timeout') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('ETIMEDOUT') ||
        (error as any).code === 'ECONNRESET' ||
        (error as any).code === 'ENOTFOUND' ||
        (error as any).code === 'ETIMEDOUT'
      );

      if (!isRetryableError || attempt === maxRetries) {
        throw error;
      }

      console.warn(`⚠️ [Database] Retryable error on attempt ${attempt}/${maxRetries}:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError!;
}

/**
 * Execute a query with automatic connection management and retry logic
 */
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  return withDatabaseRetry(async () => {
    if (!pool) throw new Error('Database pool not initialized');

    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return result.rows;
    } finally {
      client.release();
    }
  });
}

/**
 * Execute a query and return a single row with retry logic
 */
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

/**
 * Execute multiple queries in a transaction with retry logic
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  return withDatabaseRetry(async () => {
    if (!pool) throw new Error('Database pool not initialized');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to rollback transaction:', rollbackError);
      }
      throw error;
    } finally {
      client.release();
    }
  });
}

/**
 * Check if database connection is healthy with detailed diagnostics
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    if (!pool) {
      console.warn('❌ [Database Health] Pool not initialized');
      return false;
    }

    // Check pool status
    const poolInfo = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };

    console.log('🔍 [Database Health] Pool status:', poolInfo);

    // Test query with timeout
    const healthPromise = query('SELECT 1 as health_check, NOW() as timestamp');
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Health check timeout')), 5000)
    );

    const result = await Promise.race([healthPromise, timeoutPromise]) as any[];

    if (result.length > 0) {
      console.log('✅ [Database Health] Database is healthy');
      return true;
    } else {
      console.warn('⚠️ [Database Health] Query returned no results');
      return false;
    }
  } catch (error) {
    console.error('❌ [Database Health] Health check failed:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Close database connection pool
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
      // Clear the pool reference to prevent reuse
      pool = null as any;
    } catch (error) {
      // Suppress logging during tests to prevent "Cannot log after tests are done" errors
      if (process.env['NODE_ENV'] !== 'test') {
        console.error('❌ Error closing PostgreSQL pool:', error);
      }
    }
  }
}

/**
 * Database migration utilities
 */
export class DatabaseMigration {
  /**
   * Check if migrations table exists
   */
  static async ensureMigrationsTable(): Promise<void> {
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);
  }

  /**
   * Check if a migration has been executed
   */
  static async isMigrationExecuted(name: string): Promise<boolean> {
    const result = await query(
      'SELECT 1 FROM migrations WHERE name = $1',
      [name]
    );
    return result.length > 0;
  }

  /**
   * Mark a migration as executed
   */
  static async markMigrationExecuted(name: string): Promise<void> {
    await query(
      'INSERT INTO migrations (name) VALUES ($1)',
      [name]
    );
  }

  /**
   * Execute a migration if it hasn't been run
   */
  static async executeMigration(
    name: string,
    migrationSql: string
  ): Promise<void> {
    await this.ensureMigrationsTable();
    
    if (await this.isMigrationExecuted(name)) {
      return;
    }

    await transaction(async (client) => {
      // Execute the migration SQL
      await client.query(migrationSql);
      
      // Mark as executed
      await client.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [name]
      );
    });
  }
}

// Getter function to ensure pool is initialized
function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

export { getPool };
