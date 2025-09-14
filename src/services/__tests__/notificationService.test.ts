/**
 * Tests for NotificationService
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { notificationService } from '../notificationService';

describe('NotificationService', () => {
  beforeEach(() => {
    // Clear all notifications before each test
    notificationService.clearAll();
  });

  test('should create and show notifications', () => {
    const notification = notificationService.show({
      type: 'system',
      title: 'Test Notification',
      message: 'This is a test message',
      color: 'primary'
    });

    expect(notification).toBeDefined();
    expect(typeof notification).toBe('string');
    
    const active = notificationService.getActive();
    expect(active).toHaveLength(1);
    expect(active[0].title).toBe('Test Notification');
    expect(active[0].message).toBe('This is a test message');
    expect(active[0].type).toBe('system');
    expect(active[0].color).toBe('primary');
  });

  test('should dismiss notifications', () => {
    const id = notificationService.show({
      type: 'system',
      title: 'Test',
      message: 'Test message'
    });

    expect(notificationService.getActive()).toHaveLength(1);
    
    notificationService.dismiss(id);
    expect(notificationService.getActive()).toHaveLength(0);
  });

  test('should clear all notifications', () => {
    notificationService.show({
      type: 'system',
      title: 'Test 1',
      message: 'Message 1'
    });
    
    notificationService.show({
      type: 'system',
      title: 'Test 2',
      message: 'Message 2'
    });

    expect(notificationService.getActive()).toHaveLength(2);
    
    notificationService.clearAll();
    expect(notificationService.getActive()).toHaveLength(0);
  });

  test('should limit number of active notifications', () => {
    // Show more than the max limit (5)
    for (let i = 0; i < 10; i++) {
      notificationService.show({
        type: 'system',
        title: `Test ${i}`,
        message: `Message ${i}`
      });
    }

    const active = notificationService.getActive();
    expect(active).toHaveLength(5); // Should be limited to 5
    
    // Should show the most recent notifications
    expect(active[0].title).toBe('Test 9');
    expect(active[4].title).toBe('Test 5');
  });

  test('should handle matchmaking notifications', () => {
    const id = notificationService.matchmaking.searchStarted('ranked_1v1');
    
    const active = notificationService.getActive();
    expect(active).toHaveLength(1);
    expect(active[0].type).toBe('matchmaking');
    expect(active[0].title).toBe('Matchmaking Started');
    expect(active[0].message).toContain('ranked_1v1');
    expect(active[0].persistent).toBe(true);
  });

  test('should handle quest notifications', () => {
    notificationService.quest.progressUpdate('Play Games', 2, 3);
    
    const active = notificationService.getActive();
    expect(active).toHaveLength(1);
    expect(active[0].type).toBe('quest');
    expect(active[0].title).toBe('Quest Progress');
    expect(active[0].message).toBe('Play Games: 2/3');
  });

  test('should handle rating notifications', () => {
    notificationService.rating.updated(1000, 1025, 25);
    
    const active = notificationService.getActive();
    expect(active).toHaveLength(1);
    expect(active[0].type).toBe('rating');
    expect(active[0].title).toBe('Rating Increased');
    expect(active[0].message).toBe('1000 → 1025 (+25)');
    expect(active[0].color).toBe('success');
  });

  test('should handle rating decrease notifications', () => {
    notificationService.rating.updated(1000, 975, -25);
    
    const active = notificationService.getActive();
    expect(active).toHaveLength(1);
    expect(active[0].type).toBe('rating');
    expect(active[0].title).toBe('Rating Decreased');
    expect(active[0].message).toBe('1000 → 975 (-25)');
    expect(active[0].color).toBe('warning');
  });

  test('should handle system notifications', () => {
    notificationService.system.connectionLost();
    
    const active = notificationService.getActive();
    expect(active).toHaveLength(1);
    expect(active[0].type).toBe('system');
    expect(active[0].title).toBe('Connection Lost');
    expect(active[0].persistent).toBe(true);
  });

  test('should format rewards correctly', () => {
    const rewards = {
      eco_credits: 100,
      xp_points: 50,
      packs: 2
    };
    
    notificationService.quest.completed('Daily Challenge', rewards);
    
    const active = notificationService.getActive();
    expect(active[0].message).toContain('100 credits, 50 XP, 2 packs');
  });

  test('should handle empty rewards', () => {
    notificationService.quest.completed('Daily Challenge', null);

    const active = notificationService.getActive();
    expect(active[0].message).toBe('Daily Challenge - Rewards claimed');
  });

  test('should subscribe and unsubscribe to notifications', () => {
    const mockListener = vi.fn();
    
    const unsubscribe = notificationService.subscribe(mockListener);
    
    notificationService.show({
      type: 'system',
      title: 'Test',
      message: 'Test message'
    });
    
    expect(mockListener).toHaveBeenCalledTimes(1);
    
    unsubscribe();
    
    notificationService.show({
      type: 'system',
      title: 'Test 2',
      message: 'Test message 2'
    });
    
    // Should not be called again after unsubscribe
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test('should auto-dismiss non-persistent notifications', async () => {
    const id = notificationService.show({
      type: 'system',
      title: 'Auto Dismiss Test',
      message: 'This should auto-dismiss',
      duration: 100, // 100ms for quick test
      persistent: false
    });

    expect(notificationService.getActive()).toHaveLength(1);

    await new Promise(resolve => setTimeout(resolve, 150));
    expect(notificationService.getActive()).toHaveLength(0);
  });

  test('should not auto-dismiss persistent notifications', async () => {
    notificationService.show({
      type: 'system',
      title: 'Persistent Test',
      message: 'This should not auto-dismiss',
      duration: 100,
      persistent: true
    });

    expect(notificationService.getActive()).toHaveLength(1);

    await new Promise(resolve => setTimeout(resolve, 150));
    expect(notificationService.getActive()).toHaveLength(1);
  });
});
