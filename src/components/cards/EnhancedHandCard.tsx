import React, { useState, useRef, memo } from 'react';
import { IonCard, IonCardContent, IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonChip, IonLabel } from '@ionic/react';
import { close, leaf, water, sunny, snow, shield, flash, heart } from 'ionicons/icons';
import { motion } from 'framer-motion';
import { Card, ConservationStatus } from '../../types';
import { useMobileGestures } from '../../hooks/useMobileGestures';
import { useLocalization } from '../../contexts/LocalizationContext';
import OrganismRenderer from '../OrganismRenderer';
import './EnhancedHandCard.css';

interface EnhancedHandCardProps {
  card: Card;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart?: (cardId: string) => void;
  onDragEnd?: (cardId: string, position: { x: number; y: number }) => void;
  isPlayerTurn: boolean;
  size?: 'small' | 'medium' | 'large';
}

const EnhancedHandCard: React.FC<EnhancedHandCardProps> = ({
  card,
  isSelected,
  onSelect,
  onDragStart,
  onDragEnd,
  isPlayerTurn,
  size = 'medium'
}) => {
  const localization = useLocalization();

  console.log('🃏 EnhancedHandCard rendered:', {
    cardId: card.cardId,
    cardName: localization.getCardName(card.nameId as any),
    isSelected,
    isPlayerTurn,
    hasOnSelect: !!onSelect
  });
  const [showSpeciesInfo, setShowSpeciesInfo] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Mobile gesture handling
  const { gestureState } = useMobileGestures(cardRef as React.RefObject<HTMLElement>, {
    onTap: () => {
      console.log('🖱️ EnhancedHandCard onTap triggered:', {
        cardId: card.cardId,
        cardName: localization.getCardName(card.nameId as any),
        isPlayerTurn,
        isSelected,
        gestureState
      });
      if (isPlayerTurn) {
        console.log('✅ Calling onSelect for card:', card.cardId);
        onSelect();
      } else {
        console.log('❌ Not player turn, ignoring tap');
      }
    },
    
    onLongPress: () => {
      console.log('🖱️ EnhancedHandCard onLongPress triggered:', {
        cardId: card.cardId,
        cardName: localization.getCardName(card.nameId as any),
        isPlayerTurn
      });
      if (isPlayerTurn) {
        console.log('✅ Opening species info modal for card:', card.cardId);
        setShowSpeciesInfo(true);
      } else {
        console.log('❌ Not player turn, ignoring long press');
      }
    },
    
    onDragStart: (position) => {
      console.log('🖱️ EnhancedHandCard onDragStart triggered:', {
        cardId: card.cardId,
        cardName: localization.getCardName(card.nameId as any),
        isPlayerTurn,
        isSelected,
        position
      });
      if (isPlayerTurn && isSelected) {
        console.log('✅ Starting drag for card:', card.cardId);
        setIsDragging(true);
        setDragPosition(position);
        onDragStart?.(card.cardId.toString());
      } else {
        console.log('❌ Cannot drag - not player turn or card not selected');
      }
    },
    
    onDragMove: (position) => {
      if (isDragging) {
        setDragPosition(position);
      }
    },
    
    onDragEnd: (position) => {
      if (isDragging) {
        setIsDragging(false);
        onDragEnd?.(card.cardId.toString(), position);
      }
    }
  }, {
    longPressDelay: 600,
    dragThreshold: 10
  });

  // Remove getCardImage function - we'll use OrganismRenderer instead

  const getConservationColor = (status: ConservationStatus) => {
    switch (status) {
      case ConservationStatus.CRITICALLY_ENDANGERED: return 'danger';
      case ConservationStatus.ENDANGERED: return 'warning';
      case ConservationStatus.VULNERABLE: return 'medium';
      case ConservationStatus.NEAR_THREATENED: return 'primary';
      case ConservationStatus.LEAST_CONCERN: return 'success';
      case ConservationStatus.EXTINCT: return 'dark';
      case ConservationStatus.EXTINCT_IN_WILD: return 'dark';
      case ConservationStatus.DATA_DEFICIENT: return 'medium';
      case ConservationStatus.NOT_EVALUATED: return 'medium';
      default: return 'medium';
    }
  };

  const getConservationLabel = (status: ConservationStatus) => {
    switch (status) {
      case ConservationStatus.CRITICALLY_ENDANGERED: return 'CR';
      case ConservationStatus.ENDANGERED: return 'EN';
      case ConservationStatus.VULNERABLE: return 'VU';
      case ConservationStatus.NEAR_THREATENED: return 'NT';
      case ConservationStatus.LEAST_CONCERN: return 'LC';
      case ConservationStatus.EXTINCT: return 'EX';
      case ConservationStatus.EXTINCT_IN_WILD: return 'EW';
      case ConservationStatus.DATA_DEFICIENT: return 'DD';
      case ConservationStatus.NOT_EVALUATED: return 'NE';
      default: return 'LC';
    }
  };

  const getCardConservationStatus = (card: Card): ConservationStatus => {
    // Always use the main conservationStatus field which should be a ConservationStatus enum
    return card.conservationStatus;
  };

  return (
    <>
      <motion.div
        ref={cardRef}
        className={`enhanced-hand-card ${size} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${!isPlayerTurn ? 'disabled' : ''}`}
        style={{
          transform: isDragging ? `translate(${dragPosition.x}px, ${dragPosition.y}px)` : undefined
        }}
        whileHover={isPlayerTurn ? { scale: 1.05, y: -5 } : {}}
        whileTap={isPlayerTurn ? { scale: 0.95 } : {}}
        transition={{ duration: 0.2 }}
        onClick={() => {
          console.log('🖱️ EnhancedHandCard direct onClick triggered:', {
            cardId: card.cardId,
            cardName: localization.getCardName(card.nameId as any),
            isPlayerTurn,
            isSelected
          });
          if (isPlayerTurn) {
            console.log('✅ Calling onSelect directly from onClick');
            onSelect();
          }
        }}
      >
        <IonCard className="card-container">
          <div className="card-image-container">
            <OrganismRenderer
              card={card}
              size={size === 'small' ? 60 : size === 'medium' ? 80 : 100}
              className="card-image"
            />
            
            {/* Conservation Status Badge */}
            <IonChip
              className="conservation-badge"
              color={getConservationColor(getCardConservationStatus(card))}
            >
              <IonLabel>{getConservationLabel(getCardConservationStatus(card))}</IonLabel>
            </IonChip>
          </div>
          
          <IonCardContent className="card-content">
            <div className="card-name">{card.nameId}</div>
            <div className="card-scientific">{card.scientificNameId}</div>
            
            <div className="card-stats">
              <div className="stat">
                <IonIcon icon={flash} />
                <span>FC: {card.phyloAttributes?.foodchainLevel || 1}</span>
              </div>
              <div className="stat">
                <IonIcon icon={heart} />
                <span>{card.phyloAttributes?.pointValue || card.power || 1}</span>
              </div>
            </div>
            
            <div className="card-habitat">
              {card.phyloAttributes?.terrains?.slice(0, 2).map((terrain, index) => (
                <IonChip key={index} className="habitat-chip">
                  <IonLabel>{terrain}</IonLabel>
                </IonChip>
              ))}
            </div>
          </IonCardContent>
        </IonCard>
        
        {/* Selection Indicator */}
        {isSelected && (
          <motion.div 
            className="selection-indicator"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}
        
        {/* Drag Indicator */}
        {isDragging && (
          <motion.div 
            className="drag-indicator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Drag to place
          </motion.div>
        )}
      </motion.div>

      {/* Species Information Modal */}
      <IonModal isOpen={showSpeciesInfo} onDidDismiss={() => setShowSpeciesInfo(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>{localization.getCardName(card.nameId as any)}</IonTitle>
            <IonButton fill="clear" slot="end" onClick={() => setShowSpeciesInfo(false)}>
              <IonIcon icon={close} />
            </IonButton>
          </IonToolbar>
        </IonHeader>
        
        <IonContent className="species-info-content">
          <div className="species-info">
            <div className="species-image-large">
              <OrganismRenderer
                card={card}
                size={200}
                className="species-image"
              />
            </div>
            
            <div className="species-details">
              <h2>{card.nameId}</h2>
              <h3>{card.scientificNameId}</h3>
              <p className="species-description">{card.description}</p>
              
              <div className="species-stats-grid">
                <div className="stat-item">
                  <IonIcon icon={flash} color="warning" />
                  <div>
                    <strong>Food Chain Level</strong>
                    <span>{card.phyloAttributes?.foodchainLevel || 1}</span>
                  </div>
                </div>
                
                <div className="stat-item">
                  <IonIcon icon={heart} color="danger" />
                  <div>
                    <strong>Point Value</strong>
                    <span>{card.phyloAttributes?.pointValue || card.power || 1}</span>
                  </div>
                </div>
                
                <div className="stat-item">
                  <IonIcon icon={shield} color="primary" />
                  <div>
                    <strong>Scale</strong>
                    <span>{card.phyloAttributes?.scale || 1}</span>
                  </div>
                </div>
                
                <div className="stat-item">
                  <IonIcon icon={leaf} color="success" />
                  <div>
                    <strong>Diet Type</strong>
                    <span>{card.phyloAttributes?.dietType || card.trophicRole}</span>
                  </div>
                </div>
              </div>
              
              <div className="habitat-info">
                <h4>Habitat Requirements</h4>
                <div className="habitat-chips">
                  {card.phyloAttributes?.terrains?.map((terrain, index) => (
                    <IonChip key={index} color="primary">
                      <IonLabel>{terrain}</IonLabel>
                    </IonChip>
                  ))}
                </div>
                
                <div className="climate-chips">
                  {card.phyloAttributes?.climates?.map((climate, index) => (
                    <IonChip key={index} color="secondary">
                      <IonLabel>{climate}</IonLabel>
                    </IonChip>
                  ))}
                </div>
              </div>
              
              <div className="conservation-info">
                <h4>Conservation Status</h4>
                <IonChip
                  color={getConservationColor(getCardConservationStatus(card))}
                >
                  <IonLabel>{ConservationStatus[getCardConservationStatus(card)]}</IonLabel>
                </IonChip>
              </div>
              
              {card.abilities && card.abilities.length > 0 && (
                <div className="abilities-info">
                  <h4>Special Abilities</h4>
                  {card.abilities.map((ability, index) => (
                    <div key={index} className="ability-item">
                      <strong>{ability.name}</strong>
                      <p>{ability.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </IonContent>
      </IonModal>
    </>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(EnhancedHandCard, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.card.cardId === nextProps.card.cardId &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isPlayerTurn === nextProps.isPlayerTurn &&
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.onDragStart === nextProps.onDragStart &&
    prevProps.onDragEnd === nextProps.onDragEnd
  );
});
