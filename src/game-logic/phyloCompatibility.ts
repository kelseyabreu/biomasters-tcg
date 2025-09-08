import { Card, PhyloCompatibility, PhyloPlacementValidation } from '../types';

/**
 * Core compatibility checking system for Phylo domino-style gameplay
 */

/**
 * Checks if two cards share at least one terrain
 */
export function hasTerrainCompatibility(card1: Card, card2: Card): boolean {
  const terrains1 = card1.phyloAttributes?.terrains || [];
  const terrains2 = card2.phyloAttributes?.terrains || [];

  return terrains1.some(terrain => terrains2.includes(terrain));
}

/**
 * Checks if two cards share at least one climate
 */
export function hasClimateCompatibility(card1: Card, card2: Card): boolean {
  const climates1 = card1.phyloAttributes?.climates || [];
  const climates2 = card2.phyloAttributes?.climates || [];

  return climates1.some(climate => climates2.includes(climate));
}

/**
 * Checks environmental compatibility (both terrain and climate)
 */
export function hasEnvironmentalCompatibility(card1: Card, card2: Card): boolean {
  return hasTerrainCompatibility(card1, card2) && hasClimateCompatibility(card1, card2);
}

/**
 * Checks if a card can be placed adjacent to another based on foodchain rules
 */
export function hasFoodchainCompatibility(cardToPlace: Card, adjacentCard: Card): boolean {
  const foodchainLevel = cardToPlace.phyloAttributes?.foodchainLevel || 1;
  const adjacentLevel = adjacentCard.phyloAttributes?.foodchainLevel || 1;
  const dietType = cardToPlace.phyloAttributes?.dietType || 'Producer';
  const adjacentDietType = adjacentCard.phyloAttributes?.dietType || 'Producer';

  // Special case: HOME cards are compatible with FC#1 cards
  const isAdjacentHome = adjacentCard.phyloAttributes?.specialKeywords?.includes('HOME');
  if (isAdjacentHome && foodchainLevel === 1) {
    return true;
  }

  // FOODCHAIN #1 (Producers) can be placed anywhere (environmentally compatible)
  if (foodchainLevel === 1) {
    return true;
  }

  // FOODCHAIN #2 (Herbivores) must be adjacent to at least one FOODCHAIN #1
  if (foodchainLevel === 2) {
    return adjacentLevel === 1;
  }

  // FOODCHAIN #3 rules
  if (foodchainLevel === 3) {
    // Carnivores (red circle) - must be adjacent to FC#2 prey of equal or smaller scale
    if (dietType === 'Carnivore') {
      if (adjacentLevel === 2) {
        const cardScale = cardToPlace.phyloAttributes?.scale || 1;
        const adjacentScale = adjacentCard.phyloAttributes?.scale || 1;
        return cardScale >= adjacentScale; // Predator must be equal or larger
      }
      return false;
    }

    // Omnivores (brown circle) - can be adjacent to FC#2 (meat) or FC#1 (plant)
    if (dietType === 'Omnivore') {
      return adjacentLevel === 1 || adjacentLevel === 2;
    }
  }

  // FOODCHAIN #3+ (Carnivores and Omnivores)
  if (foodchainLevel >= 3) {
    if (dietType === 'Carnivore') {
      // Carnivores must eat prey of equal or smaller scale
      return adjacentLevel === foodchainLevel - 1 && hasScaleCompatibility(cardToPlace, adjacentCard);
    }

    if (dietType === 'Omnivore') {
      // Omnivores can eat plants (level 1) or appropriate prey
      return adjacentLevel === 1 ||
             (adjacentLevel === foodchainLevel - 1 && hasScaleCompatibility(cardToPlace, adjacentCard));
    }
  }

  return false;
}

/**
 * Checks scale compatibility for predator-prey relationships
 */
export function hasScaleCompatibility(predator: Card, prey: Card): boolean {
  const predatorScale = predator.phyloAttributes?.scale || 5;
  const preyScale = prey.phyloAttributes?.scale || 5;
  const preyDietType = prey.phyloAttributes?.dietType || 'Producer';

  // Herbivores can eat plants of any scale
  if (predator.phyloAttributes?.dietType === 'Herbivore' && preyDietType === 'Producer') {
    return true;
  }

  // Carnivores can only eat prey of equal or smaller scale
  if (predator.phyloAttributes?.dietType === 'Carnivore') {
    return predatorScale >= preyScale;
  }

  // Omnivores follow same scale rules as carnivores for meat
  if (predator.phyloAttributes?.dietType === 'Omnivore' && preyDietType !== 'Producer') {
    return predatorScale >= preyScale;
  }

  return true;
}

/**
 * Checks if a card is a HOME card (represents all terrains and climates)
 */
export function isHomeCard(card: Card): boolean {
  return card.nameId.toLowerCase().includes('home');
}

/**
 * Comprehensive compatibility check between two cards
 */
export function checkCardCompatibility(cardToPlace: Card, adjacentCard: Card): PhyloCompatibility {
  // HOME cards are compatible with everything
  if (isHomeCard(adjacentCard)) {
    return {
      environmental: true,
      foodchain: cardToPlace.phyloAttributes?.foodchainLevel === 1, // Only FOODCHAIN #1 can be placed next to HOME
      scale: true
    };
  }

  const environmental = hasEnvironmentalCompatibility(cardToPlace, adjacentCard);
  const foodchain = hasFoodchainCompatibility(cardToPlace, adjacentCard);
  const scale = hasScaleCompatibility(cardToPlace, adjacentCard);

  return {
    environmental,
    foodchain,
    scale
  };
}

/**
 * Validates if a card can be placed at a specific position
 */
export function validateCardPlacement(
  cardToPlace: Card,
  adjacentCards: Card[]
): PhyloPlacementValidation {
  if (adjacentCards.length === 0) {
    return {
      isValid: false,
      compatibility: { environmental: false, foodchain: false, scale: false },
      adjacentCards: [],
      errorMessage: 'Card must be placed adjacent to at least one other card'
    };
  }

  let hasValidConnection = false;
  const compatibilityResults: PhyloCompatibility[] = [];
  const validAdjacentCards: string[] = [];

  for (const adjacentCard of adjacentCards) {
    // Special case: HOME cards can accept any FC#1 card
    const isHomeCard = adjacentCard.phyloAttributes?.specialKeywords?.includes('HOME');
    const isFC1Card = cardToPlace.phyloAttributes?.foodchainLevel === 1;

    if (isHomeCard && isFC1Card) {
      hasValidConnection = true;
      validAdjacentCards.push(adjacentCard.id);
      compatibilityResults.push({ environmental: true, foodchain: true, scale: true });
      continue;
    }

    const compatibility = checkCardCompatibility(cardToPlace, adjacentCard);
    compatibilityResults.push(compatibility);

    // A card is valid if it has environmental compatibility AND either foodchain OR scale compatibility
    const isValidWithThisCard = compatibility.environmental &&
                               (compatibility.foodchain || compatibility.scale);

    if (isValidWithThisCard) {
      hasValidConnection = true;
      validAdjacentCards.push(adjacentCard.id);
    }
  }

  if (!hasValidConnection) {
    const errors: string[] = [];

    if (!compatibilityResults.some(c => c.environmental)) {
      errors.push('No environmental compatibility (terrain and climate must match)');
    }

    if (!compatibilityResults.some(c => c.foodchain)) {
      errors.push('No foodchain compatibility (check diet requirements)');
    }

    if (!compatibilityResults.some(c => c.scale)) {
      errors.push('No scale compatibility (predator must be larger than prey)');
    }

    return {
      isValid: false,
      compatibility: {
        environmental: compatibilityResults.some(c => c.environmental),
        foodchain: compatibilityResults.some(c => c.foodchain),
        scale: compatibilityResults.some(c => c.scale)
      },
      adjacentCards: validAdjacentCards,
      errorMessage: errors.join('; ')
    };
  }

  return {
    isValid: true,
    compatibility: {
      environmental: true,
      foodchain: true,
      scale: true
    },
    adjacentCards: validAdjacentCards
  };
}