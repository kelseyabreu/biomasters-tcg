/**
 * Advanced Mechanics Integration Tests
 * Tests for Chemoautotrophs, Detritivores, Attachments, and other advanced game mechanics
 * Uses only real card data - no mocks
 */

import { BioMastersEngine, CardInstance } from '@kelseyabreu/shared';
import { loadTestGameData } from '../utils/testDataLoader';
import { GameActionType } from '@kelseyabreu/shared';

describe('🧬 Advanced Mechanics Integration Tests', () => {
  let engine: BioMastersEngine;
  let gameData: any;
  // Game settings will be initialized by the engine

  beforeAll(async () => {
    gameData = await loadTestGameData();
  });

  beforeEach(() => {
    // Use real game data loaded in beforeAll - these are already Maps
    const cardDatabase = gameData.cards;
    const abilityDatabase = gameData.abilities;
    const keywordDatabase = gameData.keywords;

    // Create mock localization manager
    const mockLocalizationManager = gameData.localizationManager;

    // Initialize engine with real data
    engine = new BioMastersEngine(cardDatabase, abilityDatabase, keywordDatabase, mockLocalizationManager);

    // Initialize the game properly
    engine.initializeNewGame('advanced-mechanics-test', [
      { id: 'Alice', name: 'Alice' },
      { id: 'Bob', name: 'Bob' }
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
    engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'Alice', payload: {} });
    engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'Bob', payload: {} });
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

  describe('🦠 Chemoautotroph Rules', () => {
    test('should allow chemoautotroph placement adjacent to HOME (good path)', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find((card: CardInstance) => card.isHOME && card.ownerId === 'Alice');

      // Add the required card to Alice's hand
      addCardsToHand('Alice', [15]); // Deep Sea Hydrothermal Vent Bacteria

      // Place Deep Sea Hydrothermal Vent Bacteria (Chemoautotroph) adjacent to HOME (should succeed)
      const homeAdjacentPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };

      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: {
          cardId: 15, // Deep Sea Hydrothermal Vent Bacteria (TrophicCategory: 2 = Chemoautotroph)
          position: homeAdjacentPos
        }
      });

      expect(result.isValid).toBe(true);

      // Verify chemoautotroph was placed correctly
      const finalState = result.newState!;
      const chemoCard = finalState.grid.get(`${homeAdjacentPos.x},${homeAdjacentPos.y}`);
      expect(chemoCard).toBeDefined();
      expect(chemoCard?.cardId).toBe(15);
    });

    test('should allow opportunistic chemoautotroph with Chemical Opportunist ability (good path)', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find((card: CardInstance) => card.isHOME && card.ownerId === 'Alice');

      // Add the required card to Alice's hand
      addCardsToHand('Alice', [26]); // Nitrifying Soil Bacteria

      // Place Nitrifying Soil Bacteria (Chemoautotroph with Chemical Opportunist) adjacent to HOME
      // This should work since chemoautotrophs can connect to HOME
      const chemoPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const chemoResult = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: {
          cardId: 26, // Nitrifying Soil Bacteria (has Chemical Opportunist ability)
          position: chemoPos
        }
      });

      expect(chemoResult.isValid).toBe(true);

      // Verify chemoautotroph was placed correctly
      const finalState = chemoResult.newState!;
      const chemoCard = finalState.grid.get(`${chemoPos.x},${chemoPos.y}`);
      expect(chemoCard).toBeDefined();
      expect(chemoCard?.cardId).toBe(26);
    });

    test('should reject chemoautotroph placement in isolation (bad path)', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find((card: CardInstance) => card.isHOME && card.ownerId === 'Alice');

      // Try to place Deep Sea Hydrothermal Vent Bacteria (Chemoautotroph) in isolation
      const isolatedPos = { x: aliceHome!.position.x - 3, y: aliceHome!.position.y - 3 };
      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: {
          cardId: 15, // Deep Sea Hydrothermal Vent Bacteria (Chemoautotroph)
          position: isolatedPos
        }
      });
      const resultMessage = result.errorMessage;

      expect(result.isValid).toBe(false);
      expect(resultMessage).toContain('Cards must be placed adjacent to existing cards or HOME');
    });
  });

  describe('🪱 Detritivore Rules', () => {
    test('should allow detritivore placement adjacent to saprotroph (good path)', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find((card: CardInstance) => card.isHOME && card.ownerId === 'Alice');

      // Add required cards to Alice's hand
      addCardsToHand('Alice', [1, 13, 11]); // Oak Tree, Soil Bacteria, Common Earthworm

      // First, create detritus and place saprotroph
      const oakPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const oakResult = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: { cardId: 1, position: oakPos } // Oak Tree
      });
      expect(oakResult.isValid).toBe(true);

      // Create detritus by marking the card as detritus
      const newState = engine.getGameState();
      const oakCard = newState.grid.get(`${oakPos.x},${oakPos.y}`);
      if (oakCard) {
        // Mark the card as detritus instead of removing it
        oakCard.isDetritus = true;
        oakCard.isExhausted = true; // Detritus cards are exhausted
      }

      // Place Soil Bacteria (Saprotroph) on detritus
      const saprotrophResult = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: { 
          cardId: 13, // Soil Bacteria (Saprotroph)
          position: oakPos 
        }
      });
      expect(saprotrophResult.isValid).toBe(true);

      // Now place Common Earthworm (Detritivore) adjacent to Saprotroph
      const detritivorePos = { x: oakPos.x, y: oakPos.y + 1 };
      const detritivoreResult = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: { 
          cardId: 11, // Common Earthworm (TrophicCategory: 9 = Detritivore)
          position: detritivorePos 
        }
      });

      expect(detritivoreResult.isValid).toBe(true);
      
      // Verify detritivore was placed correctly
      const finalState = detritivoreResult.newState!;
      const detritivoreCard = finalState.grid.get(`${detritivorePos.x},${detritivorePos.y}`);
      expect(detritivoreCard).toBeDefined();
      expect(detritivoreCard?.cardId).toBe(11);
    });

    test('should reject detritivore placement without adjacent saprotroph (bad path)', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find((card: CardInstance) => card.isHOME && card.ownerId === 'Alice');

      // Try to place Common Earthworm (Detritivore) in isolation
      const isolatedPos = { x: aliceHome!.position.x - 3, y: aliceHome!.position.y - 3 };
      const result = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: {
          cardId: 11, // Common Earthworm (Detritivore)
          position: isolatedPos
        }
      });
      const resultMessage = result.errorMessage;

      expect(result.isValid).toBe(false);
      expect(resultMessage).toContain('Cards must be placed adjacent to existing cards or HOME');
    });
  });

  describe('🤝 Mutualist Attachment Rules', () => {
    test('should allow mutualist attachment to compatible host (good path)', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find((card: CardInstance) => card.isHOME && card.ownerId === 'Alice');

      // Add required cards to Alice's hand
      addCardsToHand('Alice', [1, 17]); // Oak Tree, Mycorrhizal Fungi

      // First, place a plant host (Oak Tree)
      const hostPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const hostResult = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: { cardId: 1, position: hostPos } // Oak Tree
      });
      expect(hostResult.isValid).toBe(true);

      // Now attach Mycorrhizal Fungi (Mutualist) to the Oak Tree at the same position
      // According to rules: "Mutualists are played by tucking them under a host creature"
      const mutualistResult = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: {
          cardId: 17, // Mycorrhizal Fungi (TrophicCategory: 8 = Mutualist)
          position: hostPos // Same position as host for attachment
        }
      });

      expect(mutualistResult.isValid).toBe(true);

      // Verify mutualist was attached correctly
      const finalState = mutualistResult.newState!;
      const hostCard = finalState.grid.get(`${hostPos.x},${hostPos.y}`);
      expect(hostCard).toBeDefined();
      expect(hostCard?.cardId).toBe(1); // Still the Oak Tree
      expect(hostCard?.attachments.length).toBeGreaterThan(0); // Mutualist attached
      expect(hostCard?.attachments[0]?.cardId).toBe(17); // Mycorrhizal Fungi attached
    });

    test('should reject mutualist attachment with domain mismatch (bad path)', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find((card: CardInstance) => card.isHOME && card.ownerId === 'Alice');

      // Add required cards to Alice's hand
      addCardsToHand('Alice', [2, 17]); // Giant Kelp, Mycorrhizal Fungi

      // First, place a marine host (Kelp Forest)
      const hostPos = { x: aliceHome!.position.x - 1, y: aliceHome!.position.y };
      const hostResult = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: { cardId: 2, position: hostPos } // Kelp Forest (Marine)
      });
      expect(hostResult.isValid).toBe(true);

      // Try to attach terrestrial Mycorrhizal Fungi to marine Kelp Forest at same position
      // This should fail due to domain incompatibility
      const mutualistResult = engine.processAction({
        type: GameActionType.PLAY_CARD,
        playerId: 'Alice',
        payload: {
          cardId: 17, // Mycorrhizal Fungi (Terrestrial, Domain 1)
          position: hostPos // Same position as marine host
        }
      });

      expect(mutualistResult.isValid).toBe(false);
      expect(mutualistResult.errorMessage).toContain('domain');
    });
  });
});
