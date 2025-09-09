/**
 * Kysely Database Migrator
 * Handles database migrations with type safety
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from './kysely';
import { sql } from 'kysely';
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

      // Read and execute device sync constraints fix
      const deviceSyncFixPath = join(__dirname, 'migrations/003_fix_device_sync_constraints.sql');
      const deviceSyncFixSql = readFileSync(deviceSyncFixPath, 'utf8');

      await this.executeMigration('003_fix_device_sync_constraints', deviceSyncFixSql);

      // Read and execute JSON foreign keys migration
      const jsonKeysPath = join(__dirname, 'migrations/003_json_foreign_keys.sql');
      const jsonKeysSql = readFileSync(jsonKeysPath, 'utf8');

      await this.executeMigration('003_json_foreign_keys', jsonKeysSql);

      // Read and execute profile fields migration
      const profileFieldsPath = join(__dirname, 'migrations/004_add_profile_fields.sql');
      const profileFieldsSql = readFileSync(profileFieldsPath, 'utf8');

      await this.executeMigration('004_add_profile_fields', profileFieldsSql);

      // Read and execute last_used_at column migration
      const lastUsedAtPath = join(__dirname, 'migrations/005_add_last_used_at_column.sql');
      const lastUsedAtSql = readFileSync(lastUsedAtPath, 'utf8');

      await this.executeMigration('005_add_last_used_at_column', lastUsedAtSql);

      // Read and execute BioMasters engine schema migration
      const biomastersEnginePath = join(__dirname, 'migrations/006_biomasters_engine_schema.sql');
      const biomastersEngineSql = readFileSync(biomastersEnginePath, 'utf8');

      await this.executeMigration('006_biomasters_engine_schema', biomastersEngineSql);

      // Read and execute game sessions table migration
      const gameSessionsPath = join(__dirname, 'migrations/007_add_game_sessions_table.sql');
      const gameSessionsSql = readFileSync(gameSessionsPath, 'utf8');

      await this.executeMigration('007_add_game_sessions_table', gameSessionsSql);

      // Read and execute enum data population migration
      const enumDataPath = join(__dirname, 'migrations/008_populate_enum_data.sql');
      const enumDataSql = readFileSync(enumDataPath, 'utf8');

      await this.executeMigration('008_populate_enum_data', enumDataSql);

      // 009: Add conservation statuses
      const conservationStatusesPath = join(__dirname, 'migrations/009_add_conservation_statuses.sql');
      const conservationStatusesSql = readFileSync(conservationStatusesPath, 'utf8');
      await this.executeMigration('009_add_conservation_statuses', conservationStatusesSql);

      // 010: Migrate to CardId system (simple version)
      const cardIdMigrationPath = join(__dirname, 'migrations/010_migrate_to_cardid_system_simple.sql');
      const cardIdMigrationSql = readFileSync(cardIdMigrationPath, 'utf8');
      await this.executeMigration('010_migrate_to_cardid_system_simple', cardIdMigrationSql);

      // 012: Add unified user type fields
      const unifiedUserFieldsPath = join(__dirname, 'migrations/012_add_unified_user_fields.sql');
      const unifiedUserFieldsSql = readFileSync(unifiedUserFieldsPath, 'utf8');
      await this.executeMigration('012_add_unified_user_fields', unifiedUserFieldsSql);

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
