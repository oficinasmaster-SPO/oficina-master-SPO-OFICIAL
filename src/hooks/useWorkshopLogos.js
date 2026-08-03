import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { sanitizeWorkshopIdArray } from "@/lib/workshopIdGuard";

/**
 * Hook reutilizável que retorna um mapa { workshop_id → logo_url }.
 * Compartilha o mesmo queryKey do useWorkshopsPlanIndex para que o React
 * Query sirva ambos do mesmo cache — zero queries adicionais.
 *
 * Uso:
 *   const logosByWorkshop = useWorkshopLogos(workshopIds);
 *   <WorkshopAvatar name={cliente} logo_url={logosByWorkshop[wid]} />
 */
export function useWorkshopLogos(workshopIds = []) {
  const ids = sanitizeWorkshopIdArray(workshopIds);
  const { data = [] } = useQuery({
    queryKey: ["workshops-plan-index", ids.sort().join(",")],
    queryFn: async () => {
      if (ids.length === 0) return [];
      const BATCH = 100;
      const results = [];
      for (let i = 0; i < ids.length; i += BATCH) {
        const batch = ids.slice(i, i + BATCH);
        const items = await base44.entities.Workshop.filter({ id: { $in: batch } }, undefined, BATCH);
        results.push(...items);
      }
      return results;
    },
    enabled: ids.length > 0,
    staleTime: 10 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const byId = {};
  data.forEach(w => { if (w.id) byId[w.id] = w.logo_url || null; });
  return byId;
}