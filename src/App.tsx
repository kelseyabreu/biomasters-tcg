import React from 'react';
import { Redirect, Route } from 'react-router-dom';
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
import DeckBuilder from './components/collection/DeckBuilder';
import BattleModeSelector from './components/battle/BattleModeSelector';
import MainMenu from './pages/MainMenu';
import PackOpening from './pages/PackOpening';
import AuthPage from './pages/AuthPage';
import { HybridCollectionView } from './components/collection/HybridCollectionView';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import { ThemeProvider } from './theme/ThemeProvider';
import { useHybridGameStore } from './state/hybridGameStore';
import { ActiveBattleIndicator } from './components/navigation/ActiveBattleIndicator';

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

const App: React.FC = () => {
  const { isAuthenticated, firebaseUser, initializeAuth } = useHybridGameStore();
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Initialize auth on app start
  React.useEffect(() => {
    const initialize = async () => {
      try {
        await initializeAuth();
        // Give Firebase a moment to initialize
        setTimeout(() => setIsInitialized(true), 2000);
      } catch (error) {
        console.error('Failed to initialize:', error);
        setIsInitialized(true); // Continue anyway
      }
    };
    initialize();
  }, [initializeAuth]);

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
      <IonApp>
        <IonReactRouter>
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
        </IonReactRouter>
      </IonApp>
    </ThemeProvider>
  );
};

export default App;
