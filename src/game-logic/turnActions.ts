import { Card, PhyloGameBoard } from '../types';

/**
 * Turn-based action system for Phylo TCG
 */

export enum TurnActionType {
  PLAY_CARD = 'play_card',
  DROP_AND_DRAW = 'drop_and_draw',
  MOVE_CARD = 'move_card',
  PASS = 'pass'
}

export interface TurnAction {
  type: TurnActionType;
  cardId?: string;
  position?: { x: number; y: number };
  targetPosition?: { x: number; y: number };
}

export interface TurnState {
  playerId: string;
  actionsRemaining: number;
  maxActions: number;
  hasDrawnCard: boolean;
  canEndTurn: boolean;
}

export interface ActionValidation {
  isValid: boolean;
  errorMessage?: string;
  cost: number; // Number of actions this will consume
}

/**
 * Validates if a turn action can be performed
 */
export function validateTurnAction(
  action: TurnAction,
  turnState: TurnState,
  gameBoard: PhyloGameBoard,
  playerHand: string[],
  playerDeck: string[],
  allCards: Map<string, Card>
): ActionValidation {
  
  // Check if player has actions remaining
  if (turnState.actionsRemaining <= 0) {
    return {
      isValid: false,
      errorMessage: 'No actions remaining this turn',
      cost: 1
    };
  }

  switch (action.type) {
    case TurnActionType.PLAY_CARD:
      return validatePlayCard(action, turnState, gameBoard, playerHand, allCards);
      
    case TurnActionType.DROP_AND_DRAW:
      return validateDropAndDraw(action, turnState, playerHand, playerDeck);
      
    case TurnActionType.MOVE_CARD:
      return validateMoveCard(action, turnState, gameBoard, allCards);
      
    case TurnActionType.PASS:
      return validatePass(action, turnState);
      
    default:
      return {
        isValid: false,
        errorMessage: 'Unknown action type',
        cost: 1
      };
  }
}

/**
 * Validates playing a card from hand
 */
function validatePlayCard(
  action: TurnAction,
  turnState: TurnState,
  gameBoard: PhyloGameBoard,
  playerHand: string[],
  allCards: Map<string, Card>
): ActionValidation {
  
  if (!action.cardId) {
    return {
      isValid: false,
      errorMessage: 'No card specified',
      cost: 1
    };
  }

  // Check if card is in player's hand
  if (!playerHand.includes(action.cardId)) {
    return {
      isValid: false,
      errorMessage: 'Card not in hand',
      cost: 1
    };
  }

  // Check if position is specified
  if (!action.position) {
    return {
      isValid: false,
      errorMessage: 'No position specified',
      cost: 1
    };
  }

  // Check if position is valid (would need full placement validation here)
  const positionKey = `${action.position.x},${action.position.y}`;
  if (gameBoard.positions.has(positionKey)) {
    return {
      isValid: false,
      errorMessage: 'Position already occupied',
      cost: 1
    };
  }

  return {
    isValid: true,
    cost: 1
  };
}

/**
 * Validates dropping a card and drawing 3 new ones
 */
function validateDropAndDraw(
  action: TurnAction,
  turnState: TurnState,
  playerHand: string[],
  playerDeck: string[]
): ActionValidation {
  
  if (!action.cardId) {
    return {
      isValid: false,
      errorMessage: 'No card specified to drop',
      cost: 1
    };
  }

  // Check if card is in player's hand
  if (!playerHand.includes(action.cardId)) {
    return {
      isValid: false,
      errorMessage: 'Card not in hand',
      cost: 1
    };
  }

  // Check if deck has enough cards
  if (playerDeck.length < 3) {
    return {
      isValid: false,
      errorMessage: 'Not enough cards in deck to draw 3',
      cost: 1
    };
  }

  return {
    isValid: true,
    cost: 1
  };
}

/**
 * Validates moving a card on the board
 */
function validateMoveCard(
  action: TurnAction,
  turnState: TurnState,
  gameBoard: PhyloGameBoard,
  allCards: Map<string, Card>
): ActionValidation {
  
  if (!action.cardId) {
    return {
      isValid: false,
      errorMessage: 'No card specified to move',
      cost: 1
    };
  }

  if (!action.targetPosition) {
    return {
      isValid: false,
      errorMessage: 'No target position specified',
      cost: 1
    };
  }

  // Find the card on the board
  const cardPosition = Array.from(gameBoard.positions.values())
    .find(pos => pos.cardId === action.cardId);
    
  if (!cardPosition) {
    return {
      isValid: false,
      errorMessage: 'Card not found on board',
      cost: 1
    };
  }

  // Check if target position is occupied
  const targetKey = `${action.targetPosition.x},${action.targetPosition.y}`;
  if (gameBoard.positions.has(targetKey)) {
    return {
      isValid: false,
      errorMessage: 'Target position already occupied',
      cost: 1
    };
  }

  // Get the card and check movement capability
  const card = allCards.get(action.cardId);
  if (!card) {
    return {
      isValid: false,
      errorMessage: 'Card data not found',
      cost: 1
    };
  }

  const moveValue = card.phyloAttributes?.movementCapability?.moveValue || 1;
  const canFly = card.phyloAttributes?.movementCapability?.canFly || false;

  // Calculate distance
  const distance = canFly 
    ? Math.max(Math.abs(action.targetPosition.x - cardPosition.x), Math.abs(action.targetPosition.y - cardPosition.y))
    : Math.abs(action.targetPosition.x - cardPosition.x) + Math.abs(action.targetPosition.y - cardPosition.y);

  if (distance > moveValue) {
    return {
      isValid: false,
      errorMessage: `Movement distance (${distance}) exceeds card's movement value (${moveValue})`,
      cost: 1
    };
  }

  return {
    isValid: true,
    cost: 1
  };
}

/**
 * Validates passing (ending turn early)
 */
function validatePass(
  action: TurnAction,
  turnState: TurnState
): ActionValidation {
  
  return {
    isValid: true,
    cost: turnState.actionsRemaining // Pass consumes all remaining actions
  };
}

/**
 * Creates initial turn state for a player
 */
export function createTurnState(playerId: string): TurnState {
  return {
    playerId,
    actionsRemaining: 3,
    maxActions: 3,
    hasDrawnCard: false,
    canEndTurn: true
  };
}

/**
 * Handles start-of-turn card draw
 */
export function handleStartOfTurnDraw(turnState: TurnState): TurnState {
  if (turnState.hasDrawnCard) {
    return turnState; // Already drawn this turn
  }

  return {
    ...turnState,
    hasDrawnCard: true
  };
}

/**
 * Updates turn state after an action is performed
 */
export function updateTurnState(
  turnState: TurnState,
  action: TurnAction,
  actionCost: number
): TurnState {
  
  const newState = { ...turnState };
  
  // Consume actions
  newState.actionsRemaining = Math.max(0, newState.actionsRemaining - actionCost);
  
  // Special handling for different action types
  switch (action.type) {
    case TurnActionType.DROP_AND_DRAW:
      // This action involves drawing cards
      break;
      
    case TurnActionType.PASS:
      // Pass ends the turn immediately
      newState.actionsRemaining = 0;
      break;
  }
  
  return newState;
}

/**
 * Checks if turn should end automatically
 */
export function shouldEndTurn(turnState: TurnState): boolean {
  return turnState.actionsRemaining <= 0;
}

/**
 * Gets available actions for current turn state
 */
export function getAvailableActions(
  turnState: TurnState,
  gameBoard: PhyloGameBoard,
  playerHand: string[],
  playerDeck: string[],
  allCards: Map<string, Card>
): {
  canPlayCards: string[];
  canDropCards: string[];
  canMoveCards: string[];
  canPass: boolean;
} {
  
  const result = {
    canPlayCards: [] as string[],
    canDropCards: [] as string[],
    canMoveCards: [] as string[],
    canPass: true
  };

  if (turnState.actionsRemaining <= 0) {
    return result;
  }

  // Check which cards can be played
  playerHand.forEach(cardId => {
    const playAction: TurnAction = {
      type: TurnActionType.PLAY_CARD,
      cardId,
      position: { x: 0, y: 0 } // Placeholder position
    };
    
    const validation = validateTurnAction(playAction, turnState, gameBoard, playerHand, playerDeck, allCards);
    if (validation.isValid || validation.errorMessage === 'Position already occupied') {
      // Card can be played, just need valid position
      result.canPlayCards.push(cardId);
    }
  });

  // Check which cards can be dropped
  if (playerDeck.length >= 3) {
    result.canDropCards = [...playerHand];
  }

  // Check which cards can be moved
  gameBoard.positions.forEach((position, positionKey) => {
    if (position.playerId === turnState.playerId) {
      const moveAction: TurnAction = {
        type: TurnActionType.MOVE_CARD,
        cardId: position.cardId,
        targetPosition: { x: 0, y: 0 } // Placeholder position
      };
      
      const validation = validateTurnAction(moveAction, turnState, gameBoard, playerHand, playerDeck, allCards);
      if (validation.isValid || validation.errorMessage === 'Target position already occupied') {
        // Card can be moved, just need valid target
        result.canMoveCards.push(position.cardId);
      }
    }
  });

  return result;
}
