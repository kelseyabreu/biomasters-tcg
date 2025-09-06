/**
 * BioMasters Engine Basic Tests - Modern Version
 * Updated to use proper enums and correct grid logic
 */

import { BioMastersEngine, GameSettings } from '../../../../shared/game-engine/BioMastersEngine';
import { createMockLocalizationManager } from '../../utils/mockLocalizationManager';
import {
  GameActionType,
  GamePhase
} from '@biomasters/shared';

describe('BioMasters Engine Basics - Modern', () => {
  let engine: BioMastersEngine;
  let gameSettings: GameSettings;

  beforeEach(() => {
    // Use proper grid size for 1v1 mode (2 players)
    const playerCount = 2;
    const gridSize = BioMastersEngine.getGridSize(playerCount);
    
    gameSettings = {
      maxPlayers: playerCount,
      gridWidth: gridSize.width,   // 9 for 1v1
      gridHeight: gridSize.height, // 10 for 1v1
      startingHandSize: 5,
      maxHandSize: 7,
      turnTimeLimit: 300
    };

    // Create test game state with HOME cards (since engine constructor creates them)
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

    // Initialize engine with test constructor
    const mockLocalizationManager = createMockLocalizationManager();
    engine = new BioMastersEngine(new Map(), new Map(), new Map(), mockLocalizationManager);

    // Initialize the game properly
    engine.initializeNewGame('test-game-1', [
      { id: 'player1', name: 'Test Player 1' },
      { id: 'player2', name: 'Test Player 2' }
    ], gameSettings);
  });

  describe('Engine Initialization', () => {
    test('should create engine with valid game state', () => {
      const gameState = engine.getGameState();

      expect(gameState).toBeDefined();
      expect(gameState.gameId).toBe('test-game-1');
      expect(gameState.players).toHaveLength(2);
      expect(gameState.currentPlayerIndex).toBe(0);
      expect(gameState.gamePhase).toBe(GamePhase.SETUP); // Engine starts in setup phase
    });

    test('should initialize players correctly', () => {
      const gameState = engine.getGameState();
      const player1 = gameState.players[0];
      const player2 = gameState.players[1];

      expect(player1?.id).toBe('player1');
      expect(player1?.name).toBe('Test Player 1');
      expect(player1?.hand).toEqual([]);
      expect(player1?.deck).toEqual([]);
      expect(player1?.energy).toBe(0); // Players start with 0 energy in setup phase

      expect(player2?.id).toBe('player2');
      expect(player2?.name).toBe('Test Player 2');
    });

    test('should have HOME cards on grid initially', () => {
      const gameState = engine.getGameState();
      expect(gameState.grid.size).toBe(2); // 2 HOME cards for 2 players
      
      const homeCards = Array.from(gameState.grid.values()).filter(card => card.isHOME);
      expect(homeCards).toHaveLength(2);
      expect(homeCards[0]?.ownerId).toBe('player1');
      expect(homeCards[1]?.ownerId).toBe('player2');
    });

    test('should have correct game settings with proper grid size', () => {
      const gameState = engine.getGameState();
      expect(gameState.gameSettings.maxPlayers).toBe(2);
      expect(gameState.gameSettings.gridWidth).toBe(9);  // 1v1 uses 9x10
      expect(gameState.gameSettings.gridHeight).toBe(10);
      expect(gameState.gameSettings.startingHandSize).toBe(5);
    });
  });

  describe('Grid Size Logic', () => {
    test('should use correct grid size for different player counts', () => {
      const size1v1 = BioMastersEngine.getGridSize(2);
      expect(size1v1.width).toBe(9);
      expect(size1v1.height).toBe(10);

      const size2v2 = BioMastersEngine.getGridSize(4);
      expect(size2v2.width).toBe(10);
      expect(size2v2.height).toBe(10);
    });
  });

  describe('Database Access', () => {
    test('should have access to card database', () => {
      const cardDb = engine.getCardDatabase();
      expect(cardDb).toBeInstanceOf(Map);
      // Database starts empty in basic engine
      expect(cardDb.size).toBe(0);
    });

    test('should have access to ability database', () => {
      const abilityDb = engine.getAbilityDatabase();
      expect(abilityDb).toBeInstanceOf(Map);
      // Database starts empty in basic engine
      expect(abilityDb.size).toBe(0);
    });
  });

  describe('Basic Action Processing with Enums', () => {
    test('should handle invalid action gracefully', () => {
      const invalidAction = {
        type: 'INVALID_ACTION' as any,
        playerId: 'player1',
        payload: {}
      };

      const result = engine.processAction(invalidAction);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Unknown action type');
    });

    test('should reject action from wrong player', () => {
      // Current player is player1 (index 0)
      const wrongPlayerAction = {
        type: GameActionType.PASS_TURN,
        playerId: 'player2', // Wrong player
        payload: {}
      };

      const result = engine.processAction(wrongPlayerAction);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('turn');
    });

    test('should handle pass turn action in setup phase', () => {
      const passTurnAction = {
        type: GameActionType.PASS_TURN,
        playerId: 'player1',
        payload: {}
      };

      const result = engine.processAction(passTurnAction);
      // Pass turn might not be valid in setup phase
      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');

      if (result.isValid && result.newState) {
        expect(result.newState.currentPlayerIndex).toBeGreaterThanOrEqual(0);
        expect(result.newState.turnNumber).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Game State Management', () => {
    test('should maintain game state integrity after actions', () => {
      const initialState = engine.getGameState();

      const testAction = {
        type: GameActionType.PASS_TURN,
        playerId: 'player1',
        payload: {}
      };

      const result = engine.processAction(testAction);
      expect(result).toBeDefined();

      // Regardless of whether action is valid, state integrity should be maintained
      const currentState = engine.getGameState();
      expect(currentState.gameId).toBe(initialState.gameId);
      expect(currentState.players).toHaveLength(initialState.players.length);
      expect(currentState.grid.size).toBeGreaterThanOrEqual(2); // At least 2 HOME cards
    });

    test('should handle game phase transitions', () => {
      const gameState = engine.getGameState();
      expect(gameState.gamePhase).toBe(GamePhase.SETUP);

      // In a full implementation, there would be actions to transition from setup to playing
      // For now, we just verify the phase is tracked correctly
      expect([GamePhase.SETUP, GamePhase.PLAYING, GamePhase.ENDED].includes(gameState.gamePhase)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing player ID', () => {
      const actionWithoutPlayer = {
        type: GameActionType.PASS_TURN,
        playerId: '',
        payload: {}
      };

      const result = engine.processAction(actionWithoutPlayer);
      expect(result.isValid).toBe(false);
    });

    test('should handle non-existent player', () => {
      const actionFromNonExistentPlayer = {
        type: GameActionType.PASS_TURN,
        playerId: 'nonexistent-player',
        payload: {}
      };

      const result = engine.processAction(actionFromNonExistentPlayer);
      expect(result.isValid).toBe(false);
    });

    test('should handle malformed payload', () => {
      const actionWithBadPayload = {
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: null
      };

      const result = engine.processAction(actionWithBadPayload);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Game State Immutability', () => {
    test('should not modify original game state', () => {
      const originalState = engine.getGameState();
      const originalTurnNumber = originalState.turnNumber;
      const originalCurrentPlayer = originalState.currentPlayerIndex;

      const passTurnAction = {
        type: GameActionType.PASS_TURN,
        playerId: 'player1',
        payload: {}
      };

      engine.processAction(passTurnAction);

      // Original state should remain unchanged
      expect(originalState.turnNumber).toBe(originalTurnNumber);
      expect(originalState.currentPlayerIndex).toBe(originalCurrentPlayer);
    });

    test('should return new state object', () => {
      const originalState = engine.getGameState();

      const passTurnAction = {
        type: GameActionType.PASS_TURN,
        playerId: 'player1',
        payload: {}
      };

      const result = engine.processAction(passTurnAction);

      if (result.newState) {
        expect(result.newState).not.toBe(originalState);
        // Turn number might not change in setup phase, but state should be different
        expect(result.newState.gameId).toBe(originalState.gameId); // Same game
        expect(result.newState.players).toHaveLength(originalState.players.length); // Same players
      }
    });
  });
});
