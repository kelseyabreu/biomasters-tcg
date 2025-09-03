import { Card, PhyloGameBoard, PhyloCardPosition } from '../types';
import { analyzeEcosystemNetwork } from './ecosystemBuilder';

/**
 * Phylo-style scoring and win condition system
 */

export interface PlayerScore {
  playerId: string;
  totalPoints: number;
  cardPoints: number;
  ecosystemPoints: number;
  bonusPoints: number;
  penaltyPoints: number;
  breakdown: {
    placementDifficulty: number;
    chainLength: number;
    biodiversity: number;
    conservation: number;
    scientificAccuracy: number;
    penalties: number;
  };
}

export interface GameEndCondition {
  type: 'deck_exhausted' | 'time_limit' | 'ecosystem_collapse' | 'voluntary_end';
  triggeredBy: string;
  description: string;
}

export interface WinCondition {
  winner: string | null;
  winType: 'points' | 'ecosystem_dominance' | 'conservation_victory' | 'scientific_accuracy';
  finalScores: PlayerScore[];
  gameEndCondition: GameEndCondition;
  gameStats: {
    totalTurns: number;
    cardsPlayed: number;
    eventsTriggered: number;
    ecosystemStability: number;
  };
}

export interface ScientificChallenge {
  challengerId: string;
  targetCardId: string;
  targetPlayerId: string;
  claimType: 'habitat' | 'diet' | 'behavior' | 'conservation_status' | 'scale';
  evidence: string;
  timeLimit: number; // milliseconds
  resolved: boolean;
  outcome?: 'upheld' | 'overturned' | 'inconclusive';
  pointsAwarded?: number;
}

/**
 * Calculates placement difficulty score for a card
 */
export function calculatePlacementDifficulty(
  card: Card,
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>,
  position: PhyloCardPosition
): number {
  if (!card.phyloAttributes) return 0;

  let difficultyScore = 0;
  const phylo = card.phyloAttributes;

  // Base difficulty from card's point value
  difficultyScore += phylo.pointValue;

  // Bonus for higher foodchain levels (predators are harder to place)
  difficultyScore += phylo.foodchainLevel * 2;

  // Bonus for larger scale (bigger animals are harder to sustain)
  if (phylo.scale >= 8) difficultyScore += 3;
  else if (phylo.scale >= 6) difficultyScore += 2;
  else if (phylo.scale >= 4) difficultyScore += 1;

  // Bonus for endangered species
  const conservationBonus: Record<string, number> = {
    'Extinct': 10,
    'Critically Endangered': 8,
    'Endangered': 6,
    'Vulnerable': 4,
    'Near Threatened': 2,
    'Least Concern': 0,
    'Data Deficient': 1,
    'Not Evaluated': 0
  };
  difficultyScore += conservationBonus[phylo.conservationStatus] || 0;

  // Bonus for special keywords
  if (phylo.specialKeywords.includes('INVASIVE')) difficultyScore -= 2; // Easier to place
  if (phylo.specialKeywords.includes('PARASITIC')) difficultyScore += 3;
  if (phylo.specialKeywords.includes('POLLINATOR')) difficultyScore += 2;

  // Bonus for complex terrain/climate requirements
  if (phylo.terrains.length > 1) difficultyScore += 1;
  if (phylo.climates.length > 1) difficultyScore += 1;

  // Bonus for successful connections
  const adjacentPositions = [
    { x: position.x - 1, y: position.y },
    { x: position.x + 1, y: position.y },
    { x: position.x, y: position.y - 1 },
    { x: position.x, y: position.y + 1 }
  ];

  let validConnections = 0;
  adjacentPositions.forEach(pos => {
    const posKey = `${pos.x},${pos.y}`;
    const adjacentPosition = gameBoard.positions.get(posKey);
    if (adjacentPosition) {
      const adjacentCard = cards.get(adjacentPosition.cardId);
      if (adjacentCard) {
        validConnections++;
      }
    }
  });

  // Bonus for each valid connection
  difficultyScore += validConnections * 2;

  return Math.max(difficultyScore, 1); // Minimum 1 point
}

/**
 * Calculates ecosystem network scoring
 */
export function calculateEcosystemScore(
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>,
  playerId: string
): number {
  const network = analyzeEcosystemNetwork(gameBoard, cards);
  let ecosystemScore = 0;

  // Get player's cards
  const playerPositions = Array.from(gameBoard.positions.values())
    .filter(pos => pos.playerId === playerId);

  if (playerPositions.length === 0) return 0;

  // Chain length bonus
  network.chains.forEach(chain => {
    const playerCardsInChain = chain.cards.filter(cardId => {
      const position = Array.from(gameBoard.positions.values())
        .find(pos => pos.cardId === cardId);
      return position?.playerId === playerId;
    });

    if (playerCardsInChain.length > 0) {
      // Bonus for longer chains
      const chainBonus = Math.pow(chain.cards.length, 1.5);
      const playerRatio = playerCardsInChain.length / chain.cards.length;
      ecosystemScore += chainBonus * playerRatio;

      // Extra bonus for complete chains owned by player
      if (playerCardsInChain.length === chain.cards.length && chain.isValid) {
        ecosystemScore += 10;
      }
    }
  });

  // Biodiversity bonus
  const playerCards = playerPositions.map(pos => cards.get(pos.cardId)).filter(Boolean) as Card[];
  const uniqueTerrains = new Set();
  const uniqueClimates = new Set();
  const uniqueFoodchainLevels = new Set();

  playerCards.forEach(card => {
    if (card.phyloAttributes) {
      card.phyloAttributes.terrains.forEach(terrain => uniqueTerrains.add(terrain));
      card.phyloAttributes.climates.forEach(climate => uniqueClimates.add(climate));
      uniqueFoodchainLevels.add(card.phyloAttributes.foodchainLevel);
    }
  });

  ecosystemScore += uniqueTerrains.size * 3;
  ecosystemScore += uniqueClimates.size * 3;
  ecosystemScore += uniqueFoodchainLevels.size * 5;

  // Stability bonus
  ecosystemScore += (network.stability || 0) * 2;

  return Math.round(ecosystemScore);
}

/**
 * Calculates conservation bonus points
 */
export function calculateConservationBonus(
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>,
  playerId: string
): number {
  const playerPositions = Array.from(gameBoard.positions.values())
    .filter(pos => pos.playerId === playerId);

  let conservationScore = 0;

  playerPositions.forEach(position => {
    const card = cards.get(position.cardId);
    if (card?.phyloAttributes) {
      const status = card.phyloAttributes.conservationStatus;

      // Higher bonus for more endangered species
      const statusBonus: Record<string, number> = {
        'Extinct': 15,
        'Critically Endangered': 12,
        'Endangered': 10,
        'Vulnerable': 8,
        'Near Threatened': 5,
        'Least Concern': 1,
        'Data Deficient': 2,
        'Not Evaluated': 0
      };

      conservationScore += statusBonus[status] || 0;
    }
  });

  return conservationScore;
}

/**
 * Calculates scientific accuracy bonus
 */
export function calculateScientificAccuracyBonus(
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>,
  playerId: string,
  challenges: ScientificChallenge[]
): number {
  let accuracyScore = 0;

  // Bonus for successful challenges
  const playerChallenges = challenges.filter(c => c.challengerId === playerId && c.resolved);
  playerChallenges.forEach(challenge => {
    if (challenge.outcome === 'upheld') {
      accuracyScore += challenge.pointsAwarded || 5;
    }
  });

  // Penalty for failed challenges
  const failedChallenges = challenges.filter(c =>
    c.targetPlayerId === playerId && c.resolved && c.outcome === 'overturned'
  );
  failedChallenges.forEach(challenge => {
    accuracyScore -= challenge.pointsAwarded || 3;
  });

  return accuracyScore;
}

/**
 * Calculates total score for a player
 */
export function calculatePlayerScore(
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>,
  playerId: string,
  challenges: ScientificChallenge[] = []
): PlayerScore {
  const playerPositions = Array.from(gameBoard.positions.values())
    .filter(pos => pos.playerId === playerId);

  // Calculate card points (placement difficulty)
  let cardPoints = 0;
  playerPositions.forEach(position => {
    const card = cards.get(position.cardId);
    if (card) {
      cardPoints += calculatePlacementDifficulty(card, gameBoard, cards, position);
    }
  });

  // Calculate ecosystem points
  const ecosystemPoints = calculateEcosystemScore(gameBoard, cards, playerId);

  // Calculate bonus points
  const conservationBonus = calculateConservationBonus(gameBoard, cards, playerId);
  const scientificAccuracyBonus = calculateScientificAccuracyBonus(gameBoard, cards, playerId, challenges);
  const bonusPoints = conservationBonus + scientificAccuracyBonus;

  // Calculate penalties (for now, just from failed scientific challenges)
  const penaltyPoints = Math.abs(Math.min(scientificAccuracyBonus, 0));

  const totalPoints = cardPoints + ecosystemPoints + bonusPoints - penaltyPoints;

  return {
    playerId,
    totalPoints,
    cardPoints,
    ecosystemPoints,
    bonusPoints,
    penaltyPoints,
    breakdown: {
      placementDifficulty: cardPoints,
      chainLength: Math.round(ecosystemPoints * 0.4),
      biodiversity: Math.round(ecosystemPoints * 0.4),
      conservation: conservationBonus,
      scientificAccuracy: scientificAccuracyBonus,
      penalties: penaltyPoints
    }
  };
}

/**
 * Determines game end conditions and winner
 */
export function determineWinCondition(
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>,
  playerIds: string[],
  gameStats: {
    totalTurns: number;
    cardsPlayed: number;
    eventsTriggered: number;
    maxTurns?: number;
    timeLimit?: number;
    gameStartTime?: number;
  },
  challenges: ScientificChallenge[] = []
): WinCondition | null {
  const network = analyzeEcosystemNetwork(gameBoard, cards);

  // Check for ecosystem collapse
  if ((network.stability || 0) < 0.2 && gameBoard.positions.size > 10) {
    const finalScores = playerIds.map(playerId =>
      calculatePlayerScore(gameBoard, cards, playerId, challenges)
    ).sort((a, b) => b.totalPoints - a.totalPoints);

    return {
      winner: null, // No winner in ecosystem collapse
      winType: 'ecosystem_dominance',
      finalScores,
      gameEndCondition: {
        type: 'ecosystem_collapse',
        triggeredBy: 'system',
        description: 'The ecosystem has collapsed due to instability'
      },
      gameStats: {
        ...gameStats,
        ecosystemStability: network.stability || 0
      }
    };
  }

  // Check for time limit
  if (gameStats.timeLimit && gameStats.gameStartTime) {
    const elapsed = Date.now() - gameStats.gameStartTime;
    if (elapsed >= gameStats.timeLimit) {
      const finalScores = playerIds.map(playerId =>
        calculatePlayerScore(gameBoard, cards, playerId, challenges)
      ).sort((a, b) => b.totalPoints - a.totalPoints);

      return {
        winner: finalScores[0].playerId,
        winType: 'points',
        finalScores,
        gameEndCondition: {
          type: 'time_limit',
          triggeredBy: 'system',
          description: 'Time limit reached'
        },
        gameStats: {
          ...gameStats,
          ecosystemStability: network.stability || 0
        }
      };
    }
  }

  // Check for turn limit
  if (gameStats.maxTurns && gameStats.totalTurns >= gameStats.maxTurns) {
    const finalScores = playerIds.map(playerId =>
      calculatePlayerScore(gameBoard, cards, playerId, challenges)
    ).sort((a, b) => b.totalPoints - a.totalPoints);

    return {
      winner: finalScores[0].playerId,
      winType: 'points',
      finalScores,
      gameEndCondition: {
        type: 'deck_exhausted',
        triggeredBy: 'system',
        description: 'Maximum turns reached'
      },
      gameStats: {
        ...gameStats,
        ecosystemStability: network.stability || 0
      }
    };
  }

  // Check for conservation victory (70% endangered species successfully placed)
  const finalScores = playerIds.map(playerId =>
    calculatePlayerScore(gameBoard, cards, playerId, challenges)
  );

  const conservationWinner = finalScores.find(score => {
    const playerPositions = Array.from(gameBoard.positions.values())
      .filter(pos => pos.playerId === score.playerId);

    const endangeredCount = playerPositions.filter(position => {
      const card = cards.get(position.cardId);
      return card?.phyloAttributes &&
        ['Extinct', 'Critically Endangered', 'Endangered', 'Vulnerable'].includes(
          card.phyloAttributes.conservationStatus
        );
    }).length;

    return endangeredCount >= 5 && score.breakdown.conservation >= 40;
  });

  if (conservationWinner) {
    return {
      winner: conservationWinner.playerId,
      winType: 'conservation_victory',
      finalScores: finalScores.sort((a, b) => b.totalPoints - a.totalPoints),
      gameEndCondition: {
        type: 'voluntary_end',
        triggeredBy: conservationWinner.playerId,
        description: 'Conservation victory achieved'
      },
      gameStats: {
        ...gameStats,
        ecosystemStability: network.stability || 0
      }
    };
  }

  return null; // Game continues
}

/**
 * Creates a scientific challenge
 */
export function createScientificChallenge(
  challengerId: string,
  targetCardId: string,
  targetPlayerId: string,
  claimType: ScientificChallenge['claimType'],
  evidence: string
): ScientificChallenge {
  return {
    challengerId,
    targetCardId,
    targetPlayerId,
    claimType,
    evidence,
    timeLimit: 60000, // 1 minute to respond
    resolved: false
  };
}

/**
 * Resolves a scientific challenge
 */
export function resolveScientificChallenge(
  challenge: ScientificChallenge,
  card: Card,
  response?: string
): ScientificChallenge {
  const resolvedChallenge = { ...challenge, resolved: true };

  // Simple validation logic (in a real game, this would be more sophisticated)
  switch (challenge.claimType) {
    case 'habitat':
      // Check if the claimed habitat matches the card's terrain
      const claimedHabitat = challenge.evidence.toLowerCase();
      const cardTerrains = card.phyloAttributes?.terrains.map(t => t.toLowerCase()) || [];
      resolvedChallenge.outcome = cardTerrains.some(terrain =>
        claimedHabitat.includes(terrain) || terrain.includes(claimedHabitat)
      ) ? 'upheld' : 'overturned';
      break;

    case 'diet':
      // Check if the claimed diet matches the card's diet type
      const claimedDiet = challenge.evidence.toLowerCase();
      const cardDiet = card.phyloAttributes?.dietType.toLowerCase() || '';
      resolvedChallenge.outcome = cardDiet.includes(claimedDiet) || claimedDiet.includes(cardDiet)
        ? 'upheld' : 'overturned';
      break;

    case 'conservation_status':
      // Check if the claimed status matches the card's conservation status
      const claimedStatus = challenge.evidence.toLowerCase();
      const cardStatus = card.phyloAttributes?.conservationStatus.toLowerCase() || '';
      resolvedChallenge.outcome = cardStatus.includes(claimedStatus)
        ? 'upheld' : 'overturned';
      break;

    case 'scale':
      // Check if the claimed scale is reasonable for the card
      const claimedScale = parseInt(challenge.evidence);
      const cardScale = card.phyloAttributes?.scale || 0;
      const scaleDifference = Math.abs(claimedScale - cardScale);
      resolvedChallenge.outcome = scaleDifference <= 2 ? 'upheld' : 'overturned';
      break;

    default:
      resolvedChallenge.outcome = 'inconclusive';
  }

  // Award points based on outcome
  resolvedChallenge.pointsAwarded = resolvedChallenge.outcome === 'upheld' ? 5 : 3;

  return resolvedChallenge;
}

/**
 * Gets the current leaderboard
 */
export function getLeaderboard(
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>,
  playerIds: string[],
  challenges: ScientificChallenge[] = []
): PlayerScore[] {
  return playerIds
    .map(playerId => calculatePlayerScore(gameBoard, cards, playerId, challenges))
    .sort((a, b) => b.totalPoints - a.totalPoints);
}