/**
 * Database Reset Script
 * WARNING: This will completely wipe the database
 */

import { db } from '../database/kysely';
import { sql } from 'kysely';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function resetDatabase() {
  try {
    console.log('⚠️  WARNING: This will completely wipe the database!');
    console.log('🗑️  Dropping all tables...');

    // Drop all tables in correct order (respecting foreign key constraints)
    const dropQueries = [
      'DROP TABLE IF EXISTS user_cards CASCADE',
      'DROP TABLE IF EXISTS deck_cards CASCADE', 
      'DROP TABLE IF EXISTS decks CASCADE',
      'DROP TABLE IF EXISTS redemption_codes CASCADE',
      'DROP TABLE IF EXISTS transactions CASCADE',
      'DROP TABLE IF EXISTS users CASCADE',
      'DROP TABLE IF EXISTS migrations CASCADE',
      'DROP TYPE IF EXISTS acquisition_method CASCADE',
      'DROP TYPE IF EXISTS transaction_type CASCADE'
    ];

    for (const dropQuery of dropQueries) {
      await sql`${dropQuery}`.execute(db);
      console.log(`✅ ${dropQuery}`);
    }

    console.log('🎉 Database reset complete!');
    console.log('💡 Run "npm run db:migrate" to recreate tables');
    console.log('💡 Run "npm run db:seed" to add sample data');

  } catch (error) {
    console.error('❌ Reset failed:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run reset if this script is executed directly
if (require.main === module) {
  resetDatabase()
    .then(() => {
      console.log('🎉 Reset completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Reset failed:', error);
      process.exit(1);
    });
}

export { resetDatabase };
