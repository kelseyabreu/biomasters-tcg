// D100 Probability System - Trait-Driven Biological Combat
// Uses 2d10 for 1-100% precise probability control with real biological data

import { Card } from '../types';

export interface CombatScenario {
  attacker: Card;
  defender: Card;
  environment: EnvironmentalConditions;
}

export interface EnvironmentalConditions {
  temperature: number; // Celsius
  humidity: number; // 0-100%
  lightLevel: 'bright' | 'dim' | 'dark';
  habitat: 'forest' | 'grassland' | 'desert' | 'wetland' | 'urban';
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  weather: 'clear' | 'rain' | 'snow' | 'storm';
}

export interface ProbabilityBreakdown {
  baseChance: number;
  speedModifier: number;
  sizeModifier: number;
  sensoryModifier: number;
  environmentalModifier: number;
  specialAbilities: number;
  finalProbability: number;
  outcome: 'critical_success' | 'success' | 'failure' | 'critical_failure';
}

/**
 * D100 Probability System using real biological traits
 */
export class D100ProbabilitySystem {
  
  /**
   * Roll 2d10 for 1-100 result
   */
  static rollD100(): number {
    const die1 = Math.floor(Math.random() * 10) + 1; // 1-10
    const die2 = Math.floor(Math.random() * 10) + 1; // 1-10
    
    // Convert to 1-100 range
    if (die1 === 10 && die2 === 10) return 100;
    return ((die1 - 1) * 10) + die2;
  }

  /**
   * Calculate predation success probability based on real biological traits
   */
  static calculatePredationProbability(scenario: CombatScenario): ProbabilityBreakdown {
    const { attacker, defender, environment } = scenario;
    
    // Base predation rates from real biology
    const baseChance = this.getBasePredationRate(attacker, defender);
    
    // Speed-based escape probability
    const speedModifier = this.calculateSpeedModifier(attacker, defender);
    
    // Size-based combat advantage
    const sizeModifier = this.calculateSizeModifier(attacker, defender);
    
    // Sensory advantage (detection vs. stealth)
    const sensoryModifier = this.calculateSensoryModifier(attacker, defender);
    
    // Environmental effects
    const environmentalModifier = this.calculateEnvironmentalModifier(scenario);
    
    // Special abilities
    const specialAbilities = this.calculateSpecialAbilities(attacker, defender);
    
    // Final probability calculation
    let finalProbability = baseChance + speedModifier + sizeModifier + 
                          sensoryModifier + environmentalModifier + specialAbilities;
    
    // Clamp to 1-99% (nothing is 0% or 100% in nature)
    finalProbability = Math.max(1, Math.min(99, finalProbability));
    
    return {
      baseChance,
      speedModifier,
      sizeModifier,
      sensoryModifier,
      environmentalModifier,
      specialAbilities,
      finalProbability,
      outcome: this.determineOutcome(this.rollD100(), finalProbability)
    };
  }

  /**
   * Base predation rates from real ecological data
   */
  private static getBasePredationRate(attacker: Card, defender: Card): number {
    // Real-world predation success rates
    const predatorPreyMatrix: Record<string, Record<string, number>> = {
      // Carnivore vs different prey types
      'wolf': { 'deer': 25, 'rabbit': 40, 'mouse': 60 },
      'fox': { 'rabbit': 35, 'mouse': 70, 'bird': 45 },
      'bear': { 'deer': 30, 'fish': 80, 'small_mammal': 50 }
    };

    // Default rates by trophic relationship
    const defaultRates: Record<string, number> = {
      'carnivore_vs_herbivore': 35,
      'carnivore_vs_omnivore': 25,
      'omnivore_vs_herbivore': 20,
      'large_vs_small': 45,
      'similar_size': 30
    };

    // Try specific predator-prey combination first
    const attackerName = attacker.nameId.toLowerCase();
    const defenderCategory = this.categorizePreySize(defender);
    
    if (predatorPreyMatrix[attackerName]?.[defenderCategory]) {
      return predatorPreyMatrix[attackerName][defenderCategory];
    }

    // Fall back to trophic relationship
    const relationship = `${attacker.trophicRole.toLowerCase()}_vs_${defender.trophicRole.toLowerCase()}`;
    if (defaultRates[relationship]) {
      return defaultRates[relationship];
    }

    // Size-based default
    const attackerMass = attacker.realData?.mass_kg || 1;
    const defenderMass = defender.realData?.mass_kg || 1;

    if (attackerMass > defenderMass * 2) {
      return defaultRates['large_vs_small'];
    }

    return defaultRates['similar_size'];
  }

  /**
   * Speed-based escape probability
   * Faster prey has better escape chances
   */
  private static calculateSpeedModifier(attacker: Card, defender: Card): number {
    const attackerSpeed = attacker.realData?.run_Speed_m_per_hr || attacker.speed;
    const defenderSpeed = defender.realData?.run_Speed_m_per_hr || defender.speed;
    
    const speedRatio = defenderSpeed / attackerSpeed;
    
    if (speedRatio > 2.0) return -30; // Much faster prey
    if (speedRatio > 1.5) return -20; // Faster prey
    if (speedRatio > 1.2) return -10; // Slightly faster prey
    if (speedRatio < 0.5) return +15; // Much slower prey
    if (speedRatio < 0.8) return +10; // Slower prey
    
    return 0; // Similar speeds
  }

  /**
   * Size-based combat modifier
   * Larger predators have advantages, but diminishing returns
   */
  private static calculateSizeModifier(attacker: Card, defender: Card): number {
    const attackerMass = attacker.realData?.mass_kg || 1;
    const defenderMass = defender.realData?.mass_kg || 1;
    
    const massRatio = attackerMass / defenderMass;
    
    if (massRatio > 50) return +25; // Massive size advantage
    if (massRatio > 20) return +20; // Very large advantage
    if (massRatio > 10) return +15; // Large advantage
    if (massRatio > 5) return +10;  // Moderate advantage
    if (massRatio > 2) return +5;   // Small advantage
    if (massRatio < 0.1) return -20; // David vs Goliath (tiny prey)
    if (massRatio < 0.5) return -10; // Smaller predator
    
    return 0; // Similar sizes
  }

  /**
   * Sensory advantage calculation
   * Better senses improve hunting success
   */
  private static calculateSensoryModifier(attacker: Card, defender: Card): number {
    const attackerSenses = Math.max(
      attacker.realData?.vision_range_m || 0,
      attacker.realData?.hearing_range_m || 0,
      attacker.senses
    );
    
    const defenderSenses = Math.max(
      defender.realData?.vision_range_m || 0,
      defender.realData?.hearing_range_m || 0,
      defender.senses
    );
    
    const sensoryRatio = attackerSenses / defenderSenses;
    
    if (sensoryRatio > 3.0) return +15; // Much better senses
    if (sensoryRatio > 2.0) return +10; // Better senses
    if (sensoryRatio > 1.5) return +5;  // Slightly better
    if (sensoryRatio < 0.5) return -10; // Prey has better senses
    
    return 0; // Similar sensory capabilities
  }

  /**
   * Environmental modifiers based on habitat and conditions
   */
  private static calculateEnvironmentalModifier(scenario: CombatScenario): number {
    const { attacker, defender, environment } = scenario;
    let modifier = 0;

    // Habitat matching
    if (attacker.habitat.toLowerCase() === environment.habitat) {
      modifier += 10; // Home field advantage
    }
    if (defender.habitat.toLowerCase() === environment.habitat) {
      modifier -= 5; // Defender knows terrain
    }

    // Temperature effects
    const attackerTempRange = this.getTemperatureRange(attacker);
    const defenderTempRange = this.getTemperatureRange(defender);
    
    if (this.isInOptimalRange(environment.temperature, attackerTempRange)) {
      modifier += 5;
    }
    if (this.isInOptimalRange(environment.temperature, defenderTempRange)) {
      modifier -= 5;
    }

    // Weather effects
    switch (environment.weather) {
      case 'rain':
        modifier -= 5; // Harder to hunt in rain
        break;
      case 'snow':
        modifier -= 10; // Difficult conditions
        break;
      case 'storm':
        modifier -= 15; // Very difficult
        break;
    }

    // Light level effects
    switch (environment.lightLevel) {
      case 'dim':
        modifier -= 5; // Harder to see
        break;
      case 'dark':
        modifier -= 10; // Much harder to hunt
        break;
    }

    return modifier;
  }

  /**
   * Special abilities modifier
   */
  private static calculateSpecialAbilities(attacker: Card, defender: Card): number {
    let modifier = 0;

    // Check attacker abilities
    attacker.abilities.forEach(ability => {
      if (ability.name.toLowerCase().includes('pack')) modifier += 10;
      if (ability.name.toLowerCase().includes('stealth')) modifier += 15;
      if (ability.name.toLowerCase().includes('ambush')) modifier += 20;
    });

    // Check defender abilities
    defender.abilities.forEach(ability => {
      if (ability.name.toLowerCase().includes('escape')) modifier -= 15;
      if (ability.name.toLowerCase().includes('armor')) modifier -= 10;
      if (ability.name.toLowerCase().includes('warning')) modifier -= 5;
    });

    return modifier;
  }

  /**
   * Determine outcome based on roll and probability
   */
  private static determineOutcome(roll: number, probability: number): ProbabilityBreakdown['outcome'] {
    if (roll <= 5) return 'critical_failure'; // 5% chance of disaster
    if (roll >= 96) return 'critical_success'; // 5% chance of perfect outcome
    if (roll <= probability) return 'success';
    return 'failure';
  }

  /**
   * Helper functions
   */
  private static categorizePreySize(prey: Card): string {
    const mass = prey.realData?.mass_kg || 1;
    if (mass < 0.1) return 'tiny';
    if (mass < 1) return 'small';
    if (mass < 10) return 'medium';
    if (mass < 100) return 'large';
    return 'huge';
  }

  private static getTemperatureRange(card: Card): { min: number; max: number } {
    return {
      min: card.realData?.temperatureMinimum_C || -10,
      max: card.realData?.temperatureMaximum_C || 40
    };
  }

  private static isInOptimalRange(temp: number, range: { min: number; max: number }): boolean {
    const optimal = (range.min + range.max) / 2;
    const tolerance = (range.max - range.min) / 4;
    return Math.abs(temp - optimal) <= tolerance;
  }
}

/**
 * Educational probability display for players
 */
export function explainProbabilityCalculation(breakdown: ProbabilityBreakdown): string {
  return `
🎲 Combat Probability Breakdown:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Base Success Rate: ${breakdown.baseChance}%
Speed Advantage: ${breakdown.speedModifier > 0 ? '+' : ''}${breakdown.speedModifier}%
Size Advantage: ${breakdown.sizeModifier > 0 ? '+' : ''}${breakdown.sizeModifier}%
Sensory Advantage: ${breakdown.sensoryModifier > 0 ? '+' : ''}${breakdown.sensoryModifier}%
Environmental: ${breakdown.environmentalModifier > 0 ? '+' : ''}${breakdown.environmentalModifier}%
Special Abilities: ${breakdown.specialAbilities > 0 ? '+' : ''}${breakdown.specialAbilities}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Final Probability: ${breakdown.finalProbability}%
Outcome: ${breakdown.outcome.replace('_', ' ').toUpperCase()}
  `.trim();
}

/**
 * Test the D100 probability system with sample scenarios
 */
export function testD100System(cards: Card[]): void {
  console.log('🎲 Testing D100 Probability System...');

  if (cards.length < 2) {
    console.log('❌ Need at least 2 cards to test combat');
    return;
  }

  // Find some interesting matchups
  const wolf = cards.find(c => c.nameId.includes('wolf'));
  const rabbit = cards.find(c => c.nameId.includes('rabbit'));
  const bear = cards.find(c => c.nameId.includes('bear'));
  const mouse = cards.find(c => c.nameId.includes('mouse'));

  const environment: EnvironmentalConditions = {
    temperature: 15,
    humidity: 60,
    lightLevel: 'bright',
    habitat: 'forest',
    season: 'summer',
    weather: 'clear'
  };

  // Test scenarios
  const scenarios = [
    { name: 'Wolf vs Rabbit', attacker: wolf, defender: rabbit },
    { name: 'Bear vs Mouse', attacker: bear, defender: mouse },
    { name: 'Rabbit vs Mouse', attacker: rabbit, defender: mouse }
  ].filter(s => s.attacker && s.defender);

  scenarios.forEach(scenario => {
    console.log(`\n🥊 ${scenario.name}:`);
    const breakdown = D100ProbabilitySystem.calculatePredationProbability({
      attacker: scenario.attacker!,
      defender: scenario.defender!,
      environment
    });

    console.log(explainProbabilityCalculation(breakdown));
  });

  // Test multiple rolls to show distribution
  if (wolf && rabbit) {
    console.log('\n📊 Testing 10 Wolf vs Rabbit encounters:');
    for (let i = 0; i < 10; i++) {
      const roll = D100ProbabilitySystem.rollD100();
      const breakdown = D100ProbabilitySystem.calculatePredationProbability({
        attacker: wolf,
        defender: rabbit,
        environment
      });
      const success = roll <= breakdown.finalProbability;
      console.log(`Roll ${i + 1}: ${roll}/100 (${breakdown.finalProbability}%) = ${success ? 'SUCCESS' : 'FAILURE'}`);
    }
  }
}

// Make test function available globally
if (typeof window !== 'undefined') {
  (window as any).testD100System = testD100System;
}
