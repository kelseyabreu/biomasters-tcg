/**
 * EndGameModal - Cross-platform end game results display
 * Shows winner, final scores, and game statistics
 */

import React, { useEffect } from 'react';
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
import { useHybridGameStore } from '../../state/hybridGameStore';
import { useUILocalization } from '../../hooks/useCardLocalization';
import { UITextId } from '@kelseyabreu/shared';

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

  // Get quest tracking function from store
  const { trackGameCompletion, userId } = useHybridGameStore();

  // Get localization
  const { getUIText } = useUILocalization();

  // Track quest progress when game ends
  useEffect(() => {
    if (isOpen && winner && userId) {
      // Track game completion for quest progress
      trackGameCompletion({
        winner: isPlayerWinner ? userId : null,
        gameMode: 'practice', // This could be passed as a prop in the future
        playerId: userId
      });
    }
  }, [isOpen, winner, isPlayerWinner, userId, trackGameCompletion]);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="end-game-modal">
      <IonHeader>
        <IonToolbar color={isPlayerWinner ? 'success' : 'medium'}>
          <IonTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IonIcon icon={trophy} />
              {getUIText(UITextId.UI_GAME_COMPLETE)}
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
              {isPlayerWinner ? `🎉 ${getUIText(UITextId.UI_VICTORY)}` : `💪 ${getUIText(UITextId.UI_EXCELLENT_GAME)}`}
            </h1>

            <h2 className="winner-name">
              {winner || 'Unknown'} {isPlayerWinner ? getUIText(UITextId.UI_VICTORY) : getUIText(UITextId.UI_DEFEAT)}!
            </h2>

            {winnerStats && (
              <IonChip color={isPlayerWinner ? 'success' : 'primary'} className="winner-score">
                <IonIcon icon={star} />
                <IonLabel>{winnerStats.victoryPoints} {getUIText(UITextId.UI_VICTORY_POINTS)}</IonLabel>
              </IonChip>
            )}

            <p className="winner-message">
              {isPlayerWinner
                ? `${getUIText(UITextId.UI_CONGRATULATIONS)} ${getUIText(UITextId.UI_WELL_PLAYED)}`
                : `${getUIText(UITextId.UI_WELL_PLAYED)} ${getUIText(UITextId.UI_BETTER_LUCK_NEXT_TIME)}`}
            </p>
          </IonCardContent>
        </IonCard>

        {/* Final Scores */}
        <IonCard className="scores-card">
          <IonCardContent>
            <h3>{getUIText(UITextId.UI_FINAL_SCORE)}</h3>
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
                        {player.victoryPoints} {getUIText(UITextId.UI_VICTORY_POINTS).substring(0, 2)}
                      </IonBadge>
                      <IonBadge color="primary">
                        <IonIcon icon={library} />
                        {player.deckCount} {getUIText(UITextId.UI_DECK_COUNT).split(' ')[0]}
                      </IonBadge>
                      <IonBadge color="secondary">
                        <IonIcon icon={albums} />
                        {player.handCount} {getUIText(UITextId.UI_HAND_COUNT).split(' ')[0]}
                      </IonBadge>
                      <IonBadge color="warning">
                        <IonIcon icon={flash} />
                        {player.energy} {getUIText(UITextId.UI_ENERGY)}
                      </IonBadge>
                    </div>
                  </div>
                  
                  <div className="score-points">
                    <span className="points-value">{player.victoryPoints}</span>
                    <span className="points-label">{getUIText(UITextId.UI_VICTORY_POINTS).toLowerCase()}</span>
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
              <h3>{getUIText(UITextId.UI_GAME_STATS)}</h3>
              <IonGrid>
                <IonRow>
                  <IonCol size="6">
                    <div className="stat-item">
                      <span className="stat-label">{getUIText(UITextId.UI_TOTAL_TURNS)}:</span>
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
                        <span className="stat-label">{getUIText(UITextId.UI_GAME_DURATION)}:</span>
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
              {getUIText(UITextId.UI_PLAY_AGAIN)}
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
              {getUIText(UITextId.UI_RETURN_HOME)}
            </IonButton>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
};

export default EndGameModal;
