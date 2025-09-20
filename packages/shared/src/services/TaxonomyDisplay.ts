/**
 * BioMasters TCG - Taxonomy Display Service
 * 
 * Handles localized display of taxonomic information using the hybrid approach.
 * Converts numeric taxonomy enums to localized display names.
 */

import { CardData } from '../types';
import { ILocalizationManager } from '../localization-manager';
import { TaxonomyMapper } from '../taxonomy-mapping';
import {
  TaxoDomain, TaxoKingdom, TaxoPhylum, TaxoClass,
  TaxoOrder, TaxoFamily, TaxoGenus, TaxoSpecies
} from '../enums';

export class TaxonomyDisplay {
  constructor(private localization: ILocalizationManager) {}

  /**
   * Get display name for any taxonomic level using enum values
   */
  getDomainName(domain: TaxoDomain): string {
    const displayId = TaxonomyMapper.getDomainDisplayId(domain);
    return this.localization.getTaxonomyName(displayId);
  }

  getKingdomName(kingdom: TaxoKingdom): string {
    const displayId = TaxonomyMapper.getKingdomDisplayId(kingdom);
    return this.localization.getTaxonomyName(displayId);
  }

  getPhylumName(phylum: TaxoPhylum): string {
    const displayId = TaxonomyMapper.getPhylumDisplayId(phylum);
    return this.localization.getTaxonomyName(displayId);
  }

  getClassName(taxoClass: TaxoClass): string {
    const displayId = TaxonomyMapper.getClassDisplayId(taxoClass);
    return this.localization.getTaxonomyName(displayId);
  }

  getOrderName(order: TaxoOrder): string {
    const displayId = TaxonomyMapper.getOrderDisplayId(order);
    return this.localization.getTaxonomyName(displayId);
  }

  getFamilyName(family: TaxoFamily): string {
    const displayId = TaxonomyMapper.getFamilyDisplayId(family);
    return this.localization.getTaxonomyName(displayId);
  }

  getGenusName(genus: TaxoGenus): string {
    const displayId = TaxonomyMapper.getGenusDisplayId(genus);
    return this.localization.getTaxonomyName(displayId);
  }

  getSpeciesName(species: TaxoSpecies): string {
    const displayId = TaxonomyMapper.getSpeciesDisplayId(species);
    return this.localization.getTaxonomyName(displayId);
  }

  /**
   * Get full taxonomic path as array of strings
   */
  getFullTaxonomicPath(card: CardData): string[] {
    return [
      this.getDomainName(card.taxoDomain),
      this.getKingdomName(card.taxoKingdom),
      this.getPhylumName(card.taxoPhylum),
      this.getClassName(card.taxoClass),
      this.getOrderName(card.taxoOrder),
      this.getFamilyName(card.taxoFamily),
      this.getGenusName(card.taxoGenus),
      this.getSpeciesName(card.taxoSpecies)
    ];
  }

  /**
   * Get formatted scientific name (Genus species)
   */
  getFormattedScientificName(card: CardData): string {
    const genus = this.getGenusName(card.taxoGenus);
    const species = this.getSpeciesName(card.taxoSpecies);
    return `${genus} ${species}`;
  }

  /**
   * Get taxonomic breadcrumb for UI display
   */
  getTaxonomicBreadcrumb(card: CardData): Array<{level: string, name: string}> {
    return [
      { level: 'Domain', name: this.getDomainName(card.taxoDomain) },
      { level: 'Kingdom', name: this.getKingdomName(card.taxoKingdom) },
      { level: 'Phylum', name: this.getPhylumName(card.taxoPhylum) },
      { level: 'Class', name: this.getClassName(card.taxoClass) },
      { level: 'Order', name: this.getOrderName(card.taxoOrder) },
      { level: 'Family', name: this.getFamilyName(card.taxoFamily) },
      { level: 'Genus', name: this.getGenusName(card.taxoGenus) },
      { level: 'Species', name: this.getSpeciesName(card.taxoSpecies) }
    ];
  }

  /**
   * Get taxonomic relationship description between two cards
   */
  getTaxonomicRelationship(card1: CardData, card2: CardData): string {
    if (card1.taxoSpecies === card2.taxoSpecies) {
      return 'Same species';
    } else if (card1.taxoGenus === card2.taxoGenus) {
      return 'Same genus';
    } else if (card1.taxoFamily === card2.taxoFamily) {
      return 'Same family';
    } else if (card1.taxoOrder === card2.taxoOrder) {
      return 'Same order';
    } else if (card1.taxoClass === card2.taxoClass) {
      return 'Same class';
    } else if (card1.taxoPhylum === card2.taxoPhylum) {
      return 'Same phylum';
    } else if (card1.taxoKingdom === card2.taxoKingdom) {
      return 'Same kingdom';
    } else if (card1.taxoDomain === card2.taxoDomain) {
      return 'Same domain';
    } else {
      return 'Different domains';
    }
  }

  /**
   * Get taxonomic distance (0 = same species, 7 = different domains)
   */
  getTaxonomicDistance(card1: CardData, card2: CardData): number {
    if (card1.taxoSpecies === card2.taxoSpecies) return 0;
    if (card1.taxoGenus === card2.taxoGenus) return 1;
    if (card1.taxoFamily === card2.taxoFamily) return 2;
    if (card1.taxoOrder === card2.taxoOrder) return 3;
    if (card1.taxoClass === card2.taxoClass) return 4;
    if (card1.taxoPhylum === card2.taxoPhylum) return 5;
    if (card1.taxoKingdom === card2.taxoKingdom) return 6;
    if (card1.taxoDomain === card2.taxoDomain) return 7;
    return 8; // Different domains
  }

  /**
   * Get taxonomic hierarchy for educational display
   */
  getTaxonomicHierarchy(card: CardData): {
    level: string;
    name: string;
    scientificName?: string;
  }[] {
    return [
      { 
        level: 'Domain', 
        name: this.getDomainName(card.taxoDomain)
      },
      { 
        level: 'Kingdom', 
        name: this.getKingdomName(card.taxoKingdom)
      },
      { 
        level: 'Phylum', 
        name: this.getPhylumName(card.taxoPhylum)
      },
      { 
        level: 'Class', 
        name: this.getClassName(card.taxoClass)
      },
      { 
        level: 'Order', 
        name: this.getOrderName(card.taxoOrder)
      },
      { 
        level: 'Family', 
        name: this.getFamilyName(card.taxoFamily)
      },
      { 
        level: 'Genus', 
        name: this.getGenusName(card.taxoGenus)
      },
      { 
        level: 'Species', 
        name: this.getSpeciesName(card.taxoSpecies),
        scientificName: this.getFormattedScientificName(card)
      }
    ];
  }

  /**
   * Check if two cards are taxonomically related at any level
   */
  areRelated(card1: CardData, card2: CardData): boolean {
    return card1.taxoDomain === card2.taxoDomain;
  }

  /**
   * Get closest common taxonomic level
   */
  getClosestCommonLevel(card1: CardData, card2: CardData): string | null {
    if (card1.taxoSpecies === card2.taxoSpecies) return 'species';
    if (card1.taxoGenus === card2.taxoGenus) return 'genus';
    if (card1.taxoFamily === card2.taxoFamily) return 'family';
    if (card1.taxoOrder === card2.taxoOrder) return 'order';
    if (card1.taxoClass === card2.taxoClass) return 'class';
    if (card1.taxoPhylum === card2.taxoPhylum) return 'phylum';
    if (card1.taxoKingdom === card2.taxoKingdom) return 'kingdom';
    if (card1.taxoDomain === card2.taxoDomain) return 'domain';
    return null;
  }

  /**
   * Format taxonomy for compact display (e.g., "Mammalia > Carnivora > Felidae")
   */
  getCompactTaxonomy(card: CardData, startLevel: 'domain' | 'kingdom' | 'phylum' | 'class' | 'order' | 'family' | 'genus' = 'class'): string {
    const hierarchy = this.getTaxonomicHierarchy(card);
    const startIndex = hierarchy.findIndex(h => h.level.toLowerCase() === startLevel);
    
    if (startIndex === -1) return '';
    
    return hierarchy
      .slice(startIndex)
      .map(h => h.name)
      .join(' > ');
  }
}
