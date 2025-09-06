/**
 * BioMasters Game Engine
 * Environment-agnostic core implementation of the data-driven card game engine
 * Based on BioMasterEngine.txt specifications
 *
 * This engine is shared between client and server, with data injected via constructor
 */

// Import shared enums and types
import {
  GamePhase,
  TurnPhase,
  KeywordId,
  GameActionType,
  TrophicLevel,
  TrophicCategoryId,
  Domain,
  DOMAIN_COMPATIBILITY
} from '../enums';

// Data interfaces that must be provided by the environment
export interface CardData {
  cardId: number;
  trophicLevel: number | null;
  trophicCategory: number | null;
  domain: number;
  cost: any;
  keywords: number[];
  abilities: number[]; // Required - conversion layer ensures this exists
  victoryPoints: number;
  commonName: string;
  scientificName: string;
}

export interface AbilityData {
  abilityId: number;
  abilityID?: number; // Legacy support for existing code
  name: string;
  description: string;
  cost: any;
  effects: any[];
  triggerID?: number; // Trigger type for ability activation
}

// Core game state interfaces
export interface GameState {
  gameId: string;
  players: Player[];
  currentPlayerIndex: number;
  gamePhase: GamePhase;
  turnPhase: TurnPhase;
  actionsRemaining: number; // New: Action limit tracking
  turnNumber: number;
  finalTurnTriggeredBy?: string; // Player ID who triggered final turn (deck empty)
  finalTurnPlayersRemaining?: string[]; // Players who still need their final turn
  grid: Map<string, GridCard>; // position key -> card
  // Removed: detritus array - now using isDetritus property on GridCard
  gameSettings: GameSettings;
  metadata: Record<string, any>;
}

export interface Player {
  id: string;
  name: string;
  hand: string[]; // card instance IDs
  deck: string[]; // card instance IDs
  scorePile: GridCard[];
  energy: number;
  isReady: boolean;
}

export interface GridCard {
  instanceId: string;
  cardId: number;
  ownerId: string;
  position: { x: number; y: number };
  isExhausted: boolean;
  attachments: GridCard[];
  statusEffects: StatusEffect[];
  isDetritus: boolean; // For detritus tiles
  isHOME: boolean; // For HOME cards
}

// Removed DetritusCard interface - now using isDetritus property on GridCard

export interface StatusEffect {
  effectId: string;
  type: string;
  duration: number;
  source: string;
  metadata: Record<string, any>;
}

export interface GameSettings {
  maxPlayers: number;
  gridWidth: number;
  gridHeight: number;
  startingHandSize: number;
  maxHandSize: number;
  startingEnergy?: number;
  turnTimeLimit?: number;
}

// Action interfaces
export interface PlayerAction {
  type: GameActionType;
  playerId: string;
  payload: any;
}

export interface PlayCardPayload {
  cardId: string;
  position: { x: number; y: number };
  connectionTargetId?: string;
  cost?: any;
}

export interface ActivateAbilityPayload {
  instanceId: string;
  abilityId: number;
  targetInstanceId?: string;
  additionalTargets?: string[];
}

// Using CardData and AbilityData from GameDataManager (JSON-driven)

export interface EffectContext {
  actingCard: GridCard;
  targetCard?: GridCard | undefined;
  gameState: GameState;
  ability: AbilityData;
  additionalData?: Record<string, any>;
}

/**
 * Main BioMasters Game Engine Class
 * Environment-agnostic game logic engine that accepts data via dependency injection
 */
export class BioMastersEngine {
  private gameState: GameState | null = null;
  public readonly cardDatabase: Map<number, CardData>;
  public readonly abilityDatabase: Map<number, AbilityData>;
  public readonly keywordDatabase: Map<number, string>;

  /**
   * Environment-agnostic constructor
   * Accepts all required data via dependency injection
   */
  constructor(
    cardDatabase: Map<number, CardData>,
    abilityDatabase: Map<number, AbilityData>,
    keywordDatabase: Map<number, string>
  ) {
    this.cardDatabase = cardDatabase;
    this.abilityDatabase = abilityDatabase;
    this.keywordDatabase = keywordDatabase;

    console.log(`🎮 Engine initialized with data: ${this.cardDatabase.size} cards, ${this.abilityDatabase.size} abilities, ${this.keywordDatabase.size} keywords`);
  }



  /**
   * Initialize a new game state
   * This method creates a new game and sets it as the current game state
   */
  public initializeNewGame(
    gameId: string,
    players: { id: string; name: string }[],
    gameSettings: GameSettings
  ): GameState {
    const grid = new Map<string, GridCard>();

    // Initialize HOME cards for each player
    players.forEach((player, index) => {
      const homePosition = this.getHOMEPosition(index, players.length, gameSettings);
      const homeCard: GridCard = {
        instanceId: `home-${player.id}`,
        cardId: 0, // Special HOME card ID
        ownerId: player.id,
        position: homePosition,
        isExhausted: false,
        attachments: [],
        statusEffects: [],
        isDetritus: false,
        isHOME: true
      };
      grid.set(`${homePosition.x},${homePosition.y}`, homeCard);
    });

    const newGameState: GameState = {
      gameId,
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        hand: [],
        deck: [],
        scorePile: [],
        energy: 0,
        isReady: false
      })),
      currentPlayerIndex: 0,
      gamePhase: GamePhase.SETUP,
      turnPhase: TurnPhase.READY, // Initialize with ready phase
      actionsRemaining: 0, // No actions during setup
      turnNumber: 1,
      grid,
      gameSettings,
      metadata: {}
    };

    // Set as current game state
    this.gameState = newGameState;
    return newGameState;
  }

  /**
   * Get proper grid size based on player count
   * 1v1 (2 players): 9x10
   * 2v2/4-player (4 players): 10x10
   */
  static getGridSize(playerCount: number): { width: number; height: number } {
    if (playerCount === 2) {
      return { width: 9, height: 10 }; // 1v1 mode
    } else {
      return { width: 10, height: 10 }; // 2v2 or 4-player mode
    }
  }

  /**
   * Get HOME card position based on player count and index
   * Centers HOME positions in the middle of the grid (9x10 or 10x10)
   */
  private getHOMEPosition(playerIndex: number, playerCount: number, gameSettings: GameSettings): { x: number; y: number } {
    const centerX = Math.floor(gameSettings.gridWidth / 2);
    const centerY = Math.floor(gameSettings.gridHeight / 2);

    if (playerCount === 2) {
      // 2 players: [H1][H2] horizontally centered
      return {
        x: centerX - 1 + playerIndex, // e.g., for 10x10: (4,5) and (5,5)
        y: centerY
      };
    } else if (playerCount === 4) {
      // 4 players: 2x2 grid centered
      return {
        x: centerX - 1 + (playerIndex % 2),
        y: centerY - 1 + Math.floor(playerIndex / 2)
      };
    } else {
      // Default: single center position
      return { x: centerX, y: centerY };
    }
  }

  // REMOVED: Old database-based loadGameData method
  // Game data is now loaded from JSON files via GameDataManager

  /**
   * Core action processor - single entry point for all player actions
   */
  public processAction(action: PlayerAction): { isValid: boolean; newState?: GameState; errorMessage?: string } {
    try {
      const gameState = this.ensureGameInitialized();

      // Check if it's the correct player's turn (except for setup actions)
      if (action.type !== GameActionType.PLAYER_READY && gameState.gamePhase === 'playing') {
        if (this.getCurrentPlayer().id !== action.playerId) {
          return { isValid: false, errorMessage: 'Not your turn' };
        }

        // Check turn phase restrictions
        if (gameState.turnPhase !== 'action' && action.type !== GameActionType.PASS_TURN) {
          return { isValid: false, errorMessage: `Cannot perform ${action.type} during ${gameState.turnPhase} phase` };
        }

        // Check action limit (except for PASS_TURN)
        if (action.type !== GameActionType.PASS_TURN && gameState.actionsRemaining <= 0) {
          return { isValid: false, errorMessage: 'No actions remaining this turn' };
        }
      }

      let result: { isValid: boolean; newState?: GameState; errorMessage?: string };

      switch (action.type) {
        case GameActionType.PLAY_CARD:
          result = this.handlePlayCard(action.payload as PlayCardPayload);
          break;
        case GameActionType.ACTIVATE_ABILITY:
          result = this.handleActivateAbility(action.payload as ActivateAbilityPayload);
          break;
        case GameActionType.PASS_TURN:
          return this.handlePassTurn(action.playerId);
        case GameActionType.MOVE_CARD:
          result = this.handleMoveCard(action.payload);
          break;
        case GameActionType.CHALLENGE:
          result = this.handleChallenge(action.payload);
          break;
        case GameActionType.PLAYER_READY:
          return this.handlePlayerReady(action.playerId);
        case GameActionType.REMOVE_CARD:
          result = this.handleRemoveCard(action.payload);
          break;
        case GameActionType.METAMORPHOSIS:
          result = this.handleMetamorphosis(action.payload);
          break;
        default:
          return {
            isValid: false,
            errorMessage: `Unknown action type: ${action.type}`
          };
      }

      // Consume an action if it was successful and during action phase
      const actionConsumingTypes = ['PLAY_CARD', 'ACTIVATE_ABILITY', 'MOVE_CARD', 'CHALLENGE', 'REMOVE_CARD', 'METAMORPHOSIS'];
      const currentGameState = this.ensureGameInitialized();
      if (result.isValid && currentGameState.turnPhase === 'action' &&
          actionConsumingTypes.includes(action.type)) {
        if (result.newState) {
          result.newState.actionsRemaining--;
          console.log(`🎯 Action consumed. ${result.newState.actionsRemaining} actions remaining.`);

          // Auto-pass turn if no actions remaining
          if (result.newState.actionsRemaining <= 0) {
            console.log(`⏭️ No actions remaining, ending turn for ${this.getCurrentPlayer().name}`);
            return this.handlePassTurn(action.playerId);
          }
        }
      }

      return result;
    } catch (error) {
      console.error('❌ Error processing action:', error);
      return {
        isValid: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle playing a card to the grid
   */
  private handlePlayCard(payload: PlayCardPayload): { isValid: boolean; newState?: GameState; errorMessage?: string } {
    const gameState = this.ensureGameInitialized();

    // Validate game phase
    if (gameState.gamePhase !== GamePhase.PLAYING) {
      return { isValid: false, errorMessage: 'Cannot play cards during setup phase' };
    }

    const { cardId, position, connectionTargetId } = payload;

    // Get card data
    const cardData = this.getCardDataByStringId(cardId);
    if (!cardData) {
      return { isValid: false, errorMessage: 'Card not found' };
    }

    // Validate position
    if (!this.isValidPosition(position)) {
      return { isValid: false, errorMessage: 'Invalid position' };
    }

    // Check if position is occupied
    const positionKey = `${position.x},${position.y}`;
    const existingCard = gameState.grid.get(positionKey);

    if (existingCard) {
      // Allow attachment for Parasites and Mutualists
      if (this.isParasite(cardData) || this.isMutualist(cardData)) {
        // This will be handled by the attachment logic later

      } else if (existingCard.isDetritus && this.isSaprotroph(cardData)) {
        // Allow saprotrophs to be placed on detritus cards
        // This will replace the detritus card

      } else {
        return { isValid: false, errorMessage: 'Position already occupied' };
      }
    } else {
      // Check for detritus tiles at this position
      const hasDetritus = this.hasDetritusAtPosition(position);

      // Only saprotrophs can be placed on detritus tiles
      if (hasDetritus && !(cardData.trophicLevel === TrophicLevel.SAPROTROPH && this.isSaprotroph(cardData))) {
        return { isValid: false, errorMessage: 'Only saprotrophs can be placed on detritus tiles' };
      }

      // Non-saprotrophs cannot be placed on detritus tiles
      if (!hasDetritus && cardData.trophicLevel === TrophicLevel.SAPROTROPH && this.isSaprotroph(cardData)) {
        return { isValid: false, errorMessage: 'Saprotrophs must be placed on detritus tiles' };
      }
    }

    // Check placement rules FIRST (domain and trophic compatibility) - per official rules
    const validationResult = this.validateCardPlacement(cardData, position, connectionTargetId);
    if (!validationResult.isValid) {
      return validationResult;
    }

    // Check cost requirements AFTER placement is validated
    const costValidation = this.validateCost(cardData, this.getCurrentPlayer().id, position);
    if (!costValidation.isValid) {
      return costValidation;
    }

    // Create new game state
    const newState = this.cloneGameState();

    // Pay the cost
    const costResult = this.payCost(newState, cardData, this.getCurrentPlayer().id, position);
    if (!costResult.isValid) {
      return costResult;
    }
    
    // Create card instance
    const instanceId = this.generateInstanceId();

    // Check for preferred diet bonus (cards enter ready)
    const adjacentCards = this.getAdjacentCards(position);
    const hasPreferredDietBonus = this.checkPreferredDietBonus(cardData, adjacentCards);

    const gridCard: GridCard = {
      instanceId,
      cardId: cardData.cardId,
      ownerId: this.getCurrentPlayer().id,
      position,
      isExhausted: !hasPreferredDietBonus, // Enter ready if preferred diet bonus
      attachments: [],
      statusEffects: [],
      isDetritus: false,
      isHOME: false
    };

    // Handle attachment BEFORE placing card on grid for Parasites and Mutualists
    if (this.isParasite(cardData) || this.isMutualist(cardData)) {
      const hostAtPosition = newState.grid.get(positionKey);

      if (hostAtPosition) {
        // Attaching to host at same position - don't place the attachment on grid
        hostAtPosition.attachments.push(gridCard);

        this.applyAttachmentEffects(gridCard, hostAtPosition, cardData);
      } else {
        // Look for adjacent hosts
        const adjacentCards = this.getAdjacentCards(position);
        this.processAttachment(gridCard, cardData, adjacentCards);
      }
    } else {
      // Process detritus conversion BEFORE placing the Saprotroph
      if (cardData.trophicLevel === TrophicLevel.SAPROTROPH && this.isSaprotroph(cardData)) {
        this.processDetritusConversion(newState, position, this.getCurrentPlayer().id);
      }

      // Place normal cards on grid
      newState.grid.set(positionKey, gridCard);
    }

    // Remove card from hand (handle both numeric ID and card name)
    const currentPlayer = newState.players[newState.currentPlayerIndex];
    if (currentPlayer) {
      // Try to find by exact match first
      let handIndex = currentPlayer.hand.indexOf(cardId);

      // If not found, try to find by card ID number
      if (handIndex === -1) {
        const numericId = cardData.cardId.toString();
        handIndex = currentPlayer.hand.indexOf(numericId);
      }

      // If still not found, try to find by card name
      if (handIndex === -1) {
        handIndex = currentPlayer.hand.indexOf(cardData.commonName);
      }

      if (handIndex !== -1) {
        currentPlayer.hand.splice(handIndex, 1);
      }
    }

    // Check for synergy bonuses (Preferred Diet)
    this.checkSynergyBonuses(newState, gridCard);

    // Process ON_PLAY abilities
    this.processOnPlayAbilities(newState, gridCard, cardData);

    this.gameState = newState;
    return { isValid: true, newState };
  }

  /**
   * Handle activating a card ability
   */
  private handleActivateAbility(payload: ActivateAbilityPayload): { isValid: boolean; newState?: GameState; errorMessage?: string } {
    const { instanceId, abilityId, targetInstanceId } = payload;

    console.log(`🎯 Activating ability ${abilityId} on card ${instanceId}`);

    // Get acting card
    const actingCard = this.findCardByInstanceId(instanceId);
    if (!actingCard) {
      return { isValid: false, errorMessage: 'Acting card not found' };
    }

    // Check if card is ready
    if (actingCard.isExhausted) {
      return { isValid: false, errorMessage: 'Card is exhausted' };
    }

    // Get ability data
    const ability = this.abilityDatabase.get(abilityId);
    if (!ability) {
      return { isValid: false, errorMessage: 'Ability not found' };
    }

    // Validate ability belongs to card
    const cardData = this.cardDatabase.get(actingCard.cardId);
    if (!cardData || !cardData.abilities.includes(abilityId)) {
      return { isValid: false, errorMessage: 'Card does not have this ability' };
    }

    // Check if ability is activated type
    if (ability.triggerID !== 2) { // 2 = ACTIVATED
      return { isValid: false, errorMessage: 'This ability cannot be manually activated' };
    }

    // Validate targeting requirements
    const targetValidation = this.validateAbilityTargeting(ability, actingCard, targetInstanceId);
    if (!targetValidation.isValid) {
      return targetValidation;
    }

    // Check energy cost if any (for now, assume no energy cost since it's not in the schema)
    const energyCost = 0; // TODO: Add energy_cost to AbilityData schema
    const gameState = this.ensureGameInitialized();
    const player = gameState.players.find(p => p.id === actingCard.ownerId);
    if (!player) {
      return { isValid: false, errorMessage: 'Player not found' };
    }

    if (player.energy < energyCost) {
      return { isValid: false, errorMessage: `Not enough energy. Required: ${energyCost}, Available: ${player.energy}` };
    }

    // Execute ability effects
    const newState = this.cloneGameState();
    const context: EffectContext = {
      actingCard,
      targetCard: targetInstanceId ? this.findCardByInstanceId(targetInstanceId) || undefined : undefined,
      gameState: newState,
      ability
    };

    // Deduct energy cost
    const newPlayer = newState.players.find(p => p.id === actingCard.ownerId);
    if (newPlayer) {
      newPlayer.energy -= energyCost;
    }

    const effectResult = this.executeEffects(ability.effects, context);
    if (!effectResult.isValid) {
      return effectResult;
    }

    // Exhaust the acting card
    const gridCard = this.findCardInState(newState, instanceId);
    if (gridCard) {
      gridCard.isExhausted = true;
    }

    console.log(`✅ Ability ${ability.abilityID} activated successfully`);
    this.gameState = newState;
    return { isValid: true, newState };
  }

  /**
   * Validate ability targeting requirements
   */
  private validateAbilityTargeting(ability: AbilityData, actingCard: GridCard, targetInstanceId?: string): { isValid: boolean; errorMessage?: string } {
    // Check if ability requires a target
    const requiresTarget = this.abilityRequiresTarget(ability);

    if (requiresTarget && !targetInstanceId) {
      return { isValid: false, errorMessage: 'This ability requires a target' };
    }

    if (!requiresTarget && targetInstanceId) {
      return { isValid: false, errorMessage: 'This ability does not require a target' };
    }

    // If target is provided, validate it
    if (targetInstanceId) {
      const targetCard = this.findCardByInstanceId(targetInstanceId);
      if (!targetCard) {
        return { isValid: false, errorMessage: 'Target card not found' };
      }

      // Validate target is valid for this ability
      const targetValidation = this.isValidTarget(ability, actingCard, targetCard);
      if (!targetValidation.isValid) {
        return targetValidation;
      }
    }

    return { isValid: true };
  }

  /**
   * Check if ability requires a target
   */
  private abilityRequiresTarget(ability: AbilityData): boolean {
    if (!ability.effects || ability.effects.length === 0) {
      return false;
    }

    // Check if any effect has a selector that requires targeting
    for (const effect of ability.effects) {
      if (effect.SelectorID && this.selectorRequiresTarget(effect.SelectorID)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if selector requires manual targeting
   */
  private selectorRequiresTarget(selectorId: number): boolean {
    switch (selectorId) {
      case 7: // MANUAL_TARGET (hypothetical - would need to be added to database)
        return true;
      default:
        return false; // Most selectors are automatic
    }
  }

  /**
   * Validate if a target is valid for an ability
   */
  private isValidTarget(ability: AbilityData, actingCard: GridCard, targetCard: GridCard): { isValid: boolean; errorMessage?: string } {
    // Create a temporary context to test target selection
    const gameState = this.ensureGameInitialized();
    const tempContext: EffectContext = {
      actingCard,
      targetCard,
      gameState: gameState,
      ability
    };

    // For each effect that has targeting, validate the target
    for (const effect of ability.effects) {
      if (effect.SelectorID) {
        const validTargets = this.selectTargets(effect, tempContext);
        if (!validTargets.some(t => t.instanceId === targetCard.instanceId)) {
          return { isValid: false, errorMessage: 'Invalid target for this ability' };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Check if a card is a Chemoautotroph (+1C)
   */
  public isChemoautotroph(cardData: CardData): boolean {
    return cardData.trophicLevel === 1 && cardData.trophicCategory === 2; // Category 2 = Chemoautotroph
  }

  /**
   * Check if a chemoautotroph has Chemical Opportunist ability (-1S backup)
   */
  private hasChemicalOpportunistAbility(cardData: CardData): boolean {
    // Check for specific ability or keyword that indicates Chemical Opportunist
    // This would be defined in the abilities data
    return cardData.abilities?.includes(16) || false; // Assuming ability ID 16 for Chemical Opportunist
  }

  /**
   * Check if a chemoautotroph has Detrital Specialist ability (-2D connection)
   */
  private hasDetritalSpecialistAbility(cardData: CardData): boolean {
    // Check for specific ability or keyword that indicates Detrital Specialist
    // This would be defined in the abilities data
    return cardData.abilities?.includes(17) || false; // Assuming ability ID 17 for Detrital Specialist
  }

  /**
   * Check if a card is a Saprotroph (-1S)
   */
  private isSaprotroph(cardData: CardData): boolean {
    const result = cardData.trophicLevel === TrophicLevel.SAPROTROPH &&
           cardData.trophicCategory === TrophicCategoryId.SAPROTROPH;
    console.log(`🍄 isSaprotroph check for ${cardData.commonName} (CardID: ${cardData.cardId}):`);
    console.log(`🍄   TrophicLevel: ${cardData.trophicLevel} === ${TrophicLevel.SAPROTROPH} = ${cardData.trophicLevel === TrophicLevel.SAPROTROPH}`);
    console.log(`🍄   TrophicCategory: ${cardData.trophicCategory} === ${TrophicCategoryId.SAPROTROPH} = ${cardData.trophicCategory === TrophicCategoryId.SAPROTROPH}`);
    console.log(`🍄   Result: ${result}`);
    return result;
  }

  /**
   * Check if a card is a Detritivore (-2D)
   */
  private isDetritivore(cardData: CardData): boolean {
    return cardData.trophicLevel === TrophicLevel.DETRITIVORE &&
           cardData.trophicCategory === TrophicCategoryId.DETRITIVORE;
  }

  /**
   * Check if there's detritus at a specific position
   */
  private hasDetritusAtPosition(position: { x: number; y: number }): boolean {
    const gameState = this.ensureGameInitialized();
    const positionKey = `${position.x},${position.y}`;
    const cardAtPosition = gameState.grid.get(positionKey);
    return cardAtPosition?.isDetritus === true;
  }

  /**
   * Convert detritus to score pile when Saprotroph is placed
   */
  private processDetritusConversion(state: GameState, position: { x: number; y: number }, playerId: string): void {
    const positionKey = `${position.x},${position.y}`;
    const detritusCard = state.grid.get(positionKey);

    if (detritusCard?.isDetritus) {
      const player = state.players.find(p => p.id === playerId);

      if (player) {
        // Create a copy for the score pile (no longer detritus)
        const scorePileCard: GridCard = {
          ...detritusCard,
          isDetritus: false, // No longer detritus when in score pile
          ownerId: playerId  // Now owned by the player who placed the saprotroph
        };

        // Add to score pile
        player.scorePile.push(scorePileCard);

        // Remove the detritus card from the grid (it will be replaced by the saprotroph)
        state.grid.delete(positionKey);

        console.log(`🏆 ${player.name} gained VP from detritus conversion at ${position.x},${position.y}`);
      }
    }
  }

  /**
   * Check if a card is a Parasite (P)
   */
  private isParasite(cardData: CardData): boolean {
    return cardData.trophicCategory === TrophicCategoryId.PARASITE; // Category 7 = Parasite
  }

  /**
   * Check if a card is a Mutualist (M)
   */
  private isMutualist(cardData: CardData): boolean {
    return cardData.trophicCategory === TrophicCategoryId.MUTUALIST; // Category 8 = Mutualist
  }

  /**
   * Find a valid host for a parasite or mutualist
   */
  private findValidHost(attachmentCard: CardData, adjacentCards: GridCard[]): GridCard | null {
    for (const card of adjacentCards) {
      const cardData = this.cardDatabase.get(card.cardId);
      if (!cardData) continue;

      // Check domain compatibility first
      if (!this.areDomainsCompatible(attachmentCard, cardData)) continue;

      // Parasites can attach to any valid creature
      if (this.isParasite(attachmentCard)) {
        // Parasites can attach to any creature (not producers)
        if (cardData.trophicLevel && cardData.trophicLevel > 1) {
          return card;
        }
      }

      // Mutualists have specific host requirements
      if (this.isMutualist(attachmentCard)) {
        // Mycorrhizal fungi and nitrogen-fixing bacteria attach to plants (producers)
        if (cardData.trophicLevel === 1) { // Any producer
          return card;
        }
      }
    }

    return null;
  }

  /**
   * Check if two cards have compatible domains
   */
  private areDomainsCompatible(card1: CardData, card2: CardData): boolean {
    const domain1 = card1.domain;
    const domain2 = card2.domain;

    // Domain compatibility rules
    const DOMAIN_COMPATIBILITY: Record<number, number[]> = {
      1: [1], // TERRESTRIAL connects to TERRESTRIAL
      2: [2], // FRESHWATER connects to FRESHWATER
      3: [3], // MARINE connects to MARINE
      4: [1, 2], // AMPHIBIOUS_FRESHWATER connects to TERRESTRIAL + FRESHWATER
      5: [1, 3], // AMPHIBIOUS_MARINE connects to TERRESTRIAL + MARINE
      6: [2, 3]  // EURYHALINE connects to FRESHWATER + MARINE
    };

    // Check if domain1 can connect to domain2
    const compatibleDomains = DOMAIN_COMPATIBILITY[domain1] || [];
    return compatibleDomains.includes(domain2);
  }

  /**
   * Process attachment when a parasite or mutualist is played
   */
  private processAttachment(attachmentCard: GridCard, cardData: CardData, adjacentCards: GridCard[]): void {
    const host = this.findValidHost(cardData, adjacentCards);
    if (host) {
      // Attach the card to the host
      host.attachments.push(attachmentCard);

      const attachmentType = this.isParasite(cardData) ? 'Parasite' : 'Mutualist';
      console.log(`🔗 ${attachmentType} ${cardData.commonName} attached to host ${this.cardDatabase.get(host.cardId)?.commonName}`);

      // Apply attachment effects
      this.applyAttachmentEffects(attachmentCard, host, cardData);
    }
  }

  /**
   * Apply effects when a card attaches to a host
   */
  private applyAttachmentEffects(attachment: GridCard, host: GridCard, attachmentData: CardData): void {
    if (this.isParasite(attachmentData)) {
      // Parasites typically harm the host
      host.statusEffects.push({
        effectId: this.generateInstanceId(),
        type: 'parasitized',
        duration: -1, // Permanent while attached
        source: attachment.instanceId,
        metadata: { attachmentId: attachment.instanceId }
      });
      console.log(`🦠 Host is now parasitized`);
    }

    if (this.isMutualist(attachmentData)) {
      // Mutualists typically benefit both cards
      host.statusEffects.push({
        effectId: this.generateInstanceId(),
        type: 'mutualistic_benefit',
        duration: -1, // Permanent while attached
        source: attachment.instanceId,
        metadata: { attachmentId: attachment.instanceId }
      });

      attachment.statusEffects.push({
        effectId: this.generateInstanceId(),
        type: 'mutualistic_benefit',
        duration: -1,
        source: host.instanceId,
        metadata: { hostId: host.instanceId }
      });
      console.log(`🤝 Mutualistic relationship established`);
    }
  }
  
  private getCardDataByStringId(cardId: string | undefined): CardData | null {
    if (!cardId) return null;

    // Try direct numeric lookup first
    const numericId = parseInt(cardId);
    if (!isNaN(numericId)) {
      return this.cardDatabase.get(numericId) || null;
    }

    // Try extracting numeric ID from instance ID (format: "123_instance_...")
    const parts = cardId.split('_');
    if (parts.length > 0 && parts[0]) {
      const firstPartId = parseInt(parts[0]);
      if (!isNaN(firstPartId)) {
        return this.cardDatabase.get(firstPartId) || null;
      }
    }

    // Try finding by card name
    for (const [, card] of this.cardDatabase.entries()) {
      if (card.commonName === cardId) {
        return card;
      }
    }

    return null;
  }

  private isValidPosition(position: { x: number; y: number }): boolean {
    const gameState = this.ensureGameInitialized();
    return position.x >= 0 && position.x < gameState.gameSettings.gridWidth &&
           position.y >= 0 && position.y < gameState.gameSettings.gridHeight;
  }

  private getCurrentPlayer(): Player {
    const gameState = this.ensureGameInitialized();
    const player = gameState.players[gameState.currentPlayerIndex];
    if (!player) {
      throw new Error('Current player not found');
    }
    return player;
  }

  private cloneGameState(): GameState {
    // Deep clone the game state while preserving Map objects
    const cloned = JSON.parse(JSON.stringify(this.gameState));

    // Restore the grid Map
    const gameState = this.ensureGameInitialized();
    cloned.grid = new Map();
    for (const [key, value] of gameState.grid.entries()) {
      cloned.grid.set(key, { ...value });
    }

    return cloned;
  }

  private generateInstanceId(): string {
    return `instance_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private findCardByInstanceId(instanceId: string): GridCard | null {
    const gameState = this.ensureGameInitialized();
    for (const card of gameState.grid.values()) {
      if (card.instanceId === instanceId) {
        return card;
      }
    }
    return null;
  }

  private findCardInState(state: GameState, instanceId: string): GridCard | null {
    for (const card of state.grid.values()) {
      if (card.instanceId === instanceId) {
        return card;
      }
    }
    return null;
  }

  /**
   * Validate card placement according to domain and trophic rules
   */
  private validateCardPlacement(cardData: CardData, position: { x: number; y: number }, _connectionTargetId?: string): { isValid: boolean; errorMessage?: string } {
    // Check if there are adjacent cards for connection validation
    const adjacentCards = this.getAdjacentCards(position);

    if (adjacentCards.length === 0 && !this.isHomePosition(position)) {
      return { isValid: false, errorMessage: 'Cards must be placed adjacent to existing cards or HOME' };
    }

    // For producers (trophic level 1), check HOME connection or decomposer connection
    if (cardData.trophicLevel === TrophicLevel.PRODUCER) {
      // Check if this is a chemoautotroph (trophic_category_id = 2) vs photoautotroph (trophic_category_id = 1)
      const isChemoautotroph = cardData.trophicCategory === TrophicCategoryId.CHEMOAUTOTROPH;

      if (isChemoautotroph) {
        // Chemoautotrophs CAN connect to HOME as primary producers (like photoautotrophs)
        // They have the highest autonomy and can use geological energy sources
        const hasHomeAdjacent = adjacentCards.some(card => card.isHOME) || this.isHomePosition(position);

        if (hasHomeAdjacent) {
          // Valid HOME connection for chemoautotrophs
          return { isValid: true };
        }

        // Check for special chemoautotroph abilities
        const hasChemicalOpportunist = this.hasChemicalOpportunistAbility(cardData);
        const hasDetritalSpecialist = this.hasDetritalSpecialistAbility(cardData);

        // Chemical Opportunist: can connect to -1S (saprotroph) cards
        if (hasChemicalOpportunist) {
          const hasSaprophyteAdjacent = adjacentCards.some(card => {
            const adjCardData = this.cardDatabase.get(card.cardId);
            return adjCardData && this.isSaprotroph(adjCardData);
          });

          if (hasSaprophyteAdjacent) {
            return { isValid: true };
          }
        }

        // Detrital Specialist: can connect to -2D (detritivore) cards
        if (hasDetritalSpecialist) {
          const hasDetritivoreAdjacent = adjacentCards.some(card => {
            const adjCardData = this.cardDatabase.get(card.cardId);
            return adjCardData && this.isDetritivore(adjCardData);
          });

          if (hasDetritivoreAdjacent) {
            return { isValid: true };
          }
        }

        // They can also connect to other producers for network building
        const hasProducerAdjacent = adjacentCards.some(card => {
          const adjCardData = this.cardDatabase.get(card.cardId);
          return adjCardData && adjCardData.trophicLevel === 1; // Other producers
        });

        if (hasProducerAdjacent) {
          return { isValid: true };
        }

        // If no valid connection found, reject placement
        return { isValid: false, errorMessage: 'Chemoautotrophs must connect to HOME, other producers, or valid decomposer cards (if they have special abilities)' };
      } else {
        // Photoautotrophs can connect to HOME or other producers
        if (this.isHomePosition(position)) {
          return { isValid: true }; // Photoautotrophs can connect to HOME
        }

        // Check if any adjacent card is a HOME card. This is a valid connection.
        const hasHomeAdjacent = adjacentCards.some(card => card.isHOME);

        const hasProducerAdjacent = adjacentCards.some(card => {
          const adjCardData = this.cardDatabase.get(card.cardId);
          return adjCardData && adjCardData.trophicLevel === TrophicLevel.PRODUCER; // Other producers
        });

        // The connection is valid if it's next to a HOME OR another Producer.
        if (!hasHomeAdjacent && !hasProducerAdjacent) {
          return { isValid: false, errorMessage: 'Photoautotrophs must connect to HOME or other producers' };
        }
      }
    }

    // For consumers (trophic level > 1), validate trophic connection AND domain compatibility
    // Skip this for parasites and mutualists since they use attachment system
    // Only validate trophic connections for consumers (level > 1), not producers
    if (cardData.trophicLevel && cardData.trophicLevel > TrophicLevel.PRODUCER && !this.isParasite(cardData) && !this.isMutualist(cardData)) {
      // First check for trophic level matches - EXCLUDE HOME cards explicitly
      const trophicMatches = adjacentCards.filter(card => {
        // HOME cards cannot be used as trophic connections for consumers
        if (card.isHOME) {
          return false;
        }

        const adjCardData = this.cardDatabase.get(card.cardId);
        return adjCardData && adjCardData.trophicLevel === (cardData.trophicLevel! - 1);
      });

      if (trophicMatches.length === 0) {
        return { isValid: false, errorMessage: `Trophic level ${cardData.trophicLevel} cards must connect to trophic level ${cardData.trophicLevel! - 1} cards, not HOME` };
      }

      // Then check domain compatibility among trophic matches
      const validConnections = trophicMatches.filter(card => {
        const adjCardData = this.cardDatabase.get(card.cardId);

        // Check domain compatibility for this specific connection
        return this.areDomainsCompatibleAdvanced(
          this.getCardDomains(cardData),
          this.getCardDomains(adjCardData || null, card.isHOME)
        );
      });

      if (validConnections.length === 0) {
        const domains = this.getCardDomains(cardData);
        const domainName = this.getDomainName(domains);
        return { isValid: false, errorMessage: `Invalid trophic level connection: ${domainName} cards cannot connect to incompatible domains` };
      }
    }

    // Decomposition Loop: Saprotrophs (-1S) placement is handled in position occupation logic
    // No additional validation needed here since detritus placement is checked earlier

    // Decomposition Loop: Detritivores (-2D) must connect to Saprotrophs (-1S)
    if (cardData.trophicLevel === TrophicLevel.DETRITIVORE && this.isDetritivore(cardData)) {
      const hasSaprophyteAdjacent = adjacentCards.some(card => {
        const adjCardData = this.cardDatabase.get(card.cardId);
        return adjCardData && adjCardData.trophicLevel === TrophicLevel.SAPROTROPH && this.isSaprotroph(adjCardData);
      });

      if (!hasSaprophyteAdjacent) {
        return { isValid: false, errorMessage: 'Detritivores must connect to Saprotrophs (-1S)' };
      }
    }

    // Attachment System: Parasites (P) and Mutualists (M) attach to hosts
    if (this.isParasite(cardData) || this.isMutualist(cardData)) {
      // Check if there's a card at this position to attach to
      const gameState = this.ensureGameInitialized();
      const positionKey = `${position.x},${position.y}`;
      const hostAtPosition = gameState.grid.get(positionKey);

      if (hostAtPosition) {
        // Trying to attach to card at same position
        const hostData = this.cardDatabase.get(hostAtPosition.cardId);
        if (hostData && this.areDomainsCompatible(cardData, hostData)) {
          // Valid attachment to host at same position
          return { isValid: true };
        } else {
          return { isValid: false, errorMessage: 'Attachment requires domain compatibility with host' };
        }
      } else {
        // No host at position, check adjacent cards
        const validHost = this.findValidHost(cardData, adjacentCards);
        if (!validHost) {
          const attachmentType = this.isParasite(cardData) ? 'Parasite' : 'Mutualist';
          return { isValid: false, errorMessage: `${attachmentType} must attach to a valid host creature` };
        }
      }
    }

    // Validate domain compatibility
    const domainValidation = this.validateDomainCompatibility(cardData, adjacentCards);
    if (!domainValidation.isValid) {
      return domainValidation;
    }

    return { isValid: true };
  }

  /**
   * Validate domain compatibility between cards - Enhanced with FRESHWATER/MARINE distinction
   */
  private validateDomainCompatibility(cardData: CardData, adjacentCards: GridCard[]): { isValid: boolean; errorMessage?: string } {
    const domains = this.getCardDomains(cardData);

    // Amphibious cards can connect to any domain
    if (domains.isAmphibious) {
      return { isValid: true };
    }

    for (const adjCard of adjacentCards) {
      const adjCardData = this.cardDatabase.get(adjCard.cardId);
      const adjDomains = this.getCardDomains(adjCardData || null, adjCard.isHOME);

      // Amphibious cards can connect to anything
      if (adjDomains.isAmphibious) {
        continue;
      }

      // Check advanced domain compatibility
      if (!this.areDomainsCompatibleAdvanced(domains, adjDomains)) {
        const domainName = this.getDomainName(domains);
        const adjDomainName = this.getDomainName(adjDomains);
        return { isValid: false, errorMessage: `${domainName} cards cannot connect to ${adjDomainName} cards` };
      }
    }

    return { isValid: true };
  }

  /**
   * Get domain information for a card using the standardized Domain property
   * Special handling for HOME cards and cards without Domain field
   */
  private getCardDomains(cardData: CardData | null, isHOME: boolean = false) {
    // Handle HOME cards - they have Domain.HOME
    if (isHOME || (cardData && Number(cardData.cardId) === 0)) {
      return {
        domain: Domain.HOME,
        isTerrestrial: false,
        isFreshwater: false,
        isMarine: false,
        isAmphibiousFreshwater: false,
        isAmphibiousMarine: false,
        isEuryhaline: false,
        isAmphibious: false,
        isAquatic: false,
        isHOME: true
      };
    }

    // Handle null/undefined cardData
    if (!cardData) {
      return {
        domain: Domain.TERRESTRIAL, // Default fallback
        isTerrestrial: true,
        isFreshwater: false,
        isMarine: false,
        isAmphibiousFreshwater: false,
        isAmphibiousMarine: false,
        isEuryhaline: false,
        isAmphibious: false,
        isAquatic: false,
        isHOME: false
      };
    }

    // Handle cards with Domain field
    if (cardData.domain !== undefined) {
      const domain = cardData.domain;
      return {
        domain: domain,
        isTerrestrial: domain === Domain.TERRESTRIAL,
        isFreshwater: domain === Domain.FRESHWATER,
        isMarine: domain === Domain.MARINE,
        isAmphibiousFreshwater: domain === Domain.AMPHIBIOUS_FRESHWATER,
        isAmphibiousMarine: domain === Domain.AMPHIBIOUS_MARINE,
        isEuryhaline: domain === Domain.EURYHALINE,
        isAmphibious: domain === Domain.AMPHIBIOUS_FRESHWATER || domain === Domain.AMPHIBIOUS_MARINE,
        isAquatic: domain === Domain.FRESHWATER || domain === Domain.MARINE || domain === Domain.EURYHALINE,
        isHOME: domain === Domain.HOME
      };
    }

    // Fallback: derive domain from keywords for legacy cards
    const keywords = cardData.keywords || [];
    let domain: Domain = Domain.TERRESTRIAL; // Default

    // Check keywords to determine domain
    if (keywords.includes(KeywordId.AMPHIBIOUS)) {
      domain = Domain.AMPHIBIOUS_MARINE; // Default amphibious
    } else if (keywords.includes(KeywordId.FRESHWATER)) {
      domain = Domain.FRESHWATER;
    } else if (keywords.includes(KeywordId.MARINE)) {
      domain = Domain.MARINE;
    } else if (keywords.includes(KeywordId.AQUATIC)) {
      domain = Domain.MARINE; // Default aquatic to marine
    }

    return {
      domain: domain,
      isTerrestrial: domain === Domain.TERRESTRIAL,
      isFreshwater: domain === Domain.FRESHWATER,
      isMarine: domain === Domain.MARINE,
      isAmphibiousFreshwater: (domain as Domain) === Domain.AMPHIBIOUS_FRESHWATER,
      isAmphibiousMarine: (domain as Domain) === Domain.AMPHIBIOUS_MARINE,
      isEuryhaline: (domain as Domain) === Domain.EURYHALINE,
      isAmphibious: (domain as Domain) === Domain.AMPHIBIOUS_FRESHWATER || (domain as Domain) === Domain.AMPHIBIOUS_MARINE,
      isAquatic: (domain as Domain) === Domain.FRESHWATER || (domain as Domain) === Domain.MARINE || (domain as Domain) === Domain.EURYHALINE,
      isHOME: (domain as Domain) === Domain.HOME
    };
  }

  /**
   * Check advanced domain compatibility using the standardized Domain system
   * Uses the DOMAIN_COMPATIBILITY matrix which includes HOME domain
   */
  private areDomainsCompatibleAdvanced(domains1: any, domains2: any): boolean {
    const domain1 = domains1.domain as Domain;
    const domain2 = domains2.domain as Domain;

    // Handle null domains (shouldn't happen but be safe)
    if (domain1 === null || domain2 === null) {
      return false;
    }

    // Use the standardized domain compatibility matrix (includes HOME compatibility)
    const compatibleDomains = DOMAIN_COMPATIBILITY[domain1] as readonly Domain[] || [];
    return (compatibleDomains as Domain[]).includes(domain2);
  }

  /**
   * Get human-readable domain name using the standardized Domain system
   */
  private getDomainName(domains: any): string {
    switch (domains.domain) {
      case Domain.TERRESTRIAL: return 'Terrestrial';
      case Domain.FRESHWATER: return 'Freshwater';
      case Domain.MARINE: return 'Marine';
      case Domain.AMPHIBIOUS_FRESHWATER: return 'Amphibious-Freshwater';
      case Domain.AMPHIBIOUS_MARINE: return 'Amphibious-Marine';
      case Domain.EURYHALINE: return 'Euryhaline';
      case Domain.HOME: return 'HOME';
      default: return 'Unknown';
    }
  }

  /**
   * Validate cost requirements
   */
  private validateCost(cardData: CardData, playerId: string, position?: { x: number; y: number }): { isValid: boolean; errorMessage?: string } {
    if (!cardData.cost) {
      return { isValid: true }; // No cost required
    }

    const cost = typeof cardData.cost === 'string' ? JSON.parse(cardData.cost) : cardData.cost;
    const gameState = this.ensureGameInitialized();
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
      return { isValid: false, errorMessage: 'Player not found' };
    }

    // Special handling for Saprotrophs: they can use detritus as cost source
    const isSaprotroph = cardData.trophicLevel === TrophicLevel.SAPROTROPH && this.isSaprotroph(cardData);

    console.log(`🍄 Cost validation for ${cardData.commonName}:`);
    console.log(`🍄 TrophicLevel: ${cardData.trophicLevel}, TrophicCategory: ${cardData.trophicCategory}`);
    console.log(`🍄 Is Saprotroph: ${isSaprotroph}`);
    console.log(`🍄 Position: ${position ? `${position.x},${position.y}` : 'none'}`);

    // Get player's cards on grid
    const playerCards = Array.from(gameState.grid.values()).filter(card => card.ownerId === playerId);

    // Check cost requirements
    if (cost.Requires) {
      for (const requirement of cost.Requires) {
        let requiredCount = requirement.Count;

        let availableCards = playerCards.filter(card => {
          const cardData = this.cardDatabase.get(card.cardId);
          if (!cardData) return false;

          // Check category match
          if (requirement.Category && cardData.trophicCategory !== requirement.Category) {
            return false;
          }

          // Check level requirement
          if (requirement.Level && cardData.trophicLevel !== requirement.Level) {
            return false;
          }

          return !card.isExhausted; // Only ready cards can pay costs
        });

        // For Saprotrophs, also check if detritus can satisfy the cost
        if (isSaprotroph && position && this.hasDetritusAtPosition(position)) {
          const positionKey = `${position.x},${position.y}`;
          const detritusCard = gameState.grid.get(positionKey);

          console.log(`🍄 Saprotroph cost validation: checking detritus at ${position.x},${position.y}`);
          console.log(`🍄 Detritus found:`, detritusCard);

          if (detritusCard?.isDetritus) {
            const detritusCardData = this.cardDatabase.get(detritusCard.cardId);
            console.log(`🍄 Detritus card data:`, detritusCardData);
            console.log(`🍄 Requirement:`, requirement);

            if (detritusCardData) {
              // Check if detritus card matches the requirement
              const detritusMatches = (!requirement.Category || detritusCardData.trophicCategory === requirement.Category) &&
                                   (!requirement.Level || detritusCardData.trophicLevel === requirement.Level);

              console.log(`🍄 Detritus matches requirement: ${detritusMatches}`);
              console.log(`🍄 Category match: ${!requirement.Category || detritusCardData.trophicCategory === requirement.Category}`);
              console.log(`🍄 Level match: ${!requirement.Level || detritusCardData.trophicLevel === requirement.Level}`);

              if (detritusMatches) {
                // Detritus can satisfy one unit of the requirement
                requiredCount = Math.max(0, requiredCount - 1);
                console.log(`🍄 Detritus can satisfy cost, reduced required count to: ${requiredCount}`);
              }
            }
          }
        }

        if (availableCards.length < requiredCount) {
          return { isValid: false, errorMessage: `Insufficient resources: need ${requiredCount} ready cards of the required type` };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Pay the cost for playing a card
   */
  private payCost(state: GameState, cardData: CardData, playerId: string, position?: { x: number; y: number }): { isValid: boolean; errorMessage?: string } {
    if (!cardData.cost) return { isValid: true };

    const cost = typeof cardData.cost === 'string' ? JSON.parse(cardData.cost) : cardData.cost;
    const playerCards = Array.from(state.grid.values()).filter(card => card.ownerId === playerId);

    console.log(`💰 Paying cost for ${cardData.commonName}: ${JSON.stringify(cost)}`);
    console.log(`🎯 Player has ${playerCards.length} cards on grid`);

    console.log(`💰 Paying cost for ${cardData.commonName}:`, cost);

    // Special handling for Saprotrophs
    const isSaprotroph = cardData.trophicLevel === TrophicLevel.SAPROTROPH && this.isSaprotroph(cardData);

    if (cost.Requires) {
      for (const requirement of cost.Requires) {
        console.log(`🔍 Looking for ${requirement.Count} cards matching:`, requirement);
        let remainingCost = requirement.Count;

        // For Saprotrophs, try to use detritus first
        if (isSaprotroph && position) {
          console.log(`🍄 Saprotroph detected, checking for detritus at position ${position.x},${position.y}`);
          const positionKey = `${position.x},${position.y}`;
          const detritusCard = state.grid.get(positionKey);
          console.log(`🍄 Current detritus at position:`, detritusCard);
          const hasDetritusAtPos = detritusCard?.isDetritus === true;
          console.log(`🍄 hasDetritusAtPosition result:`, hasDetritusAtPos);

          if (detritusCard?.isDetritus) {
            const detritusCardData = this.cardDatabase.get(detritusCard.cardId);
            console.log(`🍄 Detritus card data:`, detritusCardData);

            if (detritusCardData) {
              // Check if detritus card matches the requirement
              const detritusMatches = (!requirement.Category || detritusCardData.trophicCategory === requirement.Category) &&
                                   (!requirement.Level || detritusCardData.trophicLevel === requirement.Level);

              console.log(`🍄 Requirement:`, requirement);
              console.log(`🍄 Detritus TrophicCategory: ${detritusCardData.trophicCategory}, TrophicLevel: ${detritusCardData.trophicLevel}`);
              console.log(`🍄 Detritus matches requirement: ${detritusMatches}`);

              if (detritusMatches && remainingCost > 0) {
                // The detritus will be consumed when the saprotroph is placed
                // For now, just count it as available for cost payment
                remainingCost--;
                console.log(`🍄 Saprotroph can use detritus (${detritusCardData.commonName}) to pay cost`);
              }
            }
          }
        }

        // Use regular cards for remaining cost
        const availableCards = playerCards.filter(card => {
          const cardData = this.cardDatabase.get(card.cardId);
          if (!cardData) return false;

          // Must be ready to pay costs
          if (card.isExhausted) return false;

          // Check category match
          if (requirement.Category && cardData.trophicCategory !== requirement.Category) {
            return false;
          }

          // Check level requirement
          if (requirement.Level && cardData.trophicLevel !== requirement.Level) {
            return false;
          }

          return true;
        });

        console.log(`✅ Found ${availableCards.length} available cards for requirement, need ${remainingCost} more`);

        if (availableCards.length < remainingCost) {
          return {
            isValid: false,
            errorMessage: `Insufficient resources: need ${remainingCost} ready cards of category ${requirement.Category}${requirement.Level ? ` level ${requirement.Level}` : ''}, found ${availableCards.length}`
          };
        }

        // Exhaust the required number of cards
        for (let i = 0; i < remainingCost; i++) {
          const card = availableCards[i];
          if (card) {
            card.isExhausted = true;
            const exhaustedCardData = this.cardDatabase.get(card.cardId);
            console.log(`😴 Exhausted ${exhaustedCardData?.commonName} to pay cost`);
          }
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Check if card should get preferred diet bonus (enter ready)
   */
  private checkPreferredDietBonus(cardData: CardData, adjacentCards: GridCard[]): boolean {
    // Only consumers (trophic level > 1) can get preferred diet bonuses
    if (!cardData.trophicLevel || cardData.trophicLevel <= 1) {
      return false;
    }

    // Check for trophic category matches (simplified preferred diet)
    for (const adjCard of adjacentCards) {
      const adjCardData = this.cardDatabase.get(adjCard.cardId);
      if (!adjCardData) continue;

      // Herbivores (category 3) get bonus when connecting to producers (category 1)
      if (cardData.trophicCategory === 3 && adjCardData.trophicCategory === 1) {
        console.log(`🍽️ Preferred diet match: Herbivore connecting to Producer`);
        return true;
      }

      // Carnivores (category 5) get bonus when connecting to herbivores (category 3)
      if (cardData.trophicCategory === 5 && adjCardData.trophicCategory === 3) {
        console.log(`🍽️ Preferred diet match: Carnivore connecting to Herbivore`);
        return true;
      }

      // Omnivores (category 4) get bonus when connecting to any food source
      if (cardData.trophicCategory === 4 && (adjCardData.trophicCategory === 1 || adjCardData.trophicCategory === 3)) {
        console.log(`🍽️ Preferred diet match: Omnivore connecting to food source`);
        return true;
      }
    }

    return false;
  }

  /**
   * Check for synergy bonuses (Preferred Diet)
   */
  private checkSynergyBonuses(_state: GameState, gridCard: GridCard): void {
    const cardData = this.cardDatabase.get(gridCard.cardId);
    if (!cardData) return;

    const adjacentCards = this.getAdjacentCards(gridCard.position);

    // Check for preferred diet bonuses
    const hasPreferredDiet = this.checkPreferredDiet(cardData, adjacentCards);
    if (hasPreferredDiet) {
      // Enter play ready instead of exhausted
      gridCard.isExhausted = false;
      console.log(`🌟 Synergy bonus: ${cardData.commonName} enters play ready due to preferred diet`);
    }
  }

  /**
   * Check if card has preferred diet available - Enhanced with more keyword combinations
   */
  private checkPreferredDiet(cardData: CardData, adjacentCards: GridCard[]): boolean {
    // Define keyword pairs for preferred diets
    const dietPairs = [
      { consumer: 18, food: 18 }, // FRUGIVORE + FRUIT
      { consumer: 19, food: 19 }, // INSECTIVORE + INSECT
      { consumer: 20, food: 20 }, // CARNIVORE + MEAT
      { consumer: 21, food: 21 }, // HERBIVORE + PLANT
      { consumer: 22, food: 22 }, // PISCIVORE + FISH
      { consumer: 23, food: 23 }, // NECTARIVORE + NECTAR
      { consumer: 24, food: 24 }, // GRANIVORE + SEED
      { consumer: 25, food: 25 }, // FOLIVORE + LEAF
      { consumer: 26, food: 26 }, // MOLLUSCIVORE + MOLLUSK
      { consumer: 27, food: 27 }, // DETRITIVORE + DETRITUS
    ];

    // Check each diet pair
    for (const pair of dietPairs) {
      if (cardData.keywords.includes(pair.consumer)) {
        const hasPreferredFood = adjacentCards.some(card => {
          const adjCardData = this.cardDatabase.get(card.cardId);
          return adjCardData && adjCardData.keywords.includes(pair.food);
        });

        if (hasPreferredFood) {
          console.log(`🍽️ Preferred diet match found: consumer keyword ${pair.consumer} with food keyword ${pair.food}`);
          return true;
        }
      }
    }

    // Special case: Mixotrophs (producers with consumer abilities)
    if (cardData.trophicLevel === 1 && this.hasMixotrophAbilities(cardData)) {
      // Mixotrophs get bonus when connecting to both light and food sources
      const hasLightSource = adjacentCards.some(card => {
        const adjCardData = this.cardDatabase.get(card.cardId);
        return adjCardData && adjCardData.trophicLevel === 1; // Other producers
      }) || this.isNearHome(adjacentCards);

      const hasFoodSource = adjacentCards.some(card => {
        const adjCardData = this.cardDatabase.get(card.cardId);
        return adjCardData && adjCardData.trophicLevel && adjCardData.trophicLevel > 1; // Consumers or prey
      });

      if (hasLightSource && hasFoodSource) {
        console.log(`🌱 Mixotroph bonus: dual nutrition sources available`);
        return true;
      }

      // Alternative: Mixotrophs can also get bonus from specific prey types
      const hasSpecificPrey = this.checkMixotrophPreyBonus(cardData, adjacentCards);
      if (hasSpecificPrey) {
        console.log(`🌱 Mixotroph bonus: specific prey available`);
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a card has mixotrophic abilities (producer with consumer abilities)
   */
  private hasMixotrophAbilities(cardData: CardData): boolean {
    // Check if the card has both producer traits and consumer keywords
    const hasConsumerKeywords = cardData.keywords.some(keyword =>
      [18, 19, 20, 21, 22, 23, 24, 25, 26, 27].includes(keyword) // Consumer diet keywords
    );

    // Also check for specific mixotroph keywords
    const isMixotroph = cardData.keywords.includes(33); // Assuming keyword ID 33 for MIXOTROPH

    return cardData.trophicLevel === 1 && (hasConsumerKeywords || isMixotroph);
  }

  /**
   * Check if mixotroph is near HOME position
   */
  private isNearHome(adjacentCards: GridCard[]): boolean {
    // Check if any adjacent position is HOME (center of grid)
    return adjacentCards.some(card =>
      this.isHomePosition(card.position)
    );
  }

  /**
   * Check for specific prey bonuses for mixotrophs
   */
  private checkMixotrophPreyBonus(cardData: CardData, adjacentCards: GridCard[]): boolean {
    // Venus Flytrap example: gets bonus when adjacent to insects
    if (cardData.commonName.toLowerCase().includes('venus flytrap') ||
        cardData.keywords.includes(19)) { // INSECTIVORE
      return adjacentCards.some(card => {
        const adjCardData = this.cardDatabase.get(card.cardId);
        return adjCardData && adjCardData.keywords.includes(19); // INSECT keyword
      });
    }

    // Sundew example: gets bonus when adjacent to small arthropods
    if (cardData.commonName.toLowerCase().includes('sundew')) {
      return adjacentCards.some(card => {
        const adjCardData = this.cardDatabase.get(card.cardId);
        return adjCardData && (
          adjCardData.keywords.includes(26) || // INSECT (from enum)
          adjCardData.keywords.includes(KeywordId.ARTHROPOD)    // ARTHROPOD
        );
      });
    }

    // Bladderwort example: gets bonus when adjacent to aquatic microorganisms
    if (cardData.commonName.toLowerCase().includes('bladderwort')) {
      return adjacentCards.some(card => {
        const adjCardData = this.cardDatabase.get(card.cardId);
        return adjCardData &&
               adjCardData.keywords.includes(2) && // AQUATIC
               adjCardData.trophicLevel === 2; // Small consumers
      });
    }

    return false;
  }

  /**
   * Process mixotroph special abilities
   */
  private processMixotrophAbilities(gameState: GameState, mixotroph: GridCard, cardData: CardData): void {
    if (!this.hasMixotrophAbilities(cardData)) return;

    const adjacentCards = this.getAdjacentCards(mixotroph.position);

    // Check for dual nutrition bonus
    const hasLightSource = this.isNearHome(adjacentCards) ||
                          adjacentCards.some(card => {
                            const adjCardData = this.cardDatabase.get(card.cardId);
                            return adjCardData && adjCardData.trophicLevel === 1;
                          });

    const hasFoodSource = adjacentCards.some(card => {
      const adjCardData = this.cardDatabase.get(card.cardId);
      return adjCardData && adjCardData.trophicLevel && adjCardData.trophicLevel > 1;
    });

    if (hasLightSource && hasFoodSource) {
      // Grant energy bonus for dual nutrition
      const player = gameState.players.find(p => p.id === mixotroph.ownerId);
      if (player) {
        player.energy += 1;
        console.log(`🌱⚡ Mixotroph ${cardData.commonName} gained energy from dual nutrition`);
      }
    }

    // Process specific prey capture abilities
    if (this.checkMixotrophPreyBonus(cardData, adjacentCards)) {
      // Ready the mixotroph for capturing prey
      mixotroph.isExhausted = false;
      console.log(`🌱🦟 Mixotroph ${cardData.commonName} ready to capture prey`);
    }
  }

  /**
   * Execute ability effects
   */
  private executeEffects(effects: any[], context: EffectContext): { isValid: boolean; errorMessage?: string } {
    for (const effect of effects) {
      const result = this.executeEffect(effect, context);
      if (!result.isValid) {
        return result;
      }
    }
    return { isValid: true };
  }

  /**
   * Execute a single effect
   */
  private executeEffect(effect: any, context: EffectContext): { isValid: boolean; errorMessage?: string } {
    // Debug logging to identify the issue
    console.log(`🎯 Executing effect ${effect.EffectID} for ability ${context.ability.abilityID}`);

    // Ensure EffectID exists and is a number
    const effectId = effect.EffectID || effect.effectId || effect.id;
    if (!effectId) {
      console.error(`❌ No EffectID found in effect:`, effect);
      return { isValid: false, errorMessage: 'Effect missing EffectID' };
    }

    switch (effectId) {
      case 1: // TARGET
        return this.executeTargetEffect(effect, context);
      case 2: // TAKE_CARD
        return this.executeTakeCardEffect(effect, context);
      case 3: // APPLY_STATUS
        return this.executeApplyStatusEffect(effect, context);
      case 4: // MOVE_CARD
        return this.executeMoveCardEffect(effect, context);
      case 5: // EXHAUST_TARGET
        return this.executeExhaustTargetEffect(effect, context);
      case 6: // READY_TARGET
        return this.executeReadyTargetEffect(effect, context);
      case 7: // DESTROY_TARGET
        return this.executeDestroyTargetEffect(effect, context);
      case 8: // GAIN_ENERGY
        return this.executeGainEnergyEffect(effect, context);
      case 9: // LOSE_ENERGY
        return this.executeLoseEnergyEffect(effect, context);
      case 10: // DRAW_CARD
        return this.executeDrawCardEffect(effect, context);
      case 11: // MOVE_TO_HAND
        return this.executeMoveToHandEffect(effect, context);
      case 12: // PREVENT_READY
        return this.executePreventReadyEffect(effect, context);
      case 13: // GAIN_VP
        return this.executeGainVPEffect(effect, context);
      case 14: // DISCARD_CARD
        return this.executeDiscardCardEffect(effect, context);
      default:
        console.warn(`⚠️ Unknown effect ID: ${effectId}`);
        return { isValid: true }; // Continue execution for unknown effects
    }
  }

  /**
   * Execute TARGET effect - select targets for other effects
   */
  private executeTargetEffect(effect: any, context: EffectContext): { isValid: boolean; errorMessage?: string } {
    const targets = this.selectTargets(effect, context);
    if (targets.length === 0) {
      return { isValid: false, errorMessage: 'No valid targets found' };
    }

    // Execute action on targets
    for (const target of targets) {
      const actionResult = this.executeAction(effect.ActionID, target, context);
      if (!actionResult.isValid) {
        return actionResult;
      }
    }

    return { isValid: true };
  }

  /**
   * Execute TAKE_CARD effect - take cards from zones
   */
  private executeTakeCardEffect(effect: any, context: EffectContext): { isValid: boolean; errorMessage?: string } {
    if (effect.SelectorID === 3) { // CARD_IN_DETRITUS_ZONE
      const player = context.gameState.players.find(p => p.id === context.actingCard.ownerId);
      if (!player) return { isValid: false, errorMessage: 'Player not found' };

      // Find all detritus cards on the grid
      const detritusCards = Array.from(context.gameState.grid.values()).filter(card => card.isDetritus);

      if (detritusCards.length === 0) {
        return { isValid: false, errorMessage: 'No cards in detritus zone' };
      }

      // Take the most recent detritus card (last in array)
      const takenCard = detritusCards[detritusCards.length - 1];
      if (takenCard) {
        player.hand.push(takenCard.cardId.toString());

        // Remove the detritus card from the grid
        const positionKey = `${takenCard.position.x},${takenCard.position.y}`;
        context.gameState.grid.delete(positionKey);

        console.log(`📥 ${player.name} took card ${takenCard.cardId} from detritus zone`);
      }
    }

    return { isValid: true };
  }

  /**
   * Execute APPLY_STATUS effect - apply status effects to targets
   */
  private executeApplyStatusEffect(effect: any, context: EffectContext): { isValid: boolean; errorMessage?: string } {
    if (!context.targetCard) {
      return { isValid: false, errorMessage: 'No target specified for status effect' };
    }

    const statusEffect: StatusEffect = {
      effectId: this.generateInstanceId(),
      type: effect.StatusType || 'generic',
      duration: effect.Duration || 1,
      source: context.actingCard.instanceId,
      metadata: effect.Metadata || {}
    };

    context.targetCard.statusEffects.push(statusEffect);
    console.log(`✨ Applied ${statusEffect.type} to ${context.targetCard.instanceId}`);

    return { isValid: true };
  }

  /**
   * Execute MOVE_CARD effect - move cards between zones
   */
  private executeMoveCardEffect(effect: any, context: EffectContext): { isValid: boolean; errorMessage?: string } {
    if (!context.targetCard) {
      return { isValid: false, errorMessage: 'No target specified for move effect' };
    }

    const actionResult = this.executeAction(effect.ActionID, context.targetCard, context);
    return actionResult;
  }

  /**
   * Execute EXHAUST_TARGET effect
   */
  private executeExhaustTargetEffect(_effect: any, context: EffectContext): { isValid: boolean; errorMessage?: string } {
    if (!context.targetCard) {
      return { isValid: false, errorMessage: 'No target specified for exhaust effect' };
    }

    context.targetCard.isExhausted = true;
    console.log(`😴 Exhausted ${context.targetCard.instanceId}`);

    return { isValid: true };
  }

  /**
   * Execute READY_TARGET effect
   */
  private executeReadyTargetEffect(_effect: any, context: EffectContext): { isValid: boolean; errorMessage?: string } {
    if (!context.targetCard) {
      return { isValid: false, errorMessage: 'No target specified for ready effect' };
    }

    context.targetCard.isExhausted = false;
    console.log(`⚡ Readied ${context.targetCard.instanceId}`);

    return { isValid: true };
  }

  /**
   * Execute DESTROY_TARGET effect
   */
  private executeDestroyTargetEffect(_effect: any, context: EffectContext): { isValid: boolean; errorMessage?: string } {
    if (!context.targetCard) {
      return { isValid: false, errorMessage: 'No target specified for destroy effect' };
    }

    // Move card to detritus zone
    const positionKey = `${context.targetCard.position.x},${context.targetCard.position.y}`;

    // Convert the card to detritus instead of removing it
    const detritusCard: GridCard = {
      ...context.targetCard,
      isDetritus: true,
      isExhausted: true // Visual indicator that it's face-down
    };

    context.gameState.grid.set(positionKey, detritusCard);

    console.log(`💀 Destroyed ${context.targetCard.instanceId}`);

    return { isValid: true };
  }

  /**
   * Execute GAIN_ENERGY effect
   */
  private executeGainEnergyEffect(effect: any, context: EffectContext): { isValid: boolean; errorMessage?: string } {
    const player = context.gameState.players.find(p => p.id === context.actingCard.ownerId);
    if (!player) return { isValid: false, errorMessage: 'Player not found' };

    const amount = effect.Amount || 1;
    player.energy += amount;
    console.log(`⚡ ${player.name} gained ${amount} energy`);

    return { isValid: true };
  }

  /**
   * Execute LOSE_ENERGY effect
   */
  private executeLoseEnergyEffect(effect: any, context: EffectContext): { isValid: boolean; errorMessage?: string } {
    const player = context.gameState.players.find(p => p.id === context.actingCard.ownerId);
    if (!player) return { isValid: false, errorMessage: 'Player not found' };

    const amount = effect.Amount || 1;
    player.energy = Math.max(0, player.energy - amount);
    console.log(`⚡ ${player.name} lost ${amount} energy`);

    return { isValid: true };
  }

  /**
   * Execute DRAW_CARD effect
   */
  private executeDrawCardEffect(effect: any, context: EffectContext): { isValid: boolean; errorMessage?: string } {
    const player = context.gameState.players.find(p => p.id === context.actingCard.ownerId);
    if (!player) return { isValid: false, errorMessage: 'Player not found' };

    if (player.deck.length === 0) {
      return { isValid: false, errorMessage: 'No cards left in deck' };
    }

    const amount = effect.value || effect.Amount || 1;
    for (let i = 0; i < amount && player.deck.length > 0; i++) {
      const drawnCard = player.deck.pop();
      if (drawnCard) {
        player.hand.push(drawnCard);
        console.log(`🃏 ${player.name} drew a card`);
      }
    }

    return { isValid: true };
  }

  /**
   * Execute MOVE_TO_HAND effect
   */
  private executeMoveToHandEffect(effect: any, context: EffectContext): { isValid: boolean; errorMessage?: string } {
    const targets = this.selectTargets(effect, context);

    for (const target of targets) {
      const player = context.gameState.players.find(p => p.id === target.ownerId);
      if (player) {
        const positionKey = `${target.position.x},${target.position.y}`;
        context.gameState.grid.delete(positionKey);
        player.hand.push(target.instanceId);
        console.log(`🏠 ${target.cardId} moved to ${player.name}'s hand`);
      }
    }

    return { isValid: true };
  }

  /**
   * Execute PREVENT_READY effect
   */
  private executePreventReadyEffect(effect: any, context: EffectContext): { isValid: boolean; errorMessage?: string } {
    const targets = this.selectTargets(effect, context);
    const duration = effect.Duration || 1;

    for (const target of targets) {
      target.statusEffects.push({
        effectId: this.generateInstanceId(),
        type: 'prevent_ready',
        duration: duration,
        source: context.actingCard.instanceId,
        metadata: {}
      });
      console.log(`🚫 ${target.cardId} cannot ready for ${duration} turn(s)`);
    }

    return { isValid: true };
  }

  /**
   * Execute GAIN_VP effect
   */
  private executeGainVPEffect(effect: any, context: EffectContext): { isValid: boolean; errorMessage?: string } {
    const targets = this.selectTargets(effect, context);
    const player = context.gameState.players.find(p => p.id === context.actingCard.ownerId);

    if (!player) return { isValid: false, errorMessage: 'Player not found' };

    for (const target of targets) {
      const positionKey = `${target.position.x},${target.position.y}`;
      context.gameState.grid.delete(positionKey);
      player.scorePile.push(target);
      console.log(`🏆 ${player.name} gained VP from ${target.cardId}`);
    }

    return { isValid: true };
  }

  /**
   * Execute DISCARD_CARD effect
   */
  private executeDiscardCardEffect(effect: any, context: EffectContext): { isValid: boolean; errorMessage?: string } {
    const targets = this.selectTargets(effect, context);

    for (const target of targets) {
      const player = context.gameState.players.find(p => p.id === target.ownerId);
      if (player) {
        const handIndex = player.hand.indexOf(target.instanceId);
        if (handIndex !== -1) {
          player.hand.splice(handIndex, 1);
          console.log(`🗑️ ${target.cardId} discarded from ${player.name}'s hand`);
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Select targets based on selector and filters
   */
  private selectTargets(effect: any, context: EffectContext): GridCard[] {
    const targets: GridCard[] = [];

    switch (effect.SelectorID) {
      case 1: // ADJACENT
        targets.push(...this.getAdjacentCards(context.actingCard.position));
        break;
      case 2: // ADJACENT_TO_SHARED_AMPHIBIOUS
        targets.push(...this.getAdjacentsToSharedAmphibious(context.actingCard));
        break;
      case 3: // CARD_IN_DETRITUS_ZONE
        // Note: Detritus cards are DetritusCard type, not GridCard
        // This selector needs special handling for detritus zone
        // For now, skip detritus targeting until we implement proper conversion
        break;
      case 4: // SELF_HOST
        if (context.actingCard.attachments.length > 0) {
          // Find the host this card is attached to
          for (const card of context.gameState.grid.values()) {
            if (card.attachments.some(att => att.instanceId === context.actingCard.instanceId)) {
              targets.push(card);
              break;
            }
          }
        }
        break;
      case 5: // ALL_CARDS
        targets.push(...Array.from(context.gameState.grid.values()));
        break;
      case 6: // RANDOM_CARD
        const allCards = Array.from(context.gameState.grid.values());
        if (allCards.length > 0) {
          const randomIndex = Math.floor(Math.random() * allCards.length);
          const randomCard = allCards[randomIndex];
          if (randomCard) {
            targets.push(randomCard);
          }
        }
        break;
    }

    // Apply filters
    return this.applyFilters(targets, effect, context);
  }

  /**
   * Apply filters to target selection
   */
  private applyFilters(targets: GridCard[], effect: any, _context: EffectContext): GridCard[] {
    let filteredTargets = targets;

    // Filter by keywords
    if (effect.FilterKeywords) {
      filteredTargets = filteredTargets.filter(card => {
        const cardData = this.cardDatabase.get(card.cardId);
        return cardData && effect.FilterKeywords.some((keyword: number) => cardData.keywords.includes(keyword));
      });
    }

    // Filter by trophic categories
    if (effect.FilterTrophicCategories) {
      filteredTargets = filteredTargets.filter(card => {
        const cardData = this.cardDatabase.get(card.cardId);
        return cardData && effect.FilterTrophicCategories.includes(cardData.trophicCategory);
      });
    }

    // Filter by trophic levels
    if (effect.FilterTrophicLevels) {
      filteredTargets = filteredTargets.filter(card => {
        const cardData = this.cardDatabase.get(card.cardId);
        return cardData && effect.FilterTrophicLevels.includes(cardData.trophicLevel);
      });
    }

    return filteredTargets;
  }

  /**
   * Execute an action on a target
   */
  private executeAction(actionId: number, target: GridCard, context: EffectContext): { isValid: boolean; errorMessage?: string } {
    switch (actionId) {
      case 1: // EXHAUST_TARGET
        target.isExhausted = true;
        break;
      case 2: // READY_TARGET
        target.isExhausted = false;
        break;
      case 3: // MOVE_TO_HAND
        const player = context.gameState.players.find(p => p.id === target.ownerId);
        if (player) {
          const positionKey = `${target.position.x},${target.position.y}`;
          context.gameState.grid.delete(positionKey);
          player.hand.push(target.instanceId);
        }
        break;
      case 4: // MOVE_TO_DETRITUS
        const detritusKey = `${target.position.x},${target.position.y}`;

        // Convert the card to detritus instead of removing it
        const detritusCard: GridCard = {
          ...target,
          isDetritus: true,
          isExhausted: true // Visual indicator that it's face-down
        };

        context.gameState.grid.set(detritusKey, detritusCard);
        break;
      case 5: // PREVENT_READY
        target.statusEffects.push({
          effectId: this.generateInstanceId(),
          type: 'prevent_ready',
          duration: 1,
          source: context.actingCard.instanceId,
          metadata: {}
        });
        break;
      case 6: // GAIN_VP
        const vpPlayer = context.gameState.players.find(p => p.id === context.actingCard.ownerId);
        if (vpPlayer) {
          vpPlayer.scorePile.push(target);
        }
        break;
      case 7: // DRAW_CARD
        const drawPlayer = context.gameState.players.find(p => p.id === context.actingCard.ownerId);
        if (drawPlayer && drawPlayer.deck.length > 0) {
          const drawnCard = drawPlayer.deck.pop()!;
          drawPlayer.hand.push(drawnCard);
        }
        break;
      case 8: // DISCARD_CARD
        const discardPlayer = context.gameState.players.find(p => p.id === target.ownerId);
        if (discardPlayer) {
          const handIndex = discardPlayer.hand.indexOf(target.instanceId);
          if (handIndex !== -1) {
            discardPlayer.hand.splice(handIndex, 1);
          }
        }
        break;
    }

    return { isValid: true };
  }

  /**
   * Get cards adjacent to a position
   */
  private getAdjacentCards(position: { x: number; y: number }): GridCard[] {
    const adjacent: GridCard[] = [];
    const directions = [
      { x: 0, y: 1 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }
    ];

    for (const dir of directions) {
      const adjPos = { x: position.x + dir.x, y: position.y + dir.y };
      const positionKey = `${adjPos.x},${adjPos.y}`;
      const gameState = this.ensureGameInitialized();
      const card = gameState.grid.get(positionKey);
      if (card) {
        adjacent.push(card);
      }
    }

    return adjacent;
  }

  /**
   * Get cards adjacent to shared amphibious cards
   */
  private getAdjacentsToSharedAmphibious(actingCard: GridCard): GridCard[] {
    const targets: GridCard[] = [];
    const adjacentToActor = this.getAdjacentCards(actingCard.position);

    // Find amphibious cards adjacent to the acting card
    const amphibiousCards = adjacentToActor.filter(card => {
      const cardData = this.cardDatabase.get(card.cardId);
      return cardData && cardData.keywords.includes(3); // AMPHIBIOUS keyword
    });

    // For each amphibious card, get its other adjacent cards
    for (const amphibiousCard of amphibiousCards) {
      const adjacentToAmphibious = this.getAdjacentCards(amphibiousCard.position);
      for (const card of adjacentToAmphibious) {
        if (card.instanceId !== actingCard.instanceId && !targets.some(t => t.instanceId === card.instanceId)) {
          targets.push(card);
        }
      }
    }

    return targets;
  }

  /**
   * Check if position is a HOME position
   */
  private isHomePosition(position: { x: number; y: number }): boolean {
    // Check if there's actually a HOME card at this position
    const gameState = this.ensureGameInitialized();
    const positionKey = `${position.x},${position.y}`;
    const card = gameState.grid.get(positionKey);
    return card?.isHOME === true;
  }

  /**
   * Handle pass turn action - now manages turn phases
   */
  private handlePassTurn(playerId: string): { isValid: boolean; newState?: GameState; errorMessage?: string } {
    if (this.getCurrentPlayer().id !== playerId) {
      return { isValid: false, errorMessage: 'Not your turn' };
    }

    const newState = this.cloneGameState();

    // Process turn end abilities for the current player
    this.processTriggerAbilities(newState, 'on_turn_end');
    this.processPassiveAbilities(newState, 'turn_end');

    // Update status effect durations
    this.updateStatusEffects(newState);

    // Handle final turn logic
    if (newState.gamePhase === GamePhase.FINAL_TURN && newState.finalTurnPlayersRemaining) {
      // Remove current player from final turn list
      newState.finalTurnPlayersRemaining = newState.finalTurnPlayersRemaining.filter(id => id !== playerId);

      console.log(`🏁 ${this.getCurrentPlayer().name} completed their final turn`);
      console.log(`🏁 Players remaining for final turn: ${newState.finalTurnPlayersRemaining.join(', ')}`);

      // Check if all final turns are complete
      if (newState.finalTurnPlayersRemaining.length === 0) {
        console.log(`🏁 All final turns complete - ending game`);
        this.endGame(newState, 'deck_empty');
        this.gameState = newState;
        return { isValid: true, newState };
      }
    }

    // Move to next player
    const nextPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
    newState.currentPlayerIndex = nextPlayerIndex;

    // Increment turn number only when we complete a full round (back to player 0)
    if (nextPlayerIndex === 0) {
      newState.turnNumber++;
    }

    // Start new turn with Ready Phase
    this.startNewTurn(newState);

    this.gameState = newState;
    return { isValid: true, newState };
  }

  /**
   * Start a new turn with proper phase progression
   */
  private startNewTurn(state: GameState): void {
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer) return;

    console.log(`🔄 Starting turn ${state.turnNumber} for ${currentPlayer.name}`);

    // Phase 1: Ready Phase
    this.executeReadyPhase(state);

    // Phase 2: Draw Phase
    const drawResult = this.executeDrawPhase(state);
    if (!drawResult.success) {
      // Handle based on game phase
      if (state.gamePhase === GamePhase.FINAL_TURN) {
        // During final turn, skip to action phase even if can't draw
        console.log(`🏁 ${currentPlayer.name} cannot draw during final turn - proceeding to action phase`);
        this.executeActionPhase(state);
      } else {
        // Normal game phase - this should trigger final turn (handled in executeDrawPhase)
        console.log(`🏁 Draw failed during normal play - final turn should be triggered`);
        // Game should end if not in final turn
        state.gamePhase = GamePhase.ENDED;
        console.log(`🏁 Game ended - ${currentPlayer?.name} cannot draw a card`);
        return;
      }
    } else {
      // Phase 3: Action Phase (normal draw success)
      this.executeActionPhase(state);
    }
  }

  /**
   * Execute Ready Phase - ready all player's cards
   */
  private executeReadyPhase(state: GameState): void {
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer) return;

    state.turnPhase = TurnPhase.READY;

    console.log(`⚡ Ready Phase: Readying ${currentPlayer.name}'s cards`);

    // Ready all cards owned by the current player
    for (const card of state.grid.values()) {
      if (card.ownerId === currentPlayer.id) {
        // Check for prevent ready status effects
        const hasPreventReady = card.statusEffects.some(effect => effect.type === 'prevent_ready');
        if (!hasPreventReady) {
          card.isExhausted = false;
        }
      }
    }

    // Process turn start abilities
    this.processTriggerAbilities(state, 'on_turn_start');
    this.processPassiveAbilities(state, 'turn_start');

    // Process mixotroph abilities
    this.processMixotrophsOnTurnStart(state);

    // Give energy to the current player
    currentPlayer.energy += 1;
    console.log(`⚡ ${currentPlayer.name} gained 1 energy (now has ${currentPlayer.energy})`);
  }

  /**
   * Execute Draw Phase - mandatory card draw
   */
  private executeDrawPhase(state: GameState): { success: boolean; errorMessage?: string } {
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer) return { success: false, errorMessage: 'No current player' };

    state.turnPhase = TurnPhase.DRAW;

    console.log(`🃏 Draw Phase: ${currentPlayer.name} draws a card`);

    if (currentPlayer.deck.length === 0) {
      // Trigger final turn system instead of immediately ending game
      if (!state.finalTurnTriggeredBy) {
        // First player to run out of cards triggers final turn
        state.finalTurnTriggeredBy = currentPlayer.id;
        state.gamePhase = GamePhase.FINAL_TURN;

        // All other players get one final turn
        state.finalTurnPlayersRemaining = state.players
          .filter(p => p.id !== currentPlayer.id)
          .map(p => p.id);

        console.log(`🏁 Final turn triggered by ${currentPlayer.name}! Other players get one final turn.`);
        console.log(`🏁 Players remaining for final turn: ${state.finalTurnPlayersRemaining?.join(', ')}`);

        // Current player's turn ends immediately (can't draw)
        return { success: false, errorMessage: 'No cards left in deck - final turn triggered' };
      } else {
        // Already in final turn phase, this player also can't draw
        console.log(`🏁 ${currentPlayer.name} also cannot draw during final turn phase`);
        return { success: false, errorMessage: 'No cards left in deck during final turn' };
      }
    }

    // Draw one card
    const drawnCard = currentPlayer.deck.pop()!;
    currentPlayer.hand.push(drawnCard);
    console.log(`🃏 ${currentPlayer.name} drew a card (hand: ${currentPlayer.hand.length})`);

    return { success: true };
  }

  /**
   * Execute Action Phase - player can take up to 3 actions
   */
  private executeActionPhase(state: GameState): void {
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer) return;

    state.turnPhase = TurnPhase.ACTION;
    state.actionsRemaining = 3; // Maximum 3 actions per turn

    console.log(`🎯 Action Phase: ${currentPlayer.name} has ${state.actionsRemaining} actions`);
  }

  /**
   * Update status effect durations
   */
  private updateStatusEffects(state: GameState): void {
    for (const card of state.grid.values()) {
      card.statusEffects = card.statusEffects.filter(effect => {
        effect.duration--;
        return effect.duration > 0;
      });
    }
  }

  /**
   * Handle move card action (for special abilities)
   */
  private handleMoveCard(_payload: any): { isValid: boolean; newState?: GameState; errorMessage?: string } {
    // TODO: Implement move card logic for migration abilities
    const gameState = this.ensureGameInitialized();
    return { isValid: true, newState: gameState };
  }

  /**
   * Handle challenge action (for competitive play)
   */
  private handleChallenge(_payload: any): { isValid: boolean; newState?: GameState; errorMessage?: string } {
    // TODO: Implement challenge logic for rule disputes
    const gameState = this.ensureGameInitialized();
    return { isValid: true, newState: gameState };
  }

  /**
   * Handle player ready action (for game setup)
   */
  private handlePlayerReady(playerId: string): { isValid: boolean; newState?: GameState; errorMessage?: string } {
    const newState = this.cloneGameState();
    const player = newState.players.find(p => p.id === playerId);

    if (!player) {
      return { isValid: false, errorMessage: 'Player not found' };
    }

    // Mark player as ready
    player.isReady = true;

    // Check if all players are ready
    const allReady = newState.players.every(p => p.isReady);
    if (allReady && newState.gamePhase === GamePhase.SETUP) {
      newState.gamePhase = GamePhase.PLAYING;
      // Start the first turn in action phase
      newState.turnPhase = TurnPhase.ACTION;
      newState.actionsRemaining = 3;

      // Give players starting energy and cards
      newState.players.forEach(p => {
        p.energy = newState.gameSettings.startingEnergy || 3;

        // Get available card IDs from the card database
        const availableCardIds = Array.from(this.cardDatabase.keys());

        if (availableCardIds.length > 0) {
          // Shuffle and distribute real cards
          const shuffledCards = [...availableCardIds].sort(() => Math.random() - 0.5);
          p.hand = shuffledCards.slice(0, 5).map(String);
          p.deck = shuffledCards.slice(5, 15).map(String);
        } else {
          // Fallback to placeholder cards if no database available
          console.warn('⚠️ No cards in database, using placeholder cards');
          p.hand = ['1', '2', '3', '4', '5'];
          p.deck = ['6', '7', '8', '9', '10', '11', '12', '13', '14', '15'];
        }
      });

      console.log(`🎮 Game started! Player ${newState.players[newState.currentPlayerIndex]?.name} begins with ${newState.actionsRemaining} actions`);
    }

    this.gameState = newState;
    return { isValid: true, newState };
  }

  /**
   * Handle remove card action (for death/removal effects)
   */
  private handleRemoveCard(payload: any): { isValid: boolean; newState?: GameState; errorMessage?: string } {
    const { instanceId, reason } = payload;
    const newState = this.cloneGameState();

    // Find and remove the card from grid
    const cardPosition = Array.from(newState.grid.entries()).find(([_, card]) =>
      card.instanceId === instanceId
    );

    if (!cardPosition) {
      return { isValid: false, errorMessage: 'Card not found on grid' };
    }

    const [position, card] = cardPosition;

    // Process death abilities before removing the card
    if (reason === 'death') {
      const cardData = this.cardDatabase.get(card.cardId);
      if (cardData && cardData.abilities) {
        const deathAbilities = cardData.abilities
          .map(abilityId => this.abilityDatabase.get(abilityId))
          .filter(ability => ability && ability.triggerID === 4); // 4 = ON_DEATH trigger

        for (const ability of deathAbilities) {
          if (ability) {
            console.log(`💀 Triggering death ability: ${ability.abilityID}`);
            this.processAbilityEffects(newState, card, ability);
          }
        }
      }

      // Trigger passive abilities that respond to death
      this.processTriggerAbilities(newState, 'on_death', card);
      this.processPassiveAbilities(newState, 'card_death');
    }

    // Remove the card from grid
    newState.grid.delete(position);

    // Create detritus tile if it's a creature death
    if (reason === 'death') {
      // Convert the card to detritus by setting the flag and keeping it on the grid
      const detritusCard: GridCard = {
        ...card,
        isDetritus: true,
        isExhausted: true // Visual indicator that it's face-down
      };

      // Put the detritus card back on the grid
      newState.grid.set(position, detritusCard);

      console.log(`🪦 ${card.cardId} died and became detritus at ${card.position.x},${card.position.y}`);
    }

    this.gameState = newState;
    return { isValid: true, newState };
  }

  // Getters for external access
  public getGameState(): GameState {
    if (!this.gameState) {
      throw new Error('Game not initialized. Call initializeNewGame() first.');
    }
    return this.gameState;
  }

  public isGameInitialized(): boolean {
    return this.gameState !== null;
  }

  /**
   * Private helper to ensure game is initialized before operations
   */
  private ensureGameInitialized(): GameState {
    if (!this.gameState) {
      throw new Error('Game not initialized. Call initializeNewGame() first.');
    }
    return this.gameState;
  }

  public getCardDatabase(): Map<number, CardData> {
    return this.cardDatabase;
  }

  public getAbilityDatabase(): Map<number, AbilityData> {
    return this.abilityDatabase;
  }

  /**
   * Get card data by ID (public method)
   */
  public getCardData(cardId: number): CardData | undefined {
    return this.cardDatabase.get(cardId);
  }

  /**
   * Get ability data by ID (public method)
   */
  public getAbilityData(abilityId: number): AbilityData | undefined {
    return this.abilityDatabase.get(abilityId);
  }

  /**
   * Process ON_PLAY abilities when a card is played
   */
  private processOnPlayAbilities(gameState: GameState, playedCard: GridCard, cardData: CardData): void {
    if (cardData.abilities.length === 0) {
      return;
    }

    // Find all ON_PLAY abilities for this card
    const onPlayAbilities = cardData.abilities
      .map(abilityId => this.abilityDatabase.get(abilityId))
      .filter(ability => ability && ability.triggerID === 1); // 1 = ON_PLAY trigger

    // Process each ON_PLAY ability
    for (const ability of onPlayAbilities) {
      if (ability) {
        this.processAbilityEffects(gameState, playedCard, ability);
      }
    }

    // Also process any passive abilities that might be triggered by this card being played
    this.processPassiveAbilities(gameState, 'card_played');
    this.processTriggerAbilities(gameState, 'on_play', playedCard);
  }

  /**
   * Process the effects of an ability
   */
  private processAbilityEffects(gameState: GameState, sourceCard: GridCard, ability: AbilityData): void {
    if (!ability.effects || ability.effects.length === 0) {
      return;
    }

    // Create effect context
    const context: EffectContext = {
      actingCard: sourceCard,
      targetCard: undefined, // For ON_PLAY abilities, no specific target
      gameState: gameState,
      ability: ability
    };

    // Use the existing executeEffects method
    this.executeEffects(ability.effects, context);
  }





  /**
   * Process all passive abilities currently in play
   */
  private processPassiveAbilities(gameState: GameState, triggerEvent?: string): void {
    console.log(`🔄 Processing passive abilities for trigger: ${triggerEvent || 'general'}`);

    // Find all cards on the grid with passive abilities
    for (const [_position, gridCard] of gameState.grid) {
      const cardData = this.cardDatabase.get(gridCard.cardId);
      if (!cardData || !cardData.abilities) {
        continue;
      }

      // Find passive abilities (trigger_id 3)
      const passiveAbilities = cardData.abilities
        .map(abilityId => this.abilityDatabase.get(abilityId))
        .filter(ability => ability && ability.triggerID === 3); // 3 = PASSIVE trigger

      // Process each passive ability
      for (const ability of passiveAbilities) {
        if (ability && this.shouldTriggerPassiveAbility(ability, triggerEvent)) {
          console.log(`⚡ Triggering passive ability: ${ability.abilityID}`);
          this.processAbilityEffects(gameState, gridCard, ability);
        }
      }
    }
  }

  /**
   * Check if a passive ability should trigger for a specific event
   */
  private shouldTriggerPassiveAbility(ability: AbilityData, triggerEvent?: string): boolean {
    // For now, trigger all passive abilities on any event
    // In a full implementation, you'd check ability metadata for specific triggers
    // like "on_card_played", "on_turn_start", "on_death", etc.

    // Example logic for specific triggers (using ability IDs):
    // TODO: Replace with proper ability ID checks based on actual game data
    if (ability.abilityID === 21) { // Decomposer ability
      return triggerEvent === 'card_death' || triggerEvent === 'turn_end';
    }

    if (ability.abilityID === 20) { // Photosynthesis ability
      return triggerEvent === 'turn_start' || !triggerEvent;
    }

    // Default: trigger on any event for now
    return true;
  }

  /**
   * Process triggered abilities based on specific game events
   */
  private processTriggerAbilities(gameState: GameState, triggerType: string, _sourceCard?: GridCard): void {
    console.log(`🎯 Processing trigger abilities for: ${triggerType}`);

    // Find all cards with abilities that match the trigger type
    for (const [_position, gridCard] of gameState.grid) {
      const cardData = this.cardDatabase.get(gridCard.cardId);
      if (!cardData || !cardData.abilities) {
        continue;
      }

      // Find abilities with matching triggers
      const triggeredAbilities = cardData.abilities
        .map(abilityId => this.abilityDatabase.get(abilityId))
        .filter(ability => ability && this.abilityMatchesTrigger(ability, triggerType));

      // Process each triggered ability
      for (const ability of triggeredAbilities) {
        if (ability) {
          console.log(`⚡ Triggering ability: ${ability.abilityID} due to ${triggerType}`);
          this.processAbilityEffects(gameState, gridCard, ability);
        }
      }
    }
  }

  /**
   * Check if an ability matches a specific trigger type
   */
  private abilityMatchesTrigger(ability: AbilityData, triggerType: string): boolean {
    // Map trigger types to trigger IDs
    const triggerMap: { [key: string]: number } = {
      'on_play': 1,
      'activated': 2,
      'passive': 3,
      'on_death': 4,
      'on_turn_start': 5,
      'on_turn_end': 6,
      'on_attack': 7,
      'on_damage': 8
    };

    const expectedTriggerId = triggerMap[triggerType];
    return expectedTriggerId ? ability.triggerID === expectedTriggerId : false;
  }

  // Methods to load real data for testing
  public loadCardDatabase(cards: CardData[]): void {
    this.cardDatabase.clear();
    cards.forEach(card => {
      this.cardDatabase.set(card.cardId, card);
    });
  }

  public loadAbilityDatabase(abilities: AbilityData[]): void {
    this.abilityDatabase.clear();
    abilities.forEach(ability => {
      this.abilityDatabase.set(ability.abilityID || ability.abilityId, ability);
    });
  }

  /**
   * End the game and determine winner
   */
  private endGame(state: GameState, reason: string): void {
    state.gamePhase = GamePhase.ENDED;
    console.log(`🏁 Game ended due to: ${reason}`);

    // Calculate victory points for each player
    const playerScores = state.players.map(player => ({
      playerId: player.id,
      playerName: player.name,
      victoryPoints: this.calculateVictoryPoints(player),
      scorePileSize: player.scorePile.length
    }));

    // Sort by victory points (highest first)
    playerScores.sort((a, b) => b.victoryPoints - a.victoryPoints);

    // Determine winner
    const winner = playerScores[0];
    const isTie = playerScores.length > 1 &&
                  playerScores[0] && playerScores[1] &&
                  playerScores[0].victoryPoints === playerScores[1].victoryPoints;

    if (isTie && winner) {
      console.log(`🤝 Game ended in a tie with ${winner.victoryPoints} VP each`);
    } else if (winner) {
      console.log(`🏆 ${winner.playerName} wins with ${winner.victoryPoints} Victory Points!`);
    }

    // Log all player scores
    playerScores.forEach((score, index) => {
      console.log(`${index + 1}. ${score.playerName}: ${score.victoryPoints} VP (${score.scorePileSize} cards in score pile)`);
    });

    // Store results in game metadata
    state.metadata['gameResult'] = {
      winner: isTie ? null : winner,
      finalScores: playerScores,
      endReason: reason,
      endedAt: Date.now()
    };
  }

  /**
   * Calculate victory points for a player
   */
  private calculateVictoryPoints(player: Player): number {
    let totalVP = 0;

    // Count VP from cards in score pile
    for (const card of player.scorePile) {
      const cardData = this.cardDatabase.get(card.cardId);
      if (cardData) {
        // Each card in score pile is worth 1 VP by default
        // Some cards might have special VP values in the future
        totalVP += cardData.victoryPoints || 1;
      }
    }

    console.log(`📊 ${player.name} has ${totalVP} Victory Points from ${player.scorePile.length} cards`);
    return totalVP;
  }

  /**
   * Get current game winner (if game has ended)
   */
  public getGameResult(): any {
    const gameState = this.ensureGameInitialized();
    if (gameState.gamePhase !== 'ended') {
      return null;
    }
    return gameState.metadata['gameResult'];
  }

  /**
   * Check if game should end due to other conditions
   */
  public checkGameEndConditions(state: GameState): boolean {
    // Check if any player has run out of cards to draw
    const playersWithEmptyDecks = state.players.filter(p => p.deck.length === 0);

    if (playersWithEmptyDecks.length > 0) {
      this.endGame(state, 'deck_exhaustion');
      return true;
    }

    // Future: Add other end conditions like maximum turns, etc.

    return false;
  }

  /**
   * Process mixotroph abilities at turn start
   */
  private processMixotrophsOnTurnStart(state: GameState): void {
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer) return;

    // Find all mixotrophs owned by current player
    for (const [_position, gridCard] of state.grid) {
      if (gridCard.ownerId === currentPlayer.id) {
        const cardData = this.cardDatabase.get(gridCard.cardId);
        if (cardData && this.hasMixotrophAbilities(cardData)) {
          this.processMixotrophAbilities(state, gridCard, cardData);
        }
      }
    }
  }

  /**
   * Handle metamorphosis action - upgrade juvenile to adult
   */
  private handleMetamorphosis(payload: any): { isValid: boolean; newState?: GameState; errorMessage?: string } {
    const { juvenileInstanceId, adultCardId } = payload;

    // Find the juvenile card
    const juvenileCard = this.findCardByInstanceId(juvenileInstanceId);
    if (!juvenileCard) {
      return { isValid: false, errorMessage: 'Juvenile card not found' };
    }

    // Get juvenile card data
    const juvenileData = this.cardDatabase.get(juvenileCard.cardId);
    if (!juvenileData) {
      return { isValid: false, errorMessage: 'Juvenile card data not found' };
    }

    // Check if juvenile has METAMORPHOSIS keyword
    if (!this.hasMetamorphosis(juvenileData)) {
      return { isValid: false, errorMessage: 'Card does not have metamorphosis ability' };
    }

    // Get adult card data
    const adultData = this.cardDatabase.get(adultCardId);
    if (!adultData) {
      return { isValid: false, errorMessage: 'Adult card not found' };
    }

    // Validate metamorphosis is valid (same species, adult stage)
    const metamorphosisValidation = this.validateMetamorphosis(juvenileData, adultData);
    if (!metamorphosisValidation.isValid) {
      return metamorphosisValidation;
    }

    // Check if player has the adult card in hand
    const currentPlayer = this.getCurrentPlayer();
    const adultInHand = currentPlayer.hand.includes(adultCardId.toString()) ||
                       currentPlayer.hand.includes(adultData.commonName);

    if (!adultInHand) {
      return { isValid: false, errorMessage: 'Adult card not in hand' };
    }

    // Execute metamorphosis
    const newState = this.cloneGameState();
    const result = this.executeMetamorphosis(newState, juvenileCard, adultData);

    if (!result.isValid) {
      return result;
    }

    this.gameState = newState;
    return { isValid: true, newState };
  }

  /**
   * Check if a card has metamorphosis ability
   */
  private hasMetamorphosis(cardData: CardData): boolean {
    return cardData.keywords.includes(32); // Assuming keyword ID 32 for METAMORPHOSIS
  }

  /**
   * Validate that metamorphosis is allowed between two cards
   */
  private validateMetamorphosis(juvenile: CardData, adult: CardData): { isValid: boolean; errorMessage?: string } {
    // Check if they're the same species (same scientific name base)
    const juvenileSpecies = this.extractSpeciesName(juvenile.scientificName || '');
    const adultSpecies = this.extractSpeciesName(adult.scientificName || '');

    if (juvenileSpecies !== adultSpecies) {
      return { isValid: false, errorMessage: 'Metamorphosis must be within the same species' };
    }

    // Adult should have higher trophic level or same level with better stats
    if ((adult.trophicLevel || 0) < (juvenile.trophicLevel || 0)) {
      return { isValid: false, errorMessage: 'Adult form cannot have lower trophic level' };
    }

    // Check life stage progression (juvenile → adult)
    if (juvenile.commonName.toLowerCase().includes('juvenile') &&
        !adult.commonName.toLowerCase().includes('adult')) {
      return { isValid: false, errorMessage: 'Must metamorphose from juvenile to adult form' };
    }

    return { isValid: true };
  }

  /**
   * Extract species name from scientific name
   */
  private extractSpeciesName(scientificName: string): string {
    // Extract genus and species (first two words)
    const parts = scientificName.split(' ');
    return parts.slice(0, 2).join(' ');
  }

  /**
   * Execute the metamorphosis transformation
   */
  private executeMetamorphosis(state: GameState, juvenileCard: GridCard, adultData: CardData): { isValid: boolean; errorMessage?: string } {
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer) {
      return { isValid: false, errorMessage: 'No current player' };
    }

    // Remove adult card from hand
    let handIndex = currentPlayer.hand.indexOf(adultData.cardId.toString());
    if (handIndex === -1) {
      handIndex = currentPlayer.hand.indexOf(adultData.commonName);
    }

    if (handIndex !== -1) {
      currentPlayer.hand.splice(handIndex, 1);
    }

    // Transform juvenile into adult
    juvenileCard.cardId = adultData.cardId;

    // Metamorphosis tempo bonus: adult enters ready
    juvenileCard.isExhausted = false;

    // Preserve position and attachments
    // (position and attachments are already part of the GridCard)

    console.log(`🦋 Metamorphosis: ${juvenileCard.instanceId} transformed into ${adultData.commonName} (enters ready)`);

    // Process any ON_PLAY abilities of the adult form
    this.processOnPlayAbilities(state, juvenileCard, adultData);

    return { isValid: true };
  }
}
