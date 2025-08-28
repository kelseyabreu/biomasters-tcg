// ecs-core-components.js - Core ECS Components for the Three-Tier Cognitive Architecture
// This file defines essential components for the hierarchical AI simulation including:
// - Basic entity components (position, health, energy)
// - Three-tier cognitive architecture components (FHierarchicalBehavior, FStateConditions, etc.)
// - Intent components for action execution
// - Condition tag components for behavioral state tracking

import { EMovementType } from './ecosystem-trait-component.js';
console.log('Loading ECS core components...');

/**
 * Core ECS Components - Fundamental data containers for the three-tier cognitive simulation
 *
 * Architecture Overview:
 * 1. GoalPlanningSystem (Strategist) - Sets macro-states based on condition tags
 * 2. BehaviorSystem (Tactician) - Chooses micro-states based on macro-states
 * 3. IntentGenerationSystem (Executor) - Generates action intents from micro-states
 */

// Position Component - 3D position data
class FPosition {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

// Energy Component - Pure data for energy levels with maximum/current tracking
class FEnergy {
    constructor(config = {}) {
        this.maximum = config.maximum || 100;
        this.current = config.current || this.maximum;
    }
}

// Health Component - Pure data for health levels
class FHealth {
    constructor(config = {}) {
        this.maximum = config.maximum || 100;
        this.current = config.current || this.maximum;
    }
}

// Age Component - Pure data for organism age tracking
class FAge {
    constructor(config = {}) {
        this.current = config.current || 0; // Age in simulation time units
        this.ageRate = config.ageRate || 1; // How fast aging occurs
        this.lastKnownLifeStage = config.lastKnownLifeStage || 'unknown'; // Track life stage changes for optimization
    }
}

// VisualFade Component - Controls visual fade effects for dying entities
class VisualFade {
    constructor(config = {}) {
        this.startTick = config.startTick || 0;
        this.duration = config.duration || 5; // Ticks
        this.startOpacity = config.startOpacity || 1.0;
        this.endOpacity = config.endOpacity || 0.0;
    }

}

// Renderable Component - Controls visual representation
class Renderable {
    constructor(config = {}) {
        this.size = config.size || 10;
        this.type = config.type || 'unknown';
        this.archetypeName = config.archetypeName || 'Unknown';
        this.visible = config.visible !== false;
        this.opacity = config.opacity || 1.0;
        this.color = config.color || null;
        this.meshId = config.meshId || null; // For 3D rendering
        this.elementId = config.elementId || null; // For 2D rendering
    }
}

// StateChangeDelta Component - Represents a pending state change
class StateChangeDelta {
    constructor(targetId, targetType, changeType, data = {}) {
        this.targetId = targetId;     // ID of organism/cell/group to change
        this.targetType = targetType; // 'organism', 'cell', 'atmosphere', 'group', 'player', 'terraforming'
        this.changeType = changeType; // 'energy', 'nutrients', 'position', 'health', 'group_cohesion', etc.
        this.data = data;             // Change-specific data
        this.applied = false;
        this.timestamp = Date.now();
    }
}

// Group Member Component - For organisms that belong to a group
class FGroupMember {
    constructor(groupId = null) {
        this.groupId = groupId; // The entity ID of the group this organism belongs to
        this.role = 'member'; // 'leader', 'member', 'scout', etc.
        this.joinedTick = 0; // When this organism joined the group
    }

}

// Group Component - For group entities that manage collections of organisms
class FGroup {
    constructor(config = {}) {
        this.leaderId = config.leaderId || null; // Entity ID of the group leader
        this.speciesType = config.speciesType || 'unknown'; // What species this group contains
        this.members = new Set(config.members || []); // Set of entity IDs of group members
        this.cohesion = config.cohesion || 0.8; // Group cohesion factor (0-1)
        this.territory = config.territory || null; // Territory bounds if applicable
        // Social structure is now set by GroupSystem during initialization
        this.socialStructure = config.socialStructure || null;
        this.groupBehavior = {
            lastSplit: 0,
            lastMerge: 0,
            migrationTarget: null
        };
    }

}

// ===== THREE-TIER COGNITIVE ARCHITECTURE COMPONENTS =====

/**
 * FHierarchicalBehavior - Central "brain" component for the three-tier cognitive architecture
 *
 * This component stores the current state of an organism's decision-making hierarchy:
 *
 * - Macro State: Strategic goals set by GoalPlanningSystem (e.g., 'Foraging', 'Fleeing', 'Mating')
 * - Micro State: Tactical actions set by BehaviorSystem (e.g., 'Searching', 'MovingToFood', 'Eating')
 *
 * The IntentGenerationSystem reads the micro-state to generate immediate action intents.
 *
 * PURE INTENT DATA - NO TIMER LOGIC
 * Timer constraints are now handled by separate FTimer components for perfect separation of concerns.
 */
class FHierarchicalBehavior {
    constructor(config = {}) {
        // STRATEGIC LAYER: What the organism wants to achieve
        this.macroState = config.macroState || 'Foraging';     // Goal set by GoalPlanningSystem
        this.macroStateData = config.macroStateData || {};     // Context for the goal

        // TACTICAL LAYER: How the organism is pursuing the goal
        this.microState = config.microState || 'Searching';    // Method set by BehaviorSystem
        this.microStateData = config.microStateData || {};     // Context for the method

        // STATE CHANGE TRACKING (for momentum and debugging)
        this.lastMacroStateChangeTick = config.lastMacroStateChangeTick || 0;
        this.lastMicroStateChangeTick = config.lastMicroStateChangeTick || 0;
        this.stateChangeHistory = config.stateChangeHistory || [];

    }

    // Helper methods for state information
    getCurrentIntent() {
        return `${this.macroState} → ${this.microState}`;
    }

    getStatePersistence(currentTick) {
        return {
            macro: currentTick - this.lastMacroStateChangeTick,
            micro: currentTick - this.lastMicroStateChangeTick
        };
    }
}

/**
 * FStateConditions - Data-driven behavioral trigger rules loaded from species JSON
 *
 * This component stores the species-specific rules that determine when an organism
 * should change its macro-state (strategic goals). Used by GoalPlanningSystem to
 * evaluate whether conditions are met for state transitions.
 *
 * Example trigger: StartFleeing when IsThreatened=true AND fear_motivation > 0.7
 */
class FStateConditions {
    constructor(config = {}) {
        // Macro-state trigger conditions loaded from species JSON behaviorConfig
        // Format: { "StartForaging": [{"type": "energy", "operator": "<", "threshold": 40}] }
        this.macroStateTriggers = config.macroStateTriggers || {};

        // Micro-state triggers (currently unused, reserved for future tactical AI)
        this.microStateTriggers = config.microStateTriggers || {};
    }
}

/**
 * FBehavioralMomentum - Prevents unrealistic rapid state oscillation
 *
 * This component provides species-specific behavioral stability by resisting
 * rapid changes between macro-states. Different species have different momentum
 * characteristics:
 *
 * - High momentum (0.9): Slow, deliberate species like earthworms
 * - Low momentum (0.5): Quick, reactive species like caterpillars
 *
 * Used by GoalPlanningSystem to ensure biologically realistic decision-making.
 */
class FBehavioralMomentum {
    constructor(config = {}) {
        // Momentum factor (0.0 to 1.0) - higher values resist behavioral changes
        // Species-specific: wolves=0.85, rabbits=0.75, earthworms=0.9, butterflies=0.6
        this.momentum = config.momentum || 0.8;

        // Threshold for overcoming momentum (0.0 to 1.0) - lower values make changes easier
        // Species-specific: predators have lower thresholds (more decisive)
        this.changeThreshold = config.changeThreshold || 0.3;

        // Current behavioral direction/tendency (reserved for future use)
        this.currentDirection = config.currentDirection || 0;

        // How quickly momentum decays over time (reserved for future use)
        this.decayRate = config.decayRate || 0.95;
    }
}

/**
 * FMotivations - Stores current motivation levels for behavioral decision-making
 *
 * This component stores the calculated motivation scores that drive behavioral
 * decisions in the three-tier cognitive architecture. Updated by GoalPlanningSystem
 * and used for UI display and debugging.
 */
class FMotivations {
    constructor(config = {}) {
        // Core biological motivations (0.0 to 1.0)
        this.hunger = config.hunger || 0.0;        // Drive to seek food
        this.thirst = config.thirst || 0.0;        // Drive to seek water
        this.fear = config.fear || 0.0;            // Drive to flee from threats
        this.safety = config.safety || 0.0;        // Drive to seek safe locations
        this.reproduction = config.reproduction || 0.0; // Drive to mate
        this.fatigue = config.fatigue || 0.0;      // Drive to rest/sleep
        this.exploration = config.exploration || 0.0; // Drive to explore new areas

        // Timestamp of last update for UI display
        this.lastUpdated = config.lastUpdated || 0;

        // Dominant motivation for quick reference
        this.dominantMotivation = config.dominantMotivation || 'none';
    }
}

// The interrupt component that forces re-evaluation
class FReevaluationRequest {
    constructor(config = {}) {
        this.reason = config.reason || 'unknown';
        this.priority = config.priority || 'normal'; // low, normal, high, critical
        this.requestTick = config.requestTick || 0;
        this.claimantId = config.claimantId || null; // For contested resource scenarios - ID of the entity that owns the resource
        this.targetId = config.targetId || null; // For contested resource scenarios - ID of the resource being contested
    }
}

/**
 * FPlayerCommand - Component for player-directed behavior commands
 * Used by GoalPlanningSystem to handle user input and override normal AI behavior
 */
class FPlayerCommand {
    constructor(config = {}) {
        this.command = config.command || 'none'; // 'move', 'attack', 'gather', etc.
        this.targetPosition = config.targetPosition || null;
        this.targetEntityId = config.targetEntityId || null;
        this.priority = config.priority || 'normal'; // low, normal, high, critical
        this.issuedTick = config.issuedTick || 0;
    }
}

// ===== CONDITION TAG COMPONENTS =====
/**
 * Condition Tag Components - Boolean flags for organism state tracking
 *
 * These are simple, empty "tag" components that act as boolean flags.
 * They are added/removed by GoalPlanningSystem based on organism state
 * and used to trigger macro-state changes via species JSON trigger rules.
 *
 * The presence of a tag indicates the condition is active.
 * The absence means the condition is not met.
 */

/** Energy critically low - triggers foraging behavior */
class IsStarving {}

/** Predator or threat detected nearby - triggers fleeing behavior */
class IsThreatened {}

/** Currently being attacked by a predator - prevents healing */
class IsBeingAttacked {}

/** Special ability to heal during combat - overrides IsBeingAttacked healing restriction */
class CanHealInCombat {}

/** Health below threshold - triggers resting/safety behavior */
class IsInjured {}

/** Hydration critically low - triggers water-seeking behavior */
class IsThirsty {}

/** Fatigue high - triggers resting behavior */
class IsExhausted {}

/** Temperature too low for optimal function - triggers thermoregulation */
class IsColdStressed {}

/** Temperature too high for optimal function - triggers cooling behavior */
class IsHeatStressed {}

/**
 * FNeedsToExcrete - Condition tag added when waste buffer is above comfort threshold.
 * Signals to the GoalPlanningSystem that the organism has a non-critical need to excrete.
 */
class FNeedsToExcrete {}

// FEnvironmentalResponse Component - Pure data for environmental response parameters
class FEnvironmentalResponse {
        constructor(config = {}) {
            // Temperature response 
            this.temperatureMinimum_C = config.temperatureMinimum_C;
            this.temperatureMaximum_C = config.temperatureMaximum_C ;
            this.temperatureOptimalMin_C = config.temperatureOptimalMin_C;
            this.temperatureOptimalMax_C = config.temperatureOptimalMax_C;

            // Moisture response
            this.moistureOptimal_pct = config.moistureOptimal_pct || 60;
            this.moistureTolerance_pct = config.moistureTolerance_pct || 30;
            this.moistureLethal_pct = config.moistureLethal_pct || 5;

            // Light response (for producers)
            this.lightOptimal_PAR = config.lightOptimal_PAR || 800;
            this.lightSaturation_PAR = config.lightSaturation_PAR || 1200;
            this.lightCompensation_PAR = config.lightCompensation_PAR || 50;

            // pH response
            this.pHOptimal = config.pHOptimal || 7.0;
            this.pHTolerance = config.pHTolerance || 1.5;

            // Oxygen response
            this.oxygenRequirement = config.oxygenRequirement || 'aerobic'; // 'aerobic', 'anaerobic', 'facultative'
            this.oxygenOptimal_pct = config.oxygenOptimal_pct || 21;
        }

    }

// ========== INTENT COMPONENTS ==========
// Intent components are temporary messaging components used for the intent system
// They represent planned actions that will be processed by action resolution systems

// Movement Intent Component
class MoveIntent {
    constructor(config = {}) {
        this.targetX = config.targetX || null;
        this.targetY = config.targetY || null;
        this.direction = config.direction || null; // Direction in degrees (0-360)
        this.movementMode = config.movementMode || EMovementType.Walk; // EMovementType enum values
        this.urgency = config.urgency || 'medium'; // 'low', 'medium', 'high'
        this.reason = config.reason || 'movement';
        this.maxDistance = config.maxDistance || null; // Maximum distance to move
    }
}

// Photosynthesis Intent Component
class PhotosynthesisIntent {
    constructor(config = {}) {
        this.urgency = config.urgency || 'medium';
        this.reason = config.reason || 'photosynthesis';
        this.targetEnergyGain = config.targetEnergyGain || null;
    }
}

// Nutrient Uptake Intent Component
class NutrientUptakeIntent {
    constructor(config = {}) {
        this.urgency = config.urgency || 'medium';
        this.reason = config.reason || 'nutrient_uptake';
        this.targetNutrients = config.targetNutrients || ['N', 'P', 'K', 'Water'];
    }
}

// Grazing Intent Component
class GrazingIntent {
    constructor(config = {}) {
        this.targetEntityID = config.targetEntityID || null;
        this.urgency = config.urgency || 'medium';
        this.reason = config.reason || 'grazing';
        this.targetEnergyGain = config.targetEnergyGain || null;
    }
}

// Predation Intent Component
class PredationIntent {
    constructor(config = {}) {
        this.targetEntityID = config.targetEntityID || null;
        this.urgency = config.urgency || 'high';
        this.reason = config.reason || 'predation';
        this.huntingStrategy = config.huntingStrategy || 'direct';
    }
}

// Scavenging Intent Component
class ScavengingIntent {
    constructor(config = {}) {
        this.targetEntityID = config.targetEntityID || null;
        this.urgency = config.urgency || 'medium';
        this.reason = config.reason || 'scavenging';
        this.targetEnergyGain = config.targetEnergyGain || null;
    }
}

class DetritivoryIntent { }

// Decomposition Intent Component
class DecompositionIntent {
    constructor(config = {}) {
        this.urgency = config.urgency || 'medium';
        this.reason = config.reason || 'decomposition';
        this.targetOrganicMatter = config.targetOrganicMatter || 'any';
        this.mineralizationTarget = config.mineralizationTarget || null;
    }
}

// Metabolism Intent Component
class MetabolismIntent {
    constructor(config = {}) {
        this.urgency = config.urgency || 'medium';
        this.reason = config.reason || 'metabolism';
        this.metabolicRate = config.metabolicRate || 1.0;
    }
}

/**
 * An "intent" component created when an organism is at a water source
 * and intends to drink. This is consumed by the DrinkingSystem.
 */
class DrinkIntent {
    constructor(config = {}) {
        // The amount the organism desires to drink in this action.
        this.amount = config.amount || 10.0;
    }
}

// Waste Excretion Intent Component
class WasteExcretionIntent {
    constructor(config = {}) {
        this.wasteType = config.wasteType || 'mixed'; // 'fecal', 'urinary', 'mixed'
        this.urgency = config.urgency || 'normal'; // 'low', 'normal', 'high', 'critical'
        this.reason = config.reason || 'waste_excretion';
    }
}

// Reproduction Intent Component
class ReproductionIntent {
    constructor(config = {}) {
        this.targetEntityId = config.targetEntityId || null; // Specific mate target
        this.urgency = config.urgency || 'medium';
        this.minEnergyThreshold = config.minEnergyThreshold || 70; // Minimum energy % to reproduce
        this.minHealthThreshold = config.minHealthThreshold || 80; // Minimum health % to reproduce
        this.minAge = config.minAge || 10; // Minimum age to reproduce
        this.reason = config.reason || 'reproduction';
    }
}

/**
 * FTimer - Generic timer component for time-based constraints
 *
 * This component provides universal timing functionality that can be used for:
 * - Behavior timeouts (micro-state durations)
 * - Weather changes and seasonal transitions
 * - Disaster countdowns and triggers
 * - Animation durations
 * - Metamorphosis timing
 * - Any time-based event in the simulation
 *
 * Perfect separation of concerns: FTimer handles WHEN, other components handle WHAT
 */
class FTimer {
    constructor(config = {}) {
        this.name = config.name || 'unnamed_timer';           // Unique identifier for this timer
        this.startTick = config.startTick || 0;               // When the timer started
        this.duration = config.duration || 0;                // How long it runs (in ticks)
        this.category = config.category || 'generic';        // 'behavior', 'weather', 'effect', 'animation'
        this.priority = config.priority || 'normal';         // For conflict resolution ('low', 'normal', 'high', 'critical')
        this.autoDestroy = config.autoDestroy !== false;     // Clean up when done (default: true)
        this.loops = config.loops || false;                  // Repeat forever (default: false)
        this.data = config.data || {};                       // Context data for the timer
    }

    getRemainingTicks(currentTick) {
        const elapsed = currentTick - this.startTick;
        return Math.max(0, this.duration - elapsed);
    }

    isComplete(currentTick) {
        return this.getRemainingTicks(currentTick) <= 0;
    }

    getProgress(currentTick) {
        if (this.duration <= 0) return 1.0;
        const elapsed = currentTick - this.startTick;
        return Math.min(1.0, elapsed / this.duration);
    }
}

/**
 * FTimerEvent - Event component that defines what happens when a timer completes
 *
 * This component stores the action to be executed when its associated timer expires.
 * Different event types trigger different handlers in TimerSystem:
 * - 'behavior_timeout': Force re-evaluation of micro-state
 * - 'metamorphosis': Transform entity to new archetype
 * - 'weather_change': Update global weather conditions
 * - 'disaster_trigger': Activate disaster effects
 * - 'animation_complete': Finish visual animations
 */
class FTimerEvent {
    constructor(config = {}) {
        this.timerName = config.timerName;                    // Which timer triggers this event
        this.eventType = config.eventType || 'generic';      // What kind of event ('behavior_timeout', 'metamorphosis', etc.)
        this.actionData = config.actionData || {};           // Data needed to execute the action
        this.consumed = false;                                // Has this event been processed
    }
}

/**
 * FMemory - Stores remembered locations for intelligent search behavior
 *
 * Array-based memory system with limits per category:
 * - Water sources: Remember up to 2 locations
 * - Food areas: Remember up to 2 locations
 * - Prey locations: Remember up to 2 locations
 *
 * Each memory entry contains: {x, y, tick, success}
 * - success: boolean indicating if the location was productive
 */
class FMemory {
    constructor(config = {}) {
        this.waterSources = config.waterSources || [];     // Max 2 water source locations
        this.foodAreas = config.foodAreas || [];           // Max 2 food area locations
        this.preyLocations = config.preyLocations || [];   // Max 2 prey locations
        this.maxMemoryPerType = 2;                         // Limit per memory category
    }

    /**
     * Add a new memory entry, maintaining the limit per type
     */
    addMemory(type, location, currentTick, success = true) {
        const memoryArray = this[type];
        if (!memoryArray) return;

        const newMemory = {
            x: location.x,
            y: location.y,
            tick: currentTick,
            success: success
        };

        // Add to front of array
        memoryArray.unshift(newMemory);

        // Maintain limit
        if (memoryArray.length > this.maxMemoryPerType) {
            memoryArray.pop();
        }
    }

    /**
     * Get the most recent successful memory of a type
     */
    getRecentMemory(type) {
        const memoryArray = this[type];
        if (!memoryArray || memoryArray.length === 0) return null;

        // Return most recent successful memory
        return memoryArray.find(memory => memory.success) || memoryArray[0];
    }

    /**
     * Mark a memory location as unsuccessful
     */
    markMemoryUnsuccessful(type, location, tolerance = 5) {
        const memoryArray = this[type];
        if (!memoryArray) return;

        for (const memory of memoryArray) {
            const distance = Math.sqrt(
                Math.pow(memory.x - location.x, 2) +
                Math.pow(memory.y - location.y, 2)
            );
            if (distance <= tolerance) {
                memory.success = false;
                break;
            }
        }
    }
}

// FDigestionBuffer Component - Acts as "stomach" for consumers, holding recently eaten food
class FDigestionBuffer {
    constructor(config = {}) {
        // The mass and nutrient profile of the food currently being digested
        this.biomass_kg = config.biomass_kg || 0;
        this.carbon_kg = config.carbon_kg || 0;
        this.nitrogen_kg = config.nitrogen_kg || 0;
        this.phosphorus_kg = config.phosphorus_kg || 0;
        this.potassium_kg = config.potassium_kg || 0;
        this.water_kg = config.water_kg || 0;

        // Digestion progress and rates
        this.digestionProgress = config.digestionProgress || 0.0; // 0.0 to 1.0
        this.digestionRate_per_hr = config.digestionRate_per_hr || 2.0; // How fast digestion occurs 

        // Source information for tracking
        this.sourceType = config.sourceType || null; // stores an EAcquisitionMethod enum value
        this.sourceEntityID = config.sourceEntityID || null; // What was eaten
    }
}

/**
 * FCorpseState Component - Manages the lifecycle of a dead entity/corpse.
 * This is the central component for the entire decomposition and cleanup process.
 * Note: Timing is handled by FTimer component, not by manual countdown.
 */
class FCorpseState {
    constructor(config = {}) {
        // The reason for death, for logging and potential gameplay effects.
        this.reason = config.reason || 'unknown';

        // The simulation tick when the entity died.
        this.deathTick = config.deathTick || 0;

        // Store initial mass for rendering and decomposition calculations
        this.initialMass = config.initialMass || 0;
    }
}

/**
 * IsInspected Component - A simple "tag" component.
 * Its presence on an entity prevents the TimedSystem from destroying it,
 * allowing the player to view the info panel of a dead entity.
 */
class IsInspected { }

/**
 * FClaimedBy - A "tag" component added to a corpse entity,
 * indicating which predator has "claimed" the kill.
 */
class FClaimedBy {
    constructor(config = {}) {
        // The entity ID of the predator who made the kill and owns this claim.
        this.ownerId = config.ownerId;
        if (this.ownerId === undefined) {
            throw new Error('FClaimedBy requires an ownerId.');
        }

        // The simulation tick when this claim expires, allowing others to scavenge.
        this.claimExpiresTick = config.claimExpiresTick;
        if (this.claimExpiresTick === undefined) {
            throw new Error('FClaimedBy requires a claimExpiresTick.');
        }
    }
}

/**
 * A temporary component added to an entity the moment it receives a lethal blow within a tick.
 * Acts as an atomic ledger to record who dealt the final blow and prevents duplicate death processing in a parallel environment.
 * This component is designed to be added by a system and removed by the LockCleanupSystem at the end of every tick.
 */
class FDeathCertificate {
    constructor(config = {}) {
        // The entity ID of the entity that dealt the lethal blow.
        this.killerId = config.killerId || null;
        // The simulation tick in which the death occurred.
        this.deathTick = config.deathTick || 0;
    }
}

/**
 * Component tracking an organism's fatigue level.
 * This is separate from energy, representing a physiological need for sleep/rest.
 */
class FFatigue {
    constructor(config = {}) {
        // How tired the organism is. 0 = fully rested.
        this.current = config.current || 0.0;
        // The point at which the organism is exhausted and must rest.
        this.maximum = config.maximum || 100.0;
        // The point at which the organism is considered "rested enough" to wake up.
        this.wakeThreshold = config.wakeThreshold || 10.0;
    }
}

// ===== CONDITION COMPONENTS - Layered Behavioral States =====
// These components represent internal conditions that affect organism behavior.
// They act as "layers" on top of the single Action State, providing rich behavioral context.
// NOTE: Basic condition tags are defined above in the hierarchical behavior section

/**
 * Component indicating the organism is injured.
 * The severity allows for different behavioral responses.
 */
class FInjury {
    constructor(config = {}) {
        // Severity from 0.0 (no injury) to 1.0 (near death).
        // Calculated from health percentage: (1.0 - health / maxHealth)
        this.severity = config.severity || 0.1;
    }
}

/**
 * Component indicating the organism is sick.
 * Systems can use this to apply health drain or make the entity a target.
 */
class FSickness {
    constructor(config = {}) {
        this.type = config.type || 'GenericVirus'; // e.g., 'GenericVirus', 'FoodPoisoning'
        this.severity = config.severity || 0.2;    // Sickness severity (0.0 to 1.0)
    }
}

/**
 * Component indicating the organism is aware of a potential threat.
 * Added by BehaviorSystem when a threat is sensed but not yet imminent.
 */
class FVigilance {
    constructor(config = {}) {
        this.targetId = config.targetId; // The entityID of the potential threat
        if (this.targetId === undefined) {
            throw new Error('FVigilance requires a targetId');
        }
    }
}

/**
 * FVisualEffectRequest - Intent component for requesting one-shot visual effects
 *
 * This component follows the intent-based pattern used throughout the ECS architecture.
 * Systems that want to trigger visual effects create this component, and the RenderingSystem
 * processes and removes it during the presentation phase.
 *
 * This ensures proper separation of concerns:
 * - Simulation systems focus on logic and create effect requests
 * - RenderingSystem handles all DOM manipulation and visual presentation
 * - No timing issues between simulation and presentation phases
 */
class FVisualEffectRequest {
    constructor(config = {}) {
        // Core effect identification
        this.effectType = config.effectType;           // EVisualEffectType enum value
        this.priority = config.priority || 'normal';   // 'low', 'normal', 'high', 'critical'

        // Visual parameters
        this.color = config.color || '#FFFFFF';        // CSS color string
        this.duration = config.duration || 500;        // Milliseconds
        this.intensity = config.intensity || 1.0;      // 0.0 to 1.0
        this.scale = config.scale || 1.0;              // Size multiplier

        // Timing and lifecycle
        this.createdTick = config.createdTick || 0;    // When request was created
        this.delay = config.delay || 0;                // Delay before effect starts (ms)

        // Metadata for complex effects
        this.parameters = config.parameters || {};     // Effect-specific data
        this.sourceSystem = config.sourceSystem;       // For debugging/tracking
    }
}

class FEntityAlias {
    constructor(config = {}) {
        // The entity ID that this entity is now an alias for.
        this.redirectTo = config.redirectTo;
        if (this.redirectTo === undefined) {
            throw new Error('FEntityAlias requires a redirectTo entity ID.');
        }
        // The reason for the alias, for debugging and specific logic.
        this.reason = config.reason || 'transformation'; // e.g., 'transformation', 'evolution'
    }
}


class FLifecycleState {
    constructor(config = {}) {
        this.currentState = config.currentState || 'ACTIVE';
    }
}

/**
 * Component representing an organism's long-term reproductive or social state.
 * Added by ReproductionSystem or GroupSystem.
 */
class FSocialStatus {
    constructor(config = {}) {
        // Is the organism currently responsible for young?
        this.inParentalCare = config.inParentalCare || false;
        // List of offspring entity IDs
        this.offspringIds = config.offspringIds || [];
        // Is the organism currently gestating?
        this.isGestating = config.isGestating || false;
        // The tick when gestation/parental care will end.
        this.carePeriodEndsTick = config.carePeriodEndsTick || 0;
    }
}

/**
 * FGasExchangeStatistics Component - Tracks atmospheric gas exchange statistics
 * Used by StatisticsSystem to track photosynthesis and respiration rates
 * Attached to the system entity
 */
class FGasExchangeStatistics {
    constructor(config = {}) {
        // Photosynthesis statistics
        this.co2Consumed = config.co2Consumed || 0;        // mol per tick
        this.o2Produced = config.o2Produced || 0;          // mol per tick
        this.biomassCreated = config.biomassCreated || 0;  // g per tick
        this.activeProducers = config.activeProducers || 0;

        // Respiration statistics
        this.o2Consumed = config.o2Consumed || 0;          // mol per tick
        this.co2Produced = config.co2Produced || 0;        // mol per tick
        this.energyReleased = config.energyReleased || 0;  // kJ per tick
        this.activeConsumers = config.activeConsumers || 0;

        // Net changes
        this.netCO2Change = config.netCO2Change || 0;      // mol per tick
        this.netO2Change = config.netO2Change || 0;        // mol per tick

        // Timestamp of last update
        this.lastUpdateTick = config.lastUpdateTick || 0;
    }

    // Reset statistics for a new tick
    reset() {
        this.co2Consumed = 0;
        this.o2Produced = 0;
        this.biomassCreated = 0;
        this.activeProducers = 0;
        this.o2Consumed = 0;
        this.co2Produced = 0;
        this.energyReleased = 0;
        this.activeConsumers = 0;
        this.netCO2Change = 0;
        this.netO2Change = 0;
    }
}

/**
 * Component representing an organism's circadian rhythm and sleep behavior.
 * Added by BehaviorSystem or SleepSystem.
 */
class FCircadianRhythm {
    constructor(config = {}) {
        // Activity Period: 'Diurnal', 'Nocturnal', 'Crepuscular', 'Any'.
        this.activityPeriod = config.activityPeriod || 'Any';

        // What is the metabolic multiplier during dormancy? (e.g., 0.3 = 30% of normal rate)
        this.dormancyMultiplier = config.dormancyMultiplier || 0.8;

        // --- ADVANCED SLEEP PARAMETERS (for complex animals only) ---
        // Does this organism experience neurological sleep?
        this.bRequiresSleep = config.bRequiresSleep === true;

        // If it requires sleep, what are its parameters?
        // These will ONLY be used if bRequiresSleep is true.
        this.sleepHrsNeeded = config.sleepHrsNeeded || 0;
        this.circadianStrength = config.circadianStrength || 0;
        this.sleepUrgeThreshold = config.sleepUrgeThreshold || 80.0;
        this.wakefulnessThreshold = config.wakefulnessThreshold || 10.0;
        
        // --- Calculated values in the factory ---
        this.fatigueAccumulationRate_per_hr = 0;
        this.fatigueDissipationRate_per_hr = 0;
    }
}

/**
 * FWasteManagement - Trait component defining how an organism handles waste.
 * Holds the raw factors for calculating waste capacity and timing.
 */
class FWasteManagement {
    constructor(config = {}) {
        // Defines the relationship between body mass and waste capacity.
        // e.g., 0.02 means capacity is 2% of body mass.
        this.capacityPerKgBodyMass = config.capacityPerKgBodyMass || 0.02;

        // A multiplier based on the organism's broad taxonomic group.
        // This allows for class-wide differences (e.g., reptiles vs. mammals).
        this.taxonomicCapacityMultiplier = config.taxonomicCapacityMultiplier || 1.0;

        // The percentage (0-1) of capacity at which the organism feels the "urge" to excrete.
        this.releaseThreshold_pct = config.releaseThreshold_pct || 0.7;

        // The base retention time in hours, which will be scaled by mass and metabolism.
        this.baseRetentionTime_hrs = config.baseRetentionTime_hrs || 12.0;
    }
}

class FWasteBuffer {
    constructor(config = {}) {
        this.current_g = config.current_g || 0;
        this.fecal_g = config.fecal_g || 0;
        this.urinary_g = config.urinary_g || 0;
        this.nitrogen_g = config.nitrogen_g || 0;
        this.phosphorus_g = config.phosphorus_g || 0;
    }
}

// === CLEANUP COMPONENTS ===
// Components for memory management and cleanup operations

/**
 * MarkedForCleanup - Component to mark entities for memory cleanup
 *
 * This component is added to entities that need their tracker references cleaned up.
 * The CleanupSystem processes these markers in Phase 8 to prevent memory leaks.
 *
 *  This component prevents the eventsByEntity map from growing forever.
 */
class MarkedForCleanup {
    constructor(data = {}) {
        // Reason for cleanup (e.g., 'entity_destroyed', 'death', 'recycled')
        this.reason = data.reason || 'unknown';

        // Tick when the entity was marked for cleanup
        this.markedTick = data.markedTick || 0;

        // Optional: Additional cleanup metadata
        this.metadata = data.metadata || {};
    }

    /**
     * Get a human-readable description of why this entity is marked for cleanup
     */
    getCleanupReason() {
        const reasons = {
            'entity_destroyed': 'Entity was destroyed',
            'death': 'Entity died',
            'recycled': 'Entity ID was recycled',
            'stale_reference': 'Stale reference detected',
            'manual_cleanup': 'Manual cleanup requested'
        };

        return reasons[this.reason] || `Unknown reason: ${this.reason}`;
    }

    /**
     * Check if this cleanup marker is stale (older than specified ticks)
     */
    isStale(currentTick, maxAge = 100) {
        return (currentTick - this.markedTick) > maxAge;
    }
}

/**
 * EVisualEffectType - Enum for visual effect types
 *
 * This enum defines all available visual effect types that can be requested
 * through the FVisualEffectRequest component. Each type corresponds to a
 * specific visual effect implementation in the RenderingSystem.
 */
var EVisualEffectType = {
    // Nutrient/metabolism effects
    NUTRIENT_SUCCESS: 'nutrient_success',
    NUTRIENT_FAILURE: 'nutrient_failure',
    PHOTOSYNTHESIS_FLASH: 'photosynthesis_flash',
    OXYGEN_BUBBLE: 'oxygen_bubble',

    // Combat/damage effects
    DAMAGE_SPARK: 'damage_spark',
    HEALING_GLOW: 'healing_glow',
    DEATH_FADE: 'death_fade',

    // Movement/behavior effects
    SPEED_TRAIL: 'speed_trail',
    STEALTH_SHIMMER: 'stealth_shimmer',

    // Environmental effects
    TEMPERATURE_GLOW: 'temperature_glow',
    WATER_RIPPLE: 'water_ripple',

    // Generic effects
    PULSE: 'pulse',
    FLASH: 'flash',
    GLOW: 'glow'
};

console.log('✅ ECS core components loaded');


export {
    // Core components
    FPosition, FEnergy, FHealth, FAge, VisualFade, Renderable, FVisualEffectRequest,
    StateChangeDelta, FLifecycleState, FEntityAlias,

    // Group components
    FGroupMember, FGroup,

    // Three-tier cognitive architecture components
    FHierarchicalBehavior, FStateConditions, FBehavioralMomentum, FMotivations,
    FReevaluationRequest, FPlayerCommand,

    // Condition tag components
    IsStarving, IsThreatened, IsBeingAttacked, CanHealInCombat, IsInjured,
    IsThirsty, IsExhausted, IsColdStressed, IsHeatStressed, FNeedsToExcrete,

    // Environmental and physical components
    FEnvironmentalResponse, FCorpseState, IsInspected, FClaimedBy, FDeathCertificate,
    FDigestionBuffer, FFatigue, FInjury, FSickness, FVigilance, FSocialStatus,
    FGasExchangeStatistics, FCircadianRhythm, FWasteManagement, FWasteBuffer,

    // Intent components
    MoveIntent, PhotosynthesisIntent, NutrientUptakeIntent, GrazingIntent,
    PredationIntent, ScavengingIntent, DetritivoryIntent, DecompositionIntent,
    MetabolismIntent, DrinkIntent, WasteExcretionIntent, ReproductionIntent,

    // Timer components
    FTimer, FTimerEvent,

    // Memory component
    FMemory,

    // Cleanup components
    MarkedForCleanup,

    // Enums
    EVisualEffectType
};
