import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook that automatically invalidates cache when entities change
 * Subscribe to entity events and invalidate related queries
 */
export function useCacheInvalidation(entityName, queryKeyPrefix) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to entity changes
    const unsubscribe = base44.entities[entityName]?.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update' || event.type === 'delete') {
        // Invalidate all queries with this prefix
        queryClient.invalidateQueries({
          queryKey: [queryKeyPrefix],
          exact: false,
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [entityName, queryKeyPrefix, queryClient]);
}