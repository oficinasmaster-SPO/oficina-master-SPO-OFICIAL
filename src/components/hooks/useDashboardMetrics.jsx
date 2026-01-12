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
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const formattedStart = startOfMonth.toISOString().split("T")[0];
        const formattedEnd = today.toISOString().split("T")[0];

        const logs = await base44.entities.DailyProductivityLog.filter({
          workshop_id: workshopId,
        });

        const filteredLogs = Array.isArray(logs)
          ? logs.filter((log) => {
              const logDate = new Date(log.date);
              return logDate >= startOfMonth && logDate <= today;
            })
          : [];

        // Calcular métricas
        return {
          metas: calculateMetasGlobais(filteredLogs),
          tcmp2: calculateTCMP2(filteredLogs),
          r70i30: calculateR70I30(filteredLogs),
          gpsAplicados: calculateGPS(filteredLogs),
          kitMaster: calculateKitMaster(filteredLogs),
          paveAgendamento: calculatePAVE(filteredLogs),
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

function calculateGPS(logs) {
  if (!logs.length) return { total: 0, aplicados: 0 };

  const gpsLogs = logs.filter((log) =>
    log.entries?.some((e) => e.metric_code === "GPS_APLICADO")
  );

  if (!gpsLogs.length) return { total: 0, aplicados: 0 };

  const valores = gpsLogs
    .flatMap((log) => log.entries.filter((e) => e.metric_code === "GPS_APLICADO"))
    .map((e) => parseInt(e.value) || 0);

  const aplicados = Math.round(
    valores.reduce((a, b) => a + b, 0) / valores.length
  );

  return { total: 30, aplicados };
}

function calculateKitMaster(logs) {
  if (!logs.length) return { convertidos: 0, meta: 15 };

  const kitLogs = logs.filter((log) =>
    log.entries?.some((e) => e.metric_code === "KIT_MASTER")
  );

  if (!kitLogs.length) return { convertidos: 0, meta: 15 };

  const valores = kitLogs
    .flatMap((log) => log.entries.filter((e) => e.metric_code === "KIT_MASTER"))
    .map((e) => parseInt(e.value) || 0);

  const convertidos = valores.reduce((a, b) => a + b, 0);

  return { convertidos, meta: 15 };
}

function calculatePAVE(logs) {
  if (!logs.length) return { agendados: 0, hoje: 0 };

  const paveLogsHoje = logs.filter((log) => {
    const logDate = new Date(log.date);
    const hoje = new Date();
    return (
      logDate.toDateString() === hoje.toDateString() &&
      log.entries?.some((e) => e.metric_code === "PAVE_AGENDAMENTO")
    );
  });

  const valores = paveLogsHoje
    .flatMap((log) =>
      log.entries.filter((e) => e.metric_code === "PAVE_AGENDAMENTO")
    )
    .map((e) => parseInt(e.value) || 0);

  const hoje = valores.reduce((a, b) => a + b, 0);
  const agendados = Math.round(valores.reduce((a, b) => a + b, 0) / Math.max(valores.length, 1));

  return { agendados, hoje };
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