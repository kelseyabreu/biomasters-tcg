/**
 * Client-Side BioMasters Game Engine
 * Lightweight wrapper around the shared BioMastersEngine
 * Handles client-specific data loading and UI state management
 */

import {
  GamePhase,
  TurnPhase,
  GameActionType
} from '@shared/enums';

// Import the shared, authoritative game engine
import {
  BioMastersEngine,
  PlayerAction as ServerPlayerAction
} from '@shared/game-engine/BioMastersEngine';

// Import shared types
import {
  GameState as ServerGameState,
  CardData,
  AbilityData
} from '@shared/types';

// Import localization system
import {
  LocalizationManager,
  JSONFileDataLoader
} from '@shared/localization-manager';

// Import unified data loader factory
import { createUnifiedDataLoader } from '@shared/data/UnifiedDataLoader';
import { IUnifiedDataLoader } from '@shared/data/IServerDataLoader';
import { GameDataSet } from '@shared/data/DataLoader';

import {
  SupportedLanguage
} from '@shared/text-ids';



// Client-specific interfaces for UI compatibility
export interface ClientGameState {
  gameId: string;
  players: ClientPlayer[];
  currentPlayerIndex: number;
  gamePhase: GamePhase;
  turnPhase: TurnPhase;
  actionsRemaining: number;
  turnNumber: number;
  grid: Map<string, ClientGridCard>;
  gameSettings: ClientGameSettings;
  metadata: Record<string, any>;
  isOffline: boolean;
  lastSyncTimestamp?: number;
}

export interface ClientPlayer {
  id: string;
  name: string;
  hand: string[];
  deck: string[];
  scorePile: ClientGridCard[];
  energy: number;
  isReady: boolean;
}

export interface ClientGridCard {
  instanceId: string;
  cardId: number;
  ownerId: string;
  position: { x: number; y: number };
  isExhausted: boolean;
  attachments: ClientGridCard[];
  statusEffects: ClientStatusEffect[];
  isDetritus: boolean;
  isHOME: boolean;
}

export interface ClientStatusEffect {
  effectId: string;
  name: string;
  description: string;
  duration: number;
  stackable: boolean;
  metadata: Record<string, any>;
}

export interface ClientGameSettings {
  maxPlayers: number;
  gridWidth: number;
  gridHeight: number;
  startingHandSize: number;
  maxHandSize: number;
  startingEnergy?: number;
}

export interface ClientPlayerAction {
  type: GameActionType;
  playerId: string;
  payload: any;
}

export interface ClientPlayCardPayload {
  cardId: string;
  position: { x: number; y: number };
}

export interface ClientActivateAbilityPayload {
  cardInstanceId: string;
  abilityId: number;
  targetPosition?: { x: number; y: number };
}



// Shared unified data loader instance
export const sharedDataLoader = createUnifiedDataLoader({
  environment: 'client',
  source: 'fetch',
  baseUrl: '/data',
  enableCaching: true,
  cacheConfig: {
    ttl: 300000, // 5 minutes
    maxSize: 100
  },
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2
  }
});

/**
 * Client-side BioMasters Game Engine
 * Lightweight wrapper around the shared BioMastersEngine
 * Handles client-specific data loading and UI state management
 */
export class ClientGameEngine {
  private coreEngine: BioMastersEngine | null = null;
  private gameState: ClientGameState | null = null;
  private dataLoader: IUnifiedDataLoader;

  constructor() {
    this.dataLoader = sharedDataLoader;
  }

  /**
   * Initialize the game engine with JSON data
   */
  async initialize(): Promise<void> {
    // Load game data using unified data loader
    const gameDataResult = await this.loadGameDataSet();
    if (!gameDataResult) {
      throw new Error('Failed to load game data');
    }
    console.log('✅ [ClientGameEngine] Game data loaded successfully using unified DataLoader');
  }

  /**
   * Load complete game data set using unified data loader
   */
  private async loadGameDataSet(): Promise<GameDataSet> {
    // Load all data in parallel using unified interface
    const [cardsResult, abilitiesResult, localizationManager] = await Promise.all([
      this.dataLoader.loadCards(),
      this.dataLoader.loadAbilities(),
      this.dataLoader.createLocalizationManager()
    ]);

    // Check for loading errors
    if (!cardsResult.success || !cardsResult.data) {
      throw new Error(`Failed to load cards: ${cardsResult.error}`);
    }
    if (!abilitiesResult.success || !abilitiesResult.data) {
      throw new Error(`Failed to load abilities: ${abilitiesResult.error}`);
    }

    // Convert arrays to Maps for GameDataSet compatibility
    const cardsMap = new Map<number, CardData>();
    for (const card of cardsResult.data) {
      cardsMap.set(card.cardId, card);
    }

    const abilitiesMap = new Map<number, AbilityData>();
    for (const ability of abilitiesResult.data) {
      abilitiesMap.set(ability.id, ability);
    }

    // Create empty keywords map for now (can be enhanced later)
    const keywordsMap = new Map<number, string>();

    // Load default language
    await localizationManager.loadLanguage(SupportedLanguage.ENGLISH);

    return {
      cards: cardsMap,
      abilities: abilitiesMap,
      keywords: keywordsMap,
      localizationManager
    };
  }

  /**
   * Get grid dimensions based on player count
   */
  private getGridDimensions(playerCount: number): { width: number; height: number } {
    if (playerCount === 2) {
      return { width: 10, height: 9 }; // 1v1 mode: 10 columns x 9 rows
    } else {
      return { width: 10, height: 10 }; // 2v2 or 4-player mode
    }
  }

  /**
   * Create a new game using the shared engine
   */
  async createGame(
    gameId: string,
    players: { id: string; name: string }[],
    settings: Partial<ClientGameSettings> = {}
  ): Promise<ClientGameState> {
    console.log('🎮 [ClientGameEngine] Creating game:', gameId, 'with', players.length, 'players');

    // Ensure data is loaded
    await this.initialize();

    // Validate inputs
    if (!gameId || !players || players.length === 0) {
      throw new Error('Invalid game parameters');
    }

    // Validate player count for symmetric gameplay
    if (players.length !== 2 && players.length !== 4) {
      throw new Error('Invalid player count. Only 2 or 4 players allowed for symmetric gameplay.');
    }

    // Set grid dimensions based on player count
    const gridDimensions = this.getGridDimensions(players.length);
    const defaultSettings: ClientGameSettings = {
      maxPlayers: players.length,
      gridWidth: gridDimensions.width,
      gridHeight: gridDimensions.height,
      startingHandSize: 5,
      maxHandSize: 10,
      startingEnergy: 3,
      ...settings
    };

    // Create localization manager
    const localizationManager = new LocalizationManager(
      new JSONFileDataLoader('/data/localization')
    );
    await localizationManager.loadLanguage(SupportedLanguage.ENGLISH); // Default to English

    // Load game data using unified data loader
    const gameData = await this.loadGameDataSet();
    const cardDatabase = gameData.cards;
    const abilityDatabase = gameData.abilities;
    const keywordDatabase = gameData.keywords;

    // Create the shared engine instance
    this.coreEngine = new BioMastersEngine(cardDatabase, abilityDatabase, keywordDatabase, localizationManager);

    // Initialize the game using the shared engine
    const serverGameState = this.coreEngine.initializeNewGame(gameId, players, {
      maxPlayers: defaultSettings.maxPlayers,
      gridWidth: defaultSettings.gridWidth,
      gridHeight: defaultSettings.gridHeight,
      startingHandSize: defaultSettings.startingHandSize,
      maxHandSize: defaultSettings.maxHandSize,
      startingEnergy: defaultSettings.startingEnergy
    });

    // Convert server state to client format
    this.gameState = this.convertServerStateToClient(serverGameState, defaultSettings);
    console.log('🎮 [ClientGameEngine] Game created using shared engine');

    return this.gameState;
  }

  /**
   * Convert server game state to client format
   */
  private convertServerStateToClient(serverState: ServerGameState, settings: ClientGameSettings): ClientGameState {
    const clientPlayers: ClientPlayer[] = serverState.players.map(p => ({
      id: p.id,
      name: p.name,
      hand: p.hand,
      deck: p.deck,
      scorePile: p.scorePile.map(cardId => ({
        instanceId: cardId,
        cardId: parseInt(cardId.split('_')[0]) || 0, // Extract numeric cardId from instance ID
        ownerId: p.id,
        position: { x: 0, y: 0 }, // Score pile cards don't have positions
        isExhausted: false,
        attachments: [],
        statusEffects: [],
        isDetritus: false,
        isHOME: false
      })),
      energy: p.energy,
      isReady: p.isReady
    }));

    const clientGrid = new Map<string, ClientGridCard>();
    serverState.grid.forEach((card, key) => {
      clientGrid.set(key, {
        cardId: card.cardId,
        ownerId: card.ownerId,
        position: card.position,
        isExhausted: card.isExhausted,
        isHOME: card.isHOME,
        isDetritus: card.isDetritus,
        instanceId: card.instanceId,
        attachments: [], // Initialize empty for client
        statusEffects: [] // Initialize empty for client
      });
    });

    return {
      gameId: serverState.gameId,
      players: clientPlayers,
      currentPlayerIndex: serverState.currentPlayerIndex,
      gamePhase: serverState.gamePhase,
      turnPhase: serverState.turnPhase,
      actionsRemaining: serverState.actionsRemaining,
      turnNumber: serverState.turnNumber,
      grid: clientGrid,
      gameSettings: settings,
      metadata: {},
      isOffline: true,
      lastSyncTimestamp: Date.now()
    };
  }

  /**
   * Process a player action using the shared engine
   */
  processAction(action: ClientPlayerAction): {
    isValid: boolean;
    newState?: ClientGameState;
    errorMessage?: string;
  } {
    if (!this.coreEngine) {
      return { isValid: false, errorMessage: 'Game engine not initialized' };
    }

    try {
      // Convert client action to server format
      const serverAction: ServerPlayerAction = {
        type: action.type,
        playerId: action.playerId,
        payload: action.payload
      };

      // Process action through the shared engine
      const result = this.coreEngine.processAction(serverAction);

      if (result.isValid && result.newState) {
        // Convert server state back to client format
        const newClientState = this.convertServerStateToClient(result.newState, this.gameState!.gameSettings);
        this.gameState = newClientState;
        return { isValid: true, newState: newClientState };
      } else {
        return { isValid: false, errorMessage: result.errorMessage };
      }
    } catch (error) {
      console.error('❌ [ClientGameEngine] Error processing action:', error);
      return { isValid: false, errorMessage: 'Action processing failed' };
    }
  }

  /**
   * Get current game state
   */
  getGameState(): ClientGameState | null {
    return this.gameState;
  }

  /**
   * Get current player
   */
  getCurrentPlayer(): ClientPlayer | null {
    if (!this.gameState) return null;
    return this.gameState.players[this.gameState.currentPlayerIndex];
  }

  /**
   * Get valid positions for placing a card
   */
  getValidPositions(cardId: number, playerId: string): { x: number; y: number }[] {
    if (!this.gameState) {
      console.log('❌ No game state available for valid positions');
      return [];
    }

    console.log(`🔍 Getting valid positions for card ${cardId}, player ${playerId}`);
    console.log(`🔍 Grid size: ${this.gameState.gameSettings.gridWidth}x${this.gameState.gameSettings.gridHeight}`);
    console.log(`🔍 Current grid contents:`, Array.from(this.gameState.grid.entries()));

    const validPositions: { x: number; y: number }[] = [];
    const { gridWidth, gridHeight } = this.gameState.gameSettings;

    // Check all positions on the grid
    for (let x = 0; x < gridWidth; x++) {
      for (let y = 0; y < gridHeight; y++) {
        const position = { x, y };
        const positionKey = `${x},${y}`;

        // Position must be empty
        if (this.gameState.grid.has(positionKey)) {
          console.log(`🔍 Position ${positionKey} is occupied`);
          continue;
        }

        // Must be adjacent to a HOME card or existing card owned by the player
        if (this.isAdjacentToPlayerCard(position, playerId)) {
          console.log(`✅ Position ${positionKey} is valid (adjacent to player card)`);
          validPositions.push(position);
        } else {
          console.log(`❌ Position ${positionKey} is not adjacent to player card`);
        }
      }
    }

    console.log(`🎯 Found ${validPositions.length} valid positions:`, validPositions);
    return validPositions;
  }

  /**
   * Check if position is adjacent to a player's card (including HOME)
   */
  private isAdjacentToPlayerCard(position: { x: number; y: number }, playerId: string): boolean {
    if (!this.gameState) return false;

    const directions = [
      { x: 0, y: 1 },   // North
      { x: 1, y: 0 },   // East
      { x: 0, y: -1 },  // South
      { x: -1, y: 0 }   // West
    ];

    for (const dir of directions) {
      const adjX = position.x + dir.x;
      const adjY = position.y + dir.y;
      const adjKey = `${adjX},${adjY}`;

      const adjacentCard = this.gameState.grid.get(adjKey);
      if (adjacentCard) {
        console.log(`🔍 Adjacent card at ${adjKey}:`, adjacentCard);
        // Allow placement adjacent to HOME cards (which belong to all players)
        // or cards owned by the current player
        if (adjacentCard.isHOME || adjacentCard.ownerId === playerId) {
          console.log(`✅ Valid adjacency: HOME=${adjacentCard.isHOME}, owner=${adjacentCard.ownerId}, player=${playerId}`);
          return true;
        } else {
          console.log(`❌ Invalid adjacency: owner=${adjacentCard.ownerId}, player=${playerId}`);
        }
      }
    }

    return false;
  }

  /**
   * Save game state to local storage
   */
  saveToLocalStorage(): void {
    if (!this.gameState) return;

    try {
      const serializedState = JSON.stringify({
        ...this.gameState,
        grid: Array.from(this.gameState.grid.entries())
      });
      localStorage.setItem(`biomasters-game-${this.gameState.gameId}`, serializedState);
      console.log('💾 Game saved to local storage');
    } catch (error) {
      console.error('❌ Failed to save game to local storage:', error);
    }
  }

  /**
   * Load game state from local storage
   */
  loadFromLocalStorage(gameId: string): boolean {
    try {
      const serializedState = localStorage.getItem(`biomasters-game-${gameId}`);
      if (!serializedState) return false;

      const parsedState = JSON.parse(serializedState);
      parsedState.grid = new Map(parsedState.grid);
      this.gameState = parsedState;

      console.log('📂 Game loaded from local storage');
      return true;
    } catch (error) {
      console.error('❌ Failed to load game from local storage:', error);
      return false;
    }
  }

  /**
   * Get available actions for current player
   */
  getAvailableActions(): string[] {
    if (!this.gameState) return [];

    const actions: string[] = [];
    const currentPlayer = this.getCurrentPlayer();

    if (!currentPlayer) return actions;

    // Can always pass turn
    actions.push('pass_turn');

    // Can play cards if have actions remaining and cards in hand
    if (this.gameState.actionsRemaining > 0 && currentPlayer.hand.length > 0) {
      actions.push('play_card');
    }

    // Can activate abilities if have cards on board
    const playerCards = Array.from(this.gameState.grid.values())
      .filter(card => card.ownerId === currentPlayer.id && !card.isExhausted);

    if (playerCards.length > 0) {
      actions.push('activate_ability');
    }

    return actions;
  }
}
