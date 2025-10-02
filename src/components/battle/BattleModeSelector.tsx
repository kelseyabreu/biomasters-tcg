/**
 * Battle Mode Selector
 * Allows switching between Phylo and TCG game modes
 */

import React, { useState } from 'react';
import './BattleModeSelector.css';
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
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/react';
import {
  arrowBack,
  school,
  trophy,
  flash,
  people,
  book,
  rocket,
  leaf,
  paw
} from 'ionicons/icons';

import BattleScreen from './BattleScreen'; // Phylo mode
import TCGBattleScreen from './TCGBattleScreen'; // TCG mode

export enum GameMode {
  PHYLO = 'phylo',
  TCG = 'tcg'
}

interface BattleModeSelectorProps {
  onExit?: () => void;
}

export const BattleModeSelector: React.FC<BattleModeSelectorProps> = ({ onExit }) => {
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [showModeSelector, setShowModeSelector] = useState(true);

  // Handle mode selection
  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode);
    setShowModeSelector(false);
  };

  // Handle back to mode selector
  const handleBackToSelector = () => {
    setSelectedMode(null);
    setShowModeSelector(true);
  };

  // Render the selected game mode
  if (!showModeSelector && selectedMode) {
    switch (selectedMode) {
      case GameMode.PHYLO:
        return <BattleScreen onExit={handleBackToSelector} />;
      case GameMode.TCG:
        return <TCGBattleScreen onExit={handleBackToSelector} />;
      default:
        return null;
    }
  }

  // Render mode selector
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButton 
            fill="clear" 
            slot="start" 
            onClick={onExit}
          >
            <IonIcon icon={arrowBack} />
          </IonButton>
          <IonTitle>Choose Battle Mode</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="">
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          
          {/* Mode Selection Header */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle style={{ textAlign: 'center' }}>
                🧬 BioMasters Game Modes
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p style={{ textAlign: 'center', color: 'var(--ion-color-medium)' }}>
                Choose your preferred gameplay experience. Each mode offers unique mechanics and educational value.
              </p>
            </IonCardContent>
          </IonCard>

          {/* TCG Mode Card */}
          <IonCard 
            className="mode-card tcg-mode"
            button
            onClick={() => handleModeSelect(GameMode.TCG)}
          >
            <IonCardHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <IonIcon 
                  icon={trophy} 
                  style={{ fontSize: '32px', color: 'var(--ion-color-primary)' }}
                />
                <div>
                  <IonCardTitle>TCG Mode</IonCardTitle>
                  <div style={{ fontSize: '14px', color: 'var(--ion-color-medium)' }}>
                    Strategic Trading Card Game
                  </div>
                </div>
                <IonBadge color="primary" style={{ marginLeft: 'auto' }}>
                  Strategic
                </IonBadge>
              </div>
            </IonCardHeader>
            <IonCardContent>
              <p>
                <strong>Master the ecosystem!</strong> Build powerful food webs using strategic 
                card placement, resource management, and biological synergies. Compete to create 
                the most efficient ecosystem.
              </p>
              
              <IonList lines="none" style={{ margin: '16px 0' }}>
                <IonItem>
                  <IonIcon icon={flash} slot="start" color="primary" />
                  <IonLabel>
                    <h3>Strategic gameplay</h3>
                    <p>Manage resources and plan optimal card placement</p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonIcon icon={paw} slot="start" color="primary" />
                  <IonLabel>
                    <h3>Biological mechanics</h3>
                    <p>Trophic levels, domains, and real species abilities</p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonIcon icon={rocket} slot="start" color="primary" />
                  <IonLabel>
                    <h3>Competitive battles</h3>
                    <p>Outsmart opponents with tactical ecosystem building</p>
                  </IonLabel>
                </IonItem>
              </IonList>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <IonBadge color="primary">Strategic</IonBadge>
                <IonBadge color="warning">Advanced</IonBadge>
                <IonBadge color="danger">Competitive</IonBadge>
              </div>
            </IonCardContent>
          </IonCard>
          
          {/* Phylo Mode Card */}
          <IonCard 
            className="mode-card phylo-mode"
            button
            onClick={() => handleModeSelect(GameMode.PHYLO)}
          >
            <IonCardHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <IonIcon 
                  icon={school} 
                  style={{ fontSize: '32px', color: 'var(--ion-color-success)' }}
                />
                <div>
                  <IonCardTitle>Phylo Mode</IonCardTitle>
                  <div style={{ fontSize: '14px', color: 'var(--ion-color-medium)' }}>
                    Educational Domino-Style Game
                  </div>
                </div>
                <IonBadge color="success" style={{ marginLeft: 'auto' }}>
                  Educational
                </IonBadge>
              </div>
            </IonCardHeader>
            <IonCardContent>
              <p>
                <strong>Learn through play!</strong> Build ecosystems by connecting species cards 
                based on real biological relationships. Perfect for understanding food webs and 
                ecological connections.
              </p>
              
              <IonList lines="none" style={{ margin: '16px 0' }}>
                <IonItem>
                  <IonIcon icon={leaf} slot="start" color="success" />
                  <IonLabel>
                    <h3>Domino-style placement</h3>
                    <p>Connect cards based on ecological relationships</p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonIcon icon={book} slot="start" color="success" />
                  <IonLabel>
                    <h3>Educational focus</h3>
                    <p>Learn real species data and conservation status</p>
                  </IonLabel>
                </IonItem>
                <IonItem>
                  <IonIcon icon={people} slot="start" color="success" />
                  <IonLabel>
                    <h3>Collaborative gameplay</h3>
                    <p>Work together to build thriving ecosystems</p>
                  </IonLabel>
                </IonItem>
              </IonList>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <IonBadge color="success">Beginner Friendly</IonBadge>
                <IonBadge color="primary">Quick Games</IonBadge>
                <IonBadge color="secondary">Educational</IonBadge>
              </div>
            </IonCardContent>
          </IonCard>



          {/* Quick Start Options */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Quick Start</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonGrid>
                <IonRow>
                  <IonCol size="6">
                    <IonButton
                      expand="block"
                      fill="outline"
                      color="success"
                      onClick={() => handleModeSelect(GameMode.PHYLO)}
                    >
                      <IonIcon icon={school} slot="start" />
                      Learn Mode
                    </IonButton>
                  </IonCol>
                  <IonCol size="6">
                    <IonButton
                      expand="block"
                      fill="outline"
                      color="primary"
                      onClick={() => handleModeSelect(GameMode.TCG)}
                    >
                      <IonIcon icon={trophy} slot="start" />
                      Battle Mode
                    </IonButton>
                  </IonCol>

                </IonRow>
              </IonGrid>
            </IonCardContent>
          </IonCard>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default BattleModeSelector;
