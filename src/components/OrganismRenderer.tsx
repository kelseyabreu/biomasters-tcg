import React, { useEffect, useRef, useState, memo, useMemo } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { add, remove, refresh } from 'ionicons/icons';
import { Card as CardType } from '../types';
import { useLocalization } from '../contexts/LocalizationContext';

// Import the organism models
import { organismModels } from '../ecosystem-organisms';

// Import image loading utilities
import { loadCardImage, createImageElement } from '../utils/imageLoader';





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
  const mountedRef = useRef(true);

  // State for zoom and pan
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Memoized organism data for performance
  const memoizedOrganismData = useMemo(() => {
    const localizedName = localization.getCardName(card.nameId as any);
    return {
      size: size,
      type: card.trophicRole?.toLowerCase() || 'unknown',
      species: card.nameId?.toLowerCase() || 'unknown',
      displayName: localizedName?.toLowerCase() || 'unknown',
      // Add variation based on card properties
      health: card.health || 1,
      power: card.power || 1,
      speed: card.speed || 1
    };
  }, [card.trophicRole, card.nameId, card.health, card.power, card.speed, localization, size]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Add a small delay to ensure DOM is fully rendered
    const renderOrganism = async () => {
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

      // 1. First, try to load PNG image
      try {
        const imageResult = await loadCardImage(card);
        if (imageResult.success && imageResult.imagePath) {
          const localizedName = localization.getCardName(card.nameId as any);
          const img = createImageElement(
            imageResult.imagePath,
            localizedName,
            'organism-image',
            undefined, // onLoad callback
            () => {
              // If PNG fails to load, fall back to DOM rendering
              renderDOMFallback();
            }
          );

          organismContent.appendChild(img);
          return; // Exit early if image loads successfully
        }
      } catch (error) {
        // Silently fall back to DOM rendering
      }

      // 2. Fall back to DOM rendering if no PNG image is available
      renderDOMFallback();

      function renderDOMFallback() {
        // Create organism data structure expected by the renderer
        const organism = memoizedOrganismData;

        // Find the appropriate organism renderer
        let renderer = null;
        const speciesKey = getSpeciesKey(card);

        // 2a. Try exact species name match using nameId
        if (organismModels[speciesKey]) {
          renderer = organismModels[speciesKey];
        }

        // 2b. Fall back to trophic role if no specific model exists
        if (!renderer && card.trophicRole) {
          // Convert TrophicRole enum to lowercase string for organism model lookup
          const trophicKey = card.trophicRole.toLowerCase();
          if (organismModels[trophicKey]) {
            renderer = organismModels[trophicKey];
          }
        }

        // 2c. Final fallback
        if (!renderer) {
          renderer = organismModels.herbivore || organismModels.unknown; // Default fallback
        }

        try {
          // Render the organism using DOM rendering
          const renderedElement = renderer.render(organism, organismContent);

          if (renderedElement) {
            organismContent.appendChild(renderedElement);
          } else {
            createFallback(organismContent);
          }
        } catch (error) {
          // Fallback to simple representation
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
    const timeoutId = setTimeout(() => {
      if (mountedRef.current) {
        renderOrganism().catch(() => {
          // Silently handle errors - fallback rendering will be used
        });
      }
    }, 10);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [card, size, memoizedOrganismData, localization]);

  // Component lifecycle tracking
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Cancel any pending image loads
      if (containerRef.current) {
        const images = containerRef.current.querySelectorAll('img');
        images.forEach(img => {
          img.src = ''; // Cancel loading
        });
      }
    };
  }, []);

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

// Memoize OrganismRenderer to prevent unnecessary re-renders
export default memo(OrganismRenderer, (prevProps, nextProps) => {
  return (
    prevProps.card.cardId === nextProps.card.cardId &&
    prevProps.size === nextProps.size &&
    prevProps.showControls === nextProps.showControls &&
    prevProps.className === nextProps.className
  );
});
