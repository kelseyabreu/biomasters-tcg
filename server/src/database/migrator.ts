/**
 * Kysely Database Migrator
 * Handles database migrations with type safety
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from './kysely';
import { sql } from 'kysely';
import { Pool } from 'pg';
import { getDbConfig } from '../config/database';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Migration utilities
 */
export class KyselyMigrator {
  /**
   * Ensure migrations table exists
   */
  static async ensureMigrationsTable(): Promise<void> {
    await db.schema
      .createTable('migrations')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('name', 'varchar(255)', (col) => col.notNull().unique())
      .addColumn('executed_at', 'timestamptz', (col) => col.notNull().defaultTo('now()'))
      .execute();
  }

  /**
   * Check if a migration has been executed
   */
  static async isMigrationExecuted(name: string): Promise<boolean> {
    const result = await db
      .selectFrom('migrations')
      .select('name')
      .where('name', '=', name)
      .executeTakeFirst();
    
    return !!result;
  }

  /**
   * Mark a migration as executed
   */
  static async markMigrationExecuted(name: string): Promise<void> {
    await db
      .insertInto('migrations')
      .values({ name })
      .execute();
  }

  /**
   * Execute a migration if it hasn't been run
   */
  static async executeMigration(name: string, migrationSql: string): Promise<void> {
    await this.ensureMigrationsTable();
    
    if (await this.isMigrationExecuted(name)) {
      console.log(`⏭️  Migration '${name}' already executed, skipping`);
      return;
    }

    // Execute migration in a transaction
    await db.transaction().execute(async (trx) => {
      // Execute the migration SQL
      await sql.raw(migrationSql).execute(trx);

      // Mark as executed
      await trx
        .insertInto('migrations')
        .values({ name })
        .execute();
    });

    console.log(`✅ Migration '${name}' executed successfully`);
  }

  /**
   * Run all pending migrations
   */
  static async runMigrations(): Promise<void> {
    try {
      console.log('🚀 Starting Kysely database migrations...');
      
      // Read and execute MVP schema
      const schemaPath = join(__dirname, 'migrations/001_mvp_schema.sql');
      const schemaSql = readFileSync(schemaPath, 'utf8');

      await this.executeMigration('001_mvp_schema', schemaSql);

      // Read and execute guest support migration (includes device_sync_states table)
      const guestSupportPath = join(__dirname, 'migrations/002_guest_support.sql');
      const guestSupportSql = readFileSync(guestSupportPath, 'utf8');

      await this.executeMigration('002_guest_support', guestSupportSql);

      // Read and execute JSON foreign keys migration
      const jsonKeysPath = join(__dirname, 'migrations/003_json_foreign_keys.sql');
      const jsonKeysSql = readFileSync(jsonKeysPath, 'utf8');

      await this.executeMigration('003_json_foreign_keys', jsonKeysSql);

      console.log('✅ All Kysely migrations completed successfully');
      
    } catch (error) {
      console.error('❌ Kysely migration failed:', error);
      throw error;
    }
  }
}

/**
 * Run migrations if this script is executed directly
 */
async function runMigrations() {
  try {
    await KyselyMigrator.runMigrations();
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
