import { useQueryCache } from '@/hooks/useQueryCache';
import { useCacheInvalidation } from '@/lib/cacheInvalidationHook';
import { base44 } from '@/api/base44Client';

/**
 * Cached hook for fetching employees list
 * Demonstrates the caching pattern
 */
export function useCachedEmployees(workshopId) {
  // CORREÇÃO BUG #1: usar REALTIME (30s) em vez de MODERATE (10min) para evitar
  // que lista vazia (por workshopId undefined no primeiro render) fique cacheada por 10 minutos
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
    'REALTIME',
    { enabled: !!workshopId } // só executa quando workshopId está disponível
  );

  // Auto-invalidate when Employee entity changes
  useCacheInvalidation('Employee', 'employees');

  return query;
}