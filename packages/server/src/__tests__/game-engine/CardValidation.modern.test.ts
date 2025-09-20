/**
 * Card Validation Tests - Modern Version
 * Updated to use proper enums, data-driven approach, and correct biological validation
 */

import { BioMastersEngine, GameSettings } from '@kelseyabreu/shared';
import { createMockLocalizationManager } from '../../utils/mockLocalizationManager';
import {
  GameActionType,
  TrophicLevel,
  TrophicCategoryId,
  KeywordId
} from '@kelseyabreu/shared';

describe('Card Validation and Biological Accuracy - Modern', () => {
  let engine: BioMastersEngine;
  let gameSettings: GameSettings;
  let mockCardDatabase: Map<number, any>;
  let mockAbilityDatabase: Map<number, any>;

  beforeEach(() => {
    // Create biologically accurate test cards with proper interface structure
    mockCardDatabase = new Map([
      // Primary Producer (Trophic Level 1) - Kelp Forest
      [1, {
        id: 1,
        nameId: 'CARD_GIANT_KELP',
        scientificNameId: 'SCIENTIFIC_MACROCYSTIS_PYRIFERA',
        descriptionId: 'DESC_GIANT_KELP',
        taxonomyId: 'TAXONOMY_GIANT_KELP',
        trophicLevel: TrophicLevel.PRODUCER,
        trophicCategory: TrophicCategoryId.PHOTOAUTOTROPH,
        cost: null, // Producers are free
        victoryPoints: 1,
        keywords: [KeywordId.AQUATIC],
        abilities: [],
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
      // Primary Consumer (Trophic Level 2) - Sea Urchin
      [2, {
        id: 2,
        nameId: 'CARD_PURPLE_SEA_URCHIN',
        scientificNameId: 'SCIENTIFIC_STRONGYLOCENTROTUS_PURPURATUS',
        descriptionId: 'DESC_PURPLE_SEA_URCHIN',
        taxonomyId: 'TAXONOMY_PURPLE_SEA_URCHIN',
        trophicLevel: TrophicLevel.PRIMARY_CONSUMER,
        trophicCategory: TrophicCategoryId.HERBIVORE,
        cost: { Requires: [{ Category: TrophicCategoryId.PHOTOAUTOTROPH, Count: 1 }] },
        victoryPoints: 2,
        keywords: [KeywordId.AQUATIC],
        abilities: [],
        massKg: 0.5,
        lifespanMaxDays: 1825,
        visionRangeM: 1,
        smellRangeM: 2,
        hearingRangeM: 0,
        walkSpeedMPerHr: 10,
        runSpeedMPerHr: 0,
        swimSpeedMPerHr: 0,
        flySpeedMPerHr: 0,
        offspringCount: 1000000,
        gestationDays: 30,
        taxonomy: { Kingdom: 'Animalia', Phylum: 'Echinodermata' }
      }],
      // Secondary Consumer (Trophic Level 3) - Sea Otter
      [3, {
        id: 3,
        nameId: 'CARD_SEA_OTTER',
        scientificNameId: 'SCIENTIFIC_ENHYDRA_LUTRIS',
        descriptionId: 'DESC_SEA_OTTER',
        taxonomyId: 'TAXONOMY_SEA_OTTER',
        trophicLevel: TrophicLevel.SECONDARY_CONSUMER,
        trophicCategory: TrophicCategoryId.CARNIVORE,
        cost: { Requires: [{ Category: TrophicCategoryId.HERBIVORE, Count: 1 }] },
        victoryPoints: 3,
        keywords: [KeywordId.AQUATIC],
        abilities: [1], // Keystone species ability
        massKg: 30,
        lifespanMaxDays: 7300,
        visionRangeM: 100,
        smellRangeM: 50,
        hearingRangeM: 200,
        walkSpeedMPerHr: 5000,
        runSpeedMPerHr: 0,
        swimSpeedMPerHr: 15000,
        flySpeedMPerHr: 0,
        offspringCount: 1,
        gestationDays: 180,
        taxonomy: { Kingdom: 'Animalia', Phylum: 'Chordata' }
      }],
      // Terrestrial Primary Producer - Oak Tree
      [4, {
        id: 4,
        commonName: 'Coast Live Oak',
        scientificName: 'Quercus agrifolia',
        trophicLevel: TrophicLevel.PRODUCER,
        trophicCategory: TrophicCategoryId.PHOTOAUTOTROPH,
        cost: null, // Producers are free
        victoryPoints: 1,
        keywords: [KeywordId.TERRESTRIAL],
        abilities: [],
        massKg: 5000,
        lifespanMaxDays: 54750,
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
      // Cross-domain species (Amphibious) - Penguin
      [5, {
        id: 5,
        commonName: 'Emperor Penguin',
        scientificName: 'Aptenodytes forsteri',
        trophicLevel: TrophicLevel.SECONDARY_CONSUMER,
        trophicCategory: TrophicCategoryId.CARNIVORE,
        cost: { Requires: [{ Category: TrophicCategoryId.HERBIVORE, Count: 1 }] },
        victoryPoints: 3,
        keywords: [KeywordId.AMPHIBIOUS], // Can live in both aquatic and terrestrial
        abilities: [],
        massKg: 25,
        lifespanMaxDays: 7300,
        visionRangeM: 200,
        smellRangeM: 10,
        hearingRangeM: 100,
        walkSpeedMPerHr: 3000,
        runSpeedMPerHr: 0,
        swimSpeedMPerHr: 25000,
        flySpeedMPerHr: 0,
        offspringCount: 1,
        gestationDays: 64,
        taxonomy: { Kingdom: 'Animalia', Phylum: 'Chordata' }
      }]
    ]);

    mockAbilityDatabase = new Map([
      [1, {
        AbilityID: 1,
        AbilityName: 'Keystone Species',
        TriggerID: 1,
        Effects: [{ type: 'ECOSYSTEM_BALANCE', value: 1 }],
        Description: 'Maintains ecosystem balance'
      }]
    ]);

    // Use proper grid size for 1v1 mode (2 players)
    const playerCount = 2;
    const gridSize = BioMastersEngine.getGridSize(playerCount);
    
    gameSettings = {
      maxPlayers: playerCount,
      gridWidth: gridSize.width,   // 9 for 1v1
      gridHeight: gridSize.height, // 10 for 1v1
      startingHandSize: 5,
      maxHandSize: 7,
      startingEnergy: 10,
      turnTimeLimit: 300
    };

    // Create test game state with HOME cards
    const grid = new Map();
    
    // Add HOME cards for 2 players - centered in 9x10 grid
    const centerX = Math.floor(gameSettings.gridWidth / 2);  // 4 for 9x10
    const centerY = Math.floor(gameSettings.gridHeight / 2); // 5 for 9x10
    
    // Player 1 HOME
    const home1 = {
      instanceId: 'home-player1',
      cardId: 0,
      ownerId: 'player1',
      position: { x: centerX - 1, y: centerY }, // (3, 5)
      isExhausted: false,
      attachments: [],
      statusEffects: [],
      isDetritus: false,
      isHOME: true
    };
    grid.set(`${home1.position.x},${home1.position.y}`, home1);
    
    // Player 2 HOME  
    const home2 = {
      instanceId: 'home-player2',
      cardId: 0,
      ownerId: 'player2',
      position: { x: centerX, y: centerY }, // (4, 5)
      isExhausted: false,
      attachments: [],
      statusEffects: [],
      isDetritus: false,
      isHOME: true
    };
    grid.set(`${home2.position.x},${home2.position.y}`, home2);

    // Game state will be initialized by the engine
    // Game state will be initialized by the engine

    // Initialize engine with test constructor
    const mockLocalizationManager = createMockLocalizationManager();
    engine = new BioMastersEngine(mockCardDatabase, mockAbilityDatabase, new Map(), mockLocalizationManager);

    // Initialize the game properly
    engine.initializeNewGame('validation-test', [
      { id: 'player1', name: 'Player 1' },
      { id: 'player2', name: 'Player 2' }
    ], gameSettings);

    // Transition to playing phase for card placement tests
    engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player1', payload: {} });
    engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player2', payload: {} });
  });

  describe('Basic Card Placement Validation', () => {
    test('should validate grid boundaries', () => {
      // Try to place card outside grid bounds
      const playCardAction = {
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: {
          cardId: 1, // Kelp
          position: { x: -1, y: 5 } // Outside bounds
        }
      };

      const result = engine.processAction(playCardAction);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Invalid position');
    });

    test('should prevent placing cards on occupied positions', () => {
      const gameState = engine.getGameState();
      const player1Home = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'player1');

      const playCardAction = {
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: {
          cardId: 1, // Kelp
          position: player1Home!.position // Try to place on HOME
        }
      };

      const result = engine.processAction(playCardAction);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('occupied');
    });

    test('should require adjacency to existing cards', () => {
      // Try to place card far from any existing cards
      const playCardAction = {
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: {
          cardId: 1, // Kelp
          position: { x: 0, y: 0 } // Far from HOME
        }
      };

      const result = engine.processAction(playCardAction);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('adjacent');
    });
  });

  describe('Trophic Level Validation', () => {
    test('should allow producers adjacent to HOME', () => {
      console.log('🚀 Starting CardValidation test: should allow producers adjacent to HOME');
      const gameState = engine.getGameState();
      console.log('🏠 All HOME cards in grid:', Array.from(gameState.grid.values()).filter(card => card.isHOME).map(c => ({ ownerId: c.ownerId, position: c.position })));
      const player1Home = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'player1');
      console.log('🎯 Player1 HOME found:', player1Home);
      if (!player1Home) {
        console.log('❌ No player1 HOME found! Available HOME cards:', Array.from(gameState.grid.values()).filter(card => card.isHOME));
        throw new Error('No player1 HOME found');
      }
      const adjacentPosition = { x: player1Home!.position.x - 1, y: player1Home!.position.y };
      console.log('🎯 Adjacent position:', adjacentPosition);

      const playCardAction = {
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: {
          cardId: 1, // Kelp (producer)
          position: adjacentPosition
        }
      };

      console.log('🎮 About to process action:', playCardAction);
      const result = engine.processAction(playCardAction);
      console.log('🎮 Action result:', { isValid: result.isValid, errorMessage: result.errorMessage });
      expect(result.isValid).toBe(true);
    });

    test('should validate trophic level connections', () => {
      const gameState = engine.getGameState();
      const player1Home = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'player1');
      
      // First, play a producer
      const producerPos = { x: player1Home!.position.x - 1, y: player1Home!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: 1, position: producerPos }
      });
      expect(result1.isValid).toBe(true);

      // Ready the producer
      const producerCard = result1.newState!.grid.get(`${producerPos.x},${producerPos.y}`);
      if (producerCard) producerCard.isExhausted = false;

      // Now play primary consumer adjacent to ready producer
      const consumerPos = { x: producerPos.x, y: producerPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: 2, position: consumerPos }
      });
      expect(result2.isValid).toBe(true);
    });

    test('should reject invalid trophic connections', () => {
      const gameState = engine.getGameState();
      const player1Home = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'player1');
      
      // Try to play secondary consumer without proper food source
      const adjacentPosition = { x: player1Home!.position.x - 1, y: player1Home!.position.y };
      const playCardAction = {
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: {
          cardId: 3, // Sea Otter (secondary consumer)
          position: adjacentPosition
        }
      };

      const result = engine.processAction(playCardAction);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('trophic level');
    });
  });

  describe('Biological Accuracy Validation', () => {
    test('should validate habitat compatibility', () => {
      const gameState = engine.getGameState();
      const player1Home = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'player1');

      // Play aquatic producer first
      const aquaticPos = { x: player1Home!.position.x - 1, y: player1Home!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: 1, position: aquaticPos } // Kelp (aquatic)
      });
      expect(result1.isValid).toBe(true);

      // Play terrestrial producer in different area
      const terrestrialPos = { x: player1Home!.position.x, y: player1Home!.position.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: 4, position: terrestrialPos } // Oak (terrestrial)
      });
      expect(result2.isValid).toBe(true);
    });

    test('should handle amphibious species correctly', () => {
      const gameState = engine.getGameState();
      const player1Home = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'player1');

      // Play producer first
      const producerPos = { x: player1Home!.position.x - 1, y: player1Home!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: 1, position: producerPos }
      });
      expect(result1.isValid).toBe(true);

      // Ready the producer
      const producerCard = result1.newState!.grid.get(`${producerPos.x},${producerPos.y}`);
      if (producerCard) producerCard.isExhausted = false;

      // Play herbivore
      const herbivorePos = { x: producerPos.x, y: producerPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: 2, position: herbivorePos }
      });
      expect(result2.isValid).toBe(true);

      // Ready the herbivore
      const herbivoreCard = result2.newState!.grid.get(`${herbivorePos.x},${herbivorePos.y}`);
      if (herbivoreCard) herbivoreCard.isExhausted = false;

      // Play amphibious species (Penguin) - should work with aquatic food source
      const amphibiousPos = { x: herbivorePos.x, y: herbivorePos.y - 1 };
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: 5, position: amphibiousPos } // Penguin (amphibious)
      });
      expect(result3.isValid).toBe(true);
    });

    test('should validate scientific accuracy of food chains', () => {
      const gameState = engine.getGameState();
      const player1Home = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'player1');

      // Build a scientifically accurate marine food chain: Kelp -> Sea Urchin -> Sea Otter

      // 1. Kelp (producer)
      const kelpPos = { x: player1Home!.position.x - 1, y: player1Home!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: 1, position: kelpPos }
      });
      expect(result1.isValid).toBe(true);

      // Ready the kelp
      const kelpCard = result1.newState!.grid.get(`${kelpPos.x},${kelpPos.y}`);
      if (kelpCard) kelpCard.isExhausted = false;

      // 2. Sea Urchin (herbivore that eats kelp)
      const urchinPos = { x: kelpPos.x, y: kelpPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: 2, position: urchinPos }
      });
      expect(result2.isValid).toBe(true);

      // Ready the urchin
      const urchinCard = result2.newState!.grid.get(`${urchinPos.x},${urchinPos.y}`);
      if (urchinCard) urchinCard.isExhausted = false;

      // 3. Sea Otter (carnivore that eats sea urchins)
      const otterPos = { x: urchinPos.x, y: urchinPos.y - 1 };
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: 3, position: otterPos }
      });
      expect(result3.isValid).toBe(true);
    });
  });

  describe('Game State Validation', () => {
    test('should maintain grid integrity', () => {
      const initialGrid = engine.getGameState().grid;
      const initialSize = initialGrid.size;

      const gameState = engine.getGameState();
      const player1Home = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'player1');
      const adjacentPosition = { x: player1Home!.position.x - 1, y: player1Home!.position.y };

      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: 1, position: adjacentPosition }
      });

      expect(result.isValid).toBe(true);
      expect(result.newState?.grid.size).toBe(initialSize + 1);

      // HOME cards should still exist
      const homeCards = Array.from(result.newState!.grid.values()).filter(card => card.isHOME);
      expect(homeCards).toHaveLength(2);
    });

    test('should validate player ownership', () => {
      const gameState = engine.getGameState();
      const player2Home = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'player2');
      const adjacentPosition = { x: player2Home!.position.x + 1, y: player2Home!.position.y };

      // Player 1 trying to play near Player 2's HOME
      const playCardAction = {
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: {
          cardId: 1, // Kelp
          position: adjacentPosition
        }
      };

      const result = engine.processAction(playCardAction);
      // Should be valid - players can play anywhere as long as adjacency rules are met
      expect(result.isValid).toBe(true);
    });

    test('should track card instances correctly', () => {
      const gameState = engine.getGameState();
      const player1Home = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'player1');
      const adjacentPosition = { x: player1Home!.position.x - 1, y: player1Home!.position.y };

      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: 1, position: adjacentPosition }
      });

      expect(result.isValid).toBe(true);

      // Check that card has proper instance data
      const playedCard = result.newState?.grid.get(`${adjacentPosition.x},${adjacentPosition.y}`);
      expect(playedCard).toBeDefined();
      expect(playedCard?.instanceId).toBeDefined();
      expect(playedCard?.cardId).toBe(1);
      expect(playedCard?.ownerId).toBe('player1');
      expect(playedCard?.isExhausted).toBe(true); // Cards enter exhausted by default
    });

    test('should validate turn order', () => {
      // Current player is player1
      const gameState = engine.getGameState();
      expect(gameState.currentPlayerIndex).toBe(0);

      // Player 2 trying to play out of turn
      const player2Home = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'player2');
      const adjacentPosition = { x: player2Home!.position.x + 1, y: player2Home!.position.y };

      const playCardAction = {
        type: GameActionType.PLAY_CARD,
        playerId: 'player2', // Wrong player
        payload: {
          cardId: 1, // Kelp
          position: adjacentPosition
        }
      };

      const result = engine.processAction(playCardAction);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('turn');
    });
  });
});
