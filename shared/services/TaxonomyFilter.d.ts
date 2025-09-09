/**
 * BioMasters TCG - Taxonomy Filtering Service
 *
 * High-performance filtering utilities for taxonomic data using enum-based system.
 * All filtering uses numeric enums for maximum performance.
 */
import { CardData } from '../types';
export declare class TaxonomyFilter {
    /**
     * Filter cards by taxonomic level using enum values
     */
    static filterByTaxonomicLevel(cards: CardData[], level: keyof Pick<CardData, 'taxoDomain' | 'taxoKingdom' | 'taxoPhylum' | 'taxoClass' | 'taxoOrder' | 'taxoFamily' | 'taxoGenus' | 'taxoSpecies'>, value: number): CardData[];
    static getEukaryotes(cards: CardData[]): CardData[];
    static getBacteria(cards: CardData[]): CardData[];
    static getArchaea(cards: CardData[]): CardData[];
    static getAnimals(cards: CardData[]): CardData[];
    static getPlants(cards: CardData[]): CardData[];
    static getFungi(cards: CardData[]): CardData[];
    static getProtists(cards: CardData[]): CardData[];
    static getVertebrates(cards: CardData[]): CardData[];
    static getArthropods(cards: CardData[]): CardData[];
    static getMollusks(cards: CardData[]): CardData[];
    static getVascularPlants(cards: CardData[]): CardData[];
    static getClubFungi(cards: CardData[]): CardData[];
    static getMammals(cards: CardData[]): CardData[];
    static getBirds(cards: CardData[]): CardData[];
    static getReptiles(cards: CardData[]): CardData[];
    static getAmphibians(cards: CardData[]): CardData[];
    static getFish(cards: CardData[]): CardData[];
    static getInsects(cards: CardData[]): CardData[];
    static getSpiders(cards: CardData[]): CardData[];
    static getDicots(cards: CardData[]): CardData[];
    static getMonocots(cards: CardData[]): CardData[];
    static getMushroomFungi(cards: CardData[]): CardData[];
    static getPrimates(cards: CardData[]): CardData[];
    static getCarnivores(cards: CardData[]): CardData[];
    static getUngulates(cards: CardData[]): CardData[];
    static getRodents(cards: CardData[]): CardData[];
    static getOakOrder(cards: CardData[]): CardData[];
    static getRoseOrder(cards: CardData[]): CardData[];
    static getGreatApes(cards: CardData[]): CardData[];
    static getCats(cards: CardData[]): CardData[];
    static getDogs(cards: CardData[]): CardData[];
    static getBears(cards: CardData[]): CardData[];
    static getCattle(cards: CardData[]): CardData[];
    static getOaks(cards: CardData[]): CardData[];
    static getRoses(cards: CardData[]): CardData[];
    static getSunflowers(cards: CardData[]): CardData[];
    static getGorillas(cards: CardData[]): CardData[];
    static getBigCats(cards: CardData[]): CardData[];
    static getCanids(cards: CardData[]): CardData[];
    static getTrueBears(cards: CardData[]): CardData[];
    static getOakTrees(cards: CardData[]): CardData[];
    static getRosePlants(cards: CardData[]): CardData[];
    static getSunflowerPlants(cards: CardData[]): CardData[];
    static getButtonMushrooms(cards: CardData[]): CardData[];
    static getRhizobiumBacteria(cards: CardData[]): CardData[];
    static getBacillusBacteria(cards: CardData[]): CardData[];
    /**
     * Get related species at a specific taxonomic level
     */
    static getRelatedSpecies(cards: CardData[], targetCard: CardData, level: keyof Pick<CardData, 'taxoDomain' | 'taxoKingdom' | 'taxoPhylum' | 'taxoClass' | 'taxoOrder' | 'taxoFamily' | 'taxoGenus' | 'taxoSpecies'>): CardData[];
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
    };
}
//# sourceMappingURL=TaxonomyFilter.d.ts.map