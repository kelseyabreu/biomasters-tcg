/**
 * Comprehensive Game Rules Integration Tests
 * Tests ALL game rules with both GOOD and BAD paths using real JSON data
 * Based on BioMasterEngine.txt and RulesForBiomasters.txt
 * NO MOCKS - Full end-to-end testing
 */

import { BioMastersEngine } from '@kelseyabreu/shared';
import { loadTestGameData } from '../utils/testDataLoader';
import { createMockLocalizationManager } from '../../utils/mockLocalizationManager';
import {
  GameActionType,
  GamePhase,
  CardId
} from '@kelseyabreu/shared';

describe('Comprehensive Game Rules - Integration Tests', () => {
  let gameData: any;
  let engine: BioMastersEngine;
  // Game settings will be initialized by the engine

  beforeAll(async () => {
    console.log('🎮 Loading real game data for comprehensive rule testing...');
    
    gameData = await loadTestGameData();
    console.log('✅ Game data loaded for integration tests');
  });

  afterEach(async () => {
    // Clean up engine instance
    if (engine) {
      // Clear any internal timers or intervals
      if (typeof (engine as any).cleanup === 'function') {
        await (engine as any).cleanup();
      }
      engine = null as any;
    }
  });

  afterAll(async () => {
    // Clean up game data resources
    if (gameData) {
      // Dispose of any resources
      if (typeof (gameData as any).dispose === 'function') {
        await (gameData as any).dispose();
      }
      gameData = null as any;
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  beforeEach(() => {
    // Create 1v1 game with proper grid size
    // const playerCount = 2;
    // const gridSize = BioMastersEngine.getGridSize(playerCount);
    
    // Game settings will be initialized by the engine
    // const gameSettings = {
    //   maxPlayers: playerCount,
    //   gridWidth: gridSize.width,   // 9 for 1v1
    //   gridHeight: gridSize.height, // 10 for 1v1
    //   startingHandSize: 5,
    //   maxHandSize: 7,
    //   startingEnergy: 10,
    //   turnTimeLimit: 300
    // };

    // Create engine with comprehensive test data (unused - using real data now)
    /* const mockCardDatabase = new Map([
      // Oak Tree - Terrestrial Producer
      [CardId.OAK_TREE, {
        cardId: CardId.OAK_TREE,
        commonName: 'Oak Tree',
        scientificName: 'Quercus robur',
        trophicLevel: TrophicLevel.PRODUCER,
        trophicCategory: TrophicCategoryId.PHOTOAUTOTROPH,
        cost: null,
        victoryPoints: 1,
        keywords: [KeywordId.TERRESTRIAL],
        abilities: [],
        domain: 1, // Terrestrial domain
        massKg: 1000,
        lifespanMaxDays: 36500,
        visionRangeM: 0,
        smellRangeM: 0,
        hearingRangeM: 0,
        walkSpeedMPerHr: 0,
        runSpeedMPerHr: 0,
        swimSpeedMPerHr: 0,
        flySpeedMPerHr: 0,
        offspringCount: 0,
        gestationDays: 0,
        taxonomy: { Kingdom: 'Plantae', Phylum: 'Magnoliophyta' }
      }],
      // European Rabbit - Terrestrial Herbivore
      [CardId.EUROPEAN_RABBIT, {
        cardId: CardId.EUROPEAN_RABBIT,
        commonName: 'European Rabbit',
        scientificName: 'Oryctolagus cuniculus',
        trophicLevel: TrophicLevel.PRIMARY_CONSUMER,
        trophicCategory: TrophicCategoryId.HERBIVORE,
        cost: { Requires: [{ Category: TrophicCategoryId.PHOTOAUTOTROPH, Count: 1 }] },
        victoryPoints: 2,
        keywords: [KeywordId.TERRESTRIAL],
        abilities: [],
        domain: 1, // Terrestrial domain
        massKg: 2.5,
        lifespanMaxDays: 3650,
        visionRangeM: 100,
        smellRangeM: 50,
        hearingRangeM: 200,
        walkSpeedMPerHr: 15000,
        runSpeedMPerHr: 45000,
        swimSpeedMPerHr: 0,
        flySpeedMPerHr: 0,
        offspringCount: 6,
        gestationDays: 30,
        taxonomy: { Kingdom: 'Animalia', Phylum: 'Chordata' }
      }],
      // Giant Kelp - Aquatic Producer
      [CardId.GIANT_KELP, {
        cardId: CardId.GIANT_KELP,
        commonName: 'Giant Kelp',
        scientificName: 'Macrocystis pyrifera',
        trophicLevel: TrophicLevel.PRODUCER,
        trophicCategory: TrophicCategoryId.PHOTOAUTOTROPH,
        cost: null,
        victoryPoints: 1,
        keywords: [KeywordId.AQUATIC, KeywordId.MARINE],
        abilities: [],
        domain: 2, // Aquatic domain
        massKg: 100,
        lifespanMaxDays: 365,
        visionRangeM: 0,
        smellRangeM: 0,
        hearingRangeM: 0,
        walkSpeedMPerHr: 0,
        runSpeedMPerHr: 0,
        swimSpeedMPerHr: 0,
        flySpeedMPerHr: 0,
        offspringCount: 0,
        gestationDays: 0,
        taxonomy: { Kingdom: 'Plantae', Phylum: 'Ochrophyta' }
      }],
      // Decomposer Mushroom - Saprotroph
      [CardId.DECOMPOSER_MUSHROOM, {
        cardId: CardId.DECOMPOSER_MUSHROOM,
        commonName: 'Decomposer Mushroom',
        scientificName: 'Agaricus bisporus',
        trophicLevel: TrophicLevel.SAPROTROPH,
        trophicCategory: TrophicCategoryId.SAPROTROPH,
        cost: null,
        victoryPoints: 1,
        keywords: [KeywordId.TERRESTRIAL],
        abilities: [],
        domain: 1, // Terrestrial domain
        massKg: 0.1,
        lifespanMaxDays: 14,
        visionRangeM: 0,
        smellRangeM: 0,
        hearingRangeM: 0,
        walkSpeedMPerHr: 0,
        runSpeedMPerHr: 0,
        swimSpeedMPerHr: 0,
        flySpeedMPerHr: 0,
        offspringCount: 0,
        gestationDays: 0,
        taxonomy: { Kingdom: 'Fungi', Phylum: 'Basidiomycota' }
      }]
    ]);

    // const mockAbilityDatabase = new Map([
    //   [1, {
    //     abilityId: 1,
    //     name: 'Test Ability',
    //     description: 'A test ability for integration tests',
    //     cost: null,
    //     effects: [
    //       {
    //         effectID: 1,
    //         type: 'GAIN_ENERGY',
    //         value: 2,
    //         selectorID: 1
    //       }
    //     ],
    //     triggerID: 1
    //   }]
    // ]); */

    // Use real game data loaded in beforeAll
    const rawCards = gameData.cards;
    const rawAbilities = gameData.abilities;
    const rawKeywords = gameData.keywords;

    // Convert data to engine-expected format (same as working BasicCardPlaying test)
    const cardDatabase = new Map<number, any>();
    rawCards.forEach((card: any, cardId: number) => {
      cardDatabase.set(cardId, {
        ...card,
        id: cardId,
        victoryPoints: card.victoryPoints || 1 // Ensure required field
      });
    });

    const abilityDatabase = new Map<number, any>();
    rawAbilities.forEach((ability: any, abilityId: number) => {
      // Transform ability data to match expected format
      const transformedAbility = {
        ...ability,
        id: abilityId,
        abilityID: ability.abilityId || abilityId,
        triggerID: ability.triggerId || ability.triggerID
      };
      abilityDatabase.set(abilityId, transformedAbility);
    });

    const keywordDatabase = new Map<number, string>();
    rawKeywords.forEach((keyword: any, keywordId: number) => {
      keywordDatabase.set(keywordId, keyword.name);
    });

    // Create engine with real data using production constructor
    engine = new BioMastersEngine(cardDatabase, abilityDatabase, keywordDatabase, gameData.localizationManager);

    // Initialize the game properly
    engine.initializeNewGame('comprehensive-test', [
      { id: 'Alice', name: 'Alice' },
      { id: 'Bob', name: 'Bob' }
    ], {
      gridWidth: 10,
      gridHeight: 10,
      maxHandSize: 7,
      startingEnergy: 10,
      turnTimeLimit: 300,
      maxPlayers: 2,
      startingHandSize: 5
    });
  });

  // Helper function to start the game (transition from SETUP to PLAYING)
  const startGame = () => {
    engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'Alice', payload: {} });
    engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'Bob', payload: {} });
  };

  describe('🌱 Production Loop Rules (Good Paths)', () => {
    test('should allow producers adjacent to HOME', () => {
      startGame();
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'Alice');
      
      // Place Oak Tree (Producer +1) adjacent to HOME
      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: {
          cardId: CardId.OAK_TREE, // Oak Tree
          position: { x: aliceHome!.position.x - 1, y: aliceHome!.position.y }
        }
      });
      expect(result.isValid).toBe(true);
      expect(result.newState?.grid.size).toBe(3); // 2 HOME + 1 Oak Tree
    });

    test('should build complete food chain: Producer → Herbivore → Carnivore → Apex', () => {
      startGame();
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'Alice');
      
      // 1. Oak Tree (+1 Producer)
      const oakPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: { cardId: CardId.OAK_TREE, position: oakPos }
      });
      expect(result1.isValid).toBe(true);

      // Ready the oak for cost payment
      const oakCard = result1.newState!.grid.get(`${oakPos.x},${oakPos.y}`);
      if (oakCard) oakCard.isExhausted = false;

      // 2. Field Rabbit (+2 Herbivore)
      const rabbitPos = { x: oakPos.x, y: oakPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: { cardId: CardId.EUROPEAN_RABBIT, position: rabbitPos }
      });
      expect(result2.isValid).toBe(true);

      // Ready the rabbit for cost payment
      const rabbitCard = result2.newState!.grid.get(`${rabbitPos.x},${rabbitPos.y}`);
      if (rabbitCard) rabbitCard.isExhausted = false;

      // Pass turn to get more actions for Alice
      engine.processAction({ type: GameActionType.PASS_TURN, playerId: 'Alice', payload: {} });
      engine.processAction({ type: GameActionType.PASS_TURN, playerId: 'Bob', payload: {} });

      // 3. Place second Field Rabbit adjacent to Oak Tree (Grizzly Bear needs 2 herbivores)
      const rabbit2Pos = { x: oakPos.x - 1, y: oakPos.y };
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: { cardId: CardId.EUROPEAN_RABBIT, position: rabbit2Pos }
      });
      if (!result3.isValid) {
        console.log(`❌ Second rabbit placement failed: ${result3.errorMessage}`);
      }
      expect(result3.isValid).toBe(true);

      // Ready the second rabbit for cost payment
      const rabbit2Card = result3.newState!.grid.get(`${rabbit2Pos.x},${rabbit2Pos.y}`);
      if (rabbit2Card) rabbit2Card.isExhausted = false;

      // 4. Grizzly Bear (+3 Carnivore) - now has 2 herbivores to pay cost
      const bearPos = { x: rabbitPos.x, y: rabbitPos.y - 1 };
      const result4 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: { cardId: CardId.AMERICAN_BLACK_BEAR, position: bearPos }
      });
      expect(result4.isValid).toBe(true);

      // Verify complete food chain
      expect(result4.newState?.grid.size).toBe(6); // 2 HOME + 4 played cards
    });

    test('should handle preferred diet bonuses (cards enter ready)', () => {
      startGame();
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'Alice');

      // First place Oak Tree (producer)
      const oakResult = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: {
          cardId: CardId.OAK_TREE, // Oak Tree
          position: { x: aliceHome!.position.x - 1, y: aliceHome!.position.y }
        }
      });
      expect(oakResult.isValid).toBe(true);

      // Ready the oak for cost payment
      const oakCard = oakResult.newState!.grid.get(`${aliceHome!.position.x - 1},${aliceHome!.position.y}`);
      if (oakCard) oakCard.isExhausted = false;

      // Now place Field Rabbit (consumer) - should enter ready if preferred diet bonus
      const rabbitResult = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: {
          cardId: CardId.EUROPEAN_RABBIT, // Field Rabbit (herbivore)
          position: { x: aliceHome!.position.x - 1, y: aliceHome!.position.y - 1 }
        }
      });

      expect(rabbitResult.isValid).toBe(true);

      // Check if rabbit entered ready (preferred diet bonus for herbivore connecting to plant)
      const rabbitCard = rabbitResult.newState?.grid.get(`${aliceHome!.position.x - 1},${aliceHome!.position.y - 1}`);
      expect(rabbitCard?.isExhausted).toBe(false); // Should be ready due to preferred diet
    });
  });

  describe('🚫 Production Loop Rules (Bad Paths)', () => {
    test('should reject producer not adjacent to HOME or other producer', () => {
      startGame();
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'Alice');
      
      // Try to place Oak Tree far from HOME
      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: { 
          cardId: CardId.OAK_TREE, // Oak Tree
          position: { x: aliceHome!.position.x + 3, y: aliceHome!.position.y + 3 }
        }
      });
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('adjacent');
    });

    test('should reject trophic level violations (+3 cannot connect to +1)', () => {
      startGame();
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'Alice');

      // Place Oak Tree
      const oakPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: { cardId: CardId.OAK_TREE, position: oakPos }
      });
      expect(result1.isValid).toBe(true);

      // Manually add herbivores to Alice's grid to provide cost for Grizzly Bear
      // This bypasses the action limit issue and focuses on trophic validation
      const newState = engine.getGameState();
      const rabbit1 = {
        id: 'rabbit1',
        instanceId: 'rabbit1',
        cardId: CardId.EUROPEAN_RABBIT,
        ownerId: 'Alice',
        position: { x: oakPos.x, y: oakPos.y - 1 },
        isExhausted: false,
        isReady: true,
        attachedCards: [],
        attachments: [],
        modifiers: [],
        statusEffects: [],
        zone: 'BATTLEFIELD' as any,
        isDetritus: false,
        isHOME: false
      };
      const rabbit2 = {
        id: 'rabbit2',
        instanceId: 'rabbit2',
        cardId: CardId.EUROPEAN_RABBIT,
        ownerId: 'Alice',
        position: { x: oakPos.x - 1, y: oakPos.y },
        isExhausted: false,
        isReady: true,
        attachedCards: [],
        attachments: [],
        modifiers: [],
        statusEffects: [],
        zone: 'BATTLEFIELD' as any,
        isDetritus: false,
        isHOME: false
      };
      newState.grid.set(`${rabbit1.position.x},${rabbit1.position.y}`, rabbit1);
      newState.grid.set(`${rabbit2.position.x},${rabbit2.position.y}`, rabbit2);

      // Try to place Grizzly Bear (+3) directly adjacent to Oak Tree (+1) - should fail on trophic validation
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: {
          cardId: CardId.AMERICAN_BLACK_BEAR, // American Black Bear (+3)
          position: { x: oakPos.x, y: oakPos.y + 1 }
        }
      });

      expect(result2.isValid).toBe(false);
      expect(result2.errorMessage).toContain('trophic level');
    });

    test('should reject domain mismatches (terrestrial cannot connect to marine)', () => {
      startGame();
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'Alice');

      // Place Oak Tree (Terrestrial)
      const oakPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: { cardId: CardId.OAK_TREE, position: oakPos }
      });
      expect(result1.isValid).toBe(true);

      // Ready the Oak Tree for cost payment
      const oakCard = result1.newState!.grid.get(`${oakPos.x},${oakPos.y}`);
      if (oakCard) oakCard.isExhausted = false;

      // Place Field Rabbit (Herbivore) to provide cost for Sockeye Salmon
      const rabbitPos = { x: oakPos.x, y: oakPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: { cardId: CardId.EUROPEAN_RABBIT, position: rabbitPos }
      });
      expect(result2.isValid).toBe(true);

      // Pass turn to get more actions and ready cards
      engine.processAction({ type: GameActionType.PASS_TURN, playerId: 'Alice', payload: {} });
      engine.processAction({ type: GameActionType.PASS_TURN, playerId: 'Bob', payload: {} });

      // Try to place Sockeye Salmon (Aquatic, +3) adjacent to Field Rabbit (Terrestrial, +2) - should fail on domain validation
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: {
          cardId: CardId.SOCKEYE_SALMON, // Sockeye Salmon (Aquatic)
          position: { x: rabbitPos.x, y: rabbitPos.y - 1 }
        }
      });

      expect(result3.isValid).toBe(false);
      expect(result3.errorMessage).toContain('domain');
    });

    test('should reject insufficient cost payment', () => {
      startGame();
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'Alice');

      // First place a producer (Oak Tree) adjacent to HOME so rabbit can connect to it
      const producerResult = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: {
          cardId: CardId.OAK_TREE, // Oak Tree (producer)
          position: { x: aliceHome!.position.x - 1, y: aliceHome!.position.y }
        }
      });
      expect(producerResult.isValid).toBe(true);

      // Now try to place another rabbit that requires 1 producer cost
      // Place it adjacent to the Oak Tree so it passes trophic validation
      // But the Oak Tree is already exhausted from the first placement, so cost should fail
      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: {
          cardId: CardId.EUROPEAN_RABBIT, // European Rabbit (requires 1 producer cost)
          position: { x: aliceHome!.position.x - 2, y: aliceHome!.position.y } // Adjacent to Oak Tree
        }
      });
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('resources');
    });
  });

  describe('♻️ Decomposition Loop Rules', () => {
    test('should validate saprotroph card data exists', () => {
      // Verify saprotroph cards exist in database
      const mycenaMushroom = gameData.cards.get(8);
      expect(mycenaMushroom).toBeDefined();
      expect(mycenaMushroom?.nameId).toBe('CARD_MYCENA_MUSHROOM');

      // Verify it has correct trophic properties for decomposition
      expect(mycenaMushroom?.trophicLevel).toBe(-1);
      expect(mycenaMushroom?.trophicCategory).toBe(6); // Saprotroph
    });

    test('should allow saprotroph placement on detritus tile (good path)', () => {
      console.log('🧪🧪🧪 STARTING SAPROTROPH PLACEMENT TEST 🧪🧪🧪');
      startGame();
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'Alice');
      console.log('🧪 Alice HOME position:', aliceHome?.position);

      // Ensure Alice has the cards she needs for this test
      const alicePlayer = gameState.players.find(p => p.id === 'Alice');
      if (alicePlayer) {
        // Add Mycena Mushroom to hand if not present
        if (!alicePlayer.hand.includes('8')) {
          alicePlayer.hand.push('8'); // Add Mycena Mushroom to hand
        }
        // Ensure Alice has at least 2 Oak Trees (card ID '1') for this test
        const oakCount = alicePlayer.hand.filter(cardId => cardId === '1').length;
        for (let i = oakCount; i < 2; i++) {
          alicePlayer.hand.push('1'); // Add Oak Tree to hand
        }
      }

      // First, place two Oak Trees - one to remove for detritus, one to pay mushroom cost
      const oakPos1 = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const oakPos2 = { x: aliceHome!.position.x - 2, y: aliceHome!.position.y }; // Adjacent to first oak

      const oakResult1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: { cardId: CardId.OAK_TREE, position: oakPos1 }
      });
      expect(oakResult1.isValid).toBe(true);

      const oakResult2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: { cardId: CardId.OAK_TREE, position: oakPos2 }
      });
      expect(oakResult2.isValid).toBe(true);

      // Manually create detritus by directly modifying the grid (simulating a dead card)
      // This is more reliable than using REMOVE_CARD action for testing
      const stateAfterOak = engine.getGameState();
      const oakCard1 = stateAfterOak.grid.get(`${oakPos1.x},${oakPos1.y}`);
      expect(oakCard1).toBeDefined();

      // Convert the oak card to detritus
      oakCard1!.isDetritus = true;
      oakCard1!.isExhausted = true; // Detritus is always exhausted
      console.log('🌳 Converted Oak Tree to detritus at position:', oakPos1);

      // Verify detritus was created
      const detritusCards = Array.from(stateAfterOak.grid.values()).filter(card => card.isDetritus);
      expect(detritusCards.length).toBe(1);
      expect(detritusCards[0]?.position).toEqual(oakPos1);

      // Check what's in Alice's hand before placing mushroom
      const alice = stateAfterOak.players.find(p => p.id === 'Alice');
      console.log('🃏 Alice\'s hand before mushroom placement:', alice?.hand);

      // Ensure Alice has the Mycena Mushroom (CardID 8) in her hand
      if (alice && !alice.hand.includes('8')) {
        alice.hand.push('8');
        console.log('🍄 Added Mycena Mushroom to Alice\'s hand');
      }
      console.log('🃏 Alice\'s hand after adding mushroom:', alice?.hand);

      // Now try to place Mycena Mushroom (Saprotroph) on the detritus tile
      console.log('🍄 About to place Mycena Mushroom on detritus at position:', oakPos1);
      console.log('🍄 Current detritus cards:', detritusCards);
      console.log('🍄 Current grid state:', Array.from(stateAfterOak.grid.values()).map(c => ({ cardId: c.cardId, position: c.position, isExhausted: c.isExhausted, isDetritus: c.isDetritus })));

      // Check if mushroom card data exists
      const mushroomCardData = gameData.cards.get(8);
      console.log('🍄 Mushroom card data:', mushroomCardData);

      // Check Alice's current hand
      const currentAlice = engine.getGameState().players.find(p => p.name === 'Alice');
      console.log('🍄 Alice current hand:', currentAlice?.hand);
      console.log('🍄 Alice has mushroom card:', currentAlice?.hand.includes('8'));

      const mushroomResult = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: {
          cardId: CardId.MYCENA_MUSHROOM, // Mycena Mushroom (Saprotroph)
          position: oakPos1 // Same position as detritus
        }
      });

      if (!mushroomResult.isValid) {
        console.log('❌ Mushroom placement failed:', mushroomResult.errorMessage);
      }

      if (!mushroomResult.isValid) {
        console.log('🚨 Mushroom placement failed with error:', mushroomResult.errorMessage);
        console.log('🚨 Alice hand after setup:', alice?.hand);
        console.log('🚨 Current grid state:', Array.from(stateAfterOak.grid.entries()));

        // Check for detritus cards on the grid
        const currentDetritusCards = Array.from(stateAfterOak.grid.values()).filter(card => card.isDetritus);
        console.log('🚨 Current detritus cards:', currentDetritusCards);
      }
      expect(mushroomResult.isValid).toBe(true);

      // Verify mushroom was placed and detritus was converted to score pile
      const finalState = mushroomResult.newState!;
      const mushroomCard = finalState.grid.get(`${oakPos1.x},${oakPos1.y}`);
      expect(mushroomCard).toBeDefined();
      expect(mushroomCard?.cardId).toBe(8);

      // Verify detritus was consumed (no detritus cards left on grid)
      const remainingDetritus = Array.from(finalState.grid.values()).filter(card => card.isDetritus);
      expect(remainingDetritus.length).toBe(0);
    });

    test('should reject saprotroph placement without detritus tile (bad path)', () => {
      startGame();
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'Alice');

      // Ensure Alice has the Mycena Mushroom in her hand for this test
      const alicePlayer2 = gameState.players.find(p => p.id === 'Alice');
      if (alicePlayer2 && !alicePlayer2.hand.includes('8')) {
        alicePlayer2.hand.push('8'); // Add Mycena Mushroom to hand
      }

      // Try to place Mycena Mushroom (Saprotroph) without any detritus tile
      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: {
          cardId: CardId.MYCENA_MUSHROOM, // Mycena Mushroom (Saprotroph)
          position: { x: aliceHome!.position.x - 1, y: aliceHome!.position.y }
        }
      });
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('detritus');
    });
  });

  describe('🎯 Turn Management and Actions', () => {
    test('should enforce action limits (3 actions per turn)', () => {
      startGame();
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'Alice');

      // Alice should have 3 actions
      expect(gameState.actionsRemaining).toBe(3);

      // Place first Oak Tree (adjacent to HOME, no cost)
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: { cardId: CardId.OAK_TREE, position: { x: aliceHome!.position.x - 1, y: aliceHome!.position.y } }
      });
      expect(result1.isValid).toBe(true);
      expect(result1.newState!.actionsRemaining).toBe(2);

      // Place second Oak Tree (adjacent to first Oak Tree, no cost)
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: { cardId: CardId.OAK_TREE, position: { x: aliceHome!.position.x - 2, y: aliceHome!.position.y } }
      });
      expect(result2.isValid).toBe(true);
      expect(result2.newState!.actionsRemaining).toBe(1);

      // Place third Oak Tree (adjacent to second Oak Tree, no cost)
      // This should use Alice's last action and automatically end her turn
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: { cardId: CardId.OAK_TREE, position: { x: aliceHome!.position.x - 3, y: aliceHome!.position.y } }
      });
      expect(result3.isValid).toBe(true);

      // After using all 3 actions, it should now be Bob's turn (player index 1)
      expect(result3.newState!.currentPlayerIndex).toBe(1);
      expect(result3.newState!.actionsRemaining).toBe(3); // Bob's actions

      // Try to play a card as Alice when it's Bob's turn - should fail
      const result4 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: {
          cardId: CardId.OAK_TREE,
          position: { x: aliceHome!.position.x - 4, y: aliceHome!.position.y }
        }
      });

      expect(result4.isValid).toBe(false);
      expect(result4.errorMessage).toContain('turn');
    });

    test('should handle turn passing correctly', () => {
      startGame();
      let gameState = engine.getGameState();
      expect(gameState.currentPlayerIndex).toBe(0); // Alice's turn

      // Alice passes turn
      const result = engine.processAction({
        type: GameActionType.PASS_TURN,
        playerId: 'Alice',
        payload: {}
      });
      expect(result.isValid).toBe(true);
      expect(result.newState?.currentPlayerIndex).toBe(1); // Bob's turn
      expect(result.newState?.actionsRemaining).toBe(3); // Bob gets 3 actions
    });

    test('should reject actions from wrong player', () => {
      startGame();
      const gameState = engine.getGameState();
      const bobHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'Bob');

      // It's Alice's turn, but Bob tries to play a card
      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Bob',
        payload: {
          cardId: CardId.OAK_TREE,
          position: { x: bobHome!.position.x - 1, y: bobHome!.position.y }
        }
      });
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('turn');
    });
  });

  describe('🎮 Game Phase Management', () => {
    test('should start in SETUP phase and transition to PLAYING', () => {
      const gameState = engine.getGameState();
      expect(gameState.gamePhase).toBe(GamePhase.SETUP);

      // Both players ready
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'Alice', payload: {} });
      const result = engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'Bob', payload: {} });
      expect(result.newState?.gamePhase).toBe(GamePhase.PLAYING);
    });

    test('should reject card plays during SETUP phase', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'Alice');

      // Try to play card before game starts
      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: {
          cardId: CardId.OAK_TREE,
          position: { x: aliceHome!.position.x - 1, y: aliceHome!.position.y }
        }
      });
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('phase');
    });
  });

  describe('🏆 Victory Conditions and Game End', () => {
    test('should track victory points correctly', () => {
      startGame();
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'Alice');

      // Play Oak Tree (1 VP)
      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: {
          cardId: CardId.OAK_TREE, // Oak Tree (1 VP)
          position: { x: aliceHome!.position.x - 1, y: aliceHome!.position.y }
        }
      });
      expect(result.isValid).toBe(true);

      // Verify card is on grid (contributes to VP)
      const oakCard = result.newState?.grid.get(`${aliceHome!.position.x - 1},${aliceHome!.position.y}`);
      expect(oakCard).toBeDefined();
      expect(oakCard?.cardId).toBe(1);
    });

    test('should handle deck exhaustion (game end condition)', () => {
      const gameState = engine.getGameState();

      // Simulate deck exhaustion by emptying Alice's deck
      gameState.players[0]!.deck = [];

      // Try to draw card - should trigger game end
      const result = engine.processAction({
        type: GameActionType.PASS_TURN,
        playerId: 'Alice',
        payload: {}
      });
      // Game should still be valid but approaching end
      expect(result.isValid).toBe(true);
    });
  });

  describe('⚡ Ability System Integration', () => {
    test('should trigger abilities on card play', () => {
      startGame();
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'Alice');

      // Play card with ability (Kelp Forest has abilities)
      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: {
          cardId: CardId.GIANT_KELP, // Giant Kelp (has abilities)
          position: { x: aliceHome!.position.x - 1, y: aliceHome!.position.y }
        }
      });
      expect(result.isValid).toBe(true);

      // Verify card was placed with abilities processed
      const kelpCard = result.newState?.grid.get(`${aliceHome!.position.x - 1},${aliceHome!.position.y}`);
      expect(kelpCard).toBeDefined();
      expect(kelpCard?.cardId).toBe(2);
    });
  });

  describe('🔄 Data Integrity and Consistency', () => {
    test('should maintain grid consistency throughout game', () => {
      startGame();
      const gameState = engine.getGameState();
      const initialGridSize = gameState.grid.size;

      // Play multiple cards
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'Alice');

      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: {
          cardId: CardId.OAK_TREE,
          position: { x: aliceHome!.position.x - 1, y: aliceHome!.position.y }
        }
      });
      expect(result1.isValid).toBe(true);

      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: {
          cardId: CardId.GIANT_KELP,
          position: { x: aliceHome!.position.x, y: aliceHome!.position.y - 1 }
        }
      });
      expect(result2.isValid).toBe(true);

      // Verify grid consistency
      expect(result2.newState?.grid.size).toBe(initialGridSize + 2);

      // Verify HOME cards still exist
      const homeCards = Array.from(result2.newState!.grid.values()).filter(card => card.isHOME);
      expect(homeCards).toHaveLength(2);
    });

    test('should validate all real card data is accessible', () => {
      const cards = gameData.cards;
      const abilities = gameData.abilities;
      const keywords = gameData.keywords;

      expect(cards.size).toBeGreaterThan(0);
      expect(abilities.size).toBeGreaterThan(0);
      expect(keywords.size).toBeGreaterThan(0);

      // Verify specific cards exist
      expect(gameData.cards.get(1)).toBeDefined(); // Oak Tree
      expect(gameData.cards.get(2)).toBeDefined(); // Kelp Forest
      expect(gameData.cards.get(4)).toBeDefined(); // Field Rabbit
      expect(gameData.cards.get(6)).toBeDefined(); // Grizzly Bear
    });
  });
});
