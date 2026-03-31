import { useQueryCache } from '@/hooks/useQueryCache';
import { useCacheInvalidation } from '@/lib/cacheInvalidationHook';
import { base44 } from '@/api/base44Client';

/**
 * Cached hook for fetching employees list
 * Demonstrates the caching pattern
 */
export function useCachedEmployees(workshopId) {
  // Fetch with MODERATE cache (10 min stale)
  const query = useQueryCache(
    ['employees', workshopId],
    async () => {
      if (!workshopId) return [];
      return await base44.entities.Employee.filter(
        { workshop_id: workshopId },
        '-updated_date',
        200
      );
    },
    'MODERATE'
  );

  // Auto-invalidate when Employee entity changes
  useCacheInvalidation('Employee', 'employees');

  return query;
}