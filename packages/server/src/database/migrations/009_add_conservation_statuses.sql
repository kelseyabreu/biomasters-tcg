-- Update conservation statuses with correct IUCN data
-- The table already exists from migration 008, we just need to update the data

-- Update existing conservation status data with correct IUCN percentages and enum-based values
UPDATE conservation_statuses SET
    percentage = 0.54,
    pack_rarity = 5,
    description = 'No known individuals remaining',
    color = '#000000',
    emoji = '🖤',
    rarity_name = 'Ultra Rare'
WHERE id = 1 AND status_name = 'EXTINCT';

UPDATE conservation_statuses SET
    percentage = 0.054,
    pack_rarity = 1,
    description = 'Known only to survive in captivity',
    color = '#800080',
    emoji = '💜',
    rarity_name = 'Legendary'
WHERE id = 2 AND status_name = 'EXTINCT_IN_WILD';

UPDATE conservation_statuses SET
    percentage = 5.95,
    pack_rarity = 59,
    description = 'Extremely high risk of extinction',
    color = '#FF0000',
    emoji = '❤️',
    rarity_name = 'Epic'
WHERE id = 3 AND status_name = 'CRITICALLY_ENDANGERED';

UPDATE conservation_statuses SET
    percentage = 10.92,
    pack_rarity = 109,
    description = 'Very high risk of extinction',
    color = '#FF8C00',
    emoji = '🧡',
    rarity_name = 'Rare'
WHERE id = 4 AND status_name = 'ENDANGERED';

UPDATE conservation_statuses SET
    percentage = 13.19,
    pack_rarity = 132,
    description = 'High risk of extinction',
    color = '#FFD700',
    emoji = '💛',
    rarity_name = 'Uncommon'
WHERE id = 5 AND status_name = 'VULNERABLE';

UPDATE conservation_statuses SET
    percentage = 5.73,
    pack_rarity = 57,
    description = 'Close to qualifying for threatened status',
    color = '#90EE90',
    emoji = '💚',
    rarity_name = 'Uncommon'
WHERE id = 6 AND status_name = 'NEAR_THREATENED';

UPDATE conservation_statuses SET
    percentage = 50.51,
    pack_rarity = 505,
    description = 'Widespread and abundant',
    color = '#008000',
    emoji = '💚',
    rarity_name = 'Common'
WHERE id = 7 AND status_name = 'LEAST_CONCERN';

UPDATE conservation_statuses SET
    percentage = 12.97,
    pack_rarity = 130,
    description = 'Inadequate information for assessment',
    color = '#808080',
    emoji = '🩶',
    rarity_name = 'Special'
WHERE id = 8 AND status_name = 'DATA_DEFICIENT';

-- The conservation_status_id column already exists from migration 008
-- No additional table changes needed
