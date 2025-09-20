import {
  Card,
  PhyloGameBoard,
  PhyloCardPosition,
  TrophicRole,
  Habitat,
  createCardWithDefaults,
  TurnAction,
  TurnResult,
  mapActionType
} from '../types';
import {
  ConservationStatus,
  PhyloGameState,
  PhyloPlayer,
  PhyloGameSettings,
  GameAction,
  GameActionType
} from '@kelseyabreu/shared';
import { validateCardPlacement } from './phyloCompatibility';
import { placeCardOnBoard, removeCardFromBoard } from './ecosystemBuilder';
import { executeCardMovement, validateCardMovement } from './cardMovement';
import { executeEventCard, getRandomEventCard, EventCard } from './eventCards';
import { calculatePlayerScore, determineWinCondition, ScientificChallenge, createScientificChallenge, resolveScientificChallenge } from './phyloScoring';

/**
 * Extended GameAction for frontend use with success/error tracking
 */
interface FrontendGameAction extends GameAction {
  success: boolean;
  error?: string;
}

/**
 * Game State Management for Phylo domino-style gameplay
 *
 * Note: Now uses shared types from @kelseyabreu/shared'place_card' | 'move_card' | 'challenge' | 'pass_turn' | 'drop_and_draw';
  cardId?: string;
  position?: { x: number; y: number };
  targetPosition?: { x: number; y: number };
  challengeData?: {
    targetCardId: string;
    targetPlayerId: string;
    claimType: ScientificChallenge['claimType'];
    evidence: string;
  };
}

export interface TurnResult {
  success: boolean;
  newGameState: PhyloGameState;
  action: FrontendGameAction;
  nextPlayer?: string;
  gameEnded?: boolean;
  winCondition?: any;
  errorMessage?: string;
}

/**
 * Creates HOME cards for each player
 */
function createHomeCard(playerId: string, playerIndex: number): Card {
  return createCardWithDefaults({
    cardId: 0, // HOME cards have special cardId 0
    nameId: 'HOME',
    id: `home_${playerId}`,
    scientificNameId: 'BASE_CAMP',
    descriptionId: 'DESC_HOME',
    taxonomyId: 'TAXONOMY_HOME',
    description: 'Starting position for each player',
    trophicRole: TrophicRole.PRODUCER,
    habitat: Habitat.TEMPERATE,
    power: 0,
    health: 1,
    maxHealth: 1,
    speed: 0,
    senses: 0,
    energyCost: 0,
    conservationStatus: ConservationStatus.NOT_EVALUATED,
    phyloAttributes: {
      terrains: ['Forest', 'Grassland', 'Ocean', 'Desert', 'Arctic', 'Mountain'], // Compatible with all terrains
      climates: ['Cool', 'Warm', 'Hot', 'Cold'], // Compatible with all climates
      foodchainLevel: 0, // Special level for HOME cards
      scale: 0,
      dietType: 'Producer',
      movementCapability: {
        moveValue: 0,
        canFly: false,
        canSwim: false,
        canBurrow: false
      },
      specialKeywords: ['HOME'],
      pointValue: 0,
      conservationStatus: 'Not Applicable',
      compatibilityNotes: 'HOME card - compatible with all FC#1 cards'
    }
  });
}

/**
 * Creates a new game state with 8x8 grid and HOME cards
 */
export function createGameState(
  gameId: string,
  players: Omit<PhyloPlayer, 'hand' | 'deck' | 'discardPile' | 'score' | 'isReady'>[],
  allCards: Map<string, Card>,
  settings: PhyloGameSettings
): PhyloGameState {
  // Initialize players with hands and decks
  const initializedPlayers: PhyloPlayer[] = players.map(player => {
    const availableCards = Array.from(allCards.keys());
    const shuffledCards = shuffleArray([...availableCards]);

    return {
      ...player,
      hand: shuffledCards.slice(0, settings.startingHandSize),
      deck: shuffledCards.slice(settings.startingHandSize, settings.startingHandSize + settings.deckSize),
      discardPile: [],
      score: 0,
      isReady: false
    };
  });

  // Create HOME cards for each player
  const homeCard1 = createHomeCard(initializedPlayers[0].id, 0);
  const homeCard2 = createHomeCard(initializedPlayers[1].id, 1);

  // Add HOME cards to the card collection
  const gameCards = new Map(allCards);
  gameCards.set(homeCard1.id, homeCard1);
  gameCards.set(homeCard2.id, homeCard2);

  // Initialize 9x10 game board with HOME cards in the center
  const gameBoard: PhyloGameBoard = {
    positions: new Map(),
    connections: new Map(),
    homeCards: []
  };

  // Place HOME cards adjacent to each other in the center of 9x10 grid
  // Grid coordinates: rows 0-8, cols 0-9, so center is (4,4) and (5,4)
  const homePosition1: PhyloCardPosition = {
    x: 4,
    y: 4,
    cardId: homeCard1.id,
    playerId: initializedPlayers[0].id
  };

  const homePosition2: PhyloCardPosition = {
    x: 5,
    y: 4,
    cardId: homeCard2.id,
    playerId: initializedPlayers[1].id
  };

  // Add HOME cards to board
  gameBoard.positions.set('4,4', homePosition1);
  gameBoard.positions.set('5,4', homePosition2);
  gameBoard.homeCards = [homePosition1, homePosition2];

  // Connect the HOME cards
  gameBoard.connections.set(homeCard1.id, [homeCard2.id]);
  gameBoard.connections.set(homeCard2.id, [homeCard1.id]);

  return {
    gameId,
    players: initializedPlayers,
    currentPlayerIndex: 0,
    gameBoard,
    cards: gameCards,
    gamePhase: 'setup',
    turnNumber: 0,
    actionHistory: [],
    pendingChallenges: [],
    eventDeck: shuffleArray([...Array(10)].map(() => getRandomEventCard(gameBoard, gameCards))).filter(Boolean) as EventCard[],
    gameSettings: settings,
    metadata: {
      createdAt: new Date(),
      startedAt: new Date()
    },
    gameStats: {
      gameStartTime: Date.now(),
      totalTurns: 0,
      cardsPlayed: 0,
      eventsTriggered: 0
    }
  };
}

/**
 * Executes a player's turn action
 */
export function executeTurnAction(
  gameState: PhyloGameState,
  playerId: string,
  action: TurnAction
): TurnResult {
  // Validate it's the player's turn
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (currentPlayer.id !== playerId) {
    return {
      success: false,
      newGameState: gameState,
      action: createFailedAction(playerId, mapActionType(action.type), 'Not your turn'),
      errorMessage: 'Not your turn'
    };
  }

  // Validate game phase
  if (gameState.gamePhase !== 'playing') {
    return {
      success: false,
      newGameState: gameState,
      action: createFailedAction(playerId, mapActionType(action.type), 'Invalid game phase'),
      errorMessage: 'Invalid game phase'
    };
  }

  let newGameState = { ...gameState };
  let actionResult: GameAction;

  switch (action.type) {
    case 'PLACE_CARD':
      const placeResult = handlePlaceCard(newGameState, playerId, action.cardId!, action.targetPosition!);
      newGameState = placeResult.gameState;
      actionResult = placeResult.action;
      break;

    case 'MOVE_CARD':
      const moveResult = handleMoveCard(newGameState, playerId, action.cardId!, action.targetPosition!);
      newGameState = moveResult.gameState;
      actionResult = moveResult.action;
      break;

    case 'CHALLENGE':
      const challengeResult = handleChallenge(newGameState, playerId, action.challengeData!);
      newGameState = challengeResult.gameState;
      actionResult = challengeResult.action;
      break;

    case 'PASS':
    case 'END_TURN':
      actionResult = createSuccessAction(playerId, GameActionType.PASS_TURN, {});
      break;

    case 'ACTIVATE_ABILITY':
      // TODO: Implement ability activation
      actionResult = createSuccessAction(playerId, GameActionType.ACTIVATE_ABILITY, {});
      break;

    default:
      return {
        success: false,
        newGameState: gameState,
        action: createFailedAction(playerId, mapActionType(action.type), 'Unknown action type'),
        errorMessage: 'Unknown action type'
      };
  }

  // Add action to history
  newGameState.actionHistory.push(actionResult);

  // Check for game end conditions
  const winCondition = determineWinCondition(
    newGameState.gameBoard,
    newGameState.cards,
    newGameState.players.map(p => p.id),
    {
      ...newGameState.gameStats,
      maxTurns: newGameState.gameSettings.maxTurns,
      timeLimit: newGameState.gameSettings.gameTimeLimit,
      gameStartTime: newGameState.gameStats.gameStartTime
    },
    newGameState.pendingChallenges
  );

  if (winCondition) {
    newGameState.gamePhase = 'game_over';
    return {
      success: true,
      newGameState: newGameState,
      action: actionResult,
      gameEnded: true,
      winCondition
    };
  }

  // Advance to next turn if action was successful
  if ((actionResult as FrontendGameAction).success) {
    const nextTurnResult = advanceToNextTurn(newGameState);
    newGameState = nextTurnResult.gameState;

    return {
      success: true,
      newGameState: newGameState,
      action: actionResult,
      nextPlayer: nextTurnResult.nextPlayer,
      gameEnded: nextTurnResult.gameEnded,
      winCondition: nextTurnResult.winCondition
    };
  }

  return {
    success: false,
    newGameState: newGameState,
    action: actionResult,
    errorMessage: (actionResult as FrontendGameAction).error || 'Action failed'
  };
}

/**
 * Helper function to shuffle an array
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Creates a successful action
 */
function createSuccessAction(playerId: string, type: GameActionType, data: any): FrontendGameAction {
  return {
    id: generateActionId(),
    playerId,
    type,
    timestamp: new Date(),
    payload: data,
    success: true
  };
}

/**
 * Creates a failed action
 */
function createFailedAction(playerId: string, type: GameActionType, errorMessage: string): FrontendGameAction {
  return {
    id: generateActionId(),
    playerId,
    type,
    timestamp: new Date(),
    payload: {},
    success: false,
    error: errorMessage
  };
}

/**
 * Generates a unique action ID
 */
function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Handles dropping a card and drawing 3 new ones
 */
function handleDropAndDraw(
  gameState: PhyloGameState,
  playerId: string,
  cardId: string
): { gameState: PhyloGameState; action: GameAction } {
  const newGameState = { ...gameState };
  const playerIndex = newGameState.players.findIndex(p => p.id === playerId);

  if (playerIndex === -1) {
    return {
      gameState,
      action: createFailedAction(playerId, GameActionType.DROP_AND_DRAW_THREE, 'Player not found')
    };
  }

  const player = { ...newGameState.players[playerIndex] };

  // Check if card is in hand
  if (!player.hand.includes(cardId)) {
    return {
      gameState,
      action: createFailedAction(playerId, GameActionType.DROP_AND_DRAW_THREE, 'Card not in hand')
    };
  }

  // Check if deck has at least 3 cards
  if (player.deck.length < 3) {
    return {
      gameState,
      action: createFailedAction(playerId, GameActionType.DROP_AND_DRAW_THREE, 'Not enough cards in deck')
    };
  }

  // Remove card from hand
  player.hand = player.hand.filter(id => id !== cardId);

  // Add card to discard pile
  player.discardPile = [...player.discardPile, cardId];

  // Draw 3 cards from deck
  const drawnCards = player.deck.slice(0, 3);
  player.deck = player.deck.slice(3);
  player.hand = [...player.hand, ...drawnCards];

  // Update player in game state
  newGameState.players[playerIndex] = player;

  return {
    gameState: newGameState,
    action: createSuccessAction(playerId, GameActionType.DROP_AND_DRAW_THREE, {
      droppedCard: cardId,
      drawnCards
    })
  };
}

/**
 * Handles placing a card on the board
 */
function handlePlaceCard(
  gameState: PhyloGameState,
  playerId: string,
  cardId: string,
  position: { x: number; y: number }
): { gameState: PhyloGameState; action: GameAction } {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) {
    return {
      gameState,
      action: createFailedAction(playerId, GameActionType.PLAY_CARD, 'Player not found')
    };
  }

  // Check if player has the card in hand
  if (!player.hand.includes(cardId)) {
    return {
      gameState,
      action: createFailedAction(playerId, GameActionType.PLAY_CARD, 'Card not in hand')
    };
  }

  const card = gameState.cards.get(cardId);
  if (!card) {
    return {
      gameState,
      action: createFailedAction(playerId, GameActionType.PLAY_CARD, 'Card not found')
    };
  }

  // Attempt to place the card
  const placeResult = placeCardOnBoard(gameState.gameBoard, gameState.cards, card, position, playerId);

  if (!placeResult.success) {
    return {
      gameState,
      action: createFailedAction(playerId, GameActionType.PLAY_CARD, placeResult.errorMessage || 'Failed to place card')
    };
  }

  // Update game state
  const newGameState = { ...gameState };
  newGameState.gameBoard = placeResult.updatedBoard;

  // Remove card from player's hand
  const playerIndex = newGameState.players.findIndex(p => p.id === playerId);
  newGameState.players[playerIndex] = {
    ...newGameState.players[playerIndex],
    hand: newGameState.players[playerIndex].hand.filter(id => id !== cardId)
  };

  // Draw a new card if deck has cards
  if (newGameState.players[playerIndex].deck.length > 0) {
    const newCard = newGameState.players[playerIndex].deck.pop()!;
    newGameState.players[playerIndex].hand.push(newCard);
  }

  // Update stats
  newGameState.gameStats.cardsPlayed++;

  return {
    gameState: newGameState,
    action: createSuccessAction(playerId, GameActionType.PLAY_CARD, { cardId, position })
  };
}

/**
 * Handles moving a card on the board
 */
function handleMoveCard(
  gameState: PhyloGameState,
  playerId: string,
  cardId: string,
  targetPosition: { x: number; y: number }
): { gameState: PhyloGameState; action: GameAction } {
  // Find the card's current position
  let currentPosition: PhyloCardPosition | null = null;
  for (const position of gameState.gameBoard.positions.values()) {
    if (position.cardId === cardId && position.playerId === playerId) {
      currentPosition = position;
      break;
    }
  }

  if (!currentPosition) {
    return {
      gameState,
      action: createFailedAction(playerId, GameActionType.MOVE_CARD, 'Card not found or not owned by player')
    };
  }

  // Attempt to move the card
  const moveResult = executeCardMovement(gameState.gameBoard, gameState.cards, cardId, targetPosition);

  if (!moveResult.success) {
    return {
      gameState,
      action: createFailedAction(playerId, GameActionType.MOVE_CARD, moveResult.errorMessage || 'Failed to move card')
    };
  }

  // Update game state
  const newGameState = { ...gameState };
  newGameState.gameBoard = moveResult.updatedBoard;

  return {
    gameState: newGameState,
    action: createSuccessAction(playerId, GameActionType.MOVE_CARD, {
      cardId,
      from: { x: currentPosition.x, y: currentPosition.y },
      to: targetPosition,
      animation: moveResult.animation
    })
  };
}

/**
 * Handles creating a scientific challenge
 */
function handleChallenge(
  gameState: PhyloGameState,
  playerId: string,
  challengeData: {
    targetCardId: string;
    targetPlayerId: string;
    claimType: ScientificChallenge['claimType'];
    evidence: string;
  }
): { gameState: PhyloGameState; action: GameAction } {
  if (!gameState.gameSettings.allowChallenges) {
    return {
      gameState,
      action: createFailedAction(playerId, GameActionType.CHALLENGE, 'Challenges not allowed in this game')
    };
  }

  // Create the challenge
  const challenge = createScientificChallenge(
    playerId,
    challengeData.targetCardId,
    challengeData.targetPlayerId,
    challengeData.claimType,
    challengeData.evidence
  );

  // Update game state
  const newGameState = { ...gameState };
  newGameState.pendingChallenges.push(challenge);
  newGameState.gamePhase = 'challenge_phase';

  return {
    gameState: newGameState,
    action: createSuccessAction(playerId, GameActionType.CHALLENGE, challengeData)
  };
}

/**
 * Advances to the next turn
 */
function advanceToNextTurn(gameState: PhyloGameState): {
  gameState: PhyloGameState;
  nextPlayer?: string;
  gameEnded?: boolean;
  winCondition?: any;
} {
  const newGameState = { ...gameState };

  // Advance to next player
  newGameState.currentPlayerIndex = (newGameState.currentPlayerIndex + 1) % newGameState.players.length;

  // If we've cycled back to the first player, increment turn number
  if (newGameState.currentPlayerIndex === 0) {
    newGameState.turnNumber++;
    newGameState.gameStats.totalTurns++;
  }

  // Check for random events
  if (Math.random() < newGameState.gameSettings.eventFrequency && newGameState.eventDeck.length > 0) {
    const eventCard = newGameState.eventDeck.pop()!;
    const eventResult = executeEventCard(newGameState.gameBoard, newGameState.cards, eventCard, 'system');

    if (eventResult.success) {
      newGameState.gameBoard = eventResult.updatedBoard;
      newGameState.gameStats.eventsTriggered++;

      // Add event to action history
      newGameState.actionHistory.push(createSuccessAction('system', GameActionType.ACTIVATE_ABILITY, {
        eventCard,
        result: eventResult
      }));

      // Check if event creates reaction opportunities
      if (eventResult.reactionOpportunities.length > 0) {
        newGameState.gamePhase = 'event_reaction';
      }
    }
  }

  // Update player scores
  newGameState.players.forEach((player, index) => {
    const score = calculatePlayerScore(
      newGameState.gameBoard,
      newGameState.cards,
      player.id,
      newGameState.pendingChallenges
    );
    newGameState.players[index].score = score.totalPoints;
  });

  return {
    gameState: newGameState,
    nextPlayer: newGameState.players[newGameState.currentPlayerIndex].id
  };
}

/**
 * Starts the game (transitions from setup to playing)
 */
export function startGame(gameState: PhyloGameState): PhyloGameState {
  if (gameState.gamePhase !== 'setup') {
    throw new Error('Game is not in setup phase');
  }

  // Check if all players are ready
  const allReady = gameState.players.every(player => player.isReady);
  if (!allReady) {
    throw new Error('Not all players are ready');
  }

  const newGameState = { ...gameState };
  newGameState.gamePhase = 'playing';
  newGameState.gameStats.gameStartTime = Date.now();

  return newGameState;
}

/**
 * Sets a player as ready
 */
export function setPlayerReady(gameState: PhyloGameState, playerId: string, ready: boolean): PhyloGameState {
  const newGameState = { ...gameState };
  const playerIndex = newGameState.players.findIndex(p => p.id === playerId);

  if (playerIndex === -1) {
    throw new Error('Player not found');
  }

  newGameState.players[playerIndex] = {
    ...newGameState.players[playerIndex],
    isReady: ready
  };

  return newGameState;
}

/**
 * Resolves a pending challenge
 */
export function resolveChallenge(
  gameState: PhyloGameState,
  challengeId: string,
  response?: string
): PhyloGameState {
  const newGameState = { ...gameState };
  const challengeIndex = newGameState.pendingChallenges.findIndex(c =>
    c.challengerId + c.targetCardId === challengeId
  );

  if (challengeIndex === -1) {
    throw new Error('Challenge not found');
  }

  const challenge = newGameState.pendingChallenges[challengeIndex];
  const targetCard = newGameState.cards.get(challenge.targetCardId);

  if (!targetCard) {
    throw new Error('Target card not found');
  }

  // Resolve the challenge
  const resolvedChallenge = resolveScientificChallenge(challenge, targetCard, response);
  newGameState.pendingChallenges[challengeIndex] = resolvedChallenge;

  // If all challenges are resolved, return to playing phase
  const unresolvedChallenges = newGameState.pendingChallenges.filter(c => !c.resolved);
  if (unresolvedChallenges.length === 0) {
    newGameState.gamePhase = 'playing';
  }

  return newGameState;
}

/**
 * Gets the current game status
 */
export function getGameStatus(gameState: PhyloGameState): {
  currentPlayer: PhyloPlayer;
  scores: Array<{ playerId: string; score: number; rank: number }>;
  gamePhase: PhyloGameState['gamePhase'];
  turnNumber: number;
  timeRemaining?: number;
} {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  // Calculate scores and rankings
  const scores = gameState.players
    .map(player => ({
      playerId: player.id,
      score: player.score,
      rank: 0
    }))
    .sort((a, b) => b.score - a.score)
    .map((player, index) => ({
      ...player,
      rank: index + 1
    }));

  // Calculate time remaining if there's a game time limit
  let timeRemaining: number | undefined;
  if (gameState.gameSettings.gameTimeLimit) {
    const elapsed = Date.now() - gameState.gameStats.gameStartTime;
    timeRemaining = Math.max(0, gameState.gameSettings.gameTimeLimit - elapsed);
  }

  return {
    currentPlayer,
    scores,
    gamePhase: gameState.gamePhase,
    turnNumber: gameState.turnNumber,
    timeRemaining
  };
}

/**
 * Gets valid actions for the current player
 */
export function getValidActions(gameState: PhyloGameState, playerId: string): {
  canPlaceCards: string[];
  canMoveCards: string[];
  canChallenge: boolean;
  canPass: boolean;
} {
  const player = gameState.players.find(p => p.id === playerId);
  const isCurrentPlayer = gameState.players[gameState.currentPlayerIndex].id === playerId;

  if (!player || !isCurrentPlayer || gameState.gamePhase !== 'playing') {
    return {
      canPlaceCards: [],
      canMoveCards: [],
      canChallenge: false,
      canPass: false
    };
  }

  // Get cards that can be placed
  const canPlaceCards = player.hand.filter(cardId => {
    const card = gameState.cards.get(cardId);
    if (!card) return false;

    // Check if there are any valid positions for this card
    // This is a simplified check - in a real implementation, you'd check all possible positions
    return true;
  });

  // Get cards that can be moved
  const canMoveCards: string[] = [];
  gameState.gameBoard.positions.forEach((position: any) => {
    if (position.playerId === playerId) {
      const card = gameState.cards.get(position.cardId);
      if (card?.phyloAttributes?.movementCapability &&
          card.phyloAttributes.movementCapability.moveValue > 0) {
        canMoveCards.push(position.cardId);
      }
    }
  });

  return {
    canPlaceCards,
    canMoveCards,
    canChallenge: gameState.gameSettings.allowChallenges,
    canPass: true
  };
}