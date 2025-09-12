/**
 * Game State Manager
 * Responsible for saving and loading active game state using the storageAdapter
 * Handles serialization/deserialization of Map objects for the game grid
 */

import { createStorageAdapter } from './storageAdapter';
import type { ClientGameState } from '../types/ClientGameTypes';

export interface SerializedGameState {
  gameId: string;
  players: any[];
  currentPlayerIndex: number;
  gamePhase: string;
  turnPhase: string;
  actionsRemaining: number;
  turnNumber: number;
  grid: [string, any][]; // Serialized Map as array of entries
  gameSettings: any;
  metadata: Record<string, any>;
  isOffline: boolean;
  lastSyncTimestamp?: number;
  savedAt: number; // Timestamp when state was saved
}

export interface GameStateMetadata {
  gameId: string;
  gameMode: 'TCG' | 'Phylo';
  savedAt: number;
  playerCount: number;
  turnNumber: number;
  gamePhase: string;
}

class GameStateManager {
  private storageAdapter = createStorageAdapter({
    keyPrefix: 'game_state_',
    debug: false
  });

  private readonly ACTIVE_GAME_KEY = 'active_game';
  private readonly GAME_METADATA_KEY = 'game_metadata';
  private readonly MAX_SAVED_GAMES = 5; // Keep last 5 games

  /**
   * Save the current active game state
   */
  async saveActiveGame(gameState: ClientGameState, gameMode: 'TCG' | 'Phylo'): Promise<void> {
    try {
      console.log('💾 [GameStateManager] Saving active game state:', gameState.gameId);

      // Serialize the game state (convert Map to array)
      const serializedState: SerializedGameState = {
        ...gameState,
        grid: Array.from(gameState.grid.entries()), // Convert Map to array
        savedAt: Date.now()
      };

      // Save the serialized state
      await this.storageAdapter.setItem(
        this.ACTIVE_GAME_KEY,
        JSON.stringify(serializedState)
      );

      // Update metadata
      const metadata: GameStateMetadata = {
        gameId: gameState.gameId,
        gameMode,
        savedAt: Date.now(),
        playerCount: gameState.players.length,
        turnNumber: gameState.turnNumber,
        gamePhase: gameState.gamePhase
      };

      await this.storageAdapter.setItem(
        this.GAME_METADATA_KEY,
        JSON.stringify(metadata)
      );

      console.log('✅ [GameStateManager] Active game state saved successfully');

    } catch (error) {
      console.error('❌ [GameStateManager] Failed to save active game state:', error);
      throw new Error('Failed to save game state');
    }
  }

  /**
   * Load the active game state
   */
  async loadActiveGame(): Promise<{ gameState: ClientGameState; gameMode: 'TCG' | 'Phylo' } | null> {
    try {
      console.log('📂 [GameStateManager] Loading active game state...');

      // Load serialized state
      const serializedData = await this.storageAdapter.getItem(this.ACTIVE_GAME_KEY);
      if (!serializedData) {
        console.log('📂 [GameStateManager] No active game state found');
        return null;
      }

      // Load metadata
      const metadataData = await this.storageAdapter.getItem(this.GAME_METADATA_KEY);
      if (!metadataData) {
        console.warn('⚠️ [GameStateManager] Game state found but no metadata');
        return null;
      }

      // Parse the data
      const serializedState: SerializedGameState = JSON.parse(serializedData);
      const metadata: GameStateMetadata = JSON.parse(metadataData);

      // Deserialize the game state (convert array back to Map)
      const gameState: ClientGameState = {
        ...serializedState,
        grid: new Map(serializedState.grid), // Convert array back to Map
        gamePhase: serializedState.gamePhase as any, // Type assertion for enum
        turnPhase: serializedState.turnPhase as any // Type assertion for enum
      };

      console.log('✅ [GameStateManager] Active game state loaded:', {
        gameId: gameState.gameId,
        gameMode: metadata.gameMode,
        savedAt: new Date(metadata.savedAt).toLocaleString(),
        turnNumber: gameState.turnNumber
      });

      return {
        gameState,
        gameMode: metadata.gameMode
      };

    } catch (error) {
      console.error('❌ [GameStateManager] Failed to load active game state:', error);
      return null;
    }
  }

  /**
   * Check if there's a saved active game
   */
  async hasActiveGame(): Promise<boolean> {
    try {
      const serializedData = await this.storageAdapter.getItem(this.ACTIVE_GAME_KEY);
      const metadataData = await this.storageAdapter.getItem(this.GAME_METADATA_KEY);
      return !!(serializedData && metadataData);
    } catch (error) {
      console.error('❌ [GameStateManager] Failed to check for active game:', error);
      return false;
    }
  }

  /**
   * Get metadata about the saved game without loading the full state
   */
  async getActiveGameMetadata(): Promise<GameStateMetadata | null> {
    try {
      const metadataData = await this.storageAdapter.getItem(this.GAME_METADATA_KEY);
      if (!metadataData) return null;

      return JSON.parse(metadataData);
    } catch (error) {
      console.error('❌ [GameStateManager] Failed to get game metadata:', error);
      return null;
    }
  }

  /**
   * Clear the active game state
   */
  async clearActiveGame(): Promise<void> {
    try {
      console.log('🗑️ [GameStateManager] Clearing active game state...');

      await Promise.all([
        this.storageAdapter.removeItem(this.ACTIVE_GAME_KEY),
        this.storageAdapter.removeItem(this.GAME_METADATA_KEY)
      ]);

      console.log('✅ [GameStateManager] Active game state cleared');
    } catch (error) {
      console.error('❌ [GameStateManager] Failed to clear active game state:', error);
      throw new Error('Failed to clear game state');
    }
  }

  /**
   * Archive the current game and save it with a unique key
   */
  async archiveCurrentGame(): Promise<void> {
    try {
      const activeGame = await this.loadActiveGame();
      if (!activeGame) return;

      const archiveKey = `archived_${activeGame.gameState.gameId}_${Date.now()}`;
      
      // Save to archive
      const serializedState: SerializedGameState = {
        ...activeGame.gameState,
        grid: Array.from(activeGame.gameState.grid.entries()),
        savedAt: Date.now()
      };

      await this.storageAdapter.setItem(archiveKey, JSON.stringify(serializedState));

      // Clean up old archives (keep only last MAX_SAVED_GAMES)
      await this.cleanupOldArchives();

      console.log('📦 [GameStateManager] Game archived:', archiveKey);
    } catch (error) {
      console.error('❌ [GameStateManager] Failed to archive game:', error);
    }
  }

  /**
   * Clean up old archived games
   */
  private async cleanupOldArchives(): Promise<void> {
    try {
      const allKeys = await this.storageAdapter.keys();
      const archiveKeys = allKeys
        .filter(key => key.startsWith('archived_'))
        .sort()
        .reverse(); // Most recent first

      // Remove old archives beyond the limit
      if (archiveKeys.length > this.MAX_SAVED_GAMES) {
        const keysToRemove = archiveKeys.slice(this.MAX_SAVED_GAMES);
        await Promise.all(
          keysToRemove.map(key => this.storageAdapter.removeItem(key))
        );
        console.log(`🗑️ [GameStateManager] Cleaned up ${keysToRemove.length} old archives`);
      }
    } catch (error) {
      console.error('❌ [GameStateManager] Failed to cleanup old archives:', error);
    }
  }

  /**
   * Validate game state integrity
   */
  validateGameState(gameState: ClientGameState): boolean {
    try {
      // Basic validation checks
      if (!gameState.gameId || !gameState.players || !gameState.grid) {
        return false;
      }

      if (gameState.players.length === 0) {
        return false;
      }

      if (!(gameState.grid instanceof Map)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ [GameStateManager] Game state validation failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const gameStateManager = new GameStateManager();
export default gameStateManager;
