/**
 * Import BioMasters Engine Data
 *
 * IMPORTANT: This script syncs JSON game data to PostgreSQL for API purposes.
 * The game engine uses JSON files as the SINGLE SOURCE OF TRUTH.
 *
 * Data Flow: /public/data/*.json → PostgreSQL (for API queries)
 *
 * The database serves as a queryable API reference for:
 * - Public card database/encyclopedia
 * - Deck builder UI queries
 * - Third-party developer APIs
 *
 * Run this script whenever /public/data/ JSON files are updated to keep database in sync.
 */

// @ts-nocheck

// import { readFileSync } from 'fs';
// import { join } from 'path';
import { db } from '../database/kysely';
import { gameDataManager } from '../services/GameDataManager';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface ImportCardData {
  CardID: number;
  TrophicLevel: number | null;
  TrophicCategory: number;
  Cost: any;
  Keywords: number[];
  VictoryPoints: number;
  CommonName: string;
  ScientificName: string;
  Taxonomy: any;
  Mass_kg: number;
  Lifespan_max_days: number;
  Vision_range_m: number;
  Smell_range_m: number;
  Hearing_range_m: number;
  Walk_speed_m_per_hr: number;
  Run_speed_m_per_hr: number;
  Swim_speed_m_per_hr: number;
  Fly_speed_m_per_hr: number;
  Offspring_count: number;
  Gestation_days: number;
  Abilities: number[];
}

interface AbilityData {
  AbilityID: number;
  Name: string;
  TriggerID: number;
  Effects: any[];
}

interface LocalizationData {
  CardNames: Record<string, string>;
  CardAbilitiesText: Record<string, string>;
  Keywords: Record<string, string>;
  TrophicCategories: Record<string, string>;
  [key: string]: any;
}

async function importBioMastersData() {
  try {
    console.log('🚀 Starting BioMasters data import (JSON → PostgreSQL sync)...');

    // Load data from GameDataManager (our source of truth)
    console.log('📚 Loading data from GameDataManager...');
    await gameDataManager.loadGameData();

    const cardsData = Array.from(gameDataManager.getCards().values());
    const abilitiesData = Array.from(gameDataManager.getAbilities().values());
    const localizationData = gameDataManager.getLocalization();

    console.log(`📊 Found ${cardsData.length} cards, ${abilitiesData.length} abilities`);

    // Import in transaction
    await db.transaction().execute(async (trx) => {
      // Import abilities first (cards reference them)
      console.log('📝 Importing abilities...');
      for (const ability of abilitiesData) {
        // Check if ability exists
        const existingAbility = await trx
          .selectFrom('abilities')
          .select('id')
          .where('id', '=', ability.abilityID)
          .executeTakeFirst();

        if (existingAbility) {
          // Update existing ability
          await trx
            .updateTable('abilities')
            .set({
              ability_name: ability.Name,
              trigger_id: ability.triggerID,
              effects: JSON.stringify(ability.effects),
              description: `Ability: ${ability.Name}`
            })
            .where('id', '=', ability.abilityID)
            .execute();
        } else {
          // Insert new ability
          await trx
            .insertInto('abilities')
            .values({
              id: ability.abilityID,
              ability_name: ability.Name,
              trigger_id: ability.triggerID,
              effects: JSON.stringify(ability.effects),
              description: `Ability: ${ability.Name}`
            })
            .execute();
        }
      }

      // Import cards
      console.log('🃏 Importing cards...');
      for (const card of cardsData) {
        // Check if card exists
        const existingCard = await trx
          .selectFrom('cards')
          .select('id')
          .where('id', '=', card.cardId)
          .executeTakeFirst();

        // Get card name from localization data
        const cardName = localizationData.cardNames[card.cardId.toString()] || `Card ${card.cardId}`;

        const cardData = {
          card_name: cardName,
          trophic_level: card.trophicLevel,
          trophic_category_id: card.trophicCategory,
          cost: card.cost ? JSON.stringify(card.cost) : null,
          victory_points: card.victoryPoints || 1,
          common_name: cardName,
          scientific_name: `Species ${card.cardId}`,
          taxonomy: JSON.stringify({}),
          mass_kg: 1.0,
          lifespan_max_days: 365,
          vision_range_m: 10.0,
          smell_range_m: 5.0,
          hearing_range_m: 20.0,
          walk_speed_m_per_hr: 5.0,
          run_speed_m_per_hr: 15.0,
          swim_speed_m_per_hr: 3.0,
          fly_speed_m_per_hr: 0.0,
          offspring_count: 2,
          gestation_days: 30
        };

        if (existingCard) {
          // Update existing card
          await trx
            .updateTable('cards')
            .set(cardData)
            .where('id', '=', card.cardId)
            .execute();
        } else {
          // Insert new card
          await trx
            .insertInto('cards')
            .values({
              id: card.cardId,
              ...cardData
            })
            .execute();
        }

        // Clear existing keywords for this card
        await trx
          .deleteFrom('card_keywords')
          .where('card_id', '=', card.cardId)
          .execute();

        // Insert card keywords
        for (const keywordId of card.keywords) {
          await trx
            .insertInto('card_keywords')
            .values({
              card_id: card.cardId,
              keyword_id: keywordId
            })
            .execute();
        }

        // Clear existing abilities for this card
        await trx
          .deleteFrom('card_abilities')
          .where('card_id', '=', card.cardId)
          .execute();

        // Insert card abilities (if any)
        if (card.abilities && Array.isArray(card.abilities)) {
          for (const abilityId of card.abilities) {
            await trx
              .insertInto('card_abilities')
              .values({
                card_id: card.cardId,
                ability_id: abilityId
              })
              .execute();
          }
        }
      }

      // Import localizations
      console.log('🌐 Importing localizations...');
      
      // Clear existing English localizations
      await trx
        .deleteFrom('localizations')
        .where('language_code', '=', 'en')
        .execute();

      // Import card names
      for (const [cardId, name] of Object.entries(localizationData.cardNames)) {
        await trx
          .insertInto('localizations')
          .values({
            language_code: 'en',
            object_type: 'card',
            object_id: parseInt(cardId),
            field_name: 'name',
            localized_text: name
          })
          .execute();
      }

      // Import ability texts
      for (const [abilityId, text] of Object.entries(localizationData.CardAbilitiesText)) {
        await trx
          .insertInto('localizations')
          .values({
            language_code: 'en',
            object_type: 'ability',
            object_id: parseInt(abilityId),
            field_name: 'ability_text',
            localized_text: text
          })
          .execute();
      }

      // Import keyword names
      for (const [keywordId, name] of Object.entries(localizationData.keywords)) {
        await trx
          .insertInto('localizations')
          .values({
            language_code: 'en',
            object_type: 'keyword',
            object_id: parseInt(keywordId),
            field_name: 'name',
            localized_text: name
          })
          .execute();
      }

      // Import trophic category names
      for (const [categoryId, name] of Object.entries(localizationData.TrophicCategories)) {
        await trx
          .insertInto('localizations')
          .values({
            language_code: 'en',
            object_type: 'trophic_category',
            object_id: parseInt(categoryId),
            field_name: 'name',
            localized_text: name
          })
          .execute();
      }
    });

    console.log('✅ BioMasters data import completed successfully!');
    
  } catch (error) {
    console.error('❌ BioMasters data import failed:', error);
    throw error;
  }
}

// Run import if this script is executed directly
if (require.main === module) {
  importBioMastersData()
    .then(() => {
      console.log('🎉 Import completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Import failed:', error);
      process.exit(1);
    });
}

export { importBioMastersData };
