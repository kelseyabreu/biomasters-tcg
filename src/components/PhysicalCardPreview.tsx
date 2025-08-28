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
import { Card as CardType } from '../types';
import OrganismRenderer from './OrganismRenderer';
import { getTrophicColor, getConservationColor } from '../utils/cardUtils';
import './PhysicalCardPreview.css';

interface PhysicalCardPreviewProps {
  card: CardType;
  showBack?: boolean;
}

const PhysicalCardPreview: React.FC<PhysicalCardPreviewProps> = ({ 
  card, 
  showBack = false 
}) => {
  const [isFlipped, setIsFlipped] = useState(showBack);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="physical-card-container">
      <motion.div
        className="card-flipper"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front of Card */}
        <div className="card-face card-front">
          <IonCard className="physical-card">
            {/* Card Header */}
            <div className="card-header">
              <div className="card-title-section">
                <h2 className="card-name">{card.commonName}</h2>
                <p className="scientific-name">{card.scientificName}</p>
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
                size={200}
              />
            </div>

            {/* Card Stats */}
            <div className="card-stats">
              <IonGrid>
                <IonRow>
                  <IonCol size="3">
                    <div className="stat-item">
                      <IonIcon icon={flash} color="danger" />
                      <span className="stat-value">{card.power}</span>
                      <span className="stat-label">PWR</span>
                    </div>
                  </IonCol>
                  <IonCol size="3">
                    <div className="stat-item">
                      <IonIcon icon={heart} color="success" />
                      <span className="stat-value">{card.health}</span>
                      <span className="stat-label">HP</span>
                    </div>
                  </IonCol>
                  <IonCol size="3">
                    <div className="stat-item">
                      <IonIcon icon={speedometer} color="primary" />
                      <span className="stat-value">{card.speed}</span>
                      <span className="stat-label">SPD</span>
                    </div>
                  </IonCol>
                  <IonCol size="3">
                    <div className="stat-item">
                      <IonIcon icon={eye} color="warning" />
                      <span className="stat-value">{card.senses}</span>
                      <span className="stat-label">SEN</span>
                    </div>
                  </IonCol>
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
              <div className="card-id">#{card.id.slice(-4)}</div>
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
              <p>{card.commonName}</p>
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
                    <span>Lifespan:</span> <strong>{Math.round(card.realData.lifespan_Max_Days / 365)}yr</strong>
                  </div>
                )}
              </div>

              {/* Movement */}
              <div className="data-section">
                <h4>🏃 Movement</h4>
                {card.realData?.run_Speed_m_per_hr && card.realData.run_Speed_m_per_hr > 0 && (
                  <div className="data-item">
                    <span>Run:</span> <strong>{(card.realData.run_Speed_m_per_hr / 1000).toFixed(1)}km/h</strong>
                  </div>
                )}
                {card.realData?.swim_Speed_m_per_hr && card.realData.swim_Speed_m_per_hr > 0 && (
                  <div className="data-item">
                    <span>Swim:</span> <strong>{(card.realData.swim_Speed_m_per_hr / 1000).toFixed(1)}km/h</strong>
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
              <p><em>"All game mechanics are based on real scientific data. Learn more about {card.commonName} and support conservation efforts."</em></p>
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
const getConservationIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'critically endangered':
      return skull;
    case 'endangered':
      return skull;
    case 'vulnerable':
      return heart;
    case 'near threatened':
      return leaf;
    default:
      return paw;
  }
};

export default PhysicalCardPreview;
