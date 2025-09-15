/**
 * Firebase Scaling Utilities
 * Production-ready patterns for handling Firebase at scale
 */

import { getFirebaseAuth } from '../config/firebase';
import admin from 'firebase-admin';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

export interface FirebaseQuotaConfig {
  maxConcurrentOperations: number;
  operationsPerSecond: number;
  burstLimit: number;
}

/**
 * Circuit Breaker for Firebase operations
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = 'HALF_OPEN';
        console.log('🔄 [CircuitBreaker] Attempting to reset circuit breaker');
      } else {
        throw new Error('Circuit breaker is OPEN - Firebase operations temporarily disabled');
      }
    }

    try {
      const result = await operation();
      
      if (this.state === 'HALF_OPEN') {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      console.error(`🚨 [CircuitBreaker] Circuit breaker OPENED after ${this.failures} failures`);
    }
  }

  private reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    console.log('✅ [CircuitBreaker] Circuit breaker CLOSED - operations restored');
  }

  getState(): string {
    return this.state;
  }
}

/**
 * Firebase Operation Queue for rate limiting
 */
class FirebaseOperationQueue {
  private queue: Array<() => Promise<any>> = [];
  private running = 0;
  private lastOperationTime = 0;
  
  constructor(private config: FirebaseQuotaConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          // Enforce rate limiting
          const now = Date.now();
          const timeSinceLastOp = now - this.lastOperationTime;
          const minInterval = 1000 / this.config.operationsPerSecond;
          
          if (timeSinceLastOp < minInterval) {
            await new Promise(r => setTimeout(r, minInterval - timeSinceLastOp));
          }
          
          this.lastOperationTime = Date.now();
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          this.processQueue();
        }
      });
      
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.running >= this.config.maxConcurrentOperations || this.queue.length === 0) {
      return;
    }
    
    const operation = this.queue.shift();
    if (operation) {
      this.running++;
      operation();
    }
  }

  getQueueStatus(): { queueLength: number; running: number } {
    return {
      queueLength: this.queue.length,
      running: this.running
    };
  }
}

/**
 * Enhanced Firebase Auth Manager with scaling patterns
 */
export class ScalableFirebaseAuth {
  private circuitBreaker: CircuitBreaker;
  private operationQueue: FirebaseOperationQueue;
  private retryConfig: RetryConfig;

  constructor() {
    // Production-optimized configurations
    this.retryConfig = {
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true
    };

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 10, // Open circuit after 10 failures
      resetTimeout: 60000, // Try to reset after 1 minute
      monitoringPeriod: 300000 // 5 minute monitoring window
    });

    this.operationQueue = new FirebaseOperationQueue({
      maxConcurrentOperations: 50, // Firebase can handle ~100 concurrent
      operationsPerSecond: 100, // Conservative rate limit
      burstLimit: 200 // Allow bursts up to 200 ops
    });
  }

  /**
   * Exponential backoff with jitter
   */
  private calculateDelay(attempt: number): number {
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
      this.retryConfig.maxDelay
    );
    
    if (this.retryConfig.jitter) {
      // Add ±25% jitter to prevent thundering herd
      const jitter = delay * 0.25 * (Math.random() * 2 - 1);
      return Math.max(100, delay + jitter);
    }
    
    return delay;
  }

  /**
   * Execute Firebase operation with full scaling patterns
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await this.circuitBreaker.execute(async () => {
          return await this.operationQueue.execute(operation);
        });
      } catch (error: any) {
        lastError = error;
        
        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);
        
        console.warn(`⚠️ [Firebase] ${operationName} attempt ${attempt}/${this.retryConfig.maxRetries} failed:`, error.message);
        
        if (!isRetryable || attempt === this.retryConfig.maxRetries) {
          console.error(`❌ [Firebase] ${operationName} failed permanently:`, error.message);
          throw error;
        }
        
        // Wait with exponential backoff
        const delay = this.calculateDelay(attempt);
        console.log(`⏳ [Firebase] Retrying ${operationName} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Determine if Firebase error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      'auth/network-request-failed',
      'auth/timeout',
      'auth/internal-error',
      'auth/service-unavailable',
      'auth/too-many-requests',
      'UNAVAILABLE',
      'DEADLINE_EXCEEDED',
      'RESOURCE_EXHAUSTED',
      'INTERNAL',
      'UNKNOWN'
    ];

    const errorCode = error.code || error.message || '';
    return retryableErrors.some(code => errorCode.includes(code));
  }

  /**
   * Scalable user verification
   */
  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    return this.executeWithRetry(
      () => getFirebaseAuth().verifyIdToken(idToken),
      'verifyIdToken'
    );
  }

  /**
   * Scalable user creation
   */
  async createUser(userData: admin.auth.CreateRequest): Promise<admin.auth.UserRecord> {
    return this.executeWithRetry(
      () => getFirebaseAuth().createUser(userData),
      'createUser'
    );
  }

  /**
   * Scalable user retrieval
   */
  async getUser(uid: string): Promise<admin.auth.UserRecord> {
    return this.executeWithRetry(
      () => getFirebaseAuth().getUser(uid),
      'getUser'
    );
  }

  /**
   * Scalable batch user operations
   */
  async getUsers(uids: string[]): Promise<admin.auth.GetUsersResult> {
    // Split large batches to avoid Firebase limits (1000 users max per request)
    const batchSize = 100;
    const batches: string[][] = [];
    
    for (let i = 0; i < uids.length; i += batchSize) {
      batches.push(uids.slice(i, i + batchSize));
    }

    const results = await Promise.all(
      batches.map(batch => 
        this.executeWithRetry(
          () => getFirebaseAuth().getUsers(batch.map(uid => ({ uid }))),
          `getUsers-batch-${batches.indexOf(batch)}`
        )
      )
    );

    // Combine results
    const combinedUsers = results.flatMap(result => result.users);
    const combinedNotFound = results.flatMap(result => result.notFound || []);

    return {
      users: combinedUsers,
      notFound: combinedNotFound
    };
  }

  /**
   * Scalable user deletion
   */
  async deleteUser(uid: string): Promise<void> {
    return this.executeWithRetry(
      () => getFirebaseAuth().deleteUser(uid),
      'deleteUser'
    );
  }

  /**
   * Get system health metrics
   */
  getHealthMetrics(): {
    circuitBreakerState: string;
    queueStatus: { queueLength: number; running: number };
    retryConfig: RetryConfig;
  } {
    return {
      circuitBreakerState: this.circuitBreaker.getState(),
      queueStatus: this.operationQueue.getQueueStatus(),
      retryConfig: this.retryConfig
    };
  }
}

// Singleton instance for application-wide use
export const scalableFirebaseAuth = new ScalableFirebaseAuth();
