/**
 * TaxonomyApiClient Tests
 * 
 * Tests for the client-side taxonomy API integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaxonomyApiClient } from '../taxonomyApiClient';
import { TaxoDomain, TaxoKingdom, TaxoPhylum, TaxoClass } from '../../../shared/enums';

// Mock fetch globally
global.fetch = vi.fn();
const mockFetch = fetch as any;

describe('TaxonomyApiClient', () => {
  let client: TaxonomyApiClient;

  beforeEach(() => {
    client = new TaxonomyApiClient('/api');
    vi.clearAllMocks();
  });

  describe('Basic API Calls', () => {
    it('should get cards with no filters', async () => {
      const mockResponse = {
        success: true,
        data: {
          cards: [
            { cardId: 1, nameId: 'CARD_OAK_TREE' },
            { cardId: 2, nameId: 'CARD_GIANT_KELP' }
          ],
          total: 2,
          page: 1,
          limit: 50,
          totalPages: 1
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.getCards();

      expect(mockFetch).toHaveBeenCalledWith('/api/cards/database?');
      expect(result).toEqual(mockResponse);
    });

    it('should get cards with taxonomy filters', async () => {
      const mockResponse = {
        success: true,
        data: {
          cards: [
            { cardId: 1, nameId: 'CARD_OAK_TREE', taxoKingdom: TaxoKingdom.PLANTAE }
          ],
          total: 1,
          page: 1,
          limit: 50,
          totalPages: 1
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.getCards({
        taxo_kingdom: TaxoKingdom.PLANTAE,
        page: 1,
        limit: 10
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/cards/database?taxo_kingdom=6&page=1&limit=10');
      expect(result).toEqual(mockResponse);
    });

    it('should get diversity stats', async () => {
      const mockResponse = {
        success: true,
        data: {
          domains: 3,
          kingdoms: 5,
          phylums: 10,
          classes: 15,
          orders: 25,
          families: 50,
          genera: 100,
          species: 200
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.getDiversityStats();

      expect(mockFetch).toHaveBeenCalledWith('/api/cards/diversity');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Convenience Methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { cards: [], total: 0, page: 1, limit: 50, totalPages: 0 }
        })
      } as Response);
    });

    it('should get animals', async () => {
      await client.getAnimals();
      expect(mockFetch).toHaveBeenCalledWith('/api/cards/database?taxo_kingdom=1');
    });

    it('should get plants', async () => {
      await client.getPlants();
      expect(mockFetch).toHaveBeenCalledWith('/api/cards/database?taxo_kingdom=6');
    });

    it('should get fungi', async () => {
      await client.getFungi();
      expect(mockFetch).toHaveBeenCalledWith('/api/cards/database?taxo_kingdom=5');
    });

    it('should get bacteria', async () => {
      await client.getBacteria();
      expect(mockFetch).toHaveBeenCalledWith('/api/cards/database?taxo_domain=2');
    });

    it('should get mammals', async () => {
      await client.getMammals();
      expect(mockFetch).toHaveBeenCalledWith('/api/cards/database?taxo_class=1');
    });

    it('should get birds', async () => {
      await client.getBirds();
      expect(mockFetch).toHaveBeenCalledWith('/api/cards/database?taxo_class=2');
    });

    it('should get vertebrates', async () => {
      await client.getVertebrates();
      expect(mockFetch).toHaveBeenCalledWith('/api/cards/database?taxo_phylum=1');
    });

    it('should get carnivores', async () => {
      await client.getCarnivores();
      expect(mockFetch).toHaveBeenCalledWith('/api/cards/database?taxo_order=2');
    });

    it('should get primates', async () => {
      await client.getPrimates();
      expect(mockFetch).toHaveBeenCalledWith('/api/cards/database?taxo_order=1');
    });
  });

  describe('Specific Taxonomy Level Methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { cards: [], total: 0, page: 1, limit: 50, totalPages: 0 }
        })
      } as Response);
    });

    it('should get cards by domain', async () => {
      await client.getCardsByDomain(TaxoDomain.EUKARYOTA);
      expect(mockFetch).toHaveBeenCalledWith('/api/cards/database?taxo_domain=3');
    });

    it('should get cards by kingdom', async () => {
      await client.getCardsByKingdom(TaxoKingdom.ANIMALIA);
      expect(mockFetch).toHaveBeenCalledWith('/api/cards/database?taxo_kingdom=1');
    });

    it('should get cards by phylum', async () => {
      await client.getCardsByPhylum(TaxoPhylum.CHORDATA);
      expect(mockFetch).toHaveBeenCalledWith('/api/cards/database?taxo_phylum=6');
    });

    it('should get cards by class', async () => {
      await client.getCardsByClass(TaxoClass.MAMMALIA);
      expect(mockFetch).toHaveBeenCalledWith('/api/cards/database?taxo_class=21');
    });

    it('should pass additional parameters', async () => {
      await client.getCardsByKingdom(TaxoKingdom.PLANTAE, {
        page: 2,
        limit: 25,
        search: 'tree'
      });
      expect(mockFetch).toHaveBeenCalledWith('/api/cards/database?page=2&limit=25&search=tree&taxo_kingdom=6');
    });
  });

  describe('Search Functionality', () => {
    it('should search cards with text only', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { cards: [], total: 0, page: 1, limit: 50, totalPages: 0 }
        })
      } as Response);

      await client.searchCards('tree');
      expect(mockFetch).toHaveBeenCalledWith('/api/cards/database?search=tree');
    });

    it('should search cards with text and taxonomy filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { cards: [], total: 0, page: 1, limit: 50, totalPages: 0 }
        })
      } as Response);

      await client.searchCards('tree', {
        taxo_kingdom: TaxoKingdom.PLANTAE,
        page: 1,
        limit: 10
      });
      expect(mockFetch).toHaveBeenCalledWith('/api/cards/database?taxo_kingdom=6&page=1&limit=10&search=tree');
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          message: 'Invalid parameters'
        })
      } as Response);

      await expect(client.getCards()).rejects.toThrow('Invalid parameters');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.getCards()).rejects.toThrow('Network error');
    });

    it('should handle malformed responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false
        })
      } as Response);

      await expect(client.getCards()).rejects.toThrow('HTTP 500');
    });
  });

  describe('Parameter Handling', () => {
    it('should handle undefined and null parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { cards: [], total: 0, page: 1, limit: 50, totalPages: 0 }
        })
      } as Response);

      await client.getCards({
        page: undefined,
        limit: null as any,
        search: '',
        taxo_kingdom: TaxoKingdom.PLANTAE
      });

      // Should only include non-null/undefined values
      expect(mockFetch).toHaveBeenCalledWith('/api/cards/database?search=&taxo_kingdom=6');
    });

    it('should handle multiple taxonomy filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { cards: [], total: 0, page: 1, limit: 50, totalPages: 0 }
        })
      } as Response);

      await client.getCards({
        taxo_domain: TaxoDomain.EUKARYOTA,
        taxo_kingdom: TaxoKingdom.ANIMALIA,
        taxo_phylum: TaxoPhylum.CHORDATA,
        taxo_class: TaxoClass.MAMMALIA
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/cards/database?taxo_domain=3&taxo_kingdom=1&taxo_phylum=6&taxo_class=21');
    });
  });

  describe('URL Construction', () => {
    it('should construct URLs correctly with custom base URL', () => {
      const customClient = new TaxonomyApiClient('https://api.example.com');
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { cards: [], total: 0, page: 1, limit: 50, totalPages: 0 }
        })
      } as Response);

      customClient.getCards();
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/cards/database?');
    });

    it('should handle empty query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { cards: [], total: 0, page: 1, limit: 50, totalPages: 0 }
        })
      } as Response);

      await client.getCards({});
      expect(mockFetch).toHaveBeenCalledWith('/api/cards/database?');
    });
  });
});
