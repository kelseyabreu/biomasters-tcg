import { Player, WinCondition, WinConditionProgress, TrophicRole } from '../types';

/**
 * Checks Apex Predator win condition
 * Win by eliminating 4 of opponent's cards from the game
 */
export function checkApexPredator(player: Player, opponent: Player): WinConditionProgress {
  // Count eliminated cards (cards that were destroyed and removed from field)
  const initialDeckSize = 8; // Standard deck size
  const opponentRemainingCards = opponent.field.length + opponent.hand.length;
  const eliminatedCards = initialDeckSize - opponentRemainingCards;
  
  return {
    condition: WinCondition.APEX_PREDATOR,
    playerId: player.id,
    progress: eliminatedCards,
    target: 4,
    achieved: eliminatedCards >= 4
  };
}

/**
 * Checks Ecosystem Balance win condition
 * Have at least one Producer, one Herbivore, and one Carnivore on field simultaneously
 */
export function checkEcosystemBalance(player: Player): WinConditionProgress {
  const fieldRoles = new Set(player.field.map(card => card.trophicRole));
  
  const hasProducer = fieldRoles.has(TrophicRole.PRODUCER);
  const hasHerbivore = fieldRoles.has(TrophicRole.HERBIVORE);
  const hasCarnivore = fieldRoles.has(TrophicRole.CARNIVORE);
  
  const progress = [hasProducer, hasHerbivore, hasCarnivore].filter(Boolean).length;
  
  return {
    condition: WinCondition.ECOSYSTEM_BALANCE,
    playerId: player.id,
    progress,
    target: 3,
    achieved: hasProducer && hasHerbivore && hasCarnivore
  };
}

/**
 * Checks Conservation Victory win condition
 * End turn with 6 or more unique species cards in play
 */
export function checkConservationVictory(player: Player): WinConditionProgress {
  const uniqueSpecies = new Set(player.field.map(card => card.nameId));
  const progress = uniqueSpecies.size;
  
  return {
    condition: WinCondition.CONSERVATION_VICTORY,
    playerId: player.id,
    progress,
    target: 6,
    achieved: progress >= 6
  };
}

/**
 * Checks Species Collection win condition
 * Play at least 12 unique species cards from deck over the course of the game
 */
export function checkSpeciesCollection(player: Player): WinConditionProgress {
  const progress = player.playedSpecies.size;
  
  return {
    condition: WinCondition.SPECIES_COLLECTION,
    playerId: player.id,
    progress,
    target: 12,
    achieved: progress >= 12
  };
}

/**
 * Checks all win conditions for a player
 */
export function checkAllWinConditions(player: Player, opponent: Player): WinConditionProgress[] {
  return [
    checkApexPredator(player, opponent),
    checkEcosystemBalance(player),
    checkConservationVictory(player),
    checkSpeciesCollection(player)
  ];
}

/**
 * Determines if any player has won the game
 */
export function checkGameWinner(player1: Player, player2: Player): {
  winner: Player | null;
  winCondition: WinCondition | null;
  winConditionProgress: WinConditionProgress | null;
} {
  // Check player 1 win conditions
  const player1Conditions = checkAllWinConditions(player1, player2);
  const player1Win = player1Conditions.find(condition => condition.achieved);
  
  if (player1Win) {
    return {
      winner: player1,
      winCondition: player1Win.condition,
      winConditionProgress: player1Win
    };
  }
  
  // Check player 2 win conditions
  const player2Conditions = checkAllWinConditions(player2, player1);
  const player2Win = player2Conditions.find(condition => condition.achieved);
  
  if (player2Win) {
    return {
      winner: player2,
      winCondition: player2Win.condition,
      winConditionProgress: player2Win
    };
  }
  
  return {
    winner: null,
    winCondition: null,
    winConditionProgress: null
  };
}

/**
 * Gets win condition descriptions for UI display
 */
export function getWinConditionDescription(condition: WinCondition): string {
  switch (condition) {
    case WinCondition.APEX_PREDATOR:
      return 'Eliminate 4 of your opponent\'s cards from the game';
    case WinCondition.ECOSYSTEM_BALANCE:
      return 'Have at least one Producer, Herbivore, and Carnivore on your field simultaneously';
    case WinCondition.CONSERVATION_VICTORY:
      return 'End your turn with 6 or more unique species cards in play';
    case WinCondition.SPECIES_COLLECTION:
      return 'Play at least 12 unique species cards from your deck over the course of the game';
    default:
      return 'Unknown win condition';
  }
}

/**
 * Gets progress text for a win condition
 */
export function getWinConditionProgressText(progress: WinConditionProgress): string {
  const { condition, progress: current, target } = progress;
  
  switch (condition) {
    case WinCondition.APEX_PREDATOR:
      return `${current}/${target} opponent cards eliminated`;
    case WinCondition.ECOSYSTEM_BALANCE:
      return `${current}/${target} trophic roles on field`;
    case WinCondition.CONSERVATION_VICTORY:
      return `${current}/${target} unique species in play`;
    case WinCondition.SPECIES_COLLECTION:
      return `${current}/${target} unique species played`;
    default:
      return `${current}/${target}`;
  }
}

/**
 * Calculates win condition priority for AI decision making
 */
export function getWinConditionPriority(progress: WinConditionProgress): number {
  const { condition, progress: current, target, achieved } = progress;
  
  if (achieved) return 100;
  
  const progressRatio = current / target;
  
  // Base priorities by condition type
  let basePriority = 0;
  switch (condition) {
    case WinCondition.APEX_PREDATOR:
      basePriority = 30; // Aggressive strategy
      break;
    case WinCondition.ECOSYSTEM_BALANCE:
      basePriority = 40; // Balanced strategy
      break;
    case WinCondition.CONSERVATION_VICTORY:
      basePriority = 35; // Control strategy
      break;
    case WinCondition.SPECIES_COLLECTION:
      basePriority = 25; // Long-term strategy
      break;
  }
  
  // Scale by progress
  return basePriority * (0.5 + progressRatio * 0.5);
}

/**
 * Suggests actions to pursue a specific win condition
 */
export function suggestActionsForWinCondition(
  condition: WinCondition,
  player: Player,
  opponent: Player
): string[] {
  const suggestions: string[] = [];
  
  switch (condition) {
    case WinCondition.APEX_PREDATOR:
      suggestions.push('Focus on attacking opponent cards');
      suggestions.push('Play high-power carnivores');
      suggestions.push('Use combat abilities effectively');
      break;
      
    case WinCondition.ECOSYSTEM_BALANCE:
      const fieldRoles = new Set(player.field.map(card => card.trophicRole));
      if (!fieldRoles.has(TrophicRole.PRODUCER)) {
        suggestions.push('Play a Producer card');
      }
      if (!fieldRoles.has(TrophicRole.HERBIVORE)) {
        suggestions.push('Play a Herbivore card');
      }
      if (!fieldRoles.has(TrophicRole.CARNIVORE)) {
        suggestions.push('Play a Carnivore card');
      }
      break;
      
    case WinCondition.CONSERVATION_VICTORY:
      suggestions.push('Play diverse species cards');
      suggestions.push('Avoid playing duplicate species');
      suggestions.push('Protect your field from attacks');
      break;
      
    case WinCondition.SPECIES_COLLECTION:
      suggestions.push('Play as many different species as possible');
      suggestions.push('Draw more cards to access variety');
      suggestions.push('Focus on card quantity over field control');
      break;
  }
  
  return suggestions;
}
