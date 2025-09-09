/**
 * CardId Mapping Utilities Unit Tests
 * Tests the conversion functions between species_name and CardId
 */

import {
  speciesNameToCardId_old,
  cardIdToSpeciesName_old,
  isValidCardId,
  isValidSpeciesName,
  getAllValidCardIds,
  getAllValidSpeciesNames
} from '../../utils/cardIdMapping';

describe('CardId Mapping Utilities', () => {
  describe('speciesNameToCardId_old', () => {
    test('should map starter pack species correctly', () => {
      expect(speciesNameToCardId_old('oak-tree')).toBe(1);
      expect(speciesNameToCardId_old('giant-kelp')).toBe(2);
      expect(speciesNameToCardId_old('grass')).toBe(3);
      expect(speciesNameToCardId_old('rabbit')).toBe(4);
      expect(speciesNameToCardId_old('fox')).toBe(53);
      expect(speciesNameToCardId_old('butterfly')).toBe(34);
    });

    test('should map both legacy and proper species names', () => {
      // Legacy vs proper mappings should point to same CardId
      expect(speciesNameToCardId_old('grass')).toBe(3);
      expect(speciesNameToCardId_old('reed-canary-grass')).toBe(3);

      expect(speciesNameToCardId_old('rabbit')).toBe(4);
      expect(speciesNameToCardId_old('european-rabbit')).toBe(4);

      expect(speciesNameToCardId_old('fox')).toBe(53);
      expect(speciesNameToCardId_old('red-fox')).toBe(53);

      expect(speciesNameToCardId_old('butterfly')).toBe(34);
      expect(speciesNameToCardId_old('monarch-butterfly')).toBe(34);
    });

    test('should map common animal names to specific species', () => {
      expect(speciesNameToCardId_old('bear')).toBe(6); // AMERICAN_BLACK_BEAR
      expect(speciesNameToCardId_old('deer')).toBe(47); // WHITETAILED_DEER
      expect(speciesNameToCardId_old('wolf')).toBe(96); // GRAY_WOLF
      expect(speciesNameToCardId_old('mouse')).toBe(73); // HOUSE_MOUSE
      expect(speciesNameToCardId_old('cat')).toBe(37); // DOMESTIC_CAT
      expect(speciesNameToCardId_old('dog')).toBe(48); // DOMESTIC_DOG
    });

    test('should map plant names correctly', () => {
      expect(speciesNameToCardId_old('apple-tree')).toBe(29);
      expect(speciesNameToCardId_old('corn')).toBe(42);
      expect(speciesNameToCardId_old('rice')).toBe(83);
      expect(speciesNameToCardId_old('sunflower')).toBe(90);
      expect(speciesNameToCardId_old('strawberry')).toBe(89);
    });

    test('should return null for unknown species', () => {
      expect(speciesNameToCardId_old('unknown-species')).toBeNull();
      expect(speciesNameToCardId_old('fake-animal')).toBeNull();
      expect(speciesNameToCardId_old('')).toBeNull();
      expect(speciesNameToCardId_old('123')).toBeNull();
    });

    test('should handle edge cases', () => {
      expect(speciesNameToCardId_old('caterpillar')).toBe(38); // MONARCH_CATERPILLAR
      expect(speciesNameToCardId_old('caterpillar_egg')).toBe(39); // BUTTERFLY_EGG (underscore)
      expect(speciesNameToCardId_old('water-buffalo')).toBe(94); // ASIAN_WATER_BUFFALO
    });
  });

  describe('cardIdToSpeciesName_old', () => {
    test('should reverse map CardIds to species names', () => {
      expect(cardIdToSpeciesName_old(1)).toBe('oak-tree');
      expect(cardIdToSpeciesName_old(2)).toBe('giant-kelp');
      expect(cardIdToSpeciesName_old(3)).toBe('grass'); // Should return first mapping found
      expect(cardIdToSpeciesName_old(4)).toBe('rabbit'); // Should return first mapping found
      expect(cardIdToSpeciesName_old(53)).toBe('fox'); // Should return first mapping found
      expect(cardIdToSpeciesName_old(34)).toBe('butterfly'); // Should return first mapping found
    });

    test('should map high CardIds correctly', () => {
      expect(cardIdToSpeciesName_old(96)).toBe('gray-wolf');
      expect(cardIdToSpeciesName_old(97)).toBe('plains-zebra');
      expect(cardIdToSpeciesName_old(95)).toBe('white-clover');
    });

    test('should return null for invalid CardIds', () => {
      expect(cardIdToSpeciesName_old(0)).toBeNull();
      expect(cardIdToSpeciesName_old(-1)).toBeNull();
      expect(cardIdToSpeciesName_old(999)).toBeNull();
      expect(cardIdToSpeciesName_old(1000)).toBeNull();
    });

    test('should handle gaps in CardId sequence', () => {
      // There might be gaps in the CardId sequence (e.g., 23, 24 might be missing)
      // The function should handle this gracefully
      expect(cardIdToSpeciesName_old(23)).toBeNull(); // Assuming this ID doesn't exist
      expect(cardIdToSpeciesName_old(24)).toBeNull(); // Assuming this ID doesn't exist
    });
  });

  describe('Bidirectional mapping consistency', () => {
    test('should maintain consistency for round-trip conversions', () => {
      const testSpecies = [
        'oak-tree', 'giant-kelp', 'grass', 'rabbit', 'fox', 'butterfly',
        'bear', 'deer', 'wolf', 'mouse', 'cat', 'dog'
      ];

      for (const species of testSpecies) {
        const cardId = speciesNameToCardId_old(species);
        if (cardId !== null) {
          const backToSpecies = cardIdToSpeciesName_old(cardId);
          expect(backToSpecies).toBeDefined();
          // Note: backToSpecies might not equal original species due to legacy mappings
          // but it should be a valid species name that maps back to the same CardId
          expect(speciesNameToCardId_old(backToSpecies!)).toBe(cardId);
        }
      }
    });

    test('should handle legacy name preferences correctly', () => {
      // When multiple species names map to same CardId, 
      // cardIdToSpeciesName should return a consistent one
      const cardId3 = speciesNameToCardId_old('grass');
      const cardId3Alt = speciesNameToCardId_old('reed-canary-grass');
      expect(cardId3).toBe(cardId3Alt);

      const reverseMapped = cardIdToSpeciesName_old(cardId3!);
      expect(reverseMapped).toBe('grass'); // Should prefer legacy name
    });
  });

  describe('Validation functions', () => {
    test('isValidCardId should validate CardIds correctly', () => {
      expect(isValidCardId(1)).toBe(true);
      expect(isValidCardId(34)).toBe(true);
      expect(isValidCardId(53)).toBe(true);
      expect(isValidCardId(97)).toBe(true);
      
      expect(isValidCardId(0)).toBe(false);
      expect(isValidCardId(-1)).toBe(false);
      expect(isValidCardId(999)).toBe(false);
    });

    test('isValidSpeciesName should validate species names correctly', () => {
      expect(isValidSpeciesName('oak-tree')).toBe(true);
      expect(isValidSpeciesName('grass')).toBe(true);
      expect(isValidSpeciesName('reed-canary-grass')).toBe(true);
      expect(isValidSpeciesName('butterfly')).toBe(true);
      
      expect(isValidSpeciesName('unknown-species')).toBe(false);
      expect(isValidSpeciesName('')).toBe(false);
      expect(isValidSpeciesName('123')).toBe(false);
    });
  });

  describe('Utility functions', () => {
    test('getAllValidCardIds should return sorted unique CardIds', () => {
      const cardIds = getAllValidCardIds();
      
      expect(Array.isArray(cardIds)).toBe(true);
      expect(cardIds.length).toBeGreaterThan(0);
      
      // Should be sorted
      for (let i = 1; i < cardIds.length; i++) {
        expect(cardIds[i]!).toBeGreaterThan(cardIds[i - 1]!);
      }
      
      // Should contain known CardIds
      expect(cardIds).toContain(1);
      expect(cardIds).toContain(34);
      expect(cardIds).toContain(53);
      expect(cardIds).toContain(97);
      
      // Should be unique (no duplicates)
      const uniqueCardIds = [...new Set(cardIds)];
      expect(cardIds.length).toBe(uniqueCardIds.length);
    });

    test('getAllValidSpeciesNames should return sorted species names', () => {
      const speciesNames = getAllValidSpeciesNames();
      
      expect(Array.isArray(speciesNames)).toBe(true);
      expect(speciesNames.length).toBeGreaterThan(0);
      
      // Should be sorted
      for (let i = 1; i < speciesNames.length; i++) {
        expect(speciesNames[i]!.localeCompare(speciesNames[i - 1]!)).toBeGreaterThan(0);
      }
      
      // Should contain known species names
      expect(speciesNames).toContain('oak-tree');
      expect(speciesNames).toContain('grass');
      expect(speciesNames).toContain('butterfly');
      expect(speciesNames).toContain('fox');
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle null and undefined inputs gracefully', () => {
      expect(speciesNameToCardId_old(null as any)).toBeNull();
      expect(speciesNameToCardId_old(undefined as any)).toBeNull();
      expect(cardIdToSpeciesName_old(null as any)).toBeNull();
      expect(cardIdToSpeciesName_old(undefined as any)).toBeNull();
    });

    test('should handle non-string inputs for species names', () => {
      expect(speciesNameToCardId_old(123 as any)).toBeNull();
      expect(speciesNameToCardId_old({} as any)).toBeNull();
      expect(speciesNameToCardId_old([] as any)).toBeNull();
    });

    test('should handle non-number inputs for CardIds', () => {
      expect(cardIdToSpeciesName_old('1' as any)).toBeNull();
      expect(cardIdToSpeciesName_old({} as any)).toBeNull();
      expect(cardIdToSpeciesName_old([] as any)).toBeNull();
    });

    test('should handle case sensitivity', () => {
      // Should be case sensitive
      expect(speciesNameToCardId_old('OAK-TREE')).toBeNull();
      expect(speciesNameToCardId_old('Oak-Tree')).toBeNull();
      expect(speciesNameToCardId_old('GRASS')).toBeNull();
    });

    test('should handle whitespace', () => {
      expect(speciesNameToCardId_old(' oak-tree ')).toBeNull();
      expect(speciesNameToCardId_old('oak-tree ')).toBeNull();
      expect(speciesNameToCardId_old(' oak-tree')).toBeNull();
    });
  });
});
