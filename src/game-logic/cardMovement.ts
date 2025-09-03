import { Card, PhyloGameBoard, PhyloCardPosition } from '../types';
import { validateCardPlacement, checkCardCompatibility } from './phyloCompatibility';
import { analyzeEcosystemNetwork, removeCardFromBoard, placeCardOnBoard } from './ecosystemBuilder';

/**
 * Card movement system for Phylo domino-style gameplay
 */

export interface MovementValidation {
  isValid: boolean;
  canReach: boolean;
  pathBlocked: boolean;
  destinationValid: boolean;
  errorMessage?: string;
  suggestedPositions?: Array<{ x: number, y: number }>;
}

export interface MovementAnimation {
  cardId: string;
  fromPosition: { x: number, y: number };
  toPosition: { x: number, y: number };
  duration: number;
  animationType: 'walk' | 'fly' | 'swim' | 'burrow';
  keyframes: Array<{ x: number, y: number, timestamp: number }>;
}

export interface MovementResult {
  success: boolean;
  updatedBoard: PhyloGameBoard;
  animation?: MovementAnimation;
  ecosystemDisruption: {
    brokenChains: string[];
    isolatedCards: string[];
    cascadeRemovals: string[];
  };
  errorMessage?: string;
}

/**
 * Validates if a card can move to a specific position
 */
export function validateCardMovement(
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>,
  cardId: string,
  targetPosition: { x: number, y: number }
): MovementValidation {
  const card = cards.get(cardId);
  if (!card) {
    return {
      isValid: false,
      canReach: false,
      pathBlocked: false,
      destinationValid: false,
      errorMessage: 'Card not found'
    };
  }

  // Find current position
  let currentPosition: PhyloCardPosition | null = null;
  for (const position of gameBoard.positions.values()) {
    if (position.cardId === cardId) {
      currentPosition = position;
      break;
    }
  }

  if (!currentPosition) {
    return {
      isValid: false,
      canReach: false,
      pathBlocked: false,
      destinationValid: false,
      errorMessage: 'Card not found on board'
    };
  }

  const moveCapability = card.phyloAttributes?.movementCapability;
  if (!moveCapability || moveCapability.moveValue === 0) {
    return {
      isValid: false,
      canReach: false,
      pathBlocked: false,
      destinationValid: false,
      errorMessage: 'Card cannot move'
    };
  }

  // Check if destination is occupied
  const targetKey = `${targetPosition.x},${targetPosition.y}`;
  if (gameBoard.positions.has(targetKey)) {
    return {
      isValid: false,
      canReach: false,
      pathBlocked: false,
      destinationValid: false,
      errorMessage: 'Destination is occupied'
    };
  }

  // Check movement range
  const canReach = checkMovementRange(
    currentPosition,
    targetPosition,
    moveCapability.moveValue,
    moveCapability.canFly
  );

  if (!canReach) {
    const suggestedPositions = getValidMovementPositions(
      gameBoard,
      currentPosition,
      moveCapability.moveValue,
      moveCapability.canFly
    );

    return {
      isValid: false,
      canReach: false,
      pathBlocked: false,
      destinationValid: false,
      errorMessage: `Card can only move ${moveCapability.moveValue} spaces`,
      suggestedPositions
    };
  }

  // Check path (for non-flying movement)
  const pathBlocked = !moveCapability.canFly &&
    isPathBlocked(gameBoard, currentPosition, targetPosition);

  if (pathBlocked) {
    return {
      isValid: false,
      canReach: true,
      pathBlocked: true,
      destinationValid: false,
      errorMessage: 'Path is blocked'
    };
  }

  // Check if destination maintains ecosystem connections
  const destinationValid = validateDestinationEcosystem(
    gameBoard,
    cards,
    cardId,
    targetPosition
  );

  if (!destinationValid) {
    return {
      isValid: false,
      canReach: true,
      pathBlocked: false,
      destinationValid: false,
      errorMessage: 'Movement would break ecosystem connections'
    };
  }

  return {
    isValid: true,
    canReach: true,
    pathBlocked: false,
    destinationValid: true
  };
}

/**
 * Checks if a card can reach a target position within its movement range
 */
function checkMovementRange(
  currentPosition: PhyloCardPosition,
  targetPosition: { x: number, y: number },
  moveValue: number,
  canFly: boolean
): boolean {
  if (canFly) {
    // Flying movement: can move diagonally
    const deltaX = Math.abs(targetPosition.x - currentPosition.x);
    const deltaY = Math.abs(targetPosition.y - currentPosition.y);
    const diagonalDistance = Math.max(deltaX, deltaY);
    return diagonalDistance <= moveValue;
  } else {
    // Ground movement: Manhattan distance
    const manhattanDistance =
      Math.abs(targetPosition.x - currentPosition.x) +
      Math.abs(targetPosition.y - currentPosition.y);
    return manhattanDistance <= moveValue;
  }
}

/**
 * Gets all valid positions a card can move to
 */
function getValidMovementPositions(
  gameBoard: PhyloGameBoard,
  currentPosition: PhyloCardPosition,
  moveValue: number,
  canFly: boolean
): Array<{ x: number, y: number }> {
  const validPositions: Array<{ x: number, y: number }> = [];

  for (let dx = -moveValue; dx <= moveValue; dx++) {
    for (let dy = -moveValue; dy <= moveValue; dy++) {
      if (dx === 0 && dy === 0) continue; // Skip current position

      const targetX = currentPosition.x + dx;
      const targetY = currentPosition.y + dy;
      const targetKey = `${targetX},${targetY}`;

      // Skip if position is occupied
      if (gameBoard.positions.has(targetKey)) continue;

      // Check if within movement range
      const inRange = canFly ?
        Math.max(Math.abs(dx), Math.abs(dy)) <= moveValue :
        Math.abs(dx) + Math.abs(dy) <= moveValue;

      if (inRange) {
        validPositions.push({ x: targetX, y: targetY });
      }
    }
  }

  return validPositions;
}

/**
 * Checks if the path between two positions is blocked
 */
function isPathBlocked(
  gameBoard: PhyloGameBoard,
  from: PhyloCardPosition,
  to: { x: number, y: number }
): boolean {
  // Simple line-of-sight check for ground movement
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const steps = Math.max(Math.abs(deltaX), Math.abs(deltaY));

  if (steps <= 1) return false; // Adjacent movement is never blocked

  for (let i = 1; i < steps; i++) {
    const checkX = from.x + Math.round((deltaX * i) / steps);
    const checkY = from.y + Math.round((deltaY * i) / steps);
    const checkKey = `${checkX},${checkY}`;

    if (gameBoard.positions.has(checkKey)) {
      return true; // Path is blocked
    }
  }

  return false;
}

/**
 * Validates that moving to destination won't break ecosystem rules
 */
function validateDestinationEcosystem(
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>,
  cardId: string,
  targetPosition: { x: number, y: number }
): boolean {
  const card = cards.get(cardId);
  if (!card) return false;

  // Get adjacent cards at target position
  const adjacentPositions = [
    { x: targetPosition.x - 1, y: targetPosition.y },
    { x: targetPosition.x + 1, y: targetPosition.y },
    { x: targetPosition.x, y: targetPosition.y - 1 },
    { x: targetPosition.x, y: targetPosition.y + 1 }
  ];

  const adjacentCards: Card[] = [];
  adjacentPositions.forEach(pos => {
    const posKey = `${pos.x},${pos.y}`;
    const position = gameBoard.positions.get(posKey);
    if (position && position.cardId !== cardId) {
      const adjCard = cards.get(position.cardId);
      if (adjCard) {
        adjacentCards.push(adjCard);
      }
    }
  });

  // If no adjacent cards, movement is valid (card can be isolated temporarily)
  if (adjacentCards.length === 0) return true;

  // Check if card can form valid connections at new position
  const validation = validateCardPlacement(card, adjacentCards);
  return validation.isValid;
}

/**
 * Executes a card movement with ecosystem disruption handling
 */
export function executeCardMovement(
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>,
  cardId: string,
  targetPosition: { x: number, y: number }
): MovementResult {
  // Validate movement first
  const validation = validateCardMovement(gameBoard, cards, cardId, targetPosition);
  if (!validation.isValid) {
    return {
      success: false,
      updatedBoard: gameBoard,
      ecosystemDisruption: {
        brokenChains: [],
        isolatedCards: [],
        cascadeRemovals: []
      },
      errorMessage: validation.errorMessage
    };
  }

  const card = cards.get(cardId);
  if (!card) {
    return {
      success: false,
      updatedBoard: gameBoard,
      ecosystemDisruption: {
        brokenChains: [],
        isolatedCards: [],
        cascadeRemovals: []
      },
      errorMessage: 'Card not found'
    };
  }

  // Find current position for animation
  let currentPosition: PhyloCardPosition | null = null;
  for (const position of gameBoard.positions.values()) {
    if (position.cardId === cardId) {
      currentPosition = position;
      break;
    }
  }

  if (!currentPosition) {
    return {
      success: false,
      updatedBoard: gameBoard,
      ecosystemDisruption: {
        brokenChains: [],
        isolatedCards: [],
        cascadeRemovals: []
      },
      errorMessage: 'Card not found on board'
    };
  }

  // Analyze ecosystem before movement
  const beforeNetwork = analyzeEcosystemNetwork(gameBoard, cards);

  // Remove card from current position
  const removeResult = removeCardFromBoard(gameBoard, cards, cardId);
  if (!removeResult.success) {
    return {
      success: false,
      updatedBoard: gameBoard,
      ecosystemDisruption: {
        brokenChains: [],
        isolatedCards: [],
        cascadeRemovals: []
      },
      errorMessage: 'Failed to remove card from current position'
    };
  }

  // Place card at new position
  const placeResult = placeCardOnBoard(
    removeResult.updatedBoard,
    cards,
    card,
    targetPosition,
    currentPosition.playerId
  );

  if (!placeResult.success) {
    return {
      success: false,
      updatedBoard: gameBoard,
      ecosystemDisruption: {
        brokenChains: [],
        isolatedCards: [],
        cascadeRemovals: []
      },
      errorMessage: placeResult.errorMessage || 'Failed to place card at new position'
    };
  }

  // Analyze ecosystem after movement
  const afterNetwork = analyzeEcosystemNetwork(placeResult.updatedBoard, cards);

  // Calculate ecosystem disruption
  const ecosystemDisruption = {
    brokenChains: findBrokenChains(beforeNetwork, afterNetwork),
    isolatedCards: afterNetwork.isolatedCards,
    cascadeRemovals: removeResult.cascadeRemovals
  };

  // Create movement animation
  const animation = createMovementAnimation(
    cardId,
    currentPosition,
    targetPosition,
    card.phyloAttributes?.movementCapability
  );

  return {
    success: true,
    updatedBoard: placeResult.updatedBoard,
    animation,
    ecosystemDisruption
  };
}

/**
 * Finds chains that were broken by the movement
 */
function findBrokenChains(
  beforeNetwork: any,
  afterNetwork: any
): string[] {
  const brokenChains: string[] = [];

  // Compare chain validity before and after
  beforeNetwork.chains.forEach((beforeChain: any) => {
    const afterChain = afterNetwork.chains.find((chain: any) =>
      chain.id === beforeChain.id ||
      chain.cards.some((cardId: string) => beforeChain.cards.includes(cardId))
    );

    if (!afterChain || !afterChain.isValid) {
      brokenChains.push(...beforeChain.cards);
    }
  });

  return [...new Set(brokenChains)]; // Remove duplicates
}

/**
 * Creates movement animation based on movement type
 */
function createMovementAnimation(
  cardId: string,
  fromPosition: PhyloCardPosition,
  toPosition: { x: number, y: number },
  movementCapability?: {
    moveValue: number;
    canFly: boolean;
    canSwim: boolean;
    canBurrow: boolean;
  }
): MovementAnimation {
  const from = { x: fromPosition.x, y: fromPosition.y };
  const to = toPosition;

  // Determine animation type
  let animationType: 'walk' | 'fly' | 'swim' | 'burrow' = 'walk';
  if (movementCapability?.canFly) {
    animationType = 'fly';
  } else if (movementCapability?.canSwim) {
    animationType = 'swim';
  } else if (movementCapability?.canBurrow) {
    animationType = 'burrow';
  }

  // Calculate duration based on distance and movement type
  const distance = Math.max(
    Math.abs(to.x - from.x),
    Math.abs(to.y - from.y)
  );

  const baseDuration = animationType === 'fly' ? 800 : 1200; // ms
  const duration = baseDuration + (distance * 200);

  // Create keyframes for smooth animation
  const keyframes = createAnimationKeyframes(from, to, animationType, duration);

  return {
    cardId,
    fromPosition: from,
    toPosition: to,
    duration,
    animationType,
    keyframes
  };
}

/**
 * Creates keyframes for smooth movement animation
 */
function createAnimationKeyframes(
  from: { x: number, y: number },
  to: { x: number, y: number },
  animationType: 'walk' | 'fly' | 'swim' | 'burrow',
  duration: number
): Array<{ x: number, y: number, timestamp: number }> {
  const keyframes: Array<{ x: number, y: number, timestamp: number }> = [];

  // Start position
  keyframes.push({ x: from.x, y: from.y, timestamp: 0 });

  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;

  if (animationType === 'fly') {
    // Flying: smooth arc movement
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps;
      const easeProgress = easeInOutQuad(progress);

      // Add slight arc for flying
      const arcHeight = Math.max(Math.abs(deltaX), Math.abs(deltaY)) * 0.3;
      const arcOffset = Math.sin(progress * Math.PI) * arcHeight;

      keyframes.push({
        x: from.x + (deltaX * easeProgress),
        y: from.y + (deltaY * easeProgress) - arcOffset,
        timestamp: (duration * progress)
      });
    }
  } else if (animationType === 'burrow') {
    // Burrowing: disappear and reappear
    keyframes.push({ x: from.x, y: from.y, timestamp: duration * 0.2 }); // Disappear
    keyframes.push({ x: to.x, y: to.y, timestamp: duration * 0.8 }); // Reappear
  } else {
    // Walking/Swimming: linear movement with easing
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps;
      const easeProgress = easeInOutQuad(progress);

      keyframes.push({
        x: from.x + (deltaX * easeProgress),
        y: from.y + (deltaY * easeProgress),
        timestamp: (duration * progress)
      });
    }
  }

  // End position
  keyframes.push({ x: to.x, y: to.y, timestamp: duration });

  return keyframes;
}

/**
 * Easing function for smooth animations
 */
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Gets all cards that can move in the current game state
 */
export function getMovableCards(
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>,
  playerId: string
): Array<{ cardId: string, validPositions: Array<{ x: number, y: number }> }> {
  const movableCards: Array<{ cardId: string, validPositions: Array<{ x: number, y: number }> }> = [];

  gameBoard.positions.forEach((position) => {
    if (position.playerId !== playerId) return;

    const card = cards.get(position.cardId);
    if (!card) return;

    const moveCapability = card.phyloAttributes?.movementCapability;
    if (!moveCapability || moveCapability.moveValue === 0) return;

    const validPositions = getValidMovementPositions(
      gameBoard,
      position,
      moveCapability.moveValue,
      moveCapability.canFly
    );

    // Filter positions that would maintain ecosystem connections
    const validEcosystemPositions = validPositions.filter(pos =>
      validateDestinationEcosystem(gameBoard, cards, position.cardId, pos)
    );

    if (validEcosystemPositions.length > 0) {
      movableCards.push({
        cardId: position.cardId,
        validPositions: validEcosystemPositions
      });
    }
  });

  return movableCards;
}