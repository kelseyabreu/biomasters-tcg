/**
 * BioMasters TCG - Taxonomy API Client
 * 
 * Client-side service for interacting with taxonomy-enabled card endpoints.
 * Uses the new enum-based taxonomy system for filtering and browsing.
 */

import {
  TaxoDomain, TaxoKingdom, TaxoPhylum, TaxoClass,
  TaxoOrder, TaxoFamily, TaxoGenus, TaxoSpecies
} from '../../shared/enums';
import { CardData } from '../../shared/types';

export interface TaxonomyFilterParams {
  // Existing filters
  page?: number;
  limit?: number;
  search?: string;
  trophic_level?: number;
  trophic_category?: number;
  keyword?: number;
  
  // New taxonomy filters
  taxo_domain?: TaxoDomain;
  taxo_kingdom?: TaxoKingdom;
  taxo_phylum?: TaxoPhylum;
  taxo_class?: TaxoClass;
  taxo_order?: TaxoOrder;
  taxo_family?: TaxoFamily;
  taxo_genus?: TaxoGenus;
  taxo_species?: TaxoSpecies;
}

export interface CardsResponse {
  success: boolean;
  data: {
    cards: CardData[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: string;
  message?: string;
}

export interface DiversityStatsResponse {
  success: boolean;
  data: {
    domains: number;
    kingdoms: number;
    phylums: number;
    classes: number;
    orders: number;
    families: number;
    genera: number;
    species: number;
  };
  error?: string;
  message?: string;
}

export class TaxonomyApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get cards with taxonomy filtering
   */
  async getCards(params: TaxonomyFilterParams = {}): Promise<CardsResponse> {
    const queryParams = new URLSearchParams();
    
    // Add all parameters to query string
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    const url = `${this.baseUrl}/cards/database?${queryParams.toString()}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching cards:', error);
      throw error;
    }
  }

  /**
   * Get taxonomic diversity statistics
   */
  async getDiversityStats(): Promise<DiversityStatsResponse> {
    const url = `${this.baseUrl}/cards/diversity`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching diversity stats:', error);
      throw error;
    }
  }

  /**
   * Get all animals (Kingdom Animalia)
   */
  async getAnimals(params: Omit<TaxonomyFilterParams, 'taxo_kingdom'> = {}): Promise<CardsResponse> {
    return this.getCards({
      ...params,
      taxo_kingdom: TaxoKingdom.ANIMALIA
    });
  }

  /**
   * Get all plants (Kingdom Plantae)
   */
  async getPlants(params: Omit<TaxonomyFilterParams, 'taxo_kingdom'> = {}): Promise<CardsResponse> {
    return this.getCards({
      ...params,
      taxo_kingdom: TaxoKingdom.PLANTAE
    });
  }

  /**
   * Get all fungi (Kingdom Fungi)
   */
  async getFungi(params: Omit<TaxonomyFilterParams, 'taxo_kingdom'> = {}): Promise<CardsResponse> {
    return this.getCards({
      ...params,
      taxo_kingdom: TaxoKingdom.FUNGI
    });
  }

  /**
   * Get all bacteria (Domain Bacteria)
   */
  async getBacteria(params: Omit<TaxonomyFilterParams, 'taxo_domain'> = {}): Promise<CardsResponse> {
    return this.getCards({
      ...params,
      taxo_domain: TaxoDomain.BACTERIA
    });
  }

  /**
   * Get all mammals (Class Mammalia)
   */
  async getMammals(params: Omit<TaxonomyFilterParams, 'taxo_class'> = {}): Promise<CardsResponse> {
    return this.getCards({
      ...params,
      taxo_class: 1 as TaxoClass // TaxoClass.MAMMALIA
    });
  }

  /**
   * Get all birds (Class Aves)
   */
  async getBirds(params: Omit<TaxonomyFilterParams, 'taxo_class'> = {}): Promise<CardsResponse> {
    return this.getCards({
      ...params,
      taxo_class: 2 as TaxoClass // TaxoClass.AVES
    });
  }

  /**
   * Get all vertebrates (Phylum Chordata)
   */
  async getVertebrates(params: Omit<TaxonomyFilterParams, 'taxo_phylum'> = {}): Promise<CardsResponse> {
    return this.getCards({
      ...params,
      taxo_phylum: 1 as TaxoPhylum // TaxoPhylum.CHORDATA
    });
  }

  /**
   * Get all carnivores (Order Carnivora)
   */
  async getCarnivores(params: Omit<TaxonomyFilterParams, 'taxo_order'> = {}): Promise<CardsResponse> {
    return this.getCards({
      ...params,
      taxo_order: 2 as TaxoOrder // TaxoOrder.CARNIVORA
    });
  }

  /**
   * Get all primates (Order Primates)
   */
  async getPrimates(params: Omit<TaxonomyFilterParams, 'taxo_order'> = {}): Promise<CardsResponse> {
    return this.getCards({
      ...params,
      taxo_order: 1 as TaxoOrder // TaxoOrder.PRIMATES
    });
  }

  /**
   * Get cards by domain
   */
  async getCardsByDomain(domain: TaxoDomain, params: Omit<TaxonomyFilterParams, 'taxo_domain'> = {}): Promise<CardsResponse> {
    return this.getCards({
      ...params,
      taxo_domain: domain
    });
  }

  /**
   * Get cards by kingdom
   */
  async getCardsByKingdom(kingdom: TaxoKingdom, params: Omit<TaxonomyFilterParams, 'taxo_kingdom'> = {}): Promise<CardsResponse> {
    return this.getCards({
      ...params,
      taxo_kingdom: kingdom
    });
  }

  /**
   * Get cards by phylum
   */
  async getCardsByPhylum(phylum: TaxoPhylum, params: Omit<TaxonomyFilterParams, 'taxo_phylum'> = {}): Promise<CardsResponse> {
    return this.getCards({
      ...params,
      taxo_phylum: phylum
    });
  }

  /**
   * Get cards by class
   */
  async getCardsByClass(taxoClass: TaxoClass, params: Omit<TaxonomyFilterParams, 'taxo_class'> = {}): Promise<CardsResponse> {
    return this.getCards({
      ...params,
      taxo_class: taxoClass
    });
  }

  /**
   * Get cards by order
   */
  async getCardsByOrder(order: TaxoOrder, params: Omit<TaxonomyFilterParams, 'taxo_order'> = {}): Promise<CardsResponse> {
    return this.getCards({
      ...params,
      taxo_order: order
    });
  }

  /**
   * Get cards by family
   */
  async getCardsByFamily(family: TaxoFamily, params: Omit<TaxonomyFilterParams, 'taxo_family'> = {}): Promise<CardsResponse> {
    return this.getCards({
      ...params,
      taxo_family: family
    });
  }

  /**
   * Get cards by genus
   */
  async getCardsByGenus(genus: TaxoGenus, params: Omit<TaxonomyFilterParams, 'taxo_genus'> = {}): Promise<CardsResponse> {
    return this.getCards({
      ...params,
      taxo_genus: genus
    });
  }

  /**
   * Get cards by species
   */
  async getCardsBySpecies(species: TaxoSpecies, params: Omit<TaxonomyFilterParams, 'taxo_species'> = {}): Promise<CardsResponse> {
    return this.getCards({
      ...params,
      taxo_species: species
    });
  }

  /**
   * Search cards with text and optional taxonomy filters
   */
  async searchCards(searchTerm: string, taxonomyFilters: Partial<TaxonomyFilterParams> = {}): Promise<CardsResponse> {
    return this.getCards({
      ...taxonomyFilters,
      search: searchTerm
    });
  }
}

// Export a default instance
export const taxonomyApiClient = new TaxonomyApiClient();
