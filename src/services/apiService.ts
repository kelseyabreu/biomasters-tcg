/**
 * API Service Layer
 * Bridge between frontend JSON system and backend database
 */

import { Card as FrontendCard } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface BackendCard {
  id: string;
  archetype_name: string;
  common_name: string;
  scientific_name: string;
  card_data: {
    type: string;
    rarity: string;
    cost: number;
    attack: number;
    health: number;
    abilities: string[];
    description: string;
    flavor_text: string;
    habitat: string;
    diet: string;
    image_url: string;
    set: string;
    artist: string;
    taxonomy?: any;
    biological_data?: any;
    original_species_data?: any;
  };
}

export interface UserCollection {
  success: boolean;
  collection: Array<{
    species_name: string;  // Foreign key to JSON file
    quantity: number;
    acquired_via: string;
    first_acquired_at: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UserProfile {
  success: boolean;
  user: {
    id: string;
    username: string;
    email: string;
    eco_credits: number;
    xp_points: number;
    cards_owned?: number;
    decks_created?: number;
    created_at: string;
  };
}

class ApiService {
  private token: string | null = null;

  setAuthToken(token: string) {
    this.token = token;
  }

  getAuthToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Authentication - Updated to match backend endpoints
  async register(username: string): Promise<UserProfile> {
    // This should use guest registration flow instead
    throw new Error('Use guest registration flow instead');
  }

  async getProfile(): Promise<UserProfile> {
    return this.request<UserProfile>('/users/me');
  }

  // Collection Management
  async getUserCollection(page = 1, limit = 50, search?: string): Promise<UserCollection> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search) {
      params.append('search', search);
    }

    return this.request<UserCollection>(`/cards/collection?${params}`);
  }

  // Check if user owns a specific species
  async checkCardOwnership(speciesName: string): Promise<boolean> {
    try {
      const collection = await this.getUserCollection(1, 1000); // Get all cards
      return collection.collection.some(card => card.species_name === speciesName);
    } catch (error) {
      return false;
    }
  }

  // Get quantity of a specific species owned
  async getCardQuantity(speciesName: string): Promise<number> {
    try {
      const collection = await this.getUserCollection(1, 1000); // Get all cards
      const card = collection.collection.find(card => card.species_name === speciesName);
      return card?.quantity || 0;
    } catch (error) {
      return 0;
    }
  }

  async getCollectionStats(): Promise<any> {
    return this.request('/cards/collection/stats');
  }

  // Pack Opening
  async openPack(packType: 'basic' | 'premium' | 'legendary'): Promise<any> {
    return this.request('/cards/open-pack', {
      method: 'POST',
      body: JSON.stringify({ pack_type: packType }),
    });
  }

  // Deck Management
  async getUserDecks(): Promise<any> {
    return this.request('/decks');
  }

  async getDeck(deckId: string): Promise<any> {
    return this.request(`/decks/${deckId}`);
  }

  async createDeck(name: string, cards: Array<{ species_name: string }>): Promise<any> {
    return this.request('/decks', {
      method: 'POST',
      body: JSON.stringify({ name, cards }),
    });
  }

  async updateDeck(deckId: string, name: string): Promise<any> {
    return this.request(`/decks/${deckId}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async deleteDeck(deckId: string): Promise<any> {
    return this.request(`/decks/${deckId}`, {
      method: 'DELETE',
    });
  }

  // Card Data Bridge
  async getBackendCards(): Promise<BackendCard[]> {
    const response = await this.request<{ success: boolean; collection: BackendCard[] }>('/cards/collection');
    return response.collection || [];
  }

  /**
   * Convert backend card format to frontend card format
   * This preserves your existing frontend while adding backend features
   */
  convertBackendCardToFrontend(backendCard: BackendCard, speciesData?: any): FrontendCard {
    const cardData = backendCard.card_data;
    
    return {
      id: backendCard.id,
      speciesName: backendCard.archetype_name,
      commonName: backendCard.common_name,
      scientificName: backendCard.scientific_name,
      trophicRole: this.mapDietToTrophicRole(cardData.diet),
      habitat: this.mapHabitatToEnum(cardData.habitat),
      power: cardData.attack,
      health: cardData.health,
      maxHealth: cardData.health,
      speed: this.calculateSpeed(cardData.biological_data),
      senses: this.calculateSenses(cardData.biological_data),
      energyCost: cardData.cost,
      abilities: this.convertAbilities(cardData.abilities),
      conservationStatus: this.mapRarityToConservation(cardData.rarity),
      artwork: cardData.image_url,
      description: cardData.description,
      realData: {
        mass_kg: cardData.biological_data?.mass_kg,
        walk_Speed_m_per_hr: speciesData?.movement?.walk_Speed_m_per_hr,
        run_Speed_m_per_hr: speciesData?.movement?.run_Speed_m_per_hr,
        swim_Speed_m_per_hr: speciesData?.movement?.swim_Speed_m_per_hr,
        fly_Speed_m_per_hr: speciesData?.movement?.fly_Speed_m_per_hr,
        vision_range_m: speciesData?.perception?.vision_range_m,
        hearing_range_m: speciesData?.perception?.hearing_range_m,
        smell_range_m: speciesData?.perception?.smell_range_m,
        temperatureMinimum_C: speciesData?.environmentalResponse?.temperatureMinimum_C,
        temperatureMaximum_C: speciesData?.environmentalResponse?.temperatureMaximum_C,
        lifespan_Max_Days: cardData.biological_data?.lifespan_days,
        habitat: cardData.habitat,
      }
    };
  }

  private mapDietToTrophicRole(diet: string): any {
    // Map your backend diet to frontend TrophicRole enum
    const dietMap: Record<string, string> = {
      'Herbivore': 'Herbivore',
      'Carnivore': 'Carnivore', 
      'Omnivore': 'Omnivore',
      'Scavenger': 'Scavenger',
    };
    return dietMap[diet] || 'Omnivore';
  }

  private mapHabitatToEnum(habitat: string): any {
    // Map your backend habitat to frontend Habitat enum
    const habitatMap: Record<string, string> = {
      'Arctic': 'Tundra',
      'Forest': 'Temperate',
      'Desert': 'Temperate',
      'Terrestrial': 'Temperate',
      'Aquatic': 'Temperate',
      'Aerial': 'Temperate',
    };
    return habitatMap[habitat] || 'Temperate';
  }

  private calculateSpeed(bioData: any): number {
    // Calculate speed from biological data
    return Math.min(Math.max(Math.round((bioData?.metabolic_rate || 100) / 100), 1), 10);
  }

  private calculateSenses(bioData: any): number {
    // Calculate senses from biological data
    return Math.min(Math.max(Math.round((bioData?.mass_kg || 1) / 10), 1), 10);
  }

  private convertAbilities(abilities: string[]): any[] {
    // Convert backend abilities to frontend CardAbility format
    return abilities.map((ability, index) => ({
      id: `ability_${index}`,
      name: ability,
      description: `${ability} ability`,
      trigger: { type: 'play' as const },
      effect: { type: 'stat_modifier' as const, target: 'self' as const, value: 1 }
    }));
  }

  private mapRarityToConservation(rarity: string): any {
    // Map backend rarity to frontend ConservationStatus
    const rarityMap: Record<string, string> = {
      'Common': 'Least Concern',
      'Uncommon': 'Near Threatened',
      'Rare': 'Vulnerable',
      'Legendary': 'Endangered',
    };
    return rarityMap[rarity] || 'Least Concern';
  }
}

export const apiService = new ApiService();
export default apiService;
