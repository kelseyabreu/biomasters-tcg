/**
 * Pack Opening Modal Component
 * Shows pack opening animation and card reveals
 */

import React, { useState, useEffect } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonBadge,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonText
} from '@ionic/react';
import {
  close,
  gift,
  star,
  trophy,
  library,
  sparkles,
  statsChart
} from 'ionicons/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useHybridGameStore } from '../state/hybridGameStore';
import { Card as CardType, ConservationStatus, CONSERVATION_RARITY_DATA } from '../types';
import Card from './Card';
import OrganismRenderer from './OrganismRenderer';
import './PackOpeningModal.css';

interface PackOpeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  packType: string;
  packName: string;
}

interface PackResult {
  cards: CardType[];
  newCards: string[];
  totalValue: number;
  rareCards: CardType[];
  rarityBreakdown: Record<ConservationStatus, number>;
}

export const PackOpeningModal: React.FC<PackOpeningModalProps> = ({
  isOpen,
  onClose,
  packType,
  packName
}) => {
  const { openPack, openStarterPack, allSpeciesCards } = useHybridGameStore();
  const [isOpening, setIsOpening] = useState(false);
  const [packResult, setPackResult] = useState<PackResult | null>(null);
  const [showCards, setShowCards] = useState(false);
  const [showEducationalInfo, setShowEducationalInfo] = useState(false);

  // Helper function to get rarity colors
  const getRarityColor = (status: ConservationStatus) => {
    const rarity = CONSERVATION_RARITY_DATA[status];
    if (rarity.percentage <= 0.5) return 'dark'; // Extinct
    if (rarity.percentage <= 5.5) return 'danger'; // CR
    if (rarity.percentage <= 10.1) return 'warning'; // EN
    if (rarity.percentage <= 12.2) return 'tertiary'; // VU
    return 'success'; // Common
  };

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsOpening(false);
      setPackResult(null);
      setShowCards(false);
      // Start pack opening automatically
      handleOpenPack();
    }
  }, [isOpen]);

  const handleOpenPack = async () => {
    setIsOpening(true);
    
    try {
      // Simulate pack opening animation delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      let newCardNames: string[] = [];

      if (packType === 'starter') {
        newCardNames = await openStarterPack();
      } else {
        newCardNames = await openPack(packType);
      }
      
      // Convert card names to Card objects
      const cards = newCardNames.map(cardName => 
        allSpeciesCards.find(card => card.speciesName === cardName)
      ).filter(Boolean) as CardType[];
      
      // Calculate pack statistics
      const rareCards = cards.filter(card => {
        const rarity = CONSERVATION_RARITY_DATA[card.conservationStatus as ConservationStatus];
        return rarity && rarity.percentage <= 12.2; // Vulnerable or rarer
      });

      // Calculate rarity breakdown
      const rarityBreakdown: Record<ConservationStatus, number> = {} as Record<ConservationStatus, number>;
      Object.values(ConservationStatus).forEach(status => {
        rarityBreakdown[status] = 0;
      });

      cards.forEach(card => {
        const status = card.conservationStatus as ConservationStatus;
        if (rarityBreakdown[status] !== undefined) {
          rarityBreakdown[status]++;
        }
      });

      // Calculate total value based on rarity
      const totalValue = cards.reduce((sum, card) => {
        const rarity = CONSERVATION_RARITY_DATA[card.conservationStatus as ConservationStatus];
        const cardValue = rarity ? Math.round(100 / rarity.percentage) : 1;
        return sum + cardValue;
      }, 0);

      const result: PackResult = {
        cards,
        newCards: newCardNames,
        totalValue,
        rareCards,
        rarityBreakdown
      };
      
      setPackResult(result);
      setIsOpening(false);
      
      // Show cards after a brief delay
      setTimeout(() => setShowCards(true), 500);
      
    } catch (error) {
      console.error('Failed to open pack:', error);
      setIsOpening(false);
      onClose();
    }
  };

  const handleClose = () => {
    setIsOpening(false);
    setPackResult(null);
    setShowCards(false);
    onClose();
  };

  return (
    <IonModal 
      isOpen={isOpen} 
      onDidDismiss={handleClose}
      className="pack-opening-modal"
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>Opening {packName}</IonTitle>
          <IonButton
            slot="end"
            fill="clear"
            onClick={handleClose}
          >
            <IonIcon icon={close} />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="pack-opening-content">
        {/* Pack Opening Animation */}
        <AnimatePresence>
          {isOpening && (
            <motion.div
              className="pack-opening-animation"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <div className="pack-visual">
                <motion.div
                  animate={{ 
                    rotateY: [0, 360],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <IonIcon icon={gift} size="large" />
                </motion.div>
                <motion.div 
                  className="opening-text"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Opening {packName}...
                </motion.div>
                <motion.div
                  className="sparkles"
                  animate={{ 
                    rotate: [0, 360],
                    scale: [0.8, 1.2, 0.8]
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  <IonIcon icon={sparkles} />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pack Results */}
        {packResult && showCards && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="pack-results"
          >
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>
                  <IonIcon icon={star} />
                  Pack Opened: {packName}
                </IonCardTitle>
              </IonCardHeader>
              
              <IonCardContent>
                {/* Pack Statistics */}
                <div className="pack-stats">
                  <IonBadge color="primary">
                    <IonIcon icon={library} />
                    {packResult.cards.length} Cards
                  </IonBadge>
                  {packResult.rareCards.length > 0 && (
                    <IonBadge color="warning">
                      <IonIcon icon={star} />
                      {packResult.rareCards.length} Rare
                    </IonBadge>
                  )}
                  <IonBadge color="success">
                    <IonIcon icon={trophy} />
                    Value: {packResult.totalValue}
                  </IonBadge>
                </div>

                {/* Cards Grid */}
                <IonGrid className="cards-grid">
                  <IonRow>
                    {packResult.cards.map((card, index) => (
                      <IonCol size="6" sizeMd="4" sizeLg="3" sizeXl="2" key={`${card.id}-${index}`}>
                        <motion.div
                          initial={{ opacity: 0, rotateY: 180 }}
                          animate={{ opacity: 1, rotateY: 0 }}
                          transition={{
                            delay: index * 0.2,
                            duration: 0.6,
                            ease: "easeOut"
                          }}
                          className="card-reveal"
                        >
                          <div className="species-card">
                            {/* Card Number Badge */}
                            <div className="card-number-badge">
                              <IonBadge color="primary">{index + 1}</IonBadge>
                            </div>

                            <div className="card-content">
                              {/* Card Image - Use OrganismRenderer for emoji display */}
                              <div className="card-image-container">
                                <OrganismRenderer
                                  card={card}
                                  size={80}
                                  showControls={false}
                                  className="pack-card-organism"
                                />
                              </div>

                              {/* Card Info */}
                              <div className="card-title">{card.commonName}</div>
                              <div className="card-subtitle">{card.scientificName}</div>

                              {/* Conservation Status Badge */}
                              <div className="card-badges">
                                <IonBadge color={getRarityColor(card.conservationStatus as ConservationStatus)}>
                                  {card.conservationStatus.replace(/_/g, ' ')}
                                </IonBadge>
                                <IonBadge color="medium">
                                  {card.habitat}
                                </IonBadge>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </IonCol>
                    ))}
                  </IonRow>
                </IonGrid>

                {/* Conservation Status Breakdown */}
                {Object.entries(packResult.rarityBreakdown).some(([_, count]) => count > 0) && (
                  <div className="rarity-breakdown">
                    <h4>Conservation Status Breakdown:</h4>
                    <div className="rarity-list">
                      {Object.entries(packResult.rarityBreakdown)
                        .filter(([_, count]) => count > 0)
                        .map(([status, count]) => (
                          <div key={status} className="rarity-item">
                            <IonBadge color={getRarityColor(status as ConservationStatus)}>
                              {status.replace(/_/g, ' ')}: {count}
                            </IonBadge>
                            <span className="rarity-percentage">
                              ({CONSERVATION_RARITY_DATA[status as ConservationStatus]?.percentage}% of species)
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pack-actions">
                  <IonButton
                    expand="block"
                    fill="outline"
                    onClick={() => setShowEducationalInfo(!showEducationalInfo)}
                    color="secondary"
                  >
                    <IonIcon icon={library} slot="start" />
                    {showEducationalInfo ? 'Hide' : 'Show'} IUCN Conservation Info
                  </IonButton>

                  <IonButton
                    expand="block"
                    onClick={handleClose}
                    color="primary"
                  >
                    Continue
                  </IonButton>
                </div>
              </IonCardContent>
            </IonCard>
          </motion.div>
        )}

        {/* Educational Information */}
        {showEducationalInfo && packResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="educational-stats"
          >
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>
                  <IonIcon icon={statsChart} />
                  IUCN Red List Statistics (October 28, 2024)
                </IonCardTitle>
              </IonCardHeader>

              <IonCardContent>
                <IonList>
                  <IonListHeader>
                    <IonLabel>Conservation Status Distribution</IonLabel>
                  </IonListHeader>

                  {Object.entries(CONSERVATION_RARITY_DATA).map(([status, data]) => (
                    <IonItem key={status} className="conservation-status-item">
                      <div className="status-info">
                        <div className="status-header">
                          <IonBadge color={getRarityColor(status as ConservationStatus)}>
                            {status.replace(/_/g, ' ')}
                          </IonBadge>
                          <span className="percentage">{data.percentage}% of all species</span>
                        </div>
                        <div className="status-details">
                          <div className="description">{data.description}</div>
                          <div className="pack-rarity"><strong>Pack rarity:</strong> {data.packRarity}/1000 cards</div>
                        </div>
                      </div>
                    </IonItem>
                  ))}
                </IonList>

                <div className="educational-note">
                  <IonText color="medium">
                    <p>
                      <strong>Educational Note:</strong> This pack system uses real IUCN Red List data
                      to teach about conservation status. Rare cards represent species that need our protection!
                    </p>
                    <p style={{ marginTop: '8px', fontSize: '0.85rem' }}>
                      <em>Note: "Not Evaluated" species are excluded as they typically receive evaluation.
                      Percentages are redistributed proportionally among evaluated species.</em>
                    </p>
                  </IonText>
                </div>
              </IonCardContent>
            </IonCard>
          </motion.div>
        )}
      </IonContent>
    </IonModal>
  );
};

export default PackOpeningModal;
