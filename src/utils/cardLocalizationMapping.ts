/**
 * Card Localization Mapping Utilities
 * 
 * Maps legacy card data (commonName, scientificName) to localization enum IDs
 */

import { CardNameId, ScientificNameId, CardDescriptionId } from '@shared/text-ids';

/**
 * Maps common card names to CardNameId enum values
 */
export const getCardNameId = (commonName: string): CardNameId | null => {
  const nameMapping: Record<string, CardNameId> = {
    'Oak Tree': CardNameId.CARD_OAK_TREE,
    'Giant Kelp': CardNameId.CARD_GIANT_KELP,
    'Reed Canary Grass': CardNameId.CARD_REED_CANARY_GRASS,
    'Phytoplankton': CardNameId.CARD_PHYTOPLANKTON,
    'Deep Sea Hydrothermal Vent Bacteria': CardNameId.CARD_DEEP_SEA_HYDROTHERMAL_VENT_BACTERIA,
    'Iron Spring Bacteria': CardNameId.CARD_IRON_SPRING_BACTERIA,
    'Volcanic Hydrogen Bacteria': CardNameId.CARD_VOLCANIC_HYDROGEN_BACTERIA,
    'Nitrifying Soil Bacteria': CardNameId.CARD_NITRIFYING_SOIL_BACTERIA,
    'Sediment Chemosynthetic Bacteria': CardNameId.CARD_SEDIMENT_CHEMOSYNTHETIC_BACTERIA,
    'European Rabbit': CardNameId.CARD_EUROPEAN_RABBIT,
    'Sockeye Salmon': CardNameId.CARD_SOCKEYE_SALMON,
    'Pacific Krill': CardNameId.CARD_PACIFIC_KRILL,
    'Zooplankton': CardNameId.CARD_ZOOPLANKTON,
    'European Honey Bee': CardNameId.CARD_EUROPEAN_HONEY_BEE,
    'American Black Bear': CardNameId.CARD_AMERICAN_BLACK_BEAR,
    'Great White Shark': CardNameId.CARD_GREAT_WHITE_SHARK,
    'Mycena Mushroom': CardNameId.CARD_MYCENA_MUSHROOM,
    'Turkey Vulture': CardNameId.CARD_TURKEY_VULTURE,
    'Soil Bacteria': CardNameId.CARD_SOIL_BACTERIA,
    'Decomposer Mushroom': CardNameId.CARD_DECOMPOSER_MUSHROOM,
    'Common Earthworm': CardNameId.CARD_COMMON_EARTHWORM,
    'Dung Beetle': CardNameId.CARD_DUNG_BEETLE,
    'Deer Tick': CardNameId.CARD_DEER_TICK,
    'Mycorrhizal Fungi': CardNameId.CARD_MYCORRHIZAL_FUNGI,
    'Nitrogen Fixing Bacteria': CardNameId.CARD_NITROGEN_FIXING_BACTERIA,

    // Additional Producers (Trees and Plants)
    'Apple Tree': CardNameId.CARD_APPLE_TREE,
    'English Oak': CardNameId.CARD_ENGLISH_OAK,
    'Scots Pine': CardNameId.CARD_SCOTS_PINE,
    'Coconut Palm': CardNameId.CARD_COCONUT_PALM,
    'Cherry Blossom': CardNameId.CARD_CHERRY_BLOSSOM,
    'Bush Cherry': CardNameId.CARD_BUSH_CHERRY,
    'Prickly Pear Cactus': CardNameId.CARD_PRICKLY_PEAR_CACTUS,
    'Common Grape Vine': CardNameId.CARD_COMMON_GRAPE_VINE,
    'Perennial Ryegrass': CardNameId.CARD_PERENNIAL_RYEGRASS,
    'Common Daisy': CardNameId.CARD_COMMON_DAISY,
    'Spearmint': CardNameId.CARD_SPEARMINT,
    'Hibiscus': CardNameId.CARD_HIBISCUS,
    'Sweet Briar': CardNameId.CARD_SWEET_BRIAR,
    'Garden Strawberry': CardNameId.CARD_GARDEN_STRAWBERRY,
    'Common Sunflower': CardNameId.CARD_COMMON_SUNFLOWER,
    'Garden Tulip': CardNameId.CARD_GARDEN_TULIP,
    'White Clover': CardNameId.CARD_WHITE_CLOVER,
    'Eelgrass': CardNameId.CARD_EELGRASS,
    'Corn/Maize': CardNameId.CARD_CORN_MAIZE,
    'Rice': CardNameId.CARD_RICE,

    // Additional Primary Consumers (Herbivores)
    'North American Beaver': CardNameId.CARD_NORTH_AMERICAN_BEAVER,
    'American Bison': CardNameId.CARD_AMERICAN_BISON,
    'White-tailed Deer': CardNameId.CARD_WHITE_TAILED_DEER,
    'Eastern Chipmunk': CardNameId.CARD_EASTERN_CHIPMUNK,
    'Domestic Cattle': CardNameId.CARD_DOMESTIC_CATTLE,
    'Domestic Goat': CardNameId.CARD_DOMESTIC_GOAT,
    'Golden Hamster': CardNameId.CARD_GOLDEN_HAMSTER,
    'European Hedgehog': CardNameId.CARD_EUROPEAN_HEDGEHOG,
    'Domestic Horse': CardNameId.CARD_DOMESTIC_HORSE,
    'Koala': CardNameId.CARD_KOALA,
    'Llama': CardNameId.CARD_LLAMA,
    'House Mouse': CardNameId.CARD_HOUSE_MOUSE,
    'Ox': CardNameId.CARD_OX,
    'Giant Panda': CardNameId.CARD_GIANT_PANDA,
    'Domestic Pig': CardNameId.CARD_DOMESTIC_PIG,
    'Common Raccoon': CardNameId.CARD_COMMON_RACCOON,
    'Bighorn Sheep': CardNameId.CARD_BIGHORN_SHEEP,
    'White Rhinoceros': CardNameId.CARD_WHITE_RHINOCEROS,
    'Asian Water Buffalo': CardNameId.CARD_ASIAN_WATER_BUFFALO,
    'Plains Zebra': CardNameId.CARD_PLAINS_ZEBRA,
    'Giraffe': CardNameId.CARD_GIRAFFE,
    'African Bush Elephant': CardNameId.CARD_AFRICAN_BUSH_ELEPHANT,
    'Dromedary Camel': CardNameId.CARD_DROMEDARY_CAMEL,
    'Woolly Mammoth': CardNameId.CARD_WOOLLY_MAMMOTH,

    // Additional Secondary/Tertiary Consumers (Carnivores and Omnivores)
    'Wild Boar': CardNameId.CARD_WILD_BOAR,
    'Domestic Cat': CardNameId.CARD_DOMESTIC_CAT,
    'Domestic Dog': CardNameId.CARD_DOMESTIC_DOG,
    'Red Fox': CardNameId.CARD_RED_FOX,
    'Leopard': CardNameId.CARD_LEOPARD,
    'African Lion': CardNameId.CARD_AFRICAN_LION,
    'Mountain Gorilla': CardNameId.CARD_MOUNTAIN_GORILLA,
    'Common Chimpanzee': CardNameId.CARD_COMMON_CHIMPANZEE,
    'Bornean Orangutan': CardNameId.CARD_BORNEAN_ORANGUTAN,
    'Tiger': CardNameId.CARD_TIGER,
    'Gray Wolf': CardNameId.CARD_GRAY_WOLF,
    'Common Hippopotamus': CardNameId.CARD_COMMON_HIPPOPOTAMUS,

    // Additional Invertebrates and Small Animals
    'Red Wood Ant': CardNameId.CARD_RED_WOOD_ANT,
    'Monarch Butterfly': CardNameId.CARD_MONARCH_BUTTERFLY,
    'Monarch Caterpillar': CardNameId.CARD_MONARCH_CATERPILLAR,
    'Butterfly Egg': CardNameId.CARD_BUTTERFLY_EGG,
    'House Cricket': CardNameId.CARD_HOUSE_CRICKET,
    'Sacred Dung Beetle': CardNameId.CARD_SACRED_DUNG_BEETLE,
    'Desert Hairy Scorpion': CardNameId.CARD_DESERT_HAIRY_SCORPION,
    'Roman Snail': CardNameId.CARD_ROMAN_SNAIL,
    'Garden Spider': CardNameId.CARD_GARDEN_SPIDER,

    // Additional Decomposers
    'Common Decomposer': CardNameId.CARD_COMMON_DECOMPOSER,

    // Reptiles and Amphibians
    'Desert Lizard': CardNameId.CARD_DESERT_LIZARD,
    'Ball Python': CardNameId.CARD_BALL_PYTHON,
    'Common Frog': CardNameId.CARD_COMMON_FROG,
    'Green Sea Turtle': CardNameId.CARD_GREEN_SEA_TURTLE
  };

  return nameMapping[commonName] || null; // Return null if no mapping found
};

/**
 * Maps scientific names to ScientificNameId enum values
 */
export const getScientificNameId = (scientificName: string): ScientificNameId | null => {
  const scientificMapping: Record<string, ScientificNameId> = {
    'Quercus robur': ScientificNameId.SCIENTIFIC_QUERCUS_ROBUR,
    'Macrocystis pyrifera': ScientificNameId.SCIENTIFIC_MACROCYSTIS_PYRIFERA,
    'Phalaris arundinacea': ScientificNameId.SCIENTIFIC_PHALARIS_ARUNDINACEA,
    'Mixed phytoplankton': ScientificNameId.SCIENTIFIC_PHYTOPLANKTON_MIXED,
    'Thermococcus litoralis': ScientificNameId.SCIENTIFIC_THERMOTOGA_MARITIMA, // Using closest match
    'Acidithiobacillus ferrooxidans': ScientificNameId.SCIENTIFIC_ACIDITHIOBACILLUS_FERROOXIDANS,
    'Hydrogenobacter thermophilus': ScientificNameId.SCIENTIFIC_PYROCOCCUS_FURIOSUS, // Using closest match
    'Nitrosomonas europaea': ScientificNameId.SCIENTIFIC_NITROSOMONAS_EUROPAEA,
    'Beggiatoa alba': ScientificNameId.SCIENTIFIC_BEGGIATOA_ALBA,
    'Oryctolagus cuniculus': ScientificNameId.SCIENTIFIC_ORYCTOLAGUS_CUNICULUS,
    'Oncorhynchus nerka': ScientificNameId.SCIENTIFIC_ONCORHYNCHUS_NERKA,
    'Euphausia pacifica': ScientificNameId.SCIENTIFIC_EUPHAUSIA_PACIFICA,
    'Mixed zooplankton': ScientificNameId.SCIENTIFIC_ZOOPLANKTON_MIXED,
    'Apis mellifera': ScientificNameId.SCIENTIFIC_APIS_MELLIFERA,
    'Ursus americanus': ScientificNameId.SCIENTIFIC_URSUS_AMERICANUS,
    'Carcharodon carcharias': ScientificNameId.SCIENTIFIC_CARCHARODON_CARCHARIAS,
    'Mycena galericulata': ScientificNameId.SCIENTIFIC_MYCENA_GALERICULATA,
    'Cathartes aura': ScientificNameId.SCIENTIFIC_CATHARTES_AURA,
    'Bacillus subtilis': ScientificNameId.SCIENTIFIC_BACILLUS_SUBTILIS,
    'Agaricus bisporus': ScientificNameId.SCIENTIFIC_AGARICUS_BISPORUS,
    'Lumbricus terrestris': ScientificNameId.SCIENTIFIC_LUMBRICUS_TERRESTRIS,
    'Scarabaeus sacer': ScientificNameId.SCIENTIFIC_SCARABAEUS_LATICOLLIS, // Using closest match
    'Ixodes scapularis': ScientificNameId.SCIENTIFIC_IXODES_SCAPULARIS,
    'Glomus intraradices': ScientificNameId.SCIENTIFIC_GLOMUS_INTRARADICES,
    'Rhizobium leguminosarum': ScientificNameId.SCIENTIFIC_RHIZOBIUM_LEGUMINOSARUM,

    // Additional Producers (Trees and Plants)
    'Malus pumila': ScientificNameId.SCIENTIFIC_MALUS_PUMILA,
    'Pinus sylvestris': ScientificNameId.SCIENTIFIC_PINUS_SYLVESTRIS,
    'Cocos nucifera': ScientificNameId.SCIENTIFIC_COCOS_NUCIFERA,
    'Prunus serrulata': ScientificNameId.SCIENTIFIC_PRUNUS_SERRULATA,
    'Prunus pumila': ScientificNameId.SCIENTIFIC_PRUNUS_PUMILA,
    'Opuntia ficus-indica': ScientificNameId.SCIENTIFIC_OPUNTIA_FICUS_INDICA,
    'Vitis vinifera': ScientificNameId.SCIENTIFIC_VITIS_VINIFERA,
    'Lolium perenne': ScientificNameId.SCIENTIFIC_LOLIUM_PERENNE,
    'Bellis perennis': ScientificNameId.SCIENTIFIC_BELLIS_PERENNIS,
    'Mentha spicata': ScientificNameId.SCIENTIFIC_MENTHA_SPICATA,
    'Hibiscus rosa-sinensis': ScientificNameId.SCIENTIFIC_HIBISCUS_ROSA_SINENSIS,
    'Rosa rubiginosa': ScientificNameId.SCIENTIFIC_ROSA_RUBIGINOSA,
    'Fragaria × ananassa': ScientificNameId.SCIENTIFIC_FRAGARIA_ANANASSA,
    'Helianthus annuus': ScientificNameId.SCIENTIFIC_HELIANTHUS_ANNUUS,
    'Tulipa gesneriana': ScientificNameId.SCIENTIFIC_TULIPA_GESNERIANA,
    'Trifolium repens': ScientificNameId.SCIENTIFIC_TRIFOLIUM_REPENS,
    'Zostera marina': ScientificNameId.SCIENTIFIC_ZOSTERA_MARINA,
    'Zea mays': ScientificNameId.SCIENTIFIC_ZEA_MAYS,
    'Oryza sativa': ScientificNameId.SCIENTIFIC_ORYZA_SATIVA,

    // Additional Primary Consumers (Herbivores)
    'Castor canadensis': ScientificNameId.SCIENTIFIC_CASTOR_CANADENSIS,
    'Bison bison': ScientificNameId.SCIENTIFIC_BISON_BISON,
    'Odocoileus virginianus': ScientificNameId.SCIENTIFIC_ODOCOILEUS_VIRGINIANUS,
    'Tamias striatus': ScientificNameId.SCIENTIFIC_TAMIAS_STRIATUS,
    'Bos taurus': ScientificNameId.SCIENTIFIC_BOS_TAURUS,
    'Capra aegagrus hircus': ScientificNameId.SCIENTIFIC_CAPRA_AEGAGRUS_HIRCUS,
    'Mesocricetus auratus': ScientificNameId.SCIENTIFIC_MESOCRICETUS_AURATUS,
    'Erinaceus europaeus': ScientificNameId.SCIENTIFIC_ERINACEUS_EUROPAEUS,
    'Equus caballus': ScientificNameId.SCIENTIFIC_EQUUS_CABALLUS,
    'Phascolarctos cinereus': ScientificNameId.SCIENTIFIC_PHASCOLARCTOS_CINEREUS,
    'Lama glama': ScientificNameId.SCIENTIFIC_LAMA_GLAMA,
    'Mus musculus': ScientificNameId.SCIENTIFIC_MUS_MUSCULUS,
    'Ailuropoda melanoleuca': ScientificNameId.SCIENTIFIC_AILUROPODA_MELANOLEUCA,
    'Sus scrofa domesticus': ScientificNameId.SCIENTIFIC_SUS_SCROFA_DOMESTICUS,
    'Procyon lotor': ScientificNameId.SCIENTIFIC_PROCYON_LOTOR,
    'Ovis canadensis': ScientificNameId.SCIENTIFIC_OVIS_CANADENSIS,
    'Ceratotherium simum': ScientificNameId.SCIENTIFIC_CERATOTHERIUM_SIMUM,
    'Bubalus bubalis': ScientificNameId.SCIENTIFIC_BUBALUS_BUBALIS,
    'Equus quagga': ScientificNameId.SCIENTIFIC_EQUUS_QUAGGA,
    'Giraffa camelopardalis': ScientificNameId.SCIENTIFIC_GIRAFFA_CAMELOPARDALIS,
    'Loxodonta africana': ScientificNameId.SCIENTIFIC_LOXODONTA_AFRICANA,
    'Camelus dromedarius': ScientificNameId.SCIENTIFIC_CAMELUS_DROMEDARIUS,
    'Mammuthus primigenius': ScientificNameId.SCIENTIFIC_MAMMUTHUS_PRIMIGENIUS,

    // Additional Secondary/Tertiary Consumers (Carnivores and Omnivores)
    'Sus scrofa': ScientificNameId.SCIENTIFIC_SUS_SCROFA,
    'Felis catus': ScientificNameId.SCIENTIFIC_FELIS_CATUS,
    'Canis lupus familiaris': ScientificNameId.SCIENTIFIC_CANIS_LUPUS_FAMILIARIS,
    'Vulpes vulpes': ScientificNameId.SCIENTIFIC_VULPES_VULPES,
    'Panthera pardus': ScientificNameId.SCIENTIFIC_PANTHERA_PARDUS,
    'Panthera leo': ScientificNameId.SCIENTIFIC_PANTHERA_LEO,
    'Gorilla beringei beringei': ScientificNameId.SCIENTIFIC_GORILLA_BERINGEI_BERINGEI,
    'Pan troglodytes': ScientificNameId.SCIENTIFIC_PAN_TROGLODYTES,
    'Pongo pygmaeus': ScientificNameId.SCIENTIFIC_PONGO_PYGMAEUS,
    'Panthera tigris': ScientificNameId.SCIENTIFIC_PANTHERA_TIGRIS,
    'Canis lupus': ScientificNameId.SCIENTIFIC_CANIS_LUPUS,
    'Hippopotamus amphibius': ScientificNameId.SCIENTIFIC_HIPPOPOTAMUS_AMPHIBIUS,

    // Additional Invertebrates and Small Animals
    'Formica rufa': ScientificNameId.SCIENTIFIC_FORMICA_RUFA,
    'Danaus plexippus (adult)': ScientificNameId.SCIENTIFIC_DANAUS_PLEXIPPUS_ADULT,
    'Danaus plexippus (larva)': ScientificNameId.SCIENTIFIC_DANAUS_PLEXIPPUS_LARVA,
    'Danaus plexippus (ovum)': ScientificNameId.SCIENTIFIC_DANAUS_PLEXIPPUS_OVUM,
    'Acheta domesticus': ScientificNameId.SCIENTIFIC_ACHETA_DOMESTICUS,
    'Hadrurus arizonensis': ScientificNameId.SCIENTIFIC_HADRURUS_ARIZONENSIS,
    'Helix pomatia': ScientificNameId.SCIENTIFIC_HELIX_POMATIA,
    'Araneus diadematus': ScientificNameId.SCIENTIFIC_ARANEUS_DIADEMATUS,

    // Reptiles and Amphibians
    'Lacerta deserti': ScientificNameId.SCIENTIFIC_LACERTA_DESERTI,
    'Python regius': ScientificNameId.SCIENTIFIC_PYTHON_REGIUS,
    'Rana temporaria': ScientificNameId.SCIENTIFIC_RANA_TEMPORARIA,
    'Chelonia mydas': ScientificNameId.SCIENTIFIC_CHELONIA_MYDAS
  };

  return scientificMapping[scientificName] || null; // Return null if no mapping found
};

/**
 * Maps card names to description IDs (for future use)
 */
export const getCardDescriptionId = (commonName: string): CardDescriptionId | null => {
  const descriptionMapping: Record<string, CardDescriptionId> = {
    'Oak Tree': CardDescriptionId.DESC_OAK_TREE,
    'Giant Kelp': CardDescriptionId.DESC_GIANT_KELP,
    'Reed Canary Grass': CardDescriptionId.DESC_REED_CANARY_GRASS,
    'Phytoplankton': CardDescriptionId.DESC_PHYTOPLANKTON,
    'Deep Sea Hydrothermal Vent Bacteria': CardDescriptionId.DESC_DEEP_SEA_HYDROTHERMAL_VENT_BACTERIA,
    'Iron Spring Bacteria': CardDescriptionId.DESC_IRON_SPRING_BACTERIA,
    'Volcanic Hydrogen Bacteria': CardDescriptionId.DESC_VOLCANIC_HYDROGEN_BACTERIA,
    'Nitrifying Soil Bacteria': CardDescriptionId.DESC_NITRIFYING_SOIL_BACTERIA,
    'Sediment Chemosynthetic Bacteria': CardDescriptionId.DESC_SEDIMENT_CHEMOSYNTHETIC_BACTERIA,
    'European Rabbit': CardDescriptionId.DESC_EUROPEAN_RABBIT,
    'Sockeye Salmon': CardDescriptionId.DESC_SOCKEYE_SALMON,
    'Pacific Krill': CardDescriptionId.DESC_PACIFIC_KRILL,
    'Zooplankton': CardDescriptionId.DESC_ZOOPLANKTON,
    'European Honey Bee': CardDescriptionId.DESC_EUROPEAN_HONEY_BEE,
    'American Black Bear': CardDescriptionId.DESC_AMERICAN_BLACK_BEAR,
    'Great White Shark': CardDescriptionId.DESC_GREAT_WHITE_SHARK,
    'Mycena Mushroom': CardDescriptionId.DESC_MYCENA_MUSHROOM,
    'Turkey Vulture': CardDescriptionId.DESC_TURKEY_VULTURE,
    'Soil Bacteria': CardDescriptionId.DESC_SOIL_BACTERIA,
    'Decomposer Mushroom': CardDescriptionId.DESC_DECOMPOSER_MUSHROOM,
    'Common Earthworm': CardDescriptionId.DESC_COMMON_EARTHWORM,
    'Dung Beetle': CardDescriptionId.DESC_DUNG_BEETLE,
    'Deer Tick': CardDescriptionId.DESC_DEER_TICK,
    'Mycorrhizal Fungi': CardDescriptionId.DESC_MYCORRHIZAL_FUNGI,
    'Nitrogen Fixing Bacteria': CardDescriptionId.DESC_NITROGEN_FIXING_BACTERIA,

    // Additional Producers (Trees and Plants)
    'Apple Tree': CardDescriptionId.DESC_APPLE_TREE,
    'English Oak': CardDescriptionId.DESC_ENGLISH_OAK,
    'Scots Pine': CardDescriptionId.DESC_SCOTS_PINE,
    'Coconut Palm': CardDescriptionId.DESC_COCONUT_PALM,
    'Cherry Blossom': CardDescriptionId.DESC_CHERRY_BLOSSOM,
    'Bush Cherry': CardDescriptionId.DESC_BUSH_CHERRY,
    'Prickly Pear Cactus': CardDescriptionId.DESC_PRICKLY_PEAR_CACTUS,
    'Common Grape Vine': CardDescriptionId.DESC_COMMON_GRAPE_VINE,
    'Perennial Ryegrass': CardDescriptionId.DESC_PERENNIAL_RYEGRASS,
    'Common Daisy': CardDescriptionId.DESC_COMMON_DAISY,
    'Spearmint': CardDescriptionId.DESC_SPEARMINT,
    'Hibiscus': CardDescriptionId.DESC_HIBISCUS,
    'Sweet Briar': CardDescriptionId.DESC_SWEET_BRIAR,
    'Garden Strawberry': CardDescriptionId.DESC_GARDEN_STRAWBERRY,
    'Common Sunflower': CardDescriptionId.DESC_COMMON_SUNFLOWER,
    'Garden Tulip': CardDescriptionId.DESC_GARDEN_TULIP,
    'White Clover': CardDescriptionId.DESC_WHITE_CLOVER,
    'Eelgrass': CardDescriptionId.DESC_EELGRASS,
    'Corn/Maize': CardDescriptionId.DESC_CORN_MAIZE,
    'Rice': CardDescriptionId.DESC_RICE,

    // Additional Primary Consumers (Herbivores)
    'North American Beaver': CardDescriptionId.DESC_NORTH_AMERICAN_BEAVER,
    'American Bison': CardDescriptionId.DESC_AMERICAN_BISON,
    'White-tailed Deer': CardDescriptionId.DESC_WHITE_TAILED_DEER,
    'Eastern Chipmunk': CardDescriptionId.DESC_EASTERN_CHIPMUNK,
    'Domestic Cattle': CardDescriptionId.DESC_DOMESTIC_CATTLE,
    'Domestic Goat': CardDescriptionId.DESC_DOMESTIC_GOAT,
    'Golden Hamster': CardDescriptionId.DESC_GOLDEN_HAMSTER,
    'European Hedgehog': CardDescriptionId.DESC_EUROPEAN_HEDGEHOG,
    'Domestic Horse': CardDescriptionId.DESC_DOMESTIC_HORSE,
    'Koala': CardDescriptionId.DESC_KOALA,
    'Llama': CardDescriptionId.DESC_LLAMA,
    'House Mouse': CardDescriptionId.DESC_HOUSE_MOUSE,
    'Ox': CardDescriptionId.DESC_OX,
    'Giant Panda': CardDescriptionId.DESC_GIANT_PANDA,
    'Domestic Pig': CardDescriptionId.DESC_DOMESTIC_PIG,
    'Common Raccoon': CardDescriptionId.DESC_COMMON_RACCOON,
    'Bighorn Sheep': CardDescriptionId.DESC_BIGHORN_SHEEP,
    'White Rhinoceros': CardDescriptionId.DESC_WHITE_RHINOCEROS,
    'Asian Water Buffalo': CardDescriptionId.DESC_ASIAN_WATER_BUFFALO,
    'Plains Zebra': CardDescriptionId.DESC_PLAINS_ZEBRA,
    'Giraffe': CardDescriptionId.DESC_GIRAFFE,
    'African Bush Elephant': CardDescriptionId.DESC_AFRICAN_BUSH_ELEPHANT,
    'Dromedary Camel': CardDescriptionId.DESC_DROMEDARY_CAMEL,
    'Woolly Mammoth': CardDescriptionId.DESC_WOOLLY_MAMMOTH,

    // Additional Secondary/Tertiary Consumers (Carnivores and Omnivores)
    'Wild Boar': CardDescriptionId.DESC_WILD_BOAR,
    'Domestic Cat': CardDescriptionId.DESC_DOMESTIC_CAT,
    'Domestic Dog': CardDescriptionId.DESC_DOMESTIC_DOG,
    'Red Fox': CardDescriptionId.DESC_RED_FOX,
    'Leopard': CardDescriptionId.DESC_LEOPARD,
    'African Lion': CardDescriptionId.DESC_AFRICAN_LION,
    'Mountain Gorilla': CardDescriptionId.DESC_MOUNTAIN_GORILLA,
    'Common Chimpanzee': CardDescriptionId.DESC_COMMON_CHIMPANZEE,
    'Bornean Orangutan': CardDescriptionId.DESC_BORNEAN_ORANGUTAN,
    'Tiger': CardDescriptionId.DESC_TIGER,
    'Gray Wolf': CardDescriptionId.DESC_GRAY_WOLF,
    'Common Hippopotamus': CardDescriptionId.DESC_COMMON_HIPPOPOTAMUS,

    // Additional Invertebrates and Small Animals
    'Red Wood Ant': CardDescriptionId.DESC_RED_WOOD_ANT,
    'Monarch Butterfly': CardDescriptionId.DESC_MONARCH_BUTTERFLY,
    'Monarch Caterpillar': CardDescriptionId.DESC_MONARCH_CATERPILLAR,
    'Butterfly Egg': CardDescriptionId.DESC_BUTTERFLY_EGG,
    'House Cricket': CardDescriptionId.DESC_HOUSE_CRICKET,
    'Sacred Dung Beetle': CardDescriptionId.DESC_SACRED_DUNG_BEETLE,
    'Desert Hairy Scorpion': CardDescriptionId.DESC_DESERT_HAIRY_SCORPION,
    'Roman Snail': CardDescriptionId.DESC_ROMAN_SNAIL,
    'Garden Spider': CardDescriptionId.DESC_GARDEN_SPIDER,

    // Additional Decomposers
    'Common Decomposer': CardDescriptionId.DESC_COMMON_DECOMPOSER,

    // Reptiles and Amphibians
    'Desert Lizard': CardDescriptionId.DESC_DESERT_LIZARD,
    'Ball Python': CardDescriptionId.DESC_BALL_PYTHON,
    'Common Frog': CardDescriptionId.DESC_COMMON_FROG,
    'Green Sea Turtle': CardDescriptionId.DESC_GREEN_SEA_TURTLE
  };

  return descriptionMapping[commonName] || null; // Return null if no mapping found
};

/**
 * Helper function to get localized card display data
 */
export const getLocalizedCardData = (
  card: { commonName: string; scientificName: string },
  localization: {
    getCardName: (id: CardNameId) => string;
    getScientificName: (id: ScientificNameId) => string;
    isLoading: boolean;
  }
) => {
  const { getCardName, getScientificName, isLoading } = localization;

  // Get mapping IDs, fallback to original names if no mapping exists
  const nameId = getCardNameId(card.commonName);
  const scientificNameId = getScientificNameId(card.scientificName);

  return {
    displayName: isLoading ? card.commonName : (nameId ? getCardName(nameId) : card.commonName),
    displayScientificName: isLoading ? card.scientificName : (scientificNameId ? getScientificName(scientificNameId) : card.scientificName),
    nameId: nameId,
    scientificNameId: scientificNameId,
    descriptionId: getCardDescriptionId(card.commonName)
  };
};
