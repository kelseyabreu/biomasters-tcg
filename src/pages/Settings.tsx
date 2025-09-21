import React, { useState, useEffect } from 'react';
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
  trash,
  person,
  sync
} from 'ionicons/icons';
import { useTheme, GridCellStyle, CardVisualStyle } from '../theme/ThemeProvider';
import { ThemeConfig, PREDEFINED_THEMES } from '../theme/themeSystem';
import EnhancedEcosystemCard from '../components/battle/EnhancedEcosystemCard';
import { useLocalization } from '../contexts/LocalizationContext';
import { LanguageSelector } from '../components/localization/LanguageSelector';
import { AccountDeletionModal } from '../components/auth/AccountDeletionModal';
import { SyncStatus } from '../components/collection/SyncStatus';
import { useHybridGameStore } from '../state/hybridGameStore';
import { useHistory } from 'react-router-dom';
import { UserType, UITextId } from '@kelseyabreu/shared';
import { auth } from '../config/firebase';
import './Settings.css';
import '../components/auth/AccountDeletionModal.css';
import '../components/game/GridCellStyles.css';

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
    setOrganismRenderMode,
    gridCellStyle,
    setGridCellStyle,
    cardVisualStyle,
    setCardVisualStyle
  } = useTheme();

  const localization = useLocalization();

  // Sample card data for preview
  const sampleGridCard = {
    instanceId: 'preview-card',
    cardId: 1,
    ownerId: 'human',
    position: { x: 0, y: 0 }
  };

  const sampleCardData = {
    cardId: 1,
    nameId: 'grass' as any,
    scientificNameId: 'poaceae' as any,
    trophicRole: 'producer' as any,
    trophicLevel: 1,
    victoryPoints: 2,
    energyCost: 1,
    domains: [0],
    conservationStatus: 'least_concern' as any,
    abilities: [],
    attachments: []
  };

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

  // Admin functionality state
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminCurrencyAmount, setAdminCurrencyAmount] = useState('');
  const [adminCurrencyType, setAdminCurrencyType] = useState('eco_credits');
  const [adminCardId, setAdminCardId] = useState('');
  const [adminCardQuantity, setAdminCardQuantity] = useState('1');
  const [adminReason, setAdminReason] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const {
    userProfile,
    isGuestMode,
    isOnline,
    syncStatus,
    syncCollection,
    pendingActions,
    lastSyncTime,
    syncError
  } = useHybridGameStore();

  // Check Firebase custom claims for admin privileges
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (auth.currentUser) {
        try {
          // Get the ID token to access custom claims
          const idTokenResult = await auth.currentUser.getIdTokenResult();
          const claims = idTokenResult.claims;

          // Check if user has admin claims
          const hasAdminClaim = claims.admin === true || claims.role === 'admin';
          setIsAdmin(hasAdminClaim);

          console.log('🔐 [Settings] Admin status check:', {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email,
            hasAdminClaim,
            claims: claims
          });
        } catch (error) {
          console.error('❌ [Settings] Failed to check admin status:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [auth.currentUser]);

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

  // Admin functions
  const handleGrantCurrency = async () => {
    if (!adminIdentifier.trim() || !adminCurrencyAmount.trim() || !adminReason.trim()) {
      setToastMessage('Please fill in all fields');
      setShowToast(true);
      return;
    }

    setAdminLoading(true);
    try {
      // Get Firebase ID token for authentication
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setToastMessage('Authentication required');
        setShowToast(true);
        setAdminLoading(false);
        return;
      }

      const response = await fetch('/api/admin/grant-currency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          identifier: adminIdentifier,
          [adminCurrencyType]: parseInt(adminCurrencyAmount),
          reason: adminReason
        })
      });

      const result = await response.json();

      if (response.ok) {
        setToastMessage(`Currency granted successfully to ${result.user.username}`);
        setAdminIdentifier('');
        setAdminCurrencyAmount('');
        setAdminReason('');
      } else {
        setToastMessage(`Error: ${result.message || 'Failed to grant currency'}`);
      }
    } catch (error) {
      console.error('Error granting currency:', error);
      setToastMessage('Network error. Please try again.');
    } finally {
      setAdminLoading(false);
      setShowToast(true);
    }
  };

  const handleGrantCard = async () => {
    if (!adminIdentifier.trim() || !adminCardId.trim() || !adminReason.trim()) {
      setToastMessage('Please fill in all fields');
      setShowToast(true);
      return;
    }

    setAdminLoading(true);
    try {
      // Get Firebase ID token for authentication
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setToastMessage('Authentication required');
        setShowToast(true);
        setAdminLoading(false);
        return;
      }

      const response = await fetch('/api/admin/grant-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          identifier: adminIdentifier,
          cardId: parseInt(adminCardId),
          quantity: parseInt(adminCardQuantity),
          reason: adminReason
        })
      });

      const result = await response.json();

      if (response.ok) {
        setToastMessage(`Card granted successfully to ${result.user.username}`);
        setAdminIdentifier('');
        setAdminCardId('');
        setAdminCardQuantity('1');
        setAdminReason('');
      } else {
        setToastMessage(`Error: ${result.message || 'Failed to grant card'}`);
      }
    } catch (error) {
      console.error('Error granting card:', error);
      setToastMessage('Network error. Please try again.');
    } finally {
      setAdminLoading(false);
      setShowToast(true);
    }
  };

  // Admin status is now checked via Firebase custom claims in useEffect above

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
                {getUIText(UITextId.UI_THEME_SETTINGS)}
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
                {getUIText(UITextId.UI_LANGUAGE_SETTINGS)}
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

          {/* Grid Cell & Card Visual Style Settings */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                <IonIcon icon={settings} style={{ marginRight: '8px' }} />
                Grid Cell & Card Visual Styles
              </IonCardTitle>
            </IonCardHeader>

            <IonCardContent>
              <IonList>
                <IonItem>
                  <IonLabel>
                    <h3>Cell Style</h3>
                    <p>Choose how grid cells appear in the game</p>
                  </IonLabel>
                  <IonSelect
                    value={gridCellStyle}
                    onIonChange={(e: any) => setGridCellStyle(e.detail.value)}
                    interface="popover"
                  >
                    <IonSelectOption value="classic">Classic</IonSelectOption>
                    <IonSelectOption value="hexagon">Hexagon</IonSelectOption>
                    <IonSelectOption value="rounded">Rounded</IonSelectOption>
                    <IonSelectOption value="minimal">Minimal</IonSelectOption>
                    <IonSelectOption value="neon">Neon</IonSelectOption>
                    <IonSelectOption value="organic">Organic</IonSelectOption>
                  </IonSelect>
                </IonItem>
              </IonList>

              {/* Grid Cell Style Preview */}
              <div className="grid-cell-preview-section">
                <h4>Preview</h4>
                <div className="grid-cell-preview-container">
                  <IonGrid>
                    <IonRow>
                      {(['classic', 'hexagon', 'rounded', 'minimal', 'neon', 'organic'] as GridCellStyle[]).map((style) => (
                        <IonCol size="4" sizeMd="2" key={style}>
                          <div className="grid-cell-preview-item">
                            <div
                              className={`grid-cell style-${style} empty ${gridCellStyle === style ? 'selected-preview' : ''}`}
                              style={{
                                width: '40px',
                                height: '40px',
                                margin: '0 auto 8px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative'
                              }}
                              onClick={() => setGridCellStyle(style)}
                            />
                            <p style={{
                              fontSize: '0.75rem',
                              textAlign: 'center',
                              margin: 0,
                              fontWeight: gridCellStyle === style ? 'bold' : 'normal',
                              color: gridCellStyle === style ? 'var(--ion-color-primary)' : 'inherit'
                            }}>
                              {style.charAt(0).toUpperCase() + style.slice(1)}
                            </p>
                          </div>
                        </IonCol>
                      ))}
                    </IonRow>
                  </IonGrid>
                </div>

                <div className="grid-cell-info">
                  <IonNote color="medium">
                    {gridCellStyle === 'classic' && <strong>Classic:</strong>}
                    {gridCellStyle === 'hexagon' && <strong>Hexagon:</strong>}
                    {gridCellStyle === 'rounded' && <strong>Rounded:</strong>}
                    {gridCellStyle === 'minimal' && <strong>Minimal:</strong>}
                    {gridCellStyle === 'neon' && <strong>Neon:</strong>}
                    {gridCellStyle === 'organic' && <strong>Organic:</strong>}
                    {' '}
                    {gridCellStyle === 'classic' && 'Traditional rectangular cells with subtle borders and glass-like effects.'}
                    {gridCellStyle === 'hexagon' && 'Hexagonal cells that create a honeycomb pattern, perfect for organic ecosystems.'}
                    {gridCellStyle === 'rounded' && 'Circular cells with radial gradients for a modern, soft appearance.'}
                    {gridCellStyle === 'minimal' && 'Clean, simple cells with minimal styling for distraction-free gameplay.'}
                    {gridCellStyle === 'neon' && 'Cyberpunk-inspired cells with glowing neon borders and effects.'}
                    {gridCellStyle === 'organic' && 'Irregular, nature-inspired shapes with subtle animations and organic curves.'}
                  </IonNote>
                </div>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Card Visual Style Settings */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                <IonIcon icon={settings} style={{ marginRight: '8px' }} />
                Card Visual Style
              </IonCardTitle>
            </IonCardHeader>

            <IonCardContent>
              <IonList>
                <IonItem>
                  <IonLabel>
                    <h3>Card Appearance</h3>
                    <p>Choose how cards look in the ecosystem grid</p>
                  </IonLabel>
                  <IonSelect
                    value={cardVisualStyle}
                    onIonChange={(e: any) => setCardVisualStyle(e.detail.value)}
                    interface="popover"
                  >
                    <IonSelectOption value="style1">Compact Info Card</IonSelectOption>
                    <IonSelectOption value="style2">Minimalist View</IonSelectOption>
                    <IonSelectOption value="style3">Data-Focused Grid</IonSelectOption>
                    <IonSelectOption value="style4">Circular Design</IonSelectOption>
                  </IonSelect>
                </IonItem>
              </IonList>

              <div className="card-style-preview-section">
                <h4>Preview</h4>
                <div className="card-style-preview-container">
                  <IonGrid>
                    <IonRow>
                      {(['style1', 'style2', 'style3', 'style4'] as CardVisualStyle[]).map((style) => (
                        <IonCol size="3" key={style}>
                          <div
                            className={`card-style-preview-item ${cardVisualStyle === style ? 'selected' : ''}`}
                            onClick={() => setCardVisualStyle(style)}
                          >
                            <div className={`card-preview card-preview-${style}`}>
                              <div className="preview-content">
                                {style === 'style1' && (
                                  <div style={{
                                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                    borderRadius: '8px',
                                    padding: '4px',
                                    color: 'white',
                                    fontSize: '8px',
                                    textAlign: 'center',
                                    width: '40px',
                                    height: '40px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center'
                                  }}>
                                    <div>🌱</div>
                                    <div>T1</div>
                                  </div>
                                )}
                                {style === 'style2' && (
                                  <div style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    borderRadius: '4px',
                                    padding: '4px',
                                    fontSize: '8px',
                                    textAlign: 'center',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    width: '40px',
                                    height: '40px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center'
                                  }}>
                                    <div>🌱</div>
                                    <div>Clean</div>
                                  </div>
                                )}
                                {style === 'style3' && (
                                  <div style={{
                                    background: 'linear-gradient(45deg, #2a2a2a, #1a1a1a)',
                                    borderRadius: '4px',
                                    padding: '2px',
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '1px',
                                    fontSize: '6px',
                                    color: 'white',
                                    width: '40px',
                                    height: '40px',
                                    border: '1px solid #22c55e'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🌱</div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>T1</div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>VP</div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
                                  </div>
                                )}
                                {style === 'style4' && (
                                  <div style={{
                                    background: 'radial-gradient(circle, #22c55e22, transparent 70%)',
                                    borderRadius: '50%',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '2px solid #22c55e',
                                    fontSize: '12px',
                                    width: '40px',
                                    height: '40px'
                                  }}>
                                    🌱
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="card-style-label">
                              {style === 'style1' && 'Compact'}
                              {style === 'style2' && 'Minimal'}
                              {style === 'style3' && 'Data Grid'}
                              {style === 'style4' && 'Circular'}
                            </div>
                          </div>
                        </IonCol>
                      ))}
                    </IonRow>
                  </IonGrid>
                </div>

                <div className="card-style-info">
                  <IonNote color="primary">
                    {cardVisualStyle === 'style1' && 'Compact Info Card: Enhanced design with gradients and detailed information display.'}
                    {cardVisualStyle === 'style2' && 'Minimalist View: Clean, simple design with reduced visual elements for clarity.'}
                    {cardVisualStyle === 'style3' && 'Data-Focused Grid: Grid layout optimized for displaying stats and data efficiently.'}
                    {cardVisualStyle === 'style4' && 'Circular Design: Unique circular cards with radial gradients and modern aesthetics.'}
                  </IonNote>
                </div>
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

          {/* Sync & Data Management */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                <IonIcon icon={sync} />
                Sync & Data Management
              </IonCardTitle>
            </IonCardHeader>

            <IonCardContent>
              <SyncStatus
                isOnline={isOnline}
                syncStatus={syncStatus}
                onSync={async () => {
                  console.log('Manual sync triggered from settings');
                  try {
                    if (isOnline) {
                      await syncCollection();
                      setToastMessage('Sync completed successfully!');
                      setShowToast(true);
                    } else {
                      setToastMessage('Cannot sync while offline. Please check your connection.');
                      setShowToast(true);
                    }
                  } catch (error) {
                    console.error('Manual sync failed:', error);
                    setToastMessage('Sync failed. Please try again.');
                    setShowToast(true);
                  }
                }}
                pendingActions={pendingActions}
                lastSyncTime={lastSyncTime}
                syncError={syncError}
              />
            </IonCardContent>
          </IonCard>

          {/* Game Settings */}
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                <IonIcon icon={settings} />
                {getUIText(UITextId.UI_GAME_SETTINGS)}
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

          {/* Profile Management */}
          {userProfile && (
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>
                  <IonIcon icon={person} />
                  {getUIText(UITextId.UI_PROFILE_MANAGEMENT)}
                </IonCardTitle>
              </IonCardHeader>

              <IonCardContent>
                <IonItem>
                  <IonLabel position="stacked">Display Name</IonLabel>
                  <IonInput
                    value={userProfile.display_name || userProfile.username || ''}
                    placeholder="Enter your display name"
                    data-testid="display-name-input"
                    readonly={true}
                  />
                </IonItem>

                <IonItem>
                  <IonLabel position="stacked">Username</IonLabel>
                  <IonInput
                    value={userProfile.username || ''}
                    placeholder="Username"
                    readonly={true}
                  />
                </IonItem>

                {userProfile.email && (
                  <IonItem>
                    <IonLabel position="stacked">Email</IonLabel>
                    <IonInput
                      value={userProfile.email}
                      readonly={true}
                    />
                  </IonItem>
                )}

                <IonButton
                  expand="block"
                  fill="outline"
                  disabled={true}
                  data-testid="save-profile-button"
                >
                  <IonIcon icon={save} slot="start" />
                  Save Profile (Coming Soon)
                </IonButton>

                <IonNote color="medium">
                  <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    Profile editing functionality will be available in a future update.
                  </p>
                </IonNote>
              </IonCardContent>
            </IonCard>
          )}

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

          {/* Admin Section */}
          {isAdmin && (
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>
                  <IonIcon icon={settings} />
                  Admin Tools
                </IonCardTitle>
              </IonCardHeader>

              <IonCardContent>
                <IonList>
                  {/* Grant Currency Section */}
                  <IonItem>
                    <IonLabel>
                      <h2>Grant Currency</h2>
                      <p>Grant currency to users by username, email, or ID</p>
                    </IonLabel>
                  </IonItem>

                  <IonItem>
                    <IonLabel position="stacked">User (Username, Email, or ID)</IonLabel>
                    <IonInput
                      value={adminIdentifier}
                      placeholder="Enter username, email, or user ID"
                      onIonInput={(e) => setAdminIdentifier(e.detail.value!)}
                      disabled={adminLoading}
                    />
                  </IonItem>

                  <IonItem>
                    <IonLabel position="stacked">Currency Type</IonLabel>
                    <IonSelect
                      value={adminCurrencyType}
                      onIonChange={(e: any) => setAdminCurrencyType(e.detail.value)}
                      disabled={adminLoading}
                    >
                      <IonSelectOption value="eco_credits">Eco Credits</IonSelectOption>
                      <IonSelectOption value="gems">Gems</IonSelectOption>
                      <IonSelectOption value="coins">Coins</IonSelectOption>
                      <IonSelectOption value="dust">Dust</IonSelectOption>
                    </IonSelect>
                  </IonItem>

                  <IonItem>
                    <IonLabel position="stacked">Amount</IonLabel>
                    <IonInput
                      type="number"
                      value={adminCurrencyAmount}
                      placeholder="Enter amount"
                      onIonInput={(e) => setAdminCurrencyAmount(e.detail.value!)}
                      disabled={adminLoading}
                    />
                  </IonItem>

                  <IonItem>
                    <IonLabel position="stacked">Reason</IonLabel>
                    <IonInput
                      value={adminReason}
                      placeholder="Enter reason for granting currency"
                      onIonInput={(e) => setAdminReason(e.detail.value!)}
                      disabled={adminLoading}
                    />
                  </IonItem>

                  <IonItem>
                    <IonButton
                      expand="block"
                      color="primary"
                      onClick={handleGrantCurrency}
                      disabled={adminLoading || !adminIdentifier || !adminCurrencyAmount || !adminReason}
                    >
                      {adminLoading ? 'Granting...' : 'Grant Currency'}
                    </IonButton>
                  </IonItem>

                  {/* Grant Card Section */}
                  <IonItem style={{ marginTop: '20px' }}>
                    <IonLabel>
                      <h2>Grant Card</h2>
                      <p>Grant cards to users by username, email, or ID</p>
                    </IonLabel>
                  </IonItem>

                  <IonItem>
                    <IonLabel position="stacked">User (Username, Email, or ID)</IonLabel>
                    <IonInput
                      value={adminIdentifier}
                      placeholder="Enter username, email, or user ID"
                      onIonInput={(e) => setAdminIdentifier(e.detail.value!)}
                      disabled={adminLoading}
                    />
                  </IonItem>

                  <IonItem>
                    <IonLabel position="stacked">Card ID</IonLabel>
                    <IonInput
                      type="number"
                      value={adminCardId}
                      placeholder="Enter card ID"
                      onIonInput={(e) => setAdminCardId(e.detail.value!)}
                      disabled={adminLoading}
                    />
                  </IonItem>

                  <IonItem>
                    <IonLabel position="stacked">Quantity</IonLabel>
                    <IonInput
                      type="number"
                      value={adminCardQuantity}
                      placeholder="Enter quantity"
                      onIonInput={(e) => setAdminCardQuantity(e.detail.value!)}
                      disabled={adminLoading}
                      min="1"
                      max="100"
                    />
                  </IonItem>

                  <IonItem>
                    <IonLabel position="stacked">Reason</IonLabel>
                    <IonInput
                      value={adminReason}
                      placeholder="Enter reason for granting card"
                      onIonInput={(e) => setAdminReason(e.detail.value!)}
                      disabled={adminLoading}
                    />
                  </IonItem>

                  <IonItem>
                    <IonButton
                      expand="block"
                      color="secondary"
                      onClick={handleGrantCard}
                      disabled={adminLoading || !adminIdentifier || !adminCardId || !adminReason}
                    >
                      {adminLoading ? 'Granting...' : 'Grant Card'}
                    </IonButton>
                  </IonItem>
                </IonList>
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
