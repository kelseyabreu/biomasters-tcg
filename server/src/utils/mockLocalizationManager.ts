/**
 * Mock Localization Manager for Server-Side Use
 * 
 * Provides a simple implementation for server-side code that doesn't need full localization
 */

import { ILocalizationManager } from '../../../shared/localization-manager';
import {
  CardNameId,
  ScientificNameId,
  CardDescriptionId,
  AbilityNameId,
  AbilityDescriptionId,
  KeywordNameId,
  UITextId,
  TaxonomyId,
  SupportedLanguage
} from '../../../shared/text-ids';

/**
 * Mock implementation that returns the text ID as the display text
 * This is useful for server-side operations where localization isn't needed
 */
export class MockLocalizationManager implements ILocalizationManager {
  public currentLanguage: SupportedLanguage = SupportedLanguage.ENGLISH;
  
  get availableLanguages(): SupportedLanguage[] {
    return [SupportedLanguage.ENGLISH, SupportedLanguage.SPANISH];
  }

  async loadLanguage(languageCode: SupportedLanguage): Promise<void> {
    this.currentLanguage = languageCode;
    // No-op for mock implementation
  }

  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  getCardName(nameId: CardNameId): string {
    return `[${nameId}]`;
  }

  getScientificName(scientificNameId: ScientificNameId): string {
    return `[${scientificNameId}]`;
  }

  getCardDescription(descriptionId: CardDescriptionId): string {
    return `[${descriptionId}]`;
  }

  getAbilityName(nameId: AbilityNameId): string {
    return `[${nameId}]`;
  }

  getAbilityDescription(descriptionId: AbilityDescriptionId): string {
    return `[${descriptionId}]`;
  }

  getAbilityFlavorText(flavorTextId: string): string {
    return `[${flavorTextId}]`;
  }

  getKeywordName(nameId: KeywordNameId): string {
    return `[${nameId}]`;
  }

  getUIText(textId: UITextId): string {
    return `[${textId}]`;
  }

  getTaxonomy(taxonomyId: TaxonomyId): {
    kingdom: string;
    phylum: string;
    class: string;
    order: string;
    family: string;
    genus: string;
    species: string;
    commonNames: string[];
  } | null {
    return {
      kingdom: `[${taxonomyId}_KINGDOM]`,
      phylum: `[${taxonomyId}_PHYLUM]`,
      class: `[${taxonomyId}_CLASS]`,
      order: `[${taxonomyId}_ORDER]`,
      family: `[${taxonomyId}_FAMILY]`,
      genus: `[${taxonomyId}_GENUS]`,
      species: `[${taxonomyId}_SPECIES]`,
      commonNames: [`[${taxonomyId}_COMMON]`]
    };
  }

  getFormattedScientificName(taxonomyId: TaxonomyId): string {
    return `[${taxonomyId}_SCIENTIFIC]`;
  }

  hasText(_textId: string): boolean {
    return true; // Mock always has text
  }

  getText(textId: string): string {
    return `[${textId}]`;
  }
}

/**
 * Create a mock localization manager instance
 */
export function createMockLocalizationManager(): ILocalizationManager {
  return new MockLocalizationManager();
}
