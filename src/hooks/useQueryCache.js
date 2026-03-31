import { useQuery } from '@tanstack/react-query';
import { CACHE_TIMES } from '@/lib/cacheConfig';

/**
 * Wrapper hook that applies intelligent caching to queries
 * @param {string} queryKey - React Query key
 * @param {function} queryFn - Async function that fetches data
 * @param {string} cacheType - Cache category: IMMUTABLE, STABLE, MODERATE, REALTIME
 * @param {object} options - Additional query options
 */
export function useQueryCache(queryKey, queryFn, cacheType = 'STABLE', options = {}) {
  return useQuery({
    queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
    queryFn,
    ...CACHE_TIMES[cacheType],
    ...options,
  });
}

/**
 * Hook for entity queries with automatic request deduplication
 */
export function useEntityCache(entityName, queryFn, cacheType = 'MODERATE', options = {}) {
  return useQueryCache([entityName], queryFn, cacheType, {
    enabled: true,
    retry: 1,
    ...options,
  });
}