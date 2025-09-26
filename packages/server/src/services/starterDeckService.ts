/**
 * Starter Deck Service
 * Simplified service for managing starter decks using existing database schema
 * Works with current user_decks and user_cards tables
 */

import { db } from '../database/kysely';
import { DeckType, UserType, AcquisitionMethod } from '@kelseyabreu/shared';

export interface StarterDeckCard {
  cardId: number;
  quantity: number;
}

export interface StarterDeck {
  id: string;
  name: string;
  description: string;
  deck_type: DeckType;
  cards: StarterDeckCard[];
  total_cards: number;
}

export interface StarterDeckResult {
  success: boolean;
  message: string;
  deckIds: string[];
  errors?: string[];
}

class StarterDeckService {
  /**
   * Map card IDs to species names (kebab-case)
   */
  private getSpeciesNameFromCardId(cardId: number): string {
    const cardIdToSpeciesMap: Record<number, string> = {
      1: 'oak-tree',
      2: 'kelp',
      3: 'grass',
      4: 'rabbit',
      5: 'sea-otter',
      6: 'red-fox',
      7: 'great-white-shark',
      8: 'mycena-mushroom',
      9: 'turkey-vulture',
      10: 'deer-tick'
    };

    const speciesName = cardIdToSpeciesMap[cardId];
    if (!speciesName) {
      throw new Error(`No species name found for card ID: ${cardId}. Available cards: ${Object.keys(cardIdToSpeciesMap).join(', ')}`);
    }
    return speciesName;
  }

  /**
   * Create hardcoded starter deck data
   * Updated to match the official migration data (024_starter_decks_data.sql)
   */
  createStarterDecksData(): StarterDeck[] {
    return [
      {
        id: 'forest-starter',
        name: 'Forest Ecosystem Starter',
        description: 'A balanced forest ecosystem with producers, consumers, and decomposers',
        deck_type: DeckType.STARTER_FOREST,
        cards: [
          // Producers (8 cards) - Foundation of the ecosystem
          { cardId: 1, quantity: 3 },   // Oak Tree x3 (CardId 1)
          { cardId: 2, quantity: 2 },   // Kelp x2 (CardId 2) - Using available card
          { cardId: 3, quantity: 3 },   // Grass x3 (CardId 3) - Using available card

          // Primary Consumers (6 cards) - Herbivores
          { cardId: 4, quantity: 3 },   // European Rabbit x3 (CardId 4)
          { cardId: 5, quantity: 3 },   // Sea Otter x3 (CardId 5) - Using available card

          // Secondary Consumers (4 cards) - Carnivores
          { cardId: 6, quantity: 2 },   // Red Fox x2 (CardId 6)
          { cardId: 7, quantity: 2 },   // Great White Shark x2 (CardId 7) - Using available card

          // Decomposers (3 cards) - Nutrient cycling
          { cardId: 8, quantity: 1 },   // Mycena Mushroom x1 (CardId 8) - Using available card
          { cardId: 9, quantity: 2 }    // Turkey Vulture x2 (CardId 9)
        ],
        total_cards: 21
      },
      {
        id: 'ocean-starter',
        name: 'Ocean Ecosystem Starter',
        description: 'A balanced marine ecosystem with kelp forests and marine life',
        deck_type: DeckType.STARTER_OCEAN,
        cards: [
          // Producers (8 cards) - Marine foundation
          { cardId: 2, quantity: 3 },   // Kelp x3 (CardId 2)
          { cardId: 3, quantity: 3 },   // Grass x3 (CardId 3) - Using available card
          { cardId: 1, quantity: 2 },   // Oak Tree x2 (CardId 1) - Using available card

          // Primary Consumers (6 cards) - Marine herbivores
          { cardId: 4, quantity: 3 },   // European Rabbit x3 (CardId 4) - Using available card
          { cardId: 5, quantity: 3 },   // Sea Otter x3 (CardId 5)

          // Secondary Consumers (4 cards) - Marine predators
          { cardId: 6, quantity: 2 },   // Red Fox x2 (CardId 6) - Using available card
          { cardId: 7, quantity: 2 },   // Great White Shark x2 (CardId 7)

          // Decomposers (3 cards) - Marine decomposition
          { cardId: 8, quantity: 1 },   // Mycena Mushroom x1 (CardId 8) - Using available card
          { cardId: 10, quantity: 2 }   // Deer Tick x2 (CardId 10) - Using available card
        ],
        total_cards: 21
      }
    ];
  }

  /**
   * Check if user has starter decks
   */
  async userHasStarterDecks(userId: string): Promise<boolean> {
    try {
      const starterDecks = await db
        .selectFrom('decks')
        .select(['id'])
        .where('user_id', '=', userId)
        .where('name', 'in', ['Forest Ecosystem Starter', 'Ocean Ecosystem Starter'])
        .execute();

      return starterDecks.length >= 2;
    } catch (error) {
      console.error('Error checking if user has starter decks:', error);
      return false;
    }
  }

  /**
   * Get card name by card ID
   */
  async getCardName(cardId: number): Promise<string | null> {
    try {
      const card = await db
        .selectFrom('cards')
        .select(['card_name'])
        .where('id', '=', cardId)
        .executeTakeFirst();

      return card?.card_name || null;
    } catch (error) {
      console.error(`Error getting card name for ID ${cardId}:`, error);
      return null;
    }
  }

  /**
   * Give starter decks to a user
   */
  async giveStarterDecksToUser(userId: string): Promise<StarterDeckResult> {
    try {
      console.log(`🎯 [StarterDeckService] Starting to give starter decks to user: ${userId}`);

      // Check if user already has starter decks
      const hasStarterDecks = await this.userHasStarterDecks(userId);
      if (hasStarterDecks) {
        console.log(`✅ [StarterDeckService] User ${userId} already has starter decks`);
        return {
          success: true,
          message: 'User already has starter decks',
          deckIds: []
        };
      }

      const starterDecks = this.createStarterDecksData();
      console.log(`🎴 [StarterDeckService] Created ${starterDecks.length} starter deck templates`);

      // Log the card IDs we're about to use
      starterDecks.forEach((deck, index) => {
        const cardIds = deck.cards.map(card => `${card.cardId}x${card.quantity}`).join(', ');
        console.log(`🎴 [StarterDeckService] Deck ${index + 1} (${deck.name}): ${cardIds}`);
      });

      const deckIds: string[] = [];

      for (const starterDeck of starterDecks) {
        console.log(`🏗️ [StarterDeckService] Creating deck: ${starterDeck.name}`);

        // Create the deck
        const deckResult = await db
          .insertInto('decks')
          .values({
            user_id: userId,
            name: starterDeck.name
          })
          .returning('id')
          .executeTakeFirst();

        if (!deckResult) {
          throw new Error(`Failed to create deck: ${starterDeck.name}`);
        }

        console.log(`✅ [StarterDeckService] Created deck ${starterDeck.name} with ID: ${deckResult.id}`);
        deckIds.push(deckResult.id);

        // Add cards to deck_cards table
        for (const card of starterDeck.cards) {
          console.log(`🎴 [StarterDeckService] Adding card ${card.cardId} x${card.quantity} to deck ${deckResult.id}`);

          // Add each copy of the card
          for (let i = 0; i < card.quantity; i++) {
            await db
              .insertInto('deck_cards')
              .values({
                deck_id: deckResult.id,
                card_id: card.cardId,
                species_name: this.getSpeciesNameFromCardId(card.cardId),
                position_in_deck: i + 1  // Start positions at 1, not 0
              })
              .execute();
          }

          // Add cards to user's collection
          console.log(`👤 [StarterDeckService] Ensuring user ${userId} has card ${card.cardId} x${card.quantity}`);
          await this.ensureUserHasCard(userId, card.cardId, card.quantity);
        }
      }

      console.log(`🎉 [StarterDeckService] Successfully created ${starterDecks.length} starter decks for user ${userId}`);
      return {
        success: true,
        message: 'Starter decks created successfully',
        deckIds: deckIds
      };
    } catch (error) {
      console.error('❌ [StarterDeckService] Error giving starter decks to user:', error);
      return {
        success: false,
        message: 'Failed to create starter decks',
        deckIds: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Add cards to user's collection (public method for redemption system)
   * Sets the quantity to the specified amount (doesn't add to existing)
   */
  async addCardsToUser(userId: string, cardId: number, quantity: number, acquisitionMethod: string = 'redeem'): Promise<void> {
    return this.ensureUserHasCard(userId, cardId, quantity);
  }

  /**
   * Ensure user has a specific card in their collection
   * Sets the quantity to the specified amount (doesn't add to existing)
   */
  private async ensureUserHasCard(userId: string, cardId: number, quantity: number): Promise<void> {
    try {
      console.log(`🔍 [StarterDeckService] Setting user ${userId} to have exactly ${quantity} of card ${cardId}`);

      // Use UPSERT pattern to handle race conditions and respect unique constraint
      const result = await db
        .insertInto('user_cards')
        .values({
          user_id: userId,
          card_id: cardId,
          variant: 0 as any, // Default variant (normal card) - cast to satisfy Kysely types
          quantity: quantity,
          acquisition_method: AcquisitionMethod.STARTER
        })
        .onConflict((oc) => oc
          .columns(['user_id', 'card_id', 'variant'])
          .doUpdateSet({
            quantity: quantity, // SET to exact quantity, don't add
            last_acquired_at: new Date(),
            acquisition_method: AcquisitionMethod.STARTER // Update acquisition method too
          })
        )
        .returning(['quantity'])
        .executeTakeFirst();

      if (result) {
        console.log(`✅ [StarterDeckService] User ${userId} now has exactly ${result.quantity} of card ${cardId}`);
      } else {
        console.log(`⚠️ [StarterDeckService] UPSERT completed but no result returned for card ${cardId}`);
      }
    } catch (error) {
      console.error(`❌ [StarterDeckService] Error ensuring user has card ${cardId}:`, error);
      throw error; // Re-throw to propagate the error up
    }
  }

  /**
   * Get all starter decks
   */
  async getStarterDecks(): Promise<StarterDeck[]> {
    return this.createStarterDecksData();
  }

  /**
   * Get a specific starter deck by type
   */
  async getStarterDeckByType(deckType: DeckType): Promise<StarterDeck | null> {
    const starterDecks = this.createStarterDecksData();
    return starterDecks.find(deck => deck.deck_type === deckType) || null;
  }

  /**
   * Get user's starter deck status
   */
  async getUserStarterDeckStatus(userId: string): Promise<{
    has_starter_decks: boolean;
    forest_deck_id?: string;
    ocean_deck_id?: string;
    total_starter_cards: number;
  }> {
    try {
      const userDecks = await db
        .selectFrom('decks')
        .select(['id', 'name'])
        .where('user_id', '=', userId)
        .where('name', 'in', ['Forest Ecosystem Starter', 'Ocean Ecosystem Starter'])
        .execute();

      const forestDeck = userDecks.find(deck => deck.name === 'Forest Ecosystem Starter');
      const oceanDeck = userDecks.find(deck => deck.name === 'Ocean Ecosystem Starter');
      const hasStarterDecks = userDecks.length >= 2;

      // Count total starter cards (42 total: 21 per deck)
      const totalStarterCards = hasStarterDecks ? 42 : 0;

      const result: {
        has_starter_decks: boolean;
        forest_deck_id?: string;
        ocean_deck_id?: string;
        total_starter_cards: number;
      } = {
        has_starter_decks: hasStarterDecks,
        total_starter_cards: totalStarterCards
      };

      if (forestDeck?.id) {
        result.forest_deck_id = forestDeck.id;
      }
      if (oceanDeck?.id) {
        result.ocean_deck_id = oceanDeck.id;
      }

      return result;
    } catch (error) {
      console.error('Error getting user starter deck status:', error);
      return {
        has_starter_decks: false,
        total_starter_cards: 0
      };
    }
  }

  /**
   * Auto-onboard user if they need starter decks
   */
  async autoOnboardIfNeeded(userId: string, userType: UserType): Promise<{
    success: boolean;
    message: string;
    starter_decks_given: boolean;
    deck_ids: string[];
    cards_added: number;
  } | null> {
    try {
      const hasStarterDecks = await this.userHasStarterDecks(userId);
      
      if (hasStarterDecks) {
        return null; // No onboarding needed
      }

      console.log(`Auto-onboarding user ${userId} (type: ${userType})`);
      const result = await this.giveStarterDecksToUser(userId);
      
      return {
        success: result.success,
        message: result.message,
        starter_decks_given: result.success,
        deck_ids: result.deckIds,
        cards_added: result.success ? 42 : 0 // 21 cards per deck * 2 decks
      };
    } catch (error) {
      console.error('Error during auto-onboarding:', error);
      return {
        success: false,
        message: 'Auto-onboarding failed',
        starter_decks_given: false,
        deck_ids: [],
        cards_added: 0
      };
    }
  }
}

export const starterDeckService = new StarterDeckService();
export default starterDeckService;
