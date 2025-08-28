import { describe, it, expect, beforeEach } from 'vitest';
import { 
  roll2d10, 
  hasTrophicAdvantage, 
  calculateCombatModifiers, 
  resolveCombat,
  simulateCombat 
} from '../combatSystem';
import { Card, TrophicRole, Habitat } from '../../types';

// Mock card data for testing
const mockWolf: Card = {
  id: 'wolf-1',
  speciesName: 'wolf',
  commonName: 'Gray Wolf',
  scientificName: 'Canis lupus',
  trophicRole: TrophicRole.CARNIVORE,
  habitat: Habitat.TEMPERATE,
  power: 4,
  health: 35,
  maxHealth: 35,
  speed: 6,
  senses: 200,
  energyCost: 3,
  abilities: [],
  conservationStatus: 'Least Concern' as any,
  artwork: '',
  description: 'A powerful carnivore'
};

const mockRabbit: Card = {
  id: 'rabbit-1',
  speciesName: 'rabbit',
  commonName: 'European Rabbit',
  scientificName: 'Oryctolagus cuniculus',
  trophicRole: TrophicRole.HERBIVORE,
  habitat: Habitat.TEMPERATE,
  power: 1,
  health: 2,
  maxHealth: 2,
  speed: 4,
  senses: 100,
  energyCost: 1,
  abilities: [],
  conservationStatus: 'Least Concern' as any,
  artwork: '',
  description: 'A quick herbivore'
};

const mockGrass: Card = {
  id: 'grass-1',
  speciesName: 'grass',
  commonName: 'Perennial Ryegrass',
  scientificName: 'Lolium perenne',
  trophicRole: TrophicRole.PRODUCER,
  habitat: Habitat.TEMPERATE,
  power: 1,
  health: 1,
  maxHealth: 1,
  speed: 0,
  senses: 1,
  energyCost: 1,
  abilities: [],
  conservationStatus: 'Least Concern' as any,
  artwork: '',
  description: 'A basic producer'
};

describe('Combat System', () => {
  describe('roll2d10', () => {
    it('should return a number between 1 and 100', () => {
      for (let i = 0; i < 100; i++) {
        const roll = roll2d10();
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(100);
      }
    });

    it('should produce different results over multiple rolls', () => {
      const rolls = Array.from({ length: 20 }, () => roll2d10());
      const uniqueRolls = new Set(rolls);
      expect(uniqueRolls.size).toBeGreaterThan(1);
    });
  });

  describe('hasTrophicAdvantage', () => {
    it('should return true for carnivore vs herbivore', () => {
      expect(hasTrophicAdvantage(mockWolf, mockRabbit)).toBe(true);
    });

    it('should return true for herbivore vs producer', () => {
      expect(hasTrophicAdvantage(mockRabbit, mockGrass)).toBe(true);
    });

    it('should return false for same trophic level', () => {
      expect(hasTrophicAdvantage(mockWolf, mockWolf)).toBe(false);
    });

    it('should return false for reverse advantage', () => {
      expect(hasTrophicAdvantage(mockRabbit, mockWolf)).toBe(false);
    });
  });

  describe('calculateCombatModifiers', () => {
    it('should include trophic advantage modifier', () => {
      const modifiers = calculateCombatModifiers(
        mockWolf, 
        mockRabbit, 
        Habitat.TEMPERATE
      );
      
      const trophicMod = modifiers.find(m => m.type === 'trophic_advantage');
      expect(trophicMod).toBeDefined();
      expect(trophicMod?.value).toBe(10);
    });

    it('should include speed advantage modifier', () => {
      const modifiers = calculateCombatModifiers(
        mockWolf, 
        mockRabbit, 
        Habitat.TEMPERATE
      );
      
      const speedMod = modifiers.find(m => m.type === 'speed_advantage');
      expect(speedMod).toBeDefined();
      expect(speedMod?.value).toBe(20);
    });

    it('should include senses advantage modifier', () => {
      const modifiers = calculateCombatModifiers(
        mockWolf, 
        mockRabbit, 
        Habitat.TEMPERATE
      );
      
      const sensesMod = modifiers.find(m => m.type === 'senses_advantage');
      expect(sensesMod).toBeDefined();
      expect(sensesMod?.value).toBe(15);
    });

    it('should include habitat match modifier', () => {
      const modifiers = calculateCombatModifiers(
        mockWolf, 
        mockRabbit, 
        Habitat.TEMPERATE
      );
      
      const habitatMod = modifiers.find(m => m.type === 'habitat_match');
      expect(habitatMod).toBeDefined();
      expect(habitatMod?.value).toBe(15);
    });

    it('should not include habitat modifier for wrong environment', () => {
      const modifiers = calculateCombatModifiers(
        mockWolf, 
        mockRabbit, 
        Habitat.TROPICAL
      );
      
      const habitatMod = modifiers.find(m => m.type === 'habitat_match');
      expect(habitatMod).toBeUndefined();
    });
  });

  describe('resolveCombat', () => {
    it('should return a valid combat result', () => {
      const result = resolveCombat(
        mockWolf,
        mockRabbit,
        Habitat.TEMPERATE
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('roll');
      expect(result).toHaveProperty('finalChance');
      expect(result).toHaveProperty('modifiers');
      expect(result).toHaveProperty('damage');
      expect(result).toHaveProperty('defenderDestroyed');

      expect(typeof result.success).toBe('boolean');
      expect(result.roll).toBeGreaterThanOrEqual(1);
      expect(result.roll).toBeLessThanOrEqual(100);
      expect(result.finalChance).toBeGreaterThanOrEqual(5);
      expect(result.finalChance).toBeLessThanOrEqual(95);
    });

    it('should deal damage equal to attacker power on success', () => {
      // Mock a successful roll
      const originalRoll = roll2d10;
      (global as any).roll2d10 = () => 1; // Force success

      const result = resolveCombat(
        mockWolf,
        mockRabbit,
        Habitat.TEMPERATE
      );

      if (result.success) {
        expect(result.damage).toBe(mockWolf.power);
      }

      // Restore original function
      (global as any).roll2d10 = originalRoll;
    });

    it('should deal no damage on failure', () => {
      // Mock a failed roll
      const originalRoll = roll2d10;
      (global as any).roll2d10 = () => 100; // Force failure

      const result = resolveCombat(
        mockWolf,
        mockRabbit,
        Habitat.TEMPERATE
      );

      if (!result.success) {
        expect(result.damage).toBe(0);
      }

      // Restore original function
      (global as any).roll2d10 = originalRoll;
    });
  });

  describe('simulateCombat', () => {
    it('should return simulation results', () => {
      const simulation = simulateCombat(
        mockWolf,
        mockRabbit,
        Habitat.TEMPERATE,
        [],
        100
      );

      expect(simulation).toHaveProperty('winRate');
      expect(simulation).toHaveProperty('averageDamage');
      expect(simulation.winRate).toBeGreaterThanOrEqual(0);
      expect(simulation.winRate).toBeLessThanOrEqual(1);
      expect(simulation.averageDamage).toBeGreaterThanOrEqual(0);
    });

    it('should show higher win rate for advantaged attacker', () => {
      const wolfVsRabbit = simulateCombat(
        mockWolf,
        mockRabbit,
        Habitat.TEMPERATE,
        [],
        1000
      );

      const rabbitVsWolf = simulateCombat(
        mockRabbit,
        mockWolf,
        Habitat.TEMPERATE,
        [],
        1000
      );

      expect(wolfVsRabbit.winRate).toBeGreaterThan(rabbitVsWolf.winRate);
    });
  });
});
