import { readFileSync } from 'fs';
import { join } from 'path';
import { initializeDatabase, DatabaseMigration } from '../config/database';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Run database migrations
 */
async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...');
    
    // Initialize database connection
    await initializeDatabase();
    
    // Read and execute schema
    const schemaPath = join(__dirname, '../database/schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf8');
    
    await DatabaseMigration.executeMigration('001_initial_schema', schemaSql);
    
    console.log('✅ All migrations completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations };
