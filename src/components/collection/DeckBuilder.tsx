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
import { add, remove, save, trash } from 'ionicons/icons';
import { useHybridGameStore } from '../../state/hybridGameStore';

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
  const isValidDeck = totalCards >= 8 && totalCards <= 12 && currentDeck.name.trim() !== '';

  // Save deck (simplified - would integrate with hybrid store)
  const saveDeck = () => {
    if (!isValidDeck) {
      setToastMessage('Deck must have 8-12 cards and a name');
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
              <IonBadge color={isValidDeck ? 'success' : 'warning'}>
                {totalCards} cards
              </IonBadge>
              <span style={{ marginLeft: '10px' }}>
                {isValidDeck ? '✅ Valid' : '❌ Need 8-12 cards'}
              </span>
            </div>

            <IonButton
              expand="block"
              onClick={saveDeck}
              disabled={!isValidDeck}
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
                {currentDeck.cards.map((card) => (
                  <IonItem key={card.speciesName}>
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
                ))}
              </IonList>
            </IonCardContent>
          </IonCard>
        )}

        {/* Available Species */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Your Collection</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {ownedSpecies.length === 0 ? (
              <p>No species in collection. Open some packs first!</p>
            ) : (
              <IonGrid>
                <IonRow>
                  {ownedSpecies.map((speciesName) => {
                    const inDeck = currentDeck.cards.find(card => card.speciesName === speciesName);
                    const quantity = offlineCollection?.species_owned[speciesName]?.quantity || 0;
                    
                    return (
                      <IonCol size="6" sizeMd="4" key={speciesName}>
                        <IonCard>
                          <IonCardContent>
                            <h4>{speciesName}</h4>
                            <p>Owned: {quantity}</p>
                            <p>In Deck: {inDeck?.quantity || 0}</p>
                            <IonButton
                              size="small"
                              expand="block"
                              onClick={() => addCardToDeck(speciesName)}
                              disabled={!inDeck && totalCards >= 12}
                            >
                              Add to Deck
                            </IonButton>
                          </IonCardContent>
                        </IonCard>
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
      </IonContent>
    </IonPage>
  );
};

export default DeckBuilder;
