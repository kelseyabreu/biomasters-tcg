import { Player, Card, GameState, TrophicRole, WinCondition } from '../types';
import { simulateCombat } from './combatSystem';
import { checkAllWinConditions, getWinConditionPriority } from './winConditions';

export interface AIDecision {
  type: 'play_card' | 'attack' | 'end_turn';
  cardId?: string;
  targetCardId?: string;
  reasoning: string;
}

/**
 * AI difficulty levels
 */
export enum AIDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

/**
 * AI strategy preferences
 */
interface AIStrategy {
  aggressionLevel: number; // 0-1, how likely to attack vs play defensively
  winConditionFocus: WinCondition | null; // Preferred win condition
  riskTolerance: number; // 0-1, willingness to take risky plays
  cardValueThreshold: number; // Minimum value to consider playing a card
}

/**
 * Gets AI strategy based on difficulty
 */
function getAIStrategy(difficulty: AIDifficulty): AIStrategy {
  switch (difficulty) {
    case AIDifficulty.EASY:
      return {
        aggressionLevel: 0.3,
        winConditionFocus: null,
        riskTolerance: 0.2,
        cardValueThreshold: 0.4
      };
    case AIDifficulty.MEDIUM:
      return {
        aggressionLevel: 0.6,
        winConditionFocus: WinCondition.APEX_PREDATOR,
        riskTolerance: 0.5,
        cardValueThreshold: 0.6
      };
    case AIDifficulty.HARD:
      return {
        aggressionLevel: 0.8,
        winConditionFocus: WinCondition.ECOSYSTEM_BALANCE,
        riskTolerance: 0.7,
        cardValueThreshold: 0.8
      };
    default:
      return getAIStrategy(AIDifficulty.MEDIUM);
  }
}

/**
 * Evaluates the value of playing a card
 */
function evaluateCardPlay(card: Card, gameState: GameState, aiPlayer: Player): number {
  let value = 0;
  
  // Base value from card stats
  value += card.power * 0.3;
  value += card.health * 0.2;
  value += card.speed * 0.1;
  value += card.senses * 0.1;
  
  // Energy efficiency
  const energyEfficiency = (card.power + card.health) / card.energyCost;
  value += energyEfficiency * 0.2;
  
  // Trophic role considerations
  const fieldRoles = new Set(aiPlayer.field.map(c => c.trophicRole));
  
  // Bonus for completing ecosystem balance
  if (card.trophicRole === TrophicRole.PRODUCER && !fieldRoles.has(TrophicRole.PRODUCER)) {
    value += 0.5;
  }
  if (card.trophicRole === TrophicRole.HERBIVORE && !fieldRoles.has(TrophicRole.HERBIVORE)) {
    value += 0.5;
  }
  if (card.trophicRole === TrophicRole.CARNIVORE && !fieldRoles.has(TrophicRole.CARNIVORE)) {
    value += 0.5;
  }
  
  // Environmental bonus
  if (card.habitat === gameState.environment) {
    value += 0.3;
  }
  
  // Ability value
  value += card.abilities.length * 0.2;
  
  return value;
}

/**
 * Evaluates the value of an attack
 */
function evaluateAttack(
  attacker: Card,
  defender: Card,
  gameState: GameState,
  aiPlayer: Player
): number {
  const simulation = simulateCombat(attacker, defender, gameState.environment, aiPlayer.field, 100);
  
  let value = 0;
  
  // Success probability
  value += simulation.winRate * 0.5;
  
  // Damage potential
  value += simulation.averageDamage / defender.maxHealth * 0.3;
  
  // Target priority (high-value targets)
  const targetValue = (defender.power + defender.health + defender.speed) / 3;
  value += targetValue * 0.1;
  
  // Risk assessment (don't attack if attacker is valuable and likely to die)
  const attackerValue = (attacker.power + attacker.health + attacker.speed) / 3;
  const counterAttackRisk = defender.power / attacker.health;
  value -= counterAttackRisk * attackerValue * 0.2;
  
  return value;
}

/**
 * Finds the best card to play
 */
function findBestCardToPlay(gameState: GameState, aiPlayer: Player, strategy: AIStrategy): Card | null {
  const playableCards = aiPlayer.hand.filter(card => 
    aiPlayer.energy >= card.energyCost && aiPlayer.field.length < 6
  );
  
  if (playableCards.length === 0) return null;
  
  let bestCard: Card | null = null;
  let bestValue = strategy.cardValueThreshold;
  
  for (const card of playableCards) {
    const value = evaluateCardPlay(card, gameState, aiPlayer);
    if (value > bestValue) {
      bestValue = value;
      bestCard = card;
    }
  }
  
  return bestCard;
}

/**
 * Finds the best attack to make
 */
function findBestAttack(
  gameState: GameState,
  aiPlayer: Player,
  opponent: Player,
  strategy: AIStrategy
): { attacker: Card; target: Card } | null {
  if (aiPlayer.field.length === 0 || opponent.field.length === 0) return null;
  
  let bestAttack: { attacker: Card; target: Card } | null = null;
  let bestValue = 0.3; // Minimum threshold for attacking
  
  for (const attacker of aiPlayer.field) {
    for (const target of opponent.field) {
      const value = evaluateAttack(attacker, target, gameState, aiPlayer);
      const adjustedValue = value * strategy.aggressionLevel;
      
      if (adjustedValue > bestValue) {
        bestValue = adjustedValue;
        bestAttack = { attacker, target };
      }
    }
  }
  
  return bestAttack;
}

/**
 * Evaluates current win condition progress
 */
function evaluateWinConditionProgress(gameState: GameState, aiPlayer: Player): number {
  const winConditions = checkAllWinConditions(aiPlayer, gameState.players[1 - gameState.currentPlayer]);
  
  let totalPriority = 0;
  for (const condition of winConditions) {
    totalPriority += getWinConditionPriority(condition);
  }
  
  return totalPriority / winConditions.length;
}

/**
 * Makes an AI decision for the current turn
 */
export function makeAIDecision(
  gameState: GameState,
  difficulty: AIDifficulty = AIDifficulty.MEDIUM
): AIDecision {
  const aiPlayer = gameState.players[gameState.currentPlayer];
  const opponent = gameState.players[1 - gameState.currentPlayer];
  const strategy = getAIStrategy(difficulty);
  
  // Evaluate win condition progress
  const winProgress = evaluateWinConditionProgress(gameState, aiPlayer);
  
  // Decision priority: Play cards first, then attack, then end turn
  
  // 1. Try to play a card if we have energy and good options
  if (aiPlayer.energy > 0) {
    const bestCard = findBestCardToPlay(gameState, aiPlayer, strategy);
    if (bestCard) {
      return {
        type: 'play_card',
        cardId: bestCard.id,
        reasoning: `Playing ${bestCard.nameId} for strategic value`
      };
    }
  }
  
  // 2. Try to attack if we have creatures and good targets
  if (aiPlayer.field.length > 0 && opponent.field.length > 0) {
    const bestAttack = findBestAttack(gameState, aiPlayer, opponent, strategy);
    if (bestAttack) {
      return {
        type: 'attack',
        cardId: bestAttack.attacker.id,
        targetCardId: bestAttack.target.id,
        reasoning: `Attacking ${bestAttack.target.nameId} with ${bestAttack.attacker.nameId}`
      };
    }
  }
  
  // 3. End turn if no good plays available
  return {
    type: 'end_turn',
    reasoning: 'No beneficial plays available, ending turn'
  };
}

/**
 * Simulates AI thinking time (for better UX)
 */
export function getAIThinkingTime(difficulty: AIDifficulty): number {
  switch (difficulty) {
    case AIDifficulty.EASY:
      return 500; // 0.5 seconds
    case AIDifficulty.MEDIUM:
      return 1000; // 1 second
    case AIDifficulty.HARD:
      return 1500; // 1.5 seconds
    default:
      return 1000;
  }
}

/**
 * Creates a balanced AI deck
 */
export function createAIDeck(allCards: Card[], difficulty: AIDifficulty): Card[] {
  const strategy = getAIStrategy(difficulty);
  
  // Separate cards by trophic role
  const producers = allCards.filter(card => card.trophicRole === TrophicRole.PRODUCER);
  const herbivores = allCards.filter(card => card.trophicRole === TrophicRole.HERBIVORE);
  const carnivores = allCards.filter(card => card.trophicRole === TrophicRole.CARNIVORE);
  const decomposers = allCards.filter(card => card.trophicRole === TrophicRole.DECOMPOSER);
  
  // Sort by power for difficulty scaling
  const sortByPower = (a: Card, b: Card) => b.power - a.power;
  
  let deckCards: Card[] = [];
  
  // Select cards based on difficulty
  if (difficulty === AIDifficulty.EASY) {
    // Use weaker cards
    deckCards = [
      ...producers.sort(sortByPower).slice(-2), // 2 weakest producers
      ...herbivores.sort(sortByPower).slice(-3), // 3 weakest herbivores
      ...carnivores.sort(sortByPower).slice(-2), // 2 weakest carnivores
      ...decomposers.sort(sortByPower).slice(-1) // 1 weakest decomposer
    ];
  } else if (difficulty === AIDifficulty.MEDIUM) {
    // Use medium strength cards
    deckCards = [
      ...producers.sort(sortByPower).slice(1, 3), // 2 medium producers
      ...herbivores.sort(sortByPower).slice(1, 4), // 3 medium herbivores
      ...carnivores.sort(sortByPower).slice(1, 3), // 2 medium carnivores
      ...decomposers.sort(sortByPower).slice(0, 1) // 1 medium decomposer
    ];
  } else {
    // Use strongest cards
    deckCards = [
      ...producers.sort(sortByPower).slice(0, 2), // 2 strongest producers
      ...herbivores.sort(sortByPower).slice(0, 3), // 3 strongest herbivores
      ...carnivores.sort(sortByPower).slice(0, 2), // 2 strongest carnivores
      ...decomposers.sort(sortByPower).slice(0, 1) // 1 strongest decomposer
    ];
  }
  
  // Ensure we have exactly 8 cards
  return deckCards.slice(0, 8);
}

/**
 * PHYLO DOMINO-STYLE AI SYSTEM
 * Enhanced AI for ecosystem building gameplay
 */

export interface PhyloAIDecision {
  type: 'place_card' | 'move_card' | 'challenge' | 'pass_turn';
  cardId?: string;
  position?: { x: number; y: number };
  targetPosition?: { x: number; y: number };
  challengeData?: {
    targetCardId: string;
    targetPlayerId: string;
    claimType: string;
    evidence: string;
  };
  confidence: number;
  reasoning: string;
}

/**
 * Makes an AI decision for Phylo domino-style gameplay
 */
export function makePhyloAIDecision(
  gameState: any, // PhyloGameState from gameStateManager
  difficulty: AIDifficulty = AIDifficulty.EASY
): PhyloAIDecision {
  // Easy AI: Simple random decisions
  if (difficulty === AIDifficulty.EASY) {
    return makeEasyPhyloDecision(gameState);
  }

  // Medium AI: Basic strategy
  if (difficulty === AIDifficulty.MEDIUM) {
    return makeMediumPhyloDecision(gameState);
  }

  // Hard AI: Advanced strategy
  return makeHardPhyloDecision(gameState);
}

/**
 * Easy AI: Random but valid moves
 */
function makeEasyPhyloDecision(gameState: any): PhyloAIDecision {
  const aiPlayer = gameState.players.find((p: any) => p.id === 'ai');

  if (!aiPlayer || aiPlayer.hand.length === 0) {
    return {
      type: 'pass_turn',
      confidence: 0.8,
      reasoning: 'Easy AI: No cards to play, passing turn'
    };
  }

  // 70% chance to place a card if possible
  if (Math.random() < 0.7) {
    const randomCard = aiPlayer.hand[Math.floor(Math.random() * aiPlayer.hand.length)];
    const position = findRandomValidPosition(gameState);

    if (position) {
      return {
        type: 'place_card',
        cardId: randomCard,
        position,
        confidence: 0.6,
        reasoning: 'Easy AI: Random card placement'
      };
    }
  }

  // Default: pass turn
  return {
    type: 'pass_turn',
    confidence: 0.8,
    reasoning: 'Easy AI: No good moves found, passing turn'
  };
}

/**
 * Medium AI: Basic ecosystem strategy
 */
function makeMediumPhyloDecision(gameState: any): PhyloAIDecision {
  // For now, use easy AI with slightly better reasoning
  const decision = makeEasyPhyloDecision(gameState);
  return {
    ...decision,
    confidence: Math.min(1.0, decision.confidence + 0.1),
    reasoning: `Medium AI: ${decision.reasoning}`
  };
}

/**
 * Hard AI: Advanced ecosystem optimization
 */
function makeHardPhyloDecision(gameState: any): PhyloAIDecision {
  // For now, use medium AI with higher confidence
  const decision = makeMediumPhyloDecision(gameState);
  return {
    ...decision,
    confidence: Math.min(1.0, decision.confidence + 0.2),
    reasoning: `Hard AI: ${decision.reasoning}`
  };
}

/**
 * Helper functions for AI decision making
 */
function findRandomValidPosition(gameState: any): { x: number; y: number } | null {
  const existingPositions = Array.from(gameState.gameBoard.positions.keys());

  if (existingPositions.length === 0) {
    // First card, place at origin
    return { x: 0, y: 0 };
  }

  // Try positions adjacent to existing cards
  for (let i = 0; i < 10; i++) { // Max 10 attempts
    const randomExisting = existingPositions[Math.floor(Math.random() * existingPositions.length)] as string;
    const [x, y] = randomExisting.split(',').map(Number);

    const adjacentPositions = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 }
    ];

    for (const pos of adjacentPositions) {
      const posKey = `${pos.x},${pos.y}`;
      if (!gameState.gameBoard.positions.has(posKey)) {
        return pos;
      }
    }
  }

  return null;
}

export default makeAIDecision;
