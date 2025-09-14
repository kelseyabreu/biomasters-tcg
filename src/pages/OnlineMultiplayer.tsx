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
  IonRefresherContent
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
  gift
} from 'ionicons/icons';
import { useHybridGameStore } from '../state/hybridGameStore';
import { notificationService } from '../services/notificationService';
import './OnlineMultiplayer.css';

const OnlineMultiplayer: React.FC = () => {
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
    claimQuestReward
  } = useHybridGameStore();

  const [selectedTab, setSelectedTab] = useState<'matchmaking' | 'rating' | 'quests' | 'leaderboard'>('matchmaking');
  const [selectedGameMode, setSelectedGameMode] = useState<string>('ranked_1v1');
  const [showToast, setShowToast] = useState<{ show: boolean; message: string; color: string }>({
    show: false,
    message: '',
    color: 'success'
  });

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
      refreshRating();
      refreshDailyQuests();
      refreshLeaderboard('ranked_1v1');
    }
  }, [isAuthenticated, isOnline]);

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
      await findMatch(selectedGameMode);

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
      await cancelMatchmaking();

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

  const handleRefresh = async (event: CustomEvent) => {
    if (isAuthenticated && isOnline) {
      await Promise.all([
        refreshRating(),
        refreshDailyQuests(),
        refreshLeaderboard(selectedGameMode)
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
      <IonPage>
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
    <IonPage>
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
          <div className="tab-content">
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
                  <IonSegmentButton value="ranked_1v1">
                    <IonLabel>Ranked 1v1</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="casual_1v1">
                    <IonLabel>Casual 1v1</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="team_2v2">
                    <IonLabel>Team 2v2</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="ffa_4p">
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
                    <p>Estimated Wait: {formatTime(online.matchmaking.estimatedWait)}</p>
                    <IonProgressBar type="indeterminate" color="primary" />
                    <IonButton
                      fill="outline"
                      color="danger"
                      onClick={handleCancelMatch}
                      className="cancel-button"
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
      </IonContent>
    </IonPage>
  );
};

export default OnlineMultiplayer;
