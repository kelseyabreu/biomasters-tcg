import { Router } from 'express';
import { requireAuth, requireRegisteredUser } from '../middleware/auth';
import { packOpeningRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../database/kysely';
// Removed unused imports - using GameDataManager instead
import {
  getAllCardsWithRelations,
  getCardWithRelations,
  getCardsByTrophicLevel,
  getCardsByKeyword,
  getAllAbilitiesWithEffects,
  getCardsByTaxonomyLevel,
  getTaxonomicDiversityStats
} from '../database/queries/cardQueries';
import {
  CardId
} from '@biomasters/shared';


const router = Router();

/**
 * GET /api/cards/database
 * Get all cards from the BioMasters database using optimized ARRAY_AGG queries
 */
router.get('/database', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    search,
    trophic_level,
    trophic_category,
    keyword,
    // Taxonomy filters
    taxo_domain,
    taxo_kingdom,
    taxo_phylum,
    taxo_class,
    taxo_order,
    taxo_family,
    taxo_genus,
    taxo_species
  } = req.query;

  // Validate query parameters
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const trophicLevelNum = trophic_level ? Number(trophic_level) : null;
  const trophicCategoryNum = trophic_category ? Number(trophic_category) : null;
  const keywordNum = keyword ? Number(keyword) : null;

  // Parse taxonomy parameters
  const taxoDomainNum = taxo_domain ? Number(taxo_domain) : null;
  const taxoKingdomNum = taxo_kingdom ? Number(taxo_kingdom) : null;
  const taxoPhylumNum = taxo_phylum ? Number(taxo_phylum) : null;
  const taxoClassNum = taxo_class ? Number(taxo_class) : null;
  const taxoOrderNum = taxo_order ? Number(taxo_order) : null;
  const taxoFamilyNum = taxo_family ? Number(taxo_family) : null;
  const taxoGenusNum = taxo_genus ? Number(taxo_genus) : null;
  const taxoSpeciesNum = taxo_species ? Number(taxo_species) : null;

  // Validate pagination parameters
  if (isNaN(pageNum) || pageNum < 1) {
    res.status(400).json({
      error: 'INVALID_PAGE',
      message: 'Page must be a positive integer'
    });
    return;
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
    res.status(400).json({
      error: 'INVALID_LIMIT',
      message: 'Limit must be between 1 and 1000'
    });
    return;
  }

  // Validate trophic level
  if (trophic_level && (isNaN(trophicLevelNum!) || !Number.isInteger(trophicLevelNum!) || trophicLevelNum! < 0 || trophicLevelNum! > 10)) {
    res.status(400).json({
      error: 'INVALID_TROPHIC_LEVEL',
      message: 'Trophic level must be an integer between 0 and 10'
    });
    return;
  }

  // Validate trophic category
  if (trophic_category && (isNaN(trophicCategoryNum!) || trophicCategoryNum! < 1)) {
    res.status(400).json({
      error: 'INVALID_TROPHIC_CATEGORY',
      message: 'Trophic category must be a positive integer'
    });
    return;
  }

  // Validate keyword
  if (keyword && (isNaN(keywordNum!) || keywordNum! < 1 || keywordNum! > 87)) {
    res.status(400).json({
      error: 'INVALID_KEYWORD',
      message: 'Keyword ID must be between 1 and 87'
    });
    return;
  }

  // Validate taxonomy parameters
  const taxonomyParams = [
    { param: taxo_domain, value: taxoDomainNum, name: 'taxo_domain', min: 1, max: 3 },
    { param: taxo_kingdom, value: taxoKingdomNum, name: 'taxo_kingdom', min: 1, max: 10 },
    { param: taxo_phylum, value: taxoPhylumNum, name: 'taxo_phylum', min: 1, max: 20 },
    { param: taxo_class, value: taxoClassNum, name: 'taxo_class', min: 1, max: 20 },
    { param: taxo_order, value: taxoOrderNum, name: 'taxo_order', min: 1, max: 20 },
    { param: taxo_family, value: taxoFamilyNum, name: 'taxo_family', min: 1, max: 20 },
    { param: taxo_genus, value: taxoGenusNum, name: 'taxo_genus', min: 1, max: 20 },
    { param: taxo_species, value: taxoSpeciesNum, name: 'taxo_species', min: 1, max: 20 }
  ];

  for (const { param, value, name, min, max } of taxonomyParams) {
    if (param && (isNaN(value!) || value! < min || value! > max)) {
      res.status(400).json({
        error: 'INVALID_TAXONOMY_PARAMETER',
        message: `${name} must be an integer between ${min} and ${max}`
      });
      return;
    }
  }

  try {
    let cards;

    // Use optimized queries based on filters
    if (trophicLevelNum !== null) {
      cards = await getCardsByTrophicLevel(trophicLevelNum);
    } else if (keywordNum !== null) {
      cards = await getCardsByKeyword(keywordNum);
    } else if (taxoDomainNum !== null) {
      cards = await getCardsByTaxonomyLevel('domain', taxoDomainNum);
    } else if (taxoKingdomNum !== null) {
      cards = await getCardsByTaxonomyLevel('kingdom', taxoKingdomNum);
    } else if (taxoPhylumNum !== null) {
      cards = await getCardsByTaxonomyLevel('phylum', taxoPhylumNum);
    } else if (taxoClassNum !== null) {
      cards = await getCardsByTaxonomyLevel('class', taxoClassNum);
    } else if (taxoOrderNum !== null) {
      cards = await getCardsByTaxonomyLevel('order', taxoOrderNum);
    } else if (taxoFamilyNum !== null) {
      cards = await getCardsByTaxonomyLevel('family', taxoFamilyNum);
    } else if (taxoGenusNum !== null) {
      cards = await getCardsByTaxonomyLevel('genus', taxoGenusNum);
    } else if (taxoSpeciesNum !== null) {
      cards = await getCardsByTaxonomyLevel('species', taxoSpeciesNum);
    } else {
      cards = await getAllCardsWithRelations();
    }

    // Apply search filter if provided
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      cards = cards.filter(card =>
        card.common_name?.toLowerCase().includes(searchLower) ||
        card.scientific_name?.toLowerCase().includes(searchLower) ||
        card.card_name.toLowerCase().includes(searchLower)
      );
    }

    // Apply trophic category filter
    if (trophicCategoryNum !== null) {
      cards = cards.filter(card => card.trophic_category_id === trophicCategoryNum);
    }

    // Apply additional taxonomy filters (for cases where multiple levels are specified)
    if (taxoDomainNum !== null && !cards.some(c => c.taxo_domain === taxoDomainNum)) {
      cards = cards.filter(card => card.taxo_domain === taxoDomainNum);
    }
    if (taxoKingdomNum !== null && !cards.some(c => c.taxo_kingdom === taxoKingdomNum)) {
      cards = cards.filter(card => card.taxo_kingdom === taxoKingdomNum);
    }
    if (taxoPhylumNum !== null && !cards.some(c => c.taxo_phylum === taxoPhylumNum)) {
      cards = cards.filter(card => card.taxo_phylum === taxoPhylumNum);
    }
    if (taxoClassNum !== null && !cards.some(c => c.taxo_class === taxoClassNum)) {
      cards = cards.filter(card => card.taxo_class === taxoClassNum);
    }
    if (taxoOrderNum !== null && !cards.some(c => c.taxo_order === taxoOrderNum)) {
      cards = cards.filter(card => card.taxo_order === taxoOrderNum);
    }
    if (taxoFamilyNum !== null && !cards.some(c => c.taxo_family === taxoFamilyNum)) {
      cards = cards.filter(card => card.taxo_family === taxoFamilyNum);
    }
    if (taxoGenusNum !== null && !cards.some(c => c.taxo_genus === taxoGenusNum)) {
      cards = cards.filter(card => card.taxo_genus === taxoGenusNum);
    }
    if (taxoSpeciesNum !== null && !cards.some(c => c.taxo_species === taxoSpeciesNum)) {
      cards = cards.filter(card => card.taxo_species === taxoSpeciesNum);
    }

    // Apply pagination
    const offset = (pageNum - 1) * limitNum;
    const paginatedCards = cards.slice(offset, offset + limitNum);

    // Get conservation status names for display
    const conservationStatuses = await db
      .selectFrom('conservation_statuses')
      .select(['id', 'status_name', 'percentage', 'pack_rarity', 'color', 'emoji'])
      .execute();

    const conservationMap = conservationStatuses.reduce((acc, status) => {
      acc[status.id] = status;
      return acc;
    }, {} as Record<number, any>);

    // Enhance cards with conservation status info and proper number types
    const enhancedCards = paginatedCards.map(card => ({
      ...card,
      cost: typeof card.cost === 'string' ? JSON.parse(card.cost) : card.cost,
      conservation_status: card.conservation_status_id ? {
        ...conservationMap[card.conservation_status_id],
        percentage: Number(conservationMap[card.conservation_status_id]?.percentage || 0),
        pack_rarity: Number(conservationMap[card.conservation_status_id]?.pack_rarity || 0)
      } : null
    }));

    res.json({
      success: true,
      cards: enhancedCards,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: cards.length,
        pages: Math.ceil(cards.length / limitNum)
      },
      filters_applied: {
        search: search || null,
        trophic_level: trophicLevelNum,
        trophic_category: trophicCategoryNum,
        keyword: keywordNum
      }
    });
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to fetch cards from database'
    });
  }
}));

/**
 * GET /api/cards/card/:id
 * Get detailed information about a specific card using optimized query
 */
router.get('/card/:id', asyncHandler(async (req, res) => {
  const cardIdParam = req.params['id'];
  const cardId = Number(cardIdParam) as CardId;

  // Validate card ID more thoroughly
  if (isNaN(cardId) || !Number.isInteger(cardId) || cardId <= 0) {
    res.status(400).json({
      error: 'INVALID_CARD_ID',
      message: 'Card ID must be a positive integer'
    });
    return;
  }

  // Check for extremely large numbers that could cause issues
  if (cardId > Number.MAX_SAFE_INTEGER) {
    res.status(400).json({
      error: 'INVALID_CARD_ID',
      message: 'Card ID is too large'
    });
    return;
  }

  try {
    // Use optimized single card query
    const card = await getCardWithRelations(cardId);

    if (!card) {
      res.status(404).json({
        error: 'CARD_NOT_FOUND',
        message: 'Card not found'
      });
      return;
    }

    // Get additional details
    const [trophicCategory, conservationStatus, localizations] = await Promise.all([
      // Get trophic category name
      db.selectFrom('trophic_categories')
        .select(['name', 'category_type'])
        .where('id', '=', card.trophic_category_id)
        .executeTakeFirst(),

      // Get conservation status
      card.conservation_status_id ?
        db.selectFrom('conservation_statuses')
          .selectAll()
          .where('id', '=', card.conservation_status_id)
          .executeTakeFirst() :
        null,

      // Get localized text
      db.selectFrom('localizations')
        .select(['field_name', 'localized_text'])
        .where('object_type', '=', 'card')
        .where('object_id', '=', cardId)
        .where('language_code', '=', 'en')
        .execute()
    ]);

    const localizationMap = localizations.reduce((acc, loc) => {
      acc[loc.field_name] = loc.localized_text;
      return acc;
    }, {} as Record<string, string>);

    res.json({
      success: true,
      card: {
        ...card,
        cost: typeof card.cost === 'string' ? JSON.parse(card.cost) : card.cost,
        trophic_category: trophicCategory,
        conservation_status: conservationStatus,
        localizations: localizationMap
      }
    });
  } catch (error) {
    console.error('Error fetching card:', error);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to fetch card details'
    });
  }
}));

/**
 * GET /api/cards/collection
 * Get user's card collection (updated for new system)
 */
router.get('/collection', requireAuth, asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'Please complete registration first'
    });
  }

  const { page = 1, limit = 50, search } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  // Get user's collection with card data (using CardId system)
  let collectionQuery = db
    .selectFrom('user_cards')
    .innerJoin('cards', 'user_cards.card_id', 'cards.id')
    .select([
      'user_cards.card_id',
      'cards.card_name',
      'user_cards.quantity',
      'user_cards.acquisition_method',
      'user_cards.first_acquired_at'
    ])
    .where('user_cards.user_id', '=', req.user.id)
    .orderBy('user_cards.first_acquired_at', 'desc');

  // Add search filter if provided (search by card name)
  if (search && typeof search === 'string') {
    collectionQuery = collectionQuery.where('cards.card_name', 'ilike', `%${search}%`);
  }

  // Apply pagination
  const collection = await collectionQuery
    .limit(Number(limit))
    .offset(offset)
    .execute();

  // Get total count for pagination
  let totalQuery = db
    .selectFrom('user_cards')
    .innerJoin('cards', 'user_cards.card_id', 'cards.id')
    .select(db.fn.count('user_cards.card_id').as('total'))
    .where('user_cards.user_id', '=', req.user.id);

  if (search && typeof search === 'string') {
    totalQuery = totalQuery.where('cards.card_name', 'ilike', `%${search}%`);
  }

  const totalResult = await totalQuery.execute();
  const total = totalResult[0]?.total || 0;

  res.json({
    success: true,
    collection,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: Number(total),
      pages: Math.ceil(Number(total) / Number(limit))
    }
  });
  return;
}));

/**
 * POST /api/cards/open-pack
 * Open a booster pack
 */
router.post('/open-pack', requireAuth, packOpeningRateLimiter, asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'Please complete registration first'
    });
  }

  const { pack_type = 'basic' } = req.body;

  // Pack costs
  const packCosts = { basic: 50, premium: 100, legendary: 200 };
  const cost = packCosts[pack_type as keyof typeof packCosts];

  if (!cost) {
    return res.status(400).json({
      error: 'INVALID_PACK_TYPE',
      message: 'Invalid pack type'
    });
  }

  // Check if user has enough credits
  if (req.user.eco_credits < cost) {
    return res.status(400).json({
      error: 'INSUFFICIENT_CREDITS',
      message: `Not enough eco credits. Need ${cost}, have ${req.user.eco_credits}`
    });
  }

  // Get available cards with conservation-based rarity
  const availableCards = await getAllCardsWithRelations();
  const cardsPerPack = pack_type === 'basic' ? 3 : pack_type === 'premium' ? 5 : 7;
  const newCards: any[] = [];

  // Get conservation statuses for rarity calculation
  const conservationStatuses = await db
    .selectFrom('conservation_statuses')
    .select(['id', 'pack_rarity'])
    .execute();

  // Map IUCN conservation status to numeric weights (higher = more common)
  // Based on IUCN Red List percentages from IUCN_RARITY_SYSTEM.md (per 100,000 packs for maximum precision)
  const rarityWeights: Record<string, number> = {
    'LC': 50646,  // Least Concern - 50.51% = 50,646 per 100,000 (most common, adjusted)
    'VU': 13190,  // Vulnerable - 13.19% = 13,190 per 100,000
    'DD': 12970,  // Data Deficient - 12.97% = 12,970 per 100,000
    'EN': 10920,  // Endangered - 10.92% = 10,920 per 100,000
    'CR': 5950,   // Critically Endangered - 5.95% = 5,950 per 100,000
    'NT': 5730,   // Near Threatened - 5.73% = 5,730 per 100,000
    'EX': 540,    // Extinct - 0.54% = 540 per 100,000 (ultra rare)
    'EW': 54      // Extinct in Wild - 0.054% = 54 per 100,000 (ultra rare)
  };

  const rarityMap = conservationStatuses.reduce((acc, status) => {
    acc[status.id] = rarityWeights[status.pack_rarity] || 100;
    return acc;
  }, {} as Record<number, number>);

  // Create weighted card pool based on IUCN conservation rarity
  const weightedCards: { card: any; weight: number }[] = [];
  for (const card of availableCards) {
    const rarity = card.conservation_status_id ? rarityMap[card.conservation_status_id] || 100 : 100;
    // Higher rarity number = more common (per 1000 packs)
    weightedCards.push({ card, weight: rarity });
  }

  // Select cards based on weighted probability
  for (let i = 0; i < cardsPerPack; i++) {
    const totalWeight = weightedCards.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (const item of weightedCards) {
      random -= item.weight;
      if (random <= 0) {
        newCards.push({
          id: item.card.cardId,
          card_name: item.card.card_name,
          common_name: item.card.common_name,
          conservation_status_id: item.card.conservation_status_id
        });
        break;
      }
    }
  }

  // Update user collection in transaction
  await db.transaction().execute(async (trx) => {
    // Deduct cost
    await trx
      .updateTable('users')
      .set({
        eco_credits: req.user!.eco_credits - cost,
        updated_at: new Date()
      })
      .where('id', '=', req.user!.id)
      .execute();

    // Add cards to collection
    for (const card of newCards) {
      const existing = await trx
        .selectFrom('user_cards')
        .selectAll()
        .where('user_id', '=', req.user!.id)
        .where('card_id', '=', card.cardId)
        .executeTakeFirst();

      if (existing) {
        // Increase quantity
        await trx
          .updateTable('user_cards')
          .set({
            quantity: existing.quantity + 1,
            last_acquired_at: new Date()
          })
          .where('user_id', '=', req.user!.id)
          .where('card_id', '=', card.cardId)
          .execute();
      } else {
        // Add new card
        await trx
          .insertInto('user_cards')
          .values({
            user_id: req.user!.id,
            card_id: card.cardId,
            quantity: 1,
            acquisition_method: 'pack'
          })
          .execute();
      }
    }

    // Record transaction
    await trx
      .insertInto('transactions')
      .values({
        user_id: req.user!.id,
        type: 'pack_purchase',
        description: `Opened ${pack_type} pack`,
        eco_credits_change: -cost
      })
      .execute();
  });

  res.json({
    success: true,
    message: 'Pack opened successfully',
    pack_type,
    cards_granted: newCards,
    cost,
    remaining_credits: req.user.eco_credits - cost,
    rarity_info: newCards.map(card => {
      const rarity = card.conservation_status_id ? rarityMap[card.conservation_status_id] : 100;
      return {
        card_name: card.card_name,
        rarity_per_1000_packs: rarity,
        is_rare: (rarity || 100) < 50
      };
    })
  });
  return;
}));

/**
 * POST /api/cards/redeem-physical
 * Redeem a physical card
 */
router.post('/redeem-physical', requireRegisteredUser, asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'Please complete registration first'
    });
  }

  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      error: 'MISSING_CODE',
      message: 'Redemption code is required'
    });
  }

  // Check if redemption code exists and is valid
  const redemption = await db
    .selectFrom('redemption_codes')
    .selectAll()
    .where('code', '=', code)
    .executeTakeFirst();

  if (!redemption) {
    return res.status(404).json({
      error: 'INVALID_CODE',
      message: 'Invalid redemption code'
    });
  }

  if (redemption.is_redeemed) {
    return res.status(409).json({
      error: 'ALREADY_REDEEMED',
      message: 'This code has already been redeemed'
    });
  }

  // Get card name for logging
  const card = await db
    .selectFrom('cards')
    .select('card_name')
    .where('id', '=', redemption.card_id)
    .executeTakeFirst();

  // Redeem the card
  await db.transaction().execute(async (trx) => {
    // Mark as redeemed
    await trx
      .updateTable('redemption_codes')
      .set({
        is_redeemed: true,
        redeemed_by_user_id: req.user!.id,
        redeemed_at: new Date()
      })
      .where('id', '=', redemption.id)
      .execute();

    // Add card to user collection
    const existing = await trx
      .selectFrom('user_cards')
      .selectAll()
      .where('user_id', '=', req.user!.id)
      .where('card_id', '=', redemption.card_id)
      .executeTakeFirst();

    if (existing) {
      // Increase quantity
      await trx
        .updateTable('user_cards')
        .set({
          quantity: existing.quantity + 1,
          last_acquired_at: new Date()
        })
        .where('user_id', '=', req.user!.id)
        .where('card_id', '=', redemption.card_id)
        .execute();
    } else {
      // Add new card
      await trx
        .insertInto('user_cards')
        .values({
          user_id: req.user!.id,
          card_id: redemption.card_id,
          quantity: 1,
          acquisition_method: 'redeem'
        })
        .execute();
    }

    // Record transaction
    await trx
      .insertInto('transactions')
      .values({
        user_id: req.user!.id,
        type: 'reward',
        description: `Redeemed physical card: ${card?.card_name || 'Unknown Card'}`,
        eco_credits_change: 0
      })
      .execute();
  });

  res.json({
    success: true,
    message: 'Physical card redeemed successfully',
    card_name: card?.card_name || 'Unknown Card',
    code: redemption.code
  });
  return;
}));

/**
 * GET /api/cards/daily-pack
 * Get daily free pack (simplified version)
 */
router.get('/daily-pack', requireAuth, asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(404).json({
      error: 'User not found',
      message: 'Please complete registration first'
    });
  }

  // TODO: Implement daily pack logic with proper tracking
  // For now, just return availability info
  res.json({
    success: true,
    available: true,
    message: 'Daily pack system not yet implemented',
    nextAvailable: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });
  return;
}));

/**
 * GET /api/cards/keywords
 * Get all keywords
 */
router.get('/keywords', asyncHandler(async (_req, res) => {
  const keywords = await db
    .selectFrom('keywords')
    .selectAll()
    .orderBy('keyword_type')
    .orderBy('keyword_name')
    .execute();

  // Group by type
  const keywordsByType = keywords.reduce((acc, keyword) => {
    if (!acc[keyword.keyword_type]) {
      acc[keyword.keyword_type] = [];
    }
    acc[keyword.keyword_type]?.push(keyword);
    return acc;
  }, {} as Record<string, any[]>);

  res.json({
    success: true,
    keywords: keywordsByType,
    all_keywords: keywords
  });
}));

/**
 * GET /api/cards/abilities
 * Get all abilities using optimized query
 */
router.get('/abilities', asyncHandler(async (_req, res) => {
  try {
    const abilities = await getAllAbilitiesWithEffects();

    // Get trigger information
    const triggers = await db
      .selectFrom('triggers')
      .selectAll()
      .execute();

    const triggerMap = triggers.reduce((acc, trigger) => {
      acc[trigger.id] = trigger;
      return acc;
    }, {} as Record<number, any>);

    // Enhance abilities with trigger info
    const enhancedAbilities = abilities.map(ability => ({
      ...ability,
      trigger: triggerMap[ability.trigger_id]
    }));

    res.json({
      success: true,
      abilities: enhancedAbilities,
      triggers
    });
  } catch (error) {
    console.error('Error fetching abilities:', error);
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Failed to fetch abilities'
    });
  }
}));

/**
 * GET /api/cards/trophic-categories
 * Get all trophic categories
 */
router.get('/trophic-categories', asyncHandler(async (_req, res) => {
  const categories = await db
    .selectFrom('trophic_categories')
    .selectAll()
    .orderBy('id')
    .execute();

  res.json({
    success: true,
    trophic_categories: categories
  });
}));

/**
 * GET /api/cards/conservation-statuses
 * Get all IUCN conservation statuses with rarity data
 */
router.get('/conservation-statuses', asyncHandler(async (_req, res) => {
  const statuses = await db
    .selectFrom('conservation_statuses')
    .selectAll()
    .orderBy('pack_rarity', 'asc') // Rarest first
    .execute();

  // Convert DECIMAL fields to numbers for proper JSON serialization
  const processedStatuses = statuses.map(status => ({
    ...status,
    percentage: Number(status.percentage), // Convert DECIMAL to number
    pack_rarity: Number(status.pack_rarity) // Ensure integer is number
  }));

  res.json({
    success: true,
    conservation_statuses: processedStatuses,
    total_percentage: processedStatuses.reduce((sum, status) => sum + status.percentage, 0)
  });
}));

/**
 * GET /api/cards/game-data
 * Get all game data optimized for the game engine
 */
router.get('/game-data', asyncHandler(async (_req, res) => {
  try {
    // Get all data using optimized queries
    const [cards, abilities, keywords, trophicCategories, conservationStatuses] = await Promise.all([
      getAllCardsWithRelations(),
      getAllAbilitiesWithEffects(),
      db.selectFrom('keywords').selectAll().orderBy('id').execute(),
      db.selectFrom('trophic_categories').selectAll().orderBy('id').execute(),
      db.selectFrom('conservation_statuses').selectAll().orderBy('id').execute()
    ]);

    // Get triggers, effects, selectors, actions for complete game data
    const [triggers, effects, selectors, actions] = await Promise.all([
      db.selectFrom('triggers').selectAll().execute(),
      db.selectFrom('effects').selectAll().execute(),
      db.selectFrom('selectors').selectAll().execute(),
      db.selectFrom('actions').selectAll().execute()
    ]);

    // Process cards for game engine with proper number types
    const processedCards = cards.map(card => ({
      ...card,
      cost: typeof card.cost === 'string' ? JSON.parse(card.cost) : card.cost
      // Note: DECIMAL fields are already converted by processCardDecimalFields in queries
    }));

    // Process conservation statuses with proper number types
    const processedConservationStatuses = conservationStatuses.map(status => ({
      ...status,
      percentage: Number(status.percentage),
      pack_rarity: Number(status.pack_rarity)
    }));

    res.json({
      success: true,
      game_data: {
        cards: processedCards,
        abilities,
        keywords,
        trophic_categories: trophicCategories,
        conservation_statuses: processedConservationStatuses,
        triggers,
        effects,
        selectors,
        actions
      },
      metadata: {
        total_cards: cards.length,
        total_abilities: abilities.length,
        total_keywords: keywords.length,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error loading game data:', error);
    res.status(500).json({
      error: 'GAME_DATA_ERROR',
      message: 'Failed to load game data'
    });
  }
}));

/**
 * POST /api/cards/validate-placement
 * Validate card placement according to game rules
 */
router.post('/validate-placement', requireAuth, asyncHandler(async (req, res) => {
  const { cardId, position, adjacentCards } = req.body;

  if (!cardId || !position) {
    res.status(400).json({
      error: 'MISSING_PARAMETERS',
      message: 'Card ID and position are required'
    });
    return;
  }

  // Get card data
  const card = await db
    .selectFrom('cards')
    .leftJoin('card_keywords', 'cards.id', 'card_keywords.card_id')
    .leftJoin('keywords', 'card_keywords.keyword_id', 'keywords.id')
    .selectAll('cards')
    .select(['keywords.keyword_name'])
    .where('cards.id', '=', Number(cardId))
    .execute();

  if (card.length === 0) {
    res.status(404).json({
      error: 'CARD_NOT_FOUND',
      message: 'Card not found'
    });
    return;
  }

  const cardData = card[0];
  const cardKeywords = card.map(row => row.keyword_name).filter(Boolean);

  // Basic validation logic (simplified)
  const validation = {
    isValid: true,
    errors: [] as string[],
    warnings: [] as string[]
  };

  // Check domain compatibility
  const isAquatic = cardKeywords.includes('AQUATIC');
  const isAmphibious = cardKeywords.includes('AMPHIBIOUS');
  const isTerrestrial = !isAquatic && !isAmphibious;

  // Validate against adjacent cards (if provided)
  if (adjacentCards && adjacentCards.length > 0) {
    for (const adjCard of adjacentCards) {
      const adjKeywords = adjCard.keywords || [];
      const adjIsAquatic = adjKeywords.includes('AQUATIC');
      const adjIsAmphibious = adjKeywords.includes('AMPHIBIOUS');
      const adjIsTerrestrial = !adjIsAquatic && !adjIsAmphibious;

      // Domain compatibility check
      if (isAquatic && !adjIsAquatic && !adjIsAmphibious) {
        validation.isValid = false;
        validation.errors.push('Aquatic cards can only connect to aquatic or amphibious cards');
      }

      if (isTerrestrial && !adjIsTerrestrial && !adjIsAmphibious) {
        validation.isValid = false;
        validation.errors.push('Terrestrial cards can only connect to terrestrial or amphibious cards');
      }
    }
  }

  // Trophic level validation
  if (cardData && cardData.trophic_level && cardData.trophic_level > 1) {
    const hasValidTrophicConnection = adjacentCards?.some((adjCard: any) =>
      adjCard.trophic_level === cardData.trophic_level! - 1
    );

    if (adjacentCards && adjacentCards.length > 0 && !hasValidTrophicConnection) {
      validation.isValid = false;
      validation.errors.push(`Must connect to trophic level ${cardData.trophic_level - 1}`);
    }
  }

  res.json({
    success: true,
    validation,
    card_data: cardData ? {
      id: cardData.id,
      name: cardData.card_name,
      trophic_level: cardData.trophic_level,
      keywords: cardKeywords
    } : null
  });
}));

/**
 * GET /api/cards/diversity
 * Get taxonomic diversity statistics
 */
router.get('/diversity', asyncHandler(async (_req, res) => {
  try {
    const stats = await getTaxonomicDiversityStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting diversity stats:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to get taxonomic diversity statistics'
    });
  }
}));

export default router;
