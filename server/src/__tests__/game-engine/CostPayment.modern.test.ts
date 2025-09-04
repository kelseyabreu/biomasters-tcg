/**
 * Cost Payment System Tests - Modern Version
 * Updated to use proper enums, data-driven approach, and correct cost payment mechanics
 */

import { BioMastersEngine, GameSettings } from '../../game-engine/BioMastersEngine';
import {
  GameActionType,
  GamePhase,
  TurnPhase,
  TrophicLevel,
  TrophicCategoryId,
  KeywordId
} from '@biomasters/shared';

describe('Cost Payment System - Modern', () => {
  let engine: BioMastersEngine;
  let gameSettings: GameSettings;
  let mockCardDatabase: Map<number, any>;
  let mockAbilityDatabase: Map<number, any>;

  beforeEach(() => {
    // Create comprehensive mock card database for cost testing
    mockCardDatabase = new Map([
      // Free producer
      [1, {
        cardId: 1,
        commonName: 'Green Algae',
        scientificName: 'Chlorella vulgaris',
        trophicLevel: TrophicLevel.PRODUCER,
        trophicCategory: TrophicCategoryId.PHOTOAUTOTROPH,
        cost: null, // Free producer
        victoryPoints: 1,
        keywords: [KeywordId.AQUATIC],
        abilities: [],
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
      // Primary consumer (herbivore)
      [2, {
        cardId: 2,
        commonName: 'Small Fish',
        scientificName: 'Piscis minimus',
        trophicLevel: TrophicLevel.PRIMARY_CONSUMER,
        trophicCategory: TrophicCategoryId.HERBIVORE,
        cost: { Requires: [{ Category: TrophicCategoryId.PHOTOAUTOTROPH, Count: 1 }] },
        victoryPoints: 2,
        keywords: [KeywordId.AQUATIC],
        abilities: [],
        massKg: 0.1,
        lifespanMaxDays: 365,
        visionRangeM: 10,
        smellRangeM: 5,
        hearingRangeM: 20,
        walkSpeedMPerHr: 0,
        runSpeedMPerHr: 0,
        swimSpeedMPerHr: 5000,
        flySpeedMPerHr: 0,
        offspringCount: 100,
        gestationDays: 30,
        taxonomy: { Kingdom: 'Animalia', Phylum: 'Chordata' }
      }],
      // Secondary consumer (carnivore)
      [3, {
        cardId: 3,
        commonName: 'Medium Fish',
        scientificName: 'Piscis medius',
        trophicLevel: TrophicLevel.SECONDARY_CONSUMER,
        trophicCategory: TrophicCategoryId.CARNIVORE,
        cost: { Requires: [{ Category: TrophicCategoryId.HERBIVORE, Count: 1 }] },
        victoryPoints: 3,
        keywords: [KeywordId.AQUATIC],
        abilities: [],
        massKg: 2000,
        lifespanMaxDays: 25550,
        visionRangeM: 100,
        smellRangeM: 1000,
        hearingRangeM: 500,
        walkSpeedMPerHr: 0,
        runSpeedMPerHr: 0,
        swimSpeedMPerHr: 60000,
        flySpeedMPerHr: 0,
        offspringCount: 10,
        gestationDays: 365,
        taxonomy: { Kingdom: 'Animalia', Phylum: 'Chordata' }
      }],
      // Apex predator
      [4, {
        cardId: 4,
        commonName: 'Great White Shark',
        scientificName: 'Carcharodon carcharias',
        trophicLevel: TrophicLevel.APEX_PREDATOR,
        trophicCategory: TrophicCategoryId.CARNIVORE,
        cost: { Requires: [{ Category: TrophicCategoryId.CARNIVORE, Count: 1 }] },
        victoryPoints: 4,
        keywords: [KeywordId.AQUATIC],
        abilities: [],
        massKg: 2000,
        lifespanMaxDays: 25550,
        visionRangeM: 100,
        smellRangeM: 1000,
        hearingRangeM: 500,
        walkSpeedMPerHr: 0,
        runSpeedMPerHr: 0,
        swimSpeedMPerHr: 60000,
        flySpeedMPerHr: 0,
        offspringCount: 10,
        gestationDays: 365,
        taxonomy: { Kingdom: 'Animalia', Phylum: 'Chordata' }
      }],
      // Terrestrial producer for variety
      [5, {
        cardId: 5,
        commonName: 'Oak Tree',
        scientificName: 'Quercus alba',
        trophicLevel: TrophicLevel.PRODUCER,
        trophicCategory: TrophicCategoryId.PHOTOAUTOTROPH,
        cost: null, // Free producer
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
      }]
    ]);

    mockAbilityDatabase = new Map();

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

    const testGameState = {
      gameId: 'cost-test',
      players: [
        {
          id: 'player1',
          name: 'Player 1',
          hand: ['1', '2', '3', '4', '5'], // Algae, Small Fish, Medium Fish, Shark, Oak Tree
          deck: [],
          scorePile: [],
          energy: 10,
          isReady: true
        },
        {
          id: 'player2',
          name: 'Player 2',
          hand: ['1', '2', '5'], // Algae, Small Fish, Oak Tree
          deck: [],
          scorePile: [],
          energy: 10,
          isReady: true
        }
      ],
      currentPlayerIndex: 0,
      gamePhase: GamePhase.PLAYING,
      turnPhase: TurnPhase.ACTION,
      actionsRemaining: 5, // Give more actions for complex tests
      turnNumber: 1,
      grid,
      detritus: [],
      gameSettings,
      metadata: {}
    };

    // Initialize engine with test constructor
    engine = new BioMastersEngine(testGameState, mockCardDatabase, mockAbilityDatabase, new Map());
  });

  describe('Free Producer Cards', () => {
    test('should allow playing free producer cards without cost', () => {
      const gameState = engine.getGameState();
      const player1Home = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'player1');
      const adjacentPosition = { x: player1Home!.position.x - 1, y: player1Home!.position.y };

      const playCardAction = {
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: {
          cardId: '1', // Green Algae (free producer)
          position: adjacentPosition
        }
      };

      const result = engine.processAction(playCardAction);
      expect(result.isValid).toBe(true);
      expect(result.newState?.grid.has(`${adjacentPosition.x},${adjacentPosition.y}`)).toBe(true);
    });

    test('should allow playing multiple free producers', () => {
      const gameState = engine.getGameState();
      const player1Home = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'player1');
      
      // Play first producer (Algae)
      const position1 = { x: player1Home!.position.x - 1, y: player1Home!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: '1', position: position1 }
      });
      expect(result1.isValid).toBe(true);

      // Play second producer (Oak Tree)
      const position2 = { x: player1Home!.position.x, y: player1Home!.position.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: '5', position: position2 }
      });
      expect(result2.isValid).toBe(true);
    });
  });

  describe('Trophic Cost Requirements', () => {
    test('should reject consumer cards without required trophic connections', () => {
      const gameState = engine.getGameState();
      const player1Home = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'player1');
      const adjacentPosition = { x: player1Home!.position.x - 1, y: player1Home!.position.y };

      const playCardAction = {
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: {
          cardId: '2', // Small Fish (requires producer)
          position: adjacentPosition
        }
      };

      const result = engine.processAction(playCardAction);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('trophic level');
    });

    test('should allow consumer cards with proper trophic connections after producer is ready', () => {
      const gameState = engine.getGameState();
      const player1Home = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'player1');

      // First, play a producer (Algae)
      const producerPosition = { x: player1Home!.position.x - 1, y: player1Home!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: '1', position: producerPosition }
      });
      expect(result1.isValid).toBe(true);

      // Manually ready the producer card (simulating turn cycle or Preferred Diet bonus)
      const producerCard = result1.newState!.grid.get(`${producerPosition.x},${producerPosition.y}`);
      if (producerCard) {
        producerCard.isExhausted = false; // Make it ready
      }

      // Now play consumer adjacent to ready producer
      const consumerPosition = { x: producerPosition.x - 1, y: producerPosition.y };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: '2', position: consumerPosition }
      });

      expect(result2.isValid).toBe(true);
    });

    test('should reject apex predator without required herbivore', () => {
      const gameState = engine.getGameState();
      const player1Home = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'player1');
      const adjacentPosition = { x: player1Home!.position.x - 1, y: player1Home!.position.y };

      const playCardAction = {
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: {
          cardId: '4', // Great White Shark (requires carnivore)
          position: adjacentPosition
        }
      };

      const result = engine.processAction(playCardAction);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('trophic level');
    });
  });

  describe('Cost Payment Integration', () => {
    test('should maintain energy levels during free card play', () => {
      const initialEnergy = engine.getGameState().players[0]?.energy || 0;
      
      const gameState = engine.getGameState();
      const player1Home = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'player1');
      const adjacentPosition = { x: player1Home!.position.x - 1, y: player1Home!.position.y };

      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: '1', position: adjacentPosition }
      });

      expect(result.isValid).toBe(true);
      // Energy should remain the same for free cards
      expect(result.newState?.players[0]?.energy).toBe(initialEnergy);
    });

    test('should exhaust cards when played', () => {
      const gameState = engine.getGameState();
      const player1Home = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'player1');
      const adjacentPosition = { x: player1Home!.position.x - 1, y: player1Home!.position.y };

      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: '1', position: adjacentPosition }
      });

      expect(result.isValid).toBe(true);
      
      // Find the played card on the grid
      const playedCard = result.newState?.grid.get(`${adjacentPosition.x},${adjacentPosition.y}`);
      expect(playedCard).toBeDefined();
      expect(playedCard?.isExhausted).toBe(true);
    });

    test('should remove cards from hand when played', () => {
      const initialHandSize = engine.getGameState().players[0]?.hand.length || 0;
      
      const gameState = engine.getGameState();
      const player1Home = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'player1');
      const adjacentPosition = { x: player1Home!.position.x - 1, y: player1Home!.position.y };

      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: '1', position: adjacentPosition }
      });

      expect(result.isValid).toBe(true);
      expect(result.newState?.players[0]?.hand.length).toBe(initialHandSize - 1);
      expect(result.newState?.players[0]?.hand).not.toContain('1');
    });
  });

  describe('Complex Cost Scenarios', () => {
    test('should handle food chain building with proper ready states', () => {
      const gameState = engine.getGameState();
      const player1Home = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'player1');

      // Build a food chain: Producer -> Primary Consumer -> Secondary Consumer -> Apex Predator

      // 1. Play producer (Algae)
      const producerPos = { x: player1Home!.position.x - 1, y: player1Home!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: '1', position: producerPos }
      });
      expect(result1.isValid).toBe(true);

      // Ready the producer
      const producerCard = result1.newState!.grid.get(`${producerPos.x},${producerPos.y}`);
      if (producerCard) producerCard.isExhausted = false;

      // 2. Play primary consumer (Small Fish) adjacent to ready producer
      const primaryPos = { x: producerPos.x, y: producerPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: '2', position: primaryPos }
      });
      expect(result2.isValid).toBe(true);

      // Ready the primary consumer
      const primaryCard = result2.newState!.grid.get(`${primaryPos.x},${primaryPos.y}`);
      if (primaryCard) primaryCard.isExhausted = false;

      // 3. Play secondary consumer (Medium Fish) adjacent to ready primary consumer
      const secondaryPos = { x: primaryPos.x, y: primaryPos.y - 1 };
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: '3', position: secondaryPos }
      });
      expect(result3.isValid).toBe(true);

      // Ready the secondary consumer
      const secondaryCard = result3.newState!.grid.get(`${secondaryPos.x},${secondaryPos.y}`);
      if (secondaryCard) secondaryCard.isExhausted = false;

      // 4. Play apex predator (Shark) adjacent to ready secondary consumer
      const apexPos = { x: secondaryPos.x, y: secondaryPos.y - 1 };
      const result4 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: '4', position: apexPos }
      });

      // Debug if it fails
      if (!result4.isValid) {
        console.log('🔍 Apex predator placement failed:', result4.errorMessage);
        console.log('🦈 Apex position:', apexPos);
        console.log('🐟 Secondary card exhausted?:', secondaryCard?.isExhausted);
        console.log('🗺️ Grid state:', Array.from(result3.newState!.grid.keys()));
        console.log('⚡ Actions remaining:', result3.newState!.actionsRemaining);
      }

      expect(result4.isValid).toBe(true);
    });

    test('should validate trophic level requirements strictly', () => {
      const gameState = engine.getGameState();
      const player1Home = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'player1');
      
      // Play producer first
      const producerPos = { x: player1Home!.position.x - 1, y: player1Home!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: '1', position: producerPos }
      });
      expect(result1.isValid).toBe(true);

      // Try to play apex predator directly adjacent to producer (should fail)
      const predatorPos = { x: producerPos.x - 1, y: producerPos.y };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: { cardId: '4', position: predatorPos }
      });
      expect(result2.isValid).toBe(false);
      expect(result2.errorMessage).toContain('trophic level');
    });
  });
});
