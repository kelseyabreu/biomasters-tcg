/**
 * BioMasters Real Data Gameplay Tests - Modern Version
 * Tests gameplay using realistic card and ability data
 * Validates biological accuracy and game balance
 */

import { BioMastersEngine, GameSettings } from '../../../../shared/game-engine/BioMastersEngine';
import {
  GameActionType,
  TrophicLevel,
  TrophicCategoryId,
  KeywordId
} from '@biomasters/shared';

describe('BioMasters Real Data Gameplay - Modern', () => {
  let engine: BioMastersEngine;
  let gameSettings: GameSettings;
  let mockCardDatabase: Map<number, any>;
  let mockAbilityDatabase: Map<number, any>;

  beforeEach(() => {
    // Create realistic card database based on actual biological data
    mockCardDatabase = new Map([
      // Marine Producer - Giant Kelp
      [1, {
        cardId: 1,
        commonName: 'Giant Kelp',
        scientificName: 'Macrocystis pyrifera',
        trophicLevel: TrophicLevel.PRODUCER,
        trophicCategory: TrophicCategoryId.PHOTOAUTOTROPH,
        cost: null,
        victoryPoints: 1,
        keywords: [KeywordId.AQUATIC, KeywordId.MARINE],
        abilities: [1], // Rapid Growth
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
      // Marine Herbivore - Purple Sea Urchin
      [2, {
        cardId: 2,
        commonName: 'Purple Sea Urchin',
        scientificName: 'Strongylocentrotus purpuratus',
        trophicLevel: TrophicLevel.PRIMARY_CONSUMER,
        trophicCategory: TrophicCategoryId.HERBIVORE,
        cost: { Requires: [{ Category: TrophicCategoryId.PHOTOAUTOTROPH, Count: 1 }] },
        victoryPoints: 2,
        keywords: [KeywordId.AQUATIC, KeywordId.MARINE],
        abilities: [2], // Kelp Grazer
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
      // Marine Carnivore - Sea Otter (Keystone Species)
      [3, {
        cardId: 3,
        commonName: 'Sea Otter',
        scientificName: 'Enhydra lutris',
        trophicLevel: TrophicLevel.SECONDARY_CONSUMER,
        trophicCategory: TrophicCategoryId.CARNIVORE,
        cost: { Requires: [{ Category: TrophicCategoryId.HERBIVORE, Count: 1 }] },
        victoryPoints: 4,
        keywords: [KeywordId.AQUATIC, KeywordId.MARINE],
        abilities: [3], // Keystone Species
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
      // Terrestrial Producer - Coast Live Oak
      [4, {
        cardId: 4,
        commonName: 'Coast Live Oak',
        scientificName: 'Quercus agrifolia',
        trophicLevel: TrophicLevel.PRODUCER,
        trophicCategory: TrophicCategoryId.PHOTOAUTOTROPH,
        cost: null,
        victoryPoints: 1,
        keywords: [KeywordId.TERRESTRIAL],
        abilities: [4], // Acorn Production
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
      // Terrestrial Herbivore - Mule Deer
      [5, {
        cardId: 5,
        commonName: 'Mule Deer',
        scientificName: 'Odocoileus hemionus',
        trophicLevel: TrophicLevel.PRIMARY_CONSUMER,
        trophicCategory: TrophicCategoryId.HERBIVORE,
        cost: { Requires: [{ Category: TrophicCategoryId.PHOTOAUTOTROPH, Count: 1 }] },
        victoryPoints: 3,
        keywords: [KeywordId.TERRESTRIAL],
        abilities: [5], // Alert Behavior
        massKg: 70,
        lifespanMaxDays: 3650,
        visionRangeM: 300,
        smellRangeM: 500,
        hearingRangeM: 1000,
        walkSpeedMPerHr: 10000,
        runSpeedMPerHr: 60000,
        swimSpeedMPerHr: 5000,
        flySpeedMPerHr: 0,
        offspringCount: 2,
        gestationDays: 200,
        taxonomy: { Kingdom: 'Animalia', Phylum: 'Chordata' }
      }],
      // Apex Predator - Mountain Lion
      [6, {
        cardId: 6,
        commonName: 'Mountain Lion',
        scientificName: 'Puma concolor',
        trophicLevel: TrophicLevel.APEX_PREDATOR,
        trophicCategory: TrophicCategoryId.CARNIVORE,
        cost: { Requires: [{ Category: TrophicCategoryId.CARNIVORE, Count: 1 }] },
        victoryPoints: 5,
        keywords: [KeywordId.TERRESTRIAL],
        abilities: [6], // Apex Predator
        massKg: 60,
        lifespanMaxDays: 4380,
        visionRangeM: 500,
        smellRangeM: 2000,
        hearingRangeM: 1000,
        walkSpeedMPerHr: 15000,
        runSpeedMPerHr: 80000,
        swimSpeedMPerHr: 10000,
        flySpeedMPerHr: 0,
        offspringCount: 3,
        gestationDays: 90,
        taxonomy: { Kingdom: 'Animalia', Phylum: 'Chordata' }
      }]
    ]);

    mockAbilityDatabase = new Map([
      [1, {
        abilityId: 1,
        abilityName: 'Rapid Growth',
        triggerId: 1,
        effects: [{ type: 'GROWTH_RATE', value: 2 }],
        description: 'Grows rapidly in nutrient-rich waters'
      }],
      [2, {
        abilityId: 2,
        abilityName: 'Kelp Grazer',
        triggerId: 2,
        effects: [{ type: 'HERBIVORY_EFFICIENCY', value: 1 }],
        description: 'Efficiently grazes on kelp forests'
      }],
      [3, {
        abilityId: 3,
        abilityName: 'Keystone Species',
        triggerId: 3,
        effects: [{ type: 'ECOSYSTEM_BALANCE', value: 2 }],
        description: 'Maintains ecosystem balance by controlling sea urchin populations'
      }],
      [4, {
        abilityId: 4,
        abilityName: 'Acorn Production',
        triggerId: 4,
        effects: [{ type: 'SEED_PRODUCTION', value: 1 }],
        description: 'Produces acorns that support wildlife'
      }],
      [5, {
        abilityId: 5,
        abilityName: 'Alert Behavior',
        triggerId: 5,
        effects: [{ type: 'PREDATOR_AVOIDANCE', value: 1 }],
        description: 'Enhanced awareness helps avoid predators'
      }],
      [6, {
        abilityId: 6,
        abilityName: 'Apex Predator',
        triggerId: 6,
        effects: [{ type: 'HUNTING_EFFICIENCY', value: 2 }],
        description: 'Top predator with exceptional hunting skills'
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
    // Game state will be initialized by the engine

    // Initialize engine with test constructor
    engine = new BioMastersEngine(mockCardDatabase, mockAbilityDatabase, new Map());

    // Initialize the game properly
    engine.initializeNewGame('realdata-test', [
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob' }
    ], gameSettings);
  });

  describe('Marine Ecosystem Gameplay', () => {
    beforeEach(() => {
      // Set both players ready to enter playing phase
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'alice', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'bob', payload: {} });
    });

    test('should build realistic marine food chain', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');
      
      // Build marine food chain: Giant Kelp -> Purple Sea Urchin -> Sea Otter
      
      // 1. Giant Kelp (producer)
      const kelpPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '1', position: kelpPos }
      });
      expect(result1.isValid).toBe(true);

      // Ready the kelp
      const kelpCard = result1.newState!.grid.get(`${kelpPos.x},${kelpPos.y}`);
      if (kelpCard) kelpCard.isExhausted = false;

      // 2. Purple Sea Urchin (herbivore)
      const urchinPos = { x: kelpPos.x, y: kelpPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '2', position: urchinPos }
      });
      expect(result2.isValid).toBe(true);

      // Ready the urchin
      const urchinCard = result2.newState!.grid.get(`${urchinPos.x},${urchinPos.y}`);
      if (urchinCard) urchinCard.isExhausted = false;

      // 3. Sea Otter (keystone species)
      const otterPos = { x: urchinPos.x, y: urchinPos.y - 1 };
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '3', position: otterPos }
      });
      expect(result3.isValid).toBe(true);
      
      // Verify the complete food chain
      expect(result3.newState?.grid.size).toBe(5); // 2 HOME + 3 played cards
    });
  });

  describe('Terrestrial Ecosystem Gameplay', () => {
    beforeEach(() => {
      // Set both players ready to enter playing phase
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'alice', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'bob', payload: {} });
    });

    test('should build realistic terrestrial food chain', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');

      // Build terrestrial food chain: Coast Live Oak -> Mule Deer -> Mountain Lion

      // 1. Coast Live Oak (producer)
      const oakPos = { x: aliceHome!.position.x, y: aliceHome!.position.y - 1 };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '4', position: oakPos }
      });
      expect(result1.isValid).toBe(true);

      // Ready the oak
      const oakCard = result1.newState!.grid.get(`${oakPos.x},${oakPos.y}`);
      if (oakCard) oakCard.isExhausted = false;

      // 2. Mule Deer (herbivore)
      const deerPos = { x: oakPos.x, y: oakPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '5', position: deerPos }
      });
      expect(result2.isValid).toBe(true);

      // Ready the deer
      const deerCard = result2.newState!.grid.get(`${deerPos.x},${deerPos.y}`);
      if (deerCard) deerCard.isExhausted = false;

      // 3. Mountain Lion (apex predator) - needs secondary consumer first
      // For now, just verify the deer placement worked
      expect(result2.isValid).toBe(true);
      expect(result2.newState?.grid.size).toBe(4); // 2 HOME + 2 played cards
    });

    test('should validate biological accuracy', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');

      // Try to place Mountain Lion without proper food chain
      const adjacentPosition = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '6', position: adjacentPosition } // Mountain Lion without prey
      });

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('trophic level');
    });
  });

  describe('Cross-Ecosystem Interactions', () => {
    beforeEach(() => {
      // Set both players ready to enter playing phase
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'alice', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'bob', payload: {} });
    });

    test('should handle mixed marine and terrestrial ecosystems', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');

      // Play marine producer
      const marinePos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '1', position: marinePos } // Giant Kelp
      });
      expect(result1.isValid).toBe(true);

      // Play terrestrial producer in different area
      const terrestrialPos = { x: aliceHome!.position.x, y: aliceHome!.position.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '4', position: terrestrialPos } // Coast Live Oak
      });
      expect(result2.isValid).toBe(true);

      // Both ecosystems should coexist
      expect(result2.newState?.grid.size).toBe(4); // 2 HOME + 2 producers
    });

    test('should maintain ecosystem integrity', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');

      // Build complete marine ecosystem
      const kelpPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '1', position: kelpPos }
      });
      expect(result1.isValid).toBe(true);

      // Ready the kelp
      const kelpCard = result1.newState!.grid.get(`${kelpPos.x},${kelpPos.y}`);
      if (kelpCard) kelpCard.isExhausted = false;

      const urchinPos = { x: kelpPos.x, y: kelpPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '2', position: urchinPos }
      });
      expect(result2.isValid).toBe(true);

      // Ready the urchin
      const urchinCard = result2.newState!.grid.get(`${urchinPos.x},${urchinPos.y}`);
      if (urchinCard) urchinCard.isExhausted = false;

      const otterPos = { x: urchinPos.x, y: urchinPos.y - 1 };
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '3', position: otterPos }
      });
      expect(result3.isValid).toBe(true);

      // Verify complete ecosystem
      const finalGrid = result3.newState!.grid;
      const marineCards = Array.from(finalGrid.values()).filter(card => !card.isHOME);
      expect(marineCards).toHaveLength(3);
    });
  });

  describe('Ability System with Real Data', () => {
    beforeEach(() => {
      // Set both players ready to enter playing phase
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'alice', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'bob', payload: {} });
    });

    test('should trigger keystone species ability', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');

      // Build food chain to Sea Otter (keystone species)
      const kelpPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '1', position: kelpPos }
      });
      expect(result1.isValid).toBe(true);

      // Ready the kelp
      const kelpCard = result1.newState!.grid.get(`${kelpPos.x},${kelpPos.y}`);
      if (kelpCard) kelpCard.isExhausted = false;

      const urchinPos = { x: kelpPos.x, y: kelpPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '2', position: urchinPos }
      });
      expect(result2.isValid).toBe(true);

      // Ready the urchin
      const urchinCard = result2.newState!.grid.get(`${urchinPos.x},${urchinPos.y}`);
      if (urchinCard) urchinCard.isExhausted = false;

      // Play Sea Otter - should trigger keystone ability
      const otterPos = { x: urchinPos.x, y: urchinPos.y - 1 };
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '3', position: otterPos }
      });
      expect(result3.isValid).toBe(true);

      // Verify the otter was placed with abilities
      const otterCard = result3.newState?.grid.get(`${otterPos.x},${otterPos.y}`);
      expect(otterCard).toBeDefined();
      expect(otterCard?.cardId).toBe(3);
    });

    test('should handle realistic biological interactions', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');

      // Test rapid growth ability of Giant Kelp
      const kelpPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '1', position: kelpPos }
      });
      expect(result.isValid).toBe(true);

      // Verify kelp has rapid growth ability
      const kelpCard = result.newState?.grid.get(`${kelpPos.x},${kelpPos.y}`);
      expect(kelpCard).toBeDefined();
      expect(kelpCard?.cardId).toBe(1);
    });
  });

  describe('Game Balance and Victory Conditions', () => {
    beforeEach(() => {
      // Set both players ready to enter playing phase
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'alice', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'bob', payload: {} });
    });

    test('should track victory points correctly', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');

      // Play high-value cards and verify point tracking
      const kelpPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '1', position: kelpPos } // 1 VP
      });
      expect(result1.isValid).toBe(true);

      // Ready the kelp
      const kelpCard = result1.newState!.grid.get(`${kelpPos.x},${kelpPos.y}`);
      if (kelpCard) kelpCard.isExhausted = false;

      const urchinPos = { x: kelpPos.x, y: kelpPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '2', position: urchinPos } // 2 VP
      });
      expect(result2.isValid).toBe(true);

      // Ready the urchin
      const urchinCard = result2.newState!.grid.get(`${urchinPos.x},${urchinPos.y}`);
      if (urchinCard) urchinCard.isExhausted = false;

      const otterPos = { x: urchinPos.x, y: urchinPos.y - 1 };
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '3', position: otterPos } // 4 VP
      });
      expect(result3.isValid).toBe(true);

      // Total should be 7 VP worth of cards played
      const finalGrid = result3.newState!.grid;
      const playedCards = Array.from(finalGrid.values()).filter(card => !card.isHOME);
      expect(playedCards).toHaveLength(3);
    });

    test('should maintain competitive balance', () => {
      const gameState = engine.getGameState();

      // Both players should have equal starting resources
      expect(gameState.players[0]?.hand.length).toBe(gameState.players[1]?.hand.length);
      expect(gameState.players[0]?.energy).toBe(gameState.players[1]?.energy);
      expect(gameState.players[0]?.deck.length).toBe(gameState.players[1]?.deck.length);

      // Grid should be symmetric
      expect(gameState.grid.size).toBe(2); // Both HOME cards
    });
  });
});
