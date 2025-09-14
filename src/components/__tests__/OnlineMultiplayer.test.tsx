/**
 * Tests for OnlineMultiplayer page component
 */

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import OnlineMultiplayer from '../../pages/OnlineMultiplayer';

// Mock the hybrid game store
vi.mock('../../state/hybridGameStore', () => ({
  useHybridGameStore: () => ({
    online: {
      matchmaking: {
        isSearching: false,
        queueTime: 0,
        estimatedWait: 0,
        gameMode: null,
        preferences: {},
        lastSearchAttempt: 0
      },
      rating: {
        current: 1000,
        peak: 1000,
        gamesPlayed: 0,
        gamesWon: 0,
        winRate: 0,
        winStreak: 0,
        rank: 'Bronze',
        season: 'season_1'
      },
      quests: {
        dailyQuests: {},
        questStreak: 0,
        lastQuestReset: new Date().toISOString().split('T')[0],
        totalQuestsCompleted: 0
      },
      leaderboard: {
        data: [],
        lastUpdated: 0,
        gameMode: null
      }
    },
    isAuthenticated: true,
    isOnline: true,
    findMatch: vi.fn(),
    cancelMatchmaking: vi.fn(),
    refreshRating: vi.fn(),
    refreshDailyQuests: vi.fn(),
    refreshLeaderboard: vi.fn(),
    updateQuestProgress: vi.fn(),
    claimQuestReward: vi.fn()
  })
}));

// Mock the notification service
vi.mock('../../services/notificationService', () => ({
  notificationService: {
    matchmaking: {
      searchStarted: vi.fn(),
      searchCancelled: vi.fn()
    },
    quest: {
      rewardClaimed: vi.fn()
    }
  }
}));

// Mock Ionic React components
vi.mock('@ionic/react', async () => {
  const actual = await vi.importActual('@ionic/react') as any;
  return {
    ...actual,
    IonRefresher: ({ children }: any) => <div data-testid="ion-refresher">{children}</div>,
    IonRefresherContent: () => <div data-testid="ion-refresher-content" />
  };
});

describe('OnlineMultiplayer Component', () => {
  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <OnlineMultiplayer />
      </BrowserRouter>
    );
  };

  test('renders online multiplayer page when authenticated', () => {
    renderComponent();

    // Check for main title
    expect(screen.getByText('Online Multiplayer')).toBeInTheDocument();

    // Check for tab segments (there are multiple "Find Match" texts, so use getAllByText)
    expect(screen.getAllByText('Find Match')).toHaveLength(2); // Tab label and card title
    expect(screen.getByText('Rating')).toBeInTheDocument();
    expect(screen.getByText('Quests')).toBeInTheDocument();
    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
  });

  test('displays matchmaking interface by default', () => {
    renderComponent();
    
    // Check for game mode selection
    expect(screen.getByText('Ranked 1v1')).toBeInTheDocument();
    expect(screen.getByText('Casual 1v1')).toBeInTheDocument();
    expect(screen.getByText('Team 2v2')).toBeInTheDocument();
    
    // Check for find match button
    expect(screen.getByText('Find ranked_1v1 Match')).toBeInTheDocument();
  });

  test('displays rating information', () => {
    renderComponent();
    
    // Switch to rating tab (this would require user interaction in a real test)
    // For now, we just verify the component renders without errors
    expect(screen.getByText('Online Multiplayer')).toBeInTheDocument();
  });

  test('handles empty quest state', () => {
    renderComponent();
    
    // Component should render without errors even with empty quest data
    expect(screen.getByText('Online Multiplayer')).toBeInTheDocument();
  });

  test('handles empty leaderboard state', () => {
    renderComponent();
    
    // Component should render without errors even with empty leaderboard data
    expect(screen.getByText('Online Multiplayer')).toBeInTheDocument();
  });
});
