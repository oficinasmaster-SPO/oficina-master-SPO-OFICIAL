import { dedupManager, generateCacheKey } from '@/lib/requestDeduplicationManager';

/**
 * Setup automatic request deduplication interceptor
 * Deduplicates GET requests by default, can configure for other methods
 */
export function setupDeduplicationInterceptor(
  axiosInstance,
  options = {}
) {
  const {
    methods = ['GET'],
    excludeUrls = [],
    cacheGET = true,
    cacheTTL = 0,
    generateKey = generateCacheKey,
  } = options;

  // Request interceptor — check for pending identical requests
  axiosInstance.interceptors.request.use(
    async (config) => {
      const shouldDeduplicate = methods.includes(config.method?.toUpperCase());
      const isExcluded = excludeUrls.some(pattern => config.url.includes(pattern));

      if (!shouldDeduplicate || isExcluded) {
        return config;
      }

      const cacheKey = generateKey(config.url, config.params);
      config.deduplicationKey = cacheKey;

      // For GET requests, check if we already have this in flight
      if (config.method?.toUpperCase() === 'GET') {
        config.deduplicationCache = cacheGET;
        config.deduplicationTTL = cacheTTL;
      }

      return config;
    },
    error => Promise.reject(error)
  );

  // Response interceptor — store result and resolve pending
  axiosInstance.interceptors.response.use(
    response => {
      const key = response.config.deduplicationKey;
      if (key) {
        // Mark as resolved so next identical request waits for this one
        response.deduplicationKey = key;
      }
      return response;
    },
    error => {
      const key = error.config?.deduplicationKey;
      if (key) {
        // Clean up failed request from dedup queue
        error.deduplicationKey = key;
      }
      return Promise.reject(error);
    }
  );
}

/**
 * Wrapper to use deduplication for manual API calls
 * Usage:
 * const response = await dedupFetch('GET /api/users', () => fetch(...))
 */
export async function dedupFetch(endpoint, fn, options = {}) {
  const { cache = true, ttl = 5000 } = options;

  return dedupManager.execute(endpoint, fn, { cache, ttl });
}

/**
 * Batch multiple requests with automatic deduplication
 * Usage:
 * const [users, posts] = await dedupBatch([
 *   { key: 'users', fn: () => fetchUsers() },
 *   { key: 'posts', fn: () => fetchPosts() },
 * ]);
 */
export async function dedupBatch(requests, options = {}) {
  return dedupManager.batch(
    requests.map(req => ({
      ...req,
      ...options,
    }))
  );
}

/**
 * Get global deduplication stats
 */
export function getDedupStats() {
  return dedupManager.getStats();
}

/**
 * Clear deduplication cache for specific key or all
 */
export function clearDedupCache(key = null) {
  if (key) {
    dedupManager.invalidate(key);
  } else {
    dedupManager.invalidateAll();
  }
}

/**
 * Monitor deduplication metrics
 * Useful for debugging and performance analysis
 */
export function monitorDeduplication(logInterval = 10000) {
  const interval = setInterval(() => {
    const stats = getDedupStats();
    console.log('[Dedup Stats]', {
      totalRequests: stats.totalRequests,
      dedupedRequests: stats.dedupedRequests,
      cachedResponses: stats.cachedResponses,
      deduplicationRate: stats.deduplicationRate,
      pendingRequests: stats.pendingRequests,
      cacheSize: stats.cacheSize,
    });
  }, logInterval);

  return () => clearInterval(interval);
}