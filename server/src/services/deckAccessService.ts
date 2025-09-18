import { db } from '../database/kysely';
import { DeckType } from '../../../shared/enums';

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

      // Get all template decks (using existing user for now)
      const templateDecks = await db
        .selectFrom('decks')
        .select([
          'id',
          'name',
          'deck_type',
          'cards'
        ])
        .where('user_id', '=', '721eab5a-9239-4f66-b974-df7df6564b62') // Template user
        .where('is_claimable', '=', true)
        .orderBy('deck_type', 'asc')
        .execute();

      // Get user's card counts for access checking
      const userCardCounts = await this.getUserCardCounts(userId);

      // Filter template decks based on access
      const accessibleTemplateDecks = templateDecks.filter(deck => {
        try {
          // Handle both JSON string and object cases
          const cards = typeof deck.cards === 'string' ? JSON.parse(deck.cards) : deck.cards;
          const access = this.canAccessTemplateDeck(deck.deck_type, cards, userCardCounts);
          return access.canAccess;
        } catch (error) {
          console.error('Error parsing deck cards:', error, 'Raw cards:', deck.cards);
          return false;
        }
      });

      return {
        personal_decks: personalDecks.map(deck => ({
          id: deck.id,
          name: deck.name,
          card_count: Number(deck.card_count),
          source: 'personal' as const
        })),
        template_decks: accessibleTemplateDecks.map(deck => {
          try {
            const cards = typeof deck.cards === 'string' ? JSON.parse(deck.cards) : deck.cards;
            return {
              id: deck.id,
              name: deck.name,
              card_count: cards.reduce((sum: number, card: any) => sum + card.quantity, 0),
              source: 'template' as const,
              deck_type: deck.deck_type
            };
          } catch (error) {
            console.error('Error parsing deck cards for response:', error);
            return {
              id: deck.id,
              name: deck.name,
              card_count: 0,
              source: 'template' as const,
              deck_type: deck.deck_type
            };
          }
        })
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
      // Get all template decks
      const templateDecks = await db
        .selectFrom('decks')
        .select([
          'id',
          'name',
          'deck_type',
          'cards'
        ])
        .where('user_id', '=', '00000000-0000-0000-0000-000000000000') // System user
        .where('is_claimable', '=', true)
        .orderBy('deck_type', 'asc')
        .execute();

      // Get user's card counts
      const userCardCounts = await this.getUserCardCounts(userId);

      const availableTemplates: TemplateDeck[] = [];
      const lockedTemplates: TemplateDeck[] = [];

      templateDecks.forEach(deck => {
        try {
          const cards = typeof deck.cards === 'string' ? JSON.parse(deck.cards) : deck.cards;
          const access = this.canAccessTemplateDeck(deck.deck_type, cards, userCardCounts);

          const templateDeck: TemplateDeck = {
            id: deck.id,
            name: deck.name,
            description: '', // No description field in decks table
            deck_type: deck.deck_type,
            cards: cards,
            total_cards: cards.reduce((sum: number, card: any) => sum + card.quantity, 0),
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
      });

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
