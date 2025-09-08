/**
 * Database Seeding Script
 * Populate database with sample data using species names as foreign keys
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../database/kysely';
import { NewRedemptionCode } from '../database/types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Load species manifest to get available species
 */
function loadSpeciesManifest(): string[] {
  const manifestPath = join(process.cwd(), '../public/species/manifest.json');
  const manifestData = JSON.parse(readFileSync(manifestPath, 'utf8'));
  return manifestData.species;
}

/**
 * Sample redemption codes using card IDs
 */
function createSampleRedemptionCodes(): NewRedemptionCode[] {
  // Create codes for first 10 cards
  const sampleCards = [
    { cardId: 1, name: 'Oak Tree' },
    { cardId: 2, name: 'Giant Kelp' },
    { cardId: 3, name: 'Grass' },
    { cardId: 4, name: 'Rabbit' },
    { cardId: 5, name: 'Deer' },
    { cardId: 6, name: 'Wolf' },
    { cardId: 7, name: 'Bear' },
    { cardId: 8, name: 'Eagle' },
    { cardId: 9, name: 'Salmon' },
    { cardId: 10, name: 'Butterfly' }
  ];

  return sampleCards.map((card, index) => ({
    code: `DEMO${String(index + 1).padStart(3, '0')}`,
    card_id: card.cardId,
    is_redeemed: false
  }));
}

/**
 * Seed the database with sample data
 */
async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Load available species from manifest
    const speciesList = loadSpeciesManifest();
    console.log(`📋 Found ${speciesList.length} species available in JSON files`);

    // Check if redemption codes already exist
    const existingCodes = await db
      .selectFrom('redemption_codes')
      .select(db.fn.count('id').as('count'))
      .executeTakeFirst();

    if (Number(existingCodes?.count) > 0) {
      console.log('🎫 Redemption codes already exist, skipping seeding');
    } else {
      console.log('🎫 Creating sample redemption codes...');
      
      // Create redemption codes for first 10 cards
      const redemptionCodes = createSampleRedemptionCodes();

      await db
        .insertInto('redemption_codes')
        .values(redemptionCodes)
        .execute();

      console.log(`✅ Created ${redemptionCodes.length} redemption codes`);
      console.log('🎫 Demo codes: DEMO001 through DEMO010');
      console.log('🎫 Card codes for:', redemptionCodes.slice(0, 5).map(c => `Card ${c.card_id}`).join(', '), '...');
    }

    console.log('✅ Database seeding completed successfully!');
    
    // Display summary
    const codeCount = await db
      .selectFrom('redemption_codes')
      .select(db.fn.count('id').as('count'))
      .executeTakeFirst();

    const userCount = await db
      .selectFrom('users')
      .select(db.fn.count('id').as('count'))
      .executeTakeFirst();

    console.log('\n📊 Database Summary:');
    console.log(`   👥 Users: ${userCount?.count}`);
    console.log(`   🎫 Redemption Codes: ${codeCount?.count}`);
    console.log(`   🃏 Species Available (JSON): ${speciesList.length}`);
    console.log('\n💡 Note: Card data is loaded from JSON files, not stored in database');
    console.log('💡 Database only tracks ownership and user progress');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

/**
 * Run seeding if this script is executed directly
 */
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🎉 Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };
