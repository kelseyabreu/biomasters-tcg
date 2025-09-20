/**
 * BioMasters TCG - Server-side Taxonomy Service
 * 
 * Provides server-side taxonomy operations using the new enum-based system.
 * Integrates with database queries and provides high-performance filtering.
 */

import {
  TaxoDomain, TaxoKingdom, TaxoPhylum, TaxoClass,
  TaxoOrder, TaxoFamily, TaxoGenus, TaxoSpecies
} from '@biomasters/shared';
import { TaxonomyDisplayId } from '@shared/text-ids';
import { TaxonomyMapper } from '@shared/taxonomy-mapping';
import { 
  getCardsByTaxonomyLevel, 
  getTaxonomicDiversityStats, 
  getRelatedCards,
  CardWithRelations 
} from '../database/queries/cardQueries';
import { CardId } from '@biomasters/shared';

export class TaxonomyService {
  /**
   * Get cards by domain
   */
  static async getCardsByDomain(domain: TaxoDomain): Promise<CardWithRelations[]> {
    return getCardsByTaxonomyLevel('domain', domain);
  }

  /**
   * Get cards by kingdom
   */
  static async getCardsByKingdom(kingdom: TaxoKingdom): Promise<CardWithRelations[]> {
    return getCardsByTaxonomyLevel('kingdom', kingdom);
  }

  /**
   * Get cards by phylum
   */
  static async getCardsByPhylum(phylum: TaxoPhylum): Promise<CardWithRelations[]> {
    return getCardsByTaxonomyLevel('phylum', phylum);
  }

  /**
   * Get cards by class
   */
  static async getCardsByClass(taxoClass: TaxoClass): Promise<CardWithRelations[]> {
    return getCardsByTaxonomyLevel('class', taxoClass);
  }

  /**
   * Get cards by order
   */
  static async getCardsByOrder(order: TaxoOrder): Promise<CardWithRelations[]> {
    return getCardsByTaxonomyLevel('order', order);
  }

  /**
   * Get cards by family
   */
  static async getCardsByFamily(family: TaxoFamily): Promise<CardWithRelations[]> {
    return getCardsByTaxonomyLevel('family', family);
  }

  /**
   * Get cards by genus
   */
  static async getCardsByGenus(genus: TaxoGenus): Promise<CardWithRelations[]> {
    return getCardsByTaxonomyLevel('genus', genus);
  }

  /**
   * Get cards by species
   */
  static async getCardsBySpecies(species: TaxoSpecies): Promise<CardWithRelations[]> {
    return getCardsByTaxonomyLevel('species', species);
  }

  /**
   * Get all animals (Kingdom Animalia)
   */
  static async getAnimals(): Promise<CardWithRelations[]> {
    return this.getCardsByKingdom(TaxoKingdom.ANIMALIA);
  }

  /**
   * Get all plants (Kingdom Plantae)
   */
  static async getPlants(): Promise<CardWithRelations[]> {
    return this.getCardsByKingdom(TaxoKingdom.PLANTAE);
  }

  /**
   * Get all fungi (Kingdom Fungi)
   */
  static async getFungi(): Promise<CardWithRelations[]> {
    return this.getCardsByKingdom(TaxoKingdom.FUNGI);
  }

  /**
   * Get all bacteria (Domain Bacteria)
   */
  static async getBacteria(): Promise<CardWithRelations[]> {
    return this.getCardsByDomain(TaxoDomain.BACTERIA);
  }

  /**
   * Get all vertebrates (Phylum Chordata)
   */
  static async getVertebrates(): Promise<CardWithRelations[]> {
    return this.getCardsByPhylum(TaxoPhylum.CHORDATA);
  }

  /**
   * Get all mammals (Class Mammalia)
   */
  static async getMammals(): Promise<CardWithRelations[]> {
    return this.getCardsByClass(TaxoClass.MAMMALIA);
  }

  /**
   * Get all birds (Class Aves)
   */
  static async getBirds(): Promise<CardWithRelations[]> {
    return this.getCardsByClass(TaxoClass.AVES);
  }

  /**
   * Get all carnivores (Order Carnivora)
   */
  static async getCarnivores(): Promise<CardWithRelations[]> {
    return this.getCardsByOrder(TaxoOrder.CARNIVORA);
  }

  /**
   * Get all primates (Order Primates)
   */
  static async getPrimates(): Promise<CardWithRelations[]> {
    return this.getCardsByOrder(TaxoOrder.PRIMATES);
  }

  /**
   * Get taxonomic diversity statistics
   */
  static async getDiversityStats(): Promise<{
    domains: number;
    kingdoms: number;
    phylums: number;
    classes: number;
    orders: number;
    families: number;
    genera: number;
    species: number;
  }> {
    return getTaxonomicDiversityStats();
  }

  /**
   * Get cards related to a specific card at a given taxonomic level
   */
  static async getRelatedCardsAtLevel(
    cardId: CardId,
    level: 'domain' | 'kingdom' | 'phylum' | 'class' | 'order' | 'family' | 'genus' | 'species'
  ): Promise<CardWithRelations[]> {
    return getRelatedCards(cardId, level);
  }

  /**
   * Get taxonomic hierarchy for a card
   */
  static getTaxonomicHierarchy(card: CardWithRelations): Array<{
    level: string;
    value: number | null;
    displayId: TaxonomyDisplayId | null;
  }> {
    return [
      { 
        level: 'domain', 
        value: card.taxo_domain,
        displayId: card.taxo_domain ? TaxonomyMapper.getDomainDisplayId(card.taxo_domain) : null
      },
      { 
        level: 'kingdom', 
        value: card.taxo_kingdom,
        displayId: card.taxo_kingdom ? TaxonomyMapper.getKingdomDisplayId(card.taxo_kingdom) : null
      },
      { 
        level: 'phylum', 
        value: card.taxo_phylum,
        displayId: card.taxo_phylum ? TaxonomyMapper.getPhylumDisplayId(card.taxo_phylum) : null
      },
      { 
        level: 'class', 
        value: card.taxo_class,
        displayId: card.taxo_class ? TaxonomyMapper.getClassDisplayId(card.taxo_class) : null
      },
      { 
        level: 'order', 
        value: card.taxo_order,
        displayId: card.taxo_order ? TaxonomyMapper.getOrderDisplayId(card.taxo_order) : null
      },
      { 
        level: 'family', 
        value: card.taxo_family,
        displayId: card.taxo_family ? TaxonomyMapper.getFamilyDisplayId(card.taxo_family) : null
      },
      { 
        level: 'genus', 
        value: card.taxo_genus,
        displayId: card.taxo_genus ? TaxonomyMapper.getGenusDisplayId(card.taxo_genus) : null
      },
      { 
        level: 'species', 
        value: card.taxo_species,
        displayId: card.taxo_species ? TaxonomyMapper.getSpeciesDisplayId(card.taxo_species) : null
      }
    ];
  }

  /**
   * Calculate taxonomic distance between two cards
   */
  static getTaxonomicDistance(card1: CardWithRelations, card2: CardWithRelations): number {
    if (card1.taxo_species === card2.taxo_species) return 0;
    if (card1.taxo_genus === card2.taxo_genus) return 1;
    if (card1.taxo_family === card2.taxo_family) return 2;
    if (card1.taxo_order === card2.taxo_order) return 3;
    if (card1.taxo_class === card2.taxo_class) return 4;
    if (card1.taxo_phylum === card2.taxo_phylum) return 5;
    if (card1.taxo_kingdom === card2.taxo_kingdom) return 6;
    if (card1.taxo_domain === card2.taxo_domain) return 7;
    return 8; // Different domains
  }

  /**
   * Get closest common taxonomic level between two cards
   */
  static getClosestCommonLevel(card1: CardWithRelations, card2: CardWithRelations): string | null {
    if (card1.taxo_species === card2.taxo_species) return 'species';
    if (card1.taxo_genus === card2.taxo_genus) return 'genus';
    if (card1.taxo_family === card2.taxo_family) return 'family';
    if (card1.taxo_order === card2.taxo_order) return 'order';
    if (card1.taxo_class === card2.taxo_class) return 'class';
    if (card1.taxo_phylum === card2.taxo_phylum) return 'phylum';
    if (card1.taxo_kingdom === card2.taxo_kingdom) return 'kingdom';
    if (card1.taxo_domain === card2.taxo_domain) return 'domain';
    return null;
  }

  /**
   * Check if a card has complete taxonomy data
   */
  static hasCompleteTaxonomy(card: CardWithRelations): boolean {
    return !!(
      card.taxo_domain &&
      card.taxo_kingdom &&
      card.taxo_phylum &&
      card.taxo_class &&
      card.taxo_order &&
      card.taxo_family &&
      card.taxo_genus &&
      card.taxo_species
    );
  }

  /**
   * Get cards with incomplete taxonomy data
   */
  static async getCardsWithIncompleteTaxonomy(): Promise<CardWithRelations[]> {
    const allCards = await import('../database/queries/cardQueries').then(m => m.getAllCardsWithRelations());
    return allCards.filter(card => !this.hasCompleteTaxonomy(card));
  }

  /**
   * Validate taxonomy enum values
   */
  static validateTaxonomyValues(card: CardWithRelations): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check if values are positive integers
    const fields = [
      'taxo_domain', 'taxo_kingdom', 'taxo_phylum', 'taxo_class',
      'taxo_order', 'taxo_family', 'taxo_genus', 'taxo_species'
    ] as const;

    for (const field of fields) {
      const value = card[field];
      if (value !== null && (!Number.isInteger(value) || value <= 0)) {
        errors.push(`${field} must be a positive integer, got: ${value}`);
      }
    }

    // Check enum ranges (basic validation)
    if (card.taxo_domain && (card.taxo_domain < 1 || card.taxo_domain > 3)) {
      errors.push(`taxo_domain out of range: ${card.taxo_domain}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
