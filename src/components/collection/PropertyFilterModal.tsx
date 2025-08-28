/**
 * Shared Property Filter Modal Component
 * Used by both Collection and Deck Builder views
 */

import React from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonList,
  IonItem,
  IonCheckbox,
  IonLabel
} from '@ionic/react';
import { close } from 'ionicons/icons';
import { CardPropertyFilter } from './CollectionCard';

interface PropertyFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyFilter: CardPropertyFilter;
  onPropertyFilterChange: (filter: CardPropertyFilter) => void;
}

export const PropertyFilterModal: React.FC<PropertyFilterModalProps> = ({
  isOpen,
  onClose,
  propertyFilter,
  onPropertyFilterChange
}) => {
  const handlePropertyChange = (property: keyof CardPropertyFilter, checked: boolean) => {
    onPropertyFilterChange({
      ...propertyFilter,
      [property]: checked
    });
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Card Properties</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          <IonItem>
            <IonCheckbox
              checked={propertyFilter.habitat}
              onIonChange={(e) => handlePropertyChange('habitat', e.detail.checked)}
            />
            <IonLabel className="ion-margin-start">Habitat</IonLabel>
          </IonItem>
          <IonItem>
            <IonCheckbox
              checked={propertyFilter.role}
              onIonChange={(e) => handlePropertyChange('role', e.detail.checked)}
            />
            <IonLabel className="ion-margin-start">Trophic Role</IonLabel>
          </IonItem>
          <IonItem>
            <IonCheckbox
              checked={propertyFilter.conservationStatus}
              onIonChange={(e) => handlePropertyChange('conservationStatus', e.detail.checked)}
            />
            <IonLabel className="ion-margin-start">Conservation Status</IonLabel>
          </IonItem>
          <IonItem>
            <IonCheckbox
              checked={propertyFilter.acquisitionType}
              onIonChange={(e) => handlePropertyChange('acquisitionType', e.detail.checked)}
            />
            <IonLabel className="ion-margin-start">Acquisition Type</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonModal>
  );
};

export default PropertyFilterModal;
