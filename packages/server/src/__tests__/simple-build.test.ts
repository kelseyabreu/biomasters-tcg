/**
 * Simple Build and Connectivity Test
 * Verifies that the Pub/Sub matchmaking system builds and initializes correctly
 */

import { initializePubSub, healthCheck } from '../config/pubsub';
import { MatchmakingService } from '../services/MatchmakingService';
import { GameActionType } from '@kelseyabreu/shared';
import * as shared from '@kelseyabreu/shared';

describe('Build and Connectivity Tests', () => {
  test('should build and initialize Pub/Sub configuration', async () => {
    // Test that Pub/Sub config can be imported and initialized
    expect(initializePubSub).toBeDefined();
    expect(healthCheck).toBeDefined();
    
    // Test that services can be instantiated
    const matchmakingService = new MatchmakingService();
    expect(matchmakingService).toBeDefined();
    expect(matchmakingService.requestMatch).toBeDefined();
    expect(matchmakingService.cancelMatch).toBeDefined();
    expect(matchmakingService.getQueueStats).toBeDefined();
  });

  test('should have all required environment variables', () => {
    // Check that Google Cloud environment variables are set
    expect(process.env['GOOGLE_CLOUD_PROJECT_ID']).toBe('biomasters-tcg');
    expect(process.env['GOOGLE_CLOUD_KEY_FILE']).toBeDefined();
  });

  test('should export all required types', () => {
    // Test that shared enums are available (these are runtime values)
    expect(GameActionType).toBeDefined();
    expect(GameActionType.PLAY_CARD).toBe('PLAY_CARD');

    // Test that we can import the shared package successfully
    expect(shared).toBeDefined();
  });
});
