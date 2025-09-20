/**
 * AI Strategy Factory - Creates AI strategies based on difficulty
 */

import { AIDifficulty, AIStrategy } from './AIStrategy';
import { EasyAIStrategy } from './strategies/EasyAIStrategy';
import { MediumAIStrategy } from './strategies/MediumAIStrategy';
import { HardAIStrategy } from './strategies/HardAIStrategy';

/**
 * Factory class for creating AI strategies
 */
export class AIStrategyFactory {
  /**
   * Create an AI strategy based on difficulty level
   */
  static createStrategy(difficulty: AIDifficulty): AIStrategy {
    console.log(`🏭 AIStrategyFactory: Creating ${difficulty} AI strategy`);
    
    switch (difficulty) {
      case AIDifficulty.EASY:
        return new EasyAIStrategy();
        
      case AIDifficulty.MEDIUM:
        return new MediumAIStrategy();
        
      case AIDifficulty.HARD:
        return new HardAIStrategy();
        
      default:
        console.warn(`⚠️ Unknown AI difficulty: ${difficulty}, defaulting to EASY`);
        return new EasyAIStrategy();
    }
  }

  /**
   * Get all available difficulty levels
   */
  static getAvailableDifficulties(): AIDifficulty[] {
    return Object.values(AIDifficulty);
  }

  /**
   * Validate if a difficulty level is supported
   */
  static isValidDifficulty(difficulty: string): difficulty is AIDifficulty {
    return Object.values(AIDifficulty).includes(difficulty as AIDifficulty);
  }

  /**
   * Get difficulty display name for UI
   */
  static getDifficultyDisplayName(difficulty: AIDifficulty): string {
    switch (difficulty) {
      case AIDifficulty.EASY:
        return 'Easy';
      case AIDifficulty.MEDIUM:
        return 'Medium';
      case AIDifficulty.HARD:
        return 'Hard';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get difficulty description for UI
   */
  static getDifficultyDescription(difficulty: AIDifficulty): string {
    switch (difficulty) {
      case AIDifficulty.EASY:
        return 'Random moves, quick decisions';
      case AIDifficulty.MEDIUM:
        return 'Strategic thinking, moderate pace';
      case AIDifficulty.HARD:
        return 'Advanced strategy, careful planning';
      default:
        return 'Unknown difficulty level';
    }
  }
}
