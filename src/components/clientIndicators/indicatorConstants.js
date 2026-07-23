export const ALL_INDICATORS = [
  { key: "faturamento_mes", label: "Faturamento do mês", shortLabel: "Faturamento", color: "#2563eb", type: "currency" },
  { key: "ticket_medio", label: "Ticket médio", shortLabel: "Ticket Médio", color: "#0891b2", type: "currency" },
  { key: "clientes_atendidos", label: "Clientes atendidos", shortLabel: "Clientes", color: "#64748b", type: "number" },
  { key: "prospeccao_kit_master", label: "Prospecção Kit Master", shortLabel: "Prosp. Kit", color: "#d97706", type: "number" },
  { key: "faturado_kit_master", label: "Faturado Kit Master", shortLabel: "Kit Master", color: "#f59e0b", type: "currency" },
  { key: "prospeccao_trafego_pago", label: "Prospecção Tráfego Pago", shortLabel: "Prosp. Tráfego", color: "#7c3aed", type: "number" },
  { key: "faturado_trafego_pago", label: "Faturado Tráfego Pago", shortLabel: "Tráfego Pago", color: "#a855f7", type: "currency" },
  { key: "lucro_operacional", label: "Lucro operacional", shortLabel: "Lucro", color: "#16a34a", type: "currency" },
];

export const CHART_INDICATORS = ALL_INDICATORS.filter((i) =>
  ["faturamento_mes", "faturado_kit_master", "faturado_trafego_pago", "lucro_operacional", "ticket_medio", "clientes_atendidos"].includes(i.key)
);

export function formatIndicatorValue(value, type) {
  const num = Number(value || 0);
  if (type === "currency") return `R$ ${num.toLocaleString("pt-BR")}`;
  return String(num);
}

export function formatAxisValue(value) {
  const num = Number(value);
  if (num >= 1_000_000) return `R$ ${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `R$ ${(num / 1_000).toFixed(0)}k`;
  return `R$ ${num}`;
}

export function groupByMonth(indicators) {
  const byMonth = new Map();
  for (const ind of indicators) {
    const monthKey = ind.mes_referencia || (ind.data_registro ? ind.data_registro.slice(0, 7) : null);
    if (!monthKey) continue;
    const current = byMonth.get(monthKey);
    if (!current || Number(ind.faturamento_mes || 0) > Number(current.faturamento_mes || 0)) {
      byMonth.set(monthKey, { ...ind, monthKey });
    }
  }
  return Array.from(byMonth.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

export function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  return `${month}/${year}`;
}