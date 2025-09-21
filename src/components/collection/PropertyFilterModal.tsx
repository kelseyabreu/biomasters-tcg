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
import { useUILocalization } from '../../hooks/useCardLocalization';
import { UITextId } from '@kelseyabreu/shared';

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
  const { getUIText } = useUILocalization();

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
          <IonTitle>{getUIText(UITextId.UI_CARD_PROPERTIES)}</IonTitle>
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
            <IonLabel className="ion-margin-start">{getUIText(UITextId.UI_HABITAT)}</IonLabel>
          </IonItem>
          <IonItem>
            <IonCheckbox
              checked={propertyFilter.role}
              onIonChange={(e) => handlePropertyChange('role', e.detail.checked)}
            />
            <IonLabel className="ion-margin-start">{getUIText(UITextId.UI_TROPHIC_ROLE)}</IonLabel>
          </IonItem>
          <IonItem>
            <IonCheckbox
              checked={propertyFilter.conservationStatus}
              onIonChange={(e) => handlePropertyChange('conservationStatus', e.detail.checked)}
            />
            <IonLabel className="ion-margin-start">{getUIText(UITextId.UI_CONSERVATION_STATUS)}</IonLabel>
          </IonItem>
          <IonItem>
            <IonCheckbox
              checked={propertyFilter.acquisitionType}
              onIonChange={(e) => handlePropertyChange('acquisitionType', e.detail.checked)}
            />
            <IonLabel className="ion-margin-start">{getUIText(UITextId.UI_ACQUISITION_TYPE)}</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonModal>
  );
};

export default PropertyFilterModal;
