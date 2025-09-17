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
    // Online multiplayer metadata
    matchFound?: boolean;
    matchCancelled?: boolean;
    ratingEnabled?: boolean;
    ratingUpdated?: boolean;
    initialRatings?: { [playerId: string]: number };
    leaderboardSize?: number;
    // Game completion tracking
    gameTracked?: boolean;
    questsUpdated?: boolean;
    isWin?: boolean;
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
// ONLINE MULTIPLAYER INTERFACES
// ============================================================================

/**
 * Online game settings - extends UnifiedGameSettings
 */
export interface OnlineGameSettings extends UnifiedGameSettings {
  gameMode: 'ranked_1v1' | 'casual_1v1' | 'team_2v2' | 'ffa_4p';
  ratingEnabled: boolean;
  tournamentId?: string;
}

/**
 * Matchmaking action interface - separate from game actions
 */
export interface MatchmakingAction {
  type: 'FIND_MATCH' | 'CANCEL_MATCHMAKING' | 'ACCEPT_MATCH';
  playerId: string;
  payload: {
    gameMode: string;
    preferences?: any;
  };
}

/**
 * Match result interface
 */
export interface MatchResult {
  sessionId?: string;
  players?: { id: string; name: string; rating: number }[];
  estimatedWaitTime?: number;
  matchFound?: boolean;
}

/**
 * Rating update interface
 */
export interface RatingUpdate {
  userId: string;
  oldRating: number;
  newRating: number;
  ratingChange: number;
  gameMode: string;
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
        return this.createOnlineGame({ ...payload, isRanked: false });
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
      metadata: result.metadata,
      // Pass through any additional properties like drawnCards
      ...(result as any).drawnCards && { drawnCards: (result as any).drawnCards }
    };
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

  // ============================================================================
  // ONLINE MULTIPLAYER METHODS
  // ============================================================================

  /**
   * Find online match - integrates with existing service pattern
   */
  async findMatch(gameMode: string, preferences?: any): Promise<ServiceResult<MatchResult>> {
    try {
      console.log(`🔍 UnifiedGameService: Finding match for mode: ${gameMode}`);

      // Use new gameApi matchmaking endpoint
      const response = await gameApi.findMatch({
        gameMode,
        preferences
      });

      return {
        isValid: true,
        newState: response.data.data,
        metadata: { matchFound: !!response.data.data?.sessionId }
      };
    } catch (error: any) {
      console.error('❌ UnifiedGameService: Matchmaking failed:', error);
      return {
        isValid: false,
        errorMessage: error.message || 'Matchmaking failed'
      };
    }
  }

  /**
   * Cancel matchmaking
   */
  async cancelMatchmaking(): Promise<ServiceResult> {
    try {
      console.log('🚫 UnifiedGameService: Cancelling matchmaking');

      await gameApi.cancelMatchmaking();

      return {
        isValid: true,
        metadata: { matchCancelled: true }
      };
    } catch (error: any) {
      console.error('❌ UnifiedGameService: Cancel matchmaking failed:', error);
      return {
        isValid: false,
        errorMessage: error.message || 'Failed to cancel matchmaking'
      };
    }
  }

  /**
   * Create online game - extends existing createGame method
   */
  async createOnlineGame(payload: CreateGamePayload & { isRanked: boolean }): Promise<ServiceResult> {
    try {
      console.log(`🌐 UnifiedGameService: Creating online game:`, payload);

      // Leverage existing game creation logic
      const result = await this.createGame(payload);

      if (result.isValid && payload.isRanked) {
        // Add rating tracking
        result.metadata = {
          ...result.metadata,
          ratingEnabled: true,
          initialRatings: await this.getPlayerRatings(payload.players)
        };
      }

      return result;
    } catch (error: any) {
      console.error('❌ UnifiedGameService: Online game creation failed:', error);
      return {
        isValid: false,
        errorMessage: error.message || 'Failed to create online game'
      };
    }
  }

  /**
   * Get player ratings for matchmaking
   */
  async getPlayerRatings(players: { id: string; name: string }[]): Promise<{ [playerId: string]: number }> {
    try {
      const playerIds = players.map(p => p.id);
      const response = await gameApi.getPlayerRatings({ playerIds });
      return response.data.data || {};
    } catch (error) {
      console.warn('⚠️ UnifiedGameService: Failed to get player ratings:', error);
      // Return default ratings
      const defaultRatings: { [playerId: string]: number } = {};
      players.forEach(player => {
        defaultRatings[player.id] = 1000; // Default rating
      });
      return defaultRatings;
    }
  }

  /**
   * Update player rating after match
   */
  async updatePlayerRating(ratingUpdate: RatingUpdate): Promise<ServiceResult> {
    try {
      console.log(`📈 UnifiedGameService: Updating rating:`, ratingUpdate);

      const response = await gameApi.updatePlayerRating(ratingUpdate);

      return {
        isValid: true,
        newState: response.data.data,
        metadata: { ratingUpdated: true }
      };
    } catch (error: any) {
      console.error('❌ UnifiedGameService: Rating update failed:', error);
      return {
        isValid: false,
        errorMessage: error.message || 'Failed to update rating'
      };
    }
  }

  /**
   * Get leaderboard data
   */
  async getLeaderboard(gameMode: string, limit: number = 100): Promise<ServiceResult> {
    try {
      console.log(`🏆 UnifiedGameService: Getting leaderboard for ${gameMode}`);

      const response = await gameApi.getLeaderboard(gameMode, limit);

      return {
        isValid: true,
        newState: response.data.data,
        metadata: { leaderboardSize: response.data.data?.length || 0 }
      };
    } catch (error: any) {
      console.error('❌ UnifiedGameService: Leaderboard fetch failed:', error);
      return {
        isValid: false,
        errorMessage: error.message || 'Failed to get leaderboard'
      };
    }
  }

  /**
   * Track game completion for quest and achievement progress
   */
  async trackGameCompletion(gameResult: { winner: string | null; gameMode: string; playerId: string }): Promise<ServiceResult> {
    try {
      console.log(`🎯 UnifiedGameService: Tracking game completion:`, gameResult);

      // Update "play_games" quest progress
      const questUpdate = await gameApi.updateQuestProgress({
        questType: 'play_games',
        progress: { count: 1, gameMode: gameResult.gameMode }
      });

      // If player won, update win-related quests
      if (gameResult.winner === gameResult.playerId) {
        await gameApi.updateQuestProgress({
          questType: 'win_matches',
          progress: { count: 1, gameMode: gameResult.gameMode }
        });

        // Update ranked-specific quest if it's a ranked game
        if (gameResult.gameMode.includes('ranked')) {
          await gameApi.updateQuestProgress({
            questType: 'play_ranked',
            progress: { count: 1 }
          });
        }
      }

      // Track different game modes for variety quest
      await gameApi.updateQuestProgress({
        questType: 'play_different_modes',
        progress: { modes_played: [gameResult.gameMode] }
      });

      return {
        isValid: true,
        newState: questUpdate.data.data,
        metadata: {
          gameTracked: true,
          questsUpdated: true,
          isWin: gameResult.winner === gameResult.playerId
        }
      };
    } catch (error: any) {
      console.error('❌ UnifiedGameService: Game completion tracking failed:', error);
      return {
        isValid: false,
        errorMessage: error.message || 'Failed to track game completion'
      };
    }
  }
}

// Export singleton instance
export const unifiedGameService = new UnifiedGameService();
