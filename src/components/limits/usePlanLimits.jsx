import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export const PLAN_LIMITS = {
  FREE: { cdc: 5, coex: 5 },
  START: { cdc: 10, coex: 10 },
  BRONZE: { cdc: 30, coex: 30 },
  PRATA: { cdc: 60, coex: 60 },
  GOLD: { cdc: 100, coex: 100 },
  IOM: { cdc: 9999, coex: 9999 },
  MILLIONS: { cdc: 9999, coex: 9999 },
};

export function usePlanLimits(workshopId, type, employeeId = null) {
  return useQuery({
    queryKey: ['plan-limits', workshopId, type, employeeId],
    queryFn: async () => {
      if (!workshopId) return null;
      
      const workshop = await base44.entities.Workshop.get(workshopId);
      const plano = workshop?.planoAtual || 'FREE';
      const limits = PLAN_LIMITS[plano] || PLAN_LIMITS.FREE;
      const limit = limits[type] || 0;

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      let usage = 0;
      let isAlreadyCounted = false;
      
      if (type === 'cdc') {
        const records = await base44.entities.CDCRecord.filter({ workshop_id: workshopId });
        const monthRecords = records.filter(r => new Date(r.created_date) >= startOfMonth);
        const uniqueIds = new Set(monthRecords.map(r => r.employee_id));
        usage = uniqueIds.size;
        isAlreadyCounted = employeeId ? uniqueIds.has(employeeId) : false;
      } else if (type === 'coex') {
        const records = await base44.entities.COEXContract.filter({ workshop_id: workshopId });
        const monthRecords = records.filter(r => new Date(r.created_date) >= startOfMonth);
        const uniqueIds = new Set(monthRecords.map(r => r.employee_id));
        usage = uniqueIds.size;
        isAlreadyCounted = employeeId ? uniqueIds.has(employeeId) : false;
      }

      return {
        limit,
        usage,
        isLimitReached: !isAlreadyCounted && usage >= limit,
        plano
      };
    },
    enabled: !!workshopId && !!type,
    staleTime: 5 * 60 * 1000
  });
}