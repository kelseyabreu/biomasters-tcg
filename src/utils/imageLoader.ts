/**
 * Image Loading Utility for Organism Rendering
 *
 * This utility provides functions to check for and load PNG images for species cards,
 * with fallback support to the existing DOM rendering system.
 *
 * Features:
 * - Advanced caching to prevent duplicate network requests
 * - Memoization of image existence checks
 * - Performance optimization for repeated card renders
 */

import { Card as CardType } from '../types';

// Cache for image existence checks
interface ImageCacheEntry {
  exists: boolean;
  imagePath?: string;
  timestamp: number;
  error?: string;
}

// Cache for final loadCardImage results
interface CardImageCacheEntry {
  result: ImageLoadResult;
  timestamp: number;
}

// Global caches with TTL (Time To Live)
const imageCache = new Map<string, ImageCacheEntry>();
const cardImageCache = new Map<string, CardImageCacheEntry>(); // New: cache for final results
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 500; // Maximum number of cached entries

// Cache for ongoing image load promises to prevent duplicate requests
const loadingPromises = new Map<string, Promise<ImageLoadResult>>();

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
  supportedFormats: ['png'],
  timeout: 5000 // 5 seconds
};

/**
 * Cache management functions
 */

function isValidCacheEntry(entry: ImageCacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL;
}

function getCachedResult(cacheKey: string): ImageCacheEntry | null {
  const entry = imageCache.get(cacheKey);
  if (entry && isValidCacheEntry(entry)) {
    return entry;
  }
  if (entry) {
    imageCache.delete(cacheKey); // Remove expired entry
  }
  return null;
}

function setCacheEntry(cacheKey: string, entry: ImageCacheEntry): void {
  // Implement LRU eviction if cache is full
  if (imageCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = imageCache.keys().next().value;
    if (oldestKey) {
      imageCache.delete(oldestKey);
    }
  }
  imageCache.set(cacheKey, entry);
}

function getCachedCardResult(cacheKey: string): ImageLoadResult | null {
  const entry = cardImageCache.get(cacheKey);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.result;
  }
  if (entry) {
    cardImageCache.delete(cacheKey); // Remove expired entry
  }
  return null;
}

function setCachedCardResult(cacheKey: string, result: ImageLoadResult): void {
  // Implement LRU eviction if cache is full
  if (cardImageCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cardImageCache.keys().next().value;
    if (oldestKey) {
      cardImageCache.delete(oldestKey);
    }
  }
  cardImageCache.set(cacheKey, {
    result,
    timestamp: Date.now()
  });
}

function clearExpiredCache(): void {
  const now = Date.now();

  // Clear expired image existence cache
  for (const [key, entry] of imageCache.entries()) {
    if (now - entry.timestamp >= CACHE_TTL) {
      imageCache.delete(key);
    }
  }

  // Clear expired card image cache
  for (const [key, entry] of cardImageCache.entries()) {
    if (now - entry.timestamp >= CACHE_TTL) {
      cardImageCache.delete(key);
    }
  }
}

// Clean up expired cache entries every 2 minutes
setInterval(clearExpiredCache, 2 * 60 * 1000);

/**
 * Convert a card's nameId to possible image filenames
 *
 * @param nameId - The card's nameId (e.g., "CARD_GREAT_WHITE_SHARK")
 * @param format - The image format extension (default: 'png')
 * @returns Array of possible filenames to try
 */
export function getImageFileNames(nameId: string, format: string = 'png'): string[] {
  // Try naming conventions with lowercase_snake_case as priority (correct format)
  return [
    `${nameId.toLowerCase()}.${format}`, // Correct: card_great_white_shark.png (lowercase_snake_case)
    `${nameId.replace(/^CARD_/, '').toLowerCase()}.${format}` // Without CARD_ prefix: great_white_shark.png
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
 * Check if an image exists by attempting to load it (with caching)
 *
 * @param imagePath - The path to the image
 * @param timeout - Timeout in milliseconds
 * @param cacheKey - Optional cache key for memoization
 * @returns Promise that resolves to true if image exists and loads successfully
 */
export function checkImageExists(imagePath: string, timeout: number = 5000, cacheKey?: string): Promise<boolean> {
  // Always use the imagePath as cache key if none provided
  const effectiveCacheKey = cacheKey || imagePath;

  // Check cache first
  const cached = getCachedResult(effectiveCacheKey);
  if (cached) {
    return Promise.resolve(cached.exists);
  }

  return new Promise((resolve) => {
    const img = new Image();
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      cleanup();
      // Cache the positive result
      setCacheEntry(effectiveCacheKey, {
        exists: true,
        imagePath,
        timestamp: Date.now()
      });
      resolve(true);
    };

    img.onerror = () => {
      cleanup();
      // Cache the negative result
      setCacheEntry(effectiveCacheKey, {
        exists: false,
        timestamp: Date.now(),
        error: 'Image failed to load'
      });
      resolve(false);
    };

    // Set timeout
    const timeoutId = setTimeout(() => {
      cleanup();
      // Cache the timeout result as negative
      setCacheEntry(effectiveCacheKey, {
        exists: false,
        timestamp: Date.now(),
        error: 'Image load timeout'
      });
      resolve(false);
    }, timeout);

    // Start loading
    img.src = imagePath;
  });
}

/**
 * Attempt to load an image for a card, trying multiple formats and naming conventions (with caching and deduplication)
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
    const cardCacheKey = `card_${card.nameId}_${JSON.stringify(opts)}`;



    // 1. Check if we have a cached result first (FASTEST PATH)
    const cachedResult = getCachedCardResult(cardCacheKey);
    if (cachedResult) {
        console.log(`🎯 [CACHE HIT] Found cached result for ${card.nameId}:`, cachedResult);
        return cachedResult;
    }

    // 2. Check if there's already a request in progress for this card
    const existingPromise = loadingPromises.get(cardCacheKey);
    if (existingPromise) {
        return existingPromise;
    }

    // Create the loading promise
    const loadPromise = (async (): Promise<ImageLoadResult> => {
        try {
            // Check if we already know this card has no images (aggressive negative caching)
            const cardFailureCacheKey = `card_failure_${card.nameId}`;
            const cachedFailure = getCachedResult(cardFailureCacheKey);
            if (cachedFailure && !cachedFailure.exists) {
                const result = {
                    success: false,
                    error: `No image found for card ${card.nameId} (cached failure)`
                };
                setCachedCardResult(cardCacheKey, result);
                return result;
            }

            // Try each supported format
            for (const format of opts.supportedFormats) {
                // Try multiple naming conventions
                const possibleFileNames = getImageFileNames(card.nameId, format);

                for (const fileName of possibleFileNames) {
                    const imagePath = `${opts.baseImagePath}/${fileName}`;
                    // Use imagePath directly as cache key for consistency
                    const cacheKey = imagePath;

                    try {
                        const exists = await checkImageExists(imagePath, opts.timeout, cacheKey);
                        if (exists) {
                            const result = {
                                success: true,
                                imagePath
                            };
                            // Cache the successful result
                            setCachedCardResult(cardCacheKey, result);
                            return result;
                        }
                    } catch (error: any) {
                        console.log(error.message);
                    }
                }
            }

            // Cache the card-level failure to prevent future attempts
            setCacheEntry(cardFailureCacheKey, {
                exists: false,
                timestamp: Date.now(),
                error: 'Card has no images in any format/convention'
            });

            const result = {
                success: false,
                error: `No image found for card ${card.nameId} in any naming convention with formats: ${opts.supportedFormats.join(', ')}`
            };
            // Cache the failed result to prevent retries
            setCachedCardResult(cardCacheKey, result);
            return result;
        } finally {
            // Remove from loading promises when done
            loadingPromises.delete(cardCacheKey);
        }
    })();

    // Store the promise to prevent duplicate requests
    loadingPromises.set(cardCacheKey, loadPromise);

    return loadPromise;
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

/**
 * Cache management utilities for debugging and development
 */
export const ImageCacheUtils = {
  /**
   * Clear all cached image results
   */
  clearCache(): void {
    imageCache.clear();
    cardImageCache.clear();
    loadingPromises.clear();
    console.log('🗑️ Image cache cleared');
  },

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    imageExistenceCache: { size: number; maxSize: number; ttl: number };
    cardImageCache: { size: number; maxSize: number; ttl: number };
    activeRequests: number;
  } {
    return {
      imageExistenceCache: {
        size: imageCache.size,
        maxSize: MAX_CACHE_SIZE,
        ttl: CACHE_TTL
      },
      cardImageCache: {
        size: cardImageCache.size,
        maxSize: MAX_CACHE_SIZE,
        ttl: CACHE_TTL
      },
      activeRequests: loadingPromises.size
    };
  },

  /**
   * Get all cached entries (for debugging)
   */
  getCacheEntries(): {
    imageExistenceCache: Array<{ key: string; entry: ImageCacheEntry }>;
    cardImageCache: Array<{ key: string; entry: CardImageCacheEntry }>;
  } {
    return {
      imageExistenceCache: Array.from(imageCache.entries()).map(([key, entry]) => ({ key, entry })),
      cardImageCache: Array.from(cardImageCache.entries()).map(([key, entry]) => ({ key, entry }))
    };
  },

  /**
   * Check if a specific card image is cached
   */
  isCached(cardNameId: string, options: ImageLoadOptions = {}): boolean {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const cardCacheKey = `card_${cardNameId}_${JSON.stringify(opts)}`;
    return getCachedCardResult(cardCacheKey) !== null;
  },

  /**
   * Get cached result for a specific card (for debugging)
   */
  getCachedResult(cardNameId: string, options: ImageLoadOptions = {}): ImageLoadResult | null {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const cardCacheKey = `card_${cardNameId}_${JSON.stringify(opts)}`;
    return getCachedCardResult(cardCacheKey);
  }
};

// Expose cache utils globally for debugging in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).ImageCacheUtils = ImageCacheUtils;
}
