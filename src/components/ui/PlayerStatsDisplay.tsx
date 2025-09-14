/**
 * PlayerStatsDisplay - Reusable component for showing player statistics
 * Works across web, iOS, and Android via Ionic + Capacitor
 */

import React from 'react';
import {
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonBadge,
  IonChip,
  IonLabel
} from '@ionic/react';
import {
  library,
  flash,
  trophy,
  person,
  star,
  albums
} from 'ionicons/icons';

interface PlayerStats {
  playerId: string;
  name: string;
  deckCount: number;
  handCount: number;
  energy: number;
  victoryPoints: number;
  actionsRemaining: number;
  isCurrentPlayer: boolean;
}

interface PlayerStatsDisplayProps {
  stats: PlayerStats;
  compact?: boolean;
  showActions?: boolean;
  className?: string;
  onClick?: () => void;
}

export const PlayerStatsDisplay: React.FC<PlayerStatsDisplayProps> = ({
  stats,
  compact = false,
  showActions = true,
  className = '',
  onClick
}) => {
  const {
    name,
    deckCount,
    handCount,
    energy,
    victoryPoints,
    actionsRemaining,
    isCurrentPlayer
  } = stats;

  if (compact) {
    // Compact horizontal layout for status bars
    return (
      <div className={`player-stats-compact ${className}`}>
        <IonGrid>
          <IonRow>
            <IonCol size="3">
              <div className="stat-item">
                <IonIcon icon={person} />
                <span>{name}</span>
              </div>
            </IonCol>
            <IonCol size="2">
              <div className="stat-item">
                <IonIcon icon={library} />
                <span>{deckCount}</span>
              </div>
            </IonCol>
            <IonCol size="2">
              <div className="stat-item">
                <IonIcon icon={albums} />
                <span>{handCount}</span>
              </div>
            </IonCol>
            <IonCol size="2">
              <div className="stat-item">
                <IonIcon icon={flash} />
                <span>{energy}</span>
              </div>
            </IonCol>
            <IonCol size="2">
              <div className="stat-item">
                <IonIcon icon={trophy} />
                <span>{victoryPoints}</span>
              </div>
            </IonCol>
            {showActions && (
              <IonCol size="1">
                <div className="stat-item">
                  <IonIcon icon={star} />
                  <span>{actionsRemaining}</span>
                </div>
              </IonCol>
            )}
          </IonRow>
        </IonGrid>
      </div>
    );
  }

  // Full card layout for detailed display
  return (
    <IonCard
      className={`player-stats-card ${isCurrentPlayer ? 'current-player' : ''} ${className} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <IonCardContent>
        <div className="player-header">
          <h3>{name}</h3>
        </div>
        
        <div className="stats-list">
          <div className="stat-item">
            <IonIcon icon={library} color="medium" />
            <span>Deck: {deckCount}</span>
            {deckCount <= 3 && deckCount > 0 && (
              <IonBadge color="warning">Low</IonBadge>
            )}
          </div>
          <div className="stat-item">
            <IonIcon icon={albums} color="medium" />
            <span>Hand: {handCount}</span>
          </div>
          <div className="stat-item">
            <IonIcon icon={flash} color="warning" />
            <span>Energy: {energy}</span>
          </div>
          <div className="stat-item">
            <IonIcon icon={trophy} color="success" />
            <span>VP: {victoryPoints}</span>
          </div>
        </div>

          {/* Always show actions area for consistent height */}
          <div className="actions-display">
            {showActions && isCurrentPlayer ? (
              <>
                <span>Actions: {actionsRemaining}</span>
                {actionsRemaining === 0 && (
                  <IonBadge color="medium">Ending</IonBadge>
                )}
              </>
            ) : (
              <>
                {isCurrentPlayer ? (
                  <span>Active</span>
                ) : (
                  <span>Waiting</span>
                )}
              </>
            )}
          </div>
      </IonCardContent>
    </IonCard>
  );
};

export default PlayerStatsDisplay;
