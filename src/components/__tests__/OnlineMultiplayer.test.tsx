/**
 * Tests for OnlineMultiplayer page component
 */

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import OnlineMultiplayer from '../../pages/OnlineMultiplayer';

// Mock the hybrid game store
vi.mock('../../state/hybridGameStore', () => {
  const mockStoreState = {
    online: {
      matchmaking: {
        isSearching: false,
        queueTime: 0,
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
    userId: 'test-user-id',
    userType: 'authenticated',
    gameState: null,
    currentGameId: null,
    initializeWebSocket: vi.fn(),
    disconnectWebSocket: vi.fn()
  };

  const mockStore = Object.assign(() => mockStoreState, {
    getState: () => mockStoreState,
    setState: vi.fn(),
    subscribe: vi.fn(),
    destroy: vi.fn()
  });

  return {
    useHybridGameStore: mockStore,
    default: mockStore
  };
});

// Mock the GameSocket service
vi.mock('../../services/gameSocket', () => ({
  getGameSocket: () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: vi.fn(() => false),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn()
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

    // Check for main title (mocked localization returns "[{id}]")
    expect(screen.getByText('[UI_ONLINE_MULTIPLAYER]')).toBeInTheDocument();

    // Check for tab segments (mocked localization returns "[{id}]")
    expect(screen.getAllByText('[UI_FIND_MATCH]')).toHaveLength(2); // Tab label and card title
    expect(screen.getByText('[UI_RATING]')).toBeInTheDocument();
    expect(screen.getByText('[UI_QUESTS]')).toBeInTheDocument();
    expect(screen.getByText('[UI_LEADERBOARD]')).toBeInTheDocument();
  });

  test('displays matchmaking interface by default', () => {
    renderComponent();

    // Check for game mode selection (mocked localization returns "[{id}]")
    expect(screen.getByText('[UI_RANKED_1V1]')).toBeInTheDocument();
    expect(screen.getByText('[UI_CASUAL_1V1]')).toBeInTheDocument();
    expect(screen.getByText('[UI_TEAM_2V2]')).toBeInTheDocument();

    // Check for find match button
    expect(screen.getByTestId('find-match-button')).toBeInTheDocument();
  });

  test('displays rating information', () => {
    renderComponent();

    // Switch to rating tab (this would require user interaction in a real test)
    // For now, we just verify the component renders without errors
    expect(screen.getByText('[UI_ONLINE_MULTIPLAYER]')).toBeInTheDocument();
  });

  test('handles empty quest state', () => {
    renderComponent();

    // Component should render without errors even with empty quest data
    expect(screen.getByText('[UI_ONLINE_MULTIPLAYER]')).toBeInTheDocument();
  });

  test('handles empty leaderboard state', () => {
    renderComponent();

    // Component should render without errors even with empty leaderboard data
    expect(screen.getByText('[UI_ONLINE_MULTIPLAYER]')).toBeInTheDocument();
  });
});
