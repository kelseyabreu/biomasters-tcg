import React, { useState, useRef, useCallback, useEffect } from 'react';
import { IonContent, IonButton, IonIcon, IonToast } from '@ionic/react';
import { addOutline, removeOutline, refreshOutline, homeOutline } from 'ionicons/icons';
import { Card, PhyloCardPosition } from '../../types';
import type { PhyloGameBoard } from '../../types';
import { validateCardPlacement } from '../../game-logic/phyloCompatibility';
import { useLocalization } from '../../contexts/LocalizationContext';
import './PhyloGameBoard.css';

interface PhyloGameBoardProps {
  gameBoard: PhyloGameBoard;
  cards: Map<string, Card>; // cardId -> Card
  selectedCard?: Card;
  onCardPlace: (position: { x: number; y: number }, card: Card) => void;
  onCardSelect: (cardId: string) => void;
  onCardMove: (cardId: string, newPosition: { x: number; y: number }) => void;
  isPlayerTurn: boolean;
  currentPlayerId: string;
}

interface ViewportState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const GRID_SIZE = 60; // Size of each grid cell in pixels
const MIN_SCALE = 0.3;
const MAX_SCALE = 2.0;
const SCALE_STEP = 0.2;

export const PhyloGameBoardComponent: React.FC<PhyloGameBoardProps> = ({
  gameBoard,
  cards,
  selectedCard,
  onCardPlace,
  onCardSelect,
  onCardMove,
  isPlayerTurn,
  currentPlayerId
}) => {
  const localization = useLocalization();
  const [viewport, setViewport] = useState<ViewportState>({
    scale: 1.0,
    offsetX: 0,
    offsetY: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [draggedCard, setDraggedCard] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLIonContentElement>(null);

  // Calculate board bounds based on placed cards
  const getBoardBounds = useCallback(() => {
    if (gameBoard.positions.size === 0) {
      return { minX: -5, maxX: 5, minY: -5, maxY: 5 };
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    gameBoard.positions.forEach(position => {
      minX = Math.min(minX, position.x);
      maxX = Math.max(maxX, position.x);
      minY = Math.min(minY, position.y);
      maxY = Math.max(maxY, position.y);
    });

    // Add padding around the cards
    return {
      minX: minX - 3,
      maxX: maxX + 3,
      minY: minY - 3,
      maxY: maxY + 3
    };
  }, [gameBoard.positions]);

  // Convert screen coordinates to grid coordinates
  const screenToGrid = useCallback((screenX: number, screenY: number) => {
    if (!boardRef.current) return { x: 0, y: 0 };

    const rect = boardRef.current.getBoundingClientRect();
    const relativeX = (screenX - rect.left - viewport.offsetX) / viewport.scale;
    const relativeY = (screenY - rect.top - viewport.offsetY) / viewport.scale;

    const gridX = Math.round(relativeX / GRID_SIZE);
    const gridY = Math.round(relativeY / GRID_SIZE);

    return { x: gridX, y: gridY };
  }, [viewport]);

  // Convert grid coordinates to screen coordinates
  const gridToScreen = useCallback((gridX: number, gridY: number) => {
    return {
      x: gridX * GRID_SIZE,
      y: gridY * GRID_SIZE
    };
  }, []);

  // Get adjacent cards for a given position
  const getAdjacentCards = useCallback((x: number, y: number): Card[] => {
    const adjacentPositions = [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 }
    ];

    const adjacentCards: Card[] = [];

    adjacentPositions.forEach(pos => {
      const positionKey = `${pos.x},${pos.y}`;
      const cardPosition = gameBoard.positions.get(positionKey);
      if (cardPosition) {
        const card = cards.get(cardPosition.cardId);
        if (card) {
          adjacentCards.push(card);
        }
      }
    });

    return adjacentCards;
  }, [gameBoard.positions, cards]);

  // Handle card placement
  const handleCellClick = useCallback((gridX: number, gridY: number) => {
    if (!selectedCard || !isPlayerTurn) return;

    const positionKey = `${gridX},${gridY}`;

    // Check if position is already occupied
    if (gameBoard.positions.has(positionKey)) {
      setToastMessage('Position already occupied');
      setShowToast(true);
      return;
    }

    // Get adjacent cards for validation
    const adjacentCards = getAdjacentCards(gridX, gridY);

    // Validate placement
    const validation = validateCardPlacement(selectedCard, adjacentCards);

    if (!validation.isValid) {
      setToastMessage(validation.errorMessage || 'Invalid placement');
      setShowToast(true);
      return;
    }

    // Place the card
    onCardPlace({ x: gridX, y: gridY }, selectedCard);
  }, [selectedCard, isPlayerTurn, gameBoard.positions, getAdjacentCards, onCardPlace]);

  // Handle zoom controls
  const handleZoom = useCallback((direction: 'in' | 'out') => {
    setViewport(prev => ({
      ...prev,
      scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE,
        prev.scale + (direction === 'in' ? SCALE_STEP : -SCALE_STEP)
      ))
    }));
  }, []);

  // Reset view to center
  const resetView = useCallback(() => {
    setViewport({
      scale: 1.0,
      offsetX: 0,
      offsetY: 0
    });
  }, []);

  // Handle pan/drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX - viewport.offsetX, y: e.clientY - viewport.offsetY });
    }
  }, [viewport.offsetX, viewport.offsetY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setViewport(prev => ({
        ...prev,
        offsetX: e.clientX - dragStart.x,
        offsetY: e.clientY - dragStart.y
      }));
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handling for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - viewport.offsetX, y: touch.clientY - viewport.offsetY });
    }
  }, [viewport.offsetX, viewport.offsetY]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      setViewport(prev => ({
        ...prev,
        offsetX: touch.clientX - dragStart.x,
        offsetY: touch.clientY - dragStart.y
      }));
    }
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Render grid cells
  const renderGrid = useCallback(() => {
    const bounds = getBoardBounds();
    const cells = [];

    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        const screenPos = gridToScreen(x, y);
        const positionKey = `${x},${y}`;
        const isOccupied = gameBoard.positions.has(positionKey);
        const isValidPlacement = selectedCard && isPlayerTurn ?
          validateCardPlacement(selectedCard, getAdjacentCards(x, y)).isValid : false;

        cells.push(
          <div
            key={positionKey}
            className={`grid-cell ${isOccupied ? 'occupied' : ''} ${isValidPlacement ? 'valid-placement' : ''}`}
            style={{
              left: screenPos.x,
              top: screenPos.y,
              width: GRID_SIZE,
              height: GRID_SIZE
            }}
            onClick={() => handleCellClick(x, y)}
          />
        );
      }
    }

    return cells;
  }, [getBoardBounds, gridToScreen, gameBoard.positions, selectedCard, isPlayerTurn, getAdjacentCards, handleCellClick]);

  // Render placed cards
  const renderCards = useCallback(() => {
    const cardElements: React.ReactElement[] = [];

    gameBoard.positions.forEach((position, positionKey) => {
      const card = cards.get(position.cardId);
      if (!card) return;

      const screenPos = gridToScreen(position.x, position.y);
      const isPlayerCard = position.playerId === currentPlayerId;
      const canMove = isPlayerCard && isPlayerTurn && (card.phyloAttributes?.movementCapability.moveValue || 0) > 0;

      // Get localized card name
      const displayName = localization.getCardName(card.nameId as any);

      cardElements.push(
        <div
          key={position.cardId}
          className={`placed-card ${isPlayerCard ? 'player-card' : 'opponent-card'} ${canMove ? 'moveable' : ''}`}
          style={{
            left: screenPos.x + 5,
            top: screenPos.y + 5,
            width: GRID_SIZE - 10,
            height: GRID_SIZE - 10
          }}
          onClick={() => onCardSelect(position.cardId)}
          draggable={canMove}
          onDragStart={() => setDraggedCard(position.cardId)}
          onDragEnd={() => setDraggedCard(null)}
        >
          <div className="card-mini">
            <div className="card-name">{displayName}</div>
            <div className="card-stats">
              <span className="foodchain-level">FC{card.phyloAttributes?.foodchainLevel}</span>
              <span className="scale">S{card.phyloAttributes?.scale}</span>
            </div>
            <div className="diet-type">{card.phyloAttributes?.dietType}</div>
          </div>
        </div>
      );
    });

    return cardElements;
  }, [gameBoard.positions, cards, gridToScreen, currentPlayerId, isPlayerTurn, onCardSelect]);

  return (
    <div className="phylo-game-board">
      {/* Control Panel */}
      <div className="board-controls">
        <IonButton size="small" fill="clear" onClick={() => handleZoom('in')}>
          <IonIcon icon={addOutline} />
        </IonButton>
        <IonButton size="small" fill="clear" onClick={() => handleZoom('out')}>
          <IonIcon icon={removeOutline} />
        </IonButton>
        <IonButton size="small" fill="clear" onClick={resetView}>
          <IonIcon icon={homeOutline} />
        </IonButton>
        <span className="zoom-level">{Math.round(viewport.scale * 100)}%</span>
      </div>

      {/* Game Board */}
      <div
        ref={boardRef}
        className={`board-container ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="board-viewport"
          style={{
            transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.scale})`,
            transformOrigin: '0 0'
          }}
        >
          {/* Grid */}
          <div className="grid-layer">
            {renderGrid()}
          </div>

          {/* Cards */}
          <div className="cards-layer">
            {renderCards()}
          </div>
        </div>
      </div>

      {/* Toast for feedback */}
      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={2000}
        position="bottom"
      />
    </div>
  );
};

export default PhyloGameBoardComponent;