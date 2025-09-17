/**
 * Quick script to check what cards exist in the database
 */

import { db } from '../database/kysely';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkCards() {
  try {
    console.log('🔍 Checking cards in database...');
    
    const cards = await db
      .selectFrom('cards')
      .select(['id', 'card_name'])
      .orderBy('id')
      .limit(20)
      .execute();

    console.log('📋 Available cards:');
    cards.forEach(card => {
      console.log(`  ${card.id}: ${card.card_name}`);
    });

    // Check specific starter pack cards
    const starterCardIds = [1, 3, 4, 34, 53];
    console.log('\n🎁 Checking starter pack cards:');
    
    for (const cardId of starterCardIds) {
      const card = await db
        .selectFrom('cards')
        .select(['id', 'card_name'])
        .where('id', '=', cardId)
        .executeTakeFirst();
      
      if (card) {
        console.log(`  ✅ Card ${cardId}: ${card.card_name}`);
      } else {
        console.log(`  ❌ Card ${cardId}: NOT FOUND`);
      }
    }

    // Get total count
    const totalCount = await db
      .selectFrom('cards')
      .select(db.fn.count('id').as('count'))
      .executeTakeFirst();

    console.log(`\n📊 Total cards in database: ${totalCount?.count || 0}`);

  } catch (error) {
    console.error('❌ Error checking cards:', error);
  } finally {
    await db.destroy();
  }
}

checkCards();
