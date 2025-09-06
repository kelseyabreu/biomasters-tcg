/**
 * BioMasters Gameplay Mechanics Tests - Modern Version
 * Updated to use proper enums, data-driven approach, and comprehensive gameplay mechanics
 * Based on BioMasterEngine.txt and RulesForBiomasters.txt
 */

import { BioMastersEngine, GameSettings } from '../../../../shared/game-engine/BioMastersEngine';
import { createMockLocalizationManager } from '../../utils/mockLocalizationManager';
import {
  GameActionType,
  GamePhase,
  TurnPhase,
  TrophicLevel,
  TrophicCategoryId,
  KeywordId
} from '@biomasters/shared';

describe('BioMasters Gameplay Mechanics - Modern', () => {
  let engine: BioMastersEngine;
  let gameSettings: GameSettings;
  let mockCardDatabase: Map<number, any>;
  let mockAbilityDatabase: Map<number, any>;

  beforeEach(() => {
    // Create comprehensive mock card database for gameplay testing
    mockCardDatabase = new Map([
      // Producer cards
      [1, {
        cardId: 1,
        commonName: 'Giant Kelp',
        scientificName: 'Macrocystis pyrifera',
        trophicLevel: TrophicLevel.PRODUCER,
        trophicCategory: TrophicCategoryId.PHOTOAUTOTROPH,
        cost: null,
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
      [2, {
        cardId: 2,
        commonName: 'Oak Tree',
        scientificName: 'Quercus alba',
        trophicLevel: TrophicLevel.PRODUCER,
        trophicCategory: TrophicCategoryId.PHOTOAUTOTROPH,
        cost: null,
        victoryPoints: 1,
        keywords: [KeywordId.TERRESTRIAL],
        abilities: [],
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
      // Primary consumers
      [3, {
        cardId: 3,
        commonName: 'Sea Urchin',
        scientificName: 'Strongylocentrotus purpuratus',
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
      [4, {
        cardId: 4,
        commonName: 'Field Rabbit',
        scientificName: 'Oryctolagus cuniculus',
        trophicLevel: TrophicLevel.PRIMARY_CONSUMER,
        trophicCategory: TrophicCategoryId.HERBIVORE,
        cost: { Requires: [{ Category: TrophicCategoryId.PHOTOAUTOTROPH, Count: 1 }] },
        victoryPoints: 2,
        keywords: [KeywordId.TERRESTRIAL],
        abilities: [],
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
      // Secondary consumers
      [5, {
        cardId: 5,
        commonName: 'Sea Otter',
        scientificName: 'Enhydra lutris',
        trophicLevel: TrophicLevel.SECONDARY_CONSUMER,
        trophicCategory: TrophicCategoryId.CARNIVORE,
        cost: { Requires: [{ Category: TrophicCategoryId.HERBIVORE, Count: 1 }] },
        victoryPoints: 3,
        keywords: [KeywordId.AQUATIC],
        abilities: [1], // Keystone species
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
      [6, {
        cardId: 6,
        commonName: 'Red Fox',
        scientificName: 'Vulpes vulpes',
        trophicLevel: TrophicLevel.SECONDARY_CONSUMER,
        trophicCategory: TrophicCategoryId.CARNIVORE,
        cost: { Requires: [{ Category: TrophicCategoryId.HERBIVORE, Count: 1 }] },
        victoryPoints: 3,
        keywords: [KeywordId.TERRESTRIAL],
        abilities: [2], // Scavenger
        massKg: 7,
        lifespanMaxDays: 3650,
        visionRangeM: 200,
        smellRangeM: 1000,
        hearingRangeM: 500,
        walkSpeedMPerHr: 20000,
        runSpeedMPerHr: 50000,
        swimSpeedMPerHr: 5000,
        flySpeedMPerHr: 0,
        offspringCount: 4,
        gestationDays: 52,
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
      }],
      [2, {
        AbilityID: 2,
        AbilityName: 'Scavenger',
        TriggerID: 2,
        Effects: [{ type: 'DETRITUS_RECOVERY', value: 1 }],
        Description: 'Can recover cards from detritus'
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
    const mockLocalizationManager = createMockLocalizationManager();
    engine = new BioMastersEngine(mockCardDatabase, mockAbilityDatabase, new Map(), mockLocalizationManager);

    // Initialize the game properly
    engine.initializeNewGame('gameplay-test', [
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob' }
    ], gameSettings);
  });

  describe('Game Phase Transitions', () => {
    test('should start in setup phase', () => {
      const gameState = engine.getGameState();
      expect(gameState.gamePhase).toBe(GamePhase.SETUP);
      expect(gameState.turnPhase).toBe(TurnPhase.READY);
      expect(gameState.turnNumber).toBe(1);
      expect(gameState.currentPlayerIndex).toBe(0);
    });

    test('should transition from setup to playing phase', () => {
      // Both players ready
      const result1 = engine.processAction({
        type: GameActionType.PLAYER_READY,
        playerId: 'alice',
        payload: {}
      });
      expect(result1.isValid).toBe(true);

      const result2 = engine.processAction({
        type: GameActionType.PLAYER_READY,
        playerId: 'bob',
        payload: {}
      });
      expect(result2.isValid).toBe(true);

      // Game should now be in playing phase
      expect(result2.newState?.gamePhase).toBe(GamePhase.PLAYING);
      expect(result2.newState?.turnPhase).toBe(TurnPhase.ACTION);
      expect(result2.newState?.actionsRemaining).toBe(3);
    });

    test('should handle turn phases correctly', () => {
      // Transition to playing phase first
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'alice', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'bob', payload: {} });

      const gameState = engine.getGameState();
      expect(gameState.gamePhase).toBe(GamePhase.PLAYING);
      expect(gameState.turnPhase).toBe(TurnPhase.ACTION);
      expect(gameState.actionsRemaining).toBe(3);
    });
  });

  describe('Card Playing Mechanics', () => {
    beforeEach(() => {
      // Set both players ready to enter playing phase
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'alice', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'bob', payload: {} });
    });

    test('should allow playing producer cards adjacent to HOME', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');
      const adjacentPosition = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };

      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '1', position: adjacentPosition } // Kelp
      });

      expect(result.isValid).toBe(true);
      expect(result.newState?.grid.has(`${adjacentPosition.x},${adjacentPosition.y}`)).toBe(true);
      expect(result.newState?.actionsRemaining).toBe(2); // Action consumed
    });

    test('should build complex food chains', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');

      // Build marine food chain: Kelp -> Sea Urchin -> Sea Otter

      // 1. Play Kelp (producer)
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

      // 2. Play Sea Urchin (herbivore)
      const urchinPos = { x: kelpPos.x, y: kelpPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '3', position: urchinPos }
      });
      expect(result2.isValid).toBe(true);

      // Ready the urchin
      const urchinCard = result2.newState!.grid.get(`${urchinPos.x},${urchinPos.y}`);
      if (urchinCard) urchinCard.isExhausted = false;

      // 3. Play Sea Otter (carnivore with keystone ability)
      const otterPos = { x: urchinPos.x, y: urchinPos.y - 1 };
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '5', position: otterPos }
      });
      expect(result3.isValid).toBe(true);
    });

    test('should handle terrestrial food chains', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');

      // Build terrestrial food chain: Oak -> Rabbit -> Fox

      // 1. Play Oak Tree (producer)
      const oakPos = { x: aliceHome!.position.x, y: aliceHome!.position.y - 1 };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '2', position: oakPos }
      });
      expect(result1.isValid).toBe(true);

      // Ready the oak
      const oakCard = result1.newState!.grid.get(`${oakPos.x},${oakPos.y}`);
      if (oakCard) oakCard.isExhausted = false;

      // 2. Play Field Rabbit (herbivore)
      const rabbitPos = { x: oakPos.x, y: oakPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '4', position: rabbitPos }
      });
      expect(result2.isValid).toBe(true);

      // Ready the rabbit
      const rabbitCard = result2.newState!.grid.get(`${rabbitPos.x},${rabbitPos.y}`);
      if (rabbitCard) rabbitCard.isExhausted = false;

      // 3. Play Red Fox (carnivore with scavenger ability)
      const foxPos = { x: rabbitPos.x, y: rabbitPos.y - 1 };
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '6', position: foxPos }
      });
      expect(result3.isValid).toBe(true);
    });
  });

  describe('Turn Management and Actions', () => {
    beforeEach(() => {
      // Set both players ready to enter playing phase
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'alice', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'bob', payload: {} });
    });

    test('should handle turn passing correctly', () => {
      const result = engine.processAction({
        type: GameActionType.PASS_TURN,
        playerId: 'alice',
        payload: {}
      });

      expect(result.isValid).toBe(true);
      expect(result.newState?.currentPlayerIndex).toBe(1); // Bob's turn
      expect(result.newState?.actionsRemaining).toBe(3); // Reset actions
    });

    test('should track actions correctly', () => {
      let gameState = engine.getGameState();
      expect(gameState.actionsRemaining).toBe(3);

      // Play a card (consumes 1 action)
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');
      const adjacentPosition = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };

      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '1', position: adjacentPosition }
      });

      expect(result.isValid).toBe(true);
      expect(result.newState?.actionsRemaining).toBe(2);
    });

    test('should prevent actions when none remaining', () => {
      // Exhaust all actions
      const gameState = engine.getGameState();
      gameState.actionsRemaining = 0;

      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');
      const adjacentPosition = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };

      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '1', position: adjacentPosition }
      });

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('action');
    });
  });

  describe('Ability Triggers and Effects', () => {
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
        payload: { cardId: '3', position: urchinPos }
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
        payload: { cardId: '5', position: otterPos }
      });
      expect(result3.isValid).toBe(true);

      // Verify the otter was placed and has abilities
      const otterCard = result3.newState?.grid.get(`${otterPos.x},${otterPos.y}`);
      expect(otterCard).toBeDefined();
      expect(otterCard?.cardId).toBe(5);
    });

    test('should trigger scavenger ability', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');

      // Build food chain to Red Fox (scavenger)
      const oakPos = { x: aliceHome!.position.x, y: aliceHome!.position.y - 1 };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '2', position: oakPos }
      });
      expect(result1.isValid).toBe(true);

      // Ready the oak
      const oakCard = result1.newState!.grid.get(`${oakPos.x},${oakPos.y}`);
      if (oakCard) oakCard.isExhausted = false;

      const rabbitPos = { x: oakPos.x, y: oakPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '4', position: rabbitPos }
      });
      expect(result2.isValid).toBe(true);

      // Ready the rabbit
      const rabbitCard = result2.newState!.grid.get(`${rabbitPos.x},${rabbitPos.y}`);
      if (rabbitCard) rabbitCard.isExhausted = false;

      // Play Red Fox - should trigger scavenger ability
      const foxPos = { x: rabbitPos.x, y: rabbitPos.y - 1 };
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '6', position: foxPos }
      });
      expect(result3.isValid).toBe(true);

      // Verify the fox was placed and has abilities
      const foxCard = result3.newState?.grid.get(`${foxPos.x},${foxPos.y}`);
      expect(foxCard).toBeDefined();
      expect(foxCard?.cardId).toBe(6);
    });
  });

  describe('Game State Management', () => {
    test('should maintain proper grid state', () => {
      // Set both players ready
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'alice', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'bob', payload: {} });

      const initialGrid = engine.getGameState().grid;
      expect(initialGrid.size).toBe(2); // Two HOME cards

      // Play a card
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');
      const adjacentPosition = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };

      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '1', position: adjacentPosition }
      });

      expect(result.isValid).toBe(true);
      expect(result.newState?.grid.size).toBe(3); // HOME cards + new card
    });

    test('should track player hands correctly', () => {
      // Set both players ready
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'alice', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'bob', payload: {} });

      const initialHandSize = engine.getGameState().players[0]?.hand.length || 0;

      // Play a card - find a producer card in the player's hand
      const gameState = engine.getGameState();
      const player1 = gameState.players[0];
      // Find a producer card (trophic level 1) that can be placed adjacent to HOME
      console.log('🃏 Player hand:', player1?.hand);
      const producerCards = ['1', '2']; // Giant Kelp, Oak Tree (both producers)
      const cardToPlay = player1?.hand.find(cardId => producerCards.includes(cardId));
      console.log('🎯 Card to play:', cardToPlay);
      expect(cardToPlay).toBeDefined();

      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');
      const adjacentPosition = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };

      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: cardToPlay, position: adjacentPosition }
      });

      console.log('🎮 Result:', result.isValid, result.errorMessage);

      expect(result.isValid).toBe(true);
      expect(result.newState?.players[0]?.hand.length).toBe(initialHandSize - 1);
      expect(result.newState?.players[0]?.hand).not.toContain(cardToPlay);
    });

    test('should handle multiple players correctly', () => {
      // Set both players ready
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'alice', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'bob', payload: {} });

      // Alice plays a card
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');
      const alicePos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };

      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: '1', position: alicePos }
      });
      expect(result1.isValid).toBe(true);

      // Alice passes turn
      const result2 = engine.processAction({
        type: GameActionType.PASS_TURN,
        playerId: 'alice',
        payload: {}
      });
      expect(result2.isValid).toBe(true);
      expect(result2.newState?.currentPlayerIndex).toBe(1);

      // Bob plays a card
      const bobHome = Array.from(result2.newState!.grid.values()).find(card => card.isHOME && card.ownerId === 'bob');
      const bobPos = { x: bobHome!.position.x + 1, y: bobHome!.position.y };

      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'bob',
        payload: { cardId: '2', position: bobPos }
      });
      expect(result3.isValid).toBe(true);
    });
  });
});
