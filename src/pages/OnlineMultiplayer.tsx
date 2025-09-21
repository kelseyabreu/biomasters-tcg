import React, { useState, useEffect } from 'react';
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

import './OnlineMultiplayer.css';

const OnlineMultiplayer: React.FC = () => {
  const history = useHistory();
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
            message: 'Error: No session ID provided',
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
    return () => {
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
        message: 'Please sign in to play online matches',
        color: 'warning'
      });
      return;
    }

    if (!isOnline) {
      setShowToast({
        show: true,
        message: 'You need an internet connection to find matches',
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
        message: `Searching for ${selectedGameMode} match...`,
        color: 'primary'
      });
    } catch (error) {
      notificationService.matchmaking.searchFailed('Failed to start matchmaking');
      setShowToast({
        show: true,
        message: 'Failed to start matchmaking',
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
        message: 'Matchmaking cancelled',
        color: 'medium'
      });
    } catch (error) {
      setShowToast({
        show: true,
        message: 'Failed to cancel matchmaking',
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
        message: 'Match accepted! Waiting for other players...',
        color: 'success'
      });
    } catch (error) {
      console.error('❌ Failed to accept match:', error);
      setShowToast({
        show: true,
        message: 'Failed to accept match',
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
      message: 'Match declined',
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
    if (rating >= 2000) return 'Gold';
    if (rating >= 1500) return 'Silver';
    return 'Bronze';
  };

  if (!isAuthenticated) {
    return (
      <IonPage data-testid="online-multiplayer-page-unauthenticated">
        <IonHeader>
          <IonToolbar>
            <IonTitle>Online Multiplayer</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div className="auth-required">
            <IonIcon icon={people} size="large" color="medium" />
            <h2>Sign In Required</h2>
            <p>Please sign in to access online multiplayer features</p>
            <IonButton routerLink="/auth" fill="solid" color="primary">
              Sign In
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
          <IonTitle>Online Multiplayer</IonTitle>
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
            <IonLabel>Find Match</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="rating">
            <IonIcon icon={trophy} />
            <IonLabel>Rating</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="quests">
            <IonIcon icon={star} />
            <IonLabel>Quests</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="leaderboard">
            <IonIcon icon={statsChart} />
            <IonLabel>Leaderboard</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        {/* Matchmaking Tab */}
        {selectedTab === 'matchmaking' && (
          <div className="tab-content" data-testid="matchmaking-section">
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Find Match</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {/* Game Mode Selection */}
                <IonSegment
                  value={selectedGameMode}
                  onIonChange={(e) => setSelectedGameMode(e.detail.value as string)}
                  disabled={online.matchmaking.isSearching}
                >
                  <IonSegmentButton value="ranked_1v1" data-testid="game-mode-ranked_1v1">
                    <IonLabel>Ranked 1v1</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="casual_1v1" data-testid="game-mode-casual_1v1">
                    <IonLabel>Casual 1v1</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="team_2v2" data-testid="game-mode-team_2v2">
                    <IonLabel>Team 2v2</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="ffa_4p" data-testid="game-mode-ffa_4p">
                    <IonLabel>4P Free-for-All</IonLabel>
                  </IonSegmentButton>
                </IonSegment>

                {/* Matchmaking Status */}
                {online.matchmaking.isSearching ? (
                  <div className="matchmaking-status">
                    <IonSpinner name="dots" color="primary" />
                    <h3>Searching for match...</h3>
                    <p>Game Mode: {selectedGameMode}</p>
                    <p>Queue Time: {formatTime(online.matchmaking.queueTime)}</p>
                    <IonProgressBar type="indeterminate" color="primary" />
                    <IonButton
                      fill="outline"
                      color="danger"
                      onClick={handleCancelMatch}
                      className="cancel-button"
                      data-testid="cancel-search-button"
                    >
                      <IonIcon icon={close} slot="start" />
                      Cancel Search
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
                      Find {selectedGameMode} Match
                    </IonButton>
                    {!isOnline && (
                      <IonText color="warning">
                        <p>Offline - Connect to internet to find matches</p>
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
                <IonCardTitle>Your Rating</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <div className="rating-overview">
                  <div className="rating-stat">
                    <div className="stat-value" style={{ color: `var(--ion-color-${getRankColor(online.rating.current)})` }}>
                      {online.rating.current}
                    </div>
                    <div className="stat-label">Current Rating</div>
                  </div>
                  <div className="rating-stat">
                    <div className="stat-value">{online.rating.peak}</div>
                    <div className="stat-label">Peak Rating</div>
                  </div>
                  <div className="rating-stat">
                    <div className="stat-value">{online.rating.gamesPlayed}</div>
                    <div className="stat-label">Games Played</div>
                  </div>
                  <div className="rating-stat">
                    <div className="stat-value">{online.rating.winRate.toFixed(1)}%</div>
                    <div className="stat-label">Win Rate</div>
                  </div>
                </div>

                <div className={`rank-badge ${getRankColor(online.rating.current)}`}>
                  <IonIcon icon={medal} />
                  {getRankName(online.rating.current)} Rank
                </div>

                {online.rating.winStreak > 0 && (
                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <IonBadge color="success">
                      <IonIcon icon={flash} style={{ marginRight: '4px' }} />
                      {online.rating.winStreak} Win Streak
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
                <IonCardTitle>Daily Quests</IonCardTitle>
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
                                Claimed
                              </>
                            ) : quest.isCompleted ? (
                              <>
                                <IonIcon icon={gift} />
                                Ready
                              </>
                            ) : (
                              'In Progress'
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
                                {quest.rewards.eco_credits} Credits
                              </div>
                            )}
                            {quest.rewards.xp_points && (
                              <div className="reward-item">
                                <IonIcon icon={flash} />
                                {quest.rewards.xp_points} XP
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
                            Claim Reward
                          </IonButton>
                        )}
                      </IonCardContent>
                    </IonCard>
                  ))}
                </div>

                {Object.keys(online.quests.dailyQuests).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--ion-color-medium)' }}>
                    <IonIcon icon={star} size="large" />
                    <p>No daily quests available</p>
                    <IonButton fill="outline" onClick={refreshDailyQuests}>
                      Refresh Quests
                    </IonButton>
                  </div>
                )}

                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <IonBadge color="secondary">
                    Quest Streak: {online.quests.questStreak}
                  </IonBadge>
                  <IonBadge color="tertiary" style={{ marginLeft: '8px' }}>
                    Total Completed: {online.quests.totalQuestsCompleted}
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
                <IonCardTitle>Leaderboard</IonCardTitle>
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
                            {player.username || player.display_name || 'Anonymous'}
                          </div>
                          <div className="leaderboard-player-stats">
                            {player.games_played || 0} games • {((player.win_rate || 0)).toFixed(1)}% win rate
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
                    <p>No leaderboard data available</p>
                    <IonButton fill="outline" onClick={() => refreshLeaderboard(selectedGameMode)}>
                      Refresh Leaderboard
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
              <IonTitle>Match Found!</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {matchFound && (
              <div style={{ textAlign: 'center' }}>
                <IonIcon icon={gameController} size="large" color="success" style={{ marginBottom: '16px' }} />
                <h2>Match Found!</h2>
                <p>Game Mode: {matchFound.gameMode}</p>

                {/* Show opponent info for 1v1 matches */}
                {matchFound.players && matchFound.players.length === 2 && (
                  <div style={{ margin: '20px 0' }} data-testid="opponent-info">
                    <h3>Opponent</h3>
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
                            <span>{player.username || 'Anonymous'}</span>
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
                    <h3>Players ({matchFound.players.length})</h3>
                    {matchFound.players.map((player: any) => (
                      <div key={player.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        margin: '4px 0'
                      }}>
                        <IonIcon icon={person} />
                        <span>{player.username || 'Anonymous'}</span>
                        <IonBadge color="medium">Rating: {player.rating || 1000}</IonBadge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Acceptance Timer */}
                {acceptTimer > 0 && !matchAccepted && (
                  <div style={{ margin: '20px 0', textAlign: 'center' }}>
                    <IonText color={acceptTimer <= 10 ? 'danger' : 'primary'}>
                      <h3>Accept in: {acceptTimer}s</h3>
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
                      <h3>✅ Match Accepted!</h3>
                      <p>Waiting for other players...</p>
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
                    {matchAccepted ? 'Accepted' : 'Accept Match'}
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
                      Decline
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
