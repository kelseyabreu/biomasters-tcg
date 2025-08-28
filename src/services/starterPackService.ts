/**
 * Starter Pack Service
 * Manages the fixed starter collection that all users receive
 */

import { loadAllSpeciesCards } from '../utils/speciesDataProcessor';
import { Card } from '../types';

export interface StarterPackCard {
  species_name: string;
  educational_purpose: string;
  unlock_order: number;
}

/**
 * Fixed starter pack - same for all users
 * Designed for educational progression
 */
export const STARTER_PACK_SPECIES: StarterPackCard[] = [
  {
    species_name: 'grass',
    educational_purpose: '',
    unlock_order: 1
  },
  {
    species_name: 'rabbit',
    educational_purpose: '',
    unlock_order: 2
  },
  {
    species_name: 'fox',
    educational_purpose: '',
    unlock_order: 3
  },
  {
    species_name: 'oak-tree',
    educational_purpose: '',
    unlock_order: 4
  },
  {
    species_name: 'butterfly',
    educational_purpose: '',
    unlock_order: 5
  }
];

/**
 * Additional credits and rewards for new accounts
 */
export const NEW_ACCOUNT_REWARDS = {
  eco_credits: 100,
  xp_points: 0,
  welcome_message: "Welcome to Biomasters! You've received a starter collection to begin your journey.",
  first_pack_credits: 50, // Extra credits for first pack opening
};

class StarterPackService {
  /**
   * Load all starter pack species data from JSON files
   */
  async loadStarterPackData(): Promise<Card[]> {
    try {
      // Load all species data and filter for starter cards
      const allCards = await loadAllSpeciesCards();
      const starterCards: Card[] = [];

      for (const starterCard of STARTER_PACK_SPECIES) {
        const foundCard = allCards.find(card =>
          card.speciesName === starterCard.species_name ||
          card.commonName.toLowerCase() === starterCard.species_name.toLowerCase()
        );

        if (foundCard) {
          starterCards.push(foundCard);
        } else {
          console.warn(`Starter species not found: ${starterCard.species_name}`);
        }
      }

      if (starterCards.length !== STARTER_PACK_SPECIES.length) {
        console.warn(`Only loaded ${starterCards.length}/${STARTER_PACK_SPECIES.length} starter cards`);
      }

      return starterCards;
    } catch (error) {
      console.error('Failed to load starter pack data:', error);
      return [];
    }
  }

  /**
   * Get starter pack species names only
   */
  getStarterSpeciesNames(): string[] {
    return STARTER_PACK_SPECIES.map(card => card.species_name);
  }

  /**
   * Check if a species is part of the starter pack
   */
  isStarterSpecies(speciesName: string): boolean {
    return STARTER_PACK_SPECIES.some(card => card.species_name === speciesName);
  }

  /**
   * Get educational information for a starter species
   */
  getEducationalInfo(speciesName: string): string | null {
    const starterCard = STARTER_PACK_SPECIES.find(card => card.species_name === speciesName);
    const purpose = starterCard?.educational_purpose;
    return (purpose && purpose.trim() !== '') ? purpose : null;
  }

  /**
   * Get unlock order for tutorial progression
   */
  getUnlockOrder(speciesName: string): number | null {
    const starterCard = STARTER_PACK_SPECIES.find(card => card.species_name === speciesName);
    return starterCard?.unlock_order || null;
  }

  /**
   * Get starter pack in unlock order for tutorial
   */
  getStarterPackInOrder(): StarterPackCard[] {
    return [...STARTER_PACK_SPECIES].sort((a, b) => a.unlock_order - b.unlock_order);
  }

  /**
   * Create starter collection data structure
   */
  createStarterCollection(): Record<string, any> {
    const collection: Record<string, any> = {};
    
    STARTER_PACK_SPECIES.forEach(starterCard => {
      collection[starterCard.species_name] = {
        quantity: 1,
        acquired_via: 'starter',
        first_acquired: Date.now(),
        last_acquired: Date.now(),
        is_starter: true,
        unlock_order: starterCard.unlock_order
      };
    });

    return collection;
  }

  /**
   * Validate that user has complete starter pack
   */
  validateStarterPack(userCollection: Record<string, any>): {
    isComplete: boolean;
    missing: string[];
    extra: string[];
  } {
    const userStarterSpecies = Object.keys(userCollection).filter(species => 
      userCollection[species].acquired_via === 'starter'
    );

    const expectedSpecies = this.getStarterSpeciesNames();
    
    const missing = expectedSpecies.filter(species => !userStarterSpecies.includes(species));
    const extra = userStarterSpecies.filter(species => !expectedSpecies.includes(species));

    return {
      isComplete: missing.length === 0,
      missing,
      extra
    };
  }

  /**
   * Get tutorial progression based on starter pack
   */
  getTutorialProgression(): Array<{
    step: number;
    species: string;
    title: string;
    description: string;
    objective: string;
  }> {
    return [
      {
        step: 1,
        species: 'grass',
        title: 'Meet the Producers',
        description: 'Grass is the foundation of most ecosystems. It converts sunlight into energy that feeds the entire food web.',
        objective: 'Learn how producers create energy from sunlight'
      },
      {
        step: 2,
        species: 'rabbit',
        title: 'Primary Consumers',
        description: 'Rabbits are herbivores that eat plants like grass. They convert plant energy into animal energy.',
        objective: 'Practice feeding your rabbit with grass'
      },
      {
        step: 3,
        species: 'fox',
        title: 'Secondary Consumers',
        description: 'Foxes are predators that hunt smaller animals. They help control herbivore populations.',
        objective: 'Learn hunting mechanics with your fox'
      },
      {
        step: 4,
        species: 'oak-tree',
        title: 'Ecosystem Engineers',
        description: 'Oak trees create habitats for many species. They provide shelter, food, and nesting sites.',
        objective: 'Build your first ecosystem with the oak tree'
      },
      {
        step: 5,
        species: 'butterfly',
        title: 'Pollinators & Symbiosis',
        description: 'Butterflies pollinate flowers while feeding on nectar. This is a win-win relationship called mutualism.',
        objective: 'Create pollination chains with your butterfly'
      }
    ];
  }

  /**
   * Get recommended first deck using starter cards
   */
  getStarterDeck(): {
    name: string;
    description: string;
    cards: string[];
    strategy: string;
  } {
    return {
      name: 'Balanced Ecosystem',
      description: 'A well-balanced deck showcasing the basic food web relationships',
      cards: this.getStarterSpeciesNames(),
      strategy: 'Start with grass and oak tree as your foundation, then add rabbit for herbivore energy, fox for population control, and butterfly for pollination bonuses.'
    };
  }
}

export const starterPackService = new StarterPackService();
export default starterPackService;
