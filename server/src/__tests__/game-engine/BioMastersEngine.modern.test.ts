/**
 * BioMasters Engine Modern Tests
 * Updated to use proper enums and interfaces from shared module
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

describe('BioMasters Engine Modern Tests', () => {
  let engine: BioMastersEngine;
  let gameSettings: GameSettings;
  let mockCardDatabase: Map<number, any>;
  let mockAbilityDatabase: Map<number, any>;

  beforeEach(() => {
    // Create mock card database with proper interface structure
    mockCardDatabase = new Map([
      [1, {
        cardId: 1,
        commonName: 'Test Rabbit',
        scientificName: 'Testus rabbitus',
        trophicLevel: TrophicLevel.PRIMARY_CONSUMER,
        trophicCategory: TrophicCategoryId.OMNIVORE,
        cost: { Requires: [{ Category: 1, Count: 1 }] },
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
      [2, {
        cardId: 2,
        commonName: 'Test Kelp',
        scientificName: 'Testus kelpus',
        trophicLevel: TrophicLevel.PRODUCER,
        trophicCategory: TrophicCategoryId.PHOTOAUTOTROPH,
        cost: null,
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

    // Create mock ability database with proper interface structure
    mockAbilityDatabase = new Map([
      [1, {
        abilityID: 1,
        triggerID: 1,
        effects: [
          {
            effectID: 1,
            type: 'GAIN_ENERGY',
            value: 2,
            selectorID: 1
          }
        ]
      }]
    ]);

    // Create proper game settings with grid size based on player count
    const playerCount = 2; // 1v1 mode
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

    // Add HOME cards for 2 players (1v1 mode) - centered in 9x10 grid
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
    // Game state will be initialized by the engine

    // Initialize engine with test constructor
    const mockLocalizationManager = createMockLocalizationManager();
    engine = new BioMastersEngine(mockCardDatabase, mockAbilityDatabase, new Map(), mockLocalizationManager);

    // Initialize the game properly
    engine.initializeNewGame('test-game-1', [
      { id: 'player1', name: 'Test Player 1' },
      { id: 'player2', name: 'Test Player 2' }
    ], gameSettings);
  });

  describe('Engine Initialization', () => {
    test('should initialize with correct game state', () => {
      const gameState = engine.getGameState();
      
      expect(gameState.gameId).toBe('test-game-1');
      expect(gameState.players).toHaveLength(2);
      expect(gameState.gamePhase).toBe(GamePhase.SETUP);
      expect(gameState.turnPhase).toBe(TurnPhase.READY);
      expect(gameState.actionsRemaining).toBe(0);
    });

    test('should have correct grid size for 1v1 mode', () => {
      const gameState = engine.getGameState();
      
      expect(gameState.gameSettings.gridWidth).toBe(9);  // 1v1 uses 9x10
      expect(gameState.gameSettings.gridHeight).toBe(10);
      expect(gameState.gameSettings.maxPlayers).toBe(2);
    });

    test('should load card and ability databases', () => {
      const cardDb = engine.getCardDatabase();
      const abilityDb = engine.getAbilityDatabase();
      
      expect(cardDb.size).toBe(2);
      expect(abilityDb.size).toBe(1);
      expect(cardDb.get(1)?.commonName).toBe('Test Rabbit');
      expect(abilityDb.get(1)?.abilityID).toBe(1);
    });
  });

  describe('Grid Size Logic', () => {
    test('should use 9x10 grid for 1v1 mode (2 players)', () => {
      const gridSize = BioMastersEngine.getGridSize(2);
      
      expect(gridSize.width).toBe(9);
      expect(gridSize.height).toBe(10);
    });

    test('should use 10x10 grid for 2v2 mode (4 players)', () => {
      const gridSize = BioMastersEngine.getGridSize(4);
      
      expect(gridSize.width).toBe(10);
      expect(gridSize.height).toBe(10);
    });
  });

  describe('Action Processing with Enums', () => {
    test('should process PLAY_CARD action using enum', () => {
      // First transition to playing phase
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player1', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player2', payload: {} });

      const gameState = engine.getGameState();
      gameState.players[0]?.hand.push('2'); // Add kelp card to hand

      // Need to place adjacent to HOME card for valid placement
      const homeCard = Array.from(gameState.grid.values()).find(card => card.isHOME);

      // Find a free adjacent position to HOME
      let adjacentPosition = { x: 4, y: 5 };
      if (homeCard) {
        const possiblePositions = [
          { x: homeCard.position.x + 1, y: homeCard.position.y },
          { x: homeCard.position.x - 1, y: homeCard.position.y },
          { x: homeCard.position.x, y: homeCard.position.y + 1 },
          { x: homeCard.position.x, y: homeCard.position.y - 1 }
        ];

        // Find first free position
        const freePosition = possiblePositions.find(pos => {
          const posKey = `${pos.x},${pos.y}`;
          const isWithinBounds = pos.x >= 0 && pos.x < gameSettings.gridWidth && pos.y >= 0 && pos.y < gameSettings.gridHeight;
          const isFree = !gameState.grid.has(posKey);
          return isWithinBounds && isFree;
        });

        if (freePosition) {
          adjacentPosition = freePosition;
        }
      }

      const playCardAction = {
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: {
          cardId: '2',
          position: adjacentPosition
        }
      };

      const result = engine.processAction(playCardAction);

      // Debug if it fails
      if (!result.isValid) {
        console.log('🔍 PLAY_CARD failed:', result.errorMessage);
        console.log('🏠 HOME cards:', Array.from(gameState.grid.values()).filter(c => c.isHOME));
        console.log('📍 Trying position:', adjacentPosition);
      }

      expect(result.isValid).toBe(true);
    });

    test('should process PASS_TURN action using enum', () => {
      const passTurnAction = {
        type: GameActionType.PASS_TURN,
        playerId: 'player1',
        payload: {}
      };

      const result = engine.processAction(passTurnAction);
      expect(result.isValid).toBe(true);
      expect(result.newState?.currentPlayerIndex).toBe(1);
    });

    test('should reject invalid action type', () => {
      const invalidAction = {
        type: 'INVALID_ACTION' as any,
        playerId: 'player1',
        payload: {}
      };

      const result = engine.processAction(invalidAction);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Unknown action type');
    });
  });

  describe('Turn Management with Enums', () => {
    test('should handle PLAYER_READY actions', () => {
      // Reset to setup phase
      const gameState = engine.getGameState();
      gameState.gamePhase = GamePhase.SETUP;
      gameState.turnPhase = TurnPhase.READY;

      const readyAction1 = {
        type: GameActionType.PLAYER_READY,
        playerId: 'player1',
        payload: {}
      };

      const result1 = engine.processAction(readyAction1);
      expect(result1.isValid).toBe(true);

      const readyAction2 = {
        type: GameActionType.PLAYER_READY,
        playerId: 'player2',
        payload: {}
      };

      const result2 = engine.processAction(readyAction2);
      expect(result2.isValid).toBe(true);
      expect(result2.newState?.gamePhase).toBe(GamePhase.PLAYING);
    });
  });
});
