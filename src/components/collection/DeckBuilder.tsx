import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonBadge,
  IonToast
} from '@ionic/react';
import { add, remove, save, trash, options } from 'ionicons/icons';
import { useHybridGameStore } from '../../state/hybridGameStore';
import CollectionCard, { DeckControlsConfig, CardPropertyFilter } from './CollectionCard';
import PropertyFilterModal from './PropertyFilterModal';
import OrganismRenderer from '../OrganismRenderer';
import './DeckBuilder.css';

interface DeckCard {
  speciesName: string;
  quantity: number;
}

interface Deck {
  id: string;
  name: string;
  cards: DeckCard[];
  isValid: boolean;
}

const DeckBuilder: React.FC = () => {
  const { offlineCollection, allSpeciesCards } = useHybridGameStore();
  
  const [currentDeck, setCurrentDeck] = useState<Deck>({
    id: '',
    name: '',
    cards: [],
    isValid: false
  });
  
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Property filter state
  const [propertyFilter, setPropertyFilter] = useState<CardPropertyFilter>({
    habitat: true,
    role: true,
    conservationStatus: true,
    acquisitionType: true
  });
  const [showPropertyModal, setShowPropertyModal] = useState(false);



  // Get owned species from collection
  const ownedSpecies = offlineCollection ? Object.keys(offlineCollection.species_owned) : [];
  
  // Add card to deck
  const addCardToDeck = (speciesName: string) => {
    const existingCard = currentDeck.cards.find(card => card.speciesName === speciesName);
    
    if (existingCard) {
      // Increase quantity (max 3 per species)
      if (existingCard.quantity < 3) {
        setCurrentDeck(prev => ({
          ...prev,
          cards: prev.cards.map(card =>
            card.speciesName === speciesName
              ? { ...card, quantity: card.quantity + 1 }
              : card
          )
        }));
      }
    } else {
      // Add new card
      setCurrentDeck(prev => ({
        ...prev,
        cards: [...prev.cards, { speciesName, quantity: 1 }]
      }));
    }
  };

  // Remove card from deck
  const removeCardFromDeck = (speciesName: string) => {
    setCurrentDeck(prev => ({
      ...prev,
      cards: prev.cards.reduce((acc: DeckCard[], card) => {
        if (card.speciesName === speciesName) {
          if (card.quantity > 1) {
            acc.push({ ...card, quantity: card.quantity - 1 });
          }
          // If quantity is 1, don't add it back (removes it)
        } else {
          acc.push(card);
        }
        return acc;
      }, [])
    }));
  };

  // Calculate deck stats
  const totalCards = currentDeck.cards.reduce((sum, card) => sum + card.quantity, 0);
  const hasValidCardCount = totalCards >= 8 && totalCards <= 12;
  const hasValidName = currentDeck.name.trim() !== '';
  const isValidDeck = hasValidCardCount && hasValidName;

  // Save deck (simplified - would integrate with hybrid store)
  const saveDeck = () => {
    if (!isValidDeck) {
      let message = 'Deck needs: ';
      const missing = [];
      if (!hasValidCardCount) {
        missing.push(`8-12 cards (currently ${totalCards})`);
      }
      if (!hasValidName) {
        missing.push('a name');
      }
      message += missing.join(' and ');
      setToastMessage(message);
      setShowToast(true);
      return;
    }

    // TODO: Integrate with hybrid store to save deck
    setToastMessage(`Deck "${currentDeck.name}" saved!`);
    setShowToast(true);
    
    // Reset deck
    setCurrentDeck({
      id: '',
      name: '',
      cards: [],
      isValid: false
    });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Deck Builder</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding">
        {/* Deck Info */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Current Deck</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonInput
              placeholder="Deck Name"
              value={currentDeck.name}
              onIonInput={(e) => setCurrentDeck(prev => ({ ...prev, name: e.detail.value! }))}
            />
            
            <div style={{ marginTop: '10px' }}>
              <IonBadge color={hasValidCardCount ? 'success' : 'warning'}>
                {totalCards < 8 ? `${totalCards}/8` : `${totalCards}/${totalCards}`} (Max 12)
              </IonBadge>
              {!hasValidName && (
                <IonBadge color="warning" style={{ marginLeft: '8px' }}>
                  Name required
                </IonBadge>
              )}
              {isValidDeck && (
                <IonBadge color="success" style={{ marginLeft: '8px' }}>
                  Ready to save!
                </IonBadge>
              )}
            </div>

            <IonButton
              expand="block"
              onClick={saveDeck}
              disabled={!isValidDeck}
              color="primary"
              fill="solid"
              style={{ marginTop: '10px' }}
            >
              <IonIcon icon={save} slot="start" />
              Save Deck
            </IonButton>
          </IonCardContent>
        </IonCard>

        {/* Current Deck Cards */}
        {currentDeck.cards.length > 0 && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Deck Cards ({totalCards})</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                {currentDeck.cards.map((card) => {
                  const species = allSpeciesCards.find(s => s.speciesName === card.speciesName);
                  return (
                    <IonItem key={card.speciesName}>
                      <div slot="start" style={{ width: '32px', height: '32px', marginRight: '8px' }}>
                        {species && (
                          <OrganismRenderer
                            card={species}
                            size={32}
                            showControls={false}
                            className="deck-card-organism"
                          />
                        )}
                      </div>
                      <IonLabel>
                        <h3>{card.speciesName}</h3>
                        <p>Quantity: {card.quantity}</p>
                      </IonLabel>
                    <IonButton
                      fill="clear"
                      onClick={() => addCardToDeck(card.speciesName)}
                      disabled={card.quantity >= 3}
                    >
                      <IonIcon icon={add} />
                    </IonButton>
                    <IonButton
                      fill="clear"
                      onClick={() => removeCardFromDeck(card.speciesName)}
                    >
                      <IonIcon icon={remove} />
                    </IonButton>
                  </IonItem>
                  );
                })}
              </IonList>
            </IonCardContent>
          </IonCard>
        )}

        {/* Available Species */}
        <IonCard>
          <IonCardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <IonCardTitle>Your Collection</IonCardTitle>
              <IonButton
                fill="outline"
                size="small"
                onClick={() => setShowPropertyModal(true)}
              >
                <IonIcon icon={options} slot="start" />
                Properties
              </IonButton>
            </div>
          </IonCardHeader>
          <IonCardContent className="plr-0">
            {ownedSpecies.length === 0 ? (
              <p>No species in collection. Open some packs first!</p>
            ) : (
              <IonGrid>
                <IonRow>
                  {ownedSpecies.map((speciesName) => {
                    const inDeck = currentDeck.cards.find(card => card.speciesName === speciesName);
                    const collectionData = offlineCollection?.species_owned[speciesName];
                    const quantity = collectionData?.quantity || 0;
                    const acquiredVia = collectionData?.acquired_via || 'pack';
                    const species = allSpeciesCards.find(card => card.speciesName === speciesName);

                    if (!species) return null;

                    return (
                      <IonCol size="6" sizeMd="4" key={speciesName}>
                        <div className="deck-builder-card">
                          <CollectionCard
                            species={species}
                            isOwned={true}
                            quantity={quantity}
                            acquiredVia={acquiredVia}
                            onClick={() => {}} // No click action needed for deck builder
                            showBasicInfo={true}
                            propertyFilter={propertyFilter}
                            deckControls={{
                              enabled: true,
                              currentQuantity: inDeck?.quantity || 0,
                              maxQuantity: 3,
                              maxTotalCards: 12,
                              currentTotalCards: totalCards,
                              onAdd: addCardToDeck,
                              onRemove: removeCardFromDeck
                            }}
                          />
                        </div>
                      </IonCol>
                    );
                  })}
                </IonRow>
              </IonGrid>
            )}
          </IonCardContent>
        </IonCard>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          position="bottom"
        />

        {/* Property Filter Modal */}
        <PropertyFilterModal
          isOpen={showPropertyModal}
          onClose={() => setShowPropertyModal(false)}
          propertyFilter={propertyFilter}
          onPropertyFilterChange={setPropertyFilter}
        />
      </IonContent>
    </IonPage>
  );
};

export default DeckBuilder;
