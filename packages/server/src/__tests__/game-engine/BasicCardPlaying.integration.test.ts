/**
 * Basic Card Playing Integration Tests
 * Full end-to-end tests using real database seeding and enum values
 * NO MOCKS - Tests the complete flow: Database → GameDataManager → Engine → Game Logic
 */

import { BioMastersEngine, GameSettings } from '../../../../shared/game-engine/BioMastersEngine';
import { loadTestGameData } from '../utils/testDataLoader';
import {
  GameActionType,
  KeywordId,
  CardId,
  TrophicLevel,

} from '@kelseyabreu/shared';

describe('Basic Card Playing - Integration Tests', () => {
  let gameData: any;
  let engine: BioMastersEngine;
  let gameSettings: GameSettings;

  // Helper function to find a free position adjacent to HOME
  const findFreeAdjacentToHome = (gameState: any): { x: number; y: number } => {
    const homeCard = Array.from(gameState.grid.values()).find((card: any) => card.isHOME);
    if (!homeCard) throw new Error('No HOME card found');

    const homePos = (homeCard as any).position;
    const possiblePositions = [
      { x: homePos.x + 1, y: homePos.y },     // Right
      { x: homePos.x - 1, y: homePos.y },     // Left
      { x: homePos.x, y: homePos.y + 1 },     // Down
      { x: homePos.x, y: homePos.y - 1 }      // Up
    ];

    const gridWidth = gameSettings.gridWidth;
    const gridHeight = gameSettings.gridHeight;
    const freePosition = possiblePositions.find(pos => {
      const posKey = `${pos.x},${pos.y}`;
      const isWithinBounds = pos.x >= 0 && pos.x < gridWidth && pos.y >= 0 && pos.y < gridHeight;
      const isFree = !gameState.grid.has(posKey);
      return isWithinBounds && isFree;
    });

    if (!freePosition) throw new Error('No free position adjacent to HOME');
    return freePosition;
  };

  beforeAll(async () => {
    // Load game data directly from JSON files (no server required)
    console.log('📚 Loading game data from JSON files...');
    try {
      gameData = await loadTestGameData();
      console.log('✅ Game data loaded successfully');

      // Debug: Check what was loaded
      const cards = gameData.cards;
      const abilities = gameData.abilities;
      const keywords = gameData.keywords;
      console.log(`📊 Loaded: ${cards.size} cards, ${abilities.size} abilities, ${keywords.size} keywords`);
    } catch (error) {
      console.error('❌ Failed to load game data:', error);
      throw error;
    }

    console.log('✅ Integration test setup complete');
  }, 30000); // 30 second timeout for data loading

  beforeEach(() => {
    // Create realistic game settings with proper grid size based on player count
    // 1v1: 9x10, 2v2/4-player: 10x10
    const playerCount = 2; // This test uses 2 players (1v1)
    gameSettings = {
      maxPlayers: playerCount,
      gridWidth: playerCount === 2 ? 9 : 10,  // 9x10 for 1v1, 10x10 for 2v2/4-player
      gridHeight: 10,
      startingHandSize: 5,
      maxHandSize: 7,
      startingEnergy: 3,
      turnTimeLimit: 1800000 // 30 minutes
    };



    // Use real game data loaded in beforeAll
    const rawCards = gameData.cards;
    const rawAbilities = gameData.abilities;
    const rawKeywords = gameData.keywords;

    // Convert data to engine-expected format
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

    // Create engine with real data using production constructor
    engine = new BioMastersEngine(cardDatabase, abilityDatabase, keywordDatabase, gameData.localizationManager);

    // Initialize the game properly
    engine.initializeNewGame('integration-test', [
      { id: 'player1', name: 'Player 1' },
      { id: 'player2', name: 'Player 2' }
    ], gameSettings);
  });

  afterAll(async () => {
    // Clean up (no database cleanup needed for JSON-only tests)
    console.log('🧹 Test cleanup complete');
  });

  test('should place Oak Tree (Producer) adjacent to HOME using real enum', async () => {
    // Transition to playing phase first
    engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player1', payload: {} });
    engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player2', payload: {} });

    // Use real CardId enum
    const oakTreeId = CardId.OAK_TREE;

    // Verify card exists in loaded data
    const cards = gameData.cards;
    const oakTree = cards.get(oakTreeId);

    expect(oakTree).toBeDefined();
    expect(oakTree!.nameId).toBe('CARD_OAK_TREE');
    expect(oakTree!.trophicLevel).toBe(TrophicLevel.PRODUCER);
    expect(oakTree!.keywords).toContain(KeywordId.TERRESTRIAL);
    expect(oakTree!.cost).toBeNull(); // Producers have no cost

    // Add card to player's hand
    const gameState = engine.getGameState();
    gameState.players[0]?.hand.push(oakTreeId.toString());

    // Find a free position adjacent to HOME
    const adjacentPosition = findFreeAdjacentToHome(gameState);

    const playCardAction = {
      type: GameActionType.PLAY_CARD,
      playerId: 'player1',
      payload: {
        cardId: oakTreeId,
        position: adjacentPosition
      }
    };

    const result = engine.processAction(playCardAction);
    // Should succeed
    if (!result.isValid) {
      console.log('❌ Card placement failed:', result.errorMessage);
      console.log('🎯 Action details:', JSON.stringify(playCardAction, null, 2));
      console.log('🎮 Game state:', {
        gamePhase: gameState.gamePhase,
        turnPhase: gameState.turnPhase,
        actionsRemaining: gameState.actionsRemaining,
        handSize: gameState.players[0]?.hand.length
      });
    }
    expect(result.isValid).toBe(true);
    expect(result.errorMessage).toBeUndefined();

    // Verify card was placed on grid and enters exhausted
    const newState = result.newState!;
    const placedCard = Array.from(newState.grid.values()).find(card =>
      card.cardId === oakTreeId
    );
    expect(placedCard).toBeDefined();
    expect(placedCard!.position).toEqual(adjacentPosition);
    expect(placedCard!.ownerId).toBe('player1');
    expect(placedCard!.isExhausted).toBe(true); // Enters exhausted by default
  });

  test('should reject invalid position using real validation', async () => {
    // Transition to playing phase first
    engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player1', payload: {} });
    engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player2', payload: {} });

    const oakTreeId = CardId.OAK_TREE;

    // Add card to player's hand
    const gameState = engine.getGameState();
    gameState.players[0]?.hand.push(oakTreeId.toString());

    // Try to place at invalid position (outside 10x10 grid)
    const playCardAction = {
      type: GameActionType.PLAY_CARD,
      playerId: 'player1',
      payload: {
        cardId: oakTreeId,
        position: { x: 15, y: 15 } // Invalid - outside 10x10 grid
      }
    };

    const result = engine.processAction(playCardAction);
    // Should fail with specific validation error
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('position');
  });

  test('should connect Field Rabbit (+2) to Oak Tree (+1) following trophic rules', async () => {
    // Transition to playing phase first
    engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player1', payload: {} });
    engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player2', payload: {} });

    const oakTreeId = CardId.OAK_TREE;
    const rabbitId = CardId.EUROPEAN_RABBIT;

    // Verify both cards exist and have compatible domains and trophic levels
    const cards = gameData.cards;
    const oakTree = cards.get(oakTreeId);
    const rabbit = cards.get(rabbitId);

    expect(oakTree).toBeDefined();
    expect(rabbit).toBeDefined();
    expect(oakTree!.keywords).toContain(KeywordId.TERRESTRIAL);
    expect(rabbit!.keywords).toContain(KeywordId.TERRESTRIAL);
    expect(oakTree!.trophicLevel).toBe(TrophicLevel.PRODUCER); // +1
    expect(rabbit!.trophicLevel).toBe(TrophicLevel.PRIMARY_CONSUMER); // +2
    expect(rabbit!.cost).not.toBeNull(); // Consumers have cost

    // Add cards to player's hand
    const gameState = engine.getGameState();
    gameState.players[0]?.hand.push(oakTreeId.toString());
    gameState.players[0]?.hand.push(rabbitId.toString());

    // Find a free position adjacent to HOME for Oak Tree
    const oakPosition = findFreeAdjacentToHome(gameState);

    const placeOakAction = {
      type: GameActionType.PLAY_CARD,
      playerId: 'player1',
      payload: {
        cardId: oakTreeId,
        position: oakPosition
      }
    };

    const oakResult = engine.processAction(placeOakAction);
    expect(oakResult.isValid).toBe(true);

    // Update engine state and add rabbit to hand
    if (oakResult.newState) {
      // Add rabbit card to hand in the updated state before creating new engine
      oakResult.newState.players[0]?.hand.push(rabbitId.toString());

      // Make Oak Tree ready so it can pay for the rabbit
      const oakCard = Array.from(oakResult.newState.grid.values()).find(card =>
        card.cardId === oakTreeId
      );
      if (oakCard) {
        oakCard.isExhausted = false; // Make it ready to pay cost
      }

      // Engine is already initialized in beforeEach, just continue with the test
    }

    // Find a free position adjacent to Oak Tree for Rabbit
    const possibleRabbitPositions = [
      { x: oakPosition.x + 1, y: oakPosition.y },
      { x: oakPosition.x - 1, y: oakPosition.y },
      { x: oakPosition.x, y: oakPosition.y + 1 },
      { x: oakPosition.x, y: oakPosition.y - 1 }
    ];

    const rabbitPosition = possibleRabbitPositions.find(pos => {
      const posKey = `${pos.x},${pos.y}`;
      const isWithinBounds = pos.x >= 0 && pos.x < gameSettings.gridWidth && pos.y >= 0 && pos.y < gameSettings.gridHeight;
      const isFree = !oakResult.newState!.grid.has(posKey);
      return isWithinBounds && isFree;
    });

    expect(rabbitPosition).toBeDefined();

    const placeRabbitAction = {
      type: GameActionType.PLAY_CARD,
      playerId: 'player1',
      payload: {
        cardId: rabbitId,
        position: rabbitPosition!
      }
    };

    const rabbitResult = engine.processAction(placeRabbitAction);

    // Rabbit placement should succeed

    expect(rabbitResult.isValid).toBe(true);

    // Verify both cards are placed and Oak Tree is exhausted (paid as cost)
    const finalState = rabbitResult.newState!;
    const placedRabbit = Array.from(finalState.grid.values()).find(card =>
      card.cardId === rabbitId
    );
    const exhaustedOak = Array.from(finalState.grid.values()).find(card =>
      card.cardId === oakTreeId
    );

    expect(placedRabbit).toBeDefined();
    expect(placedRabbit!.position).toEqual(rabbitPosition!);
    expect(exhaustedOak).toBeDefined();
    expect(exhaustedOak!.isExhausted).toBe(true); // Should be exhausted as cost payment
  });

  test('should reject incompatible domain connection (terrestrial to aquatic)', async () => {
    // Transition to playing phase first
    engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player1', payload: {} });
    engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player2', payload: {} });

    const oakTreeId = CardId.OAK_TREE; // Terrestrial Producer
    const kelpId = CardId.GIANT_KELP; // Aquatic Producer

    // Verify domain incompatibility (both are producers, so trophic level is same)
    const cards = gameData.cards;
    const oakTree = cards.get(oakTreeId);
    const kelp = cards.get(kelpId);

    expect(oakTree!.keywords).toContain(KeywordId.TERRESTRIAL);
    expect(kelp!.keywords).toContain(KeywordId.AQUATIC);
    expect(oakTree!.trophicLevel).toBe(kelp!.trophicLevel); // Same trophic level

    // Add cards to player's hand
    const gameState = engine.getGameState();
    gameState.players[0]?.hand.push(oakTreeId.toString());
    gameState.players[0]?.hand.push(kelpId.toString());

    // Find a free position adjacent to HOME for Oak Tree
    const oakPosition = findFreeAdjacentToHome(gameState);

    // Place Oak Tree first
    const placeOakAction = {
      type: GameActionType.PLAY_CARD,
      playerId: 'player1',
      payload: {
        cardId: oakTreeId,
        position: oakPosition
      }
    };

    const oakResult = engine.processAction(placeOakAction);
    expect(oakResult.isValid).toBe(true);

    // Update engine state and add kelp to hand
    if (oakResult.newState) {
      // Add kelp card to hand in the updated state before creating new engine
      oakResult.newState.players[0]?.hand.push(kelpId.toString());

      // Engine is already initialized in beforeEach, just continue with the test
    }

    // Try to place Kelp connected to Oak Tree (should fail due to domain incompatibility)
    // Find a different adjacent position that's not occupied
    const possibleKelpPositions = [
      { x: oakPosition.x + 1, y: oakPosition.y },
      { x: oakPosition.x - 1, y: oakPosition.y },
      { x: oakPosition.x, y: oakPosition.y + 1 },
      { x: oakPosition.x, y: oakPosition.y - 1 }
    ];

    const kelpPosition = possibleKelpPositions.find(pos => {
      const posKey = `${pos.x},${pos.y}`;
      const isWithinBounds = pos.x >= 0 && pos.x < gameSettings.gridWidth && pos.y >= 0 && pos.y < gameSettings.gridHeight;
      const isFree = !oakResult.newState!.grid.has(posKey);
      return isWithinBounds && isFree;
    });

    expect(kelpPosition).toBeDefined();

    const placeKelpAction = {
      type: GameActionType.PLAY_CARD,
      playerId: 'player1',
      payload: {
        cardId: kelpId,
        position: kelpPosition!
      }
    };

    const kelpResult = engine.processAction(placeKelpAction);

    // Domain validation should reject incompatible domain connections
    // Kelp (aquatic) should not be able to connect to Oak Tree (terrestrial)
    expect(kelpResult.isValid).toBe(false); // Should be rejected due to domain incompatibility
  });

  test('should handle card lookup by CommonName from database', async () => {
    // Transition to playing phase first
    engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player1', payload: {} });
    engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'player2', payload: {} });

    const oakTreeId = CardId.OAK_TREE;

    // Get CommonName from database
    const cards = gameData.cards;
    const oakTree = cards.get(oakTreeId);
    const commonName = oakTree!.nameId;
    
    expect(commonName).toBe('CARD_OAK_TREE');

    // Add card to hand using proper ID (engine expects numeric IDs)
    const gameState = engine.getGameState();
    gameState.players[0]?.hand.push(oakTreeId.toString());

    // Find a free position adjacent to HOME
    const adjacentPosition = findFreeAdjacentToHome(gameState);

    const playCardAction = {
      type: GameActionType.PLAY_CARD,
      playerId: 'player1',
      payload: {
        cardId: oakTreeId, // Use proper numeric ID
        position: adjacentPosition
      }
    };

    const result = engine.processAction(playCardAction);
    expect(result.isValid).toBe(true);
  });

  test('should verify all real card data is properly loaded', async () => {
    const cards = gameData.cards;
    const abilities = gameData.abilities;
    const keywords = gameData.keywords;
    
    // Verify we have real data (not empty)
    expect(cards.size).toBeGreaterThan(0);
    expect(abilities.size).toBeGreaterThan(0);
    expect(keywords.size).toBeGreaterThan(0);
    
    // Verify specific cards exist with correct properties
    const oakTree = cards.get(CardId.OAK_TREE);
    expect(oakTree).toBeDefined();
    expect(oakTree!.nameId).toBe('CARD_OAK_TREE');
    expect(oakTree!.trophicLevel).toBe(TrophicLevel.PRODUCER);
    
    const rabbit = cards.get(CardId.EUROPEAN_RABBIT);
    expect(rabbit).toBeDefined();
    expect(rabbit!.nameId).toBe('CARD_EUROPEAN_RABBIT');
    expect(rabbit!.trophicLevel).toBe(TrophicLevel.PRIMARY_CONSUMER);
    
    // Verify keywords are properly loaded
    const terrestrialKeyword = keywords.get(KeywordId.TERRESTRIAL);
    expect(terrestrialKeyword).toBeDefined();
    expect(terrestrialKeyword).toBe('TERRESTRIAL');
    
    console.log(`✅ Verified ${cards.size} cards, ${abilities.size} abilities, ${keywords.size} keywords loaded from database`);
  });
});
