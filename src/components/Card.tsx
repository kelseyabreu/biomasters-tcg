import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { IonCard, IonCardContent, IonBadge, IonIcon, IonButton } from '@ionic/react';
import { flash, leaf, paw, skull, heart, eye, speedometer, library, thermometer, trash, close } from 'ionicons/icons';
import { Card as CardType, TrophicRole, ConservationStatus, CONSERVATION_RARITY_DATA } from '../types';
import { useTheme } from '../theme/ThemeProvider';
import { useLocalization } from '../contexts/LocalizationContext';
import { getLocalizedCardData } from '../utils/cardLocalizationMapping';
import CardDetailsModal from './CardDetailsModal';
import OrganismRenderer from './OrganismRenderer';
import './Card.css';

interface CardProps {
  card: CardType;
  isPlayable?: boolean;
  isSelected?: boolean;
  isAttackTarget?: boolean;
  showActions?: boolean;
  onPlay?: () => void;
  onAttack?: () => void;
  onRemove?: () => void;
  onSelect?: () => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onAddToDeck?: (card: CardType) => void;
  showAddToDeckInModal?: boolean;
  context?: 'collection' | 'deck' | 'battle';
}



const Card: React.FC<CardProps> = ({
  card,
  isPlayable = false,
  isSelected = false,
  isAttackTarget = false,
  showActions = false,
  onPlay,
  onAttack,
  onRemove,
  onSelect,
  size = 'medium',
  disabled = false,
  onAddToDeck,
  showAddToDeckInModal = false,
  context = 'collection'
}) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { currentTheme, organismRenderMode } = useTheme();
  const localization = useLocalization();

  // Get localized card data
  const localizedCard = getLocalizedCardData(card, localization);

  const getConservationRarity = (status: ConservationStatus) => {
    return CONSERVATION_RARITY_DATA[status] || CONSERVATION_RARITY_DATA[ConservationStatus.NOT_EVALUATED];
  };

  // Get trophic role color from theme
  const getTrophicRoleColor = (role: TrophicRole): string => {
    switch (role) {
      case TrophicRole.PRODUCER: return currentTheme.colors.producer;
      case TrophicRole.HERBIVORE: return currentTheme.colors.herbivore;
      case TrophicRole.CARNIVORE: return currentTheme.colors.carnivore;
      case TrophicRole.OMNIVORE: return currentTheme.colors.omnivore;
      case TrophicRole.DETRITIVORE: return currentTheme.colors.detritivore;
      case TrophicRole.DECOMPOSER: return currentTheme.colors.decomposer;
      case TrophicRole.SCAVENGER: return currentTheme.colors.scavenger;
      default: return currentTheme.colors.medium;
    }
  };

  const getConservationBadgeColor = (status: ConservationStatus) => {
    switch (status) {
      case ConservationStatus.EXTINCT:
      case ConservationStatus.EXTINCT_IN_WILD:
        return 'dark';
      case ConservationStatus.CRITICALLY_ENDANGERED:
        return 'danger';
      case ConservationStatus.ENDANGERED:
        return 'warning';
      case ConservationStatus.VULNERABLE:
        return 'tertiary';
      case ConservationStatus.NEAR_THREATENED:
        return 'success';
      case ConservationStatus.LEAST_CONCERN:
        return 'primary';
      case ConservationStatus.DATA_DEFICIENT:
      case ConservationStatus.NOT_EVALUATED:
        return 'medium';
      default:
        return 'medium';
    }
  };
  const getTrophicIcon = (role: TrophicRole) => {
    switch (role) {
      case TrophicRole.PRODUCER:
        return leaf;
      case TrophicRole.HERBIVORE:
        return paw;
      case TrophicRole.CARNIVORE:
        return flash;
      case TrophicRole.OMNIVORE:
        return heart; // Mixed diet
      case TrophicRole.DETRITIVORE:
        return speedometer; // Recycling
      case TrophicRole.DECOMPOSER:
        return skull;
      case TrophicRole.SCAVENGER:
        return eye; // Opportunistic
      case TrophicRole.FILTER_FEEDER:
        return thermometer; // Filtering
      case TrophicRole.MIXOTROPH:
        return library; // Mixed nutrition
      default:
        return paw;
    }
  };

  const getTrophicColor = (role: TrophicRole) => {
    // Use theme-aware colors instead of Ionic color names
    return getTrophicRoleColor(role);
  };

  const getConservationColor = (status: ConservationStatus) => {
    switch (status) {
      case ConservationStatus.LEAST_CONCERN:
        return '#28a745';
      case ConservationStatus.NEAR_THREATENED:
        return '#ffc107';
      case ConservationStatus.VULNERABLE:
        return '#fd7e14';
      case ConservationStatus.ENDANGERED:
        return '#dc3545';
      case ConservationStatus.CRITICALLY_ENDANGERED:
        return '#6f42c1';
      case ConservationStatus.EXTINCT:
        return '#343a40';
      default:
        return '#6c757d';
    }
  };

  const cardVariants = {
    idle: {
      scale: 1,
      rotateY: 0,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      borderColor: getConservationColor(card.conservationStatus)
    },
    hover: {
      scale: 1.05,
      rotateY: 5,
      boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
      borderColor: getConservationColor(card.conservationStatus)
    },
    selected: {
      scale: 1.1,
      rotateY: 0,
      boxShadow: '0 0 20px rgba(66, 165, 245, 0.6)',
      borderColor: '#42a5f5'
    },
    attackTarget: {
      scale: 1.05,
      rotateY: 0,
      boxShadow: '0 0 20px rgba(244, 67, 54, 0.6)',
      borderColor: '#f44336'
    },
    disabled: {
      scale: 0.95,
      opacity: 0.6,
      boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
    }
  };

  const getCurrentVariant = () => {
    if (disabled) return 'disabled';
    if (isAttackTarget) return 'attackTarget';
    if (isSelected) return 'selected';
    return 'idle';
  };

  const handleCardClick = () => {
    if (disabled) return;

    // In battle context, always show details modal for card inspection
    // Battle actions are handled by specific action buttons
    if (context === 'battle') {
      setShowDetailsModal(true);
    } else if (onSelect) {
      onSelect();
    } else {
      setShowDetailsModal(true);
    }
  };

  const handleCloseModal = () => {
    // Clear any focused elements before closing modal
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setShowDetailsModal(false);
  };

  const getConservationCSSClass = (status: ConservationStatus) => {
    return status.toLowerCase().replace(/\s+/g, '-');
  };

  return (
    <motion.div
      className={`species-card ${size} ${isPlayable ? 'playable' : ''} ${getConservationCSSClass(card.conservationStatus)}`}
      variants={cardVariants}
      initial="idle"
      animate={getCurrentVariant()}
      whileHover={disabled ? undefined : "hover"}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      onClick={handleCardClick}
      onBlur={() => {
        // Ensure proper focus management for accessibility
        if (showDetailsModal) {
          setTimeout(() => {
            const modalElement = document.querySelector('ion-modal[aria-hidden="false"]');
            if (modalElement) {
              const firstFocusable = modalElement.querySelector('button, [tabindex]:not([tabindex="-1"])') as HTMLElement;
              if (firstFocusable) {
                firstFocusable.focus();
              }
            }
          }, 100);
        }
      }}
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
    >
      <IonCard className="card-container" style={{ position: 'relative' }}>
        {/* Remove button for deck cards */}
        {onRemove && context === 'deck' && (
          <IonButton
            fill="clear"
            size="small"
            color="danger"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '24px',
              height: '24px',
              minHeight: '24px',
              zIndex: 20,
              '--padding-start': '0',
              '--padding-end': '0'
            }}
          >
            <IonIcon icon={close} style={{ fontSize: '16px' }} />
          </IonButton>
        )}

        {/* Energy Cost */}
        <div className="energy-cost">
          <IonBadge color="primary">{card.energyCost}</IonBadge>
        </div>

        {/* Health Indicator - Only show in battle context */}
        {context === 'battle' && (
          <div className="health-indicator">
            <div className="health-bar">
              <div
                className="health-fill"
                style={{
                  width: `${(card.health / card.maxHealth) * 100}%`,
                  backgroundColor: card.health > card.maxHealth * 0.5 ? '#28a745' :
                                 card.health > card.maxHealth * 0.25 ? '#ffc107' : '#dc3545'
                }}
              />
            </div>
            <span className="health-text">{card.health}/{card.maxHealth}</span>
          </div>
        )}

        {/* Card Art */}
        <div className="card-art">
          <div className="species-illustration">
            {organismRenderMode === 'dom' ? (
              // 2D DOM Rendering - Interactive organism
              <OrganismRenderer
                card={card}
                size={size === 'large' ? 120 : size === 'medium' ? 100 : 80}
                showControls={false}
                className="card-organism"
              />
            ) : (
              // PNG/SVG Images - Static fallback
              <div className="species-image-container">
                {/* Try to load real species image, fallback to icon */}
                <img
                  src={`/images/species/${card.speciesName.toLowerCase().replace(/\s+/g, '-')}.png`}
                  alt={card.commonName}
                  className="species-image"
                  onError={(e) => {
                    // Fallback to SVG icon if image not found
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'block';
                  }}
                />
                <svg
                  viewBox="0 0 100 100"
                  className="species-svg fallback-icon"
                  style={{ display: 'none' }}
                >
                  <circle cx="50" cy="50" r="40" fill={getTrophicColor(card.trophicRole)} opacity="0.3"/>
                  <IonIcon
                    icon={getTrophicIcon(card.trophicRole)}
                    style={{ fontSize: '40px', color: getTrophicColor(card.trophicRole) }}
                  />
                </svg>
              </div>
            )}
          </div>
        </div>

        <IonCardContent className="card-content">
          {/* Species Names */}
          <div className="species-names">
            <h3 className="common-name">{localizedCard.displayName}</h3>
            <p className="scientific-name">{localizedCard.displayScientificName}</p>
          </div>

          {/* Trophic Role & Habitat */}
          <div className="card-badges">
            <IonBadge
              style={{
                '--background': getTrophicColor(card.trophicRole),
                '--color': currentTheme.colors.textPrimary
              }}
            >
              <IonIcon icon={getTrophicIcon(card.trophicRole)} />
              {card.trophicRole}
            </IonBadge>
            <IonBadge color="medium">{card.habitat}</IonBadge>
          </div>

          {/* Conservation Status */}
          <div className="conservation-status">
            <IonBadge color={getConservationBadgeColor(card.conservationStatus)}>
              {card.conservationStatus}
            </IonBadge>
            <div className="rarity-info">
              <span className="rarity-percentage">
                {getConservationRarity(card.conservationStatus).percentage}% of species
              </span>
              <span className="pack-rarity">
                {getConservationRarity(card.conservationStatus).packRarity}/1000 packs
              </span>
            </div>
          </div>

          {/* Game Stats */}
          <div className="card-stats">
            <div className="stat">
              <IonIcon icon={flash} />
              <span>{card.power}</span>
              <small>Power</small>
            </div>
            <div className="stat">
              <IonIcon icon={speedometer} />
              <span>{card.speed}</span>
              <small>Speed</small>
            </div>
            <div className="stat">
              <IonIcon icon={eye} />
              <span>{card.senses}</span>
              <small>Senses</small>
            </div>
          </div>

          {/* Real Biological Data */}
          {card.realData && (
            <div className="real-data-section">
              <div className="real-data-header">
                <IonIcon icon={library} />
                <span>Real Biology</span>
              </div>
              <div className="real-stats">
                <div className="real-stat">
                  <span className="label">Mass:</span>
                  <span className="value">{card.realData.mass_kg}kg</span>
                </div>
                {card.realData.run_Speed_m_per_hr && card.realData.run_Speed_m_per_hr > 0 && (
                  <div className="real-stat">
                    <span className="label">Max Speed:</span>
                    <span className="value">{(card.realData.run_Speed_m_per_hr / 1000).toFixed(1)}km/h</span>
                  </div>
                )}
                {card.realData.vision_range_m && card.realData.vision_range_m > 0 && (
                  <div className="real-stat">
                    <span className="label">Vision:</span>
                    <span className="value">{card.realData.vision_range_m}m</span>
                  </div>
                )}
                {card.realData.hearing_range_m && card.realData.hearing_range_m > 0 && (
                  <div className="real-stat">
                    <span className="label">Hearing:</span>
                    <span className="value">{card.realData.hearing_range_m}m</span>
                  </div>
                )}
                {(card.realData.temperatureMinimum_C !== undefined && card.realData.temperatureMaximum_C !== undefined) && (
                  <div className="real-stat">
                    <span className="label">Temperature:</span>
                    <span className="value">{card.realData.temperatureMinimum_C}°C to {card.realData.temperatureMaximum_C}°C</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Abilities */}
          {card.abilities.length > 0 && (
            <div className="card-abilities">
              {card.abilities.map((ability) => (
                <div key={ability.id} className="ability">
                  <strong>{ability.name}:</strong>
                  <span>{ability.description}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          {showActions && (
            <div className="card-actions">
              {isPlayable && onPlay && (
                <IonButton 
                  size="small" 
                  fill="solid" 
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay();
                  }}
                >
                  Play
                </IonButton>
              )}
              {onAttack && context === 'battle' && (
                <IonButton
                  size="small"
                  fill="outline"
                  color="danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAttack();
                  }}
                >
                  Attack
                </IonButton>
              )}

              {onSelect && context === 'battle' && (
                <IonButton
                  size="small"
                  fill={isSelected ? "solid" : "outline"}
                  color={isSelected ? "primary" : "medium"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect();
                  }}
                >
                  {isSelected ? "Selected" : "Select"}
                </IonButton>
              )}
              {onRemove && context === 'deck' && (
                <IonButton
                  size="small"
                  fill="outline"
                  color="danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                >
                  <IonIcon icon={trash} slot="start" />
                  Remove
                </IonButton>
              )}
            </div>
          )}
        </IonCardContent>
      </IonCard>

      {/* Card Details Modal */}
      <CardDetailsModal
        isOpen={showDetailsModal}
        onClose={handleCloseModal}
        card={card}
        onAddToDeck={onAddToDeck}
        showAddToDeck={showAddToDeckInModal}
      />
    </motion.div>
  );
};

export default Card;
