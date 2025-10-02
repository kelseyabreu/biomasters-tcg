/**
 * Seeded Random Number Generator (Mulberry32 algorithm)
 * 
 * Deterministic PRNG that produces identical sequences from the same seed.
 * Used for pack generation to ensure frontend/backend consistency.
 * 
 * Both frontend and server use this to generate identical pack contents
 * from the same action ID seed, enabling optimistic offline pack opening
 * with server-side validation.
 * 
 * @example
 * const rng = new SeededRandom('action-id-12345');
 * const random1 = rng.next(); // 0.123456...
 * const random2 = rng.next(); // 0.789012...
 * 
 * // Same seed produces same sequence
 * const rng2 = new SeededRandom('action-id-12345');
 * const random3 = rng2.next(); // 0.123456... (identical to random1)
 */
export class SeededRandom {
  private seed: number;

  /**
   * Create a new seeded random number generator
   * @param seed String seed (typically action ID) to initialize the RNG
   */
  constructor(seed: string) {
    this.seed = this.hashString(seed);
  }

  /**
   * Convert string seed to numeric seed using simple hash function
   * @param str String to hash
   * @returns Positive 32-bit integer
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Generate next random number in sequence
   * Uses Mulberry32 algorithm for deterministic pseudo-random generation
   * @returns Random number between 0 (inclusive) and 1 (exclusive)
   */
  next(): number {
    this.seed = (this.seed + 0x6D2B79F5) | 0;
    let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate random integer between min (inclusive) and max (exclusive)
   * @param min Minimum value (inclusive)
   * @param max Maximum value (exclusive)
   * @returns Random integer in range [min, max)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * Select random element from array
   * @param array Array to select from
   * @returns Random element from array, or undefined if array is empty
   */
  choice<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[this.nextInt(0, array.length)];
  }
}

