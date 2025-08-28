import { GameState, Player, Card, Deck, GamePhase, Habitat, CombatEvent } from '../types';
import { resolveCombat, applyDamage, isCardDestroyed } from './combatSystem';
import { checkGameWinner, checkAllWinConditions } from './winConditions';
import { v4 as uuidv4 } from 'uuid';

/**
 * Creates a new game state
 */
export function createGameState(player1Deck: Deck, player2Deck: Deck): GameState {
  // Randomly select environment
  const environments = [Habitat.TUNDRA, Habitat.TEMPERATE, Habitat.TROPICAL];
  const environment = environments[Math.floor(Math.random() * environments.length)];
  
  // Create players
  const player1: Player = {
    id: uuidv4(),
    name: 'Player 1',
    deck: player1Deck,
    hand: [],
    field: [],
    energy: 3,
    maxEnergy: 3,
    playedSpecies: new Set()
  };
  
  const player2: Player = {
    id: uuidv4(),
    name: 'Player 2',
    deck: player2Deck,
    hand: [],
    field: [],
    energy: 3,
    maxEnergy: 3,
    playedSpecies: new Set()
  };
  
  // Shuffle decks and draw initial hands
  shuffleDeck(player1);
  shuffleDeck(player2);
  drawCards(player1, 3);
  drawCards(player2, 3);
  
  return {
    id: uuidv4(),
    phase: GamePhase.SETUP,
    currentPlayer: 0,
    players: [player1, player2],
    environment,
    turnCount: 1,
    winConditions: [],
    combatLog: []
  };
}

/**
 * Shuffles a player's deck
 */
export function shuffleDeck(player: Player): void {
  const deck = [...player.deck.cards];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  player.deck.cards = deck;
}

/**
 * Draws cards from deck to hand
 */
export function drawCards(player: Player, count: number): Card[] {
  const drawnCards: Card[] = [];
  
  for (let i = 0; i < count && player.deck.cards.length > 0; i++) {
    const card = player.deck.cards.pop();
    if (card) {
      // Create a new instance with unique ID for this game
      const gameCard = { ...card, id: uuidv4() };
      player.hand.push(gameCard);
      drawnCards.push(gameCard);
    }
  }
  
  return drawnCards;
}

/**
 * Plays a card from hand to field
 */
export function playCard(gameState: GameState, cardId: string): GameState {
  const currentPlayer = gameState.players[gameState.currentPlayer];
  const cardIndex = currentPlayer.hand.findIndex(card => card.id === cardId);
  
  if (cardIndex === -1) {
    throw new Error('Card not found in hand');
  }
  
  const card = currentPlayer.hand[cardIndex];
  
  if (currentPlayer.energy < card.energyCost) {
    throw new Error('Not enough energy to play card');
  }
  
  // Remove card from hand and add to field
  currentPlayer.hand.splice(cardIndex, 1);
  currentPlayer.field.push(card);
  
  // Deduct energy cost
  currentPlayer.energy -= card.energyCost;
  
  // Track played species
  currentPlayer.playedSpecies.add(card.speciesName);
  
  // Apply play abilities
  applyPlayAbilities(gameState, card);
  
  return { ...gameState };
}

/**
 * Applies abilities that trigger when a card is played
 */
function applyPlayAbilities(gameState: GameState, card: Card): void {
  const currentPlayer = gameState.players[gameState.currentPlayer];
  
  card.abilities.forEach(ability => {
    if (ability.trigger.type === 'play') {
      switch (ability.effect.type) {
        case 'energy':
          currentPlayer.energy += ability.effect.value;
          break;
        case 'heal':
          if (ability.effect.target === 'self') {
            card.health = Math.min(card.maxHealth, card.health + ability.effect.value);
          }
          break;
      }
    }
  });
}

/**
 * Initiates combat between two cards
 */
export function initiateCombat(
  gameState: GameState,
  attackerCardId: string,
  defenderCardId: string
): GameState {
  const currentPlayer = gameState.players[gameState.currentPlayer];
  const opponent = gameState.players[1 - gameState.currentPlayer];
  
  const attacker = currentPlayer.field.find(card => card.id === attackerCardId);
  const defender = opponent.field.find(card => card.id === defenderCardId);
  
  if (!attacker || !defender) {
    throw new Error('Attacker or defender not found');
  }
  
  // Resolve combat
  const combatResult = resolveCombat(
    attacker,
    defender,
    gameState.environment,
    currentPlayer.field
  );
  
  // Apply damage
  if (combatResult.success) {
    const damagedDefender = applyDamage(defender, combatResult.damage);
    const defenderIndex = opponent.field.findIndex(card => card.id === defenderCardId);
    opponent.field[defenderIndex] = damagedDefender;
    
    // Remove destroyed cards
    if (isCardDestroyed(damagedDefender)) {
      opponent.field.splice(defenderIndex, 1);
    }
  }
  
  // Log combat event
  const combatEvent: CombatEvent = {
    id: uuidv4(),
    timestamp: Date.now(),
    attacker,
    defender,
    roll: combatResult.roll,
    modifiers: combatResult.modifiers,
    success: combatResult.success,
    damage: combatResult.damage,
    description: `${attacker.commonName} attacks ${defender.commonName}`
  };
  
  gameState.combatLog.push(combatEvent);
  
  return { ...gameState };
}

/**
 * Ends the current player's turn
 */
export function endTurn(gameState: GameState): GameState {
  const currentPlayer = gameState.players[gameState.currentPlayer];
  
  // Draw a card
  drawCards(currentPlayer, 1);
  
  // Switch to next player
  gameState.currentPlayer = 1 - gameState.currentPlayer;
  gameState.turnCount++;
  
  // Reset energy for new player
  const newCurrentPlayer = gameState.players[gameState.currentPlayer];
  newCurrentPlayer.energy = newCurrentPlayer.maxEnergy;
  
  // Check win conditions
  const winResult = checkGameWinner(gameState.players[0], gameState.players[1]);
  if (winResult.winner) {
    gameState.phase = GamePhase.GAME_OVER;
  }
  
  // Update win condition progress
  gameState.winConditions = [
    ...checkAllWinConditions(gameState.players[0], gameState.players[1]),
    ...checkAllWinConditions(gameState.players[1], gameState.players[0])
  ];
  
  return { ...gameState };
}

/**
 * Checks if a player can play a card
 */
export function canPlayCard(player: Player, card: Card): boolean {
  return player.energy >= card.energyCost && player.field.length < 6; // Max 6 cards on field
}

/**
 * Gets valid targets for an attack
 */
export function getValidAttackTargets(
  gameState: GameState,
  attackerCardId: string
): Card[] {
  const currentPlayer = gameState.players[gameState.currentPlayer];
  const opponent = gameState.players[1 - gameState.currentPlayer];
  
  const attacker = currentPlayer.field.find(card => card.id === attackerCardId);
  if (!attacker) return [];
  
  return opponent.field.filter(defender => {
    // Check flight ability
    const defenderHasFlight = defender.abilities.some(ability => ability.name === 'Flight');
    if (defenderHasFlight) {
      const attackerHasFlight = attacker.abilities.some(ability => ability.name === 'Flight');
      return attackerHasFlight;
    }
    return true;
  });
}

/**
 * Gets the current game phase description
 */
export function getGamePhaseDescription(phase: GamePhase): string {
  switch (phase) {
    case GamePhase.SETUP:
      return 'Setting up the game...';
    case GamePhase.PLAYER_TURN:
      return 'Player turn - play cards and attack';
    case GamePhase.COMBAT:
      return 'Resolving combat...';
    case GamePhase.END_TURN:
      return 'Ending turn...';
    case GamePhase.GAME_OVER:
      return 'Game over!';
    default:
      return 'Unknown phase';
  }
}

/**
 * Validates if a deck is legal for play
 */
export function validateDeck(deck: Deck): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check deck size
  if (deck.cards.length !== 8) {
    errors.push('Deck must contain exactly 8 cards');
  }
  
  // Check trophic role requirements
  const producers = deck.cards.filter(card => card.trophicRole === 'Producer').length;
  const herbivores = deck.cards.filter(card => card.trophicRole === 'Herbivore').length;
  
  if (producers < 2) {
    errors.push('Deck must contain at least 2 Producer cards');
  }
  
  if (herbivores < 2) {
    errors.push('Deck must contain at least 2 Herbivore cards');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
