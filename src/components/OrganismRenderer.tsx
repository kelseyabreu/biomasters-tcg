import React, { useEffect, useRef, useState } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { add, remove, refresh } from 'ionicons/icons';
import { Card as CardType } from '../types';
import { useLocalization } from '../contexts/LocalizationContext';
import { getCardDisplayName } from '@shared/utils/cardIdHelpers';

// Import the organism models
import { organismModels } from '../ecosystem-organisms';

interface OrganismRendererProps {
  card: CardType;
  size?: number;
  className?: string;
  showControls?: boolean;
}

// Removed legacy SpeciesData interface and loadSpeciesData function
// All rendering information should come from the centralized card data

// Get species key for organism model lookup
const getSpeciesKey = (card: CardType): string => {
  // Simple conversion: use nameId directly as the organism model key
  // This assumes organism models use the same nameId format as cards
  return card.nameId;
};

const OrganismRenderer: React.FC<OrganismRendererProps> = ({
  card,
  size = 100,
  className = '',
  showControls = false
}) => {
  const localization = useLocalization();
  const containerRef = useRef<HTMLDivElement>(null);
  const organismRef = useRef<HTMLDivElement>(null);

  // State for zoom and pan
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    // Add a small delay to ensure DOM is fully rendered
    const renderOrganism = async () => {
      // Get localized names
      const localizedName = localization.getCardName(card.nameId as any);

      // Create organism data structure expected by the renderer
      const organism = {
        size: size,
        type: card.trophicRole.toLowerCase(),
        species: card.nameId.toLowerCase(),
        displayName: localizedName.toLowerCase(),
        // Add variation based on card properties
        health: card.health,
        power: card.power,
        speed: card.speed
      };

      // Find the appropriate organism renderer
      let renderer = null;
      const speciesKey = getSpeciesKey(card);

      // 1. Try exact species name match using nameId
      if (organismModels[speciesKey]) {
        renderer = organismModels[speciesKey];
      }

      // 2. Fall back to trophic role if no specific model exists
      if (!renderer) {
        const trophicKey = card.trophicRole.toLowerCase();
        if (organismModels[trophicKey]) {
          renderer = organismModels[trophicKey];
        }
      }

      // 3. Final fallback
      if (!renderer) {
        renderer = organismModels.herbivore; // Default fallback
      }

      try {
        // Get the organism content container
        let organismContent = containerRef.current?.querySelector('.organism-content') as HTMLElement;

        if (!organismContent && organismRef.current) {
          organismContent = organismRef.current;
        }

        if (!organismContent) {
          // Create the organism-content div if it doesn't exist
          organismContent = document.createElement('div');
          organismContent.className = 'organism-content';
          organismContent.style.width = '100%';
          organismContent.style.height = '100%';
          organismContent.style.position = 'relative';
          containerRef.current?.appendChild(organismContent);
        }

        // Clear previous content
        organismContent.innerHTML = '';

        // Render the organism
        const renderedElement = renderer.render(organism, organismContent);

        if (renderedElement) {
          organismContent.appendChild(renderedElement);
        } else {
          createFallback(organismContent);
        }
      } catch (error) {
        console.warn('Error rendering organism:', error);

        // Fallback to simple representation
        const organismContent = containerRef.current?.querySelector('.organism-content') as HTMLElement;
        if (organismContent) {
          createFallback(organismContent);
        }
      }

      function createFallback(container: HTMLElement) {
        const fallback = document.createElement('div');
        fallback.style.width = '100%';
        fallback.style.height = '100%';
        fallback.style.backgroundColor = '#ccc';
        fallback.style.borderRadius = '50%';
        fallback.style.display = 'flex';
        fallback.style.alignItems = 'center';
        fallback.style.justifyContent = 'center';
        fallback.style.fontSize = '24px';
        fallback.style.fontWeight = 'bold';
        fallback.style.color = '#666';
        const localizedName = localization.getCardName(card.nameId as any);
        fallback.textContent = localizedName.charAt(0).toUpperCase();
        container.appendChild(fallback);
      }
    };

    // Call renderOrganism with a small delay to ensure DOM is ready
    setTimeout(() => {
      renderOrganism().catch(error => {
        console.warn('Error in renderOrganism:', error);
      });
    }, 10);
  }, [card, size]);

  // Zoom functions
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.5));
  };

  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  // Drag functions
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!showControls) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !showControls) return;
    e.preventDefault();
    e.stopPropagation();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch event handlers for mobile support
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !showControls) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    // Add touch event listeners with passive: false to allow preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [showControls, isDragging, position.x, position.y, dragStart.x, dragStart.y]);

  return (
    <div className={`organism-renderer-wrapper ${className}`}>
      {showControls && (
        <div className="organism-controls">
          <IonButton size="small" fill="clear" onClick={handleZoomIn}>
            <IonIcon icon={add} />
          </IonButton>
          <IonButton size="small" fill="clear" onClick={handleZoomOut}>
            <IonIcon icon={remove} />
          </IonButton>
          <IonButton size="small" fill="clear" onClick={handleReset} title="Reset position and zoom">
            <IonIcon icon={refresh} />
          </IonButton>
          <span className="zoom-indicator">{Math.round(zoom * 100)}%</span>


        </div>
      )}

      <div
        ref={containerRef}
        className={`organism-renderer ${showControls ? 'interactive' : ''}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          position: 'relative',
          overflow: 'hidden',
          cursor: showControls ? (isDragging ? 'grabbing' : 'grab') : 'default'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          ref={organismRef}
          className="organism-content"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.2s ease',
            width: '100%',
            height: '100%',
            position: 'relative'
          }}
        />
      </div>
    </div>
  );
};

export default OrganismRenderer;
