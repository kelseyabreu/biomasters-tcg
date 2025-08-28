/**
 * Verify Database Schema
 * Check that all tables were created successfully
 */

import { db } from '../database/kysely';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function verifySchema() {
  try {
    console.log('🔍 Verifying database schema...');
    
    // Get all tables
    const tables = await db.introspection.getTables();
    
    console.log('📋 Created tables:');
    tables.forEach(table => {
      console.log(`  ✅ ${table.name}`);
    });
    
    // Expected tables from our MVP schema
    const expectedTables = [
      'migrations',
      'users', 
      'cards',
      'user_cards',
      'decks',
      'deck_cards', 
      'redemption_codes',
      'transactions'
    ];
    
    console.log('\n🎯 Checking expected tables:');
    const tableNames = tables.map(t => t.name);
    
    expectedTables.forEach(expectedTable => {
      if (tableNames.includes(expectedTable)) {
        console.log(`  ✅ ${expectedTable} - Found`);
      } else {
        console.log(`  ❌ ${expectedTable} - Missing`);
      }
    });
    
    // Test a simple query on users table
    console.log('\n🧪 Testing users table...');
    const userCount = await db
      .selectFrom('users')
      .select(db.fn.count('id').as('count'))
      .executeTakeFirst();
    
    console.log(`  📊 Users count: ${userCount?.count || 0}`);
    
    console.log('\n✅ Schema verification complete!');
    
  } catch (error) {
    console.error('❌ Schema verification failed:', error);
  } finally {
    await db.destroy();
  }
}

// Run verification if this script is executed directly
if (require.main === module) {
  verifySchema();
}

export { verifySchema };
