/**
 * Database Type Audit Script
 * Identifies string/number/decimal inconsistencies in database responses
 */

import axios from 'axios';

async function auditDatabaseTypes() {
  console.log('🔍 Starting Database Type Audit...\n');

  try {
    // Test 1: Conservation Statuses - Check decimal types
    console.log('📊 Auditing Conservation Statuses...');
    const conservationRes = await axios.get('http://localhost:3001/api/cards/conservation-statuses');
    
    const conservationData = conservationRes.data as any;
    if (conservationData.conservation_statuses?.length > 0) {
      const firstStatus = conservationData.conservation_statuses[0];
      console.log('🔍 Conservation Status Sample:');
      console.log(`  ID: ${firstStatus.id} (${typeof firstStatus.id})`);
      console.log(`  Percentage: ${firstStatus.percentage} (${typeof firstStatus.percentage})`);
      console.log(`  Pack Rarity: ${firstStatus.pack_rarity} (${typeof firstStatus.pack_rarity})`);
      
      // Check if percentage is string when it should be number
      if (typeof firstStatus.percentage === 'string') {
        console.log('❌ ISSUE: percentage is string, should be number');
      } else {
        console.log('✅ percentage type is correct');
      }
      
      if (typeof firstStatus.pack_rarity === 'string') {
        console.log('❌ ISSUE: pack_rarity is string, should be number');
      } else {
        console.log('✅ pack_rarity type is correct');
      }
    }

    // Test 2: Cards - Check numeric fields
    console.log('\n🃏 Auditing Cards...');
    const cardsRes = await axios.get('http://localhost:3001/api/cards/database?limit=1');
    
    const cardsData = cardsRes.data as any;
    if (cardsData.cards?.length > 0) {
      const firstCard = cardsData.cards[0];
      console.log('🔍 Card Sample:');
      console.log(`  ID: ${firstCard.id} (${typeof firstCard.id})`);
      console.log(`  Trophic Level: ${firstCard.trophic_level} (${typeof firstCard.trophic_level})`);
      console.log(`  Trophic Category ID: ${firstCard.trophic_category_id} (${typeof firstCard.trophic_category_id})`);
      console.log(`  Victory Points: ${firstCard.victory_points} (${typeof firstCard.victory_points})`);
      console.log(`  Mass KG: ${firstCard.mass_kg} (${typeof firstCard.mass_kg})`);
      console.log(`  Lifespan Max Days: ${firstCard.lifespan_max_days} (${typeof firstCard.lifespan_max_days})`);
      console.log(`  Keywords: ${JSON.stringify(firstCard.keywords)} (${typeof firstCard.keywords})`);
      console.log(`  Abilities: ${JSON.stringify(firstCard.abilities)} (${typeof firstCard.abilities})`);
      
      // Check cost field
      console.log(`  Cost: ${JSON.stringify(firstCard.cost)} (${typeof firstCard.cost})`);
      if (typeof firstCard.cost === 'string') {
        console.log('❌ ISSUE: cost is string, should be object');
        try {
          const parsedCost = JSON.parse(firstCard.cost);
          console.log(`    Parsed cost: ${JSON.stringify(parsedCost)}`);
        } catch (e) {
          console.log('❌ ISSUE: cost string is not valid JSON');
        }
      } else {
        console.log('✅ cost type is correct');
      }

      // Check array types
      if (!Array.isArray(firstCard.keywords)) {
        console.log('❌ ISSUE: keywords is not array');
      } else {
        console.log('✅ keywords is array');
        if (firstCard.keywords.length > 0) {
          console.log(`    First keyword: ${firstCard.keywords[0]} (${typeof firstCard.keywords[0]})`);
          if (typeof firstCard.keywords[0] === 'string') {
            console.log('❌ ISSUE: keyword ID is string, should be number');
          }
        }
      }

      if (!Array.isArray(firstCard.abilities)) {
        console.log('❌ ISSUE: abilities is not array');
      } else {
        console.log('✅ abilities is array');
        if (firstCard.abilities.length > 0) {
          console.log(`    First ability: ${firstCard.abilities[0]} (${typeof firstCard.abilities[0]})`);
          if (typeof firstCard.abilities[0] === 'string') {
            console.log('❌ ISSUE: ability ID is string, should be number');
          }
        }
      }
    }

    // Test 3: Single Card - Check detailed types
    console.log('\n🎯 Auditing Single Card...');
    const singleCardRes = await axios.get('http://localhost:3001/api/cards/card/1');
    
    const singleCardData = singleCardRes.data as any;
    if (singleCardData.card) {
      const card = singleCardData.card;
      console.log('🔍 Single Card Sample:');
      console.log(`  Conservation Status ID: ${card.conservation_status_id} (${typeof card.conservation_status_id})`);
      
      if (card.conservation_status) {
        console.log(`  Conservation Status Percentage: ${card.conservation_status.percentage} (${typeof card.conservation_status.percentage})`);
      }
      
      if (card.trophic_category) {
        console.log(`  Trophic Category ID: ${card.trophic_category.id} (${typeof card.trophic_category.id})`);
      }
    }

    // Test 4: Keywords - Check ID types
    console.log('\n🏷️ Auditing Keywords...');
    const keywordsRes = await axios.get('http://localhost:3001/api/cards/keywords');
    
    const keywordsData = keywordsRes.data as any;
    if (keywordsData.all_keywords?.length > 0) {
      const firstKeyword = keywordsData.all_keywords[0];
      console.log('🔍 Keyword Sample:');
      console.log(`  ID: ${firstKeyword.id} (${typeof firstKeyword.id})`);
      console.log(`  Name: ${firstKeyword.keyword_name} (${typeof firstKeyword.keyword_name})`);
      
      if (typeof firstKeyword.id === 'string') {
        console.log('❌ ISSUE: keyword ID is string, should be number');
      } else {
        console.log('✅ keyword ID type is correct');
      }
    }

    // Test 5: Abilities - Check effects JSON
    console.log('\n⚡ Auditing Abilities...');
    const abilitiesRes = await axios.get('http://localhost:3001/api/cards/abilities');
    
    const abilitiesData = abilitiesRes.data as any;
    if (abilitiesData.abilities?.length > 0) {
      const firstAbility = abilitiesData.abilities[0];
      console.log('🔍 Ability Sample:');
      console.log(`  ID: ${firstAbility.id} (${typeof firstAbility.id})`);
      console.log(`  Trigger ID: ${firstAbility.trigger_id} (${typeof firstAbility.trigger_id})`);
      console.log(`  Effects: ${JSON.stringify(firstAbility.effects)} (${typeof firstAbility.effects})`);
      
      if (typeof firstAbility.effects === 'string') {
        console.log('❌ ISSUE: effects is string, should be array/object');
      } else {
        console.log('✅ effects type is correct');
      }
    }

    // Test 6: Game Data - Check comprehensive types
    console.log('\n🎮 Auditing Game Data...');
    const gameDataRes = await axios.get('http://localhost:3001/api/cards/game-data');
    
    const gameDataData = gameDataRes.data as any;
    if (gameDataData.game_data) {
      const gameData = gameDataData.game_data;
      console.log('🔍 Game Data Structure:');
      console.log(`  Cards count: ${gameData.cards?.length} (${typeof gameData.cards})`);
      console.log(`  Abilities count: ${gameData.abilities?.length} (${typeof gameData.abilities})`);
      console.log(`  Keywords count: ${gameData.keywords?.length} (${typeof gameData.keywords})`);
      console.log(`  Conservation Statuses count: ${gameData.conservation_statuses?.length} (${typeof gameData.conservation_statuses})`);
      
      if (gameData.cards?.length > 0) {
        const firstGameCard = gameData.cards[0];
        console.log(`  First card cost: ${JSON.stringify(firstGameCard.cost)} (${typeof firstGameCard.cost})`);
        
        if (typeof firstGameCard.cost === 'string') {
          console.log('❌ ISSUE: game data card cost is string, should be object');
        } else {
          console.log('✅ game data card cost type is correct');
        }
      }
    }

    console.log('\n📋 Type Audit Summary:');
    console.log('✅ Completed database type audit');
    console.log('🔍 Check above for any ❌ ISSUE markers');

  } catch (error: any) {
    console.error('❌ Type audit failed:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📝 Data:', error.response.data);
    }
  }
}

// Run audit
auditDatabaseTypes();
