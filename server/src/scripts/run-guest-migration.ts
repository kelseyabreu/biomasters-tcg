/**
 * Manual script to run the guest support migration
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runGuestMigration() {
  try {
    console.log('🚀 Initializing database connection...');

    // Create direct database connection
    const pool = new Pool({
      host: process.env['DB_HOST'] || 'localhost',
      port: parseInt(process.env['DB_PORT'] || '5432'),
      database: process.env['DB_NAME'] || 'biomasters_tcg',
      user: process.env['DB_USER'] || 'postgres',
      password: process.env['DB_PASSWORD'] || 'password',
      ssl: process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: false } : false
    });
    
    console.log('📖 Reading migration file...');
    const migrationPath = join(__dirname, '../database/migrations/002_guest_support.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('🔄 Executing guest support migration...');
    await pool.query(migrationSQL);
    
    console.log('✅ Guest support migration completed successfully!');

    // Test the new schema
    console.log('🧪 Testing new schema...');
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('guest_id', 'guest_secret_hash', 'is_guest', 'needs_registration')
      ORDER BY column_name;
    `);

    console.log('📋 New guest columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runGuestMigration();
