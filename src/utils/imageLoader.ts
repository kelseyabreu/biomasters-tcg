/**
 * Image Loading Utility for Organism Rendering
 * 
 * This utility provides functions to check for and load PNG images for species cards,
 * with fallback support to the existing DOM rendering system.
 */

import { Card as CardType } from '../types';

export interface ImageLoadResult {
  success: boolean;
  imagePath?: string;
  error?: string;
}

export interface ImageLoadOptions {
  baseImagePath?: string;
  supportedFormats?: string[];
  timeout?: number;
}

/**
 * Default options for image loading
 */
const DEFAULT_OPTIONS: Required<ImageLoadOptions> = {
  baseImagePath: '/images/species',
  supportedFormats: ['png', 'jpg', 'jpeg', 'svg'],
  timeout: 5000 // 5 seconds
};

/**
 * Convert a card's nameId to possible image filenames
 *
 * @param nameId - The card's nameId (e.g., "CARD_GREAT_WHITE_SHARK")
 * @param format - The image format extension (default: 'png')
 * @returns Array of possible filenames to try
 */
export function getImageFileNames(nameId: string, format: string = 'png'): string[] {
  // Try multiple naming conventions for better compatibility
  return [
    `${nameId}.${format}`, // Original: CARD_GREAT_WHITE_SHARK.png
    `${nameId.toLowerCase()}.${format}`, // Lowercase: card_great_white_shark.png
    `${nameId.toLowerCase().replace(/_/g, '-')}.${format}`, // Kebab case: card-great-white-shark.png
    `${nameId.replace(/^CARD_/, '').toLowerCase().replace(/_/g, '-')}.${format}` // Without CARD_ prefix: great-white-shark.png
  ];
}

/**
 * Convert a card's nameId to a standardized image filename (legacy function)
 *
 * @param nameId - The card's nameId (e.g., "CARD_GREAT_WHITE_SHARK")
 * @param format - The image format extension (default: 'png')
 * @returns Standardized filename (e.g., "CARD_GREAT_WHITE_SHARK.png")
 */
export function getImageFileName(nameId: string, format: string = 'png'): string {
  // Keep the nameId as-is for consistency with the existing naming convention
  // This matches the pattern used in the codebase where files are named like "CARD_GREAT_WHITE_SHARK.json"
  return `${nameId}.${format}`;
}

/**
 * Get the full image path for a card
 * 
 * @param card - The card data
 * @param options - Image loading options
 * @returns Full image path
 */
export function getImagePath(card: CardType, options: ImageLoadOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const fileName = getImageFileName(card.nameId, opts.supportedFormats[0]);
  return `${opts.baseImagePath}/${fileName}`;
}

/**
 * Check if an image exists by attempting to load it
 * 
 * @param imagePath - The path to the image
 * @param timeout - Timeout in milliseconds
 * @returns Promise that resolves to true if image exists and loads successfully
 */
export function checkImageExists(imagePath: string, timeout: number = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    let timeoutId: NodeJS.Timeout;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      cleanup();
      resolve(true);
    };

    img.onerror = () => {
      cleanup();
      resolve(false);
    };

    // Set timeout
    timeoutId = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeout);

    // Start loading
    img.src = imagePath;
  });
}

/**
 * Attempt to load an image for a card, trying multiple formats and naming conventions
 *
 * @param card - The card data
 * @param options - Image loading options
 * @returns Promise with load result
 */
export async function loadCardImage(
  card: CardType,
  options: ImageLoadOptions = {}
): Promise<ImageLoadResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Try each supported format
  for (const format of opts.supportedFormats) {
    // Try multiple naming conventions
    const possibleFileNames = getImageFileNames(card.nameId, format);

    for (const fileName of possibleFileNames) {
      const imagePath = `${opts.baseImagePath}/${fileName}`;

      try {
        const exists = await checkImageExists(imagePath, opts.timeout);
        if (exists) {
          return {
            success: true,
            imagePath
          };
        }
      } catch (error) {
        // Silently continue to next naming convention
      }
    }
  }

  return {
    success: false,
    error: `No image found for card ${card.nameId} in any naming convention with formats: ${opts.supportedFormats.join(', ')}`
  };
}

/**
 * Create an image element with proper error handling and loading states
 * 
 * @param imagePath - Path to the image
 * @param alt - Alt text for the image
 * @param className - CSS class name
 * @param onLoad - Callback when image loads successfully
 * @param onError - Callback when image fails to load
 * @returns HTMLImageElement
 */
export function createImageElement(
  imagePath: string,
  alt: string,
  className?: string,
  onLoad?: () => void,
  onError?: () => void
): HTMLImageElement {
  const img = document.createElement('img');
  img.src = imagePath;
  img.alt = alt;
  
  if (className) {
    img.className = className;
  }

  // Set up event handlers
  if (onLoad) {
    img.addEventListener('load', onLoad, { once: true });
  }
  
  if (onError) {
    img.addEventListener('error', onError, { once: true });
  }

  // Set default styles for organism images
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'contain';
  img.style.objectPosition = 'center';

  return img;
}

/**
 * Preload images for multiple cards
 * Useful for preloading images that are likely to be needed soon
 * 
 * @param cards - Array of cards to preload images for
 * @param options - Image loading options
 * @returns Promise that resolves when all preloading attempts are complete
 */
export async function preloadCardImages(
  cards: CardType[],
  options: ImageLoadOptions = {}
): Promise<ImageLoadResult[]> {
  const loadPromises = cards.map(card => loadCardImage(card, options));
  return Promise.all(loadPromises);
}

/**
 * Get a list of species that have PNG images available
 *
 * @param cards - Array of cards to check
 * @param options - Image loading options
 * @returns Promise with array of cards that have images
 */
export async function getCardsWithImages(
  cards: CardType[],
  options: ImageLoadOptions = {}
): Promise<CardType[]> {
  const results = await preloadCardImages(cards, options);
  return cards.filter((_, index) => results[index].success);
}
