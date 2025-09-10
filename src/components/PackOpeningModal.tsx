/**
 * Pack Opening Modal Component
 * Shows pack opening animation and card reveals
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { Card as CardType, CONSERVATION_RARITY_DATA } from '../types';
import { ConservationStatus } from '@shared/enums';
import { useLocalization } from '../contexts/LocalizationContext';

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
  newCards: number[];
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
  const localization = useLocalization();
  const [isOpening, setIsOpening] = useState(false);
  const [packResult, setPackResult] = useState<PackResult | null>(null);
  const [showCards, setShowCards] = useState(false);

  // Ref to track pack opening state to prevent race conditions
  const isOpeningRef = useRef(false);
  const hasOpenedRef = useRef(false);
  const [showEducationalInfo, setShowEducationalInfo] = useState(false);

  // Helper function to get rarity colors (matches collection view)
  const getRarityColor = (status: ConservationStatus) => {
    switch (status) {
      case ConservationStatus.LEAST_CONCERN: return 'success';
      case ConservationStatus.NEAR_THREATENED: return 'warning';
      case ConservationStatus.VULNERABLE: return 'warning';
      case ConservationStatus.ENDANGERED: return 'danger';
      case ConservationStatus.CRITICALLY_ENDANGERED: return 'danger';
      case ConservationStatus.EXTINCT: return 'dark';
      case ConservationStatus.EXTINCT_IN_WILD: return 'dark';
      case ConservationStatus.DATA_DEFICIENT: return 'medium';
      case ConservationStatus.NOT_EVALUATED: return 'medium';
      default: return 'medium';
    }
  };

  const handleOpenPack = useCallback(async () => {
    console.log('🎁 [PackOpeningModal] handleOpenPack called');
    console.log('🎁 [PackOpeningModal] packType:', packType);
    console.log('🎁 [PackOpeningModal] Current state:', {
      isOpening,
      isOpeningRef: isOpeningRef.current,
      hasOpenedRef: hasOpenedRef.current
    });
    console.log('🎁 [PackOpeningModal] localStorage before opening:', {
      userCollection: localStorage.getItem('userCollection'),
      userPacks: localStorage.getItem('userPacks'),
      syncQueue: localStorage.getItem('syncQueue')
    });

    // Prevent double-clicking with both state and ref
    if (isOpening || isOpeningRef.current || hasOpenedRef.current) {
      console.log('🚫 Pack opening already in progress or completed, ignoring duplicate call');
      return;
    }

    console.log('🎁 Starting pack opening process...');
    isOpeningRef.current = true;
    hasOpenedRef.current = true;
    setIsOpening(true);

    try {
      // Simulate pack opening animation delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      let newCardIds: number[] = [];

      if (packType === 'starter') {
        console.log('🎁 Opening starter pack...');
        newCardIds = await openStarterPack();
      } else {
        console.log(`🎁 Opening ${packType} pack...`);
        newCardIds = await openPack(packType);
      }
      
      // Convert card IDs to Card objects
      const cards = newCardIds.map(cardId =>
        allSpeciesCards.find(card => card.cardId === cardId)
      ).filter(Boolean) as CardType[];
      
      // Calculate pack statistics
      const rareCards = cards.filter(card => {
        const rarity = CONSERVATION_RARITY_DATA[card.conservationStatus as ConservationStatus];
        return rarity && rarity.percentage <= 12.2; // Vulnerable or rarer
      });

      // Calculate rarity breakdown
      const rarityBreakdown: Record<ConservationStatus, number> = {} as Record<ConservationStatus, number>;
      Object.values(ConservationStatus).forEach(status => {
        if (typeof status === 'number') {
          rarityBreakdown[status] = 0;
        }
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
        newCards: newCardIds,
        totalValue,
        rareCards,
        rarityBreakdown
      };

      console.log('🎁 [PackOpeningModal] Pack opening completed successfully');
      console.log('🎁 [PackOpeningModal] Result:', result);
      console.log('🎁 [PackOpeningModal] New card IDs:', newCardIds);
      console.log('🎁 [PackOpeningModal] localStorage after opening:', {
        userCollection: localStorage.getItem('userCollection'),
        userPacks: localStorage.getItem('userPacks'),
        syncQueue: localStorage.getItem('syncQueue')
      });
      
      setPackResult(result);
      setIsOpening(false);
      isOpeningRef.current = false;

      // Show cards after a brief delay
      setTimeout(() => setShowCards(true), 500);

    } catch (error) {
      console.error('Failed to open pack:', error);
      setIsOpening(false);
      isOpeningRef.current = false;
      // Don't reset hasOpenedRef here to prevent retry attempts
      onClose();
    }
  }, [packType, openPack, openStarterPack, onClose]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 Resetting pack opening modal state...');
      setIsOpening(false);
      setPackResult(null);
      setShowCards(false);
      isOpeningRef.current = false;
      hasOpenedRef.current = false;
    }
  }, [isOpen]);

  // Separate effect for auto-opening pack to prevent multiple calls
  useEffect(() => {
    if (isOpen && !isOpening && !packResult && !isOpeningRef.current && !hasOpenedRef.current) {
      console.log('🎯 Triggering pack opening...');
      // Add a small delay to ensure state is properly reset
      const timer = setTimeout(() => {
        handleOpenPack();
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [isOpen, isOpening, packResult, handleOpenPack]);

  const handleClose = () => {
    console.log('🚪 Closing pack opening modal...');
    setIsOpening(false);
    setPackResult(null);
    setShowCards(false);
    isOpeningRef.current = false;
    hasOpenedRef.current = false;
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
                      <IonCol size="6" sizeMd="4" sizeLg="3" sizeXl="2" key={`${card.cardId}-${index}`}>
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
                              <div className="card-title">
                                {localization.getCardName(card.nameId as any)}
                              </div>
                              <div className="card-subtitle">
                                {localization.getScientificName(card.scientificNameId as any)}
                              </div>

                              {/* Conservation Status Badge */}
                              <div className="card-badges">
                                <IonBadge color={getRarityColor(card.conservationStatus)}>
                                  {ConservationStatus[card.conservationStatus]}
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
                        .map(([status, count]) => {
                          const statusNum = parseInt(status) as ConservationStatus;
                          return (
                            <div key={status} className="rarity-item">
                              <IonBadge color={getRarityColor(statusNum)}>
                                {`${ConservationStatus[statusNum]}: ${count}`}
                              </IonBadge>
                            </div>
                          );
                        })}
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

                  {Object.entries(CONSERVATION_RARITY_DATA).map(([status, data]) => {
                    const statusNum = parseInt(status) as ConservationStatus;
                    return (
                      <IonItem key={status} className="conservation-status-item">
                        <div className="status-info">
                          <div className="status-header">
                            <IonBadge color={getRarityColor(statusNum)}>
                              {ConservationStatus[statusNum]}
                            </IonBadge>
                            <span className="percentage">{data.percentage}% of all species</span>
                          </div>
                          <div className="status-details">
                            <div className="description">{data.description}</div>
                            <div className="pack-rarity"><strong>Pack rarity:</strong> {data.packRarity}/1000 cards</div>
                          </div>
                        </div>
                      </IonItem>
                    );
                  })}
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
