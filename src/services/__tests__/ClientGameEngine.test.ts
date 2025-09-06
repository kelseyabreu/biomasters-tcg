/**
 * Client Game Engine Tests
 * Tests for the offline-first game engine
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClientGameEngine, clientGameDataManager } from '../ClientGameEngine';
import { GameActionType, GamePhase, TurnPhase } from '../../../shared/enums';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockCardsData = [
  {
    CardID: 1,
    TrophicLevel: 1,
    TrophicCategory: 1,
    Domain: 1,
    Cost: null,
    Keywords: [1, 6, 20],
    VictoryPoints: 1,
    CommonName: "Oak Tree",
    ScientificName: "Quercus robur",
    Taxonomy: {
      kingdom: "Plantae",
      phylum: "Tracheophyta",
      class: "Magnoliopsida",
      order: "Fagales",
      family: "Fagaceae",
      genus: "Quercus",
      species: "robur"
    },
    Mass_kg: 50000,
    Lifespan_max_days: 36500,
    Vision_range_m: 0,
    Smell_range_m: 0,
    Hearing_range_m: 0,
    Walk_speed_m_per_hr: 0,
    Run_speed_m_per_hr: 0,
    Swim_speed_m_per_hr: 0,
    Fly_speed_m_per_hr: 0,
    Offspring_count: 1000
  }
];

const mockAbilitiesData = [
  {
    AbilityID: 1,
    AbilityName: "Photosynthesis",
    Description: "Gain energy from sunlight",
    TriggerID: 1,
    EffectType: "gain_energy",
    EffectValue: 1,
    TargetType: "self",
    Cost: null
  }
];

const mockLocalizationData = {
  "card.oak_tree.name": "Oak Tree",
  "ability.photosynthesis.name": "Photosynthesis"
};

describe('ClientGameEngine', () => {
  let engine: ClientGameEngine;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock fetch responses - use mockResolvedValue instead of mockResolvedValueOnce
    // so it can be called multiple times
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('cards.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCardsData)
        });
      } else if (url.includes('abilities.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAbilitiesData)
        });
      } else if (url.includes('en.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockLocalizationData)
        });
      }
      return Promise.reject(new Error(`Unexpected fetch URL: ${url}`));
    });

    engine = new ClientGameEngine();
  });

  describe('Initialization', () => {
    it('should initialize and load game data', async () => {
      await engine.initialize();

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith('/data/cards.json');
    });

    it('should create a new game with correct grid dimensions', async () => {
      await engine.initialize();

      const players = [
        { id: 'player1', name: 'Alice' },
        { id: 'player2', name: 'Bob' }
      ];

      const gameState = await engine.createGame('test-game', players);

      expect(gameState.gameId).toBe('test-game');
      expect(gameState.players).toHaveLength(2);
      expect(gameState.gamePhase).toBe(GamePhase.SETUP);
      expect(gameState.turnPhase).toBe(TurnPhase.READY);
      expect(gameState.isOffline).toBe(true);

      // Check grid dimensions for 2 players (10x9: 10 columns x 9 rows)
      expect(gameState.gameSettings.gridWidth).toBe(10);
      expect(gameState.gameSettings.gridHeight).toBe(9);
    });

    it('should reject invalid player counts', async () => {
      await engine.initialize();

      const invalidPlayers = [
        { id: 'player1', name: 'Alice' },
        { id: 'player2', name: 'Bob' },
        { id: 'player3', name: 'Charlie' }
      ];

      await expect(engine.createGame('test-game', invalidPlayers)).rejects.toThrow(
        'Invalid player count. Only 2 or 4 players allowed for symmetric gameplay.'
      );
    });

    it('should create 4-player game with 10x10 grid', async () => {
      await engine.initialize();

      const players = [
        { id: 'player1', name: 'Alice' },
        { id: 'player2', name: 'Bob' },
        { id: 'player3', name: 'Charlie' },
        { id: 'player4', name: 'Diana' }
      ];

      const gameState = await engine.createGame('test-game-4p', players);

      expect(gameState.players).toHaveLength(4);
      expect(gameState.gameSettings.gridWidth).toBe(10);
      expect(gameState.gameSettings.gridHeight).toBe(10);
    });
  });

  describe('Game Actions', () => {
    beforeEach(async () => {
      await engine.initialize();
      await engine.createGame('test-game', [
        { id: 'player1', name: 'Alice' },
        { id: 'player2', name: 'Bob' }
      ]);
    });

    it('should handle player ready action', () => {
      const action = {
        type: GameActionType.PLAYER_READY,
        playerId: 'player1',
        payload: {}
      };

      const result = engine.processAction(action);

      expect(result.isValid).toBe(true);
      expect(result.newState?.players[0].isReady).toBe(true);
    });

    it('should reject action from wrong player', () => {
      const action = {
        type: GameActionType.PASS_TURN,
        playerId: 'player2', // Not current player
        payload: {}
      };

      const result = engine.processAction(action);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Not your turn');
    });

    it('should handle pass turn action', () => {
      const action = {
        type: GameActionType.PASS_TURN,
        playerId: 'player1',
        payload: {}
      };

      const result = engine.processAction(action);

      expect(result.isValid).toBe(true);
      expect(result.newState?.currentPlayerIndex).toBe(1);
    });
  });

  describe('Game State Management', () => {
    beforeEach(async () => {
      await engine.initialize();
      await engine.createGame('test-game', [
        { id: 'player1', name: 'Alice' },
        { id: 'player2', name: 'Bob' }
      ]);
    });

    it('should get current player', () => {
      const currentPlayer = engine.getCurrentPlayer();
      
      expect(currentPlayer).not.toBeNull();
      expect(currentPlayer?.id).toBe('player1');
    });

    it('should get available actions', () => {
      const actions = engine.getAvailableActions();
      
      expect(actions).toContain('pass_turn');
    });

    it('should save and load from local storage', () => {
      // Mock localStorage
      const localStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      };
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock
      });

      // Save game
      engine.saveToLocalStorage();
      expect(localStorageMock.setItem).toHaveBeenCalled();

      // Mock return value for load
      const gameState = engine.getGameState();
      const serializedState = JSON.stringify({
        ...gameState,
        grid: Array.from(gameState!.grid.entries())
      });
      localStorageMock.getItem.mockReturnValue(serializedState);

      // Load game
      const loaded = engine.loadFromLocalStorage('test-game');
      expect(loaded).toBe(true);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('biomasters-game-test-game');
    });
  });

  describe('Card Placement', () => {
    beforeEach(async () => {
      await engine.initialize();
      await engine.createGame('test-game', [
        { id: 'player1', name: 'Alice' },
        { id: 'player2', name: 'Bob' }
      ]);
    });

    it('should get valid positions for card placement', () => {
      const validPositions = engine.getValidPositions(1, 'player1');

      // Should have some valid positions adjacent to HOME
      expect(validPositions.length).toBeGreaterThan(0);
    });

    it('should place HOME cards in center of grid', () => {
      const gameState = engine.getGameState();
      expect(gameState).not.toBeNull();

      // Count HOME cards
      const homeCards = Array.from(gameState!.grid.values()).filter(card => card.isHOME);
      expect(homeCards).toHaveLength(2); // 2 players = 2 HOME cards

      // Check HOME positions are in center for 2 players (9x10 grid)
      const homePositions = homeCards.map(card => card.position);
      expect(homePositions).toHaveLength(2);

      // For 10x9 grid (width=10, height=9), center X is 5, center Y is 4
      // HOME cards should be at (4,4) and (5,4) - adjacent in center
      const centerY = Math.floor(9 / 2); // 4 (using height for Y)
      expect(homePositions.every(pos => pos.y === centerY)).toBe(true);

      // Should be adjacent horizontally in center
      const xPositions = homePositions.map(pos => pos.x).sort();
      expect(xPositions).toEqual([4, 5]); // Adjacent positions in center
    });
  });
});
