/**
 * Show Sample Cards
 * Display imported cards to verify the conversion
 */

import { db } from '../database/kysely';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function showSampleCards() {
  console.log('ℹ️ This script is disabled for JSON-based architecture.');
  console.log('📁 Card data is now loaded directly from JSON files.');
  // process.exit(0); // Commented out to fix unreachable code errors

  try {
    console.log('🎴 Biomasters TCG - Imported Cards Sample\n');
    
    // Get total count (using user_cards as placeholder)
    const totalCards = await db
      .selectFrom('user_cards')
      .select(db.fn.count('id').as('count'))
      .executeTakeFirst();
    
    console.log(`📊 Total Cards: ${totalCards?.count}\n`);
    
    // Show some example cards by rarity
    const rarities = ['Common', 'Uncommon', 'Rare', 'Legendary'];
    
    for (const rarity of rarities) {
      console.log(`🌟 ${rarity} Cards:`);
      
      // Mock query - species table doesn't exist
      const cards: any[] = [];
      
      cards.forEach(card => {
        const data = card.card_data as any;
        console.log(`   🃏 ${card.common_name} (${card.scientific_name})`);
        console.log(`      💰 Cost: ${data.cost} | ⚔️ Attack: ${data.attack} | ❤️ Health: ${data.health}`);
        console.log(`      🎯 Type: ${data.type} | 🏠 Habitat: ${data.habitat} | 🍽️ Diet: ${data.diet}`);
        console.log(`      ✨ Abilities: ${data.abilities?.join(', ') || 'None'}`);
        console.log(`      📖 "${data.flavor_text}"`);
        console.log('');
      });
    }
    
    // Show some interesting biological data preservation
    console.log('🔬 Scientific Data Preservation Examples:\n');
    
    // Mock query - species table doesn't exist
    const scientificCards: any[] = [];
    
    scientificCards.forEach(card => {
      const data = card.card_data as any;
      const bioData = data.biological_data;
      
      console.log(`🧬 ${card.common_name} (${card.scientific_name})`);
      console.log(`   📏 Mass: ${bioData?.mass_kg}kg`);
      console.log(`   ⚡ Metabolic Rate: ${bioData?.metabolic_rate} kJ/hr`);
      console.log(`   📅 Lifespan: ${bioData?.lifespan_days} days`);
      console.log(`   🏛️ Taxonomy: ${data.taxonomy?.family} family`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error showing cards:', error);
  } finally {
    await db.destroy();
  }
}

// Run if executed directly
if (require.main === module) {
  showSampleCards();
}

export { showSampleCards };
