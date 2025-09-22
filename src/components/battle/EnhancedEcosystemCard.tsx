import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import {
  eye,
  informationCircle,
  statsChart,
  colorPalette
} from 'ionicons/icons';
import OrganismRenderer from '../OrganismRenderer';
import { Card } from '../../types';
import { ClientGridCard } from '../../types/ClientGameTypes';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useTheme } from '../../theme/ThemeProvider';
import './EnhancedEcosystemCard.css';

interface EnhancedEcosystemCardProps {
  card: ClientGridCard; // Grid card object
  cardData: Card | null; // Card data from getCardData
  localization: ReturnType<typeof useLocalization>;
  allSpeciesCards: Card[];
}

const EnhancedEcosystemCard: React.FC<EnhancedEcosystemCardProps> = ({
  card,
  cardData,
  localization,
  allSpeciesCards
}) => {
  const { cardVisualStyle } = useTheme();

  // Convert theme style to button style number
  const getButtonStyleFromTheme = () => {
    switch (cardVisualStyle) {
      case 'style1': return 1;
      case 'style2': return 2;
      case 'style3': return 3;
      case 'style4': return 4;
      default: return 1;
    }
  };

  const buttonStyle = getButtonStyleFromTheme();

  // Helper function to get trophic level display
  const getTrophicLevelDisplay = (trophicLevel: number): string => {
    if (trophicLevel === -1) return 'T-1';
    if (trophicLevel === 0) return 'T0';
    return `T${trophicLevel}`;
  };

  // Helper function to get trophic level color
  const getTrophicLevelColor = (trophicLevel: number): string => {
    switch (trophicLevel) {
      case -1: return '#8B4513'; // Brown for decomposers
      case 0: return '#228B22'; // Green for producers
      case 1: return '#FFD700'; // Gold for primary consumers
      case 2: return '#FF6347'; // Orange-red for secondary consumers
      case 3: return '#DC143C'; // Crimson for tertiary consumers
      default: return '#808080'; // Gray for unknown
    }
  };

  // Helper function to get trophic level CSS class
  const getTrophicLevelClass = (trophicLevel: number): string => {
    switch (trophicLevel) {
      case -1: return 'trophic-decomposer';
      case 0: return 'trophic-producer';
      case 1: return 'trophic-primary';
      case 2: return 'trophic-secondary';
      case 3: return 'trophic-tertiary';
      default: return '';
    }
  };

  // Get the full card data for OrganismRenderer
  const getFullCardData = (): Card | null => {
    if (card.cardId) {
      const cardId = parseInt(card.cardId.toString());
      const speciesCard = allSpeciesCards.find(species => species.cardId === cardId);
      return speciesCard || null;
    }
    return null;
  };

  // Get localized name
  const getLocalizedName = (): string => {
    if (card.cardId) {
      const cardId = parseInt(card.cardId.toString());
      const speciesCard = allSpeciesCards.find(species => species.cardId === cardId);
      if (speciesCard?.nameId) {
        const localizedName = localization.getCardName(speciesCard.nameId as any);
        return localizedName?.slice(0, 8) || 'Card';
      }
    }
    return cardData?.nameId?.replace('CARD_', '').slice(0, 8) || 'Card';
  };

  if (card.isHOME) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '14px',
        borderRadius: '12px'
      }}>
        🏠
      </div>
    );
  }

  const fullCardData = getFullCardData();
  const trophicLevel = cardData?.trophicLevel || fullCardData?.trophicLevel || 0;
  const victoryPoints = cardData?.victoryPoints || fullCardData?.victoryPoints || 0;

  // Render different styles based on buttonStyle
  const renderStyle1 = () => (
    // Style 1: Compact Info Card (Original Enhanced)
    <div
      className={`enhanced-ecosystem-card style-1 ${getTrophicLevelClass(trophicLevel)}`}
      style={{
        width: '100%',
        height: '100%',
        background: card.ownerId === 'human'
          ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
          : 'linear-gradient(135deg, #ef4444, #dc2626)',
        borderRadius: '12px',
        padding: '2px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
      {/* Trophic Level Badge */}
      <div
        className={`trophic-badge ${getTrophicLevelClass(trophicLevel)}`}
        style={{
          position: 'absolute',
          top: '2px',
          left: '2px',
          background: getTrophicLevelColor(trophicLevel),
          color: 'white',
          fontSize: '6px',
          fontWeight: 'bold',
          padding: '1px 3px',
          borderRadius: '4px',
          zIndex: 10,
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.3)'
        }}>
        {getTrophicLevelDisplay(trophicLevel)}
      </div>

      {/* Victory Points Badge */}
      <div style={{
        position: 'absolute',
        top: '2px',
        right: '2px',
        background: 'rgba(255, 255, 255, 0.9)',
        color: '#333',
        fontSize: '6px',
        fontWeight: 'bold',
        padding: '1px 3px',
        borderRadius: '4px',
        zIndex: 10,
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
      }}>
        VP: {victoryPoints}
      </div>

      {/* Organism Renderer */}
      <div
        className="organism-container"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '10px',
          marginBottom: '2px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          margin: '12px 4px 4px 4px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
        {fullCardData ? (
          <OrganismRenderer
            card={fullCardData}
            size={36}
            className="grid-organism"
          />
        ) : (
          <div style={{
            width: '36px',
            height: '36px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px'
          }}>
            🦠
          </div>
        )}
      </div>

      {/* Card Name */}
      <div
        className="card-name"
        style={{
          fontSize: '7px',
          fontWeight: 'bold',
          color: 'white',
          textAlign: 'center',
          marginBottom: '2px',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)'
        }}>
        {getLocalizedName()}
      </div>

      {/* Style Switch Button */}
      <div style={{
        position: 'absolute',
        bottom: '2px',
        right: '2px',
        zIndex: 20
      }}>
        <IonButton
          size="small"
          fill="clear"
          style={{
            '--color': 'white',
            '--padding-start': '2px',
            '--padding-end': '2px',
            height: '12px',
            fontSize: '6px'
          }}
          onClick={() => {/* Style controlled by Settings */}}
        >
          <IonIcon icon={eye} style={{ fontSize: '8px' }} />
        </IonButton>
      </div>
    </div>
  );

  const renderStyle2 = () => (
    // Style 2: Minimalist Clean
    <div
      className={`enhanced-ecosystem-card style-2 ${getTrophicLevelClass(trophicLevel)}`}
      style={{
        width: '100%',
        height: '100%',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '8px',
        padding: '4px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        border: `2px solid ${getTrophicLevelColor(trophicLevel)}`
      }}>

      {/* Large Organism Display */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.02)',
        borderRadius: '4px',
        margin: '2px'
      }}>
        {fullCardData ? (
          <OrganismRenderer
            card={fullCardData}
            size={48}
            className="grid-organism-large"
          />
        ) : (
          <div style={{
            width: '48px',
            height: '48px',
            background: getTrophicLevelColor(trophicLevel),
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            color: 'white'
          }}>
            🦠
          </div>
        )}
      </div>

      {/* Bottom Info Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: getTrophicLevelColor(trophicLevel),
        color: 'white',
        padding: '1px 4px',
        borderRadius: '4px',
        fontSize: '6px',
        fontWeight: 'bold'
      }}>
        <span>{getTrophicLevelDisplay(trophicLevel)}</span>
        <span style={{ fontSize: '5px' }}>{getLocalizedName()}</span>
        <span>VP:{victoryPoints}</span>
      </div>

      {/* Style Switch Button */}
      <div style={{
        position: 'absolute',
        top: '2px',
        right: '2px',
        zIndex: 20
      }}>
        <IonButton
          size="small"
          fill="clear"
          style={{
            '--color': getTrophicLevelColor(trophicLevel),
            '--padding-start': '2px',
            '--padding-end': '2px',
            height: '12px',
            fontSize: '6px'
          }}
          onClick={() => {/* Style controlled by Settings */}}
        >
          <IonIcon icon={informationCircle} style={{ fontSize: '8px' }} />
        </IonButton>
      </div>
    </div>
  );

  const renderStyle3 = () => (
    // Style 3: Data-Focused Grid
    <div
      className={`enhanced-ecosystem-card style-3 ${getTrophicLevelClass(trophicLevel)}`}
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(45deg, #2a2a2a, #1a1a1a)',
        borderRadius: '6px',
        padding: '2px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: '1px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
        border: `1px solid ${getTrophicLevelColor(trophicLevel)}`
      }}>

      {/* Top Left: Organism */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '3px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        {fullCardData ? (
          <OrganismRenderer
            card={fullCardData}
            size={24}
            className="grid-organism-small"
          />
        ) : (
          <div style={{
            width: '20px',
            height: '20px',
            background: getTrophicLevelColor(trophicLevel),
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: 'white'
          }}>
            🦠
          </div>
        )}
      </div>

      {/* Top Right: Trophic Level */}
      <div style={{
        background: getTrophicLevelColor(trophicLevel),
        borderRadius: '3px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '8px',
        fontWeight: 'bold',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
      }}>
        {getTrophicLevelDisplay(trophicLevel)}
      </div>

      {/* Bottom Left: Name */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '3px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#333',
        fontSize: '5px',
        fontWeight: 'bold',
        textAlign: 'center',
        padding: '1px'
      }}>
        {getLocalizedName()}
      </div>

      {/* Bottom Right: Victory Points */}
      <div style={{
        background: 'linear-gradient(135deg, #ffd700, #ffb347)',
        borderRadius: '3px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#333',
        fontSize: '7px',
        fontWeight: 'bold',
        textShadow: '0 1px 1px rgba(255,255,255,0.5)'
      }}>
        VP:{victoryPoints}
      </div>

      {/* Style Switch Button */}
      <div style={{
        position: 'absolute',
        bottom: '1px',
        right: '1px',
        zIndex: 20
      }}>
        <div
          style={{
            width: '8px',
            height: '8px',
            background: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '2px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => {/* Style controlled by Settings */}}
        >
          <IonIcon icon={statsChart} style={{ fontSize: '4px', color: '#333' }} />
        </div>
      </div>
    </div>
  );

  const renderStyle4 = () => (
    // Style 4: Circular/Radial Design
    <div
      className={`enhanced-ecosystem-card style-4 ${getTrophicLevelClass(trophicLevel)}`}
      style={{
        width: '100%',
        height: '100%',
        background: `radial-gradient(circle, ${getTrophicLevelColor(trophicLevel)}22, transparent 70%)`,
        borderRadius: '50%',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'visible',
        boxShadow: `0 0 12px ${getTrophicLevelColor(trophicLevel)}44`,
        border: `2px solid ${getTrophicLevelColor(trophicLevel)}`
      }}>

      {/* Central Organism */}
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        border: `1px solid ${getTrophicLevelColor(trophicLevel)}`
      }}>
        {fullCardData ? (
          <OrganismRenderer
            card={fullCardData}
            size={32}
            className="grid-organism-circular"
          />
        ) : (
          <div style={{
            width: '32px',
            height: '32px',
            background: getTrophicLevelColor(trophicLevel),
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            color: 'white'
          }}>
            🦠
          </div>
        )}
      </div>

      {/* Trophic Level Arc */}
      <div style={{
        position: 'absolute',
        top: '-2px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: getTrophicLevelColor(trophicLevel),
        color: 'white',
        fontSize: '6px',
        fontWeight: 'bold',
        padding: '1px 4px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        zIndex: 10
      }}>
        {getTrophicLevelDisplay(trophicLevel)}
      </div>

      {/* Victory Points Arc */}
      <div style={{
        position: 'absolute',
        bottom: '-2px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(255, 255, 255, 0.95)',
        color: '#333',
        fontSize: '6px',
        fontWeight: 'bold',
        padding: '1px 4px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        zIndex: 10
      }}>
        VP:{victoryPoints}
      </div>

      {/* Name Arc */}
      <div style={{
        position: 'absolute',
        left: '-8px',
        top: '50%',
        transform: 'translateY(-50%) rotate(-90deg)',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        fontSize: '5px',
        fontWeight: 'bold',
        padding: '1px 3px',
        borderRadius: '6px',
        whiteSpace: 'nowrap',
        zIndex: 10
      }}>
        {getLocalizedName()}
      </div>

      {/* Style Switch Button */}
      <div style={{
        position: 'absolute',
        right: '-4px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 20
      }}>
        <div
          style={{
            width: '12px',
            height: '12px',
            background: getTrophicLevelColor(trophicLevel),
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            border: '1px solid white'
          }}
          onClick={() => {/* Style controlled by Settings */}}
        >
          <IonIcon icon={colorPalette} style={{ fontSize: '6px', color: 'white' }} />
        </div>
      </div>
    </div>
  );

  // Return the appropriate style based on buttonStyle
  switch (buttonStyle) {
    case 1:
      return renderStyle1();
    case 2:
      return renderStyle2();
    case 3:
      return renderStyle3();
    case 4:
      return renderStyle4();
    default:
      return renderStyle1();
  }
};

export default EnhancedEcosystemCard;
