/**
 * Redemption Service
 * Handles user redemptions for starter decks, promo codes, event rewards, etc.
 * Prevents duplicate redemptions and tracks redemption history
 */

import { db } from '../database/kysely';
import { RedemptionType, RedemptionStatus, AcquisitionMethod } from '@kelseyabreu/shared';
import type { 
  UserRedemption, 
  RedemptionResult, 
  UserRedemptionStatus, 
  PromoCode, 
  PromoCodeReward 
} from '@kelseyabreu/shared';

export class RedemptionService {
  /**
   * Check if user has redeemed a specific type
   */
  async hasUserRedeemed(
    userId: string, 
    redemptionType: RedemptionType, 
    code?: string
  ): Promise<boolean> {
    let query = db
      .selectFrom('user_redemptions')
      .select(['id'])
      .where('user_id', '=', userId)
      .where('redemption_type', '=', redemptionType)
      .where('status', '=', RedemptionStatus.ACTIVE);
    
    if (code) {
      query = query.where('redemption_code', '=', code);
    } else {
      query = query.where('redemption_code', 'is', null);
    }
    
    const result = await query.executeTakeFirst();
    return !!result;
  }

  /**
   * Redeem starter deck (one-time only)
   */
  async redeemStarterDeck(userId: string): Promise<RedemptionResult> {
    try {
      // Check if already redeemed
      const alreadyRedeemed = await this.hasUserRedeemed(userId, RedemptionType.STARTER_DECK);
      if (alreadyRedeemed) {
        return {
          success: false,
          message: 'Starter deck already redeemed',
          code: 'ALREADY_REDEEMED'
        };
      }

      // Start transaction to ensure atomicity
      return await db.transaction().execute(async (trx) => {
        // Give starter deck cards using the existing starter deck service
        const starterCards = await this.giveStarterDeckCards(trx, userId);
        
        // Record redemption
        const redemption = await trx
          .insertInto('user_redemptions')
          .values({
            user_id: userId,
            redemption_type: RedemptionType.STARTER_DECK,
            redemption_code: null, // No code needed for starter deck
            redemption_data: {
              cards_given: starterCards.length,
              deck_types: ['forest', 'ocean'],
              total_quantity: starterCards.reduce((sum, card) => sum + card.quantity, 0)
            },
            status: RedemptionStatus.ACTIVE
          })
          .returning(['id'])
          .executeTakeFirst();

        return {
          success: true,
          message: 'Starter deck redeemed successfully',
          rewards: starterCards,
          redemption_id: redemption?.id
        };
      });
    } catch (error) {
      console.error('Error redeeming starter deck:', error);
      return {
        success: false,
        message: 'Failed to redeem starter deck',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Redeem starter pack (one-time only)
   */
  async redeemStarterPack(userId: string): Promise<RedemptionResult> {
    try {
      // Check if already redeemed
      const alreadyRedeemed = await this.hasUserRedeemed(userId, RedemptionType.STARTER_PACK);
      if (alreadyRedeemed) {
        return {
          success: false,
          message: 'Starter pack already redeemed',
          code: 'ALREADY_REDEEMED'
        };
      }

      // Start transaction
      return await db.transaction().execute(async (trx) => {
        // Give starter pack cards (example: 3 booster packs worth of cards)
        const starterPackCards = await this.giveStarterPackCards(trx, userId);
        
        // Record redemption
        const redemption = await trx
          .insertInto('user_redemptions')
          .values({
            user_id: userId,
            redemption_type: RedemptionType.STARTER_PACK,
            redemption_code: null,
            redemption_data: {
              cards_given: starterPackCards.length,
              pack_type: 'starter_booster',
              total_quantity: starterPackCards.length // Each card has quantity 1
            },
            status: RedemptionStatus.ACTIVE
          })
          .returning(['id'])
          .executeTakeFirst();

        return {
          success: true,
          message: 'Starter pack redeemed successfully',
          rewards: starterPackCards,
          redemption_id: redemption?.id
        };
      });
    } catch (error) {
      console.error('Error redeeming starter pack:', error);
      return {
        success: false,
        message: 'Failed to redeem starter pack',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Redeem promo code
   */
  async redeemPromoCode(userId: string, code: string): Promise<RedemptionResult> {
    try {
      // Normalize code to uppercase
      const normalizedCode = code.toUpperCase().trim();
      
      // Check if code exists and is valid
      const promoCode = await this.getValidPromoCode(normalizedCode);
      if (!promoCode) {
        return {
          success: false,
          message: 'Invalid or expired promo code',
          code: 'INVALID_CODE'
        };
      }

      // Check if user already redeemed this code
      const alreadyRedeemed = await this.hasUserRedeemed(userId, RedemptionType.PROMO_CODE, normalizedCode);
      if (alreadyRedeemed) {
        return {
          success: false,
          message: 'Promo code already redeemed',
          code: 'ALREADY_REDEEMED'
        };
      }

      // Check global redemption limit
      if (promoCode.max_redemptions) {
        const totalRedemptions = await this.getPromoCodeRedemptionCount(normalizedCode);
        if (totalRedemptions >= promoCode.max_redemptions) {
          return {
            success: false,
            message: 'Promo code redemption limit reached',
            code: 'LIMIT_REACHED'
          };
        }
      }

      // Start transaction
      return await db.transaction().execute(async (trx) => {
        // Give rewards based on promo code definition
        const rewards = await this.givePromoCodeRewards(trx, userId, promoCode.rewards);
        
        // Record redemption
        const redemption = await trx
          .insertInto('user_redemptions')
          .values({
            user_id: userId,
            redemption_type: RedemptionType.PROMO_CODE,
            redemption_code: normalizedCode,
            redemption_data: {
              promo_code_id: promoCode.id,
              rewards_given: rewards,
              code_description: promoCode.description
            },
            status: RedemptionStatus.ACTIVE
          })
          .returning(['id'])
          .executeTakeFirst();

        return {
          success: true,
          message: `Promo code "${normalizedCode}" redeemed successfully`,
          rewards: rewards,
          redemption_id: redemption?.id
        };
      });
    } catch (error) {
      console.error('Error redeeming promo code:', error);
      return {
        success: false,
        message: 'Failed to redeem promo code',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user's redemption status for frontend
   */
  async getUserRedemptionStatus(userId: string): Promise<UserRedemptionStatus> {
    try {
      // Get all user redemptions
      const redemptions = await db
        .selectFrom('user_redemptions')
        .selectAll()
        .where('user_id', '=', userId)
        .where('status', '=', RedemptionStatus.ACTIVE)
        .orderBy('redeemed_at', 'desc')
        .execute();

      // Get available promo codes user hasn't redeemed
      const availablePromoCodes = await this.getAvailablePromoCodesForUser(userId);

      return {
        starter_deck_redeemed: redemptions.some(r => r.redemption_type === RedemptionType.STARTER_DECK),
        starter_pack_redeemed: redemptions.some(r => r.redemption_type === RedemptionType.STARTER_PACK),
        tutorial_rewards_redeemed: redemptions.some(r => r.redemption_type === RedemptionType.TUTORIAL_REWARDS),
        total_redemptions: redemptions.length,
        recent_redemptions: redemptions.slice(0, 5) as UserRedemption[],
        available_promo_codes: availablePromoCodes
      };
    } catch (error) {
      console.error('Error getting user redemption status:', error);
      return {
        starter_deck_redeemed: false,
        starter_pack_redeemed: false,
        tutorial_rewards_redeemed: false,
        total_redemptions: 0,
        recent_redemptions: [],
        available_promo_codes: []
      };
    }
  }

  /**
   * Get valid promo code by code
   */
  private async getValidPromoCode(code: string): Promise<PromoCode | null> {
    const result = await db
      .selectFrom('promo_codes')
      .selectAll()
      .where('code', '=', code)
      .where('active', '=', true)
      .where((eb) => eb.or([
        eb('expires_at', 'is', null),
        eb('expires_at', '>', new Date())
      ]))
      .executeTakeFirst();

    return result as PromoCode | null;
  }

  /**
   * Get total redemption count for a promo code
   */
  private async getPromoCodeRedemptionCount(code: string): Promise<number> {
    const result = await db
      .selectFrom('user_redemptions')
      .select(db.fn.count('id').as('count'))
      .where('redemption_code', '=', code)
      .where('status', '=', RedemptionStatus.ACTIVE)
      .executeTakeFirst();

    return Number(result?.count || 0);
  }

  /**
   * Get available promo codes for user (codes they haven't redeemed)
   */
  private async getAvailablePromoCodesForUser(userId: string): Promise<string[]> {
    // Get all active promo codes
    const allCodes = await db
      .selectFrom('promo_codes')
      .select(['code'])
      .where('active', '=', true)
      .where((eb) => eb.or([
        eb('expires_at', 'is', null),
        eb('expires_at', '>', new Date())
      ]))
      .execute();

    // Get codes user has already redeemed
    const redeemedCodes = await db
      .selectFrom('user_redemptions')
      .select(['redemption_code'])
      .where('user_id', '=', userId)
      .where('redemption_type', '=', RedemptionType.PROMO_CODE)
      .where('status', '=', RedemptionStatus.ACTIVE)
      .where('redemption_code', 'is not', null)
      .execute();

    const redeemedCodeSet = new Set(redeemedCodes.map(r => r.redemption_code));
    return allCodes
      .map(c => c.code)
      .filter(code => !redeemedCodeSet.has(code));
  }

  /**
   * Get user's redemption history with pagination
   */
  async getUserRedemptionHistory(userId: string, limit: number, offset: number): Promise<UserRedemption[]> {
    const result = await db
      .selectFrom('user_redemptions')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('redeemed_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute();

    return result as UserRedemption[];
  }

  /**
   * Get total redemption count for user
   */
  async getUserRedemptionCount(userId: string): Promise<number> {
    const result = await db
      .selectFrom('user_redemptions')
      .select(db.fn.count('id').as('count'))
      .where('user_id', '=', userId)
      .executeTakeFirst();

    return Number(result?.count || 0);
  }

  /**
   * Get available promo codes for user (public method)
   */
  async getAvailablePromoCodes(userId: string): Promise<string[]> {
    return this.getAvailablePromoCodesForUser(userId);
  }

  /**
   * Validate promo code without redeeming
   */
  async validatePromoCode(userId: string, code: string): Promise<{
    valid: boolean;
    message: string;
    code_info?: any;
  }> {
    const normalizedCode = code.toUpperCase().trim();

    // Check if code exists and is valid
    const promoCode = await this.getValidPromoCode(normalizedCode);
    if (!promoCode) {
      return {
        valid: false,
        message: 'Invalid or expired promo code'
      };
    }

    // Check if user already redeemed this code
    const alreadyRedeemed = await this.hasUserRedeemed(userId, RedemptionType.PROMO_CODE, normalizedCode);
    if (alreadyRedeemed) {
      return {
        valid: false,
        message: 'You have already redeemed this code'
      };
    }

    // Check global redemption limit
    if (promoCode.max_redemptions) {
      const totalRedemptions = await this.getPromoCodeRedemptionCount(normalizedCode);
      if (totalRedemptions >= promoCode.max_redemptions) {
        return {
          valid: false,
          message: 'This code has reached its redemption limit'
        };
      }
    }

    return {
      valid: true,
      message: 'Code is valid and ready to redeem',
      code_info: {
        description: promoCode.description,
        rewards: promoCode.rewards
      }
    };
  }

  // Helper methods for giving rewards
  private async giveStarterDeckCards(trx: any, userId: string): Promise<any[]> {
    // Import the existing starter deck service
    const { starterDeckService } = await import('./starterDeckService');

    // Use the existing service to give starter decks (creates decks + adds cards)
    const result = await starterDeckService.giveStarterDecksToUser(userId);

    if (!result.success) {
      throw new Error(`Failed to give starter decks: ${result.message}`);
    }

    console.log(`✅ [RedemptionService] Gave starter decks to user ${userId}:`, {
      deckIds: result.deckIds,
      message: result.message
    });

    return result.deckIds || [];
  }

  private async giveStarterPackCards(trx: any, userId: string): Promise<number[]> {
    // Import the existing starter deck service for card operations
    const { starterDeckService } = await import('./starterDeckService');

    // Define starter pack cards (same as frontend starterPackService)
    const starterPackCardIds = [3, 4, 5, 6, 7]; // Reed Canary Grass, European Rabbit, Sockeye Salmon, Oak Tree, Monarch Butterfly

    // Add each starter pack card to user's collection
    const addedCards: number[] = [];
    for (const cardId of starterPackCardIds) {
      try {
        await starterDeckService.addCardsToUser(userId, cardId, 1, 'starter');
        addedCards.push(cardId);
        console.log(`✅ [RedemptionService] Added starter pack card ${cardId} to user ${userId}`);
      } catch (error) {
        console.error(`❌ [RedemptionService] Failed to add starter pack card ${cardId}:`, error);
        throw error;
      }
    }

    console.log(`✅ [RedemptionService] Gave starter pack to user ${userId}:`, {
      cardIds: addedCards,
      totalCards: addedCards.length
    });

    return addedCards;
  }

  private async givePromoCodeRewards(trx: any, userId: string, rewards: PromoCodeReward[]): Promise<any[]> {
    // Import the existing starter deck service for card operations
    const { starterDeckService } = await import('./starterDeckService');

    const givenRewards: any[] = [];

    for (const reward of rewards) {
      try {
        switch (reward.type) {
          case 'cards':
            if (reward.item_id) {
              await starterDeckService.addCardsToUser(userId, reward.item_id, reward.quantity, 'redeem');
              givenRewards.push({
                type: 'cards',
                item_id: reward.item_id,
                quantity: reward.quantity
              });
              console.log(`✅ [RedemptionService] Added ${reward.quantity}x card ${reward.item_id} to user ${userId}`);
            }
            break;

          case 'packs':
            // For now, just record that packs were given
            // TODO: Implement actual pack distribution when pack system is ready
            givenRewards.push({
              type: 'packs',
              quantity: reward.quantity
            });
            console.log(`✅ [RedemptionService] Gave ${reward.quantity} booster packs to user ${userId} (recorded)`);
            break;

          case 'currency':
            // TODO: Implement currency distribution when currency system is ready
            givenRewards.push({
              type: 'currency',
              quantity: reward.quantity
            });
            console.log(`✅ [RedemptionService] Gave ${reward.quantity} currency to user ${userId} (recorded)`);
            break;

          default:
            console.warn(`⚠️ [RedemptionService] Unknown reward type: ${reward.type}`);
        }
      } catch (error) {
        console.error(`❌ [RedemptionService] Failed to give reward:`, reward, error);
        throw error;
      }
    }

    return givenRewards;
  }
}

// Export singleton instance
export const redemptionService = new RedemptionService();
