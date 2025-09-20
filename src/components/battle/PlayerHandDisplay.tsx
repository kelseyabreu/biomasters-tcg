/**
 * Reusable Player Hand Display Component
 * Supports both player and opponent hands with different visibility modes
 */

import React from 'react';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonToggle,
  IonItem,
  IonLabel,
  IonGrid,
  IonRow,
  IonCol
} from '@ionic/react';
import {
  eyeOutline,
  eyeOffOutline,
  chevronUpOutline,
  chevronDownOutline,
  closeOutline,
  cardOutline,
  swapHorizontalOutline
} from 'ionicons/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { BasePlayer } from '@kelseyabreu/shared';
import OrganismRenderer from '../OrganismRenderer';
import './PlayerHandDisplay.css';

export type HandVisibilityMode = 'full' | 'hidden' | 'generic';

interface PlayerHandDisplayProps {
  player: {
    id: string;
    name: string;
    hand: string[];
    deck: string[] | any[];
    scorePile?: string[] | any[];
  };
  title?: string;
  visibilityMode: HandVisibilityMode;
  isCollapsible?: boolean;
  isExpanded?: boolean;
  onToggleExpansion?: () => void;
  onClose?: () => void;
  onToggleVisibility?: () => void;
  
  // Card interaction (only for player's own hand)
  selectedCardId?: string | null;
  onCardSelect?: (cardId: string) => void;
  isInteractive?: boolean;
  
  // Data functions
  getCardData: (instanceId: string) => any;
  getLocalizedCardName: (cardData: any) => string;
  getLocalizedScientificName: (cardData: any) => string;
  
  // Styling
  className?: string;
}

export const PlayerHandDisplay: React.FC<PlayerHandDisplayProps> = ({
  player,
  title,
  visibilityMode,
  isCollapsible = false,
  isExpanded = true,
  onToggleExpansion,
  onClose,
  onToggleVisibility,
  selectedCardId,
  onCardSelect,
  isInteractive = false,
  getCardData,
  getLocalizedCardName,
  getLocalizedScientificName,
  className = ''
}) => {
  
  // Render a single card based on visibility mode
  const renderCard = (cardInstanceId: string, index: number) => {
    const cardData = getCardData(cardInstanceId);
    const isSelected = selectedCardId === cardInstanceId;
    
    // Hidden mode: show card back
    if (visibilityMode === 'hidden') {
      // Create unique key for hidden cards to avoid React key conflicts
      const uniqueKey = typeof cardInstanceId === 'object' ?
        `hidden-${index}-${Date.now()}` :
        `${cardInstanceId}-hidden-${index}`;

      return (
        <motion.div
          key={uniqueKey}
          className="hand-card card-back"
          initial={{ opacity: 0, rotateY: 180 }}
          animate={{ opacity: 1, rotateY: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <div className="card-back-content">
            <div className="biomasters-logo">🧬</div>
            <div className="card-back-title">BioMasters</div>
            <div className="card-back-subtitle">TCG</div>
          </div>
        </motion.div>
      );
    }
    
    // Generic mode: show generic BioMasters card front
    if (visibilityMode === 'generic') {
      return (
        <motion.div
          key={cardInstanceId}
          className="hand-card card-generic"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <div className="card-generic-content">
            <div className="card-header">
              <div className="biomasters-logo">🧬</div>
              <div className="card-title">BioMasters</div>
            </div>
            <div className="card-body">
              <div className="generic-organism">🦎</div>
              <IonBadge color="primary">TCG</IonBadge>
            </div>
          </div>
        </motion.div>
      );
    }
    
    // Full mode: show actual card details (same as current player hand)
    return (
      <div
        key={cardInstanceId}
        className={`hand-card ${isSelected ? 'selected' : ''} ${isInteractive ? 'interactive' : ''}`}
        onClick={() => isInteractive && onCardSelect?.(cardInstanceId)}
        style={{
          minWidth: '80px',
          width: '80px',
          height: '100px',
          border: isSelected
            ? '2px solid var(--ion-color-primary)'
            : '1px solid var(--ion-color-medium)',
          borderRadius: '8px',
          padding: '4px',
          cursor: isInteractive ? 'pointer' : 'default',
          backgroundColor: isSelected
            ? 'var(--ion-color-primary-tint)'
            : 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '10px',
          textAlign: 'center'
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: '9px' }}>
          {getLocalizedCardName(cardData) || 'Unknown'}
        </div>

        {/* Organism Visual */}
        <div style={{
          width: '40px',
          height: '40px',
          margin: '2px 0',
          border: '1px solid var(--ion-color-light)',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <OrganismRenderer
            card={cardData}
            size={40}
            className="battle-card-organism"
          />
        </div>

        <div style={{
          fontSize: '8px',
          color: 'var(--ion-color-medium)',
          fontStyle: 'italic'
        }}>
          {getLocalizedScientificName(cardData) || ''}
        </div>
        <div style={{
          display: 'flex',
          gap: '4px',
          fontSize: '8px'
        }}>
          <IonBadge color="success" style={{ fontSize: '8px' }}>
            VP: {cardData?.VictoryPoints || 0}
          </IonBadge>
          <IonBadge color="primary" style={{ fontSize: '8px' }}>
            T{cardData?.TrophicLevel || 0}
          </IonBadge>
        </div>
      </div>
    );
  };

  const displayTitle = title || `${player.name} Hand (${player.hand.length})`;

  return (
    <motion.div
      className={`player-hand-display ${className}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <IonCard className="player-hand-card">
        <IonCardHeader>
          <div className="hand-header">
            <IonCardTitle>{displayTitle}</IonCardTitle>
            
            {(isCollapsible || onToggleVisibility || onClose) && (
              <div className="header-controls">
                {/* Visibility Toggle */}
                {onToggleVisibility && (
                  <IonButton
                    fill="clear"
                    size="small"
                    onClick={onToggleVisibility}
                  >
                    <IonIcon icon={visibilityMode === 'hidden' ? eyeOffOutline : eyeOutline} />
                  </IonButton>
                )}

                {/* Expand/Collapse Toggle */}
                {isCollapsible && onToggleExpansion && (
                  <IonButton
                    fill="clear"
                    size="small"
                    onClick={onToggleExpansion}
                  >
                    <IonIcon icon={isExpanded ? chevronUpOutline : chevronDownOutline} />
                  </IonButton>
                )}

                {/* Close Button */}
                {onClose && (
                  <IonButton
                    fill="clear"
                    size="small"
                    color="medium"
                    onClick={onClose}
                  >
                    <IonIcon icon={closeOutline} />
                  </IonButton>
                )}
              </div>
            )}
          </div>
        </IonCardHeader>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <IonCardContent>
                <div className="hand-cards" style={{
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  padding: '8px 0'
                }}>
                  {player.hand.length > 0 ? (
                    player.hand.map((cardInstanceId, index) => 
                      renderCard(cardInstanceId, index)
                    )
                  ) : (
                    <div className="no-cards-message">
                      <IonIcon icon={cardOutline} size="large" color="medium" />
                      <p>No cards in hand</p>
                    </div>
                  )}
                </div>

                {/* Player Stats */}
                <div className="player-stats">
                  <IonGrid>
                    <IonRow>
                      <IonCol size="4">
                        <div className="stat-item">
                          <IonBadge color="primary">
                            Hand: {player.hand.length}
                          </IonBadge>
                        </div>
                      </IonCol>
                      <IonCol size="4">
                        <div className="stat-item">
                          <IonBadge color="secondary">
                            Deck: {Array.isArray(player.deck) ? player.deck.length : 0}
                          </IonBadge>
                        </div>
                      </IonCol>
                      <IonCol size="4">
                        <div className="stat-item">
                          <IonBadge color="success">
                            Score: {Array.isArray(player.scorePile) ? player.scorePile.length : 0}
                          </IonBadge>
                        </div>
                      </IonCol>
                    </IonRow>
                  </IonGrid>
                </div>
              </IonCardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </IonCard>
    </motion.div>
  );
};

export default PlayerHandDisplay;
