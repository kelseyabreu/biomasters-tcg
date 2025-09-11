import React from 'react';
import { Redirect, Route, useHistory } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { library, construct, flash, trophy, settings, leaf, water, sunny, snow, thermometer } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import DeckBuilder from './components/collection/DeckBuilder';
import BattleModeSelector from './components/battle/BattleModeSelector';
import MainMenu from './pages/MainMenu';
import PackOpening from './pages/PackOpening';
import AuthPage from './pages/AuthPage';
import { HybridCollectionView } from './components/collection/HybridCollectionView';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import TaxonomyDemo from './pages/TaxonomyDemo';
import { ThemeProvider } from './theme/ThemeProvider';
import { useHybridGameStore } from './state/hybridGameStore';
import { ActiveBattleIndicator } from './components/navigation/ActiveBattleIndicator';
import { LocalizationProvider } from './contexts/LocalizationContext';
import { gameStateManager } from './services/GameStateManager';
import { staticDataManager } from './services/StaticDataManager';
import { ConnectivityIndicator, OfflineBanner } from './components/ui/ConnectivityIndicator';
import { ConflictResolutionModal } from './components/ui/ConflictResolutionModal';
import { ResumeGamePrompt } from './components/ui/ResumeGamePrompt';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';
import './theme/global.css';
import './theme/utilities.css';

setupIonicReact();



// Add icons globally
addIcons({
  library,
  construct,
  flash,
  trophy,
  settings,
  leaf,
  water,
  sunny,
  snow,
  thermometer
});

/**
 * Setup mobile lifecycle listeners for game state persistence
 */
const setupMobileLifecycle = () => {
  // Listen for app state changes
  CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
    console.log(`📱 [App] App state changed: ${isActive ? 'active' : 'inactive'}`);

    if (!isActive) {
      // App is being backgrounded - save current game state
      const store = useHybridGameStore.getState();
      const currentBattle = store.battle;

      if (currentBattle.tcgGameState && currentBattle.gameMode === 'TCG') {
        try {
          console.log('💾 [App] Saving TCG game state before backgrounding...');
          await gameStateManager.saveActiveGame(currentBattle.tcgGameState, 'TCG');
        } catch (error) {
          console.error('❌ [App] Failed to save TCG game state:', error);
        }
      } else if (currentBattle.phyloGameState && currentBattle.gameMode === 'Phylo') {
        try {
          console.log('💾 [App] Saving Phylo game state before backgrounding...');
          // Note: We'll need to adapt this for Phylo game state structure
          // await gameStateManager.saveActiveGame(currentBattle.phyloGameState, 'Phylo');
        } catch (error) {
          console.error('❌ [App] Failed to save Phylo game state:', error);
        }
      }
    } else {
      // App is becoming active - could check for updates here
      console.log('📱 [App] App became active');
    }
  });

  // Listen for app URL open (deep links)
  CapacitorApp.addListener('appUrlOpen', (event) => {
    console.log('🔗 [App] App opened via URL:', event.url);
    // Handle deep links if needed
  });

  // Listen for back button (Android)
  CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    console.log('⬅️ [App] Back button pressed, canGoBack:', canGoBack);

    if (!canGoBack) {
      // Handle app exit - could save state here too
      CapacitorApp.exitApp();
    }
  });
};

const App: React.FC = () => {
  const {
    isAuthenticated,
    firebaseUser,
    initializeAuth,
    loadSpeciesData,
    speciesLoaded,
    battle,
    recoverActiveGame,
    hasPausedGame,
    pausedGameMetadata,
    showSyncConflicts,
    resumePausedGame
  } = useHybridGameStore();
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [showResumePrompt, setShowResumePrompt] = React.useState(false);

  // Initialize auth, load species data, and setup mobile lifecycle on app start
  React.useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize static data manager first
        console.log('🔄 [App] Initializing static data manager...');
        await staticDataManager.initialize();

        // Initialize auth
        await initializeAuth();

        // Load species data if not already loaded
        if (!speciesLoaded) {
          console.log('🔄 [App] Loading species data on app start...');
          await loadSpeciesData();
        }

        // Check for and recover any saved game state
        console.log('🔄 [App] Checking for saved game state...');
        await recoverActiveGame();

        // Setup mobile lifecycle listeners
        if (Capacitor.isNativePlatform()) {
          console.log('📱 [App] Setting up mobile lifecycle listeners...');
          setupMobileLifecycle();
        }

        // Give Firebase a moment to initialize
        setTimeout(() => setIsInitialized(true), 2000);
      } catch (error) {
        console.error('Failed to initialize:', error);
        setIsInitialized(true); // Continue anyway
      }
    };
    initialize();
  }, [initializeAuth, loadSpeciesData, speciesLoaded, recoverActiveGame]);

  // Show resume prompt when a paused game is detected
  React.useEffect(() => {
    if (hasPausedGame && isInitialized) {
      setShowResumePrompt(true);
    }
  }, [hasPausedGame, isInitialized]);

  // Show loading screen while initializing
  if (!isInitialized) {
    return (
      <IonApp>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'var(--tcg-background-primary)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h2>🧬 Biomasters TCG</h2>
            <p>Initializing...</p>
          </div>
        </div>
      </IonApp>
    );
  }

  return (
    <ThemeProvider>
      <LocalizationProvider basePath="/data/localization">
        <IonApp>
        <IonReactRouter>
          {/* Global UI Components */}
          <OfflineBanner />
          <ConnectivityIndicator position="floating" showText />

          {/* Active Battle Indicator - shows when there's an active battle */}
          <ActiveBattleIndicator />

          <IonTabs>
            <IonRouterOutlet>

              <Route exact path="/collection">
                <HybridCollectionView
                  onCardSelect={(card) => console.log('Selected card:', card)}
                  showOnlyOwned={false}
                />
              </Route>
              <Route exact path="/deck-builder">
                <DeckBuilder />
              </Route>
              <Route exact path="/battle">
                <BattleModeSelector />
              </Route>
              <Route exact path="/packs">
                <PackOpening />
              </Route>
              <Route exact path="/auth">
                <AuthPage />
              </Route>
              <Route path="/home">
                <MainMenu />
              </Route>
              <Route exact path="/settings">
                <Settings />
              </Route>
              <Route exact path="/profile">
                <Profile />
              </Route>
              <Route exact path="/taxonomy">
                <TaxonomyDemo />
              </Route>
              <Route exact path="/">
                <Redirect to="/home" />
              </Route>
            </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="home" href="/home">
              <IonIcon aria-hidden="true" icon={trophy} />
              <IonLabel>Home</IonLabel>
            </IonTabButton>
            <IonTabButton tab="collection" href="/collection">
              <IonIcon aria-hidden="true" icon={library} />
              <IonLabel>Collection</IonLabel>
            </IonTabButton>
            <IonTabButton tab="deck-builder" href="/deck-builder">
              <IonIcon aria-hidden="true" icon={construct} />
              <IonLabel>Deck Builder</IonLabel>
            </IonTabButton>
            <IonTabButton tab="settings" href="/settings">
              <IonIcon aria-hidden="true" icon={settings} />
              <IonLabel>Settings</IonLabel>
            </IonTabButton>
          </IonTabBar>
          </IonTabs>

          {/* Resume Game Prompt */}
          <ResumeGamePrompt
            isVisible={showResumePrompt}
            onDismiss={() => setShowResumePrompt(false)}
          />

          {/* Conflict Resolution Modal */}
          <ConflictResolutionModal
            isOpen={showSyncConflicts}
            onDismiss={() => {
              const store = useHybridGameStore.getState();
              store.dismissSyncConflicts();
            }}
          />

        </IonReactRouter>
        </IonApp>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export default App;
