import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Hook para calcular métricas reais do dashboard
export function useDashboardMetrics(workshopId, userId) {
  return useQuery({
    queryKey: ["dashboard-metrics", workshopId],
    queryFn: async () => {
      if (!workshopId) return null;

      const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

      const [workshopData, dreMonthlyList] = await Promise.all([
        base44.entities.Workshop.get(workshopId),
        base44.entities.DREMonthly.filter({ workshop_id: workshopId, month: currentMonth }).catch(() => []),
      ]);

      const dreMonthly = Array.isArray(dreMonthlyList) ? dreMonthlyList[0] : null;
      const monthlyGoals = workshopData?.monthly_goals || {};
      const bestMonth = workshopData?.best_month_history || {};

      // TCMP2 — vem do DREMonthly.calculated.tcmp2_value
      const tcmp2Valor = dreMonthly?.calculated?.tcmp2_value ?? 0;

      // R70 / I30 — vem do DREMonthly calculated, ou fallback para best_month
      const r70 = dreMonthly?.calculated?.r70_percentage ?? bestMonth?.r70_i30?.r70 ?? 70;
      const i30 = dreMonthly?.calculated?.i30_percentage ?? bestMonth?.r70_i30?.i30 ?? 30;

      // GPS de Vendas
      const gpsMeta = monthlyGoals?.gps_vendas ?? bestMonth?.gps_vendas ?? 0;
      const gpsAplicados = monthlyGoals?.gps_vendas_realizado ?? 0;

      // Kit Master
      const kitMeta = monthlyGoals?.kit_master ?? bestMonth?.kit_master ?? 0;
      const kitConvertidos = monthlyGoals?.kit_master_realizado ?? 0;

      // PAVE Comercial
      const paveMeta = monthlyGoals?.pave_commercial ?? bestMonth?.pave_commercial ?? 0;
      const paveAgendados = monthlyGoals?.pave_commercial_realizado ?? 0;

      return {
        tcmp2: { valor: tcmp2Valor, tendencia: "estavel" },
        r70i30: { r70, i30 },
        gpsAplicados: { meta: gpsMeta, aplicados: gpsAplicados },
        kitMaster: { meta: kitMeta, convertidos: kitConvertidos },
        paveAgendamento: { meta: paveMeta, agendados: paveAgendados },
        ranking: [],
      };
    },
    enabled: !!workshopId,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}