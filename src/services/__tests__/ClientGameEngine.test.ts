/**
 * Client Game Engine Tests
 * Tests for the offline-first game engine
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the unified data loader module first (hoisted to top)
vi.mock('@shared/data/UnifiedDataLoader', () => {
  // Define mock data inside the mock factory
  const mockCardsData = [
    {
      cardId: 1,
      nameId: "CARD_OAK_TREE",
      scientificNameId: "SCIENTIFIC_QUERCUS_ROBUR",
      descriptionId: "DESC_OAK_TREE",
      taxonomyId: "TAXONOMY_OAK_TREE",
      trophicLevel: 1,
      trophicCategory: 1,
      domain: 1,
      cost: null,
      keywords: [1, 6, 20],
      abilities: [6],
      victoryPoints: 1,
      conservationStatus: 7,
      mass_kg: 50000,
      lifespan_max_days: 36500,
      vision_range_m: 0,
      smell_range_m: 0,
      hearing_range_m: 0,
      walk_speed_m_per_hr: 0,
      run_speed_m_per_hr: 0,
      swim_speed_m_per_hr: 0,
      fly_speed_m_per_hr: 0,
      offspring_count: 1000,
      gestation_days: 365
    }
  ];

  const mockKeywordsData = [
    {
      keywordId: 1,
      nameId: "KEYWORD_PRODUCER",
      descriptionId: "DESC_PRODUCER"
    },
    {
      keywordId: 6,
      nameId: "KEYWORD_TERRESTRIAL",
      descriptionId: "DESC_TERRESTRIAL"
    },
    {
      keywordId: 20,
      nameId: "KEYWORD_PLANT",
      descriptionId: "DESC_PLANT"
    }
  ];

  const mockAbilitiesData = [
    {
      abilityId: 1,
      nameId: "ABILITY_PHOTOSYNTHESIS",
      descriptionId: "DESC_PHOTOSYNTHESIS",
      triggerId: 1,
      effects: [
        {
          effectId: 1,
          type: "energy_gain",
          value: 1
        }
      ]
    }
  ];

  // Convert arrays to Maps as expected by the engine
  const mockCardsMap = new Map();
  mockCardsData.forEach(card => mockCardsMap.set(card.cardId, card));

  const mockAbilitiesMap = new Map();
  mockAbilitiesData.forEach(ability => mockAbilitiesMap.set(ability.abilityId, ability));

  const mockKeywordsMap = new Map();
  mockKeywordsData.forEach(keyword => mockKeywordsMap.set(keyword.keywordId, keyword.nameId));

  return {
    createUnifiedDataLoader: vi.fn().mockReturnValue({
      loadCards: vi.fn().mockResolvedValue({
        success: true,
        data: Array.from(mockCardsMap.values()),
        error: null
      }),
      loadAbilities: vi.fn().mockResolvedValue({
        success: true,
        data: Array.from(mockAbilitiesMap.values()),
        error: null
      }),
      loadGameConfig: vi.fn().mockResolvedValue({
        success: true,
        data: {},
        error: null
      }),
      loadLocalizationData: vi.fn().mockResolvedValue({
        success: true,
        data: {
          "card.oak_tree.name": "Oak Tree",
          "ability.photosynthesis.name": "Photosynthesis"
        },
        error: null
      }),
      getCardById: vi.fn().mockResolvedValue({
        success: true,
        data: mockCardsData[0],
        error: null
      }),
      getAbilityById: vi.fn().mockResolvedValue({
        success: true,
        data: mockAbilitiesData[0],
        error: null
      }),
      createLocalizationManager: vi.fn().mockResolvedValue({
        loadLanguage: vi.fn().mockResolvedValue(undefined),
        getCardName: vi.fn().mockReturnValue('Test Card'),
        getAbilityName: vi.fn().mockReturnValue('Test Ability')
      })
    })
  };
});

// Import after mocks to avoid hoisting issues
import { ClientGameEngine } from '../ClientGameEngine';
import { SupportedLanguage } from '@shared/text-ids';
import { GameActionType, GamePhase, TurnPhase } from '../../../shared/enums';

// Mock data for fetch responses
const mockLocalizationData = {
  "card.oak_tree.name": "Oak Tree",
  "ability.photosynthesis.name": "Photosynthesis"
};

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ClientGameEngine', () => {
  let engine: ClientGameEngine;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock fetch responses - use mockResolvedValue instead of mockResolvedValueOnce
    // so it can be called multiple times
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/data/game-config/cards.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              cardId: 1,
              nameId: "CARD_OAK_TREE",
              scientificNameId: "SCIENTIFIC_QUERCUS_ROBUR",
              descriptionId: "DESC_OAK_TREE",
              taxonomyId: "TAXONOMY_OAK_TREE",
              trophicLevel: 1,
              trophicCategory: 1,
              domain: 1,
              cost: null,
              keywords: [1, 6, 20],
              abilities: [6],
              victoryPoints: 1,
              conservationStatus: 7,
              mass_kg: 50000,
              lifespan_max_days: 36500,
              vision_range_m: 0,
              smell_range_m: 0,
              hearing_range_m: 0,
              walk_speed_m_per_hr: 0,
              run_speed_m_per_hr: 0,
              swim_speed_m_per_hr: 0,
              fly_speed_m_per_hr: 0,
              offspring_count: 1000,
              gestation_days: 365
            }
          ])
        });
      } else if (url.includes('/data/game-config/abilities.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              abilityId: 1,
              nameId: "ABILITY_PHOTOSYNTHESIS",
              descriptionId: "DESC_PHOTOSYNTHESIS",
              triggerId: 1,
              effects: [
                {
                  effectId: 1,
                  type: "energy_gain",
                  value: 1
                }
              ]
            }
          ])
        });
      } else if (url.includes('en.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockLocalizationData)
        });
      } else if (url.includes('/data/localization/en/cards.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            names: { CARD_OAK_TREE: "Oak Tree" },
            scientificNames: { SCIENTIFIC_QUERCUS_ROBUR: "Quercus robur" },
            descriptions: { DESC_TEST_CARD: "A test card for testing" }
          })
        });
      } else if (url.includes('/data/localization/en/abilities.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            names: { ABILITY_TEST: "Test Ability" },
            descriptions: { DESC_TEST_ABILITY: "A test ability" },
            flavorTexts: { FLAVOR_TEST: "Test flavor" }
          })
        });
      } else if (url.includes('/data/localization/en/ui.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            gameActions: { UI_PLAY_CARD: "Play Card", UI_ATTACK: "Attack" },
            gamePhases: { UI_ACTION_PHASE: "Action Phase" },
            resources: { UI_ENERGY: "Energy" },
            errors: { UI_INVALID_MOVE: "Invalid Move" },
            keywords: { UI_TERRESTRIAL: "Terrestrial" },
            menus: { UI_MAIN_MENU: "Main Menu" },
            notifications: { UI_GAME_SAVED: "Game Saved" }
          })
        });
      } else if (url.includes('/data/localization/en/taxonomy.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            kingdoms: { KINGDOM_PLANTAE: "Plantae" },
            phylums: { PHYLUM_CHORDATA: "Chordata" },
            classes: { CLASS_MAMMALIA: "Mammalia" },
            orders: { ORDER_PRIMATES: "Primates" },
            families: { FAMILY_HOMINIDAE: "Hominidae" },
            genera: { GENUS_HOMO: "Homo" },
            species: { SPECIES_SAPIENS: "sapiens" },
            commonNames: { COMMON_HUMAN: "human" }
          })
        });
      }
      return Promise.reject(new Error(`Unexpected fetch URL: ${url}`));
    });

    engine = new ClientGameEngine();
  });

  describe('Initialization', () => {
    it('should initialize and load game data', async () => {
      // Should not throw an error
      await expect(engine.initialize()).resolves.not.toThrow();
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
