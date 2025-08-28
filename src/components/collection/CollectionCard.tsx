/**
 * Collection Card Component
 * Displays individual species cards with ownership status
 */

import React from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonBadge, IonIcon, IonText } from '@ionic/react';
import { lockClosed, checkmarkCircle, star } from 'ionicons/icons';
import { Card } from '../../types';
import { starterPackService } from '../../services/starterPackService';
import OrganismRenderer from '../OrganismRenderer';
import './CollectionCard.css';

interface CollectionCardProps {
  species: Card;
  isOwned: boolean;
  quantity?: number;
  acquiredVia?: string;
  onClick: () => void;
  showBasicInfo?: boolean; // Show basic info even if not owned
}

export const CollectionCard: React.FC<CollectionCardProps> = ({
  species,
  isOwned,
  quantity = 0,
  acquiredVia,
  onClick,
  showBasicInfo = false
}) => {
  const isStarter = starterPackService.isStarterSpecies(species.speciesName);
  const educationalInfo = starterPackService.getEducationalInfo(species.speciesName);

  const getRarityColor = (conservationStatus: string): string => {
    switch (conservationStatus) {
      case 'Least Concern': return 'success';
      case 'Near Threatened': return 'warning';
      case 'Vulnerable': return 'warning';
      case 'Endangered': return 'danger';
      case 'Critically Endangered': return 'danger';
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

      <IonCardHeader>
        <IonCardTitle className={!isOwned ? 'greyed-text' : ''}>
          {species.commonName}
        </IonCardTitle>
        
        {/* Show basic info for all cards, detailed info only for owned */}
        {(isOwned || showBasicInfo) && (
          <div className="card-subtitle">
            <IonText color="medium" className={!isOwned ? 'greyed-text' : ''}>
              <em>{species.scientificName}</em>
            </IonText>
          </div>
        )}
      </IonCardHeader>

      <IonCardContent>
        {/* Owned Card Details */}
        {isOwned && (
          <div className="card-details">
            {/* Conservation Status */}
            <IonBadge 
              color={getRarityColor(species.conservationStatus)} 
              className="conservation-badge"
            >
              {species.conservationStatus}
            </IonBadge>

            {/* Acquisition Method */}
            {acquiredVia && (
              <IonBadge 
                color={getAcquisitionBadgeColor(acquiredVia)}
                className="acquisition-badge"
              >
                {acquiredVia}
              </IonBadge>
            )}

            {/* Trophic Role */}
            <div className="trophic-role">
              <IonText color="medium">
                {species.trophicRole}
              </IonText>
            </div>

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

        {/* Unowned Card Basic Info */}
        {!isOwned && showBasicInfo && (
          <div className="basic-info">
            <div className="habitat-info">
              <IonText color="medium" className="greyed-text">
                Habitat: {species.habitat}
              </IonText>
            </div>
            
            <div className="trophic-info">
              <IonText color="medium" className="greyed-text">
                Role: {species.trophicRole}
              </IonText>
            </div>


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
      </IonCardContent>
    </IonCard>
  );
};

export default CollectionCard;
