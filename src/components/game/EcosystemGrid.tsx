import React, { useState, useRef, useEffect } from 'react';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonIcon } from '@ionic/react';
import { add, remove } from 'ionicons/icons';
import { motion } from 'framer-motion';
import { ClientGridCard, ClientGameSettings } from '../../types/ClientGameTypes';
import { Card } from '../../types';
import { useLocalization } from '../../contexts/LocalizationContext';
import GridCell from './GridCell';
import './EcosystemGrid.css';

interface EcosystemGridProps {
  // Grid configuration
  gameSettings: ClientGameSettings;
  grid: Map<string, ClientGridCard> | null;
  
  // Card data
  allSpeciesCards: Card[];
  getCardData: (instanceId: string) => Card | null;
  
  // Interaction handlers
  onGridPositionClick: (x: number, y: number) => void;
  
  // UI state
  highlightedPositions: Array<{ x: number; y: number; type?: string }>;
  
  // Optional props
  title?: string;
  className?: string;
  cellSize?: number;
  showTitle?: boolean;
  enablePanZoom?: boolean;
}

const EcosystemGrid: React.FC<EcosystemGridProps> = ({
  gameSettings,
  grid,
  allSpeciesCards,
  getCardData,
  onGridPositionClick,
  highlightedPositions,
  title = "Ecosystem Grid",
  className = "",
  cellSize = 60,
  showTitle = true,
  enablePanZoom = true
}) => {
  const localization = useLocalization();

  // Pan and zoom state
  const [zoom, setZoom] = useState(1);
  const [dragConstraints, setDragConstraints] = useState({ left: 0, right: 0, top: 0, bottom: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Zoom controls
  const handleZoomIn = () => {
    const newZoom = Math.min(zoom * 1.2, 3);
    setZoom(newZoom);
    updateDragConstraints(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom / 1.2, 0.5);
    setZoom(newZoom);
    updateDragConstraints(newZoom);
  };

  const updateDragConstraints = (currentZoom: number) => {
    if (!containerRef.current) return;

    const container = containerRef.current.getBoundingClientRect();

    // Calculate the actual grid dimensions including gaps
    const gridWidth = gameSettings.gridWidth * cellSize + (gameSettings.gridWidth - 1);
    const gridHeight = gameSettings.gridHeight * cellSize + (gameSettings.gridHeight - 1);

    // Calculate scaled dimensions
    const scaledWidth = gridWidth * currentZoom;
    const scaledHeight = gridHeight * currentZoom;

    // Calculate maximum drag distances with different buffers for each edge
    const bufferTop = container.height * 0.15;
    const bufferSides = container.width * 0.02;
    const bufferBottom = container.height * 0.02;

    const maxX = Math.max(0, (scaledWidth - container.width) / 2);
    const maxY = Math.max(0, (scaledHeight - container.height) / 2);

    const maxXWithBuffer = maxX + bufferSides;
    const maxYTopWithBuffer = maxY + bufferBottom; 
    const maxYBottomWithBuffer = maxY + bufferTop;

    setDragConstraints({
      left: -maxXWithBuffer,      
      right: maxXWithBuffer,     
      top: -maxYTopWithBuffer,    
      bottom: maxYBottomWithBuffer
    });
  };

  // Update drag constraints when zoom changes or component mounts
  useEffect(() => {
    if (enablePanZoom) {
      updateDragConstraints(zoom);
    }
  }, [zoom, enablePanZoom, gameSettings.gridWidth, gameSettings.gridHeight, cellSize]);

  // Generate grid cells
  const renderGridCells = () => {
    return Array.from({ length: gameSettings.gridHeight }, (_, y) =>
      Array.from({ length: gameSettings.gridWidth }, (_, x) => {
        const positionKey = `${x},${y}`;

        // Handle both Map and Object formats for grid
        let card = null;
        if (grid) {
          if (grid instanceof Map) {
            // Grid is a proper Map
            card = grid.get(positionKey);
          } else if (typeof grid === 'object') {
            // Grid is a plain object (serialized from server)
            card = (grid as any)[positionKey];
          }
        }

        const isValidPosition = highlightedPositions.some((pos: any) => pos.x === x && pos.y === y);
        
        return (
          <GridCell
            key={positionKey}
            x={x}
            y={y}
            card={card || null}
            cardData={card ? getCardData(card.instanceId) : null}
            isValidPosition={isValidPosition}
            onGridPositionClick={onGridPositionClick}
            localization={localization}
            allSpeciesCards={allSpeciesCards}
            cellSize={cellSize}
          />
        );
      })
    );
  };

  const gridContent = (
    <div
      ref={containerRef}
      className="ecosystem-grid-container"
      data-testid="ecosystem-grid"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '90vw',
        maxHeight: '70vh',
        overflow: 'hidden',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {enablePanZoom ? (
        <motion.div
          ref={gridRef}
          className={`ecosystem-grid ${className}`}
          drag
          dragConstraints={dragConstraints}
          dragElastic={0}
          dragMomentum={false}
          dragTransition={{ bounceStiffness: 0, bounceDamping: 0 }}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gameSettings.gridWidth}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${gameSettings.gridHeight}, ${cellSize}px)`,
            gap: '1px',
            width: `${gameSettings.gridWidth * cellSize + (gameSettings.gridWidth - 1)}px`, // Fixed width: cells + gaps
            height: `${gameSettings.gridHeight * cellSize + (gameSettings.gridHeight - 1)}px`, // Fixed height: cells + gaps
            minWidth: `${gameSettings.gridWidth * cellSize + (gameSettings.gridWidth - 1)}px`, // Prevent shrinking
            minHeight: `${gameSettings.gridHeight * cellSize + (gameSettings.gridHeight - 1)}px`,
            flexShrink: 0, // Prevent flex shrinking
            scale: zoom,
            cursor: 'grab'
          }}
          whileDrag={{ cursor: 'grabbing' }}
          onDragStart={() => updateDragConstraints(zoom)}
        >
          {renderGridCells()}
        </motion.div>
      ) : (
        <div
          className={`ecosystem-grid ${className}`}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gameSettings.gridWidth}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${gameSettings.gridHeight}, ${cellSize}px)`,
            gap: '1px',
            width: `${gameSettings.gridWidth * cellSize + (gameSettings.gridWidth - 1)}px`, // Fixed width: cells + gaps
            height: `${gameSettings.gridHeight * cellSize + (gameSettings.gridHeight - 1)}px`, // Fixed height: cells + gaps
            minWidth: `${gameSettings.gridWidth * cellSize + (gameSettings.gridWidth - 1)}px`, // Prevent shrinking
            minHeight: `${gameSettings.gridHeight * cellSize + (gameSettings.gridHeight - 1)}px`,
            flexShrink: 0 // Prevent flex shrinking
          }}
        >
          {renderGridCells()}
        </div>
      )}

      {/* Zoom Controls - Only show on mobile or when enablePanZoom is true */}
      {enablePanZoom && (
        <div className="mobile-zoom-controls">
          <IonButton
            fill="clear"
            size="small"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
          >
            <IonIcon icon={remove} />
          </IonButton>
          <span className="zoom-level">{Math.round(zoom * 100)}%</span>
          <IonButton
            fill="clear"
            size="small"
            onClick={handleZoomIn}
            disabled={zoom >= 3}
          >
            <IonIcon icon={add} />
          </IonButton>
        </div>
      )}
    </div>
  );

  // Return with or without card wrapper based on showTitle
  if (showTitle) {
    return (
      <IonCard className="game-grid-card">
        <IonCardHeader>
          <IonCardTitle>{title} ({gameSettings.gridWidth}x{gameSettings.gridHeight})</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          {gridContent}
        </IonCardContent>
      </IonCard>
    );
  }

  return gridContent;
};

export default EcosystemGrid;
