"use strict";
/**
 * BioMasters TCG - Taxonomy Filtering Service
 *
 * High-performance filtering utilities for taxonomic data using enum-based system.
 * All filtering uses numeric enums for maximum performance.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxonomyFilter = void 0;
const enums_1 = require("../enums");
class TaxonomyFilter {
    /**
     * Filter cards by taxonomic level using enum values
     */
    static filterByTaxonomicLevel(cards, level, value) {
        return cards.filter(card => card[level] === value);
    }
    // ============================================================================
    // DOMAIN FILTERING
    // ============================================================================
    static getEukaryotes(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoDomain', enums_1.TaxoDomain.EUKARYOTA);
    }
    static getBacteria(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoDomain', enums_1.TaxoDomain.BACTERIA);
    }
    static getArchaea(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoDomain', enums_1.TaxoDomain.ARCHAEA);
    }
    // ============================================================================
    // KINGDOM FILTERING
    // ============================================================================
    static getAnimals(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoKingdom', enums_1.TaxoKingdom.ANIMALIA);
    }
    static getPlants(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoKingdom', enums_1.TaxoKingdom.PLANTAE);
    }
    static getFungi(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoKingdom', enums_1.TaxoKingdom.FUNGI);
    }
    static getProtists(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoKingdom', enums_1.TaxoKingdom.CHROMISTA);
    }
    // ============================================================================
    // PHYLUM FILTERING
    // ============================================================================
    static getVertebrates(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoPhylum', enums_1.TaxoPhylum.CHORDATA);
    }
    static getArthropods(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoPhylum', enums_1.TaxoPhylum.ARTHROPODA);
    }
    static getMollusks(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoPhylum', enums_1.TaxoPhylum.MOLLUSCA);
    }
    static getVascularPlants(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoPhylum', enums_1.TaxoPhylum.TRACHEOPHYTA);
    }
    static getClubFungi(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoPhylum', enums_1.TaxoPhylum.BASIDIOMYCOTA);
    }
    // ============================================================================
    // CLASS FILTERING
    // ============================================================================
    static getMammals(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoClass', enums_1.TaxoClass.MAMMALIA);
    }
    static getBirds(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoClass', enums_1.TaxoClass.AVES);
    }
    static getReptiles(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoClass', enums_1.TaxoClass.REPTILIA);
    }
    static getAmphibians(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoClass', enums_1.TaxoClass.AMPHIBIA);
    }
    static getFish(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoClass', enums_1.TaxoClass.ACTINOPTERYGII);
    }
    static getInsects(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoClass', enums_1.TaxoClass.INSECTA);
    }
    static getSpiders(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoClass', enums_1.TaxoClass.ARACHNIDA);
    }
    static getDicots(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoClass', enums_1.TaxoClass.MAGNOLIOPSIDA);
    }
    static getMonocots(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoClass', enums_1.TaxoClass.LILIOPSIDA);
    }
    static getMushroomFungi(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoClass', enums_1.TaxoClass.AGARICOMYCETES);
    }
    // ============================================================================
    // ORDER FILTERING
    // ============================================================================
    static getPrimates(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoOrder', enums_1.TaxoOrder.PRIMATES);
    }
    static getCarnivores(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoOrder', enums_1.TaxoOrder.CARNIVORA);
    }
    static getUngulates(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoOrder', enums_1.TaxoOrder.ARTIODACTYLA);
    }
    static getRodents(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoOrder', enums_1.TaxoOrder.RODENTIA);
    }
    // Note: CHIROPTERA (bats) not present in current card set
    // static getBats(cards: CardData[]): CardData[] {
    //   return this.filterByTaxonomicLevel(cards, 'taxoOrder', TaxoOrder.CHIROPTERA);
    // }
    static getOakOrder(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoOrder', enums_1.TaxoOrder.FAGALES);
    }
    static getRoseOrder(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoOrder', enums_1.TaxoOrder.ROSALES);
    }
    // ============================================================================
    // FAMILY FILTERING
    // ============================================================================
    static getGreatApes(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoFamily', enums_1.TaxoFamily.HOMINIDAE);
    }
    static getCats(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoFamily', enums_1.TaxoFamily.FELIDAE);
    }
    static getDogs(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoFamily', enums_1.TaxoFamily.CANIDAE);
    }
    static getBears(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoFamily', enums_1.TaxoFamily.URSIDAE);
    }
    static getCattle(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoFamily', enums_1.TaxoFamily.BOVIDAE);
    }
    static getOaks(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoFamily', enums_1.TaxoFamily.FAGACEAE);
    }
    static getRoses(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoFamily', enums_1.TaxoFamily.ROSACEAE);
    }
    static getSunflowers(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoFamily', enums_1.TaxoFamily.ASTERACEAE);
    }
    // ============================================================================
    // GENUS FILTERING
    // ============================================================================
    static getGorillas(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoGenus', enums_1.TaxoGenus.GORILLA);
    }
    static getBigCats(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoGenus', enums_1.TaxoGenus.PANTHERA);
    }
    static getCanids(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoGenus', enums_1.TaxoGenus.CANIS);
    }
    static getTrueBears(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoGenus', enums_1.TaxoGenus.URSUS);
    }
    static getOakTrees(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoGenus', enums_1.TaxoGenus.QUERCUS);
    }
    static getRosePlants(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoGenus', enums_1.TaxoGenus.ROSA);
    }
    static getSunflowerPlants(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoGenus', enums_1.TaxoGenus.HELIANTHUS);
    }
    static getButtonMushrooms(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoGenus', enums_1.TaxoGenus.AGARICUS);
    }
    static getRhizobiumBacteria(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoGenus', enums_1.TaxoGenus.RHIZOBIUM);
    }
    static getBacillusBacteria(cards) {
        return this.filterByTaxonomicLevel(cards, 'taxoGenus', enums_1.TaxoGenus.BACILLUS);
    }
    // ============================================================================
    // UTILITY METHODS
    // ============================================================================
    /**
     * Get related species at a specific taxonomic level
     */
    static getRelatedSpecies(cards, targetCard, level) {
        return this.filterByTaxonomicLevel(cards, level, targetCard[level]);
    }
    /**
     * Get taxonomic diversity statistics
     */
    static getTaxonomicDiversity(cards) {
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
exports.TaxonomyFilter = TaxonomyFilter;
//# sourceMappingURL=TaxonomyFilter.js.map