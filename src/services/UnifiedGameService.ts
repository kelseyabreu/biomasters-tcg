/**
 * Unified Game Service
 * Single service layer for both TCG and Phylo game modes
 * Replaces TCGGameService and PhyloGameService with unified interface
 */

import {
  IGameEngine,
  GameMode,
  UnifiedGameSettings,
  UnifiedGameAction,
  UnifiedActionResult,
  GameEngineData
} from '@shared/game-engine/IGameEngine';
import { gameEngineFactory } from '@shared/game-engine/GameEngineFactory';
import { GameState } from '@shared/types';
import { LoadResult } from '@shared/data/IServerDataLoader';
import { gameApi } from './apiClient';
import { sharedDataLoader } from '@shared/data/UnifiedDataLoader';

// ============================================================================
// UNIFIED SERVICE INTERFACES
// ============================================================================

/**
 * Service result interface - standardized across all operations
 */
export interface ServiceResult<T = any> {
  isValid: boolean;
  newState?: T;
  errorMessage?: string;
  metadata?: {
    gameEnded?: boolean;
    nextPlayer?: string;
    winCondition?: any;
  };
}

/**
 * Game creation payload
 */
export interface CreateGamePayload {
  gameId: string;
  players: { id: string; name: string }[];
  mode: GameMode;
  settings?: Partial<UnifiedGameSettings>;
  isOnline?: boolean;
}

/**
 * Action execution payload
 */
export interface ExecuteActionPayload {
  action: UnifiedGameAction;
  currentState: any;
  isOnline?: boolean;
}

// ============================================================================
// UNIFIED GAME SERVICE
// ============================================================================

/**
 * Unified Game Service
 * Handles both TCG and Phylo game modes with consistent interface
 */
export class UnifiedGameService {
  private engines = new Map<string, IGameEngine>();
  private gameData: GameEngineData | null = null;

  constructor() {
    this.initializeGameData();
  }

  /**
   * Initialize game data for engine creation
   */
  private async initializeGameData(): Promise<void> {
    try {
      console.log('🔄 UnifiedGameService: Loading game data...');

      // Load game data using unified data loader interface
      const [cardsResult, abilitiesResult, localizationManager] = await Promise.all([
        sharedDataLoader.loadCards(),
        sharedDataLoader.loadAbilities(),
        sharedDataLoader.createLocalizationManager()
      ]);

      if (!cardsResult.success || !abilitiesResult.success) {
        throw new Error('Failed to load game data');
      }

      // Convert arrays to Maps as expected by GameEngineData interface
      const cardDatabase = new Map();
      if (cardsResult.data) {
        cardsResult.data.forEach((card: any) => {
          cardDatabase.set(card.cardId || card.id, card);
        });
      }

      const abilityDatabase = new Map();
      if (abilitiesResult.data) {
        abilitiesResult.data.forEach((ability: any) => {
          abilityDatabase.set(ability.abilityId || ability.id, ability);
        });
      }

      // Load keywords using the unified data loader interface
      const keywordDatabase = new Map<number, string>();
      try {
        console.log('🔄 UnifiedGameService: Loading keywords...');
        const keywordsResult = await sharedDataLoader.loadKeywords();
        console.log('📡 UnifiedGameService: Keywords result:', keywordsResult);

        if (keywordsResult.success && keywordsResult.data) {
          keywordsResult.data.forEach((keyword: { id: number; name: string }) => {
            keywordDatabase.set(keyword.id, keyword.name);
          });
          console.log('✅ UnifiedGameService: Keywords loaded successfully:', keywordDatabase.size);
          console.log('🔍 UnifiedGameService: Sample keywords:', Array.from(keywordDatabase.entries()).slice(0, 3));
        } else {
          console.error('❌ UnifiedGameService: Failed to load keywords:', keywordsResult.error);
          throw new Error(`Failed to load keywords: ${keywordsResult.error}`);
        }
      } catch (keywordError) {
        console.error('❌ UnifiedGameService: Exception loading keywords:', keywordError);
        throw new Error(`Keywords loading failed: ${keywordError}`);
      }

      console.log('📊 UnifiedGameService: Game data loaded:', {
        cards: cardDatabase.size,
        abilities: abilityDatabase.size,
        keywords: keywordDatabase.size
      });

      // Validate that we have the required data
      if (cardDatabase.size === 0) {
        throw new Error('No cards loaded - card database is empty');
      }

      if (abilityDatabase.size === 0) {
        throw new Error('No abilities loaded - ability database is empty');
      }

      if (keywordDatabase.size === 0) {
        throw new Error('No keywords loaded - keyword database is empty and required for engine');
      }

      this.gameData = {
        cardDatabase,
        abilityDatabase,
        keywordDatabase,
        localizationManager: localizationManager
      };

      console.log('✅ UnifiedGameService: Game data initialized successfully');
    } catch (error) {
      console.error('❌ UnifiedGameService: Failed to initialize game data:', error);
      throw error;
    }
  }

  /**
   * Create a new game (supports both online and offline)
   */
  async createGame(payload: CreateGamePayload): Promise<ServiceResult<GameState>> {
    console.log(`🎮 UnifiedGameService: Creating ${payload.mode} game:`, payload.gameId);

    try {
      // Ensure game data is loaded
      if (!this.gameData) {
        await this.initializeGameData();
      }

      const { gameId, players, mode, settings = {}, isOnline = false } = payload;

      if (isOnline) {
        // Online mode - delegate to server API
        return this.createOnlineGame(payload);
      } else {
        // Offline mode - use local engine
        return this.createOfflineGame(payload);
      }

    } catch (error: any) {
      console.error(`❌ UnifiedGameService: Failed to create ${payload.mode} game:`, error);
      return {
        isValid: false,
        errorMessage: error.message || 'Failed to create game'
      };
    }
  }

  /**
   * Execute a game action (supports both online and offline)
   */
  async executeAction(payload: ExecuteActionPayload): Promise<ServiceResult<GameState>> {
    console.log(`🎯 UnifiedGameService: Executing action:`, payload.action.type);

    try {
      const { action, currentState, isOnline = false } = payload;

      if (isOnline) {
        // Online mode - delegate to server API
        return this.executeOnlineAction(payload);
      } else {
        // Offline mode - use local engine
        return this.executeOfflineAction(payload);
      }

    } catch (error: any) {
      console.error(`❌ UnifiedGameService: Failed to execute action:`, error);
      return {
        isValid: false,
        errorMessage: error.message || 'Failed to execute action'
      };
    }
  }

  /**
   * Get valid moves for a player/card
   */
  async getValidMoves(
    gameId: string,
    playerId: string,
    cardId?: string
  ): Promise<ServiceResult<{ positions: any[] }>> {
    console.log(`🎯 UnifiedGameService: Getting valid moves for gameId: ${gameId}, playerId: ${playerId}, cardId: ${cardId}`);

    try {
      const engine = this.engines.get(gameId);
      if (!engine) {
        console.error(`❌ UnifiedGameService: Game engine not found for gameId: ${gameId}`);
        console.log(`🔍 Available engines:`, Array.from(this.engines.keys()));
        return {
          isValid: false,
          errorMessage: 'Game engine not found'
        };
      }

      console.log(`✅ UnifiedGameService: Found engine for gameId: ${gameId}`);
      const positions = engine.getValidMoves(playerId, cardId);
      console.log(`🎯 UnifiedGameService: Engine returned ${positions.length} valid positions:`, positions);

      return {
        isValid: true,
        newState: { positions }
      };

    } catch (error: any) {
      console.error(`❌ UnifiedGameService: Failed to get valid moves:`, error);
      return {
        isValid: false,
        errorMessage: error.message || 'Failed to get valid moves'
      };
    }
  }

  /**
   * Create offline game using local engine
   */
  private async createOfflineGame(payload: CreateGamePayload): Promise<ServiceResult<GameState>> {
    const { gameId, players, mode, settings } = payload;

    // Create engine for this game
    const engine = gameEngineFactory.createEngine(mode, this.gameData!);
    
    // Convert settings to unified format
    const unifiedSettings: UnifiedGameSettings = {
      maxPlayers: players.length,
      gridWidth: 9,
      gridHeight: 10,
      turnTimeLimit: 300,
      ...settings
    };

    // Initialize the game
    const gameState = engine.initializeNewGame(gameId, players, unifiedSettings);
    
    // Cache the engine
    this.engines.set(gameId, engine);

    console.log(`✅ UnifiedGameService: ${mode} game created offline:`, gameId);
    return {
      isValid: true,
      newState: gameState
    };
  }

  /**
   * Execute offline action using local engine
   */
  private async executeOfflineAction(payload: ExecuteActionPayload): Promise<ServiceResult<GameState>> {
    const { action, currentState } = payload;
    
    // Get the appropriate game state based on mode
    const gameState = currentState.tcgGameState || currentState.phyloGameState;
    if (!gameState) {
      return {
        isValid: false,
        errorMessage: 'No active game state available'
      };
    }

    // Get or create engine for this game
    let engine = this.engines.get(gameState.gameId);
    if (!engine) {
      // Determine mode from state and create engine
      const mode = currentState.tcgGameState ? GameMode.TCG : GameMode.PHYLO;
      engine = gameEngineFactory.createEngine(mode, this.gameData!);
      engine.loadState(gameState);
      this.engines.set(gameState.gameId, engine);
    }

    // Execute the action
    const result = engine.processAction(action);
    
    return {
      isValid: result.isValid,
      newState: result.newState,
      errorMessage: result.errorMessage,
      metadata: result.metadata
    };
  }

  /**
   * Create online game via server API
   */
  private async createOnlineGame(payload: CreateGamePayload): Promise<ServiceResult<GameState>> {
    try {
      const response = await gameApi.createGame({
        gameId: payload.gameId,
        players: payload.players,
        settings: payload.settings
      });

      if (response.data.success) {
        return {
          isValid: true,
          newState: response.data.data
        };
      } else {
        // Fallback to offline if online fails
        console.warn('Online game creation failed, falling back to offline');
        return this.createOfflineGame({ ...payload, isOnline: false });
      }
    } catch (error: any) {
      // Fallback to offline if online fails
      console.warn('Online game creation failed, falling back to offline:', error);
      return this.createOfflineGame({ ...payload, isOnline: false });
    }
  }

  /**
   * Execute online action via server API
   */
  private async executeOnlineAction(payload: ExecuteActionPayload): Promise<ServiceResult<GameState>> {
    try {
      // This would call the appropriate API endpoint based on action type
      // For now, fallback to offline execution
      console.warn('Online action execution not yet implemented, falling back to offline');
      return this.executeOfflineAction(payload);
    } catch (error: any) {
      // Fallback to offline if online fails
      console.warn('Online action execution failed, falling back to offline:', error);
      return this.executeOfflineAction(payload);
    }
  }

  /**
   * Get engine instance for a specific game
   */
  getEngine(gameId: string): IGameEngine | undefined {
    const engine = this.engines.get(gameId);
    console.log(`🔍 UnifiedGameService: Getting engine for game ${gameId}:`, !!engine, engine?.mode);
    if (engine) {
      console.log(`🔍 UnifiedGameService: Engine methods available:`, {
        getGameProgress: typeof engine.getGameProgress === 'function',
        getPlayerStats: typeof (engine as any).getPlayerStats === 'function'
      });
    }
    return engine;
  }

  /**
   * Clean up engine resources
   */
  cleanup(gameId?: string): void {
    if (gameId) {
      this.engines.delete(gameId);
      console.log(`🧹 UnifiedGameService: Cleaned up engine for game: ${gameId}`);
    } else {
      this.engines.clear();
      console.log(`🧹 UnifiedGameService: Cleaned up all engines`);
    }
  }
}

// Export singleton instance
export const unifiedGameService = new UnifiedGameService();
