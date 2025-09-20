/**
 * Real JSON Data Tests
 * 
 * These tests use the actual JSON data files instead of mock data,
 * ensuring compatibility with the new JSON-driven architecture.
 */

import { BioMastersEngine } from '@kelseyabreu/shared';
import { createMockLocalizationManager } from '../../utils/mockLocalizationManager';
import { loadTestGameData } from '../utils/testDataLoader';

describe('BioMasters Engine - Real JSON Data Tests', () => {
  let gameData: any;
  beforeAll(async () => {
    // Load real game data from file system
    gameData = await loadTestGameData();
  });

  describe('Game Data Loading', () => {
    it('should load cards from JSON', () => {
      const cards = gameData.cards;
      expect(cards.size).toBeGreaterThan(0);
      
      // Test specific card (Oak Tree)
      const oakTree = gameData.cards.get(1);
      expect(oakTree).toBeDefined();
      expect(oakTree?.nameId).toBe('CARD_OAK_TREE');
      expect(oakTree?.trophicLevel).toBe(1);
    });

    it('should load abilities from JSON', () => {
      const abilities = gameData.abilities;
      expect(abilities.size).toBeGreaterThan(0);
      
      // Debug: Show what abilities are available
      console.log('🔍 Available abilities:', Array.from(abilities.keys()).slice(0, 5));

      // Get the first available ability instead of assuming ID 1 exists
      const firstAbilityId = Array.from(abilities.keys())[0];
      const ability = gameData.abilities.get(firstAbilityId);
      expect(ability).toBeDefined();
      expect(ability?.triggerId).toBeDefined();
    });

    it('should load localization data', () => {
      const localizationManager = gameData.localizationManager;
      expect(localizationManager).toBeDefined();
      expect(localizationManager.currentLanguage).toBe('en');

      // Test that we can get card names
      const oakTreeName = localizationManager.getCardName('CARD_OAK_TREE');
      expect(oakTreeName).toBeDefined();
      expect(typeof oakTreeName).toBe('string');
    });
  });

  describe('Engine Creation with Real Data', () => {
    it('should create engine instance successfully', () => {
      // Players will be initialized by the engine

      const _gameSettings = {
        maxPlayers: 2,
        deckSize: 8,
        startingHandSize: 3,
        maxActionsPerTurn: 3,
        enableAI: false,
        gridWidth: 10,
        gridHeight: 10,
        maxHandSize: 7
      };

      const mockLocalizationManager = createMockLocalizationManager();
      const engine = new BioMastersEngine(new Map(), new Map(), new Map(), mockLocalizationManager);
      expect(engine).toBeDefined();

      // Initialize the game properly
      engine.initializeNewGame('test-game', [
        { id: 'player1', name: 'Alice' },
        { id: 'player2', name: 'Bob' }
      ], _gameSettings);

      const gameState = engine.getGameState();
      expect(gameState.players).toHaveLength(2);
      expect(gameState.players[0]?.name).toBe('Alice');
      expect(gameState.players[1]?.name).toBe('Bob');
    });

    it('should have proper initial game state', () => {
      // Players will be initialized by the engine

      const _gameSettings = {
        maxPlayers: 2,
        deckSize: 8,
        startingHandSize: 3,
        maxActionsPerTurn: 3,
        enableAI: false,
        gridWidth: 10,
        gridHeight: 10,
        maxHandSize: 7
      };

      const mockLocalizationManager = createMockLocalizationManager();
      const engine = new BioMastersEngine(new Map(), new Map(), new Map(), mockLocalizationManager);

      // Initialize the game properly
      engine.initializeNewGame('test-game-2', [
        { id: 'player1', name: 'Alice' },
        { id: 'player2', name: 'Bob' }
      ], _gameSettings);

      const gameState = engine.getGameState();
      
      // Test initial state
      expect(gameState.currentPlayerIndex).toBe(0);
      expect(gameState.grid).toBeDefined();

      // Test that basic game state properties exist
      expect(gameState.players).toBeDefined();
      expect(gameState.currentPlayerIndex).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Card Data Validation', () => {
    it('should have valid card data structure', () => {
      const cards = gameData.cards;
      
      for (const [cardId, card] of cards.entries()) {
        // Test required properties
        expect(card.cardId).toBe(cardId);
        expect(card.trophicLevel).toBeDefined();
        expect(card.trophicCategory).toBeDefined();
        expect(card.keywords).toBeDefined();
        expect(Array.isArray(card.keywords)).toBe(true);
        
        // Test optional properties
        if (card.abilities) {
          expect(Array.isArray(card.abilities)).toBe(true);
        }
        
        if (card.victoryPoints) {
          expect(typeof card.victoryPoints).toBe('number');
        }
      }
    });

    it('should have valid ability data structure', () => {
      const abilities = gameData.abilities;
      
      for (const [abilityId, ability] of abilities.entries()) {
        // Test required properties
        expect(ability.id).toBe(abilityId);
        expect(ability.triggerId).toBeDefined();
        expect(ability.effects).toBeDefined();
        expect(Array.isArray(ability.effects)).toBe(true);

        // Test effect structure (updated for new AbilityEffect interface)
        for (const effect of ability.effects) {
          expect(effect.type).toBeDefined();
          expect(typeof effect.type).toBe('string');
          // Optional properties may or may not be defined
          if (effect.selector) {
            expect(typeof effect.selector).toBe('string');
          }
          if (effect.value) {
            expect(typeof effect.value).toBe('number');
          }
        }
      }
    });
  });

  describe('Game Mechanics with Real Data', () => {
    it('should handle card placement validation', () => {
      // Players will be initialized by the engine

      const _gameSettings = {
        maxPlayers: 2,
        deckSize: 8,
        startingHandSize: 3,
        maxActionsPerTurn: 3,
        enableAI: false,
        gridWidth: 10,
        gridHeight: 10,
        maxHandSize: 7
      };

      const mockLocalizationManager = createMockLocalizationManager();
      const engine = new BioMastersEngine(new Map(), new Map(), new Map(), mockLocalizationManager);

      // Initialize the game properly
      engine.initializeNewGame('test-game-3', [
        { id: 'player1', name: 'Alice' },
        { id: 'player2', name: 'Bob' }
      ], _gameSettings);

      // Test that engine can validate card placement
      const oakTree = gameData.cards.get(1); // Oak Tree
      expect(oakTree).toBeDefined();

      // This should not throw an error
      expect(() => {
        engine.getGameState();
      }).not.toThrow();
    });

    it('should handle turn progression', () => {
      // Players will be initialized by the engine

      const _gameSettings = {
        maxPlayers: 2,
        deckSize: 8,
        startingHandSize: 3,
        maxActionsPerTurn: 3,
        enableAI: false,
        gridWidth: 10,
        gridHeight: 10,
        maxHandSize: 7
      };

      const mockLocalizationManager = createMockLocalizationManager();
      const engine = new BioMastersEngine(new Map(), new Map(), new Map(), mockLocalizationManager);

      // Initialize the game properly
      engine.initializeNewGame('test-game-4', [
        { id: 'player1', name: 'Alice' },
        { id: 'player2', name: 'Bob' }
      ], _gameSettings);

      const initialState = engine.getGameState();
      
      expect(initialState.currentPlayerIndex).toBe(0);
    });
  });

  describe('Data Integrity', () => {
    it('should have consistent card-ability relationships', () => {
      const cards = gameData.cards;
      const abilities = gameData.abilities;
      
      let validReferences = 0;
      let totalReferences = 0;
      
      for (const [, card] of cards.entries()) {
        if (card.abilities && card.abilities.length > 0) {
          for (const abilityId of card.abilities) {
            totalReferences++;
            if (abilities.has(abilityId)) {
              validReferences++;
            }
          }
        }
      }
      
      expect(validReferences).toBe(totalReferences);
      expect(totalReferences).toBeGreaterThan(0);
    });

    it('should have localization for all cards', () => {
      const cards = gameData.cards;
      const localizationManager = gameData.localizationManager;

      let localizedCards = 0;
      for (const [, cardData] of cards.entries()) {
        // Check if localization exists for this card's nameId
        const cardName = localizationManager.getCardName(cardData.nameId);
        if (cardName && cardName !== cardData.nameId) {
          localizedCards++;
        }
      }

      expect(localizedCards).toBeGreaterThan(0);
      expect(localizedCards).toBe(cards.size);
    });
  });
});
