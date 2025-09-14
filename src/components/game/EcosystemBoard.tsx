import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardContent, IonButton, IonIcon } from '@ionic/react';
import { add, remove } from 'ionicons/icons';
import { PhyloGameBoard, PhyloCardPosition, Card } from '../../types';
import { CardMovementAnimator } from './CardMovementAnimator';
import { MovementAnimation } from '../../game-logic/cardMovement';
import OrganismRenderer from '../OrganismRenderer';
import { useLocalization } from '../../contexts/LocalizationContext';
import './EcosystemBoard.css';

interface EcosystemBoardProps {
  gameBoard: PhyloGameBoard;
  cards: Map<string, Card>;
  onCardPlace: (position: { x: number; y: number }, cardId: string) => void;
  onCardMove: (cardId: string, newPosition: { x: number; y: number }) => void;
  currentAnimation?: MovementAnimation | null;
  isInteractive: boolean;
  highlightedPositions?: Array<{ x: number; y: number; type?: 'valid' | 'invalid' }>;
  gridSize?: number;
  selectedCard?: Card | null;
  onPositionClick?: (position: { x: number; y: number }) => void;
  // Mobile-specific props
  isMobile?: boolean;
  selectedBoardCardId?: string | null;
  actionMode?: 'place' | 'move';
}

export const EcosystemBoard: React.FC<EcosystemBoardProps> = ({
  gameBoard,
  cards,
  onCardPlace,
  onCardMove,
  currentAnimation,
  isInteractive,
  highlightedPositions = [],
  gridSize = 120,
  selectedCard,
  onPositionClick,
  isMobile = false,
  selectedBoardCardId,
  actionMode = 'place'
}) => {
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [connectionLines, setConnectionLines] = useState<Array<{ from: { x: number; y: number }, to: { x: number; y: number }, strength: number }>>([]);
  const boardRef = useRef<HTMLDivElement>(null);

  // Mobile-specific state
  const [boardScale, setBoardScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);

  // Responsive grid size
  const responsiveGridSize = isMobile ? Math.max(60, gridSize * 0.7) : gridSize;

  // Motion values for pan and zoom
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);

  // Transform for smooth interactions
  const rotateX = useTransform(y, [-100, 100], [2, -2]);
  const rotateY = useTransform(x, [-100, 100], [-2, 2]);

  // Fixed 9x10 grid dimensions
  const BOARD_ROWS = 9;
  const BOARD_COLS = 10;
  const minX = 0;
  const maxX = BOARD_COLS - 1;
  const minY = 0;
  const maxY = BOARD_ROWS - 1;

  const boardWidth = BOARD_COLS * gridSize;
  const boardHeight = BOARD_ROWS * gridSize;

  // Update connection lines when board changes
  useEffect(() => {
    const lines: Array<{ from: { x: number; y: number }, to: { x: number; y: number }, strength: number }> = [];
    
    gameBoard.connections.forEach((connectedIds, cardId) => {
      const cardPosition = Array.from(gameBoard.positions.values()).find(p => p.cardId === cardId);
      if (!cardPosition) return;

      connectedIds.forEach(connectedId => {
        const connectedPosition = Array.from(gameBoard.positions.values()).find(p => p.cardId === connectedId);
        if (!connectedPosition) return;

        // Calculate connection strength based on compatibility
        const card1 = cards.get(cardId);
        const card2 = cards.get(connectedId);
        let strength = 0.5;

        if (card1 && card2) {
          // Stronger connections for food chain relationships
          const foodchainDiff = Math.abs((card1.phyloAttributes?.foodchainLevel || 1) - (card2.phyloAttributes?.foodchainLevel || 1));
          if (foodchainDiff === 1) strength = 1.0; // Direct food chain connection
          else if (foodchainDiff === 0) strength = 0.7; // Same trophic level
        }

        lines.push({
          from: {
            x: cardPosition.x * gridSize + gridSize / 2,
            y: cardPosition.y * gridSize + gridSize / 2
          },
          to: {
            x: connectedPosition.x * gridSize + gridSize / 2,
            y: connectedPosition.y * gridSize + gridSize / 2
          },
          strength
        });
      });
    });

    setConnectionLines(lines);
  }, [gameBoard, cards, minX, minY, gridSize]);

  const handleCardDragStart = (cardId: string) => {
    if (!isInteractive) return;
    setDraggedCard(cardId);
  };

  const handleCardDragEnd = (cardId: string, newX: number, newY: number) => {
    if (!isInteractive || !draggedCard) return;

    const gridX = Math.max(0, Math.min(BOARD_COLS - 1, Math.round((newX - gridSize / 2) / gridSize)));
    const gridY = Math.max(0, Math.min(BOARD_ROWS - 1, Math.round((newY - gridSize / 2) / gridSize)));

    onCardMove(cardId, { x: gridX, y: gridY });
    setDraggedCard(null);
  };

  const handleGridCellClick = (gridX: number, gridY: number) => {
    console.log('🎯 EcosystemBoard handleGridCellClick called:', {
      gridX,
      gridY,
      isInteractive,
      isMobile,
      hasPositionClickHandler: !!onPositionClick
    });

    if (!isInteractive) {
      console.log('❌ Board not interactive, ignoring click');
      return;
    }

    // Call the position click handler if provided
    if (onPositionClick) {
      console.log('✅ Calling onPositionClick handler');
      onPositionClick({ x: gridX, y: gridY });
    } else {
      console.log('❌ No onPositionClick handler provided');
    }
  };

  // Handle board card click (for movement mode)
  const handleBoardCardClick = (cardId: string, position: { x: number; y: number }) => {
    if (!isInteractive || actionMode !== 'move') return;

    console.log('🎯 Board card clicked for movement:', cardId, 'at', position);

    // Call position click to handle board card selection
    if (onPositionClick) {
      onPositionClick(position);
    }
  };

  // Handle pan gestures for both mobile and desktop
  const handlePan = (event: any, info: PanInfo) => {
    setIsPanning(true);
    // For mobile, use motion values; for desktop, let Framer Motion handle it
    if (isMobile) {
      x.set(info.offset.x);
      y.set(info.offset.y);
    }
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  // Handle zoom for mobile
  const handleZoom = (delta: number) => {
    if (!isMobile) return;

    const newScale = Math.max(0.5, Math.min(2, boardScale + delta));
    setBoardScale(newScale);
  };

  const getCardAtPosition = (x: number, y: number): PhyloCardPosition | null => {
    return Array.from(gameBoard.positions.values()).find(p => p.x === x && p.y === y) || null;
  };

  const isPositionHighlighted = (x: number, y: number): { highlighted: boolean; type?: 'valid' | 'invalid' } => {
    const highlight = highlightedPositions.find(pos => pos.x === x && pos.y === y);
    return {
      highlighted: !!highlight,
      type: highlight?.type
    };
  };

  const getTerrainClass = (card: Card | undefined): string => {
    if (!card) return 'terrain-unknown';
    const terrain = card.phyloAttributes?.terrains?.[0] || 'unknown';
    return `terrain-${terrain.toLowerCase()}`;
  };

  const getClimateClass = (card: Card | undefined): string => {
    if (!card) return 'climate-unknown';
    const climate = card.phyloAttributes?.climates?.[0] || 'unknown';
    return `climate-${climate.toLowerCase()}`;
  };

  return (
    <IonContent className={`ecosystem-board-container ${isMobile ? 'mobile' : 'desktop'}`}>
      {/* Mobile Zoom Controls */}
      {isMobile && (
        <div className="mobile-zoom-controls">
          <IonButton
            fill="clear"
            size="small"
            onClick={() => handleZoom(-0.2)}
            disabled={boardScale <= 0.5}
          >
            <IonIcon icon={remove} />
          </IonButton>
          <span className="zoom-level">{Math.round(boardScale * 100)}%</span>
          <IonButton
            fill="clear"
            size="small"
            onClick={() => handleZoom(0.2)}
            disabled={boardScale >= 2}
          >
            <IonIcon icon={add} />
          </IonButton>
        </div>
      )}

      <motion.div
        ref={boardRef}
        className={`ecosystem-board ${isMobile ? 'mobile' : 'desktop'}`}
        style={{
          width: boardWidth,
          height: boardHeight,
          rotateX: isMobile ? 0 : rotateX,
          rotateY: isMobile ? 0 : rotateY,
          scale: isMobile ? boardScale : scale,
          x: isMobile ? x : 0,
          y: isMobile ? y : 0
        }}
        drag={isInteractive}
        dragConstraints={{ left: -400, right: 400, top: -400, bottom: 400 }}
        dragElastic={0.1}
        whileHover={{ scale: isMobile ? boardScale : 1.02 }}
        whileTap={{ scale: isMobile ? boardScale : 0.98 }}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
      >
        {/* Connection Lines SVG Overlay */}
        <svg
          className="connection-lines"
          width={boardWidth}
          height={boardHeight}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {connectionLines.map((line, index) => (
            <motion.line
              key={index}
              x1={line.from.x}
              y1={line.from.y}
              x2={line.to.x}
              y2={line.to.y}
              stroke={`rgba(34, 197, 94, ${line.strength})`}
              strokeWidth={2 + line.strength * 2}
              filter="url(#glow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: line.strength }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          ))}
        </svg>

        {/* 9x10 Grid Cells */}
        {Array.from({ length: BOARD_ROWS }, (_, rowIndex) => {
          const y = rowIndex;
          return Array.from({ length: BOARD_COLS }, (_, colIndex) => {
            const x = colIndex;
            const cardAtPosition = getCardAtPosition(x, y);
            const highlightInfo = isPositionHighlighted(x, y);
            const isHomePosition = gameBoard.homeCards.some(home => home.x === x && home.y === y);

            // Determine background color based on highlight type
            let backgroundColor = 'transparent';
            let borderColor = '1px solid rgba(255, 255, 255, 0.1)';

            if (isHomePosition) {
              backgroundColor = 'rgba(255, 215, 0, 0.2)';
              borderColor = '2px solid gold';
            } else if (highlightInfo.highlighted) {
              if (highlightInfo.type === 'valid') {
                backgroundColor = 'rgba(34, 197, 94, 0.3)'; // Green for valid
                borderColor = '2px solid #22c55e';
              } else if (highlightInfo.type === 'invalid') {
                backgroundColor = 'rgba(239, 68, 68, 0.3)'; // Red for invalid
                borderColor = '2px solid #ef4444';
              }
            }

            return (
              <motion.div
                key={`${x}-${y}`}
                className={`grid-cell ${highlightInfo.highlighted ? 'highlighted' : ''} ${cardAtPosition ? 'occupied' : 'empty'} ${isHomePosition ? 'home-position' : ''} ${highlightInfo.type || ''}`}
                style={{
                  left: x * responsiveGridSize,
                  top: y * responsiveGridSize,
                  width: responsiveGridSize,
                  height: responsiveGridSize,
                  backgroundColor,
                  border: borderColor,
                  cursor: isInteractive && !cardAtPosition ? 'pointer' : 'default'
                }}
                whileHover={{
                  scale: isInteractive && !cardAtPosition ? 1.05 : 1,
                  backgroundColor: isInteractive && !cardAtPosition ? 'rgba(59, 130, 246, 0.1)' : (backgroundColor === 'transparent' ? 'rgba(0, 0, 0, 0)' : backgroundColor)
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleGridCellClick(x, y)}
                onHoverStart={() => setHoverPosition({ x, y })}
                onHoverEnd={() => setHoverPosition(null)}
              >
                {cardAtPosition && (
                  <CardMovementAnimator
                    animation={currentAnimation?.cardId === cardAtPosition.cardId ? currentAnimation : null}
                    onAnimationComplete={() => {}}
                    gridSize={gridSize}
                  >
                    <motion.div
                      className={`ecosystem-card ${getTerrainClass(cards.get(cardAtPosition.cardId))} ${getClimateClass(cards.get(cardAtPosition.cardId))} ${selectedBoardCardId === cardAtPosition.cardId ? 'board-selected' : ''}`}
                      drag={isInteractive && !isMobile}
                      dragConstraints={boardRef}
                      onDragStart={() => handleCardDragStart(cardAtPosition.cardId)}
                      onDragEnd={(_, info) => handleCardDragEnd(cardAtPosition.cardId, info.point.x, info.point.y)}
                      onClick={() => handleBoardCardClick(cardAtPosition.cardId, { x, y })}
                      whileHover={{
                        scale: isMobile ? 1.05 : 1.1,
                        zIndex: 10,
                        boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
                      }}
                      whileDrag={{
                        scale: isMobile ? 1.1 : 1.2,
                        zIndex: 20,
                        rotate: 5,
                        boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
                      }}
                      initial={{ scale: 0, rotate: 180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: -180 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 300, 
                        damping: 20,
                        duration: 0.6
                      }}
                    >
                      <EcosystemCardContent card={cards.get(cardAtPosition.cardId)} />
                    </motion.div>
                  </CardMovementAnimator>
                )}

                {/* Placement Preview */}
                {hoverPosition?.x === x && hoverPosition?.y === y && !cardAtPosition && isInteractive && (
                  <motion.div
                    className="placement-preview"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.6, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  />
                )}
              </motion.div>
            );
          });
        })}

        {/* Ecosystem Health Indicator */}
        <motion.div
          className="ecosystem-health"
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 100
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <EcosystemHealthIndicator gameBoard={gameBoard} cards={cards} />
        </motion.div>
      </motion.div>
    </IonContent>
  );
};

// Helper component for card content
const EcosystemCardContent: React.FC<{ card: Card | undefined }> = ({ card }) => {
  const localization = useLocalization();

  if (!card) {
    return (
      <div className="card-content">
        <div className="card-image">
          <div style={{ width: '60px', height: '60px', backgroundColor: '#ccc', borderRadius: '50%' }} />
        </div>
        <div className="card-info">
          <h4>Unknown Species</h4>
          <div className="card-stats">
            <span className="foodchain">FC: 0</span>
            <span className="scale">Scale: 0</span>
            <span className="points">Pts: 0</span>
          </div>
        </div>
      </div>
    );
  }

  // Get localized card name
  const displayName = localization.getCardName(card.nameId as any);

  return (
    <div className="card-content">
      <div className="card-image">
        <OrganismRenderer
          card={card}
          size={60}
          showControls={false}
        />
      </div>
      <div className="card-info">
        <h4>{displayName}</h4>
        <div className="card-stats">
          <span className="foodchain">FC: {card.phyloAttributes?.foodchainLevel}</span>
          <span className="scale">Scale: {card.phyloAttributes?.scale}</span>
          <span className="points">Pts: {card.phyloAttributes?.pointValue}</span>
        </div>
      </div>
    </div>
  );
};

// Helper component for ecosystem health
const EcosystemHealthIndicator: React.FC<{ gameBoard: PhyloGameBoard; cards: Map<string, Card> }> = React.memo(({ gameBoard, cards }) => {
  // Memoized ecosystem health calculations
  const healthData = useMemo(() => {
    console.log('🧮 Calculating ecosystem health (memoized)');

    const totalCards = gameBoard.positions.size;
    const totalConnections = Array.from(gameBoard.connections.values()).reduce((sum, connections) => sum + connections.length, 0);
    const connectionDensity = totalCards > 0 ? totalConnections / totalCards : 0;

    const health = Math.min(100, connectionDensity * 20 + totalCards * 2);
    const healthColor = health > 70 ? '#22c55e' : health > 40 ? '#f59e0b' : '#ef4444';

    return {
      totalCards,
      totalConnections,
      connectionDensity,
      health,
      healthColor
    };
  }, [gameBoard.positions.size, gameBoard.connections]);

  const { health, healthColor } = healthData;

  return (
    <motion.div
      className="health-indicator"
      style={{
        background: `conic-gradient(${healthColor} ${health * 3.6}deg, rgba(255,255,255,0.2) 0deg)`,
        borderRadius: '50%',
        width: 60,
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '12px'
      }}
      animate={{ rotate: 0 }}
      transition={{ duration: 0.3 }}
    >
      {Math.round(health)}%
    </motion.div>
  );
});
