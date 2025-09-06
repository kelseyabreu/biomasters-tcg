/**
 * Client-Side BioMasters Game Engine
 * Lightweight wrapper around the shared BioMastersEngine
 * Handles client-specific data loading and UI state management
 */

import {
  GamePhase,
  TurnPhase,
  KeywordId,
  GameActionType,
  TrophicLevel,
  TrophicCategoryId,
  Domain,
  DOMAIN_COMPATIBILITY,
  CardId
} from '@shared/enums';

// Import the shared, authoritative game engine
import {
  BioMastersEngine,
  GameState as ServerGameState,
  CardData as ServerCardData,
  AbilityData as ServerAbilityData,
  PlayerAction as ServerPlayerAction
} from '@shared/game-engine/BioMastersEngine';

// Import localization system
import {
  ILocalizationManager,
  LocalizationManager,
  JSONFileDataLoader
} from '@shared/localization-manager';

import {
  CardNameId,
  ScientificNameId,
  CardDescriptionId,
  AbilityNameId,
  AbilityDescriptionId,
  TaxonomyId,
  SupportedLanguage
} from '@shared/text-ids';

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

// Client-specific interfaces for UI compatibility
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
  hand: string[];
  deck: string[];
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
  name: string;
  description: string;
  duration: number;
  stackable: boolean;
  metadata: Record<string, any>;
}

export interface ClientGameSettings {
  maxPlayers: number;
  gridWidth: number;
  gridHeight: number;
  startingHandSize: number;
  maxHandSize: number;
  startingEnergy?: number;
}

export interface ClientPlayerAction {
  type: GameActionType;
  playerId: string;
  payload: any;
}

export interface ClientPlayCardPayload {
  cardId: string;
  position: { x: number; y: number };
}

export interface ClientActivateAbilityPayload {
  cardInstanceId: string;
  abilityId: number;
  targetPosition?: { x: number; y: number };
}

// Client Game Data Manager
class ClientGameDataManager {
  private cards: Map<number, JSONCardData> = new Map();
  private dataLoaded = false;

  async loadGameData(): Promise<void> {
    if (this.dataLoaded) return;

    try {
      console.log('📚 [ClientGameDataManager] Loading card data...');
      const response = await fetch('/data/cards.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch cards.json: ${response.statusText}`);
      }
      
      const cardsArray: JSONCardData[] = await response.json();
      console.log(`📚 [ClientGameDataManager] Loaded ${cardsArray.length} cards`);
      
      this.cards.clear();
      cardsArray.forEach(card => {
        this.cards.set(card.CardID, card);
      });

      this.dataLoaded = true;
      console.log('✅ [ClientGameDataManager] Game data loaded successfully');
    } catch (error) {
      console.error('❌ [ClientGameDataManager] Failed to load game data:', error);
      throw error;
    }
  }

  isDataLoaded(): boolean {
    return this.dataLoaded;
  }

  getAllCards(): JSONCardData[] {
    return Array.from(this.cards.values());
  }

  getCard(cardId: number): JSONCardData | undefined {
    return this.cards.get(cardId);
  }
}

// Singleton instance
export const clientGameDataManager = new ClientGameDataManager();

/**
 * Client-side BioMasters Game Engine
 * Lightweight wrapper around the shared BioMastersEngine
 * Handles client-specific data loading and UI state management
 */
export class ClientGameEngine {
  private coreEngine: BioMastersEngine | null = null;
  private gameState: ClientGameState | null = null;
  private gameDataManager: ClientGameDataManager;

  constructor() {
    this.gameDataManager = clientGameDataManager;
  }

  /**
   * Initialize the game engine with JSON data
   */
  async initialize(): Promise<void> {
    if (!this.gameDataManager.isDataLoaded()) {
      await this.gameDataManager.loadGameData();
    }
  }

  /**
   * Get grid dimensions based on player count
   */
  private getGridDimensions(playerCount: number): { width: number; height: number } {
    if (playerCount === 2) {
      return { width: 10, height: 9 }; // 1v1 mode: 10 columns x 9 rows
    } else {
      return { width: 10, height: 10 }; // 2v2 or 4-player mode
    }
  }

  /**
   * Create a new game using the shared engine
   */
  async createGame(
    gameId: string,
    players: { id: string; name: string }[],
    settings: Partial<ClientGameSettings> = {}
  ): Promise<ClientGameState> {
    console.log('🎮 [ClientGameEngine] Creating game:', gameId, 'with', players.length, 'players');

    // Ensure data is loaded
    await this.initialize();

    // Validate inputs
    if (!gameId || !players || players.length === 0) {
      throw new Error('Invalid game parameters');
    }

    // Validate player count for symmetric gameplay
    if (players.length !== 2 && players.length !== 4) {
      throw new Error('Invalid player count. Only 2 or 4 players allowed for symmetric gameplay.');
    }

    // Set grid dimensions based on player count
    const gridDimensions = this.getGridDimensions(players.length);
    const defaultSettings: ClientGameSettings = {
      maxPlayers: players.length,
      gridWidth: gridDimensions.width,
      gridHeight: gridDimensions.height,
      startingHandSize: 5,
      maxHandSize: 10,
      startingEnergy: 3,
      ...settings
    };

    // Create localization manager
    const localizationManager = new LocalizationManager(
      new JSONFileDataLoader('/data/localization')
    );
    await localizationManager.loadLanguage(SupportedLanguage.ENGLISH); // Default to English

    // Prepare data for the shared engine
    const cardDatabase = new Map<number, ServerCardData>();
    this.gameDataManager.getAllCards().forEach(rawCard => {
      // Create text IDs based on card names (simplified mapping for legacy data)
      const nameId = `CARD_${rawCard.CommonName.toUpperCase().replace(/\s+/g, '_')}` as CardNameId;
      const scientificNameId = `SCIENTIFIC_${rawCard.ScientificName.toUpperCase().replace(/\s+/g, '_')}` as ScientificNameId;
      const descriptionId = `DESC_${rawCard.CommonName.toUpperCase().replace(/\s+/g, '_')}` as CardDescriptionId;
      const taxonomyId = `TAXONOMY_${rawCard.CommonName.toUpperCase().replace(/\s+/g, '_')}` as TaxonomyId;

      const card: ServerCardData = {
        cardId: rawCard.CardID,
        nameId,
        scientificNameId,
        descriptionId,
        taxonomyId,
        trophicLevel: rawCard.TrophicLevel,
        trophicCategory: rawCard.TrophicCategory,
        domain: rawCard.Domain,
        cost: rawCard.Cost,
        keywords: rawCard.Keywords,
        abilities: [], // TODO: Add abilities to JSON data when available
        victoryPoints: rawCard.VictoryPoints,
        conservationStatus: 1, // Default value
        mass_kg: 1, // Default value
        lifespan_max_days: 365, // Default value
        vision_range_m: 10, // Default value
        smell_range_m: 5, // Default value
        hearing_range_m: 20, // Default value
        walk_speed_m_per_hr: 5, // Default value
        run_speed_m_per_hr: 15, // Default value
        swim_speed_m_per_hr: 2, // Default value
        fly_speed_m_per_hr: 0, // Default value
        offspring_count: 2, // Default value
        gestation_days: 30, // Default value
        // Legacy properties for backwards compatibility
        commonName: rawCard.CommonName,
        scientificName: rawCard.ScientificName
      };
      cardDatabase.set(card.cardId, card);
    });

    // For now, use empty ability and keyword databases
    const abilityDatabase = new Map<number, ServerAbilityData>();
    const keywordDatabase = new Map<number, string>();

    // Create the shared engine instance
    this.coreEngine = new BioMastersEngine(cardDatabase, abilityDatabase, keywordDatabase, localizationManager);

    // Initialize the game using the shared engine
    const serverGameState = this.coreEngine.initializeNewGame(gameId, players, {
      maxPlayers: defaultSettings.maxPlayers,
      gridWidth: defaultSettings.gridWidth,
      gridHeight: defaultSettings.gridHeight,
      startingHandSize: defaultSettings.startingHandSize,
      maxHandSize: defaultSettings.maxHandSize,
      startingEnergy: defaultSettings.startingEnergy
    });

    // Convert server state to client format
    this.gameState = this.convertServerStateToClient(serverGameState, defaultSettings);
    console.log('🎮 [ClientGameEngine] Game created using shared engine');

    return this.gameState;
  }

  /**
   * Convert server game state to client format
   */
  private convertServerStateToClient(serverState: ServerGameState, settings: ClientGameSettings): ClientGameState {
    const clientPlayers: ClientPlayer[] = serverState.players.map(p => ({
      id: p.id,
      name: p.name,
      hand: p.hand,
      deck: p.deck,
      scorePile: p.scorePile.map(card => ({
        ...card,
        attachments: [],
        statusEffects: []
      })),
      energy: p.energy,
      isReady: p.isReady
    }));

    const clientGrid = new Map<string, ClientGridCard>();
    serverState.grid.forEach((card, key) => {
      clientGrid.set(key, {
        cardId: card.cardId,
        ownerId: card.ownerId,
        position: card.position,
        isExhausted: card.isExhausted,
        isHOME: card.isHOME,
        isDetritus: card.isDetritus,
        instanceId: card.instanceId,
        attachments: [], // Initialize empty for client
        statusEffects: [] // Initialize empty for client
      });
    });

    return {
      gameId: serverState.gameId,
      players: clientPlayers,
      currentPlayerIndex: serverState.currentPlayerIndex,
      gamePhase: serverState.gamePhase,
      turnPhase: serverState.turnPhase,
      actionsRemaining: serverState.actionsRemaining,
      turnNumber: serverState.turnNumber,
      grid: clientGrid,
      gameSettings: settings,
      metadata: {},
      isOffline: true,
      lastSyncTimestamp: Date.now()
    };
  }

  /**
   * Process a player action using the shared engine
   */
  processAction(action: ClientPlayerAction): {
    isValid: boolean;
    newState?: ClientGameState;
    errorMessage?: string;
  } {
    if (!this.coreEngine) {
      return { isValid: false, errorMessage: 'Game engine not initialized' };
    }

    try {
      // Convert client action to server format
      const serverAction: ServerPlayerAction = {
        type: action.type,
        playerId: action.playerId,
        payload: action.payload
      };

      // Process action through the shared engine
      const result = this.coreEngine.processAction(serverAction);

      if (result.isValid && result.newState) {
        // Convert server state back to client format
        const newClientState = this.convertServerStateToClient(result.newState, this.gameState!.gameSettings);
        this.gameState = newClientState;
        return { isValid: true, newState: newClientState };
      } else {
        return { isValid: false, errorMessage: result.errorMessage };
      }
    } catch (error) {
      console.error('❌ [ClientGameEngine] Error processing action:', error);
      return { isValid: false, errorMessage: 'Action processing failed' };
    }
  }

  /**
   * Get current game state
   */
  getGameState(): ClientGameState | null {
    return this.gameState;
  }

  /**
   * Get current player
   */
  getCurrentPlayer(): ClientPlayer | null {
    if (!this.gameState) return null;
    return this.gameState.players[this.gameState.currentPlayerIndex];
  }

  /**
   * Get valid positions for placing a card
   */
  getValidPositions(cardId: number, playerId: string): { x: number; y: number }[] {
    if (!this.gameState) {
      console.log('❌ No game state available for valid positions');
      return [];
    }

    console.log(`🔍 Getting valid positions for card ${cardId}, player ${playerId}`);
    console.log(`🔍 Grid size: ${this.gameState.gameSettings.gridWidth}x${this.gameState.gameSettings.gridHeight}`);
    console.log(`🔍 Current grid contents:`, Array.from(this.gameState.grid.entries()));

    const validPositions: { x: number; y: number }[] = [];
    const { gridWidth, gridHeight } = this.gameState.gameSettings;

    // Check all positions on the grid
    for (let x = 0; x < gridWidth; x++) {
      for (let y = 0; y < gridHeight; y++) {
        const position = { x, y };
        const positionKey = `${x},${y}`;

        // Position must be empty
        if (this.gameState.grid.has(positionKey)) {
          console.log(`🔍 Position ${positionKey} is occupied`);
          continue;
        }

        // Must be adjacent to a HOME card or existing card owned by the player
        if (this.isAdjacentToPlayerCard(position, playerId)) {
          console.log(`✅ Position ${positionKey} is valid (adjacent to player card)`);
          validPositions.push(position);
        } else {
          console.log(`❌ Position ${positionKey} is not adjacent to player card`);
        }
      }
    }

    console.log(`🎯 Found ${validPositions.length} valid positions:`, validPositions);
    return validPositions;
  }

  /**
   * Check if position is adjacent to a player's card (including HOME)
   */
  private isAdjacentToPlayerCard(position: { x: number; y: number }, playerId: string): boolean {
    if (!this.gameState) return false;

    const directions = [
      { x: 0, y: 1 },   // North
      { x: 1, y: 0 },   // East
      { x: 0, y: -1 },  // South
      { x: -1, y: 0 }   // West
    ];

    for (const dir of directions) {
      const adjX = position.x + dir.x;
      const adjY = position.y + dir.y;
      const adjKey = `${adjX},${adjY}`;

      const adjacentCard = this.gameState.grid.get(adjKey);
      if (adjacentCard) {
        console.log(`🔍 Adjacent card at ${adjKey}:`, adjacentCard);
        // Allow placement adjacent to HOME cards (which belong to all players)
        // or cards owned by the current player
        if (adjacentCard.isHOME || adjacentCard.ownerId === playerId) {
          console.log(`✅ Valid adjacency: HOME=${adjacentCard.isHOME}, owner=${adjacentCard.ownerId}, player=${playerId}`);
          return true;
        } else {
          console.log(`❌ Invalid adjacency: owner=${adjacentCard.ownerId}, player=${playerId}`);
        }
      }
    }

    return false;
  }

  /**
   * Save game state to local storage
   */
  saveToLocalStorage(): void {
    if (!this.gameState) return;

    try {
      const serializedState = JSON.stringify({
        ...this.gameState,
        grid: Array.from(this.gameState.grid.entries())
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
      parsedState.grid = new Map(parsedState.grid);
      this.gameState = parsedState;

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
