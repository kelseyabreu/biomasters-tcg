import React, { useState, useRef, memo } from 'react';
import { IonCard, IonCardContent, IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonChip, IonLabel } from '@ionic/react';
import { close, leaf, water, sunny, snow, shield, flash, heart } from 'ionicons/icons';
import { motion } from 'framer-motion';
import { Card } from '../../types';
import { useMobileGestures } from '../../hooks/useMobileGestures';
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
  console.log('🃏 EnhancedHandCard rendered:', {
    cardId: card.id,
    cardName: card.commonName,
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
        cardId: card.id,
        cardName: card.commonName,
        isPlayerTurn,
        isSelected,
        gestureState
      });
      if (isPlayerTurn) {
        console.log('✅ Calling onSelect for card:', card.id);
        onSelect();
      } else {
        console.log('❌ Not player turn, ignoring tap');
      }
    },
    
    onLongPress: () => {
      console.log('🖱️ EnhancedHandCard onLongPress triggered:', {
        cardId: card.id,
        cardName: card.commonName,
        isPlayerTurn
      });
      if (isPlayerTurn) {
        console.log('✅ Opening species info modal for card:', card.id);
        setShowSpeciesInfo(true);
      } else {
        console.log('❌ Not player turn, ignoring long press');
      }
    },
    
    onDragStart: (position) => {
      console.log('🖱️ EnhancedHandCard onDragStart triggered:', {
        cardId: card.id,
        cardName: card.commonName,
        isPlayerTurn,
        isSelected,
        position
      });
      if (isPlayerTurn && isSelected) {
        console.log('✅ Starting drag for card:', card.id);
        setIsDragging(true);
        setDragPosition(position);
        onDragStart?.(card.id);
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
        onDragEnd?.(card.id, position);
      }
    }
  }, {
    longPressDelay: 600,
    dragThreshold: 10
  });

  // Remove getCardImage function - we'll use OrganismRenderer instead

  const getConservationColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'critically_endangered': return 'danger';
      case 'endangered': return 'warning';
      case 'vulnerable': return 'medium';
      case 'near_threatened': return 'primary';
      case 'least_concern': return 'success';
      default: return 'medium';
    }
  };

  const getConservationLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'critically_endangered': return 'CR';
      case 'endangered': return 'EN';
      case 'vulnerable': return 'VU';
      case 'near_threatened': return 'NT';
      case 'least_concern': return 'LC';
      default: return 'LC';
    }
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
            cardId: card.id,
            cardName: card.commonName,
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
              color={getConservationColor(card.phyloAttributes?.conservationStatus || card.conservationStatus)}
            >
              <IonLabel>{getConservationLabel(card.phyloAttributes?.conservationStatus || card.conservationStatus)}</IonLabel>
            </IonChip>
          </div>
          
          <IonCardContent className="card-content">
            <div className="card-name">{card.commonName}</div>
            <div className="card-scientific">{card.scientificName}</div>
            
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
            <IonTitle>{card.commonName}</IonTitle>
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
              <h2>{card.commonName}</h2>
              <h3>{card.scientificName}</h3>
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
                  color={getConservationColor(card.phyloAttributes?.conservationStatus || card.conservationStatus)}
                >
                  <IonLabel>{card.phyloAttributes?.conservationStatus || card.conservationStatus}</IonLabel>
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
    prevProps.card.id === nextProps.card.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isPlayerTurn === nextProps.isPlayerTurn &&
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.onDragStart === nextProps.onDragStart &&
    prevProps.onDragEnd === nextProps.onDragEnd
  );
});
