import { Card, CombatResult, CombatModifier, TrophicRole, Habitat } from '../types';

/**
 * Generates a 2d10 roll (1-100)
 */
export function roll2d10(): number {
  const die1 = Math.floor(Math.random() * 10) + 1;
  const die2 = Math.floor(Math.random() * 10) + 1;
  return (die1 - 1) * 10 + die2;
}

/**
 * Determines if attacker has trophic advantage over defender
 */
export function hasTrophicAdvantage(attacker: Card, defender: Card): boolean {
  const { trophicRole: attackerRole } = attacker;
  const { trophicRole: defenderRole } = defender;
  
  // Carnivore vs Herbivore
  if (attackerRole === TrophicRole.CARNIVORE && defenderRole === TrophicRole.HERBIVORE) {
    return true;
  }

  // Omnivore vs Herbivore (can hunt)
  if (attackerRole === TrophicRole.OMNIVORE && defenderRole === TrophicRole.HERBIVORE) {
    return true;
  }

  // Omnivore vs Producer (can graze)
  if (attackerRole === TrophicRole.OMNIVORE && defenderRole === TrophicRole.PRODUCER) {
    return true;
  }

  // Herbivore vs Producer
  if (attackerRole === TrophicRole.HERBIVORE && defenderRole === TrophicRole.PRODUCER) {
    return true;
  }

  // Detritivore vs any dead/weakened target (feeds on organic matter)
  if (attackerRole === TrophicRole.DETRITIVORE) {
    return defender.health < defender.maxHealth * 0.7;
  }

  // Decomposer vs any dead/weakened target (simplified)
  if (attackerRole === TrophicRole.DECOMPOSER) {
    return defender.health < defender.maxHealth * 0.5;
  }
  
  return false;
}

/**
 * Calculates all combat modifiers for an attack
 */
export function calculateCombatModifiers(
  attacker: Card,
  defender: Card,
  environment: Habitat,
  friendlyCards: Card[] = []
): CombatModifier[] {
  const modifiers: CombatModifier[] = [];
  
  // Trophic advantage: +60% base success rate vs 50%
  if (hasTrophicAdvantage(attacker, defender)) {
    modifiers.push({
      type: 'trophic_advantage',
      value: 10, // 60% vs 50% base
      description: 'Trophic advantage'
    });
  }
  
  // Speed advantage: +20% if attacker speed > defender speed
  if (attacker.speed > defender.speed) {
    modifiers.push({
      type: 'speed_advantage',
      value: 20,
      description: `Speed advantage (${attacker.speed} vs ${defender.speed})`
    });
  }
  
  // Senses advantage: +15% if attacker senses > defender senses
  if (attacker.senses > defender.senses) {
    modifiers.push({
      type: 'senses_advantage',
      value: 15,
      description: `Senses advantage (${attacker.senses} vs ${defender.senses})`
    });
  }
  
  // Habitat match: +15% if attacker matches environment
  if (attacker.habitat === environment) {
    modifiers.push({
      type: 'habitat_match',
      value: 15,
      description: `Habitat match (${environment})`
    });
  }
  
  // Pack hunting for wolves
  if (attacker.nameId === 'wolf') {
    const otherCarnivores = friendlyCards.filter(card => 
      card.trophicRole === TrophicRole.CARNIVORE && card.cardId !== attacker.cardId
    );
    if (otherCarnivores.length > 0) {
      modifiers.push({
        type: 'ability',
        value: 15,
        description: 'Pack hunting'
      });
    }
  }
  
  // Keen senses ability
  const keenSensesAbility = attacker.abilities.find(ability => 
    ability.name === 'Keen Senses'
  );
  if (keenSensesAbility && defender.senses < 60) {
    modifiers.push({
      type: 'ability',
      value: 20,
      description: 'Keen senses vs low-sense target'
    });
  }
  
  return modifiers;
}

/**
 * Resolves combat between two cards
 */
export function resolveCombat(
  attacker: Card,
  defender: Card,
  environment: Habitat,
  friendlyCards: Card[] = []
): CombatResult {
  // Calculate base success rate
  let baseSuccessRate = hasTrophicAdvantage(attacker, defender) ? 60 : 50;
  
  // Calculate modifiers
  const modifiers = calculateCombatModifiers(attacker, defender, environment, friendlyCards);
  
  // Apply modifiers
  const modifierTotal = modifiers.reduce((sum, mod) => sum + mod.value, 0);
  const finalChance = Math.min(95, Math.max(5, baseSuccessRate + modifierTotal));
  
  // Roll for success
  const roll = roll2d10();
  const success = roll <= finalChance;
  
  // Calculate damage
  let damage = 0;
  let defenderDestroyed = false;
  
  if (success) {
    damage = attacker.power;
    
    // Apply damage to defender
    const newHealth = defender.health - damage;
    defenderDestroyed = newHealth <= 0;
  }
  
  return {
    success,
    roll,
    finalChance,
    modifiers,
    damage,
    defenderDestroyed
  };
}

/**
 * Checks if a card can attack another card
 */
export function canAttack(attacker: Card, defender: Card): boolean {
  // Flight ability check
  const flightAbility = defender.abilities.find(ability => ability.name === 'Flight');
  if (flightAbility) {
    const attackerHasFlight = attacker.abilities.some(ability => ability.name === 'Flight');
    if (!attackerHasFlight) {
      return false; // Cannot attack flying creatures without flight
    }
  }
  
  // Basic checks
  if (attacker.health <= 0 || defender.health <= 0) {
    return false;
  }
  
  return true;
}

/**
 * Applies combat damage to a card
 */
export function applyDamage(card: Card, damage: number): Card {
  const newHealth = Math.max(0, card.health - damage);
  return {
    ...card,
    health: newHealth
  };
}

/**
 * Heals a card
 */
export function healCard(card: Card, healAmount: number): Card {
  const newHealth = Math.min(card.maxHealth, card.health + healAmount);
  return {
    ...card,
    health: newHealth
  };
}

/**
 * Checks if a card is destroyed (health <= 0)
 */
export function isCardDestroyed(card: Card): boolean {
  return card.health <= 0;
}

/**
 * Gets the effective power of a card (including temporary modifiers)
 */
export function getEffectivePower(card: Card, modifiers: CombatModifier[] = []): number {
  let power = card.power;
  
  // Apply power modifiers from abilities or effects
  modifiers.forEach(modifier => {
    if (modifier.type === 'ability' && modifier.description.includes('power')) {
      power += modifier.value;
    }
  });
  
  return Math.max(1, power);
}

/**
 * Simulates combat for AI decision making
 */
export function simulateCombat(
  attacker: Card,
  defender: Card,
  environment: Habitat,
  friendlyCards: Card[] = [],
  iterations: number = 1000
): { winRate: number; averageDamage: number } {
  let wins = 0;
  let totalDamage = 0;
  
  for (let i = 0; i < iterations; i++) {
    const result = resolveCombat(attacker, defender, environment, friendlyCards);
    if (result.success) {
      wins++;
      totalDamage += result.damage;
    }
  }
  
  return {
    winRate: wins / iterations,
    averageDamage: totalDamage / iterations
  };
}
