/**
 * TCG Game Service
 * High-level orchestration service for TCG game mode
 * Handles online/offline switching and delegates to appropriate engines
 */

import { ClientGameEngine, ClientGameState } from './ClientGameEngine';
import { gameApi } from './apiClient';
import { GameActionType } from '@shared/enums';

// Service result interface - standardized across all game services
export interface ServiceResult<T = any> {
  isValid: boolean;
  newState?: T;
  errorMessage?: string;
}

// Action payload interfaces
export interface PlayCardPayload {
  cardId: string;
  position: { x: number; y: number };
  playerId: string;
}

export interface PassTurnPayload {
  playerId: string;
}

export interface StartGamePayload {
  gameId: string;
  players: { id: string; name: string }[];
  settings?: any;
}

/**
 * TCG Game Service
 * Stateless service that processes game actions using current state as input
 * All methods are pure functions that take state and return new state
 */
export class TCGGameService {
  // Remove instance state - engine will be created per operation or passed in

  /**
   * Get or create a client engine instance
   * This ensures we always have a fresh engine without persistent state
   */
  private getClientEngine(): ClientGameEngine {
    return new ClientGameEngine();
  }

  /**
   * Initialize a new TCG game
   */
  async startGame(
    payload: StartGamePayload,
    currentState: any
  ): Promise<ServiceResult> {
    try {
      const isOnline = currentState?.isOnline || false;

      if (isOnline) {
        // Online mode - call server API
        try {
          const response = await gameApi.createGame({
            gameId: payload.gameId,
            players: payload.players,
            settings: payload.settings
          });

          if (response.data.success) {
            return {
              isValid: true,
              newState: response.data.data // API response structure: { success, data, message }
            };
          } else {
            return {
              isValid: false,
              errorMessage: response.data.message || 'Failed to create online game'
            };
          }
        } catch (apiError: any) {
          // If online fails, fall back to offline mode
          console.warn('Online game creation failed, falling back to offline:', apiError);
          return this.startOfflineGame(payload);
        }
      } else {
        // Offline mode - use ClientGameEngine
        return this.startOfflineGame(payload);
      }
    } catch (error: any) {
      return {
        isValid: false,
        errorMessage: error.message || 'Failed to start game'
      };
    }
  }

  /**
   * Start an offline TCG game using ClientGameEngine
   */
  private async startOfflineGame(payload: StartGamePayload): Promise<ServiceResult> {
    try {
      // Create fresh client engine instance
      const clientEngine = this.getClientEngine();

      // Create the game
      const gameState = await clientEngine.createGame(
        payload.gameId,
        payload.players,
        payload.settings
      );

      // Mark all players as ready to start the game
      let currentState = gameState;
      for (const player of payload.players) {
        const readyResult = clientEngine.processAction({
          type: GameActionType.PLAYER_READY,
          playerId: player.id,
          payload: {}
        });

        if (readyResult.isValid && readyResult.newState) {
          currentState = readyResult.newState;
        } else {
          console.warn(`Failed to mark player ${player.id} as ready:`, readyResult.errorMessage);
        }
      }

      console.log('🎮 [TCGGameService] Game created and all players marked as ready');
      return {
        isValid: true,
        newState: currentState
      };
    } catch (error: any) {
      return {
        isValid: false,
        errorMessage: error.message || 'Failed to start offline game'
      };
    }
  }

  /**
   * Load game from saved state
   */
  async loadGame(
    savedState: ClientGameState,
    currentState: any
  ): Promise<ServiceResult> {
    try {
      console.log('📂 [TCGGameService] Loading game from saved state:', savedState.gameId);

      // Create fresh client engine instance
      const clientEngine = this.getClientEngine();

      // Load the saved state into the engine
      clientEngine.loadState(savedState);

      // Get the loaded state
      const gameState = clientEngine.getState();
      if (!gameState) {
        return {
          isValid: false,
          errorMessage: 'Failed to load game state'
        };
      }

      console.log('✅ [TCGGameService] Game loaded successfully');
      return {
        isValid: true,
        newState: gameState
      };

    } catch (error) {
      console.error('❌ [TCGGameService] Failed to load game:', error);
      return {
        isValid: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error loading game'
      };
    }
  }

  /**
   * Play a card action
   */
  async playCard(
    payload: PlayCardPayload,
    currentState: any
  ): Promise<ServiceResult> {
    try {
      const isOnline = currentState?.isOnline || false;

      if (isOnline) {
        // Online mode - call server API
        try {
          const response = await gameApi.playCard({
            gameId: currentState.tcgGameState?.gameId,
            playerId: payload.playerId,
            cardId: payload.cardId,
            position: payload.position
          });

          if (response.data.success) {
            return {
              isValid: true,
              newState: response.data.data
            };
          } else {
            return {
              isValid: false,
              errorMessage: response.data.message || 'Invalid move'
            };
          }
        } catch (apiError: any) {
          return {
            isValid: false,
            errorMessage: 'Network error: ' + (apiError.message || 'Failed to play card online')
          };
        }
      } else {
        // Offline mode - use ClientGameEngine
        // Note: For stateless operation, we need to pass the current state
        // The engine should be initialized with the current game state
        if (!currentState?.tcgGameState) {
          return {
            isValid: false,
            errorMessage: 'No active game state available'
          };
        }

        const clientEngine = this.getClientEngine();

        // ✅ CRITICAL STEP: Load the current state into the engine instance
        clientEngine.loadState(currentState.tcgGameState);

        // Process the action on the correctly configured engine
        const result = clientEngine.processAction({
          type: GameActionType.PLAY_CARD,
          playerId: payload.playerId,
          payload: {
            cardId: payload.cardId,
            position: payload.position
          }
        });

        return result;
      }
    } catch (error: any) {
      return {
        isValid: false,
        errorMessage: error.message || 'Failed to play card'
      };
    }
  }

  /**
   * Get valid positions for placing a card
   */
  getValidPositions(cardId: number, playerId: string, currentState?: any): { x: number; y: number }[] {
    // For stateless operation, we need the current game state
    if (!currentState?.tcgGameState) {
      console.warn('No game state available for getValidPositions');
      return [];
    }

    const clientEngine = this.getClientEngine();

    // ✅ Load the current state into the engine instance
    clientEngine.loadState(currentState.tcgGameState);

    // Now we can get valid positions from the correctly configured engine
    return clientEngine.getValidPositions(cardId, playerId);
  }

  /**
   * Pass turn action
   */
  async passTurn(
    payload: PassTurnPayload,
    currentState: any
  ): Promise<ServiceResult> {
    try {
      const isOnline = currentState?.isOnline || false;

      if (isOnline) {
        // Online mode - call server API
        try {
          const response = await gameApi.passTurn({
            gameId: currentState.tcgGameState?.gameId,
            playerId: payload.playerId
          });

          if (response.data.success) {
            return {
              isValid: true,
              newState: response.data.data
            };
          } else {
            return {
              isValid: false,
              errorMessage: response.data.message || 'Failed to pass turn'
            };
          }
        } catch (apiError: any) {
          return {
            isValid: false,
            errorMessage: 'Network error: ' + (apiError.message || 'Failed to pass turn online')
          };
        }
      } else {
        // Offline mode - use ClientGameEngine
        if (!currentState?.tcgGameState) {
          return {
            isValid: false,
            errorMessage: 'No active game state available'
          };
        }

        const clientEngine = this.getClientEngine();

        // ✅ CRITICAL STEP: Load the current state into the engine instance
        clientEngine.loadState(currentState.tcgGameState);

        // Process the action on the correctly configured engine
        const result = clientEngine.processAction({
          type: GameActionType.PASS_TURN,
          playerId: payload.playerId,
          payload: {}
        });

        return result;
      }
    } catch (error: any) {
      return {
        isValid: false,
        errorMessage: error.message || 'Failed to pass turn'
      };
    }
  }

  /**
   * Sync offline game to online
   */
  async syncAndGoOnline(
    payload: any,
    currentState: any
  ): Promise<ServiceResult> {
    try {
      // Check if there's an offline game to sync
      const offlineGameState = currentState?.tcgGameState;

      if (!offlineGameState) {
        // No offline game to sync, just go online
        return {
          isValid: true,
          newState: currentState
        };
      }

      // Attempt to sync the offline game to the server
      try {
        const response = await gameApi.syncOfflineGame({
          gameId: offlineGameState.gameId,
          gameState: offlineGameState,
          actionHistory: offlineGameState.actionHistory || []
        });

        if (response.data.success) {
          // Server accepted the sync, return the authoritative state
          return {
            isValid: true,
            newState: response.data.data
          };
        } else {
          // Server rejected the sync (e.g., game state conflict)
          return {
            isValid: false,
            errorMessage: response.data.message || 'Game state conflict - unable to sync'
          };
        }
      } catch (apiError: any) {
        // Network error during sync
        return {
          isValid: false,
          errorMessage: 'Network error during sync: ' + (apiError.message || 'Failed to connect to server')
        };
      }
    } catch (error: any) {
      return {
        isValid: false,
        errorMessage: error.message || 'Failed to sync game'
      };
    }
  }

  /**
   * Get game state from server (for online games)
   */
  async getGameState(gameId: string): Promise<ServiceResult> {
    try {
      const response = await gameApi.getGameState(gameId);

      if (response.data.success) {
        return {
          isValid: true,
          newState: response.data.data
        };
      } else {
        return {
          isValid: false,
          errorMessage: response.data.message || 'Failed to get game state'
        };
      }
    } catch (error: any) {
      return {
        isValid: false,
        errorMessage: error.message || 'Failed to get game state'
      };
    }
  }
}

// Export singleton instance
export const tcgGameService = new TCGGameService();
