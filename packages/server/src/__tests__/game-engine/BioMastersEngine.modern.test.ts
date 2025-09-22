/**
 * BioMasters Engine Modern Tests
 * Updated to use proper enums and interfaces from shared module
 */

import { BioMastersEngine, CardInstance } from '@kelseyabreu/shared';
import { loadTestGameData } from '../utils/testDataLoader';
import {
  GameActionType,
  GamePhase,
  TurnPhase
} from '@kelseyabreu/shared';

describe('BioMasters Engine Modern Tests', () => {
  let engine: BioMastersEngine;
  let gameData: any;

  beforeAll(async () => {
    gameData = await loadTestGameData();
  });

  beforeEach(() => {
    // Use real game data loaded in beforeAll
    const cardDatabase = gameData.cards;
    const abilityDatabase = gameData.abilities;
    const keywordDatabase = gameData.keywords;
    const mockLocalizationManager = gameData.localizationManager;

    // Initialize engine with real data
    engine = new BioMastersEngine(cardDatabase, abilityDatabase, keywordDatabase, mockLocalizationManager);

    // Initialize the game properly
    engine.initializeNewGame('modern-test', [
      { id: 'player1', name: 'Test Player 1' },
      { id: 'player2', name: 'Test Player 2' }
    ], {
      gridWidth: 9,
      gridHeight: 10,
      maxHandSize: 7,
      startingEnergy: 10,
      turnTimeLimit: 300,
      maxPlayers: 2,
      startingHandSize: 5
    });

    // Start game
    engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player1', payload: {} });
    engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player2', payload: {} });
  });

  // Helper function to add cards to a player's hand for testing
  const addCardsToHand = (playerId: string, cardIds: number[]) => {
    const gameState = engine.getGameState();
    const player = gameState.players.find(p => p.id === playerId);
    if (player) {
      // Add the cards as strings (since hand contains string IDs)
      player.hand.push(...cardIds.map(id => id.toString()));
    }
  };

  describe('Engine Initialization', () => {
    test('should initialize with correct game state', () => {
      const gameState = engine.getGameState();

      expect(gameState.gameId).toBe('modern-test');
      expect(gameState.players).toHaveLength(2);
      expect(gameState.gamePhase).toBe(GamePhase.PLAYING);
      expect(gameState.turnPhase).toBe(TurnPhase.ACTION);
      expect(gameState.actionsRemaining).toBe(3);
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

      expect(cardDb.size).toBe(95); // Real data has 95 cards
      expect(abilityDb.size).toBe(17); // Real data has 17 abilities
      expect(cardDb.get(1)?.nameId).toBe('CARD_OAK_TREE');
      expect(abilityDb.get(1)?.id).toBe(1);
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
      const gameState = engine.getGameState();

      // Add Giant Kelp card to player1's hand
      addCardsToHand('player1', [2]); // Giant Kelp

      // Need to place adjacent to HOME card for valid placement
      const homeCard = Array.from(gameState.grid.values()).find((card: CardInstance) => card.isHOME && card.ownerId === 'player1');

      // Find a free adjacent position to HOME
      let adjacentPosition = { x: 2, y: 5 }; // Default position adjacent to player1's HOME
      if (homeCard) {
        adjacentPosition = { x: homeCard.position.x - 1, y: homeCard.position.y };
      }

      const playCardAction = {
        type: GameActionType.PLAY_CARD,
        playerId: 'player1',
        payload: {
          cardId: 2, // Use numeric cardId
          position: adjacentPosition
        }
      };

      const result = engine.processAction(playCardAction);

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
