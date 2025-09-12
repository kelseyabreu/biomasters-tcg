/**
 * EndGameModal - Cross-platform end game results display
 * Shows winner, final scores, and game statistics
 */

import React from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonBadge,
  IonGrid,
  IonRow,
  IonCol,
  IonChip,
  IonLabel
} from '@ionic/react';
import {
  trophy,
  medal,
  close,
  home,
  refresh,
  star,
  library,
  flash,
  albums
} from 'ionicons/icons';

interface PlayerFinalStats {
  playerId: string;
  playerName: string;
  victoryPoints: number;
  deckCount: number;
  handCount: number;
  energy: number;
  cardsPlayed: number;
  isWinner: boolean;
}

interface EndGameModalProps {
  isOpen: boolean;
  winner?: string;
  finalScores?: PlayerFinalStats[];
  gameStats?: {
    totalTurns: number;
    gameDuration?: string;
    endReason: string;
  };
  onClose: () => void;
  onPlayAgain?: () => void;
  onReturnHome?: () => void;
}

export const EndGameModal: React.FC<EndGameModalProps> = ({
  isOpen,
  winner,
  finalScores = [],
  gameStats,
  onClose,
  onPlayAgain,
  onReturnHome
}) => {
  const winnerStats = finalScores.find(player => player.isWinner);
  const sortedScores = [...finalScores].sort((a, b) => b.victoryPoints - a.victoryPoints);
  const isPlayerWinner = winnerStats?.playerId === 'human';

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="end-game-modal">
      <IonHeader>
        <IonToolbar color={isPlayerWinner ? 'success' : 'medium'}>
          <IonTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IonIcon icon={trophy} />
              Game Complete
            </div>
          </IonTitle>
          <IonButtons slot="end">
            <IonButton fill="clear" onClick={onClose}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {/* Winner Announcement */}
        <IonCard className={`winner-card ${isPlayerWinner ? 'victory' : 'defeat'}`}>
          <IonCardContent className="ion-text-center">
            <div className="winner-icon">
              <IonIcon 
                icon={isPlayerWinner ? trophy : medal} 
                size="large"
                color={isPlayerWinner ? 'success' : 'medium'}
              />
            </div>
            
            <h1 className="winner-title">
              {isPlayerWinner ? '🎉 Victory!' : '💪 Good Game!'}
            </h1>
            
            <h2 className="winner-name">
              {winner || 'Unknown'} Wins!
            </h2>
            
            {winnerStats && (
              <IonChip color={isPlayerWinner ? 'success' : 'primary'} className="winner-score">
                <IonIcon icon={star} />
                <IonLabel>{winnerStats.victoryPoints} Victory Points</IonLabel>
              </IonChip>
            )}

            <p className="winner-message">
              {isPlayerWinner 
                ? 'Congratulations! You built a superior ecosystem!' 
                : 'Well played! Study the winning strategy and try again.'}
            </p>
          </IonCardContent>
        </IonCard>

        {/* Final Scores */}
        <IonCard className="scores-card">
          <IonCardContent>
            <h3>Final Scores</h3>
            <div className="scores-list">
              {sortedScores.map((player, index) => (
                <div 
                  key={player.playerId} 
                  className={`score-item ${player.isWinner ? 'winner-score-item' : ''}`}
                >
                  <div className="score-rank">
                    <IonIcon 
                      icon={index === 0 ? trophy : medal} 
                      color={index === 0 ? 'warning' : 'medium'}
                    />
                    <span>#{index + 1}</span>
                  </div>
                  
                  <div className="score-player">
                    <h4>{player.playerName}</h4>
                    <div className="player-stats-summary">
                      <IonBadge color="success">
                        <IonIcon icon={star} />
                        {player.victoryPoints} VP
                      </IonBadge>
                      <IonBadge color="primary">
                        <IonIcon icon={library} />
                        {player.deckCount} Deck
                      </IonBadge>
                      <IonBadge color="secondary">
                        <IonIcon icon={albums} />
                        {player.handCount} Hand
                      </IonBadge>
                      <IonBadge color="warning">
                        <IonIcon icon={flash} />
                        {player.energy} Energy
                      </IonBadge>
                    </div>
                  </div>
                  
                  <div className="score-points">
                    <span className="points-value">{player.victoryPoints}</span>
                    <span className="points-label">points</span>
                  </div>
                </div>
              ))}
            </div>
          </IonCardContent>
        </IonCard>

        {/* Game Statistics */}
        {gameStats && (
          <IonCard className="stats-card">
            <IonCardContent>
              <h3>Game Statistics</h3>
              <IonGrid>
                <IonRow>
                  <IonCol size="6">
                    <div className="stat-item">
                      <span className="stat-label">Total Turns:</span>
                      <span className="stat-value">{gameStats.totalTurns}</span>
                    </div>
                  </IonCol>
                  <IonCol size="6">
                    <div className="stat-item">
                      <span className="stat-label">End Reason:</span>
                      <span className="stat-value">{gameStats.endReason}</span>
                    </div>
                  </IonCol>
                </IonRow>
                {gameStats.gameDuration && (
                  <IonRow>
                    <IonCol size="12">
                      <div className="stat-item">
                        <span className="stat-label">Game Duration:</span>
                        <span className="stat-value">{gameStats.gameDuration}</span>
                      </div>
                    </IonCol>
                  </IonRow>
                )}
              </IonGrid>
            </IonCardContent>
          </IonCard>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          {onPlayAgain && (
            <IonButton 
              expand="block" 
              color="primary" 
              onClick={onPlayAgain}
              className="action-button"
            >
              <IonIcon icon={refresh} slot="start" />
              Play Again
            </IonButton>
          )}
          
          {onReturnHome && (
            <IonButton 
              expand="block" 
              fill="outline" 
              color="medium" 
              onClick={onReturnHome}
              className="action-button"
            >
              <IonIcon icon={home} slot="start" />
              Return to Menu
            </IonButton>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
};

export default EndGameModal;
