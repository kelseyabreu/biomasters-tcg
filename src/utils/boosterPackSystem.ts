// Booster Pack System based on IUCN Red List Conservation Status
// Uses real-world conservation percentages to determine card rarity

import { Card, ConservationStatus, CONSERVATION_RARITY_DATA } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface BoosterPack {
  id: string;
  name: string;
  cards: Card[];
  openedAt: Date;
  rarityBreakdown: Record<ConservationStatus, number>;
}

export interface PackOpeningResult {
  pack: BoosterPack;
  totalValue: number;
  rareCards: Card[];
  newSpecies: Card[];
}

/**
 * IUCN-based rarity system for booster packs
 * Based on October 28, 2024 IUCN Red List data
 */
export class BoosterPackSystem {
  private allCards: Card[] = [];
  private cardsByRarity: Map<ConservationStatus, Card[]> = new Map();

  constructor(cards: Card[]) {
    this.allCards = cards;
    this.organizeCardsByRarity();
  }

  /**
   * Organize cards by their conservation status (rarity)
   */
  private organizeCardsByRarity(): void {
    this.cardsByRarity.clear();
    
    // Initialize all rarity categories
    Object.values(ConservationStatus).forEach(status => {
      this.cardsByRarity.set(status, []);
    });

    // Sort cards into rarity buckets
    this.allCards.forEach(card => {
      const rarityCards = this.cardsByRarity.get(card.conservationStatus) || [];
      rarityCards.push(card);
      this.cardsByRarity.set(card.conservationStatus, rarityCards);
    });
  }

  /**
   * Generate a booster pack using IUCN conservation percentages
   * Standard pack: 8 cards with realistic rarity distribution
   */
  generateBoosterPack(packName: string = 'Species Conservation Pack'): BoosterPack {
    const packCards: Card[] = [];
    const rarityBreakdown: Record<ConservationStatus, number> = {} as Record<ConservationStatus, number>;

    // Initialize rarity breakdown
    Object.values(ConservationStatus).forEach(status => {
      rarityBreakdown[status] = 0;
    });

    // Generate 8 cards based on IUCN percentages
    for (let i = 0; i < 8; i++) {
      const selectedRarity = this.selectRarityByIUCNPercentage();
      const card = this.selectRandomCardFromRarity(selectedRarity);
      
      if (card) {
        packCards.push(card);
        rarityBreakdown[selectedRarity]++;
      }
    }

    return {
      id: uuidv4(),
      name: packName,
      cards: packCards,
      openedAt: new Date(),
      rarityBreakdown
    };
  }

  /**
   * Select rarity based on real IUCN Red List percentages
   */
  private selectRarityByIUCNPercentage(): ConservationStatus {
    const random = Math.random() * 100; // 0-100%
    let cumulative = 0;

    // Sort by rarity (rarest first) for dramatic pack openings
    const sortedRarities = Object.entries(CONSERVATION_RARITY_DATA)
      .sort((a, b) => a[1].percentage - b[1].percentage);

    for (const [status, data] of sortedRarities) {
      cumulative += data.percentage;
      if (random <= cumulative) {
        return status as ConservationStatus;
      }
    }

    // Fallback to most common
    return ConservationStatus.LEAST_CONCERN;
  }

  /**
   * Select a random card from a specific rarity tier
   */
  private selectRandomCardFromRarity(rarity: ConservationStatus): Card | null {
    const cards = this.cardsByRarity.get(rarity) || [];
    
    if (cards.length === 0) {
      // Fallback to Least Concern if no cards in this rarity
      const fallbackCards = this.cardsByRarity.get(ConservationStatus.LEAST_CONCERN) || [];
      if (fallbackCards.length === 0) return null;
      return fallbackCards[Math.floor(Math.random() * fallbackCards.length)];
    }

    return cards[Math.floor(Math.random() * cards.length)];
  }

  /**
   * Calculate the "value" of a pack based on rarity
   */
  calculatePackValue(pack: BoosterPack): number {
    let totalValue = 0;

    pack.cards.forEach(card => {
      const rarity = CONSERVATION_RARITY_DATA[card.conservationStatus];
      // More endangered = higher value (inverse of percentage)
      const cardValue = Math.round(100 / rarity.percentage);
      totalValue += cardValue;
    });

    return totalValue;
  }

  /**
   * Identify rare cards in a pack (Vulnerable or rarer)
   */
  getRareCards(pack: BoosterPack): Card[] {
    return pack.cards.filter(card => {
      const rarity = CONSERVATION_RARITY_DATA[card.conservationStatus];
      return rarity.percentage <= 12.2; // Vulnerable or rarer
    });
  }

  /**
   * Generate pack opening statistics
   */
  generatePackStats(pack: BoosterPack): PackOpeningResult {
    return {
      pack,
      totalValue: this.calculatePackValue(pack),
      rareCards: this.getRareCards(pack),
      newSpecies: pack.cards // In a full game, this would check against collection
    };
  }

  /**
   * Get rarity distribution for educational display
   */
  getRarityDistribution(): Record<ConservationStatus, { count: number; percentage: number }> {
    const distribution: Record<ConservationStatus, { count: number; percentage: number }> = {} as any;
    const totalCards = this.allCards.length;

    Object.values(ConservationStatus).forEach(status => {
      const cards = this.cardsByRarity.get(status) || [];
      distribution[status] = {
        count: cards.length,
        percentage: totalCards > 0 ? (cards.length / totalCards) * 100 : 0
      };
    });

    return distribution;
  }

  /**
   * Simulate opening multiple packs for statistics
   */
  simulatePackOpenings(numPacks: number): {
    packs: BoosterPack[];
    averageValue: number;
    rarityStats: Record<ConservationStatus, number>;
    totalRareCards: number;
  } {
    const packs: BoosterPack[] = [];
    const rarityStats: Record<ConservationStatus, number> = {} as Record<ConservationStatus, number>;
    let totalValue = 0;
    let totalRareCards = 0;

    // Initialize stats
    Object.values(ConservationStatus).forEach(status => {
      rarityStats[status] = 0;
    });

    // Generate packs
    for (let i = 0; i < numPacks; i++) {
      const pack = this.generateBoosterPack(`Simulation Pack ${i + 1}`);
      packs.push(pack);
      
      totalValue += this.calculatePackValue(pack);
      totalRareCards += this.getRareCards(pack).length;

      // Count rarities
      Object.entries(pack.rarityBreakdown).forEach(([status, count]) => {
        rarityStats[status as ConservationStatus] += count;
      });
    }

    return {
      packs,
      averageValue: totalValue / numPacks,
      rarityStats,
      totalRareCards
    };
  }
}

/**
 * Educational function to display IUCN conservation statistics
 */
export function displayConservationEducation(): void {
  console.log('🌍 IUCN Red List Conservation Status (October 28, 2024)');
  console.log('═══════════════════════════════════════════════════════');
  
  Object.entries(CONSERVATION_RARITY_DATA).forEach(([status, data]) => {
    const emoji = getConservationEmoji(status as ConservationStatus);
    console.log(`${emoji} ${status.toUpperCase()}`);
    console.log(`   📊 ${data.percentage}% of all species`);
    console.log(`   🎴 ${data.packRarity}/1000 cards in packs`);
    console.log(`   📝 ${data.description}`);
    console.log('');
  });
  
  console.log('💡 Educational Note:');
  console.log('This rarity system teaches real conservation status distribution.');
  console.log('Rare cards represent species that need our protection!');
}

function getConservationEmoji(status: ConservationStatus): string {
  switch (status) {
    case ConservationStatus.EXTINCT: return '💀';
    case ConservationStatus.EXTINCT_IN_WILD: return '🏛️';
    case ConservationStatus.CRITICALLY_ENDANGERED: return '🚨';
    case ConservationStatus.ENDANGERED: return '⚠️';
    case ConservationStatus.VULNERABLE: return '🟡';
    case ConservationStatus.NEAR_THREATENED: return '🟠';
    case ConservationStatus.LEAST_CONCERN: return '🟢';
    case ConservationStatus.DATA_DEFICIENT: return '❓';
    default: return '🔍';
  }
}
