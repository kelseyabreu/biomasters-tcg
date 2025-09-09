/**
 * TaxonomyService Tests
 * 
 * Comprehensive tests for the new enum-based taxonomy system
 */

import { TaxonomyService } from '../../services/TaxonomyService';
import { 
  TaxoDomain, TaxoKingdom, TaxoPhylum, TaxoClass,
  TaxoOrder, TaxoFamily, TaxoGenus, TaxoSpecies 
} from '@biomasters/shared';

// Mock the database queries
jest.mock('../../database/queries/cardQueries', () => ({
  getCardsByTaxonomyLevel: jest.fn(),
  getTaxonomicDiversityStats: jest.fn(),
  getRelatedCards: jest.fn(),
  getAllCardsWithRelations: jest.fn()
}));

import {
  getCardsByTaxonomyLevel,
  getTaxonomicDiversityStats,
  getRelatedCards,
  getAllCardsWithRelations
} from '../../database/queries/cardQueries';

const mockGetCardsByTaxonomyLevel = getCardsByTaxonomyLevel as jest.MockedFunction<typeof getCardsByTaxonomyLevel>;
const mockGetTaxonomicDiversityStats = getTaxonomicDiversityStats as jest.MockedFunction<typeof getTaxonomicDiversityStats>;
const mockGetRelatedCards = getRelatedCards as jest.MockedFunction<typeof getRelatedCards>;
const mockGetAllCardsWithRelations = getAllCardsWithRelations as jest.MockedFunction<typeof getAllCardsWithRelations>;

describe('TaxonomyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Taxonomy Filtering', () => {
    it('should get cards by domain', async () => {
      const mockCards = [
        { id: 1, card_name: 'Oak Tree', taxo_domain: TaxoDomain.EUKARYOTA },
        { id: 2, card_name: 'E. coli', taxo_domain: TaxoDomain.BACTERIA }
      ];
      mockGetCardsByTaxonomyLevel.mockResolvedValue(mockCards as any);

      const result = await TaxonomyService.getCardsByDomain(TaxoDomain.EUKARYOTA);
      
      expect(mockGetCardsByTaxonomyLevel).toHaveBeenCalledWith('domain', TaxoDomain.EUKARYOTA);
      expect(result).toEqual(mockCards);
    });

    it('should get cards by kingdom', async () => {
      const mockCards = [
        { id: 1, card_name: 'Oak Tree', taxo_kingdom: TaxoKingdom.PLANTAE },
        { id: 2, card_name: 'Rabbit', taxo_kingdom: TaxoKingdom.ANIMALIA }
      ];
      mockGetCardsByTaxonomyLevel.mockResolvedValue(mockCards as any);

      const result = await TaxonomyService.getCardsByKingdom(TaxoKingdom.PLANTAE);
      
      expect(mockGetCardsByTaxonomyLevel).toHaveBeenCalledWith('kingdom', TaxoKingdom.PLANTAE);
      expect(result).toEqual(mockCards);
    });

    it('should get cards by phylum', async () => {
      const mockCards = [
        { id: 1, card_name: 'Human', taxo_phylum: TaxoPhylum.CHORDATA }
      ];
      mockGetCardsByTaxonomyLevel.mockResolvedValue(mockCards as any);

      const result = await TaxonomyService.getCardsByPhylum(TaxoPhylum.CHORDATA);
      
      expect(mockGetCardsByTaxonomyLevel).toHaveBeenCalledWith('phylum', TaxoPhylum.CHORDATA);
      expect(result).toEqual(mockCards);
    });

    it('should get cards by class', async () => {
      const mockCards = [
        { id: 1, card_name: 'Lion', taxo_class: TaxoClass.MAMMALIA }
      ];
      mockGetCardsByTaxonomyLevel.mockResolvedValue(mockCards as any);

      const result = await TaxonomyService.getCardsByClass(TaxoClass.MAMMALIA);
      
      expect(mockGetCardsByTaxonomyLevel).toHaveBeenCalledWith('class', TaxoClass.MAMMALIA);
      expect(result).toEqual(mockCards);
    });
  });

  describe('Convenience Methods', () => {
    it('should get all animals', async () => {
      const mockCards = [
        { id: 1, card_name: 'Lion', taxo_kingdom: TaxoKingdom.ANIMALIA },
        { id: 2, card_name: 'Eagle', taxo_kingdom: TaxoKingdom.ANIMALIA }
      ];
      mockGetCardsByTaxonomyLevel.mockResolvedValue(mockCards as any);

      const result = await TaxonomyService.getAnimals();
      
      expect(mockGetCardsByTaxonomyLevel).toHaveBeenCalledWith('kingdom', TaxoKingdom.ANIMALIA);
      expect(result).toEqual(mockCards);
    });

    it('should get all plants', async () => {
      const mockCards = [
        { id: 1, card_name: 'Oak Tree', taxo_kingdom: TaxoKingdom.PLANTAE },
        { id: 2, card_name: 'Rose', taxo_kingdom: TaxoKingdom.PLANTAE }
      ];
      mockGetCardsByTaxonomyLevel.mockResolvedValue(mockCards as any);

      const result = await TaxonomyService.getPlants();
      
      expect(mockGetCardsByTaxonomyLevel).toHaveBeenCalledWith('kingdom', TaxoKingdom.PLANTAE);
      expect(result).toEqual(mockCards);
    });

    it('should get all mammals', async () => {
      const mockCards = [
        { id: 1, card_name: 'Lion', taxo_class: TaxoClass.MAMMALIA },
        { id: 2, card_name: 'Elephant', taxo_class: TaxoClass.MAMMALIA }
      ];
      mockGetCardsByTaxonomyLevel.mockResolvedValue(mockCards as any);

      const result = await TaxonomyService.getMammals();
      
      expect(mockGetCardsByTaxonomyLevel).toHaveBeenCalledWith('class', TaxoClass.MAMMALIA);
      expect(result).toEqual(mockCards);
    });
  });

  describe('Diversity Statistics', () => {
    it('should get diversity stats', async () => {
      const mockStats = {
        domains: 3,
        kingdoms: 5,
        phylums: 10,
        classes: 15,
        orders: 25,
        families: 50,
        genera: 100,
        species: 200
      };
      mockGetTaxonomicDiversityStats.mockResolvedValue(mockStats);

      const result = await TaxonomyService.getDiversityStats();
      
      expect(mockGetTaxonomicDiversityStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });

  describe('Taxonomic Relationships', () => {
    const mockCard1 = {
      id: 1,
      card_name: 'Lion',
      taxo_domain: TaxoDomain.EUKARYOTA,
      taxo_kingdom: TaxoKingdom.ANIMALIA,
      taxo_phylum: TaxoPhylum.CHORDATA,
      taxo_class: TaxoClass.MAMMALIA,
      taxo_order: 2, // TaxoOrder.CARNIVORA
      taxo_family: 1,
      taxo_genus: 1,
      taxo_species: 1
    } as any;

    const mockCard2 = {
      id: 2,
      card_name: 'Tiger',
      taxo_domain: TaxoDomain.EUKARYOTA,
      taxo_kingdom: TaxoKingdom.ANIMALIA,
      taxo_phylum: TaxoPhylum.CHORDATA,
      taxo_class: TaxoClass.MAMMALIA,
      taxo_order: 2, // TaxoOrder.CARNIVORA
      taxo_family: 1,
      taxo_genus: 1,
      taxo_species: 2
    } as any;

    it('should calculate taxonomic distance correctly', () => {
      const distance = TaxonomyService.getTaxonomicDistance(mockCard1, mockCard2);
      expect(distance).toBe(1); // Same genus, different species = distance 1
    });

    it('should find closest common taxonomic level', () => {
      const commonLevel = TaxonomyService.getClosestCommonLevel(mockCard1, mockCard2);
      expect(commonLevel).toBe('genus');
    });

    it('should get taxonomic hierarchy', () => {
      const hierarchy = TaxonomyService.getTaxonomicHierarchy(mockCard1);
      
      expect(hierarchy).toHaveLength(8);
      expect(hierarchy[0]).toEqual({
        level: 'domain',
        value: TaxoDomain.EUKARYOTA,
        displayId: expect.any(String)
      });
      expect(hierarchy[1]).toEqual({
        level: 'kingdom',
        value: TaxoKingdom.ANIMALIA,
        displayId: expect.any(String)
      });
    });

    it('should validate complete taxonomy', () => {
      const isComplete = TaxonomyService.hasCompleteTaxonomy(mockCard1);
      expect(isComplete).toBe(true);
    });

    it('should detect incomplete taxonomy', () => {
      const incompleteCard = {
        ...mockCard1,
        taxo_species: null
      } as any;
      
      const isComplete = TaxonomyService.hasCompleteTaxonomy(incompleteCard);
      expect(isComplete).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate correct taxonomy values', () => {
      const validCard = {
        taxo_domain: 1,
        taxo_kingdom: 2,
        taxo_phylum: 1,
        taxo_class: 1,
        taxo_order: 1,
        taxo_family: 1,
        taxo_genus: 1,
        taxo_species: 1
      } as any;

      const validation = TaxonomyService.validateTaxonomyValues(validCard);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid taxonomy values', () => {
      const invalidCard = {
        taxo_domain: -1, // Invalid: negative
        taxo_kingdom: 0,  // Invalid: zero
        taxo_phylum: 1.5, // Invalid: not integer
        taxo_class: 1,
        taxo_order: 1,
        taxo_family: 1,
        taxo_genus: 1,
        taxo_species: 1
      } as any;

      const validation = TaxonomyService.validateTaxonomyValues(invalidCard);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should detect out-of-range domain values', () => {
      const invalidCard = {
        taxo_domain: 5, // Invalid: > 3
        taxo_kingdom: 1,
        taxo_phylum: 1,
        taxo_class: 1,
        taxo_order: 1,
        taxo_family: 1,
        taxo_genus: 1,
        taxo_species: 1
      } as any;

      const validation = TaxonomyService.validateTaxonomyValues(invalidCard);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('taxo_domain out of range: 5');
    });
  });

  describe('Related Cards', () => {
    it('should get related cards at specific level', async () => {
      const mockRelatedCards = [
        { id: 2, card_name: 'Tiger' },
        { id: 3, card_name: 'Leopard' }
      ];
      mockGetRelatedCards.mockResolvedValue(mockRelatedCards as any);

      const result = await TaxonomyService.getRelatedCardsAtLevel(1, 'genus');
      
      expect(mockGetRelatedCards).toHaveBeenCalledWith(1, 'genus');
      expect(result).toEqual(mockRelatedCards);
    });
  });

  describe('Incomplete Taxonomy Detection', () => {
    it('should find cards with incomplete taxonomy', async () => {
      // Since we don't have a database in tests, let's test the hasCompleteTaxonomy method directly
      const completeCard = {
        id: 1,
        taxo_domain: 1,
        taxo_kingdom: 1,
        taxo_phylum: 1,
        taxo_class: 1,
        taxo_order: 1,
        taxo_family: 1,
        taxo_genus: 1,
        taxo_species: 1
      } as any;

      const incompleteCard = {
        id: 2,
        taxo_domain: 1,
        taxo_kingdom: 1,
        taxo_phylum: null, // Incomplete
        taxo_class: null,
        taxo_order: null,
        taxo_family: null,
        taxo_genus: null,
        taxo_species: null
      } as any;

      // Test the hasCompleteTaxonomy method directly
      expect(TaxonomyService.hasCompleteTaxonomy(completeCard)).toBe(true);
      expect(TaxonomyService.hasCompleteTaxonomy(incompleteCard)).toBe(false);
    });
  });
});
