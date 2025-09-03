import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  IonToast,
  IonPopover,
  IonFab,
  IonFabButton
} from '@ionic/react';
import {
  add,
  remove,
  save,
  ellipsisVertical,
  arrowBack,
  search,
  close,
  duplicate,
  trash
} from 'ionicons/icons';
import { useHybridGameStore } from '../../state/hybridGameStore';
import CollectionCard, { CardPropertyFilter } from './CollectionCard';
import PropertyFilterModal from './PropertyFilterModal';
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
  const {
    offlineCollection,
    allSpeciesCards,
    createDeck,
    updateDeck,
    deleteDeck,
    setActiveDeck,
    loadDeck
  } = useHybridGameStore();
  
  const [currentDeck, setCurrentDeck] = useState<Deck>({
    id: '',
    name: '',
    cards: [],
    isValid: false
  });
  
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);

  // Property filter state
  const [propertyFilter, setPropertyFilter] = useState<CardPropertyFilter>({
    habitat: true,
    role: true,
    conservationStatus: true,
    acquisitionType: true
  });
  const [showPropertyModal, setShowPropertyModal] = useState(false);

  // New Deck Builder state
  const [currentView, setCurrentView] = useState<'list' | 'editor'>('list');
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 3>(2); // 1x, 2x, 3x rows
  const [selectedCardInDeck, setSelectedCardInDeck] = useState<string | null>(null);
  const collectionGridRef = useRef<HTMLIonGridElement>(null);

  // Auto-scroll to selected card in collection
  useEffect(() => {
    if (selectedCardInDeck && collectionGridRef.current) {
      const speciesName = selectedCardInDeck.split('-')[0];
      const cardElement = collectionGridRef.current.querySelector(`[data-species="${speciesName}"]`);
      if (cardElement) {
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedCardInDeck]);
  const [showOptionsPopover, setShowOptionsPopover] = useState(false);

  // Memoized owned species calculation
  const ownedSpecies = useMemo(() => {
    console.log('🧮 Calculating owned species (memoized)');
    return offlineCollection ? Object.keys(offlineCollection.species_owned) : [];
  }, [offlineCollection?.species_owned]);

  // Memoized filtered collection cards with ownership data
  const filteredCollectionCards = useMemo(() => {
    console.log('🧮 Filtering collection cards (memoized)');

    return allSpeciesCards
      .filter(card => ownedSpecies.includes(card.speciesName))
      .map((card) => {
        const ownershipData = offlineCollection?.species_owned[card.speciesName];
        const ownedCount = typeof ownershipData === 'object' ? ownershipData.quantity : (ownershipData || 0);
        const inDeckCount = currentDeck.cards.find(c => c.speciesName === card.speciesName)?.quantity || 0;

        return {
          card,
          ownershipData,
          ownedCount,
          inDeckCount
        };
      });
  }, [allSpeciesCards, ownedSpecies, offlineCollection?.species_owned, currentDeck.cards]);

  // Memoized card selection handler
  const handleAddCardToDeck = useCallback((speciesName: string) => {
    addCardToDeck(speciesName);
  }, []);

  // Get saved decks
  const savedDecks = offlineCollection?.savedDecks || [];
  const activeDeck = offlineCollection?.activeDeck;
  
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

  // Memoized deck stats calculation
  const deckStats = useMemo(() => {
    console.log('🧮 Calculating deck stats (memoized)');

    const totalCards = currentDeck.cards.reduce((sum, card) => sum + card.quantity, 0);
    const hasValidCardCount = totalCards >= 20 && totalCards <= 30;
    const hasValidName = currentDeck.name.trim() !== '';
    const isValidDeck = hasValidCardCount && hasValidName;

    return {
      totalCards,
      hasValidCardCount,
      hasValidName,
      isValidDeck
    };
  }, [currentDeck.cards, currentDeck.name]);

  const { totalCards, hasValidCardCount, hasValidName, isValidDeck } = deckStats;

  // Save deck using hybrid store
  const saveDeck = async () => {
    if (!isValidDeck) {
      let message = 'Deck needs: ';
      const missing = [];
      if (!hasValidCardCount) {
        missing.push(`20-30 cards (currently ${totalCards})`);
      }
      if (!hasValidName) {
        missing.push('a name');
      }
      message += missing.join(' and ');
      setToastMessage(message);
      setShowToast(true);
      return;
    }

    try {
      if (isEditing && editingDeckId) {
        // Update existing deck
        await updateDeck(editingDeckId, currentDeck.name, currentDeck.cards);
        console.log('✅ Deck updated:', editingDeckId);
        setToastMessage(`Deck "${currentDeck.name}" updated!`);
      } else {
        // Create new deck
        const deckId = await createDeck(currentDeck.name, currentDeck.cards);
        console.log('✅ Deck saved with ID:', deckId);
        setToastMessage(`Deck "${currentDeck.name}" saved and set as active!`);
      }

      setShowToast(true);

      // Reset deck
      setCurrentDeck({
        id: '',
        name: '',
        cards: [],
        isValid: false
      });
      setIsEditing(false);
      setEditingDeckId(null);
    } catch (error) {
      console.error('❌ Failed to save deck:', error);
      setToastMessage(error instanceof Error ? error.message : 'Failed to save deck. Please try again.');
      setShowToast(true);
    }
  };

  // Load deck for editing
  const handleLoadDeck = (deckId: string) => {
    const deck = loadDeck(deckId);
    if (deck) {
      setCurrentDeck({
        id: deck.id,
        name: deck.name,
        cards: deck.cards,
        isValid: true
      });
      setIsEditing(true);
      setEditingDeckId(deckId);
      setToastMessage(`Deck "${deck.name}" loaded for editing`);
      setShowToast(true);
    }
  };

  // Delete deck
  const handleDeleteDeck = async (deckId: string, deckName: string) => {
    if (confirm(`Are you sure you want to delete "${deckName}"? This cannot be undone.`)) {
      try {
        await deleteDeck(deckId);
        setToastMessage(`Deck "${deckName}" deleted`);
        setShowToast(true);

        // If we were editing this deck, reset the form
        if (editingDeckId === deckId) {
          setCurrentDeck({
            id: '',
            name: '',
            cards: [],
            isValid: false
          });
          setIsEditing(false);
          setEditingDeckId(null);
        }
      } catch (error) {
        console.error('❌ Failed to delete deck:', error);
        setToastMessage('Failed to delete deck. Please try again.');
        setShowToast(true);
      }
    }
  };

  // Set active deck
  const handleSetActiveDeck = (deckId: string, deckName: string) => {
    setActiveDeck(deckId);
    setToastMessage(`"${deckName}" set as active deck`);
    setShowToast(true);
  };

  // Start new deck
  const handleNewDeck = () => {
    setCurrentDeck({
      id: '',
      name: '',
      cards: [],
      isValid: false
    });
    setIsEditing(false);
    setEditingDeckId(null);
    setCurrentView('editor');
  };

  // New deck builder handlers
  const handleCreateNewDeck = () => {
    setCurrentDeck({
      id: '',
      name: 'New Deck',
      cards: [],
      isValid: false
    });
    setIsEditing(false);
    setEditingDeckId(null);
    setCurrentView('editor');
  };

  const handleEditDeck = (deckId: string) => {
    const deck = loadDeck(deckId);
    if (deck) {
      setCurrentDeck(deck);
      setIsEditing(true);
      setEditingDeckId(deckId);
      setCurrentView('editor');
    }
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedCardInDeck(null);
  };

  const handleZoomChange = (direction: 'in' | 'out') => {
    if (direction === 'in' && zoomLevel < 3) {
      setZoomLevel((prev) => (prev + 1) as 1 | 2 | 3);
    } else if (direction === 'out' && zoomLevel > 1) {
      setZoomLevel((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  const handleRemoveAllCards = () => {
    setCurrentDeck(prev => ({ ...prev, cards: [] }));
  };

  const handleDuplicateDeck = async () => {
    if (currentDeck.name) {
      const duplicatedDeck = {
        ...currentDeck,
        name: `${currentDeck.name} Copy`,
        id: ''
      };
      setCurrentDeck(duplicatedDeck);
      setIsEditing(false);
      setEditingDeckId(null);
    }
  };

  const handleSaveDeck = async () => {
    if (!currentDeck.name.trim()) {
      setToastMessage('Please enter a deck name');
      setShowToast(true);
      return;
    }

    const totalCards = currentDeck.cards.reduce((sum, card) => sum + card.quantity, 0);
    if (totalCards < 20) {
      setToastMessage(`Deck must have at least 20 cards (currently ${totalCards})`);
      setShowToast(true);
      return;
    }

    try {
      if (isEditing && editingDeckId) {
        await updateDeck(editingDeckId, currentDeck.name, currentDeck.cards);
        setToastMessage('Deck updated successfully!');
      } else {
        await createDeck(currentDeck.name, currentDeck.cards);
        setToastMessage('Deck saved successfully!');
      }
      setShowToast(true);
      setCurrentView('list');
    } catch (error) {
      setToastMessage('Failed to save deck');
      setShowToast(true);
    }
  };

  // Render deck list view
  const renderDeckListView = () => (
    <IonContent className="ion-padding">
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>
            Saved Decks ({savedDecks.length}/5)
            {activeDeck && (
              <IonBadge color="success" style={{ marginLeft: '8px', fontSize: '0.7rem' }}>
                Active: {activeDeck.name}
              </IonBadge>
            )}
          </IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          {savedDecks.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--ion-color-medium)', fontStyle: 'italic' }}>
              No saved decks yet. Create your first deck!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {savedDecks.map((deck) => (
                <IonCard
                  key={deck.id}
                  className={deck.id === activeDeck?.id ? 'deck-card-active' : 'deck-card'}
                  style={{
                    margin: 0,
                    border: deck.id === activeDeck?.id ? '2px solid var(--ion-color-medium-shade)' : '1px solid var(--ion-color-light-shade)',
                    background: deck.id === activeDeck?.id ? 'var(--ion-color-light-tint)' : 'white',
                    boxShadow: deck.id === activeDeck?.id ? '0 4px 16px rgba(var(--ion-color-medium-rgb), 0.2)' : 'var(--ion-card-box-shadow)'
                  }}
                >
                  <IonCardContent style={{
                    padding: '16px',
                    background: deck.id === activeDeck?.id ? 'var(--ion-color-light-tint)' : 'white'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: deck.id === activeDeck?.id ? '700' : 'bold',
                          fontSize: '1.1rem',
                          color: 'var(--ion-color-dark)',
                          marginBottom: '4px'
                        }}>
                          {deck.name}
                          {deck.id === activeDeck?.id && (
                            <IonBadge color="medium" style={{ marginLeft: '8px', fontSize: '0.7rem' }}>
                              ACTIVE
                            </IonBadge>
                          )}
                        </div>
                        <div style={{
                          fontSize: '0.9rem',
                          color: 'var(--ion-color-medium)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <IonBadge color="primary">
                            {deck.cards.reduce((sum, card) => sum + card.quantity, 0)} cards
                          </IonBadge>
                          <span>Created {new Date(deck.created).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <IonButton
                          size="small"
                          fill="outline"
                          color="primary"
                          onClick={() => handleEditDeck(deck.id)}
                          style={{ minWidth: '80px', width: '80px' }}
                        >
                          Edit
                        </IonButton>
                        {deck.id !== activeDeck?.id && (
                          <IonButton
                            size="small"
                            fill="outline"
                            color="success"
                            onClick={() => handleSetActiveDeck(deck.id, deck.name)}
                            style={{ minWidth: '80px', width: '80px' }}
                          >
                            Set Active
                          </IonButton>
                        )}
                        <IonButton
                          size="small"
                          fill="outline"
                          color="danger"
                          onClick={() => handleDeleteDeck(deck.id, deck.name)}
                          style={{ minWidth: '80px', width: '80px' }}
                        >
                          Delete
                        </IonButton>
                      </div>
                    </div>
                  </IonCardContent>
                </IonCard>
              ))}
            </div>
          )}

          {/* Create New Deck Button */}
          <IonButton
            expand="block"
            fill="outline"
            color="primary"
            onClick={handleCreateNewDeck}
            style={{ marginTop: '16px' }}
            disabled={savedDecks.length >= 5}
          >
            <IonIcon icon={add} slot="start" />
            Create New Deck {savedDecks.length >= 5 && '(Maximum Reached)'}
          </IonButton>
        </IonCardContent>
      </IonCard>
    </IonContent>
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{currentView === 'list' ? 'Deck Builder' : currentDeck.name || 'New Deck'}</IonTitle>
          {currentView === 'editor' && (
            <IonButton
              slot="start"
              fill="clear"
              onClick={handleBackToList}
            >
              <IonIcon icon={arrowBack} />
            </IonButton>
          )}
        </IonToolbar>
      </IonHeader>

      {currentView === 'list' ? renderDeckListView() : (
        <IonContent className="ion-padding">
          {/* Area 1: Top Controls */}
          <div className="deck-editor-header compact">
            {/* Row 1: Deck Name and Options */}
            <div className="deck-name-row">
              <IonInput
                value={currentDeck.name}
                onIonInput={(e) => setCurrentDeck(prev => ({ ...prev, name: e.detail.value! }))}
                placeholder="Enter deck name"
                className="deck-name-input"
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  flex: 1
                }}
              />
              <IonButton
                fill="clear"
                onClick={() => setShowOptionsPopover(true)}
                id="options-trigger"
              >
                <IonIcon icon={ellipsisVertical} />
              </IonButton>

              {/* Options Popover */}
              <IonPopover
                trigger="options-trigger"
                isOpen={showOptionsPopover}
                onDidDismiss={() => setShowOptionsPopover(false)}
              >
                <IonContent>
                  <IonList>
                    <IonItem button onClick={handleSaveDeck}>
                      <IonIcon icon={save} slot="start" />
                      <IonLabel>Save</IonLabel>
                    </IonItem>
                    <IonItem button onClick={handleDuplicateDeck}>
                      <IonIcon icon={duplicate} slot="start" />
                      <IonLabel>Duplicate</IonLabel>
                    </IonItem>
                    {isEditing && (
                      <IonItem button onClick={() => handleDeleteDeck(editingDeckId!, currentDeck.name)}>
                        <IonIcon icon={trash} slot="start" color="danger" />
                        <IonLabel color="danger">Delete</IonLabel>
                      </IonItem>
                    )}
                  </IonList>
                </IonContent>
              </IonPopover>
            </div>

            {/* Row 2: Remove All and Zoom Controls */}
            <div className="deck-controls-row">
              <IonButton
                fill="outline"
                color="danger"
                size="small"
                onClick={handleRemoveAllCards}
                disabled={currentDeck.cards.length === 0}
              >
                Remove All
              </IonButton>

              <div className="zoom-controls">
                <IonButton
                  fill="clear"
                  size="small"
                  onClick={() => handleZoomChange('out')}
                  disabled={zoomLevel === 1}
                >
                  <IonIcon icon={remove} />
                </IonButton>
                <span className="zoom-level">{zoomLevel}x</span>
                <IonButton
                  fill="clear"
                  size="small"
                  onClick={() => handleZoomChange('in')}
                  disabled={zoomLevel === 3}
                >
                  <IonIcon icon={add} />
                </IonButton>
              </div>
            </div>
          </div>

          {/* Area 2: Deck Cards Display */}
          <IonCard className="m-0 deck-cards-area compact">
            <IonCardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <IonCardTitle>
                  Deck Cards ({currentDeck.cards.reduce((sum, card) => sum + card.quantity, 0)})
                </IonCardTitle>
                <IonButton fill="clear" size="small">
                  <IonIcon icon={search} />
                </IonButton>
              </div>
            </IonCardHeader>
            <IonCardContent class='plr-0'>
              <div
                className={`deck-cards-grid zoom-${zoomLevel}x`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: '8px',
                  maxHeight: '300px',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  padding: '8px'
                }}
              >
                {currentDeck.cards.flatMap(card =>
                  Array.from({ length: card.quantity }, (_, index) => {
                    const species = allSpeciesCards.find(s => s.speciesName === card.speciesName);
                    return species ? (
                      <div
                        key={`${card.speciesName}-${index}`}
                        className={`deck-card-slot ${selectedCardInDeck === `${card.speciesName}-${index}` ? 'selected' : ''}`}
                        onClick={() => setSelectedCardInDeck(`${card.speciesName}-${index}`)}
                        style={{
                          position: 'relative',
                          cursor: 'pointer',
                          border: selectedCardInDeck === `${card.speciesName}-${index}` ? '2px solid var(--ion-color-primary)' : '1px solid var(--ion-color-light)',
                          borderRadius: '8px',
                          overflow: 'hidden'
                        }}
                      >
                        <CollectionCard
                          species={species}
                          isOwned={true}
                          quantity={1}
                          onClick={() => {}}
                          propertyFilter={propertyFilter}
                        />
                        {selectedCardInDeck === `${card.speciesName}-${index}` && (
                          <div style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: 'var(--ion-color-danger)',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCardFromDeck(card.speciesName);
                            setSelectedCardInDeck(null);
                          }}
                          >
                            <IonIcon icon={close} style={{ color: 'white', fontSize: '16px' }} />
                          </div>
                        )}
                      </div>
                    ) : null;
                  })
                )}
              </div>
            </IonCardContent>
          </IonCard>

          {/* Area 3: Collection View */}
          <IonCard className="collection-area">
            <IonCardContent className='plr-0'>
              <IonGrid className="plr-0" ref={collectionGridRef}>
                <IonRow>
                  {filteredCollectionCards.map(({ card, ownershipData, ownedCount, inDeckCount }) => {
                      const isSelected = selectedCardInDeck?.startsWith(card.speciesName);

                      return (
                        <IonCol key={card.speciesName} size="6" sizeMd="4" sizeLg="3">
                          <div
                            className={`collection-card-wrapper ${isSelected ? 'highlighted' : ''}`}
                            data-species={card.speciesName}
                            style={{
                              position: 'relative',
                              border: isSelected ? '2px solid var(--ion-color-primary)' : 'none',
                              borderRadius: '8px',
                              overflow: 'hidden'
                            }}
                          >
                            <CollectionCard
                              species={card}
                              isOwned={ownedCount > 0}
                              quantity={ownedCount}
                              acquiredVia={typeof ownershipData === 'object' ? ownershipData.acquired_via : 'pack'}
                              onClick={() => addCardToDeck(card.speciesName)}
                              propertyFilter={propertyFilter}
                              showBasicInfo={true}
                            />

                            {/* Owned count in bottom left */}
                            <div style={{
                              position: 'absolute',
                              bottom: '4px',
                              left: '4px',
                              background: 'rgba(0, 0, 0, 0.7)',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 'bold'
                            }}>
                              {ownedCount}
                            </div>

                            {/* In deck overlay */}
                            {inDeckCount > 0 && (
                              <div style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                background: 'var(--ion-color-primary)',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                {inDeckCount}
                                <IonIcon
                                  icon={close}
                                  style={{ fontSize: '14px', cursor: 'pointer' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeCardFromDeck(card.speciesName);
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </IonCol>
                      );
                    })}
                </IonRow>
              </IonGrid>
            </IonCardContent>
          </IonCard>

          {/* Save/Cancel Overlay */}
          <IonFab vertical="bottom" horizontal="end" slot="fixed">
            <IonFabButton color="success" onClick={handleSaveDeck}>
              Save
            </IonFabButton>
          </IonFab>

          <IonFab vertical="bottom" horizontal="start" slot="fixed">
            <IonFabButton color="medium" onClick={handleBackToList}>
              Cancel
            </IonFabButton>
          </IonFab>
        </IonContent>
      )}

      {/* Toast for notifications */}
      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={2000}
        position="bottom"
      />

      {/* Property Filter Modal */}
      <PropertyFilterModal
        isOpen={showPropertyModal}
        onClose={() => setShowPropertyModal(false)}
        propertyFilter={propertyFilter}
        onPropertyFilterChange={setPropertyFilter}
      />
    </IonPage>
  );
};

export default DeckBuilder;

