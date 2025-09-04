/**
 * Test script for the new database queries with ARRAY_AGG
 */

import { getAllCardsWithRelations, getAllAbilitiesWithEffects } from '../database/queries/cardQueries';
import { db } from '../database/kysely';
import { KeywordId, TrophicCategoryId, ConservationStatus } from '@biomasters/shared';

async function testDatabaseQueries() {
  console.log('🧪 Testing database queries with ARRAY_AGG...');

  try {
    // Test 1: Check if keywords were populated correctly
    console.log('\n📋 Test 1: Checking keyword population...');
    const keywords = await db
      .selectFrom('keywords')
      .select(['id', 'keyword_name', 'keyword_type'])
      .orderBy('id')
      .limit(10)
      .execute();
    
    console.log(`✅ Found ${keywords.length} keywords:`);
    keywords.forEach(k => console.log(`  ${k.id}: ${k.keyword_name} (${k.keyword_type})`));

    // Test 2: Check conservation statuses
    console.log('\n🌍 Test 2: Checking conservation statuses...');
    const conservationStatuses = await db
      .selectFrom('conservation_statuses')
      .select(['id', 'status_name', 'percentage', 'pack_rarity'])
      .orderBy('id')
      .execute();
    
    console.log(`✅ Found ${conservationStatuses.length} conservation statuses:`);
    conservationStatuses.forEach(cs => 
      console.log(`  ${cs.id}: ${cs.status_name} (${cs.percentage}%, ${cs.pack_rarity}/1000 packs)`)
    );

    // Test 3: Create a test card with keywords and abilities
    console.log('\n🃏 Test 3: Creating test card with relations...');
    
    // Insert a test card
    const testCard = await db
      .insertInto('cards')
      .values({
        card_name: 'Test Grizzly Bear',
        trophic_level: 3,
        trophic_category_id: TrophicCategoryId.OMNIVORE,
        conservation_status_id: ConservationStatus.LEAST_CONCERN,
        cost: '{"energy": 3}',
        victory_points: 3,
        common_name: 'Grizzly Bear',
        scientific_name: 'Ursus arctos'
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    console.log(`✅ Created test card with ID: ${testCard.id}`);

    // Add keywords to the test card
    await db
      .insertInto('card_keywords')
      .values([
        { card_id: testCard.id, keyword_id: KeywordId.TERRESTRIAL },
        { card_id: testCard.id, keyword_id: KeywordId.MAMMAL },
        { card_id: testCard.id, keyword_id: KeywordId.LARGE }
      ])
      .execute();

    console.log('✅ Added keywords to test card');

    // Create a test ability
    const testAbility = await db
      .insertInto('abilities')
      .values({
        ability_name: 'Watershed Predator',
        trigger_id: 1, // ON_ACTIVATE
        effects: JSON.stringify([
          {
            effect_id: 1,
            selector_id: 1,
            action_id: 1,
            filters: { keywords: [KeywordId.AQUATIC] }
          }
        ]),
        description: 'Can hunt aquatic creatures adjacent to amphibious cards'
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    // Add ability to the test card
    await db
      .insertInto('card_abilities')
      .values({ card_id: testCard.id, ability_id: testAbility.id })
      .execute();

    console.log('✅ Added ability to test card');

    // Test 4: Test ARRAY_AGG queries
    console.log('\n🔍 Test 4: Testing ARRAY_AGG queries...');
    
    const cardsWithRelations = await getAllCardsWithRelations();
    console.log(`✅ Retrieved ${cardsWithRelations.length} cards with relations`);

    const testCardWithRelations = cardsWithRelations.find(c => c.id === testCard.id);
    if (testCardWithRelations) {
      console.log('✅ Test card with relations:');
      console.log(`  Name: ${testCardWithRelations.card_name}`);
      console.log(`  Trophic Level: ${testCardWithRelations.trophic_level}`);
      console.log(`  Keywords: [${testCardWithRelations.keywords.join(', ')}]`);
      console.log(`  Abilities: [${testCardWithRelations.abilities.join(', ')}]`);
      console.log(`  Conservation Status: ${testCardWithRelations.conservation_status_id}`);
    }

    // Test 5: Test abilities query
    console.log('\n⚡ Test 5: Testing abilities query...');
    const abilities = await getAllAbilitiesWithEffects();
    console.log(`✅ Retrieved ${abilities.length} abilities`);

    const testAbilityWithEffects = abilities.find(a => a.id === testAbility.id);
    if (testAbilityWithEffects) {
      console.log('✅ Test ability with effects:');
      console.log(`  Name: ${testAbilityWithEffects.ability_name}`);
      console.log(`  Trigger ID: ${testAbilityWithEffects.trigger_id}`);
      console.log(`  Effects: ${JSON.stringify(testAbilityWithEffects.effects)}`);
    }

    // Test 6: Verify enum values match
    console.log('\n🎯 Test 6: Verifying enum values...');
    
    // Check that our enum values match database IDs
    const terrestrialKeyword = await db
      .selectFrom('keywords')
      .select(['id', 'keyword_name'])
      .where('keyword_name', '=', 'TERRESTRIAL')
      .executeTakeFirst();

    if (terrestrialKeyword && terrestrialKeyword.id === KeywordId.TERRESTRIAL) {
      console.log(`✅ TERRESTRIAL enum matches: ${KeywordId.TERRESTRIAL} = ${terrestrialKeyword.id}`);
    } else {
      console.log(`❌ TERRESTRIAL enum mismatch: ${KeywordId.TERRESTRIAL} ≠ ${terrestrialKeyword?.id}`);
    }

    const omnivoreCategory = await db
      .selectFrom('trophic_categories')
      .select(['id', 'name'])
      .where('name', '=', 'Omnivore')
      .executeTakeFirst();

    if (omnivoreCategory && omnivoreCategory.id === TrophicCategoryId.OMNIVORE) {
      console.log(`✅ OMNIVORE enum matches: ${TrophicCategoryId.OMNIVORE} = ${omnivoreCategory.id}`);
    } else {
      console.log(`❌ OMNIVORE enum mismatch: ${TrophicCategoryId.OMNIVORE} ≠ ${omnivoreCategory?.id}`);
    }

    console.log('\n🎉 All database query tests completed successfully!');

  } catch (error) {
    console.error('❌ Database query test failed:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testDatabaseQueries()
    .then(() => {
      console.log('✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { testDatabaseQueries };
