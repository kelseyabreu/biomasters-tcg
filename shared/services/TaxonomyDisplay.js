"use strict";
/**
 * BioMasters TCG - Taxonomy Display Service
 *
 * Handles localized display of taxonomic information using the hybrid approach.
 * Converts numeric taxonomy enums to localized display names.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxonomyDisplay = void 0;
const taxonomy_mapping_1 = require("../taxonomy-mapping");
class TaxonomyDisplay {
    constructor(localization) {
        this.localization = localization;
    }
    /**
     * Get display name for any taxonomic level using enum values
     */
    getDomainName(domain) {
        const displayId = taxonomy_mapping_1.TaxonomyMapper.getDomainDisplayId(domain);
        return this.localization.getTaxonomyName(displayId);
    }
    getKingdomName(kingdom) {
        const displayId = taxonomy_mapping_1.TaxonomyMapper.getKingdomDisplayId(kingdom);
        return this.localization.getTaxonomyName(displayId);
    }
    getPhylumName(phylum) {
        const displayId = taxonomy_mapping_1.TaxonomyMapper.getPhylumDisplayId(phylum);
        return this.localization.getTaxonomyName(displayId);
    }
    getClassName(taxoClass) {
        const displayId = taxonomy_mapping_1.TaxonomyMapper.getClassDisplayId(taxoClass);
        return this.localization.getTaxonomyName(displayId);
    }
    getOrderName(order) {
        const displayId = taxonomy_mapping_1.TaxonomyMapper.getOrderDisplayId(order);
        return this.localization.getTaxonomyName(displayId);
    }
    getFamilyName(family) {
        const displayId = taxonomy_mapping_1.TaxonomyMapper.getFamilyDisplayId(family);
        return this.localization.getTaxonomyName(displayId);
    }
    getGenusName(genus) {
        const displayId = taxonomy_mapping_1.TaxonomyMapper.getGenusDisplayId(genus);
        return this.localization.getTaxonomyName(displayId);
    }
    getSpeciesName(species) {
        const displayId = taxonomy_mapping_1.TaxonomyMapper.getSpeciesDisplayId(species);
        return this.localization.getTaxonomyName(displayId);
    }
    /**
     * Get full taxonomic path as array of strings
     */
    getFullTaxonomicPath(card) {
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
    getFormattedScientificName(card) {
        const genus = this.getGenusName(card.taxoGenus);
        const species = this.getSpeciesName(card.taxoSpecies);
        return `${genus} ${species}`;
    }
    /**
     * Get taxonomic breadcrumb for UI display
     */
    getTaxonomicBreadcrumb(card) {
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
    getTaxonomicRelationship(card1, card2) {
        if (card1.taxoSpecies === card2.taxoSpecies) {
            return 'Same species';
        }
        else if (card1.taxoGenus === card2.taxoGenus) {
            return 'Same genus';
        }
        else if (card1.taxoFamily === card2.taxoFamily) {
            return 'Same family';
        }
        else if (card1.taxoOrder === card2.taxoOrder) {
            return 'Same order';
        }
        else if (card1.taxoClass === card2.taxoClass) {
            return 'Same class';
        }
        else if (card1.taxoPhylum === card2.taxoPhylum) {
            return 'Same phylum';
        }
        else if (card1.taxoKingdom === card2.taxoKingdom) {
            return 'Same kingdom';
        }
        else if (card1.taxoDomain === card2.taxoDomain) {
            return 'Same domain';
        }
        else {
            return 'Different domains';
        }
    }
    /**
     * Get taxonomic distance (0 = same species, 7 = different domains)
     */
    getTaxonomicDistance(card1, card2) {
        if (card1.taxoSpecies === card2.taxoSpecies)
            return 0;
        if (card1.taxoGenus === card2.taxoGenus)
            return 1;
        if (card1.taxoFamily === card2.taxoFamily)
            return 2;
        if (card1.taxoOrder === card2.taxoOrder)
            return 3;
        if (card1.taxoClass === card2.taxoClass)
            return 4;
        if (card1.taxoPhylum === card2.taxoPhylum)
            return 5;
        if (card1.taxoKingdom === card2.taxoKingdom)
            return 6;
        if (card1.taxoDomain === card2.taxoDomain)
            return 7;
        return 8; // Different domains
    }
    /**
     * Get taxonomic hierarchy for educational display
     */
    getTaxonomicHierarchy(card) {
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
    areRelated(card1, card2) {
        return card1.taxoDomain === card2.taxoDomain;
    }
    /**
     * Get closest common taxonomic level
     */
    getClosestCommonLevel(card1, card2) {
        if (card1.taxoSpecies === card2.taxoSpecies)
            return 'species';
        if (card1.taxoGenus === card2.taxoGenus)
            return 'genus';
        if (card1.taxoFamily === card2.taxoFamily)
            return 'family';
        if (card1.taxoOrder === card2.taxoOrder)
            return 'order';
        if (card1.taxoClass === card2.taxoClass)
            return 'class';
        if (card1.taxoPhylum === card2.taxoPhylum)
            return 'phylum';
        if (card1.taxoKingdom === card2.taxoKingdom)
            return 'kingdom';
        if (card1.taxoDomain === card2.taxoDomain)
            return 'domain';
        return null;
    }
    /**
     * Format taxonomy for compact display (e.g., "Mammalia > Carnivora > Felidae")
     */
    getCompactTaxonomy(card, startLevel = 'class') {
        const hierarchy = this.getTaxonomicHierarchy(card);
        const startIndex = hierarchy.findIndex(h => h.level.toLowerCase() === startLevel);
        if (startIndex === -1)
            return '';
        return hierarchy
            .slice(startIndex)
            .map(h => h.name)
            .join(' > ');
    }
}
exports.TaxonomyDisplay = TaxonomyDisplay;
//# sourceMappingURL=TaxonomyDisplay.js.map