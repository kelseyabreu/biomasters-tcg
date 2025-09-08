/**
 * Collection Card Component
 * Displays individual species cards with ownership status
 */

import React from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonBadge, IonIcon, IonText, IonButton } from '@ionic/react';
import { lockClosed, checkmarkCircle, star, add, remove } from 'ionicons/icons';
import { Card, ConservationStatus } from '../../types';
import { starterPackService } from '../../services/starterPackService';
import { useLocalization } from '../../contexts/LocalizationContext';

import OrganismRenderer from '../OrganismRenderer';
import './CollectionCard.css';

export interface CardPropertyFilter {
  habitat: boolean;
  role: boolean;
  conservationStatus: boolean;
  acquisitionType: boolean;
}

export interface DeckControlsConfig {
  enabled: boolean;
  currentQuantity: number;
  maxQuantity?: number;
  maxTotalCards?: number;
  currentTotalCards?: number;
  onAdd: (nameId: string) => void;
  onRemove: (nameId: string) => void;
}

interface CollectionCardProps {
  species: Card;
  isOwned: boolean;
  quantity?: number;
  acquiredVia?: string;
  onClick: () => void;
  showBasicInfo?: boolean; // Show basic info even if not owned
  propertyFilter?: CardPropertyFilter; // Which properties to show
  deckControls?: DeckControlsConfig; // Deck building controls
}

export const CollectionCard: React.FC<CollectionCardProps> = ({
  species,
  isOwned,
  quantity = 0,
  acquiredVia,
  onClick,
  showBasicInfo = false,
  propertyFilter = { habitat: true, role: true, conservationStatus: true, acquisitionType: true },
  deckControls
}) => {
  const localization = useLocalization();
  // Get localized card data using enum-based localization system
  const localizedCard = {
    displayName: localization.getCardName(species.nameId as any),
    displayScientificName: localization.getScientificName(species.scientificNameId as any),
    nameId: species.nameId,
    scientificNameId: species.scientificNameId,
    descriptionId: species.descriptionId
  };
  const isStarter = starterPackService.isStarterCard(species.cardId);
  const educationalInfo = starterPackService.getEducationalInfo(species.cardId);

  const getRarityColor = (conservationStatus: ConservationStatus): string => {
    switch (conservationStatus) {
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

  const getAcquisitionBadgeColor = (method?: string): string => {
    switch (method) {
      case 'starter': return 'success';
      case 'pack': return 'primary';
      case 'redeem': return 'secondary';
      case 'reward': return 'tertiary';
      default: return 'medium';
    }
  };

  return (
    <IonCard 
      className={`collection-card ${isOwned ? 'owned' : 'unowned'} ${isStarter ? 'starter' : ''}`}
      onClick={onClick}
      button={isOwned}
    >
      {/* Card Image */}
      <div className="card-image-container">
        {/* Use OrganismRenderer for emoji display */}
        <div className={`organism-display ${!isOwned ? 'greyed-out' : ''}`}>
          <OrganismRenderer
            card={species}
            size={80}
            showControls={false}
            className="collection-card-organism"
          />
        </div>
        
        {/* Ownership Status Overlay */}
        {!isOwned && (
          <div className="ownership-overlay">
            <IonIcon icon={lockClosed} size="large" />
          </div>
        )}

        {/* Quantity Badge */}
        {isOwned && quantity > 1 && (
          <IonBadge className="quantity-badge" color="primary">
            {quantity}
          </IonBadge>
        )}

        {/* Remove Starter Badge - no need to label starter cards */}
      </div>

      <IonCardHeader className="pb-0">
        <IonCardTitle className={!isOwned ? 'greyed-text' : ''}>
          {localizedCard.displayName}
        </IonCardTitle>

        {/* Show basic info for all cards, detailed info only for owned */}
        {(isOwned || showBasicInfo) && (
          <div className="card-subtitle">
            <IonText color="medium" className={!isOwned ? 'greyed-text' : ''}>
              <em>{localizedCard.displayScientificName}</em>
            </IonText>
          </div>
        )}
      </IonCardHeader>

      <IonCardContent>
        {/* Unified Card Properties - shown for both owned and unowned cards */}
        {(isOwned || showBasicInfo) && (
          <div className="card-details">
            {/* Habitat */}
            {propertyFilter.habitat && (
              <div className="property-item">
                <IonText color="medium" className={!isOwned ? 'greyed-text' : ''}>
                  Habitat: {species.habitat}
                </IonText>
              </div>
            )}

            {/* Trophic Role */}
            {propertyFilter.role && (
              <div className="property-item">
                <IonText color="medium" className={!isOwned ? 'greyed-text' : ''}>
                  Role: {species.trophicRole}
                </IonText>
              </div>
            )}

            {/* Conservation Status */}
            {propertyFilter.conservationStatus && (
              <IonBadge
                color={getRarityColor(species.conservationStatus)}
                className="conservation-badge"
              >
                {species.conservationStatus}
              </IonBadge>
            )}

            {/* Acquisition Method - show for both owned and unowned cards */}
            {propertyFilter.acquisitionType && (
              <IonBadge
                color={isOwned && acquiredVia ? getAcquisitionBadgeColor(acquiredVia) : 'medium'}
                className="acquisition-badge"
              >
                {isOwned && acquiredVia ? acquiredVia : 'Locked'}
              </IonBadge>
            )}

            {/* Educational Info for Starter Cards */}
            {isStarter && educationalInfo && (
              <div className="educational-info">
                <IonText color="primary">
                  <small>{educationalInfo}</small>
                </IonText>
              </div>
            )}
          </div>
        )}

        {/* Completely Hidden for Unowned (if showBasicInfo is false) */}
        {!isOwned && !showBasicInfo && (
          <div className="hidden-info">
            <IonText color="medium" className="greyed-text">
              <small>Collect to reveal details</small>
            </IonText>
          </div>
        )}

        {/* Deck Building Controls */}
        {deckControls?.enabled && isOwned && (
          <div className="deck-controls-compact">
            <IonButton
              size="small"
              fill="clear"
              onClick={() => deckControls.onRemove(species.nameId)}
              disabled={deckControls.currentQuantity === 0}
              className="deck-control-btn remove-btn"
            >
              <IonIcon icon={remove} />
            </IonButton>

            <span className="deck-count">
              {deckControls.currentQuantity}
            </span>

            <IonButton
              size="small"
              fill="clear"
              onClick={() => deckControls.onAdd(species.nameId)}
              disabled={
                (deckControls.currentQuantity === 0 &&
                 deckControls.currentTotalCards !== undefined &&
                 deckControls.maxTotalCards !== undefined &&
                 deckControls.currentTotalCards >= deckControls.maxTotalCards) ||
                (deckControls.maxQuantity !== undefined &&
                 deckControls.currentQuantity >= deckControls.maxQuantity)
              }
              className="deck-control-btn add-btn"
            >
              <IonIcon icon={add} />
            </IonButton>
          </div>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default CollectionCard;
