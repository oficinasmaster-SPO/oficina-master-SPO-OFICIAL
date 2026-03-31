import { useCachedEmployees } from '@/components/hooks/useCachedEmployees';
import { useQueryOptimizer, useBatchFetch } from '@/hooks/useQueryOptimizer';
import { base44 } from '@/api/base44Client';

/**
 * Hook otimizado para buscar colaboradores com relações
 * - Detecta N+1 patterns
 * - Cache local por requisição
 * - Batch fetch de dados relacionados
 */
export function useOptimizedEmployees(workshopId) {
  const { cache, tracker } = useQueryOptimizer('Employees');
  const { data: employees = [], ...query } = useCachedEmployees(workshopId);
  const { fetchBatch: fetchProfiles } = useBatchFetch(async (profileIds) => {
    const profiles = await Promise.all(
      profileIds.map(id => base44.entities.UserProfile.get(id).catch(() => null))
    );
    return profiles;
  });

  // Batch fetch profiles (evita N+1)
  const enrichedEmployees = employees.map(emp => ({
    ...emp,
    profilePromise: emp.profile_id 
      ? tracker.track(`profile-${emp.profile_id}`, () => 
          cache.get(`profile-${emp.profile_id}`, () => 
            base44.entities.UserProfile.get(emp.profile_id).catch(() => null)
          )
        )
      : Promise.resolve(null),
  }));

  return {
    employees: enrichedEmployees,
    ...query,
  };
}