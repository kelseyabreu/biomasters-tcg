import React, { useState } from 'react';
import {
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonGrid,
  IonRow,
  IonCol
} from '@ionic/react';
import { useLocalization } from '../contexts/LocalizationContext';
import {
  flash,
  heart,
  speedometer,
  eye,
  leaf,
  paw,
  skull,
  refresh,
  thermometer,
  water
} from 'ionicons/icons';
import { motion } from 'framer-motion';
import { Card as CardType, ConservationStatus } from '../types';
import OrganismRenderer from './OrganismRenderer';
import { getTrophicColor, getConservationColor } from '../utils/cardUtils';
import './PhysicalCardPreview.css';

// Configuration constants for data-driven rendering
const PHYSICAL_CARD_CONFIG = {
  organismSize: 200,
  flipDuration: 0.6,
  statColumns: 4,
  speedConversionFactor: 1000, // Convert m/hr to km/h
  lifespanConversionFactor: 365, // Convert days to years
  cardIdDisplayLength: 4
} as const;

// Card stats configuration for dynamic rendering
const CARD_STATS = [
  { key: 'power', icon: flash, color: 'danger', label: 'PWR' },
  { key: 'health', icon: heart, color: 'success', label: 'HP' },
  { key: 'speed', icon: speedometer, color: 'primary', label: 'SPD' },
  { key: 'senses', icon: eye, color: 'warning', label: 'SEN' }
] as const;

interface PhysicalCardPreviewProps {
  card: CardType;
  showBack?: boolean;
}

const PhysicalCardPreview: React.FC<PhysicalCardPreviewProps> = ({
  card,
  showBack = false
}) => {
  const [isFlipped, setIsFlipped] = useState(showBack);
  const localization = useLocalization();

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="physical-card-container">
      <motion.div
        className="card-flipper"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: PHYSICAL_CARD_CONFIG.flipDuration, type: "spring" }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front of Card */}
        <div className="card-face card-front">
          <IonCard className="physical-card">
            {/* Card Header */}
            <div className="card-header">
              <div className="card-title-section">
                <h2 className="card-name">{localization.getCardName(card.nameId as any)}</h2>
                <p className="scientific-name">{localization.getScientificName(card.scientificNameId as any)}</p>
              </div>
              <div className="energy-cost">
                <IonBadge color="warning">{card.energyCost}</IonBadge>
              </div>
            </div>

            {/* Organism Artwork */}
            <div className="card-artwork">
              <OrganismRenderer
                card={card}
                showControls={false}
                size={PHYSICAL_CARD_CONFIG.organismSize}
              />
            </div>

            {/* Card Stats */}
            <div className="card-stats">
              <IonGrid>
                <IonRow>
                  {CARD_STATS.map((stat) => (
                    <IonCol key={stat.key} size={`${12 / PHYSICAL_CARD_CONFIG.statColumns}`}>
                      <div className="stat-item">
                        <IonIcon icon={stat.icon} color={stat.color} />
                        <span className="stat-value">{card[stat.key as keyof CardType] as number}</span>
                        <span className="stat-label">{stat.label}</span>
                      </div>
                    </IonCol>
                  ))}
                </IonRow>
              </IonGrid>
            </div>

            {/* Card Type Info */}
            <div className="card-type-info">
              <IonBadge color={getTrophicColor(card.trophicRole)}>
                {card.trophicRole}
              </IonBadge>
              <IonBadge color="medium">
                {card.habitat}
              </IonBadge>
              <IonBadge color={getConservationColor(card.conservationStatus)}>
                {card.conservationStatus}
              </IonBadge>
            </div>

            {/* Abilities */}
            {card.abilities && card.abilities.length > 0 && (
              <div className="card-abilities">
                <h4>Abilities</h4>
                {card.abilities.slice(0, 2).map((ability, index) => (
                  <div key={index} className="ability">
                    <strong>{ability.name}:</strong> {ability.description}
                  </div>
                ))}
              </div>
            )}

            {/* Card Footer */}
            <div className="card-footer">
              <div className="card-id">#{card.cardId.toString().slice(-PHYSICAL_CARD_CONFIG.cardIdDisplayLength)}</div>
              <div className="card-rarity">
                <IonIcon
                  icon={getConservationIcon(card.conservationStatus)}
                  color={getConservationColor(card.conservationStatus)}
                />
              </div>
            </div>
          </IonCard>
        </div>

        {/* Back of Card */}
        <div className="card-face card-back">
          <IonCard className="physical-card card-back-design">
            {/* Scientific Data */}
            <div className="card-back-header">
              <h3>Scientific Data</h3>
              <p>{localization.getCardName(card.nameId as any)}</p>
            </div>

            <div className="scientific-data-grid">
              {/* Physical Characteristics */}
              <div className="data-section">
                <h4>📏 Physical</h4>
                <div className="data-item">
                  <span>Mass:</span> <strong>{card.realData?.mass_kg}kg</strong>
                </div>
                {card.realData?.lifespan_Max_Days && (
                  <div className="data-item">
                    <span>Lifespan:</span> <strong>{Math.round(card.realData.lifespan_Max_Days / PHYSICAL_CARD_CONFIG.lifespanConversionFactor)}yr</strong>
                  </div>
                )}
              </div>

              {/* Movement */}
              <div className="data-section">
                <h4>🏃 Movement</h4>
                {card.realData?.run_Speed_m_per_hr && card.realData.run_Speed_m_per_hr > 0 && (
                  <div className="data-item">
                    <span>Run:</span> <strong>{(card.realData.run_Speed_m_per_hr / PHYSICAL_CARD_CONFIG.speedConversionFactor).toFixed(1)}km/h</strong>
                  </div>
                )}
                {card.realData?.swim_Speed_m_per_hr && card.realData.swim_Speed_m_per_hr > 0 && (
                  <div className="data-item">
                    <span>Swim:</span> <strong>{(card.realData.swim_Speed_m_per_hr / PHYSICAL_CARD_CONFIG.speedConversionFactor).toFixed(1)}km/h</strong>
                  </div>
                )}
              </div>

              {/* Senses */}
              <div className="data-section">
                <h4>👁️ Senses</h4>
                {card.realData?.vision_range_m && card.realData.vision_range_m > 0 && (
                  <div className="data-item">
                    <span>Vision:</span> <strong>{card.realData.vision_range_m}m</strong>
                  </div>
                )}
                {card.realData?.hearing_range_m && card.realData.hearing_range_m > 0 && (
                  <div className="data-item">
                    <span>Hearing:</span> <strong>{card.realData.hearing_range_m}m</strong>
                  </div>
                )}
                {card.realData?.smell_range_m && card.realData.smell_range_m > 0 && (
                  <div className="data-item">
                    <span>Smell:</span> <strong>{card.realData.smell_range_m}m</strong>
                  </div>
                )}
              </div>

              {/* Environment */}
              <div className="data-section">
                <h4>🌡️ Environment</h4>
                {card.realData?.temperatureMinimum_C !== undefined && card.realData?.temperatureMaximum_C !== undefined && (
                  <div className="data-item">
                    <span>Temp:</span> <strong>{card.realData.temperatureMinimum_C}°C to {card.realData.temperatureMaximum_C}°C</strong>
                  </div>
                )}
                <div className="data-item">
                  <span>Habitat:</span> <strong>{card.habitat}</strong>
                </div>
              </div>
            </div>

            {/* Educational Note */}
            <div className="educational-note">
              <p><em>"All game mechanics are based on real scientific data. Learn more about {localization.getCardName(card.nameId as any)} and support conservation efforts."</em></p>
            </div>

            {/* Back Footer */}
            <div className="card-back-footer">
              <div className="logo">Species Combat TCG</div>
              <div className="transparency-motto">🔬 Scientific Transparency</div>
            </div>
          </IonCard>
        </div>
      </motion.div>

      {/* Flip Button */}
      <div className="flip-controls">
        <IonButton 
          fill="outline" 
          onClick={handleFlip}
          className="flip-button"
        >
          <IonIcon icon={refresh} slot="start" />
          {isFlipped ? 'Show Front' : 'Show Back'}
        </IonButton>
      </div>
    </div>
  );
};

// Helper function for conservation status icons
const getConservationIcon = (status: ConservationStatus) => {
  switch (status) {
    case ConservationStatus.CRITICALLY_ENDANGERED:
      return skull;
    case ConservationStatus.ENDANGERED:
      return skull;
    case ConservationStatus.VULNERABLE:
      return heart;
    case ConservationStatus.NEAR_THREATENED:
      return leaf;
    case ConservationStatus.EXTINCT:
      return skull;
    case ConservationStatus.EXTINCT_IN_WILD:
      return skull;
    case ConservationStatus.DATA_DEFICIENT:
      return eye;
    case ConservationStatus.NOT_EVALUATED:
      return eye;
    case ConservationStatus.LEAST_CONCERN:
      return paw;
    default:
      return paw;
  }
};

export default PhysicalCardPreview;
