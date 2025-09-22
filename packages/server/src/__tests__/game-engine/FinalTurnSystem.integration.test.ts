/**
 * Final Turn System Integration Tests
 * Tests the final turn mechanics when a player runs out of cards
 */

import { BioMastersEngine, TurnPhase, GameActionType, GamePhase } from '@kelseyabreu/shared';
import { loadTestGameData } from '../utils/testDataLoader';
import { createMockLocalizationManager } from '../../utils/mockLocalizationManager';

describe('Final Turn System Integration Tests', () => {
  let gameData: any;
  let engine: BioMastersEngine;

  beforeAll(async () => {
    // Load real game data for final turn testing
    
    gameData = await loadTestGameData();
  });

  beforeEach(() => {
    // Use real game data loaded in beforeAll
    const rawCards = gameData.cards;
    const rawAbilities = gameData.abilities;
    const rawKeywords = gameData.keywords;

    // Convert data to engine-expected format
    const cardDatabase = new Map<number, any>();
    rawCards.forEach((card: any) => {
      cardDatabase.set(card.cardId, {
        ...card,
        id: card.cardId,
        victoryPoints: card.victoryPoints || 1 // Ensure required field
      });
    });

    const abilityDatabase = new Map<number, any>();
    rawAbilities.forEach((ability: any) => {
      abilityDatabase.set(ability.id, ability);
    });

    const keywordDatabase = new Map<number, string>();
    rawKeywords.forEach((keyword: any) => {
      keywordDatabase.set(keyword.id, keyword.keyword_name);
    });

    // Create engine with real data using production constructor
    const mockLocalizationManager = createMockLocalizationManager();
    engine = new BioMastersEngine(cardDatabase, abilityDatabase, keywordDatabase, mockLocalizationManager);

    // Initialize the game properly
    engine.initializeNewGame('final-turn-test', [
      { id: 'player1', name: 'Player 1' },
      { id: 'player2', name: 'Player 2' }
    ], {
      maxPlayers: 2,
      gridWidth: 9,
      gridHeight: 10,
      startingHandSize: 5,
      maxHandSize: 7,
      startingEnergy: 10,
      turnTimeLimit: 300
    });

    // Initialize a 2-player game
    const players = [
      { id: 'player1', name: 'Player 1' },
      { id: 'player2', name: 'Player 2' }
    ];

    const gameSettings = {
      maxPlayers: 2,
      gridWidth: 9,
      gridHeight: 10,
      startingHandSize: 5,
      maxHandSize: 7
    };

    engine.initializeNewGame('test-final-turn', players, gameSettings);

    // Mark both players as ready to start the game
    engine.processAction({
      type: GameActionType.PLAYER_READY,
      playerId: 'player1',
      payload: {}
    });

    engine.processAction({
      type: GameActionType.PLAYER_READY,
      playerId: 'player2',
      payload: {}
    });
  });

  test('should trigger final turn when player runs out of cards', () => {
    const gameState = engine.getGameState();

    // Simulate player2 running out of cards by emptying their deck
    const player2 = gameState.players.find((p: any) => p.id === 'player2')!;
    player2.deck = []; // Empty the deck

    // Force a turn transition to trigger draw phase
    const passTurnResult = engine.processAction({
      type: GameActionType.PASS_TURN,
      playerId: 'player1',
      payload: {}
    });

    expect(passTurnResult.isValid).toBe(true);

    // Now it should be player2's turn, and when they try to start their turn,
    // player2 should not be able to draw, triggering final turn
    const updatedState = engine.getGameState();

    // The game should now be in final turn phase
    expect(updatedState.gamePhase).toBe(GamePhase.FINAL_TURN);
    expect(updatedState.finalTurnTriggeredBy).toBe('player2');
    expect(updatedState.finalTurnPlayersRemaining).toContain('player1');
  });

  test('should end game after all final turns complete', () => {
    const gameState = engine.getGameState();

    // Empty both players' decks to ensure they both can't draw
    gameState.players.forEach((player: any) => {
      player.deck = [];
    });

    // Trigger final turn by having player1 pass turn
    // This will make it player2's turn, and player2 will fail to draw, triggering final turn
    engine.processAction({
      type: GameActionType.PASS_TURN,
      playerId: 'player1',
      payload: {}
    });

    let updatedState = engine.getGameState();
    expect(updatedState.gamePhase).toBe(GamePhase.FINAL_TURN);
    expect(updatedState.finalTurnTriggeredBy).toBe('player2');
    expect(updatedState.finalTurnPlayersRemaining).toContain('player1');

    // Player2 passes their turn (they're the current player who triggered final turn)
    engine.processAction({
      type: GameActionType.PASS_TURN,
      playerId: 'player2',
      payload: {}
    });

    // Now it should be player1's turn, and they should also not be able to draw
    // Empty player1's deck again to make sure (in case it was repopulated)
    updatedState = engine.getGameState();
    const player1 = updatedState.players.find((p: any) => p.id === 'player1')!;
    player1.deck = [];

    // Player1 takes their final turn
    engine.processAction({
      type: GameActionType.PASS_TURN,
      playerId: 'player1',
      payload: {}
    });

    updatedState = engine.getGameState();

    // Game should now be ended
    expect(updatedState.gamePhase).toBe(GamePhase.ENDED);
    expect(updatedState.finalTurnPlayersRemaining).toHaveLength(0);
  });

  test('should allow actions during final turn even without drawing', () => {
    const gameState = engine.getGameState();

    // Empty player2's deck (who will be the current player after pass turn)
    const player2 = gameState.players.find((p: any) => p.id === 'player2')!;
    player2.deck = [];

    // Trigger final turn
    engine.processAction({
      type: GameActionType.PASS_TURN,
      playerId: 'player1',
      payload: {}
    });

    const updatedState = engine.getGameState();
    expect(updatedState.gamePhase).toBe(GamePhase.FINAL_TURN);

    // Player2 should still be able to take actions during their final turn
    expect(updatedState.turnPhase).toBe(TurnPhase.ACTION);
    expect(updatedState.actionsRemaining).toBe(3);
  });

  test('should handle multiple players running out of cards', () => {
    const gameState = engine.getGameState();
    
    // Empty both players' decks
    gameState.players.forEach((player: any) => {
      player.deck = [];
    });

    // Player1 triggers final turn
    engine.processAction({
      type: GameActionType.PASS_TURN,
      playerId: 'player1',
      payload: {}
    });

    const updatedState = engine.getGameState();
    expect(updatedState.gamePhase).toBe('final_turn');
    expect(updatedState.finalTurnTriggeredBy).toBe('player2');

    // Player2 also can't draw but should still get their final turn
    const currentPlayer = updatedState.players[updatedState.currentPlayerIndex];
    expect(currentPlayer).toBeDefined();
    expect(currentPlayer!.id).toBe('player2');
    expect(updatedState.turnPhase).toBe(TurnPhase.ACTION); // Should skip to action phase
  });

  test('should maintain proper turn order during final turns', () => {
    const gameState = engine.getGameState();
    
    // Empty player2's deck (not the current player)
    const player2 = gameState.players.find((p: any) => p.id === 'player2')!;
    player2.deck = [];
    
    // Player1 passes turn normally
    engine.processAction({
      type: GameActionType.PASS_TURN,
      playerId: 'player1',
      payload: {}
    });

    // Now player2 should trigger final turn when they can't draw
    let updatedState = engine.getGameState();
    expect(updatedState.gamePhase).toBe(GamePhase.FINAL_TURN);
    expect(updatedState.finalTurnTriggeredBy).toBe('player2');
    expect(updatedState.finalTurnPlayersRemaining).toContain('player1');
    
    // Player2 takes their turn (can't draw but can act)
    engine.processAction({
      type: GameActionType.PASS_TURN,
      playerId: 'player2',
      payload: {}
    });

    // Player1 gets their final turn
    updatedState = engine.getGameState();
    const currentPlayer = updatedState.players[updatedState.currentPlayerIndex];
    expect(currentPlayer).toBeDefined();
    expect(currentPlayer!.id).toBe('player1');
    expect(updatedState.finalTurnPlayersRemaining).toContain('player1');
  });
});
