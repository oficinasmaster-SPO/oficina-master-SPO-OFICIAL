/**
 * Global Request Deduplication Manager
 * Centralizes deduplication across the entire app
 * Use for server-side or global state management scenarios
 */
export class RequestDeduplicationManager {
  constructor() {
    this.pendingRequests = new Map();
    this.cache = new Map();
    this.stats = {
      totalRequests: 0,
      dedupedRequests: 0,
      cachedResponses: 0,
    };
  }

  /**
   * Execute request with deduplication
   * If identical request is in-flight, returns same promise
   */
  async execute(key, fn, options = {}) {
    const { cache = false, ttl = 0 } = options;

    // Check cache first
    if (cache) {
      const cached = this.cache.get(key);
      if (cached && (ttl === 0 || Date.now() - cached.timestamp < ttl)) {
        this.stats.cachedResponses++;
        return cached.value;
      }
    }

    // Check if request already pending
    if (this.pendingRequests.has(key)) {
      this.stats.dedupedRequests++;
      return this.pendingRequests.get(key);
    }

    this.stats.totalRequests++;

    // Execute request
    const promise = fn()
      .then(result => {
        if (cache) {
          this.cache.set(key, { value: result, timestamp: Date.now() });
        }
        this.pendingRequests.delete(key);
        return result;
      })
      .catch(error => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Batch multiple requests with deduplication
   */
  async batch(requests) {
    return Promise.all(
      requests.map(({ key, fn, ...options }) => this.execute(key, fn, options))
    );
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key) {
    this.cache.delete(key);
  }

  /**
   * Invalidate entire cache
   */
  invalidateAll() {
    this.cache.clear();
  }

  /**
   * Get pending requests count
   */
  getPendingCount() {
    return this.pendingRequests.size;
  }

  /**
   * Get cache size
   */
  getCacheSize() {
    return this.cache.size;
  }

  /**
   * Get deduplication statistics
   */
  getStats() {
    return {
      ...this.stats,
      pendingRequests: this.pendingRequests.size,
      cacheSize: this.cache.size,
      deduplicationRate: this.stats.totalRequests > 0
        ? ((this.stats.dedupedRequests / this.stats.totalRequests) * 100).toFixed(2) + '%'
        : '0%',
    };
  }

  /**
   * Reset all stats
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      dedupedRequests: 0,
      cachedResponses: 0,
    };
  }

  /**
   * Clear all pending and cached data
   */
  clear() {
    this.pendingRequests.clear();
    this.cache.clear();
  }
}

// Global singleton instance
export const dedupManager = new RequestDeduplicationManager();

/**
 * Helper to generate cache keys from objects
 */
export function generateCacheKey(endpoint, params = {}) {
  const paramStr = Object.keys(params)
    .sort()
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('&');

  return `${endpoint}?${paramStr}`;
}

/**
 * Helper for search/filter deduplication with smart key generation
 */
export function createSearchKey(endpoint, query, filters = {}) {
  const filterStr = Object.entries(filters)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join('&');

  return `${endpoint}:query=${query}${filterStr ? '&' + filterStr : ''}`;
}

/**
 * Helper for pagination deduplication
 */
export function createPaginationKey(endpoint, page = 1, limit = 20, sort = '') {
  return `${endpoint}:page=${page}&limit=${limit}&sort=${sort}`;
}