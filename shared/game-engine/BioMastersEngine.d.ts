/**
 * BioMasters Game Engine
 * Environment-agnostic core implementation of the data-driven card game engine
 * Based on BioMasterEngine.txt specifications
 *
 * This engine is shared between client and server, with data injected via constructor
 */
import { GamePhase, TurnPhase, GameActionType } from '../enums';
import { CardNameId, ScientificNameId, CardDescriptionId, TaxonomyId } from '../text-ids';
import { ILocalizationManager } from '../localization-manager';
import { CardData as SharedCardData, AbilityData as SharedAbilityData } from '../types';
export interface CardData extends SharedCardData {
    attachments?: CardData[];
    isDetritus?: boolean;
}
export interface LegacyEngineCardData {
    cardId: number;
    nameId: CardNameId;
    scientificNameId: ScientificNameId;
    descriptionId: CardDescriptionId;
    taxonomyId: TaxonomyId;
    trophicLevel: number | null;
    trophicCategory: number | null;
    domain: number;
    cost: any;
    keywords: number[];
    abilities: number[];
    victoryPoints: number;
    conservationStatus: number;
    mass_kg: number;
    lifespan_max_days: number;
    vision_range_m: number;
    smell_range_m: number;
    hearing_range_m: number;
    walk_speed_m_per_hr: number;
    run_speed_m_per_hr: number;
    swim_speed_m_per_hr: number;
    fly_speed_m_per_hr: number;
    offspring_count: number;
    gestation_days: number;
}
export interface AbilityData extends SharedAbilityData {
}
export interface GameState {
    gameId: string;
    players: Player[];
    currentPlayerIndex: number;
    gamePhase: GamePhase;
    turnPhase: TurnPhase;
    actionsRemaining: number;
    turnNumber: number;
    finalTurnTriggeredBy?: string;
    finalTurnPlayersRemaining?: string[];
    grid: Map<string, GridCard>;
    gameSettings: GameSettings;
    metadata: Record<string, any>;
}
export interface Player {
    id: string;
    name: string;
    hand: string[];
    deck: string[];
    scorePile: GridCard[];
    energy: number;
    isReady: boolean;
}
export interface GridCard {
    instanceId: string;
    cardId: number;
    ownerId: string;
    position: {
        x: number;
        y: number;
    };
    isExhausted: boolean;
    attachments: GridCard[];
    statusEffects: StatusEffect[];
    isDetritus: boolean;
    isHOME: boolean;
}
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
export interface PlayerAction {
    type: GameActionType;
    playerId: string;
    payload: any;
}
export interface PlayCardPayload {
    cardId: number;
    position: {
        x: number;
        y: number;
    };
    connectionTargetId?: string;
    cost?: any;
}
export interface ActivateAbilityPayload {
    instanceId: string;
    abilityId: number;
    targetInstanceId?: string;
    additionalTargets?: string[];
}
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
export declare class BioMastersEngine {
    private gameState;
    readonly cardDatabase: Map<number, CardData>;
    readonly abilityDatabase: Map<number, AbilityData>;
    readonly keywordDatabase: Map<number, string>;
    readonly localizationManager: ILocalizationManager;
    /**
     * Environment-agnostic constructor
     * Accepts all required data via dependency injection
     */
    constructor(cardDatabase: Map<number, CardData>, abilityDatabase: Map<number, AbilityData>, keywordDatabase: Map<number, string>, localizationManager: ILocalizationManager);
    /**
     * Get localized card name
     */
    getCardName(cardData: CardData): string;
    /**
     * Get localized scientific name
     */
    getScientificName(cardData: CardData): string;
    /**
     * Get localized card description
     */
    getCardDescription(cardData: CardData): string;
    /**
     * Get localized ability name
     */
    getAbilityName(abilityData: AbilityData): string;
    /**
     * Get localized ability description
     */
    getAbilityDescription(abilityData: AbilityData): string;
    /**
     * Initialize a new game state
     * This method creates a new game and sets it as the current game state
     */
    initializeNewGame(gameId: string, players: {
        id: string;
        name: string;
    }[], gameSettings: GameSettings): GameState;
    /**
     * Get proper grid size based on player count
     * 1v1 (2 players): 9x10
     * 2v2/4-player (4 players): 10x10
     */
    static getGridSize(playerCount: number): {
        width: number;
        height: number;
    };
    /**
     * Get HOME card position based on player count and index
     * Centers HOME positions in the middle of the grid (9x10 or 10x10)
     */
    private getHOMEPosition;
    /**
     * Core action processor - single entry point for all player actions
     */
    processAction(action: PlayerAction): {
        isValid: boolean;
        newState?: GameState;
        errorMessage?: string;
    };
    /**
     * Handle playing a card to the grid
     */
    private handlePlayCard;
    /**
     * Handle activating a card ability
     */
    private handleActivateAbility;
    /**
     * Validate ability targeting requirements
     */
    private validateAbilityTargeting;
    /**
     * Check if ability requires a target
     */
    private abilityRequiresTarget;
    /**
     * Check if selector requires manual targeting
     */
    private selectorRequiresTarget;
    /**
     * Validate if a target is valid for an ability
     */
    private isValidTarget;
    /**
     * Check if a card is a Chemoautotroph (+1C)
     */
    isChemoautotroph(cardData: CardData): boolean;
    /**
     * Check if a chemoautotroph has Chemical Opportunist ability (-1S backup)
     */
    private hasChemicalOpportunistAbility;
    /**
     * Check if a chemoautotroph has Detrital Specialist ability (-2D connection)
     */
    private hasDetritalSpecialistAbility;
    /**
     * Check if a card is a Saprotroph (-1S)
     */
    private isSaprotroph;
    /**
     * Check if a card is a Detritivore (-2D)
     */
    private isDetritivore;
    /**
     * Check if there's detritus at a specific position
     */
    private hasDetritusAtPosition;
    /**
     * Convert detritus to score pile when Saprotroph is placed
     */
    private processDetritusConversion;
    /**
     * Check if a card is a Parasite (P)
     */
    private isParasite;
    /**
     * Check if a card is a Mutualist (M)
     */
    private isMutualist;
    /**
     * Find a valid host for a parasite or mutualist
     */
    private findValidHost;
    /**
     * Check if two cards have compatible domains
     */
    private areDomainsCompatible;
    /**
     * Process attachment when a parasite or mutualist is played
     */
    private processAttachment;
    /**
     * Apply effects when a card attaches to a host
     */
    private applyAttachmentEffects;
    private isValidPosition;
    private getCurrentPlayer;
    private cloneGameState;
    private generateInstanceId;
    private findCardByInstanceId;
    private findCardInState;
    /**
     * Validate card placement according to domain and trophic rules
     */
    private validateCardPlacement;
    /**
     * Validate domain compatibility between cards - Enhanced with FRESHWATER/MARINE distinction
     */
    private validateDomainCompatibility;
    /**
     * Get domain information for a card using the standardized Domain property
     * Special handling for HOME cards and cards without Domain field
     */
    private getCardDomains;
    /**
     * Check advanced domain compatibility using the standardized Domain system
     * Uses the DOMAIN_COMPATIBILITY matrix which includes HOME domain
     */
    private areDomainsCompatibleAdvanced;
    /**
     * Get human-readable domain name using the standardized Domain system
     */
    private getDomainName;
    /**
     * Validate cost requirements
     */
    private validateCost;
    /**
     * Pay the cost for playing a card
     */
    private payCost;
    /**
     * Check if card should get preferred diet bonus (enter ready)
     */
    private checkPreferredDietBonus;
    /**
     * Check for synergy bonuses (Preferred Diet)
     */
    private checkSynergyBonuses;
    /**
     * Check if card has preferred diet available - Enhanced with more keyword combinations
     */
    private checkPreferredDiet;
    /**
     * Check if a card has mixotrophic abilities (producer with consumer abilities)
     */
    private hasMixotrophAbilities;
    /**
     * Check if mixotroph is near HOME position
     */
    private isNearHome;
    /**
     * Check for specific prey bonuses for mixotrophs
     */
    private checkMixotrophPreyBonus;
    /**
     * Process mixotroph special abilities
     */
    private processMixotrophAbilities;
    /**
     * Execute ability effects
     */
    private executeEffects;
    /**
     * Execute a single effect
     */
    private executeEffect;
    /**
     * Execute TARGET effect - select targets for other effects
     */
    private executeTargetEffect;
    /**
     * Execute TAKE_CARD effect - take cards from zones
     */
    private executeTakeCardEffect;
    /**
     * Execute APPLY_STATUS effect - apply status effects to targets
     */
    private executeApplyStatusEffect;
    /**
     * Execute MOVE_CARD effect - move cards between zones
     */
    private executeMoveCardEffect;
    /**
     * Execute EXHAUST_TARGET effect
     */
    private executeExhaustTargetEffect;
    /**
     * Execute READY_TARGET effect
     */
    private executeReadyTargetEffect;
    /**
     * Execute DESTROY_TARGET effect
     */
    private executeDestroyTargetEffect;
    /**
     * Execute GAIN_ENERGY effect
     */
    private executeGainEnergyEffect;
    /**
     * Execute LOSE_ENERGY effect
     */
    private executeLoseEnergyEffect;
    /**
     * Execute DRAW_CARD effect
     */
    private executeDrawCardEffect;
    /**
     * Execute MOVE_TO_HAND effect
     */
    private executeMoveToHandEffect;
    /**
     * Execute PREVENT_READY effect
     */
    private executePreventReadyEffect;
    /**
     * Execute GAIN_VP effect
     */
    private executeGainVPEffect;
    /**
     * Execute DISCARD_CARD effect
     */
    private executeDiscardCardEffect;
    /**
     * Select targets based on selector and filters
     */
    private selectTargets;
    /**
     * Apply filters to target selection
     */
    private applyFilters;
    /**
     * Execute an action on a target
     */
    private executeAction;
    /**
     * Get cards adjacent to a position
     */
    private getAdjacentCards;
    /**
     * Get cards adjacent to shared amphibious cards
     */
    private getAdjacentsToSharedAmphibious;
    /**
     * Check if position is a HOME position
     */
    private isHomePosition;
    /**
     * Handle pass turn action - now manages turn phases
     */
    private handlePassTurn;
    /**
     * Start a new turn with proper phase progression
     */
    private startNewTurn;
    /**
     * Execute Ready Phase - ready all player's cards
     */
    private executeReadyPhase;
    /**
     * Execute Draw Phase - mandatory card draw
     */
    private executeDrawPhase;
    /**
     * Execute Action Phase - player can take up to 3 actions
     */
    private executeActionPhase;
    /**
     * Update status effect durations
     */
    private updateStatusEffects;
    /**
     * Handle move card action (for special abilities)
     */
    private handleMoveCard;
    /**
     * Handle challenge action (for competitive play)
     */
    private handleChallenge;
    /**
     * Handle player ready action (for game setup)
     */
    private handlePlayerReady;
    /**
     * Handle remove card action (for death/removal effects)
     */
    private handleRemoveCard;
    getGameState(): GameState;
    isGameInitialized(): boolean;
    /**
     * Private helper to ensure game is initialized before operations
     */
    private ensureGameInitialized;
    getCardDatabase(): Map<number, CardData>;
    getAbilityDatabase(): Map<number, AbilityData>;
    /**
     * Get card data by ID (public method)
     */
    getCardData(cardId: number): CardData | undefined;
    /**
     * Get ability data by ID (public method)
     */
    getAbilityData(abilityId: number): AbilityData | undefined;
    /**
     * Process ON_PLAY abilities when a card is played
     */
    private processOnPlayAbilities;
    /**
     * Process the effects of an ability
     */
    private processAbilityEffects;
    /**
     * Process all passive abilities currently in play
     */
    private processPassiveAbilities;
    /**
     * Check if a passive ability should trigger for a specific event
     */
    private shouldTriggerPassiveAbility;
    /**
     * Process triggered abilities based on specific game events
     */
    private processTriggerAbilities;
    /**
     * Check if an ability matches a specific trigger type
     */
    private abilityMatchesTrigger;
    loadCardDatabase(cards: CardData[]): void;
    loadAbilityDatabase(abilities: AbilityData[]): void;
    /**
     * End the game and determine winner
     */
    private endGame;
    /**
     * Calculate victory points for a player
     */
    private calculateVictoryPoints;
    /**
     * Get current game winner (if game has ended)
     */
    getGameResult(): any;
    /**
     * Check if game should end due to other conditions
     */
    checkGameEndConditions(state: GameState): boolean;
    /**
     * Process mixotroph abilities at turn start
     */
    private processMixotrophsOnTurnStart;
    /**
     * Handle metamorphosis action - upgrade juvenile to adult
     */
    private handleMetamorphosis;
    /**
     * Check if a card has metamorphosis ability
     */
    private hasMetamorphosis;
    /**
     * Validate that metamorphosis is allowed between two cards
     */
    private validateMetamorphosis;
    /**
     * Extract species name from scientific name
     */
    private extractSpeciesName;
    /**
     * Execute the metamorphosis transformation
     */
    private executeMetamorphosis;
}
//# sourceMappingURL=BioMastersEngine.d.ts.map