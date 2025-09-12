/**
 * Unified Game Engine Interface
 * Single interface for both TCG and Phylo game modes
 * Provides consistent API across all game types
 */

import { GameActionType } from '../enums';
import { GameState, Position } from '../types';
import { ILocalizationManager } from '../localization-manager';

// ============================================================================
// UNIFIED GAME ENGINE INTERFACE
// ============================================================================

/**
 * Game mode enumeration
 */
export enum GameMode {
  TCG = 'TCG',
  PHYLO = 'Phylo'
}

/**
 * Unified game settings interface
 */
export interface UnifiedGameSettings {
  // Common settings
  maxPlayers: number;
  gridWidth: number;
  gridHeight: number;
  turnTimeLimit?: number;
  
  // TCG-specific settings
  startingHandSize?: number;
  maxHandSize?: number;
  startingEnergy?: number;
  
  // Phylo-specific settings
  maxTurns?: number;
  gameTimeLimit?: number;
  enableAI?: boolean;
  aiDifficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Unified action interface
 */
export interface UnifiedGameAction {
  type: GameActionType;
  playerId: string;
  payload: {
    cardId?: string;
    position?: Position;
    targetPosition?: Position;
    challengeData?: any;
    [key: string]: any;
  };
}

/**
 * Unified action result interface
 */
export interface UnifiedActionResult {
  isValid: boolean;
  newState?: GameState;
  errorMessage?: string;
  metadata?: {
    gameEnded?: boolean;
    nextPlayer?: string;
    winCondition?: any;
    triggeredEffects?: any[];
  };
}

/**
 * Game engine initialization data
 */
export interface GameEngineData {
  cardDatabase: Map<number, any>;
  abilityDatabase: Map<number, any>;
  keywordDatabase: Map<number, string>;
  localizationManager: ILocalizationManager;
}

/**
 * Core game engine interface
 * All game engines must implement this interface
 */
export interface IGameEngine {
  // Engine identification
  readonly mode: GameMode;
  readonly isInitialized: boolean;
  
  // Core game operations
  initializeNewGame(
    gameId: string,
    players: { id: string; name: string }[],
    settings: UnifiedGameSettings
  ): GameState;
  
  processAction(action: UnifiedGameAction): UnifiedActionResult;
  
  // State management
  getGameState(): GameState | null;
  loadState(state: GameState): void;
  
  // Data access
  getCardData(cardId: number): any;
  getAbilityData(abilityId: number): any;
  
  // Localization
  getCardName(cardData: any): string;
  getScientificName(cardData: any): string;
  getCardDescription(cardData: any): string;
  
  // Validation
  validateAction(action: UnifiedGameAction): boolean;
  getValidMoves(playerId: string, cardId?: string): Position[];
  
  // Game state queries
  getCurrentPlayer(): any;
  isGameEnded(): boolean;
  getWinCondition(): any;

  // Enhanced game state methods (optional - for engines that support them)
  getPlayerStats?(playerId: string): any;
  getGameProgress?(): any;
  canPlayerMakeMove?(playerId: string): boolean;
  getAvailableActions?(playerId: string): string[];
  getEndGameData?(): any;
}

/**
 * Engine factory interface
 */
export interface IGameEngineFactory {
  createEngine(mode: GameMode, data: GameEngineData): IGameEngine;
  getSupportedModes(): GameMode[];
}
