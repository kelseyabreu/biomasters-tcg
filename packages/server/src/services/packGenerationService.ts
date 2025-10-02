/**
 * Server-side Pack Generation Service
 * 
 * Generates booster packs deterministically using seeded RNG.
 * Uses the same algorithm as frontend to ensure identical pack contents
 * when given the same seed (action ID).
 * 
 * This enables optimistic offline pack opening with server-side validation.
 */

import { SeededRandom, ConservationStatus, IUCN_CONSERVATION_DATA } from '@kelseyabreu/shared';
import { CardWithRelations } from '../database/queries/cardQueries';

export interface PackGenerationResult {
  cardIds: number[];
  rarityBreakdown: Record<ConservationStatus, number>;
}

export class PackGenerationService {
  private allCards: CardWithRelations[] = [];
  private cardsByRarity: Map<ConservationStatus, CardWithRelations[]> = new Map();
  private rng: SeededRandom | null = null;

  constructor(cards: CardWithRelations[]) {
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

    // Log all card conservation status IDs for debugging
    console.log(`🔍 [PackGenerationService] Card conservation status IDs:`,
      this.allCards.map(card => ({
        id: card.id,
        name: card.common_name,
        conservation_status_id: card.conservation_status_id
      }))
    );

    // Sort cards into rarity buckets
    this.allCards.forEach(card => {
      if (card.conservation_status_id !== null) {
        const rarityCards = this.cardsByRarity.get(card.conservation_status_id) || [];
        rarityCards.push(card);
        this.cardsByRarity.set(card.conservation_status_id, rarityCards);
      } else {
        console.warn(`⚠️ [PackGenerationService] Card ${card.id} (${card.common_name}) has null conservation_status_id`);
      }
    });

    console.log(`🎁 [PackGenerationService] Organized ${this.allCards.length} cards by rarity:`,
      Array.from(this.cardsByRarity.entries()).map(([status, cards]) =>
        `${ConservationStatus[status]}: ${cards.length} cards`
      )
    );
  }

  /**
   * Generate a booster pack using deterministic seeded RNG
   * @param packType Type of pack ('basic', 'premium', 'stage10award', etc.)
   * @param seed Deterministic seed (use action.id)
   * @param cardCount Number of cards to generate (default: 3 for basic)
   * @returns Array of card IDs
   */
  generatePack(packType: string, seed: string, cardCount: number = 3): PackGenerationResult {
    console.log('');
    console.log('🎲 [PackGenerationService] ═══════════════════════════════════════');
    console.log('🎲 [PackGenerationService] DETERMINISTIC PACK GENERATION STARTING');
    console.log('🎲 [PackGenerationService] ═══════════════════════════════════════');
    console.log(`🎲 [PackGenerationService] Pack Type: ${packType}`);
    console.log(`🎲 [PackGenerationService] Card Count: ${cardCount}`);
    console.log(`🎲 [PackGenerationService] Seed (action ID): ${seed}`);
    console.log(`🎲 [PackGenerationService] Seed Preview: ${seed.substring(0, 30)}...`);

    // Initialize seeded RNG for deterministic pack generation
    this.rng = new SeededRandom(seed);
    console.log(`🎲 [PackGenerationService] ✅ SeededRandom initialized with seed`);

    const cardIds: number[] = [];
    const rarityBreakdown: Record<ConservationStatus, number> = {} as Record<ConservationStatus, number>;

    // Initialize rarity breakdown
    Object.values(ConservationStatus).forEach(status => {
      if (typeof status === 'number') {
        rarityBreakdown[status] = 0;
      }
    });

    // Generate specified number of cards based on pack type
    console.log(`🎲 [PackGenerationService] Starting card selection...`);

    if (packType === 'stage10award') {
      // Stage 10 Award Pack - Guaranteed high-value cards
      console.log(`🏆 [PackGenerationService] Using Stage 10 Award Pack distribution`);
      this.generateStage10AwardCards(cardIds, rarityBreakdown, cardCount);
    } else {
      // Regular pack generation using IUCN percentages
      console.log(`🎲 [PackGenerationService] Using IUCN percentage-based distribution`);
      for (let i = 0; i < cardCount; i++) {
        const selectedRarity = this.selectRarityByIUCNPercentage();
        const card = this.selectRandomCardFromRarity(selectedRarity);

        console.log(`   🎴 [PackGenerationService] Card ${i + 1}/${cardCount}: Rarity=${ConservationStatus[selectedRarity]}, CardID=${card?.card_id || 'null'}, UUID=${card?.id || 'null'}`);

        if (card) {
          cardIds.push(card.card_id);
          rarityBreakdown[selectedRarity]++;
        } else {
          console.warn(`   ⚠️ [PackGenerationService] Failed to find card for rarity ${ConservationStatus[selectedRarity]}`);
        }
      }
    }

    console.log('🎲 [PackGenerationService] ═══════════════════════════════════════');
    console.log(`✅ [PackGenerationService] PACK GENERATION COMPLETE`);
    console.log(`✅ [PackGenerationService] Generated ${cardIds.length} cards: [${cardIds.join(', ')}]`);
    console.log(`✅ [PackGenerationService] Rarity breakdown:`, Object.entries(rarityBreakdown).map(([status, count]) => `${ConservationStatus[Number(status)]}=${count}`).join(', '));
    console.log('🎲 [PackGenerationService] ═══════════════════════════════════════');
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
    console.log('🏆 [PackGenerationService] Generating Stage 10 Award Pack with premium cards');

    // Guaranteed distribution for Stage 10 Award Pack:
    // 2 Critically Endangered (rarest)
    // 2 Endangered
    // 2 Vulnerable
    // 2 Near Threatened
    // 2 Least Concern (for balance)

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
          console.log(`🏆 [PackGenerationService] Stage 10 Card: ${ConservationStatus[rarity]} - Card ID ${card.card_id}`);
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
   */
  private selectRandomCardFromRarity(rarity: ConservationStatus): CardWithRelations | null {
    if (!this.rng) {
      throw new Error('SeededRandom not initialized. Call generatePack with a seed first.');
    }

    const cards = this.cardsByRarity.get(rarity) || [];

    if (cards.length === 0) {
      console.warn(`⚠️ [PackGenerationService] No cards found for rarity ${ConservationStatus[rarity]}, trying fallback...`);

      // Try fallback rarities in order of preference
      const fallbackRarities = [
        ConservationStatus.LEAST_CONCERN,
        ConservationStatus.NEAR_THREATENED,
        ConservationStatus.VULNERABLE,
        ConservationStatus.ENDANGERED,
        ConservationStatus.CRITICALLY_ENDANGERED,
        ConservationStatus.DATA_DEFICIENT,
        ConservationStatus.EXTINCT_IN_WILD,
        ConservationStatus.EXTINCT
      ];

      for (const fallbackRarity of fallbackRarities) {
        const fallbackCards = this.cardsByRarity.get(fallbackRarity) || [];
        if (fallbackCards.length > 0) {
          console.log(`✅ [PackGenerationService] Using fallback rarity ${ConservationStatus[fallbackRarity]} (${fallbackCards.length} cards available)`);
          return fallbackCards[Math.floor(this.rng.next() * fallbackCards.length)];
        }
      }

      // If no cards found in any rarity, pick from all cards
      if (this.allCards.length > 0) {
        console.warn(`⚠️ [PackGenerationService] No cards in any rarity bucket, selecting from all ${this.allCards.length} cards`);
        return this.allCards[Math.floor(this.rng.next() * this.allCards.length)];
      }

      console.error(`❌ [PackGenerationService] No cards available at all!`);
      return null;
    }

    return cards[Math.floor(this.rng.next() * cards.length)];
  }
}

