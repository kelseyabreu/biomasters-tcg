/**
 * Game Engine Factory
 * Creates appropriate game engine instances based on mode
 * Provides centralized engine creation and management
 */

import { 
  IGameEngine, 
  IGameEngineFactory, 
  GameMode, 
  GameEngineData 
} from './IGameEngine';
import { TCGEngine } from './TCGEngine';
import { PhyloEngine } from './PhyloEngine';

/**
 * Concrete factory implementation for creating game engines
 */
export class GameEngineFactory implements IGameEngineFactory {
  private static instance: GameEngineFactory;
  private engineCache = new Map<string, IGameEngine>();

  private constructor() {}

  /**
   * Singleton pattern for factory instance
   */
  static getInstance(): GameEngineFactory {
    if (!GameEngineFactory.instance) {
      GameEngineFactory.instance = new GameEngineFactory();
    }
    return GameEngineFactory.instance;
  }

  /**
   * Create a new game engine instance
   */
  createEngine(mode: GameMode, data: GameEngineData): IGameEngine {
    console.log(`🏭 GameEngineFactory: Creating ${mode} engine`);

    // Validate input data
    this.validateEngineData(data);

    let engine: IGameEngine;

    switch (mode) {
      case GameMode.TCG:
        engine = new TCGEngine(data);
        break;
      
      case GameMode.PHYLO:
        engine = new PhyloEngine(data);
        break;
      
      default:
        throw new Error(`Unsupported game mode: ${mode}`);
    }

    console.log(`✅ GameEngineFactory: ${mode} engine created successfully`);
    return engine;
  }

  /**
   * Create and cache an engine instance
   */
  createCachedEngine(mode: GameMode, data: GameEngineData, cacheKey?: string): IGameEngine {
    const key = cacheKey || `${mode}_${Date.now()}`;
    
    if (this.engineCache.has(key)) {
      console.log(`♻️ GameEngineFactory: Returning cached ${mode} engine`);
      return this.engineCache.get(key)!;
    }

    const engine = this.createEngine(mode, data);
    this.engineCache.set(key, engine);
    
    console.log(`💾 GameEngineFactory: Cached ${mode} engine with key: ${key}`);
    return engine;
  }

  /**
   * Get supported game modes
   */
  getSupportedModes(): GameMode[] {
    return [GameMode.TCG, GameMode.PHYLO];
  }

  /**
   * Clear engine cache
   */
  clearCache(): void {
    this.engineCache.clear();
    console.log(`🧹 GameEngineFactory: Engine cache cleared`);
  }

  /**
   * Remove specific engine from cache
   */
  removeCachedEngine(cacheKey: string): boolean {
    const removed = this.engineCache.delete(cacheKey);
    if (removed) {
      console.log(`🗑️ GameEngineFactory: Removed cached engine: ${cacheKey}`);
    }
    return removed;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.engineCache.size,
      keys: Array.from(this.engineCache.keys())
    };
  }

  /**
   * Validate engine initialization data
   */
  private validateEngineData(data: GameEngineData): void {
    if (!data.cardDatabase || data.cardDatabase.size === 0) {
      throw new Error('Invalid engine data: cardDatabase is required and must not be empty');
    }

    if (!data.abilityDatabase || data.abilityDatabase.size === 0) {
      throw new Error('Invalid engine data: abilityDatabase is required and must not be empty');
    }

    if (!data.keywordDatabase || data.keywordDatabase.size === 0) {
      throw new Error('Invalid engine data: keywordDatabase is required and must not be empty');
    }

    if (!data.localizationManager) {
      throw new Error('Invalid engine data: localizationManager is required');
    }

    console.log(`✅ GameEngineFactory: Engine data validation passed`);
  }

  /**
   * Create engine with automatic mode detection based on settings
   */
  createEngineAuto(data: GameEngineData, settings: any): IGameEngine {
    // Auto-detect mode based on settings or other criteria
    let mode: GameMode;

    if (settings.enableAI || settings.maxTurns) {
      mode = GameMode.PHYLO;
    } else {
      mode = GameMode.TCG;
    }

    console.log(`🤖 GameEngineFactory: Auto-detected mode: ${mode}`);
    return this.createEngine(mode, data);
  }
}

/**
 * Convenience function to get the singleton factory instance
 */
export const gameEngineFactory = GameEngineFactory.getInstance();

/**
 * Convenience functions for common operations
 */
export function createTCGEngine(data: GameEngineData): IGameEngine {
  return gameEngineFactory.createEngine(GameMode.TCG, data);
}

export function createPhyloEngine(data: GameEngineData): IGameEngine {
  return gameEngineFactory.createEngine(GameMode.PHYLO, data);
}

export function createCachedTCGEngine(data: GameEngineData, cacheKey?: string): IGameEngine {
  return gameEngineFactory.createCachedEngine(GameMode.TCG, data, cacheKey);
}

export function createCachedPhyloEngine(data: GameEngineData, cacheKey?: string): IGameEngine {
  return gameEngineFactory.createCachedEngine(GameMode.PHYLO, data, cacheKey);
}
