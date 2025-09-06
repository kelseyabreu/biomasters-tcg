import React, { useEffect, useRef, useState } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { add, remove, refresh } from 'ionicons/icons';
import { Card as CardType } from '../types';
import { CommonName, SPECIES_DISPLAY_NAMES } from '@shared/enums';

// Import the organism models
import { organismModels } from '../ecosystem-organisms';

interface OrganismRendererProps {
  card: CardType;
  size?: number;
  className?: string;
  showControls?: boolean;
}

interface SpeciesData {
  identity: {
    commonName: string;
    scientificName: string;
    speciesName: string;
  };
  rendering: {
    modelFile: string;
    scale: number;
  };
}

// Cache for loaded species data
const speciesDataCache = new Map<string, SpeciesData>();

// Function to load species data from public/species/ files
const loadSpeciesData = async (speciesName: string): Promise<SpeciesData | null> => {
  if (speciesDataCache.has(speciesName)) {
    return speciesDataCache.get(speciesName)!;
  }

  try {
    const response = await fetch(`/species/${speciesName}.json`);
    if (response.ok) {
      const data = await response.json();
      speciesDataCache.set(speciesName, data);
      return data;
    }
  } catch (error) {
    console.warn(`Failed to load species data for ${speciesName}:`, error);
  }

  return null;
};

// Enhanced species mapping using CommonName enum
const getSpeciesKey = (card: CardType): string => {
  // First try to map to CommonName enum values
  const commonNameLower = card.commonName.toLowerCase().replace(/[^a-z]/g, '');
  const speciesNameLower = card.speciesName.toLowerCase().replace(/[^a-z]/g, '');

  // Check if it matches any CommonName enum value
  for (const [key, value] of Object.entries(CommonName)) {
    const enumValue = value.replace(/-/g, '').replace(/_/g, '');
    if (enumValue === commonNameLower || enumValue === speciesNameLower) {
      return value; // Return the enum value (e.g., 'wolf', 'apple-tree')
    }
  }

  // Fallback to original logic
  return speciesNameLower || commonNameLower;
};

const OrganismRenderer: React.FC<OrganismRendererProps> = ({
  card,
  size = 100,
  className = '',
  showControls = false
}) => {
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
      // Create organism data structure expected by the renderer
      const organism = {
        size: size,
        type: card.trophicRole.toLowerCase(),
        species: card.speciesName.toLowerCase(),
        commonName: card.commonName.toLowerCase(),
        // Add some variation based on card properties
        health: card.health,
        power: card.power,
        speed: card.speed
      };

    // Try to find the most specific renderer first
    let renderer = null;

    // Use enhanced species mapping with CommonName enum
    const speciesKey = getSpeciesKey(card);

    // Try to load species data from public/species/ files
    const speciesData = await loadSpeciesData(speciesKey).catch(() => null);

    // Create mapping keys (fallback to original logic)
    const speciesKeyFallback = card.speciesName.toLowerCase().replace(/[^a-z]/g, '');
    const commonKey = card.commonName.toLowerCase().replace(/[^a-z]/g, '');

    // 1. Try exact species name match using enum-based key
    if (organismModels[speciesKey]) {
      renderer = organismModels[speciesKey];
    }

    // 2. Try fallback species name match
    if (!renderer && organismModels[speciesKeyFallback]) {
      renderer = organismModels[speciesKeyFallback];
    }

    // 3. Try common name match
    if (!renderer && organismModels[commonKey]) {
      renderer = organismModels[commonKey];
    }

    // 4. Try specific mappings for known species
    if (!renderer) {
      const mappings: { [key: string]: string } = {
        'bear': 'omnivore',
        'americanblackbear': 'omnivore',
        'fox': 'carnivore',
        'redfox': 'carnivore',
        'chipmunk': 'herbivore',
        'easternchipmunk': 'herbivore',
        'butterfly': 'herbivore',
        'caterpillar': 'herbivore',
        'dungbeetle': 'detritivore',
        'earthworm': 'detritivore',
        'soilbacteria': 'decomposer',
        'mushroom': 'decomposer',
        'appletree': 'producer',
        'bushcherry': 'producer',
        'eelgrass': 'producer',
        'grass': 'producer',
        'pricklypear': 'producer',
        'strawberry': 'producer',
        'sunflower': 'producer',
        'whiteclover': 'producer',
        'grapes': 'producer'
      };

      if (mappings[speciesKey]) {
        renderer = organismModels[mappings[speciesKey]];
      } else if (mappings[commonKey]) {
        renderer = organismModels[mappings[commonKey]];
      }
    }

    // 5. Try partial matches for common names
    if (!renderer) {
      const commonWords = card.commonName.toLowerCase().split(' ');
      for (const word of commonWords) {
        const cleanWord = word.replace(/[^a-z]/g, '');
        if (organismModels[cleanWord]) {
          renderer = organismModels[cleanWord];
          break;
        }
      }
    }

    // 6. Fall back to trophic role
    if (!renderer) {
      const trophicKey = card.trophicRole.toLowerCase();
      if (organismModels[trophicKey]) {
        renderer = organismModels[trophicKey];
      }
    }

    // 7. Final fallback
    if (!renderer) {
      renderer = organismModels.herbivore; // Default fallback
    }

    try {
      // Get the organism content container - try multiple approaches
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
      fallback.textContent = card.commonName.charAt(0).toUpperCase();
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
