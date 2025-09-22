import React, { useState, useEffect, useRef } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonBadge,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonProgressBar,
  IonText,
  IonSpinner,
  IonToast,
  IonRefresher,
  IonRefresherContent,
  IonModal,
  IonAlert
} from '@ionic/react';
import {
  trophy,
  flash,
  people,
  statsChart,
  search,
  close,
  time,
  star,
  medal,
  checkmark,
  gift,
  gameController,
  person
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useHybridGameStore } from '../state/hybridGameStore';
import { notificationService } from '../services/notificationService';
import { getGameSocket } from '../services/gameSocket';
import { useUILocalization } from '../hooks/useCardLocalization';
import { UITextId } from '@kelseyabreu/shared';

import './OnlineMultiplayer.css';

const OnlineMultiplayer: React.FC = () => {
  const history = useHistory();
  const { getUIText } = useUILocalization();

  // Component cleanup tracking
  const mountedRef = useRef(true);

  const {
    online,
    isAuthenticated,
    isOnline,
    findMatch,
    cancelMatchmaking,
    refreshRating,
    refreshDailyQuests,
    refreshLeaderboard,
    updateQuestProgress,
    claimQuestReward,
    acceptMatch,
    activeBattle,
    userId,
    firebaseUser,
    isGuestMode,
    userProfile
  } = useHybridGameStore();

  // Debug authentication state
  console.log('🔍 [OnlineMultiplayer] Component rendered with auth state:', {
    isAuthenticated,
    userId,
    hasFirebaseUser: !!firebaseUser,
    isGuestMode,
    hasUserProfile: !!userProfile,
    isOnline
  });

  const [selectedTab, setSelectedTab] = useState<'matchmaking' | 'rating' | 'quests' | 'leaderboard'>('matchmaking');
  const [selectedGameMode, setSelectedGameMode] = useState<string>('ranked_1v1');
  const [showToast, setShowToast] = useState<{ show: boolean; message: string; color: string }>({
    show: false,
    message: '',
    color: 'success'
  });

  // Match found state
  const [matchFound, setMatchFound] = useState<any>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);

  const [acceptTimer, setAcceptTimer] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [queueTimerInterval, setQueueTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [matchAccepted, setMatchAccepted] = useState(false);
  const [playersReady, setPlayersReady] = useState<string[]>([]);

  // Debug authentication state changes
  useEffect(() => {
    console.log('🔍 [OnlineMultiplayer] Authentication state changed:', {
      isAuthenticated,
      userId,
      hasFirebaseUser: !!firebaseUser,
      isGuestMode,
      isOnline
    });
  }, [isAuthenticated, userId, firebaseUser, isGuestMode, isOnline]);

  // Initialize WebSocket connection and event listeners
  useEffect(() => {
    if (isAuthenticated && isOnline) {
      console.log('🔌 [OnlineMultiplayer] Initializing WebSocket connection...');
      // Get WebSocket instance
      const gameSocket = getGameSocket();

      // Check if already connected
      if (gameSocket.isConnected()) {
        console.log('✅ [OnlineMultiplayer] WebSocket already connected');
      } else {
        console.log('🔄 [OnlineMultiplayer] Connecting WebSocket...');
        gameSocket.connect();

        // Wait a moment and check connection status
        setTimeout(() => {
          if (gameSocket.isConnected()) {
            console.log('✅ [OnlineMultiplayer] WebSocket connected successfully');
          } else {
            console.error('❌ [OnlineMultiplayer] WebSocket failed to connect');
          }
        }, 1000);
      }

      // Listen for match found events
      const handleMatchFound = (data: any) => {
        console.log('🎯 Match found in OnlineMultiplayer:', data);
        setMatchFound(data);
        setShowMatchModal(true);
        setMatchAccepted(false);
        setPlayersReady([]);

        // Clear queue timer since match was found
        if (queueTimerInterval) {
          clearInterval(queueTimerInterval);
          setQueueTimerInterval(null);
        }

        // Start 30-second acceptance timer
        setAcceptTimer(30);
        const interval = setInterval(() => {
          setAcceptTimer((prev) => {
            if (prev <= 1) {
              // Timer expired - auto-decline match
              console.log('⏰ Match acceptance timer expired');
              clearInterval(interval);
              setTimerInterval(null);
              handleDeclineMatch();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        setTimerInterval(interval);

        // Stop searching state
        useHybridGameStore.setState((state) => ({
          online: {
            ...state.online,
            matchmaking: {
              ...state.online.matchmaking,
              isSearching: false
            }
          }
        }));
      };

      const handleMatchAccepted = (data: any) => {
        console.log('✅ Match accepted:', data);
        setMatchAccepted(true);
        // Don't close modal yet - wait for game to start
      };

      const handlePlayerAcceptedMatch = (data: any) => {
        console.log('👥 Player accepted match:', data);
        setPlayersReady(prev => [...prev, data.userId]);
      };

      const handleGameStarting = (data: any) => {
        console.log('🎮 Game starting:', data);

        // Clear timer
        if (timerInterval) {
          clearInterval(timerInterval);
          setTimerInterval(null);
        }
        setAcceptTimer(0);

        // Close modal
        setShowMatchModal(false);

        // Navigate to the dedicated battle page
        if (data.sessionId) {
          console.log('🚀 Navigating to battle page:', `/battle/${data.sessionId}`);
          history.push(`/battle/${data.sessionId}`);
        } else {
          console.error('❌ No sessionId provided in game_starting event');
          setShowToast({
            show: true,
            message: getUIText(UITextId.UI_ERROR_NO_SESSION_ID),
            color: 'danger'
          });
        }
      };

      // Add event listeners
      gameSocket.on('match_found', handleMatchFound);
      gameSocket.on('match_accepted', handleMatchAccepted);
      gameSocket.on('player_accepted_match', handlePlayerAcceptedMatch);
      gameSocket.on('game_starting', handleGameStarting);

      return () => {
        // Cleanup event listeners
        gameSocket.off('match_found', handleMatchFound);
        gameSocket.off('match_accepted', handleMatchAccepted);
        gameSocket.off('player_accepted_match', handlePlayerAcceptedMatch);
        gameSocket.off('game_starting', handleGameStarting);
      };
    }
  }, [isAuthenticated, isOnline]);

  // Cleanup on component unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;

      // Clear all timers
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      if (queueTimerInterval) {
        clearInterval(queueTimerInterval);
      }

      // Cancel any active matchmaking
      if (online.matchmaking.isSearching) {
        cancelMatchmaking().catch(console.error);
      }

      if (isAuthenticated && isOnline) {
        // Disconnect WebSocket when leaving the page
        useHybridGameStore.getState().disconnectWebSocket();
      }
    };
  }, []);

  // Update queue time every second when searching
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (online.matchmaking.isSearching) {
      interval = setInterval(() => {
        // Queue time is managed by the store
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [online.matchmaking.isSearching]);

  // Initialize data on component mount
  useEffect(() => {
    if (isAuthenticated && isOnline) {
      // Initialize WebSocket connection
      useHybridGameStore.getState().initializeWebSocket();

      //refreshRating();
      refreshDailyQuests();
      //refreshLeaderboard('ranked_1v1');
    }
  }, [isAuthenticated, isOnline]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      if (queueTimerInterval) {
        clearInterval(queueTimerInterval);
      }
    };
  }, [timerInterval, queueTimerInterval]);

  const handleFindMatch = async () => {
    if (!isAuthenticated) {
      setShowToast({
        show: true,
        message: getUIText(UITextId.UI_PLEASE_SIGN_IN_TO_PLAY_ONLINE),
        color: 'warning'
      });
      return;
    }

    if (!isOnline) {
      setShowToast({
        show: true,
        message: getUIText(UITextId.UI_NEED_INTERNET_CONNECTION),
        color: 'warning'
      });
      return;
    }

    try {
      console.log('🎯 [OnlineMultiplayer] Starting matchmaking via API for:', selectedGameMode);

      // Use the proper matchmaking API instead of WebSocket
      await findMatch(selectedGameMode);

      // Update local state to show searching
      useHybridGameStore.setState((state) => ({
        online: {
          ...state.online,
          matchmaking: {
            ...state.online.matchmaking,
            isSearching: true,
            gameMode: selectedGameMode,
            lastSearchAttempt: Date.now(),
            queueTime: 0
          }
        }
      }));

      // Start queue timer to update queue time in real-time
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        useHybridGameStore.setState((state) => ({
          online: {
            ...state.online,
            matchmaking: {
              ...state.online.matchmaking,
              queueTime: elapsed
            }
          }
        }));
      }, 1000);
      setQueueTimerInterval(interval);

      // Show notification
      notificationService.matchmaking.searchStarted(selectedGameMode);

      setShowToast({
        show: true,
        message: getUIText(UITextId.UI_SEARCHING_FOR_MATCH_MODE).replace('{gameMode}', selectedGameMode),
        color: 'primary'
      });
    } catch (error) {
      notificationService.matchmaking.searchFailed('Failed to start matchmaking');
      setShowToast({
        show: true,
        message: getUIText(UITextId.UI_FAILED_TO_START_MATCHMAKING),
        color: 'danger'
      });
    }
  };

  const handleCancelMatch = async () => {
    try {
      console.log('🚫 [OnlineMultiplayer] Cancelling matchmaking via API');

      // Use the proper matchmaking API instead of WebSocket
      await cancelMatchmaking();

      // Clear queue timer
      if (queueTimerInterval) {
        clearInterval(queueTimerInterval);
        setQueueTimerInterval(null);
      }

      // Update local state
      useHybridGameStore.setState((state) => ({
        online: {
          ...state.online,
          matchmaking: {
            ...state.online.matchmaking,
            isSearching: false,
            gameMode: null,
            queueTime: 0
          }
        }
      }));

      // Show notification
      notificationService.matchmaking.searchCancelled();

      setShowToast({
        show: true,
        message: getUIText(UITextId.UI_MATCHMAKING_CANCELLED),
        color: 'medium'
      });
    } catch (error) {
      setShowToast({
        show: true,
        message: getUIText(UITextId.UI_FAILED_TO_CANCEL_MATCHMAKING),
        color: 'danger'
      });
    }
  };

  const handleAcceptMatch = async () => {
    if (!matchFound?.sessionId) return;

    try {
      console.log('✅ Accepting match:', matchFound.sessionId);

      // Clear the acceptance timer
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      setAcceptTimer(0);
      setMatchAccepted(true);

      // Accept match via WebSocket
      const gameSocket = getGameSocket();
      gameSocket.acceptMatch(matchFound.sessionId);

      // Update store state
      await acceptMatch(matchFound.sessionId);

      setShowToast({
        show: true,
        message: getUIText(UITextId.UI_MATCH_ACCEPTED_WAITING),
        color: 'success'
      });
    } catch (error) {
      console.error('❌ Failed to accept match:', error);
      setShowToast({
        show: true,
        message: getUIText(UITextId.UI_FAILED_TO_ACCEPT_MATCH),
        color: 'danger'
      });
    }
  };

  const handleDeclineMatch = () => {
    // Clear the acceptance timer
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setAcceptTimer(0);

    setMatchFound(null);
    setShowMatchModal(false);

    setShowToast({
      show: true,
      message: getUIText(UITextId.UI_MATCH_DECLINED),
      color: 'medium'
    });
  };



  const handleRefresh = async (event: CustomEvent) => {
    if (isAuthenticated && isOnline) {
      await Promise.all([
        //refreshRating(),
        refreshDailyQuests(),
        //refreshLeaderboard(selectedGameMode)
      ]);
    }
    event.detail.complete();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRankColor = (rating: number): string => {
    if (rating >= 2000) return 'warning'; // Gold
    if (rating >= 1500) return 'secondary'; // Silver
    return 'tertiary'; // Bronze
  };

  const getRankName = (rating: number): string => {
    if (rating >= 2000) return getUIText(UITextId.UI_GOLD_RANK);
    if (rating >= 1500) return getUIText(UITextId.UI_SILVER_RANK);
    return getUIText(UITextId.UI_BRONZE_RANK);
  };

  if (!isAuthenticated) {
    return (
      <IonPage data-testid="online-multiplayer-page-unauthenticated">
        <IonHeader>
          <IonToolbar>
            <IonTitle>{getUIText(UITextId.UI_ONLINE_MULTIPLAYER)}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div className="auth-required">
            <IonIcon icon={people} size="large" color="medium" />
            <h2>{getUIText(UITextId.UI_SIGN_IN_REQUIRED)}</h2>
            <p>{getUIText(UITextId.UI_SIGN_IN_TO_PLAY_ONLINE)}</p>
            <IonButton routerLink="/auth" fill="solid" color="primary">
              {getUIText(UITextId.UI_SIGN_IN)}
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage data-testid="online-multiplayer-page">
      <IonHeader>
        <IonToolbar>
          <IonTitle>{getUIText(UITextId.UI_ONLINE_MULTIPLAYER)}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        {/* Tab Selector */}
        <IonSegment
          value={selectedTab}
          onIonChange={(e) => setSelectedTab(e.detail.value as any)}
          className="multiplayer-tabs"
        >
          <IonSegmentButton value="matchmaking">
            <IonIcon icon={search} />
            <IonLabel>{getUIText(UITextId.UI_FIND_MATCH)}</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="rating">
            <IonIcon icon={trophy} />
            <IonLabel>{getUIText(UITextId.UI_RATING)}</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="quests">
            <IonIcon icon={star} />
            <IonLabel>{getUIText(UITextId.UI_QUESTS)}</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="leaderboard">
            <IonIcon icon={statsChart} />
            <IonLabel>{getUIText(UITextId.UI_LEADERBOARD)}</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        {/* Matchmaking Tab */}
        {selectedTab === 'matchmaking' && (
          <div className="tab-content" data-testid="matchmaking-section">
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>{getUIText(UITextId.UI_FIND_MATCH)}</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {/* Game Mode Selection */}
                <IonSegment
                  value={selectedGameMode}
                  onIonChange={(e) => setSelectedGameMode(e.detail.value as string)}
                  disabled={online.matchmaking.isSearching}
                >
                  <IonSegmentButton value="ranked_1v1" data-testid="game-mode-ranked_1v1">
                    <IonLabel>{getUIText(UITextId.UI_RANKED_1V1)}</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="casual_1v1" data-testid="game-mode-casual_1v1">
                    <IonLabel>{getUIText(UITextId.UI_CASUAL_1V1)}</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="team_2v2" data-testid="game-mode-team_2v2">
                    <IonLabel>{getUIText(UITextId.UI_TEAM_2V2)}</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="ffa_4p" data-testid="game-mode-ffa_4p">
                    <IonLabel>{getUIText(UITextId.UI_4P_FREE_FOR_ALL)}</IonLabel>
                  </IonSegmentButton>
                </IonSegment>

                {/* Matchmaking Status */}
                {online.matchmaking.isSearching ? (
                  <div className="matchmaking-status">
                    <IonSpinner name="dots" color="primary" />
                    <h3>{getUIText(UITextId.UI_SEARCHING_FOR_MATCH)}</h3>
                    <p>{getUIText(UITextId.UI_GAME_MODE)}: {selectedGameMode}</p>
                    <p>{getUIText(UITextId.UI_QUEUE_TIME)}: {formatTime(online.matchmaking.queueTime)}</p>
                    <IonProgressBar type="indeterminate" color="primary" />
                    <IonButton
                      fill="outline"
                      color="danger"
                      onClick={handleCancelMatch}
                      className="cancel-button"
                      data-testid="cancel-search-button"
                    >
                      <IonIcon icon={close} slot="start" />
                      {getUIText(UITextId.UI_CANCEL_SEARCH)}
                    </IonButton>
                  </div>
                ) : (
                  <div className="matchmaking-ready">
                    <IonButton
                      expand="block"
                      size="large"
                      onClick={handleFindMatch}
                      disabled={!isOnline}
                      color="primary"
                      data-testid="find-match-button"
                    >
                      <IonIcon icon={search} slot="start" />
                      {getUIText(UITextId.UI_FIND_MATCH_BUTTON).replace('{gameMode}', selectedGameMode)}
                    </IonButton>
                    {!isOnline && (
                      <IonText color="warning">
                        <p>{getUIText(UITextId.UI_OFFLINE_CONNECT_TO_INTERNET)}</p>
                      </IonText>
                    )}
                  </div>
                )}
              </IonCardContent>
            </IonCard>
          </div>
        )}

        {/* Rating Tab */}
        {selectedTab === 'rating' && (
          <div className="tab-content">
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>{getUIText(UITextId.UI_YOUR_RATING)}</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <div className="rating-overview">
                  <div className="rating-stat">
                    <div className="stat-value" style={{ color: `var(--ion-color-${getRankColor(online.rating.current)})` }}>
                      {online.rating.current}
                    </div>
                    <div className="stat-label">{getUIText(UITextId.UI_CURRENT_RATING)}</div>
                  </div>
                  <div className="rating-stat">
                    <div className="stat-value">{online.rating.peak}</div>
                    <div className="stat-label">{getUIText(UITextId.UI_PEAK_RATING)}</div>
                  </div>
                  <div className="rating-stat">
                    <div className="stat-value">{online.rating.gamesPlayed}</div>
                    <div className="stat-label">{getUIText(UITextId.UI_GAMES_PLAYED)}</div>
                  </div>
                  <div className="rating-stat">
                    <div className="stat-value">{online.rating.winRate.toFixed(1)}%</div>
                    <div className="stat-label">{getUIText(UITextId.UI_WIN_RATE)}</div>
                  </div>
                </div>

                <div className={`rank-badge ${getRankColor(online.rating.current)}`}>
                  <IonIcon icon={medal} />
                  {getRankName(online.rating.current)} {getUIText(UITextId.UI_RANK)}
                </div>

                {online.rating.winStreak > 0 && (
                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <IonBadge color="success">
                      <IonIcon icon={flash} style={{ marginRight: '4px' }} />
                      {getUIText(UITextId.UI_WIN_STREAK).replace('{streak}', online.rating.winStreak.toString())}
                    </IonBadge>
                  </div>
                )}
              </IonCardContent>
            </IonCard>
          </div>
        )}

        {/* Quests Tab */}
        {selectedTab === 'quests' && (
          <div className="tab-content">
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>{getUIText(UITextId.UI_DAILY_QUESTS)}</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <div className="quest-grid">
                  {Object.entries(online.quests.dailyQuests).map(([questType, quest]) => (
                    <IonCard key={questType} className={`quest-card ${quest.isCompleted ? 'completed' : ''} ${quest.isClaimed ? 'claimed' : ''}`}>
                      <IonCardContent>
                        <div className="quest-header">
                          <h3 className="quest-title">
                            {questType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </h3>
                          <div className={`quest-status ${quest.isCompleted ? 'completed' : ''} ${quest.isClaimed ? 'claimed' : ''}`}>
                            {quest.isClaimed ? (
                              <>
                                <IonIcon icon={checkmark} />
                                {getUIText(UITextId.UI_CLAIMED)}
                              </>
                            ) : quest.isCompleted ? (
                              <>
                                <IonIcon icon={gift} />
                                {getUIText(UITextId.UI_READY)}
                              </>
                            ) : (
                              getUIText(UITextId.UI_IN_PROGRESS)
                            )}
                          </div>
                        </div>

                        <div className="quest-progress">
                          <IonProgressBar
                            value={Math.min((quest.progress?.count || 0) / (quest.target?.count || 1), 1)}
                            color={quest.isCompleted ? 'success' : 'primary'}
                            className="quest-progress-bar"
                          />
                          <div className="quest-progress-text">
                            {quest.progress?.count || 0} / {quest.target?.count || 0}
                          </div>
                        </div>

                        {quest.rewards && (
                          <div className="quest-rewards">
                            {quest.rewards.eco_credits && (
                              <div className="reward-item">
                                <IonIcon icon={star} />
                                {quest.rewards.eco_credits} {getUIText(UITextId.UI_CREDITS)}
                              </div>
                            )}
                            {quest.rewards.xp_points && (
                              <div className="reward-item">
                                <IonIcon icon={flash} />
                                {quest.rewards.xp_points} {getUIText(UITextId.UI_XP)}
                              </div>
                            )}
                          </div>
                        )}

                        {quest.isCompleted && !quest.isClaimed && (
                          <IonButton
                            expand="block"
                            size="small"
                            color="success"
                            onClick={() => {
                              claimQuestReward(questType);
                              // Show notification for reward claim
                              notificationService.quest.rewardClaimed(
                                questType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                                quest.rewards
                              );
                            }}
                            style={{ marginTop: '12px' }}
                          >
                            <IonIcon icon={gift} slot="start" />
                            {getUIText(UITextId.UI_CLAIM_REWARD)}
                          </IonButton>
                        )}
                      </IonCardContent>
                    </IonCard>
                  ))}
                </div>

                {Object.keys(online.quests.dailyQuests).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--ion-color-medium)' }}>
                    <IonIcon icon={star} size="large" />
                    <p>{getUIText(UITextId.UI_NO_DAILY_QUESTS)}</p>
                    <IonButton fill="outline" onClick={refreshDailyQuests}>
                      {getUIText(UITextId.UI_REFRESH_QUESTS)}
                    </IonButton>
                  </div>
                )}

                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <IonBadge color="secondary">
                    {getUIText(UITextId.UI_QUEST_STREAK).replace('{streak}', online.quests.questStreak.toString())}
                  </IonBadge>
                  <IonBadge color="tertiary" style={{ marginLeft: '8px' }}>
                    {getUIText(UITextId.UI_TOTAL_COMPLETED).replace('{total}', online.quests.totalQuestsCompleted.toString())}
                  </IonBadge>
                </div>
              </IonCardContent>
            </IonCard>
          </div>
        )}

        {/* Leaderboard Tab */}
        {selectedTab === 'leaderboard' && (
          <div className="tab-content">
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>{getUIText(UITextId.UI_LEADERBOARD)}</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {online.leaderboard.data.length > 0 ? (
                  <div>
                    {online.leaderboard.data.map((player: any, index: number) => (
                      <div key={player.id || index} className="leaderboard-entry">
                        <div className={`leaderboard-rank ${index < 3 ? 'top-3' : ''}`}>
                          #{index + 1}
                        </div>
                        <div className="leaderboard-player">
                          <div className="leaderboard-player-name">
                            {player.username || player.display_name || getUIText(UITextId.UI_ANONYMOUS)}
                          </div>
                          <div className="leaderboard-player-stats">
                            {player.games_played || 0} {getUIText(UITextId.UI_GAMES)} • {((player.win_rate || 0)).toFixed(1)}% {getUIText(UITextId.UI_WIN_RATE).toLowerCase()}
                          </div>
                        </div>
                        <div className="leaderboard-rating">
                          {player.current_rating || player.rating || 1000}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--ion-color-medium)' }}>
                    <IonIcon icon={statsChart} size="large" />
                    <p>{getUIText(UITextId.UI_NO_LEADERBOARD_DATA)}</p>
                    <IonButton fill="outline" onClick={() => refreshLeaderboard(selectedGameMode)}>
                      {getUIText(UITextId.UI_REFRESH_LEADERBOARD)}
                    </IonButton>
                  </div>
                )}
              </IonCardContent>
            </IonCard>
          </div>
        )}

        <IonToast
          isOpen={showToast.show}
          onDidDismiss={() => setShowToast({ ...showToast, show: false })}
          message={showToast.message}
          duration={3000}
          color={showToast.color}
        />

        {/* Match Found Modal */}
        <IonModal isOpen={showMatchModal} onDidDismiss={() => setShowMatchModal(false)} data-testid="match-found-modal">
          <IonHeader>
            <IonToolbar>
              <IonTitle>{getUIText(UITextId.UI_MATCH_FOUND)}</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {matchFound && (
              <div style={{ textAlign: 'center' }}>
                <IonIcon icon={gameController} size="large" color="success" style={{ marginBottom: '16px' }} />
                <h2>{getUIText(UITextId.UI_MATCH_FOUND)}</h2>
                <p>{getUIText(UITextId.UI_GAME_MODE)}: {matchFound.gameMode}</p>

                {/* Show opponent info for 1v1 matches */}
                {matchFound.players && matchFound.players.length === 2 && (
                  <div style={{ margin: '20px 0' }} data-testid="opponent-info">
                    <h3>{getUIText(UITextId.UI_OPPONENT)}</h3>
                    {matchFound.players.map((player: any) => {
                      if (player.id !== useHybridGameStore.getState().userId) {
                        return (
                          <div key={player.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            margin: '8px 0'
                          }}>
                            <IonIcon icon={person} />
                            <span>{player.username || getUIText(UITextId.UI_ANONYMOUS)}</span>
                            <IonBadge color="medium">Rating: {player.rating || 1000}</IonBadge>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}

                {/* Show all players for multi-player matches */}
                {matchFound.players && matchFound.players.length > 2 && (
                  <div style={{ margin: '20px 0' }}>
                    <h3>{getUIText(UITextId.UI_PLAYERS).replace('{count}', matchFound.players.length.toString())}</h3>
                    {matchFound.players.map((player: any) => (
                      <div key={player.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        margin: '4px 0'
                      }}>
                        <IonIcon icon={person} />
                        <span>{player.username || getUIText(UITextId.UI_ANONYMOUS)}</span>
                        <IonBadge color="medium">Rating: {player.rating || 1000}</IonBadge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Acceptance Timer */}
                {acceptTimer > 0 && !matchAccepted && (
                  <div style={{ margin: '20px 0', textAlign: 'center' }}>
                    <IonText color={acceptTimer <= 10 ? 'danger' : 'primary'}>
                      <h3>{getUIText(UITextId.UI_ACCEPT_IN).replace('{seconds}', acceptTimer.toString())}</h3>
                    </IonText>
                    <IonProgressBar
                      value={acceptTimer / 30}
                      color={acceptTimer <= 10 ? 'danger' : 'primary'}
                    />
                  </div>
                )}

                {/* Match Status */}
                {matchAccepted && (
                  <div style={{ margin: '20px 0', textAlign: 'center' }}>
                    <IonText color="success">
                      <h3>{getUIText(UITextId.UI_MATCH_ACCEPTED)}</h3>
                      <p>{getUIText(UITextId.UI_WAITING_FOR_OTHER_PLAYERS)}</p>
                    </IonText>
                    <IonSpinner name="dots" color="success" />
                  </div>
                )}

                <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <IonButton
                    color="success"
                    onClick={handleAcceptMatch}
                    size="large"
                    disabled={matchAccepted}
                    data-testid="accept-match-button"
                  >
                    <IonIcon icon={checkmark} slot="start" />
                    {matchAccepted ? getUIText(UITextId.UI_ACCEPTED) : getUIText(UITextId.UI_ACCEPT_MATCH)}
                  </IonButton>
                  {!matchAccepted && (
                    <IonButton
                      color="danger"
                      fill="outline"
                      onClick={handleDeclineMatch}
                      size="large"
                      data-testid="decline-match-button"
                    >
                      <IonIcon icon={close} slot="start" />
                      {getUIText(UITextId.UI_DECLINE)}
                    </IonButton>
                  )}
                </div>
              </div>
            )}
          </IonContent>
        </IonModal>


      </IonContent>
    </IonPage>
  );
};

export default OnlineMultiplayer;
