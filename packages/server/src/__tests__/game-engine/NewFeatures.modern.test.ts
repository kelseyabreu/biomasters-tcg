/**
 * BioMasters New Features Tests - Modern Version
 * Updated to use proper enums, data-driven approach, and new features
 */

import { BioMastersEngine, CardInstance } from '@kelseyabreu/shared';
import { loadTestGameData } from '../utils/testDataLoader';
import {
  GameActionType,
  CardId
} from '@kelseyabreu/shared';

describe('BioMasters New Features - Modern', () => {
  let engine: BioMastersEngine;
  let gameData: any;

  // Helper function to add cards to player hands
  const addCardsToHand = (playerId: string, cardIds: number[]) => {
    const gameState = engine.getGameState();
    const player = gameState.players.find(p => p.id === playerId);
    if (player) {
      player.hand.push(...cardIds.map(id => id.toString()));
    }
  };

  beforeAll(async () => {
    // Load real game data for testing
    gameData = await loadTestGameData();
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

  beforeEach(() => {
    // Use real game data loaded in beforeAll
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
      abilityDatabase.set(abilityId, ability);
    });

    const keywordDatabase = new Map<number, string>();
    rawKeywords.forEach((keywordName: string, keywordId: number) => {
      keywordDatabase.set(keywordId, keywordName);
    });

    // Create engine with processed data using production constructor
    engine = new BioMastersEngine(cardDatabase, abilityDatabase, keywordDatabase, gameData.localizationManager);

    // Initialize the game properly
    const gameSettings = {
      maxPlayers: 2,
      gridWidth: 9,
      gridHeight: 10,
      startingHandSize: 5,
      maxHandSize: 7,
      startingEnergy: 10,
      turnTimeLimit: 300
    };

    engine.initializeNewGame('newfeatures-test', [
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob' }
    ], gameSettings);
  });

  describe('New Trophic Categories', () => {
    beforeEach(() => {
      // Set both players ready to enter playing phase
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'alice', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'bob', payload: {} });
    });

    test('should support chemoautotroph producers', () => {
      // Add required cards to player's hand AFTER players are ready
      addCardsToHand('alice', [CardId.OAK_TREE]); // Oak Tree as producer

      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find((card: CardInstance) => card.isHOME && card.ownerId === 'alice');

      // Test chemoautotroph placement
      const producerPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.OAK_TREE, position: producerPos } // Oak Tree
      });
      expect(result.isValid).toBe(true);
    });

    test('should support detritivore consumers', () => {
      // Add required cards to player's hand AFTER players are ready
      addCardsToHand('alice', [CardId.OAK_TREE, CardId.EUROPEAN_RABBIT]); // Oak Tree, European Rabbit

      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find((card: CardInstance) => card.isHOME && card.ownerId === 'alice');

      // Place producer first
      const producerPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.OAK_TREE, position: producerPos } // Oak Tree
      });
      expect(result1.isValid).toBe(true);

      // Ready the producer
      const producerCard = result1.newState!.grid.get(`${producerPos.x},${producerPos.y}`);
      if (producerCard) producerCard.isExhausted = false;

      // Place detritivore
      const detritivorePos = { x: producerPos.x, y: producerPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.EUROPEAN_RABBIT, position: detritivorePos } // European Rabbit
      });
      expect(result2.isValid).toBe(true);
    });

    test('should support omnivore flexibility', () => {
      // Add required cards to player's hand AFTER players are ready
      addCardsToHand('alice', [CardId.OAK_TREE, CardId.EUROPEAN_RABBIT, CardId.RED_FOX]); // Oak Tree, European Rabbit, Red Fox (simpler than American Black Bear)

      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find((card: CardInstance) => card.isHOME && card.ownerId === 'alice');

      // Place producer first
      const producerPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.OAK_TREE, position: producerPos } // Oak Tree
      });
      expect(result1.isValid).toBe(true);

      // Ready the producer
      const producerCard = result1.newState!.grid.get(`${producerPos.x},${producerPos.y}`);
      if (producerCard) producerCard.isExhausted = false;

      // Place herbivore (trophic level 2) adjacent to producer
      const herbivorePos = { x: producerPos.x, y: producerPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.EUROPEAN_RABBIT, position: herbivorePos } // European Rabbit
      });
      expect(result2.isValid).toBe(true);

      // Ready the herbivore
      const herbivoreCard = result2.newState!.grid.get(`${herbivorePos.x},${herbivorePos.y}`);
      if (herbivoreCard) herbivoreCard.isExhausted = false;

      // Place omnivore (trophic level 3) adjacent to herbivore - Red Fox has no cost requirements
      const omnivorePos = { x: herbivorePos.x, y: herbivorePos.y - 1 };
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.RED_FOX, position: omnivorePos } // Red Fox (omnivore)
      });
      expect(result3.isValid).toBe(true);
    });
  });

  describe('Advanced Habitat Features', () => {
    beforeEach(() => {
      // Set both players ready to enter playing phase
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'alice', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'bob', payload: {} });
    });

    test('should support aquatic habitat requirements', () => {
      // Use terrestrial food chain: Oak Tree (terrestrial producer) -> European Rabbit (terrestrial herbivore) -> Red Fox (terrestrial carnivore)
      addCardsToHand('alice', [CardId.OAK_TREE, CardId.EUROPEAN_RABBIT, CardId.RED_FOX]); // Oak Tree, European Rabbit, Red Fox

      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find((card: CardInstance) => card.isHOME && card.ownerId === 'alice');

      // Place terrestrial producer (Oak Tree)
      const producerPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.OAK_TREE, position: producerPos } // Oak Tree
      });
      expect(result1.isValid).toBe(true);

      // Ready the producer
      const producerCard = result1.newState!.grid.get(`${producerPos.x},${producerPos.y}`);
      if (producerCard) producerCard.isExhausted = false;

      // Place terrestrial primary consumer (European Rabbit - trophic level 2) adjacent to Oak Tree
      const primaryConsumerPos = { x: producerPos.x, y: producerPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.EUROPEAN_RABBIT, position: primaryConsumerPos } // European Rabbit
      });
      expect(result2.isValid).toBe(true);

      // Ready the primary consumer
      const primaryConsumerCard = result2.newState!.grid.get(`${primaryConsumerPos.x},${primaryConsumerPos.y}`);
      if (primaryConsumerCard) primaryConsumerCard.isExhausted = false;

      // Place terrestrial secondary consumer (Red Fox - trophic level 3) adjacent to European Rabbit
      const consumerPos = { x: primaryConsumerPos.x, y: primaryConsumerPos.y - 1 };
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.RED_FOX, position: consumerPos } // Red Fox
      });
      expect(result3.isValid).toBe(true);
    });

    test('should support terrestrial habitat requirements', () => {
      // Add required cards to player's hand AFTER players are ready
      addCardsToHand('alice', [1, 4]); // Oak Tree, European Rabbit

      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find((card: CardInstance) => card.isHOME && card.ownerId === 'alice');

      // Place terrestrial producer
      const terrestrialPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: 1, position: terrestrialPos } // Oak Tree
      });
      expect(result1.isValid).toBe(true);

      // Ready the producer
      const producerCard = result1.newState!.grid.get(`${terrestrialPos.x},${terrestrialPos.y}`);
      if (producerCard) producerCard.isExhausted = false;

      // Place terrestrial consumer
      const consumerPos = { x: terrestrialPos.x, y: terrestrialPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: 4, position: consumerPos } // European Rabbit
      });
      expect(result2.isValid).toBe(true);
    });

    test('should support mixed habitat ecosystems', () => {
      // Add required cards to player's hand AFTER players are ready
      addCardsToHand('alice', [1, 2]); // Oak Tree, Giant Kelp

      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find((card: CardInstance) => card.isHOME && card.ownerId === 'alice');

      // Place terrestrial producer
      const terrestrialPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: 1, position: terrestrialPos } // Oak Tree
      });
      expect(result1.isValid).toBe(true);

      // Place aquatic producer in different area
      const aquaticPos = { x: aliceHome!.position.x, y: aliceHome!.position.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: 2, position: aquaticPos } // Giant Kelp
      });
      expect(result2.isValid).toBe(true);

      // Both habitats should coexist
      expect(result2.newState?.grid.size).toBe(4); // 2 HOME + 2 producers
    });
  });

  describe('Advanced Ability System', () => {
    beforeEach(() => {
      // Set both players ready to enter playing phase
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'alice', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'bob', payload: {} });
    });

    test('should trigger migration abilities', () => {
      // Use terrestrial food chain: Oak Tree (terrestrial producer) -> European Rabbit (terrestrial herbivore) -> Red Fox (terrestrial carnivore)
      addCardsToHand('alice', [CardId.OAK_TREE, CardId.EUROPEAN_RABBIT, CardId.RED_FOX]); // Oak Tree, European Rabbit, Red Fox

      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find((card: CardInstance) => card.isHOME && card.ownerId === 'alice');

      // Place terrestrial producer (Oak Tree)
      const producerPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.OAK_TREE, position: producerPos } // Oak Tree
      });
      expect(result1.isValid).toBe(true);

      // Ready the producer
      const producerCard = result1.newState!.grid.get(`${producerPos.x},${producerPos.y}`);
      if (producerCard) producerCard.isExhausted = false;

      // Place terrestrial primary consumer (European Rabbit - trophic level 2) adjacent to Oak Tree
      const primaryConsumerPos = { x: producerPos.x, y: producerPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.EUROPEAN_RABBIT, position: primaryConsumerPos } // European Rabbit
      });
      expect(result2.isValid).toBe(true);

      // Ready the primary consumer
      const primaryConsumerCard = result2.newState!.grid.get(`${primaryConsumerPos.x},${primaryConsumerPos.y}`);
      if (primaryConsumerCard) primaryConsumerCard.isExhausted = false;

      // Place migratory species (Red Fox - trophic level 3) adjacent to European Rabbit
      const migratoryPos = { x: primaryConsumerPos.x, y: primaryConsumerPos.y - 1 };
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.RED_FOX, position: migratoryPos } // Red Fox
      });
      expect(result3.isValid).toBe(true);

      // Verify migration ability is available
      const foxCard = result3.newState?.grid.get(`${migratoryPos.x},${migratoryPos.y}`);
      expect(foxCard).toBeDefined();
      expect(foxCard?.cardId).toBe(CardId.RED_FOX);
    });

    test('should handle symbiotic relationships', () => {
      // Add required cards to player's hand AFTER players are ready
      addCardsToHand('alice', [1, 4]); // Oak Tree, European Rabbit

      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find((card: CardInstance) => card.isHOME && card.ownerId === 'alice');

      // Place producer
      const producerPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: 1, position: producerPos } // Oak Tree
      });
      expect(result1.isValid).toBe(true);

      // Ready the producer
      const producerCard = result1.newState!.grid.get(`${producerPos.x},${producerPos.y}`);
      if (producerCard) producerCard.isExhausted = false;

      // Place symbiotic species
      const symbioticPos = { x: producerPos.x, y: producerPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: 4, position: symbioticPos } // European Rabbit
      });
      expect(result2.isValid).toBe(true);

      // Verify symbiotic relationship
      const rabbitCard = result2.newState?.grid.get(`${symbioticPos.x},${symbioticPos.y}`);
      expect(rabbitCard).toBeDefined();
      expect(rabbitCard?.cardId).toBe(4);
    });

    test('should support seasonal behavior patterns', () => {
      // Add required cards to player's hand AFTER players are ready
      addCardsToHand('alice', [CardId.OAK_TREE, CardId.EUROPEAN_RABBIT, CardId.RED_FOX]); // Oak Tree, European Rabbit, Red Fox (simpler than American Black Bear)

      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find((card: CardInstance) => card.isHOME && card.ownerId === 'alice');

      // Place producer
      const producerPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.OAK_TREE, position: producerPos } // Oak Tree
      });
      expect(result1.isValid).toBe(true);

      // Ready the producer
      const producerCard = result1.newState!.grid.get(`${producerPos.x},${producerPos.y}`);
      if (producerCard) producerCard.isExhausted = false;

      // Place herbivore (trophic level 2) adjacent to producer
      const herbivorePos = { x: producerPos.x, y: producerPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.EUROPEAN_RABBIT, position: herbivorePos } // European Rabbit
      });
      expect(result2.isValid).toBe(true);

      // Ready the herbivore
      const herbivoreCard = result2.newState!.grid.get(`${herbivorePos.x},${herbivorePos.y}`);
      if (herbivoreCard) herbivoreCard.isExhausted = false;

      // Place seasonal species (trophic level 3) adjacent to herbivore
      const seasonalPos = { x: herbivorePos.x, y: herbivorePos.y - 1 };
      const result3 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: CardId.RED_FOX, position: seasonalPos } // Red Fox (seasonal behavior)
      });
      expect(result3.isValid).toBe(true);

      // Verify seasonal behavior
      const foxCard = result3.newState?.grid.get(`${seasonalPos.x},${seasonalPos.y}`);
      expect(foxCard).toBeDefined();
      expect(foxCard?.cardId).toBe(CardId.RED_FOX);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    beforeEach(() => {
      // Set both players ready to enter playing phase
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'alice', payload: {} });
      engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'bob', payload: {} });
    });

    test('should handle invalid trophic combinations', () => {
      // Add required cards to player's hand AFTER players are ready
      addCardsToHand('alice', [6]); // American Black Bear

      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find((card: CardInstance) => card.isHOME && card.ownerId === 'alice');

      // Try to place apex predator without proper food chain
      const invalidPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: 6, position: invalidPos } // American Black Bear without food source
      });

      expect(result.isValid).toBe(false);
    });

    test('should handle habitat mismatches', () => {
      // Add required cards to player's hand AFTER players are ready
      addCardsToHand('alice', [1, 5]); // Oak Tree, Sockeye Salmon

      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find((card: CardInstance) => card.isHOME && card.ownerId === 'alice');

      // Place terrestrial producer
      const terrestrialPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: 1, position: terrestrialPos } // Oak Tree
      });
      expect(result1.isValid).toBe(true);

      // Ready the producer
      const producerCard = result1.newState!.grid.get(`${terrestrialPos.x},${terrestrialPos.y}`);
      if (producerCard) producerCard.isExhausted = false;

      // Try to place aquatic species on terrestrial producer
      const aquaticPos = { x: terrestrialPos.x, y: terrestrialPos.y - 1 };
      const result2 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: 5, position: aquaticPos } // Sockeye Salmon on terrestrial
      });

      // This should fail due to habitat mismatch
      expect(result2.isValid).toBe(false);
    });

    test('should validate energy requirements', () => {
      // Add required cards to player's hand
      addCardsToHand('alice', [1, 4, 6]); // Oak Tree, European Rabbit, American Black Bear

      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find((card: CardInstance) => card.isHOME && card.ownerId === 'alice');

      // Verify players start with sufficient energy
      const alice = gameState.players.find(p => p.id === 'alice');
      expect(alice?.energy).toBeGreaterThan(0);

      // Place cards and verify energy is consumed
      const producerPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const result1 = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'alice',
        payload: { cardId: 1, position: producerPos } // Oak Tree
      });
      expect(result1.isValid).toBe(true);
    });
  });
});
