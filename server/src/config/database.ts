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
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 5000, // Increased timeout for network issues
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
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      };
    }
  }

  return config;
}

/**
 * Initialize database connection pool
 */
export async function initializeDatabase(): Promise<void> {
  try {
    const dbConfig = getDbConfig();

    // Create connection pool
    pool = new Pool(dbConfig);

    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    // Set up error handling
    pool.on('error', (err) => {
      console.error('❌ Unexpected error on idle client:', err);
    });

  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:', error);
    throw error;
  }
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
 * Execute a query with automatic connection management
 */
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  if (!pool) throw new Error('Database pool not initialized');
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Execute a query and return a single row
 */
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

/**
 * Execute multiple queries in a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (!pool) throw new Error('Database pool not initialized');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if database connection is healthy
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as health_check');
    return result.length > 0;
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return false;
  }
}

/**
 * Close database connection pool
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
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
