/**
 * Test JSON-Driven Game Engine
 * Verify that the engine loads data from JSON files correctly
 */

import { gameDataManager } from '../services/GameDataManager';
import { BioMastersEngine, CardData as SharedCardData, AbilityData as SharedAbilityData } from '../../../shared/game-engine/BioMastersEngine';

async function testJSONEngine() {
  console.log('🧪 Testing JSON-Driven Game Engine...\n');

  try {
    // 1. Load game data
    console.log('📚 Loading game data from JSON files...');
    await gameDataManager.loadGameData();
    
    // 2. Verify data loaded
    const cards = gameDataManager.getCards();
    const abilities = gameDataManager.getAbilities();
    const keywords = gameDataManager.getKeywords();
    
    console.log(`✅ Data loaded:`);
    console.log(`  📄 Cards: ${cards.size}`);
    console.log(`  ⚡ Abilities: ${abilities.size}`);
    console.log(`  🏷️ Keywords: ${keywords.size}`);
    
    // 3. Test card data
    console.log('\n🃏 Testing card data...');
    const firstCard = cards.get(1);
    if (firstCard) {
      console.log(`  Card 1: ${gameDataManager.getCardName(1)}`);
      console.log(`  Trophic Level: ${firstCard.trophicLevel}`);
      console.log(`  Keywords: ${firstCard.keywords.map(k => gameDataManager.getKeywordName(k)).join(', ')}`);
      console.log(`  Cost: ${JSON.stringify(firstCard.cost)}`);
    }
    
    // 4. Test ability data
    console.log('\n⚡ Testing ability data...');
    const firstAbility = abilities.get(1);
    if (firstAbility) {
      console.log(`  Ability 1: ${gameDataManager.getAbilityText(1)}`);
      console.log(`  Trigger ID: ${firstAbility.triggerID}`);
      console.log(`  Effects: ${firstAbility.effects.length} effects`);
    }
    
    // 5. Create game engine
    console.log('\n🎮 Testing game engine creation...');
    const players = [
      { id: 'player1', name: 'Test Player 1' },
      { id: 'player2', name: 'Test Player 2' }
    ];
    
    const gameSettings = {
      maxPlayers: 2,
      deckSize: 25,
      startingHandSize: 5,
      maxHandSize: 7,
      maxActionsPerTurn: 3,
      gridWidth: 10,
      gridHeight: 10,
      enableAI: false
    };
    
    // Load game data first
    await gameDataManager.loadGameData();

    // Convert server data to shared format
    const cardDatabase = new Map<number, SharedCardData>();
    gameDataManager.getCards().forEach((serverCard, id) => {
      const sharedCard: SharedCardData = {
        cardId: serverCard.cardId,
        trophicLevel: serverCard.trophicLevel,
        trophicCategory: serverCard.trophicCategory,
        domain: serverCard.domain,
        cost: serverCard.cost,
        keywords: serverCard.keywords,
        abilities: serverCard.abilities || [],
        victoryPoints: serverCard.victoryPoints || 0,
        commonName: serverCard.commonName,
        scientificName: serverCard.scientificName || ''
      };
      cardDatabase.set(id, sharedCard);
    });

    const abilityDatabase = new Map<number, SharedAbilityData>();
    gameDataManager.getAbilities().forEach((serverAbility, id) => {
      const sharedAbility: SharedAbilityData = {
        abilityId: serverAbility.abilityID,
        abilityID: serverAbility.abilityID,
        name: `Ability ${serverAbility.abilityID}`,
        description: `Ability with trigger ${serverAbility.triggerID}`,
        cost: {},
        effects: serverAbility.effects,
        triggerID: serverAbility.triggerID
      };
      abilityDatabase.set(id, sharedAbility);
    });

    const keywordMap = new Map<number, string>();
    gameDataManager.getKeywords().forEach((keyword, id) => keywordMap.set(id, keyword.keyword_name));

    const engine = new BioMastersEngine(cardDatabase, abilityDatabase, keywordMap);
    engine.initializeNewGame('test-game', players, gameSettings);
    console.log(`✅ Game engine created successfully`);
    console.log(`  Game ID: ${engine.getGameState().gameId}`);
    console.log(`  Players: ${engine.getGameState().players.length}`);
    console.log(`  Current Phase: ${engine.getGameState().gamePhase}`);
    
    // 6. Test card lookup
    console.log('\n🔍 Testing card lookup in engine...');
    const cardData = engine.getCardData(1);
    if (cardData) {
      console.log(`✅ Engine can access card data`);
      console.log(`  Card 1 Keywords: ${cardData.keywords?.length || 0} keywords`);
    } else {
      console.log(`❌ Engine cannot access card data`);
    }
    
    console.log('\n🎉 JSON-driven engine test completed successfully!');
    
  } catch (error) {
    console.error('❌ JSON engine test failed:', error);
    throw error;
  }
}

// Run test
testJSONEngine().catch(console.error);
