import { useCallback, useRef, useState } from 'react';
import { RateLimiter, RequestDeduplicator, AdaptiveRateLimiter } from '@/lib/rateLimiter';

/**
 * Hook for throttling/debouncing rapid API requests
 * Prevents duplicate requests and enforces rate limits
 *
 * Usage:
 * const { throttle, isWaiting } = useRequestThrottle({ tokensPerSecond: 5 });
 * const handleSearch = throttle(async (query) => {
 *   const result = await fetch(`/api/search?q=${query}`);
 *   return result.json();
 * });
 */
export function useRequestThrottle({ tokensPerSecond = 10, burstSize = null } = {}) {
  const limiterRef = useRef(new RateLimiter(tokensPerSecond, burstSize || tokensPerSecond * 2));
  const deduplicatorRef = useRef(new RequestDeduplicator());
  const [isWaiting, setIsWaiting] = useState(false);

  const throttle = useCallback(async (fn, deduplicationKey = null) => {
    setIsWaiting(true);

    try {
      if (!limiterRef.current.isAllowed()) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      if (deduplicationKey) {
        return await deduplicatorRef.current.execute(deduplicationKey, fn);
      }

      return await fn();
    } finally {
      setIsWaiting(false);
    }
  }, []);

  const getAvailableTokens = useCallback(() => {
    return limiterRef.current.getAvailableTokens();
  }, []);

  const reset = useCallback(() => {
    limiterRef.current.reset();
    deduplicatorRef.current.clear();
  }, []);

  return { throttle, isWaiting, getAvailableTokens, reset };
}

/**
 * Hook for adaptive rate limiting (handles 429 responses automatically)
 *
 * Usage:
 * const { execute, isBackingOff } = useAdaptiveThrottle();
 * const result = await execute(async () => {
 *   const res = await fetch('/api/data');
 *   if (res.status === 429) {
 *     const retryAfter = res.headers.get('Retry-After') || '60';
 *     throw new AdaptiveRateLimitError(parseInt(retryAfter));
 *   }
 *   return res.json();
 * });
 */
export function useAdaptiveThrottle({ initialRate = 10, minRate = 1, maxRate = 100 } = {}) {
  const limiterRef = useRef(new AdaptiveRateLimiter(initialRate, minRate, maxRate));
  const [isBackingOff, setIsBackingOff] = useState(false);

  const execute = useCallback(async (fn, tokens = 1) => {
    if (!limiterRef.current.isAllowed(tokens)) {
      const backoffTime = limiterRef.current.getBackoffTimeRemaining();
      throw new Error(`Rate limited. Retry in ${Math.ceil(backoffTime / 1000)}s`);
    }

    try {
      const result = await fn();
      limiterRef.current.onSuccess();
      setIsBackingOff(false);
      return result;
    } catch (error) {
      // Check if it's a rate limit error (assumes custom error or status code)
      if (error.status === 429 || error.retryAfter) {
        const retryAfterSeconds = error.retryAfter || 60;
        limiterRef.current.onRateLimitHit(retryAfterSeconds);
        setIsBackingOff(true);
      }
      throw error;
    }
  }, []);

  const getCurrentRate = useCallback(() => {
    return limiterRef.current.currentRate;
  }, []);

  const reset = useCallback(() => {
    limiterRef.current.reset();
    setIsBackingOff(false);
  }, []);

  return { execute, isBackingOff, getCurrentRate, reset };
}

/**
 * Hook for debouncing rapid function calls
 * Waits for calls to stop before executing
 *
 * Usage:
 * const { debounce } = useDebouncedThrottle(300);
 * const handleInputChange = debounce((value) => {
 *   console.log('Executing with:', value);
 * });
 */
export function useDebouncedThrottle(delayMs = 300) {
  const timeoutRef = useRef(null);
  const lastExecutionRef = useRef(0);
  const [isPending, setIsPending] = useState(false);

  const debounce = useCallback((fn, ...args) => {
    setIsPending(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      fn(...args);
      lastExecutionRef.current = Date.now();
      setIsPending(false);
    }, delayMs);
  }, [delayMs]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setIsPending(false);
    }
  }, []);

  const flush = useCallback((fn, ...args) => {
    cancel();
    fn(...args);
    lastExecutionRef.current = Date.now();
  }, [cancel]);

  return { debounce, cancel, flush, isPending };
}

/**
 * Custom error for adaptive rate limiting
 */
export class AdaptiveRateLimitError extends Error {
  constructor(retryAfterSeconds = 60) {
    super(`Rate limited. Retry after ${retryAfterSeconds}s`);
    this.name = 'AdaptiveRateLimitError';
    this.retryAfter = retryAfterSeconds;
    this.status = 429;
  }
}