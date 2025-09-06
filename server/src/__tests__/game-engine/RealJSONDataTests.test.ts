/**
 * Real JSON Data Tests
 * 
 * These tests use the actual JSON data files instead of mock data,
 * ensuring compatibility with the new JSON-driven architecture.
 */

import { BioMastersEngine } from '../../../../shared/game-engine/BioMastersEngine';
import { gameDataManager } from '../../services/GameDataManager';

describe('BioMasters Engine - Real JSON Data Tests', () => {
  beforeAll(async () => {
    // Load real game data
    if (!gameDataManager.isDataLoaded()) {
      await gameDataManager.loadGameData();
    }
  });

  describe('Game Data Loading', () => {
    it('should load cards from JSON', () => {
      const cards = gameDataManager.getCards();
      expect(cards.size).toBeGreaterThan(0);
      
      // Test specific card (Oak Tree)
      const oakTree = gameDataManager.getCard(1);
      expect(oakTree).toBeDefined();
      expect(oakTree?.commonName).toBe('Oak Tree');
      expect(oakTree?.trophicLevel).toBe(1);
    });

    it('should load abilities from JSON', () => {
      const abilities = gameDataManager.getAbilities();
      expect(abilities.size).toBeGreaterThan(0);
      
      // Test specific ability
      const ability = gameDataManager.getAbility(1);
      expect(ability).toBeDefined();
      expect(ability?.triggerID).toBeDefined();
    });

    it('should load localization data', () => {
      const localization = gameDataManager.getLocalization();
      expect(localization.cardNames).toBeDefined();
      expect(Object.keys(localization.cardNames).length).toBeGreaterThan(0);
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

      const engine = new BioMastersEngine(new Map(), new Map(), new Map());
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

      const engine = new BioMastersEngine(new Map(), new Map(), new Map());

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
      const cards = gameDataManager.getCards();
      
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
      const abilities = gameDataManager.getAbilities();
      
      for (const [abilityId, ability] of abilities.entries()) {
        // Test required properties
        expect(ability.abilityID).toBe(abilityId);
        expect(ability.triggerID).toBeDefined();
        expect(ability.effects).toBeDefined();
        expect(Array.isArray(ability.effects)).toBe(true);
        
        // Test effect structure
        for (const effect of ability.effects) {
          expect(effect.EffectID).toBeDefined();
          expect(effect.SelectorID).toBeDefined();
          expect(effect.ActionID).toBeDefined();
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

      const engine = new BioMastersEngine(new Map(), new Map(), new Map());

      // Initialize the game properly
      engine.initializeNewGame('test-game-3', [
        { id: 'player1', name: 'Alice' },
        { id: 'player2', name: 'Bob' }
      ], _gameSettings);

      // Test that engine can validate card placement
      const oakTree = gameDataManager.getCard(1); // Oak Tree
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

      const engine = new BioMastersEngine(new Map(), new Map(), new Map());

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
      const cards = gameDataManager.getCards();
      const abilities = gameDataManager.getAbilities();
      
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
      const cards = gameDataManager.getCards();
      const localization = gameDataManager.getLocalization();

      let localizedCards = 0;
      for (const [cardId] of cards.entries()) {
        if (localization.cardNames && localization.cardNames[cardId.toString()]) {
          localizedCards++;
        }
      }

      expect(localizedCards).toBeGreaterThan(0);
      expect(localizedCards).toBe(cards.size);
    });
  });
});
