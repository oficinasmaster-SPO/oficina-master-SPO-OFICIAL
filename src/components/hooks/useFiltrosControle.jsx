/**
 * Funções puras de filtro para /controleaceleracao.
 * Sem hooks — podem ser usadas dentro de useMemo livremente.
 */

/**
 * Deriva o ID do consultor efetivo a partir dos filtros e do usuário autenticado.
 * Regra: filtro explícito > role-based default (non-admin usa próprio ID) > null (todos).
 */
export function getConsultorEfetivo(filtros, user) {
  if (filtros.consultorId && filtros.consultorId !== "todos") return filtros.consultorId;
  if (user?.role !== "admin") return user?.id || null;
  return null;
}

/**
 * Filtra atendimentos pelo período (dataInicio / dataFim) presente nos filtros.
 * Atendimentos com status "atrasado" SEMPRE passam, independentemente do filtro de data,
 * para que apareçam nos contadores e na aba de Atrasados.
 */
export function filterAtendimentosPeriodo(atendimentos, filtros) {
  if (!atendimentos?.length) return [];
  const { dataInicio, dataFim } = filtros;
  if (!dataInicio || !dataFim) return atendimentos;
  return atendimentos.filter(a => {
    // Atrasados sempre aparecem, independente do período
    if (a.status === 'atrasado') return true;
    const d = new Date(a.data_agendada).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    return d >= dataInicio && d <= dataFim;
  });
}