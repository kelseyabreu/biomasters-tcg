/**
 * Basic Card Playing Tests - New Modern Version
 * Updated to use proper enums, data-driven approach, and correct card playing mechanics
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

describe('Basic Card Playing - Modern', () => {
  let engine: BioMastersEngine;
  let gameSettings: GameSettings;
  let mockCardDatabase: Map<number, any>;
  let mockAbilityDatabase: Map<number, any>;

  beforeEach(() => {
    // Create mock card database with proper interface structure
    mockCardDatabase = new Map([
      [1, {
        cardId: 1,
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
      }],
      [2, {
        cardId: 2,
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
      [3, {
        cardId: 3,
        commonName: 'Kelp',
        scientificName: 'Macrocystis pyrifera',
        trophicLevel: TrophicLevel.PRODUCER,
        trophicCategory: TrophicCategoryId.PHOTOAUTOTROPH,
        cost: null, // Free producer
        victoryPoints: 1,
        keywords: [KeywordId.AQUATIC],
        abilities: [],
        massKg: 0.5,
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

    // Create test game state with HOME cards and cards in hand
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

    const testGameState = {
      gameId: 'card-test',
      players: [
        { 
          id: 'alice', 
          name: 'Alice', 
          hand: ['1', '2', '3'], // Oak Tree, Field Rabbit, Kelp
          deck: [], 
          scorePile: [], 
          energy: 10, 
          isReady: true 
        },
        { 
          id: 'bob', 
          name: 'Bob', 
          hand: ['1', '2', '3'], // Oak Tree, Field Rabbit, Kelp
          deck: [], 
          scorePile: [], 
          energy: 10, 
          isReady: true 
        }
      ],
      currentPlayerIndex: 0,
      gamePhase: GamePhase.PLAYING,
      turnPhase: TurnPhase.ACTION,
      actionsRemaining: 3,
      turnNumber: 1,
      grid,
      detritus: [],
      gameSettings,
      metadata: {}
    };

    // Initialize engine with test constructor
    engine = new BioMastersEngine(testGameState, mockCardDatabase, mockAbilityDatabase, new Map());
  });

  describe('Basic Card Placement', () => {
    test('should allow playing producer cards adjacent to HOME', () => {
      // Find a free position adjacent to Alice's HOME
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');
      expect(aliceHome).toBeDefined();

      // Find free adjacent position (try multiple positions)
      const possiblePositions = [
        { x: aliceHome!.position.x + 1, y: aliceHome!.position.y },
        { x: aliceHome!.position.x - 1, y: aliceHome!.position.y },
        { x: aliceHome!.position.x, y: aliceHome!.position.y + 1 },
        { x: aliceHome!.position.x, y: aliceHome!.position.y - 1 }
      ];

      // Find first free position
      const adjacentPosition = possiblePositions.find(pos => {
        const posKey = `${pos.x},${pos.y}`;
        const isWithinBounds = pos.x >= 0 && pos.x < gameSettings.gridWidth && pos.y >= 0 && pos.y < gameSettings.gridHeight;
        const isFree = !gameState.grid.has(posKey);
        return isWithinBounds && isFree;
      });

      expect(adjacentPosition).toBeDefined();

      const playCardAction = {
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: {
          cardId: '1', // Oak Tree (producer)
          position: adjacentPosition!
        }
      };

      const result = engine.processAction(playCardAction);

      // Debug if it fails
      if (!result.isValid) {
        console.log('🔍 Card placement failed:', result.errorMessage);
        console.log('🏠 Alice HOME position:', aliceHome!.position);
        console.log('📍 Trying position:', adjacentPosition);
        console.log('🗺️ Grid state:', Array.from(gameState.grid.keys()));
      }

      expect(result.isValid).toBe(true);
      expect(result.newState?.grid.has(`${adjacentPosition!.x},${adjacentPosition!.y}`)).toBe(true);
    });

    test('should reject playing cards in invalid positions', () => {
      // Try to play card far from HOME
      const playCardAction = {
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: {
          cardId: '1', // Oak Tree
          position: { x: 0, y: 0 } // Far from HOME
        }
      };

      const result = engine.processAction(playCardAction);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('adjacent');
    });

    test('should reject playing cards on occupied positions', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');

      const playCardAction = {
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: {
          cardId: '1', // Oak Tree
          position: aliceHome!.position // Try to play on HOME position
        }
      };

      const result = engine.processAction(playCardAction);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('occupied');
    });

    test('should reject playing cards outside grid bounds', () => {
      const playCardAction = {
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: {
          cardId: '1', // Oak Tree
          position: { x: -1, y: 5 } // Outside grid
        }
      };

      const result = engine.processAction(playCardAction);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Invalid position');
    });
  });

  describe('Card Cost and Requirements', () => {
    test('should allow playing free producer cards', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');
      const adjacentPosition = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };

      const playCardAction = {
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: {
          cardId: '1', // Oak Tree (free producer)
          position: adjacentPosition
        }
      };

      const result = engine.processAction(playCardAction);
      expect(result.isValid).toBe(true);
    });

    test('should reject playing consumer cards without required connections', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');
      const adjacentPosition = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };

      const playCardAction = {
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: {
          cardId: '2', // Field Rabbit (requires producer)
          position: adjacentPosition
        }
      };

      const result = engine.processAction(playCardAction);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('trophic level');
    });
  });

  describe('Action Consumption', () => {
    test('should consume actions when playing cards', () => {
      const initialActions = engine.getGameState().actionsRemaining;
      
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');
      const adjacentPosition = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };

      const playCardAction = {
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: {
          cardId: '1', // Oak Tree
          position: adjacentPosition
        }
      };

      const result = engine.processAction(playCardAction);
      expect(result.isValid).toBe(true);
      expect(result.newState?.actionsRemaining).toBeLessThan(initialActions);
    });

    test('should remove card from hand when played', () => {
      const gameState = engine.getGameState();
      const initialHandSize = gameState.players[0]?.hand.length || 0;
      
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');
      const adjacentPosition = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };

      const playCardAction = {
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: {
          cardId: '1', // Oak Tree
          position: adjacentPosition
        }
      };

      const result = engine.processAction(playCardAction);
      expect(result.isValid).toBe(true);
      expect(result.newState?.players[0]?.hand.length).toBeLessThan(initialHandSize);
      expect(result.newState?.players[0]?.hand).not.toContain('1');
    });
  });

  describe('Turn Management Integration', () => {
    test('should reject card playing from wrong player', () => {
      // Current player is alice (index 0)
      const gameState = engine.getGameState();
      const bobHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'bob');
      const adjacentPosition = { x: bobHome!.position.x + 1, y: bobHome!.position.y };

      const playCardAction = {
        type: GameActionType.PLAY_CARD,
        playerId: 'bob', // Wrong player
        payload: {
          cardId: '1', // Oak Tree
          position: adjacentPosition
        }
      };

      const result = engine.processAction(playCardAction);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('turn');
    });
  });
});
