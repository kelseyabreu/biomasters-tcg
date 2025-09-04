/**
 * Optimized card queries using PostgreSQL ARRAY_AGG for many-to-many relationships
 * This approach is much more efficient than multiple queries or JSON parsing
 */

import { sql } from 'kysely';
import { db } from '../kysely';
import { CardId } from '@biomasters/shared';

export interface CardWithRelations {
  id: number;
  card_name: string;
  trophic_level: number | null;
  trophic_category_id: number;
  conservation_status_id: number | null;
  cost: string; // JSON string
  victory_points: number;
  keywords: number[]; // Array of keyword IDs
  abilities: number[]; // Array of ability IDs
  common_name: string | null;
  scientific_name: string | null;
  mass_kg: number | null; // Will be converted from DECIMAL string
  lifespan_max_days: number | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Convert DECIMAL fields from strings to numbers
 */
function processCardDecimalFields(card: any): CardWithRelations {
  return {
    ...card,
    mass_kg: card.mass_kg ? Number(card.mass_kg) : null,
    // Add other DECIMAL fields as needed
  };
}

export interface AbilityWithEffects {
  id: number;
  ability_name: string;
  trigger_id: number;
  effects: any[]; // JSON array of effects
  description: string | null;
}

/**
 * Fetch all cards with their keywords and abilities using database-side aggregation
 * This is the most efficient way to get complete card data
 */
export async function getAllCardsWithRelations(): Promise<CardWithRelations[]> {
  const result = await db
    .selectFrom('cards as c')
    .leftJoin('card_keywords as ck', 'c.id', 'ck.card_id')
    .leftJoin('card_abilities as ca', 'c.id', 'ca.card_id')
    .select([
      'c.id',
      'c.card_name',
      'c.trophic_level',
      'c.trophic_category_id',
      'c.conservation_status_id',
      'c.cost',
      'c.victory_points',
      'c.common_name',
      'c.scientific_name',
      'c.mass_kg',
      'c.lifespan_max_days',
      'c.created_at',
      'c.updated_at',
      
      // Use PostgreSQL ARRAY_AGG to aggregate related IDs into arrays
      sql<number[]>`COALESCE(ARRAY_AGG(DISTINCT ck.keyword_id) FILTER (WHERE ck.keyword_id IS NOT NULL), '{}')`.as('keywords'),
      sql<number[]>`COALESCE(ARRAY_AGG(DISTINCT ca.ability_id) FILTER (WHERE ca.ability_id IS NOT NULL), '{}')`.as('abilities'),
    ])
    .groupBy([
      'c.id',
      'c.card_name', 
      'c.trophic_level',
      'c.trophic_category_id',
      'c.conservation_status_id',
      'c.cost',
      'c.victory_points',
      'c.common_name',
      'c.scientific_name',
      'c.mass_kg',
      'c.lifespan_max_days',
      'c.created_at',
      'c.updated_at'
    ])
    .execute();

  // Convert DECIMAL fields to numbers
  return result.map(processCardDecimalFields);
}

/**
 * Fetch a single card by ID with all relations
 */
export async function getCardWithRelations(cardId: CardId): Promise<CardWithRelations | null> {
  try {
    const result = await db
      .selectFrom('cards as c')
      .leftJoin('card_keywords as ck', 'c.id', 'ck.card_id')
      .leftJoin('card_abilities as ca', 'c.id', 'ca.card_id')
      .select([
        'c.id',
        'c.card_name',
        'c.trophic_level',
        'c.trophic_category_id',
        'c.conservation_status_id',
        'c.cost',
        'c.victory_points',
        'c.common_name',
        'c.scientific_name',
        'c.mass_kg',
        'c.lifespan_max_days',
        'c.created_at',
        'c.updated_at',

        sql<number[]>`COALESCE(ARRAY_AGG(DISTINCT ck.keyword_id) FILTER (WHERE ck.keyword_id IS NOT NULL), '{}')`.as('keywords'),
        sql<number[]>`COALESCE(ARRAY_AGG(DISTINCT ca.ability_id) FILTER (WHERE ca.ability_id IS NOT NULL), '{}')`.as('abilities'),
      ])
      .where('c.id', '=', cardId)
      .groupBy([
        'c.id',
        'c.card_name',
        'c.trophic_level',
        'c.trophic_category_id',
        'c.conservation_status_id',
        'c.cost',
        'c.victory_points',
        'c.common_name',
        'c.scientific_name',
        'c.mass_kg',
        'c.lifespan_max_days',
        'c.created_at',
        'c.updated_at'
      ])
      .executeTakeFirst();

    return result ? processCardDecimalFields(result) : null;
  } catch (error) {
    // Log the error but don't expose database details
    console.error('Database error in getCardWithRelations:', error);
    return null;
  }
}

/**
 * Fetch cards by trophic level with relations
 */
export async function getCardsByTrophicLevel(trophicLevel: number): Promise<CardWithRelations[]> {
  const result = await db
    .selectFrom('cards as c')
    .leftJoin('card_keywords as ck', 'c.id', 'ck.card_id')
    .leftJoin('card_abilities as ca', 'c.id', 'ca.card_id')
    .select([
      'c.id',
      'c.card_name',
      'c.trophic_level',
      'c.trophic_category_id',
      'c.conservation_status_id',
      'c.cost',
      'c.victory_points',
      'c.common_name',
      'c.scientific_name',
      'c.mass_kg',
      'c.lifespan_max_days',
      'c.created_at',
      'c.updated_at',
      
      sql<number[]>`COALESCE(ARRAY_AGG(DISTINCT ck.keyword_id) FILTER (WHERE ck.keyword_id IS NOT NULL), '{}')`.as('keywords'),
      sql<number[]>`COALESCE(ARRAY_AGG(DISTINCT ca.ability_id) FILTER (WHERE ca.ability_id IS NOT NULL), '{}')`.as('abilities'),
    ])
    .where('c.trophic_level', '=', trophicLevel)
    .groupBy([
      'c.id',
      'c.card_name',
      'c.trophic_level',
      'c.trophic_category_id',
      'c.conservation_status_id',
      'c.cost',
      'c.victory_points',
      'c.common_name',
      'c.scientific_name',
      'c.mass_kg',
      'c.lifespan_max_days',
      'c.created_at',
      'c.updated_at'
    ])
    .execute();

  return result.map(processCardDecimalFields);
}

/**
 * Fetch all abilities with their effects
 */
export async function getAllAbilitiesWithEffects(): Promise<AbilityWithEffects[]> {
  const result = await db
    .selectFrom('abilities')
    .select([
      'id',
      'ability_name',
      'trigger_id',
      'effects',
      'description'
    ])
    .execute();

  // Parse the effects JSON string into an array
  return result.map(ability => ({
    ...ability,
    effects: typeof ability.effects === 'string' ? JSON.parse(ability.effects) : ability.effects
  }));
}

/**
 * Fetch cards by keyword ID
 */
export async function getCardsByKeyword(keywordId: number): Promise<CardWithRelations[]> {
  const result = await db
    .selectFrom('cards as c')
    .innerJoin('card_keywords as ck', 'c.id', 'ck.card_id')
    .leftJoin('card_keywords as ck2', 'c.id', 'ck2.card_id')
    .leftJoin('card_abilities as ca', 'c.id', 'ca.card_id')
    .select([
      'c.id',
      'c.card_name',
      'c.trophic_level',
      'c.trophic_category_id',
      'c.conservation_status_id',
      'c.cost',
      'c.victory_points',
      'c.common_name',
      'c.scientific_name',
      'c.mass_kg',
      'c.lifespan_max_days',
      'c.created_at',
      'c.updated_at',
      
      sql<number[]>`COALESCE(ARRAY_AGG(DISTINCT ck2.keyword_id) FILTER (WHERE ck2.keyword_id IS NOT NULL), '{}')`.as('keywords'),
      sql<number[]>`COALESCE(ARRAY_AGG(DISTINCT ca.ability_id) FILTER (WHERE ca.ability_id IS NOT NULL), '{}')`.as('abilities'),
    ])
    .where('ck.keyword_id', '=', keywordId)
    .groupBy([
      'c.id',
      'c.card_name',
      'c.trophic_level',
      'c.trophic_category_id',
      'c.conservation_status_id',
      'c.cost',
      'c.victory_points',
      'c.common_name',
      'c.scientific_name',
      'c.mass_kg',
      'c.lifespan_max_days',
      'c.created_at',
      'c.updated_at'
    ])
    .execute();

  return result.map(processCardDecimalFields);
}
