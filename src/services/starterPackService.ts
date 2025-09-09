/**
 * Starter Pack Service
 * Manages the fixed starter collection that all users receive
 */

import { dataLoader } from '@shared/data/DataLoader';
import { Card } from '../types';
import { CardId } from '@shared/enums';
import { CardData } from '@shared/types';
// No longer need legacy species name conversions

export interface StarterPackCard {
  cardId: number;
  educational_purpose: string;
  unlock_order: number;
}

/**
 * Fixed starter pack - same for all users
 * Designed for educational progression
 */
export const STARTER_PACK_SPECIES: StarterPackCard[] = [
  {
    cardId: CardId.REED_CANARY_GRASS, // CardId 3 - represents "grass"
    educational_purpose: 'Learn about primary producers and photosynthesis',
    unlock_order: 1
  },
  {
    cardId: CardId.EUROPEAN_RABBIT, // CardId 4 - represents "rabbit"
    educational_purpose: 'Understand primary consumers and herbivory',
    unlock_order: 2
  },
  {
    cardId: 53, // RED_FOX - represents "fox"
    educational_purpose: 'Explore secondary consumers and predation',
    unlock_order: 3
  },
  {
    cardId: CardId.OAK_TREE, // CardId 1 - represents "oak-tree"
    educational_purpose: 'Discover tree ecosystems and habitat creation',
    unlock_order: 4
  },
  {
    cardId: 34, // MONARCH_BUTTERFLY - represents "butterfly"
    educational_purpose: 'Learn about pollinators and metamorphosis',
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
      // Load all cards using shared DataLoader
      const result = await dataLoader.loadAllCards();
      if (!result.success || !result.data) {
        console.error('Failed to load cards:', result.error);
        return [];
      }

      const allCards = result.data;
      const starterCards: Card[] = [];

      for (const starterCard of STARTER_PACK_SPECIES) {
        const foundCard = allCards.find((card: CardData) =>
          card.cardId === starterCard.cardId
        );

        if (foundCard) {
          // Convert CardData to Card (frontend type)
          const frontendCard: Card = {
            ...foundCard,
            // Add frontend-specific properties
            id: `card-${foundCard.cardId}`, // Generate unique instance ID
            artwork: foundCard.artwork_url || `/images/species/${foundCard.nameId.toLowerCase()}.jpg`, // Use artwork URL or default
            description: foundCard.descriptionId || 'No description available', // Use description ID as fallback
            conservationStatus: foundCard.conservation_status || 'Least Concern' as any, // Map conservation status
            trophicRole: foundCard.trophicLevel || 'Primary Consumer' as any, // Map trophic level
            habitat: foundCard.domain as any, // Map domain to habitat
            power: foundCard.mass_kg ? Math.floor(foundCard.mass_kg / 10) + 1 : 1, // Calculate power from mass
            health: foundCard.mass_kg ? Math.floor(foundCard.mass_kg / 5) + 5 : 5, // Calculate health from mass
            maxHealth: foundCard.mass_kg ? Math.floor(foundCard.mass_kg / 5) + 5 : 5, // Same as health
            speed: foundCard.run_speed_m_per_hr ? Math.floor(foundCard.run_speed_m_per_hr / 1000) + 1 : 1, // Calculate from run speed
            senses: foundCard.vision_range_m ? Math.floor(foundCard.vision_range_m / 100) + 1 : 1, // Calculate from vision range
            energyCost: foundCard.cost ? parseInt(foundCard.cost) || 1 : 1, // Parse cost or default
            abilities: [], // Convert abilities if needed
          };
          starterCards.push(frontendCard);
        } else {
          console.warn(`Starter card not found: CardId ${starterCard.cardId}`);
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
   * Get starter pack CardIds
   */
  getStarterCardIds(): number[] {
    return STARTER_PACK_SPECIES.map(card => card.cardId);
  }

  /**
   * Check if a CardId is part of the starter pack
   */
  isStarterCard(cardId: number): boolean {
    return STARTER_PACK_SPECIES.some(card => card.cardId === cardId);
  }

  /**
   * Get educational information for a starter card
   */
  getEducationalInfo(cardId: number): string | null {
    const starterCard = STARTER_PACK_SPECIES.find(card => card.cardId === cardId);
    const purpose = starterCard?.educational_purpose;
    return (purpose && purpose.trim() !== '') ? purpose : null;
  }

  /**
   * Get unlock order for tutorial progression
   */
  getUnlockOrder(cardId: number): number | null {
    const starterCard = STARTER_PACK_SPECIES.find(card => card.cardId === cardId);
    return starterCard?.unlock_order || null;
  }

  /**
   * Get starter pack in unlock order for tutorial
   */
  getStarterPackInOrder(): StarterPackCard[] {
    return [...STARTER_PACK_SPECIES].sort((a, b) => a.unlock_order - b.unlock_order);
  }

  /**
   * Create starter collection data structure using CardIds
   */
  createStarterCollection(): Record<number, any> {
    const collection: Record<number, any> = {};

    STARTER_PACK_SPECIES.forEach(starterCard => {
      collection[starterCard.cardId] = {
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
   * Validate that user has complete starter pack using CardIds
   */
  validateStarterPack(userCollection: Record<number, any>): {
    isComplete: boolean;
    missing: number[];
    extra: number[];
  } {
    const userStarterCards = Object.keys(userCollection).map(id => parseInt(id)).filter(cardId =>
      userCollection[cardId].acquired_via === 'starter'
    );

    const expectedCards = this.getStarterCardIds();

    const missing = expectedCards.filter(cardId => !userStarterCards.includes(cardId));
    const extra = userStarterCards.filter(cardId => !expectedCards.includes(cardId));

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
    cardId: number;
    title: string;
    description: string;
    objective: string;
  }> {
    return [
      {
        step: 1,
        cardId: CardId.REED_CANARY_GRASS,
        title: 'Meet the Producers',
        description: 'Grass is the foundation of most ecosystems. It converts sunlight into energy that feeds the entire food web.',
        objective: 'Learn how producers create energy from sunlight'
      },
      {
        step: 2,
        cardId: CardId.EUROPEAN_RABBIT,
        title: 'Primary Consumers',
        description: 'Rabbits are herbivores that eat plants like grass. They convert plant energy into animal energy.',
        objective: 'Practice feeding your rabbit with grass'
      },
      {
        step: 3,
        cardId: 53, // RED_FOX
        title: 'Secondary Consumers',
        description: 'Foxes are predators that hunt smaller animals. They help control herbivore populations.',
        objective: 'Learn hunting mechanics with your fox'
      },
      {
        step: 4,
        cardId: CardId.OAK_TREE,
        title: 'Ecosystem Engineers',
        description: 'Oak trees create habitats for many species. They provide shelter, food, and nesting sites.',
        objective: 'Build your first ecosystem with the oak tree'
      },
      {
        step: 5,
        cardId: 34, // MONARCH_BUTTERFLY
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
    cards: number[];
    strategy: string;
  } {
    return {
      name: 'Balanced Ecosystem',
      description: 'A well-balanced deck showcasing the basic food web relationships',
      cards: this.getStarterCardIds(),
      strategy: 'Start with grass and oak tree as your foundation, then add rabbit for herbivore energy, fox for population control, and butterfly for pollination bonuses.'
    };
  }
}

export const starterPackService = new StarterPackService();
export default starterPackService;
