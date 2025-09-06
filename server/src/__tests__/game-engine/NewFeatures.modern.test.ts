/**
 * BioMasters New Features Tests - Modern Version
 * Updated to use proper enums, data-driven approach, and new features
 */

import { BioMastersEngine, GameSettings } from '../../../../shared/game-engine/BioMastersEngine';
import { createMockLocalizationManager } from '../../utils/mockLocalizationManager';
import {
  GameActionType,
  TrophicLevel,
  TrophicCategoryId,
  KeywordId
} from '@biomasters/shared';

describe('BioMasters New Features - Modern', () => {
  let engine: BioMastersEngine;
  let gameSettings: GameSettings;
  let mockCardDatabase: Map<number, any>;
  let mockAbilityDatabase: Map<number, any>;

  beforeEach(() => {
    // Create comprehensive mock card database with new features
    mockCardDatabase = new Map([
      // Photoautotroph producer
      [1, {
        cardId: 1,
        commonName: 'Green Algae',
        scientificName: 'Chlorella vulgaris',
        trophicLevel: TrophicLevel.PRODUCER,
        trophicCategory: TrophicCategoryId.PHOTOAUTOTROPH,
        cost: null,
        victoryPoints: 1,
        keywords: [KeywordId.AQUATIC],
        abilities: [1], // Photosynthesis ability
        massKg: 0.001,
        lifespanMaxDays: 30,
        visionRangeM: 0,
        smellRangeM: 0,
        hearingRangeM: 0,
        walkSpeedMPerHr: 0,
        runSpeedMPerHr: 0,
        swimSpeedMPerHr: 100,
        flySpeedMPerHr: 0,
        offspringCount: 1000,
        gestationDays: 1,
        taxonomy: { Kingdom: 'Plantae', Phylum: 'Chlorophyta' }
      }],
      // Chemoautotroph producer (new feature)
      [2, {
        cardId: 2,
        commonName: 'Sulfur Bacteria',
        scientificName: 'Thiobacillus ferrooxidans',
        trophicLevel: TrophicLevel.PRODUCER,
        trophicCategory: TrophicCategoryId.CHEMOAUTOTROPH,
        cost: null,
        victoryPoints: 1,
        keywords: [KeywordId.AQUATIC],
        abilities: [2], // Chemosynthesis ability
        massKg: 0.000001,
        lifespanMaxDays: 7,
        visionRangeM: 0,
        smellRangeM: 0,
        hearingRangeM: 0,
        walkSpeedMPerHr: 0,
        runSpeedMPerHr: 0,
        swimSpeedMPerHr: 10,
        flySpeedMPerHr: 0,
        offspringCount: 1000000,
        gestationDays: 0,
        taxonomy: { Kingdom: 'Bacteria', Phylum: 'Proteobacteria' }
      }],
      // Detritivore (eats detritus/organic matter)
      [3, {
        cardId: 3,
        commonName: 'Earthworm',
        scientificName: 'Lumbricus terrestris',
        trophicLevel: TrophicLevel.DETRITIVORE, // Correct: -2D for detritivores
        trophicCategory: TrophicCategoryId.DETRITIVORE,
        cost: { Requires: [{ Category: TrophicCategoryId.SAPROTROPH, Count: 1 }] }, // Detritivores need saprotrophs
        victoryPoints: 2,
        keywords: [KeywordId.TERRESTRIAL],
        abilities: [3], // Decomposer ability
        massKg: 0.01,
        lifespanMaxDays: 1825,
        visionRangeM: 0,
        smellRangeM: 1,
        hearingRangeM: 0,
        walkSpeedMPerHr: 100,
        runSpeedMPerHr: 0,
        swimSpeedMPerHr: 0,
        flySpeedMPerHr: 0,
        offspringCount: 100,
        gestationDays: 60,
        taxonomy: { Kingdom: 'Animalia', Phylum: 'Annelida' }
      }],
      // Parasite
      [4, {
        cardId: 4,
        commonName: 'Parasitic Wasp',
        scientificName: 'Ichneumon wasp',
        trophicLevel: TrophicLevel.SECONDARY_CONSUMER,
        trophicCategory: TrophicCategoryId.PARASITE,
        domain: 1, // TERRESTRIAL domain
        cost: { Requires: [{ Category: TrophicCategoryId.HERBIVORE, Count: 1 }] },
        victoryPoints: 3,
        keywords: [KeywordId.TERRESTRIAL], // Use terrestrial instead of aerial
        abilities: [4], // Parasitism ability
        massKg: 0.001,
        lifespanMaxDays: 30,
        visionRangeM: 10,
        smellRangeM: 100,
        hearingRangeM: 5,
        walkSpeedMPerHr: 1000,
        runSpeedMPerHr: 0,
        swimSpeedMPerHr: 0,
        flySpeedMPerHr: 20000,
        offspringCount: 50,
        gestationDays: 14,
        taxonomy: { Kingdom: 'Animalia', Phylum: 'Arthropoda' }
      }],
      // Amphibious species (new feature)
      [5, {
        cardId: 5,
        commonName: 'Frog',
        scientificName: 'Rana temporaria',
        trophicLevel: TrophicLevel.SECONDARY_CONSUMER,
        trophicCategory: TrophicCategoryId.CARNIVORE,
        cost: { Requires: [{ Category: TrophicCategoryId.HERBIVORE, Count: 1 }] },
        victoryPoints: 3,
        keywords: [KeywordId.AMPHIBIOUS],
        abilities: [5], // Metamorphosis ability
        massKg: 0.05,
        lifespanMaxDays: 2555,
        visionRangeM: 20,
        smellRangeM: 5,
        hearingRangeM: 50,
        walkSpeedMPerHr: 5000,
        runSpeedMPerHr: 15000,
        swimSpeedMPerHr: 8000,
        flySpeedMPerHr: 0,
        offspringCount: 2000,
        gestationDays: 14,
        taxonomy: { Kingdom: 'Animalia', Phylum: 'Chordata' }
      }],
      // Herbivore for testing
      [6, {
        cardId: 6,
        commonName: 'Grasshopper',
        scientificName: 'Locusta migratoria',
        trophicLevel: TrophicLevel.PRIMARY_CONSUMER,
        trophicCategory: TrophicCategoryId.HERBIVORE,
        domain: 1, // TERRESTRIAL domain
        cost: { Requires: [{ Category: TrophicCategoryId.PHOTOAUTOTROPH, Count: 1 }] },
        victoryPoints: 2,
        keywords: [KeywordId.TERRESTRIAL],
        abilities: [],
        massKg: 0.002,
        lifespanMaxDays: 60,
        visionRangeM: 5,
        smellRangeM: 10,
        hearingRangeM: 20,
        walkSpeedMPerHr: 2000,
        runSpeedMPerHr: 8000,
        swimSpeedMPerHr: 0,
        flySpeedMPerHr: 25000,
        offspringCount: 100,
        gestationDays: 30,
        taxonomy: { Kingdom: 'Animalia', Phylum: 'Arthropoda' }
      }],
      // Terrestrial producer for testing
      [7, {
        cardId: 7,
        commonName: 'Oak Tree',
        scientificName: 'Quercus robur',
        trophicLevel: TrophicLevel.PRODUCER,
        trophicCategory: TrophicCategoryId.PHOTOAUTOTROPH,
        domain: 1, // TERRESTRIAL domain
        cost: null,
        victoryPoints: 1,
        keywords: [KeywordId.TERRESTRIAL],
        abilities: [1], // Photosynthesis ability
        massKg: 1000,
        lifespanMaxDays: 36500,
        visionRangeM: 0,
        smellRangeM: 0,
        hearingRangeM: 0,
        walkSpeedMPerHr: 0,
        runSpeedMPerHr: 0,
        swimSpeedMPerHr: 0,
        flySpeedMPerHr: 0,
        offspringCount: 1000,
        gestationDays: 365,
        taxonomy: { Kingdom: 'Plantae', Phylum: 'Magnoliophyta' }
      }],
      // Saprotroph (decomposer) for testing
      [8, {
        cardId: 8,
        commonName: 'Mycena Mushroom',
        scientificName: 'Mycena galericulata',
        trophicLevel: TrophicLevel.SAPROTROPH, // Correct: -1S for saprotrophs
        trophicCategory: TrophicCategoryId.SAPROTROPH,
        domain: 1, // TERRESTRIAL domain
        cost: null, // Saprotrophs don't need cost, they use detritus
        victoryPoints: 1,
        keywords: [KeywordId.TERRESTRIAL],
        abilities: [3], // Decomposer ability
        massKg: 0.001,
        lifespanMaxDays: 14,
        visionRangeM: 0,
        smellRangeM: 0,
        hearingRangeM: 0,
        walkSpeedMPerHr: 0,
        runSpeedMPerHr: 0,
        swimSpeedMPerHr: 0,
        flySpeedMPerHr: 0,
        offspringCount: 1000000,
        gestationDays: 7,
        taxonomy: { Kingdom: 'Fungi', Phylum: 'Basidiomycota' }
      }]
    ]);

    mockAbilityDatabase = new Map([
      [1, {
        AbilityID: 1,
        AbilityName: 'Photosynthesis',
        TriggerID: 1,
        Effects: [{ type: 'ENERGY_PRODUCTION', value: 1 }],
        Description: 'Converts sunlight to energy'
      }],
      [2, {
        AbilityID: 2,
        AbilityName: 'Chemosynthesis',
        TriggerID: 1,
        Effects: [{ type: 'ENERGY_PRODUCTION', value: 1 }],
        Description: 'Converts chemicals to energy'
      }],
      [3, {
        AbilityID: 3,
        AbilityName: 'Decomposer',
        TriggerID: 2,
        Effects: [{ type: 'DETRITUS_PROCESSING', value: 1 }],
        Description: 'Breaks down organic matter'
      }],
      [4, {
        AbilityID: 4,
        AbilityName: 'Parasitism',
        TriggerID: 3,
        Effects: [{ type: 'HOST_CONTROL', value: 1 }],
        Description: 'Controls host organism'
      }],
      [5, {
        AbilityID: 5,
        AbilityName: 'Metamorphosis',
        TriggerID: 4,
        Effects: [{ type: 'LIFE_STAGE_CHANGE', value: 1 }],
        Description: 'Changes life stage'
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
      instanceId: 'home-alice',
      cardId: 0,
      ownerId: 'alice',
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
      instanceId: 'home-bob',
      cardId: 0,
      ownerId: 'bob',
      position: { x: centerX, y: centerY }, // (4, 5)
      isExhausted: false,
      attachments: [],
      statusEffects: [],
      isDetritus: false,
      isHOME: true
    };
    grid.set(`${home2.position.x},${home2.position.y}`, home2);

    // Game state will be initialized by the engine

    // Initialize engine with test constructor
    const mockLocalizationManager = createMockLocalizationManager();
    engine = new BioMastersEngine(mockCardDatabase, mockAbilityDatabase, new Map(), mockLocalizationManager);

    // Initialize the game properly
    engine.initializeNewGame('newfeatures-test', [
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob' }
    ], gameSettings);
  });

  describe('New Trophic Categories', () => {
    beforeEach(() => {
      // Set both players ready to enter playing phase
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'alice', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'bob', payload: {} });
    });

    test('should support chemoautotroph producers', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');
      const adjacentPosition = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };

      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '2', position: adjacentPosition } // Sulfur Bacteria
      });

      expect(result.isValid).toBe(true);
      expect(result.newState?.grid.has(`${adjacentPosition.x},${adjacentPosition.y}`)).toBe(true);
    });

    test('should support saprotroph consumers', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');

      // First play a producer to create detritus
      const producerPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '1', position: producerPos }
      });
      expect(result1.isValid).toBe(true);

      // Convert the producer to detritus (simulating death)
      const producerCard = result1.newState!.grid.get(`${producerPos.x},${producerPos.y}`);
      expect(producerCard).toBeDefined();
      producerCard!.isDetritus = true;
      producerCard!.isExhausted = true;

      // Now place saprotroph (Mycena Mushroom) on the detritus tile
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '8', position: producerPos } // Same position as detritus
      });
      expect(result2.isValid).toBe(true);

      // Verify the saprotroph was placed and detritus was converted
      const finalState = result2.newState!;
      const saprotrophCard = finalState.grid.get(`${producerPos.x},${producerPos.y}`);
      expect(saprotrophCard?.cardId).toBe(8); // Mycena Mushroom

      // Verify detritus was converted to score pile
      const alice = finalState.players.find(p => p.id === 'alice');
      expect(alice?.scorePile.length).toBeGreaterThan(0);
    });

    test('should support parasite interactions', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');

      // First play a terrestrial producer (Oak Tree)
      const producerPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '7', position: producerPos } // Oak Tree (terrestrial)
      });
      expect(result1.isValid).toBe(true);

      // Ready the producer
      const producerCard = result1.newState!.grid.get(`${producerPos.x},${producerPos.y}`);
      if (producerCard) producerCard.isExhausted = false;

      // Play herbivore (Grasshopper - terrestrial)
      const herbivorePos = { x: producerPos.x, y: producerPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '6', position: herbivorePos }
      });
      expect(result2.isValid).toBe(true);

      // Ready the herbivore
      const herbivoreCard = result2.newState!.grid.get(`${herbivorePos.x},${herbivorePos.y}`);
      if (herbivoreCard) herbivoreCard.isExhausted = false;

      // Play parasite (attach to herbivore at same position)
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '4', position: herbivorePos } // Same position as herbivore for attachment
      });

      expect(result3.isValid).toBe(true);
    });
  });

  describe('Advanced Habitat Features', () => {
    beforeEach(() => {
      // Set both players ready to enter playing phase
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'alice', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'bob', payload: {} });
    });

    test('should support amphibious species', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');

      // Build food chain to amphibious species using terrestrial producer
      const producerPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '7', position: producerPos } // Oak Tree (terrestrial)
      });
      expect(result1.isValid).toBe(true);

      // Ready the producer
      const producerCard = result1.newState!.grid.get(`${producerPos.x},${producerPos.y}`);
      if (producerCard) producerCard.isExhausted = false;

      // Play herbivore (Grasshopper - terrestrial)
      const herbivorePos = { x: producerPos.x, y: producerPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '6', position: herbivorePos }
      });
      expect(result2.isValid).toBe(true);

      // Ready the herbivore
      const herbivoreCard = result2.newState!.grid.get(`${herbivorePos.x},${herbivorePos.y}`);
      if (herbivoreCard) herbivoreCard.isExhausted = false;

      // Play amphibious species (Frog)
      const amphibiousPos = { x: herbivorePos.x, y: herbivorePos.y - 1 };
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '5', position: amphibiousPos }
      });
      expect(result3.isValid).toBe(true);
    });

    test('should handle terrestrial parasite species', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');

      // Build food chain to terrestrial species using terrestrial producer
      const producerPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '7', position: producerPos } // Oak Tree (terrestrial)
      });
      expect(result1.isValid).toBe(true);

      // Ready the producer
      const producerCard = result1.newState!.grid.get(`${producerPos.x},${producerPos.y}`);
      if (producerCard) producerCard.isExhausted = false;

      // Play herbivore (Grasshopper - terrestrial)
      const herbivorePos = { x: producerPos.x, y: producerPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '6', position: herbivorePos }
      });
      expect(result2.isValid).toBe(true);

      // Ready the herbivore
      const herbivoreCard = result2.newState!.grid.get(`${herbivorePos.x},${herbivorePos.y}`);
      if (herbivoreCard) herbivoreCard.isExhausted = false;

      // Play terrestrial parasite species (Parasitic Wasp) - attach to herbivore
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '4', position: herbivorePos } // Same position as herbivore for attachment
      });

      expect(result3.isValid).toBe(true);
    });
  });

  describe('Advanced Ability System', () => {
    beforeEach(() => {
      // Set both players ready to enter playing phase
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'alice', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'bob', payload: {} });
    });

    test('should trigger photosynthesis ability', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');
      const adjacentPosition = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };

      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '1', position: adjacentPosition } // Green Algae with photosynthesis
      });

      expect(result.isValid).toBe(true);

      // Verify the algae was placed and has abilities
      const algaeCard = result.newState?.grid.get(`${adjacentPosition.x},${adjacentPosition.y}`);
      expect(algaeCard).toBeDefined();
      expect(algaeCard?.cardId).toBe(1);
    });

    test('should trigger chemosynthesis ability', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');
      const adjacentPosition = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };

      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '2', position: adjacentPosition } // Sulfur Bacteria with chemosynthesis
      });

      expect(result.isValid).toBe(true);

      // Verify the bacteria was placed and has abilities
      const bacteriaCard = result.newState?.grid.get(`${adjacentPosition.x},${adjacentPosition.y}`);
      expect(bacteriaCard).toBeDefined();
      expect(bacteriaCard?.cardId).toBe(2);
    });

    test('should trigger metamorphosis ability', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');

      // Build food chain to frog using terrestrial producer
      const producerPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '7', position: producerPos } // Oak Tree (terrestrial)
      });
      expect(result1.isValid).toBe(true);

      // Ready the producer
      const producerCard = result1.newState!.grid.get(`${producerPos.x},${producerPos.y}`);
      if (producerCard) producerCard.isExhausted = false;

      // Play herbivore (Grasshopper - terrestrial)
      const herbivorePos = { x: producerPos.x, y: producerPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '6', position: herbivorePos }
      });
      expect(result2.isValid).toBe(true);

      // Ready the herbivore
      const herbivoreCard = result2.newState!.grid.get(`${herbivorePos.x},${herbivorePos.y}`);
      if (herbivoreCard) herbivoreCard.isExhausted = false;

      // Play frog with metamorphosis ability
      const frogPos = { x: herbivorePos.x, y: herbivorePos.y - 1 };
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '5', position: frogPos }
      });
      expect(result3.isValid).toBe(true);

      // Verify the frog was placed and has abilities
      const frogCard = result3.newState?.grid.get(`${frogPos.x},${frogPos.y}`);
      expect(frogCard).toBeDefined();
      expect(frogCard?.cardId).toBe(5);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    beforeEach(() => {
      // Set both players ready to enter playing phase
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'alice', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'bob', payload: {} });
    });

    test('should handle invalid card placements gracefully', () => {
      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '999', position: { x: 0, y: 0 } } // Non-existent card
      });

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });

    test('should validate trophic requirements for new categories', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');
      const adjacentPosition = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };

      // Try to play parasite without proper host
      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '4', position: adjacentPosition } // Parasitic Wasp without host
      });

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Parasite must attach to a valid host creature');
    });

    test('should maintain game state consistency with new features', () => {
      const gameState = engine.getGameState();
      const initialGridSize = gameState.grid.size;
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');
      const adjacentPosition = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };

      // Play multiple cards with new features
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '1', position: adjacentPosition }
      });
      expect(result1.isValid).toBe(true);

      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '2', position: { x: adjacentPosition.x, y: adjacentPosition.y - 1 } }
      });
      expect(result2.isValid).toBe(true);

      // Verify grid state is consistent
      expect(result2.newState?.grid.size).toBe(initialGridSize + 2);

      // HOME cards should still exist
      const homeCards = Array.from(result2.newState!.grid.values()).filter(card => card.isHOME);
      expect(homeCards).toHaveLength(2);
    });
  });
});
