/**
 * Unified Pack Generation Service - Shared Module
 * 
 * Provides deterministic pack generation for both frontend and server.
 * Uses the same algorithm, rarity data, and fallback logic to ensure
 * identical pack contents when given the same seed.
 * 
 * This consolidates the previously separate frontend (boosterPackSystem.ts)
 * and server (packGenerationService.ts) implementations.
 */

import { SeededRandom } from '../utils/SeededRandom';
import { ConservationStatus, IUCN_CONSERVATION_DATA } from '../enums';

export interface PackGenerationResult {
  cardIds: number[];
  rarityBreakdown: Record<ConservationStatus, number>;
}

export interface PackGenerationCardData {
  id: number;
  card_id: number;
  common_name: string;
  conservation_status_id: ConservationStatus | null;
}

/**
 * Unified Pack Generation Service
 * Used by both frontend and server to ensure identical pack generation
 */
export class UnifiedPackGenerationService {
  private allCards: PackGenerationCardData[] = [];
  private cardsByRarity: Map<ConservationStatus, PackGenerationCardData[]> = new Map();
  private rng: SeededRandom | null = null;

  constructor(cards: PackGenerationCardData[]) {
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
      if (typeof status === 'number') {
        this.cardsByRarity.set(status, []);
      }
    });

    // Sort cards into rarity buckets
    this.allCards.forEach(card => {
      if (card.conservation_status_id !== null) {
        const rarityCards = this.cardsByRarity.get(card.conservation_status_id) || [];
        rarityCards.push(card);
        this.cardsByRarity.set(card.conservation_status_id, rarityCards);
      } else {
        console.warn(`⚠️ [UnifiedPackGeneration] Card ${card.id} (${card.common_name}) has null conservation_status_id`);
      }
    });

    console.log(`🎁 [UnifiedPackGeneration] Organized ${this.allCards.length} cards by rarity:`,
      Array.from(this.cardsByRarity.entries()).map(([status, cards]) =>
        `${ConservationStatus[status]}: ${cards.length} cards`
      )
    );
  }

  /**
   * Generate a booster pack using deterministic seeded RNG
   * @param packType Type of pack ('basic', 'premium', 'legendary', etc.)
   * @param seed Deterministic seed (use action.id)
   * @param cardCount Number of cards to generate (default: 3 for basic)
   * @returns PackGenerationResult with card IDs and rarity breakdown
   */
  generatePack(packType: string, seed: string, cardCount: number = 3): PackGenerationResult {
    console.log('');
    console.log('🎲 [UnifiedPackGeneration] ═══════════════════════════════════════');
    console.log('🎲 [UnifiedPackGeneration] DETERMINISTIC PACK GENERATION STARTING');
    console.log('🎲 [UnifiedPackGeneration] ═══════════════════════════════════════');
    console.log(`🎲 [UnifiedPackGeneration] Pack Type: ${packType}`);
    console.log(`🎲 [UnifiedPackGeneration] Card Count: ${cardCount}`);
    console.log(`🎲 [UnifiedPackGeneration] Seed (action ID): ${seed}`);
    console.log(`🎲 [UnifiedPackGeneration] Seed Preview: ${seed.substring(0, 30)}...`);

    // Initialize seeded RNG for deterministic pack generation
    this.rng = new SeededRandom(seed);
    console.log(`🎲 [UnifiedPackGeneration] ✅ SeededRandom initialized with seed`);

    const cardIds: number[] = [];
    const rarityBreakdown: Record<ConservationStatus, number> = {} as Record<ConservationStatus, number>;

    // Initialize rarity breakdown
    Object.values(ConservationStatus).forEach(status => {
      if (typeof status === 'number') {
        rarityBreakdown[status] = 0;
      }
    });

    // Generate specified number of cards based on pack type
    console.log(`🎲 [UnifiedPackGeneration] Starting card selection...`);

    if (packType === 'stage10award') {
      // Stage 10 Award Pack - Guaranteed high-value cards
      console.log(`🏆 [UnifiedPackGeneration] Using Stage 10 Award Pack distribution`);
      this.generateStage10AwardCards(cardIds, rarityBreakdown, cardCount);
    } else {
      // Regular pack generation using IUCN percentages
      console.log(`🎲 [UnifiedPackGeneration] Using IUCN percentage-based distribution`);
      for (let i = 0; i < cardCount; i++) {
        const selectedRarity = this.selectRarityByIUCNPercentage();
        const card = this.selectRandomCardFromRarity(selectedRarity);

        console.log(`   🎴 [UnifiedPackGeneration] Card ${i + 1}/${cardCount}: Rarity=${ConservationStatus[selectedRarity]}, CardID=${card?.card_id || 'null'}, Name=${card?.common_name || 'null'}`);

        if (card) {
          cardIds.push(card.card_id);
          rarityBreakdown[selectedRarity]++;
        } else {
          console.warn(`   ⚠️ [UnifiedPackGeneration] Failed to find card for rarity ${ConservationStatus[selectedRarity]}`);
        }
      }
    }

    console.log('🎲 [UnifiedPackGeneration] ═══════════════════════════════════════');
    console.log(`✅ [UnifiedPackGeneration] PACK GENERATION COMPLETE`);
    console.log(`✅ [UnifiedPackGeneration] Generated ${cardIds.length} cards: [${cardIds.join(', ')}]`);
    console.log(`✅ [UnifiedPackGeneration] Rarity breakdown:`, Object.entries(rarityBreakdown).map(([status, count]) => `${ConservationStatus[Number(status)]}=${count}`).join(', '));
    console.log('🎲 [UnifiedPackGeneration] ═══════════════════════════════════════');
    console.log('');

    return {
      cardIds,
      rarityBreakdown
    };
  }

  /**
   * Generate special Stage 10 Award Pack cards with guaranteed high-value content
   */
  private generateStage10AwardCards(cardIds: number[], rarityBreakdown: Record<ConservationStatus, number>, cardCount: number): void {
    console.log('🏆 [UnifiedPackGeneration] Generating Stage 10 Award Pack with premium cards');

    // Guaranteed distribution for Stage 10 Award Pack:
    const guaranteedDistribution = [
      { rarity: ConservationStatus.CRITICALLY_ENDANGERED, count: 2 },
      { rarity: ConservationStatus.ENDANGERED, count: 2 },
      { rarity: ConservationStatus.VULNERABLE, count: 2 },
      { rarity: ConservationStatus.NEAR_THREATENED, count: 2 },
      { rarity: ConservationStatus.LEAST_CONCERN, count: 2 }
    ];

    for (const { rarity, count } of guaranteedDistribution) {
      for (let i = 0; i < count; i++) {
        const card = this.selectRandomCardFromRarity(rarity);
        if (card) {
          cardIds.push(card.card_id);
          rarityBreakdown[rarity]++;
          console.log(`🏆 [UnifiedPackGeneration] Stage 10 Card: ${ConservationStatus[rarity]} - Card ID ${card.card_id}`);
        }
      }
    }
  }

  /**
   * Select rarity based on real IUCN Red List percentages
   * Uses seeded RNG for deterministic generation
   */
  private selectRarityByIUCNPercentage(): ConservationStatus {
    if (!this.rng) {
      throw new Error('SeededRandom not initialized. Call generatePack with a seed first.');
    }
    
    const random = this.rng.next() * 100; // 0-100%
    let cumulative = 0;

    // Sort by rarity (rarest first) for dramatic pack openings
    const sortedRarities = Object.entries(IUCN_CONSERVATION_DATA)
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
   * Uses seeded RNG for deterministic generation
   * UNIFIED: Uses comprehensive fallback logic from server implementation
   */
  private selectRandomCardFromRarity(rarity: ConservationStatus): PackGenerationCardData | null {
    if (!this.rng) {
      throw new Error('SeededRandom not initialized. Call generatePack with a seed first.');
    }

    const cards = this.cardsByRarity.get(rarity) || [];

    if (cards.length === 0) {
      console.warn(`⚠️ [UnifiedPackGeneration] No cards found for rarity ${ConservationStatus[rarity]}, trying fallback...`);

      // UNIFIED: Comprehensive fallback logic (from server implementation)
      const fallbackRarities = [
        ConservationStatus.LEAST_CONCERN,
        ConservationStatus.NEAR_THREATENED,
        ConservationStatus.VULNERABLE,
        ConservationStatus.ENDANGERED,
        ConservationStatus.CRITICALLY_ENDANGERED,
        ConservationStatus.DATA_DEFICIENT,
        ConservationStatus.EXTINCT_IN_WILD,
        ConservationStatus.EXTINCT,
        ConservationStatus.NOT_EVALUATED
      ];

      for (const fallbackRarity of fallbackRarities) {
        const fallbackCards = this.cardsByRarity.get(fallbackRarity) || [];
        if (fallbackCards.length > 0) {
          console.log(`✅ [UnifiedPackGeneration] Using fallback rarity ${ConservationStatus[fallbackRarity]} (${fallbackCards.length} cards available)`);
          return fallbackCards[Math.floor(this.rng.next() * fallbackCards.length)];
        }
      }

      // If no cards found in any rarity, pick from all cards
      if (this.allCards.length > 0) {
        console.warn(`⚠️ [UnifiedPackGeneration] No cards in any rarity bucket, selecting from all ${this.allCards.length} cards`);
        return this.allCards[Math.floor(this.rng.next() * this.allCards.length)];
      }

      console.error(`❌ [UnifiedPackGeneration] No cards available at all!`);
      return null;
    }

    return cards[Math.floor(this.rng.next() * cards.length)];
  }
}
