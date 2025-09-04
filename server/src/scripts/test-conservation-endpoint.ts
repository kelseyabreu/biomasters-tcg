/**
 * Quick test for conservation statuses endpoint
 */

import axios from 'axios';

async function testConservationEndpoint() {
  try {
    console.log('🌍 Testing conservation statuses endpoint...');
    
    const response = await axios.get('http://localhost:3001/api/cards/conservation-statuses');
    
    console.log('✅ Response received');
    console.log('📊 Status:', response.status);
    const data = response.data as any;
    console.log('🔍 Data structure:', {
      success: data.success,
      count: data.conservation_statuses?.length,
      total_percentage: data.total_percentage
    });

    if (data.conservation_statuses) {
      console.log('\n📋 Conservation Statuses:');
      data.conservation_statuses.forEach((status: any) => {
        console.log(`  ${status.status_name}: ${status.percentage}% (${status.pack_rarity}/1000 packs)`);
      });

      // Check for CRITICALLY_ENDANGERED
      const criticallyEndangered = data.conservation_statuses.find(
        (s: any) => s.status_name === 'CRITICALLY_ENDANGERED'
      );
      
      if (criticallyEndangered) {
        console.log(`\n🎯 CRITICALLY_ENDANGERED found:`);
        console.log(`  Percentage: ${criticallyEndangered.percentage} (expected: 8.96)`);
        console.log(`  Pack rarity: ${criticallyEndangered.pack_rarity} (expected: 90)`);
        
        if (parseFloat(criticallyEndangered.percentage) === 8.96) {
          console.log('✅ IUCN data is correctly integrated!');
        } else {
          console.log('❌ IUCN data mismatch - migration may not have run on this database');
        }
      } else {
        console.log('❌ CRITICALLY_ENDANGERED not found');
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error testing conservation endpoint:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📝 Data:', error.response.data);
    }
  }
}

testConservationEndpoint();
