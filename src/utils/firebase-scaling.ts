/**
 * Client-Side Firebase Scaling Utilities
 * Production-ready patterns for handling Firebase Auth at scale on the frontend
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
  UserCredential,
  AuthError as FirebaseAuthError,
  onAuthStateChanged,
  getIdToken
} from 'firebase/auth';
import { auth } from '../config/firebase';

export interface ClientRetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface AuthOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  retryCount: number;
  totalTime: number;
}

/**
 * Client-side Firebase Auth Rate Limiter
 */
class ClientAuthRateLimiter {
  private operations: number[] = [];
  private readonly windowMs = 60000; // 1 minute window
  private readonly maxOperations = 30; // Max 30 auth operations per minute

  canProceed(): boolean {
    const now = Date.now();
    
    // Remove operations outside the window
    this.operations = this.operations.filter(time => now - time < this.windowMs);
    
    if (this.operations.length >= this.maxOperations) {
      console.warn('⚠️ [ClientAuth] Rate limit reached, please wait before retrying');
      return false;
    }
    
    this.operations.push(now);
    return true;
  }

  getWaitTime(): number {
    if (this.operations.length === 0) return 0;
    
    const oldestOperation = Math.min(...this.operations);
    const waitTime = this.windowMs - (Date.now() - oldestOperation);
    return Math.max(0, waitTime);
  }
}

/**
 * Enhanced Client-side Firebase Auth Manager
 */
export class ScalableClientFirebaseAuth {
  private retryConfig: ClientRetryConfig;
  private rateLimiter: ClientAuthRateLimiter;
  private authStateListeners: Set<(user: User | null) => void> = new Set();

  constructor() {
    this.retryConfig = {
      maxRetries: 3, // Conservative for client-side
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true
    };

    this.rateLimiter = new ClientAuthRateLimiter();
    this.setupAuthStateListener();
  }

  /**
   * Setup centralized auth state listener
   */
  private setupAuthStateListener(): void {
    onAuthStateChanged(auth, (user) => {
      console.log('🔥 [ClientAuth] Auth state changed:', user ? `User: ${user.email}` : 'No user');
      
      // Notify all listeners
      this.authStateListeners.forEach(listener => {
        try {
          listener(user);
        } catch (error) {
          console.error('❌ [ClientAuth] Auth state listener error:', error);
        }
      });
    });
  }

  /**
   * Add auth state listener
   */
  addAuthStateListener(listener: (user: User | null) => void): () => void {
    this.authStateListeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.authStateListeners.delete(listener);
    };
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
      this.retryConfig.maxDelay
    );
    
    if (this.retryConfig.jitter) {
      // Add ±25% jitter to prevent thundering herd
      const jitter = delay * 0.25 * (Math.random() * 2 - 1);
      return Math.max(500, delay + jitter);
    }
    
    return delay;
  }

  /**
   * Check if Firebase error is retryable
   */
  private isRetryableError(error: FirebaseAuthError): boolean {
    const retryableErrors = [
      'auth/network-request-failed',
      'auth/timeout',
      'auth/internal-error',
      'auth/service-unavailable',
      'auth/too-many-requests'
    ];

    return retryableErrors.includes(error.code);
  }

  /**
   * Execute auth operation with retry logic and rate limiting
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<AuthOperationResult<T>> {
    const startTime = Date.now();
    let lastError: FirebaseAuthError | Error;

    // Check rate limit first
    if (!this.rateLimiter.canProceed()) {
      const waitTime = this.rateLimiter.getWaitTime();
      return {
        success: false,
        error: `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
        retryCount: 0,
        totalTime: Date.now() - startTime
      };
    }

    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        console.log(`🔄 [ClientAuth] ${operationName} attempt ${attempt}/${this.retryConfig.maxRetries}`);
        
        const result = await operation();
        
        console.log(`✅ [ClientAuth] ${operationName} succeeded on attempt ${attempt}`);
        return {
          success: true,
          data: result,
          retryCount: attempt - 1,
          totalTime: Date.now() - startTime
        };
        
      } catch (error: any) {
        lastError = error;
        
        const isRetryable = this.isRetryableError(error);
        console.warn(`⚠️ [ClientAuth] ${operationName} attempt ${attempt} failed:`, error.code, error.message);
        
        if (!isRetryable || attempt === this.retryConfig.maxRetries) {
          console.error(`❌ [ClientAuth] ${operationName} failed permanently:`, error.code, error.message);
          break;
        }
        
        // Wait with exponential backoff
        const delay = this.calculateDelay(attempt);
        console.log(`⏳ [ClientAuth] Retrying ${operationName} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: lastError!.message || 'Unknown authentication error',
      retryCount: this.retryConfig.maxRetries,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Scalable user registration
   */
  async registerUser(email: string, password: string): Promise<AuthOperationResult<UserCredential>> {
    return this.executeWithRetry(
      () => createUserWithEmailAndPassword(auth, email, password),
      'registerUser'
    );
  }

  /**
   * Scalable user sign in
   */
  async signInUser(email: string, password: string): Promise<AuthOperationResult<UserCredential>> {
    return this.executeWithRetry(
      () => signInWithEmailAndPassword(auth, email, password),
      'signInUser'
    );
  }

  /**
   * Scalable token retrieval
   */
  async getAuthToken(forceRefresh: boolean = false): Promise<AuthOperationResult<string>> {
    if (!auth.currentUser) {
      return {
        success: false,
        error: 'No authenticated user',
        retryCount: 0,
        totalTime: 0
      };
    }

    return this.executeWithRetry(
      () => getIdToken(auth.currentUser!, forceRefresh),
      'getAuthToken'
    );
  }

  /**
   * Scalable sign out
   */
  async signOutUser(): Promise<AuthOperationResult<void>> {
    return this.executeWithRetry(
      () => signOut(auth),
      'signOutUser'
    );
  }

  /**
   * Get current user safely
   */
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Wait for auth state to be ready
   */
  async waitForAuthReady(timeoutMs: number = 10000): Promise<User | null> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error('Auth state timeout'));
      }, timeoutMs);

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        clearTimeout(timeout);
        unsubscribe();
        resolve(user);
      });
    });
  }

  /**
   * Enhanced auth state recovery with retry
   */
  async recoverAuthState(): Promise<AuthOperationResult<User | null>> {
    const startTime = Date.now();
    
    try {
      console.log('🔄 [ClientAuth] Recovering authentication state...');
      
      // Wait for auth to be ready with timeout
      const user = await this.waitForAuthReady(15000); // 15 second timeout
      
      if (user) {
        console.log('✅ [ClientAuth] Auth state recovered successfully:', user.email);
        
        // Verify token is still valid
        const tokenResult = await this.getAuthToken(false);
        if (!tokenResult.success) {
          console.warn('⚠️ [ClientAuth] Token invalid, forcing refresh...');
          const refreshResult = await this.getAuthToken(true);
          if (!refreshResult.success) {
            throw new Error('Failed to refresh authentication token');
          }
        }
      } else {
        console.log('ℹ️ [ClientAuth] No authenticated user found');
      }
      
      return {
        success: true,
        data: user,
        retryCount: 0,
        totalTime: Date.now() - startTime
      };
      
    } catch (error: any) {
      console.error('❌ [ClientAuth] Auth state recovery failed:', error.message);
      return {
        success: false,
        error: error.message,
        retryCount: 0,
        totalTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get rate limiter status
   */
  getRateLimiterStatus(): { canProceed: boolean; waitTime: number } {
    return {
      canProceed: this.rateLimiter.canProceed(),
      waitTime: this.rateLimiter.getWaitTime()
    };
  }
}

// Singleton instance for application-wide use
export const scalableClientAuth = new ScalableClientFirebaseAuth();
