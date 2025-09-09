/**
 * Server-side CardId mapping utilities (Legacy)
 * Provides conversion between species_name (legacy) and CardId (new system)
 * This should match the mapping in the database migration 010_migrate_to_cardid_system.sql
 * @deprecated Use shared/utils/cardIdHelpers.ts instead for consistency
 */

/**
 * Comprehensive mapping from species_name (kebab-case) to CardId (number)
 * This mapping should be kept in sync with the database migration
 */
const SPECIES_NAME_TO_CARD_ID_MAP: Record<string, number> = {
  // Core starter pack species (exact matches from starterPackService.ts)
  'oak-tree': 1,           // OAK_TREE
  'giant-kelp': 2,         // GIANT_KELP  
  'grass': 3,              // REED_CANARY_GRASS (legacy mapping)
  'reed-canary-grass': 3,  // REED_CANARY_GRASS (proper mapping)
  'rabbit': 4,             // EUROPEAN_RABBIT (legacy mapping)
  'european-rabbit': 4,    // EUROPEAN_RABBIT (proper mapping)
  'fox': 53,               // RED_FOX (legacy mapping)
  'red-fox': 53,           // RED_FOX (proper mapping)
  'butterfly': 34,         // MONARCH_BUTTERFLY (legacy mapping)
  'monarch-butterfly': 34, // MONARCH_BUTTERFLY (proper mapping)
  
  // Other cards from cards.json (CardId 1-97)
  'sockeye-salmon': 5,
  'american-black-bear': 6,
  'great-white-shark': 7,
  'mycena-mushroom': 8,
  'turkey-vulture': 9,
  'deer-tick': 10,
  'common-earthworm': 11,
  'dung-beetle': 12,
  'soil-bacteria': 13,
  'decomposer-mushroom': 14,
  'deep-sea-hydrothermal-vent-bacteria': 15,
  'iron-spring-bacteria': 16,
  'mycorrhizal-fungi': 17,
  'nitrogen-fixing-bacteria': 18,
  'pacific-krill': 19,
  'phytoplankton': 20,
  'zooplankton': 21,
  'european-honey-bee': 22,
  'volcanic-hydrogen-bacteria': 25,
  'nitrifying-soil-bacteria': 26,
  'sediment-chemosynthetic-bacteria': 27,
  'red-wood-ant': 28,
  'apple-tree': 29,
  'north-american-beaver': 30,
  'american-bison': 31,
  'wild-boar': 32,
  'bush-cherry': 33,
  'prickly-pear-cactus': 35,
  'dromedary-camel': 36,
  'domestic-cat': 37,
  'monarch-caterpillar': 38,
  'butterfly-egg': 39,
  'cherry-blossom': 40,
  'eastern-chipmunk': 41,
  'corn': 42,
  'domestic-cattle': 43,
  'house-cricket': 44,
  'common-daisy': 45,
  'english-oak': 46,
  'whitetailed-deer': 47,
  'domestic-dog': 48,
  'sacred-dung-beetle': 49,
  'eelgrass': 50,
  'african-bush-elephant': 51,
  'scots-pine': 52,
  'common-frog': 54,
  'giraffe': 55,
  'domestic-goat': 56,
  'mountain-gorilla': 57,
  'common-grape-vine': 58,
  'perennial-ryegrass': 59,
  'golden-hamster': 60,
  'european-hedgehog': 61,
  'spearmint': 62,
  'hibiscus': 63,
  'common-hippopotamus': 64,
  'domestic-horse': 65,
  'koala': 66,
  'leopard': 67,
  'african-lion': 68,
  'desert-lizard': 69,
  'llama': 70,
  'woolly-mammoth': 71,
  'common-chimpanzee': 72,
  'house-mouse': 73,
  'common-decomposer': 74,
  'bornean-orangutan': 75,
  'ox': 76,
  'coconut-palm': 77,
  'giant-panda': 78,
  'domestic-pig': 79,
  'common-raccoon': 80,
  'bighorn-sheep': 81,
  'white-rhinoceros': 82,
  'rice': 83,
  'sweet-briar': 84,
  'desert-hairy-scorpion': 85,
  'roman-snail': 86,
  'ball-python': 87,
  'garden-spider': 88,
  'garden-strawberry': 89,
  'common-sunflower': 90,
  'tiger': 91,
  'garden-tulip': 92,
  'green-sea-turtle': 93,
  'asian-water-buffalo': 94,
  'white-clover': 95,
  'gray-wolf': 96,
  'plains-zebra': 97,
  
  // Legacy species name mappings (from manifest.json and fallback systems)
  'bear': 6,                // Maps to AMERICAN_BLACK_BEAR
  'deer': 47,               // Maps to WHITETAILED_DEER  
  'wolf': 96,               // Maps to GRAY_WOLF
  'mouse': 73,              // Maps to HOUSE_MOUSE
  'cat': 37,                // Maps to DOMESTIC_CAT
  'dog': 48,                // Maps to DOMESTIC_DOG
  'pig': 79,                // Maps to DOMESTIC_PIG
  'cow': 43,                // Maps to DOMESTIC_CATTLE
  'horse': 65,              // Maps to DOMESTIC_HORSE
  'goat': 56,               // Maps to DOMESTIC_GOAT
  'sheep': 81,              // Maps to BIGHORN_SHEEP (closest match)
  'camel': 36,              // Maps to DROMEDARY_CAMEL
  'elephant': 51,           // Maps to AFRICAN_BUSH_ELEPHANT
  'lion': 68,               // Maps to AFRICAN_LION
  'panda': 78,              // Maps to GIANT_PANDA
  'zebra': 97,              // Maps to PLAINS_ZEBRA
  'bison': 31,              // Maps to AMERICAN_BISON
  'boar': 32,               // Maps to WILD_BOAR
  'beaver': 30,             // Maps to NORTH_AMERICAN_BEAVER
  'raccoon': 80,            // Maps to COMMON_RACCOON
  'chipmunk': 41,           // Maps to EASTERN_CHIPMUNK
  'hamster': 60,            // Maps to GOLDEN_HAMSTER
  'hedgehog': 61,           // Maps to EUROPEAN_HEDGEHOG
  'frog': 54,               // Maps to COMMON_FROG
  'turtle': 93,             // Maps to GREEN_SEA_TURTLE
  'snake': 87,              // Maps to BALL_PYTHON
  'snail': 86,              // Maps to ROMAN_SNAIL
  'spider': 88,             // Maps to GARDEN_SPIDER
  'scorpion': 85,           // Maps to DESERT_HAIRY_SCORPION
  'ant': 28,                // Maps to RED_WOOD_ANT
  'cricket': 44,            // Maps to HOUSE_CRICKET
  'earthworm': 11,          // Maps to COMMON_EARTHWORM
  'mushroom': 8,            // Maps to MYCENA_MUSHROOM
  'sunflower': 90,          // Maps to COMMON_SUNFLOWER
  'strawberry': 89,         // Maps to GARDEN_STRAWBERRY
  'grapes': 58,             // Maps to COMMON_GRAPE_VINE
  'mammoth': 71,            // Maps to WOOLLY_MAMMOTH
  'rhinoceros': 82,         // Maps to WHITE_RHINOCEROS
  'hippopotamus': 64,       // Maps to COMMON_HIPPOPOTAMUS
  'monkey': 72,             // Maps to COMMON_CHIMPANZEE (closest match)
  'gorilla': 57,            // Maps to MOUNTAIN_GORILLA
  'orangutan': 75,          // Maps to BORNEAN_ORANGUTAN
  'water-buffalo': 94,      // Maps to ASIAN_WATER_BUFFALO
  'ram': 81,                // Maps to BIGHORN_SHEEP
  'herb': 62,               // Maps to SPEARMINT (closest herb match)
  'cactus': 35,             // Maps to PRICKLY_PEAR_CACTUS
  'evergreen-tree': 52,     // Maps to SCOTS_PINE
  'deciduous-tree': 1,      // Maps to OAK_TREE
  'caterpillar': 38,        // Maps to MONARCH_CATERPILLAR
  'caterpillar_egg': 39     // Maps to BUTTERFLY_EGG
};

/**
 * Convert species_name (kebab-case) to CardId (number)
 * @deprecated Use shared/utils/cardIdHelpers.ts instead
 */
export function speciesNameToCardId_old(speciesName: string): number | null {
  return SPECIES_NAME_TO_CARD_ID_MAP[speciesName] || null;
}

/**
 * Convert CardId (number) to species_name (kebab-case)
 * Creates reverse mapping for backward compatibility
 * @deprecated Use shared/utils/cardIdHelpers.ts instead
 */
export function cardIdToSpeciesName_old(cardId: number): string | null {
  for (const [speciesName, id] of Object.entries(SPECIES_NAME_TO_CARD_ID_MAP)) {
    if (id === cardId) {
      return speciesName;
    }
  }
  return null;
}

/**
 * Validate that a CardId exists in our mapping
 */
export function isValidCardId(cardId: number): boolean {
  return Object.values(SPECIES_NAME_TO_CARD_ID_MAP).includes(cardId);
}

/**
 * Validate that a species_name exists in our mapping
 */
export function isValidSpeciesName(speciesName: string): boolean {
  return speciesName in SPECIES_NAME_TO_CARD_ID_MAP;
}

/**
 * Get all valid CardIds
 */
export function getAllValidCardIds(): number[] {
  return Array.from(new Set(Object.values(SPECIES_NAME_TO_CARD_ID_MAP))).sort((a, b) => a - b);
}

/**
 * Get all valid species names
 */
export function getAllValidSpeciesNames(): string[] {
  return Object.keys(SPECIES_NAME_TO_CARD_ID_MAP).sort();
}
