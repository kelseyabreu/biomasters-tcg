import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create conservation_statuses table
  await db.schema
    .createTable('conservation_statuses')
    .addColumn('id', 'integer', (col) => col.primaryKey())
    .addColumn('status_name', 'varchar(50)', (col) => col.notNull())
    .addColumn('percentage', 'real', (col) => col.notNull())
    .addColumn('pack_rarity', 'varchar(20)', (col) => col.notNull())
    .addColumn('color', 'varchar(7)', (col) => col.notNull())
    .addColumn('emoji', 'varchar(10)', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Insert IUCN conservation status data with proper IUCN codes and precise pack rarity (per 10,000 packs)
  await db.insertInto('conservation_statuses').values([
    { id: 1, status_name: 'EXTINCT', percentage: 0.54, pack_rarity: 'EX', color: '#000000', emoji: '🖤' },
    { id: 2, status_name: 'EXTINCT_IN_WILD', percentage: 0.054, pack_rarity: 'EW', color: '#800080', emoji: '💜' },
    { id: 3, status_name: 'CRITICALLY_ENDANGERED', percentage: 5.95, pack_rarity: 'CR', color: '#D2001C', emoji: '❤️' },
    { id: 4, status_name: 'ENDANGERED', percentage: 10.92, pack_rarity: 'EN', color: '#FF6600', emoji: '🧡' },
    { id: 5, status_name: 'VULNERABLE', percentage: 13.19, pack_rarity: 'VU', color: '#FFCC00', emoji: '💛' },
    { id: 6, status_name: 'NEAR_THREATENED', percentage: 5.73, pack_rarity: 'NT', color: '#90EE90', emoji: '💚' },
    { id: 7, status_name: 'LEAST_CONCERN', percentage: 50.51, pack_rarity: 'LC', color: '#008000', emoji: '💚' },
    { id: 8, status_name: 'DATA_DEFICIENT', percentage: 12.97, pack_rarity: 'DD', color: '#808080', emoji: '🩶' }
  ]).execute();

  // Add conservation_status_id column to cards table if it doesn't exist
  try {
    await db.schema
      .alterTable('cards')
      .addColumn('conservation_status_id', 'integer', (col) => 
        col.references('conservation_statuses.id').onDelete('set null')
      )
      .execute();
  } catch (error) {
    // Column might already exist, ignore error
    console.log('conservation_status_id column might already exist');
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  // Remove conservation_status_id column from cards table
  try {
    await db.schema
      .alterTable('cards')
      .dropColumn('conservation_status_id')
      .execute();
  } catch (error) {
    // Column might not exist, ignore error
  }

  // Drop conservation_statuses table
  await db.schema.dropTable('conservation_statuses').execute();
}
