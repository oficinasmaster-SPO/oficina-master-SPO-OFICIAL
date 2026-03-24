import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function usePlanLimits(workshopId) {
  return useQuery({
    queryKey: ['plan-limits-hook', workshopId],
    queryFn: async () => {
      if (!workshopId) return { canUseCDC: false, canUseCOEX: false, loading: true };

      const workshop = await base44.entities.Workshop.get(workshopId);
      if (!workshop) return { canUseCDC: false, canUseCOEX: false };

      const planType = workshop.planoAtual || "FREE";
      
      let cdcLimit = 5;
      let coexLimit = 3;
      
      if (['START', 'BRONZE'].includes(planType)) {
        cdcLimit = 20;
        coexLimit = 15;
      } else if (['PRATA', 'GOLD', 'IOM', 'MILLIONS'].includes(planType)) {
        cdcLimit = 9999;
        coexLimit = 9999;
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const cdcs = await base44.entities.CDCRecord.filter({ workshop_id: workshopId });
      const cdcUsage = cdcs.filter(c => c.created_date >= startOfMonth).length;

      const coexs = await base44.entities.COEXContract.filter({ workshop_id: workshopId });
      const coexUsage = coexs.filter(c => c.created_date >= startOfMonth).length;

      return {
        canUseCDC: cdcUsage < cdcLimit,
        canUseCOEX: coexUsage < coexLimit,
        cdcRemaining: Math.max(0, cdcLimit - cdcUsage),
        coexRemaining: Math.max(0, coexLimit - coexUsage),
        planType
      };
    },
    enabled: !!workshopId,
    staleTime: 5 * 60 * 1000 // 5 min cache
  });
}