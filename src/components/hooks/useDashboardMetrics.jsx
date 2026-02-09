import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Hook para calcular métricas do histórico de produção
export function useDashboardMetrics(workshopId, userId) {
  return useQuery({
    queryKey: ["dashboard-metrics", workshopId, userId],
    queryFn: async () => {
      if (!workshopId) return null;

      try {
        // Buscar logs de produção do mês atual
        const today = new Date();
        const currentMonth = new Date().toISOString().substring(0, 7);

        const logs = await base44.entities.DailyProductivityLog.filter({
          workshop_id: workshopId,
        });

        const filteredLogs = Array.isArray(logs)
          ? logs.filter((log) => {
              const logDate = new Date(log.date);
              const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
              return logDate >= startOfMonth && logDate <= today;
            })
          : [];

        // Buscar histórico de metas mensais para GPS e Kit Master
        const monthlyHistory = await base44.entities.MonthlyGoalHistory.filter({
          workshop_id: workshopId,
          month: currentMonth
        });

        const monthlyHistoryArray = Array.isArray(monthlyHistory) ? monthlyHistory : [];

        // Buscar oficina para pegar meta
        const workshopData = await base44.entities.Workshop.get(workshopId);

        // Calcular métricas
        return {
          metas: calculateMetasGlobais(filteredLogs),
          tcmp2: calculateTCMP2(filteredLogs),
          r70i30: calculateR70I30(filteredLogs),
          gpsAplicados: calculateGPS(monthlyHistoryArray, workshopData),
          kitMaster: calculateKitMaster(monthlyHistoryArray, workshopData),
          paveAgendamento: calculatePAVE(monthlyHistoryArray, workshopData),
          ranking: calculateRanking(filteredLogs),
        };
      } catch (error) {
        console.error("Erro ao calcular métricas:", error);
        return null;
      }
    },
    enabled: !!workshopId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

function calculateMetasGlobais(logs) {
  if (!logs.length) return { atual: 0, meta: 100, percentual: 0, tendencia: 0 };

  const metasLogs = logs.filter((log) =>
    log.entries?.some((e) => e.metric_code === "META")
  );

  if (!metasLogs.length) return { atual: 0, meta: 100, percentual: 0, tendencia: 0 };

  const valores = metasLogs
    .flatMap((log) => log.entries.filter((e) => e.metric_code === "META"))
    .map((e) => parseFloat(e.value) || 0);

  const atual = Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
  const meta = 100;
  const percentual = Math.round((atual / meta) * 100);

  return {
    atual,
    meta,
    percentual,
    tendencia: valores.length > 1 ? valores[valores.length - 1] - valores[0] : 0,
  };
}

function calculateTCMP2(logs) {
  if (!logs.length) return { valor: 0, media: 0, tendencia: "estavel" };

  const tcmp2Logs = logs.filter((log) =>
    log.entries?.some((e) => e.metric_code === "TCMP2")
  );

  if (!tcmp2Logs.length) return { valor: 0, media: 0, tendencia: "estavel" };

  const valores = tcmp2Logs
    .flatMap((log) => log.entries.filter((e) => e.metric_code === "TCMP2"))
    .map((e) => parseFloat(e.value) || 0);

  const media = valores.reduce((a, b) => a + b, 0) / valores.length;
  const valor = Math.round(media);
  const tendencia =
    valores.length > 1
      ? valores[valores.length - 1] > valores[0]
        ? "crescente"
        : "decrescente"
      : "estavel";

  return { valor, media, tendencia };
}

function calculateR70I30(logs) {
  if (!logs.length) return { r70: 70, i30: 30 };

  const r70Logs = logs.filter((log) =>
    log.entries?.some((e) => e.metric_code === "R70")
  );
  const i30Logs = logs.filter((log) =>
    log.entries?.some((e) => e.metric_code === "I30")
  );

  const r70Values = r70Logs
    .flatMap((log) => log.entries.filter((e) => e.metric_code === "R70"))
    .map((e) => parseFloat(e.value) || 70);

  const i30Values = i30Logs
    .flatMap((log) => log.entries.filter((e) => e.metric_code === "I30"))
    .map((e) => parseFloat(e.value) || 30);

  const r70 = r70Values.length
    ? Math.round(r70Values.reduce((a, b) => a + b, 0) / r70Values.length)
    : 70;
  const i30 = i30Values.length
    ? Math.round(i30Values.reduce((a, b) => a + b, 0) / i30Values.length)
    : 30;

  return { r70, i30 };
}

function calculateGPS(monthlyHistory, workshopData) {
  if (!monthlyHistory || monthlyHistory.length === 0) return { meta: 0, aplicados: 0 };

  // Meta vem do best_month_history
  const meta = workshopData?.best_month_history?.gps_vendas || 0;

  // Realizado vem da soma dos registros mensais
  const aplicados = monthlyHistory.reduce((sum, record) => 
    sum + (record.gps_vendas || 0), 0
  );

  return { meta, aplicados };
}

function calculateKitMaster(monthlyHistory, workshopData) {
  if (!monthlyHistory || monthlyHistory.length === 0) return { meta: 0, convertidos: 0 };

  // Meta vem do best_month_history
  const meta = Math.round(workshopData?.best_month_history?.kit_master || 0);

  // Realizado vem da soma dos registros mensais
  const convertidos = monthlyHistory.reduce((sum, record) => 
    sum + (record.kit_master || 0), 0
  );

  return { meta, convertidos };
}

function calculatePAVE(monthlyHistory, workshopData) {
  if (!monthlyHistory || monthlyHistory.length === 0) return { meta: 0, agendados: 0 };

  // Meta vem do best_month_history
  const meta = Math.round(workshopData?.best_month_history?.pave_commercial || 0);

  // Realizado vem da soma dos registros mensais
  const agendados = monthlyHistory.reduce((sum, record) => 
    sum + (record.pave_commercial || 0), 0
  );

  return { meta, agendados };
}

function calculateRanking(logs) {
  if (!logs.length) return [];

  // Agrupar por employee_id e somar valores de produção
  const employeeTotals = {};

  logs.forEach((log) => {
    if (!employeeTotals[log.employee_id]) {
      employeeTotals[log.employee_id] = {
        employee_id: log.employee_id,
        total: 0,
        entries: 0,
      };
    }

    const production = log.entries
      ?.filter((e) => e.metric_code === "FATURAMENTO_SERVICO")
      ?.reduce((sum, e) => sum + (parseFloat(e.value) || 0), 0) || 0;

    employeeTotals[log.employee_id].total += production;
    employeeTotals[log.employee_id].entries += 1;
  });

  // Converter para array e ordenar
  return Object.values(employeeTotals)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((emp, idx) => ({
      posicao: idx + 1,
      employee_id: emp.employee_id,
      valor: emp.total,
      media: Math.round(emp.total / emp.entries),
    }));
}