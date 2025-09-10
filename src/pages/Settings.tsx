import React, { useState } from 'react';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonList,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonInput,
  IonModal,
  IonButtons,
  IonRange,
  IonNote,
  IonToast
} from '@ionic/react';
import { motion } from 'framer-motion';
import {
  colorPalette,
  moon,
  sunny,
  brush,
  settings,
  save,
  close,
  eyedrop,
  contrast,
  accessibility,
  leaf,
  water,
  snow,
  trash
} from 'ionicons/icons';
import { useTheme } from '../theme/ThemeProvider';
import { ThemeConfig, PREDEFINED_THEMES } from '../theme/themeSystem';
import { useLocalization } from '../contexts/LocalizationContext';
import { LanguageSelector } from '../components/localization/LanguageSelector';
import { AccountDeletionModal } from '../components/auth/AccountDeletionModal';
import { useHybridGameStore } from '../state/hybridGameStore';
import { useHistory } from 'react-router-dom';
import './Settings.css';
import '../components/auth/AccountDeletionModal.css';

const Settings: React.FC = () => {
  const history = useHistory();

  const {
    currentTheme,
    availableThemes,
    setTheme,
    createCustomTheme,
    isDarkMode,
    toggleDarkMode,
    organismRenderMode,
    setOrganismRenderMode
  } = useTheme();

  const {
    currentLanguage,
    changeLanguage,
    availableLanguages,
    getUIText
  } = useLocalization();

  const [showCustomThemeModal, setShowCustomThemeModal] = useState(false);
  const [customThemeName, setCustomThemeName] = useState('');
  const [baseThemeId, setBaseThemeId] = useState(currentTheme.id);
  const [customColors, setCustomColors] = useState({
    primary: currentTheme.colors.primary,
    secondary: currentTheme.colors.secondary,
    producer: currentTheme.colors.producer,
    herbivore: currentTheme.colors.herbivore,
    carnivore: currentTheme.colors.carnivore,
    omnivore: currentTheme.colors.omnivore
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showAccountDeletion, setShowAccountDeletion] = useState(false);

  const { userProfile, isGuestMode } = useHybridGameStore();

  const handleCreateCustomTheme = () => {
    if (customThemeName.trim()) {
      try {
        const newTheme = createCustomTheme(customThemeName, baseThemeId, customColors);
        setTheme(newTheme.id);
        setShowCustomThemeModal(false);
        setCustomThemeName('');
        setToastMessage(`Custom theme "${customThemeName}" created successfully!`);
        setShowToast(true);
      } catch (error) {
        console.error('Failed to create custom theme:', error);
        setToastMessage('Failed to create custom theme. Please try again.');
        setShowToast(true);
      }
    } else {
      setToastMessage('Please enter a theme name.');
      setShowToast(true);
    }
  };

  const getThemePreview = (theme: ThemeConfig) => (
    <div className="theme-preview">
      <div 
        className="theme-preview-primary" 
        style={{ backgroundColor: theme.colors.primary }}
      />
      <div 
        className="theme-preview-secondary" 
        style={{ backgroundColor: theme.colors.secondary }}
      />
      <div 
        className="theme-preview-accent" 
        style={{ backgroundColor: theme.colors.accent }}
      />
    </div>
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="settings-content">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Theme Selection */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                <IonIcon icon={colorPalette} />
                Theme & Appearance
              </IonCardTitle>
            </IonCardHeader>
            
            <IonCardContent>
              {/* Dark Mode Toggle */}
              <IonItem>
                <IonIcon icon={isDarkMode ? moon : sunny} slot="start" />
                <IonLabel>
                  <h3>Dark Mode</h3>
                  <p>Switch between light and dark themes</p>
                </IonLabel>
                <IonToggle 
                  checked={isDarkMode} 
                  onIonChange={toggleDarkMode}
                />
              </IonItem>

              {/* Theme Selection */}
              <IonItem>
                <IonIcon icon={brush} slot="start" />
                <IonLabel>
                  <h3>Theme</h3>
                  <p>Choose your preferred color scheme</p>
                </IonLabel>
                <IonSelect 
                  value={currentTheme.id} 
                  onIonChange={(e: any) => setTheme(e.detail.value)}
                >
                  {availableThemes.map(theme => (
                    <IonSelectOption key={theme.id} value={theme.id}>
                      {theme.name}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>

              {/* Current Theme Preview */}
              <div className="current-theme-preview">
                <h4>Current Theme: {currentTheme.name}</h4>
                <p>{currentTheme.description}</p>
                {getThemePreview(currentTheme)}
              </div>

              {/* Custom Theme Button */}
              <IonButton 
                expand="block" 
                fill="outline"
                onClick={() => setShowCustomThemeModal(true)}
              >
                <IonIcon icon={eyedrop} slot="start" />
                Create Custom Theme
              </IonButton>
            </IonCardContent>
          </IonCard>

          {/* Language Settings */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                <IonIcon icon={colorPalette} style={{ marginRight: '8px' }} />
                Language Settings
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonList>
                <IonItem>
                  <IonLabel>
                    <h3>Game Language</h3>
                    <p>Choose your preferred language for the game interface</p>
                  </IonLabel>
                </IonItem>
                <LanguageSelector
                  currentLanguage={currentLanguage}
                  onLanguageChange={changeLanguage}
                  showLabel={true}
                  compact={false}
                />
              </IonList>
            </IonCardContent>
          </IonCard>

          {/* Organism Rendering Settings */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                <IonIcon icon={eyedrop} style={{ marginRight: '8px' }} />
                Organism Rendering
              </IonCardTitle>
            </IonCardHeader>

            <IonCardContent>
              <IonList>
                <IonItem>
                  <IonLabel>
                    <h3>Rendering Mode</h3>
                    <p>Choose how organisms are displayed in cards</p>
                  </IonLabel>
                  <IonSelect
                    value={organismRenderMode}
                    onIonChange={(e: any) => setOrganismRenderMode(e.detail.value)}
                    interface="popover"
                    onIonDismiss={() => {
                      // Clear focus when popover closes
                      setTimeout(() => {
                        if (document.activeElement && document.activeElement instanceof HTMLElement) {
                          document.activeElement.blur();
                        }
                      }, 100);
                    }}
                  >
                    <IonSelectOption value="dom">2D DOM Rendering</IonSelectOption>
                    <IonSelectOption value="image">PNG/SVG Images</IonSelectOption>
                  </IonSelect>
                </IonItem>
              </IonList>

              <div className="render-mode-info">
                {organismRenderMode === 'dom' ? (
                  <IonNote color="primary">
                    <strong>2D DOM Rendering:</strong> Interactive, procedurally generated organisms with zoom and pan controls. Educational and engaging.
                  </IonNote>
                ) : (
                  <IonNote color="secondary">
                    <strong>PNG/SVG Images:</strong> Static images for faster performance. Better for older devices or slower connections.
                  </IonNote>
                )}
              </div>
            </IonCardContent>
          </IonCard>

          {/* Theme Gallery */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Theme Gallery</IonCardTitle>
            </IonCardHeader>
            
            <IonCardContent>
              <IonGrid>
                <IonRow>
                  {availableThemes.map(theme => (
                    <IonCol size="6" sizeMd="4" key={theme.id}>
                      <motion.div
                        className={`theme-card ${currentTheme.id === theme.id ? 'active' : ''}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setTheme(theme.id)}
                      >
                        <div className="theme-card-header">
                          <h5>{theme.name}</h5>
                          <IonIcon icon={theme.category === 'custom' ? 'eyedrop' :
                                       theme.category === 'forest' ? 'leaf' :
                                       theme.category === 'ocean' ? 'water' :
                                       theme.category === 'desert' ? 'sunny' : 'snow'} />
                        </div>
                        {getThemePreview(theme)}
                        <p>{theme.description}</p>
                      </motion.div>
                    </IonCol>
                  ))}
                </IonRow>
              </IonGrid>
            </IonCardContent>
          </IonCard>

          {/* Accessibility Settings */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                <IonIcon icon={accessibility} />
                Accessibility
              </IonCardTitle>
            </IonCardHeader>
            
            <IonCardContent>
              <IonItem>
                <IonIcon icon={contrast} slot="start" />
                <IonLabel>
                  <h3>High Contrast</h3>
                  <p>Increase contrast for better visibility</p>
                </IonLabel>
                <IonToggle />
              </IonItem>

              <IonItem>
                <IonLabel>
                  <h3>Font Size</h3>
                  <p>Adjust text size for better readability</p>
                </IonLabel>
                <IonRange 
                  min={0.8} 
                  max={1.4} 
                  step={0.1} 
                  value={1.0}
                  pin={true}
                />
              </IonItem>

              <IonItem>
                <IonLabel>
                  <h3>Animation Speed</h3>
                  <p>Control animation and transition speed</p>
                </IonLabel>
                <IonRange 
                  min={0.5} 
                  max={2.0} 
                  step={0.1} 
                  value={1.0}
                  pin={true}
                />
              </IonItem>
            </IonCardContent>
          </IonCard>

          {/* Game Settings */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                <IonIcon icon={settings} />
                Game Settings
              </IonCardTitle>
            </IonCardHeader>

            <IonCardContent>
              <IonItem>
                <IonLabel>
                  <h3>Show Probability Percentages</h3>
                  <p>Display combat probability calculations</p>
                </IonLabel>
                <IonToggle />
              </IonItem>

              <IonItem>
                <IonLabel>
                  <h3>Educational Tooltips</h3>
                  <p>Show detailed biological information</p>
                </IonLabel>
                <IonToggle checked={true} />
              </IonItem>

              <IonItem>
                <IonLabel>
                  <h3>Auto-Save Progress</h3>
                  <p>Automatically save game state</p>
                </IonLabel>
                <IonToggle checked={true} />
              </IonItem>
            </IonCardContent>
          </IonCard>

          {/* Account Management */}
          {userProfile && (
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>
                  <IonIcon icon={settings} />
                  Account Management
                </IonCardTitle>
              </IonCardHeader>

              <IonCardContent>
                <IonItem>
                  <IonLabel>
                    <h3>Account Type</h3>
                    <p>{isGuestMode ? 'Guest Account' : 'Registered Account'}</p>
                  </IonLabel>
                </IonItem>

                {userProfile.email && (
                  <IonItem>
                    <IonLabel>
                      <h3>Email</h3>
                      <p>{userProfile.email}</p>
                    </IonLabel>
                  </IonItem>
                )}

                <IonItem>
                  <IonLabel>
                    <h3>Username</h3>
                    <p>{userProfile.display_name || userProfile.username || 'Not set'}</p>
                  </IonLabel>
                </IonItem>

                <div className="danger-zone">
                  <h4 style={{ color: 'var(--ion-color-danger)', marginTop: '2rem', marginBottom: '1rem' }}>
                    Danger Zone
                  </h4>
                  <IonButton
                    expand="block"
                    color="danger"
                    fill="outline"
                    onClick={() => setShowAccountDeletion(true)}
                    data-testid="delete-account-button"
                  >
                    <IonIcon icon={trash} slot="start" />
                    Delete Account
                  </IonButton>
                  <IonNote color="medium">
                    <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      This action cannot be undone. All your data will be permanently deleted.
                    </p>
                  </IonNote>
                </div>
              </IonCardContent>
            </IonCard>
          )}
        </motion.div>

        {/* Custom Theme Creation Modal */}
        <IonModal isOpen={showCustomThemeModal} onDidDismiss={() => setShowCustomThemeModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Create Custom Theme</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowCustomThemeModal(false)}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          
          <IonContent>
            <div className="custom-theme-creator">
              <IonItem>
                <IonLabel position="stacked">Theme Name</IonLabel>
                <IonInput 
                  value={customThemeName}
                  onIonInput={(e) => setCustomThemeName(e.detail.value!)}
                  placeholder="Enter theme name"
                />
              </IonItem>

              <IonItem>
                <IonLabel>Base Theme</IonLabel>
                <IonSelect 
                  value={baseThemeId}
                  onIonChange={(e: any) => setBaseThemeId(e.detail.value)}
                >
                  {Object.values(PREDEFINED_THEMES).map(theme => (
                    <IonSelectOption key={theme.id} value={theme.id}>
                      {theme.name}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>

              <div className="color-customization">
                <h4>Customize Colors</h4>
                
                {Object.entries(customColors).map(([colorKey, colorValue]) => (
                  <IonItem key={colorKey}>
                    <IonLabel>{colorKey.charAt(0).toUpperCase() + colorKey.slice(1)}</IonLabel>
                    <input 
                      type="color" 
                      value={colorValue}
                      onChange={(e) => setCustomColors(prev => ({
                        ...prev,
                        [colorKey]: e.target.value
                      }))}
                      className="color-picker"
                    />
                  </IonItem>
                ))}
              </div>

              <div className="theme-preview-section">
                <h4>Preview</h4>
                <div className="custom-theme-preview">
                  {Object.entries(customColors).map(([key, color]) => (
                    <div 
                      key={key}
                      className="color-swatch"
                      style={{ backgroundColor: color }}
                      title={key}
                    />
                  ))}
                </div>
              </div>

              <IonButton 
                expand="block" 
                onClick={handleCreateCustomTheme}
                disabled={!customThemeName.trim()}
              >
                <IonIcon icon={save} slot="start" />
                Create Theme
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        {/* Toast for feedback */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          position="bottom"
        />

        {/* Account Deletion Modal */}
        <AccountDeletionModal
          isOpen={showAccountDeletion}
          onClose={() => setShowAccountDeletion(false)}
          onSuccess={() => {
            console.log('🔄 [Settings] AccountDeletion onSuccess callback triggered');
            // Use React Router navigation instead of hard page refresh
            // This ensures proper component re-rendering after account deletion
            setShowAccountDeletion(false);
            console.log('🔄 [Settings] Modal closed, navigating to /home');
            history.push('/home');
            console.log('✅ [Settings] Navigation to /home completed');
          }}
        />
      </IonContent>
    </IonPage>
  );
};

export default Settings;
