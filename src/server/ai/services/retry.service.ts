/**
 * Retry Service - Handles exponential backoff for API calls
 * Specifically designed to handle Anthropic API 529 "Overloaded" errors
 */

import { backOff } from 'exponential-backoff';

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 5) */
  maxAttempts?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Multiplier for exponential backoff (default: 2) */
  multiplier?: number;
  /** Jitter to add randomness (default: true) */
  jitter?: boolean;
}

export interface RetryStats {
  attemptNumber: number;
  totalAttempts: number;
  lastError?: Error;
  totalDelay: number;
}

export class RetryService {
  private static readonly DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    jitter: true
  };

  /**
   * Execute a function with exponential backoff retry
   * @param fn Function to execute
   * @param options Retry configuration options
   * @returns Promise with the function result
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    
    console.log(`[RetryService] Starting operation with max ${config.maxAttempts} attempts`);
    
    return backOff(
      async () => {
        try {
          const result = await fn();
          console.log('[RetryService] ✅ Operation succeeded');
          return result;
        } catch (error: any) {
          console.log(`[RetryService] ❌ Operation failed: ${error?.message || error}`);
          
          // Check if this is a retryable error
          if (this.isRetryableError(error)) {
            console.log('[RetryService] 🔄 Error is retryable, will retry...');
            throw error; // This will trigger a retry
          } else {
            console.log('[RetryService] 🚫 Error is not retryable, failing immediately');
            throw new Error(`Non-retryable error: ${error?.message || error}`);
          }
        }
      },      {
        numOfAttempts: config.maxAttempts,
        startingDelay: config.initialDelay,
        maxDelay: config.maxDelay,
        timeMultiple: config.multiplier,
        jitter: config.jitter ? 'full' : 'none',
        retry: (error: any, attemptNumber: number) => {
          console.log(`[RetryService] 🔄 Retry attempt ${attemptNumber}/${config.maxAttempts} after error: ${error?.message || error}`);
          return this.isRetryableError(error);
        }
      }
    );
  }

  /**
   * Determine if an error should trigger a retry
   * @param error The error to check
   * @returns true if the error is retryable
   */
  private static isRetryableError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message || error.toString();
    const statusCode = error.status || error.statusCode || error.code;    // Check for Anthropic API overload errors (529 - highest priority for retries)
    if (statusCode === 529 || errorMessage.toLowerCase().includes('overloaded')) {
      console.log('[RetryService] 🚨 Detected 529 Overloaded error - will retry with extended backoff');
      return true;
    }

    // Check for rate limiting
    if (statusCode === 429 || errorMessage.toLowerCase().includes('rate limit')) {
      console.log('[RetryService] 🚦 Detected rate limit error - will retry');
      return true;
    }

    // Check for temporary server errors
    if (statusCode >= 500 && statusCode < 600) {
      console.log(`[RetryService] 🔧 Detected server error ${statusCode} - will retry`);
      return true;
    }

    // Check for timeout errors
    if (errorMessage.toLowerCase().includes('timeout') || 
        errorMessage.toLowerCase().includes('econnreset') ||
        errorMessage.toLowerCase().includes('enotfound')) {
      return true;
    }

    // Check for network errors
    if (errorMessage.toLowerCase().includes('network') ||
        errorMessage.toLowerCase().includes('connection')) {
      return true;
    }

    return false;
  }

  /**
   * Create a retry wrapper for Claude API calls
   * @param options Retry configuration
   * @returns Function that wraps API calls with retry logic
   */
  static createClaudeRetryWrapper(options: RetryOptions = {}) {    const config = { 
      ...this.DEFAULT_OPTIONS, 
      ...options,
      // Optimized settings for Claude API 529 errors (based on Anthropic best practices)
      maxAttempts: 8,           // Increased attempts for 529 errors
      initialDelay: 3000,       // Start with 3 seconds (recommended for 529)
      maxDelay: 90000,          // Max 90 seconds between retries
      multiplier: 2.0,          // Standard exponential backoff
      jitter: true              // Add randomness to avoid thundering herd
    };

    return async <T>(apiCall: () => Promise<T>): Promise<T> => {
      console.log('[RetryService] 🤖 Executing Claude API call with retry protection');
      
      const startTime = Date.now();
      
      try {
        const result = await this.withRetry(apiCall, config);
        const duration = Date.now() - startTime;
        console.log(`[RetryService] ✅ Claude API call succeeded in ${duration}ms`);
        return result;
      } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error(`[RetryService] ❌ Claude API call failed after ${duration}ms and ${config.maxAttempts} attempts:`, error?.message || error);
        throw error;
      }
    };
  }

  /**
   * Create a specialized retry wrapper for handling Anthropic 529 Overloaded errors
   * Uses the most patient retry strategy with extended backoff
   * @param options Override options for 529-specific configuration
   * @returns Function that wraps API calls with 529-optimized retry logic
   */
  static createOverloadedRetryWrapper(options: RetryOptions = {}) {
    const config = { 
      ...RETRY_CONFIGS.OVERLOADED_529, 
      ...options
    };

    return async <T>(apiCall: () => Promise<T>): Promise<T> => {
      console.log('[RetryService] 🔄 Executing API call with 529-Overloaded retry protection');
      console.log(`[RetryService] 📊 Config: ${config.maxAttempts} attempts, ${config.initialDelay}ms initial delay, ${config.maxDelay}ms max delay`);
      
      const startTime = Date.now();
      
      try {
        const result = await this.withRetry(apiCall, config);
        const duration = Date.now() - startTime;
        console.log(`[RetryService] ✅ API call succeeded after ${duration}ms`);
        return result;
      } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error(`[RetryService] ❌ API call failed after ${duration}ms and ${config.maxAttempts} attempts:`, error?.message || error);
        
        // Provide specific guidance for 529 errors
        if (error?.status === 529 || error?.message?.toLowerCase().includes('overloaded')) {
          console.error('💡 [RetryService] This appears to be an Anthropic server overload. Consider:');
          console.error('   - Waiting a few minutes before trying again');
          console.error('   - Reducing request complexity or frequency');
          console.error('   - Checking Anthropic status page: https://status.anthropic.com');
        }
        
        throw error;
      }
    };
  }

  /**
   * Utility method to add jitter to delay
   * @param delay Base delay in milliseconds
   * @param jitterFactor Factor for jitter (0.0 to 1.0)
   * @returns Delay with jitter applied
   */
  static addJitter(delay: number, jitterFactor: number = 0.1): number {
    const jitter = delay * jitterFactor * Math.random();
    return Math.floor(delay + jitter);
  }

  /**
   * Calculate next delay for exponential backoff
   * @param attemptNumber Current attempt number (0-based)
   * @param baseDelay Initial delay in milliseconds
   * @param multiplier Exponential multiplier
   * @param maxDelay Maximum allowed delay
   * @returns Next delay in milliseconds
   */
  static calculateDelay(
    attemptNumber: number,
    baseDelay: number = 1000,
    multiplier: number = 2,
    maxDelay: number = 30000
  ): number {
    const delay = baseDelay * Math.pow(multiplier, attemptNumber);
    return Math.min(delay, maxDelay);
  }
}

// Export convenience functions
export const withRetry = RetryService.withRetry.bind(RetryService);
export const createClaudeRetryWrapper = RetryService.createClaudeRetryWrapper.bind(RetryService);
export const createOverloadedRetryWrapper = RetryService.createOverloadedRetryWrapper.bind(RetryService);

// Default retry configurations for different scenarios
export const RETRY_CONFIGS = {
  /** Quick operations that should fail fast */
  FAST: {
    maxAttempts: 3,
    initialDelay: 500,
    maxDelay: 5000,
    multiplier: 2
  } as RetryOptions,

  /** Standard operations with moderate retry */
  STANDARD: {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    multiplier: 2
  } as RetryOptions,
  /** Claude API calls that need patience */
  CLAUDE_API: {
    maxAttempts: 8,
    initialDelay: 3000,
    maxDelay: 90000,
    multiplier: 2.0
  } as RetryOptions,

  /** Specific configuration for 529 Overloaded errors (most patient approach) */
  OVERLOADED_529: {
    maxAttempts: 10,
    initialDelay: 5000,      // Start with 5 seconds for 529 errors
    maxDelay: 120000,        // Max 2 minutes between retries
    multiplier: 1.8,         // Slower escalation for server overload
    jitter: true
  } as RetryOptions,

  /** Critical operations that should retry aggressively */
  AGGRESSIVE: {
    maxAttempts: 8,
    initialDelay: 1000,
    maxDelay: 120000,
    multiplier: 2
  } as RetryOptions
} as const;
