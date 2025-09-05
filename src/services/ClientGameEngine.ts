/**
 * Client-Side BioMasters Game Engine
 * Offline-first implementation that mirrors server/src/game-engine/BioMastersEngine.ts
 * Uses public/data/*.json as single source of truth
 */

import {
  GamePhase,
  TurnPhase,
  KeywordId,
  GameActionType,
  TrophicLevel,
  TrophicCategoryId,
  Domain,
  DOMAIN_COMPATIBILITY
} from '../../shared/enums';

// Import JSON data types
interface JSONCardData {
  CardID: number;
  TrophicLevel: number | null;
  TrophicCategory: number | null;
  Domain: number;
  Cost: any;
  Keywords: number[];
  VictoryPoints: number;
  CommonName: string;
  ScientificName: string;
  Taxonomy: {
    kingdom: string;
    phylum: string;
    class: string;
    order: string;
    family: string;
    genus: string;
    species: string;
  };
  Mass_kg: number;
  Lifespan_max_days: number;
  Vision_range_m: number;
  Smell_range_m: number;
  Hearing_range_m: number;
  Walk_speed_m_per_hr: number;
  Run_speed_m_per_hr: number;
  Swim_speed_m_per_hr: number;
  Fly_speed_m_per_hr: number;
  Offspring_count: number;
}

interface JSONAbilityData {
  AbilityID: number;
  AbilityName: string;
  Description: string;
  TriggerID: number;
  EffectType: string;
  EffectValue: any;
  TargetType: string;
  Cost: any;
}

// Game state interfaces (mirroring server)
export interface ClientGameState {
  gameId: string;
  players: ClientPlayer[];
  currentPlayerIndex: number;
  gamePhase: GamePhase;
  turnPhase: TurnPhase;
  actionsRemaining: number;
  turnNumber: number;
  grid: Map<string, ClientGridCard>;
  gameSettings: ClientGameSettings;
  metadata: Record<string, any>;
  isOffline: boolean;
  lastSyncTimestamp?: number;
}

export interface ClientPlayer {
  id: string;
  name: string;
  hand: string[]; // card instance IDs
  deck: string[]; // card instance IDs
  scorePile: ClientGridCard[];
  energy: number;
  isReady: boolean;
}

export interface ClientGridCard {
  instanceId: string;
  cardId: number;
  ownerId: string;
  position: { x: number; y: number };
  isExhausted: boolean;
  attachments: ClientGridCard[];
  statusEffects: ClientStatusEffect[];
  isDetritus: boolean;
  isHOME: boolean;
}

export interface ClientStatusEffect {
  effectId: string;
  type: string;
  duration: number;
  source: string;
  metadata: Record<string, any>;
}

export interface ClientGameSettings {
  maxPlayers: number;
  gridWidth: number;
  gridHeight: number;
  startingHandSize: number;
  maxHandSize: number;
  startingEnergy?: number;
  turnTimeLimit?: number;
}

// Action interfaces
export interface ClientPlayerAction {
  type: GameActionType;
  playerId: string;
  payload: any;
}

export interface ClientPlayCardPayload {
  cardId: string;
  position: { x: number; y: number };
  connectionTargetId?: string;
  cost?: any;
}

export interface ClientActivateAbilityPayload {
  instanceId: string;
  abilityId: number;
  targetInstanceId?: string;
  additionalTargets?: string[];
}

/**
 * Client-side Game Data Manager
 * Loads and manages JSON data from public/data/
 */
class ClientGameDataManager {
  private cardDatabase = new Map<number, JSONCardData>();
  private abilityDatabase = new Map<number, JSONAbilityData>();
  private localizationData = new Map<string, string>();
  private isLoaded = false;

  async loadGameData(): Promise<void> {
    if (this.isLoaded) {
      console.log('📦 [ClientGameDataManager] Data already loaded, skipping');
      return;
    }

    console.log('📦 [ClientGameDataManager] Starting data load...');

    try {
      // Load cards.json
      console.log('📦 [ClientGameDataManager] Loading cards.json...');
      const cardsResponse = await fetch('/data/cards.json');
      if (!cardsResponse.ok) {
        throw new Error(`Failed to fetch cards.json: ${cardsResponse.status} ${cardsResponse.statusText}`);
      }
      const cardsData: JSONCardData[] = await cardsResponse.json();
      console.log('📦 [ClientGameDataManager] Cards data received:', cardsData.length, 'cards');

      cardsData.forEach(card => {
        this.cardDatabase.set(card.CardID, card);
      });

      // Load abilities.json
      console.log('📦 [ClientGameDataManager] Loading abilities.json...');
      const abilitiesResponse = await fetch('/data/abilities.json');
      if (!abilitiesResponse.ok) {
        throw new Error(`Failed to fetch abilities.json: ${abilitiesResponse.status} ${abilitiesResponse.statusText}`);
      }
      const abilitiesData: JSONAbilityData[] = await abilitiesResponse.json();
      console.log('📦 [ClientGameDataManager] Abilities data received:', abilitiesData.length, 'abilities');

      abilitiesData.forEach(ability => {
        this.abilityDatabase.set(ability.AbilityID, ability);
      });

      // Load en.json (localization)
      console.log('📦 [ClientGameDataManager] Loading en.json...');
      const localizationResponse = await fetch('/data/en.json');
      if (!localizationResponse.ok) {
        throw new Error(`Failed to fetch en.json: ${localizationResponse.status} ${localizationResponse.statusText}`);
      }
      const localizationData = await localizationResponse.json();
      console.log('📦 [ClientGameDataManager] Localization data received:', Object.keys(localizationData).length, 'entries');

      Object.entries(localizationData).forEach(([key, value]) => {
        this.localizationData.set(key, value as string);
      });

      this.isLoaded = true;
      console.log('✅ [ClientGameDataManager] Client game data loaded successfully');
      console.log(`📄 Cards: ${this.cardDatabase.size}`);
      console.log(`⚡ Abilities: ${this.abilityDatabase.size}`);
      console.log(`🌐 Localization entries: ${this.localizationData.size}`);
    } catch (error) {
      console.error('❌ [ClientGameDataManager] Failed to load client game data:', error);
      throw error;
    }
  }

  getCard(cardId: number): JSONCardData | undefined {
    return this.cardDatabase.get(cardId);
  }

  getAbility(abilityId: number): JSONAbilityData | undefined {
    return this.abilityDatabase.get(abilityId);
  }

  getLocalization(key: string): string {
    return this.localizationData.get(key) || key;
  }

  getAllCards(): JSONCardData[] {
    return Array.from(this.cardDatabase.values());
  }

  getAllAbilities(): JSONAbilityData[] {
    return Array.from(this.abilityDatabase.values());
  }

  isDataLoaded(): boolean {
    return this.isLoaded;
  }
}

// Singleton instance
export const clientGameDataManager = new ClientGameDataManager();

/**
 * Client-side BioMasters Game Engine
 * Handles offline gameplay with optional server sync
 */
export class ClientGameEngine {
  private gameState: ClientGameState | null = null;
  private gameDataManager: ClientGameDataManager;

  constructor() {
    this.gameDataManager = clientGameDataManager;
  }

  /**
   * Initialize the game engine with JSON data
   */
  async initialize(): Promise<void> {
    await this.gameDataManager.loadGameData();
  }

  /**
   * Get grid dimensions based on player count
   * 2 players: 9x10 grid (9 rows, 10 columns)
   * 4 players: 10x10 grid (symmetric)
   */
  private getGridDimensions(playerCount: number): { width: number; height: number } {
    switch (playerCount) {
      case 2:
        return { width: 10, height: 9 }; // 9 rows, 10 columns
      case 4:
        return { width: 10, height: 10 }; // 10x10 for 4 players
      default:
        throw new Error(`Invalid player count: ${playerCount}. Only 2 or 4 players supported.`);
    }
  }

  /**
   * Create a new game
   */
  async createGame(
    gameId: string,
    players: { id: string; name: string }[],
    settings: Partial<ClientGameSettings> = {}
  ): Promise<ClientGameState> {
    console.log('🎮 [ClientGameEngine] Creating game:', gameId, 'with', players.length, 'players');
    console.log('🎮 [ClientGameEngine] Players:', players);
    console.log('🎮 [ClientGameEngine] Settings:', settings);

    if (!this.gameDataManager.isDataLoaded()) {
      console.log('🎮 [ClientGameEngine] Data not loaded, initializing...');
      await this.initialize();
    }

    // Validate player count (only 2 or 4 players allowed for symmetry)
    console.log('🎮 [ClientGameEngine] Validating player count:', players.length);
    if (players.length !== 2 && players.length !== 4) {
      const error = 'Invalid player count. Only 2 or 4 players allowed for symmetric gameplay.';
      console.error('❌ [ClientGameEngine]', error);
      throw new Error(error);
    }

    // Set grid dimensions based on player count
    console.log('🎮 [ClientGameEngine] Getting grid dimensions for', players.length, 'players');
    const gridDimensions = this.getGridDimensions(players.length);
    console.log('🎮 [ClientGameEngine] Grid dimensions:', gridDimensions);

    const defaultSettings: ClientGameSettings = {
      maxPlayers: players.length,
      gridWidth: gridDimensions.width,
      gridHeight: gridDimensions.height,
      startingHandSize: 5,
      maxHandSize: 10,
      startingEnergy: 3,
      ...settings
    };

    console.log('🎮 [ClientGameEngine] Final settings:', defaultSettings);

    // Initialize players
    console.log('🎮 [ClientGameEngine] Initializing players...');
    const initializedPlayers: ClientPlayer[] = players.map(player => ({
      id: player.id,
      name: player.name,
      hand: [],
      deck: this.createStartingDeck(),
      scorePile: [],
      energy: defaultSettings.startingEnergy || 3,
      isReady: false
    }));
    console.log('🎮 [ClientGameEngine] Players initialized:', initializedPlayers.length);

    // Create initial game state
    console.log('🎮 [ClientGameEngine] Creating initial game state...');
    this.gameState = {
      gameId,
      players: initializedPlayers,
      currentPlayerIndex: 0,
      gamePhase: GamePhase.SETUP,
      turnPhase: TurnPhase.READY,
      actionsRemaining: 1,
      turnNumber: 1,
      grid: new Map(),
      gameSettings: defaultSettings,
      metadata: {},
      isOffline: true,
      lastSyncTimestamp: Date.now()
    };
    console.log('🎮 [ClientGameEngine] Initial game state created');

    // Place HOME cards
    console.log('🎮 [ClientGameEngine] Placing HOME cards...');
    this.placeHOMECards();
    console.log('🎮 [ClientGameEngine] HOME cards placed. Grid size:', this.gameState.grid.size);

    // Deal starting hands
    console.log('🎮 [ClientGameEngine] Dealing starting hands...');
    this.dealStartingHands();
    console.log('🎮 [ClientGameEngine] Starting hands dealt');

    console.log('🎮 [ClientGameEngine] ✅ Client game created successfully:', gameId);
    console.log('🎮 [ClientGameEngine] Final game state:', {
      gameId: this.gameState.gameId,
      playerCount: this.gameState.players.length,
      gridSize: this.gameState.grid.size,
      gridDimensions: `${this.gameState.gameSettings.gridWidth}x${this.gameState.gameSettings.gridHeight}`,
      gamePhase: this.gameState.gamePhase,
      turnPhase: this.gameState.turnPhase
    });

    return this.gameState;
  }

  /**
   * Process a player action
   */
  processAction(action: ClientPlayerAction): {
    isValid: boolean;
    newState?: ClientGameState;
    errorMessage?: string;
  } {
    if (!this.gameState) {
      return { isValid: false, errorMessage: 'Game not initialized' };
    }

    // Validate it's the current player's turn
    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
    if (action.playerId !== currentPlayer.id) {
      return { isValid: false, errorMessage: 'Not your turn' };
    }

    // Clone game state for processing
    const newState = this.cloneGameState(this.gameState);

    try {
      switch (action.type) {
        case GameActionType.PLAY_CARD:
          return this.handlePlayCard(newState, action.payload as ClientPlayCardPayload);

        case GameActionType.ACTIVATE_ABILITY:
          return this.handleActivateAbility(newState, action.payload as ClientActivateAbilityPayload);

        case GameActionType.PASS_TURN:
          return this.handlePassTurn(newState);

        case GameActionType.PLAYER_READY:
          return this.handlePlayerReady(newState, action.playerId);

        default:
          return { isValid: false, errorMessage: `Unknown action type: ${action.type}` };
      }
    } catch (error) {
      console.error('Error processing action:', error);
      return { isValid: false, errorMessage: 'Action processing failed' };
    }
  }

  /**
   * Handle playing a card
   */
  private handlePlayCard(gameState: ClientGameState, payload: ClientPlayCardPayload): {
    isValid: boolean;
    newState?: ClientGameState;
    errorMessage?: string;
  } {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    // Find card in hand
    const cardIndex = currentPlayer.hand.findIndex(instanceId => instanceId === payload.cardId);
    if (cardIndex === -1) {
      return { isValid: false, errorMessage: 'Card not in hand' };
    }

    // Extract card ID from instance ID (simplified)
    const cardId = this.extractCardIdFromInstance(payload.cardId);
    const cardData = this.gameDataManager.getCard(cardId);
    if (!cardData) {
      return { isValid: false, errorMessage: 'Invalid card data' };
    }

    // Check if position is valid
    if (!this.isValidCardPlacement(cardId, payload.position, currentPlayer.id)) {
      return { isValid: false, errorMessage: 'Invalid card placement' };
    }

    // Check if position is empty
    const positionKey = `${payload.position.x},${payload.position.y}`;
    if (gameState.grid.has(positionKey)) {
      return { isValid: false, errorMessage: 'Position already occupied' };
    }

    // Create grid card
    const gridCard: ClientGridCard = {
      instanceId: payload.cardId,
      cardId: cardId,
      ownerId: currentPlayer.id,
      position: payload.position,
      isExhausted: false,
      attachments: [],
      statusEffects: [],
      isDetritus: false,
      isHOME: false
    };

    // Place card on grid
    gameState.grid.set(positionKey, gridCard);

    // Remove card from hand
    currentPlayer.hand.splice(cardIndex, 1);

    // Reduce actions remaining
    gameState.actionsRemaining = Math.max(0, gameState.actionsRemaining - 1);

    // Update game state
    this.gameState = gameState;

    return { isValid: true, newState: gameState };
  }

  /**
   * Handle activating an ability
   */
  private handleActivateAbility(gameState: ClientGameState, payload: ClientActivateAbilityPayload): {
    isValid: boolean;
    newState?: ClientGameState;
    errorMessage?: string;
  } {
    // TODO: Implement ability activation
    // For now, just return success
    return { isValid: true, newState: gameState };
  }

  /**
   * Handle passing turn
   */
  private handlePassTurn(gameState: ClientGameState): {
    isValid: boolean;
    newState?: ClientGameState;
    errorMessage?: string;
  } {
    // Move to next player
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;

    // Reset actions for new turn
    gameState.actionsRemaining = 1;

    // Increment turn number if back to first player
    if (gameState.currentPlayerIndex === 0) {
      gameState.turnNumber++;
    }

    // Update game state
    this.gameState = gameState;

    return { isValid: true, newState: gameState };
  }

  /**
   * Handle player ready
   */
  private handlePlayerReady(gameState: ClientGameState, playerId: string): {
    isValid: boolean;
    newState?: ClientGameState;
    errorMessage?: string;
  } {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
      return { isValid: false, errorMessage: 'Player not found' };
    }

    console.log('🎮 [ClientGameEngine] Player ready:', playerId);
    player.isReady = true;

    // In client mode (practice), automatically mark AI players as ready
    gameState.players.forEach(p => {
      if (p.id !== playerId && p.id.includes('ai')) {
        console.log('🤖 [ClientGameEngine] Auto-marking AI player as ready:', p.id);
        p.isReady = true;
      }
    });

    // Check if all players are ready
    const allReady = gameState.players.every(p => p.isReady);
    console.log('🎮 [ClientGameEngine] All players ready check:', allReady, 'Current phase:', gameState.gamePhase);

    if (allReady && gameState.gamePhase === GamePhase.SETUP) {
      console.log('🎮 [ClientGameEngine] Transitioning to PLAYING phase');
      gameState.gamePhase = GamePhase.PLAYING;
      gameState.turnPhase = TurnPhase.ACTION;
    }

    this.gameState = gameState;
    return { isValid: true, newState: gameState };
  }

  /**
   * Get current game state
   */
  getGameState(): ClientGameState | null {
    return this.gameState;
  }

  /**
   * Sync with server (when online)
   */
  async syncWithServer(gameId: string): Promise<void> {
    try {
      // TODO: Implement server sync
      console.log('🔄 Syncing with server:', gameId);
    } catch (error) {
      console.warn('⚠️ Server sync failed, continuing offline:', error);
    }
  }

  // Private helper methods

  private placeHOMECards(): void {
    if (!this.gameState) return;

    const { gridWidth, gridHeight } = this.gameState.gameSettings;
    const playerCount = this.gameState.players.length;

    // Calculate HOME positions based on player count for symmetry
    const homePositions = this.getHOMEPositions(gridWidth, gridHeight, playerCount);

    // Place HOME cards for each player
    this.gameState.players.forEach((player, index) => {
      const position = homePositions[index];

      const homeCard: ClientGridCard = {
        instanceId: `home-${player.id}`,
        cardId: 0, // Special HOME card ID
        ownerId: player.id,
        position: position,
        isExhausted: false,
        attachments: [],
        statusEffects: [],
        isDetritus: false,
        isHOME: true
      };

      const positionKey = `${homeCard.position.x},${homeCard.position.y}`;
      this.gameState!.grid.set(positionKey, homeCard);
    });
  }

  /**
   * Get symmetric HOME positions based on grid size and player count
   * HOME cards are always placed in the center of the grid
   */
  private getHOMEPositions(gridWidth: number, gridHeight: number, playerCount: number): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    const centerX = Math.floor(gridWidth / 2);
    const centerY = Math.floor(gridHeight / 2);

    if (playerCount === 2) {
      // 2 players: 9x10 grid (9 rows, 10 columns)
      // Center is at (5, 4) - place HOME cards adjacent horizontally
      positions.push({ x: centerX - 1, y: centerY }); // Player 1: Left of center
      positions.push({ x: centerX, y: centerY });     // Player 2: Right of center
    } else if (playerCount === 4) {
      // 4 players: 10x10 grid
      // Center is at (5, 5) - place HOME cards in center 2x2 formation
      positions.push({ x: centerX - 1, y: centerY - 1 }); // Player 1: Top-left
      positions.push({ x: centerX, y: centerY - 1 });     // Player 2: Top-right
      positions.push({ x: centerX - 1, y: centerY });     // Player 3: Bottom-left
      positions.push({ x: centerX, y: centerY });         // Player 4: Bottom-right
    }

    return positions;
  }

  private dealStartingHands(): void {
    if (!this.gameState) return;

    this.gameState.players.forEach(player => {
      // Draw starting hand from deck
      for (let i = 0; i < this.gameState!.gameSettings.startingHandSize; i++) {
        if (player.deck.length > 0) {
          const cardId = player.deck.pop()!;
          player.hand.push(cardId);
        }
      }
    });
  }

  private createStartingDeck(): string[] {
    // Create a basic starting deck with available cards
    const availableCards = this.gameDataManager.getAllCards();
    const deck: string[] = [];

    // Add some basic cards to the deck (simplified for now)
    availableCards.slice(0, 10).forEach((card, index) => {
      // Create instance IDs for deck cards
      deck.push(`card-instance-${card.CardID}-${index}`);
    });

    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
  }

  /**
   * Get valid positions for placing a card
   */
  getValidPositions(cardId: number, playerId: string): { x: number; y: number }[] {
    if (!this.gameState) return [];

    const validPositions: { x: number; y: number }[] = [];
    const { gridWidth, gridHeight } = this.gameState.gameSettings;

    // Check each position on the grid
    for (let x = 0; x < gridWidth; x++) {
      for (let y = 0; y < gridHeight; y++) {
        const positionKey = `${x},${y}`;

        // Skip if position is occupied
        if (this.gameState.grid.has(positionKey)) continue;

        // Check if position is valid for this card
        if (this.isValidCardPlacement(cardId, { x, y }, playerId)) {
          validPositions.push({ x, y });
        }
      }
    }

    return validPositions;
  }

  /**
   * Check if a card can be placed at a specific position
   */
  private isValidCardPlacement(cardId: number, position: { x: number; y: number }, playerId: string): boolean {
    if (!this.gameState) return false;

    const cardData = this.gameDataManager.getCard(cardId);
    if (!cardData) return false;

    // Get adjacent cards
    const adjacentCards = this.getAdjacentCards(position);

    // Basic validation: must be adjacent to at least one card (or HOME)
    if (adjacentCards.length === 0) {
      // Check if adjacent to HOME
      const homeAdjacent = this.isAdjacentToHOME(position, playerId);
      return homeAdjacent;
    }

    // TODO: Implement full trophic level and domain compatibility checks
    // For now, allow placement if adjacent to any card
    return true;
  }

  /**
   * Get cards adjacent to a position
   */
  private getAdjacentCards(position: { x: number; y: number }): ClientGridCard[] {
    if (!this.gameState) return [];

    const adjacent: ClientGridCard[] = [];
    const directions = [
      { x: 0, y: 1 },   // North
      { x: 1, y: 0 },   // East
      { x: 0, y: -1 },  // South
      { x: -1, y: 0 }   // West
    ];

    directions.forEach(dir => {
      const adjX = position.x + dir.x;
      const adjY = position.y + dir.y;
      const positionKey = `${adjX},${adjY}`;

      const card = this.gameState!.grid.get(positionKey);
      if (card) {
        adjacent.push(card);
      }
    });

    return adjacent;
  }

  /**
   * Check if position is adjacent to player's HOME card
   */
  private isAdjacentToHOME(position: { x: number; y: number }, playerId: string): boolean {
    const adjacentCards = this.getAdjacentCards(position);
    return adjacentCards.some(card => card.isHOME && card.ownerId === playerId);
  }

  /**
   * Generate unique instance ID
   */
  private generateInstanceId(): string {
    return `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clone game state for safe mutation
   */
  private cloneGameState(gameState: ClientGameState): ClientGameState {
    return {
      ...gameState,
      players: gameState.players.map(player => ({
        ...player,
        hand: [...player.hand],
        deck: [...player.deck],
        scorePile: [...player.scorePile]
      })),
      grid: new Map(gameState.grid),
      gameSettings: { ...gameState.gameSettings },
      metadata: { ...gameState.metadata }
    };
  }

  /**
   * Extract card ID from instance ID
   */
  private extractCardIdFromInstance(instanceId: string): number {
    // Extract card ID from instance ID format: "card-instance-{cardId}-{index}"
    const match = instanceId.match(/card-instance-(\d+)-/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get current player
   */
  getCurrentPlayer(): ClientPlayer | null {
    if (!this.gameState) return null;
    return this.gameState.players[this.gameState.currentPlayerIndex];
  }

  /**
   * Check if game is over
   */
  isGameOver(): boolean {
    if (!this.gameState) return false;

    // TODO: Implement win conditions
    // For now, game continues indefinitely
    return false;
  }

  /**
   * Get game winner
   */
  getWinner(): ClientPlayer | null {
    if (!this.isGameOver()) return null;

    // TODO: Implement winner determination
    // For now, return null
    return null;
  }

  /**
   * Save game state to local storage
   */
  saveToLocalStorage(): void {
    if (!this.gameState) return;

    try {
      const serializedState = JSON.stringify({
        ...this.gameState,
        grid: Array.from(this.gameState.grid.entries()) // Convert Map to array for serialization
      });
      localStorage.setItem(`biomasters-game-${this.gameState.gameId}`, serializedState);
      console.log('💾 Game saved to local storage');
    } catch (error) {
      console.error('❌ Failed to save game to local storage:', error);
    }
  }

  /**
   * Load game state from local storage
   */
  loadFromLocalStorage(gameId: string): boolean {
    try {
      const serializedState = localStorage.getItem(`biomasters-game-${gameId}`);
      if (!serializedState) return false;

      const parsedState = JSON.parse(serializedState);

      // Restore Map from array
      parsedState.grid = new Map(parsedState.grid);

      this.gameState = parsedState as ClientGameState;
      console.log('📂 Game loaded from local storage');
      return true;
    } catch (error) {
      console.error('❌ Failed to load game from local storage:', error);
      return false;
    }
  }

  /**
   * Get available actions for current player
   */
  getAvailableActions(): string[] {
    if (!this.gameState) return [];

    const actions: string[] = [];
    const currentPlayer = this.getCurrentPlayer();

    if (!currentPlayer) return actions;

    // Can always pass turn
    actions.push('pass_turn');

    // Can play cards if have actions remaining and cards in hand
    if (this.gameState.actionsRemaining > 0 && currentPlayer.hand.length > 0) {
      actions.push('play_card');
    }

    // Can activate abilities if have cards on board
    const playerCards = Array.from(this.gameState.grid.values())
      .filter(card => card.ownerId === currentPlayer.id && !card.isExhausted);

    if (playerCards.length > 0) {
      actions.push('activate_ability');
    }

    return actions;
  }
}
