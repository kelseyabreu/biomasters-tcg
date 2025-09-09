/**
 * Card Data Transformation Utilities (DEPRECATED - use shared DataLoader instead)
 * Handles conversion between backend and frontend card formats
 */

import { Card as FrontendCard, Habitat, createCardWithDefaults } from '../types';

export interface BackendCard {
  id: string;
  archetype_name: string;
  common_name: string;
  scientific_name: string;
  card_data: {
    type: string;
    rarity: string;
    cost: number;
    attack: number;
    health: number;
    abilities: string[];
    description: string;
    flavor_text: string;
    habitat: string;
    diet: string;
    image_url: string;
    set: string;
    artist: string;
    taxonomy?: any;
    biological_data?: any;
    original_species_data?: any;
  };
}



/**
 * Maps backend habitat to frontend Habitat enum
 */
function mapHabitatToClimate(habitat: string): Habitat {
  const habitatMap: Record<string, Habitat> = {
    'Tropical': Habitat.TROPICAL,
    'Temperate': Habitat.TEMPERATE,
    'Arctic': Habitat.TUNDRA,
    'Desert': Habitat.TEMPERATE,
    'Terrestrial': Habitat.TEMPERATE,
    'Aquatic': Habitat.TEMPERATE,
    'Aerial': Habitat.TEMPERATE,
  };
  return habitatMap[habitat] || Habitat.TEMPERATE;
}

/**
 * Calculates speed from biological data
 */
function calculateSpeed(bioData: any): number {
  return Math.min(Math.max(Math.round((bioData?.metabolic_rate || 100) / 100), 1), 10);
}

/**
 * Calculates senses from biological data
 */
function calculateSenses(bioData: any): number {
  return Math.min(Math.max(Math.round((bioData?.mass_kg || 1) / 10), 1), 10);
}

/**
 * Converts backend abilities to frontend CardAbility format
 */
function convertAbilities(abilities: string[]): any[] {
  return abilities.map((ability, index) => ({
    id: `ability_${index}`,
    name: ability,
    description: `${ability} ability`,
    trigger: { type: 'play' as const },
    effect: { type: 'stat_modifier' as const, target: 'self' as const, value: 1 }
  }));
}

/**
 * Maps backend rarity to frontend ConservationStatus
 */
function mapRarityToConservation(rarity: string): any {
  const rarityMap: Record<string, string> = {
    'Common': 'Least Concern',
    'Uncommon': 'Near Threatened',
    'Rare': 'Vulnerable',
    'Legendary': 'Endangered',
  };
  return rarityMap[rarity] || 'Least Concern';
}
