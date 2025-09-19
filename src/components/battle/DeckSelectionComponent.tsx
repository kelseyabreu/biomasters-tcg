import React, { useState, useEffect } from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonRadio,
  IonRadioGroup,
  IonSpinner,
  IonIcon,
  IonBadge
} from '@ionic/react';
import { checkmarkCircle, library, time } from 'ionicons/icons';
import apiClient from '../../services/apiClient';

interface UserDeck {
  id: string;
  name: string;
  cardCount: number;
  isValid: boolean;
  source: string;
}

interface DeckSelectionComponentProps {
  sessionId: string;
  onDeckSelected?: () => Promise<void>;
  isOnlineMode?: boolean;
}

const DeckSelectionComponent: React.FC<DeckSelectionComponentProps> = ({
  sessionId,
  onDeckSelected,
  isOnlineMode = false
}) => {
  const [availableDecks, setAvailableDecks] = useState<UserDeck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  // Load available decks
  useEffect(() => {
    const loadDecks = async () => {
      if (!isOnlineMode) return;

      try {
        setIsLoading(true);
        setError('');

        console.log(`🎴 [DeckSelection] Loading decks for session: ${sessionId}`);
        const response = await apiClient.get(`/api/matches/${sessionId}/decks`);
        console.log(`🎴 [DeckSelection] Deck response:`, response.data);

        if (response.data.success && response.data.data?.decks) {
          const decks = response.data.data.decks;
          console.log(`🎴 [DeckSelection] Available decks:`, decks);
          console.log(`🎴 [DeckSelection] Deck count: ${decks.length}`);

          // Convert the new API format to the expected format
          const formattedDecks = decks.map((deck: any) => ({
            id: deck.id,
            name: deck.name,
            cardCount: deck.cardCount || deck.card_count,
            isValid: deck.isValid !== undefined ? deck.isValid : true, // Use API isValid or default to true
            source: deck.source || 'template'
          }));

          // Check for duplicates
          const deckIds = formattedDecks.map((d: any) => d.id);
          const uniqueIds = new Set(deckIds);
          if (deckIds.length !== uniqueIds.size) {
            console.warn(`🎴 [DeckSelection] Duplicate deck IDs detected:`, deckIds);
            console.warn(`🎴 [DeckSelection] Raw decks:`, formattedDecks);
          }

          setAvailableDecks(formattedDecks);

          // Auto-select first valid deck
          const firstValidDeck = formattedDecks[0];
          console.log(`🎴 [DeckSelection] First valid deck:`, firstValidDeck);
          if (firstValidDeck) {
            setSelectedDeckId(firstValidDeck.id);
          }
        } else {
          console.error(`🎴 [DeckSelection] Failed to load decks:`, response.data);
          throw new Error(response.data.error || 'Failed to load decks');
        }

      } catch (err) {
        console.error('❌ [DeckSelection] Error loading decks:', err);
        console.error('❌ [DeckSelection] Error details:', (err as any).response?.data);
        setError(err instanceof Error ? err.message : 'Failed to load decks');
      } finally {
        setIsLoading(false);
      }
    };

    loadDecks();
  }, [sessionId, isOnlineMode]);

  const handleDeckSelection = async () => {
    if (!selectedDeckId) {
      setError('Please select a deck');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const response = await apiClient.post(`/api/matches/${sessionId}/select-deck`, {
        deckId: selectedDeckId
      });

      if (response.data.success) {
        console.log('✅ Deck selected successfully:', response.data.data);

        // Call the callback to notify parent component
        if (onDeckSelected) {
          await onDeckSelected();
        }
      } else {
        throw new Error(response.data.error || 'Failed to select deck');
      }

    } catch (err) {
      console.error('❌ Error selecting deck:', err);
      setError(err instanceof Error ? err.message : 'Failed to select deck');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOnlineMode) {
    return (
      <div style={{ textAlign: 'center', padding: '16px' }}>
        <p>Deck selection is only available in online matches.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '32px' }}>
        <IonSpinner name="crescent" />
        <p style={{ marginTop: '16px' }}>Loading your decks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '16px' }}>
        <p style={{ color: 'var(--ion-color-danger)' }}>❌ {error}</p>
        <IonButton 
          fill="outline" 
          onClick={() => window.location.reload()}
          style={{ marginTop: '16px' }}
        >
          Retry
        </IonButton>
      </div>
    );
  }

  if (availableDecks.length === 0) {
    console.log(`🎴 [DeckSelection] Showing "No Valid Decks Found" - availableDecks.length: ${availableDecks.length}`);
    console.log(`🎴 [DeckSelection] Current state:`, { isLoading, error, sessionId, isOnlineMode });

    return (
      <div style={{ textAlign: 'center', padding: '16px' }}>
        <IonIcon icon={library} size="large" color="medium" />
        <h3>No Valid Decks Found</h3>
        <p>You need at least one deck with 20+ cards to play online matches.</p>
        <p style={{ fontSize: '0.9em', color: 'var(--ion-color-medium)' }}>
          If you're a new player, starter decks should be automatically provided.
        </p>
        <IonButton 
          routerLink="/collection" 
          fill="outline"
          style={{ marginTop: '16px' }}
        >
          Build a Deck
        </IonButton>
      </div>
    );
  }

  return (
    <div>
      <h4>Available Decks:</h4>
      <p style={{ fontStyle: 'italic', marginBottom: '16px' }}>
        Select a deck for this match. If no deck is selected, your first valid deck will be chosen automatically.
      </p>
      
      <IonRadioGroup 
        value={selectedDeckId} 
        onIonChange={e => setSelectedDeckId(e.detail.value)}
      >
        {availableDecks.map((deck, index) => {
          const isSelected = selectedDeckId === deck.id;
          return (
            <IonCard
              key={`${deck.source}-${deck.id}-${index}`}
              style={{
                margin: '8px 0',
                border: isSelected ? '2px solid var(--ion-color-primary)' : '1px solid var(--ion-color-light)',
                background: isSelected ? 'var(--ion-color-primary-tint)' : undefined,
                transform: isSelected ? 'scale(1.02)' : undefined,
                transition: 'all 0.2s ease'
              }}
            >
              <IonItem>
                <IonRadio
                  slot="start"
                  value={deck.id}
                  disabled={!deck.isValid}
                />
                <IonLabel>
                  <h3 style={{
                    color: isSelected ? 'var(--ion-color-primary)' : undefined,
                    fontWeight: isSelected ? 'bold' : undefined
                  }}>
                    {deck.name}
                    {isSelected && (
                      <IonIcon
                        icon={checkmarkCircle}
                        color="primary"
                        style={{ marginLeft: '8px' }}
                      />
                    )}
                  </h3>
                  <p>
                    <IonIcon icon={library} style={{ marginRight: '4px' }} />
                    {deck.cardCount} cards
                    {!deck.isValid && (
                      <IonBadge color="danger" style={{ marginLeft: '8px' }}>
                        Invalid
                      </IonBadge>
                    )}
                  </p>
                  <p style={{ fontSize: '0.8em', color: 'var(--ion-color-medium)' }}>
                    <IonIcon icon={time} style={{ marginRight: '4px' }} />
                    Source: {deck.source === 'personal' ? 'Personal Deck' : 'Starter Deck'}
                  </p>
                </IonLabel>
              </IonItem>
            </IonCard>
          );
        })}
      </IonRadioGroup>

      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <IonButton 
          color="primary" 
          onClick={handleDeckSelection}
          disabled={!selectedDeckId || isSubmitting}
          expand="block"
        >
          {isSubmitting ? (
            <>
              <IonSpinner name="crescent" style={{ marginRight: '8px' }} />
              Selecting Deck...
            </>
          ) : (
            <>
              <IonIcon icon={checkmarkCircle} slot="start" />
              Choose Deck
            </>
          )}
        </IonButton>
        
        {selectedDeckId && (
          <p style={{ 
            marginTop: '8px', 
            fontSize: '0.9em', 
            color: 'var(--ion-color-medium)' 
          }}>
            Selected: {availableDecks.find(d => d.id === selectedDeckId)?.name}
          </p>
        )}
      </div>
    </div>
  );
};

export default DeckSelectionComponent;
