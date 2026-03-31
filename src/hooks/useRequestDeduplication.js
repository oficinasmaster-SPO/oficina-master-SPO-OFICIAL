import { useCallback, useRef } from 'react';

/**
 * Hook for deduplicating API requests
 * Prevents multiple identical requests from executing simultaneously
 *
 * Usage:
 * const { deduplicate } = useRequestDeduplication();
 * const user = await deduplicate('user-123', () => fetchUser('123'));
 */
export function useRequestDeduplication() {
  const pendingRequestsRef = useRef(new Map());

  const deduplicate = useCallback(async (key, fn) => {
    const pending = pendingRequestsRef.current;

    // If request already in flight, return the same promise
    if (pending.has(key)) {
      return pending.get(key);
    }

    // Execute request and store promise
    const promise = fn()
      .then(result => {
        pending.delete(key);
        return result;
      })
      .catch(error => {
        pending.delete(key);
        throw error;
      });

    pending.set(key, promise);
    return promise;
  }, []);

  const getPending = useCallback(() => {
    return Array.from(pendingRequestsRef.current.keys());
  }, []);

  const clear = useCallback(() => {
    pendingRequestsRef.current.clear();
  }, []);

  return { deduplicate, getPending, clear };
}

/**
 * Hook for cached deduplication with TTL
 * Auto-deduplicates AND caches results
 *
 * Usage:
 * const { request } = useCachedDeduplication({ ttl: 5000 });
 * const user = await request('user-123', () => fetchUser('123'));
 * // Second call within 5s returns cached result without HTTP
 */
export function useCachedDeduplication({ ttl = 5000 } = {}) {
  const cacheRef = useRef(new Map());
  const pendingRef = useRef(new Map());

  const request = useCallback(async (key, fn) => {
    const now = Date.now();

    // Check cache first
    const cached = cacheRef.current.get(key);
    if (cached && now - cached.timestamp < ttl) {
      return cached.value;
    }

    // Check if request already pending
    if (pendingRef.current.has(key)) {
      return pendingRef.current.get(key);
    }

    // Execute and cache
    const promise = fn()
      .then(result => {
        cacheRef.current.set(key, { value: result, timestamp: Date.now() });
        pendingRef.current.delete(key);
        return result;
      })
      .catch(error => {
        pendingRef.current.delete(key);
        throw error;
      });

    pendingRef.current.set(key, promise);
    return promise;
  }, [ttl]);

  const invalidate = useCallback((key) => {
    cacheRef.current.delete(key);
  }, []);

  const invalidateAll = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const getCacheSize = useCallback(() => {
    return cacheRef.current.size;
  }, []);

  return { request, invalidate, invalidateAll, getCacheSize };
}

/**
 * Hook for request batching + deduplication
 * Collects requests over a short window and executes in batch
 *
 * Usage:
 * const { batchRequest } = useBatchedDeduplication({ batchDelayMs: 50 });
 * Promise.all([
 *   batchRequest(['users', '1'], () => fetchUser('1')),
 *   batchRequest(['users', '2'], () => fetchUser('2')),
 *   batchRequest(['users', '3'], () => fetchUser('3')),
 * ])
 * // Makes ONE request: fetchUserBatch([1, 2, 3])
 */
export function useBatchedDeduplication({ batchDelayMs = 50 } = {}) {
  const batchesRef = useRef(new Map());
  const timeoutsRef = useRef(new Map());
  const pendingRef = useRef(new Map());

  const batchRequest = useCallback(async (key, fn, batchKey = 'default') => {
    // Return pending request if exists
    if (pendingRef.current.has(key)) {
      return pendingRef.current.get(key);
    }

    // Get or create batch
    if (!batchesRef.current.has(batchKey)) {
      batchesRef.current.set(batchKey, []);
    }

    const batch = batchesRef.current.get(batchKey);
    batch.push({ key, fn });

    // Create promise for this request
    const promise = new Promise((resolve, reject) => {
      const timeout = setTimeout(async () => {
        try {
          // Execute all batched functions
          const results = await Promise.all(batch.map(item => item.fn()));

          // Resolve each one
          batch.forEach((item, index) => {
            pendingRef.current.delete(item.key);
          });

          resolve(results[batch.findIndex(item => item.key === key)]);
        } catch (error) {
          batch.forEach(item => {
            pendingRef.current.delete(item.key);
          });
          reject(error);
        }

        batchesRef.current.delete(batchKey);
        timeoutsRef.current.delete(batchKey);
      }, batchDelayMs);

      timeoutsRef.current.set(batchKey, timeout);
    });

    pendingRef.current.set(key, promise);
    return promise;
  }, [batchDelayMs]);

  const flushBatch = useCallback((batchKey = 'default') => {
    const timeout = timeoutsRef.current.get(batchKey);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(batchKey);
    }
  }, []);

  return { batchRequest, flushBatch };
}

/**
 * Hook for per-endpoint deduplication with custom keys
 * Useful for search, filters, etc. with composite keys
 *
 * Usage:
 * const { search } = useSmartDeduplication();
 * const results = await search('query:react', () => api.search('react'));
 * const sameResults = await search('query:react', () => api.search('react'));
 * // Second call returns cached result
 */
export function useSmartDeduplication() {
  const deduplicatorRef = useRef(new Map());

  const getDeduplicator = useCallback((endpoint) => {
    if (!deduplicatorRef.current.has(endpoint)) {
      deduplicatorRef.current.set(endpoint, new Map());
    }
    return deduplicatorRef.current.get(endpoint);
  }, []);

  const execute = useCallback(async (endpoint, key, fn) => {
    const deduplicator = getDeduplicator(endpoint);

    if (deduplicator.has(key)) {
      return deduplicator.get(key);
    }

    const promise = fn()
      .then(result => {
        deduplicator.delete(key);
        return result;
      })
      .catch(error => {
        deduplicator.delete(key);
        throw error;
      });

    deduplicator.set(key, promise);
    return promise;
  }, [getDeduplicator]);

  const clear = useCallback((endpoint = null) => {
    if (endpoint) {
      deduplicatorRef.current.delete(endpoint);
    } else {
      deduplicatorRef.current.clear();
    }
  }, []);

  return { execute, clear };
}