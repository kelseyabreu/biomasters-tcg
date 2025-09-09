/**
 * BioMasters TCG - Taxonomy Display Service
 *
 * Handles localized display of taxonomic information using the hybrid approach.
 * Converts numeric taxonomy enums to localized display names.
 */
import { CardData } from '../types';
import { ILocalizationManager } from '../localization-manager';
import { TaxoDomain, TaxoKingdom, TaxoPhylum, TaxoClass, TaxoOrder, TaxoFamily, TaxoGenus, TaxoSpecies } from '../enums';
export declare class TaxonomyDisplay {
    private localization;
    constructor(localization: ILocalizationManager);
    /**
     * Get display name for any taxonomic level using enum values
     */
    getDomainName(domain: TaxoDomain): string;
    getKingdomName(kingdom: TaxoKingdom): string;
    getPhylumName(phylum: TaxoPhylum): string;
    getClassName(taxoClass: TaxoClass): string;
    getOrderName(order: TaxoOrder): string;
    getFamilyName(family: TaxoFamily): string;
    getGenusName(genus: TaxoGenus): string;
    getSpeciesName(species: TaxoSpecies): string;
    /**
     * Get full taxonomic path as array of strings
     */
    getFullTaxonomicPath(card: CardData): string[];
    /**
     * Get formatted scientific name (Genus species)
     */
    getFormattedScientificName(card: CardData): string;
    /**
     * Get taxonomic breadcrumb for UI display
     */
    getTaxonomicBreadcrumb(card: CardData): Array<{
        level: string;
        name: string;
    }>;
    /**
     * Get taxonomic relationship description between two cards
     */
    getTaxonomicRelationship(card1: CardData, card2: CardData): string;
    /**
     * Get taxonomic distance (0 = same species, 7 = different domains)
     */
    getTaxonomicDistance(card1: CardData, card2: CardData): number;
    /**
     * Get taxonomic hierarchy for educational display
     */
    getTaxonomicHierarchy(card: CardData): {
        level: string;
        name: string;
        scientificName?: string;
    }[];
    /**
     * Check if two cards are taxonomically related at any level
     */
    areRelated(card1: CardData, card2: CardData): boolean;
    /**
     * Get closest common taxonomic level
     */
    getClosestCommonLevel(card1: CardData, card2: CardData): string | null;
    /**
     * Format taxonomy for compact display (e.g., "Mammalia > Carnivora > Felidae")
     */
    getCompactTaxonomy(card: CardData, startLevel?: 'domain' | 'kingdom' | 'phylum' | 'class' | 'order' | 'family' | 'genus'): string;
}
//# sourceMappingURL=TaxonomyDisplay.d.ts.map