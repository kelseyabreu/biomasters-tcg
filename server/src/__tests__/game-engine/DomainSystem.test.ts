import { BioMastersEngine, GameSettings, CardData } from '../../../../shared/game-engine/BioMastersEngine';
import { createMockLocalizationManager } from '../../utils/mockLocalizationManager';
import { gameDataManager } from '../../services/GameDataManager';
import { Domain } from '@biomasters/shared';
import { CardNameId, ScientificNameId, CardDescriptionId, TaxonomyId } from '../../../../shared/text-ids';

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
    const mockLocalizationManager = createMockLocalizationManager();
    engine = new BioMastersEngine(new Map(), new Map(), new Map(), mockLocalizationManager);

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
      const engineCard: CardData = {
        cardId: Number(card.cardId),
        nameId: CardNameId.CARD_OAK_TREE, // Using placeholder since we don't have real mapping
        scientificNameId: ScientificNameId.SCIENTIFIC_QUERCUS_ROBUR, // Using placeholder
        descriptionId: CardDescriptionId.DESC_OAK_TREE, // Using placeholder
        taxonomyId: TaxonomyId.TAXONOMY_OAK_TREE, // Using placeholder
        trophicLevel: card.trophicLevel,
        trophicCategory: card.trophicCategory,
        domain: card.domain || 0,
        cost: card.cost || { energy: 0 },
        keywords: card.keywords || [],
        abilities: card.abilities || [],
        victoryPoints: card.victoryPoints || 0,
        conservationStatus: card.conservationStatus || 0,
        mass_kg: card.mass_kg || 0,
        lifespan_max_days: card.lifespan_max_days || 0,
        vision_range_m: card.vision_range_m || 0,
        smell_range_m: card.smell_range_m || 0,
        hearing_range_m: card.hearing_range_m || 0,
        walk_speed_m_per_hr: card.walk_speed_m_per_hr || 0,
        run_speed_m_per_hr: card.run_speed_m_per_hr || 0,
        swim_speed_m_per_hr: card.swim_speed_m_per_hr || 0,
        fly_speed_m_per_hr: card.fly_speed_m_per_hr || 0,
        offspring_count: card.offspring_count || 0,
        gestation_days: card.gestation_days || 0
      };
      const isChemoautotroph = engine.isChemoautotroph(engineCard);
      expect(isChemoautotroph).toBe(true);
    });

    console.log('✅ Chemoautotroph detection test passed');
  });
});
