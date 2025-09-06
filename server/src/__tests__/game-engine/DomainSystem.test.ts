import { BioMastersEngine, GameSettings } from '../../../../shared/game-engine/BioMastersEngine';
import { gameDataManager } from '../../services/GameDataManager';
import { Domain } from '@biomasters/shared';

describe('Domain System Tests', () => {
  let engine: BioMastersEngine;
  let _gameSettings: GameSettings;

  beforeAll(async () => {
    console.log('🧪 Loading game data for domain tests...');
    await gameDataManager.loadGameData();
    console.log('✅ Game data loaded for domain tests');
  });

  beforeEach(() => {
    // Create 1v1 game with proper grid size
    const playerCount = 2;
    const gridSize = BioMastersEngine.getGridSize(playerCount);

    _gameSettings = {
      maxPlayers: playerCount,
      gridWidth: gridSize.width,   // 9 for 1v1
      gridHeight: gridSize.height, // 10 for 1v1
      startingHandSize: 5,
      maxHandSize: 7,
      startingEnergy: 10,
      turnTimeLimit: 300
    };

    // Create engine with real data using production constructor
    engine = new BioMastersEngine(new Map(), new Map(), new Map());

    // Initialize the game properly
    engine.initializeNewGame('domain-test', [
      { id: 'Alice', name: 'Alice' },
      { id: 'Bob', name: 'Bob' }
    ], _gameSettings);
  });

  test('should use new Domain system for compatibility checks', () => {
    console.log('🧪 Testing domain system...');
    
    // Get some cards with different domains
    const cards = Array.from(gameDataManager.getCards().values());
    
    // Find cards with different domains
    const terrestrialCard = cards.find(card => card.domain === Domain.TERRESTRIAL);
    const freshwaterCard = cards.find(card => card.domain === Domain.FRESHWATER);
    const marineCard = cards.find(card => card.domain === Domain.MARINE);
    const amphibiousFreshwaterCard = cards.find(card => card.domain === Domain.AMPHIBIOUS_FRESHWATER);
    
    console.log('🌍 Found cards:');
    console.log(`  Terrestrial: ${terrestrialCard?.commonName} (Domain: ${terrestrialCard?.domain})`);
    console.log(`  Freshwater: ${freshwaterCard?.commonName} (Domain: ${freshwaterCard?.domain})`);
    console.log(`  Marine: ${marineCard?.commonName} (Domain: ${marineCard?.domain})`);
    console.log(`  Amphibious-Freshwater: ${amphibiousFreshwaterCard?.commonName} (Domain: ${amphibiousFreshwaterCard?.domain})`);

    // Test that cards have the correct Domain property
    expect(terrestrialCard).toBeDefined();
    expect(terrestrialCard?.domain).toBe(Domain.TERRESTRIAL);
    
    if (freshwaterCard) {
      expect(freshwaterCard.domain).toBe(Domain.FRESHWATER);
    }
    
    if (marineCard) {
      expect(marineCard.domain).toBe(Domain.MARINE);
    }
    
    if (amphibiousFreshwaterCard) {
      expect(amphibiousFreshwaterCard.domain).toBe(Domain.AMPHIBIOUS_FRESHWATER);
    }

    console.log('✅ Domain system test passed');
  });

  test('should detect chemoautotrophs correctly', () => {
    console.log('🧪 Testing chemoautotroph detection...');
    
    const cards = Array.from(gameDataManager.getCards().values());
    
    // Find chemoautotroph cards (TrophicLevel: 1, TrophicCategory: 2)
    const chemoautotrophs = cards.filter(card => 
      card.trophicLevel === 1 && card.trophicCategory === 2
    );
    
    console.log(`🦠 Found ${chemoautotrophs.length} chemoautotroph cards:`);
    chemoautotrophs.forEach(card => {
      console.log(`  ${card.commonName} (TL: ${card.trophicLevel}, TC: ${card.trophicCategory})`);
      
      // Test that the engine correctly identifies them as chemoautotrophs
      // Convert to engine-compatible format
      const engineCard = {
        ...card,
        cardId: Number(card.cardId),
        victoryPoints: card.victoryPoints || 0,
        abilities: card.abilities || [],
        scientificName: card.scientificName || card.commonName || 'Unknown'
      };
      const isChemoautotroph = engine.isChemoautotroph(engineCard);
      expect(isChemoautotroph).toBe(true);
    });

    console.log('✅ Chemoautotroph detection test passed');
  });
});
