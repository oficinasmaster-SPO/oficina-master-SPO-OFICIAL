// In-memory cache for backend function results
// Use in Deno functions to cache expensive operations

const cache = new Map();

/**
 * Get cached value or execute function
 * @param {string} key - Cache key
 * @param {function} fn - Async function to execute if not cached
 * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
 */
export async function getOrSet(key, fn, ttl = 1000 * 60 * 5) {
  if (cache.has(key)) {
    return cache.get(key);
  }

  const result = await fn();
  
  cache.set(key, result);
  setTimeout(() => cache.delete(key), ttl);
  
  return result;
}

/**
 * Invalidate specific cache key(s)
 */
export function invalidateCache(keyPattern) {
  if (typeof keyPattern === 'string') {
    cache.delete(keyPattern);
  } else if (keyPattern instanceof RegExp) {
    for (const key of cache.keys()) {
      if (keyPattern.test(key)) {
        cache.delete(key);
      }
    }
  }
}

/**
 * Clear all cache
 */
export function clearCache() {
  cache.clear();
}