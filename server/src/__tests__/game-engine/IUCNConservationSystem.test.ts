import { IUCN_CONSERVATION_DATA, ConservationStatus } from '@biomasters/shared';

describe('IUCN Conservation System Tests', () => {
  test('should have correct IUCN conservation status data with precise pack rarity (per 100,000)', () => {
    console.log('🌍 Testing IUCN conservation status system...');
    
    // Test that all conservation statuses are defined
    expect(IUCN_CONSERVATION_DATA).toBeDefined();
    
    // Test specific values match IUCN_RARITY_SYSTEM.md
    const extinctData = IUCN_CONSERVATION_DATA[ConservationStatus.EXTINCT];
    expect(extinctData.percentage).toBe(0.54);
    expect(extinctData.packRarity).toBe(540); // per 100,000 packs
    expect(extinctData.rarityName).toBe('Ultra Rare');

    const extinctInWildData = IUCN_CONSERVATION_DATA[ConservationStatus.EXTINCT_IN_WILD];
    expect(extinctInWildData.percentage).toBe(0.054);
    expect(extinctInWildData.packRarity).toBe(54); // per 100,000 packs
    expect(extinctInWildData.rarityName).toBe('Legendary');

    const criticallyEndangeredData = IUCN_CONSERVATION_DATA[ConservationStatus.CRITICALLY_ENDANGERED];
    expect(criticallyEndangeredData.percentage).toBe(5.95);
    expect(criticallyEndangeredData.packRarity).toBe(5950); // per 100,000 packs
    expect(criticallyEndangeredData.rarityName).toBe('Epic');

    const endangeredData = IUCN_CONSERVATION_DATA[ConservationStatus.ENDANGERED];
    expect(endangeredData.percentage).toBe(10.92);
    expect(endangeredData.packRarity).toBe(10920); // per 100,000 packs
    expect(endangeredData.rarityName).toBe('Rare');

    const vulnerableData = IUCN_CONSERVATION_DATA[ConservationStatus.VULNERABLE];
    expect(vulnerableData.percentage).toBe(13.19);
    expect(vulnerableData.packRarity).toBe(13190); // per 100,000 packs
    expect(vulnerableData.rarityName).toBe('Uncommon');

    const nearThreatenedData = IUCN_CONSERVATION_DATA[ConservationStatus.NEAR_THREATENED];
    expect(nearThreatenedData.percentage).toBe(5.73);
    expect(nearThreatenedData.packRarity).toBe(5730); // per 100,000 packs
    expect(nearThreatenedData.rarityName).toBe('Uncommon');

    const leastConcernData = IUCN_CONSERVATION_DATA[ConservationStatus.LEAST_CONCERN];
    expect(leastConcernData.percentage).toBe(50.51);
    expect(leastConcernData.packRarity).toBe(50396); // per 100,000 packs (adjusted to make total = 100,000)
    expect(leastConcernData.rarityName).toBe('Common');

    const dataDeficientData = IUCN_CONSERVATION_DATA[ConservationStatus.DATA_DEFICIENT];
    expect(dataDeficientData.percentage).toBe(12.97);
    expect(dataDeficientData.packRarity).toBe(12970); // per 100,000 packs
    expect(dataDeficientData.rarityName).toBe('Special');
    
    console.log('✅ All IUCN conservation status data verified');
  });

  test('should have total percentages that add up to 100%', () => {
    console.log('🧮 Testing percentage totals...');
    
    const totalPercentage = Object.values(IUCN_CONSERVATION_DATA)
      .reduce((sum, data) => sum + data.percentage, 0);
    
    // Should be very close to 100% (allowing for IUCN data rounding differences)
    expect(totalPercentage).toBeCloseTo(100, 0); // Allow up to 0.5% difference
    
    console.log(`📊 Total percentage: ${totalPercentage.toFixed(2)}%`);
    console.log('✅ Percentage totals verified');
  });

  test('should have pack rarities that add up to 100,000', () => {
    console.log('🎴 Testing pack rarity totals...');

    const totalPackRarity = Object.values(IUCN_CONSERVATION_DATA)
      .reduce((sum, data) => sum + data.packRarity, 0);

    // Should add up to 100,000 (per 100,000 packs)
    expect(totalPackRarity).toBe(100000);

    console.log(`🎯 Total pack rarity: ${totalPackRarity}/100,000`);
    console.log('✅ Pack rarity totals verified');
  });

  test('should maintain correct rarity order (rarest to most common)', () => {
    console.log('📈 Testing rarity order...');
    
    const rarityOrder = [
      ConservationStatus.EXTINCT_IN_WILD,     // 54 per 100,000 (rarest)
      ConservationStatus.EXTINCT,             // 540 per 100,000
      ConservationStatus.NEAR_THREATENED,     // 5730 per 100,000
      ConservationStatus.CRITICALLY_ENDANGERED, // 5950 per 100,000
      ConservationStatus.ENDANGERED,          // 10920 per 100,000
      ConservationStatus.DATA_DEFICIENT,      // 12970 per 100,000
      ConservationStatus.VULNERABLE,          // 13190 per 100,000
      ConservationStatus.LEAST_CONCERN        // 50396 per 100,000 (most common)
    ];
    
    for (let i = 0; i < rarityOrder.length - 1; i++) {
      const currentStatus = rarityOrder[i]!;
      const nextStatus = rarityOrder[i + 1]!;
      const current = IUCN_CONSERVATION_DATA[currentStatus];
      const next = IUCN_CONSERVATION_DATA[nextStatus];

      expect(current.packRarity).toBeLessThan(next.packRarity);
      console.log(`  ${current.rarityName}: ${current.packRarity}/100,000 < ${next.rarityName}: ${next.packRarity}/100,000`);
    }
    
    console.log('✅ Rarity order verified');
  });

  test('should have appropriate colors and emojis for each status', () => {
    console.log('🎨 Testing visual elements...');
    
    // Test that each status has appropriate visual elements
    Object.entries(IUCN_CONSERVATION_DATA).forEach(([, data]) => {
      expect(data.color).toMatch(/^#[0-9A-Fa-f]{6}$/); // Valid hex color
      expect(data.emoji).toBeTruthy(); // Has emoji
      expect(data.description).toBeTruthy(); // Has description

      console.log(`  ${data.rarityName}: ${data.emoji} ${data.color} - ${data.description}`);
    });
    
    console.log('✅ Visual elements verified');
  });
});
