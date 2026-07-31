import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Bootstrap único do Cockpit do cliente.
 *
 * Substitui as 3 queries paralelas do CockpitPanelInner
 * (workshop-atas / workshop-concluidos / workshop-followups) por uma
 * única chamada ao backend `getWorkshopCockpitBootstrap`.
 *
 * staleTime 10 min: clicar de volta num cliente já visitado NÃO refaz reads.
 * retry false: nunca retentar (429 deve ser contido, não ampliado).
 */
export function useWorkshopCockpitBootstrap(workshopId) {
  return useQuery({
    queryKey: ["workshop-cockpit-bootstrap", workshopId],
    queryFn: async () => {
      const res = await base44.functions.invoke("getWorkshopCockpitBootstrap", {
        workshop_id: workshopId,
      });
      return res?.data ?? res;
    },
    enabled: !!workshopId,
    staleTime: 10 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}