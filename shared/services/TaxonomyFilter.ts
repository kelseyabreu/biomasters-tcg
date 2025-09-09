/**
 * BioMasters TCG - Taxonomy Filtering Service
 * 
 * High-performance filtering utilities for taxonomic data using enum-based system.
 * All filtering uses numeric enums for maximum performance.
 */

import { CardData } from '../types';
import {
  TaxoDomain, TaxoKingdom, TaxoPhylum, TaxoClass,
  TaxoOrder, TaxoFamily, TaxoGenus
} from '../enums';

export class TaxonomyFilter {
  /**
   * Filter cards by taxonomic level using enum values
   */
  static filterByTaxonomicLevel(
    cards: CardData[],
    level: keyof Pick<CardData, 'taxoDomain' | 'taxoKingdom' | 'taxoPhylum' | 'taxoClass' | 'taxoOrder' | 'taxoFamily' | 'taxoGenus' | 'taxoSpecies'>,
    value: number
  ): CardData[] {
    return cards.filter(card => card[level] === value);
  }

  // ============================================================================
  // DOMAIN FILTERING
  // ============================================================================

  static getEukaryotes(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoDomain', TaxoDomain.EUKARYOTA);
  }

  static getBacteria(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoDomain', TaxoDomain.BACTERIA);
  }

  static getArchaea(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoDomain', TaxoDomain.ARCHAEA);
  }

  // ============================================================================
  // KINGDOM FILTERING
  // ============================================================================

  static getAnimals(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoKingdom', TaxoKingdom.ANIMALIA);
  }

  static getPlants(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoKingdom', TaxoKingdom.PLANTAE);
  }

  static getFungi(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoKingdom', TaxoKingdom.FUNGI);
  }

  static getProtists(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoKingdom', TaxoKingdom.CHROMISTA);
  }

  // ============================================================================
  // PHYLUM FILTERING
  // ============================================================================

  static getVertebrates(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoPhylum', TaxoPhylum.CHORDATA);
  }

  static getArthropods(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoPhylum', TaxoPhylum.ARTHROPODA);
  }

  static getMollusks(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoPhylum', TaxoPhylum.MOLLUSCA);
  }

  static getVascularPlants(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoPhylum', TaxoPhylum.TRACHEOPHYTA);
  }

  static getClubFungi(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoPhylum', TaxoPhylum.BASIDIOMYCOTA);
  }

  // ============================================================================
  // CLASS FILTERING
  // ============================================================================

  static getMammals(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoClass', TaxoClass.MAMMALIA);
  }

  static getBirds(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoClass', TaxoClass.AVES);
  }

  static getReptiles(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoClass', TaxoClass.REPTILIA);
  }

  static getAmphibians(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoClass', TaxoClass.AMPHIBIA);
  }

  static getFish(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoClass', TaxoClass.ACTINOPTERYGII);
  }

  static getInsects(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoClass', TaxoClass.INSECTA);
  }

  static getSpiders(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoClass', TaxoClass.ARACHNIDA);
  }

  static getDicots(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoClass', TaxoClass.MAGNOLIOPSIDA);
  }

  static getMonocots(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoClass', TaxoClass.LILIOPSIDA);
  }

  static getMushroomFungi(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoClass', TaxoClass.AGARICOMYCETES);
  }

  // ============================================================================
  // ORDER FILTERING
  // ============================================================================

  static getPrimates(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoOrder', TaxoOrder.PRIMATES);
  }

  static getCarnivores(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoOrder', TaxoOrder.CARNIVORA);
  }

  static getUngulates(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoOrder', TaxoOrder.ARTIODACTYLA);
  }

  static getRodents(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoOrder', TaxoOrder.RODENTIA);
  }

  // Note: CHIROPTERA (bats) not present in current card set
  // static getBats(cards: CardData[]): CardData[] {
  //   return this.filterByTaxonomicLevel(cards, 'taxoOrder', TaxoOrder.CHIROPTERA);
  // }

  static getOakOrder(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoOrder', TaxoOrder.FAGALES);
  }

  static getRoseOrder(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoOrder', TaxoOrder.ROSALES);
  }

  // ============================================================================
  // FAMILY FILTERING
  // ============================================================================

  static getGreatApes(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoFamily', TaxoFamily.HOMINIDAE);
  }

  static getCats(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoFamily', TaxoFamily.FELIDAE);
  }

  static getDogs(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoFamily', TaxoFamily.CANIDAE);
  }

  static getBears(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoFamily', TaxoFamily.URSIDAE);
  }

  static getCattle(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoFamily', TaxoFamily.BOVIDAE);
  }

  static getOaks(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoFamily', TaxoFamily.FAGACEAE);
  }

  static getRoses(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoFamily', TaxoFamily.ROSACEAE);
  }

  static getSunflowers(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoFamily', TaxoFamily.ASTERACEAE);
  }

  // ============================================================================
  // GENUS FILTERING
  // ============================================================================

  static getGorillas(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoGenus', TaxoGenus.GORILLA);
  }

  static getBigCats(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoGenus', TaxoGenus.PANTHERA);
  }

  static getCanids(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoGenus', TaxoGenus.CANIS);
  }

  static getTrueBears(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoGenus', TaxoGenus.URSUS);
  }

  static getOakTrees(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoGenus', TaxoGenus.QUERCUS);
  }

  static getRosePlants(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoGenus', TaxoGenus.ROSA);
  }

  static getSunflowerPlants(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoGenus', TaxoGenus.HELIANTHUS);
  }

  static getButtonMushrooms(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoGenus', TaxoGenus.AGARICUS);
  }

  static getRhizobiumBacteria(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoGenus', TaxoGenus.RHIZOBIUM);
  }

  static getBacillusBacteria(cards: CardData[]): CardData[] {
    return this.filterByTaxonomicLevel(cards, 'taxoGenus', TaxoGenus.BACILLUS);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get related species at a specific taxonomic level
   */
  static getRelatedSpecies(
    cards: CardData[],
    targetCard: CardData,
    level: keyof Pick<CardData, 'taxoDomain' | 'taxoKingdom' | 'taxoPhylum' | 'taxoClass' | 'taxoOrder' | 'taxoFamily' | 'taxoGenus' | 'taxoSpecies'>
  ): CardData[] {
    return this.filterByTaxonomicLevel(cards, level, targetCard[level]);
  }

  /**
   * Get taxonomic diversity statistics
   */
  static getTaxonomicDiversity(cards: CardData[]): {
    domains: number;
    kingdoms: number;
    phylums: number;
    classes: number;
    orders: number;
    families: number;
    genera: number;
    species: number;
  } {
    const uniqueDomains = new Set(cards.map(c => c.taxoDomain));
    const uniqueKingdoms = new Set(cards.map(c => c.taxoKingdom));
    const uniquePhylums = new Set(cards.map(c => c.taxoPhylum));
    const uniqueClasses = new Set(cards.map(c => c.taxoClass));
    const uniqueOrders = new Set(cards.map(c => c.taxoOrder));
    const uniqueFamilies = new Set(cards.map(c => c.taxoFamily));
    const uniqueGenera = new Set(cards.map(c => c.taxoGenus));
    const uniqueSpecies = new Set(cards.map(c => c.taxoSpecies));

    return {
      domains: uniqueDomains.size,
      kingdoms: uniqueKingdoms.size,
      phylums: uniquePhylums.size,
      classes: uniqueClasses.size,
      orders: uniqueOrders.size,
      families: uniqueFamilies.size,
      genera: uniqueGenera.size,
      species: uniqueSpecies.size
    };
  }
}
