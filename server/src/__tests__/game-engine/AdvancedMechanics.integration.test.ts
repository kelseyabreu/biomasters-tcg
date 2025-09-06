/**
 * Advanced Mechanics Integration Tests
 * Tests for Chemoautotrophs, Detritivores, Attachments, and other advanced game mechanics
 * Uses only real card data - no mocks
 */

import { BioMastersEngine } from '../../../../shared/game-engine/BioMastersEngine';
import { gameDataManager } from '../../services/GameDataManager';
import { GameActionType } from '@biomasters/shared';

describe('🧬 Advanced Mechanics Integration Tests', () => {
  let engine: BioMastersEngine;
  // Game settings will be initialized by the engine

  beforeAll(async () => {
    await gameDataManager.loadGameData();
  });

  beforeEach(() => {
    // Create 1v1 game with proper grid size
    // const playerCount = 2;
    // const gridSize = BioMastersEngine.getGridSize(playerCount);
    
    // Game settings will be initialized by the engine
    // const gameSettings = {
    //   maxPlayers: playerCount,
    //   gridWidth: gridSize.width,   // 9 for 1v1
    //   gridHeight: gridSize.height, // 10 for 1v1
    //   startingHandSize: 5,
    //   maxHandSize: 7,
    //   startingEnergy: 10,
    //   turnTimeLimit: 300
    // };

    // Use real game data loaded in beforeAll
    const rawCards = gameDataManager.getCards();
    const rawAbilities = gameDataManager.getAbilities();
    const rawKeywords = gameDataManager.getKeywords();

    // Convert data to engine-expected format
    const cardDatabase = new Map<number, any>();
    rawCards.forEach((card, cardId) => {
      cardDatabase.set(Number(cardId), {
        ...card,
        cardId: Number(cardId),
        victoryPoints: card.victoryPoints || 1 // Ensure required field
      });
    });

    const abilityDatabase = new Map<number, any>();
    rawAbilities.forEach((ability, abilityId) => {
      abilityDatabase.set(abilityId, ability);
    });

    const keywordDatabase = new Map<number, string>();
    rawKeywords.forEach((keyword, keywordId) => {
      keywordDatabase.set(Number(keywordId), keyword.keyword_name || String(keywordId));
    });

    // Create engine with real data using production constructor
    engine = new BioMastersEngine(cardDatabase, abilityDatabase, keywordDatabase);

    // Initialize the game properly
    engine.initializeNewGame('advanced-test', [
      { id: 'Alice', name: 'Alice' },
      { id: 'Bob', name: 'Bob' }
    ], {
      gridWidth: 10,
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

  describe('🦠 Chemoautotroph Rules', () => {
    test('should allow chemoautotroph placement adjacent to HOME (good path)', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'Alice');

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
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'Alice');

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
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'Alice');

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

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Cards must be placed adjacent to existing cards or HOME');
    });
  });

  describe('🪱 Detritivore Rules', () => {
    test('should allow detritivore placement adjacent to saprotroph (good path)', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'Alice');

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
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'Alice');

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

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Cards must be placed adjacent to existing cards or HOME');
    });
  });

  describe('🤝 Mutualist Attachment Rules', () => {
    test('should allow mutualist attachment to compatible host (good path)', () => {
      const gameState = engine.getGameState();
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'Alice');

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
      const aliceHome = Array.from(gameState.grid.values()).find(card => card.isHOME && card.ownerId === 'Alice');

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
