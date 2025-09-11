// Booster Pack System based on IUCN Red List Conservation Status
// Uses real-world conservation percentages to determine card rarity

import { Card, CONSERVATION_RARITY_DATA } from '../types';
import { ConservationStatus } from '@shared/enums';
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

    // Debug: Log first few cards to see conservation status
    console.log(`🎁 [BoosterPackSystem] Initializing with ${cards.length} cards`);
    console.log(`🔍 [BoosterPackSystem] First 3 cards:`, cards.slice(0, 3).map(card => ({
      cardId: card.cardId,
      nameId: card.nameId,
      conservationStatus: card.conservationStatus
    })));

    this.organizeCardsByRarity();
  }

  /**
   * Organize cards by their conservation status (rarity)
   */
  private organizeCardsByRarity(): void {
    this.cardsByRarity.clear();
    
    // Initialize all rarity categories
    Object.values(ConservationStatus).forEach(status => {
      if (typeof status === 'number') {
        this.cardsByRarity.set(status, []);
      }
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
   * @param packName Name of the pack
   * @param cardCount Number of cards to generate (default: 8)
   */
  generateBoosterPack(packName: string = 'Species Conservation Pack', cardCount: number = 8): BoosterPack {
    const packCards: Card[] = [];
    const rarityBreakdown: Record<ConservationStatus, number> = {} as Record<ConservationStatus, number>;

    console.log(`🎁 Generating ${packName} with ${cardCount} cards`);
    console.log(`📊 Available cards by rarity:`, Array.from(this.cardsByRarity.entries()).map(([status, cards]) =>
      `${ConservationStatus[status]}: ${cards.length} cards`
    ));

    // Initialize rarity breakdown
    Object.values(ConservationStatus).forEach(status => {
      if (typeof status === 'number') {
        rarityBreakdown[status] = 0;
      }
    });

    // Generate specified number of cards based on IUCN percentages
    for (let i = 0; i < cardCount; i++) {
      const selectedRarity = this.selectRarityByIUCNPercentage();
      const card = this.selectRandomCardFromRarity(selectedRarity);

      console.log(`🎴 Card ${i + 1}: Rarity ${ConservationStatus[selectedRarity]}, Card: ${card?.nameId || 'null'}`);

      if (card) {
        packCards.push(card);
        rarityBreakdown[selectedRarity]++;
      } else {
        console.warn(`⚠️ Failed to find card for rarity ${ConservationStatus[selectedRarity]}`);
      }
    }

    console.log(`✅ Generated pack with ${packCards.length} cards`);

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
        return parseInt(status) as ConservationStatus;
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
      if (typeof status === 'number') {
        const cards = this.cardsByRarity.get(status) || [];
        distribution[status] = {
          count: cards.length,
          percentage: totalCards > 0 ? (cards.length / totalCards) * 100 : 0
        };
      }
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
      if (typeof status === 'number') {
        rarityStats[status] = 0;
      }
    });

    // Generate packs
    for (let i = 0; i < numPacks; i++) {
      const pack = this.generateBoosterPack(`Simulation Pack ${i + 1}`);
      packs.push(pack);
      
      totalValue += this.calculatePackValue(pack);
      totalRareCards += this.getRareCards(pack).length;

      // Count rarities
      Object.entries(pack.rarityBreakdown).forEach(([status, count]) => {
        const statusNum = parseInt(status);
        if (!isNaN(statusNum)) {
          rarityStats[statusNum as ConservationStatus] += count;
        }
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
    const statusNum = parseInt(status);
    if (!isNaN(statusNum)) {
      const emoji = getConservationEmoji(statusNum as ConservationStatus);
      console.log(`${emoji} ${ConservationStatus[statusNum]}`);
      console.log(`   📊 ${data.percentage}% of all species`);
      console.log(`   🎴 ${data.packRarity}/1000 cards in packs`);
      console.log(`   📝 ${data.description}`);
      console.log('');
    }
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
