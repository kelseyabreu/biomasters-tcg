// ecosystem-trait-component.js - Component-Based Trait System

import { AcquisitionCalculations } from './core/AcquisitionCalculations.js';
console.log('Loading component-based trait system...');

// ===== ENUMS  =====

// ===== THREE-TIER COGNITIVE ARCHITECTURE ENUMS =====

// Macro-State Enum - Strategic Goals (GoalPlanningSystem)
const EMacroState = {
    Foraging: 'Foraging',       // Seeking food/energy
    Fleeing: 'Fleeing',         // Escaping threats
    SeekingWater: 'SeekingWater', // Finding water sources
    Resting: 'Resting',         // Recovery/sleep/dormancy
    Mating: 'Mating',           // Reproduction behavior
    Socializing: 'Socializing', // Social interactions (non-mating)
    Hunting: 'Hunting',         // Predatory behavior (for carnivores)
    ContestFood: 'ContestFood', // Intimidate or fight a rival to steal a claimed resource.
    ShareFood: 'ShareFood',     // Peacefully approach and eat from a resource claimed by another.
    Territorial: 'Territorial'  // Defending territory
};

// Micro-State Enum - Tactical Actions (BehaviorSystem)
const EMicroState = {
    // General movement/exploration
    Idling: 'Idling',           // Standing still, looking around
    Wandering: 'Wandering',     // Moving without specific target

    // Foraging tactics
    Searching: 'Searching',     // Looking for food
    MovingToFood: 'MovingToFood', // Traveling to known food
    Eating: 'Eating',           // Consuming food

    // Water-seeking tactics
    SearchingWater: 'SearchingWater', // Looking for water
    MovingToWater: 'MovingToWater',   // Traveling to water
    Drinking: 'Drinking',       // Consuming water

    // Threat response tactics
    Escaping: 'Escaping',       // Fleeing from threat
    Hiding: 'Hiding',           // Taking cover

    // Rest tactics
    Sleeping: 'Sleeping',       // Active sleep
    Resting: 'Resting',         // Passive rest
    Dormant: 'Dormant',         // Inactive state

    // Reproduction tactics
    Courting: 'Courting',       // Mating behavior
    NestBuilding: 'NestBuilding', // Preparing for offspring

    // Social tactics
    Approaching: 'Approaching', // Moving toward other organism
    Interacting: 'Interacting', // Social interaction

    // Hunting tactics (for predators)
    Stalking: 'Stalking',       // Following prey
    Attacking: 'Attacking',     // Engaging prey

    // Territory tactics
    Patrolling: 'Patrolling',   // Monitoring territory
    Defending: 'Defending'      // Active defense
};

const EMovementType = {
    Walk: 'Walk',
    Run: 'Run',
    Swim: 'Swim',
    SwimFast: 'SwimFast',
    Fly: 'Fly',
    Burrow: 'Burrow'
};

// Nutrient Type Enum 
const ENutrientType = {
    Carbon: 'Carbon',
    Nitrogen: 'Nitrogen',
    Phosphorus: 'Phosphorus',
    Potassium: 'Potassium',
    NonNPK: 'NonNPK'  // Other Nutrients
};

const ETrophicRole = {
    PRODUCER: 'Producer',
    CONSUMER: 'Consumer', 
    DECOMPOSER: 'Decomposer',
    HERBIVORE: 'Herbivore',
    CARNIVORE: 'Carnivore',
    OMNIVORE: 'Omnivore',
    DETRITIVORE: 'Detritivore',
    ENVIRONMENT: 'Environment',
    SCAVENGER: 'Scavenger',
    FILTERFEEDER: 'FilterFeeder',
    MIXOTROPH: 'Mixotroph',
    NONE: 'None'
};

// ADD this new lifecycle state component.
const ELifecycleState = {
    ACTIVE: 'ACTIVE',           // The entity is alive and functioning normally.
    TRANSFORMING: 'TRANSFORMING', // The entity is in a transitional state (e.g., a pupa).
    INACTIVE_SUCCESSOR: 'INACTIVE_SUCCESSOR', // The entity has been replaced and is now an alias.
    MARKED_FOR_CLEANUP: 'MARKED_FOR_CLEANUP' // Final state before destruction.
};

// Source System Enum - Identifies which system generated an event for logging
const ESourceSystem = Object.freeze({
    AgingSystem: 1,
    BehaviorSystem: 2,
    BiomeIdentificationSystem: 3,
    CleanupSystem: 4,
    ClimatologySystem: 5,
    DeathSystem: 6,
    DecompositionSystem: 7,
    DeltaApplicationSystem: 8,
    DetritivorySystem: 9,
    DiffusionSystem: 10,
    DigestionSystem: 11,
    DrinkingSystem: 12,
    EnvironmentalSystem: 13,
    EvolutionSystem: 14,
    ExternalEventsSystem: 15,
    FatigueSystem: 16,
    GeologicalSystem: 17,
    GoalPlanningSystem: 18,
    GrazingSystem: 19,
    GroupSystem: 20,
    InitializationSystem: 21,
    IntentGenerationSystem: 22,
    MetabolismSystem: 23,
    MovementSystem: 24,
    NitrogenFixationSystem: 25,
    NutrientCycleSystem: 26,
    NutrientUptakeSystem: 27,
    PhotosynthesisSystem: 28,
    PlayerSystem: 29,
    PredationSystem: 30,
    RenderingSystem: 31,
    RenderingSystemThree: 32,
    ReproductionSystem: 33,
    ScavengingSystem: 34,
    SpatialGridSystem: 35,
    StatisticsSystem: 36,
    TimerSystem: 37,
    UISystem: 38,
    WasteExcretionSystem: 39,
    WaterStorageSystem: 40,
    // Add any new systems here
});


// ===== THE DEFINITIVE 9 ACQUISITION METHODS =====
// These represent every fundamental way an organism can acquire energy and matter
const EAcquisitionMethod = {
    PHOTOSYNTHESIS: 'Photosynthesis',        // #1: Energy from sunlight
    ROOT_UPTAKE: 'Root_Uptake',              // #2: Inorganic nutrients from soil/water
    CHEMOSYNTHESIS: 'Chemosynthesis',        // #3: Energy from inorganic chemical reactions
    GRAZING: 'Grazing',                      // #4: Consuming living producers (plants/algae)
    PREDATION: 'Predation',                  // #5: Hunting and consuming living consumers
    CARRION_FEEDING: 'Carrion_Feeding',      // #6: Consuming large dead animal carcasses (Scavenging)
    DETRITIVORY: 'Detritivory',              // #7: Consuming small organic particles from soil/litter
    FILTERING: 'Filtering',                  // #8: Acquiring suspended organic particles from medium
    PARASITISM: 'Parasitism',                // #9: Acquiring nutrients from a living host
    SYMBIOTIC_TRADE: 'Symbiotic_Trade',      // #10: Acquiring nutrients via direct trade with another
    DECOMPOSITION: 'Decomposition'           // #11: EXTERNALLY breaking down organic matter (fungi, bacteria)
};

const EOxygenUsage = {
    AEROBIC: 'Aerobic',
    ANAEROBIC: 'Anaerobic',
    FACULTATIVE: 'Facultative'
};

const EDeltaOperation = {
    SET: 'set',             // Absolute assignment: property = value
    ADD: 'add',             // Additive: property += value
    MULTIPLY: 'multiply'    // Multiplicative: property *= value
};

// ===== COMPONENT 1: IDENTITY (Pure, Non-Emergent) =====
class FIdentity {
    constructor(config = {}) {
        this.speciesName = config.speciesName || "Unknown Species";
        this.commonName = config.commonName || this.speciesName;
        this.scientificName = config.scientificName || this.speciesName;
        this.archetypeName = config.archetypeName || config.speciesName || "Unknown Species";
        this.taxonomy = config.taxonomy || null; // Complete taxonomic classification
        // Note: trophicRole is EMERGENT - calculated from acquisition capabilities, not stored
    }

}

// ===== COMPONENT 2: BODY COMPOSITION (Universal Traits 1-6) =====
class FBodyComposition {
    constructor(config = {}) {
        // Universal Trait 1: BodyComposition_Mass_kg
        this.mass_kg = config.mass_kg;
        if (this.mass_kg === undefined) {
            throw new Error('FBodyComposition requires mass_kg');
        }

        // Universal Traits 2-6: Body composition ratios (must sum to 1.0)
        this.waterRatio = config.waterRatio;           // Trait 5: BodyComposition_WaterRatio
        this.carbonRatio = config.carbonRatio;        // Trait 2: BodyComposition_CarbonRatio
        this.nitrogenRatio = config.nitrogenRatio;    // Trait 3: BodyComposition_NitrogenRatio
        this.phosphorusRatio = config.phosphorusRatio; // Trait 4: BodyComposition_PhosphorusRatio
        this.otherMineralsRatio = config.otherMineralsRatio; // Trait 6: BodyComposition_OtherMineralsRatio

        if (this.waterRatio === undefined || this.carbonRatio === undefined ||
            this.nitrogenRatio === undefined || this.phosphorusRatio === undefined ||
            this.otherMineralsRatio === undefined) {
            throw new Error('FBodyComposition requires all composition ratios (water, carbon, nitrogen, phosphorus, otherMinerals)');
        }

        // Structural complexity factor (0.1-1.0) - affects decomposition rate and digestibility
        // Biological significance: Higher complexity = slower decomposition, lower digestibility
        // Microbes: 0.15-0.25, algae: 0.25-0.35, simple plants: 0.35-0.50, complex plants: 0.50-0.70, vertebrates: 0.75-0.90
        // Default: 0.42 (typical for herbaceous flowering plants - most common in early ecosystems)
        this.structuralComplexity = config.structuralComplexity || 0.42;

        // Normalize ratios to sum to exactly 1.0 (conservation of mass)
        const totalRatio = this.waterRatio + this.carbonRatio + this.nitrogenRatio +
                          this.phosphorusRatio + this.otherMineralsRatio;

        if (totalRatio <= 0) {
            throw new Error(`FBodyComposition ratios must be positive, got total ${totalRatio.toFixed(6)}`);
        }

        // Normalize all ratios proportionally to ensure they sum to exactly 1.0
        if (Math.abs(totalRatio - 1.0) > 0.001) {
            console.warn(`FBodyComposition ratios sum to ${totalRatio.toFixed(6)}, normalizing to 1.0`);
            this.waterRatio /= totalRatio;
            this.carbonRatio /= totalRatio;
            this.nitrogenRatio /= totalRatio;
            this.phosphorusRatio /= totalRatio;
            this.otherMineralsRatio /= totalRatio;
        }
    }
}

// ===== COMPONENT 2B: DETAILED BIOMASS POOLS (FOR PRODUCERS) =====
class FDetailedBiomass {
    constructor(config = {}) {
        // --- Living Biomass Mass (g/m²)  ---
        this.WoodyBiomass_gm2 = config.WoodyBiomass_gm2;
        if (this.WoodyBiomass_gm2 === undefined) {
            throw new Error('FDetailedBiomass requires WoodyBiomass_gm2');
        }

        this.LeafyBiomass_gm2 = config.LeafyBiomass_gm2;
        if (this.LeafyBiomass_gm2 === undefined) {
            throw new Error('FDetailedBiomass requires LeafyBiomass_gm2');
        }

        this.HerbaceousBiomass_gm2 = config.HerbaceousBiomass_gm2;
        if (this.HerbaceousBiomass_gm2 === undefined) {
            throw new Error('FDetailedBiomass requires HerbaceousBiomass_gm2');
        }

        this.FruitSeedBiomass_gm2 = config.FruitSeedBiomass_gm2;
        if (this.FruitSeedBiomass_gm2 === undefined) {
            throw new Error('FDetailedBiomass requires FruitSeedBiomass_gm2');
        }

        this.RootBiomass_gm2 = config.RootBiomass_gm2;
        if (this.RootBiomass_gm2 === undefined) {
            throw new Error('FDetailedBiomass requires RootBiomass_gm2');
        }

        this.TotalBiomass_gm2 = config.TotalBiomass_gm2 || 0.0; // Can be calculated

        // --- Nutrient Content within Living Biomass (g/m²) ---
        this.N_gm2 = config.N_gm2;
        if (this.N_gm2 === undefined) {
            throw new Error('FDetailedBiomass requires N_gm2');
        }

        this.P_gm2 = config.P_gm2;
        if (this.P_gm2 === undefined) {
            throw new Error('FDetailedBiomass requires P_gm2');
        }

        this.K_gm2 = config.K_gm2;
        if (this.K_gm2 === undefined) {
            throw new Error('FDetailedBiomass requires K_gm2');
        }

        this.C_gm2 = config.C_gm2;
        if (this.C_gm2 === undefined) {
            throw new Error('FDetailedBiomass requires C_gm2');
        }

        this.NonNPK_gm2 = config.NonNPK_gm2;
        if (this.NonNPK_gm2 === undefined) {
            throw new Error('FDetailedBiomass requires NonNPK_gm2');
        }

        this.LigninContent_pct = config.LigninContent_pct;
        if (this.LigninContent_pct === undefined) {
            throw new Error('FDetailedBiomass requires LigninContent_pct');
        }

        // --- Other properties ---
        this.CurrentGrowthRate = config.CurrentGrowthRate;
        if (this.CurrentGrowthRate === undefined) {
            throw new Error('FDetailedBiomass requires CurrentGrowthRate');
        }

        this.CurrentYieldRate = config.CurrentYieldRate;
        if (this.CurrentYieldRate === undefined) {
            throw new Error('FDetailedBiomass requires CurrentYieldRate');
        }

        // Calculate total mass on construction
        this.RecalculateTotalMass();
    }

    /**
     * Recalculate total biomass from component parts 
     */
    RecalculateTotalMass() {
        this.TotalBiomass_gm2 = this.WoodyBiomass_gm2 + this.LeafyBiomass_gm2 +
                                this.HerbaceousBiomass_gm2 + this.FruitSeedBiomass_gm2 +
                                this.RootBiomass_gm2;
    }

    /**
     * Get total accessible biomass for herbivores (excludes roots and most woody material)
     */
    getAccessibleBiomass_gm2() {
        return this.LeafyBiomass_gm2 + this.HerbaceousBiomass_gm2 +
               this.FruitSeedBiomass_gm2 + (this.WoodyBiomass_gm2 * 0.1); // Only 10% of woody is accessible
    }

    /**
     * Get biomass of specific type for targeted consumption
     */
    getBiomassOfType(biomassType) {
        switch (biomassType.toLowerCase()) {
            case 'woody': return this.WoodyBiomass_gm2;
            case 'leafy': return this.LeafyBiomass_gm2;
            case 'herbaceous': return this.HerbaceousBiomass_gm2;
            case 'fruitseed': return this.FruitSeedBiomass_gm2;
            case 'root': return this.RootBiomass_gm2;
            default: return 0.0;
        }
    }

    /**
     * Remove biomass of specific type (for consumption)
     * Returns actual amount removed
     */
    removeBiomassOfType(biomassType, amount_gm2) {
        const removed = Math.min(amount_gm2, this.getBiomassOfType(biomassType));

        switch (biomassType.toLowerCase()) {
            case 'woody': this.WoodyBiomass_gm2 -= removed; break;
            case 'leafy': this.LeafyBiomass_gm2 -= removed; break;
            case 'herbaceous': this.HerbaceousBiomass_gm2 -= removed; break;
            case 'fruitseed': this.FruitSeedBiomass_gm2 -= removed; break;
            case 'root': this.RootBiomass_gm2 -= removed; break;
        }

        this.RecalculateTotalMass();
        return removed;
    }

    getTotalBiomass_kg() {
        return this.TotalBiomass_gm2 / 1000.0; // Convert g/m² to kg/m²
    }

    /**
     * Calculate total nutrient content
     */
    getTotalNutrients_gm2() {
        return this.N_gm2 + this.P_gm2 + this.K_gm2 + this.C_gm2 + this.NonNPK_gm2;
    }

    /**
     * Get C:N ratio for decomposer affinity calculations
     */
    getCNRatio() {
        return this.N_gm2 > 0 ? this.C_gm2 / this.N_gm2 : 50.0; // Default high C:N if no nitrogen
    }

    /**
     * Add biomass and nutrients proportionally
     */
    addBiomassProportionally(biomassType, amount_gm2, nutrientRatios = null) {
        if (amount_gm2 <= 0) return;

        // Add biomass
        const currentAmount = this.getBiomassOfType(biomassType);
        switch (biomassType.toLowerCase()) {
            case 'woody': this.WoodyBiomass_gm2 = currentAmount + amount_gm2; break;
            case 'leafy': this.LeafyBiomass_gm2 = currentAmount + amount_gm2; break;
            case 'herbaceous': this.HerbaceousBiomass_gm2 = currentAmount + amount_gm2; break;
            case 'fruitseed': this.FruitSeedBiomass_gm2 = currentAmount + amount_gm2; break;
            case 'root': this.RootBiomass_gm2 = currentAmount + amount_gm2; break;
        }

        // Add nutrients proportionally if provided
        if (nutrientRatios) {
            this.N_gm2 += amount_gm2 * (nutrientRatios.nitrogen || 0.03);
            this.P_gm2 += amount_gm2 * (nutrientRatios.phosphorus || 0.005);
            this.K_gm2 += amount_gm2 * (nutrientRatios.potassium || 0.01);
            this.C_gm2 += amount_gm2 * (nutrientRatios.carbon || 0.45);
            this.NonNPK_gm2 += amount_gm2 * (nutrientRatios.otherMinerals || 0.02);
        }

        this.RecalculateTotalMass();
    }

    /**
     * Remove biomass and nutrients proportionally
     */
    removeBiomassProportionally(biomassType, amount_gm2) {
        if (amount_gm2 <= 0) return { biomass: 0, nutrients: {} };

        const currentAmount = this.getBiomassOfType(biomassType);
        const actualRemoved = Math.min(amount_gm2, currentAmount);

        if (actualRemoved <= 0) return { biomass: 0, nutrients: {} };

        // Calculate proportion being removed
        const totalBiomass = this.TotalBiomass_gm2;
        const proportion = totalBiomass > 0 ? actualRemoved / totalBiomass : 0;

        // Remove biomass
        this.removeBiomassOfType(biomassType, actualRemoved);

        // Remove nutrients proportionally
        const removedNutrients = {
            nitrogen: this.N_gm2 * proportion,
            phosphorus: this.P_gm2 * proportion,
            potassium: this.K_gm2 * proportion,
            carbon: this.C_gm2 * proportion,
            otherMinerals: this.NonNPK_gm2 * proportion
        };

        this.N_gm2 = Math.max(0, this.N_gm2 - removedNutrients.nitrogen);
        this.P_gm2 = Math.max(0, this.P_gm2 - removedNutrients.phosphorus);
        this.K_gm2 = Math.max(0, this.K_gm2 - removedNutrients.potassium);
        this.C_gm2 = Math.max(0, this.C_gm2 - removedNutrients.carbon);
        this.NonNPK_gm2 = Math.max(0, this.NonNPK_gm2 - removedNutrients.otherMinerals);

        return { biomass: actualRemoved, nutrients: removedNutrients };
    }

    /**
     * Get biomass quality metrics for herbivore selection
     */
    getBiomassQuality(biomassType) {
        const biomass = this.getBiomassOfType(biomassType);
        if (biomass <= 0) return 0;

        // Quality based on nutrient density and lignin content
        const totalNutrients = this.getTotalNutrients_gm2();
        const nutrientDensity = totalNutrients > 0 ? totalNutrients / this.TotalBiomass_gm2 : 0;
        const ligninPenalty = 1.0 - (this.LigninContent_pct / 100.0);

        return nutrientDensity * ligninPenalty;
    }
}

// ===== HERBIVORE FORAGING ENUMS AND COMPONENTS =====
const EHerbivoreForagingType = {
    Grazer: 'Grazer',         // Consumes primarily grasses/herbs (e.g., cattle, wildebeest)
    Browser: 'Browser',       // Consumes primarily woody plant leaves (e.g., giraffe, deer)
    Frugivore: 'Frugivore',   // Consumes primarily fruits/seeds (e.g., many primates, birds)
    Granivore: 'Granivore',   // Consumes primarily seeds (e.g., rodents, some birds)
    Generalist: 'Generalist'  // Balanced consumption (e.g., omnivorous mammals)
};

class FHerbivoreForagingProfile {
    constructor(config = {}) {
        // Realistic foraging preferences for generalist herbivores (sum should = 1.0)
        // Based on typical temperate herbivore diets (rabbits, deer, etc.)
        // Using Generalist values as single source of truth for defaults
        this.FruitSeedPreference = config.FruitSeedPreference || 0.25;      // High energy, seasonal availability
        this.LeafyPreference = config.LeafyPreference || 0.3;               // Primary food source, high protein
        this.HerbaceousPreference = config.HerbaceousPreference || 0.25;    // Stems, shoots - readily available
        this.RootPreference = config.RootPreference || 0.15;                // Difficult to access, low preference
        this.WoodyPreference = config.WoodyPreference || 0.05;              // Emergency food, very low digestibility

        // Normalize foraging preferences to sum to exactly 1.0
        const totalPreference = this.FruitSeedPreference + this.LeafyPreference +
                               this.HerbaceousPreference + this.RootPreference + this.WoodyPreference;

        if (totalPreference <= 0) {
            throw new Error('FHerbivoreForagingProfile preferences must be positive');
        }

        if (Math.abs(totalPreference - 1.0) > 0.001) {
            console.warn(`Herbivore foraging preferences sum to ${totalPreference.toFixed(6)}, normalizing to 1.0`);
            this.FruitSeedPreference /= totalPreference;
            this.LeafyPreference /= totalPreference;
            this.HerbaceousPreference /= totalPreference;
            this.RootPreference /= totalPreference;
            this.WoodyPreference /= totalPreference;
        }
    }

    /**
     * Set preferences based on foraging type 
     */
    static createFromForagingType(foragingType) {
        switch (foragingType) {
            case EHerbivoreForagingType.Grazer:
                return new FHerbivoreForagingProfile({
                    FruitSeedPreference: 0.05,
                    LeafyPreference: 0.15,
                    HerbaceousPreference: 0.7,
                    RootPreference: 0.1,
                    WoodyPreference: 0.0
                });
            case EHerbivoreForagingType.Browser:
                return new FHerbivoreForagingProfile({
                    FruitSeedPreference: 0.1,
                    LeafyPreference: 0.6,
                    HerbaceousPreference: 0.1,
                    RootPreference: 0.1,
                    WoodyPreference: 0.1
                });
            case EHerbivoreForagingType.Frugivore:
                return new FHerbivoreForagingProfile({
                    FruitSeedPreference: 0.7,
                    LeafyPreference: 0.2,
                    HerbaceousPreference: 0.05,
                    RootPreference: 0.0,
                    WoodyPreference: 0.05
                });
            case EHerbivoreForagingType.Granivore:
                return new FHerbivoreForagingProfile({
                    FruitSeedPreference: 0.8,
                    LeafyPreference: 0.05,
                    HerbaceousPreference: 0.1,
                    RootPreference: 0.05,
                    WoodyPreference: 0.0
                });
            case EHerbivoreForagingType.Generalist:
            default:
                return new FHerbivoreForagingProfile({
                    FruitSeedPreference: 0.25,
                    LeafyPreference: 0.3,
                    HerbaceousPreference: 0.25,
                    RootPreference: 0.15,
                    WoodyPreference: 0.05
                });
        }
    }

    /**
     * Get preference for specific biomass type
     */
    getPreferenceForBiomassType(biomassType) {
        switch (biomassType.toLowerCase()) {
            case 'woody': return this.WoodyPreference;
            case 'leafy': return this.LeafyPreference;
            case 'herbaceous': return this.HerbaceousPreference;
            case 'fruitseed': return this.FruitSeedPreference;
            case 'root': return this.RootPreference;
            default: return 0.0;
        }
    }
}

// ===== REPRODUCTION STRATEGY SUB-COMPONENT (Traits 7-9) =====
class FReproductionStrategy {
    constructor(config = {}) {
        this.energyCost_kJ = config.energyCost_kJ;
        if (this.energyCost_kJ === undefined) {
            throw new Error('FReproductionStrategy requires energyCost_kJ');
        }

        // Trait 7: offspringCount - The number of offspring produced in a single, successful reproductive event
        this.offspringCount = config.offspringCount;
        if (this.offspringCount === undefined) {
            throw new Error('FReproductionStrategy requires offspringCount');
        }

        // Trait 8: gestation_Days - The duration of the gestation or incubation period in simulation days
        this.gestation_Days = config.gestation_Days;
        if (this.gestation_Days === undefined) {
            throw new Error('FReproductionStrategy requires gestation_Days');
        }

        // Trait 9: parentalCare_Days - The number of days after birth that parents must actively provide resources
        this.parentalCare_Days = config.parentalCare_Days;
        if (this.parentalCare_Days === undefined) {
            throw new Error('FReproductionStrategy requires parentalCare_Days');
        }
    }

    // Helper methods for reproduction strategy
    getTotalReproductivePeriod() {
        return this.gestation_Days + this.parentalCare_Days;
    }

    getReproductiveInvestment() {
        return this.energyCost_kJ * this.offspringCount;
    }

    isKStrategy() {
        return this.offspringCount <= 2 && this.parentalCare_Days > 0;
    }

    isRStrategy() {
        return this.offspringCount > 5 && this.parentalCare_Days === 0;
    }
}

// ===== COMPONENT 3: LIFECYCLE =====
class FLifecycle {
    constructor(config = {}) {
        this.lifespan_Max_Days = config.lifespan_Max_Days;
        if (this.lifespan_Max_Days === undefined) {
            throw new Error('FLifecycle requires lifespan_Max_Days');
        }

        if (!config.reproductionStrategy) {
            throw new Error('FLifecycle requires reproductionStrategy');
        }
        this.reproductionStrategy = new FReproductionStrategy(config.reproductionStrategy);
    }
}

// ===== COMPONENT 4: METABOLISM (Traits 10-13) =====
class FMetabolism {
    constructor(config = {}) {
        // Trait 10: DaysTillStarvation - Number to help validate metabolism rate_kJ per tick
        // Days until starvation - validates metabolic rate calculations
        // Biological significance: Larger animals survive longer without food due to energy reserves
        // Small mammals: 3-7 days, medium mammals: 7-14 days, large mammals: 14-30 days
        // Default: 8.5 days (typical for medium-sized temperate mammals like rabbits)
        this.DaysTillStarvation = config.DaysTillStarvation || 8.5;

        this.proteinTurnoverRate = config.proteinTurnoverRate;
        if (this.proteinTurnoverRate === undefined) {
            throw new Error('FMetabolism requires proteinTurnoverRate');
        }

        // Trait 11: metabolic_Rate_kJ_per_hr - The baseline energy cost to live
        this.metabolic_Rate_kJ_per_hr = config.metabolic_Rate_kJ_per_hr;
        if (this.metabolic_Rate_kJ_per_hr === undefined) {
            throw new Error('FMetabolism requires metabolic_Rate_kJ_per_hr');
        }



        this.energy_Reserves_Max_kJ = config.energy_Reserves_Max_kJ;
        if (this.energy_Reserves_Max_kJ === undefined) {
            throw new Error('FMetabolism requires energy_Reserves_Max_kJ');
        }

        this.oxygen_Requirement = config.oxygen_Requirement;
        if (this.oxygen_Requirement === undefined) {
            throw new Error('FMetabolism requires oxygen_Requirement');
        }

        // Endothermy/Ectothermy trait 
        this.bIsEndotherm = config.bIsEndotherm;
        if (this.bIsEndotherm === undefined) {
            throw new Error('FMetabolism requires bIsEndotherm');
        }



        // Validate starvation timeline
        this.validateStarvationTimeline();
    }

    validateStarvationTimeline() {
        const hoursPerDay = 24;
        const calculatedDays = this.energy_Reserves_Max_kJ / (this.metabolic_Rate_kJ_per_hr * hoursPerDay);
        if (Math.abs(calculatedDays - this.DaysTillStarvation) > 2.0) {
            console.warn(`⚠️ Starvation timeline mismatch: Expected ${this.DaysTillStarvation} days, calculated ${calculatedDays.toFixed(1)} days`);
        }
    }

    calculateRequiredEnergyReserves() {
        const hoursPerDay = 24;
        return this.DaysTillStarvation * this.metabolic_Rate_kJ_per_hr * hoursPerDay;
    }

    // Get metabolic type description
    getMetabolicType() {
        return this.bIsEndotherm ? 'Endotherm' : 'Ectotherm';
    }
}



// ===== COMPONENT 5: MOVEMENT ABILITIES (Traits 20-23) =====
class FMovementAbilities {
    constructor(config = {}) {
        // Trait 20: walk_Speed_m_per_hr - Speed on land. 0 if it cannot walk.
        this.walk_Speed_m_per_hr = config.walk_Speed_m_per_hr;
        if (this.walk_Speed_m_per_hr === undefined) {
            throw new Error('FMovementAbilities requires walk_Speed_m_per_hr');
        }

        this.run_Speed_m_per_hr = config.run_Speed_m_per_hr;
        if (this.run_Speed_m_per_hr === undefined) {
            throw new Error('FMovementAbilities requires run_Speed_m_per_hr');
        }
        
        // Trait 21: swim_Speed_m_per_hr - Speed in water. 0 if it cannot swim.
        this.swim_Speed_m_per_hr = config.swim_Speed_m_per_hr;
        if (this.swim_Speed_m_per_hr === undefined) {
            throw new Error('FMovementAbilities requires swim_Speed_m_per_hr');
        }

        this.fastSwim_Speed_m_per_hr = config.fastSwim_Speed_m_per_hr;
        if (this.fastSwim_Speed_m_per_hr === undefined) {
            throw new Error('FMovementAbilities requires fastSwim_Speed_m_per_hr');
        }

        // Trait 22: fly_Speed_m_per_hr - Speed in the air. 0 if it cannot fly.
        this.fly_Speed_m_per_hr = config.fly_Speed_m_per_hr;
        if (this.fly_Speed_m_per_hr === undefined) {
            throw new Error('FMovementAbilities requires fly_Speed_m_per_hr');
        }

        // Trait 23: burrow_Speed_m_per_hr - Speed underground. 0 if it cannot burrow.
        this.burrow_Speed_m_per_hr = config.burrow_Speed_m_per_hr;
        if (this.burrow_Speed_m_per_hr === undefined) {
            throw new Error('FMovementAbilities requires burrow_Speed_m_per_hr');
        }

        this.speedModifier = config.speedModifier;
        if (this.speedModifier === undefined) {
            throw new Error('FMovementAbilities requires speedModifier');
        }


        this.walk_EnergyCost_per_km = config.walk_EnergyCost_per_km || 0;
        this.run_EnergyCost_per_km = config.run_EnergyCost_per_km || 0;
        this.fastSwim_EnergyCost_per_km = config.fastSwim_EnergyCost_per_km || 0;
    }

    // Helper methods for movement capabilities
    canWalk() { return this.walk_Speed_m_per_hr > 0; }
    canSwim() { return this.swim_Speed_m_per_hr > 0; }
    canFly() { return this.fly_Speed_m_per_hr > 0; }
    canBurrow() { return this.burrow_Speed_m_per_hr > 0; }

    // Get movement capabilities as array
    getMovementModes() {
        const modes = [];
        if (this.canWalk()) modes.push(EMovementType.Walk);
        if (this.canSwim()) modes.push(EMovementType.Swim);
        if (this.canFly()) modes.push(EMovementType.Fly);
        if (this.canBurrow()) modes.push(EMovementType.Burrow);
        return modes;
    }
}

// ===== COMPONENT 6: SENSORY ABILITIES (Traits 14-19) =====
class FSensoryAbilities {
    constructor(config = {}) {
        // Trait 14: vision_range_m - Range for sight. 0 if blind.
        this.vision_range_m = config.vision_range_m;
        if (this.vision_range_m === undefined) {
            throw new Error('FSensoryAbilities requires vision_range_m');
        }

        // Trait 15: smell_range_m - Range for chemical scent in air. 0 if no sense of smell.
        this.smell_range_m = config.smell_range_m;
        if (this.smell_range_m === undefined) {
            throw new Error('FSensoryAbilities requires smell_range_m');
        }

        // Trait 16: taste_range_m - Range for chemical sensing in water/direct contact. Crucial for decomposers. 0 if none.
        this.taste_range_m = config.taste_range_m;
        if (this.taste_range_m === undefined) {
            throw new Error('FSensoryAbilities requires taste_range_m');
        }

        // Trait 17: hearing_range_m - Range for sound. For bats, this would be their "echolocation" range. 0 if deaf.
        this.hearing_range_m = config.hearing_range_m;
        if (this.hearing_range_m === undefined) {
            throw new Error('FSensoryAbilities requires hearing_range_m');
        }

        // Trait 18: touch_range_m - Range for pressure/vibration. Crucial for spiders, aquatic animals, and burrowers. 0 if none.
        this.touch_range_m = config.touch_range_m;
        if (this.touch_range_m === undefined) {
            throw new Error('FSensoryAbilities requires touch_range_m');
        }

        // Trait 19: heat_range_m - Range for thermal sensing. 0 if none.
        this.heat_range_m = config.heat_range_m;
        if (this.heat_range_m === undefined) {
            throw new Error('FSensoryAbilities requires heat_range_m');
        }
    }
}

// ===== RATE-BASED ACQUISITION SYSTEM =====

// Specific rate structures for each acquisition method (Producer Traits 29-34)
class FPhotosynthesisRates {
    constructor(config = {}) {
        this.maxRate_umol_CO2_per_m2_per_s = config.Max_Carbon_Fixation_Rate_umol_per_m2_per_s;
        if (this.maxRate_umol_CO2_per_m2_per_s === undefined) {
            throw new Error('FPhotosynthesisRates requires Max_Carbon_Fixation_Rate_umol_per_m2_per_s');
        }

        this.lightSaturation_PAR = config.lightSaturation;
        if (this.lightSaturation_PAR === undefined) {
            throw new Error('FPhotosynthesisRates requires lightSaturation');
        }

        // Quantum yield of photosynthesis (mol CO2 fixed per mol photons absorbed)
        // Biological significance: Fundamental efficiency of light energy conversion to chemical energy
        // C3 plants (85% of species): 0.048-0.052, C4 plants (grasses): 0.054-0.060, CAM plants (succulents): 0.040-0.045
        // Default: 0.049 (typical temperate C3 plant under optimal conditions)
        this.quantumYield_mol_per_mol = config.quantumYield || 0.049;

        this.leafArea_m2 = config.leafArea;
        if (this.leafArea_m2 === undefined) {
            throw new Error('FPhotosynthesisRates requires leafArea');
        }

        this.Max_Carbon_Fixation_Rate_umol_per_m2_per_s = this.maxRate_umol_CO2_per_m2_per_s;

        // Trait 30: Water_Use_Efficiency_g_per_mm - The plant's efficiency in using water for growth
        this.Water_Use_Efficiency_g_per_mm = config.Water_Use_Efficiency_g_per_mm;
        if (this.Water_Use_Efficiency_g_per_mm === undefined) {
            throw new Error('FPhotosynthesisRates requires Water_Use_Efficiency_g_per_mm');
        }

        // Trait 34: NitrogenFixation_mgN_per_hr - If not 0, then it has the ability for N fixation
        this.NitrogenFixation_mgN_per_hr = config.NitrogenFixation_mgN_per_hr;
        if (this.NitrogenFixation_mgN_per_hr === undefined) {
            throw new Error('FPhotosynthesisRates requires NitrogenFixation_mgN_per_hr');
        }

        // Defense lignin percentage - structural polymer that reduces digestibility
        // Biological significance: Primary chemical defense against herbivory, affects decomposition rate
        // Grasses: 8-12%, forbs: 12-18%, shrubs: 18-28%, hardwood trees: 25-35%, conifers: 28-40%
        // Default: 14.5% (typical for mixed herbaceous vegetation in temperate ecosystems)
        this.defense_lignin_pct = config.defense_lignin_pct || 14.5;
    }

    // Helper methods for producer capabilities
    canFixNitrogen() { return this.NitrogenFixation_mgN_per_hr > 0; }
}

class FRootUptakeRates {
    constructor(config = {}) {
        // Trait 31: UptakeRate_N_mg_per_hr - The speed of pulling N nutrients from the soil
        this.UptakeRate_N_mg_per_hr = config.UptakeRate_N_mg_per_hr;
        if (this.UptakeRate_N_mg_per_hr === undefined) {
            throw new Error('FRootUptakeRates requires UptakeRate_N_mg_per_hr');
        }

        // Trait 32: UptakeRate_P_mg_per_hr - The speed of pulling P nutrients from the soil
        this.UptakeRate_P_mg_per_hr = config.UptakeRate_P_mg_per_hr;
        if (this.UptakeRate_P_mg_per_hr === undefined) {
            throw new Error('FRootUptakeRates requires UptakeRate_P_mg_per_hr');
        }

        // Trait 33: UptakeRate_K_mg_per_hr - The speed of pulling K nutrients from the soil
        this.UptakeRate_K_mg_per_hr = config.UptakeRate_K_mg_per_hr;
        if (this.UptakeRate_K_mg_per_hr === undefined) {
            throw new Error('FRootUptakeRates requires UptakeRate_K_mg_per_hr');
        }

        // Trait 45: Wilting_Point_Water_Potential_MPa - The "Too Dry" Limit
        this.Wilting_Point_Water_Potential_MPa = config.Wilting_Point_Water_Potential_MPa;
        if (this.Wilting_Point_Water_Potential_MPa === undefined) {
            throw new Error('FRootUptakeRates requires Wilting_Point_Water_Potential_MPa');
        }

        // Trait 46: Optimal_Water_Potential_MPa - The "Just Right" Target
        this.Optimal_Water_Potential_MPa = config.Optimal_Water_Potential_MPa;
        if (this.Optimal_Water_Potential_MPa === undefined) {
            throw new Error('FRootUptakeRates requires Optimal_Water_Potential_MPa');
        }

        // Root mass for nutrient uptake calculations (grams dry weight)
        // Biological significance: Determines total nutrient uptake capacity and competitive ability
        // Small herbs: 5-20g, perennial grasses: 10-50g, shrubs: 100-500g, trees: 1000-5000g
        // Default: 18.0g (typical for established herbaceous perennial in temperate grassland)
        this.rootMass_g = config.rootMass || 18.0;

        // Soil affinity constant (Km) for Michaelis-Menten nutrient uptake kinetics
        // Biological significance: Lower Km = higher affinity = better uptake at low soil concentrations
        // Fast-growing species: 0.2-0.4 mM, conservative species: 0.4-0.8 mM, stress-tolerant: 0.1-0.3 mM
        // Default: 0.32 mM (typical for moderately competitive temperate plants)
        this.soilAffinityConstant_Km = config.soilAffinity || 0.32;


    }

    getWaterStressTolerance() {
        return Math.abs(this.Wilting_Point_Water_Potential_MPa - this.Optimal_Water_Potential_MPa);
    }

    isWaterStressed(currentWaterPotential) {
        return currentWaterPotential < this.Wilting_Point_Water_Potential_MPa;
    }

    // Helper methods for nutrient uptake
    getTotalUptakeCapacity() {
        return this.UptakeRate_N_mg_per_hr + this.UptakeRate_P_mg_per_hr + this.UptakeRate_K_mg_per_hr;
    }

    getNutrientUptakeRatios() {
        const total = this.getTotalUptakeCapacity();
        return {
            nitrogen: this.UptakeRate_N_mg_per_hr / total,
            phosphorus: this.UptakeRate_P_mg_per_hr / total,
            potassium: this.UptakeRate_K_mg_per_hr / total
        };
    }
}

class FConsumptionRates {
    constructor(config = {}) {
        // ===== SEARCH & CAPTURE PARAMETERS (Primarily for Predation & Carrion Feeding) =====
        
        // The area an organism can effectively search for its target per hour (m²/hr).
        this.searchRate_m2_per_hour = config.searchRate_m2_per_hour || 0;
        
        // The probability (0.0 to 1.0) that an attack attempt will succeed.
        this.attackSuccessRate_pct = config.attackSuccessRate_pct || 0;
        
        // The time in minutes required to subdue, process, and begin consuming a single target after a successful attack/find.
        this.handlingTime_minutes = config.handlingTime_minutes || 0;

        // The maximum mass (kg) of a single prey item this organism will attempt to hunt.
        this.maxPreySize_kg = config.maxPreySize_kg || 0;

        // ===== INTAKE PARAMETERS (Primarily for Grazing & Carrion Feeding) =====
        
        // The mass of food (in grams of dry matter) the organism can ingest per hour.
        this.intakeRate_g_per_hour = config.intakeRate_g_per_hour || 0;
        
        // The size (in grams) of a single bite or consumption action.
        this.biteSize_g = config.biteSize_g || 0;

        // A factor (0-1) indicating the organism's preference for high-quality food patches.
        this.selectivityIndex = config.selectivityIndex || 0;

        // The speed (m/hr) at which the organism moves while actively foraging/grazing.
        this.foragingSpeed_m_per_hour = config.foragingSpeed_m_per_hour || 0;

        // ===== SCAVENGING-SPECIFIC PARAMETERS =====
        
        // A factor (0-1) indicating the organism's ability to compete with others at a carcass.
        this.competitionTolerance = config.competitionTolerance || 0;

        // ===== DIGESTION PARAMETERS (Universal for all consumers) =====
        
        // The efficiency (0-1) of converting consumed Carbon into usable energy and biomass.
        this.digestion_carbon_efficiency = config.digestion_carbon_efficiency || 0;
        
        // The efficiency (0-1) of extracting Nitrogen for growth.
        this.digestion_nitrogen_efficiency = config.digestion_nitrogen_efficiency || 0;
        
        // The efficiency (0-1) of extracting Phosphorus for DNA/bone.
        this.digestion_phosphorus_efficiency = config.digestion_phosphorus_efficiency || 0;
        
        // The overall digestibility (0-1) of the food type, affecting total energy gain.
        this.digestibilityCoefficient = config.digestibilityCoefficient || 0;

        // The kJ of energy gained per kg of consumed biomass. Replaces `energyConversionRate_kJ_per_kg`.
        this.energyContent_kJ_per_kg = config.energyContent_kJ_per_kg || 0;
    }
}

// +++ ADD THIS NEW CLASS +++
// +++ THIS IS THE NEW, DEDICATED CLASS for Detritivores +++
class FDetritivoryRates {
    constructor(config = {}) {
        // ===== SOIL/LITTER PROCESSING PARAMETERS =====

        // The rate (grams/hour) at which the organism ingests soil/litter to process for organic matter.
        this.ingestion_rate_g_per_hour = config.ingestion_rate_g_per_hour || 0;

        // A factor (0-1) representing the efficiency of separating organic matter from inorganic soil.
        this.organic_matter_selectivity = config.organic_matter_selectivity || 0;
        
        // The preferred substrate for this detritivore (e.g., 'PlantLitter', 'FineDOMPool').
        this.substratePreference = config.substratePreference || 'PlantLitter';
        
        // The optimal size range (min, max) of organic particles in millimeters.
        this.particle_size_preference_mm = config.particle_size_preference_mm || [0.1, 5.0];

        // The depth (cm) to which the organism can burrow to find food.
        this.burrowing_depth_cm = config.burrowing_depth_cm || 0;

        // A factor (0-1) indicating preference for foraging on the surface vs. burrowing.
        this.surface_activity_preference = config.surface_activity_preference || 0;

        // ===== DIGESTION PARAMETERS (Internal to the detritivore) =====
        
        // The average time (hours) food spends in the gut, affecting digestion completeness.
        this.gut_retention_time_hours = config.gut_retention_time_hours || 0;
        
        // The overall assimilation efficiency (0-1) for converting digested matter into energy/biomass.
        this.assimilation_efficiency_pct = config.assimilation_efficiency_pct || 0;
        
        // Digestion efficiencies for specific nutrients.
        this.digestion_carbon_efficiency = config.digestion_carbon_efficiency || 0;
        this.digestion_nitrogen_efficiency = config.digestion_nitrogen_efficiency || 0;
        this.digestion_phosphorus_efficiency = config.digestion_phosphorus_efficiency || 0;
    }
}

class FDecompositionRates {
    constructor(config = {}) {
        // Core decomposition properties (external mineralization)
        this.enzymeProduction_rate = config.enzymeProduction_rate || 0;   // Rate of enzyme production for external breakdown

        // Your excellent new properties for ecological realism
        this.fragmentationRate_kg_per_hour = config.fragmentationRate_kg_per_hour || 0; // Rate of shredding coarse detritus into fine particles
        this.humificationEfficiency_ratio = config.humificationEfficiency_ratio || 0;    // Efficiency of converting detritus into stable humus

        // Substrate specialization
        this.substrateSpecialization_rating = config.substrateSpecialization_rating || 0; // Specialization for specific substrates (0-1)
        this.substrateAffinity_CNRatio = config.substrateAffinity_CNRatio || 0;          // Preferred C:N ratio of substrate

        // Environmental tolerance
        this.temperatureOptimal_C = config.temperatureOptimal_C || 0;    // Optimal temperature for decomposition
        this.temperatureTolerance_C = config.temperatureTolerance_C || 0; // Temperature tolerance range
        this.moistureOptimal_pct = config.moistureOptimal_pct || 0;      // Optimal moisture for decomposition
        this.moistureTolerance_pct = config.moistureTolerance_pct || 0;  // Moisture tolerance range

        // Mineralization efficiency (what gets released vs retained)
        this.carbon_Release_Efficiency_pct = config.carbon_Release_Efficiency_pct || 0;
        this.nitrogen_Release_Efficiency_pct = config.nitrogen_Release_Efficiency_pct || 0;
        this.phosphorus_Release_Efficiency_pct = config.phosphorus_Release_Efficiency_pct || 0;
        this.potassium_Release_Efficiency_pct = config.potassium_Release_Efficiency_pct || 0;
        this.otherMinerals_Release_Efficiency_pct = config.otherMinerals_Release_Efficiency_pct || 0;
    }
}

class FFilteringRates {
    constructor(config = {}) {
        this.filtrationRate_L_per_hour = config.filtrationRate || 0;    // Water filtered per hour
        this.particleRetention_um_min = config.particleRetention || 0;    // Minimum particle size retained
        this.energyExtraction_kJ_per_L = config.energyExtraction || 0;    // Energy extracted per liter
        this.filterEfficiency_pct = config.filterEfficiency || 0;         // Fraction of particles captured
    }
}

class FChemosynthesisRates {
    constructor(config = {}) {
        this.substrateAffinityConstant_mM = config.substrateAffinity || 0; // Affinity for chemical substrate
        this.maxRate_umol_per_g_per_hour = config.maxRate || 0;          // Maximum reaction rate
        this.energyYield_kJ_per_mol = config.energyYield || 0;          // Energy per mole substrate
        this.biomass_g = config.biomass || 0;                             // Biomass for calculations
    }
}

class FParasitismRates {
    constructor(config = {}) {
        this.attachmentSuccessRate_pct = config.attachmentSuccess || 0;   // Success rate of attachment
        this.extractionRate_kJ_per_hour = config.extractionRate || 0;    // Energy extracted per hour
        this.hostDamageRate_pct_per_hour = config.hostDamage || 0;      // Damage to host per hour
        this.detectionAvoidance_pct = config.detectionAvoidance || 0;    // Ability to avoid host defenses
    }
}



// Unified acquisition capability with method-specific rates - Pure data component
class FAcquisitionCapability {
    constructor(method, rateData, preference_weight = 1.0) {
        this.method = method;
        this.rateData = rateData;  // Method-specific rate structure
        this.preference_weight = preference_weight;  // Behavioral preference (0-10)
    }


}

// ===== COMPONENT 7: ACQUISITION (RATE-BASED) =====
class FAcquisition {
    constructor(config = {}) {
        this.capabilities = [];
        this.nitrogenFixation_rate = config.nitrogenFixation_rate || 0.0;

        // Handle capability instantiation if config provides capability data
        if (config.capabilities && Array.isArray(config.capabilities)) {
            AcquisitionCalculations.initializeCapabilities(this, config.capabilities, config.rateClassMap, FAcquisitionCapability);
        }
    }


}

// ===== DIGESTION PROFILE SUB-COMPONENT (Traits 24-28) =====
class FDigestionProfile {
    constructor(config = {}) {
        // Trait 24: carbon_Efficiency_pct - The Energy Key. Efficiency of converting consumed Carbon into usable energy.
        this.carbon_Efficiency_pct = config.carbon_Efficiency_pct;
        if (this.carbon_Efficiency_pct === undefined) {
            throw new Error('FDigestionProfile requires carbon_Efficiency_pct');
        }

        // Trait 25: nitrogen_Efficiency_pct - The Growth Key. Efficiency of extracting Nitrogen.
        this.nitrogen_Efficiency_pct = config.nitrogen_Efficiency_pct;
        if (this.nitrogen_Efficiency_pct === undefined) {
            throw new Error('FDigestionProfile requires nitrogen_Efficiency_pct');
        }

        // Trait 26: phosphorus_Efficiency_pct - The DNA/Bone Key. Efficiency of extracting Phosphorus.
        this.phosphorus_Efficiency_pct = config.phosphorus_Efficiency_pct;
        if (this.phosphorus_Efficiency_pct === undefined) {
            throw new Error('FDigestionProfile requires phosphorus_Efficiency_pct');
        }

        // Trait 27: potassium_Efficiency_pct - The Function Key. Efficiency of extracting Potassium.
        this.potassium_Efficiency_pct = config.potassium_Efficiency_pct;
        if (this.potassium_Efficiency_pct === undefined) {
            throw new Error('FDigestionProfile requires potassium_Efficiency_pct');
        }

        // Trait 28: otherMinerals_Efficiency_pct - The General Health Key. Catch-all for other vital minerals.
        this.otherMinerals_Efficiency_pct = config.otherMinerals_Efficiency_pct;
        if (this.otherMinerals_Efficiency_pct === undefined) {
            throw new Error('FDigestionProfile requires otherMinerals_Efficiency_pct');
        }
    }

    // Helper methods for digestion efficiency
    getOverallEfficiency() {
        return (this.carbon_Efficiency_pct + this.nitrogen_Efficiency_pct +
                this.phosphorus_Efficiency_pct + this.potassium_Efficiency_pct +
                this.otherMinerals_Efficiency_pct) / 5.0;
    }

    // Calculate nutrient extraction from consumed biomass
    extractNutrients(consumedBiomass) {
        return {
            carbon: (consumedBiomass.carbon || 0) * this.carbon_Efficiency_pct,
            nitrogen: (consumedBiomass.nitrogen || 0) * this.nitrogen_Efficiency_pct,
            phosphorus: (consumedBiomass.phosphorus || 0) * this.phosphorus_Efficiency_pct,
            potassium: (consumedBiomass.potassium || 0) * this.potassium_Efficiency_pct,
            otherMinerals: (consumedBiomass.otherMinerals || 0) * this.otherMinerals_Efficiency_pct
        };
    }
}

// ===== MINERALIZATION PROFILE SUB-COMPONENT (Decomposer Traits 35-41) =====
class FMineralizationProfile {
    constructor(config = {}) {
        // Trait 35: carbon_Release_Efficiency_pct - Percentage of carbon returned to soil as inorganic forms
        this.carbon_Release_Efficiency_pct = config.carbon_Release_Efficiency_pct;
        if (this.carbon_Release_Efficiency_pct === undefined) {
            throw new Error('FMineralizationProfile requires carbon_Release_Efficiency_pct');
        }

        // Trait 36: nitrogen_Release_Efficiency_pct
        this.nitrogen_Release_Efficiency_pct = config.nitrogen_Release_Efficiency_pct;
        if (this.nitrogen_Release_Efficiency_pct === undefined) {
            throw new Error('FMineralizationProfile requires nitrogen_Release_Efficiency_pct');
        }

        // Trait 37: phosphorus_Release_Efficiency_pct
        this.phosphorus_Release_Efficiency_pct = config.phosphorus_Release_Efficiency_pct;
        if (this.phosphorus_Release_Efficiency_pct === undefined) {
            throw new Error('FMineralizationProfile requires phosphorus_Release_Efficiency_pct');
        }

        // Trait 38: potassium_Release_Efficiency_pct
        this.potassium_Release_Efficiency_pct = config.potassium_Release_Efficiency_pct;
        if (this.potassium_Release_Efficiency_pct === undefined) {
            throw new Error('FMineralizationProfile requires potassium_Release_Efficiency_pct');
        }

        // Trait 39: otherMinerals_Release_Efficiency_pct
        this.otherMinerals_Release_Efficiency_pct = config.otherMinerals_Release_Efficiency_pct;
        if (this.otherMinerals_Release_Efficiency_pct === undefined) {
            throw new Error('FMineralizationProfile requires otherMinerals_Release_Efficiency_pct');
        }

        // Trait 40: Decomposition_SubstrateSpecialization_rating - Ability to break down high-lignin material (0-1)
        this.Decomposition_SubstrateSpecialization_rating = config.Decomposition_SubstrateSpecialization_rating;
        if (this.Decomposition_SubstrateSpecialization_rating === undefined) {
            throw new Error('FMineralizationProfile requires Decomposition_SubstrateSpecialization_rating');
        }

        // Trait 41: Decomposition_SubstrateAffinity_CNRatio - Ideal C:N ratio of detritus this decomposer is most efficient at
        this.Decomposition_SubstrateAffinity_CNRatio = config.Decomposition_SubstrateAffinity_CNRatio;
        if (this.Decomposition_SubstrateAffinity_CNRatio === undefined) {
            throw new Error('FMineralizationProfile requires Decomposition_SubstrateAffinity_CNRatio');
        }
    }

    // Helper methods for decomposer capabilities
    getOverallMineralizationEfficiency() {
        return (this.carbon_Release_Efficiency_pct + this.nitrogen_Release_Efficiency_pct +
                this.phosphorus_Release_Efficiency_pct + this.potassium_Release_Efficiency_pct +
                this.otherMinerals_Release_Efficiency_pct) / 5.0;
    }

    canDecomposeWoodyMaterial() {
        return this.Decomposition_SubstrateSpecialization_rating > 0.7;
    }

    getPreferredSubstrateType() {
        if (this.Decomposition_SubstrateAffinity_CNRatio < 15) return 'Animal remains';
        if (this.Decomposition_SubstrateAffinity_CNRatio < 30) return 'Leaf litter';
        return 'Woody material';
    }

    getDecompositionEfficiency(substrateCNRatio) {
        const difference = Math.abs(substrateCNRatio - this.Decomposition_SubstrateAffinity_CNRatio);
        return Math.max(0.1, 1.0 - (difference / 50.0)); // Efficiency decreases with C:N ratio mismatch
    }
}

// ===== COMPONENT 8: DIGESTION =====
class FDigestion {
    constructor(config = {}) {
        this.digestionProfile = new FDigestionProfile(config.digestionProfile);
        this.mineralizationProfile = config.mineralizationProfile ? new FMineralizationProfile(config.mineralizationProfile) : null;
    }
}

// ===== WATER STORAGE ECS COMPONENTS =====

/**
 * Universal Base Component - Every living entity has cellular water storage
 * This represents the fundamental water management that all life shares
 */
class FCellularWaterStorage {
    constructor(config = {}) {
        // Base water storage capacity from body composition
        this.baseCapacity_L = config.baseCapacity_L || 0;

        // Current cellular water content (liters)
        this.current_L = config.current_L || this.baseCapacity_L;

        // Membrane integrity (0-1) - affects water retention efficiency
        this.membraneIntegrity = config.membraneIntegrity || 0.95;

        // Osmotic regulation efficiency (bars) - affects water balance
        this.osmoticPressure = config.osmoticPressure || 0.3;

        // Validation
        if (this.current_L > this.baseCapacity_L) {
            this.current_L = this.baseCapacity_L;
        }
    }

    getWaterContent_percentage() {
        return this.baseCapacity_L > 0 ? (this.current_L / this.baseCapacity_L) * 100 : 0;
    }
}

/**
 * Specialized Water Storage - Species-specific water storage organs
 * Only attached to entities that have specialized water storage capabilities
 */
class FSpecializedWaterStorage {
    constructor(config = {}) {
        this.organType = config.organType || 'none'; // 'vacuole', 'bladder', 'stomach', 'trunk'
        this.capacity_L = config.capacity_L || 0;    // maximum storage capacity
        this.current_L = config.current_L || 0;      // current water stored
        this.efficiency = config.efficiency || 0.8;  // retention efficiency (0-1)

        // Validation
        if (this.current_L > this.capacity_L) {
            this.current_L = this.capacity_L;
        }
    }
}

/**
 * Water Reclamation System - Kidney, contractile vacuoles, etc.
 * Manages water conservation and waste concentration
 */
class FWaterReclamation {
    constructor(config = {}) {
        this.systemType = config.systemType || 'none'; // 'kidney', 'malpighian', 'contractile_vacuole'
        this.reclamationRate_L_per_hr = config.reclamationRate_L_per_hr || 0;
        this.concentrationAbility = config.concentrationAbility || 1.0; // waste concentration multiplier
        this.energyCost_kJ_per_L = config.energyCost_kJ_per_L || 2.0;   // energy cost of reclamation
    }
}

/**
 * Metabolic Water Generation - Water from metabolism
 * Fat and protein breakdown can generate water
 */
class FMetabolicWaterGeneration {
    constructor(config = {}) {
        this.fatMetabolismRate_L_per_kg = config.fatMetabolismRate_L_per_kg || 0;
        this.proteinMetabolismRate_L_per_kg = config.proteinMetabolismRate_L_per_kg || 0;
        this.carbohydrateMetabolismRate_L_per_kg = config.carbohydrateMetabolismRate_L_per_kg || 0;

        // Current reserves (derived from body composition)
        this.availableFat_kg = config.availableFat_kg || 0;
        this.availableProtein_kg = config.availableProtein_kg || 0;
    }
}

/**
 * Water Barrier System - Prevents water loss
 * Skin, cuticles, shells, etc.
 */
class FWaterBarrier {
    constructor(config = {}) {
        this.barrierType = config.barrierType || 'skin'; // 'skin', 'cuticle', 'shell', 'bark'
        this.permeability_L_per_hr_per_m2 = config.permeability_L_per_hr_per_m2 || 0.001;
        this.surfaceArea_m2 = config.surfaceArea_m2 || 1.0;
        this.temperatureModifier = config.temperatureModifier || 1.0; // affected by environmental temp
    }

    calculateWaterLoss_L_per_hr(temperatureFactor = 1.0) {
        return this.permeability_L_per_hr_per_m2 * this.surfaceArea_m2 * temperatureFactor;
    }
}

/**
 * SCIENTIFIC FOUNDATION:
 * The "Big Five + Dominance + Activity" model has been validated across 100+ species. This component
 * uses a standard 7-point scale to represent these traits, allowing for scientifically-grounded,
 * data-driven AI behavior. Individual variation is applied by the OrganismFactory at creation time.
 * Key Research: Gosling & John (1999), King & Figueredo (1997), Úbeda et al. (2019).
 */
class FScientificPersonalityProfile {
    constructor(config = {}) {
        // === CORE BIG FIVE FACTORS (cross-species validated) ===

        /**
         * EXTRAVERSION: Social approach, boldness in social contexts.
         * Range: 1.0 (solitary, withdrawn) to 7.0 (highly social, bold)
         */
        this.extraversion = this.validateScore(config.extraversion || 4.0, 'extraversion');
        
        /**
         * NEUROTICISM: Fearfulness, stress reactivity, emotional volatility.
         * Range: 1.0 (calm, stable) to 7.0 (anxious, reactive)
         */
        this.neuroticism = this.validateScore(config.neuroticism || 4.0, 'neuroticism');
        
        /**
         * AGREEABLENESS: Cooperative vs. aggressive tendencies, social tolerance.
         * Range: 1.0 (aggressive, competitive) to 7.0 (cooperative, tolerant)
         */
        this.agreeableness = this.validateScore(config.agreeableness || 4.0, 'agreeableness');
        
        /**
         * OPENNESS: Exploratory behavior, curiosity, cognitive flexibility.
         * Range: 1.0 (routine-bound) to 7.0 (innovative, curious)
         */
        this.openness = this.validateScore(config.openness || 4.0, 'openness');
        
        /**
         * CONSCIENTIOUSNESS: Goal-directed behavior, impulse control. (Limited to great apes).
         * Range: 1.0 (impulsive) to 7.0 (disciplined). Null for most species.
         */
        this.conscientiousness = this.validateScore(config.conscientiousness || null, 'conscientiousness');
        
        // === ADDITIONAL ANIMAL-SPECIFIC FACTORS ===
        
        /**
         * DOMINANCE: Competitive ability, assertiveness, social rank.
         * Range: 1.0 (submissive) to 7.0 (dominant)
         */
        this.dominance = this.validateScore(config.dominance || 4.0, 'dominance');
        
        /**
         * ACTIVITY: Locomotor activity, energy expenditure.
         * Range: 1.0 (lethargic) to 7.0 (hyperactive)
         */
        this.activity = this.validateScore(config.activity || 4.0, 'activity');
        
        // === CALCULATED COMPOSITE MEASURES (for convenient use by AI systems) ===
        
        /**
         * BOLDNESS: A composite measure of risk-taking tendency.
         */
        this.boldness = this.calculateBoldness();
        
        /**
         * SOCIABILITY: A composite measure of the tendency to engage in positive social interactions.
         */
        this.sociability = this.calculateSociability();
    }
    
    /**
     * Ensures a personality score is within the valid 1-7 range or null.
     */
    validateScore(score, traitName) {
        if (score === null || score === undefined) {
            return null; // The trait is not applicable to this species.
        }
        if (typeof score !== 'number' || isNaN(score)) {
             console.warn(`⚠️ Invalid non-numeric score for ${traitName}, defaulting to 4.0`);
             return 4.0;
        }
        if (score < 1.0 || score > 7.0) {
            console.warn(`⚠️ ${traitName} score ${score} is outside the valid range [1.0-7.0]. Clamping.`);
            return Math.max(1.0, Math.min(7.0, score));
        }
        return score;
    }
    
    /**
     * Calculates the composite 'boldness' score. High boldness = Low neuroticism + High extraversion.
     */
    calculateBoldness() {
        if (this.neuroticism === null || this.extraversion === null) return 4.0; // Return neutral if not applicable
        // The formula inverts the neuroticism score (so 1 becomes 7, 7 becomes 1) and averages it with extraversion.
        return ((8 - this.neuroticism) + this.extraversion) / 2;
    }
    
    /**
     * Calculates the composite 'sociability' score. High sociability = High extraversion + High agreeableness.
     */
    calculateSociability() {
        if (this.extraversion === null || this.agreeableness === null) return 4.0; // Return neutral if not applicable
        return (this.extraversion + this.agreeableness) / 2;
    }
}


export {
    // Component classes
    FIdentity, FBodyComposition, FDetailedBiomass, FLifecycle, FMetabolism, FMovementAbilities,
    FSensoryAbilities, FDigestion, FAcquisition, FAcquisitionCapability, FHerbivoreForagingProfile,
    FCellularWaterStorage, FSpecializedWaterStorage, FWaterBarrier, FWaterReclamation,
    FMetabolicWaterGeneration, FReproductionStrategy, FPhotosynthesisRates, FRootUptakeRates,
    FConsumptionRates, FFilteringRates, FChemosynthesisRates, FParasitismRates, FDecompositionRates,
    FDigestionProfile, FMineralizationProfile, FDetritivoryRates, FScientificPersonalityProfile,

    // Enums
    EAcquisitionMethod, EOxygenUsage, ETrophicRole, EMovementType,
    EDeltaOperation, ESourceSystem, EMacroState, EMicroState, ENutrientType, ELifecycleState,
    EHerbivoreForagingType
};

console.log('✅ Component-based trait system loaded');