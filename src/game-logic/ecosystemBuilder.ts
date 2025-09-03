import { Card, PhyloGameBoard, PhyloCardPosition } from '../types';
import { validateCardPlacement, checkCardCompatibility } from './phyloCompatibility';

/**
 * Ecosystem building logic for Phylo domino-style gameplay
 */

export interface EcosystemChain {
  id: string;
  cards: string[]; // Array of card IDs in the chain
  isValid: boolean;
  brokenConnections: string[]; // Card IDs with broken connections
}

export interface EcosystemNetwork {
  chains: EcosystemChain[];
  isolatedCards: string[]; // Cards not connected to any valid chain
  totalConnections: number;
  stability: number; // 0-1 score based on redundant connections
}

/**
 * Analyzes the ecosystem network and identifies food chains
 */
export function analyzeEcosystemNetwork(
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>
): EcosystemNetwork {
  const chains: EcosystemChain[] = [];
  const visitedCards = new Set<string>();
  const isolatedCards: string[] = [];
  let totalConnections = 0;

  // Find all connected components (chains)
  gameBoard.positions.forEach((position, positionKey) => {
    if (visitedCards.has(position.cardId)) return;

    const chain = buildChainFromCard(position.cardId, gameBoard, cards, visitedCards);

    if (chain.cards.length === 1) {
      isolatedCards.push(position.cardId);
    } else {
      chains.push(chain);
    }
  });

  // Calculate total connections
  gameBoard.connections.forEach(connections => {
    totalConnections += connections.length;
  });

  // Calculate stability based on redundant connections
  const stability = calculateEcosystemStability(gameBoard, cards);

  return {
    chains,
    isolatedCards,
    totalConnections: totalConnections / 2, // Divide by 2 since connections are bidirectional
    stability
  };
}

/**
 * Builds a food chain starting from a specific card
 */
function buildChainFromCard(
  startCardId: string,
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>,
  visitedCards: Set<string>
): EcosystemChain {
  const chainCards: string[] = [];
  const brokenConnections: string[] = [];
  const queue = [startCardId];

  while (queue.length > 0) {
    const currentCardId = queue.shift()!;

    if (visitedCards.has(currentCardId)) continue;

    visitedCards.add(currentCardId);
    chainCards.push(currentCardId);

    const connections = gameBoard.connections.get(currentCardId) || [];
    const currentCard = cards.get(currentCardId);

    if (!currentCard) continue;

    // Check each connection for validity
    connections.forEach(connectedCardId => {
      const connectedCard = cards.get(connectedCardId);
      if (!connectedCard) return;

      const compatibility = checkCardCompatibility(currentCard, connectedCard);
      const isValidConnection = compatibility.environmental &&
                               (compatibility.foodchain || compatibility.scale);

      if (!isValidConnection) {
        brokenConnections.push(connectedCardId);
      } else if (!visitedCards.has(connectedCardId)) {
        queue.push(connectedCardId);
      }
    });
  }

  return {
    id: `chain-${startCardId}`,
    cards: chainCards,
    isValid: brokenConnections.length === 0,
    brokenConnections
  };
}

/**
 * Calculates ecosystem stability based on redundant connections
 */
function calculateEcosystemStability(
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>
): number {
  if (gameBoard.positions.size === 0) return 1.0;

  let totalPossibleConnections = 0;
  let actualValidConnections = 0;
  let redundantConnections = 0;

  gameBoard.positions.forEach((position, positionKey) => {
    const card = cards.get(position.cardId);
    if (!card) return;

    // Count adjacent positions
    const adjacentPositions = getAdjacentPositions(position.x, position.y);

    adjacentPositions.forEach(adjPos => {
      const adjPositionKey = `${adjPos.x},${adjPos.y}`;
      const adjPosition = gameBoard.positions.get(adjPositionKey);

      if (adjPosition) {
        totalPossibleConnections++;

        const adjCard = cards.get(adjPosition.cardId);
        if (adjCard) {
          const compatibility = checkCardCompatibility(card, adjCard);
          const isValid = compatibility.environmental &&
                         (compatibility.foodchain || compatibility.scale);

          if (isValid) {
            actualValidConnections++;

            // Check if this connection provides redundancy
            if (hasAlternativePath(position.cardId, adjPosition.cardId, gameBoard, cards)) {
              redundantConnections++;
            }
          }
        }
      }
    });
  });

  if (totalPossibleConnections === 0) return 1.0;

  const connectionRatio = actualValidConnections / totalPossibleConnections;
  const redundancyBonus = redundantConnections / Math.max(actualValidConnections, 1);

  return Math.min(1.0, connectionRatio + (redundancyBonus * 0.2));
}

/**
 * Gets adjacent grid positions
 */
function getAdjacentPositions(x: number, y: number): Array<{x: number, y: number}> {
  return [
    { x: x - 1, y },
    { x: x + 1, y },
    { x, y: y - 1 },
    { x, y: y + 1 }
  ];
}

/**
 * Checks if there's an alternative path between two cards (for redundancy)
 */
function hasAlternativePath(
  cardId1: string,
  cardId2: string,
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>
): boolean {
  // Simple BFS to find if there's another path
  const visited = new Set<string>();
  const queue = [cardId1];
  visited.add(cardId1);

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    if (currentId === cardId2) {
      return visited.size > 2; // More than just the direct connection
    }

    const connections = gameBoard.connections.get(currentId) || [];
    connections.forEach(connectedId => {
      if (!visited.has(connectedId) && connectedId !== cardId2) {
        const currentCard = cards.get(currentId);
        const connectedCard = cards.get(connectedId);

        if (currentCard && connectedCard) {
          const compatibility = checkCardCompatibility(currentCard, connectedCard);
          if (compatibility.environmental && (compatibility.foodchain || compatibility.scale)) {
            visited.add(connectedId);
            queue.push(connectedId);
          }
        }
      }
    });
  }

  return false;
}

/**
 * Places a card on the board and updates connections
 */
export function placeCardOnBoard(
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>,
  card: Card,
  position: { x: number, y: number },
  playerId: string
): { success: boolean, updatedBoard: PhyloGameBoard, errorMessage?: string } {
  const positionKey = `${position.x},${position.y}`;

  // Check if position is already occupied
  if (gameBoard.positions.has(positionKey)) {
    return {
      success: false,
      updatedBoard: gameBoard,
      errorMessage: 'Position already occupied'
    };
  }

  // Get adjacent cards for validation
  const adjacentCards = getAdjacentCardsAtPosition(position.x, position.y, gameBoard, cards);

  // Validate placement
  const validation = validateCardPlacement(card, adjacentCards);
  if (!validation.isValid) {
    return {
      success: false,
      updatedBoard: gameBoard,
      errorMessage: validation.errorMessage
    };
  }

  // Create new board state
  const newPositions = new Map(gameBoard.positions);
  const newConnections = new Map(gameBoard.connections);

  // Add the new card position
  const cardPosition: PhyloCardPosition = {
    x: position.x,
    y: position.y,
    cardId: card.id,
    playerId
  };

  newPositions.set(positionKey, cardPosition);

  // Update connections
  const cardConnections: string[] = [];

  getAdjacentPositions(position.x, position.y).forEach(adjPos => {
    const adjPositionKey = `${adjPos.x},${adjPos.y}`;
    const adjPosition = newPositions.get(adjPositionKey);

    if (adjPosition) {
      const adjCard = cards.get(adjPosition.cardId);
      if (adjCard) {
        const compatibility = checkCardCompatibility(card, adjCard);
        if (compatibility.environmental && (compatibility.foodchain || compatibility.scale)) {
          // Add bidirectional connection
          cardConnections.push(adjPosition.cardId);

          const adjConnections = newConnections.get(adjPosition.cardId) || [];
          adjConnections.push(card.id);
          newConnections.set(adjPosition.cardId, adjConnections);
        }
      }
    }
  });

  newConnections.set(card.id, cardConnections);

  return {
    success: true,
    updatedBoard: {
      positions: newPositions,
      connections: newConnections,
      homeCards: gameBoard.homeCards
    }
  };
}

/**
 * Gets adjacent cards at a specific position
 */
function getAdjacentCardsAtPosition(
  x: number,
  y: number,
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>
): Card[] {
  const adjacentCards: Card[] = [];

  getAdjacentPositions(x, y).forEach(pos => {
    const positionKey = `${pos.x},${pos.y}`;
    const cardPosition = gameBoard.positions.get(positionKey);
    if (cardPosition) {
      const card = cards.get(cardPosition.cardId);
      if (card) {
        adjacentCards.push(card);
      }
    }
  });

  return adjacentCards;
}

/**
 * Removes a card from the board and handles cascade effects
 */
export function removeCardFromBoard(
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>,
  cardId: string
): { success: boolean, updatedBoard: PhyloGameBoard, cascadeRemovals: string[] } {
  // Find the card position
  let cardPosition: PhyloCardPosition | null = null;
  let positionKey = '';

  for (const [key, position] of gameBoard.positions) {
    if (position.cardId === cardId) {
      cardPosition = position;
      positionKey = key;
      break;
    }
  }

  if (!cardPosition) {
    return {
      success: false,
      updatedBoard: gameBoard,
      cascadeRemovals: []
    };
  }

  // Create new board state
  const newPositions = new Map(gameBoard.positions);
  const newConnections = new Map(gameBoard.connections);
  const cascadeRemovals: string[] = [];

  // Remove the card
  newPositions.delete(positionKey);

  // Remove all connections to this card
  const cardConnections = newConnections.get(cardId) || [];
  cardConnections.forEach(connectedCardId => {
    const connectedCardConnections = newConnections.get(connectedCardId) || [];
    const updatedConnections = connectedCardConnections.filter(id => id !== cardId);
    newConnections.set(connectedCardId, updatedConnections);
  });

  newConnections.delete(cardId);

  // Check for cascade effects - cards that are now isolated or have broken food chains
  const tempBoard: PhyloGameBoard = {
    positions: newPositions,
    connections: newConnections,
    homeCards: gameBoard.homeCards
  };

  const network = analyzeEcosystemNetwork(tempBoard, cards);

  // Remove cards with broken connections
  network.chains.forEach(chain => {
    if (!chain.isValid) {
      chain.brokenConnections.forEach(brokenCardId => {
        if (!cascadeRemovals.includes(brokenCardId)) {
          cascadeRemovals.push(brokenCardId);

          // Find and remove the broken card
          for (const [key, position] of newPositions) {
            if (position.cardId === brokenCardId) {
              newPositions.delete(key);
              break;
            }
          }

          // Remove its connections
          const brokenCardConnections = newConnections.get(brokenCardId) || [];
          brokenCardConnections.forEach(connId => {
            const connConnections = newConnections.get(connId) || [];
            const updatedConnections = connConnections.filter(id => id !== brokenCardId);
            newConnections.set(connId, updatedConnections);
          });

          newConnections.delete(brokenCardId);
        }
      });
    }
  });

  return {
    success: true,
    updatedBoard: {
      positions: newPositions,
      connections: newConnections,
      homeCards: gameBoard.homeCards
    },
    cascadeRemovals
  };
}

/**
 * Moves a card to a new position (for MOVE/FLIGHT abilities)
 */
export function moveCardOnBoard(
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>,
  cardId: string,
  newPosition: { x: number, y: number }
): { success: boolean, updatedBoard: PhyloGameBoard, errorMessage?: string } {
  const card = cards.get(cardId);
  if (!card) {
    return {
      success: false,
      updatedBoard: gameBoard,
      errorMessage: 'Card not found'
    };
  }

  // Check if card can move
  const moveValue = card.phyloAttributes?.movementCapability.moveValue || 0;
  if (moveValue === 0) {
    return {
      success: false,
      updatedBoard: gameBoard,
      errorMessage: 'Card cannot move'
    };
  }

  // Find current position
  let currentPosition: PhyloCardPosition | null = null;
  let currentPositionKey = '';

  for (const [key, position] of gameBoard.positions) {
    if (position.cardId === cardId) {
      currentPosition = position;
      currentPositionKey = key;
      break;
    }
  }

  if (!currentPosition) {
    return {
      success: false,
      updatedBoard: gameBoard,
      errorMessage: 'Card not found on board'
    };
  }

  // Check movement distance
  const distance = Math.abs(newPosition.x - currentPosition.x) + Math.abs(newPosition.y - currentPosition.y);
  const canFly = card.phyloAttributes?.movementCapability.canFly || false;

  if (!canFly && distance > moveValue) {
    return {
      success: false,
      updatedBoard: gameBoard,
      errorMessage: `Card can only move ${moveValue} spaces`
    };
  }

  if (canFly) {
    const diagonalDistance = Math.max(
      Math.abs(newPosition.x - currentPosition.x),
      Math.abs(newPosition.y - currentPosition.y)
    );
    if (diagonalDistance > moveValue) {
      return {
        success: false,
        updatedBoard: gameBoard,
        errorMessage: `Card can only fly ${moveValue} spaces`
      };
    }
  }

  // Remove card from current position
  const removeResult = removeCardFromBoard(gameBoard, cards, cardId);
  if (!removeResult.success) {
    return {
      success: false,
      updatedBoard: gameBoard,
      errorMessage: 'Failed to remove card from current position'
    };
  }

  // Place card at new position
  const placeResult = placeCardOnBoard(
    removeResult.updatedBoard,
    cards,
    card,
    newPosition,
    currentPosition.playerId
  );

  return placeResult;
}