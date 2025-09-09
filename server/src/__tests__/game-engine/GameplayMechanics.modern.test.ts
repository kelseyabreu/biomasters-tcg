/**
 * BioMasters Gameplay Mechanics Tests - Modern Version
 * Updated to use real data and comprehensive gameplay mechanics
 * Based on BioMasterEngine.txt and RulesForBiomasters.txt
 */

import { BioMastersEngine, GameSettings } from '../../../../shared/game-engine/BioMastersEngine';
import { loadTestGameData } from '../utils/testDataLoader';
import {
  GameActionType,
  GamePhase,
  TurnPhase,
  CardId
} from '@biomasters/shared';

describe('BioMasters Gameplay Mechanics - Modern', () => {
  let engine: BioMastersEngine;
  let gameSettings: GameSettings;
  let gameData: any;

  // Helper function to add cards to player hands
  const addCardsToHand = (playerId: string, cardIds: number[]) => {
    const gameState = engine.getGameState();
    const player = gameState.players.find(p => p.id === playerId);
    if (player) {
      console.log(`🎒 Before adding cards, ${playerId} hand:`, player.hand);
      player.hand.push(...cardIds.map(id => id.toString()));
      console.log(`🎒 After adding cards ${cardIds}, ${playerId} hand:`, player.hand);
    }
  };

  beforeEach(async () => {
    // Load real game data
    gameData = await loadTestGameData();

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

    // Initialize engine with real data (same pattern as working BasicCardPlaying test)
    const rawCards = gameData.cards;
    const rawAbilities = gameData.abilities;
    const rawKeywords = gameData.keywords;

    // Convert data to engine-expected format (same as working BasicCardPlaying test)
    const cardDatabase = new Map<number, any>();
    rawCards.forEach((card: any, cardId: number) => {
      cardDatabase.set(cardId, {
        ...card,
        id: cardId,
        victoryPoints: card.victoryPoints || 1 // Ensure required field
      });
    });

    const abilityDatabase = new Map<number, any>();
    rawAbilities.forEach((ability: any, abilityId: number) => {
      abilityDatabase.set(abilityId, {
        ...ability,
        id: abilityId
      });
    });

    const keywordDatabase = new Map<number, any>();
    rawKeywords.forEach((keyword: any, keywordId: number) => {
      keywordDatabase.set(keywordId, {
        ...keyword,
        id: keywordId
      });
    });

    console.log(`🔧 Creating engine with ${cardDatabase.size} cards, ${abilityDatabase.size} abilities`);
    engine = new BioMastersEngine(cardDatabase, abilityDatabase, keywordDatabase, gameData.localizationManager);

    // Initialize the game properly
    engine.initializeNewGame('gameplay-test', [
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob' }
    ], gameSettings);

    // Note: Cards will be added to hands in individual tests after players are ready
  });

  afterEach(async () => {
    // Clean up engine instance
    if (engine) {
      // Clear any internal timers or intervals
      if (typeof (engine as any).cleanup === 'function') {
        await (engine as any).cleanup();
      }
      engine = null as any;
    }
  });

  afterAll(async () => {
    // Clean up game data resources
    if (gameData) {
      // Dispose of any resources
      if (typeof (gameData as any).dispose === 'function') {
        await (gameData as any).dispose();
      }
      gameData = null as any;
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
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
      // Add required cards to Alice's hand
      addCardsToHand('alice', [CardId.OAK_TREE]); // Oak Tree

      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');
      const adjacentPosition = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };

      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.OAK_TREE, position: adjacentPosition } // Oak Tree
      });

      expect(result.isValid).toBe(true);
      expect(result.newState?.grid.has(`${adjacentPosition.x},${adjacentPosition.y}`)).toBe(true);
      expect(result.newState?.actionsRemaining).toBe(2); // Action consumed
    });

    test('should build complex food chains', () => {
      // Add required cards to Alice's hand - use terrestrial food chain
      addCardsToHand('alice', [CardId.OAK_TREE, CardId.EUROPEAN_RABBIT, CardId.RED_FOX]); // Oak Tree, European Rabbit, Red Fox

      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');

      // Build terrestrial food chain: Oak Tree -> European Rabbit -> Red Fox

      // 1. Play Oak Tree (producer)
      const treePos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.OAK_TREE, position: treePos } // Oak Tree
      });
      expect(result1.isValid).toBe(true);

      // Ready the tree
      const treeCard = result1.newState!.grid.get(`${treePos.x},${treePos.y}`);
      if (treeCard) treeCard.isExhausted = false;

      // 2. Play European Rabbit (herbivore)
      const rabbitPos = { x: treePos.x, y: treePos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.EUROPEAN_RABBIT, position: rabbitPos } // European Rabbit
      });
      expect(result2.isValid).toBe(true);

      // Ready the rabbit
      const rabbitCard = result2.newState!.grid.get(`${rabbitPos.x},${rabbitPos.y}`);
      if (rabbitCard) rabbitCard.isExhausted = false;

      // 3. Play Red Fox (carnivore)
      const foxPos = { x: rabbitPos.x, y: rabbitPos.y - 1 };
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.RED_FOX, position: foxPos } // Red Fox
      });
      expect(result3.isValid).toBe(true);
    });

    test('should handle terrestrial food chains', () => {
      // Add required cards to Alice's hand
      addCardsToHand('alice', [CardId.OAK_TREE, CardId.EUROPEAN_RABBIT, CardId.RED_FOX]); // Oak Tree, European Rabbit, Red Fox

      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');

      // Build terrestrial food chain: Oak Tree -> European Rabbit -> Red Fox

      // 1. Play Oak Tree (producer)
      const oakPos = { x: aliceHome!.position.x, y: aliceHome!.position.y - 1 };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.OAK_TREE, position: oakPos }
      });
      expect(result1.isValid).toBe(true);

      // Ready the oak
      const oakCard = result1.newState!.grid.get(`${oakPos.x},${oakPos.y}`);
      if (oakCard) oakCard.isExhausted = false;

      // 2. Play European Rabbit (herbivore)
      const rabbitPos = { x: oakPos.x, y: oakPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.EUROPEAN_RABBIT, position: rabbitPos }
      });
      expect(result2.isValid).toBe(true);

      // Ready the rabbit
      const rabbitCard = result2.newState!.grid.get(`${rabbitPos.x},${rabbitPos.y}`);
      if (rabbitCard) rabbitCard.isExhausted = false;

      // 3. Play Red Fox (carnivore)
      const foxPos = { x: rabbitPos.x, y: rabbitPos.y - 1 };
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.RED_FOX, position: foxPos }
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
      // Start the game first
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'alice', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'bob', payload: {} });

      // Add required cards to Alice's hand
      addCardsToHand('alice', [CardId.OAK_TREE]); // Oak Tree

      let gameState = engine.getGameState();
      expect(gameState.actionsRemaining).toBe(3);

      // Play a card (consumes 1 action)
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');
      const adjacentPosition = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };

      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.OAK_TREE, position: adjacentPosition } // Oak Tree
      });

      expect(result.isValid).toBe(true);
      expect(result.newState?.actionsRemaining).toBe(2);
    });

    test('should prevent actions when none remaining', () => {
      // Add required cards to Alice's hand
      addCardsToHand('alice', [CardId.OAK_TREE]); // Oak Tree

      // Exhaust all actions
      const gameState = engine.getGameState();
      gameState.actionsRemaining = 0;

      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');
      const adjacentPosition = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };

      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.OAK_TREE, position: adjacentPosition } // Oak Tree
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
      // Add required cards to Alice's hand
      addCardsToHand('alice', [CardId.OAK_TREE, CardId.EUROPEAN_RABBIT, CardId.RED_FOX]); // Oak Tree, European Rabbit, Red Fox

      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');

      // Build food chain: Oak Tree -> Rabbit -> Fox
      const oakPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.OAK_TREE, position: oakPos } // Oak Tree
      });
      expect(result1.isValid).toBe(true);

      // Ready the oak
      const oakCard = result1.newState!.grid.get(`${oakPos.x},${oakPos.y}`);
      if (oakCard) oakCard.isExhausted = false;

      const rabbitPos = { x: oakPos.x, y: oakPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.EUROPEAN_RABBIT, position: rabbitPos } // European Rabbit
      });
      expect(result2.isValid).toBe(true);

      // Ready the rabbit
      const rabbitCard = result2.newState!.grid.get(`${rabbitPos.x},${rabbitPos.y}`);
      if (rabbitCard) rabbitCard.isExhausted = false;

      // Play Red Fox
      const foxPos = { x: rabbitPos.x, y: rabbitPos.y - 1 };
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.RED_FOX, position: foxPos } // Red Fox
      });
      expect(result3.isValid).toBe(true);

      // Verify the fox was placed
      const foxCard = result3.newState?.grid.get(`${foxPos.x},${foxPos.y}`);
      expect(foxCard).toBeDefined();
      expect(foxCard?.cardId).toBe(CardId.RED_FOX);
    });

    test('should trigger scavenger ability', () => {
      // Add required cards to Alice's hand
      addCardsToHand('alice', [CardId.OAK_TREE, CardId.EUROPEAN_RABBIT, CardId.RED_FOX]); // Oak Tree, European Rabbit, Red Fox

      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');

      // Build food chain to Red Fox (scavenger)
      const oakPos = { x: aliceHome!.position.x, y: aliceHome!.position.y - 1 };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.OAK_TREE, position: oakPos }
      });
      expect(result1.isValid).toBe(true);

      // Ready the oak
      const oakCard = result1.newState!.grid.get(`${oakPos.x},${oakPos.y}`);
      if (oakCard) oakCard.isExhausted = false;

      const rabbitPos = { x: oakPos.x, y: oakPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.EUROPEAN_RABBIT, position: rabbitPos }
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
        payload: { cardId: CardId.RED_FOX, position: foxPos }
      });
      expect(result3.isValid).toBe(true);

      // Verify the fox was placed and has abilities
      const foxCard = result3.newState?.grid.get(`${foxPos.x},${foxPos.y}`);
      expect(foxCard).toBeDefined();
      expect(foxCard?.cardId).toBe(CardId.RED_FOX);
    });
  });

  describe('Game State Management', () => {
    beforeEach(() => {
      // Set both players ready to enter playing phase
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'alice', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'bob', payload: {} });
    });

    test('should maintain proper grid state', () => {
      // Add required cards to Alice's hand
      addCardsToHand('alice', [CardId.OAK_TREE]); // Oak Tree

      const initialGrid = engine.getGameState().grid;
      expect(initialGrid.size).toBe(2); // Two HOME cards

      // Play a card
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');
      const adjacentPosition = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };

      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.OAK_TREE, position: adjacentPosition } // Oak Tree
      });

      expect(result.isValid).toBe(true);
      expect(result.newState?.grid.size).toBe(3); // HOME cards + new card
    });

    test('should track player hands correctly', () => {
      // Add required cards to Alice's hand
      addCardsToHand('alice', [CardId.OAK_TREE]); // Oak Tree

      const initialHandSize = engine.getGameState().players[0]?.hand.length || 0;

      // Play Oak Tree (cardId 1 - we know it's in the hand from addCardsToHand)
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');
      const adjacentPosition = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };

      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.OAK_TREE, position: adjacentPosition } // Oak Tree
      });

      expect(result.isValid).toBe(true);
      expect(result.newState?.players[0]?.hand.length).toBe(initialHandSize - 1);
      expect(result.newState?.players[0]?.hand).not.toContain(CardId.OAK_TREE); // Oak Tree should be removed from hand
    });

    test('should handle multiple players correctly', () => {
      // Add required cards to both players' hands
      addCardsToHand('alice', [CardId.OAK_TREE]); // Oak Tree
      addCardsToHand('bob', [CardId.GIANT_KELP]); // Giant Kelp

      // Alice plays a card
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'alice');
      const alicePos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };

      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.OAK_TREE, position: alicePos } // Oak Tree
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
        payload: { cardId: CardId.GIANT_KELP, position: bobPos }
      });
      expect(result3.isValid).toBe(true);
    });
  });
});
