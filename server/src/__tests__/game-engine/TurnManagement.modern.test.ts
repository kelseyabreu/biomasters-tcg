/**
 * BioMasters Turn Management Tests - Modern Version
 * Updated to use proper enums, data-driven approach, and correct turn phases
 */

import { BioMastersEngine, GameSettings } from '../../../../shared/game-engine/BioMastersEngine';
import {
  GameActionType,
  GamePhase,
  TurnPhase
} from '@biomasters/shared';

describe('BioMasters Turn Management - Modern', () => {
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
    engine = new BioMastersEngine(new Map(), new Map(), new Map());

    // Initialize the game properly
    engine.initializeNewGame('turn-test', [
      { id: 'player1', name: 'Player 1' },
      { id: 'player2', name: 'Player 2' }
    ], gameSettings);
  });

  describe('Game Phase Management', () => {
    test('should start in setup phase with ready turn phase', () => {
      const gameState = engine.getGameState();
      expect(gameState.gamePhase).toBe(GamePhase.SETUP);
      expect(gameState.turnPhase).toBe(TurnPhase.READY);
      expect(gameState.currentPlayerIndex).toBe(0);
      expect(gameState.turnNumber).toBe(1);
    });

    test('should transition from setup to playing phase', () => {
      // Both players ready
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player1', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player2', payload: {} });

      const gameState = engine.getGameState();
      expect(gameState.gamePhase).toBe(GamePhase.PLAYING);
      expect(gameState.turnPhase).toBe(TurnPhase.ACTION);
      expect(gameState.actionsRemaining).toBe(3);
    });

    test('should handle partial ready state', () => {
      // Only first player ready
      const result = engine.processAction({ 
        type: GameActionType.PLAYER_READY, 
        playerId: 'player1', 
        payload: {} 
      });

      expect(result.isValid).toBe(true);
      const gameState = engine.getGameState();
      expect(gameState.gamePhase).toBe(GamePhase.SETUP); // Still in setup
      expect(gameState.players[0]?.isReady).toBe(true);
      expect(gameState.players[1]?.isReady).toBe(false);
    });
  });

  describe('Turn Phase Transitions', () => {
    beforeEach(() => {
      // Set both players ready to enter playing phase
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player1', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player2', payload: {} });
    });

    test('should be in action phase after setup', () => {
      const gameState = engine.getGameState();
      expect(gameState.gamePhase).toBe(GamePhase.PLAYING);
      expect(gameState.turnPhase).toBe(TurnPhase.ACTION);
      expect(gameState.actionsRemaining).toBe(3);
    });

    test('should handle turn transitions correctly', () => {
      // Pass turn to next player
      const result = engine.processAction({
        type: GameActionType.PASS_TURN,
        playerId: 'player1',
        payload: {}
      });

      expect(result.isValid).toBe(true);
      expect(result.newState?.currentPlayerIndex).toBe(1); // Player 2's turn
      expect(result.newState?.turnPhase).toBe(TurnPhase.ACTION);
      expect(result.newState?.actionsRemaining).toBe(3);
    });

    test('should increment turn number after full cycle', () => {
      const initialTurn = engine.getGameState().turnNumber;

      // Player 1 passes
      engine.processAction({ type: GameActionType.PASS_TURN, playerId: 'player1', payload: {} });
      
      // Player 2 passes
      engine.processAction({ type: GameActionType.PASS_TURN, playerId: 'player2', payload: {} });

      const gameState = engine.getGameState();
      expect(gameState.currentPlayerIndex).toBe(0); // Back to player 1
      expect(gameState.turnNumber).toBeGreaterThan(initialTurn);
    });

    test('should reset actions when turn changes', () => {
      // Verify initial actions
      let gameState = engine.getGameState();
      expect(gameState.actionsRemaining).toBe(3);

      // Pass turn
      engine.processAction({ type: GameActionType.PASS_TURN, playerId: 'player1', payload: {} });

      // New player should have full actions
      gameState = engine.getGameState();
      expect(gameState.actionsRemaining).toBe(3);
      expect(gameState.currentPlayerIndex).toBe(1);
    });
  });

  describe('Action Management', () => {
    beforeEach(() => {
      // Set both players ready to enter playing phase
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player1', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player2', payload: {} });
    });

    test('should start each turn with 3 actions', () => {
      const gameState = engine.getGameState();
      expect(gameState.actionsRemaining).toBe(3);
    });

    test('should track current player correctly', () => {
      let gameState = engine.getGameState();
      expect(gameState.currentPlayerIndex).toBe(0);
      expect(gameState.players[0]?.id).toBe('player1');

      // Pass turn
      engine.processAction({ type: GameActionType.PASS_TURN, playerId: 'player1', payload: {} });

      gameState = engine.getGameState();
      expect(gameState.currentPlayerIndex).toBe(1);
      expect(gameState.players[1]?.id).toBe('player2');
    });

    test('should reject actions from wrong player', () => {
      // Current player is player1
      const wrongPlayerAction = {
        type: GameActionType.PASS_TURN,
        playerId: 'player2', // Wrong player
        payload: {}
      };

      const result = engine.processAction(wrongPlayerAction);
      expect(result.isValid).toBe(false);
    });

    test('should handle action consumption', () => {
      const gameState = engine.getGameState();
      const initialActions = gameState.actionsRemaining;

      // Try to play a card (may or may not consume action)
      const playCardAction = {
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: {
          cardId: '1',
          position: { x: 2, y: 5 }
        }
      };

      engine.processAction(playCardAction);
      const newState = engine.getGameState();

      // Actions should be tracked correctly
      expect(newState.actionsRemaining).toBeGreaterThanOrEqual(0);
      expect(newState.actionsRemaining).toBeLessThanOrEqual(initialActions);
    });
  });

  describe('Turn Validation', () => {
    beforeEach(() => {
      // Set both players ready to enter playing phase
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player1', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player2', payload: {} });
    });

    test('should validate player turn order', () => {
      // Player 1 should be current player
      let gameState = engine.getGameState();
      expect(gameState.currentPlayerIndex).toBe(0);

      // Player 1 action should be valid
      const validAction = {
        type: GameActionType.PASS_TURN,
        playerId: 'player1',
        payload: {}
      };

      const result1 = engine.processAction(validAction);
      expect(result1.isValid).toBe(true);

      // Now player 2 should be current
      gameState = engine.getGameState();
      expect(gameState.currentPlayerIndex).toBe(1);

      // Player 2 action should be valid
      const validAction2 = {
        type: GameActionType.PASS_TURN,
        playerId: 'player2',
        payload: {}
      };

      const result2 = engine.processAction(validAction2);
      expect(result2.isValid).toBe(true);
    });

    test('should reject actions in wrong phase', () => {
      // Reset to setup phase
      const gameState = engine.getGameState();
      gameState.gamePhase = GamePhase.SETUP;
      gameState.turnPhase = TurnPhase.READY;

      // Try to play card in setup phase
      const playCardAction = {
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: {
          cardId: '1',
          position: { x: 2, y: 5 }
        }
      };

      const result = engine.processAction(playCardAction);
      expect(result.isValid).toBe(false);
    });

    test('should handle non-existent players', () => {
      const ghostAction = {
        type: GameActionType.PASS_TURN,
        playerId: 'ghost-player',
        payload: {}
      };

      const result = engine.processAction(ghostAction);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Game State Consistency', () => {
    test('should maintain consistent state during turn transitions', () => {
      // Set both players ready
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player1', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player2', payload: {} });

      const initialState = engine.getGameState();
      
      // Perform multiple turn cycles
      for (let i = 0; i < 4; i++) {
        const currentPlayer = engine.getGameState().players[engine.getGameState().currentPlayerIndex];
        engine.processAction({
          type: GameActionType.PASS_TURN,
          playerId: currentPlayer?.id || '',
          payload: {}
        });
      }

      const finalState = engine.getGameState();
      
      // Game should still be consistent
      expect(finalState.gameId).toBe(initialState.gameId);
      expect(finalState.players).toHaveLength(initialState.players.length);
      expect(finalState.gamePhase).toBe(GamePhase.PLAYING);
      expect(finalState.turnNumber).toBeGreaterThan(initialState.turnNumber);
    });

    test('should preserve grid state during turns', () => {
      // Set both players ready
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player1', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player2', payload: {} });

      const initialGrid = engine.getGameState().grid;
      const initialGridSize = initialGrid.size;

      // Pass several turns
      engine.processAction({ type: GameActionType.PASS_TURN, playerId: 'player1', payload: {} });
      engine.processAction({ type: GameActionType.PASS_TURN, playerId: 'player2', payload: {} });

      const finalGrid = engine.getGameState().grid;
      
      // Grid should maintain HOME cards
      expect(finalGrid.size).toBeGreaterThanOrEqual(initialGridSize);
      const homeCards = Array.from(finalGrid.values()).filter(card => card.isHOME);
      expect(homeCards).toHaveLength(2);
    });
  });
});
