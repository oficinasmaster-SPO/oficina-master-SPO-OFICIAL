import { useMemo } from "react";

/**
 * Hook de regras de filtro para /controleaceleracao.
 * Deriva consultorEfetivo e atendimentosPeriodo a partir dos filtros e dados brutos.
 * Puro: sem side-effects, sem queries.
 */
export default function useFiltrosControle({ filtros, user, atendimentos }) {
  // Consultor efetivo: filtro explícito > role-based default
  const consultorEfetivo = useMemo(() => {
    if (filtros.consultorId && filtros.consultorId !== "todos") return filtros.consultorId;
    if (user?.role !== "admin") return user?.id || null;
    return null;
  }, [filtros.consultorId, user?.id, user?.role]);

  // Atendimentos filtrados por período selecionado
  const atendimentosPeriodo = useMemo(() => {
    if (!atendimentos?.length) return [];
    const { dataInicio, dataFim } = filtros;
    if (!dataInicio || !dataFim) return atendimentos;
    return atendimentos.filter(a => {
      const d = new Date(a.data_agendada).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
      return d >= dataInicio && d <= dataFim;
    });
  }, [atendimentos, filtros.dataInicio, filtros.dataFim]);

  return { consultorEfetivo, atendimentosPeriodo };
}