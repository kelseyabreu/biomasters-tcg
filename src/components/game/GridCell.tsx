import React, { memo } from 'react';
import { ClientGridCard } from '../../types/ClientGameTypes';
import { Card } from '../../types';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useTheme } from '../../theme/ThemeProvider';
import EnhancedEcosystemCard from '../battle/EnhancedEcosystemCard';
import './GridCell.css';
import './GridCellStyles.css';

interface GridCellProps {
  x: number;
  y: number;
  card: ClientGridCard | null;
  cardData: Card | null;
  isValidPosition: boolean;
  onGridPositionClick: (x: number, y: number) => void;
  localization: ReturnType<typeof useLocalization>;
  allSpeciesCards: Card[];
  cellSize?: number;
  className?: string;
}

const GridCell: React.FC<GridCellProps> = ({
  x,
  y,
  card,
  cardData,
  isValidPosition,
  onGridPositionClick,
  localization,
  allSpeciesCards,
  cellSize = 60,
  className = ""
}) => {
  const { gridCellStyle } = useTheme();
  const positionKey = `${x},${y}`;
  const isHomePosition = card?.isHOME;

  const handleClick = () => {
    onGridPositionClick(x, y);
  };

  return (
    <div
      className={`grid-cell style-${gridCellStyle} ${card ? 'occupied' : 'empty'} ${isValidPosition ? 'highlighted' : ''} ${isHomePosition ? 'home-position' : ''} ${className}`}
      onClick={handleClick}
      style={{
        width: `${cellSize}px`,
        height: `${cellSize}px`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}
    >
      {card && (
        <EnhancedEcosystemCard
          card={card}
          cardData={cardData}
          localization={localization}
          allSpeciesCards={allSpeciesCards}
        />
      )}
      {isValidPosition && (
        <div style={{
          position: 'absolute',
          top: '2px',
          right: '2px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 'var(--ion-color-success)',
          border: '1px solid white'
        }} />
      )}
    </div>
  );
};

// Memoize GridCell to prevent unnecessary re-renders
export default memo(GridCell, (prevProps, nextProps) => {
  return (
    prevProps.x === nextProps.x &&
    prevProps.y === nextProps.y &&
    prevProps.card?.instanceId === nextProps.card?.instanceId &&
    prevProps.cardData?.cardId === nextProps.cardData?.cardId &&
    prevProps.isValidPosition === nextProps.isValidPosition &&
    prevProps.cellSize === nextProps.cellSize
  );
});
