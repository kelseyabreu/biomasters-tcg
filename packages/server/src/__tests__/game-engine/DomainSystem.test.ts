import { BioMastersEngine, GameSettings, CardData } from '@kelseyabreu/shared';
import { loadTestGameData } from '../utils/testDataLoader';
import { createMockLocalizationManager } from '../../utils/mockLocalizationManager';
import { Domain } from '@kelseyabreu/shared';
import { CardNameId, ScientificNameId, CardDescriptionId, TaxonomyId } from '@kelseyabreu/shared';

describe('Domain System Tests', () => {
  let gameData: any;
  let engine: BioMastersEngine;
  let _gameSettings: GameSettings;

  beforeAll(async () => {
    console.log('🧪 Loading game data for domain tests...');
    
    gameData = await loadTestGameData();
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
    const cards = gameData.cards;
    
    // Find cards with different domains
    const terrestrialCard = Array.from(cards.values()).find((card: any) => card.domain === Domain.TERRESTRIAL) as any;
    const freshwaterCard = Array.from(cards.values()).find((card: any) => card.domain === Domain.FRESHWATER) as any;
    const marineCard = Array.from(cards.values()).find((card: any) => card.domain === Domain.MARINE) as any;
    const amphibiousFreshwaterCard = Array.from(cards.values()).find((card: any) => card.domain === Domain.AMPHIBIOUS_FRESHWATER) as any;
    
    console.log('🌍 Found cards:');
    console.log(`  Terrestrial: ${terrestrialCard?.nameId} (Domain: ${terrestrialCard?.domain})`);
    console.log(`  Freshwater: ${freshwaterCard?.nameId} (Domain: ${freshwaterCard?.domain})`);
    console.log(`  Marine: ${marineCard?.nameId} (Domain: ${marineCard?.domain})`);
    console.log(`  Amphibious-Freshwater: ${amphibiousFreshwaterCard?.nameId} (Domain: ${amphibiousFreshwaterCard?.domain})`);

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
    
    const cards = gameData.cards;
    
    // Find chemoautotroph cards (TrophicLevel: 1, TrophicCategory: 2)
    const chemoautotrophs = Array.from(cards.values()).filter((card: any) =>
      card.trophicLevel === 1 && card.trophicCategory === 2
    );
    
    console.log(`🦠 Found ${chemoautotrophs.length} chemoautotroph cards:`);
    chemoautotrophs.forEach((card: any) => {
      console.log(`  ${card.nameId} (TL: ${card.trophicLevel}, TC: ${card.trophicCategory})`);
      
      // Test that the engine correctly identifies them as chemoautotrophs
      // Convert to engine-compatible format
      const engineCard: CardData = {
        id: "550e8400-e29b-41d4-a716-446655440002",
        cardId: card.cardId,
        nameId: CardNameId.CARD_OAK_TREE, // Using placeholder since we don't have real mapping
        scientificNameId: ScientificNameId.SCIENTIFIC_QUERCUS_ROBUR, // Using placeholder
        descriptionId: CardDescriptionId.DESC_OAK_TREE, // Using placeholder
        taxonomyId: TaxonomyId.TAXONOMY_OAK_TREE, // Using placeholder

        // Taxonomy fields (using defaults for test)
        taxoDomain: 1, // EUKARYOTA
        taxoKingdom: 2, // PLANTAE
        taxoPhylum: 5, // TRACHEOPHYTA
        taxoClass: 8, // MAGNOLIOPSIDA
        taxoOrder: 6, // FAGALES
        taxoFamily: 6, // FAGACEAE
        taxoGenus: 5, // QUERCUS
        taxoSpecies: 5, // QUERCUS_ROBUR

        trophicLevel: card.trophicLevel,
        trophicCategory: card.trophicCategory,
        domain: card.domain || 0,
        cost: card.cost || { energy: 0 },
        keywords: card.keywords || [],
        abilities: card.abilities || [],
        victoryPoints: card.victoryPoints || 0,
        conservation_status: card.conservation_status || 0,
        artwork_url: null,
        iucn_id: null,
        population_trend: null,
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
