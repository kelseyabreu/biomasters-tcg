import { db } from '../database/kysely';
import { DeckType } from '@kelseyabreu/shared';

export interface TemplateDeck {
  id: string;
  name: string;
  description: string;
  deck_type: DeckType;
  cards: Array<{ cardId: number; quantity: number }>;
  total_cards: number;
  can_access: boolean;
  missing_cards?: Array<{ cardId: number; needed: number; owned: number }>;
}

export interface DeckBuilderTemplatesResponse {
  available_templates: TemplateDeck[];
  locked_templates: TemplateDeck[];
}

export interface UserCardCounts {
  [cardId: number]: number;
}

class DeckAccessService {

  /**
   * Get user's card counts for access checking
   */
  async getUserCardCounts(userId: string): Promise<UserCardCounts> {
    try {
      const userCards = await db
        .selectFrom('user_cards')
        .select(['card_id', 'quantity'])
        .where('user_id', '=', userId)
        .execute();

      const cardCounts: UserCardCounts = {};
      userCards.forEach(card => {
        cardCounts[card.card_id] = card.quantity;
      });

      return cardCounts;
    } catch (error) {
      console.error('Error getting user card counts:', error);
      return {};
    }
  }

  /**
   * Check if user can access a template deck based on card ownership
   */
  canAccessTemplateDeck(
    deckType: DeckType,
    templateCards: Array<{ cardId: number; quantity: number }>,
    userCardCounts: UserCardCounts
  ): { canAccess: boolean; missingCards: Array<{ cardId: number; needed: number; owned: number }> } {
    // Default starter decks are ALWAYS available (even with 0 cards)
    if (deckType === DeckType.STARTER_FOREST || deckType === DeckType.STARTER_OCEAN) {
      return {
        canAccess: true,
        missingCards: []
      };
    }

    // Other template decks require card ownership
    const missingCards: Array<{ cardId: number; needed: number; owned: number }> = [];

    for (const requiredCard of templateCards) {
      const owned = userCardCounts[requiredCard.cardId] || 0;
      if (owned < requiredCard.quantity) {
        missingCards.push({
          cardId: requiredCard.cardId,
          needed: requiredCard.quantity,
          owned: owned
        });
      }
    }

    return {
      canAccess: missingCards.length === 0,
      missingCards: missingCards
    };
  }

  /**
   * Get decks available for battle/session (personal + accessible templates)
   */
  async getSessionDecks(userId: string): Promise<{
    personal_decks: Array<{ id: string; name: string; card_count: number; source: 'personal' }>;
    template_decks: Array<{ id: string; name: string; card_count: number; source: 'template'; deck_type: DeckType }>;
  }> {
    try {
      // Get user's personal decks
      const personalDecks = await db
        .selectFrom('decks')
        .leftJoin('deck_cards', 'decks.id', 'deck_cards.deck_id')
        .select([
          'decks.id',
          'decks.name',
          db.fn.count('deck_cards.id').as('card_count')
        ])
        .where('decks.user_id', '=', userId)
        .groupBy(['decks.id', 'decks.name'])
        .having(db.fn.count('deck_cards.id'), '>=', 20) // Minimum deck size
        .execute();

      // Get all template decks (system user decks that are claimable)
      const templateDecks = await db
        .selectFrom('decks')
        .leftJoin('deck_cards', 'decks.id', 'deck_cards.deck_id')
        .select([
          'decks.id',
          'decks.name',
          'decks.deck_type',
          db.fn.count('deck_cards.id').as('card_count')
        ])
        .where('decks.user_id', '=', '00000000-0000-0000-0000-000000000000') // System user
        .where('decks.is_claimable', '=', true)
        .groupBy(['decks.id', 'decks.name', 'decks.deck_type'])
        .having(db.fn.count('deck_cards.id'), '>=', 20) // Minimum deck size
        .orderBy('decks.deck_type', 'asc')
        .execute();

      // Get user's card counts for access checking
      const userCardCounts = await this.getUserCardCounts(userId);

      // Filter template decks based on access (get actual card requirements from deck_cards)
      const accessibleTemplateDecks: Array<{id: string; name: string; deck_type: number; card_count: string | number | bigint}> = [];
      for (const deck of templateDecks) {
        // Get the actual cards in this template deck
        const deckCards = await db
          .selectFrom('deck_cards')
          .select(['card_id', db.fn.count('id').as('quantity')])
          .where('deck_id', '=', deck.id)
          .groupBy('card_id')
          .execute();

        const templateCards = deckCards.map(dc => ({
          cardId: dc.card_id,
          quantity: Number(dc.quantity)
        }));

        const access = this.canAccessTemplateDeck(deck.deck_type, templateCards, userCardCounts);
        if (access.canAccess) {
          accessibleTemplateDecks.push(deck);
        }
      }

      return {
        personal_decks: personalDecks.map(deck => ({
          id: deck.id,
          name: deck.name,
          card_count: Number(deck.card_count),
          source: 'personal' as const
        })),
        template_decks: accessibleTemplateDecks.map(deck => ({
          id: deck.id,
          name: deck.name,
          card_count: Number(deck.card_count),
          source: 'template' as const,
          deck_type: deck.deck_type
        }))
      };

    } catch (error) {
      console.error('Error getting session decks:', error);
      throw error;
    }
  }

  /**
   * Get template decks for deck builder (shows available + locked with missing cards)
   */
  async getDeckBuilderTemplates(userId: string): Promise<DeckBuilderTemplatesResponse> {
    try {
      // Get all template decks (system user decks)
      const templateDecks = await db
        .selectFrom('decks')
        .select([
          'id',
          'name',
          'deck_type'
        ])
        .where('user_id', '=', '00000000-0000-0000-0000-000000000000') // System user
        .where('is_claimable', '=', true)
        .orderBy('deck_type', 'asc')
        .execute();

      // Get user's card counts
      const userCardCounts = await this.getUserCardCounts(userId);

      const availableTemplates: TemplateDeck[] = [];
      const lockedTemplates: TemplateDeck[] = [];

      for (const deck of templateDecks) {
        try {
          // Get the actual cards in this template deck from deck_cards table
          const deckCards = await db
            .selectFrom('deck_cards')
            .select(['card_id', db.fn.count('id').as('quantity')])
            .where('deck_id', '=', deck.id)
            .groupBy('card_id')
            .execute();

          const cards = deckCards.map(dc => ({
            cardId: dc.card_id,
            quantity: Number(dc.quantity)
          }));

          const access = this.canAccessTemplateDeck(deck.deck_type, cards, userCardCounts);
          const totalCards = cards.reduce((sum, card) => sum + card.quantity, 0);

          const templateDeck: TemplateDeck = {
            id: deck.id,
            name: deck.name,
            description: '', // No description field in decks table
            deck_type: deck.deck_type,
            cards: cards,
            total_cards: totalCards,
            can_access: access.canAccess,
            missing_cards: access.missingCards
          };

          if (access.canAccess) {
            availableTemplates.push(templateDeck);
          } else {
            lockedTemplates.push(templateDeck);
          }
        } catch (error) {
          console.error('Error processing template deck:', error, 'Deck:', deck);
        }
      }

      return {
        available_templates: availableTemplates,
        locked_templates: lockedTemplates
      };

    } catch (error) {
      console.error('Error getting deck builder templates:', error);
      throw error;
    }
  }


}

export default new DeckAccessService();
