import { Card, PhyloGameBoard, PhyloCardPosition } from '../types';
import { analyzeEcosystemNetwork, removeCardFromBoard } from './ecosystemBuilder';

/**
 * Event Card System for Phylo domino-style gameplay
 */

export interface EventCard {
  id: string;
  name: string;
  description: string;
  eventType: 'environmental' | 'climate' | 'human' | 'natural_disaster' | 'conservation';
  targetCriteria: {
    terrains?: string[];
    climates?: string[];
    scaleRange?: { min: number; max: number };
    foodchainLevels?: number[];
    dietTypes?: string[];
    specialKeywords?: string[];
  };
  effects: EventEffect[];
  reactionWindow: number; // milliseconds for opponent reactions
  artwork: string;
  flavorText: string;
}

export interface EventEffect {
  type: 'remove_cards' | 'move_cards' | 'modify_stats' | 'break_connections' | 'force_migration' | 'habitat_loss';
  magnitude: number; // 1-5 scale of severity
  duration?: number; // for temporary effects (turns)
  cascadeChance: number; // 0-1 probability of triggering cascade effects
  description: string;
}

export interface EventTarget {
  cardId: string;
  position: PhyloCardPosition;
  card: Card;
  affectedBy: string[]; // which effect types affect this card
}

export interface EventResult {
  success: boolean;
  updatedBoard: PhyloGameBoard;
  targetsAffected: EventTarget[];
  cardsRemoved: string[];
  cardsMoved: Array<{ cardId: string; from: { x: number; y: number }; to: { x: number; y: number } }>;
  cascadeEffects: string[];
  ecosystemDisruption: {
    brokenChains: string[];
    isolatedCards: string[];
    stabilityChange: number;
  };
  reactionOpportunities: Array<{
    playerId: string;
    availableReactions: string[];
    timeLimit: number;
  }>;
  errorMessage?: string;
}

/**
 * Predefined event cards for the game
 */
export const EVENT_CARDS: EventCard[] = [
  {
    id: 'climate_change',
    name: 'Climate Change',
    description: 'Rising temperatures force species to migrate or face extinction',
    eventType: 'climate',
    targetCriteria: {
      climates: ['Cold', 'Cool'],
      scaleRange: { min: 1, max: 6 }
    },
    effects: [
      {
        type: 'force_migration',
        magnitude: 3,
        cascadeChance: 0.7,
        description: 'Cold-adapted species must move to cooler areas or be removed'
      }
    ],
    reactionWindow: 10000, // 10 seconds
    artwork: '/assets/events/climate_change.jpg',
    flavorText: 'The world grows warmer, and ancient ice gives way to rising seas.'
  },
  {
    id: 'deforestation',
    name: 'Deforestation',
    description: 'Human activity destroys forest habitats',
    eventType: 'human',
    targetCriteria: {
      terrains: ['Forest'],
      foodchainLevels: [1, 2] // Affects producers and herbivores most
    },
    effects: [
      {
        type: 'habitat_loss',
        magnitude: 4,
        cascadeChance: 0.8,
        description: 'Forest species lose their habitat and food sources'
      }
    ],
    reactionWindow: 8000,
    artwork: '/assets/events/deforestation.jpg',
    flavorText: 'The ancient trees fall silent, taking their secrets with them.'
  },
  {
    id: 'invasive_species',
    name: 'Invasive Species',
    description: 'Non-native species disrupt local ecosystems',
    eventType: 'environmental',
    targetCriteria: {
      scaleRange: { min: 1, max: 4 }, // Affects smaller native species
      specialKeywords: ['INVASIVE'] // Ironically, invasive species are immune
    },
    effects: [
      {
        type: 'break_connections',
        magnitude: 3,
        cascadeChance: 0.6,
        description: 'Native species lose food sources to invasive competitors'
      }
    ],
    reactionWindow: 12000,
    artwork: '/assets/events/invasive_species.jpg',
    flavorText: 'Strangers in a strange land, they know no natural boundaries.'
  },
  {
    id: 'volcanic_eruption',
    name: 'Volcanic Eruption',
    description: 'Massive eruption devastates local wildlife',
    eventType: 'natural_disaster',
    targetCriteria: {
      scaleRange: { min: 1, max: 8 }, // Affects most species
      terrains: ['Mountain', 'Forest', 'Grassland']
    },
    effects: [
      {
        type: 'remove_cards',
        magnitude: 5,
        cascadeChance: 0.9,
        description: 'Volcanic ash and lava destroy habitats indiscriminately'
      }
    ],
    reactionWindow: 5000, // Short reaction time for natural disasters
    artwork: '/assets/events/volcanic_eruption.jpg',
    flavorText: 'The earth itself rebels, reshaping the world in fire and ash.'
  },
  {
    id: 'conservation_effort',
    name: 'Conservation Effort',
    description: 'Protected areas and breeding programs help endangered species',
    eventType: 'conservation',
    targetCriteria: {
      scaleRange: { min: 5, max: 10 }, // Helps larger, more visible species
      foodchainLevels: [3, 4] // Focuses on predators
    },
    effects: [
      {
        type: 'modify_stats',
        magnitude: 2,
        duration: 3,
        cascadeChance: 0.3,
        description: 'Protected species become more resilient to threats'
      }
    ],
    reactionWindow: 15000,
    artwork: '/assets/events/conservation_effort.jpg',
    flavorText: 'Human hands work to undo the damage of human progress.'
  },
  {
    id: 'ocean_acidification',
    name: 'Ocean Acidification',
    description: 'Changing ocean chemistry threatens marine life',
    eventType: 'climate',
    targetCriteria: {
      terrains: ['Ocean', 'Coastal'],
      foodchainLevels: [1] // Affects marine producers most
    },
    effects: [
      {
        type: 'remove_cards',
        magnitude: 3,
        cascadeChance: 0.8,
        description: 'Marine food webs collapse from the bottom up'
      }
    ],
    reactionWindow: 9000,
    artwork: '/assets/events/ocean_acidification.jpg',
    flavorText: 'The seas grow sour, and coral cities crumble to dust.'
  }
];

/**
 * Finds all cards that match the event's target criteria
 */
export function findEventTargets(
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>,
  eventCard: EventCard
): EventTarget[] {
  const targets: EventTarget[] = [];
  const criteria = eventCard.targetCriteria;

  gameBoard.positions.forEach((position) => {
    const card = cards.get(position.cardId);
    if (!card || !card.phyloAttributes) return;

    const phylo = card.phyloAttributes;
    let matches = true;

    // Check terrain criteria
    if (criteria.terrains && criteria.terrains.length > 0) {
      const hasMatchingTerrain = criteria.terrains.some(terrain =>
        phylo.terrains.includes(terrain)
      );
      if (!hasMatchingTerrain) matches = false;
    }

    // Check climate criteria
    if (criteria.climates && criteria.climates.length > 0) {
      const hasMatchingClimate = criteria.climates.some(climate =>
        phylo.climates.includes(climate)
      );
      if (!hasMatchingClimate) matches = false;
    }

    // Check scale range
    if (criteria.scaleRange) {
      const scale = phylo.scale;
      if (scale < criteria.scaleRange.min || scale > criteria.scaleRange.max) {
        matches = false;
      }
    }

    // Check foodchain levels
    if (criteria.foodchainLevels && criteria.foodchainLevels.length > 0) {
      if (!criteria.foodchainLevels.includes(phylo.foodchainLevel)) {
        matches = false;
      }
    }

    // Check diet types
    if (criteria.dietTypes && criteria.dietTypes.length > 0) {
      if (!criteria.dietTypes.includes(phylo.dietType)) {
        matches = false;
      }
    }

    // Check special keywords
    if (criteria.specialKeywords && criteria.specialKeywords.length > 0) {
      const hasMatchingKeyword = criteria.specialKeywords.some(keyword =>
        phylo.specialKeywords.includes(keyword)
      );
      // For invasive species event, we want to exclude invasive species
      if (eventCard.id === 'invasive_species') {
        if (hasMatchingKeyword) matches = false;
      } else {
        if (!hasMatchingKeyword && criteria.specialKeywords.length > 0) matches = false;
      }
    }

    if (matches) {
      targets.push({
        cardId: position.cardId,
        position,
        card,
        affectedBy: eventCard.effects.map(effect => effect.type)
      });
    }
  });

  return targets;
}

/**
 * Executes an event card's effects on the game board
 */
export function executeEventCard(
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>,
  eventCard: EventCard,
  playerId: string
): EventResult {
  const targets = findEventTargets(gameBoard, cards, eventCard);

  if (targets.length === 0) {
    return {
      success: false,
      updatedBoard: gameBoard,
      targetsAffected: [],
      cardsRemoved: [],
      cardsMoved: [],
      cascadeEffects: [],
      ecosystemDisruption: {
        brokenChains: [],
        isolatedCards: [],
        stabilityChange: 0
      },
      reactionOpportunities: [],
      errorMessage: 'No valid targets found for this event'
    };
  }

  // Analyze ecosystem before event
  const beforeNetwork = analyzeEcosystemNetwork(gameBoard, cards);
  let updatedBoard = { ...gameBoard };
  const cardsRemoved: string[] = [];
  const cardsMoved: Array<{ cardId: string; from: { x: number; y: number }; to: { x: number; y: number } }> = [];
  const cascadeEffects: string[] = [];

  // Apply each effect
  for (const effect of eventCard.effects) {
    const affectedTargets = targets.filter(target =>
      target.affectedBy.includes(effect.type)
    );

    // Calculate how many targets are affected based on magnitude
    const affectedCount = Math.min(
      Math.ceil(affectedTargets.length * (effect.magnitude / 5)),
      affectedTargets.length
    );

    const selectedTargets = affectedTargets.slice(0, affectedCount);

    for (const target of selectedTargets) {
      switch (effect.type) {
        case 'remove_cards':
        case 'habitat_loss':
          const removeResult = removeCardFromBoard(updatedBoard, cards, target.cardId);
          if (removeResult.success) {
            updatedBoard = removeResult.updatedBoard;
            cardsRemoved.push(target.cardId);
            cascadeEffects.push(...removeResult.cascadeRemovals);
          }
          break;

        case 'force_migration':
          // Find valid migration positions
          const migrationPositions = findMigrationPositions(updatedBoard, target, eventCard);
          if (migrationPositions.length > 0) {
            const newPosition = migrationPositions[0];
            // Remove from old position
            const removeResult = removeCardFromBoard(updatedBoard, cards, target.cardId);
            if (removeResult.success) {
              updatedBoard = removeResult.updatedBoard;
              // Add to new position
              updatedBoard.positions.set(`${newPosition.x},${newPosition.y}`, {
                x: newPosition.x,
                y: newPosition.y,
                cardId: target.cardId,
                playerId: target.position.playerId
              });
              cardsMoved.push({
                cardId: target.cardId,
                from: { x: target.position.x, y: target.position.y },
                to: newPosition
              });
            }
          } else {
            // No valid migration position, remove card
            const removeResult = removeCardFromBoard(updatedBoard, cards, target.cardId);
            if (removeResult.success) {
              updatedBoard = removeResult.updatedBoard;
              cardsRemoved.push(target.cardId);
            }
          }
          break;

        case 'break_connections':
          // Remove connections but keep cards
          const connections = updatedBoard.connections.get(target.cardId) || [];
          connections.forEach(connectedCardId => {
            // Check if connection should be broken based on effect magnitude
            if (Math.random() < (effect.magnitude / 5)) {
              cascadeEffects.push(`Connection broken between ${target.cardId} and ${connectedCardId}`);
            }
          });
          break;

        case 'modify_stats':
          // This would modify card stats temporarily
          cascadeEffects.push(`${target.card.commonName} gains protection for ${effect.duration} turns`);
          break;
      }

      // Check for cascade effects
      if (Math.random() < effect.cascadeChance) {
        cascadeEffects.push(`Cascade effect triggered by ${effect.type} on ${target.card.commonName}`);
      }
    }
  }

  // Analyze ecosystem after event
  const afterNetwork = analyzeEcosystemNetwork(updatedBoard, cards);
  const stabilityChange = (afterNetwork.stability || 0) - (beforeNetwork.stability || 0);

  // Generate reaction opportunities for other players
  const reactionOpportunities = generateReactionOpportunities(
    eventCard,
    targets,
    cardsRemoved,
    cardsMoved
  );

  return {
    success: true,
    updatedBoard: updatedBoard,
    targetsAffected: targets,
    cardsRemoved,
    cardsMoved,
    cascadeEffects,
    ecosystemDisruption: {
      brokenChains: findBrokenChains(beforeNetwork, afterNetwork),
      isolatedCards: afterNetwork.isolatedCards,
      stabilityChange
    },
    reactionOpportunities
  };
}

/**
 * Finds valid migration positions for a card affected by an event
 */
function findMigrationPositions(
  gameBoard: PhyloGameBoard,
  target: EventTarget,
  eventCard: EventCard
): Array<{ x: number; y: number }> {
  const validPositions: Array<{ x: number; y: number }> = [];
  const card = target.card;
  const phylo = card.phyloAttributes;

  if (!phylo) return validPositions;

  // For climate change, look for positions with compatible climates
  if (eventCard.id === 'climate_change') {
    // Look for cooler climates
    const preferredClimates = ['Cold', 'Cool'];

    // Search in a radius around the current position
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        const newX = target.position.x + dx;
        const newY = target.position.y + dy;
        const posKey = `${newX},${newY}`;

        // Skip if position is occupied
        if (gameBoard.positions.has(posKey)) continue;

        // Check if this position would be suitable
        // In a real implementation, you'd check terrain/climate data for the position
        // For now, we'll assume positions further north (higher Y) are cooler
        if (newY > target.position.y) {
          validPositions.push({ x: newX, y: newY });
        }
      }
    }
  }

  return validPositions.slice(0, 5); // Limit to 5 options
}

/**
 * Finds chains that were broken by the event
 */
function findBrokenChains(beforeNetwork: any, afterNetwork: any): string[] {
  const brokenChains: string[] = [];

  beforeNetwork.chains.forEach((beforeChain: any) => {
    const afterChain = afterNetwork.chains.find((chain: any) =>
      chain.id === beforeChain.id
    );

    if (!afterChain || !afterChain.isValid) {
      brokenChains.push(...beforeChain.cards);
    }
  });

  return [...new Set(brokenChains)]; // Remove duplicates
}

/**
 * Generates reaction opportunities for other players
 */
function generateReactionOpportunities(
  eventCard: EventCard,
  targets: EventTarget[],
  cardsRemoved: string[],
  cardsMoved: Array<{ cardId: string; from: { x: number; y: number }; to: { x: number; y: number } }>
): Array<{ playerId: string; availableReactions: string[]; timeLimit: number }> {
  const opportunities: Array<{ playerId: string; availableReactions: string[]; timeLimit: number }> = [];

  // Get unique player IDs from affected targets
  const affectedPlayers = [...new Set(targets.map(target => target.position.playerId))];

  affectedPlayers.forEach(playerId => {
    const availableReactions: string[] = [];

    // Conservation efforts can counter some events
    if (eventCard.eventType === 'human' || eventCard.eventType === 'climate') {
      availableReactions.push('conservation_response');
    }

    // Migration assistance for climate events
    if (eventCard.eventType === 'climate') {
      availableReactions.push('migration_assistance');
    }

    // Emergency protection for natural disasters
    if (eventCard.eventType === 'natural_disaster') {
      availableReactions.push('emergency_protection');
    }

    if (availableReactions.length > 0) {
      opportunities.push({
        playerId,
        availableReactions,
        timeLimit: eventCard.reactionWindow
      });
    }
  });

  return opportunities;
}

/**
 * Gets a random event card appropriate for the current game state
 */
export function getRandomEventCard(
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>,
  excludeTypes?: string[]
): EventCard | null {
  let availableEvents = EVENT_CARDS;

  // Filter out excluded types
  if (excludeTypes && excludeTypes.length > 0) {
    availableEvents = EVENT_CARDS.filter(event =>
      !excludeTypes.includes(event.eventType)
    );
  }

  // Filter events that have valid targets
  const validEvents = availableEvents.filter(event => {
    const targets = findEventTargets(gameBoard, cards, event);
    return targets.length > 0;
  });

  if (validEvents.length === 0) return null;

  // Weight events based on game state
  const weightedEvents: { event: EventCard; weight: number }[] = validEvents.map(event => {
    let weight = 1;

    // Conservation events are rarer
    if (event.eventType === 'conservation') weight = 0.3;

    // Natural disasters are dramatic but less common
    if (event.eventType === 'natural_disaster') weight = 0.5;

    // Climate and human events are more common
    if (event.eventType === 'climate' || event.eventType === 'human') weight = 1.5;

    return { event, weight };
  });

  // Select based on weights
  const totalWeight = weightedEvents.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of weightedEvents) {
    random -= item.weight;
    if (random <= 0) {
      return item.event;
    }
  }

  return validEvents[0]; // Fallback
}

/**
 * Checks if a player can play a reaction card
 */
export function canPlayReaction(
  playerId: string,
  reactionType: string,
  eventCard: EventCard,
  gameState: any
): boolean {
  // Check if player has the required reaction cards
  // This would integrate with the player's hand/deck system

  switch (reactionType) {
    case 'conservation_response':
      // Requires conservation-themed cards or resources
      return true; // Simplified for now

    case 'migration_assistance':
      // Requires movement or adaptation cards
      return true;

    case 'emergency_protection':
      // Requires defensive or shelter cards
      return true;

    default:
      return false;
  }
}

/**
 * Executes a reaction card in response to an event
 */
export function executeReaction(
  playerId: string,
  reactionType: string,
  eventResult: EventResult,
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>
): { success: boolean; effect: string; modifiedResult: EventResult } {
  const modifiedResult = { ...eventResult };

  switch (reactionType) {
    case 'conservation_response':
      // Reduce the number of cards removed
      const savedCards = modifiedResult.cardsRemoved.splice(0, Math.ceil(modifiedResult.cardsRemoved.length / 2));
      return {
        success: true,
        effect: `Conservation efforts saved ${savedCards.length} species from extinction`,
        modifiedResult
      };

    case 'migration_assistance':
      // Convert some removals to movements
      const migratedCards = modifiedResult.cardsRemoved.splice(0, 1);
      if (migratedCards.length > 0) {
        modifiedResult.cardsMoved.push({
          cardId: migratedCards[0],
          from: { x: 0, y: 0 }, // Would be actual position
          to: { x: 1, y: 1 }    // Would be actual safe position
        });
      }
      return {
        success: true,
        effect: `Migration corridors helped ${migratedCards.length} species relocate safely`,
        modifiedResult
      };

    case 'emergency_protection':
      // Reduce cascade effects
      modifiedResult.cascadeEffects = modifiedResult.cascadeEffects.slice(0,
        Math.ceil(modifiedResult.cascadeEffects.length / 2)
      );
      return {
        success: true,
        effect: 'Emergency shelters reduced the cascade effects of the disaster',
        modifiedResult
      };

    default:
      return {
        success: false,
        effect: 'Unknown reaction type',
        modifiedResult
      };
  }
}