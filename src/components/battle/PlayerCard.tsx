/**
 * Unified Player Card Component
 * Combines player stats, hand display, and all player information into one compact card
 * Supports different visibility modes and card reveal abilities
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
  IonCol,
  IonChip
} from '@ionic/react';
import {
  eyeOutline,
  eyeOffOutline,
  chevronUpOutline,
  chevronDownOutline,
  closeOutline,
  cardOutline,
  person,
  library,
  flash,
  trophy,
  star
} from 'ionicons/icons';
import { motion, AnimatePresence } from 'framer-motion';
import OrganismRenderer from '../OrganismRenderer';
import './PlayerCard.css';

export type CardVisibilityMode = 'hidden' | 'generic' | 'full' | 'partial';

interface PlayerCardProps {
  // Player data
  player: {
    id: string;
    name: string;
    hand: string[];
    deck: string[] | any[];
    scorePile?: string[] | any[];
    energy?: number;
    isReady?: boolean;
  };
  
  // Display settings
  title?: string;
  cardVisibilityMode: CardVisibilityMode;
  isCurrentPlayer?: boolean;
  isPlayerTurn?: boolean;
  actionsRemaining?: number;
  
  // Interaction settings
  isCollapsible?: boolean;
  isExpanded?: boolean;
  onToggleExpansion?: () => void;
  onClose?: () => void;
  onToggleCardVisibility?: () => void;
  onClick?: () => void;
  
  // Card interaction (only for player's own hand)
  selectedCardId?: string | null;
  onCardSelect?: (cardId: string) => void;
  isInteractive?: boolean;
  
  // Special card visibility (for abilities that reveal specific cards)
  visibleCardIds?: string[];
  
  // Data functions
  getCardData: (instanceId: string) => any;
  getLocalizedCardName: (cardData: any) => string;
  getLocalizedScientificName: (cardData: any) => string;
  
  // Styling
  className?: string;
  compact?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  title,
  cardVisibilityMode,
  isCurrentPlayer = false,
  isPlayerTurn = false,
  actionsRemaining = 0,
  isCollapsible = false,
  isExpanded = true,
  onToggleExpansion,
  onClose,
  onToggleCardVisibility,
  onClick,
  selectedCardId,
  onCardSelect,
  isInteractive = false,
  visibleCardIds = [],
  getCardData,
  getLocalizedCardName,
  getLocalizedScientificName,
  className = '',
  compact = false
}) => {
  
  // Calculate victory points
  const victoryPoints = Array.isArray(player.scorePile) ? player.scorePile.length : 0;
  
  // Determine if a specific card should be visible
  const isCardVisible = (cardId: string) => {
    if (cardVisibilityMode === 'full') return true;
    if (cardVisibilityMode === 'partial') return visibleCardIds.includes(cardId);
    return false;
  };
  
  // Render a single card based on visibility
  const renderCard = (cardInput: string | any, index: number) => {
    const cardData = getCardData(cardInput);

    // Extract instanceId for comparison (handle both string and object inputs)
    // For hidden cards, create unique keys to avoid React warnings
    let instanceId: string;
    if (typeof cardInput === 'string') {
      instanceId = cardInput;
    } else if (cardInput?.instanceId) {
      instanceId = cardInput.instanceId;
      // Make hidden cards unique by adding index
      if (cardInput.isHidden) {
        instanceId = `${cardInput.instanceId}-${index}`;
      }
    } else {
      instanceId = `card-${index}`;
    }

    const isSelected = selectedCardId === instanceId;
    const shouldShowCard = isCardVisible(instanceId);
    
    // Determine card display mode
    let displayMode: 'back' | 'generic' | 'full' = 'back';
    if (shouldShowCard || cardVisibilityMode === 'full') {
      displayMode = 'full';
    } else if (cardVisibilityMode === 'generic') {
      displayMode = 'generic';
    }
    
    const cardClasses = `player-card-hand-card ${displayMode} ${isSelected ? 'selected' : ''} ${isInteractive ? 'interactive' : ''}`;
    
    return (
      <motion.div
        key={instanceId}
        className={cardClasses}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: index * 0.02 }}
        onClick={() => isInteractive && onCardSelect?.(instanceId)}
      >
        {displayMode === 'back' ? (
          // Card back
          <div className="card-back-content">
            <div className="biomasters-logo">🧬</div>
            <div className="card-back-title">BioMasters</div>
          </div>
        ) : displayMode === 'generic' ? (
          // Generic front
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
        ) : (
          // Full card details
          <div className="card-full-content">
            <div className="card-name">
              {getLocalizedCardName(cardData) || 'Unknown'}
            </div>
            <div className="card-organism">
              <OrganismRenderer
                card={cardData}
                size={compact ? 35 : 40}
                className="player-card-organism"
              />
            </div>
            <div className="card-scientific">
              {getLocalizedScientificName(cardData) || ''}
            </div>
            <div className="card-stats">
              <IonBadge color="success">
                VP: {cardData?.VictoryPoints || 0}
              </IonBadge>
              <IonBadge color="primary">
                T{cardData?.TrophicLevel || 0}
              </IonBadge>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  const displayTitle = title || `${player.name} (${player.hand?.length || 0})`;
  const cardSize = compact ? 'small' : 'normal';

  return (
    <motion.div
      className={`player-card-container ${className} ${cardSize}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{
        duration: 0.4,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
    >
      <IonCard 
        className={`player-card ${isCurrentPlayer ? 'current-player' : ''} ${isPlayerTurn ? 'player-turn' : ''} ${onClick ? 'clickable' : ''}`}
        onClick={onClick}
      >
        <IonCardHeader>
          <div className="player-card-header">
            <div className="player-info">
              <IonCardTitle className="player-name">
                <IonIcon icon={person} />
                {displayTitle}
              </IonCardTitle>
              
              {/* Player Status Indicators - Removed TURN and YOU chips for cleaner design */}
              {/* <div className="status-indicators">
                {isPlayerTurn && (
                  <IonChip color="primary">
                    <IonIcon icon={star} />
                    <IonLabel>Turn</IonLabel>
                  </IonChip>
                )}
                {isCurrentPlayer && (
                  <IonChip color="success">
                    <IonLabel>You</IonLabel>
                  </IonChip>
                )}
              </div> */}
            </div>
            
            {/* Header Controls */}
            <div className="header-controls">
              {onToggleCardVisibility && (
                <IonButton fill="clear" size="small" onClick={(e) => { e.stopPropagation(); onToggleCardVisibility(); }}>
                  <IonIcon icon={cardVisibilityMode === 'hidden' ? eyeOffOutline : eyeOutline} />
                </IonButton>
              )}
              
              {isCollapsible && onToggleExpansion && (
                <IonButton fill="clear" size="small" onClick={(e) => { e.stopPropagation(); onToggleExpansion(); }}>
                  <IonIcon icon={isExpanded ? chevronUpOutline : chevronDownOutline} />
                </IonButton>
              )}
              
              {onClose && (
                <IonButton fill="clear" size="small" color="medium" onClick={(e) => { e.stopPropagation(); onClose(); }}>
                  <IonIcon icon={closeOutline} />
                </IonButton>
              )}
            </div>
          </div>
          
          {/* Player Stats Row - Horizontal Layout */}
          <div className="player-stats-row">
            <div className="stats-container">
              <div className="stat-item">
                <IonIcon icon={library} />
                <IonBadge color="secondary">{Array.isArray(player.deck) ? player.deck.length : 0}</IonBadge>
                <span>Deck</span>
              </div>
              <div className="stat-item">
                <IonIcon icon={flash} />
                <IonBadge color="warning">{player.energy || 0}</IonBadge>
                <span>Energy</span>
              </div>
              <div className="stat-item">
                <IonIcon icon={trophy} />
                <IonBadge color="success">{victoryPoints}</IonBadge>
                <span>VP</span>
              </div>
              <div className="stat-item">
                <IonIcon icon={star} />
                <IonBadge color="primary">{actionsRemaining}</IonBadge>
                <span>Actions</span>
              </div>
            </div>
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
              <IonCardContent className='hand-cards-container-container'>
                {/* Hand Cards */}
                <div className="hand-cards-container">
                  <div className="hand-cards-scroll">
                    {(player.hand?.length || 0) > 0 ? (
                      player.hand?.map((cardInstanceId, index) =>
                        renderCard(cardInstanceId, index)
                      )
                    ) : (
                      <div className="no-cards-message">
                        <IonIcon icon={cardOutline} size="large" color="medium" />
                        <p>No cards in hand</p>
                      </div>
                    )}
                  </div>
                </div>
              </IonCardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </IonCard>
    </motion.div>
  );
};

export default PlayerCard;
