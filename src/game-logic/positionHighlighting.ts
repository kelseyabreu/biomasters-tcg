import { Card, PhyloGameBoard, PhyloCardPosition } from '../types';
import { validateCardPlacement } from './phyloCompatibility';

/**
 * Position highlighting system for card placement
 */

export interface HighlightedPosition {
  x: number;
  y: number;
  type: 'valid' | 'invalid';
  reason?: string;
}

export interface PlacementHighlights {
  validPositions: HighlightedPosition[];
  invalidPositions: HighlightedPosition[];
}

/**
 * Gets all adjacent cards for a given position
 */
function getAdjacentCards(
  x: number, 
  y: number, 
  gameBoard: PhyloGameBoard, 
  cards: Map<string, Card>
): Card[] {
  const adjacentPositions = [
    { x: x - 1, y },     // Left
    { x: x + 1, y },     // Right
    { x, y: y - 1 },     // Up
    { x, y: y + 1 }      // Down
  ];

  const adjacentCards: Card[] = [];

  for (const pos of adjacentPositions) {
    const positionKey = `${pos.x},${pos.y}`;
    const cardPosition = gameBoard.positions.get(positionKey);
    
    if (cardPosition) {
      const card = cards.get(cardPosition.cardId);
      if (card) {
        adjacentCards.push(card);
      }
    }
  }

  return adjacentCards;
}

/**
 * Calculates valid and invalid positions for placing a card
 */
export function calculatePlacementHighlights(
  selectedCard: Card,
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>,
  boardRows: number = 9,
  boardCols: number = 10
): PlacementHighlights {
  const validPositions: HighlightedPosition[] = [];
  const invalidPositions: HighlightedPosition[] = [];

  // Check all positions on the 9x10 board
  for (let y = 0; y < boardRows; y++) {
    for (let x = 0; x < boardCols; x++) {
      const positionKey = `${x},${y}`;
      
      // Skip if position is already occupied
      if (gameBoard.positions.has(positionKey)) {
        continue;
      }

      // Get adjacent cards
      const adjacentCards = getAdjacentCards(x, y, gameBoard, cards);
      
      // If no adjacent cards, position is invalid (except for first placement)
      if (adjacentCards.length === 0) {
        // Only allow placement if there are no cards on the board yet
        if (gameBoard.positions.size === 0) {
          validPositions.push({ x, y, type: 'valid', reason: 'First card placement' });
        } else {
          invalidPositions.push({ 
            x, y, 
            type: 'invalid', 
            reason: 'Must be adjacent to existing cards' 
          });
        }
        continue;
      }

      // Validate placement using compatibility rules
      const validation = validateCardPlacement(selectedCard, adjacentCards);
      
      if (validation.isValid) {
        validPositions.push({ 
          x, y, 
          type: 'valid', 
          reason: 'Compatible placement' 
        });
      } else {
        invalidPositions.push({ 
          x, y, 
          type: 'invalid', 
          reason: validation.errorMessage || 'Incompatible placement' 
        });
      }
    }
  }

  return { validPositions, invalidPositions };
}

/**
 * Calculates movement highlights for a card (for MOVE action)
 */
export function calculateMovementHighlights(
  cardToMove: Card,
  currentPosition: { x: number; y: number },
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>,
  boardRows: number = 9,
  boardCols: number = 10
): PlacementHighlights {
  const validPositions: HighlightedPosition[] = [];
  const invalidPositions: HighlightedPosition[] = [];

  const moveValue = cardToMove.phyloAttributes?.movementCapability?.moveValue || 1;
  const canFly = cardToMove.phyloAttributes?.movementCapability?.canFly || false;

  // Calculate all positions within movement range
  for (let y = 0; y < boardRows; y++) {
    for (let x = 0; x < boardCols; x++) {
      // Skip current position
      if (x === currentPosition.x && y === currentPosition.y) {
        continue;
      }

      const positionKey = `${x},${y}`;
      
      // Skip if position is already occupied
      if (gameBoard.positions.has(positionKey)) {
        continue;
      }

      // Calculate distance
      const distance = canFly 
        ? Math.max(Math.abs(x - currentPosition.x), Math.abs(y - currentPosition.y)) // Diagonal movement allowed
        : Math.abs(x - currentPosition.x) + Math.abs(y - currentPosition.y); // Manhattan distance

      // Check if within movement range
      if (distance > moveValue) {
        invalidPositions.push({ 
          x, y, 
          type: 'invalid', 
          reason: `Too far (${distance} > ${moveValue} movement)` 
        });
        continue;
      }

      // Create a temporary board state without the moving card
      const tempBoard: PhyloGameBoard = {
        positions: new Map(gameBoard.positions),
        connections: new Map(gameBoard.connections),
        homeCards: gameBoard.homeCards
      };
      
      // Remove the card from its current position
      const currentPositionKey = `${currentPosition.x},${currentPosition.y}`;
      tempBoard.positions.delete(currentPositionKey);

      // Get adjacent cards at the new position
      const adjacentCards = getAdjacentCards(x, y, tempBoard, cards);
      
      // Must be adjacent to at least one compatible card
      if (adjacentCards.length === 0) {
        invalidPositions.push({ 
          x, y, 
          type: 'invalid', 
          reason: 'Must be adjacent to existing cards' 
        });
        continue;
      }

      // Validate placement using compatibility rules
      const validation = validateCardPlacement(cardToMove, adjacentCards);
      
      if (validation.isValid) {
        validPositions.push({ 
          x, y, 
          type: 'valid', 
          reason: `Valid move (${distance} movement)` 
        });
      } else {
        invalidPositions.push({ 
          x, y, 
          type: 'invalid', 
          reason: validation.errorMessage || 'Incompatible placement' 
        });
      }
    }
  }

  return { validPositions, invalidPositions };
}

/**
 * Converts highlights to the format expected by the board component
 */
export function convertHighlightsToPositions(highlights: PlacementHighlights): Array<{ x: number; y: number; type: 'valid' | 'invalid' }> {
  return [
    ...highlights.validPositions.map(pos => ({ x: pos.x, y: pos.y, type: 'valid' as const })),
    ...highlights.invalidPositions.map(pos => ({ x: pos.x, y: pos.y, type: 'invalid' as const }))
  ];
}
