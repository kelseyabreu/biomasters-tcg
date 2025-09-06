import { BioMastersEngine } from '../../../../shared/game-engine/BioMastersEngine';
import { gameDataManager } from '../../services/GameDataManager';
import { GameActionType } from '@biomasters/shared';

describe('Saprotroph Logic Tests', () => {
  let engine: BioMastersEngine;
  // Game settings will be initialized by the engine

  beforeAll(async () => {
    console.log('🧪 Loading game data for saprotroph tests...');
    await gameDataManager.loadGameData();
    console.log('✅ Game data loaded for saprotroph tests');
  });

  beforeEach(() => {
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
    engine.initializeNewGame('saprotroph-test', [
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
  });

  // Helper function to start the game (transition from SETUP to PLAYING)
  const startGame = () => {
    engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'Alice', payload: {} });
    engine.processAction({ type: GameActionType.PLAYER_READY, playerId: 'Bob', payload: {} });
  };

  test('should detect Mycena Mushroom as saprotroph', () => {
    console.log('🧪 Testing saprotroph detection...');

    // Find the Mycena Mushroom card
    const cards = gameDataManager.getCards();
    const mushroomCard = Array.from(cards.values()).find((card: any) => card.commonName === 'Mycena Mushroom');
    expect(mushroomCard).toBeDefined();

    console.log('🍄 Mushroom card data:', {
      CardID: mushroomCard!.cardId,
      CommonName: mushroomCard!.commonName,
      TrophicLevel: mushroomCard!.trophicLevel,
      TrophicCategory: mushroomCard!.trophicCategory,
      Cost: mushroomCard!.cost
    });

    // Check if it's detected as a saprotroph
    expect(mushroomCard!.trophicLevel).toBe(-1); // SAPROTROPH
    expect(mushroomCard!.trophicCategory).toBe(6); // SAPROTROPH category
  });

  test('should allow saprotroph placement on detritus', () => {
    console.log('🧪 Testing saprotroph placement on detritus...');

    // Start the game first
    startGame();

    const gameState = engine.getGameState();
    const alice = gameState.players.find(p => p.id === 'Alice');

    // Add Oak Tree and Mycena Mushroom to Alice's hand
    if (alice) {
      alice.hand = ['1', '8']; // Oak Tree (1) and Mycena Mushroom (8)
    }

    console.log('🃏 Alice hand:', alice?.hand);
    
    // Place Oak Tree first (adjacent to HOME)
    // For a 9x10 grid, HOME positions are at the center (4,5)
    const oakPos = { x: 4, y: 4 }; // Adjacent to HOME
    const oakResult = engine.processAction({
      type: GameActionType.PLAY_CARD,
      playerId: 'Alice',
      payload: {
        cardId: '1', // Oak Tree
        position: oakPos
      }
    });
    
    console.log('🌳 Oak placement result:', oakResult.isValid, oakResult.errorMessage);
    expect(oakResult.isValid).toBe(true);

    // Update the engine state after oak placement
    if (oakResult.newState) {
      // The engine should automatically update its state, but let's verify the card is on the grid
      const stateAfterOak = engine.getGameState();
      const oakCard = stateAfterOak.grid.get(`${oakPos.x},${oakPos.y}`);
      console.log('🌳 Oak card on grid:', oakCard);
      expect(oakCard).toBeDefined();
    }

    // Remove Oak Tree to create detritus
    const stateAfterOak = engine.getGameState();
    const oakCard = stateAfterOak.grid.get(`${oakPos.x},${oakPos.y}`);
    expect(oakCard).toBeDefined();

    const removeResult = engine.processAction({
      type: GameActionType.REMOVE_CARD,
      playerId: 'Alice',
      payload: {
        instanceId: oakCard!.instanceId,
        reason: 'death'
      }
    });
    
    console.log('🗑️ Oak removal result:', removeResult.isValid, removeResult.errorMessage);
    expect(removeResult.isValid).toBe(true);
    
    // Check detritus was created
    const stateAfterRemoval = engine.getGameState();
    // Check for detritus cards on the grid (cards with isDetritus: true)
    const detritusCards = Array.from(stateAfterRemoval.grid.values()).filter(card => card.isDetritus);
    console.log('🍂 Detritus cards after removal:', detritusCards);
    expect(detritusCards.length).toBe(1);
    
    // Now try to place Mycena Mushroom on the detritus
    const mushroomResult = engine.processAction({
      type: GameActionType.PLAY_CARD,
      playerId: 'Alice',
      payload: {
        cardId: '8', // Mycena Mushroom
        position: oakPos // Same position as detritus
      }
    });
    
    console.log('🍄 Mushroom placement result:', mushroomResult.isValid, mushroomResult.errorMessage);
    
    if (!mushroomResult.isValid) {
      console.log('❌ Mushroom placement failed. Current state:');
      console.log('🃏 Alice hand:', stateAfterRemoval.players.find(p => p.id === 'Alice')?.hand);
      // Check for detritus cards on the grid
      const detritusCards = Array.from(stateAfterRemoval.grid.values()).filter(card => card.isDetritus);
      console.log('🍂 Detritus cards:', detritusCards);
      console.log('🎯 Grid cards:', Array.from(stateAfterRemoval.grid.values()).map(c => ({ cardId: c.cardId, position: c.position, isExhausted: c.isExhausted })));
    }
    
    expect(mushroomResult.isValid).toBe(true);
  });
});
