import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

export const PRESETS_PERIODO = [
  { label: "Últimos 7 dias", value: "7d" },
  { label: "Últimos 15 dias", value: "15d" },
  { label: "Últimos 30 dias", value: "30d" },
  { label: "Mês atual", value: "mes_atual" },
  { label: "Personalizado", value: "custom" },
];

/**
 * Calcula dataInicio e dataFim para um preset de período.
 * Fonte única de verdade para toda a lógica de datas do módulo Aceleração.
 */
export function computeDatesForPreset(preset) {
  const hoje = new Date();
  switch (preset) {
    case "7d":
      return { dataInicio: format(subDays(hoje, 7), "yyyy-MM-dd"), dataFim: format(hoje, "yyyy-MM-dd") };
    case "15d":
      return { dataInicio: format(subDays(hoje, 15), "yyyy-MM-dd"), dataFim: format(hoje, "yyyy-MM-dd") };
    case "30d":
      return { dataInicio: format(subDays(hoje, 30), "yyyy-MM-dd"), dataFim: format(hoje, "yyyy-MM-dd") };
    case "mes_atual":
    default:
      return { dataInicio: format(startOfMonth(hoje), "yyyy-MM-dd"), dataFim: format(endOfMonth(hoje), "yyyy-MM-dd") };
  }
}