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

      // 013: Add matchmaking system
      const matchmakingSystemPath = join(__dirname, 'migrations/013_add_matchmaking_system.sql');
      const matchmakingSystemSql = readFileSync(matchmakingSystemPath, 'utf8');
      await this.executeMigration('013_add_matchmaking_system', matchmakingSystemSql);

      // 014: Add match history
      const matchHistoryPath = join(__dirname, 'migrations/014_add_match_history.sql');
      const matchHistorySql = readFileSync(matchHistoryPath, 'utf8');
      await this.executeMigration('014_add_match_history', matchHistorySql);

      // 015: Add quest system
      const questSystemPath = join(__dirname, 'migrations/015_add_quest_system.sql');
      const questSystemSql = readFileSync(questSystemPath, 'utf8');
      await this.executeMigration('015_add_quest_system', questSystemSql);

      // 016: Add signing key version
      const signingKeyVersionPath = join(__dirname, 'migrations/016_add_signing_key_version.sql');
      const signingKeyVersionSql = readFileSync(signingKeyVersionPath, 'utf8');
      await this.executeMigration('016_add_signing_key_version', signingKeyVersionSql);

      // 017: Refactor signing keys to historical storage
      const historicalSigningKeysPath = join(__dirname, 'migrations/017_refactor_signing_keys_historical.sql');
      const historicalSigningKeysSql = readFileSync(historicalSigningKeysPath, 'utf8');
      await this.executeMigration('017_refactor_signing_keys_historical', historicalSigningKeysSql);

      // 018: Add user cards metadata columns
      const userCardsMetadataPath = join(__dirname, 'migrations/018_add_user_cards_metadata_columns.sql');
      const userCardsMetadataSql = readFileSync(userCardsMetadataPath, 'utf8');
      await this.executeMigration('018_add_user_cards_metadata_columns', userCardsMetadataSql);

      // 019: Fix species_name constraint
      const speciesNameFixPath = join(__dirname, 'migrations/019_fix_species_name_constraint.sql');
      const speciesNameFixSql = readFileSync(speciesNameFixPath, 'utf8');
      await this.executeMigration('019_fix_species_name_constraint', speciesNameFixSql);

      // 020: Add Pub/Sub matchmaking tables
      const pubsubMatchmakingPath = join(__dirname, 'migrations/020_add_pubsub_matchmaking.sql');
      const pubsubMatchmakingSql = readFileSync(pubsubMatchmakingPath, 'utf8');
      await this.executeMigration('020_add_pubsub_matchmaking', pubsubMatchmakingSql);

      // 021: Standardize game_sessions schema
      const standardizeGameSessionsPath = join(__dirname, 'migrations/021_standardize_game_sessions_schema.sql');
      const standardizeGameSessionsSql = readFileSync(standardizeGameSessionsPath, 'utf8');
      await this.executeMigration('021_standardize_game_sessions_schema', standardizeGameSessionsSql);

      // 023: Universal products system (disabled for now)
      // const universalProductsPath = join(__dirname, 'migrations/023_universal_products_system.sql');
      // const universalProductsSql = readFileSync(universalProductsPath, 'utf8');
      // await this.executeMigration('023_universal_products_system', universalProductsSql);

      // 024: Starter decks data (disabled - using simpler approach)
      // const starterDecksDataPath = join(__dirname, 'migrations/024_starter_decks_data.sql');
      // const starterDecksDataSql = readFileSync(starterDecksDataPath, 'utf8');
      // await this.executeMigration('024_starter_decks_data', starterDecksDataSql);

      // 025: Purchase system tables (disabled - depends on products table)
      // const purchaseSystemPath = join(__dirname, 'migrations/025_purchase_system_tables.sql');
      // const purchaseSystemSql = readFileSync(purchaseSystemPath, 'utf8');
      // await this.executeMigration('025_purchase_system_tables', purchaseSystemSql);

      // 027: Deck access system (our new approach)
      const deckAccessPath = join(__dirname, 'migrations/027_deck_access_system.sql');
      const deckAccessSql = readFileSync(deckAccessPath, 'utf8');
      await this.executeMigration('027_deck_access_system', deckAccessSql);

      // 028: Fix starter decks system
      const fixStarterDecksPath = join(__dirname, 'migrations/028_fix_starter_decks_system.sql');
      const fixStarterDecksSql = readFileSync(fixStarterDecksPath, 'utf8');
      await this.executeMigration('028_fix_starter_decks_system', fixStarterDecksSql);

      // 029: Add species name mapping
      const speciesNameMappingPath = join(__dirname, 'migrations/029_add_species_name_mapping.sql');
      const speciesNameMappingSql = readFileSync(speciesNameMappingPath, 'utf8');
      await this.executeMigration('029_add_species_name_mapping', speciesNameMappingSql);

      // 030: Comprehensive schema alignment
      const schemaAlignmentPath = join(__dirname, 'migrations/030_comprehensive_schema_alignment.sql');
      const schemaAlignmentSql = readFileSync(schemaAlignmentPath, 'utf8');
      await this.executeMigration('030_comprehensive_schema_alignment', schemaAlignmentSql);

      // 031: Fix dual key system (id as UUID)
      const fixDualKeyPath = join(__dirname, 'migrations/031_fix_dual_key_system.sql');
      const fixDualKeySql = readFileSync(fixDualKeyPath, 'utf8');
      await this.executeMigration('031_fix_dual_key_system', fixDualKeySql);

      // 032: Add admin user
      const addAdminUserPath = join(__dirname, 'migrations/032_add_admin_user.sql');
      const addAdminUserSql = readFileSync(addAdminUserPath, 'utf8');
      await this.executeMigration('032_add_admin_user', addAdminUserSql);

      // 033: Fix key_version column type to BIGINT
      const fixKeyVersionPath = join(__dirname, 'migrations/033_fix_key_version_bigint.sql');
      const fixKeyVersionSql = readFileSync(fixKeyVersionPath, 'utf8');
      await this.executeMigration('033_fix_key_version_bigint', fixKeyVersionSql);

      // 034: Migrate user_decks to normalized structure
      const migrateUserDecksPath = join(__dirname, 'migrations/034_migrate_user_decks_to_normalized.sql');
      const migrateUserDecksSql = readFileSync(migrateUserDecksPath, 'utf8');
      await this.executeMigration('034_migrate_user_decks_to_normalized', migrateUserDecksSql);

      // 035: Remove JSONB cards column (Phase 3)
      const removeJsonbPath = join(__dirname, 'migrations/035_remove_jsonb_cards_column.sql');
      const removeJsonbSql = readFileSync(removeJsonbPath, 'utf8');
      await this.executeMigration('035_remove_jsonb_cards_column', removeJsonbSql);

      // 036: Add worker management schema for distributed game workers
      const workerManagementPath = join(__dirname, 'migrations/036_add_worker_management_schema.sql');
      const workerManagementSql = readFileSync(workerManagementPath, 'utf8');
      await this.executeMigration('036_add_worker_management_schema', workerManagementSql);

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
