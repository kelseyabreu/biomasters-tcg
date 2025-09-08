import { Card, PhyloGameBoard, PhyloCardPosition } from '../types';

/**
 * Event card targeting and action system
 */

export enum EventActionType {
  // Position-based actions
  REMOVE_CARD = 'remove_card',
  MOVE_CARD = 'move_card',
  PLACE_CARD = 'place_card',
  
  // Area effects
  CLIMATE_CHANGE = 'climate_change',
  HABITAT_DESTRUCTION = 'habitat_destruction',
  DISEASE_OUTBREAK = 'disease_outbreak',
  
  // Card modifications
  MODIFY_STATS = 'modify_stats',
  ADD_ABILITY = 'add_ability',
  REMOVE_ABILITY = 'remove_ability',
  
  // Game state effects
  DRAW_CARDS = 'draw_cards',
  DISCARD_CARDS = 'discard_cards',
  SKIP_TURN = 'skip_turn',
  
  // Environmental effects
  DROUGHT = 'drought',
  FLOOD = 'flood',
  FIRE = 'fire',
  EARTHQUAKE = 'earthquake',
  
  // Biological effects
  MIGRATION = 'migration',
  EXTINCTION = 'extinction',
  EVOLUTION = 'evolution',
  PREDATION = 'predation'
}

export interface EventAction {
  type: EventActionType;
  targetType: 'position' | 'card' | 'player' | 'area' | 'global';
  targetCriteria?: {
    foodchainLevel?: number[];
    terrains?: string[];
    climates?: string[];
    conservationStatus?: string[];
    dietType?: string[];
    scale?: { min?: number; max?: number };
    keywords?: string[];
  };
  effect: {
    value?: number;
    duration?: number;
    permanent?: boolean;
    description: string;
  };
}

export interface EventTargetHighlight {
  x: number;
  y: number;
  cardId?: string;
  type: 'valid_target' | 'invalid_target' | 'affected_area';
  reason: string;
}

/**
 * Checks if a card matches the target criteria
 */
function matchesTargetCriteria(card: Card, criteria?: EventAction['targetCriteria']): boolean {
  if (!criteria) return true;

  const phylo = card.phyloAttributes;
  if (!phylo) return false;

  // Check foodchain level
  if (criteria.foodchainLevel && !criteria.foodchainLevel.includes(phylo.foodchainLevel)) {
    return false;
  }

  // Check terrains
  if (criteria.terrains && !criteria.terrains.some(terrain => phylo.terrains.includes(terrain))) {
    return false;
  }

  // Check climates
  if (criteria.climates && !criteria.climates.some(climate => phylo.climates.includes(climate))) {
    return false;
  }

  // Check conservation status
  if (criteria.conservationStatus && !criteria.conservationStatus.includes(phylo.conservationStatus)) {
    return false;
  }

  // Check diet type
  if (criteria.dietType && !criteria.dietType.includes(phylo.dietType)) {
    return false;
  }

  // Check scale
  if (criteria.scale) {
    const cardScale = phylo.scale;
    if (criteria.scale.min !== undefined && cardScale < criteria.scale.min) return false;
    if (criteria.scale.max !== undefined && cardScale > criteria.scale.max) return false;
  }

  // Check keywords
  if (criteria.keywords && !criteria.keywords.some(keyword => phylo.specialKeywords.includes(keyword))) {
    return false;
  }

  return true;
}

/**
 * Calculates target highlights for an event card
 */
export function calculateEventTargets(
  eventCard: Card,
  eventAction: EventAction,
  gameBoard: PhyloGameBoard,
  cards: Map<string, Card>,
  boardRows: number = 9,
  boardCols: number = 10
): EventTargetHighlight[] {
  const highlights: EventTargetHighlight[] = [];

  switch (eventAction.targetType) {
    case 'card':
      // Highlight specific cards that match criteria
      gameBoard.positions.forEach((position, positionKey) => {
        const card = cards.get(position.cardId);
        if (!card) return;

        const isValidTarget = matchesTargetCriteria(card, eventAction.targetCriteria);
        
        highlights.push({
          x: position.x,
          y: position.y,
          cardId: position.cardId,
          type: isValidTarget ? 'valid_target' : 'invalid_target',
          reason: isValidTarget 
            ? `Valid target for ${eventAction.effect.description}`
            : `Does not match criteria for ${eventAction.effect.description}`
        });
      });
      break;

    case 'position':
      // Highlight all positions (for placement/movement events)
      for (let y = 0; y < boardRows; y++) {
        for (let x = 0; x < boardCols; x++) {
          const positionKey = `${x},${y}`;
          const isOccupied = gameBoard.positions.has(positionKey);
          
          highlights.push({
            x,
            y,
            type: 'valid_target',
            reason: isOccupied 
              ? `Occupied position - ${eventAction.effect.description}`
              : `Empty position - ${eventAction.effect.description}`
          });
        }
      }
      break;

    case 'area':
      // Highlight area effects (e.g., all cards in certain terrains)
      gameBoard.positions.forEach((position, positionKey) => {
        const card = cards.get(position.cardId);
        if (!card) return;

        const isInAffectedArea = matchesTargetCriteria(card, eventAction.targetCriteria);
        
        highlights.push({
          x: position.x,
          y: position.y,
          cardId: position.cardId,
          type: isInAffectedArea ? 'affected_area' : 'invalid_target',
          reason: isInAffectedArea 
            ? `In affected area: ${eventAction.effect.description}`
            : `Not in affected area`
        });
      });
      break;

    case 'global':
      // Global effects don't need specific targeting
      break;

    case 'player':
      // Player-specific effects (handled at game level)
      break;
  }

  return highlights;
}

/**
 * Predefined event actions for common event cards
 */
export const PREDEFINED_EVENT_ACTIONS: Record<string, EventAction> = {
  // Climate events
  DROUGHT: {
    type: EventActionType.CLIMATE_CHANGE,
    targetType: 'area',
    targetCriteria: {
      terrains: ['Desert', 'Grassland'],
      climates: ['Hot', 'Warm']
    },
    effect: {
      value: -1,
      duration: 3,
      description: 'Reduces health of cards in dry climates'
    }
  },

  FLOOD: {
    type: EventActionType.CLIMATE_CHANGE,
    targetType: 'area',
    targetCriteria: {
      terrains: ['Forest', 'Grassland'],
      climates: ['Cool', 'Warm']
    },
    effect: {
      value: -2,
      duration: 2,
      description: 'Damages cards in flood-prone areas'
    }
  },

  // Biological events
  DISEASE_OUTBREAK: {
    type: EventActionType.DISEASE_OUTBREAK,
    targetType: 'card',
    targetCriteria: {
      foodchainLevel: [2, 3],
      scale: { min: 3, max: 8 }
    },
    effect: {
      value: -1,
      duration: 2,
      description: 'Affects medium to large animals'
    }
  },

  PREDATOR_INVASION: {
    type: EventActionType.PREDATION,
    targetType: 'card',
    targetCriteria: {
      foodchainLevel: [1, 2],
      dietType: ['Producer', 'Herbivore']
    },
    effect: {
      value: -1,
      permanent: true,
      description: 'Invasive predator threatens lower trophic levels'
    }
  },

  // Habitat events
  DEFORESTATION: {
    type: EventActionType.HABITAT_DESTRUCTION,
    targetType: 'area',
    targetCriteria: {
      terrains: ['Forest']
    },
    effect: {
      value: -2,
      permanent: true,
      description: 'Destroys forest habitat'
    }
  },

  CONSERVATION_EFFORT: {
    type: EventActionType.MODIFY_STATS,
    targetType: 'card',
    targetCriteria: {
      conservationStatus: ['Endangered', 'Critically Endangered', 'Vulnerable']
    },
    effect: {
      value: 2,
      duration: 5,
      description: 'Boosts threatened species'
    }
  }
};

/**
 * Gets the event action for a given event card
 */
export function getEventAction(eventCard: Card): EventAction | null {
  // Check if card has predefined action
  const predefinedAction = PREDEFINED_EVENT_ACTIONS[eventCard.nameId.toUpperCase().replace(/\s+/g, '_')];
  if (predefinedAction) {
    return predefinedAction;
  }

  // Parse action from card abilities or description
  // This would be expanded based on actual event card structure
  if (eventCard.abilities && eventCard.abilities.length > 0) {
    const ability = eventCard.abilities[0];
    
    // Simple parsing - would be more sophisticated in full implementation
    return {
      type: EventActionType.MODIFY_STATS,
      targetType: 'card',
      effect: {
        value: 1,
        description: ability.description
      }
    };
  }

  return null;
}

/**
 * Converts event highlights to the format expected by the board component
 */
export function convertEventHighlightsToPositions(highlights: EventTargetHighlight[]): Array<{ x: number; y: number; type: 'valid' | 'invalid' }> {
  return highlights.map(highlight => ({
    x: highlight.x,
    y: highlight.y,
    type: highlight.type === 'valid_target' || highlight.type === 'affected_area' ? 'valid' as const : 'invalid' as const
  }));
}
