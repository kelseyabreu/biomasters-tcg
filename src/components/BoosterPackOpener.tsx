import React, { useState } from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonBadge,
  IonGrid,
  IonRow,
  IonCol,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader
} from '@ionic/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  gift,
  star,
  trophy,
  library,
  statsChart,
  sparkles
} from 'ionicons/icons';
import { BoosterPackSystem, PackOpeningResult, displayConservationEducation } from '../utils/boosterPackSystem';
import { Card as CardType, CONSERVATION_RARITY_DATA } from '../types';
import { ConservationStatus } from '@kelseyabreu/shared';
import { useLocalization } from '../contexts/LocalizationContext';

import Card from './Card';
import './BoosterPackOpener.css';

interface BoosterPackOpenerProps {
  allCards: CardType[];
}

const BoosterPackOpener: React.FC<BoosterPackOpenerProps> = ({ allCards }) => {
  const localization = useLocalization();
  const [packSystem] = useState(() => new BoosterPackSystem(allCards));
  const [lastOpenedPack, setLastOpenedPack] = useState<PackOpeningResult | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const openBoosterPack = async () => {
    setIsOpening(true);
    
    // Simulate pack opening animation delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const pack = packSystem.generateBoosterPack('Species Conservation Pack');
    const result = packSystem.generatePackStats(pack);
    
    setLastOpenedPack(result);
    setIsOpening(false);
    
    // Log educational information
    console.log('🎴 Booster Pack Opened!');
    console.log('Cards received:', result.pack.cards.map(c => {
      // Get localized card data using enum-based localization system
      const localizedCard = {
        displayName: localization.getCardName(c.nameId),
        displayScientificName: localization.getScientificName(c.scientificNameId),
        nameId: c.nameId,
        scientificNameId: c.scientificNameId,
        descriptionId: c.descriptionId
      };
      return `${localizedCard.displayName} (${c.conservationStatus})`;
    }));
    console.log('Pack value:', result.totalValue);
    console.log('Rare cards:', result.rareCards.length);
  };

  const showEducationalInfo = () => {
    displayConservationEducation();
    setShowStats(!showStats);
  };

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

  return (
    <div className="booster-pack-opener">
      {/* Pack Opening Interface */}
      <IonCard className="pack-opener-card">
        <IonCardHeader>
          <IonCardTitle>
            <IonIcon icon={gift} />
            Species Conservation Booster Packs
          </IonCardTitle>
        </IonCardHeader>
        
        <IonCardContent>
          <div className="pack-description">
            <p>
              Open booster packs to discover species cards! Rarity is based on real IUCN Red List 
              conservation status - the more endangered a species, the rarer the card.
            </p>
            
            <div className="pack-info">
              <IonBadge color="primary">8 cards per pack</IonBadge>
              <IonBadge color="success">Real IUCN data</IonBadge>
              <IonBadge color="warning">Educational value</IonBadge>
            </div>
          </div>

          <div className="pack-actions">
            <IonButton
              expand="block"
              onClick={openBoosterPack}
              disabled={isOpening}
              className="open-pack-button"
            >
              <IonIcon icon={isOpening ? sparkles : gift} slot="start" />
              {isOpening ? 'Opening Pack...' : 'Open Booster Pack'}
            </IonButton>
            
            <IonButton
              fill="outline"
              expand="block"
              onClick={showEducationalInfo}
              className="education-button"
            >
              <IonIcon icon={library} slot="start" />
              IUCN Conservation Info
            </IonButton>
          </div>
        </IonCardContent>
      </IonCard>

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
              <IonIcon icon={gift} />
              <div className="opening-text">Opening pack...</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pack Results */}
      {lastOpenedPack && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="pack-results"
        >
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                <IonIcon icon={star} />
                Pack Opened: {lastOpenedPack.pack.name}
              </IonCardTitle>
            </IonCardHeader>
            
            <IonCardContent>
              {/* Pack Statistics */}
              <div className="pack-stats">
                <div className="stat">
                  <IonIcon icon={trophy} />
                  <span>Value: {lastOpenedPack.totalValue}</span>
                </div>
                <div className="stat">
                  <IonIcon icon={star} />
                  <span>Rare Cards: {lastOpenedPack.rareCards.length}</span>
                </div>
                <div className="stat">
                  <IonIcon icon={library} />
                  <span>New Species: {lastOpenedPack.newSpecies.length}</span>
                </div>
              </div>

              {/* Cards Grid */}
              <IonGrid className="cards-grid">
                <IonRow>
                  {lastOpenedPack.pack.cards.map((card, index) => (
                    <IonCol size="6" size-md="3" key={`${card.cardId}-${index}`}>
                      <motion.div
                        initial={{ opacity: 0, rotateY: 180 }}
                        animate={{ opacity: 1, rotateY: 0 }}
                        transition={{ delay: index * 0.2 }}
                      >
                        <Card
                          card={card}
                          size="small"
                          disabled={false}
                        />
                      </motion.div>
                    </IonCol>
                  ))}
                </IonRow>
              </IonGrid>

              {/* Rarity Breakdown */}
              <div className="rarity-breakdown">
                <h4>Conservation Status Breakdown:</h4>
                {Object.entries(lastOpenedPack.pack.rarityBreakdown)
                  .filter(([_, count]) => count > 0)
                  .map(([status, count]) => {
                    const statusNum = parseInt(status) as ConservationStatus;
                    return (
                      <div key={status} className="rarity-item">
                        <IonBadge color={getRarityColor(statusNum)}>
                          {ConservationStatus[statusNum]}: {count}
                        </IonBadge>
                      </div>
                    );
                  })}
              </div>
            </IonCardContent>
          </IonCard>
        </motion.div>
      )}

      {/* Educational Statistics */}
      {showStats && (
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
                    <IonItem key={status}>
                      <IonBadge color={getRarityColor(statusNum)} slot="start">
                        {ConservationStatus[statusNum]}
                      </IonBadge>
                      <IonLabel>
                        <h3>{data.percentage}% of all species</h3>
                        <p>{data.description}</p>
                        <p><strong>Pack rarity:</strong> {data.packRarity}/1000 cards</p>
                      </IonLabel>
                    </IonItem>
                  );
                })}
              </IonList>
              
              <div className="educational-note">
                <p>
                  <strong>Educational Note:</strong> This booster pack system uses real IUCN Red List data 
                  to teach about conservation status. Rare cards represent species that need our protection!
                </p>
              </div>
            </IonCardContent>
          </IonCard>
        </motion.div>
      )}
    </div>
  );
};

export default BoosterPackOpener;
