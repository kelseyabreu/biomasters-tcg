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
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonBadge,
  IonAlert
} from '@ionic/react';
import { flash, shield, heart, arrowBack } from 'ionicons/icons';
import { useHybridGameStore } from '../../state/hybridGameStore';

interface BattleCard {
  speciesName: string;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
}

const BattleScreen: React.FC = () => {
  const { offlineCollection } = useHybridGameStore();
  
  const [playerCards, setPlayerCards] = useState<BattleCard[]>([]);
  const [aiCards, setAiCards] = useState<BattleCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<BattleCard | null>(null);
  const [targetCard, setTargetCard] = useState<BattleCard | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [gamePhase, setGamePhase] = useState<'setup' | 'battle' | 'victory' | 'defeat'>('setup');
  const [showAlert, setShowAlert] = useState(false);

  // Initialize battle
  const startBattle = () => {
    if (!offlineCollection) return;

    // Create player deck from collection (first 8 species)
    const ownedSpecies = Object.keys(offlineCollection.species_owned).slice(0, 8);
    const playerDeck: BattleCard[] = ownedSpecies.map(species => ({
      speciesName: species,
      health: 100,
      maxHealth: 100,
      attack: Math.floor(Math.random() * 30) + 20,
      defense: Math.floor(Math.random() * 20) + 10
    }));

    // Create AI deck (simple random stats)
    const aiSpecies = ['Wolf', 'Bear', 'Eagle', 'Shark', 'Lion', 'Tiger', 'Elephant', 'Rhino'];
    const aiDeck: BattleCard[] = aiSpecies.map(species => ({
      speciesName: species,
      health: 100,
      maxHealth: 100,
      attack: Math.floor(Math.random() * 30) + 20,
      defense: Math.floor(Math.random() * 20) + 10
    }));

    setPlayerCards(playerDeck);
    setAiCards(aiDeck);
    setGamePhase('battle');
    setBattleLog(['Battle started! Select your card and target an enemy.']);
  };

  // Attack function
  const attack = () => {
    if (!selectedCard || !targetCard) return;

    const damage = Math.max(1, selectedCard.attack - targetCard.defense + Math.floor(Math.random() * 10) - 5);
    
    // Apply damage
    setAiCards(prev => prev.map(card => 
      card.speciesName === targetCard.speciesName 
        ? { ...card, health: Math.max(0, card.health - damage) }
        : card
    ));

    setBattleLog(prev => [...prev, `${selectedCard.speciesName} attacks ${targetCard.speciesName} for ${damage} damage!`]);

    // AI counter-attack
    setTimeout(() => {
      const aliveAiCards = aiCards.filter(card => card.health > 0);
      const alivePlayerCards = playerCards.filter(card => card.health > 0);
      
      if (aliveAiCards.length > 0 && alivePlayerCards.length > 0) {
        const aiAttacker = aliveAiCards[Math.floor(Math.random() * aliveAiCards.length)];
        const playerTarget = alivePlayerCards[Math.floor(Math.random() * alivePlayerCards.length)];
        
        const aiDamage = Math.max(1, aiAttacker.attack - playerTarget.defense + Math.floor(Math.random() * 10) - 5);
        
        setPlayerCards(prev => prev.map(card => 
          card.speciesName === playerTarget.speciesName 
            ? { ...card, health: Math.max(0, card.health - aiDamage) }
            : card
        ));

        setBattleLog(prev => [...prev, `${aiAttacker.speciesName} attacks ${playerTarget.speciesName} for ${aiDamage} damage!`]);
      }
    }, 1000);

    setSelectedCard(null);
    setTargetCard(null);

    // Check win conditions
    setTimeout(() => {
      const aliveAi = aiCards.filter(card => card.health > 0).length;
      const alivePlayer = playerCards.filter(card => card.health > 0).length;
      
      if (aliveAi === 0) {
        setGamePhase('victory');
        setBattleLog(prev => [...prev, '🎉 Victory! You defeated all enemy species!']);
      } else if (alivePlayer === 0) {
        setGamePhase('defeat');
        setBattleLog(prev => [...prev, '💀 Defeat! All your species were defeated.']);
      }
    }, 1500);
  };

  if (gamePhase === 'setup') {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Battle Arena</IonTitle>
          </IonToolbar>
        </IonHeader>
        
        <IonContent className="ion-padding">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Prepare for Battle</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>You need at least 8 species in your collection to battle.</p>
              
              {offlineCollection && Object.keys(offlineCollection.species_owned).length >= 8 ? (
                <>
                  <p>✅ You have {Object.keys(offlineCollection.species_owned).length} species ready!</p>
                  <IonButton expand="block" onClick={startBattle} color="primary">
                    <IonIcon icon={flash} slot="start" />
                    Start Battle
                  </IonButton>
                </>
              ) : (
                <>
                  <p>❌ You need more species. Go collect some cards first!</p>
                  <IonButton expand="block" routerLink="/collection" fill="outline">
                    View Collection
                  </IonButton>
                </>
              )}
            </IonCardContent>
          </IonCard>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Battle in Progress</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding">
        {/* Battle Controls */}
        <IonCard>
          <IonCardContent>
            <IonButton 
              expand="block" 
              onClick={attack}
              disabled={!selectedCard || !targetCard || gamePhase !== 'battle'}
              color="danger"
            >
              <IonIcon icon={flash} slot="start" />
              Attack!
            </IonButton>
            
            {gamePhase !== 'battle' && (
              <IonButton expand="block" routerLink="/" fill="outline" style={{ marginTop: '10px' }}>
                <IonIcon icon={arrowBack} slot="start" />
                Return to Menu
              </IonButton>
            )}
          </IonCardContent>
        </IonCard>

        {/* Enemy Cards */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Enemy Species</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonGrid>
              <IonRow>
                {aiCards.map((card, index) => (
                  <IonCol size="6" sizeMd="3" key={index}>
                    <IonCard 
                      button={card.health > 0 && selectedCard !== null}
                      onClick={() => card.health > 0 && selectedCard && setTargetCard(card)}
                      color={targetCard?.speciesName === card.speciesName ? 'danger' : undefined}
                    >
                      <IonCardContent>
                        <h4>{card.speciesName}</h4>
                        <IonBadge color={card.health > 0 ? 'success' : 'dark'}>
                          <IonIcon icon={heart} style={{ marginRight: '4px' }} />
                          {card.health}/{card.maxHealth}
                        </IonBadge>
                        <p>ATK: {card.attack} | DEF: {card.defense}</p>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                ))}
              </IonRow>
            </IonGrid>
          </IonCardContent>
        </IonCard>

        {/* Player Cards */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Your Species</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonGrid>
              <IonRow>
                {playerCards.map((card, index) => (
                  <IonCol size="6" sizeMd="3" key={index}>
                    <IonCard 
                      button={card.health > 0}
                      onClick={() => card.health > 0 && setSelectedCard(card)}
                      color={selectedCard?.speciesName === card.speciesName ? 'primary' : undefined}
                    >
                      <IonCardContent>
                        <h4>{card.speciesName}</h4>
                        <IonBadge color={card.health > 0 ? 'success' : 'dark'}>
                          <IonIcon icon={heart} style={{ marginRight: '4px' }} />
                          {card.health}/{card.maxHealth}
                        </IonBadge>
                        <p>ATK: {card.attack} | DEF: {card.defense}</p>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                ))}
              </IonRow>
            </IonGrid>
          </IonCardContent>
        </IonCard>

        {/* Battle Log */}
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Battle Log</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {battleLog.slice(-5).map((log, index) => (
              <p key={index}>{log}</p>
            ))}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default BattleScreen;
