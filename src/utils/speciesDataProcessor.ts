import { SpeciesData, Card, TrophicRole, Habitat, ConservationStatus, CardAbility } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Import all species data

/**
 * Determines trophic role based on species acquisition capabilities and taxonomy
 * This reflects the dynamic nature of ecological roles - what an organism is doing
 * in that moment within the ecosystem's energy flow, not a permanent label.
 */
export function determineTrophicRole(speciesData: any): TrophicRole {
  const { identity, acquisition, archetypeName } = speciesData;

  // Debug logging for problematic species
  if (!identity || !identity.taxonomy) {
    console.log(`🔍 Processing trophic role for: ${archetypeName}`);
    console.log('Identity:', identity);
    console.log('Taxonomy:', identity?.taxonomy);
  }

  // Defensive check for data structure
  if (!identity) {
    console.warn(`❌ Missing identity data for species: ${archetypeName}`);
    return determineTrophicRoleFromName(archetypeName);
  }

  if (!identity.taxonomy) {
    console.warn(`❌ Missing taxonomy data for species: ${archetypeName}`);
    console.warn('Available identity keys:', Object.keys(identity));
    return determineTrophicRoleFromName(archetypeName);
  }

  // Check if it's a plant (Producer)
  if (identity.taxonomy.kingdom === 'Plantae') {
    console.log(`✅ ${archetypeName} classified as PRODUCER (Plantae)`);
    return TrophicRole.PRODUCER;
  }

  // For animals, analyze acquisition capabilities to determine ecological role
  if (acquisition?.capabilities && Array.isArray(acquisition.capabilities)) {
    const capabilities = acquisition.capabilities;

    // Collect all acquisition methods with their weights
    const methods = capabilities.map((cap: any) => ({
      method: cap.method,
      weight: cap.preference_weight || 0
    }));

    // Determine role based on acquisition methods and preferences
    const role = determineEcologicalRole(methods, archetypeName);

    // Log interesting classifications
    if (role === TrophicRole.OMNIVORE || role === TrophicRole.DETRITIVORE || role === TrophicRole.SCAVENGER) {
      console.log(`🎯 ${archetypeName} classified as: ${role} (methods: ${methods.map((m: any) => m.method).join(', ')})`);
    }

    return role;
  }
  // Default fallback
  return determineTrophicRoleFromName(archetypeName);
}

/**
 * Determines ecological role based on acquisition methods and preferences
 * Reflects the flexible nature of trophic roles in real ecosystems
 */
function determineEcologicalRole(methods: Array<{method: string, weight: number}>, speciesName: string): TrophicRole {
  const methodCounts = {
    predation: 0,
    herbivory: 0,
    detritivory: 0,
    scavenging: 0,
    decomposition: 0,
    filterFeeding: 0
  };

  let totalWeight = 0;

  // Analyze each acquisition method
  methods.forEach(({ method, weight }) => {
    totalWeight += weight;

    switch (method.toLowerCase()) {
      case 'predation':
      case 'hunting':
        methodCounts.predation += weight;
        break;
      case 'grazing':
      case 'browsing':
      case 'frugivory':
      case 'nectarivory':
        methodCounts.herbivory += weight;
        break;
      case 'detritivory':
        methodCounts.detritivory += weight;
        break;
      case 'carrion_feeding':
      case 'scavenging':
        methodCounts.scavenging += weight;
        break;
      case 'decomposition':
      case 'saprotrophic':
        methodCounts.decomposition += weight;
        break;
      case 'filter_feeding':
      case 'suspension_feeding':
        methodCounts.filterFeeding += weight;
        break;
    }
  });

  // Determine role based on method diversity and preferences
  const activeMethodCount = Object.values(methodCounts).filter(count => count > 0).length;

  // Decomposers (fungi, bacteria)
  if (methodCounts.decomposition > 0) {
    return TrophicRole.DECOMPOSER;
  }

  // Detritivores (earthworms, etc.)
  if (methodCounts.detritivory > 0 && activeMethodCount === 1) {
    return TrophicRole.DETRITIVORE;
  }

  // Filter feeders
  if (methodCounts.filterFeeding > 0 && activeMethodCount === 1) {
    return TrophicRole.FILTER_FEEDER;
  }

  // Omnivores (multiple feeding strategies with significant weights)
  if (activeMethodCount >= 2) {
    const predationRatio = methodCounts.predation / totalWeight;
    const herbivoryRatio = methodCounts.herbivory / totalWeight;
    const scavengingRatio = methodCounts.scavenging / totalWeight;

    // If both plant and animal matter are significant parts of diet
    // OR if they have predation + scavenging + herbivory (like bears)
    if ((predationRatio > 0.2 && herbivoryRatio > 0.2) ||
        (predationRatio > 0.15 && herbivoryRatio > 0.15 && scavengingRatio > 0.15)) {
      return TrophicRole.OMNIVORE;
    }
  }

  // Scavengers (primarily carrion feeders with minimal other feeding)
  if (methodCounts.scavenging > 0 && activeMethodCount === 1) {
    return TrophicRole.SCAVENGER;
  }

  // Scavengers (carrion feeding dominates but not omnivorous)
  if (methodCounts.scavenging > methodCounts.predation &&
      methodCounts.scavenging > methodCounts.herbivory &&
      methodCounts.herbivory < totalWeight * 0.15) {
    return TrophicRole.SCAVENGER;
  }

  // Pure carnivores
  if (methodCounts.predation > 0 && methodCounts.herbivory === 0) {
    return TrophicRole.CARNIVORE;
  }

  // Pure herbivores
  if (methodCounts.herbivory > 0 && methodCounts.predation === 0) {
    return TrophicRole.HERBIVORE;
  }

  // Fallback based on species name
  return determineTrophicRoleFromName(speciesName);
}

/**
 * Fallback function to determine trophic role from archetype name
 */
function determineTrophicRoleFromName(archetypeName: string): TrophicRole {
  const name = archetypeName.toLowerCase();

  // Producers (plants)
  if (name.includes('grass') || name.includes('tree') || name.includes('corn') ||
      name.includes('clover') || name.includes('sunflower') || name.includes('strawberry') ||
      name.includes('grapes') || name.includes('cherry') || name.includes('pear') ||
      name.includes('eelgrass')) {
    return TrophicRole.PRODUCER;
  }

  // Decomposers
  if (name.includes('bacteria') || name.includes('mushroom') ||
      name.includes('earthworm') || name.includes('dung-beetle')) {
    return TrophicRole.DECOMPOSER;
  }

  // Carnivores
  if (name.includes('wolf') || name.includes('fox') || name.includes('bear') ||
      name.includes('lizard')) {
    return TrophicRole.CARNIVORE;
  }

  // Default to herbivore
  return TrophicRole.HERBIVORE;
}

/**
 * Determines habitat based on optimal temperature range
 */
export function determineHabitat(speciesData: any): Habitat {
  const { temperatureOptimalMin_C } = speciesData.environmentalResponse;
  
  if (temperatureOptimalMin_C < 0) {
    return Habitat.TUNDRA;
  } else if (temperatureOptimalMin_C <= 15) {
    return Habitat.TEMPERATE;
  } else {
    return Habitat.TROPICAL;
  }
}

/**
 * Maps biological stats to TCG card stats
 */
export function mapStatsToCard(speciesData: any): {
  power: number;
  health: number;
  speed: number;
  senses: number;
} {
  const { body, movement, perception } = speciesData;
  
  // Power: body.mass_kg / 10 (rounded)
  const power = Math.round(body.mass_kg / 10) || 1;
  
  // Health: body.mass_kg (rounded)
  const health = Math.round(body.mass_kg) || 1;
  
  // Speed: highest movement speed / 1000 (rounded)
  let speed = 1;
  if (movement) {
    const speeds = [
      movement.run_Speed_m_per_hr || 0,
      movement.walk_Speed_m_per_hr || 0,
      movement.swim_Speed_m_per_hr || 0,
      movement.fastSwim_Speed_m_per_hr || 0,
      movement.fly_Speed_m_per_hr || 0
    ];
    const maxSpeed = Math.max(...speeds);
    speed = Math.round(maxSpeed / 1000) || 1;
  }
  
  // Senses: highest perception value
  let senses = 1;
  if (perception) {
    const perceptionValues = [
      perception.vision_range_m || 0,
      perception.smell_range_m || 0,
      perception.hearing_range_m || 0,
      perception.heat_range_m || 0
    ];
    senses = Math.round(Math.max(...perceptionValues)) || 1;
  }
  
  return { power, health, speed, senses };
}

/**
 * Determines conservation status based on real IUCN data and species characteristics
 */
export function determineConservationStatus(speciesData: any): ConservationStatus {
  const commonName = speciesData.identity.commonName.toLowerCase();
  const scientificName = speciesData.identity.scientificName.toLowerCase();

  // Extinct species
  if (commonName.includes('mammoth') || scientificName.includes('mammuthus')) {
    return ConservationStatus.EXTINCT;
  }
  if (commonName.includes('dodo') || scientificName.includes('raphus')) {
    return ConservationStatus.EXTINCT;
  }

  // Critically Endangered
  if (commonName.includes('tiger') || scientificName.includes('panthera tigris')) {
    return ConservationStatus.CRITICALLY_ENDANGERED;
  }
  if (commonName.includes('orangutan') || scientificName.includes('pongo')) {
    return ConservationStatus.CRITICALLY_ENDANGERED;
  }
  if (commonName.includes('rhinoceros') || commonName.includes('rhino')) {
    return ConservationStatus.CRITICALLY_ENDANGERED;
  }

  // Endangered
  if (commonName.includes('elephant') || scientificName.includes('elephas') || scientificName.includes('loxodonta')) {
    return ConservationStatus.ENDANGERED;
  }
  if (commonName.includes('gorilla') || scientificName.includes('gorilla')) {
    return ConservationStatus.ENDANGERED;
  }
  if (commonName.includes('panda') || scientificName.includes('ailuropoda')) {
    return ConservationStatus.ENDANGERED;
  }

  // Vulnerable
  if (commonName.includes('bear') && !commonName.includes('water buffalo')) {
    return ConservationStatus.VULNERABLE;
  }
  if (commonName.includes('lion') || scientificName.includes('panthera leo')) {
    return ConservationStatus.VULNERABLE;
  }
  if (commonName.includes('hippopotamus') || scientificName.includes('hippopotamus')) {
    return ConservationStatus.VULNERABLE;
  }
  if (commonName.includes('koala') || scientificName.includes('phascolarctos')) {
    return ConservationStatus.VULNERABLE;
  }

  // Near Threatened
  if (commonName.includes('wolf') || scientificName.includes('canis lupus')) {
    return ConservationStatus.NEAR_THREATENED;
  }
  if (commonName.includes('leopard') || scientificName.includes('panthera pardus')) {
    return ConservationStatus.NEAR_THREATENED;
  }
  if (commonName.includes('giraffe') || scientificName.includes('giraffa')) {
    return ConservationStatus.NEAR_THREATENED;
  }

  // Data Deficient (for some lesser-known species)
  if (commonName.includes('hedgehog') || commonName.includes('hamster')) {
    return ConservationStatus.DATA_DEFICIENT;
  }

  // Default to Least Concern for common domestic and widespread species
  return ConservationStatus.LEAST_CONCERN;
}

/**
 * Generates species-specific abilities based on biological traits
 */
export function generateAbilities(speciesData: any, trophicRole: TrophicRole): CardAbility[] {
  const abilities: CardAbility[] = [];
  const { perception, movement, acquisition } = speciesData;
  
  // Pack hunting ability for wolves
  if (speciesData.archetypeName === 'wolf') {
    abilities.push({
      id: uuidv4(),
      name: 'Pack Hunter',
      description: 'If you control another Carnivore: +15% attack success rate',
      trigger: { type: 'combat', condition: 'friendly_carnivore_present' },
      effect: { type: 'stat_modifier', target: 'self', value: 15 }
    });
  }
  
  // Keen senses for high perception species
  if (perception && Math.max(
    perception.smell_range_m || 0,
    perception.hearing_range_m || 0,
    perception.vision_range_m || 0
  ) > 100) {
    abilities.push({
      id: uuidv4(),
      name: 'Keen Senses',
      description: 'If target has Senses < 60: +20% attack success rate',
      trigger: { type: 'combat', condition: 'target_low_senses', value: 60 },
      effect: { type: 'stat_modifier', target: 'self', value: 20 }
    });
  }
  
  // Flight ability
  if (movement?.fly_Speed_m_per_hr && movement.fly_Speed_m_per_hr > 0) {
    abilities.push({
      id: uuidv4(),
      name: 'Flight',
      description: 'Cannot be attacked by non-flying species',
      trigger: { type: 'conditional', condition: 'defender_cannot_fly' },
      effect: { type: 'special', target: 'self', value: 0 }
    });
  }
  
  // Photosynthesis for producers
  if (trophicRole === TrophicRole.PRODUCER) {
    abilities.push({
      id: uuidv4(),
      name: 'Photosynthesis',
      description: 'Gain +1 Energy when played',
      trigger: { type: 'play' },
      effect: { type: 'energy', target: 'self', value: 1 }
    });
  }

  // Adaptive feeding for omnivores
  if (trophicRole === TrophicRole.OMNIVORE) {
    abilities.push({
      id: uuidv4(),
      name: 'Adaptive Feeding',
      description: 'Can target both Producers and Herbivores in combat',
      trigger: { type: 'combat' },
      effect: { type: 'special', target: 'self', value: 1 }
    });
  }

  // Nutrient cycling for detritivores
  if (trophicRole === TrophicRole.DETRITIVORE) {
    abilities.push({
      id: uuidv4(),
      name: 'Nutrient Cycling',
      description: 'When this card is destroyed, gain +1 Energy',
      trigger: { type: 'conditional' },
      effect: { type: 'energy', target: 'self', value: 1 }
    });
  }

  return abilities;
}

/**
 * Determines energy cost based on trophic role and stats
 */
export function determineEnergyCost(trophicRole: TrophicRole, power: number): number {
  switch (trophicRole) {
    case TrophicRole.PRODUCER:
      return 1;
    case TrophicRole.HERBIVORE:
      return Math.min(2, Math.max(1, Math.floor(power / 3)));
    case TrophicRole.CARNIVORE:
      return Math.min(3, Math.max(2, Math.floor(power / 2)));
    case TrophicRole.OMNIVORE:
      return Math.min(3, Math.max(2, Math.floor(power / 2.5))); // Between herbivore and carnivore
    case TrophicRole.DETRITIVORE:
      return Math.min(2, Math.max(1, Math.floor(power / 4))); // Low energy cost for recyclers
    case TrophicRole.DECOMPOSER:
      return 1;
    case TrophicRole.SCAVENGER:
      return Math.min(2, Math.max(1, Math.floor(power / 3))); // Similar to herbivores
    default:
      return 1;
  }
}

/**
 * Converts species JSON data to TCG card
 */
export function convertSpeciesToCard(speciesData: any): Card {
  // Handle the real JSON structure
  const identity = speciesData.identity;
  const body = speciesData.body;
  const perception = speciesData.perception;
  const movement = speciesData.movement;
  const environment = speciesData.environment;
  const phyloAttributes = speciesData.phyloAttributes;

  const trophicRole = determineTrophicRole(speciesData);
  const habitat = determineHabitat(speciesData);
  const stats = mapStatsToCardFromRealData(speciesData);
  const conservationStatus = determineConservationStatus(speciesData);
  const abilities = generateAbilities(speciesData, trophicRole);
  const energyCost = determineEnergyCost(trophicRole, stats.power);

  return {
    id: uuidv4(),
    speciesName: speciesData.archetypeName || identity?.commonName || 'Unknown',
    commonName: identity?.commonName || 'Unknown Species',
    scientificName: identity?.scientificName || 'Unknown',
    trophicRole,
    habitat,
    power: stats.power,
    health: stats.health,
    maxHealth: stats.health,
    speed: stats.speed,
    senses: stats.senses,
    energyCost,
    abilities,
    conservationStatus,
    artwork: `/images/species/${speciesData.archetypeName}.svg`, // Placeholder
    description: generateRealDescription(speciesData, body, environment),
    // Include real biological data
    realData: {
      mass_kg: body?.mass_kg || 0,
      // Movement speeds from the actual JSON structure
      walk_Speed_m_per_hr: movement?.walk_Speed_m_per_hr,
      run_Speed_m_per_hr: movement?.run_Speed_m_per_hr,
      swim_Speed_m_per_hr: movement?.swim_Speed_m_per_hr,
      burrow_Speed_m_per_hr: movement?.burrow_Speed_m_per_hr,
      fly_Speed_m_per_hr: movement?.fly_Speed_m_per_hr,
      // Sensory capabilities from the actual JSON structure
      vision_range_m: perception?.vision_range_m,
      hearing_range_m: perception?.hearing_range_m,
      smell_range_m: perception?.smell_range_m,
      taste_range_m: perception?.taste_range_m,
      touch_range_m: perception?.touch_range_m,
      heat_range_m: perception?.heat_range_m,
      // Environmental data
      temperatureMinimum_C: environment?.temperatureMinimum_C,
      temperatureMaximum_C: environment?.temperatureMaximum_C,
      temperatureOptimalMin_C: environment?.temperatureOptimalMin_C,
      temperatureOptimalMax_C: environment?.temperatureOptimalMax_C,
      moistureOptimal_pct: environment?.moistureOptimal_pct,
      moistureTolerance_pct: environment?.moistureTolerance_pct,
      moistureLethal_pct: environment?.moistureLethal_pct,
      // Lifespan data
      lifespan_Max_Days: body?.lifespan_Max_Days,
      habitat: environment?.habitat
    },
    // Phylo domino-style game attributes
    phyloAttributes: phyloAttributes ? {
      terrains: phyloAttributes.terrains || [],
      climates: phyloAttributes.climates || [],
      foodchainLevel: phyloAttributes.foodchainLevel || 1,
      scale: phyloAttributes.scale || 5,
      dietType: phyloAttributes.dietType || 'Producer',
      movementCapability: phyloAttributes.movementCapability || {
        moveValue: 0,
        canFly: false,
        canSwim: false,
        canBurrow: false
      },
      specialKeywords: phyloAttributes.specialKeywords || [],
      pointValue: phyloAttributes.pointValue || 2,
      conservationStatus: phyloAttributes.conservationStatus || 'Not Evaluated',
      compatibilityNotes: phyloAttributes.compatibilityNotes || ''
    } : undefined
  };
}

/**
 * Map real JSON data to card stats
 */
function mapStatsToCardFromRealData(speciesData: any): { power: number; health: number; speed: number; senses: number } {
  const body = speciesData.body;
  const movement = speciesData.movement;
  const perception = speciesData.perception;

  // Calculate power from mass
  const mass = body?.mass_kg || 0.01;
  const power = Math.max(1, Math.min(10, Math.round(mass / 10)));

  // Calculate health from mass (smaller scale)
  const health = Math.max(1, Math.min(50, Math.round(mass)));

  // Calculate speed from locomotion data
  const maxSpeed = movement?.locomotion?.maxSpeed_ms || movement?.locomotion?.walkSpeed_ms || 1;
  const speed = Math.max(1, Math.min(10, Math.round(maxSpeed)));

  // Calculate senses from perception data
  const vision = perception?.vision?.acuity_m || 10;
  const hearing = perception?.hearing?.range_m || 10;
  const smell = perception?.smell?.range_m || 1;
  const maxSense = Math.max(vision, hearing, smell);
  const senses = Math.max(1, Math.min(200, Math.round(maxSense)));

  return { power, health, speed, senses };
}

/**
 * Generate description from real biological data
 */
function generateRealDescription(speciesData: any, body: any, environment: any): string {
  const mass = body?.mass_kg || 0;
  const tempMin = environment?.temperature?.min_C || 0;
  const tempMax = environment?.temperature?.max_C || 30;
  const habitat = environment?.habitat || 'Various';

  return `Mass: ${mass}kg | Temp: ${tempMin}°C to ${tempMax}°C | Habitat: ${habitat}`;
}

// Species data will be loaded dynamically to avoid Vite JSON parsing issues

// List of species to load dynamically
const speciesList = [
  // Existing species
  'grass', 'bush-cherry', 'apple-tree', 'corn', 'prickly-pear', 'white-clover',
  'eelgrass', 'sunflower', 'strawberry', 'grapes', 'rabbit', 'mouse',
  'chipmunk', 'deer', 'wolf', 'fox', 'bear', 'raccoon', 'mushroom',
  'earthworm', 'lizard', 'caterpillar', 'caterpillar_egg', 'butterfly',
  'dung-beetle', 'soil-bacteria',

  // New mammals
  'monkey', 'gorilla', 'orangutan', 'cat', 'lion', 'tiger', 'leopard',
  'horse', 'zebra', 'bison', 'cow', 'ox', 'water-buffalo', 'pig', 'boar',
  'ram', 'goat', 'camel', 'llama', 'giraffe', 'elephant', 'mammoth',
  'rhinoceros', 'hippopotamus', 'hamster', 'beaver', 'hedgehog', 'dog',
  'koala', 'panda',

  // New reptiles & amphibians
  'frog', 'turtle', 'snake',

  // New arthropods
  'snail', 'ant', 'cricket', 'spider', 'scorpion',

  // New plants & fungi
  'herb', 'rice', 'cactus', 'evergreen-tree', 'deciduous-tree', 'palm-tree',
  'cherry-blossom', 'hibiscus', 'rose', 'tulip', 'daisy'
];

/**
 * Dynamically load species data from JSON files
 */
export async function loadSpeciesData(): Promise<Record<string, any>> {
  const speciesDataMap: Record<string, any> = {};

  console.log('🔄 Loading species data dynamically...');

  for (const speciesName of speciesList) {
    try {
      // Use fetch to load JSON files from the public directory
      const response = await fetch(`/species/${speciesName}.json`);
      if (!response.ok) {
        console.warn(`❌ Failed to load ${speciesName}.json: ${response.status}`);
        continue;
      }

      const data = await response.json();
      speciesDataMap[speciesName] = data;
      console.log(`✅ Loaded ${speciesName}.json`);
    } catch (error) {
      console.error(`❌ Error loading ${speciesName}.json:`, error);
    }
  }

  console.log(`📊 Loaded ${Object.keys(speciesDataMap).length} species files`);
  return speciesDataMap;
}

/**
 * Loads and processes all species data into cards
 */
export async function loadAllSpeciesCards(): Promise<Card[]> {
  console.log('🎮 Loading species cards from real JSON data...');
  const cards: Card[] = [];

  try {
    // Load species data dynamically
    const speciesDataMap = await loadSpeciesData();

    // Check if we have any species data at all
    console.log('Species data map has', Object.keys(speciesDataMap).length, 'entries');

    if (Object.keys(speciesDataMap).length === 0) {
      console.warn('⚠️ No species data loaded, creating fallback cards');
      return createFallbackCards();
    }

  // Process each species from the data map
  for (const [speciesName, speciesData] of Object.entries(speciesDataMap)) {
    try {
      console.log(`Processing species: ${speciesName}`);

      if (speciesData && typeof speciesData === 'object') {
        // Check if the data has the expected structure
        if (!(speciesData as any).identity) {
          console.error(`Species ${speciesName} missing identity object`);
          continue;
        }

        const card = convertSpeciesToCard(speciesData as any);
        cards.push(card);
        console.log(`✅ Successfully created card for ${speciesName}: ${card.commonName}`);
      } else {
        console.warn(`Species data not found for: ${speciesName}`);
      }
    } catch (error) {
      console.error(`❌ Failed to process species data for ${speciesName}:`, error);
      // Continue processing other species instead of failing completely
    }
  }

  if (cards.length === 0) {
    console.warn('No cards created from species data, using fallback');
    return createFallbackCards();
  } else {
    console.log(`🎯 Created ${cards.length} cards from real species data`);
  }

  return cards;
  } catch (error) {
    console.error('❌ Failed to load species data:', error);
    console.log('🔄 Using fallback cards instead');
    return createFallbackCards();
  }
}

/**
 * Create fallback cards when species data fails to load
 */
function createFallbackCards(): Card[] {
  console.log('🎯 Creating fallback cards for demo purposes');

  const fallbackSpecies = [
    { name: 'grass', common: 'Grass', type: 'Producer' },
    { name: 'rabbit', common: 'Rabbit', type: 'Primary Consumer' },
    { name: 'fox', common: 'Fox', type: 'Secondary Consumer' },
    { name: 'bear', common: 'Bear', type: 'Omnivore' },
    { name: 'deer', common: 'Deer', type: 'Herbivore' },
    { name: 'wolf', common: 'Wolf', type: 'Carnivore' },
    { name: 'butterfly', common: 'Butterfly', type: 'Pollinator' },
    { name: 'oak-tree', common: 'Oak Tree', type: 'Producer' }
  ];

  return fallbackSpecies.map((species, index) => ({
    id: `fallback-${index}`,
    speciesName: species.name,
    commonName: species.common,
    scientificName: `Fallback ${species.common.toLowerCase()}`,
    type: species.type,
    rarity: 'Common',
    cost: Math.floor(Math.random() * 5) + 1,
    energyCost: Math.floor(Math.random() * 5) + 1,
    attack: Math.floor(Math.random() * 10) + 1,
    health: Math.floor(Math.random() * 10) + 5,
    power: Math.floor(Math.random() * 10) + 1,
    maxHealth: Math.floor(Math.random() * 10) + 5,
    speed: Math.floor(Math.random() * 5) + 1,
    senses: Math.floor(Math.random() * 5) + 1,
    abilities: [{
      id: 'basic-ability',
      name: 'Basic',
      description: 'A basic ability for demonstration.',
      trigger: 'onPlay' as any,
      effect: { type: 'none' } as any
    }],
    description: `A ${species.type.toLowerCase()} species for demonstration.`,
    flavorText: `${species.common} - essential for ecosystem balance.`,
    habitat: 'Forest' as Habitat,
    diet: species.type.includes('Producer') ? 'Photosynthesis' : 'Omnivore',
    imageUrl: `/images/species/${species.name}.jpg`,
    artwork: `/images/species/${species.name}.jpg`,
    realData: {
      mass_kg: Math.random() * 100,
      lifespan_days: Math.floor(Math.random() * 3650),
      metabolic_rate: Math.random() * 1000
    },
    trophicRole: species.type as TrophicRole,
    ecosystemRole: 'Balanced',
    conservationStatus: ConservationStatus.LEAST_CONCERN,
    currentHealth: Math.floor(Math.random() * 10) + 5
  }));
}


/**
 * Gets species data by name
 */
export async function getSpeciesData(speciesName: string): Promise<any | null> {
  try {
    const response = await fetch(`/species/${speciesName}.json`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to load species data for ${speciesName}:`, error);
    return null;
  }
}
